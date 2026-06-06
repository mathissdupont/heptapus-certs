"""Learning Path API — build multi-event learning journeys with progress tracking."""

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .main import (
    Certificate,
    CurrentPublicMember,
    CurrentUser,
    Event,
    Organization,
    Role,
    get_current_public_member,
    get_current_user,
    get_db,
    get_optional_public_member,
    require_role,
)
from .learning_path_models import (
    LearningPath,
    LearningPathEnrollment,
    LearningPathStep,
    LearningPathStepCompletion,
)
from .quiz_models import Quiz, QuizAttempt

logger = logging.getLogger("heptacert.learning_path")

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class LearningPathStepIn(BaseModel):
    event_id: int
    order: int = 0
    required: bool = True
    min_score_override: Optional[int] = Field(default=None, ge=0, le=100)


class LearningPathIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, max_length=3000)
    thumbnail_url: Optional[str] = Field(default=None, max_length=500)
    published: bool = False
    steps: list[LearningPathStepIn] = []


class LearningPathPatch(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, max_length=3000)
    thumbnail_url: Optional[str] = Field(default=None, max_length=500)
    published: Optional[bool] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_org_for_admin(me: CurrentUser, db: AsyncSession) -> Organization:
    res = await db.execute(select(Organization).where(Organization.user_id == me.id))
    org = res.scalar_one_or_none()
    if not org and me.role != Role.superadmin:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadı.")
    return org


async def _get_path(path_id: int, db: AsyncSession) -> LearningPath:
    res = await db.execute(
        select(LearningPath)
        .where(LearningPath.id == path_id)
        .options(
            selectinload(LearningPath.steps)
        )
    )
    path = res.scalar_one_or_none()
    if not path:
        raise HTTPException(status_code=404, detail="Öğrenme yolu bulunamadı.")
    return path


def _step_to_dict(step: LearningPathStep, event: Optional[Event] = None) -> dict[str, Any]:
    d: dict[str, Any] = {
        "id": step.id,
        "event_id": step.event_id,
        "order": step.order,
        "required": step.required,
        "min_score_override": step.min_score_override,
    }
    if event:
        d["event_name"] = event.name
        d["event_date"] = event.event_date.isoformat() if event.event_date else None
    return d


def _path_to_dict(path: LearningPath, steps_with_events: Optional[list] = None) -> dict[str, Any]:
    return {
        "id": path.id,
        "org_id": path.org_id,
        "name": path.name,
        "description": path.description,
        "thumbnail_url": path.thumbnail_url,
        "published": path.published,
        "step_count": len(path.steps),
        "created_at": path.created_at.isoformat() if path.created_at else None,
        "steps": steps_with_events or [_step_to_dict(s) for s in path.steps],
    }


async def _recalculate_progress(
    enrollment: LearningPathEnrollment,
    path: LearningPath,
    db: AsyncSession,
) -> None:
    """Recompute progress_pct and completed_at for an enrollment."""
    required_steps = [s for s in path.steps if s.required]
    if not required_steps:
        enrollment.progress_pct = 100
        enrollment.completed_at = datetime.now(timezone.utc)
        return

    completed_ids_res = await db.execute(
        select(LearningPathStepCompletion.step_id).where(
            LearningPathStepCompletion.enrollment_id == enrollment.id
        )
    )
    completed_step_ids = {row[0] for row in completed_ids_res.fetchall()}

    done = sum(1 for s in required_steps if s.id in completed_step_ids)
    pct = round(done / len(required_steps) * 100)
    enrollment.progress_pct = pct
    if pct >= 100:
        enrollment.completed_at = datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/api/admin/learning-paths",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_learning_path(
    payload: LearningPathIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_admin(me, db)

    path = LearningPath(
        org_id=org.id,
        name=payload.name,
        description=payload.description,
        thumbnail_url=payload.thumbnail_url,
        published=payload.published,
    )
    db.add(path)
    await db.flush()

    for s_in in payload.steps:
        db.add(
            LearningPathStep(
                path_id=path.id,
                event_id=s_in.event_id,
                order=s_in.order,
                required=s_in.required,
                min_score_override=s_in.min_score_override,
            )
        )

    await db.commit()
    path = await _get_path(path.id, db)
    return _path_to_dict(path)


@router.get(
    "/api/admin/learning-paths",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_learning_paths_admin(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_admin(me, db)
    res = await db.execute(
        select(LearningPath)
        .where(LearningPath.org_id == org.id)
        .options(selectinload(LearningPath.steps))
        .order_by(LearningPath.created_at.desc())
    )
    paths = res.scalars().all()
    return {"paths": [_path_to_dict(p) for p in paths]}


@router.get(
    "/api/admin/learning-paths/{path_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_learning_path_admin(
    path_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_admin(me, db)
    path = await _get_path(path_id, db)
    if path.org_id != org.id and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Erişim yetkiniz yok.")

    # Enrich steps with event names
    event_ids = [s.event_id for s in path.steps]
    events_map: dict[int, Event] = {}
    if event_ids:
        ev_res = await db.execute(select(Event).where(Event.id.in_(event_ids)))
        for ev in ev_res.scalars().all():
            events_map[ev.id] = ev

    steps = [_step_to_dict(s, events_map.get(s.event_id)) for s in path.steps]
    return _path_to_dict(path, steps_with_events=steps)


@router.patch(
    "/api/admin/learning-paths/{path_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def patch_learning_path(
    path_id: int,
    payload: LearningPathPatch,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_admin(me, db)
    path = await _get_path(path_id, db)
    if path.org_id != org.id and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Erişim yetkiniz yok.")

    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(path, field, val)

    await db.commit()
    return _path_to_dict(path)


@router.put(
    "/api/admin/learning-paths/{path_id}/steps",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def replace_learning_path_steps(
    path_id: int,
    steps: list[LearningPathStepIn],
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Replace all steps of a learning path (full reorder/update)."""
    org = await _get_org_for_admin(me, db)
    path = await _get_path(path_id, db)
    if path.org_id != org.id and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Erişim yetkiniz yok.")

    # Delete existing steps
    for s in path.steps:
        await db.delete(s)
    await db.flush()

    for s_in in steps:
        db.add(
            LearningPathStep(
                path_id=path.id,
                event_id=s_in.event_id,
                order=s_in.order,
                required=s_in.required,
                min_score_override=s_in.min_score_override,
            )
        )

    await db.commit()
    path = await _get_path(path_id, db)
    return _path_to_dict(path)


@router.delete(
    "/api/admin/learning-paths/{path_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_learning_path(
    path_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_admin(me, db)
    path = await _get_path(path_id, db)
    if path.org_id != org.id and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Erişim yetkiniz yok.")
    await db.delete(path)
    await db.commit()
    return {"ok": True}


@router.get(
    "/api/admin/learning-paths/{path_id}/enrollments",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_path_enrollments(
    path_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_admin(me, db)
    path = await _get_path(path_id, db)
    if path.org_id != org.id and me.role != Role.superadmin:
        raise HTTPException(status_code=403, detail="Erişim yetkiniz yok.")

    res = await db.execute(
        select(LearningPathEnrollment)
        .where(LearningPathEnrollment.path_id == path_id)
        .order_by(LearningPathEnrollment.enrolled_at.desc())
    )
    enrollments = res.scalars().all()
    total = len(enrollments)
    completed = sum(1 for e in enrollments if e.completed_at)
    return {
        "enrollments": [
            {
                "id": e.id,
                "member_id": e.member_id,
                "enrolled_at": e.enrolled_at.isoformat(),
                "completed_at": e.completed_at.isoformat() if e.completed_at else None,
                "progress_pct": e.progress_pct,
            }
            for e in enrollments
        ],
        "summary": {
            "total": total,
            "completed": completed,
            "completion_rate": round(completed / total * 100) if total else 0,
        },
    }


# ---------------------------------------------------------------------------
# Public / member endpoints
# ---------------------------------------------------------------------------


@router.get("/api/public/learning-paths")
async def list_learning_paths_public(
    org_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    member: Optional[CurrentPublicMember] = Depends(get_optional_public_member),
):
    """List published learning paths. Optionally filter by org."""
    q = select(LearningPath).where(LearningPath.published == True)
    if org_id:
        q = q.where(LearningPath.org_id == org_id)
    q = q.options(selectinload(LearningPath.steps)).order_by(LearningPath.created_at.desc())
    res = await db.execute(q)
    paths = res.scalars().all()

    result = []
    for path in paths:
        d = _path_to_dict(path)
        if member:
            enr_res = await db.execute(
                select(LearningPathEnrollment).where(
                    LearningPathEnrollment.path_id == path.id,
                    LearningPathEnrollment.member_id == member.id,
                )
            )
            enr = enr_res.scalar_one_or_none()
            d["my_enrollment"] = (
                {
                    "progress_pct": enr.progress_pct,
                    "completed_at": enr.completed_at.isoformat() if enr.completed_at else None,
                }
                if enr
                else None
            )
        result.append(d)
    return {"paths": result}


@router.post("/api/public/learning-paths/{path_id}/enroll")
async def enroll_in_path(
    path_id: int,
    db: AsyncSession = Depends(get_db),
    member: CurrentPublicMember = Depends(get_current_public_member),
):
    """Enroll the current member in a learning path."""
    path_res = await db.execute(
        select(LearningPath).where(LearningPath.id == path_id, LearningPath.published == True)
    )
    path = path_res.scalar_one_or_none()
    if not path:
        raise HTTPException(status_code=404, detail="Öğrenme yolu bulunamadı.")

    # Idempotent — return existing enrollment if already enrolled
    existing = await db.execute(
        select(LearningPathEnrollment).where(
            LearningPathEnrollment.path_id == path_id,
            LearningPathEnrollment.member_id == member.id,
        )
    )
    enr = existing.scalar_one_or_none()
    if enr:
        return {"enrollment_id": enr.id, "progress_pct": enr.progress_pct, "already_enrolled": True}

    enr = LearningPathEnrollment(path_id=path_id, member_id=member.id)
    db.add(enr)
    await db.commit()
    await db.refresh(enr)
    return {"enrollment_id": enr.id, "progress_pct": 0, "already_enrolled": False}


@router.get("/api/public/learning-paths/{path_id}/progress")
async def get_my_progress(
    path_id: int,
    db: AsyncSession = Depends(get_db),
    member: CurrentPublicMember = Depends(get_current_public_member),
):
    """Return detailed step-by-step progress for the logged-in member."""
    path_res = await db.execute(
        select(LearningPath)
        .where(LearningPath.id == path_id)
        .options(selectinload(LearningPath.steps))
    )
    path = path_res.scalar_one_or_none()
    if not path:
        raise HTTPException(status_code=404, detail="Öğrenme yolu bulunamadı.")

    enr_res = await db.execute(
        select(LearningPathEnrollment)
        .where(
            LearningPathEnrollment.path_id == path_id,
            LearningPathEnrollment.member_id == member.id,
        )
        .options(selectinload(LearningPathEnrollment.step_completions))
    )
    enr = enr_res.scalar_one_or_none()

    completed_step_ids: set[int] = set()
    if enr:
        completed_step_ids = {sc.step_id for sc in enr.step_completions}

    # Fetch event info
    event_ids = [s.event_id for s in path.steps]
    events_map: dict[int, Event] = {}
    if event_ids:
        ev_res = await db.execute(select(Event).where(Event.id.in_(event_ids)))
        for ev in ev_res.scalars().all():
            events_map[ev.id] = ev

    # Fetch quiz pass status for member
    quiz_passed_events: set[int] = set()
    if event_ids:
        quiz_res = await db.execute(
            select(Quiz.event_id).where(Quiz.event_id.in_(event_ids))
        )
        quiz_event_ids = [r[0] for r in quiz_res.fetchall()]
        if quiz_event_ids:
            passed_res = await db.execute(
                select(QuizAttempt.quiz_id).join(Quiz, Quiz.id == QuizAttempt.quiz_id).where(
                    QuizAttempt.member_id == member.id,
                    QuizAttempt.passed == True,
                    Quiz.event_id.in_(quiz_event_ids),
                )
            )
            # Map quiz_id → event_id
            qid_res = await db.execute(
                select(Quiz.id, Quiz.event_id).where(Quiz.event_id.in_(quiz_event_ids))
            )
            qid_to_eid = {row[0]: row[1] for row in qid_res.fetchall()}
            for row in passed_res.fetchall():
                if row[0] in qid_to_eid:
                    quiz_passed_events.add(qid_to_eid[row[0]])

    # Fetch certificates for member's events
    cert_events: set[int] = set()
    if event_ids:
        # Check by email since certificates are linked by student_name/email
        from .main import Attendee, CertStatus
        cert_res = await db.execute(
            select(Certificate.event_id).where(
                Certificate.event_id.in_(event_ids),
                Certificate.status == CertStatus.active,
            )
        )
        # We need to match by member email — get attendees for this member
        att_res = await db.execute(
            select(Attendee).where(
                Attendee.event_id.in_(event_ids),
                Attendee.public_member_id == member.id,
            )
        )
        member_attendee_events = {a.event_id for a in att_res.scalars().all()}
        # Check if certs exist for those events matching member name
        if member_attendee_events:
            cert_match_res = await db.execute(
                select(Certificate.event_id).where(
                    Certificate.event_id.in_(member_attendee_events),
                    Certificate.status == CertStatus.active,
                )
            )
            cert_events = {r[0] for r in cert_match_res.fetchall()}

    # Determine which steps are "unlocked" (sequential — prev required step done)
    steps_detail = []
    prev_required_done = True
    for step in path.steps:
        ev = events_map.get(step.event_id)
        is_complete = step.id in completed_step_ids
        has_cert = step.event_id in cert_events
        has_quiz_pass = step.event_id in quiz_passed_events
        unlocked = prev_required_done

        steps_detail.append(
            {
                "step_id": step.id,
                "event_id": step.event_id,
                "event_name": ev.name if ev else f"Event #{step.event_id}",
                "event_date": ev.event_date.isoformat() if ev and ev.event_date else None,
                "order": step.order,
                "required": step.required,
                "unlocked": unlocked,
                "completed": is_complete,
                "has_certificate": has_cert,
                "has_quiz_pass": has_quiz_pass,
            }
        )
        if step.required and not is_complete:
            prev_required_done = False

    return {
        "path_id": path_id,
        "path_name": path.name,
        "enrolled": enr is not None,
        "enrollment_id": enr.id if enr else None,
        "progress_pct": enr.progress_pct if enr else 0,
        "completed_at": enr.completed_at.isoformat() if enr and enr.completed_at else None,
        "steps": steps_detail,
    }


@router.post("/api/public/learning-paths/{path_id}/steps/{step_id}/complete")
async def mark_step_complete(
    path_id: int,
    step_id: int,
    db: AsyncSession = Depends(get_db),
    member: CurrentPublicMember = Depends(get_current_public_member),
):
    """Mark a step as completed. Called after certificate is issued or event attended."""
    path_res = await db.execute(
        select(LearningPath)
        .where(LearningPath.id == path_id)
        .options(selectinload(LearningPath.steps))
    )
    path = path_res.scalar_one_or_none()
    if not path:
        raise HTTPException(status_code=404, detail="Öğrenme yolu bulunamadı.")

    step_res = await db.execute(
        select(LearningPathStep).where(
            LearningPathStep.id == step_id, LearningPathStep.path_id == path_id
        )
    )
    step = step_res.scalar_one_or_none()
    if not step:
        raise HTTPException(status_code=404, detail="Adım bulunamadı.")

    enr_res = await db.execute(
        select(LearningPathEnrollment)
        .where(
            LearningPathEnrollment.path_id == path_id,
            LearningPathEnrollment.member_id == member.id,
        )
        .options(selectinload(LearningPathEnrollment.step_completions))
    )
    enr = enr_res.scalar_one_or_none()
    if not enr:
        raise HTTPException(status_code=400, detail="Önce bu öğrenme yoluna kayıt olunuz.")

    # Idempotent
    already = any(sc.step_id == step_id for sc in enr.step_completions)
    if not already:
        db.add(LearningPathStepCompletion(enrollment_id=enr.id, step_id=step_id))
        await db.flush()
        # Reload path steps for progress calculation
        await db.refresh(path)
        await _recalculate_progress(enr, path, db)
        await db.commit()

    return {"ok": True, "progress_pct": enr.progress_pct, "completed": True}
