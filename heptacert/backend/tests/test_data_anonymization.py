"""WP28 — KVKK data retention & anonymization tests.

Covers three layers:
  * pure policy helpers (normalize / resolve / collect pii ids) — no DB;
  * the disposal engine via a mock session (irreversibility, idempotency, cert/name
    preservation, opt-in name/email) — no DB;
  * the sweep / materialize / recompute + the retention-policy endpoint — real
    (SQLite in-memory) DB, mirroring the seeding style of the other integration tests.
"""

import uuid
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
    ANONYMIZED_TOMBSTONE_KEY,
)
from src.models import Attendee, Event, User, Organization, AnonymizationLog
from src.main import SessionLocal, Role, app, create_access_token

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
            return {"admin_email": admin.email, "event_id": event.id, "attendee_id": att.id}


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
