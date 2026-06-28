"""Event-driven refresh helpers for participant CRM snapshots."""

from datetime import datetime, timezone

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    Attendee,
    AttendaonceRecord,
    Certificate,
    Event,
    EventTicket,
    Organization,
    ParticipantCrmAuditLog,
    ParticipantCrmEmailAlias,
    ParticipantCrmProfile,
    ParticipantCrmSnapshot,
)


def _normalize_email(email: str | None) -> str:
    return (email or "").strip().lower()


def _name_key(value: str | None) -> str:
    return (value or "").strip().lower()


async def _canonical_email(db: AsyncSession, org_id: int, email: str) -> str:
    normalized = _normalize_email(email)
    if not normalized:
        return ""
    alias_res = await db.execute(
        select(ParticipantCrmEmailAlias.target_email).where(
            ParticipantCrmEmailAlias.organization_id == org_id,
            ParticipantCrmEmailAlias.source_email == normalized,
        )
    )
    return alias_res.scalar_one_or_none() or normalized


async def _identity_emails(db: AsyncSession, org_id: int, canonical_email: str) -> list[str]:
    rows = (
        await db.execute(
            select(ParticipantCrmEmailAlias.source_email).where(
                ParticipantCrmEmailAlias.organization_id == org_id,
                ParticipantCrmEmailAlias.target_email == canonical_email,
            )
        )
    ).scalars().all()
    return list(dict.fromkeys([canonical_email, *[_normalize_email(item) for item in rows if item]]))


async def _organization_for_event(db: AsyncSession, event: Event) -> Organization | None:
    org_res = await db.execute(
        select(Organization)
        .where(Organization.user_id == event.admin_id)
        .order_by(Organization.id.asc())
        .limit(1)
    )
    return org_res.scalar_one_or_none()


async def refresh_crm_snapshot_for_event_email(
    db: AsyncSession,
    *,
    event_id: int,
    email: str | None,
) -> ParticipantCrmSnapshot | None:
    normalized = _normalize_email(email)
    if not normalized:
        return None
    event = await db.get(Event, event_id)
    if not event:
        return None
    org = await _organization_for_event(db, event)
    if not org:
        return None

    canonical = await _canonical_email(db, org.id, normalized)
    identity_emails = await _identity_emails(db, org.id, canonical)
    rows = (
        await db.execute(
            select(Attendee, Event)
            .join(Event, Event.id == Attendee.event_id)
            .where(
                Event.admin_id == org.user_id,
                Attendee.email.is_not(None),
                func.lower(func.trim(Attendee.email)).in_(identity_emails),
            )
            .order_by(Attendee.registered_at.desc(), Attendee.id.desc())
        )
    ).all()
    if not rows:
        snapshot_res = await db.execute(
            select(ParticipantCrmSnapshot).where(
                ParticipantCrmSnapshot.organization_id == org.id,
                ParticipantCrmSnapshot.email == canonical,
            )
        )
        snapshot = snapshot_res.scalar_one_or_none()
        if snapshot:
            await db.delete(snapshot)
            await db.flush()
        return None

    attendee_ids = [attendee.id for attendee, _event in rows]
    attended_record_res = await db.execute(
        select(AttendaonceRecord.attendee_id).where(AttendaonceRecord.attendee_id.in_(attendee_ids))
    )
    ticket_checkin_res = await db.execute(
        select(EventTicket.attendee_id).where(EventTicket.attendee_id.in_(attendee_ids), EventTicket.checked_in_at.is_not(None))
    )
    attended_ids = {int(item) for item in attended_record_res.scalars().all() if item}
    attended_ids.update(int(item) for item in ticket_checkin_res.scalars().all() if item)
    ticket_count_res = await db.execute(select(func.count(EventTicket.id)).where(EventTicket.attendee_id.in_(attendee_ids)))

    certificate_count = 0
    for attendee, attendee_event in rows:
        # Prefer the canonical attendee_id link; fall back to name only for legacy/
        # unlinked certs so same-name attendees aren't counted against each other.
        cert_res = await db.execute(
            select(func.count(Certificate.id)).where(
                Certificate.event_id == attendee_event.id,
                Certificate.deleted_at.is_(None),
                or_(
                    Certificate.attendee_id == attendee.id,
                    and_(
                        Certificate.attendee_id.is_(None),
                        func.lower(func.trim(Certificate.student_name)) == _name_key(attendee.name),
                    ),
                ),
            )
        )
        certificate_count += int(cert_res.scalar_one() or 0)

    snapshot_res = await db.execute(
        select(ParticipantCrmSnapshot).where(
            ParticipantCrmSnapshot.organization_id == org.id,
            ParticipantCrmSnapshot.email == canonical,
        )
    )
    snapshot = snapshot_res.scalar_one_or_none()
    if not snapshot:
        snapshot = ParticipantCrmSnapshot(organization_id=org.id, email=canonical)
        db.add(snapshot)

    snapshot.name = rows[0][0].name
    snapshot.event_count = len({row_event.id for _attendee, row_event in rows})
    snapshot.certificate_count = certificate_count
    snapshot.attended_count = len(attended_ids)
    snapshot.survey_count = sum(1 for attendee, _event in rows if attendee.survey_completed_at is not None)
    snapshot.ticket_count = int(ticket_count_res.scalar_one() or 0)
    snapshot.latest_activity_at = max((attendee.registered_at for attendee, _event in rows if attendee.registered_at), default=None)
    snapshot.computed_at = datetime.now(timezone.utc)
    await db.flush()
    return snapshot


async def refresh_crm_snapshot_for_attendee(db: AsyncSession, attendee: Attendee | int) -> ParticipantCrmSnapshot | None:
    row = await db.get(Attendee, attendee) if isinstance(attendee, int) else attendee
    if not row:
        return None
    return await refresh_crm_snapshot_for_event_email(db, event_id=row.event_id, email=row.email)


async def auto_tag_certified_for_attendee_email(
    db: AsyncSession,
    *,
    org_id: int,
    email: str,
) -> bool:
    """Add the 'certified' tag to the CRM profile of an attendee when a certificate is issued."""
    canonical = await _canonical_email(db, org_id, email)
    if not canonical:
        return False
    profile_res = await db.execute(
        select(ParticipantCrmProfile).where(
            ParticipantCrmProfile.organization_id == org_id,
            ParticipantCrmProfile.email == canonical,
        )
    )
    profile = profile_res.scalar_one_or_none()
    if not profile:
        profile = ParticipantCrmProfile(organization_id=org_id, email=canonical, notes="", tags=[], lifecycle_status="lead")
        db.add(profile)
        before = None
    else:
        before = list(profile.tags or [])
    tags = list(dict.fromkeys([*(profile.tags or []), "certified"]))
    if tags == (before or []):
        return False
    profile.tags = tags
    profile.updated_at = datetime.now(timezone.utc)
    db.add(ParticipantCrmAuditLog(
        organization_id=org_id,
        email=canonical,
        actor_user_id=None,
        action="profile.auto_tag_certified",
        before={"tags": before or []},
        after={"tags": tags},
    ))
    return True


async def refresh_crm_snapshots_for_certificate_name(
    db: AsyncSession,
    *,
    event_id: int,
    student_name: str | None,
) -> int:
    name = _name_key(student_name)
    if not name:
        return 0
    attendees = (
        await db.execute(
            select(Attendee).where(
                Attendee.event_id == event_id,
                func.lower(func.trim(Attendee.name)) == name,
                Attendee.email.is_not(None),
                func.trim(Attendee.email) != "",
            )
        )
    ).scalars().all()
    refreshed = 0
    for attendee in attendees:
        if await refresh_crm_snapshot_for_attendee(db, attendee):
            refreshed += 1
    return refreshed
