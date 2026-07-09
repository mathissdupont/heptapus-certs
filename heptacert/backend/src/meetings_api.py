"""
WP22 — Networking & 1:1 meeting scheduling (own router, keeps main.py lean).

Built on the PublicMember identity and the connection graph (ADR-0020): blocked
pairs can never reach each other (shared connections_api.members_blocked), and a
member controls their own discoverability. Meetings are event-scoped; the requester
proposes a time, the target accepts/declines. Availability-slot publishing and AI
matchmaking are deferred (Phase B / ADR-0020).

Member networking profile (global):
  GET  /api/public/members/me/networking            — my interests + discoverable flag
  PUT  /api/public/members/me/networking            — update interests + discoverable

Event-scoped (member-authenticated, gated by networking_meetings_enabled):
  GET  /api/events/{event_id}/networking/attendees  — discoverable directory (block-filtered)
  GET  /api/events/{event_id}/networking/requests   — my meetings (incoming + outgoing)
  POST /api/events/{event_id}/networking/requests    — request a 1:1 meeting
  POST /api/events/{event_id}/networking/requests/{rid}/respond  — accept/decline (target)
  POST /api/events/{event_id}/networking/requests/{rid}/cancel   — cancel (requester)
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from .event_features import is_networking_meetings_enabled
from .schemas import (
    MeetingRequestIn,
    MeetingRequestOut,
    MeetingRespondIn,
    NetworkingMemberOut,
    NetworkingProfileIn,
    NetworkingProfileOut,
)
from .main import (
    Attendee,
    CurrentPublicMember,
    Event,
    MeetingRequest,
    PublicMember,
    SystemConfig,
    get_current_public_member,
    get_db,
    _ensure_event_allowed_for_request_host,
    _get_event_visibility,
    _resolve_public_event,
)
from .connections_api import PublicMemberBlocklist, members_blocked, _privacy_key

router = APIRouter()


def _interests_of(member: PublicMember) -> list[str]:
    raw = getattr(member, "interests", None)
    if isinstance(raw, list):
        return [str(x) for x in raw if str(x).strip()]
    return []


async def _privacy_blob(db: AsyncSession, public_id: str) -> dict:
    row = (await db.execute(select(SystemConfig).where(SystemConfig.key == _privacy_key(public_id)))).scalar_one_or_none()
    return dict(row.value) if row and isinstance(row.value, dict) else {}


def _is_discoverable(blob: dict) -> bool:
    # Opt-out: members of a networking-enabled event are discoverable unless they
    # explicitly turn it off.
    return bool(blob.get("networking_discoverable", True))


async def _load_member(db: AsyncSession, member_id: int) -> PublicMember:
    m = (await db.execute(select(PublicMember).where(PublicMember.id == member_id))).scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    return m


def _member_out(m: PublicMember) -> NetworkingMemberOut:
    return NetworkingMemberOut(
        public_id=m.public_id,
        display_name=m.display_name,
        avatar_url=m.avatar_url,
        headline=m.headline,
        interests=_interests_of(m),
    )


# ── networking profile (global) ─────────────────────────────────────────────

@router.get("/api/public/members/me/networking", response_model=NetworkingProfileOut)
async def get_my_networking_profile(
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    m = await _load_member(db, member.id)
    blob = await _privacy_blob(db, member.public_id)
    return NetworkingProfileOut(interests=_interests_of(m), discoverable=_is_discoverable(blob))


@router.put("/api/public/members/me/networking", response_model=NetworkingProfileOut)
async def update_my_networking_profile(
    payload: NetworkingProfileIn,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    m = await _load_member(db, member.id)
    cleaned = []
    seen = set()
    for tag in payload.interests:
        t = str(tag).strip()[:40]
        key = t.lower()
        if t and key not in seen:
            seen.add(key)
            cleaned.append(t)
    m.interests = cleaned

    # Persist discoverable into the shared member_privacy SystemConfig blob,
    # preserving connections' hide_followers/hide_following keys.
    key = _privacy_key(member.public_id)
    row = (await db.execute(select(SystemConfig).where(SystemConfig.key == key))).scalar_one_or_none()
    blob = dict(row.value) if row and isinstance(row.value, dict) else {}
    blob["networking_discoverable"] = bool(payload.discoverable)
    if row:
        row.value = blob
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(row, "value")
    else:
        db.add(SystemConfig(key=key, value=blob))
    await db.commit()
    await db.refresh(m)
    return NetworkingProfileOut(interests=_interests_of(m), discoverable=bool(payload.discoverable))


# ── event helpers ─────────────────────────────────────────────────────────────

async def _resolve_networking_event(event_id: str, db: AsyncSession, request: Request) -> Event:
    event = await _resolve_public_event(db, event_id)
    if not event or _get_event_visibility(event) == "private":
        raise HTTPException(status_code=404, detail="Event not found")
    await _ensure_event_allowed_for_request_host(request, db, event)
    if not is_networking_meetings_enabled(event):
        raise HTTPException(status_code=404, detail="Networking is not enabled for this event")
    return event


async def _attending_member_ids(db: AsyncSession, event_db_id: int) -> set[int]:
    rows = await db.execute(
        select(Attendee.public_member_id).where(
            Attendee.event_id == event_db_id,
            Attendee.public_member_id.isnot(None),
        )
    )
    return {int(r) for r in rows.scalars().all() if r is not None}


# ── directory ───────────────────────────────────────────────────────────────

@router.get("/api/events/{event_id}/networking/attendees", response_model=list[NetworkingMemberOut])
async def list_networking_attendees(
    event_id: str,
    request: Request,
    tag: Optional[str] = Query(default=None, max_length=40),
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_networking_event(event_id, db, request)
    member_ids = await _attending_member_ids(db, event.id)
    member_ids.discard(member.id)  # never list myself
    if not member_ids:
        return []

    # Blocked (either direction) relative to me — one query.
    blocked_rows = await db.execute(
        select(PublicMemberBlocklist.blocker_id, PublicMemberBlocklist.blocked_id).where(
            or_(
                PublicMemberBlocklist.blocker_id == member.id,
                PublicMemberBlocklist.blocked_id == member.id,
            )
        )
    )
    blocked_ids: set[int] = set()
    for blocker, blocked in blocked_rows.all():
        blocked_ids.add(int(blocker) if int(blocker) != member.id else int(blocked))
    candidate_ids = [mid for mid in member_ids if mid not in blocked_ids]
    if not candidate_ids:
        return []

    members = (await db.execute(select(PublicMember).where(PublicMember.id.in_(candidate_ids), PublicMember.deleted_at.is_(None)))).scalars().all()

    # Discoverability from the member_privacy blobs — batch fetch.
    keys = [_privacy_key(m.public_id) for m in members]
    priv_rows = (await db.execute(select(SystemConfig).where(SystemConfig.key.in_(keys)))).scalars().all()
    priv_by_key = {r.key: (r.value if isinstance(r.value, dict) else {}) for r in priv_rows}

    tag_lc = (tag or "").strip().lower()
    out: list[NetworkingMemberOut] = []
    for m in members:
        if not _is_discoverable(priv_by_key.get(_privacy_key(m.public_id), {})):
            continue
        interests = _interests_of(m)
        if tag_lc and not any(tag_lc in i.lower() for i in interests):
            continue
        out.append(_member_out(m))
    out.sort(key=lambda x: x.display_name.lower())
    return out


# ── meeting requests ────────────────────────────────────────────────────────

def _to_out(mr: MeetingRequest, counterpart: PublicMember, is_incoming: bool) -> MeetingRequestOut:
    return MeetingRequestOut(
        id=mr.id,
        event_id=mr.event_id,
        status=mr.status,
        is_incoming=is_incoming,
        counterpart=_member_out(counterpart),
        proposed_start=mr.proposed_start.isoformat() if mr.proposed_start else None,
        duration_minutes=mr.duration_minutes,
        location=mr.location,
        message=mr.message,
        response_note=mr.response_note,
        created_at=mr.created_at,
    )


@router.post("/api/events/{event_id}/networking/requests", response_model=MeetingRequestOut, status_code=201)
async def create_meeting_request(
    event_id: str,
    payload: MeetingRequestIn,
    request: Request,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_networking_event(event_id, db, request)
    target = (await db.execute(select(PublicMember).where(PublicMember.public_id == payload.target_public_id, PublicMember.deleted_at.is_(None)))).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    if target.id == member.id:
        raise HTTPException(status_code=400, detail="You cannot request a meeting with yourself.")

    attending = await _attending_member_ids(db, event.id)
    if target.id not in attending:
        raise HTTPException(status_code=404, detail="That member is not attending this event.")
    if await members_blocked(db, member.id, target.id):
        raise HTTPException(status_code=403, detail="This member is not available.")
    if not _is_discoverable(await _privacy_blob(db, target.public_id)):
        raise HTTPException(status_code=403, detail="This member is not available for networking.")

    # Avoid duplicate live requests between the same pair for this event.
    existing = (await db.execute(
        select(MeetingRequest).where(
            MeetingRequest.event_id == event.id,
            MeetingRequest.status.in_(["pending", "accepted"]),
            or_(
                and_(MeetingRequest.requester_id == member.id, MeetingRequest.target_id == target.id),
                and_(MeetingRequest.requester_id == target.id, MeetingRequest.target_id == member.id),
            ),
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="A meeting request between you two already exists.")

    from datetime import datetime, timezone

    proposed = None
    if payload.proposed_start:
        try:
            proposed = datetime.fromisoformat(payload.proposed_start.replace("Z", "+00:00"))
            if proposed.tzinfo is None:
                proposed = proposed.replace(tzinfo=timezone.utc)
        except ValueError:
            proposed = None

    mr = MeetingRequest(
        event_id=event.id,
        requester_id=member.id,
        target_id=target.id,
        proposed_start=proposed,
        duration_minutes=payload.duration_minutes,
        location=(payload.location or "").strip() or None,
        message=(payload.message or "").strip() or None,
        status="pending",
    )
    db.add(mr)
    await db.commit()
    await db.refresh(mr)
    return _to_out(mr, target, is_incoming=False)


@router.get("/api/events/{event_id}/networking/requests", response_model=list[MeetingRequestOut])
async def list_my_meetings(
    event_id: str,
    request: Request,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_networking_event(event_id, db, request)
    rows = (await db.execute(
        select(MeetingRequest).where(
            MeetingRequest.event_id == event.id,
            or_(MeetingRequest.requester_id == member.id, MeetingRequest.target_id == member.id),
        ).order_by(MeetingRequest.created_at.desc())
    )).scalars().all()

    counterpart_ids = {(mr.target_id if mr.requester_id == member.id else mr.requester_id) for mr in rows}
    members = {}
    if counterpart_ids:
        for m in (await db.execute(select(PublicMember).where(PublicMember.id.in_(counterpart_ids)))).scalars().all():
            members[m.id] = m

    out = []
    for mr in rows:
        is_incoming = mr.target_id == member.id
        cid = mr.requester_id if is_incoming else mr.target_id
        cp = members.get(cid)
        if cp is None:
            continue
        out.append(_to_out(mr, cp, is_incoming))
    return out


async def _get_my_meeting(event_db_id: int, rid: int, member_id: int, db: AsyncSession) -> MeetingRequest:
    mr = (await db.execute(select(MeetingRequest).where(MeetingRequest.id == rid, MeetingRequest.event_id == event_db_id))).scalar_one_or_none()
    if not mr or (mr.requester_id != member_id and mr.target_id != member_id):
        raise HTTPException(status_code=404, detail="Meeting request not found")
    return mr


@router.post("/api/events/{event_id}/networking/requests/{rid}/respond", response_model=MeetingRequestOut)
async def respond_meeting_request(
    event_id: str,
    rid: int,
    payload: MeetingRespondIn,
    request: Request,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_networking_event(event_id, db, request)
    mr = await _get_my_meeting(event.id, rid, member.id, db)
    if mr.target_id != member.id:
        raise HTTPException(status_code=403, detail="Only the invited member can respond.")
    if mr.status != "pending":
        raise HTTPException(status_code=409, detail="This request has already been handled.")
    mr.status = payload.decision  # accepted | declined
    mr.response_note = (payload.note or "").strip() or None
    await db.commit()
    await db.refresh(mr)
    requester = await _load_member(db, mr.requester_id)
    return _to_out(mr, requester, is_incoming=True)


@router.post("/api/events/{event_id}/networking/requests/{rid}/cancel", response_model=MeetingRequestOut)
async def cancel_meeting_request(
    event_id: str,
    rid: int,
    request: Request,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_networking_event(event_id, db, request)
    mr = await _get_my_meeting(event.id, rid, member.id, db)
    if mr.status in ("declined", "cancelled"):
        raise HTTPException(status_code=409, detail="This request is already closed.")
    mr.status = "cancelled"
    await db.commit()
    await db.refresh(mr)
    counterpart_id = mr.target_id if mr.requester_id == member.id else mr.requester_id
    counterpart = await _load_member(db, counterpart_id)
    return _to_out(mr, counterpart, is_incoming=(mr.target_id == member.id))
