"""Organization training assignment and renewal tracking endpoints."""

import csv
import io
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    Attendee,
    Certificate,
    CertStatus,
    CurrentUser,
    Event,
    OrganizationDepartment,
    Role,
    TrainingAssignment,
    TrainingAssignmentTemplate,
    TrainingRecurringRule,
    TrainingRenewalNotificationLog,
    get_current_user,
    get_db,
    require_role,
    send_email_async,
)
from .organization_access_api import ensure_organization_enterprise, get_organization_for_access, organization_id_from_request

router = APIRouter()

TRAINING_STATUSES = {"assigned", "in_progress", "completed", "overdue", "waived"}


def _simple_pdf(lines: list[str]) -> bytes:
    escaped = [line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")[:100] for line in lines[:45]]
    text_ops = ["BT", "/F1 11 Tf", "50 790 Td"]
    for index, line in enumerate(escaped):
        if index:
            text_ops.append("0 -16 Td")
        text_ops.append(f"({line}) Tj")
    text_ops.append("ET")
    stream = "\n".join(text_ops).encode("latin-1", "replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out.extend(f"{i} 0 obj\n".encode() + obj + b"\nendobj\n")
    xref = len(out)
    out.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        out.extend(f"{offset:010d} 00000 n \n".encode())
    out.extend(f"trailer << /Root 1 0 R /Size {len(objects) + 1} >>\nstartxref\n{xref}\n%%EOF".encode())
    return bytes(out)


class TrainingAssignmentIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    assignee_name: str = Field(min_length=2, max_length=200)
    assignee_email: EmailStr
    department_id: Optional[int] = None
    department: Optional[str] = Field(default=None, max_length=160)
    manager_email: Optional[EmailStr] = None
    approval_required: bool = False
    evidence_url: Optional[str] = Field(default=None, max_length=2000)
    evidence_label: Optional[str] = Field(default=None, max_length=160)
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
    department_id: Optional[int] = None
    department: Optional[str] = Field(default=None, max_length=160)
    manager_email: Optional[EmailStr] = None
    approval_status: Optional[str] = Field(default=None, max_length=32)
    evidence_url: Optional[str] = Field(default=None, max_length=2000)
    evidence_label: Optional[str] = Field(default=None, max_length=160)
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
    department_id: Optional[int] = None
    department: Optional[str] = None
    manager_email: Optional[str] = None
    approval_status: str = "not_required"
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    evidence_url: Optional[str] = None
    evidence_label: Optional[str] = None
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


class OrganizationDepartmentIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    code: Optional[str] = Field(default=None, max_length=80)
    manager_name: Optional[str] = Field(default=None, max_length=200)
    manager_email: Optional[EmailStr] = None
    active: bool = True


class OrganizationDepartmentOut(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    manager_name: Optional[str] = None
    manager_email: Optional[str] = None
    active: bool
    created_at: datetime
    updated_at: datetime


class TrainingTemplateIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    title: str = Field(min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    department_id: Optional[int] = None
    required: bool = True
    default_due_days: int = Field(default=30, ge=1, le=730)
    renewal_interval_days: Optional[int] = Field(default=None, ge=1, le=3650)
    notify_before_days: int = Field(default=30, ge=1, le=365)
    approval_required: bool = False
    active: bool = True


class TrainingTemplateOut(TrainingTemplateIn):
    id: int
    department_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class TrainingBulkAssignee(BaseModel):
    assignee_name: str = Field(min_length=2, max_length=200)
    assignee_email: EmailStr
    department_id: Optional[int] = None
    department: Optional[str] = Field(default=None, max_length=160)
    manager_email: Optional[EmailStr] = None


class TrainingBulkAssignIn(BaseModel):
    template_id: int
    assignees: list[TrainingBulkAssignee] = Field(min_length=1, max_length=500)


class TrainingBulkAssignOut(BaseModel):
    created: int
    skipped: int


class TrainingRecurringRuleIn(BaseModel):
    template_id: int
    department_id: Optional[int] = None
    source: str = Field(default="event_participants", max_length=48)
    enabled: bool = True
    lookback_days: int = Field(default=30, ge=1, le=365)


class TrainingRecurringRuleOut(TrainingRecurringRuleIn):
    id: int
    last_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class TrainingNotificationLogOut(BaseModel):
    id: int
    assignment_id: int
    recipient_email: str
    status: str
    attempts: int
    error_message: Optional[str] = None
    target_date: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    created_at: datetime


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


def _clean_approval_status(value: Optional[str]) -> str:
    cleaned = (value or "not_required").strip().lower()
    if cleaned not in {"not_required", "pending", "approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid approval status")
    return cleaned


async def _department_for_org(db: AsyncSession, org_id: int, department_id: Optional[int]) -> Optional[OrganizationDepartment]:
    if department_id is None:
        return None
    row = await db.get(OrganizationDepartment, department_id)
    if not row or row.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Department not found")
    return row


async def _department_name(db: AsyncSession, department_id: Optional[int]) -> Optional[str]:
    if department_id is None:
        return None
    row = await db.get(OrganizationDepartment, department_id)
    return row.name if row else None


def _department_out(row: OrganizationDepartment) -> OrganizationDepartmentOut:
    return OrganizationDepartmentOut(
        id=row.id,
        name=row.name,
        code=row.code,
        manager_name=row.manager_name,
        manager_email=row.manager_email,
        active=bool(row.active),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _template_out(db: AsyncSession, row: TrainingAssignmentTemplate) -> TrainingTemplateOut:
    return TrainingTemplateOut(
        id=row.id,
        name=row.name,
        title=row.title,
        description=row.description,
        department_id=row.department_id,
        department_name=await _department_name(db, row.department_id),
        required=bool(row.required),
        default_due_days=int(row.default_due_days or 30),
        renewal_interval_days=row.renewal_interval_days,
        notify_before_days=int(row.notify_before_days or 30),
        approval_required=bool(row.approval_required),
        active=bool(row.active),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _recurring_rule_out(row: TrainingRecurringRule) -> TrainingRecurringRuleOut:
    return TrainingRecurringRuleOut(
        id=row.id,
        template_id=row.template_id,
        department_id=row.department_id,
        source=row.source,
        enabled=bool(row.enabled),
        lookback_days=int(row.lookback_days or 30),
        last_run_at=row.last_run_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


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
        department_id=row.department_id,
        department=row.department or await _department_name(db, row.department_id),
        manager_email=row.manager_email,
        approval_status=row.approval_status or "not_required",
        approved_by=row.approved_by,
        approved_at=row.approved_at,
        evidence_url=row.evidence_url,
        evidence_label=row.evidence_label,
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


def _assignment_from_template(
    org_id: int,
    actor_id: int,
    template: TrainingAssignmentTemplate,
    assignee: TrainingBulkAssignee,
    department: Optional[OrganizationDepartment],
) -> TrainingAssignment:
    now = datetime.now(timezone.utc)
    due_at = now + timedelta(days=int(template.default_due_days or 30))
    renewal_due_at = None
    if template.renewal_interval_days:
        renewal_due_at = due_at + timedelta(days=int(template.renewal_interval_days))
    return TrainingAssignment(
        organization_id=org_id,
        created_by=actor_id,
        title=template.title,
        description=template.description,
        assignee_name=assignee.assignee_name.strip(),
        assignee_email=str(assignee.assignee_email).strip().lower(),
        department_id=department.id if department else template.department_id,
        department=(department.name if department else (assignee.department or None)),
        manager_email=(str(assignee.manager_email).strip().lower() if assignee.manager_email else (department.manager_email if department else None)),
        template_id=template.id,
        required=bool(template.required),
        status="assigned",
        due_at=due_at,
        renewal_due_at=renewal_due_at,
        notify_before_days=int(template.notify_before_days or 30),
        approval_status="pending" if template.approval_required else "not_required",
    )


async def _apply_payload(db: AsyncSession, org_user_id: int, row: TrainingAssignment, payload: TrainingAssignmentIn | TrainingAssignmentPatch):
    values = payload.model_dump(exclude_unset=True)
    approval_required = bool(values.pop("approval_required", False))
    if "status" in values and values["status"] is not None:
        values["status"] = _clean_status(values["status"])
    if "approval_status" in values and values["approval_status"] is not None:
        values["approval_status"] = _clean_approval_status(values["approval_status"])
    for event_field in ("event_id", "renewal_event_id"):
        if event_field in values:
            await _event_in_org(db, org_user_id, values[event_field])
    if "department_id" in values:
        dept = await _department_for_org(db, row.organization_id, values["department_id"])
        if dept:
            values["department"] = dept.name
            if not values.get("manager_email") and dept.manager_email:
                values["manager_email"] = dept.manager_email
    if "certificate_id" in values:
        await _certificate_in_org(db, org_user_id, values["certificate_id"])
    for key, value in values.items():
        if key in {"assignee_email", "department", "description", "manager_email", "evidence_url", "evidence_label"} and isinstance(value, str):
            value = value.strip()
        setattr(row, key, value)
    if isinstance(payload, TrainingAssignmentIn) and approval_required:
        row.approval_status = "pending"
    if row.status == "completed" and not row.completed_at:
        row.completed_at = datetime.now(timezone.utc)
    if row.status == "completed" and row.approval_status == "not_required" and row.manager_email:
        row.approval_status = "pending"
    if row.approval_status == "approved" and not row.approved_at:
        row.approved_at = datetime.now(timezone.utc)
    if row.status == "completed" and not row.certificate_id:
        cert = await _infer_certificate(db, org_user_id, row)
        if cert:
            row.certificate_id = cert.id


@router.get(
    "/api/admin/training/departments",
    response_model=list[OrganizationDepartmentOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_training_departments(
    request: Request,
    include_inactive: bool = Query(default=False),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    stmt = select(OrganizationDepartment).where(OrganizationDepartment.organization_id == org.id)
    if not include_inactive:
        stmt = stmt.where(OrganizationDepartment.active.is_(True))
    rows = (await db.execute(stmt.order_by(OrganizationDepartment.name.asc()))).scalars().all()
    return [_department_out(row) for row in rows]


@router.post(
    "/api/admin/training/departments",
    response_model=OrganizationDepartmentOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_training_department(
    request: Request,
    payload: OrganizationDepartmentIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    row = OrganizationDepartment(
        organization_id=org.id,
        name=payload.name.strip(),
        code=(payload.code or "").strip() or None,
        manager_name=(payload.manager_name or "").strip() or None,
        manager_email=str(payload.manager_email).strip().lower() if payload.manager_email else None,
        active=payload.active,
        created_by=me.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _department_out(row)


@router.patch(
    "/api/admin/training/departments/{department_id}",
    response_model=OrganizationDepartmentOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_training_department(
    request: Request,
    department_id: int,
    payload: OrganizationDepartmentIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    row = await _department_for_org(db, org.id, department_id)
    assert row is not None
    row.name = payload.name.strip()
    row.code = (payload.code or "").strip() or None
    row.manager_name = (payload.manager_name or "").strip() or None
    row.manager_email = str(payload.manager_email).strip().lower() if payload.manager_email else None
    row.active = payload.active
    await db.commit()
    await db.refresh(row)
    return _department_out(row)


@router.get(
    "/api/admin/training/templates",
    response_model=list[TrainingTemplateOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_training_templates(
    request: Request,
    active_only: bool = Query(default=True),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    stmt = select(TrainingAssignmentTemplate).where(TrainingAssignmentTemplate.organization_id == org.id)
    if active_only:
        stmt = stmt.where(TrainingAssignmentTemplate.active.is_(True))
    rows = (await db.execute(stmt.order_by(TrainingAssignmentTemplate.created_at.desc()))).scalars().all()
    return [await _template_out(db, row) for row in rows]


@router.post(
    "/api/admin/training/templates",
    response_model=TrainingTemplateOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_training_template(
    request: Request,
    payload: TrainingTemplateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    await _department_for_org(db, org.id, payload.department_id)
    row = TrainingAssignmentTemplate(
        organization_id=org.id,
        department_id=payload.department_id,
        name=payload.name.strip(),
        title=payload.title.strip(),
        description=(payload.description or "").strip() or None,
        required=payload.required,
        default_due_days=payload.default_due_days,
        renewal_interval_days=payload.renewal_interval_days,
        notify_before_days=payload.notify_before_days,
        approval_required=payload.approval_required,
        active=payload.active,
        created_by=me.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return await _template_out(db, row)


@router.post(
    "/api/admin/training/bulk-assign",
    response_model=TrainingBulkAssignOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def bulk_assign_training_from_template(
    request: Request,
    payload: TrainingBulkAssignIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    template = await db.get(TrainingAssignmentTemplate, payload.template_id)
    if not template or template.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Training template not found")
    created = skipped = 0
    for assignee in payload.assignees:
        department = await _department_for_org(db, org.id, assignee.department_id or template.department_id)
        exists_res = await db.execute(
            select(TrainingAssignment.id).where(
                TrainingAssignment.organization_id == org.id,
                TrainingAssignment.template_id == template.id,
                TrainingAssignment.assignee_email == str(assignee.assignee_email).strip().lower(),
                TrainingAssignment.status.in_(["assigned", "in_progress", "overdue"]),
            )
        )
        if exists_res.scalar_one_or_none():
            skipped += 1
            continue
        db.add(_assignment_from_template(org.id, me.id, template, assignee, department))
        created += 1
    await db.commit()
    return TrainingBulkAssignOut(created=created, skipped=skipped)


@router.get(
    "/api/admin/training/recurring-rules",
    response_model=list[TrainingRecurringRuleOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_training_recurring_rules(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    rows = (
        await db.execute(
            select(TrainingRecurringRule)
            .where(TrainingRecurringRule.organization_id == org.id)
            .order_by(TrainingRecurringRule.created_at.desc())
        )
    ).scalars().all()
    return [_recurring_rule_out(row) for row in rows]


@router.post(
    "/api/admin/training/recurring-rules",
    response_model=TrainingRecurringRuleOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_training_recurring_rule(
    request: Request,
    payload: TrainingRecurringRuleIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    template = await db.get(TrainingAssignmentTemplate, payload.template_id)
    if not template or template.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Training template not found")
    await _department_for_org(db, org.id, payload.department_id)
    row = TrainingRecurringRule(
        organization_id=org.id,
        template_id=payload.template_id,
        department_id=payload.department_id,
        source=payload.source,
        enabled=payload.enabled,
        lookback_days=payload.lookback_days,
        created_by=me.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _recurring_rule_out(row)


@router.post(
    "/api/admin/training/recurring-rules/run",
    response_model=TrainingBulkAssignOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def run_training_recurring_rules(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    rules = (
        await db.execute(
            select(TrainingRecurringRule)
            .where(TrainingRecurringRule.organization_id == org.id, TrainingRecurringRule.enabled.is_(True))
        )
    ).scalars().all()
    created = skipped = 0
    now = datetime.now(timezone.utc)
    for rule in rules:
        template = await db.get(TrainingAssignmentTemplate, rule.template_id)
        if not template or not template.active:
            skipped += 1
            continue
        department = await _department_for_org(db, org.id, rule.department_id or template.department_id)
        event_stmt = select(Event.id).where(Event.admin_id == org.user_id)
        if rule.lookback_days:
            event_stmt = event_stmt.where(Event.created_at >= now - timedelta(days=rule.lookback_days))
        event_ids = [int(item) for item in (await db.execute(event_stmt)).scalars().all()]
        if not event_ids:
            skipped += 1
            continue
        attendee_stmt = select(Attendee).where(Attendee.event_id.in_(event_ids), Attendee.email.is_not(None), func.trim(Attendee.email) != "")
        if department:
            dept_name = department.name.strip().lower()
            attendee_stmt = attendee_stmt.where(
                or_(
                    func.lower(Attendee.registration_answers["department"].astext) == dept_name,
                    func.lower(Attendee.registration_answers["departman"].astext) == dept_name,
                )
            )
        attendees = (await db.execute(attendee_stmt.limit(1000))).scalars().all()
        for attendee in attendees:
            email = (attendee.email or "").strip().lower()
            exists_res = await db.execute(
                select(TrainingAssignment.id).where(
                    TrainingAssignment.organization_id == org.id,
                    TrainingAssignment.template_id == template.id,
                    TrainingAssignment.assignee_email == email,
                    TrainingAssignment.status.in_(["assigned", "in_progress", "overdue"]),
                )
            )
            if exists_res.scalar_one_or_none():
                skipped += 1
                continue
            assignee = TrainingBulkAssignee(
                assignee_name=attendee.name,
                assignee_email=email,
                department_id=department.id if department else None,
                department=department.name if department else None,
                manager_email=department.manager_email if department else None,
            )
            assignment = _assignment_from_template(org.id, me.id, template, assignee, department)
            assignment.recurring_rule_id = rule.id
            db.add(assignment)
            created += 1
        rule.last_run_at = now
    await db.commit()
    return TrainingBulkAssignOut(created=created, skipped=skipped)


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
    "/api/admin/training/report/export",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def export_training_report(
    request: Request,
    format: str = Query(default="csv", pattern="^(csv|pdf)$"),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from .main import write_audit_log

    org = await _admin_org(db, me, request)
    rows = (await db.execute(select(TrainingAssignment).where(TrainingAssignment.organization_id == org.id))).scalars().all()
    now = datetime.now(timezone.utc)
    await write_audit_log(
        db,
        user_id=me.id,
        action="training.compliance_report.exported",
        resource_type="organization",
        resource_id=str(org.id),
        extra={"format": format, "row_count": len(rows)},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    await db.commit()
    if format == "pdf":
        lines = [
            "HeptaCert Compliance Report",
            f"Organization: {org.org_name}",
            f"Generated: {now.isoformat()}",
            f"Assignments: {len(rows)}",
            "",
        ]
        for row in rows:
            lines.append(f"{row.title} | {row.assignee_email} | {row.department or 'General'} | {_effective_status(row, now)}")
        return StreamingResponse(
            iter([_simple_pdf(lines)]),
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="training-compliance-report.pdf"'},
        )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "title", "assignee_name", "assignee_email", "department", "manager_email", "status", "effective_status", "due_at", "renewal_due_at", "approval_status", "evidence_url"])
    for row in rows:
        writer.writerow([
            row.id,
            row.title,
            row.assignee_name,
            row.assignee_email,
            row.department or "",
            row.manager_email or "",
            row.status,
            _effective_status(row, now),
            row.due_at.isoformat() if row.due_at else "",
            row.renewal_due_at.isoformat() if row.renewal_due_at else "",
            row.approval_status or "not_required",
            row.evidence_url or "",
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="training-compliance-report.csv"'},
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
            log = TrainingRenewalNotificationLog(
                organization_id=row.organization_id,
                assignment_id=row.id,
                recipient_email=row.assignee_email,
                status="pending",
                attempts=1,
                target_date=target_date,
            )
            db.add(log)
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
                log.status = "sent"
                log.sent_at = now
                sent += 1
            except Exception as exc:
                log.status = "failed"
                log.error_message = str(exc)[:2000]
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


@router.get(
    "/api/admin/training/notification-logs",
    response_model=list[TrainingNotificationLogOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_training_notification_logs(
    request: Request,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0, le=10000),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    rows = (
        await db.execute(
            select(TrainingRenewalNotificationLog)
            .where(TrainingRenewalNotificationLog.organization_id == org.id)
            .order_by(TrainingRenewalNotificationLog.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
    ).scalars().all()
    return [
        TrainingNotificationLogOut(
            id=row.id,
            assignment_id=row.assignment_id,
            recipient_email=row.recipient_email,
            status=row.status,
            attempts=row.attempts,
            error_message=row.error_message,
            target_date=row.target_date,
            sent_at=row.sent_at,
            created_at=row.created_at,
        )
        for row in rows
    ]
