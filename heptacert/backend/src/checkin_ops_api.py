"""Check-in activity logging, lookup, kiosk sessions, and operations metrics."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import Integer, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    Attendee,
    AttendaonceRecord,
    CheckinActivityLog,
    CheckinKioskSession,
    CheckinNonce,
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
    duplicate_count: int = 0
    invalid_count: int = 0
    capacity_alerts: list[dict] = []
    hourly: list[dict] = []


class CheckinActivityOut(BaseModel):
    id: int
    method: str
    source: str
    entry_point: str = "admin"
    success: bool
    duplicate: bool = False
    invalid_reason: Optional[str] = None
    message: Optional[str] = None
    created_at: datetime
    attendee_name: Optional[str] = None
    attendee_email: Optional[str] = None
    session_name: Optional[str] = None
    staff_email: Optional[str] = None


class CheckinNonceOut(BaseModel):
    nonce: str
    expires_at: datetime


class KioskSessionIn(BaseModel):
    label: str = Field(default="Kiosk", max_length=120)
    session_id: Optional[int] = None
    ttl_hours: int = Field(default=8, ge=1, le=168)


class KioskSessionOut(BaseModel):
    id: int
    label: str
    token: Optional[str] = None
    session_id: Optional[int] = None
    expires_at: datetime
    revoked_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    created_at: datetime


def _hash_token(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


async def _ensure_ops_enterprise(db: AsyncSession, event_id: int, me: CurrentUser, required_permission: str = "checkin:write"):
    event = await _get_event_for_admin(event_id, me, db, required_permission)
    if me.role != Role.superadmin:
        from .main import Organization

        org_res = await db.execute(select(Organization).where(Organization.user_id == event.admin_id))
        org = org_res.scalar_one_or_none()
        if org:
            await ensure_organization_enterprise(db, org)
    return event


async def _kiosk_from_token(db: AsyncSession, token: Optional[str], event_id: int) -> Optional[CheckinKioskSession]:
    if not token:
        return None
    row = (
        await db.execute(
            select(CheckinKioskSession).where(
                CheckinKioskSession.event_id == event_id,
                CheckinKioskSession.token_hash == _hash_token(token),
            )
        )
    ).scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if not row or row.revoked_at or row.expires_at < now:
        return None
    row.last_seen_at = now
    return row


async def _consume_nonce(db: AsyncSession, event_id: int, nonce: Optional[str], kiosk: Optional[CheckinKioskSession]) -> None:
    if not nonce:
        raise HTTPException(status_code=428, detail="Check-in nonce is required")
    row = (
        await db.execute(
            select(CheckinNonce).where(CheckinNonce.event_id == event_id, CheckinNonce.nonce == nonce)
        )
    ).scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if not row or row.used_at or row.expires_at < now:
        raise HTTPException(status_code=409, detail="Check-in nonce is invalid or expired")
    if kiosk and row.kiosk_session_id and row.kiosk_session_id != kiosk.id:
        raise HTTPException(status_code=409, detail="Check-in nonce does not match kiosk session")
    row.used_at = now


def _kiosk_out(row: CheckinKioskSession, token: Optional[str] = None) -> KioskSessionOut:
    return KioskSessionOut(
        id=row.id,
        label=row.label,
        token=token,
        session_id=row.session_id,
        expires_at=row.expires_at,
        revoked_at=row.revoked_at,
        last_seen_at=row.last_seen_at,
        created_at=row.created_at,
    )


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
    entry_point: str = "admin",
    duplicate: bool = False,
    invalid_reason: Optional[str] = None,
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
            entry_point=entry_point[:48],
            success=success,
            duplicate=duplicate,
            invalid_reason=(invalid_reason or "")[:120] or None,
            message=message[:500],
            ip_address=ip_address,
        )
    )


@router.post(
    "/api/admin/events/{event_id}/checkin-nonce",
    response_model=CheckinNonceOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def issue_checkin_nonce(
    event_id: int,
    kiosk_token: Optional[str] = Header(default=None, alias="X-Kiosk-Token"),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_ops_enterprise(db, event_id, me, "checkin:write")
    kiosk = await _kiosk_from_token(db, kiosk_token, event_id)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    nonce = secrets.token_urlsafe(32)
    db.add(CheckinNonce(event_id=event_id, nonce=nonce, actor_user_id=me.id, kiosk_session_id=kiosk.id if kiosk else None, expires_at=expires_at))
    await db.commit()
    return CheckinNonceOut(nonce=nonce, expires_at=expires_at)


@router.post(
    "/api/admin/events/{event_id}/kiosk-sessions",
    response_model=KioskSessionOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def create_kiosk_session(
    event_id: int,
    payload: KioskSessionIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_ops_enterprise(db, event_id, me, "checkin:write")
    if payload.session_id:
        session = await db.get(EventSession, payload.session_id)
        if not session or session.event_id != event_id:
            raise HTTPException(status_code=404, detail="Session not found")
    token = secrets.token_urlsafe(36)
    row = CheckinKioskSession(
        event_id=event_id,
        session_id=payload.session_id,
        label=payload.label.strip() or "Kiosk",
        token_hash=_hash_token(token),
        created_by=me.id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=payload.ttl_hours),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _kiosk_out(row, token=token)


@router.get(
    "/api/admin/events/{event_id}/kiosk-sessions",
    response_model=list[KioskSessionOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def list_kiosk_sessions(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_ops_enterprise(db, event_id, me, "checkin:write")
    rows = (
        await db.execute(
            select(CheckinKioskSession)
            .where(CheckinKioskSession.event_id == event_id)
            .order_by(CheckinKioskSession.created_at.desc())
            .limit(50)
        )
    ).scalars().all()
    return [_kiosk_out(row) for row in rows]


@router.post(
    "/api/admin/events/{event_id}/kiosk-sessions/{kiosk_id}/revoke",
    response_model=KioskSessionOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def revoke_kiosk_session(
    event_id: int,
    kiosk_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_ops_enterprise(db, event_id, me, "checkin:write")
    row = await db.get(CheckinKioskSession, kiosk_id)
    if not row or row.event_id != event_id:
        raise HTTPException(status_code=404, detail="Kiosk session not found")
    row.revoked_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(row)
    return _kiosk_out(row)


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
    duplicate_count = int(
        (
            await db.execute(
                select(func.count(CheckinActivityLog.id)).where(CheckinActivityLog.event_id == event_id, CheckinActivityLog.duplicate.is_(True))
            )
        ).scalar_one()
        or 0
    )
    invalid_count = int(
        (
            await db.execute(
                select(func.count(CheckinActivityLog.id)).where(CheckinActivityLog.event_id == event_id, CheckinActivityLog.invalid_reason.is_not(None))
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
    hourly_rows = (
        await db.execute(
            select(func.date_trunc("hour", CheckinActivityLog.created_at), func.count(CheckinActivityLog.id))
            .where(CheckinActivityLog.event_id == event_id, CheckinActivityLog.created_at >= datetime.now(timezone.utc) - timedelta(hours=24))
            .group_by(func.date_trunc("hour", CheckinActivityLog.created_at))
            .order_by(func.date_trunc("hour", CheckinActivityLog.created_at))
        )
    ).all()
    capacity_rows = (
        await db.execute(
            select(EventSession, func.count(AttendaonceRecord.id))
            .outerjoin(AttendaonceRecord, AttendaonceRecord.session_id == EventSession.id)
            .where(EventSession.event_id == event_id, EventSession.capacity.is_not(None))
            .group_by(EventSession.id)
        )
    ).all()
    capacity_alerts = []
    for session, count in capacity_rows:
        capacity = int(session.capacity or 0)
        used = int(count or 0)
        if capacity > 0 and (used / capacity) * 100 >= int(session.capacity_alert_threshold or 90):
            capacity_alerts.append({"session_id": session.id, "session_name": session.name, "used": used, "capacity": capacity})
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
        duplicate_count=duplicate_count,
        invalid_count=invalid_count,
        capacity_alerts=capacity_alerts,
        hourly=[{"hour": hour.isoformat() if hasattr(hour, "isoformat") else str(hour), "count": int(count or 0)} for hour, count in hourly_rows],
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
    source: str = Query(default="", max_length=32),
    entry_point: str = Query(default="", max_length=48),
    staff_email: str = Query(default="", max_length=320),
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
    if source.strip():
        stmt = stmt.where(CheckinActivityLog.source == source.strip()[:32])
    if entry_point.strip():
        stmt = stmt.where(CheckinActivityLog.entry_point == entry_point.strip()[:48])
    if staff_email.strip():
        stmt = stmt.where(func.lower(User.email).like(f"%{staff_email.strip().lower()}%"))
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
            entry_point=row.entry_point,
            success=row.success,
            duplicate=row.duplicate,
            invalid_reason=row.invalid_reason,
            message=row.message,
            created_at=row.created_at,
            attendee_name=attendee.name if attendee else None,
            attendee_email=attendee.email if attendee else None,
            session_name=session.name if session else None,
            staff_email=user.email if user else None,
        )
        for row, attendee, session, user in rows
    ]
