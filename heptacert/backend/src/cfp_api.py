"""
WP21 — Call-for-Papers (CFP) submission + multi-reviewer rubric review.

Kept in its own router to keep main.py lean. Two audiences:

Speakers (reuse the PublicMember portal identity — no new auth):
  GET   /api/public/events/{event_id}/cfp                     — CFP window + rubric labels + my submission count
  POST  /api/events/{event_id}/cfp/submissions                — submit an abstract (member, within window)
  GET   /api/events/{event_id}/cfp/my-submissions             — my submissions (+ status)
  PATCH /api/events/{event_id}/cfp/submissions/{sid}          — edit while still "submitted"
  POST  /api/events/{event_id}/cfp/submissions/{sid}/withdraw — withdraw (unless accepted)

Organizers / reviewers (org-scoped admin, via _get_event_for_admin):
  GET   /api/admin/events/{event_id}/cfp/config               — rubric + window
  PUT   /api/admin/events/{event_id}/cfp/config               — set rubric + window
  GET   /api/admin/events/{event_id}/cfp/reviewers            — assignable reviewers (owner + org team)
  GET   /api/admin/events/{event_id}/cfp/submissions          — review queue (+ reviews + average score)
  POST  /api/admin/events/{event_id}/cfp/submissions/{sid}/assign  — assign reviewers
  PUT   /api/admin/events/{event_id}/cfp/submissions/{sid}/review  — the caller submits their rubric score
  POST  /api/admin/events/{event_id}/cfp/submissions/{sid}/decide  — accept/reject (+ optional agenda session)

The rubric (criteria) + window live on Event.config.cfp (JSONB); per-reviewer scores
live on CfpReview.scores keyed by criterion id. Accepted talks can be materialised as
WP20 EventSessions.
"""

from __future__ import annotations

import uuid as _uuid
from datetime import date as _date, datetime, time as _time, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from .event_features import is_cfp_enabled
from .schemas import (
    CfpAssignIn,
    CfpConfigIn,
    CfpConfigOut,
    CfpCriterion,
    CfpDecisionIn,
    CfpPublicInfoOut,
    CfpReviewIn,
    CfpReviewOut,
    CfpReviewerOut,
    CfpSubmissionIn,
    CfpSubmissionOut,
)
from .main import (
    CfpReview,
    CfpSubmission,
    CurrentPublicMember,
    CurrentUser,
    Event,
    EventSession,
    Organization,
    Role,
    User,
    get_current_public_member,
    get_current_user,
    get_db,
    get_optional_public_member,
    require_role,
    _ensure_event_allowed_for_request_host,
    _get_event_for_admin,
    _get_event_visibility,
    _resolve_public_event,
)
from .organization_access_api import OrganizationMember

router = APIRouter()

_EDITABLE_STATUSES = {"submitted"}


# ── helpers ───────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _get_cfp_config(event: Event) -> dict:
    config = event.config if isinstance(event.config, dict) else {}
    raw = config.get("cfp") if isinstance(config.get("cfp"), dict) else {}
    criteria_raw = raw.get("criteria") if isinstance(raw.get("criteria"), list) else []
    criteria = []
    for c in criteria_raw:
        if not isinstance(c, dict):
            continue
        cid = str(c.get("id") or "").strip()
        label = str(c.get("label") or "").strip()
        if not cid or not label:
            continue
        try:
            cmax = int(c.get("max") or 5)
        except (TypeError, ValueError):
            cmax = 5
        criteria.append({"id": cid, "label": label, "max": max(1, min(cmax, 100))})
    return {
        "opens_at": raw.get("opens_at"),
        "closes_at": raw.get("closes_at"),
        "instructions": raw.get("instructions"),
        "max_per_member": raw.get("max_per_member"),
        "criteria": criteria,
    }


def _cfp_is_open(cfg: dict, now: Optional[datetime] = None) -> bool:
    now = now or _now()
    opens = _parse_iso(cfg.get("opens_at"))
    closes = _parse_iso(cfg.get("closes_at"))
    if opens and now < opens:
        return False
    if closes and now > closes:
        return False
    return True


def _compute_overall(scores: Optional[dict], criteria: list) -> Optional[float]:
    """Normalise per-criterion scores to a 0-100 overall (equal weight)."""
    if not scores or not criteria:
        return None
    ratios = []
    for c in criteria:
        cid = c.get("id")
        cmax = c.get("max") or 5
        if cid in scores and scores[cid] is not None:
            try:
                ratios.append(min(float(scores[cid]) / float(cmax), 1.0))
            except (TypeError, ValueError, ZeroDivisionError):
                continue
    if not ratios:
        return None
    return round(sum(ratios) / len(ratios) * 100, 2)


def _review_to_out(review: CfpReview, reviewer_email: Optional[str]) -> CfpReviewOut:
    return CfpReviewOut(
        id=review.id,
        submission_id=review.submission_id,
        reviewer_user_id=review.reviewer_user_id,
        reviewer_name=reviewer_email,
        scores={k: float(v) for k, v in (review.scores or {}).items() if v is not None},
        overall_score=float(review.overall_score) if review.overall_score is not None else None,
        comment=review.comment,
        status=review.status,
        updated_at=review.updated_at,
    )


def _submission_to_out(
    sub: CfpSubmission,
    *,
    reviews: Optional[list[CfpReviewOut]] = None,
) -> CfpSubmissionOut:
    submitted_scores = [r.overall_score for r in (reviews or []) if r.overall_score is not None]
    avg = round(sum(submitted_scores) / len(submitted_scores), 2) if submitted_scores else None
    return CfpSubmissionOut(
        id=sub.id,
        event_id=sub.event_id,
        member_id=sub.member_id,
        title=sub.title,
        abstract=sub.abstract,
        speaker_name=sub.speaker_name,
        speaker_bio=sub.speaker_bio,
        track=sub.track,
        status=sub.status,
        decision_note=sub.decision_note,
        decided_at=sub.decided_at,
        session_id=sub.session_id,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
        reviews=reviews or [],
        average_score=avg,
        review_count=len([r for r in (reviews or []) if r.status == "submitted"]),
    )


# ── speaker (PublicMember) endpoints ────────────────────────────────────────────

@router.get("/api/public/events/{event_id}/cfp", response_model=CfpPublicInfoOut)
async def get_cfp_public_info(
    event_id: str,
    request: Request,
    member: Optional[CurrentPublicMember] = Depends(get_optional_public_member),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_public_event(db, event_id)
    if not event or _get_event_visibility(event) == "private":
        raise HTTPException(status_code=404, detail="Event not found")
    await _ensure_event_allowed_for_request_host(request, db, event)
    if not is_cfp_enabled(event):
        return CfpPublicInfoOut(cfp_enabled=False)

    cfg = _get_cfp_config(event)
    my_count = 0
    if member is not None:
        count_res = await db.execute(
            select(func.count()).where(
                CfpSubmission.event_id == event.id,
                CfpSubmission.member_id == member.id,
                CfpSubmission.status != "withdrawn",
            )
        )
        my_count = int(count_res.scalar_one() or 0)

    return CfpPublicInfoOut(
        cfp_enabled=True,
        is_open=_cfp_is_open(cfg),
        opens_at=cfg.get("opens_at"),
        closes_at=cfg.get("closes_at"),
        instructions=cfg.get("instructions"),
        max_per_member=cfg.get("max_per_member"),
        criteria=[CfpCriterion(**c) for c in cfg.get("criteria", [])],
        my_submission_count=my_count,
    )


async def _resolve_cfp_event(event_id: str, db: AsyncSession, request: Request) -> Event:
    event = await _resolve_public_event(db, event_id)
    if not event or _get_event_visibility(event) == "private":
        raise HTTPException(status_code=404, detail="Event not found")
    await _ensure_event_allowed_for_request_host(request, db, event)
    if not is_cfp_enabled(event):
        raise HTTPException(status_code=404, detail="Call for Papers is not open for this event")
    return event


@router.post("/api/events/{event_id}/cfp/submissions", response_model=CfpSubmissionOut, status_code=201)
async def create_cfp_submission(
    event_id: str,
    payload: CfpSubmissionIn,
    request: Request,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_cfp_event(event_id, db, request)
    cfg = _get_cfp_config(event)
    if not _cfp_is_open(cfg):
        raise HTTPException(status_code=403, detail="The submission window is closed.")

    max_per = cfg.get("max_per_member")
    if max_per:
        count_res = await db.execute(
            select(func.count()).where(
                CfpSubmission.event_id == event.id,
                CfpSubmission.member_id == member.id,
                CfpSubmission.status != "withdrawn",
            )
        )
        if int(count_res.scalar_one() or 0) >= int(max_per):
            raise HTTPException(status_code=403, detail="You have reached the submission limit for this event.")

    sub = CfpSubmission(
        event_id=event.id,
        member_id=member.id,
        title=payload.title.strip(),
        abstract=payload.abstract.strip(),
        speaker_name=payload.speaker_name.strip(),
        speaker_bio=(payload.speaker_bio or "").strip() or None,
        track=(payload.track or "").strip() or None,
        status="submitted",
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return _submission_to_out(sub)


@router.get("/api/events/{event_id}/cfp/my-submissions", response_model=list[CfpSubmissionOut])
async def list_my_cfp_submissions(
    event_id: str,
    request: Request,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_cfp_event(event_id, db, request)
    res = await db.execute(
        select(CfpSubmission)
        .where(CfpSubmission.event_id == event.id, CfpSubmission.member_id == member.id)
        .order_by(CfpSubmission.created_at.desc())
    )
    # Speaker view: never expose reviewer scores/comments.
    return [_submission_to_out(sub) for sub in res.scalars().all()]


async def _get_own_submission(event: Event, sid: int, member: CurrentPublicMember, db: AsyncSession) -> CfpSubmission:
    res = await db.execute(
        select(CfpSubmission).where(
            CfpSubmission.id == sid,
            CfpSubmission.event_id == event.id,
            CfpSubmission.member_id == member.id,
        )
    )
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return sub


@router.patch("/api/events/{event_id}/cfp/submissions/{sid}", response_model=CfpSubmissionOut)
async def update_cfp_submission(
    event_id: str,
    sid: int,
    payload: CfpSubmissionIn,
    request: Request,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_cfp_event(event_id, db, request)
    sub = await _get_own_submission(event, sid, member, db)
    if sub.status not in _EDITABLE_STATUSES:
        raise HTTPException(status_code=403, detail="This submission can no longer be edited.")
    if not _cfp_is_open(_get_cfp_config(event)):
        raise HTTPException(status_code=403, detail="The submission window is closed.")
    sub.title = payload.title.strip()
    sub.abstract = payload.abstract.strip()
    sub.speaker_name = payload.speaker_name.strip()
    sub.speaker_bio = (payload.speaker_bio or "").strip() or None
    sub.track = (payload.track or "").strip() or None
    await db.commit()
    await db.refresh(sub)
    return _submission_to_out(sub)


@router.post("/api/events/{event_id}/cfp/submissions/{sid}/withdraw", response_model=CfpSubmissionOut)
async def withdraw_cfp_submission(
    event_id: str,
    sid: int,
    request: Request,
    member: CurrentPublicMember = Depends(get_current_public_member),
    db: AsyncSession = Depends(get_db),
):
    event = await _resolve_cfp_event(event_id, db, request)
    sub = await _get_own_submission(event, sid, member, db)
    if sub.status == "accepted":
        raise HTTPException(status_code=403, detail="An accepted submission cannot be withdrawn; contact the organizer.")
    sub.status = "withdrawn"
    await db.commit()
    await db.refresh(sub)
    return _submission_to_out(sub)


# ── organizer / reviewer endpoints ──────────────────────────────────────────────

@router.get("/api/admin/events/{event_id}/cfp/config", response_model=CfpConfigOut,
            dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def get_cfp_config(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "attendees:read")
    cfg = _get_cfp_config(ev)
    return CfpConfigOut(
        opens_at=cfg.get("opens_at"),
        closes_at=cfg.get("closes_at"),
        instructions=cfg.get("instructions"),
        max_per_member=cfg.get("max_per_member"),
        criteria=[CfpCriterion(**c) for c in cfg.get("criteria", [])],
    )


@router.put("/api/admin/events/{event_id}/cfp/config", response_model=CfpConfigOut,
            dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def set_cfp_config(
    event_id: int,
    payload: CfpConfigIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "attendees:write")
    # Reject duplicate criterion ids up front.
    ids = [c.id for c in payload.criteria]
    if len(ids) != len(set(ids)):
        raise HTTPException(status_code=422, detail="Criterion ids must be unique.")
    config = dict(ev.config) if isinstance(ev.config, dict) else {}
    config["cfp"] = {
        "opens_at": payload.opens_at,
        "closes_at": payload.closes_at,
        "instructions": (payload.instructions or "").strip() or None,
        "max_per_member": payload.max_per_member,
        "criteria": [{"id": c.id, "label": c.label, "max": c.max} for c in payload.criteria],
    }
    ev.config = config
    # SQLAlchemy needs an explicit flag for in-place JSONB mutation.
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(ev, "config")
    await db.commit()
    await db.refresh(ev)
    cfg = _get_cfp_config(ev)
    return CfpConfigOut(
        opens_at=cfg.get("opens_at"),
        closes_at=cfg.get("closes_at"),
        instructions=cfg.get("instructions"),
        max_per_member=cfg.get("max_per_member"),
        criteria=[CfpCriterion(**c) for c in cfg.get("criteria", [])],
    )


@router.get("/api/admin/events/{event_id}/cfp/reviewers", response_model=list[CfpReviewerOut],
            dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def list_cfp_reviewers(
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "attendees:read")
    reviewers: dict[int, CfpReviewerOut] = {}

    owner_res = await db.execute(select(User).where(User.id == ev.admin_id))
    owner = owner_res.scalar_one_or_none()
    if owner:
        reviewers[owner.id] = CfpReviewerOut(user_id=owner.id, name=owner.email, email=owner.email)

    org_res = await db.execute(select(Organization).where(Organization.user_id == ev.admin_id))
    org = org_res.scalar_one_or_none()
    if org:
        rows = await db.execute(
            select(OrganizationMember, User)
            .join(User, User.id == OrganizationMember.user_id)
            .where(
                OrganizationMember.organization_id == org.id,
                OrganizationMember.user_id.is_not(None),
                OrganizationMember.status == "active",
            )
        )
        for _member, user in rows.all():
            reviewers[user.id] = CfpReviewerOut(user_id=user.id, name=user.email, email=user.email)

    return list(reviewers.values())


async def _load_submission_reviews(db: AsyncSession, submission_ids: list[int]) -> dict[int, list[CfpReviewOut]]:
    if not submission_ids:
        return {}
    rows = await db.execute(
        select(CfpReview, User.email)
        .outerjoin(User, User.id == CfpReview.reviewer_user_id)
        .where(CfpReview.submission_id.in_(submission_ids))
        .order_by(CfpReview.id)
    )
    grouped: dict[int, list[CfpReviewOut]] = {}
    for review, email in rows.all():
        grouped.setdefault(review.submission_id, []).append(_review_to_out(review, email))
    return grouped


@router.get("/api/admin/events/{event_id}/cfp/submissions", response_model=list[CfpSubmissionOut],
            dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def list_cfp_submissions_admin(
    event_id: int,
    status: Optional[str] = Query(default=None),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "attendees:read")
    stmt = select(CfpSubmission).where(CfpSubmission.event_id == ev.id)
    if status and status != "all":
        stmt = stmt.where(CfpSubmission.status == status)
    stmt = stmt.order_by(CfpSubmission.created_at.desc())
    subs = (await db.execute(stmt)).scalars().all()
    reviews_by_sub = await _load_submission_reviews(db, [s.id for s in subs])
    return [_submission_to_out(s, reviews=reviews_by_sub.get(s.id, [])) for s in subs]


async def _get_admin_submission(ev: Event, sid: int, db: AsyncSession) -> CfpSubmission:
    res = await db.execute(
        select(CfpSubmission).where(CfpSubmission.id == sid, CfpSubmission.event_id == ev.id)
    )
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return sub


@router.post("/api/admin/events/{event_id}/cfp/submissions/{sid}/assign", response_model=CfpSubmissionOut,
             dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def assign_cfp_reviewers(
    event_id: int,
    sid: int,
    payload: CfpAssignIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "attendees:write")
    sub = await _get_admin_submission(ev, sid, db)
    existing_res = await db.execute(
        select(CfpReview.reviewer_user_id).where(CfpReview.submission_id == sub.id)
    )
    existing = {int(r) for r in existing_res.scalars().all()}
    for reviewer_id in payload.reviewer_user_ids:
        if reviewer_id in existing:
            continue
        db.add(CfpReview(submission_id=sub.id, reviewer_user_id=reviewer_id, status="assigned"))
    if sub.status == "submitted":
        sub.status = "under_review"
    await db.commit()
    reviews_by_sub = await _load_submission_reviews(db, [sub.id])
    await db.refresh(sub)
    return _submission_to_out(sub, reviews=reviews_by_sub.get(sub.id, []))


@router.put("/api/admin/events/{event_id}/cfp/submissions/{sid}/review", response_model=CfpSubmissionOut,
            dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def submit_cfp_review(
    event_id: int,
    sid: int,
    payload: CfpReviewIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "attendees:write")
    sub = await _get_admin_submission(ev, sid, db)
    cfg = _get_cfp_config(ev)
    criteria = cfg.get("criteria", [])
    valid_ids = {c["id"] for c in criteria}
    # Keep only known criteria; clamp to each criterion's max.
    clean_scores: dict[str, float] = {}
    max_by_id = {c["id"]: c["max"] for c in criteria}
    for cid, val in (payload.scores or {}).items():
        if cid not in valid_ids or val is None:
            continue
        try:
            clean_scores[cid] = max(0.0, min(float(val), float(max_by_id[cid])))
        except (TypeError, ValueError):
            continue
    overall = _compute_overall(clean_scores, criteria)

    res = await db.execute(
        select(CfpReview).where(CfpReview.submission_id == sub.id, CfpReview.reviewer_user_id == me.id)
    )
    review = res.scalar_one_or_none()
    if review is None:
        review = CfpReview(submission_id=sub.id, reviewer_user_id=me.id)
        db.add(review)
    review.scores = clean_scores
    review.overall_score = overall
    review.comment = (payload.comment or "").strip() or None
    review.status = "submitted"
    if sub.status == "submitted":
        sub.status = "under_review"
    await db.commit()
    reviews_by_sub = await _load_submission_reviews(db, [sub.id])
    await db.refresh(sub)
    return _submission_to_out(sub, reviews=reviews_by_sub.get(sub.id, []))


def _parse_hhmm(value: Optional[str]) -> Optional[_time]:
    if not value:
        return None
    try:
        parts = str(value).split(":")
        return _time(int(parts[0]), int(parts[1]))
    except (ValueError, IndexError):
        return None


@router.post("/api/admin/events/{event_id}/cfp/submissions/{sid}/decide", response_model=CfpSubmissionOut,
             dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def decide_cfp_submission(
    event_id: int,
    sid: int,
    payload: CfpDecisionIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ev = await _get_event_for_admin(event_id, me, db, "attendees:write")
    sub = await _get_admin_submission(ev, sid, db)
    sub.status = payload.decision  # "accepted" | "rejected"
    sub.decision_note = (payload.note or "").strip() or None
    sub.decided_by = me.id
    sub.decided_at = _now()

    if payload.decision == "accepted" and payload.create_session and sub.session_id is None:
        session = EventSession(
            event_id=ev.id,
            name=sub.title[:200],
            session_date=_date.fromisoformat(payload.session_date) if payload.session_date else None,
            session_start=_parse_hhmm(payload.session_start),
            session_end=_parse_hhmm(payload.session_end),
            session_location=payload.session_location,
            track=sub.track,
            speaker_name=sub.speaker_name,
            description=sub.abstract,
            checkin_token=str(_uuid.uuid4()).replace("-", ""),
            is_active=False,
        )
        db.add(session)
        await db.flush()
        sub.session_id = session.id

    await db.commit()
    reviews_by_sub = await _load_submission_reviews(db, [sub.id])
    await db.refresh(sub)
    return _submission_to_out(sub, reviews=reviews_by_sub.get(sub.id, []))
