"""Scheduled report API endpoints."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
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
    ensure_organization_enterprise,
    get_organization_for_access,
    organization_id_from_request,
)
from .report_scheduler_models import ScheduledReport

router = APIRouter()

REPORT_TYPES = {
    "org_overview": "Genel Bakış",
    "training_compliance": "Eğitim Uyum Raporu",
    "cert_issuance": "Sertifika Çıkarım Raporu",
    "learning_path_progress": "Öğrenme Yolu İlerlemesi",
    "crm_pipeline": "CRM Pipeline Raporu",
    "attendee_list": "Katılımcı Listesi",
}

FREQUENCIES = {"daily", "weekly", "monthly"}


def _next_run(frequency: str) -> datetime:
    now = datetime.now(timezone.utc)
    if frequency == "daily":
        return (now + timedelta(days=1)).replace(hour=6, minute=0, second=0, microsecond=0)
    if frequency == "monthly":
        return (now.replace(day=1) + timedelta(days=32)).replace(day=1, hour=6, minute=0, second=0, microsecond=0)
    # weekly default
    days_until_monday = (7 - now.weekday()) % 7 or 7
    return (now + timedelta(days=days_until_monday)).replace(hour=6, minute=0, second=0, microsecond=0)


async def _admin_org(db: AsyncSession, me: CurrentUser, request: Request) -> Organization:
    org = await get_organization_for_access(
        db, me, "organization:view", organization_id_from_request(request)
    )
    if me.role != Role.superadmin:
        await ensure_organization_enterprise(db, org)
    return org


class ScheduledReportIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    report_type: str
    filters_json: dict = {}
    frequency: str = "weekly"
    recipients: list[str] = []
    active: bool = True


class ScheduledReportOut(BaseModel):
    id: int
    organization_id: int
    name: str
    report_type: str
    report_type_label: str
    filters_json: dict
    frequency: str
    recipients: list[str]
    active: bool
    last_run_at: Optional[datetime]
    next_run_at: Optional[datetime]
    created_at: datetime


def _to_out(r: ScheduledReport) -> ScheduledReportOut:
    return ScheduledReportOut(
        id=r.id,
        organization_id=r.organization_id,
        name=r.name,
        report_type=r.report_type,
        report_type_label=REPORT_TYPES.get(r.report_type, r.report_type),
        filters_json=r.filters_json or {},
        frequency=r.frequency,
        recipients=r.recipients_json or [],
        active=bool(r.active),
        last_run_at=r.last_run_at,
        next_run_at=r.next_run_at,
        created_at=r.created_at,
    )


@router.get(
    "/api/admin/reports",
    response_model=list[ScheduledReportOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_reports(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    rows = (
        await db.execute(
            select(ScheduledReport)
            .where(ScheduledReport.organization_id == org.id)
            .order_by(ScheduledReport.created_at.desc())
        )
    ).scalars().all()
    return [_to_out(r) for r in rows]


@router.post(
    "/api/admin/reports",
    response_model=ScheduledReportOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_report(
    request: Request,
    payload: ScheduledReportIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    if payload.report_type not in REPORT_TYPES:
        raise HTTPException(status_code=422, detail=f"Unknown report_type. Valid: {list(REPORT_TYPES)}")
    if payload.frequency not in FREQUENCIES:
        raise HTTPException(status_code=422, detail=f"frequency must be one of {FREQUENCIES}")
    r = ScheduledReport(
        organization_id=org.id,
        name=payload.name.strip(),
        report_type=payload.report_type,
        filters_json=payload.filters_json,
        frequency=payload.frequency,
        recipients_json=[e.strip().lower() for e in payload.recipients if "@" in e],
        active=int(payload.active),
        next_run_at=_next_run(payload.frequency) if payload.active else None,
        created_by=me.id,
    )
    db.add(r)
    await db.commit()
    await db.refresh(r)
    return _to_out(r)


@router.patch(
    "/api/admin/reports/{report_id}",
    response_model=ScheduledReportOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_report(
    request: Request,
    report_id: int,
    payload: ScheduledReportIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    r = await db.get(ScheduledReport, report_id)
    if not r or r.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Report not found")
    if payload.report_type not in REPORT_TYPES:
        raise HTTPException(status_code=422, detail="Unknown report_type")
    if payload.frequency not in FREQUENCIES:
        raise HTTPException(status_code=422, detail="Invalid frequency")
    r.name = payload.name.strip()
    r.report_type = payload.report_type
    r.filters_json = payload.filters_json
    r.frequency = payload.frequency
    r.recipients_json = [e.strip().lower() for e in payload.recipients if "@" in e]
    r.active = int(payload.active)
    if payload.active and not r.next_run_at:
        r.next_run_at = _next_run(payload.frequency)
    elif not payload.active:
        r.next_run_at = None
    r.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(r)
    return _to_out(r)


@router.delete(
    "/api/admin/reports/{report_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_report(
    request: Request,
    report_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    r = await db.get(ScheduledReport, report_id)
    if not r or r.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.delete(r)
    await db.commit()
    return {"ok": True}


@router.get(
    "/api/admin/reports/types",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_report_types():
    return [{"value": k, "label": v} for k, v in REPORT_TYPES.items()]
