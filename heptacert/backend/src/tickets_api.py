import io
import re
from datetime import datetime, timezone
from typing import List

from fastapi import Depends, HTTPException, Request
from fastapi.routing import APIRouter
from fastapi.responses import Response
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .main import (
    AttendaonceRecord,
    CurrentUser,
    EventSession,
    EventTicket,
    EventTicketOut,
    PILImage,
    PublicTicketOut,
    Role,
    TicketCheckInIn,
    TicketStatusUpdateIn,
    _ensure_ticketing_feature_enabled,
    _get_event_for_admin,
    _get_public_event_identifier,
    _client_ip_for_rate_limit,
    _make_apple_wallet_pass,
    _make_ticket_image,
    _record_ticket_attendaonce,
    _ticket_download_filename,
    _ticket_to_out,
    _ticket_token_from_payload,
    get_current_user,
    get_db,
    is_ticketing_enabled,
    qrcode,
    require_paid_plan,
    require_role,
)

router = APIRouter()


@router.get("/api/tickets/{token}", response_model=PublicTicketOut)
async def get_public_ticket(token: str, db: AsyncSession = Depends(get_db)):
    clean_token = _ticket_token_from_payload(token)
    res = await db.execute(
        select(EventTicket)
        .options(selectinload(EventTicket.event), selectinload(EventTicket.attendee))
        .where(EventTicket.token == clean_token)
    )
    ticket = res.scalar_one_or_none()
    if not ticket or not is_ticketing_enabled(ticket.event):
        raise HTTPException(status_code=404, detail="Ticket not found")
    return PublicTicketOut(
        event_id=ticket.event_id,
        event_public_id=_get_public_event_identifier(ticket.event),
        event_name=ticket.event.name,
        attendee_name=ticket.attendee.name,
        attendee_email=ticket.attendee.email,
        status=ticket.status,
        issued_at=ticket.issued_at,
        checked_in_at=ticket.checked_in_at,
    )


@router.get("/api/tickets/{token}/qr")
async def get_public_ticket_qr(token: str, db: AsyncSession = Depends(get_db)):
    clean_token = _ticket_token_from_payload(token)
    res = await db.execute(
        select(EventTicket)
        .options(selectinload(EventTicket.event))
        .where(EventTicket.token == clean_token)
    )
    ticket = res.scalar_one_or_none()
    if not ticket or not is_ticketing_enabled(ticket.event):
        raise HTTPException(status_code=404, detail="Ticket not found")
    if qrcode is None:
        raise HTTPException(status_code=503, detail="QR generation is not available")

    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(ticket.qr_payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return Response(content=buf.getvalue(), media_type="image/png")


@router.get("/api/tickets/{token}/png")
async def get_public_ticket_png(token: str, db: AsyncSession = Depends(get_db)):
    clean_token = _ticket_token_from_payload(token)
    res = await db.execute(
        select(EventTicket)
        .options(selectinload(EventTicket.event), selectinload(EventTicket.attendee))
        .where(EventTicket.token == clean_token)
    )
    ticket = res.scalar_one_or_none()
    if not ticket or not is_ticketing_enabled(ticket.event):
        raise HTTPException(status_code=404, detail="Ticket not found")

    png_bytes = _make_ticket_image(ticket)
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={
            "Content-Disposition": f'attachment; filename="{_ticket_download_filename(ticket, "png")}"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/api/tickets/{token}/pdf")
async def get_public_ticket_pdf(token: str, db: AsyncSession = Depends(get_db)):
    clean_token = _ticket_token_from_payload(token)
    res = await db.execute(
        select(EventTicket)
        .options(selectinload(EventTicket.event), selectinload(EventTicket.attendee))
        .where(EventTicket.token == clean_token)
    )
    ticket = res.scalar_one_or_none()
    if not ticket or not is_ticketing_enabled(ticket.event):
        raise HTTPException(status_code=404, detail="Ticket not found")
    if PILImage is None:
        raise HTTPException(status_code=503, detail="Ticket PDF generation is not available")

    png_bytes = _make_ticket_image(ticket)
    image = PILImage.open(io.BytesIO(png_bytes)).convert("RGB")
    buf = io.BytesIO()
    image.save(buf, format="PDF", resolution=300.0)

    return Response(
        content=buf.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{_ticket_download_filename(ticket, "pdf")}"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/api/tickets/{token}/apple-wallet")
async def get_public_ticket_apple_wallet(token: str, db: AsyncSession = Depends(get_db)):
    clean_token = _ticket_token_from_payload(token)
    res = await db.execute(
        select(EventTicket)
        .options(selectinload(EventTicket.event), selectinload(EventTicket.attendee))
        .where(EventTicket.token == clean_token)
    )
    ticket = res.scalar_one_or_none()
    if not ticket or not is_ticketing_enabled(ticket.event):
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status in {"cancelled", "revoked"}:
        raise HTTPException(status_code=409, detail="Cancelled tickets cannot be added to Wallet")
    pass_bytes = _make_apple_wallet_pass(ticket)
    safe_name = re.sub(r"[^A-Za-z0-9_-]+", "-", ticket.event.name).strip("-") or "event"
    return Response(
        content=pass_bytes,
        media_type="application/vnd.apple.pkpass",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}-{ticket.id}.pkpass"',
            "Cache-Control": "no-store",
        },
    )


@router.get(
    "/api/admin/events/{event_id}/tickets",
    response_model=List[EventTicketOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def list_event_tickets(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "attendees:read")
    _ensure_ticketing_feature_enabled(ev)
    tickets_res = await db.execute(
        select(EventTicket)
        .options(selectinload(EventTicket.attendee))
        .where(EventTicket.event_id == event_id)
        .order_by(EventTicket.created_at.desc(), EventTicket.id.desc())
    )
    return [_ticket_to_out(ticket) for ticket in tickets_res.scalars().all()]


@router.post(
    "/api/admin/events/{event_id}/tickets/check-in",
    response_model=EventTicketOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def check_in_event_ticket(
    event_id: int,
    payload: TicketCheckInIn,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "checkin:write")
    _ensure_ticketing_feature_enabled(ev)
    clean_token = _ticket_token_from_payload(payload.token)
    ticket_res = await db.execute(
        select(EventTicket)
        .options(selectinload(EventTicket.attendee))
        .where(EventTicket.event_id == event_id, EventTicket.token == clean_token)
        .with_for_update()
    )
    ticket = ticket_res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status in {"cancelled", "revoked"}:
        raise HTTPException(status_code=409, detail="Ticket is cancelled")
    ip = _client_ip_for_rate_limit(request)
    if ticket.status == "used":
        await _record_ticket_attendaonce(db, event=ev, ticket=ticket, ip_address=ip)
        await db.commit()
        return _ticket_to_out(ticket)
    ticket.status = "used"
    ticket.checked_in_at = datetime.now(timezone.utc)
    await _record_ticket_attendaonce(db, event=ev, ticket=ticket, ip_address=ip)
    await db.commit()
    await db.refresh(ticket)
    await db.refresh(ticket, attribute_names=["attendee"])
    return _ticket_to_out(ticket)


@router.patch(
    "/api/admin/events/{event_id}/tickets/{ticket_id}/status",
    response_model=EventTicketOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def update_event_ticket_status(
    event_id: int,
    ticket_id: int,
    payload: TicketStatusUpdateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "checkin:write")
    _ensure_ticketing_feature_enabled(ev)
    ticket_res = await db.execute(
        select(EventTicket)
        .options(selectinload(EventTicket.attendee))
        .where(EventTicket.event_id == event_id, EventTicket.id == ticket_id)
        .with_for_update()
    )
    ticket = ticket_res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = "cancelled" if payload.status == "revoked" else payload.status
    if ticket.status != "used":
        ticket.checked_in_at = None
        await db.execute(
            delete(AttendaonceRecord).where(
                AttendaonceRecord.attendee_id == ticket.attendee_id,
                AttendaonceRecord.session_id.in_(
                    select(EventSession.id).where(
                        EventSession.event_id == event_id,
                        EventSession.name == "Ticket Check-in",
                    )
                ),
            )
        )
    await db.commit()
    await db.refresh(ticket)
    await db.refresh(ticket, attribute_names=["attendee"])
    return _ticket_to_out(ticket)
