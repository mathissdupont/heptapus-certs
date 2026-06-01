"""Organization training assignment and renewal tracking endpoints."""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    Certificate,
    CertStatus,
    CurrentUser,
    Event,
    Role,
    TrainingAssignment,
    get_current_user,
    get_db,
    require_role,
    send_email_async,
)
from .organization_access_api import ensure_organization_enterprise, get_organization_for_access, organization_id_from_request

router = APIRouter()

TRAINING_STATUSES = {"assigned", "in_progress", "completed", "overdue", "waived"}


class TrainingAssignmentIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    assignee_name: str = Field(min_length=2, max_length=200)
    assignee_email: EmailStr
    department: Optional[str] = Field(default=None, max_length=160)
    event_id: Optional[int] = None
    required: bool = True
    status: str = Field(default="assigned", max_length=32)
    due_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    certificate_id: Optional[int] = None
    renewal_due_at: Optional[datetime] = None
    renewal_event_id: Optional[int] = None
    notify_before_days: int = Field(default=30, ge=1, le=365)


class TrainingAssignmentPatch(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    assignee_name: Optional[str] = Field(default=None, min_length=2, max_length=200)
    assignee_email: Optional[EmailStr] = None
    department: Optional[str] = Field(default=None, max_length=160)
    event_id: Optional[int] = None
    required: Optional[bool] = None
    status: Optional[str] = Field(default=None, max_length=32)
    due_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    certificate_id: Optional[int] = None
    renewal_due_at: Optional[datetime] = None
    renewal_event_id: Optional[int] = None
    notify_before_days: Optional[int] = Field(default=None, ge=1, le=365)


class TrainingAssignmentOut(BaseModel):
    id: int
    organization_id: int
    title: str
    description: Optional[str] = None
    assignee_name: str
    assignee_email: str
    department: Optional[str] = None
    event_id: Optional[int] = None
    event_name: Optional[str] = None
    required: bool
    status: str
    effective_status: str
    due_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    certificate_id: Optional[int] = None
    certificate_uuid: Optional[str] = None
    renewal_due_at: Optional[datetime] = None
    renewal_event_id: Optional[int] = None
    renewal_event_name: Optional[str] = None
    notify_before_days: int
    last_notified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class TrainingReportOut(BaseModel):
    total: int
    completed: int
    overdue: int
    due_soon: int
    renewal_due_soon: int
    by_department: list[dict[str, Any]]
    by_status: dict[str, int]


class RenewalRecommendationOut(BaseModel):
    id: int
    name: str
    event_date: Optional[str] = None
    event_location: Optional[str] = None
    reason: str


async def _admin_org(db: AsyncSession, me: CurrentUser, request: Request):
    org = await get_organization_for_access(db, me, "organization:view", organization_id_from_request(request))
    if me.role != Role.superadmin:
        await ensure_organization_enterprise(db, org)
    return org


def _clean_status(value: str) -> str:
    cleaned = (value or "assigned").strip().lower()
    if cleaned not in TRAINING_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid training status")
    return cleaned


def _effective_status(row: TrainingAssignment, now: Optional[datetime] = None) -> str:
    if row.status in {"completed", "waived"}:
        return row.status
    current = now or datetime.now(timezone.utc)
    due_at = row.due_at
    if due_at and due_at.tzinfo is None:
        due_at = due_at.replace(tzinfo=timezone.utc)
    if due_at and due_at < current:
        return "overdue"
    return row.status


async def _event_in_org(db: AsyncSession, org_user_id: int, event_id: Optional[int]) -> Optional[Event]:
    if event_id is None:
        return None
    event = await db.get(Event, event_id)
    if not event or event.admin_id != org_user_id:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


async def _certificate_in_org(db: AsyncSession, org_user_id: int, certificate_id: Optional[int]) -> Optional[Certificate]:
    if certificate_id is None:
        return None
    cert_res = await db.execute(
        select(Certificate)
        .join(Event, Event.id == Certificate.event_id)
        .where(Certificate.id == certificate_id, Event.admin_id == org_user_id)
    )
    cert = cert_res.scalar_one_or_none()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return cert


async def _infer_certificate(db: AsyncSession, org_user_id: int, row: TrainingAssignment) -> Optional[Certificate]:
    if row.certificate_id:
        return await _certificate_in_org(db, org_user_id, row.certificate_id)
    name_key = (row.assignee_name or "").strip().lower()
    if not name_key:
        return None
    query = (
        select(Certificate)
        .join(Event, Event.id == Certificate.event_id)
        .where(
            Event.admin_id == org_user_id,
            Certificate.deleted_at.is_(None),
            Certificate.status == CertStatus.active,
            func.lower(func.trim(Certificate.student_name)) == name_key,
        )
        .order_by(Certificate.issued_at.desc())
        .limit(1)
    )
    if row.event_id:
        query = query.where(Certificate.event_id == row.event_id)
    cert_res = await db.execute(query)
    return cert_res.scalar_one_or_none()


async def _to_out(db: AsyncSession, org_user_id: int, row: TrainingAssignment) -> TrainingAssignmentOut:
    event = await db.get(Event, row.event_id) if row.event_id else None
    renewal_event = await db.get(Event, row.renewal_event_id) if row.renewal_event_id else None
    cert = await _certificate_in_org(db, org_user_id, row.certificate_id) if row.certificate_id else None
    return TrainingAssignmentOut(
        id=row.id,
        organization_id=row.organization_id,
        title=row.title,
        description=row.description,
        assignee_name=row.assignee_name,
        assignee_email=row.assignee_email,
        department=row.department,
        event_id=row.event_id,
        event_name=event.name if event else None,
        required=bool(row.required),
        status=row.status,
        effective_status=_effective_status(row),
        due_at=row.due_at,
        completed_at=row.completed_at,
        certificate_id=row.certificate_id,
        certificate_uuid=cert.uuid if cert else None,
        renewal_due_at=row.renewal_due_at,
        renewal_event_id=row.renewal_event_id,
        renewal_event_name=renewal_event.name if renewal_event else None,
        notify_before_days=row.notify_before_days,
        last_notified_at=row.last_notified_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _assignment_for_org(db: AsyncSession, org_id: int, assignment_id: int) -> TrainingAssignment:
    row = await db.get(TrainingAssignment, assignment_id)
    if not row or row.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Training assignment not found")
    return row


async def _apply_payload(db: AsyncSession, org_user_id: int, row: TrainingAssignment, payload: TrainingAssignmentIn | TrainingAssignmentPatch):
    values = payload.model_dump(exclude_unset=True)
    if "status" in values and values["status"] is not None:
        values["status"] = _clean_status(values["status"])
    for event_field in ("event_id", "renewal_event_id"):
        if event_field in values:
            await _event_in_org(db, org_user_id, values[event_field])
    if "certificate_id" in values:
        await _certificate_in_org(db, org_user_id, values["certificate_id"])
    for key, value in values.items():
        if key in {"assignee_email", "department", "description"} and isinstance(value, str):
            value = value.strip()
        setattr(row, key, value)
    if row.status == "completed" and not row.completed_at:
        row.completed_at = datetime.now(timezone.utc)
    if row.status == "completed" and not row.certificate_id:
        cert = await _infer_certificate(db, org_user_id, row)
        if cert:
            row.certificate_id = cert.id


@router.get(
    "/api/admin/training/assignments",
    response_model=list[TrainingAssignmentOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_training_assignments(
    request: Request,
    status: str = Query(default=""),
    department: str = Query(default=""),
    query: str = Query(default=""),
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0, le=10000),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    stmt = select(TrainingAssignment).where(TrainingAssignment.organization_id == org.id)
    if status:
        stmt = stmt.where(TrainingAssignment.status == _clean_status(status))
    if department:
        stmt = stmt.where(func.lower(func.trim(TrainingAssignment.department)) == department.strip().lower())
    if query.strip():
        needle = f"%{query.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(TrainingAssignment.title).like(needle),
                func.lower(TrainingAssignment.assignee_name).like(needle),
                func.lower(TrainingAssignment.assignee_email).like(needle),
            )
        )
    rows_res = await db.execute(stmt.order_by(TrainingAssignment.created_at.desc()).offset(offset).limit(limit))
    return [await _to_out(db, org.user_id, row) for row in rows_res.scalars().all()]


@router.post(
    "/api/admin/training/assignments",
    response_model=TrainingAssignmentOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_training_assignment(
    request: Request,
    payload: TrainingAssignmentIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    row = TrainingAssignment(
        organization_id=org.id,
        created_by=me.id,
        title=payload.title.strip(),
        assignee_name=payload.assignee_name.strip(),
        assignee_email=str(payload.assignee_email).strip().lower(),
    )
    await _apply_payload(db, org.user_id, row, payload)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return await _to_out(db, org.user_id, row)


@router.patch(
    "/api/admin/training/assignments/{assignment_id}",
    response_model=TrainingAssignmentOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_training_assignment(
    request: Request,
    assignment_id: int,
    payload: TrainingAssignmentPatch,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    row = await _assignment_for_org(db, org.id, assignment_id)
    await _apply_payload(db, org.user_id, row, payload)
    await db.commit()
    await db.refresh(row)
    return await _to_out(db, org.user_id, row)


@router.delete(
    "/api/admin/training/assignments/{assignment_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_training_assignment(
    request: Request,
    assignment_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    row = await _assignment_for_org(db, org.id, assignment_id)
    await db.delete(row)
    await db.commit()
    return {"ok": True}


@router.get(
    "/api/admin/training/report",
    response_model=TrainingReportOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_training_report(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    rows_res = await db.execute(select(TrainingAssignment).where(TrainingAssignment.organization_id == org.id))
    rows = rows_res.scalars().all()
    now = datetime.now(timezone.utc)
    due_soon_limit = now + timedelta(days=14)
    renewal_limit = now + timedelta(days=30)
    by_status: dict[str, int] = {}
    dept: dict[str, dict[str, int]] = {}
    for row in rows:
        effective = _effective_status(row, now)
        by_status[effective] = by_status.get(effective, 0) + 1
        key = row.department or "Genel"
        bucket = dept.setdefault(key, {"total": 0, "completed": 0, "overdue": 0, "due_soon": 0, "renewal_due_soon": 0})
        bucket["total"] += 1
        if effective == "completed":
            bucket["completed"] += 1
        if effective == "overdue":
            bucket["overdue"] += 1
        if row.status not in {"completed", "waived"} and row.due_at and now <= row.due_at <= due_soon_limit:
            bucket["due_soon"] += 1
        if row.status == "completed" and row.renewal_due_at and now <= row.renewal_due_at <= renewal_limit:
            bucket["renewal_due_soon"] += 1
    return TrainingReportOut(
        total=len(rows),
        completed=sum(1 for row in rows if row.status == "completed"),
        overdue=sum(1 for row in rows if _effective_status(row, now) == "overdue"),
        due_soon=sum(1 for row in rows if row.status not in {"completed", "waived"} and row.due_at and now <= row.due_at <= due_soon_limit),
        renewal_due_soon=sum(1 for row in rows if row.status == "completed" and row.renewal_due_at and now <= row.renewal_due_at <= renewal_limit),
        by_department=[{"department": name, **values} for name, values in sorted(dept.items())],
        by_status=by_status,
    )


@router.get(
    "/api/admin/training/renewal-recommendations",
    response_model=list[RenewalRecommendationOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_renewal_recommendations(
    request: Request,
    department: str = Query(default=""),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    today = datetime.now(timezone.utc).date()
    stmt = select(Event).where(Event.admin_id == org.user_id, or_(Event.event_date.is_(None), Event.event_date >= today))
    if department:
        needle = f"%{department.strip().lower()}%"
        stmt = stmt.where(or_(func.lower(Event.name).like(needle), func.lower(Event.event_description).like(needle)))
    events_res = await db.execute(stmt.order_by(Event.event_date.asc().nullslast(), Event.created_at.desc()).limit(8))
    items = []
    for event in events_res.scalars().all():
        items.append(
            RenewalRecommendationOut(
                id=event.id,
                name=event.name,
                event_date=event.event_date.isoformat() if event.event_date else None,
                event_location=event.event_location,
                reason="Yaklaşan eğitim/etkinlik yenileme atamaları için önerildi.",
            )
        )
    return items


async def process_training_renewal_notifications_once(
    db: Optional[AsyncSession] = None,
    organization_id: Optional[int] = None,
) -> dict[str, int]:
    owns_session = db is None
    if db is None:
        from .main import SessionLocal

        db = SessionLocal()
    sent = failed = skipped = 0
    try:
        now = datetime.now(timezone.utc)
        stmt = (
            select(TrainingAssignment, Event)
            .join(Event, Event.id == TrainingAssignment.event_id, isouter=True)
            .where(TrainingAssignment.status != "waived", TrainingAssignment.assignee_email.is_not(None))
        )
        if organization_id is not None:
            stmt = stmt.where(TrainingAssignment.organization_id == organization_id)
        rows_res = await db.execute(stmt)
        for row, event in rows_res.all():
            target_date = row.renewal_due_at if row.status == "completed" else row.due_at
            if target_date and target_date.tzinfo is None:
                target_date = target_date.replace(tzinfo=timezone.utc)
            if not target_date or target_date > now + timedelta(days=row.notify_before_days):
                skipped += 1
                continue
            if row.last_notified_at and row.last_notified_at > now - timedelta(days=7):
                skipped += 1
                continue
            subject = f"HeptaCert eğitim hatırlatması: {row.title}"
            html = f"""
            <h2>{row.title}</h2>
            <p>Merhaba {row.assignee_name},</p>
            <p>Size atanmış eğitim veya sertifika yenileme takibinde yaklaşan bir tarih var.</p>
            <ul>
              <li>Durum: {_effective_status(row)}</li>
              <li>Son tarih: {target_date.strftime("%d.%m.%Y")}</li>
              <li>Etkinlik: {(event.name if event else "Belirtilmedi")}</li>
            </ul>
            <p>Detaylar icin kurum yoneticinizle iletisime gecebilirsiniz.</p>
            """
            try:
                await send_email_async(row.assignee_email, subject, html, raise_on_error=True)
                row.last_notified_at = now
                sent += 1
            except Exception:
                failed += 1
        await db.commit()
        return {"sent": sent, "failed": failed, "skipped": skipped}
    finally:
        if owns_session:
            await db.close()


@router.post(
    "/api/admin/training/send-renewal-notifications",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def send_training_renewal_notifications_now(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    return await process_training_renewal_notifications_once(db, organization_id=org.id)
