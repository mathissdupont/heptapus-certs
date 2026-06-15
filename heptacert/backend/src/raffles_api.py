"""Etkinlik cekilis (raffle) yonetimi route'lari (main.py'dan ayiklandi).

Routers refactor Adim 4d. Handler'lar main.py'daki paylasilan helper'lara
(_get_event_for_admin, _get_raffle_for_admin, ...) bagimli; main bu router'i
en sonda include ettigi icin `from .main import ...` (gec-import) calisir.
Mevcut *_api.py konvansiyonuyla ayni.
"""

import csv
import io
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Literal, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, delete, distinct, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .main import (
    AuditLog, AuditLogOut, CurrentUser, EventRaffle, EventRaffleCreateIn,
    EventRaffleOut, EventRaffleUpdateIn, EventRaffleWinner, Role,
    _get_event_attendaonce_counts, _get_event_email_verification_required,
    _get_event_for_admin, _get_raffle_for_admin, _pick_raffle_winners,
    _raffle_to_out, get_current_user, get_db, is_raffles_enabled,
    require_paid_plan, require_role, write_audit_log,
)

router = APIRouter()


@router.get(
    "/api/admin/events/{event_id}/raffles",
    response_model=List[EventRaffleOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def list_event_raffles(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "settings:write")
    if not is_raffles_enabled(event):
        raise HTTPException(status_code=403, detail="Raffle features are disabled for this event.")
    raffles_res = await db.execute(
        select(EventRaffle)
        .options(selectinload(EventRaffle.winners).selectinload(EventRaffleWinner.attendee))
        .where(EventRaffle.event_id == event_id)
        .order_by(EventRaffle.created_at.desc(), EventRaffle.id.desc())
    )
    raffles = raffles_res.scalars().all()
    attendees, attendaonce_counts = await _get_event_attendaonce_counts(event_id, db)
    require_email_verification = _get_event_email_verification_required(event)
    return [
        _raffle_to_out(
            raffle,
            attendees,
            attendaonce_counts,
            require_email_verification=require_email_verification,
        )
        for raffle in raffles
    ]


@router.get(
    "/api/admin/events/{event_id}/raffles/audit",
    response_model=List[AuditLogOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def list_event_raffle_audit_logs(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "settings:write")
    if not is_raffles_enabled(event):
        raise HTTPException(status_code=403, detail="Raffle features are disabled for this event.")
    logs_res = await db.execute(
        select(AuditLog)
        .where(
            AuditLog.resource_type == "raffle",
            AuditLog.extra["event_id"].astext == str(event_id),
        )
        .order_by(AuditLog.created_at.desc())
        .limit(100)
    )
    return logs_res.scalars().all()


@router.post(
    "/api/admin/events/{event_id}/raffles",
    response_model=EventRaffleOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def create_event_raffle(
    event_id: int,
    payload: EventRaffleCreateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "settings:write")
    if not is_raffles_enabled(event):
        raise HTTPException(status_code=403, detail="Raffle features are disabled for this event.")
    raffle = EventRaffle(
        event_id=event_id,
        title=payload.title.strip(),
        prize_name=payload.prize_name.strip(),
        description=(payload.description.strip() if payload.description else None),
        min_sessions_required=payload.min_sessions_required,
        winner_count=payload.winner_count,
        reserve_winner_count=payload.reserve_winner_count,
        status="draft",
        created_by=me.id,
    )
    db.add(raffle)
    await db.flush()
    await write_audit_log(
        db,
        user_id=me.id,
        action="raffle.create",
        resource_type="raffle",
        resource_id=str(raffle.id),
        extra={
            "event_id": event_id,
            "title": raffle.title,
            "winner_count": raffle.winner_count,
            "reserve_winner_count": raffle.reserve_winner_count,
            "min_sessions_required": raffle.min_sessions_required,
        },
    )
    await db.commit()
    raffle = await _get_raffle_for_admin(event_id, raffle.id, me, db)
    attendees, attendaonce_counts = await _get_event_attendaonce_counts(event_id, db)
    return _raffle_to_out(
        raffle,
        attendees,
        attendaonce_counts,
        require_email_verification=_get_event_email_verification_required(event),
    )


@router.patch(
    "/api/admin/events/{event_id}/raffles/{raffle_id}",
    response_model=EventRaffleOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def update_event_raffle(
    event_id: int,
    raffle_id: int,
    payload: EventRaffleUpdateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "settings:write")
    raffle = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    should_reset_draw = False

    original_title = raffle.title
    if payload.title is not None:
        raffle.title = payload.title.strip()
    if payload.prize_name is not None:
        raffle.prize_name = payload.prize_name.strip()
    if payload.description is not None:
        raffle.description = payload.description.strip() or None
    if payload.min_sessions_required is not None:
        raffle.min_sessions_required = payload.min_sessions_required
        should_reset_draw = True
    if payload.winner_count is not None:
        raffle.winner_count = payload.winner_count
        should_reset_draw = True
    if payload.reserve_winner_count is not None:
        raffle.reserve_winner_count = payload.reserve_winner_count
        should_reset_draw = True

    if should_reset_draw:
        await db.execute(delete(EventRaffleWinner).where(EventRaffleWinner.raffle_id == raffle.id))
        raffle.winners.clear()
        raffle.status = "draft"
        raffle.drawn_at = None

    await write_audit_log(
        db,
        user_id=me.id,
        action="raffle.update",
        resource_type="raffle",
        resource_id=str(raffle.id),
        extra={
            "event_id": event_id,
            "title_before": original_title,
            "title_after": raffle.title,
            "winner_count": raffle.winner_count,
            "reserve_winner_count": raffle.reserve_winner_count,
            "min_sessions_required": raffle.min_sessions_required,
            "reset_draw": should_reset_draw,
        },
    )
    await db.commit()
    refreshed = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    attendees, attendaonce_counts = await _get_event_attendaonce_counts(event_id, db)
    return _raffle_to_out(
        refreshed,
        attendees,
        attendaonce_counts,
        require_email_verification=_get_event_email_verification_required(event),
    )


@router.delete(
    "/api/admin/events/{event_id}/raffles/{raffle_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def delete_event_raffle(
    event_id: int,
    raffle_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    raffle = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    await write_audit_log(
        db,
        user_id=me.id,
        action="raffle.delete",
        resource_type="raffle",
        resource_id=str(raffle.id),
        extra={
            "event_id": event_id,
            "title": raffle.title,
            "winner_count": raffle.winner_count,
            "reserve_winner_count": raffle.reserve_winner_count,
        },
    )
    await db.delete(raffle)
    await db.commit()
    return {"ok": True}


@router.post(
    "/api/admin/events/{event_id}/raffles/{raffle_id}/draw",
    response_model=EventRaffleOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def draw_event_raffle(
    event_id: int,
    raffle_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "settings:write")
    raffle = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    if raffle.winners:
        raise HTTPException(status_code=400, detail="Kazananlar zaten ÃƒÂ§ekildi. Yeni tur iÃƒÂ§in tekrar ÃƒÂ§ek kullanÃ„Â±n")
    attendees, attendaonce_counts = await _get_event_attendaonce_counts(event_id, db)
    selected_winners = _pick_raffle_winners(
        raffle,
        attendees,
        attendaonce_counts,
        require_email_verification=_get_event_email_verification_required(event),
    )
    draw_time = datetime.now(timezone.utc)
    for attendee in selected_winners:
        raffle.winners.append(
            EventRaffleWinner(attendee_id=attendee.id, drawn_at=draw_time)
        )

    raffle.status = "drawn"
    raffle.drawn_at = draw_time
    await write_audit_log(
        db,
        user_id=me.id,
        action="raffle.draw",
        resource_type="raffle",
        resource_id=str(raffle.id),
        extra={
            "event_id": event_id,
            "title": raffle.title,
            "selected_count": len(selected_winners),
            "winner_ids": [attendee.id for attendee in selected_winners],
        },
    )
    await db.commit()

    refreshed = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    attendees, attendaonce_counts = await _get_event_attendaonce_counts(event_id, db)
    return _raffle_to_out(
        refreshed,
        attendees,
        attendaonce_counts,
        require_email_verification=_get_event_email_verification_required(event),
    )


@router.post(
    "/api/admin/events/{event_id}/raffles/{raffle_id}/redraw",
    response_model=EventRaffleOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def redraw_event_raffle(
    event_id: int,
    raffle_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "settings:write")
    raffle = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    attendees, attendaonce_counts = await _get_event_attendaonce_counts(event_id, db)
    excluded_attendee_ids = {winner.attendee_id for winner in raffle.winners}
    selected_winners = _pick_raffle_winners(
        raffle,
        attendees,
        attendaonce_counts,
        require_email_verification=_get_event_email_verification_required(event),
        excluded_attendee_ids=excluded_attendee_ids,
    )

    draw_time = datetime.now(timezone.utc)
    for attendee in selected_winners:
        raffle.winners.append(
            EventRaffleWinner(attendee_id=attendee.id, drawn_at=draw_time)
        )

    raffle.status = "drawn"
    raffle.drawn_at = draw_time
    await write_audit_log(
        db,
        user_id=me.id,
        action="raffle.redraw",
        resource_type="raffle",
        resource_id=str(raffle.id),
        extra={
            "event_id": event_id,
            "title": raffle.title,
            "selected_count": len(selected_winners),
            "winner_ids": [attendee.id for attendee in selected_winners],
            "excluded_count": len(excluded_attendee_ids),
        },
    )
    await db.commit()

    refreshed = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    attendees, attendaonce_counts = await _get_event_attendaonce_counts(event_id, db)
    return _raffle_to_out(
        refreshed,
        attendees,
        attendaonce_counts,
        require_email_verification=_get_event_email_verification_required(event),
    )


@router.get(
    "/api/admin/events/{event_id}/raffles/{raffle_id}/export",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def export_event_raffle(
    event_id: int,
    raffle_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "settings:write")
    raffle = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    attendees, attendaonce_counts = await _get_event_attendaonce_counts(event_id, db)
    raffle_out = _raffle_to_out(
        raffle,
        attendees,
        attendaonce_counts,
        require_email_verification=_get_event_email_verification_required(event),
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        "cekilis_id",
        "cekilis_basligi",
        "hediye",
        "min_oturum",
        "yedek_kazanan_sayisi",
        "tur_no",
        "kazanan_tipi",
        "kazanan_sirasi",
        "katilimci_id",
        "ad_soyad",
        "email",
        "katildigi_oturum_sayisi",
        "cekilis_zamani",
    ])
    chunk_size = max(1, raffle_out.winner_count + raffle_out.reserve_winner_count)
    for index, winner in enumerate(raffle_out.winners, start=1):
        round_index = ((index - 1) // chunk_size) + 1
        index_in_round = ((index - 1) % chunk_size) + 1
        winner_type = "asil" if index_in_round <= raffle_out.winner_count else "yedek"
        winner_order = index_in_round if winner_type == "asil" else index_in_round - raffle_out.winner_count
        writer.writerow([
            raffle_out.id,
            raffle_out.title,
            raffle_out.prize_name,
            raffle_out.min_sessions_required,
            raffle_out.reserve_winner_count,
            round_index,
            winner_type,
            winner_order,
            winner.attendee_id,
            winner.attendee_name,
            winner.attendee_email,
            winner.sessions_attended,
            winner.drawn_at.isoformat(),
        ])

    await write_audit_log(
        db,
        user_id=me.id,
        action="raffle.export",
        resource_type="raffle",
        resource_id=str(raffle.id),
        extra={
            "event_id": event_id,
            "title": raffle.title,
            "winner_rows": len(raffle_out.winners),
        },
    )
    await db.commit()

    filename = f"raffle_{raffle_out.id}_results.csv"
    return StreamingResponse(
        iter([buffer.getvalue().encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post(
    "/api/admin/events/{event_id}/raffles/{raffle_id}/reset",
    response_model=EventRaffleOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin)), Depends(require_paid_plan)],
)
async def reset_event_raffle(
    event_id: int,
    raffle_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "settings:write")
    raffle = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    await db.execute(delete(EventRaffleWinner).where(EventRaffleWinner.raffle_id == raffle.id))
    raffle.winners.clear()
    raffle.status = "draft"
    raffle.drawn_at = None
    await write_audit_log(
        db,
        user_id=me.id,
        action="raffle.reset",
        resource_type="raffle",
        resource_id=str(raffle.id),
        extra={
            "event_id": event_id,
            "title": raffle.title,
        },
    )
    await db.commit()

    refreshed = await _get_raffle_for_admin(event_id, raffle_id, me, db)
    attendees, attendaonce_counts = await _get_event_attendaonce_counts(event_id, db)
    return _raffle_to_out(
        refreshed,
        attendees,
        attendaonce_counts,
        require_email_verification=_get_event_email_verification_required(event),
    )
