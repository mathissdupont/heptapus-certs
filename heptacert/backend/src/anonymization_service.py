"""KVKK data retention & anonymization engine (WP28).

Irreversibly disposes of ``pii``-marked registration answers once an event's
retention period expires. Disposal removes the value keys from
``Attendee.registration_answers``, writes a PII-free ``__anonymized`` tombstone, sets
``Attendee.anonymized_at`` (the idempotency guard), and appends an ``AnonymizationLog``
row. No original value is retained anywhere — disposal is irreversible by design
(this is KVKK *anonymization*, not reversible pseudonymization).

``name`` / ``email`` are preserved by default so issued certificates stay verifiable;
they are only disposed when the org explicitly opts in via ``include_name_email``.

Everything here is session-driven so it is unit-testable without the scheduler. The
daily scheduler job calls :func:`run_anonymization_sweep` and sends notifications from
the returned summary; the admin approval endpoint (Phase B) can call
:func:`anonymize_attendee` / :func:`anonymize_event_due` directly.

Design notes:
- The per-field ``pii`` flag and the retention policy are read WITHOUT importing
  ``main`` (which imports this module transitively). Registration fields are read
  straight from ``event.config``; the retention policy comes from ``services``.
- Physical deletion of uploaded files referenced by ``__documents`` for pii-marked
  file fields is a documented follow-up (Phase C); this engine removes the answer
  value and records the field id.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import SessionLocal
from .models import Attendee, Event, User, Organization, PublicMember, AnonymizationLog
from .services import _get_event_retention_policy, _resolve_anonymize_after

logger = logging.getLogger(__name__)

# Reserved key written into registration_answers to record that disposal happened
# without storing any original value. Mirrors the existing __kvkk / __documents keys.
ANONYMIZED_TOMBSTONE_KEY = "__anonymized"


def _collect_pii_field_ids(event: Event) -> List[str]:
    """Return the ids of registration fields the org marked as PII on this event.

    Read directly from event.config (fields are already normalized on write) to avoid
    importing main. Reserved keys (``__...``) are never treated as PII fields.
    """
    config = event.config or {}
    fields = config.get("registration_fields")
    if not isinstance(fields, list):
        return []
    ids: List[str] = []
    for item in fields:
        if not isinstance(item, dict) or not item.get("pii"):
            continue
        fid = str(item.get("id") or "").strip()
        if fid and not fid.startswith("__"):
            ids.append(fid)
    return ids


def _safe_unlink(rel_path: Any) -> None:
    """Delete a stored registration document, guarding against path traversal."""
    if not rel_path:
        return
    try:
        root = Path(settings.local_storage_dir).resolve()
        target = (root / str(rel_path)).resolve()
        if target.is_relative_to(root) and target.is_file():
            target.unlink()
    except Exception:
        logger.warning("Anonymization: could not delete document file %s", rel_path)


def _delete_disposed_documents(answers: Dict[str, Any], disposed: List[str]) -> None:
    """Physically remove uploaded files for disposed file fields and prune __documents."""
    docs = answers.get("__documents")
    if not isinstance(docs, list) or not docs:
        return
    disposed_set = set(disposed)
    remaining: List[Any] = []
    for doc in docs:
        if isinstance(doc, dict) and str(doc.get("field_id") or "") in disposed_set:
            _safe_unlink(doc.get("path"))
        else:
            remaining.append(doc)
    if remaining:
        answers["__documents"] = remaining
    else:
        answers.pop("__documents", None)


async def anonymize_attendee(
    db: AsyncSession,
    attendee: Attendee,
    event: Event,
    *,
    trigger: str = "auto",
    include_name_email: bool = False,
    erase_all: bool = False,
    organization_id: Optional[int] = None,
    commit: bool = False,
) -> Optional[List[str]]:
    """Irreversibly dispose of an attendee's pii-marked answers.

    Idempotent: returns ``None`` (and does nothing) when the attendee is already
    anonymized. Otherwise removes each pii-marked value from ``registration_answers``,
    writes the ``__anonymized`` tombstone, sets ``anonymized_at``, appends an
    ``AnonymizationLog`` row, and returns the list of disposed field ids (which may be
    empty when the retention period expired but nothing was marked/present — the
    attendee is still marked handled so the sweep never reprocesses it).
    """
    if attendee.anonymized_at is not None:
        return None

    now = datetime.now(timezone.utc)
    # Reassign a fresh dict (do NOT mutate in place) so SQLAlchemy flags the JSONB
    # column dirty and actually persists the change.
    answers: Dict[str, Any] = dict(attendee.registration_answers or {})
    disposed: List[str] = []

    if erase_all:
        # Right-to-erasure (member deletion): dispose every answer, not just pii-marked
        # ones, and force name/email disposal. Reserved system keys (__...) stay intact.
        target_ids = [key for key in answers.keys() if not key.startswith("__")]
        include_name_email = True
    else:
        target_ids = _collect_pii_field_ids(event)

    for fid in target_ids:
        if fid in answers:
            answers.pop(fid, None)
            disposed.append(fid)

    # Physically delete uploaded files behind any disposed file-type field.
    _delete_disposed_documents(answers, disposed)

    if include_name_email:
        # name/email are NOT NULL columns (email also unique per event), so we overwrite
        # with a deterministic, non-identifying placeholder rather than deleting. Using
        # the attendee id keeps the per-event email uniqueness constraint satisfied.
        attendee.name = "Anonimleştirilmiş Katılımcı"
        attendee.email = f"anonymized-{attendee.id}@anonymized.invalid"
        disposed.extend(["name", "email"])

    answers[ANONYMIZED_TOMBSTONE_KEY] = {
        "at": now.isoformat(),
        "fields": disposed,
        "trigger": trigger,
    }
    attendee.registration_answers = answers
    attendee.anonymized_at = now

    db.add(
        AnonymizationLog(
            attendee_id=attendee.id,
            event_id=event.id,
            organization_id=organization_id,
            field_ids=disposed,
            method="key_removal",
            trigger=trigger,
        )
    )

    if commit:
        await db.commit()
    return disposed


async def _resolve_org(db: AsyncSession, admin_id: int, cache: Dict[int, Optional[Organization]]) -> Optional[Organization]:
    if admin_id not in cache:
        res = await db.execute(select(Organization).where(Organization.user_id == admin_id))
        cache[admin_id] = res.scalar_one_or_none()
    return cache[admin_id]


async def recompute_event_anonymize_after(
    db: AsyncSession,
    event: Event,
    *,
    policy: Optional[Dict[str, Any]] = None,
    org_settings: Optional[Dict[str, Any]] = None,
    only_null: bool = False,
    commit: bool = True,
) -> int:
    """(Re)compute anonymize_after for an event's not-yet-anonymized attendees.

    Called immediately by the retention endpoint when the policy changes so admins see
    the effect at once, and by the daily materialization pass (``only_null=True``) to
    fill in newly registered attendees. When the policy is None/disabled, anonymize_after
    is cleared so the sweep stops targeting the event. ``only_null`` restricts work to
    attendees whose anonymize_after is still NULL (cheap backfill, no churn on existing).
    Returns the number of rows whose anonymize_after actually changed.
    """
    if policy is None and org_settings is not None:
        policy = _get_event_retention_policy(event, org_settings)

    conditions = [Attendee.event_id == event.id, Attendee.anonymized_at.is_(None)]
    if only_null:
        conditions.append(Attendee.anonymize_after.is_(None))

    res = await db.execute(select(Attendee).where(*conditions))
    changed = 0
    for attendee in res.scalars():
        new_after = _resolve_anonymize_after(policy, attendee.registered_at) if policy else None
        if attendee.anonymize_after != new_after:
            attendee.anonymize_after = new_after
            changed += 1

    if commit:
        await db.commit()
    return changed


async def materialize_anonymize_after(
    db: Optional[AsyncSession] = None,
    *,
    now: Optional[datetime] = None,
) -> int:
    """Backfill anonymize_after for retention-enabled events (daily, before the sweep).

    Resolves each event's effective policy (per-event config, falling back to the org
    default) and fills anonymize_after for attendees that still have it NULL. This is how
    attendees registered since the last pass get scheduled without touching the
    registration hot path. Events far outnumber attendees only pathologically, so
    scanning events daily is acceptable for Phase A (optimizable via a JSONB filter later).
    Returns the number of attendee rows updated.
    """
    owns_session = db is None
    if db is None:
        db = SessionLocal()
    now = now or datetime.now(timezone.utc)
    updated = 0
    try:
        events = (await db.execute(select(Event))).scalars().all()
        org_cache: Dict[int, Optional[Organization]] = {}
        for event in events:
            org = await _resolve_org(db, event.admin_id, org_cache)
            policy = _get_event_retention_policy(event, org.settings if org else None)
            if not policy:
                continue
            updated += await recompute_event_anonymize_after(
                db, event, policy=policy, only_null=True, commit=False
            )
        await db.commit()
    except Exception:
        await db.rollback()
        logger.exception("Anonymize-after materialization failed")
        raise
    finally:
        if owns_session:
            await db.close()
    if updated:
        logger.info("Anonymize-after materialization: %d attendee(s) scheduled", updated)
    return updated


async def run_anonymization_sweep(
    db: Optional[AsyncSession] = None,
    *,
    now: Optional[datetime] = None,
    limit: int = 1000,
) -> Dict[str, Any]:
    """Dispose of all due attendees under ``auto``-trigger policies; flag ``approve`` ones.

    A due attendee is one with ``anonymize_after <= now`` and ``anonymized_at IS NULL``
    (indexed query). The effective retention policy is resolved per event
    (event config, falling back to the org default); ``auto`` events are disposed
    immediately, ``approve`` events are collected as pending for the admin to confirm.
    Policies that have since been disabled are skipped defensively.

    Returns a JSON-serializable summary the caller uses to send notifications::

        {"scanned": int, "disposed_count": int,
         "disposed_by_admin": {email: {"count": int, "events": {event_id: {name, count}}}},
         "pending_by_admin":  {email: {"count": int, "events": {event_id: {name, count}}}}}
    """
    owns_session = db is None
    if db is None:
        db = SessionLocal()
    now = now or datetime.now(timezone.utc)

    disposed_by_admin: Dict[str, Dict[str, Any]] = {}
    pending_by_admin: Dict[str, Dict[str, Any]] = {}
    scanned = 0
    disposed_count = 0

    def _bucket(target: Dict[str, Dict[str, Any]], admin_email: str, event: Event) -> None:
        entry = target.setdefault(admin_email, {"count": 0, "events": {}})
        entry["count"] += 1
        ev = entry["events"].setdefault(event.id, {"name": event.name, "count": 0})
        ev["count"] += 1

    try:
        res = await db.execute(
            select(Attendee, Event, User)
            .join(Event, Attendee.event_id == Event.id)
            .join(User, Event.admin_id == User.id)
            .where(
                Attendee.anonymize_after.is_not(None),
                Attendee.anonymize_after <= now,
                Attendee.anonymized_at.is_(None),
            )
            .order_by(Attendee.event_id)
            .limit(limit)
        )
        rows = res.all()
        if len(rows) >= limit:
            logger.info(
                "Anonymization sweep hit batch limit %d; remaining due attendees run next cycle",
                limit,
            )

        org_cache: Dict[int, Optional[Organization]] = {}
        policy_cache: Dict[int, Optional[Dict[str, Any]]] = {}

        for attendee, event, admin in rows:
            scanned += 1
            if event.id not in policy_cache:
                org = await _resolve_org(db, event.admin_id, org_cache)
                org_settings = org.settings if org else None
                policy_cache[event.id] = _get_event_retention_policy(event, org_settings)
            policy = policy_cache[event.id]
            if not policy:
                # Retention was disabled after anonymize_after was set — respect the
                # current policy and skip (materialization clears stale dates on change).
                continue

            if policy.get("trigger") == "approve":
                _bucket(pending_by_admin, admin.email, event)
                continue

            org = await _resolve_org(db, event.admin_id, org_cache)
            disposed = await anonymize_attendee(
                db,
                attendee,
                event,
                trigger="auto",
                include_name_email=bool(policy.get("include_name_email")),
                organization_id=(org.id if org else None),
                commit=False,
            )
            if disposed is not None:
                disposed_count += 1
                _bucket(disposed_by_admin, admin.email, event)

        await db.commit()
    except Exception:
        await db.rollback()
        logger.exception("Anonymization sweep failed")
        raise
    finally:
        if owns_session:
            await db.close()

    if disposed_count or pending_by_admin:
        logger.info(
            "Anonymization sweep: scanned=%d disposed=%d pending_admins=%d",
            scanned,
            disposed_count,
            len(pending_by_admin),
        )
    return {
        "scanned": scanned,
        "disposed_count": disposed_count,
        "disposed_by_admin": disposed_by_admin,
        "pending_by_admin": pending_by_admin,
    }


async def anonymize_event_pending(
    db: AsyncSession,
    event: Event,
    *,
    now: Optional[datetime] = None,
    org_settings: Optional[Dict[str, Any]] = None,
    organization_id: Optional[int] = None,
    commit: bool = True,
) -> int:
    """Dispose every due, not-yet-anonymized attendee of one event (approve-mode confirm).

    Called by the admin approval endpoint when an organizer confirms an ``approve``-trigger
    disposal. Disposal is irreversible. Honors the effective policy's include_name_email.
    Returns the number of attendees disposed.
    """
    now = now or datetime.now(timezone.utc)
    policy = _get_event_retention_policy(event, org_settings)
    include_name_email = bool(policy.get("include_name_email")) if policy else False

    res = await db.execute(
        select(Attendee).where(
            Attendee.event_id == event.id,
            Attendee.anonymized_at.is_(None),
            Attendee.anonymize_after.is_not(None),
            Attendee.anonymize_after <= now,
        )
    )
    disposed = 0
    for attendee in res.scalars():
        result = await anonymize_attendee(
            db,
            attendee,
            event,
            trigger="approve",
            include_name_email=include_name_email,
            organization_id=organization_id,
            commit=False,
        )
        if result is not None:
            disposed += 1

    if commit:
        await db.commit()
    return disposed


PRE_WARNING_MARKER_KEY = "__anon_warned_at"


async def send_pre_warnings(
    db: Optional[AsyncSession] = None,
    *,
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Flag attendees approaching irreversible disposal so admins can be pre-warned.

    Scans attendees whose anonymize_after falls within their event's notify_before_days
    window (and are not yet warned or anonymized), stamps a __anon_warned_at marker for
    dedup, and returns a by-admin summary the caller emails. Applies to both triggers.
    """
    owns_session = db is None
    if db is None:
        db = SessionLocal()
    now = now or datetime.now(timezone.utc)
    max_window = 365  # widest possible notify_before_days; narrowed per policy below
    warned_by_admin: Dict[str, Dict[str, Any]] = {}
    try:
        res = await db.execute(
            select(Attendee, Event, User)
            .join(Event, Attendee.event_id == Event.id)
            .join(User, Event.admin_id == User.id)
            .where(
                Attendee.anonymize_after.is_not(None),
                Attendee.anonymized_at.is_(None),
                Attendee.anonymize_after > now,
                Attendee.anonymize_after <= now + timedelta(days=max_window),
            )
            .order_by(Attendee.event_id)
        )
        rows = res.all()
        org_cache: Dict[int, Optional[Organization]] = {}
        policy_cache: Dict[int, Optional[Dict[str, Any]]] = {}
        for attendee, event, admin in rows:
            answers = attendee.registration_answers or {}
            if answers.get(PRE_WARNING_MARKER_KEY):
                continue
            if event.id not in policy_cache:
                org = await _resolve_org(db, event.admin_id, org_cache)
                policy_cache[event.id] = _get_event_retention_policy(event, org.settings if org else None)
            policy = policy_cache[event.id]
            if not policy:
                continue
            lead = int(policy.get("notify_before_days") or 0)
            if lead <= 0:
                continue  # no pre-warning configured
            due_at = attendee.anonymize_after
            if due_at.tzinfo is None:  # SQLite returns naive datetimes; Postgres is aware
                due_at = due_at.replace(tzinfo=timezone.utc)
            if due_at > now + timedelta(days=lead):
                continue  # not yet within the warning window
            updated = dict(answers)
            updated[PRE_WARNING_MARKER_KEY] = now.isoformat()
            attendee.registration_answers = updated
            entry = warned_by_admin.setdefault(admin.email, {"count": 0, "events": {}})
            entry["count"] += 1
            ev = entry["events"].setdefault(event.id, {"name": event.name, "count": 0})
            ev["count"] += 1
        await db.commit()
    except Exception:
        await db.rollback()
        logger.exception("Anonymization pre-warning scan failed")
        raise
    finally:
        if owns_session:
            await db.close()
    return {"warned_by_admin": warned_by_admin}


async def purge_deleted_members(
    db: Optional[AsyncSession] = None,
    *,
    now: Optional[datetime] = None,
    purge_after_days: int = 30,
) -> int:
    """Complete the post-deletion PII purge promised to members who deleted their account.

    For each PublicMember whose deleted_at matured (>= purge_after_days ago) and has not
    been purged: irreversibly erase their attendee data across all events (erase_all) and
    scrub their remaining account PII (email -> sentinel, interests cleared), then stamp
    purged_at. Certificates keep their frozen student_name and stay verifiable. Idempotent
    via purged_at. Returns the number of members purged.
    """
    owns_session = db is None
    if db is None:
        db = SessionLocal()
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(days=purge_after_days)
    purged = 0
    try:
        res = await db.execute(
            select(PublicMember).where(
                PublicMember.deleted_at.is_not(None),
                PublicMember.deleted_at <= cutoff,
                PublicMember.purged_at.is_(None),
            )
        )
        members = res.scalars().all()
        org_cache: Dict[int, Optional[Organization]] = {}
        for member in members:
            att_res = await db.execute(
                select(Attendee, Event)
                .join(Event, Attendee.event_id == Event.id)
                .where(Attendee.public_member_id == member.id, Attendee.anonymized_at.is_(None))
            )
            for attendee, event in att_res.all():
                org = await _resolve_org(db, event.admin_id, org_cache)
                await anonymize_attendee(
                    db,
                    attendee,
                    event,
                    trigger="member_deletion",
                    erase_all=True,
                    organization_id=(org.id if org else None),
                    commit=False,
                )
            # The delete endpoint scrubbed profile fields but left email intact; finish it.
            member.email = f"deleted-{member.id}@deleted.invalid"
            member.interests = []
            member.purged_at = now
            purged += 1
        await db.commit()
    except Exception:
        await db.rollback()
        logger.exception("Member purge failed")
        raise
    finally:
        if owns_session:
            await db.close()
    if purged:
        logger.info("Member purge: %d deleted member(s) fully erased", purged)
    return purged
