"""Organization-level participant CRM endpoints."""

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    Attendee,
    AttendaonceRecord,
    Certificate,
    CurrentUser,
    Event,
    EventTicket,
    Organization,
    ParticipantCrmProfile,
    Role,
    SurveyResponse,
    get_current_user,
    get_db,
    require_role,
)
from .organization_access_api import get_organization_for_access, organization_id_from_request

router = APIRouter()


class ParticipantCrmIn(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    notes: Optional[str] = Field(default=None, max_length=5000)
    tags: Optional[list[str]] = None
    lifecycle_status: Optional[str] = Field(default=None, max_length=64)


class ParticipantCrmMeta(BaseModel):
    notes: str = ""
    tags: list[str] = Field(default_factory=list)
    lifecycle_status: str = "lead"
    updated_at: Optional[datetime] = None


class ParticipantCrmListItem(BaseModel):
    email: str
    name: str
    event_count: int
    certificate_count: int
    attended_count: int
    survey_count: int
    latest_activity_at: Optional[datetime] = None
    meta: ParticipantCrmMeta


class ParticipantCrmDetail(BaseModel):
    email: str
    name: str
    meta: ParticipantCrmMeta
    summary: dict[str, int]
    history: list[dict[str, Any]]
    timeline: list[dict[str, Any]]


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _crm_key(org_id: int, email: str) -> str:
    return f"event_crm:{org_id}:{_normalize_email(email)}"


def _name_key(value: str) -> str:
    return (value or "").strip().lower()


async def _admin_org(db: AsyncSession, me: CurrentUser, request: Request):
    return await get_organization_for_access(db, me, "organization:view", organization_id_from_request(request))


async def _load_meta(db: AsyncSession, org_id: int, email: str) -> ParticipantCrmMeta:
    row_res = await db.execute(
        select(ParticipantCrmProfile).where(
            ParticipantCrmProfile.organization_id == org_id,
            ParticipantCrmProfile.email == _normalize_email(email),
        )
    )
    row = row_res.scalar_one_or_none()
    if not row:
        return ParticipantCrmMeta()
    tags = [str(item).strip() for item in row.tags or [] if str(item).strip()]
    return ParticipantCrmMeta(
        notes=row.notes or "",
        tags=list(dict.fromkeys(tags))[:20],
        lifecycle_status=row.lifecycle_status or "lead",
        updated_at=row.updated_at,
    )


async def _save_meta(db: AsyncSession, org_id: int, payload: ParticipantCrmIn) -> ParticipantCrmMeta:
    email = _normalize_email(payload.email)
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    row_res = await db.execute(
        select(ParticipantCrmProfile).where(ParticipantCrmProfile.organization_id == org_id, ParticipantCrmProfile.email == email)
    )
    row = row_res.scalar_one_or_none()
    if not row:
        row = ParticipantCrmProfile(organization_id=org_id, email=email, notes="", tags=[], lifecycle_status="lead")
        db.add(row)
    if payload.notes is not None:
        row.notes = payload.notes.strip()
    if payload.tags is not None:
        row.tags = list(dict.fromkeys(str(item).strip() for item in payload.tags if str(item).strip()))[:20]
    if payload.lifecycle_status is not None:
        row.lifecycle_status = payload.lifecycle_status.strip() or "lead"
    row.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return await _load_meta(db, org_id, email)


async def _attendees_for_org(db: AsyncSession, org: Organization) -> list[tuple[Attendee, Event]]:
    rows_res = await db.execute(
        select(Attendee, Event)
        .join(Event, Event.id == Attendee.event_id)
        .where(Event.admin_id == org.user_id, Attendee.email.is_not(None), func.trim(Attendee.email) != "")
        .order_by(Attendee.registered_at.desc())
    )
    return rows_res.all()


async def _certificate_count_for_email(db: AsyncSession, rows: list[tuple[Attendee, Event]]) -> int:
    total = 0
    for attendee, event in rows:
        cert_res = await db.execute(
            select(func.count(Certificate.id)).where(
                Certificate.event_id == event.id,
                Certificate.deleted_at.is_(None),
                func.lower(func.trim(Certificate.student_name)) == _name_key(attendee.name),
            )
        )
        total += int(cert_res.scalar_one() or 0)
    return total


async def _attended_count_for_ids(db: AsyncSession, attendee_ids: list[int]) -> int:
    if not attendee_ids:
        return 0
    records_res = await db.execute(select(AttendaonceRecord.attendee_id).where(AttendaonceRecord.attendee_id.in_(attendee_ids)))
    ticket_res = await db.execute(
        select(EventTicket.attendee_id).where(EventTicket.attendee_id.in_(attendee_ids), EventTicket.checked_in_at.is_not(None))
    )
    ids = {int(item) for item in records_res.scalars().all() if item}
    ids.update(int(item) for item in ticket_res.scalars().all() if item)
    return len(ids)


@router.get(
    "/api/admin/crm/participants",
    response_model=list[ParticipantCrmListItem],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_crm_participants(
    request: Request,
    query: str = Query(default=""),
    tag: str = Query(default=""),
    status: str = Query(default=""),
    limit: int = Query(default=50, ge=1, le=200),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    rows = await _attendees_for_org(db, org)
    grouped: dict[str, list[tuple[Attendee, Event]]] = {}
    for attendee, event in rows:
        grouped.setdefault(_normalize_email(attendee.email), []).append((attendee, event))

    needle = query.strip().lower()
    items: list[ParticipantCrmListItem] = []
    for email, attendee_rows in grouped.items():
        first = attendee_rows[0][0]
        meta = await _load_meta(db, org.id, email)
        if needle and needle not in email and needle not in (first.name or "").lower():
            continue
        if tag and tag not in meta.tags:
            continue
        if status and status != meta.lifecycle_status:
            continue
        attendee_ids = [attendee.id for attendee, _ in attendee_rows]
        certificate_count = await _certificate_count_for_email(db, attendee_rows)
        survey_count = sum(1 for attendee, _ in attendee_rows if attendee.survey_completed_at is not None)
        attended_count = await _attended_count_for_ids(db, attendee_ids)
        latest_activity = max((attendee.registered_at for attendee, _ in attendee_rows if attendee.registered_at), default=None)
        items.append(
            ParticipantCrmListItem(
                email=email,
                name=first.name,
                event_count=len({event.id for _, event in attendee_rows}),
                certificate_count=certificate_count,
                attended_count=attended_count,
                survey_count=survey_count,
                latest_activity_at=latest_activity,
                meta=meta,
            )
        )
    items.sort(key=lambda item: item.latest_activity_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return items[:limit]


@router.get(
    "/api/admin/crm/participant",
    response_model=ParticipantCrmDetail,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_crm_participant(
    request: Request,
    email: str,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    normalized = _normalize_email(email)
    rows = [(attendee, event) for attendee, event in await _attendees_for_org(db, org) if _normalize_email(attendee.email) == normalized]
    if not rows:
        raise HTTPException(status_code=404, detail="Participant not found")
    meta = await _load_meta(db, org.id, normalized)
    timeline: list[dict[str, Any]] = []
    history: list[dict[str, Any]] = []
    total_certificates = 0
    attended_count = 0
    survey_count = 0

    for attendee, event in rows:
        attendee_ids = [attendee.id]
        event_item: dict[str, Any] = {
            "event_id": event.id,
            "event_name": event.name,
            "registered_at": attendee.registered_at,
            "email_verified": bool(attendee.email_verified),
            "survey_completed": attendee.survey_completed_at is not None,
            "certificates": [],
            "tickets": [],
            "attendance_count": 0,
        }
        timeline.append({"at": attendee.registered_at, "type": "registered", "label": f"{event.name}: kayıt"})
        if attendee.email_verified_at:
            timeline.append({"at": attendee.email_verified_at, "type": "email_verified", "label": f"{event.name}: e-posta doğrulandı"})
        if attendee.survey_completed_at:
            survey_count += 1
            timeline.append({"at": attendee.survey_completed_at, "type": "survey", "label": f"{event.name}: anket tamamlandı"})

        records_res = await db.execute(select(AttendaonceRecord).where(AttendaonceRecord.attendee_id.in_(attendee_ids)))
        records = records_res.scalars().all()
        event_item["attendance_count"] = len(records)
        if records:
            attended_count += 1
        for record in records:
            timeline.append({"at": record.checked_in_at, "type": "attendance", "label": f"{event.name}: oturum katılımı"})

        tickets_res = await db.execute(select(EventTicket).where(EventTicket.attendee_id == attendee.id))
        tickets = tickets_res.scalars().all()
        for ticket in tickets:
            event_item["tickets"].append({"status": ticket.status, "issued_at": ticket.issued_at, "checked_in_at": ticket.checked_in_at})
            timeline.append({"at": ticket.issued_at, "type": "ticket", "label": f"{event.name}: bilet {ticket.status}"})
            if ticket.checked_in_at:
                timeline.append({"at": ticket.checked_in_at, "type": "checkin", "label": f"{event.name}: bilet check-in"})

        cert_res = await db.execute(
            select(Certificate).where(
                Certificate.event_id == event.id,
                Certificate.deleted_at.is_(None),
                func.lower(func.trim(Certificate.student_name)) == _name_key(attendee.name),
            )
        )
        certs = cert_res.scalars().all()
        total_certificates += len(certs)
        for cert in certs:
            event_item["certificates"].append({"uuid": cert.uuid, "status": cert.status.value if hasattr(cert.status, "value") else str(cert.status), "issued_at": cert.issued_at})
            timeline.append({"at": cert.issued_at, "type": "certificate", "label": f"{event.name}: sertifika üretildi"})

        history.append(event_item)

    timeline = sorted([item for item in timeline if item.get("at")], key=lambda item: item["at"], reverse=True)
    first = rows[0][0]
    return ParticipantCrmDetail(
        email=normalized,
        name=first.name,
        meta=meta,
        summary={
            "events": len({event.id for _, event in rows}),
            "certificates": total_certificates,
            "attended": attended_count,
            "surveys": survey_count,
        },
        history=history,
        timeline=timeline,
    )


@router.patch(
    "/api/admin/crm/participant",
    response_model=ParticipantCrmMeta,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_crm_participant(
    request: Request,
    payload: ParticipantCrmIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    return await _save_meta(db, org.id, payload)
