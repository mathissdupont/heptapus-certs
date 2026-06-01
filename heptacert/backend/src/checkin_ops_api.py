"""Check-in activity logging, lookup, and operations metrics."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import Integer, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    Attendee,
    CheckinActivityLog,
    CurrentUser,
    EventSession,
    EventTicket,
    Role,
    User,
    _get_event_for_admin,
    get_current_user,
    get_db,
    require_paid_plan,
    require_role,
)
from .organization_access_api import ensure_organization_enterprise

router = APIRouter()


class CheckinLookupItem(BaseModel):
    attendee_id: int
    name: str
    email: str
    ticket_status: Optional[str] = None
    checked_in_at: Optional[datetime] = None


class CheckinMetricsOut(BaseModel):
    total: int
    successful: int
    failed: int
    last_hour: int
    by_method: list[dict]
    by_staff: list[dict]
    recent: list[dict]


class CheckinActivityOut(BaseModel):
    id: int
    method: str
    source: str
    success: bool
    message: Optional[str] = None
    created_at: datetime
    attendee_name: Optional[str] = None
    attendee_email: Optional[str] = None
    session_name: Optional[str] = None
    staff_email: Optional[str] = None


async def record_checkin_activity(
    db: AsyncSession,
    *,
    event_id: int,
    actor_user_id: Optional[int],
    method: str,
    source: str,
    success: bool,
    message: str,
    ip_address: Optional[str] = None,
    session_id: Optional[int] = None,
    attendee_id: Optional[int] = None,
    ticket_id: Optional[int] = None,
) -> None:
    db.add(
        CheckinActivityLog(
            event_id=event_id,
            session_id=session_id,
            attendee_id=attendee_id,
            ticket_id=ticket_id,
            actor_user_id=actor_user_id,
            method=method[:32],
            source=source[:32],
            success=success,
            message=message[:500],
            ip_address=ip_address,
        )
    )


@router.get(
    "/api/admin/events/{event_id}/checkin-lookup",
    response_model=list[CheckinLookupItem],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def checkin_lookup(
    event_id: int,
    query: str = Query(min_length=1, max_length=120),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "checkin:write")
    if me.role != Role.superadmin:
        from .main import Organization

        org_res = await db.execute(select(Organization).where(Organization.user_id == event.admin_id))
        org = org_res.scalar_one_or_none()
        if org:
            await ensure_organization_enterprise(db, org)
    needle = f"%{query.strip().lower()}%"
    rows_res = await db.execute(
        select(Attendee, EventTicket)
        .outerjoin(EventTicket, EventTicket.attendee_id == Attendee.id)
        .where(
            Attendee.event_id == event_id,
            or_(func.lower(Attendee.name).like(needle), func.lower(Attendee.email).like(needle)),
        )
        .order_by(Attendee.name.asc())
        .limit(20)
    )
    return [
        CheckinLookupItem(
            attendee_id=attendee.id,
            name=attendee.name,
            email=attendee.email,
            ticket_status=ticket.status if ticket else None,
            checked_in_at=ticket.checked_in_at if ticket else None,
        )
        for attendee, ticket in rows_res.all()
    ]


@router.get(
    "/api/admin/events/{event_id}/checkin-metrics",
    response_model=CheckinMetricsOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def get_checkin_metrics(
    event_id: int,
    hours: int = Query(default=1, ge=1, le=168),
    recent_limit: int = Query(default=20, ge=1, le=100),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "checkin:write")
    if me.role != Role.superadmin:
        from .main import Organization

        org_res = await db.execute(select(Organization).where(Organization.user_id == event.admin_id))
        org = org_res.scalar_one_or_none()
        if org:
            await ensure_organization_enterprise(db, org)
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    total = int((await db.execute(select(func.count(CheckinActivityLog.id)).where(CheckinActivityLog.event_id == event_id))).scalar_one() or 0)
    successful = int(
        (
            await db.execute(
                select(func.count(CheckinActivityLog.id)).where(CheckinActivityLog.event_id == event_id, CheckinActivityLog.success.is_(True))
            )
        ).scalar_one()
        or 0
    )
    last_hour = int(
        (
            await db.execute(
                select(func.count(CheckinActivityLog.id)).where(CheckinActivityLog.event_id == event_id, CheckinActivityLog.created_at >= since)
            )
        ).scalar_one()
        or 0
    )
    method_rows = (
        await db.execute(
            select(CheckinActivityLog.method, func.count(CheckinActivityLog.id))
            .where(CheckinActivityLog.event_id == event_id)
            .group_by(CheckinActivityLog.method)
        )
    ).all()
    staff_rows = (
        await db.execute(
            select(User.email, func.count(CheckinActivityLog.id), func.sum(cast(CheckinActivityLog.success, Integer)))
            .join(User, User.id == CheckinActivityLog.actor_user_id, isouter=True)
            .where(CheckinActivityLog.event_id == event_id)
            .group_by(User.email)
            .order_by(func.count(CheckinActivityLog.id).desc())
            .limit(10)
        )
    ).all()
    recent_rows = (
        await db.execute(
            select(CheckinActivityLog, Attendee, EventSession)
            .outerjoin(Attendee, Attendee.id == CheckinActivityLog.attendee_id)
            .outerjoin(EventSession, EventSession.id == CheckinActivityLog.session_id)
            .where(CheckinActivityLog.event_id == event_id)
            .order_by(CheckinActivityLog.created_at.desc())
            .limit(recent_limit)
        )
    ).all()
    return CheckinMetricsOut(
        total=total,
        successful=successful,
        failed=max(total - successful, 0),
        last_hour=last_hour,
        by_method=[{"method": method or "unknown", "count": int(count or 0)} for method, count in method_rows],
        by_staff=[
            {"email": email or "system", "count": int(count or 0), "successful": int(successful_count or 0)}
            for email, count, successful_count in staff_rows
        ],
        recent=[
            {
                "id": row.id,
                "method": row.method,
                "source": row.source,
                "success": row.success,
                "message": row.message,
                "created_at": row.created_at,
                "attendee_name": attendee.name if attendee else None,
                "attendee_email": attendee.email if attendee else None,
                "session_name": session.name if session else None,
            }
            for row, attendee, session in recent_rows
        ],
    )


@router.get(
    "/api/admin/events/{event_id}/checkin-activity",
    response_model=list[CheckinActivityOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def list_checkin_activity(
    event_id: int,
    success: Optional[bool] = Query(default=None),
    method: str = Query(default="", max_length=32),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0, le=10000),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "checkin:write")
    if me.role != Role.superadmin:
        from .main import Organization

        org_res = await db.execute(select(Organization).where(Organization.user_id == event.admin_id))
        org = org_res.scalar_one_or_none()
        if org:
            await ensure_organization_enterprise(db, org)
    stmt = (
        select(CheckinActivityLog, Attendee, EventSession, User)
        .outerjoin(Attendee, Attendee.id == CheckinActivityLog.attendee_id)
        .outerjoin(EventSession, EventSession.id == CheckinActivityLog.session_id)
        .outerjoin(User, User.id == CheckinActivityLog.actor_user_id)
        .where(CheckinActivityLog.event_id == event_id)
    )
    if success is not None:
        stmt = stmt.where(CheckinActivityLog.success.is_(success))
    if method.strip():
        stmt = stmt.where(CheckinActivityLog.method == method.strip()[:32])
    rows = (
        await db.execute(
            stmt.order_by(CheckinActivityLog.created_at.desc()).offset(offset).limit(limit)
        )
    ).all()
    return [
        CheckinActivityOut(
            id=row.id,
            method=row.method,
            source=row.source,
            success=row.success,
            message=row.message,
            created_at=row.created_at,
            attendee_name=attendee.name if attendee else None,
            attendee_email=attendee.email if attendee else None,
            session_name=session.name if session else None,
            staff_email=user.email if user else None,
        )
        for row, attendee, session, user in rows
    ]
