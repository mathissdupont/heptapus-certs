"""
Registration approval (manual / offline-payment gate).

When an event has `requires_approval` enabled, public self-registrations land as
`approval_status="pending"`. These endpoints let an organizer review the queue and
approve (e.g. after confirming a bank/offline payment) or reject a registration.
Approval gates check-in and certificate issuance (see services.attendee_is_confirmed).

Endpoints (org-scoped via _get_event_for_admin, same auth as the rest of admin):
  GET   /api/admin/events/{event_id}/registrations?status=pending  — list registrations
  POST  /api/admin/events/{event_id}/attendees/{attendee_id}/approve
  POST  /api/admin/events/{event_id}/attendees/{attendee_id}/reject
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    Attendee,
    CurrentUser,
    Role,
    get_current_user,
    get_db,
    require_role,
    _get_event_for_admin,
)

router = APIRouter()

_VALID_STATUSES = {"not_required", "pending", "approved", "rejected"}


class ApprovalDecisionIn(BaseModel):
    note: Optional[str] = Field(default=None, max_length=500)


class RegistrationOut(BaseModel):
    attendee_id: int
    name: str
    email: str
    approval_status: str
    approved_at: Optional[str] = None
    approval_note: Optional[str] = None
    registered_at: Optional[str] = None


def _to_out(a: Attendee) -> RegistrationOut:
    return RegistrationOut(
        attendee_id=a.id,
        name=a.name,
        email=a.email,
        approval_status=a.approval_status or "not_required",
        approved_at=a.approved_at.isoformat() if a.approved_at else None,
        approval_note=a.approval_note,
        registered_at=a.registered_at.isoformat() if a.registered_at else None,
    )


@router.get(
    "/api/admin/events/{event_id}/registrations",
    response_model=list[RegistrationOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_registrations(
    event_id: int,
    status: Optional[str] = Query(default=None, description="Filter by approval_status"),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_event_for_admin(event_id, me, db, "attendees:read")
    stmt = select(Attendee).where(Attendee.event_id == event_id)
    if status:
        if status not in _VALID_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status filter")
        stmt = stmt.where(Attendee.approval_status == status)
    stmt = stmt.order_by(Attendee.registered_at.desc())
    rows = (await db.execute(stmt)).scalars().all()
    return [_to_out(a) for a in rows]


async def _decide(
    event_id: int,
    attendee_id: int,
    new_status: str,
    note: Optional[str],
    me: CurrentUser,
    db: AsyncSession,
) -> RegistrationOut:
    await _get_event_for_admin(event_id, me, db, "attendees:write")
    res = await db.execute(
        select(Attendee).where(Attendee.id == attendee_id, Attendee.event_id == event_id)
    )
    attendee = res.scalar_one_or_none()
    if not attendee:
        raise HTTPException(status_code=404, detail="Attendee not found")
    attendee.approval_status = new_status
    attendee.approved_by = me.id
    attendee.approved_at = datetime.now(timezone.utc)
    if note is not None:
        attendee.approval_note = note
    await db.commit()
    await db.refresh(attendee)
    return _to_out(attendee)


@router.post(
    "/api/admin/events/{event_id}/attendees/{attendee_id}/approve",
    response_model=RegistrationOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def approve_registration(
    event_id: int,
    attendee_id: int,
    payload: ApprovalDecisionIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _decide(event_id, attendee_id, "approved", payload.note, me, db)


@router.post(
    "/api/admin/events/{event_id}/attendees/{attendee_id}/reject",
    response_model=RegistrationOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def reject_registration(
    event_id: int,
    attendee_id: int,
    payload: ApprovalDecisionIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _decide(event_id, attendee_id, "rejected", payload.note, me, db)
