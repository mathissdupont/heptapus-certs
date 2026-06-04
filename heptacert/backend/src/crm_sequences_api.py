"""CRM email drip sequence endpoints."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .main import (
    Base,
    CurrentUser,
    EmailTemplate,
    Organization,
    Role,
    get_current_user,
    get_db,
    require_role,
    send_email_async,
)
from .organization_access_api import ensure_organization_enterprise, get_organization_for_access, organization_id_from_request

router = APIRouter()


def _admin_org_from_request(request: Request):
    return organization_id_from_request(request)


async def _admin_org(db: AsyncSession, me: CurrentUser, request: Request) -> Organization:
    org = await get_organization_for_access(db, me, "organization:view", organization_id_from_request(request))
    if me.role != Role.superadmin:
        await ensure_organization_enterprise(db, org)
    return org


# ── ORM Models ───────────────────────────────────────────────────────────────

class CrmEmailSequence(Base):
    __tablename__ = "crm_email_sequences"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")


class CrmSequenceStep(Base):
    __tablename__ = "crm_sequence_steps"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sequence_id: Mapped[int] = mapped_column(Integer, ForeignKey("crm_email_sequences.id", ondelete="CASCADE"), index=True)
    step_order: Mapped[int] = mapped_column(Integer)
    delay_days: Mapped[int] = mapped_column(Integer, server_default="1")
    email_template_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("email_templates.id", ondelete="SET NULL"), nullable=True)
    subject_override: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")


class CrmSequenceEnrollment(Base):
    __tablename__ = "crm_sequence_enrollments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sequence_id: Mapped[int] = mapped_column(Integer, ForeignKey("crm_email_sequences.id", ondelete="CASCADE"), index=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")
    current_step: Mapped[int] = mapped_column(Integer, server_default="0")
    next_send_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(24), server_default="active")
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    unenrolled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class SequenceStepIn(BaseModel):
    step_order: int = Field(ge=1, le=50)
    delay_days: int = Field(default=1, ge=1, le=365)
    email_template_id: Optional[int] = None
    subject_override: Optional[str] = Field(default=None, max_length=320)


class SequenceIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: Optional[str] = Field(default=None, max_length=2000)
    active: bool = True
    steps: list[SequenceStepIn] = Field(default_factory=list, max_length=20)


class SequenceStepOut(BaseModel):
    id: int
    step_order: int
    delay_days: int
    email_template_id: Optional[int] = None
    subject_override: Optional[str] = None


class SequenceOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    active: bool
    steps: list[SequenceStepOut]
    enrollment_count: int
    created_at: datetime
    updated_at: datetime


class EnrollIn(BaseModel):
    emails: list[str] = Field(min_length=1, max_length=500)


class EnrollOut(BaseModel):
    enrolled: int
    skipped: int


class EnrollmentOut(BaseModel):
    id: int
    email: str
    current_step: int
    next_send_at: Optional[datetime] = None
    status: str
    enrolled_at: datetime


# ── Helpers ───────────────────────────────────────────────────────────────────

def _normalize(email: str) -> str:
    return (email or "").strip().lower()


async def _steps_for(db: AsyncSession, sequence_id: int) -> list[CrmSequenceStep]:
    rows = (
        await db.execute(
            select(CrmSequenceStep)
            .where(CrmSequenceStep.sequence_id == sequence_id)
            .order_by(CrmSequenceStep.step_order.asc())
        )
    ).scalars().all()
    return list(rows)


async def _enrollment_count(db: AsyncSession, sequence_id: int) -> int:
    from sqlalchemy import func
    res = await db.execute(
        select(func.count(CrmSequenceEnrollment.id)).where(
            CrmSequenceEnrollment.sequence_id == sequence_id,
            CrmSequenceEnrollment.status == "active",
        )
    )
    return int(res.scalar_one() or 0)


async def _to_out(db: AsyncSession, seq: CrmEmailSequence) -> SequenceOut:
    steps = await _steps_for(db, seq.id)
    count = await _enrollment_count(db, seq.id)
    return SequenceOut(
        id=seq.id,
        name=seq.name,
        description=seq.description,
        active=bool(seq.active),
        steps=[SequenceStepOut(id=s.id, step_order=s.step_order, delay_days=s.delay_days, email_template_id=s.email_template_id, subject_override=s.subject_override) for s in steps],
        enrollment_count=count,
        created_at=seq.created_at,
        updated_at=seq.updated_at,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/api/admin/crm/sequences",
    response_model=list[SequenceOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_sequences(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    rows = (
        await db.execute(
            select(CrmEmailSequence)
            .where(CrmEmailSequence.organization_id == org.id)
            .order_by(CrmEmailSequence.created_at.desc())
        )
    ).scalars().all()
    return [await _to_out(db, seq) for seq in rows]


@router.post(
    "/api/admin/crm/sequences",
    response_model=SequenceOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_sequence(
    request: Request,
    payload: SequenceIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    seq = CrmEmailSequence(
        organization_id=org.id,
        name=payload.name.strip(),
        description=(payload.description or "").strip() or None,
        active=payload.active,
        created_by=me.id,
    )
    db.add(seq)
    await db.flush()
    for step_in in sorted(payload.steps, key=lambda s: s.step_order):
        db.add(CrmSequenceStep(
            sequence_id=seq.id,
            step_order=step_in.step_order,
            delay_days=step_in.delay_days,
            email_template_id=step_in.email_template_id,
            subject_override=step_in.subject_override,
        ))
    await db.commit()
    await db.refresh(seq)
    return await _to_out(db, seq)


@router.patch(
    "/api/admin/crm/sequences/{sequence_id}",
    response_model=SequenceOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_sequence(
    request: Request,
    sequence_id: int,
    payload: SequenceIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    seq = await db.get(CrmEmailSequence, sequence_id)
    if not seq or seq.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Sequence not found")
    seq.name = payload.name.strip()
    seq.description = (payload.description or "").strip() or None
    seq.active = payload.active
    seq.updated_at = datetime.now(timezone.utc)
    existing_steps = await _steps_for(db, seq.id)
    for s in existing_steps:
        await db.delete(s)
    await db.flush()
    for step_in in sorted(payload.steps, key=lambda s: s.step_order):
        db.add(CrmSequenceStep(
            sequence_id=seq.id,
            step_order=step_in.step_order,
            delay_days=step_in.delay_days,
            email_template_id=step_in.email_template_id,
            subject_override=step_in.subject_override,
        ))
    await db.commit()
    await db.refresh(seq)
    return await _to_out(db, seq)


@router.delete(
    "/api/admin/crm/sequences/{sequence_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_sequence(
    request: Request,
    sequence_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    seq = await db.get(CrmEmailSequence, sequence_id)
    if not seq or seq.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Sequence not found")
    await db.delete(seq)
    await db.commit()
    return {"ok": True}


@router.post(
    "/api/admin/crm/sequences/{sequence_id}/enroll",
    response_model=EnrollOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def enroll_in_sequence(
    request: Request,
    sequence_id: int,
    payload: EnrollIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    seq = await db.get(CrmEmailSequence, sequence_id)
    if not seq or seq.organization_id != org.id or not seq.active:
        raise HTTPException(status_code=404, detail="Sequence not found or inactive")
    steps = await _steps_for(db, seq.id)
    if not steps:
        raise HTTPException(status_code=400, detail="Sequence has no steps")
    first_step = steps[0]
    enrolled = skipped = 0
    now = datetime.now(timezone.utc)
    for raw_email in payload.emails:
        email = _normalize(raw_email)
        if not email or "@" not in email:
            skipped += 1
            continue
        existing_res = await db.execute(
            select(CrmSequenceEnrollment).where(
                CrmSequenceEnrollment.sequence_id == seq.id,
                CrmSequenceEnrollment.email == email,
                CrmSequenceEnrollment.status == "active",
            )
        )
        if existing_res.scalar_one_or_none():
            skipped += 1
            continue
        enrollment = CrmSequenceEnrollment(
            sequence_id=seq.id,
            organization_id=org.id,
            email=email,
            current_step=1,
            next_send_at=now + timedelta(days=first_step.delay_days),
            status="active",
        )
        db.add(enrollment)
        enrolled += 1
    await db.commit()
    return EnrollOut(enrolled=enrolled, skipped=skipped)


@router.post(
    "/api/admin/crm/sequences/{sequence_id}/unenroll",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def unenroll_from_sequence(
    request: Request,
    sequence_id: int,
    payload: EnrollIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    seq = await db.get(CrmEmailSequence, sequence_id)
    if not seq or seq.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Sequence not found")
    now = datetime.now(timezone.utc)
    unenrolled = 0
    for raw_email in payload.emails:
        email = _normalize(raw_email)
        existing_res = await db.execute(
            select(CrmSequenceEnrollment).where(
                CrmSequenceEnrollment.sequence_id == seq.id,
                CrmSequenceEnrollment.email == email,
                CrmSequenceEnrollment.status == "active",
            )
        )
        enrollment = existing_res.scalar_one_or_none()
        if enrollment:
            enrollment.status = "unenrolled"
            enrollment.unenrolled_at = now
            unenrolled += 1
    await db.commit()
    return {"unenrolled": unenrolled}


@router.get(
    "/api/admin/crm/sequences/{sequence_id}/enrollments",
    response_model=list[EnrollmentOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_enrollments(
    request: Request,
    sequence_id: int,
    status: str = Query(default="active"),
    limit: int = Query(default=100, ge=1, le=500),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _admin_org(db, me, request)
    seq = await db.get(CrmEmailSequence, sequence_id)
    if not seq or seq.organization_id != org.id:
        raise HTTPException(status_code=404, detail="Sequence not found")
    stmt = select(CrmSequenceEnrollment).where(CrmSequenceEnrollment.sequence_id == seq.id)
    if status:
        stmt = stmt.where(CrmSequenceEnrollment.status == status.strip())
    rows = (await db.execute(stmt.order_by(CrmSequenceEnrollment.enrolled_at.desc()).limit(limit))).scalars().all()
    return [EnrollmentOut(id=row.id, email=row.email, current_step=row.current_step, next_send_at=row.next_send_at, status=row.status, enrolled_at=row.enrolled_at) for row in rows]


# ── Background processor ──────────────────────────────────────────────────────

async def process_due_sequence_steps(
    db_factory,
    *,
    organization_id: Optional[int] = None,
) -> dict[str, int]:
    """Process due drip sequence steps. Called by the scheduler."""
    sent = failed = skipped = 0
    now = datetime.now(timezone.utc)
    async with db_factory() as db:
        stmt = (
            select(CrmSequenceEnrollment)
            .where(
                CrmSequenceEnrollment.status == "active",
                CrmSequenceEnrollment.next_send_at <= now,
            )
        )
        if organization_id:
            stmt = stmt.where(CrmSequenceEnrollment.organization_id == organization_id)
        enrollments = (await db.execute(stmt.limit(500))).scalars().all()
        for enrollment in enrollments:
            seq = await db.get(CrmEmailSequence, enrollment.sequence_id)
            if not seq or not seq.active:
                enrollment.status = "completed"
                skipped += 1
                continue
            steps = await _steps_for(db, seq.id)
            step = next((s for s in steps if s.step_order == enrollment.current_step), None)
            if not step:
                enrollment.status = "completed"
                enrollment.completed_at = now
                continue
            if step.email_template_id:
                template = await db.get(EmailTemplate, step.email_template_id)
                if template:
                    try:
                        subject = step.subject_override or template.subject_tr or template.name
                        await send_email_async(enrollment.email, subject, template.body_html or "", raise_on_error=True)
                        sent += 1
                    except Exception:
                        failed += 1
            next_steps = [s for s in steps if s.step_order > enrollment.current_step]
            if next_steps:
                nxt = min(next_steps, key=lambda s: s.step_order)
                enrollment.current_step = nxt.step_order
                enrollment.next_send_at = now + timedelta(days=nxt.delay_days)
            else:
                enrollment.status = "completed"
                enrollment.completed_at = now
        await db.commit()
    return {"sent": sent, "failed": failed, "skipped": skipped}
