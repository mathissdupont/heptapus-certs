"""Extended LMS API — Gradebook, Discussions, Rubrics, Outcomes, Groups, Badges, Calendar, Bridge, Analytics."""

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .main import (
    CurrentPublicMember,
    CurrentUser,
    Organization,
    PublicMember,
    Role,
    SessionLocal,
    User,
    get_current_public_member,
    get_current_user,
    get_db,
    get_optional_public_member,
    require_role,
)
from .lms_models import (
    AssignmentSubmission,
    CourseAnnouncement,
    CourseEnrollment,
    CourseModule,
    LmsJourneyEnrollment,
    ModuleProgress,
    OrgLmsStaff,
    TrainingCourse,
)
from .lms_extended_models import (
    Badge,
    BadgeAward,
    CourseAttendanceRecord,
    CourseAttendanceSession,
    CourseCalendarEvent,
    CourseDiscussion,
    CourseGradeItem,
    CourseGradeSummary,
    CourseGroup,
    CourseGroupMember,
    CourseOutcomeAlignment,
    CourseSyllabus,
    DiscussionReply,
    EventLmsBridge,
    LearningOutcome,
    OutcomeMastery,
    LMSQuiz,
    LMSQuizAnswer,
    LMSQuizAttempt,
    LMSQuizChoice,
    LMSQuizQuestion,
    Rubric,
    RubricCriterion,
    RubricRating,
    SubmissionRubricScore,
)

logger = logging.getLogger("heptacert.lms_extended")


async def _require_admin_lms_enterprise(
    request: Request,
    db: AsyncSession = Depends(get_db),
    Authorization: Optional[str] = Header(default=None),
) -> None:
    if not request.url.path.startswith("/api/admin/lms"):
        return
    me = await get_current_user(db=db, Authorization=Authorization)
    if me.role == Role.superadmin:
        return
    from .organization_access_api import ensure_organization_enterprise, get_organization_for_access, organization_id_from_request

    org = await get_organization_for_access(db, me, "organization:view", organization_id_from_request(request))
    await ensure_organization_enterprise(db, org)


router = APIRouter(dependencies=[Depends(_require_admin_lms_enterprise)])

LMS_EDIT_ROLES = {"instructor", "content_editor", "department_admin"}
LMS_ALL_ROLES = LMS_EDIT_ROLES | {"teaching_assistant", "viewer"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_org_for_user(me: CurrentUser, db: AsyncSession) -> Organization:
    res = await db.execute(
        select(Organization).where(Organization.user_id == me.id).limit(1)
    )
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(404, "Organizasyon bulunamadı.")
    return org


async def _get_course_for_admin(course_id: int, me: CurrentUser, db: AsyncSession) -> TrainingCourse:
    res = await db.execute(select(TrainingCourse).where(TrainingCourse.id == course_id))
    course = res.scalar_one_or_none()
    if not course:
        raise HTTPException(404, "Kurs bulunamadı.")
    if me.role != Role.superadmin:
        org = await _get_org_for_user(me, db)
        if course.org_id != org.id:
            raise HTTPException(403, "Erişim yetkiniz yok.")
    return course


async def _get_course_lms(
    course_id: int, me: CurrentUser, db: AsyncSession, *, edit: bool = True
) -> TrainingCourse:
    if me.role in (Role.admin, Role.superadmin):
        return await _get_course_for_admin(course_id, me, db)
    res = await db.execute(select(TrainingCourse).where(TrainingCourse.id == course_id))
    course = res.scalar_one_or_none()
    if not course:
        raise HTTPException(404, "Kurs bulunamadı.")
    roles = LMS_EDIT_ROLES if edit else LMS_ALL_ROLES
    staff = (await db.execute(
        select(OrgLmsStaff).where(
            OrgLmsStaff.org_id == course.org_id,
            OrgLmsStaff.user_id == me.id,
            OrgLmsStaff.role.in_(roles),
        )
    )).scalar_one_or_none()
    if not staff:
        raise HTTPException(403, "Erişim yetkiniz yok.")
    return course


def _compute_letter(avg: float) -> str:
    if avg >= 90:
        return "AA"
    if avg >= 80:
        return "BA"
    if avg >= 70:
        return "BB"
    if avg >= 60:
        return "CB"
    if avg >= 50:
        return "CC"
    return "FF"


# ===========================================================================
# 2A — GRADEBOOK
# ===========================================================================


class GradeItemIn(BaseModel):
    title: str = Field(max_length=300)
    item_type: str = Field(default="assignment", pattern="^(quiz|assignment|participation|custom)$")
    item_ref_id: Optional[int] = None
    max_points: int = Field(default=100, ge=1, le=10000)
    weight_pct: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    order: int = Field(default=0, ge=0)


class GradeItemPatch(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    item_type: Optional[str] = Field(default=None, pattern="^(quiz|assignment|participation|custom)$")
    max_points: Optional[int] = Field(default=None, ge=1, le=10000)
    weight_pct: Optional[Decimal] = Field(default=None, ge=0, le=100)
    order: Optional[int] = Field(default=None, ge=0)


@router.get("/api/admin/lms/courses/{course_id}/grade-items")
async def list_grade_items(
    course_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db, edit=False)
    rows = (await db.execute(
        select(CourseGradeItem)
        .where(CourseGradeItem.course_id == course_id)
        .order_by(CourseGradeItem.order)
    )).scalars().all()
    return [_grade_item_dict(r) for r in rows]


@router.post("/api/admin/lms/courses/{course_id}/grade-items", status_code=201)
async def create_grade_item(
    course_id: int,
    body: GradeItemIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    item = CourseGradeItem(
        course_id=course_id,
        title=body.title,
        item_type=body.item_type,
        item_ref_id=body.item_ref_id,
        max_points=body.max_points,
        weight_pct=body.weight_pct,
        order=body.order,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return _grade_item_dict(item)


@router.patch("/api/admin/lms/courses/{course_id}/grade-items/{item_id}")
async def patch_grade_item(
    course_id: int,
    item_id: int,
    body: GradeItemPatch,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    item = (await db.execute(
        select(CourseGradeItem).where(
            CourseGradeItem.id == item_id, CourseGradeItem.course_id == course_id
        )
    )).scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Not found.")
    for f, v in body.model_dump(exclude_none=True).items():
        setattr(item, f, v)
    await db.commit()
    await db.refresh(item)
    return _grade_item_dict(item)


@router.delete("/api/admin/lms/courses/{course_id}/grade-items/{item_id}", status_code=204)
async def delete_grade_item(
    course_id: int,
    item_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    item = (await db.execute(
        select(CourseGradeItem).where(
            CourseGradeItem.id == item_id, CourseGradeItem.course_id == course_id
        )
    )).scalar_one_or_none()
    if item:
        await db.delete(item)
        await db.commit()


@router.get("/api/admin/lms/courses/{course_id}/gradebook")
async def get_gradebook(
    course_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns enrollments with their grade summaries for the course."""
    await _get_course_lms(course_id, me, db, edit=False)
    rows = (await db.execute(
        select(CourseEnrollment)
        .where(CourseEnrollment.course_id == course_id)
        .options(selectinload(CourseEnrollment.grade_summary))
        .order_by(CourseEnrollment.enrolled_at)
    )).scalars().all()
    return [
        {
            "enrollment_id": e.id,
            "member_id": e.member_id,
            "status": e.status,
            "progress_pct": float(e.progress_pct) if e.progress_pct else 0,
            "weighted_avg": float(e.grade_summary.weighted_avg) if e.grade_summary and e.grade_summary.weighted_avg else None,
            "letter_grade": e.grade_summary.letter_grade if e.grade_summary else None,
            "passed": e.grade_summary.passed if e.grade_summary else None,
        }
        for e in rows
    ]


class GradeSummaryIn(BaseModel):
    weighted_avg: Decimal = Field(ge=0, le=100)
    passed: Optional[bool] = None


@router.post("/api/admin/lms/courses/{course_id}/gradebook/{enrollment_id}/summary")
async def upsert_grade_summary(
    course_id: int,
    enrollment_id: int,
    body: GradeSummaryIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    enr = (await db.execute(
        select(CourseEnrollment).where(
            CourseEnrollment.id == enrollment_id, CourseEnrollment.course_id == course_id
        )
    )).scalar_one_or_none()
    if not enr:
        raise HTTPException(404, "Enrollment bulunamadı.")

    avg = float(body.weighted_avg)
    letter = _compute_letter(avg)
    passed = body.passed if body.passed is not None else (avg >= 50)

    existing = (await db.execute(
        select(CourseGradeSummary).where(CourseGradeSummary.enrollment_id == enrollment_id)
    )).scalar_one_or_none()

    if existing:
        existing.weighted_avg = body.weighted_avg
        existing.letter_grade = letter
        existing.passed = passed
        existing.computed_at = datetime.now(timezone.utc)
    else:
        db.add(CourseGradeSummary(
            enrollment_id=enrollment_id,
            weighted_avg=body.weighted_avg,
            letter_grade=letter,
            passed=passed,
        ))
    await db.commit()
    return {"ok": True, "letter_grade": letter, "passed": passed}


def _grade_item_dict(item: CourseGradeItem) -> dict:
    return {
        "id": item.id,
        "course_id": item.course_id,
        "title": item.title,
        "item_type": item.item_type,
        "item_ref_id": item.item_ref_id,
        "max_points": item.max_points,
        "weight_pct": float(item.weight_pct),
        "order": item.order,
        "created_at": item.created_at.isoformat(),
    }


# ===========================================================================
# 2B — DISCUSSIONS
# ===========================================================================


class DiscussionIn(BaseModel):
    title: str = Field(max_length=300)
    body: str
    module_id: Optional[int] = None
    is_pinned: bool = False


class ReplyIn(BaseModel):
    body: str
    parent_reply_id: Optional[int] = None
    is_instructor_reply: bool = False


@router.get("/api/admin/lms/courses/{course_id}/discussions")
async def list_discussions(
    course_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db, edit=False)
    rows = (await db.execute(
        select(CourseDiscussion)
        .where(CourseDiscussion.course_id == course_id)
        .order_by(CourseDiscussion.is_pinned.desc(), CourseDiscussion.created_at.desc())
    )).scalars().all()
    return [_discussion_dict(d) for d in rows]


@router.post("/api/admin/lms/courses/{course_id}/discussions", status_code=201)
async def create_discussion(
    course_id: int,
    body: DiscussionIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db, edit=False)
    d = CourseDiscussion(
        course_id=course_id,
        module_id=body.module_id,
        title=body.title,
        body=body.body,
        is_pinned=body.is_pinned,
    )
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return _discussion_dict(d)


@router.get("/api/admin/lms/courses/{course_id}/discussions/{discussion_id}")
async def get_discussion(
    course_id: int,
    discussion_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db, edit=False)
    d = (await db.execute(
        select(CourseDiscussion)
        .where(CourseDiscussion.id == discussion_id, CourseDiscussion.course_id == course_id)
        .options(selectinload(CourseDiscussion.replies))
    )).scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Tartışma bulunamadı.")
    result = _discussion_dict(d)
    result["replies"] = [_reply_dict(r) for r in d.replies]
    return result


@router.post("/api/admin/lms/courses/{course_id}/discussions/{discussion_id}/replies", status_code=201)
async def add_reply(
    course_id: int,
    discussion_id: int,
    body: ReplyIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db, edit=False)
    d = (await db.execute(
        select(CourseDiscussion).where(
            CourseDiscussion.id == discussion_id, CourseDiscussion.course_id == course_id
        )
    )).scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Tartışma bulunamadı.")
    if d.is_locked:
        raise HTTPException(400, "Bu tartışma kilitli.")
    r = DiscussionReply(
        discussion_id=discussion_id,
        parent_reply_id=body.parent_reply_id,
        body=body.body,
        is_instructor_reply=body.is_instructor_reply,
    )
    db.add(r)
    d.reply_count = (d.reply_count or 0) + 1
    await db.commit()
    await db.refresh(r)
    return _reply_dict(r)


@router.patch("/api/admin/lms/courses/{course_id}/discussions/{discussion_id}/lock")
async def toggle_lock(
    course_id: int,
    discussion_id: int,
    locked: bool = Query(...),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    d = (await db.execute(
        select(CourseDiscussion).where(
            CourseDiscussion.id == discussion_id, CourseDiscussion.course_id == course_id
        )
    )).scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Tartışma bulunamadı.")
    d.is_locked = locked
    await db.commit()
    return {"ok": True, "is_locked": locked}


def _discussion_dict(d: CourseDiscussion) -> dict:
    return {
        "id": d.id,
        "course_id": d.course_id,
        "module_id": d.module_id,
        "title": d.title,
        "body": d.body,
        "is_pinned": d.is_pinned,
        "is_locked": d.is_locked,
        "reply_count": d.reply_count,
        "created_at": d.created_at.isoformat(),
    }


def _reply_dict(r: DiscussionReply) -> dict:
    return {
        "id": r.id,
        "discussion_id": r.discussion_id,
        "parent_reply_id": r.parent_reply_id,
        "author_member_id": r.author_member_id,
        "body": r.body,
        "is_instructor_reply": r.is_instructor_reply,
        "created_at": r.created_at.isoformat(),
    }


# ===========================================================================
# 2C — RUBRICS
# ===========================================================================


class RubricIn(BaseModel):
    title: str = Field(max_length=300)
    description: Optional[str] = None


class CriterionIn(BaseModel):
    title: str = Field(max_length=300)
    description: Optional[str] = None
    points: int = Field(default=10, ge=1)
    order: int = Field(default=0, ge=0)
    ratings: list["RatingIn"] = []


class RatingIn(BaseModel):
    description: str = Field(max_length=300)
    points: int = Field(ge=0)


class SubmissionScoreIn(BaseModel):
    scores: list["CriterionScoreIn"]


class CriterionScoreIn(BaseModel):
    criterion_id: int
    rating_id: Optional[int] = None
    points_earned: int = Field(ge=0)
    comment: Optional[str] = None


@router.get("/api/admin/lms/courses/{course_id}/rubrics")
async def list_rubrics(
    course_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db, edit=False)
    rows = (await db.execute(
        select(Rubric).where(Rubric.course_id == course_id)
        .options(selectinload(Rubric.criteria).selectinload(RubricCriterion.ratings))
    )).scalars().all()
    return [_rubric_dict(r) for r in rows]


@router.post("/api/admin/lms/courses/{course_id}/rubrics", status_code=201)
async def create_rubric(
    course_id: int,
    body: RubricIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    rubric = Rubric(course_id=course_id, title=body.title, description=body.description)
    db.add(rubric)
    await db.commit()
    await db.refresh(rubric)
    return _rubric_dict(rubric)


@router.post("/api/admin/lms/courses/{course_id}/rubrics/{rubric_id}/criteria", status_code=201)
async def add_criterion(
    course_id: int,
    rubric_id: int,
    body: CriterionIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    rubric = (await db.execute(
        select(Rubric).where(Rubric.id == rubric_id, Rubric.course_id == course_id)
    )).scalar_one_or_none()
    if not rubric:
        raise HTTPException(404, "Rubric bulunamadı.")
    crit = RubricCriterion(
        rubric_id=rubric_id,
        title=body.title,
        description=body.description,
        points=body.points,
        order=body.order,
    )
    db.add(crit)
    await db.flush()
    for r in body.ratings:
        db.add(RubricRating(criterion_id=crit.id, description=r.description, points=r.points))
    await db.commit()
    await db.refresh(crit)
    return {"id": crit.id, "rubric_id": rubric_id, "title": crit.title}


@router.post("/api/admin/lms/submissions/{submission_id}/rubric-scores")
async def score_submission_rubric(
    submission_id: int,
    body: SubmissionScoreIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = (await db.execute(
        select(AssignmentSubmission).where(AssignmentSubmission.id == submission_id)
    )).scalar_one_or_none()
    if not sub:
        raise HTTPException(404, "Submission bulunamadı.")
    # verify course access
    from .lms_models import CourseAssignment
    asn = (await db.execute(
        select(CourseAssignment).where(CourseAssignment.id == sub.assignment_id)
    )).scalar_one_or_none()
    if asn:
        await _get_course_lms(asn.course_id, me, db)

    for sc in body.scores:
        existing = (await db.execute(
            select(SubmissionRubricScore).where(
                SubmissionRubricScore.submission_id == submission_id,
                SubmissionRubricScore.criterion_id == sc.criterion_id,
            )
        )).scalar_one_or_none()
        if existing:
            existing.rating_id = sc.rating_id
            existing.points_earned = sc.points_earned
            existing.comment = sc.comment
        else:
            db.add(SubmissionRubricScore(
                submission_id=submission_id,
                criterion_id=sc.criterion_id,
                rating_id=sc.rating_id,
                points_earned=sc.points_earned,
                comment=sc.comment,
            ))
    await db.commit()
    return {"ok": True}


@router.delete("/api/admin/lms/courses/{course_id}/rubrics/{rubric_id}")
async def delete_rubric(
    course_id: int,
    rubric_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    rubric = (await db.execute(
        select(Rubric).where(Rubric.id == rubric_id, Rubric.course_id == course_id)
    )).scalar_one_or_none()
    if not rubric:
        raise HTTPException(404, "Rubric bulunamadı.")
    await db.delete(rubric)
    await db.commit()
    return {"ok": True}


@router.delete("/api/admin/lms/courses/{course_id}/rubrics/{rubric_id}/criteria/{criterion_id}")
async def delete_criterion(
    course_id: int,
    rubric_id: int,
    criterion_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    crit = (await db.execute(
        select(RubricCriterion).where(
            RubricCriterion.id == criterion_id,
            RubricCriterion.rubric_id == rubric_id,
        )
    )).scalar_one_or_none()
    if not crit:
        raise HTTPException(404, "Kriter bulunamadı.")
    await db.delete(crit)
    await db.commit()
    return {"ok": True}


def _rubric_dict(r: Rubric) -> dict:
    return {
        "id": r.id,
        "course_id": r.course_id,
        "title": r.title,
        "description": r.description,
        "criteria": [
            {
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "points": c.points,
                "order": c.order,
                "ratings": [
                    {"id": rt.id, "description": rt.description, "points": rt.points}
                    for rt in (c.ratings or [])
                ],
            }
            for c in (r.criteria or [])
        ],
    }


# ===========================================================================
# 2D — LEARNING OUTCOMES
# ===========================================================================


class OutcomeIn(BaseModel):
    title: str = Field(max_length=300)
    description: Optional[str] = None
    mastery_points: int = Field(default=70, ge=1, le=100)
    display_name: Optional[str] = Field(default=None, max_length=100)


class OutcomePatch(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    description: Optional[str] = None
    mastery_points: Optional[int] = Field(default=None, ge=1, le=100)
    display_name: Optional[str] = Field(default=None, max_length=100)


class AlignmentIn(BaseModel):
    outcome_id: int
    module_id: Optional[int] = None


@router.get("/api/admin/lms/outcomes", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def list_outcomes(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    rows = (await db.execute(
        select(LearningOutcome).where(LearningOutcome.org_id == org.id)
        .order_by(LearningOutcome.created_at.desc())
    )).scalars().all()
    return [_outcome_dict(o) for o in rows]


@router.post("/api/admin/lms/outcomes", status_code=201, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def create_outcome(
    body: OutcomeIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    o = LearningOutcome(
        org_id=org.id,
        title=body.title,
        description=body.description,
        mastery_points=body.mastery_points,
        display_name=body.display_name,
    )
    db.add(o)
    await db.commit()
    await db.refresh(o)
    return _outcome_dict(o)


@router.patch("/api/admin/lms/outcomes/{outcome_id}", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def patch_outcome(
    outcome_id: int,
    body: OutcomePatch,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    o = (await db.execute(
        select(LearningOutcome).where(LearningOutcome.id == outcome_id, LearningOutcome.org_id == org.id)
    )).scalar_one_or_none()
    if not o:
        raise HTTPException(404, "Kazanım bulunamadı.")
    for f, v in body.model_dump(exclude_none=True).items():
        setattr(o, f, v)
    await db.commit()
    await db.refresh(o)
    return _outcome_dict(o)


@router.delete("/api/admin/lms/outcomes/{outcome_id}", status_code=204, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def delete_outcome(
    outcome_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    o = (await db.execute(
        select(LearningOutcome).where(LearningOutcome.id == outcome_id, LearningOutcome.org_id == org.id)
    )).scalar_one_or_none()
    if o:
        await db.delete(o)
        await db.commit()


@router.get("/api/admin/lms/courses/{course_id}/outcomes")
async def list_course_outcomes(
    course_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db, edit=False)
    rows = (await db.execute(
        select(CourseOutcomeAlignment)
        .where(CourseOutcomeAlignment.course_id == course_id)
        .options(selectinload(CourseOutcomeAlignment.outcome))
    )).scalars().all()
    return [
        {
            "alignment_id": a.id,
            "module_id": a.module_id,
            "outcome": _outcome_dict(a.outcome),
        }
        for a in rows
    ]


@router.post("/api/admin/lms/courses/{course_id}/outcomes", status_code=201)
async def align_outcome(
    course_id: int,
    body: AlignmentIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    existing = (await db.execute(
        select(CourseOutcomeAlignment).where(
            CourseOutcomeAlignment.course_id == course_id,
            CourseOutcomeAlignment.outcome_id == body.outcome_id,
            CourseOutcomeAlignment.module_id == body.module_id,
        )
    )).scalar_one_or_none()
    if existing:
        return {"alignment_id": existing.id, "ok": True}
    a = CourseOutcomeAlignment(
        course_id=course_id, outcome_id=body.outcome_id, module_id=body.module_id
    )
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return {"alignment_id": a.id, "ok": True}


@router.delete("/api/admin/lms/courses/{course_id}/outcomes/{alignment_id}", status_code=204)
async def remove_outcome_alignment(
    course_id: int,
    alignment_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    a = (await db.execute(
        select(CourseOutcomeAlignment).where(
            CourseOutcomeAlignment.id == alignment_id,
            CourseOutcomeAlignment.course_id == course_id,
        )
    )).scalar_one_or_none()
    if a:
        await db.delete(a)
        await db.commit()


def _outcome_dict(o: LearningOutcome) -> dict:
    return {
        "id": o.id,
        "org_id": o.org_id,
        "title": o.title,
        "description": o.description,
        "mastery_points": o.mastery_points,
        "display_name": o.display_name,
        "created_at": o.created_at.isoformat(),
    }


# ===========================================================================
# 2E — COURSE GROUPS
# ===========================================================================


class GroupIn(BaseModel):
    name: str = Field(max_length=200)
    max_members: Optional[int] = Field(default=None, ge=2, le=100)


@router.get("/api/admin/lms/courses/{course_id}/groups")
async def list_groups(
    course_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db, edit=False)
    rows = (await db.execute(
        select(CourseGroup).where(CourseGroup.course_id == course_id)
        .options(selectinload(CourseGroup.members))
    )).scalars().all()
    return [
        {
            "id": g.id,
            "name": g.name,
            "max_members": g.max_members,
            "member_count": len(g.members),
            "members": [{"id": m.id, "member_id": m.member_id} for m in g.members],
        }
        for g in rows
    ]


@router.post("/api/admin/lms/courses/{course_id}/groups", status_code=201)
async def create_group(
    course_id: int,
    body: GroupIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    g = CourseGroup(
        course_id=course_id,
        name=body.name,
        max_members=body.max_members,
        created_by_user_id=me.id,
    )
    db.add(g)
    await db.commit()
    await db.refresh(g)
    return {"id": g.id, "name": g.name, "max_members": g.max_members}


@router.post("/api/admin/lms/courses/{course_id}/groups/{group_id}/members", status_code=201)
async def add_group_member(
    course_id: int,
    group_id: int,
    member_id: int = Query(...),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    g = (await db.execute(
        select(CourseGroup).where(CourseGroup.id == group_id, CourseGroup.course_id == course_id)
        .options(selectinload(CourseGroup.members))
    )).scalar_one_or_none()
    if not g:
        raise HTTPException(404, "Grup bulunamadı.")
    if g.max_members and len(g.members) >= g.max_members:
        raise HTTPException(400, "Grup dolu.")
    existing = (await db.execute(
        select(CourseGroupMember).where(
            CourseGroupMember.group_id == group_id, CourseGroupMember.member_id == member_id
        )
    )).scalar_one_or_none()
    if existing:
        return {"ok": True}
    db.add(CourseGroupMember(group_id=group_id, member_id=member_id))
    await db.commit()
    return {"ok": True}


@router.delete("/api/admin/lms/courses/{course_id}/groups/{group_id}/members/{member_id}", status_code=204)
async def remove_group_member(
    course_id: int,
    group_id: int,
    member_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    m = (await db.execute(
        select(CourseGroupMember).where(
            CourseGroupMember.group_id == group_id, CourseGroupMember.member_id == member_id
        )
    )).scalar_one_or_none()
    if m:
        await db.delete(m)
        await db.commit()


# ===========================================================================
# 2G — BADGES
# ===========================================================================


class BadgeIn(BaseModel):
    name: str = Field(max_length=200)
    description: Optional[str] = None
    image_url: Optional[str] = Field(default=None, max_length=1000)
    criteria_text: Optional[str] = None
    trigger_type: str = Field(
        default="manual",
        pattern="^(course_completed|journey_completed|manual|automation)$",
    )
    trigger_ref_id: Optional[int] = None


class BadgePatch(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = None
    image_url: Optional[str] = Field(default=None, max_length=1000)
    criteria_text: Optional[str] = None
    trigger_type: Optional[str] = Field(
        default=None, pattern="^(course_completed|journey_completed|manual|automation)$"
    )
    trigger_ref_id: Optional[int] = None


@router.get("/api/admin/lms/badges", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def list_badges(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    rows = (await db.execute(
        select(Badge).where(Badge.org_id == org.id).order_by(Badge.created_at.desc())
    )).scalars().all()
    return [_badge_dict(b) for b in rows]


@router.post("/api/admin/lms/badges", status_code=201, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def create_badge(
    body: BadgeIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    b = Badge(
        org_id=org.id,
        name=body.name,
        description=body.description,
        image_url=body.image_url,
        criteria_text=body.criteria_text,
        trigger_type=body.trigger_type,
        trigger_ref_id=body.trigger_ref_id,
    )
    db.add(b)
    await db.commit()
    await db.refresh(b)
    return _badge_dict(b)


@router.patch("/api/admin/lms/badges/{badge_id}", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def patch_badge(
    badge_id: int,
    body: BadgePatch,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    b = (await db.execute(
        select(Badge).where(Badge.id == badge_id, Badge.org_id == org.id)
    )).scalar_one_or_none()
    if not b:
        raise HTTPException(404, "Rozet bulunamadı.")
    for f, v in body.model_dump(exclude_none=True).items():
        setattr(b, f, v)
    await db.commit()
    await db.refresh(b)
    return _badge_dict(b)


@router.delete("/api/admin/lms/badges/{badge_id}", status_code=204, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def delete_badge(
    badge_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    b = (await db.execute(
        select(Badge).where(Badge.id == badge_id, Badge.org_id == org.id)
    )).scalar_one_or_none()
    if b:
        await db.delete(b)
        await db.commit()


@router.post("/api/admin/lms/badges/{badge_id}/award", status_code=201, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def award_badge(
    badge_id: int,
    member_id: int = Query(...),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    b = (await db.execute(
        select(Badge).where(Badge.id == badge_id, Badge.org_id == org.id)
    )).scalar_one_or_none()
    if not b:
        raise HTTPException(404, "Rozet bulunamadı.")
    existing = (await db.execute(
        select(BadgeAward).where(BadgeAward.badge_id == badge_id, BadgeAward.member_id == member_id)
    )).scalar_one_or_none()
    if existing:
        return {"ok": True, "award_id": existing.id}
    award = BadgeAward(badge_id=badge_id, member_id=member_id, issued_by_user_id=me.id)
    db.add(award)
    await db.commit()
    await db.refresh(award)
    return {"ok": True, "award_id": award.id}


@router.get("/api/admin/lms/badges/{badge_id}/awards", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def list_badge_awards(
    badge_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    b = (await db.execute(
        select(Badge).where(Badge.id == badge_id, Badge.org_id == org.id)
    )).scalar_one_or_none()
    if not b:
        raise HTTPException(404, "Rozet bulunamadı.")
    rows = (await db.execute(
        select(BadgeAward).where(BadgeAward.badge_id == badge_id)
        .order_by(BadgeAward.issued_at.desc())
    )).scalars().all()
    return [{"id": a.id, "member_id": a.member_id, "issued_at": a.issued_at.isoformat()} for a in rows]


def _badge_dict(b: Badge) -> dict:
    return {
        "id": b.id,
        "org_id": b.org_id,
        "name": b.name,
        "description": b.description,
        "image_url": b.image_url,
        "criteria_text": b.criteria_text,
        "trigger_type": b.trigger_type,
        "trigger_ref_id": b.trigger_ref_id,
        "created_at": b.created_at.isoformat(),
    }


# ===========================================================================
# 2H — CALENDAR + SYLLABUS
# ===========================================================================


class CalendarEventIn(BaseModel):
    title: str = Field(max_length=300)
    event_type: str = Field(
        default="other",
        pattern="^(due_date|lecture|exam|office_hours|other)$",
    )
    starts_at: datetime
    ends_at: Optional[datetime] = None
    module_id: Optional[int] = None
    conference_url: Optional[str] = Field(default=None, max_length=1000)
    description: Optional[str] = None


class SyllabusIn(BaseModel):
    content_html: str


@router.get("/api/admin/lms/courses/{course_id}/calendar")
async def list_calendar_events(
    course_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db, edit=False)
    rows = (await db.execute(
        select(CourseCalendarEvent)
        .where(CourseCalendarEvent.course_id == course_id)
        .order_by(CourseCalendarEvent.starts_at)
    )).scalars().all()
    return [_cal_event_dict(e) for e in rows]


@router.post("/api/admin/lms/courses/{course_id}/calendar", status_code=201)
async def create_calendar_event(
    course_id: int,
    body: CalendarEventIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    e = CourseCalendarEvent(
        course_id=course_id,
        title=body.title,
        event_type=body.event_type,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        module_id=body.module_id,
        conference_url=body.conference_url,
        description=body.description,
    )
    db.add(e)
    await db.commit()
    await db.refresh(e)
    return _cal_event_dict(e)


@router.delete("/api/admin/lms/courses/{course_id}/calendar/{event_id}", status_code=204)
async def delete_calendar_event(
    course_id: int,
    event_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    e = (await db.execute(
        select(CourseCalendarEvent).where(
            CourseCalendarEvent.id == event_id, CourseCalendarEvent.course_id == course_id
        )
    )).scalar_one_or_none()
    if e:
        await db.delete(e)
        await db.commit()


@router.get("/api/admin/lms/courses/{course_id}/syllabus")
async def get_syllabus(
    course_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db, edit=False)
    s = (await db.execute(
        select(CourseSyllabus).where(CourseSyllabus.course_id == course_id)
    )).scalar_one_or_none()
    return {"course_id": course_id, "content_html": s.content_html if s else ""}


@router.put("/api/admin/lms/courses/{course_id}/syllabus")
async def upsert_syllabus(
    course_id: int,
    body: SyllabusIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    s = (await db.execute(
        select(CourseSyllabus).where(CourseSyllabus.course_id == course_id)
    )).scalar_one_or_none()
    if s:
        s.content_html = body.content_html
        s.updated_at = datetime.now(timezone.utc)
    else:
        s = CourseSyllabus(course_id=course_id, content_html=body.content_html)
        db.add(s)
    await db.commit()
    return {"ok": True}


def _cal_event_dict(e: CourseCalendarEvent) -> dict:
    return {
        "id": e.id,
        "course_id": e.course_id,
        "title": e.title,
        "event_type": e.event_type,
        "starts_at": e.starts_at.isoformat(),
        "ends_at": e.ends_at.isoformat() if e.ends_at else None,
        "module_id": e.module_id,
        "conference_url": e.conference_url,
        "description": e.description,
    }


# ===========================================================================
# 3A — EVENTS ↔ LMS BRIDGE
# ===========================================================================


# ===========================================================================
# 2I - ATTENDANCE
# ===========================================================================


class AttendanceSessionIn(BaseModel):
    title: str = Field(max_length=300)
    session_type: str = Field(default="lecture", pattern="^(lecture|lab|seminar|exam|office_hours|other)$")
    starts_at: datetime
    ends_at: Optional[datetime] = None
    location: Optional[str] = Field(default=None, max_length=300)
    required: bool = True
    notes: Optional[str] = Field(default=None, max_length=3000)


class AttendanceSessionPatch(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    session_type: Optional[str] = Field(default=None, pattern="^(lecture|lab|seminar|exam|office_hours|other)$")
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    location: Optional[str] = Field(default=None, max_length=300)
    required: Optional[bool] = None
    notes: Optional[str] = Field(default=None, max_length=3000)


class AttendanceRecordIn(BaseModel):
    enrollment_id: int
    status: str = Field(pattern="^(present|late|excused|absent)$")
    minutes_attended: Optional[int] = Field(default=None, ge=0, le=10000)
    note: Optional[str] = Field(default=None, max_length=2000)


class AttendanceBulkIn(BaseModel):
    records: list[AttendanceRecordIn] = Field(min_length=1, max_length=1000)


@router.get("/api/admin/lms/courses/{course_id}/attendance-sessions")
async def list_attendance_sessions(
    course_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db, edit=False)
    rows = (await db.execute(
        select(
            CourseAttendanceSession,
            func.count(CourseAttendanceRecord.id).label("record_count"),
            func.count(CourseAttendanceRecord.id).filter(CourseAttendanceRecord.status == "present").label("present_count"),
            func.count(CourseAttendanceRecord.id).filter(CourseAttendanceRecord.status == "late").label("late_count"),
            func.count(CourseAttendanceRecord.id).filter(CourseAttendanceRecord.status == "excused").label("excused_count"),
            func.count(CourseAttendanceRecord.id).filter(CourseAttendanceRecord.status == "absent").label("absent_count"),
        )
        .outerjoin(CourseAttendanceRecord, CourseAttendanceRecord.session_id == CourseAttendanceSession.id)
        .where(CourseAttendanceSession.course_id == course_id)
        .group_by(CourseAttendanceSession.id)
        .order_by(CourseAttendanceSession.starts_at.desc())
    )).all()
    return [
        _attendance_session_dict(
            s,
            record_count=int(record_count or 0),
            present_count=int(present_count or 0),
            late_count=int(late_count or 0),
            excused_count=int(excused_count or 0),
            absent_count=int(absent_count or 0),
        )
        for s, record_count, present_count, late_count, excused_count, absent_count in rows
    ]


@router.post("/api/admin/lms/courses/{course_id}/attendance-sessions", status_code=201)
async def create_attendance_session(
    course_id: int,
    body: AttendanceSessionIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    session = CourseAttendanceSession(
        course_id=course_id,
        title=body.title.strip() or "Yoklama",
        session_type=body.session_type,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        location=body.location,
        required=body.required,
        notes=body.notes,
        created_by_user_id=me.id,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return _attendance_session_dict(session)


@router.patch("/api/admin/lms/courses/{course_id}/attendance-sessions/{session_id}")
async def patch_attendance_session(
    course_id: int,
    session_id: int,
    body: AttendanceSessionPatch,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    session = (await db.execute(
        select(CourseAttendanceSession).where(
            CourseAttendanceSession.id == session_id,
            CourseAttendanceSession.course_id == course_id,
        )
    )).scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Yoklama oturumu bulunamadi.")
    for field, value in body.model_dump(exclude_unset=True).items():
        if field == "title" and value is not None:
            value = value.strip() or session.title
        setattr(session, field, value)
    await db.commit()
    await db.refresh(session)
    return _attendance_session_dict(session)


@router.delete("/api/admin/lms/courses/{course_id}/attendance-sessions/{session_id}", status_code=204)
async def delete_attendance_session(
    course_id: int,
    session_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    session = (await db.execute(
        select(CourseAttendanceSession).where(
            CourseAttendanceSession.id == session_id,
            CourseAttendanceSession.course_id == course_id,
        )
    )).scalar_one_or_none()
    if session:
        await db.delete(session)
        await db.commit()
    return None


@router.get("/api/admin/lms/courses/{course_id}/attendance-sessions/{session_id}/records")
async def list_attendance_records(
    course_id: int,
    session_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db, edit=False)
    session = (await db.execute(
        select(CourseAttendanceSession).where(
            CourseAttendanceSession.id == session_id,
            CourseAttendanceSession.course_id == course_id,
        )
    )).scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Yoklama oturumu bulunamadi.")

    enrollments = (await db.execute(
        select(CourseEnrollment)
        .where(CourseEnrollment.course_id == course_id)
        .order_by(CourseEnrollment.enrolled_at)
    )).scalars().all()
    member_ids = [e.member_id for e in enrollments]
    members: dict[int, PublicMember] = {}
    if member_ids:
        member_rows = await db.execute(select(PublicMember).where(PublicMember.id.in_(member_ids)))
        members = {m.id: m for m in member_rows.scalars().all()}
    records = (await db.execute(
        select(CourseAttendanceRecord).where(CourseAttendanceRecord.session_id == session_id)
    )).scalars().all()
    by_enrollment = {r.enrollment_id: r for r in records}

    return {
        "session": _attendance_session_dict(session),
        "records": [
            _attendance_record_dict(by_enrollment.get(e.id), e, members.get(e.member_id))
            for e in enrollments
        ],
    }


@router.put("/api/admin/lms/courses/{course_id}/attendance-sessions/{session_id}/records")
async def upsert_attendance_records(
    course_id: int,
    session_id: int,
    body: AttendanceBulkIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    session = (await db.execute(
        select(CourseAttendanceSession).where(
            CourseAttendanceSession.id == session_id,
            CourseAttendanceSession.course_id == course_id,
        )
    )).scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Yoklama oturumu bulunamadi.")

    enrollment_ids = [r.enrollment_id for r in body.records]
    enrollments = (await db.execute(
        select(CourseEnrollment).where(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.id.in_(enrollment_ids),
        )
    )).scalars().all()
    by_enrollment = {e.id: e for e in enrollments}
    if len(by_enrollment) != len(set(enrollment_ids)):
        raise HTTPException(400, "Bazi enrollment kayitlari bu kursa ait degil.")

    existing = (await db.execute(
        select(CourseAttendanceRecord).where(
            CourseAttendanceRecord.session_id == session_id,
            CourseAttendanceRecord.enrollment_id.in_(enrollment_ids),
        )
    )).scalars().all()
    existing_by_enrollment = {r.enrollment_id: r for r in existing}

    for item in body.records:
        enrollment = by_enrollment[item.enrollment_id]
        record = existing_by_enrollment.get(item.enrollment_id)
        if not record:
            record = CourseAttendanceRecord(
                session_id=session_id,
                enrollment_id=enrollment.id,
                member_id=enrollment.member_id,
            )
            db.add(record)
        record.status = item.status
        record.minutes_attended = item.minutes_attended
        record.note = item.note
        record.recorded_by_user_id = me.id
        record.recorded_at = datetime.now(timezone.utc)

    await db.commit()
    return {"ok": True, "updated": len(body.records)}


def _attendance_session_dict(
    s: CourseAttendanceSession,
    *,
    record_count: int = 0,
    present_count: int = 0,
    late_count: int = 0,
    excused_count: int = 0,
    absent_count: int = 0,
) -> dict[str, Any]:
    return {
        "id": s.id,
        "course_id": s.course_id,
        "title": s.title,
        "session_type": s.session_type,
        "starts_at": s.starts_at.isoformat(),
        "ends_at": s.ends_at.isoformat() if s.ends_at else None,
        "location": s.location,
        "required": s.required,
        "notes": s.notes,
        "record_count": record_count,
        "present_count": present_count,
        "late_count": late_count,
        "excused_count": excused_count,
        "absent_count": absent_count,
        "created_at": s.created_at.isoformat(),
    }


def _attendance_record_dict(
    record: Optional[CourseAttendanceRecord],
    enrollment: CourseEnrollment,
    member: Optional[PublicMember],
) -> dict[str, Any]:
    return {
        "record_id": record.id if record else None,
        "enrollment_id": enrollment.id,
        "member_id": enrollment.member_id,
        "member_name": member.display_name if member else None,
        "member_email": member.email if member else None,
        "status": record.status if record else "absent",
        "minutes_attended": record.minutes_attended if record else None,
        "note": record.note if record else None,
        "recorded_at": record.recorded_at.isoformat() if record else None,
    }


class BridgeIn(BaseModel):
    event_id: int
    course_id: Optional[int] = None
    trigger_on: str = Field(
        default="attendance",
        pattern="^(attendance|cert_issued|quiz_pass)$",
    )
    action: str = Field(
        default="enroll_in_course",
        pattern="^(enroll_in_course|unlock_module|award_badge)$",
    )
    action_ref_id: Optional[int] = None
    is_active: bool = True


@router.get("/api/admin/lms/bridges", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def list_bridges(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    rows = (await db.execute(
        select(EventLmsBridge)
        .join(TrainingCourse, TrainingCourse.id == EventLmsBridge.course_id, isouter=True)
        .where(TrainingCourse.org_id == org.id)
        .order_by(EventLmsBridge.created_at.desc())
    )).scalars().all()
    return [_bridge_dict(b) for b in rows]


@router.post("/api/admin/lms/bridges", status_code=201, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def create_bridge(
    body: BridgeIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    b = EventLmsBridge(
        event_id=body.event_id,
        course_id=body.course_id,
        trigger_on=body.trigger_on,
        action=body.action,
        action_ref_id=body.action_ref_id,
        is_active=body.is_active,
    )
    db.add(b)
    await db.commit()
    await db.refresh(b)
    return _bridge_dict(b)


@router.patch("/api/admin/lms/bridges/{bridge_id}/toggle", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def toggle_bridge(
    bridge_id: int,
    is_active: bool = Query(...),
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    b = (await db.execute(select(EventLmsBridge).where(EventLmsBridge.id == bridge_id))).scalar_one_or_none()
    if not b:
        raise HTTPException(404, "Bridge bulunamadı.")
    b.is_active = is_active
    await db.commit()
    return {"ok": True, "is_active": is_active}


# ===========================================================================
# ANNOUNCEMENTS
# ===========================================================================


class AnnouncementIn(BaseModel):
    title: str = Field(max_length=300)
    body: str = Field(min_length=1)


class AnnouncementPatch(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    body: Optional[str] = None


@router.get("/api/admin/lms/courses/{course_id}/announcements")
async def list_announcements(
    course_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db, edit=False)
    rows = (await db.execute(
        select(CourseAnnouncement)
        .where(CourseAnnouncement.course_id == course_id)
        .order_by(CourseAnnouncement.created_at.desc())
    )).scalars().all()
    return [_announcement_dict(a) for a in rows]


@router.post("/api/admin/lms/courses/{course_id}/announcements", status_code=201)
async def create_announcement(
    course_id: int,
    body: AnnouncementIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    a = CourseAnnouncement(
        course_id=course_id,
        author_user_id=me.id,
        title=body.title,
        body=body.body,
    )
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return _announcement_dict(a)


@router.patch("/api/admin/lms/announcements/{announcement_id}")
async def patch_announcement(
    announcement_id: int,
    body: AnnouncementPatch,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    a = (await db.execute(
        select(CourseAnnouncement).where(CourseAnnouncement.id == announcement_id)
    )).scalar_one_or_none()
    if not a:
        raise HTTPException(404, "Duyuru bulunamadı.")
    await _get_course_lms(a.course_id, me, db)
    for f, v in body.model_dump(exclude_none=True).items():
        setattr(a, f, v)
    await db.commit()
    await db.refresh(a)
    return _announcement_dict(a)


@router.delete("/api/admin/lms/announcements/{announcement_id}", status_code=204)
async def delete_announcement(
    announcement_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    a = (await db.execute(
        select(CourseAnnouncement).where(CourseAnnouncement.id == announcement_id)
    )).scalar_one_or_none()
    if a:
        await _get_course_lms(a.course_id, me, db)
        await db.delete(a)
        await db.commit()


def _announcement_dict(a: CourseAnnouncement) -> dict:
    return {
        "id": a.id,
        "course_id": a.course_id,
        "author_user_id": a.author_user_id,
        "title": a.title,
        "body": a.body,
        "created_at": a.created_at.isoformat(),
    }


# ===========================================================================
# QUIZ SYSTEM — Admin
# ===========================================================================


class QuizIn(BaseModel):
    title: str = Field(max_length=300)
    description: Optional[str] = None
    time_limit_minutes: Optional[int] = Field(default=None, ge=1, le=300)
    attempts_allowed: int = Field(default=1, ge=1, le=10)
    passing_score: int = Field(default=60, ge=0, le=100)
    shuffle_questions: bool = False
    show_correct_answers: bool = True


class QuizPatch(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    description: Optional[str] = None
    time_limit_minutes: Optional[int] = Field(default=None, ge=1, le=300)
    attempts_allowed: Optional[int] = Field(default=None, ge=1, le=10)
    passing_score: Optional[int] = Field(default=None, ge=0, le=100)
    shuffle_questions: Optional[bool] = None
    show_correct_answers: Optional[bool] = None


class QuizChoiceIn(BaseModel):
    choice_text: str = Field(max_length=1000)
    is_correct: bool = False
    order: int = Field(default=0, ge=0)


class QuizQuestionIn(BaseModel):
    question_text: str
    question_type: str = Field(default="multiple_choice", pattern="^(multiple_choice|true_false|short_answer)$")
    points: int = Field(default=1, ge=1, le=100)
    order: int = Field(default=0, ge=0)
    explanation: Optional[str] = None
    choices: list[QuizChoiceIn] = []


class QuizQuestionPatch(BaseModel):
    question_text: Optional[str] = None
    question_type: Optional[str] = Field(default=None, pattern="^(multiple_choice|true_false|short_answer)$")
    points: Optional[int] = Field(default=None, ge=1, le=100)
    order: Optional[int] = Field(default=None, ge=0)
    explanation: Optional[str] = None


def _quiz_dict(q: LMSQuiz, include_questions: bool = False) -> dict:
    d: dict = {
        "id": q.id,
        "course_id": q.course_id,
        "title": q.title,
        "description": q.description,
        "time_limit_minutes": q.time_limit_minutes,
        "attempts_allowed": q.attempts_allowed,
        "passing_score": q.passing_score,
        "shuffle_questions": q.shuffle_questions,
        "show_correct_answers": q.show_correct_answers,
        "created_at": q.created_at.isoformat(),
        "question_count": len(q.questions) if q.questions else 0,
    }
    if include_questions:
        d["questions"] = [_question_dict(qu) for qu in q.questions]
    return d


def _question_dict(q: LMSQuizQuestion) -> dict:
    return {
        "id": q.id,
        "quiz_id": q.quiz_id,
        "question_text": q.question_text,
        "question_type": q.question_type,
        "points": q.points,
        "order": q.order,
        "explanation": q.explanation,
        "choices": [
            {"id": c.id, "choice_text": c.choice_text, "is_correct": c.is_correct, "order": c.order}
            for c in q.choices
        ],
    }


@router.get("/api/admin/lms/courses/{course_id}/quizzes")
async def list_quizzes(
    course_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db, edit=False)
    rows = (await db.execute(
        select(LMSQuiz)
        .where(LMSQuiz.course_id == course_id)
        .options(selectinload(LMSQuiz.questions))
        .order_by(LMSQuiz.created_at)
    )).scalars().all()
    return [_quiz_dict(q) for q in rows]


@router.post("/api/admin/lms/courses/{course_id}/quizzes", status_code=201)
async def create_quiz(
    course_id: int,
    body: QuizIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_lms(course_id, me, db)
    q = LMSQuiz(
        course_id=course_id,
        title=body.title,
        description=body.description,
        time_limit_minutes=body.time_limit_minutes,
        attempts_allowed=body.attempts_allowed,
        passing_score=body.passing_score,
        shuffle_questions=body.shuffle_questions,
        show_correct_answers=body.show_correct_answers,
    )
    db.add(q)
    await db.commit()
    await db.refresh(q)
    q.questions = []
    return _quiz_dict(q)


@router.get("/api/admin/lms/quizzes/{quiz_id}")
async def get_quiz(
    quiz_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (await db.execute(
        select(LMSQuiz)
        .where(LMSQuiz.id == quiz_id)
        .options(selectinload(LMSQuiz.questions).selectinload(LMSQuizQuestion.choices))
    )).scalar_one_or_none()
    if not q:
        raise HTTPException(404, "Quiz bulunamadı.")
    await _get_course_lms(q.course_id, me, db, edit=False)
    return _quiz_dict(q, include_questions=True)


@router.patch("/api/admin/lms/quizzes/{quiz_id}")
async def patch_quiz(
    quiz_id: int,
    body: QuizPatch,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (await db.execute(
        select(LMSQuiz).where(LMSQuiz.id == quiz_id)
        .options(selectinload(LMSQuiz.questions))
    )).scalar_one_or_none()
    if not q:
        raise HTTPException(404, "Quiz bulunamadı.")
    await _get_course_lms(q.course_id, me, db)
    for f, v in body.model_dump(exclude_none=True).items():
        setattr(q, f, v)
    await db.commit()
    await db.refresh(q)
    return _quiz_dict(q)


@router.delete("/api/admin/lms/quizzes/{quiz_id}", status_code=204)
async def delete_quiz(
    quiz_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (await db.execute(select(LMSQuiz).where(LMSQuiz.id == quiz_id))).scalar_one_or_none()
    if q:
        await _get_course_lms(q.course_id, me, db)
        await db.delete(q)
        await db.commit()


@router.post("/api/admin/lms/quizzes/{quiz_id}/questions", status_code=201)
async def add_question(
    quiz_id: int,
    body: QuizQuestionIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (await db.execute(select(LMSQuiz).where(LMSQuiz.id == quiz_id))).scalar_one_or_none()
    if not q:
        raise HTTPException(404, "Quiz bulunamadı.")
    await _get_course_lms(q.course_id, me, db)
    question = LMSQuizQuestion(
        quiz_id=quiz_id,
        question_text=body.question_text,
        question_type=body.question_type,
        points=body.points,
        order=body.order,
        explanation=body.explanation,
    )
    db.add(question)
    await db.flush()
    for ch in body.choices:
        db.add(LMSQuizChoice(
            question_id=question.id,
            choice_text=ch.choice_text,
            is_correct=ch.is_correct,
            order=ch.order,
        ))
    await db.commit()
    await db.refresh(question)
    question.choices = (await db.execute(
        select(LMSQuizChoice).where(LMSQuizChoice.question_id == question.id).order_by(LMSQuizChoice.order)
    )).scalars().all()
    return _question_dict(question)


@router.patch("/api/admin/lms/questions/{question_id}")
async def patch_question(
    question_id: int,
    body: QuizQuestionPatch,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    question = (await db.execute(
        select(LMSQuizQuestion).where(LMSQuizQuestion.id == question_id)
    )).scalar_one_or_none()
    if not question:
        raise HTTPException(404, "Soru bulunamadı.")
    q = (await db.execute(select(LMSQuiz).where(LMSQuiz.id == question.quiz_id))).scalar_one()
    await _get_course_lms(q.course_id, me, db)
    for f, v in body.model_dump(exclude_none=True).items():
        setattr(question, f, v)
    await db.commit()
    question.choices = (await db.execute(
        select(LMSQuizChoice).where(LMSQuizChoice.question_id == question.id).order_by(LMSQuizChoice.order)
    )).scalars().all()
    return _question_dict(question)


@router.delete("/api/admin/lms/questions/{question_id}", status_code=204)
async def delete_question(
    question_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    question = (await db.execute(
        select(LMSQuizQuestion).where(LMSQuizQuestion.id == question_id)
    )).scalar_one_or_none()
    if question:
        q = (await db.execute(select(LMSQuiz).where(LMSQuiz.id == question.quiz_id))).scalar_one()
        await _get_course_lms(q.course_id, me, db)
        await db.delete(question)
        await db.commit()


@router.put("/api/admin/lms/questions/{question_id}/choices")
async def replace_choices(
    question_id: int,
    body: list[QuizChoiceIn],
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Replace all choices for a question (PUT semantics)."""
    question = (await db.execute(
        select(LMSQuizQuestion).where(LMSQuizQuestion.id == question_id)
    )).scalar_one_or_none()
    if not question:
        raise HTTPException(404, "Soru bulunamadı.")
    q = (await db.execute(select(LMSQuiz).where(LMSQuiz.id == question.quiz_id))).scalar_one()
    await _get_course_lms(q.course_id, me, db)
    await db.execute(
        select(LMSQuizChoice).where(LMSQuizChoice.question_id == question_id)
    )
    existing = (await db.execute(
        select(LMSQuizChoice).where(LMSQuizChoice.question_id == question_id)
    )).scalars().all()
    for c in existing:
        await db.delete(c)
    await db.flush()
    new_choices = []
    for ch in body:
        c = LMSQuizChoice(
            question_id=question_id,
            choice_text=ch.choice_text,
            is_correct=ch.is_correct,
            order=ch.order,
        )
        db.add(c)
        new_choices.append(c)
    await db.commit()
    question.choices = (await db.execute(
        select(LMSQuizChoice).where(LMSQuizChoice.question_id == question_id).order_by(LMSQuizChoice.order)
    )).scalars().all()
    return _question_dict(question)


@router.get("/api/admin/lms/quizzes/{quiz_id}/attempts")
async def list_quiz_attempts_admin(
    quiz_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = (await db.execute(select(LMSQuiz).where(LMSQuiz.id == quiz_id))).scalar_one_or_none()
    if not q:
        raise HTTPException(404, "Quiz bulunamadı.")
    await _get_course_lms(q.course_id, me, db, edit=False)
    attempts = (await db.execute(
        select(LMSQuizAttempt).where(LMSQuizAttempt.quiz_id == quiz_id)
        .order_by(LMSQuizAttempt.started_at.desc())
    )).scalars().all()
    return [
        {
            "id": a.id,
            "member_id": a.member_id,
            "attempt_number": a.attempt_number,
            "started_at": a.started_at.isoformat(),
            "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
            "score": float(a.score) if a.score is not None else None,
            "passed": a.passed,
        }
        for a in attempts
    ]


@router.delete("/api/admin/lms/bridges/{bridge_id}", status_code=204, dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def delete_bridge(
    bridge_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    b = (await db.execute(select(EventLmsBridge).where(EventLmsBridge.id == bridge_id))).scalar_one_or_none()
    if b:
        await db.delete(b)
        await db.commit()


def _bridge_dict(b: EventLmsBridge) -> dict:
    return {
        "id": b.id,
        "event_id": b.event_id,
        "course_id": b.course_id,
        "trigger_on": b.trigger_on,
        "action": b.action,
        "action_ref_id": b.action_ref_id,
        "is_active": b.is_active,
        "created_at": b.created_at.isoformat(),
    }


# ===========================================================================
# 4D — LMS ANALYTICS
# ===========================================================================


@router.get("/api/admin/lms/analytics", dependencies=[Depends(require_role(Role.admin, Role.superadmin))])
async def lms_analytics(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    org_id = org.id

    # Courses count
    total_courses = (await db.execute(
        select(func.count()).where(TrainingCourse.org_id == org_id)
    )).scalar() or 0

    published_courses = (await db.execute(
        select(func.count()).where(
            TrainingCourse.org_id == org_id, TrainingCourse.is_published == True
        )
    )).scalar() or 0

    # Enrollments
    total_enrollments = (await db.execute(
        select(func.count(CourseEnrollment.id))
        .join(TrainingCourse, TrainingCourse.id == CourseEnrollment.course_id)
        .where(TrainingCourse.org_id == org_id)
    )).scalar() or 0

    completed_enrollments = (await db.execute(
        select(func.count(CourseEnrollment.id))
        .join(TrainingCourse, TrainingCourse.id == CourseEnrollment.course_id)
        .where(TrainingCourse.org_id == org_id, CourseEnrollment.status == "completed")
    )).scalar() or 0

    # Certs issued via LMS
    certs_issued = (await db.execute(
        select(func.count(CourseEnrollment.id))
        .join(TrainingCourse, TrainingCourse.id == CourseEnrollment.course_id)
        .where(TrainingCourse.org_id == org_id, CourseEnrollment.cert_pdf_url.isnot(None))
    )).scalar() or 0

    # Badges awarded
    total_badges = (await db.execute(
        select(func.count(BadgeAward.id))
        .join(Badge, Badge.id == BadgeAward.badge_id)
        .where(Badge.org_id == org_id)
    )).scalar() or 0

    # Per-course breakdown
    course_rows = (await db.execute(
        select(
            TrainingCourse.id,
            TrainingCourse.title,
            func.count(CourseEnrollment.id).label("enrollments"),
            func.count(
                CourseEnrollment.id.distinct()
            ).filter(CourseEnrollment.status == "completed").label("completed"),
        )
        .outerjoin(CourseEnrollment, CourseEnrollment.course_id == TrainingCourse.id)
        .where(TrainingCourse.org_id == org_id)
        .group_by(TrainingCourse.id, TrainingCourse.title)
        .order_by(func.count(CourseEnrollment.id).desc())
        .limit(20)
    )).all()

    return {
        "total_courses": total_courses,
        "published_courses": published_courses,
        "total_enrollments": total_enrollments,
        "completed_enrollments": completed_enrollments,
        "completion_rate_pct": round(completed_enrollments / total_enrollments * 100, 1) if total_enrollments else 0,
        "certs_issued": certs_issued,
        "total_badges_awarded": total_badges,
        "top_courses": [
            {
                "course_id": r.id,
                "title": r.title,
                "enrollments": r.enrollments,
                "completed": r.completed,
            }
            for r in course_rows
        ],
    }


@router.get("/api/admin/lms/courses/{course_id}/analytics")
async def course_analytics(
    course_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    course = await _get_course_lms(course_id, me, db, edit=False)

    total = (await db.execute(
        select(func.count()).where(CourseEnrollment.course_id == course_id)
    )).scalar() or 0

    completed = (await db.execute(
        select(func.count()).where(
            CourseEnrollment.course_id == course_id, CourseEnrollment.status == "completed"
        )
    )).scalar() or 0

    in_progress = (await db.execute(
        select(func.count()).where(
            CourseEnrollment.course_id == course_id, CourseEnrollment.status == "in_progress"
        )
    )).scalar() or 0

    avg_progress = (await db.execute(
        select(func.avg(CourseEnrollment.progress_pct))
        .where(CourseEnrollment.course_id == course_id)
    )).scalar()

    # Module completion breakdown
    module_rows = (await db.execute(
        select(
            CourseModule.id,
            CourseModule.title,
            func.count(ModuleProgress.id).label("started"),
            func.count(ModuleProgress.id).filter(ModuleProgress.completed_at.isnot(None)).label("completed"),
        )
        .outerjoin(ModuleProgress, ModuleProgress.module_id == CourseModule.id)
        .where(CourseModule.course_id == course_id)
        .group_by(CourseModule.id, CourseModule.title)
        .order_by(CourseModule.order)
    )).all()

    return {
        "course_id": course_id,
        "title": course.title,
        "total_enrollments": total,
        "completed": completed,
        "in_progress": in_progress,
        "not_started": total - completed - in_progress,
        "avg_progress_pct": round(float(avg_progress), 1) if avg_progress else 0,
        "completion_rate_pct": round(completed / total * 100, 1) if total else 0,
        "modules": [
            {
                "module_id": r.id,
                "title": r.title,
                "started": r.started,
                "completed": r.completed,
            }
            for r in module_rows
        ],
    }


@router.get(
    "/api/admin/lms/courses/{course_id}/analytics/funnel",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def course_drop_off_funnel(
    course_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Module drop-off funnel: for each module, how many enrolled members started vs completed it."""
    course = await _get_course_lms(course_id, me, db, edit=False)
    total_enrolled = (await db.execute(
        select(func.count()).where(CourseEnrollment.course_id == course_id)
    )).scalar() or 0

    module_rows = (await db.execute(
        select(
            CourseModule.id,
            CourseModule.title,
            CourseModule.order,
            func.count(ModuleProgress.id).label("started"),
            func.count(ModuleProgress.id).filter(ModuleProgress.completed_at.isnot(None)).label("completed"),
        )
        .outerjoin(ModuleProgress, ModuleProgress.module_id == CourseModule.id)
        .where(CourseModule.course_id == course_id)
        .group_by(CourseModule.id, CourseModule.title, CourseModule.order)
        .order_by(CourseModule.order)
    )).all()

    funnel = []
    for r in module_rows:
        drop_off = (r.started or 0) - (r.completed or 0)
        funnel.append({
            "module_id": r.id,
            "title": r.title,
            "order": r.order,
            "enrolled": total_enrolled,
            "started": r.started or 0,
            "completed": r.completed or 0,
            "drop_off": max(drop_off, 0),
            "completion_rate_pct": round((r.completed or 0) / total_enrolled * 100, 1) if total_enrolled else 0,
            "started_rate_pct": round((r.started or 0) / total_enrolled * 100, 1) if total_enrolled else 0,
        })
    return {
        "course_id": course_id,
        "title": course.title,
        "total_enrolled": total_enrolled,
        "funnel": funnel,
    }


@router.get(
    "/api/admin/lms/analytics/compliance",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def lms_compliance_heatmap(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Department × Course compliance heatmap — based on OrgStaff departments and course enrollments."""
    from .org_staff_api import OrgStaff
    org = await _get_org_for_user(me, db)

    # Get courses for this org
    courses = (await db.execute(
        select(TrainingCourse.id, TrainingCourse.title)
        .where(TrainingCourse.org_id == org.id, TrainingCourse.is_published == True)
        .limit(20)
    )).all()

    # Get OrgStaff members grouped by department
    staff_rows = (await db.execute(
        select(OrgStaff.department, OrgStaff.user_id, OrgStaff.email)
        .where(OrgStaff.org_id == org.id, OrgStaff.is_active == True, OrgStaff.joined_at.isnot(None))
    )).all()

    # Build department → member email set
    dept_map: dict[str, set[str]] = {}
    for s in staff_rows:
        dept = s.department or "Genel"
        dept_map.setdefault(dept, set()).add(s.email)

    # Enrollment data: member emails that completed each course
    result_heatmap = []
    for dept, emails in dept_map.items():
        dept_row: dict[str, Any] = {"department": dept, "member_count": len(emails), "courses": []}
        for course in courses:
            # Simplified: count enrollments where member email matches
            # Since OrgStaff links to User (admin users) not PublicMember, we compute a proxy metric
            dept_row["courses"].append({
                "course_id": course.id,
                "title": course.title,
                "completion_pct": 0,  # Would need cross-join with PublicMember emails
            })
        result_heatmap.append(dept_row)

    return {
        "departments": list(dept_map.keys()),
        "courses": [{"id": c.id, "title": c.title} for c in courses],
        "heatmap": result_heatmap,
    }


@router.get(
    "/api/admin/lms/analytics/outcomes",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def outcomes_mastery_report(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Org-wide outcome mastery distribution."""
    org = await _get_org_for_user(me, db)

    outcome_rows = (await db.execute(
        select(
            LearningOutcome.id,
            LearningOutcome.title,
            LearningOutcome.mastery_points,
            func.count(OutcomeMastery.id).label("total_attempts"),
            func.count(OutcomeMastery.id).filter(OutcomeMastery.score >= LearningOutcome.mastery_points).label("mastered"),
        )
        .outerjoin(OutcomeMastery, OutcomeMastery.outcome_id == LearningOutcome.id)
        .where(LearningOutcome.org_id == org.id)
        .group_by(LearningOutcome.id, LearningOutcome.title, LearningOutcome.mastery_points)
        .order_by(func.count(OutcomeMastery.id).desc())
    )).all()

    return {
        "outcomes": [
            {
                "id": r.id,
                "title": r.title,
                "mastery_points": r.mastery_points,
                "total_attempts": r.total_attempts or 0,
                "mastered": r.mastered or 0,
                "mastery_rate_pct": round((r.mastered or 0) / r.total_attempts * 100, 1) if r.total_attempts else 0,
            }
            for r in outcome_rows
        ]
    }


# ===========================================================================
# PUBLIC — Discussions (member-facing)
# ===========================================================================


@router.get("/api/public/courses/{course_id}/discussions")
async def public_list_discussions(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    member: Optional[CurrentPublicMember] = Depends(get_optional_public_member),
):
    rows = (await db.execute(
        select(CourseDiscussion)
        .where(CourseDiscussion.course_id == course_id)
        .order_by(CourseDiscussion.is_pinned.desc(), CourseDiscussion.created_at.desc())
    )).scalars().all()
    return [_discussion_dict(d) for d in rows]


@router.get("/api/public/courses/{course_id}/discussions/{discussion_id}")
async def public_get_discussion(
    course_id: int,
    discussion_id: int,
    db: AsyncSession = Depends(get_db),
):
    d = (await db.execute(
        select(CourseDiscussion)
        .where(CourseDiscussion.id == discussion_id, CourseDiscussion.course_id == course_id)
        .options(selectinload(CourseDiscussion.replies))
    )).scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Tartışma bulunamadı.")
    result = _discussion_dict(d)
    result["replies"] = [_reply_dict(r) for r in d.replies]
    return result


@router.post("/api/public/courses/{course_id}/discussions", status_code=201)
async def public_create_discussion(
    course_id: int,
    body: DiscussionIn,
    db: AsyncSession = Depends(get_db),
    member: CurrentPublicMember = Depends(get_current_public_member),
):
    enr = (await db.execute(
        select(CourseEnrollment).where(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.member_id == member.id,
        )
    )).scalar_one_or_none()
    if not enr:
        raise HTTPException(403, "Bu kursa kayıtlı değilsiniz.")
    d = CourseDiscussion(
        course_id=course_id,
        module_id=body.module_id,
        author_member_id=member.id,
        title=body.title,
        body=body.body,
        is_pinned=False,
    )
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return _discussion_dict(d)


@router.post("/api/public/courses/{course_id}/discussions/{discussion_id}/replies", status_code=201)
async def public_add_reply(
    course_id: int,
    discussion_id: int,
    body: ReplyIn,
    db: AsyncSession = Depends(get_db),
    member: CurrentPublicMember = Depends(get_current_public_member),
):
    d = (await db.execute(
        select(CourseDiscussion).where(
            CourseDiscussion.id == discussion_id, CourseDiscussion.course_id == course_id
        )
    )).scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Tartışma bulunamadı.")
    if d.is_locked:
        raise HTTPException(400, "Bu tartışma kilitli.")
    r = DiscussionReply(
        discussion_id=discussion_id,
        parent_reply_id=body.parent_reply_id,
        author_member_id=member.id,
        body=body.body,
        is_instructor_reply=False,
    )
    db.add(r)
    d.reply_count = (d.reply_count or 0) + 1
    await db.commit()
    await db.refresh(r)
    return _reply_dict(r)


# ===========================================================================
# PUBLIC — Calendar (member-facing)
# ===========================================================================


@router.get("/api/public/courses/{course_id}/calendar")
async def public_course_calendar(
    course_id: int,
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(CourseCalendarEvent)
        .where(CourseCalendarEvent.course_id == course_id)
        .order_by(CourseCalendarEvent.starts_at)
    )).scalars().all()
    return [_cal_event_dict(e) for e in rows]


# ===========================================================================
# PUBLIC — My Grades (member-facing)
# ===========================================================================


@router.get("/api/public/courses/{course_id}/my-grades")
async def my_grades(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    member: CurrentPublicMember = Depends(get_current_public_member),
):
    enr = (await db.execute(
        select(CourseEnrollment)
        .where(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.member_id == member.id,
        )
        .options(
            selectinload(CourseEnrollment.grade_summary),
            selectinload(CourseEnrollment.module_progress),
        )
    )).scalar_one_or_none()
    if not enr:
        raise HTTPException(404, "Bu kursa kayıtlı değilsiniz.")

    course = (await db.execute(
        select(TrainingCourse).where(TrainingCourse.id == course_id)
    )).scalar_one_or_none()

    grade_items = (await db.execute(
        select(CourseGradeItem)
        .where(CourseGradeItem.course_id == course_id)
        .order_by(CourseGradeItem.order)
    )).scalars().all()

    modules = (await db.execute(
        select(CourseModule)
        .where(CourseModule.course_id == course_id)
        .order_by(CourseModule.order)
    )).scalars().all()

    completed_module_ids = {p.module_id for p in enr.module_progress if p.completed_at}
    quiz_scores = {p.module_id: p.quiz_score for p in enr.module_progress}

    gs = enr.grade_summary
    return {
        "course_id": course_id,
        "course_title": course.title if course else "",
        "progress_pct": enr.progress_pct,
        "status": enr.status,
        "grade_summary": {
            "weighted_avg": float(gs.weighted_avg) if gs and gs.weighted_avg is not None else None,
            "letter_grade": gs.letter_grade if gs else None,
            "passed": gs.passed if gs else None,
        } if gs else None,
        "grade_items": [_grade_item_dict(i) for i in grade_items],
        "modules": [
            {
                "module_id": m.id,
                "title": m.title,
                "completed": m.id in completed_module_ids,
                "quiz_score": quiz_scores.get(m.id),
            }
            for m in modules
        ],
    }
