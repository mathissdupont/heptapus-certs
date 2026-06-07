"""LMS (Learning Management System) API — independent of Events."""

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .main import (
    CurrentPublicMember,
    CurrentUser,
    Organization,
    Role,
    get_current_public_member,
    get_current_user,
    get_db,
    get_optional_public_member,
    require_role,
)
from .lms_models import (
    AssignmentSubmission,
    CourseAssignment,
    CourseAnnouncement,
    CourseEnrollment,
    CourseModule,
    LmsJourney,
    LmsJourneyEnrollment,
    LmsJourneyStep,
    ModuleProgress,
    TrainingCourse,
)

logger = logging.getLogger("heptacert.lms")

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class CourseModuleIn(BaseModel):
    title: str = Field(max_length=300)
    description: Optional[str] = Field(default=None, max_length=3000)
    order: int = Field(default=0, ge=0)
    content_type: str = Field(default="article", pattern="^(video|article|quiz|file|assignment)$")
    content_url: Optional[str] = Field(default=None, max_length=1000)
    content_text: Optional[str] = None
    duration_minutes: Optional[int] = Field(default=None, ge=1, le=600)
    is_required: bool = True


class CourseIn(BaseModel):
    title: str = Field(max_length=300)
    description: Optional[str] = Field(default=None, max_length=5000)
    thumbnail_url: Optional[str] = Field(default=None, max_length=1000)
    category: Optional[str] = Field(default=None, max_length=100)
    level: str = Field(default="beginner", pattern="^(beginner|intermediate|advanced)$")
    language: str = Field(default="tr", max_length=10)
    is_published: bool = False
    is_featured: bool = False
    price: Optional[Decimal] = None
    passing_score: Optional[int] = Field(default=None, ge=1, le=100)


class CoursePatch(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    description: Optional[str] = Field(default=None, max_length=5000)
    thumbnail_url: Optional[str] = Field(default=None, max_length=1000)
    category: Optional[str] = Field(default=None, max_length=100)
    level: Optional[str] = Field(default=None, pattern="^(beginner|intermediate|advanced)$")
    language: Optional[str] = Field(default=None, max_length=10)
    is_published: Optional[bool] = None
    is_featured: Optional[bool] = None
    price: Optional[Decimal] = None
    passing_score: Optional[int] = Field(default=None, ge=1, le=100)


class CourseModulePatch(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    description: Optional[str] = Field(default=None, max_length=3000)
    order: Optional[int] = Field(default=None, ge=0)
    content_type: Optional[str] = Field(default=None, pattern="^(video|article|quiz|file|assignment)$")
    content_url: Optional[str] = Field(default=None, max_length=1000)
    content_text: Optional[str] = None
    duration_minutes: Optional[int] = Field(default=None, ge=1, le=600)
    is_required: Optional[bool] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _course_to_dict(course: TrainingCourse, include_modules: bool = False) -> dict[str, Any]:
    d: dict[str, Any] = {
        "id": course.id,
        "org_id": course.org_id,
        "title": course.title,
        "description": course.description,
        "thumbnail_url": course.thumbnail_url,
        "category": course.category,
        "level": course.level,
        "language": course.language,
        "is_published": course.is_published,
        "is_featured": course.is_featured,
        "price": float(course.price) if course.price is not None else None,
        "passing_score": course.passing_score,
        "created_at": course.created_at.isoformat(),
        "updated_at": course.updated_at.isoformat(),
        "module_count": len(course.modules) if course.modules else 0,
    }
    if include_modules:
        d["modules"] = [_module_to_dict(m) for m in course.modules]
    return d


def _module_to_dict(module: CourseModule) -> dict[str, Any]:
    return {
        "id": module.id,
        "course_id": module.course_id,
        "title": module.title,
        "description": module.description,
        "order": module.order,
        "content_type": module.content_type,
        "content_url": module.content_url,
        "content_text": module.content_text,
        "duration_minutes": module.duration_minutes,
        "is_required": module.is_required,
        "created_at": module.created_at.isoformat(),
    }


async def _get_org_for_user(me: CurrentUser, db: AsyncSession) -> Organization:
    res = await db.execute(
        select(Organization).where(Organization.user_id == me.id).limit(1)
    )
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadı.")
    return org


async def _get_course_for_admin(
    course_id: int, me: CurrentUser, db: AsyncSession
) -> TrainingCourse:
    res = await db.execute(
        select(TrainingCourse)
        .where(TrainingCourse.id == course_id)
        .options(selectinload(TrainingCourse.modules))
    )
    course = res.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")
    if me.role != Role.superadmin:
        org = await _get_org_for_user(me, db)
        if course.org_id != org.id:
            raise HTTPException(status_code=403, detail="Bu kursa erişim yetkiniz yok.")
    return course


# ---------------------------------------------------------------------------
# Admin: Course CRUD
# ---------------------------------------------------------------------------


@router.get(
    "/api/admin/lms/courses",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_courses_admin(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    res = await db.execute(
        select(TrainingCourse)
        .where(TrainingCourse.org_id == org.id)
        .options(selectinload(TrainingCourse.modules))
        .order_by(TrainingCourse.created_at.desc())
    )
    courses = res.scalars().all()
    return {"courses": [_course_to_dict(c) for c in courses]}


@router.post(
    "/api/admin/lms/courses",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_course(
    payload: CourseIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    course = TrainingCourse(
        org_id=org.id,
        title=payload.title.strip() or "Yeni Kurs",
        description=payload.description,
        thumbnail_url=payload.thumbnail_url,
        category=payload.category,
        level=payload.level,
        language=payload.language,
        is_published=payload.is_published,
        is_featured=payload.is_featured,
        price=payload.price,
        passing_score=payload.passing_score,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return _course_to_dict(course)


@router.get(
    "/api/admin/lms/courses/{course_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_course_admin(
    course_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    course = await _get_course_for_admin(course_id, me, db)
    return _course_to_dict(course, include_modules=True)


@router.patch(
    "/api/admin/lms/courses/{course_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_course(
    course_id: int,
    payload: CoursePatch,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    course = await _get_course_for_admin(course_id, me, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "title" and value is not None:
            value = value.strip() or course.title
        setattr(course, field, value)
    course.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(course)
    return _course_to_dict(course, include_modules=True)


@router.delete(
    "/api/admin/lms/courses/{course_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_course(
    course_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    course = await _get_course_for_admin(course_id, me, db)
    await db.delete(course)
    await db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Admin: Module CRUD
# ---------------------------------------------------------------------------


@router.post(
    "/api/admin/lms/courses/{course_id}/modules",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def add_module(
    course_id: int,
    payload: CourseModuleIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    course = await _get_course_for_admin(course_id, me, db)
    module = CourseModule(
        course_id=course.id,
        title=payload.title.strip() or "Modül",
        description=payload.description,
        order=payload.order,
        content_type=payload.content_type,
        content_url=payload.content_url,
        content_text=payload.content_text,
        duration_minutes=payload.duration_minutes,
        is_required=payload.is_required,
    )
    db.add(module)
    await db.commit()
    await db.refresh(module)
    return _module_to_dict(module)


@router.patch(
    "/api/admin/lms/courses/{course_id}/modules/{module_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_module(
    course_id: int,
    module_id: int,
    payload: CourseModulePatch,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_for_admin(course_id, me, db)
    res = await db.execute(
        select(CourseModule).where(
            CourseModule.id == module_id, CourseModule.course_id == course_id
        )
    )
    module = res.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Modül bulunamadı.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "title" and value is not None:
            value = value.strip() or module.title
        setattr(module, field, value)
    await db.commit()
    await db.refresh(module)
    return _module_to_dict(module)


@router.delete(
    "/api/admin/lms/courses/{course_id}/modules/{module_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_module(
    course_id: int,
    module_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_for_admin(course_id, me, db)
    res = await db.execute(
        select(CourseModule).where(
            CourseModule.id == module_id, CourseModule.course_id == course_id
        )
    )
    module = res.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Modül bulunamadı.")
    await db.delete(module)
    await db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Public: Course catalog
# ---------------------------------------------------------------------------


@router.get("/api/public/courses")
async def list_courses_public(
    org_id: Optional[int] = Query(default=None),
    category: Optional[str] = Query(default=None),
    level: Optional[str] = Query(default=None),
    language: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    member: Optional[CurrentPublicMember] = Depends(get_optional_public_member),
):
    q = (
        select(TrainingCourse)
        .where(TrainingCourse.is_published == True)
        .options(selectinload(TrainingCourse.modules))
        .order_by(TrainingCourse.is_featured.desc(), TrainingCourse.created_at.desc())
    )
    if org_id:
        q = q.where(TrainingCourse.org_id == org_id)
    if category:
        q = q.where(TrainingCourse.category == category)
    if level:
        q = q.where(TrainingCourse.level == level)
    if language:
        q = q.where(TrainingCourse.language == language)

    res = await db.execute(q)
    courses = res.scalars().all()

    result = []
    enrolled_ids: set[int] = set()
    if member:
        enr_res = await db.execute(
            select(CourseEnrollment.course_id).where(
                CourseEnrollment.member_id == member.id
            )
        )
        enrolled_ids = {r[0] for r in enr_res.fetchall()}

    for c in courses:
        d = _course_to_dict(c)
        d["is_enrolled"] = c.id in enrolled_ids
        result.append(d)

    return {"courses": result}


@router.get("/api/public/courses/{course_id}")
async def get_course_public(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    member: Optional[CurrentPublicMember] = Depends(get_optional_public_member),
):
    res = await db.execute(
        select(TrainingCourse)
        .where(TrainingCourse.id == course_id, TrainingCourse.is_published == True)
        .options(selectinload(TrainingCourse.modules))
    )
    course = res.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")

    d = _course_to_dict(course, include_modules=True)

    if member:
        enr_res = await db.execute(
            select(CourseEnrollment)
            .where(
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.member_id == member.id,
            )
            .options(selectinload(CourseEnrollment.module_progress))
        )
        enr = enr_res.scalar_one_or_none()
        if enr:
            completed_module_ids = {
                mp.module_id for mp in enr.module_progress if mp.completed_at
            }
            d["enrollment"] = {
                "id": enr.id,
                "progress_pct": enr.progress_pct,
                "completed_at": enr.completed_at.isoformat() if enr.completed_at else None,
                "completed_module_ids": list(completed_module_ids),
            }
        else:
            d["enrollment"] = None
    else:
        d["enrollment"] = None

    return d


@router.post("/api/public/courses/{course_id}/enroll")
async def enroll_in_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    member: CurrentPublicMember = Depends(get_current_public_member),
):
    res = await db.execute(
        select(TrainingCourse).where(
            TrainingCourse.id == course_id, TrainingCourse.is_published == True
        )
    )
    course = res.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")

    existing = await db.execute(
        select(CourseEnrollment).where(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.member_id == member.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Zaten kayıtlısınız.")

    enr = CourseEnrollment(course_id=course_id, member_id=member.id)
    db.add(enr)
    await db.commit()
    await db.refresh(enr)
    return {"enrollment_id": enr.id, "progress_pct": 0}


@router.post("/api/public/courses/{course_id}/modules/{module_id}/complete")
async def complete_module(
    course_id: int,
    module_id: int,
    db: AsyncSession = Depends(get_db),
    member: CurrentPublicMember = Depends(get_current_public_member),
):
    enr_res = await db.execute(
        select(CourseEnrollment)
        .where(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.member_id == member.id,
        )
        .options(selectinload(CourseEnrollment.module_progress))
    )
    enr = enr_res.scalar_one_or_none()
    if not enr:
        raise HTTPException(status_code=404, detail="Bu kursa kayıtlı değilsiniz.")

    module_res = await db.execute(
        select(CourseModule).where(
            CourseModule.id == module_id, CourseModule.course_id == course_id
        )
    )
    module = module_res.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=404, detail="Modül bulunamadı.")

    # Upsert module progress
    existing_mp = next(
        (mp for mp in enr.module_progress if mp.module_id == module_id), None
    )
    now = datetime.now(timezone.utc)
    if existing_mp:
        if not existing_mp.completed_at:
            existing_mp.completed_at = now
    else:
        mp = ModuleProgress(
            enrollment_id=enr.id,
            module_id=module_id,
            started_at=now,
            completed_at=now,
        )
        db.add(mp)
        await db.flush()
        enr.module_progress.append(mp)

    # Recompute progress
    course_res = await db.execute(
        select(TrainingCourse)
        .where(TrainingCourse.id == course_id)
        .options(selectinload(TrainingCourse.modules))
    )
    course = course_res.scalar_one()
    required_modules = [m for m in course.modules if m.is_required]
    completed_ids = {
        mp.module_id for mp in enr.module_progress if mp.completed_at
    }
    # include the just-completed module
    completed_ids.add(module_id)

    if required_modules:
        pct = int(
            len([m for m in required_modules if m.id in completed_ids])
            / len(required_modules)
            * 100
        )
    else:
        pct = 100

    enr.progress_pct = pct
    if pct == 100 and enr.completed_at is None:
        enr.completed_at = now

    await db.commit()
    return {"progress_pct": pct, "completed": pct == 100}


@router.get("/api/admin/lms/courses/{course_id}/enrollments")
async def list_enrollments(
    course_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_for_admin(course_id, me, db)
    res = await db.execute(
        select(CourseEnrollment)
        .where(CourseEnrollment.course_id == course_id)
        .options(selectinload(CourseEnrollment.module_progress))
        .order_by(CourseEnrollment.enrolled_at.desc())
    )
    enrollments = res.scalars().all()
    return {
        "enrollments": [
            {
                "id": e.id,
                "member_id": e.member_id,
                "enrolled_at": e.enrolled_at.isoformat(),
                "completed_at": e.completed_at.isoformat() if e.completed_at else None,
                "progress_pct": e.progress_pct,
                "final_grade": e.final_grade,
            }
            for e in enrollments
        ]
    }


# ---------------------------------------------------------------------------
# Admin: Learning Journeys
# ---------------------------------------------------------------------------


class JourneyStepIn(BaseModel):
    course_id: int
    order: int = 0
    is_required: bool = True


class JourneyIn(BaseModel):
    title: str = Field(max_length=300)
    description: Optional[str] = Field(default=None, max_length=5000)
    thumbnail_url: Optional[str] = Field(default=None, max_length=1000)
    is_published: bool = False
    steps: list[JourneyStepIn] = []


class JourneyPatch(BaseModel):
    title: Optional[str] = Field(default=None, max_length=300)
    description: Optional[str] = Field(default=None, max_length=5000)
    thumbnail_url: Optional[str] = Field(default=None, max_length=1000)
    is_published: Optional[bool] = None
    steps: Optional[list[JourneyStepIn]] = None


def _journey_to_dict(j: LmsJourney) -> dict[str, Any]:
    return {
        "id": j.id,
        "org_id": j.org_id,
        "title": j.title,
        "description": j.description,
        "thumbnail_url": j.thumbnail_url,
        "is_published": j.is_published,
        "created_at": j.created_at.isoformat(),
        "step_count": len(j.steps) if j.steps else 0,
        "steps": [
            {"id": s.id, "course_id": s.course_id, "order": s.order, "is_required": s.is_required}
            for s in (j.steps or [])
        ],
    }


@router.get(
    "/api/admin/lms/journeys",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_journeys(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    res = await db.execute(
        select(LmsJourney)
        .where(LmsJourney.org_id == org.id)
        .options(selectinload(LmsJourney.steps))
        .order_by(LmsJourney.created_at.desc())
    )
    journeys = res.scalars().all()
    return {"journeys": [_journey_to_dict(j) for j in journeys]}


@router.post(
    "/api/admin/lms/journeys",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_journey(
    payload: JourneyIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    journey = LmsJourney(
        org_id=org.id,
        title=payload.title.strip() or "Yeni Öğrenme Yolu",
        description=payload.description,
        thumbnail_url=payload.thumbnail_url,
        is_published=payload.is_published,
    )
    db.add(journey)
    await db.flush()
    for s in payload.steps:
        db.add(LmsJourneyStep(journey_id=journey.id, course_id=s.course_id, order=s.order, is_required=s.is_required))
    await db.commit()
    await db.refresh(journey)
    res = await db.execute(
        select(LmsJourney).where(LmsJourney.id == journey.id).options(selectinload(LmsJourney.steps))
    )
    return _journey_to_dict(res.scalar_one())


@router.patch(
    "/api/admin/lms/journeys/{journey_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_journey(
    journey_id: int,
    payload: JourneyPatch,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    res = await db.execute(
        select(LmsJourney)
        .where(LmsJourney.id == journey_id, LmsJourney.org_id == org.id)
        .options(selectinload(LmsJourney.steps))
    )
    journey = res.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Öğrenme yolu bulunamadı.")

    updates = payload.model_dump(exclude_unset=True)
    steps_update = updates.pop("steps", None)
    for field, value in updates.items():
        if field == "title" and value:
            value = value.strip() or journey.title
        setattr(journey, field, value)
    journey.updated_at = datetime.now(timezone.utc)

    if steps_update is not None:
        for old_step in journey.steps:
            await db.delete(old_step)
        await db.flush()
        for s in steps_update:
            db.add(LmsJourneyStep(journey_id=journey.id, course_id=s.course_id, order=s.order, is_required=s.is_required))

    await db.commit()
    res2 = await db.execute(
        select(LmsJourney).where(LmsJourney.id == journey_id).options(selectinload(LmsJourney.steps))
    )
    return _journey_to_dict(res2.scalar_one())


@router.delete(
    "/api/admin/lms/journeys/{journey_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_journey(
    journey_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db)
    res = await db.execute(
        select(LmsJourney).where(LmsJourney.id == journey_id, LmsJourney.org_id == org.id)
    )
    journey = res.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Öğrenme yolu bulunamadı.")
    await db.delete(journey)
    await db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Admin: Announcements
# ---------------------------------------------------------------------------


class AnnouncementIn(BaseModel):
    title: str = Field(max_length=300)
    body: str


@router.get(
    "/api/admin/lms/courses/{course_id}/announcements",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_announcements(
    course_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_for_admin(course_id, me, db)
    res = await db.execute(
        select(CourseAnnouncement)
        .where(CourseAnnouncement.course_id == course_id)
        .order_by(CourseAnnouncement.created_at.desc())
    )
    items = res.scalars().all()
    return {
        "announcements": [
            {"id": a.id, "title": a.title, "body": a.body, "created_at": a.created_at.isoformat()}
            for a in items
        ]
    }


@router.post(
    "/api/admin/lms/courses/{course_id}/announcements",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_announcement(
    course_id: int,
    payload: AnnouncementIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_for_admin(course_id, me, db)
    ann = CourseAnnouncement(
        course_id=course_id,
        author_user_id=me.id,
        title=payload.title.strip(),
        body=payload.body,
    )
    db.add(ann)
    await db.commit()
    await db.refresh(ann)
    return {"id": ann.id, "title": ann.title, "body": ann.body, "created_at": ann.created_at.isoformat()}


# ---------------------------------------------------------------------------
# Admin: Assignment grading
# ---------------------------------------------------------------------------


class GradeIn(BaseModel):
    grade: int = Field(ge=0, le=100)
    feedback: Optional[str] = None


@router.get(
    "/api/admin/lms/courses/{course_id}/assignments/{module_id}/submissions",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_submissions(
    course_id: int,
    module_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_for_admin(course_id, me, db)
    assignment_res = await db.execute(
        select(CourseAssignment).where(CourseAssignment.module_id == module_id)
    )
    assignment = assignment_res.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Ödev bulunamadı.")
    subs_res = await db.execute(
        select(AssignmentSubmission)
        .where(AssignmentSubmission.assignment_id == assignment.id)
        .order_by(AssignmentSubmission.submitted_at.desc())
    )
    subs = subs_res.scalars().all()
    return {
        "submissions": [
            {
                "id": s.id,
                "member_id": s.member_id,
                "submitted_at": s.submitted_at.isoformat(),
                "submission_text": s.submission_text,
                "submission_url": s.submission_url,
                "file_url": s.file_url,
                "grade": s.grade,
                "feedback": s.feedback,
                "graded_at": s.graded_at.isoformat() if s.graded_at else None,
            }
            for s in subs
        ]
    }


@router.patch(
    "/api/admin/lms/submissions/{submission_id}/grade",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def grade_submission(
    submission_id: int,
    payload: GradeIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(AssignmentSubmission).where(AssignmentSubmission.id == submission_id)
    )
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Gönderim bulunamadı.")
    sub.grade = payload.grade
    sub.feedback = payload.feedback
    sub.graded_at = datetime.now(timezone.utc)
    sub.graded_by_user_id = me.id
    await db.commit()
    return {"ok": True, "grade": sub.grade}


# ---------------------------------------------------------------------------
# Public: Journey catalog + enrollment
# ---------------------------------------------------------------------------


@router.get("/api/public/lms/journeys")
async def list_journeys_public(
    org_id: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    member: Optional[CurrentPublicMember] = Depends(get_optional_public_member),
):
    q = (
        select(LmsJourney)
        .where(LmsJourney.is_published == True)
        .options(selectinload(LmsJourney.steps))
        .order_by(LmsJourney.created_at.desc())
    )
    if org_id:
        q = q.where(LmsJourney.org_id == org_id)
    res = await db.execute(q)
    journeys = res.scalars().all()

    enrolled_ids: set[int] = set()
    if member:
        enr_res = await db.execute(
            select(LmsJourneyEnrollment.journey_id).where(LmsJourneyEnrollment.member_id == member.id)
        )
        enrolled_ids = {r[0] for r in enr_res.fetchall()}

    result = []
    for j in journeys:
        d = _journey_to_dict(j)
        d["is_enrolled"] = j.id in enrolled_ids
        result.append(d)
    return {"journeys": result}


@router.post("/api/public/lms/journeys/{journey_id}/enroll")
async def enroll_in_journey(
    journey_id: int,
    db: AsyncSession = Depends(get_db),
    member: CurrentPublicMember = Depends(get_current_public_member),
):
    res = await db.execute(
        select(LmsJourney).where(LmsJourney.id == journey_id, LmsJourney.is_published == True)
    )
    journey = res.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Öğrenme yolu bulunamadı.")

    existing = await db.execute(
        select(LmsJourneyEnrollment).where(
            LmsJourneyEnrollment.journey_id == journey_id,
            LmsJourneyEnrollment.member_id == member.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Zaten kayıtlısınız.")

    enr = LmsJourneyEnrollment(journey_id=journey_id, member_id=member.id)
    db.add(enr)
    await db.commit()
    return {"enrollment_id": enr.id, "progress_pct": 0}


# ---------------------------------------------------------------------------
# Public: Assignment submission
# ---------------------------------------------------------------------------


class SubmitAssignmentIn(BaseModel):
    submission_text: Optional[str] = None
    submission_url: Optional[str] = Field(default=None, max_length=1000)


@router.post("/api/public/courses/{course_id}/modules/{module_id}/submit")
async def submit_assignment(
    course_id: int,
    module_id: int,
    payload: SubmitAssignmentIn,
    db: AsyncSession = Depends(get_db),
    member: CurrentPublicMember = Depends(get_current_public_member),
):
    enr_res = await db.execute(
        select(CourseEnrollment).where(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.member_id == member.id,
        )
    )
    if not enr_res.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Bu kursa kayıtlı değilsiniz.")

    assignment_res = await db.execute(
        select(CourseAssignment).where(CourseAssignment.module_id == module_id)
    )
    assignment = assignment_res.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Ödev bulunamadı.")

    existing = await db.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id == assignment.id,
            AssignmentSubmission.member_id == member.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Bu ödevi zaten gönderdiniz.")

    sub = AssignmentSubmission(
        assignment_id=assignment.id,
        member_id=member.id,
        submission_text=payload.submission_text,
        submission_url=payload.submission_url,
    )
    db.add(sub)
    await db.commit()
    return {"ok": True, "submission_id": sub.id}
