"""
WP23 — Live engagement: in-session audience Q&A + live polls (own router).

Member-authenticated + rate-limited; complements the async quiz/survey tooling.
Phase A uses short-polling for "near real-time" (the client refetches every few
seconds) rather than a persistent SSE connection per attendee — safer on the shared
single-server deploy. An SSE moderator stream can be layered on later (Phase B).

Attendee (PublicMember, gated by live_engagement_enabled):
  GET  /api/events/{event_id}/live/questions          — visible/answered questions (+ upvotes, my_vote)
  POST /api/events/{event_id}/live/questions          — ask a question (rate-limited)
  POST /api/events/{event_id}/live/questions/{qid}/upvote  — toggle upvote (rate-limited)
  GET  /api/events/{event_id}/live/polls              — open/closed polls with live results
  POST /api/events/{event_id}/live/polls/{pid}/vote   — cast a vote (rate-limited, one per member)

Moderator / presenter (admin):
  GET    /api/admin/events/{event_id}/live/questions  — all questions incl. hidden
  POST   /api/admin/events/{event_id}/live/questions/{qid}/moderate  — answered | hidden | visible
  GET    /api/admin/events/{event_id}/live/polls      — all polls (any status) + results
  POST   /api/admin/events/{event_id}/live/polls      — create a poll
  POST   /api/admin/events/{event_id}/live/polls/{pid}/status  — open | closed | draft
  DELETE /api/admin/events/{event_id}/live/polls/{pid}
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from .event_features import is_live_engagement_enabled
from .schemas import (
    LivePollIn,
    LivePollOptionOut,
    LivePollOut,
    LivePollStatusIn,
    LivePollVoteIn,
    LiveQuestionIn,
    LiveQuestionModerateIn,
    LiveQuestionOut,
)
from .main import (
    CurrentPublicMember,
    CurrentUser,
    Event,
    LivePoll,
    LivePollVote,
    LiveQuestion,
    LiveQuestionVote,
    PublicMember,
    Role,
    get_current_public_member,
    get_current_user,
    get_db,
    limiter,
    require_role,
    _ensure_event_allowed_for_request_host,
    _get_event_for_admin,
    _get_event_visibility,
    _resolve_public_event,
)

router = APIRouter()


# ── helpers ─────────────────────────────────────────────────────────────────

async def _resolve_live_event(event_id: str, db: AsyncSession, request: Request) -> Event:
    event = await _resolve_public_event(db, event_id)
    if not event or _get_event_visibility(event) == "private":
        raise HTTPException(status_code=404, detail="Event not found")
    await _ensure_event_allowed_for_request_host(request, db, event)
    if not is_live_engagement_enabled(event):
        raise HTTPException(status_code=404, detail="Live engagement is not enabled for this event")
    return event


async def _upvote_counts(db: AsyncSession, question_ids: list[int]) -> dict[int, int]:
    if not question_ids:
        return {}
    rows = await db.execute(
        select(LiveQuestionVote.question_id, func.count()).where(LiveQuestionVote.question_id.in_(question_ids)).group_by(LiveQuestionVote.question_id)
    )
    return {int(qid): int(c) for qid, c in rows.all()}


async def _my_voted_question_ids(db: AsyncSession, question_ids: list[int], member_id: int) -> set[int]:
    if not question_ids:
        return set()
    rows = await db.execute(
        select(LiveQuestionVote.question_id).where(
            LiveQuestionVote.question_id.in_(question_ids),
            LiveQuestionVote.member_id == member_id,
        )
    )
    return {int(qid) for qid in rows.scalars().all()}


def _question_out(q: LiveQuestion, author_name: Optional[str], upvotes: int, my_vote: bool) -> LiveQuestionOut:
    return LiveQuestionOut(
        id=q.id,
        event_id=q.event_id,
        session_id=q.session_id,
        text=q.text,
        status=q.status,
        author_name=author_name,
        upvotes=upvotes,
        my_vote=my_vote,
        created_at=q.created_at,
    )


async def _build_questions(db: AsyncSession, questions: list[LiveQuestion], member_id: Optional[int]) -> list[LiveQuestionOut]:
    ids = [q.id for q in questions]
    counts = await _upvote_counts(db, ids)
    mine = await _my_voted_question_ids(db, ids, member_id) if member_id else set()
    author_ids = {q.member_id for q in questions}
    authors: dict[int, str] = {}
    if author_ids:
        rows = await db.execute(select(PublicMember.id, PublicMember.display_name).where(PublicMember.id.in_(author_ids)))
        authors = {int(i): n for i, n in rows.all()}
    out = [
        _question_out(q, authors.get(q.member_id), counts.get(q.id, 0), q.id in mine)
        for q in questions
    ]
    # Sort by upvotes desc, then oldest first (stable discussion order).
    out.sort(key=lambda x: (-x.upvotes, x.created_at))
    return out


async def _poll_results(db: AsyncSession, poll: LivePoll, member_id: Optional[int]) -> LivePollOut:
    rows = await db.execute(
        select(LivePollVote.option_id, func.count()).where(LivePollVote.poll_id == poll.id).group_by(LivePollVote.option_id)
    )
    counts = {str(oid): int(c) for oid, c in rows.all()}
    options = poll.options if isinstance(poll.options, list) else []
    opt_out = [LivePollOptionOut(id=str(o.get("id")), label=str(o.get("label")), votes=counts.get(str(o.get("id")), 0)) for o in options if isinstance(o, dict)]
    total = sum(o.votes for o in opt_out)
    my_vote = None
    if member_id:
        mv = (await db.execute(select(LivePollVote.option_id).where(LivePollVote.poll_id == poll.id, LivePollVote.member_id == member_id))).scalar_one_or_none()
        my_vote = str(mv) if mv is not None else None
    return LivePollOut(
        id=poll.id, event_id=poll.event_id, session_id=poll.session_id, prompt=poll.prompt,
        status=poll.status, options=opt_out, total_votes=total, my_vote=my_vote, created_at=poll.created_at,
    )


# ── attendee: Q&A ─────────────────────────────────────────────────────────────

@router.get("/api/events/{event_id}/live/questions", response_model=list[LiveQuestionOut])
async def list_live_questions(
    event_id: str,
    request: Request,
    session_id: Optional[int] = Query(default=None),
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_live_event(event_id, db, request)
    stmt = select(LiveQuestion).where(LiveQuestion.event_id == event.id, LiveQuestion.status != "hidden")
    if session_id is not None:
        stmt = stmt.where(LiveQuestion.session_id == session_id)
    questions = (await db.execute(stmt)).scalars().all()
    return await _build_questions(db, list(questions), member.id)


@router.post("/api/events/{event_id}/live/questions", response_model=LiveQuestionOut, status_code=201)
@limiter.limit("20/minute")
async def ask_live_question(
    event_id: str,
    payload: LiveQuestionIn,
    request: Request,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_live_event(event_id, db, request)
    q = LiveQuestion(
        event_id=event.id,
        session_id=payload.session_id,
        member_id=member.id,
        text=payload.text.strip(),
        status="visible",
    )
    db.add(q)
    await db.commit()
    await db.refresh(q)
    return _question_out(q, member.display_name, 0, False)


@router.post("/api/events/{event_id}/live/questions/{qid}/upvote", response_model=LiveQuestionOut)
@limiter.limit("60/minute")
async def toggle_upvote(
    event_id: str,
    qid: int,
    request: Request,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_live_event(event_id, db, request)
    q = (await db.execute(select(LiveQuestion).where(LiveQuestion.id == qid, LiveQuestion.event_id == event.id))).scalar_one_or_none()
    if not q or q.status == "hidden":
        raise HTTPException(status_code=404, detail="Question not found")
    existing = (await db.execute(select(LiveQuestionVote).where(LiveQuestionVote.question_id == qid, LiveQuestionVote.member_id == member.id))).scalar_one_or_none()
    if existing:
        await db.delete(existing)
    else:
        db.add(LiveQuestionVote(question_id=qid, member_id=member.id))
    await db.commit()
    count = (await _upvote_counts(db, [qid])).get(qid, 0)
    author = (await db.execute(select(PublicMember.display_name).where(PublicMember.id == q.member_id))).scalar_one_or_none()
    return _question_out(q, author, count, existing is None)


# ── attendee: polls ───────────────────────────────────────────────────────────

@router.get("/api/events/{event_id}/live/polls", response_model=list[LivePollOut])
async def list_live_polls(
    event_id: str,
    request: Request,
    session_id: Optional[int] = Query(default=None),
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_live_event(event_id, db, request)
    stmt = select(LivePoll).where(LivePoll.event_id == event.id, LivePoll.status != "draft")
    if session_id is not None:
        stmt = stmt.where(LivePoll.session_id == session_id)
    stmt = stmt.order_by(LivePoll.created_at.desc())
    polls = (await db.execute(stmt)).scalars().all()
    return [await _poll_results(db, p, member.id) for p in polls]


@router.post("/api/events/{event_id}/live/polls/{pid}/vote", response_model=LivePollOut)
@limiter.limit("30/minute")
async def vote_live_poll(
    event_id: str,
    pid: int,
    payload: LivePollVoteIn,
    request: Request,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_live_event(event_id, db, request)
    poll = (await db.execute(select(LivePoll).where(LivePoll.id == pid, LivePoll.event_id == event.id))).scalar_one_or_none()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    if poll.status != "open":
        raise HTTPException(status_code=403, detail="This poll is not open for voting.")
    valid_ids = {str(o.get("id")) for o in (poll.options or []) if isinstance(o, dict)}
    if payload.option_id not in valid_ids:
        raise HTTPException(status_code=422, detail="Invalid option.")
    existing = (await db.execute(select(LivePollVote).where(LivePollVote.poll_id == pid, LivePollVote.member_id == member.id))).scalar_one_or_none()
    if existing:
        existing.option_id = payload.option_id  # allow changing vote while open
    else:
        db.add(LivePollVote(poll_id=pid, member_id=member.id, option_id=payload.option_id))
    await db.commit()
    return await _poll_results(db, poll, member.id)


# ── moderator / presenter (admin) ───────────────────────────────────────────

@router.get("/api/admin/events/{event_id}/live/questions", response_model=list[LiveQuestionOut],
            dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def moderator_list_questions(
    event_id: int,
    session_id: Optional[int] = Query(default=None),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "attendees:read")
    stmt = select(LiveQuestion).where(LiveQuestion.event_id == ev.id)
    if session_id is not None:
        stmt = stmt.where(LiveQuestion.session_id == session_id)
    questions = (await db.execute(stmt)).scalars().all()
    return await _build_questions(db, list(questions), None)


@router.post("/api/admin/events/{event_id}/live/questions/{qid}/moderate", response_model=LiveQuestionOut,
             dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def moderate_question(
    event_id: int,
    qid: int,
    payload: LiveQuestionModerateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "attendees:write")
    q = (await db.execute(select(LiveQuestion).where(LiveQuestion.id == qid, LiveQuestion.event_id == ev.id))).scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    q.status = payload.action
    q.answered_at = datetime.now(timezone.utc) if payload.action == "answered" else None
    await db.commit()
    count = (await _upvote_counts(db, [qid])).get(qid, 0)
    author = (await db.execute(select(PublicMember.display_name).where(PublicMember.id == q.member_id))).scalar_one_or_none()
    return _question_out(q, author, count, False)


@router.get("/api/admin/events/{event_id}/live/polls", response_model=list[LivePollOut],
            dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def moderator_list_polls(
    event_id: int,
    session_id: Optional[int] = Query(default=None),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "attendees:read")
    stmt = select(LivePoll).where(LivePoll.event_id == ev.id)
    if session_id is not None:
        stmt = stmt.where(LivePoll.session_id == session_id)
    stmt = stmt.order_by(LivePoll.created_at.desc())
    polls = (await db.execute(stmt)).scalars().all()
    return [await _poll_results(db, p, None) for p in polls]


@router.post("/api/admin/events/{event_id}/live/polls", response_model=LivePollOut, status_code=201,
             dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def create_poll(
    event_id: int,
    payload: LivePollIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "attendees:write")
    options = []
    for i, label in enumerate(payload.options):
        text = str(label).strip()
        if text:
            options.append({"id": f"o{i + 1}", "label": text[:200]})
    if len(options) < 2:
        raise HTTPException(status_code=422, detail="Provide at least two non-empty options.")
    poll = LivePoll(event_id=ev.id, session_id=payload.session_id, prompt=payload.prompt.strip(), options=options, status="open")
    db.add(poll)
    await db.commit()
    await db.refresh(poll)
    return await _poll_results(db, poll, None)


@router.post("/api/admin/events/{event_id}/live/polls/{pid}/status", response_model=LivePollOut,
             dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def set_poll_status(
    event_id: int,
    pid: int,
    payload: LivePollStatusIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "attendees:write")
    poll = (await db.execute(select(LivePoll).where(LivePoll.id == pid, LivePoll.event_id == ev.id))).scalar_one_or_none()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    poll.status = payload.status
    await db.commit()
    return await _poll_results(db, poll, None)


@router.delete("/api/admin/events/{event_id}/live/polls/{pid}",
               dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def delete_poll(
    event_id: int,
    pid: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "attendees:write")
    poll = (await db.execute(select(LivePoll).where(LivePoll.id == pid, LivePoll.event_id == ev.id))).scalar_one_or_none()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    await db.delete(poll)
    await db.commit()
    return {"ok": True}
