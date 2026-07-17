"""WP28 — KVKK data retention & anonymization tests.

Covers three layers:
  * pure policy helpers (normalize / resolve / collect pii ids) — no DB;
  * the disposal engine via a mock session (irreversibility, idempotency, cert/name
    preservation, opt-in name/email) — no DB;
  * the sweep / materialize / recompute + the retention-policy endpoint — real
    (SQLite in-memory) DB, mirroring the seeding style of the other integration tests.
"""

import uuid
from pathlib import Path
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from src.services import (
    _normalize_retention_policy,
    _resolve_anonymize_after,
    _get_event_retention_policy,
)
from src.anonymization_service import (
    _collect_pii_field_ids,
    anonymize_attendee,
    run_anonymization_sweep,
    materialize_anonymize_after,
    recompute_event_anonymize_after,
    send_pre_warnings,
    purge_deleted_members,
    ANONYMIZED_TOMBSTONE_KEY,
    PRE_WARNING_MARKER_KEY,
)
from src.models import Attendee, Event, User, Organization, AnonymizationLog, PublicMember
from src.main import SessionLocal, Role, app, create_access_token
from src.config import settings

UTC = timezone.utc


# ── Pure: retention policy normalization ────────────────────────────────────────

class TestNormalizeRetentionPolicy:
    def test_absent_or_disabled_returns_none(self):
        assert _normalize_retention_policy(None) is None
        assert _normalize_retention_policy({}) is None
        assert _normalize_retention_policy({"enabled": False, "mode": "relative", "retention_days": 30}) is None

    def test_relative_ok(self):
        p = _normalize_retention_policy({"enabled": True, "mode": "relative", "retention_days": 30})
        assert p["enabled"] is True
        assert p["mode"] == "relative"
        assert p["retention_days"] == 30
        assert p["trigger"] == "auto"              # default
        assert p["include_name_email"] is False    # default (cert integrity)

    def test_relative_missing_days_is_inert(self):
        assert _normalize_retention_policy({"enabled": True, "mode": "relative"}) is None
        assert _normalize_retention_policy({"enabled": True, "mode": "relative", "retention_days": -5}) is None

    def test_relative_days_capped(self):
        p = _normalize_retention_policy({"enabled": True, "mode": "relative", "retention_days": 999999})
        assert p["retention_days"] == 3650  # RETENTION_MAX_DAYS

    def test_fixed_ok_and_invalid(self):
        p = _normalize_retention_policy({"enabled": True, "mode": "fixed", "fixed_date": "2026-12-31"})
        assert p["mode"] == "fixed" and p["fixed_date"] == "2026-12-31"
        assert _normalize_retention_policy({"enabled": True, "mode": "fixed", "fixed_date": "not-a-date"}) is None

    def test_trigger_and_notify_clamped(self):
        p = _normalize_retention_policy(
            {"enabled": True, "mode": "relative", "retention_days": 10,
             "trigger": "approve", "notify_before_days": 9999}
        )
        assert p["trigger"] == "approve"
        assert p["notify_before_days"] == 365


# ── Pure: resolve per-attendee disposal date ────────────────────────────────────

class TestResolveAnonymizeAfter:
    def test_none_policy(self):
        assert _resolve_anonymize_after(None, datetime(2026, 1, 1, tzinfo=UTC)) is None

    def test_relative_counts_from_registration(self):
        policy = _normalize_retention_policy({"enabled": True, "mode": "relative", "retention_days": 30})
        got = _resolve_anonymize_after(policy, datetime(2026, 1, 1, tzinfo=UTC))
        assert got == datetime(2026, 1, 31, tzinfo=UTC)

    def test_relative_without_registration_is_none(self):
        policy = _normalize_retention_policy({"enabled": True, "mode": "relative", "retention_days": 30})
        assert _resolve_anonymize_after(policy, None) is None

    def test_fixed_ignores_registration(self):
        policy = _normalize_retention_policy({"enabled": True, "mode": "fixed", "fixed_date": "2026-06-01"})
        got = _resolve_anonymize_after(policy, None)
        assert got == datetime(2026, 6, 1, tzinfo=UTC)


# ── Pure: pii field id collection ───────────────────────────────────────────────

def test_collect_pii_field_ids_only_marked_and_no_reserved():
    event = Event(
        id=1, admin_id=1, name="E", template_image_url="t.png",
        config={"registration_fields": [
            {"id": "tckn", "label": "TC", "type": "text", "pii": True},
            {"id": "note", "label": "Note", "type": "text", "pii": False},
            {"id": "__kvkk", "label": "x", "type": "text", "pii": True},  # reserved -> ignored
        ]},
    )
    assert _collect_pii_field_ids(event) == ["tckn"]


# ── Disposal engine (mock session) ──────────────────────────────────────────────

def _make_event(**cfg):
    return Event(id=10, admin_id=1, name="Ev", template_image_url="t.png", config=cfg)


def _pii_event():
    return _make_event(registration_fields=[
        {"id": "tckn", "label": "TC", "type": "text", "pii": True},
        {"id": "note", "label": "Note", "type": "text", "pii": False},
    ])


@pytest.mark.asyncio
async def test_dispose_removes_pii_keeps_non_pii_and_name_email():
    db = MagicMock()  # db.add is a sync MagicMock; commit=False so nothing is awaited
    att = Attendee(
        id=1, event_id=10, name="Ali Veli", email="ali@example.com", source="self_register",
        registration_answers={"tckn": "12345678901", "note": "keep me"},
    )
    disposed = await anonymize_attendee(db, att, _pii_event(), trigger="auto")

    assert disposed == ["tckn"]
    assert "tckn" not in att.registration_answers          # irreversible: value gone
    assert att.registration_answers["note"] == "keep me"   # non-PII preserved
    tomb = att.registration_answers[ANONYMIZED_TOMBSTONE_KEY]
    assert tomb["fields"] == ["tckn"] and tomb["trigger"] == "auto"
    assert att.anonymized_at is not None
    assert att.name == "Ali Veli" and att.email == "ali@example.com"  # cert integrity
    # audit row appended, carrying no original value
    assert db.add.called
    log = db.add.call_args[0][0]
    assert isinstance(log, AnonymizationLog)
    assert log.field_ids == ["tckn"] and "12345678901" not in str(log.field_ids)


@pytest.mark.asyncio
async def test_dispose_is_idempotent():
    db = MagicMock()
    att = Attendee(
        id=2, event_id=10, name="Ay", email="ay@example.com", source="self_register",
        registration_answers={"tckn": "1"},
    )
    first = await anonymize_attendee(db, att, _pii_event(), trigger="auto")
    assert first == ["tckn"]
    add_calls = db.add.call_count
    second = await anonymize_attendee(db, att, _pii_event(), trigger="auto")
    assert second is None                    # already anonymized -> no-op
    assert db.add.call_count == add_calls     # no second audit row


@pytest.mark.asyncio
async def test_dispose_opts_in_name_email():
    db = MagicMock()
    att = Attendee(
        id=3, event_id=10, name="Gizli", email="gizli@example.com", source="self_register",
        registration_answers={"tckn": "1"},
    )
    disposed = await anonymize_attendee(db, att, _pii_event(), trigger="auto", include_name_email=True)
    assert "name" in disposed and "email" in disposed
    assert att.name != "Gizli"
    assert att.email == "anonymized-3@anonymized.invalid"  # unique-per-event preserving


# ── Real DB: sweep / materialize / recompute ────────────────────────────────────

async def _seed(*, trigger="auto", days=30, past_due=True, with_after=True, enabled=True):
    """Create admin + org + retention event + one attendee; return ids."""
    uid = uuid.uuid4().hex[:8]
    async with SessionLocal() as sess:
        async with sess.begin():
            admin = User(email=f"anon-{uid}@test.com", password_hash="x", role=Role.admin)
            sess.add(admin)
            await sess.flush()
            sess.add(Organization(user_id=admin.id, public_id=f"anon-org-{admin.id}", org_name="Org"))
            event = Event(
                admin_id=admin.id, name="Anon Event", template_image_url="t.png",
                config={
                    "registration_fields": [
                        {"id": "tckn", "label": "TC", "type": "text", "pii": True},
                        {"id": "note", "label": "Note", "type": "text", "pii": False},
                    ],
                    "retention": {
                        "enabled": enabled, "mode": "relative", "retention_days": days,
                        "trigger": trigger, "notify_before_days": 0, "include_name_email": False,
                    },
                },
            )
            sess.add(event)
            await sess.flush()
            after = datetime(2020, 1, 1, tzinfo=UTC) if past_due else datetime(2999, 1, 1, tzinfo=UTC)
            att = Attendee(
                event_id=event.id, name="Ali Veli", email=f"att-{admin.id}@test.com",
                source="self_register", registered_at=datetime(2026, 1, 1, tzinfo=UTC),
                registration_answers={"tckn": "12345678901", "note": "keep"},
                anonymize_after=(after if with_after else None),
            )
            sess.add(att)
            await sess.flush()
            return {
                "admin_id": admin.id, "admin_email": admin.email,
                "event_id": event.id, "attendee_id": att.id,
            }


@pytest.mark.asyncio
async def test_sweep_auto_disposes_and_logs():
    seeded = await _seed(trigger="auto")
    summary = await run_anonymization_sweep(now=datetime(2026, 6, 1, tzinfo=UTC))
    assert seeded["admin_email"] in summary["disposed_by_admin"]

    async with SessionLocal() as sess:
        att = await sess.get(Attendee, seeded["attendee_id"])
        assert att.anonymized_at is not None
        assert "tckn" not in (att.registration_answers or {})
        assert att.registration_answers["note"] == "keep"
        assert ANONYMIZED_TOMBSTONE_KEY in att.registration_answers
        logs = (
            await sess.execute(select(AnonymizationLog).where(AnonymizationLog.attendee_id == seeded["attendee_id"]))
        ).scalars().all()
        assert len(logs) == 1
        assert logs[0].organization_id is not None       # org resolved into the audit row
        assert "tckn" in (logs[0].field_ids or [])


@pytest.mark.asyncio
async def test_sweep_approve_pends_and_does_not_dispose():
    seeded = await _seed(trigger="approve")
    summary = await run_anonymization_sweep(now=datetime(2026, 6, 1, tzinfo=UTC))
    assert seeded["admin_email"] in summary["pending_by_admin"]

    async with SessionLocal() as sess:
        att = await sess.get(Attendee, seeded["attendee_id"])
        assert att.anonymized_at is None                 # NOT disposed without approval
        assert att.registration_answers.get("tckn") == "12345678901"


@pytest.mark.asyncio
async def test_materialize_fills_null_anonymize_after():
    seeded = await _seed(trigger="auto", days=30, with_after=False)
    await materialize_anonymize_after(now=datetime(2026, 6, 1, tzinfo=UTC))
    async with SessionLocal() as sess:
        att = await sess.get(Attendee, seeded["attendee_id"])
        # registered_at 2026-01-01 + 30d. SQLite returns naive datetimes while Postgres
        # returns tz-aware; strip tzinfo so the assertion holds on both.
        assert att.anonymize_after.replace(tzinfo=None) == datetime(2026, 1, 31, 0, 0)


@pytest.mark.asyncio
async def test_recompute_clears_when_disabled():
    seeded = await _seed(trigger="auto", enabled=True, past_due=True)
    async with SessionLocal() as sess:
        event = await sess.get(Event, seeded["event_id"])
        config = dict(event.config)
        config["retention"] = {"enabled": False}
        event.config = config
        changed = await recompute_event_anonymize_after(sess, event, policy=None, commit=True)
        assert changed >= 1
        att = await sess.get(Attendee, seeded["attendee_id"])
        assert att.anonymize_after is None               # no longer scheduled


# ── Real DB: retention policy endpoint ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_retention_policy_endpoint_set_get_and_validation():
    async with SessionLocal() as sess:
        async with sess.begin():
            admin = User(email="anon-endpoint@test.com", password_hash="x", role=Role.admin)
            sess.add(admin)
            await sess.flush()
            event = Event(admin_id=admin.id, name="Endpoint Ev", template_image_url="t.png", config={})
            sess.add(event)
            await sess.flush()
            admin_id, event_id = admin.id, event.id

    token = create_access_token(user_id=admin_id, role=Role.admin)
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # invalid: relative without days -> 400
        bad = await ac.put(
            f"/api/admin/events/{event_id}/retention-policy",
            json={"enabled": True, "mode": "relative"}, headers=headers,
        )
        assert bad.status_code == 400

        ok = await ac.put(
            f"/api/admin/events/{event_id}/retention-policy",
            json={"enabled": True, "mode": "relative", "retention_days": 90, "trigger": "auto"},
            headers=headers,
        )
        assert ok.status_code == 200
        assert ok.json()["effective"]["retention_days"] == 90

        got = await ac.get(f"/api/admin/events/{event_id}/retention-policy", headers=headers)
        assert got.status_code == 200
        assert got.json()["policy"]["trigger"] == "auto"


def test_org_default_fallback_and_event_override():
    org_settings = {"retention_default": {"enabled": True, "mode": "relative", "retention_days": 60}}
    # event with no per-event policy -> inherits org default
    ev_none = Event(id=901, admin_id=1, name="E", template_image_url="t.png", config={})
    p = _get_event_retention_policy(ev_none, org_settings)
    assert p is not None and p["retention_days"] == 60
    # event-level policy overrides the org default
    ev_over = Event(id=902, admin_id=1, name="E2", template_image_url="t.png",
                    config={"retention": {"enabled": True, "mode": "relative", "retention_days": 10}})
    assert _get_event_retention_policy(ev_over, org_settings)["retention_days"] == 10


@pytest.mark.asyncio
async def test_approve_endpoint_status_and_disposal():
    seeded = await _seed(trigger="approve")
    token = create_access_token(user_id=seeded["admin_id"], role=Role.admin)
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        status = await ac.get(
            f"/api/admin/events/{seeded['event_id']}/anonymization-status", headers=headers
        )
        assert status.status_code == 200
        body = status.json()
        assert body["trigger"] == "approve" and body["pending"] == 1

        approved = await ac.post(
            f"/api/admin/events/{seeded['event_id']}/anonymization-approve", headers=headers
        )
        assert approved.status_code == 200 and approved.json()["disposed"] == 1

        after = await ac.get(
            f"/api/admin/events/{seeded['event_id']}/anonymization-status", headers=headers
        )
        assert after.json()["pending"] == 0 and after.json()["anonymized"] == 1

    async with SessionLocal() as sess:
        att = await sess.get(Attendee, seeded["attendee_id"])
        assert att.anonymized_at is not None
        assert "tckn" not in (att.registration_answers or {})


# ── Phase C: erase-all, file deletion, member purge, pre-warning ─────────────────

@pytest.mark.asyncio
async def test_erase_all_disposes_all_answers_and_contact():
    db = MagicMock()
    event = _make_event(registration_fields=[{"id": "tckn", "label": "TC", "type": "text", "pii": False}])
    att = Attendee(
        id=71, event_id=10, name="Ali", email="ali@x.com", source="self_register",
        registration_answers={"tckn": "1", "note": "x", "__kvkk": {"accepted": True}},
    )
    disposed = await anonymize_attendee(db, att, event, trigger="member_deletion", erase_all=True)
    assert set(disposed) >= {"tckn", "note", "name", "email"}
    ans = att.registration_answers
    assert "tckn" not in ans and "note" not in ans
    assert ans.get("__kvkk") == {"accepted": True}          # reserved key preserved
    assert att.name != "Ali" and att.email.endswith("@anonymized.invalid")


@pytest.mark.asyncio
async def test_file_field_disposal_deletes_document():
    root = Path(settings.local_storage_dir).resolve()
    doc_dir = root / "regdocs_test"
    doc_dir.mkdir(parents=True, exist_ok=True)
    f = doc_dir / "id-scan.pdf"
    f.write_bytes(b"%PDF-1.4 fake")
    rel = "regdocs_test/id-scan.pdf"
    assert f.exists()

    db = MagicMock()
    event = _make_event(registration_fields=[{"id": "idscan", "label": "Kimlik", "type": "file", "pii": True}])
    att = Attendee(
        id=72, event_id=10, name="B", email="b@x.com", source="self_register",
        registration_answers={
            "idscan": rel,
            "__documents": [{"field_id": "idscan", "path": rel, "name": "id-scan.pdf"}],
        },
    )
    disposed = await anonymize_attendee(db, att, event, trigger="auto")
    assert "idscan" in disposed
    assert not f.exists()                                    # physical file deleted
    assert "__documents" not in att.registration_answers     # pruned (only doc removed)


@pytest.mark.asyncio
async def test_member_purge_erases_and_is_idempotent():
    async with SessionLocal() as sess:
        async with sess.begin():
            admin = User(email=f"purge-adm-{uuid.uuid4().hex[:8]}@test.com", password_hash="x", role=Role.admin)
            sess.add(admin)
            await sess.flush()
            event = Event(admin_id=admin.id, name="Ev", template_image_url="t.png", config={})
            sess.add(event)
            await sess.flush()
            member = PublicMember(
                public_id=f"pm-{uuid.uuid4().hex[:8]}",
                email=f"m-{uuid.uuid4().hex[:8]}@x.com",
                display_name="Silinmiş Üye",
                password_hash="x",
                deleted_at=datetime(2020, 1, 1, tzinfo=UTC),
            )
            sess.add(member)
            await sess.flush()
            att = Attendee(
                event_id=event.id, name="Real Name", email=f"att-{uuid.uuid4().hex[:8]}@x.com",
                source="self_register", public_member_id=member.id,
                registration_answers={"tckn": "12345678901", "note": "keep?"},
            )
            sess.add(att)
            await sess.flush()
            member_id, att_id = member.id, att.id

    purged = await purge_deleted_members(now=datetime(2026, 6, 1, tzinfo=UTC))
    assert purged >= 1

    async with SessionLocal() as sess:
        m = await sess.get(PublicMember, member_id)
        assert m.purged_at is not None
        assert m.email == f"deleted-{member_id}@deleted.invalid"
        a = await sess.get(Attendee, att_id)
        assert a.anonymized_at is not None
        answers = a.registration_answers or {}
        assert "tckn" not in answers and "note" not in answers
        assert a.name != "Real Name"

    # idempotent: nothing left to purge
    assert await purge_deleted_members(now=datetime(2026, 6, 1, tzinfo=UTC)) == 0


@pytest.mark.asyncio
async def test_pre_warning_marks_and_dedupes():
    async with SessionLocal() as sess:
        async with sess.begin():
            admin = User(email=f"warn-adm-{uuid.uuid4().hex[:8]}@test.com", password_hash="x", role=Role.admin)
            sess.add(admin)
            await sess.flush()
            event = Event(
                admin_id=admin.id, name="Warn Ev", template_image_url="t.png",
                config={
                    "registration_fields": [{"id": "tckn", "label": "TC", "type": "text", "pii": True}],
                    "retention": {"enabled": True, "mode": "relative", "retention_days": 30,
                                  "trigger": "auto", "notify_before_days": 7, "include_name_email": False},
                },
            )
            sess.add(event)
            await sess.flush()
            att = Attendee(
                event_id=event.id, name="C", email=f"c-{uuid.uuid4().hex[:8]}@x.com",
                source="self_register", registration_answers={"tckn": "1"},
                anonymize_after=datetime(2026, 6, 5, tzinfo=UTC),  # 4 days after `now` below
            )
            sess.add(att)
            await sess.flush()
            admin_email, att_id = admin.email, att.id

    now = datetime(2026, 6, 1, tzinfo=UTC)  # disposal in 4 days, inside the 7-day window
    summary = await send_pre_warnings(now=now)
    assert admin_email in summary["warned_by_admin"]

    async with SessionLocal() as sess:
        a = await sess.get(Attendee, att_id)
        assert a.registration_answers.get(PRE_WARNING_MARKER_KEY)

    # second run: already marked -> not warned again
    summary2 = await send_pre_warnings(now=now)
    assert admin_email not in summary2["warned_by_admin"]
