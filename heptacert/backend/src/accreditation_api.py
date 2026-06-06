"""Accreditation & CPD endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    CurrentUser,
    Organization,
    Role,
    get_current_user,
    get_db,
    require_role,
)
from .organization_access_api import (
    get_organization_for_access,
    organization_id_from_request,
)
from .accreditation_models import (
    AccreditationBody,
    EventCpdConfig,
    MemberCpdLog,
    OrgAccreditation,
)

router = APIRouter()


async def _admin_org(db: AsyncSession, me: CurrentUser, request: Request) -> Organization:
    return await get_organization_for_access(
        db, me, "organization:view", organization_id_from_request(request)
    )


# ── Accreditation Bodies (read-only, seeded) ──────────────────────────────────

@router.get("/api/admin/accreditation/bodies")
async def list_accreditation_bodies(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(AccreditationBody).order_by(AccreditationBody.name))).scalars().all()
    return [{"id": b.id, "short_code": b.short_code, "name": b.name, "logo_url": b.logo_url} for b in rows]


# ── Org Accreditations ────────────────────────────────────────────────────────

class OrgAccreditationIn(BaseModel):
    body_id: int
    accreditation_number: Optional[str] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None


class OrgAccreditationOut(BaseModel):
    id: int
    organization_id: int
    body_id: int
    body_name: str
    body_code: str
    accreditation_number: Optional[str]
    valid_from: Optional[datetime]
    valid_until: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    is_valid: bool


def _org_accred_out(r: OrgAccreditation, body: AccreditationBody) -> OrgAccreditationOut:
    now = datetime.now(timezone.utc)
    is_valid = True
    if r.valid_until and r.valid_until.replace(tzinfo=timezone.utc) < now:
        is_valid = False
    if r.valid_from and r.valid_from.replace(tzinfo=timezone.utc) > now:
        is_valid = False
    return OrgAccreditationOut(
        id=r.id,
        organization_id=r.organization_id,
        body_id=r.body_id,
        body_name=body.name,
        body_code=body.short_code,
        accreditation_number=r.accreditation_number,
        valid_from=r.valid_from,
        valid_until=r.valid_until,
        notes=r.notes,
        created_at=r.created_at,
        is_valid=is_valid,
    )


@router.get(
    "/api/admin/accreditation",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_org_accreditations(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    rows = (
        await db.execute(
            select(OrgAccreditation, AccreditationBody)
            .join(AccreditationBody, AccreditationBody.id == OrgAccreditation.body_id)
            .where(OrgAccreditation.organization_id == org.id)
            .order_by(OrgAccreditation.created_at.desc())
        )
    ).all()
    return [_org_accred_out(r, b) for r, b in rows]


@router.post(
    "/api/admin/accreditation",
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_org_accreditation(
    request: Request,
    payload: OrgAccreditationIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    body = await db.get(AccreditationBody, payload.body_id)
    if not body:
        raise HTTPException(status_code=404, detail="Accreditation body not found")
    r = OrgAccreditation(
        organization_id=org.id,
        body_id=payload.body_id,
        accreditation_number=payload.accreditation_number,
        valid_from=payload.valid_from,
        valid_until=payload.valid_until,
        notes=payload.notes,
    )
    db.add(r)
    await db.commit()
    await db.refresh(r)
    return _org_accred_out(r, body)


@router.patch(
    "/api/admin/accreditation/{accred_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_org_accreditation(
    accred_id: int,
    request: Request,
    payload: OrgAccreditationIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    r = await db.get(OrgAccreditation, accred_id)
    if not r or r.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Not found")
    body = await db.get(AccreditationBody, payload.body_id)
    if not body:
        raise HTTPException(status_code=404, detail="Accreditation body not found")
    r.body_id = payload.body_id
    r.accreditation_number = payload.accreditation_number
    r.valid_from = payload.valid_from
    r.valid_until = payload.valid_until
    r.notes = payload.notes
    r.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(r)
    return _org_accred_out(r, body)


@router.delete(
    "/api/admin/accreditation/{accred_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_org_accreditation(
    accred_id: int,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    r = await db.get(OrgAccreditation, accred_id)
    if not r or r.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(r)
    await db.commit()
    return {"ok": True}


# ── Event CPD Configuration ───────────────────────────────────────────────────

class EventCpdIn(BaseModel):
    body_id: int
    cpd_hours: float = Field(..., ge=0, le=1000)
    cpd_category: Optional[str] = None
    cpd_unit_type: str = "hours"


class EventCpdOut(BaseModel):
    id: int
    event_id: int
    body_id: int
    body_name: str
    body_code: str
    cpd_hours: float
    cpd_category: Optional[str]
    cpd_unit_type: str


def _cpd_out(c: EventCpdConfig, body: AccreditationBody) -> EventCpdOut:
    return EventCpdOut(
        id=c.id,
        event_id=c.event_id,
        body_id=c.body_id,
        body_name=body.name,
        body_code=body.short_code,
        cpd_hours=float(c.cpd_hours),
        cpd_category=c.cpd_category,
        cpd_unit_type=c.cpd_unit_type,
    )


@router.get("/api/admin/events/{event_id}/cpd")
async def get_event_cpd(
    event_id: int,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = (
        await db.execute(
            select(EventCpdConfig, AccreditationBody)
            .join(AccreditationBody, AccreditationBody.id == EventCpdConfig.body_id)
            .where(EventCpdConfig.event_id == event_id)
        )
    ).first()
    if not row:
        return None
    return _cpd_out(row[0], row[1])


@router.put(
    "/api/admin/events/{event_id}/cpd",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def upsert_event_cpd(
    event_id: int,
    request: Request,
    payload: EventCpdIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    body = await db.get(AccreditationBody, payload.body_id)
    if not body:
        raise HTTPException(status_code=404, detail="Accreditation body not found")
    existing = (
        await db.execute(select(EventCpdConfig).where(EventCpdConfig.event_id == event_id))
    ).scalar_one_or_none()
    if existing:
        existing.body_id = payload.body_id
        existing.cpd_hours = payload.cpd_hours
        existing.cpd_category = payload.cpd_category
        existing.cpd_unit_type = payload.cpd_unit_type
        existing.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(existing)
        return _cpd_out(existing, body)
    else:
        c = EventCpdConfig(
            event_id=event_id,
            body_id=payload.body_id,
            cpd_hours=payload.cpd_hours,
            cpd_category=payload.cpd_category,
            cpd_unit_type=payload.cpd_unit_type,
        )
        db.add(c)
        await db.commit()
        await db.refresh(c)
        return _cpd_out(c, body)


@router.delete(
    "/api/admin/events/{event_id}/cpd",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_event_cpd(event_id: int, db: AsyncSession = Depends(get_db)):
    c = (
        await db.execute(select(EventCpdConfig).where(EventCpdConfig.event_id == event_id))
    ).scalar_one_or_none()
    if c:
        await db.delete(c)
        await db.commit()
    return {"ok": True}


# ── Member CPD Summary ────────────────────────────────────────────────────────

@router.get("/api/admin/members/{member_id}/cpd")
async def get_member_cpd(
    member_id: int,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(MemberCpdLog, AccreditationBody)
            .join(AccreditationBody, AccreditationBody.id == MemberCpdLog.body_id)
            .where(MemberCpdLog.member_id == member_id)
            .order_by(MemberCpdLog.earned_at.desc())
        )
    ).all()

    logs = [
        {
            "id": log.id,
            "event_id": log.event_id,
            "body_name": body.name,
            "body_code": body.short_code,
            "cpd_hours": float(log.cpd_hours),
            "cpd_category": log.cpd_category,
            "certificate_id": log.certificate_id,
            "earned_at": log.earned_at.isoformat() if log.earned_at else None,
        }
        for log, body in rows
    ]

    by_body: dict[str, float] = {}
    for item in logs:
        by_body[item["body_name"]] = by_body.get(item["body_name"], 0) + item["cpd_hours"]

    return {
        "member_id": member_id,
        "total_cpd_hours": sum(l["cpd_hours"] for l in logs),
        "by_body": [{"body": k, "total_hours": v} for k, v in by_body.items()],
        "logs": logs,
    }
