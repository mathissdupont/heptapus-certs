"""LMS (Learning Management System) API — independent of Events."""

import asyncio
import logging
import secrets
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .main import (
    CurrentPublicMember,
    CurrentUser,
    Organization,
    Role,
    SessionLocal,
    User,
    build_certificate_verify_url,
    build_public_pdf_url,
    compute_hosting_ends,
    get_current_public_member,
    get_current_user,
    get_db,
    get_optional_public_member,
    hosting_units,
    ISSUE_UNITS_PER_CERT,
    local_path_from_url,
    require_role,
    send_email_async,
    settings,
    Certificate,
    CertStatus,
    EmailTemplate,
    PublicMember,
    _generate_public_member_public_id,
    hash_password,
    make_email_token,
)
from .generator import TemplateConfig, render_certificate_pdf, new_certificate_uuid
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
    OrgLmsStaff,
    TrainingCourse,
)

logger = logging.getLogger("heptacert.lms")

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
    course_code: Optional[str] = Field(default=None, max_length=50)
    department: Optional[str] = Field(default=None, max_length=120)
    term: Optional[str] = Field(default=None, max_length=80)
    section: Optional[str] = Field(default=None, max_length=50)
    credits: Optional[Decimal] = Field(default=None, ge=0, le=30)
    capacity: Optional[int] = Field(default=None, ge=1, le=100000)
    enrollment_policy: str = Field(default="open", pattern="^(open|approval|required_invite|closed)$")
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
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
    course_code: Optional[str] = Field(default=None, max_length=50)
    department: Optional[str] = Field(default=None, max_length=120)
    term: Optional[str] = Field(default=None, max_length=80)
    section: Optional[str] = Field(default=None, max_length=50)
    credits: Optional[Decimal] = Field(default=None, ge=0, le=30)
    capacity: Optional[int] = Field(default=None, ge=1, le=100000)
    enrollment_policy: Optional[str] = Field(default=None, pattern="^(open|approval|required_invite|closed)$")
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
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


class EnrollmentImportStudent(BaseModel):
    email: str = Field(max_length=320)
    display_name: Optional[str] = Field(default=None, max_length=120)
    student_no: Optional[str] = Field(default=None, max_length=80)
    department: Optional[str] = Field(default=None, max_length=120)


class EnrollmentImportIn(BaseModel):
    students: list[EnrollmentImportStudent] = Field(min_length=1, max_length=1000)


class EnrollmentInviteIn(BaseModel):
    enrollment_ids: Optional[list[int]] = Field(default=None, max_length=1000)


# ---------------------------------------------------------------------------
# Certificate generation background task
# ---------------------------------------------------------------------------


async def _issue_lms_course_cert(enrollment_id: int, member_name: str) -> None:
    """Generate and store a course completion certificate. Runs as a background task."""
    async with SessionLocal() as db:
        try:
            enr_res = await db.execute(
                select(CourseEnrollment)
                .where(CourseEnrollment.id == enrollment_id)
                .options(selectinload(CourseEnrollment.course))
            )
            enr = enr_res.scalar_one_or_none()
            if not enr or enr.cert_pdf_url:
                return

            course = enr.course
            if not course or not course.cert_template_url:
                return

            # Load org for branding + billing user
            org_res = await db.execute(
                select(Organization).where(Organization.id == course.org_id)
            )
            org = org_res.scalar_one_or_none()
            if not org:
                return

            user_res = await db.execute(select(User).where(User.id == org.user_id))
            user = user_res.scalar_one_or_none()
            if not user:
                return

            # Load template image bytes
            try:
                template_path = local_path_from_url(course.cert_template_url)
                if not template_path.exists():
                    logger.warning("lms cert: template missing for course %d", course.id)
                    return
                template_bytes = template_path.read_bytes()
            except Exception as exc:
                logger.warning("lms cert: template read error: %s", exc)
                return

            # Brand logo (best-effort)
            brand_logo_bytes: Optional[bytes] = None
            if org.brand_logo:
                try:
                    logo_path = local_path_from_url(org.brand_logo)
                    if logo_path.exists():
                        brand_logo_bytes = logo_path.read_bytes()
                except Exception:
                    pass

            certificate_footer: Optional[str] = None
            try:
                certificate_footer = (org.settings or {}).get("certificate_footer")
            except Exception:
                pass

            cert_uuid = new_certificate_uuid()
            public_id = f"LMS{course.id}-{cert_uuid[:8].upper()}"
            verify_url = build_certificate_verify_url(cert_uuid)
            cfg = TemplateConfig(isim_x=500, isim_y=400)

            pdf_bytes = await asyncio.to_thread(
                render_certificate_pdf,
                template_image_bytes=template_bytes,
                student_name=member_name,
                verify_url=verify_url,
                config=cfg,
                public_id=public_id,
                brand_logo_bytes=brand_logo_bytes,
                certificate_footer=certificate_footer,
            )

            rel_pdf_path = f"pdfs/course_{course.id}/{cert_uuid}.pdf"
            abs_pdf_path = Path(settings.local_storage_dir) / rel_pdf_path
            abs_pdf_path.parent.mkdir(parents=True, exist_ok=True)
            abs_pdf_path.write_bytes(pdf_bytes)
            asset_size_bytes = abs_pdf_path.stat().st_size

            term = "yearly"
            spend_units = ISSUE_UNITS_PER_CERT + hosting_units(term, asset_size_bytes)
            if user.heptacoin_balaonce < spend_units:
                logger.warning(
                    "lms cert: insufficient HeptaCoin for course %d (need %d, have %d)",
                    course.id, spend_units, user.heptacoin_balaonce,
                )
                abs_pdf_path.unlink(missing_ok=True)
                return

            pdf_url = build_public_pdf_url(rel_pdf_path)
            user.heptacoin_balaonce -= spend_units
            enr.cert_pdf_url = pdf_url
            await db.commit()

        except Exception as exc:
            logger.error("lms cert background error for enrollment %d: %s", enrollment_id, exc)


async def _dispatch_lms_automation(
    trigger: str,
    member_email: str,
    member_name: str,
    course_title: str,
    org_id: int,
) -> None:
    """Send emails for LMS email templates whose template_type matches the trigger."""
    try:
        async with SessionLocal() as db:
            templates_res = await db.execute(
                select(EmailTemplate).where(
                    EmailTemplate.org_id == org_id,
                    EmailTemplate.template_type == trigger,
                )
            )
            templates = templates_res.scalars().all()
            for tmpl in templates:
                if not member_email:
                    continue
                from .email_rendering import render_template_string
                variables = {
                    "member_name": member_name,
                    "course_title": course_title,
                }
                subject = render_template_string(tmpl.subject_tr, variables)
                body = render_template_string(tmpl.body_html, variables)
                await send_email_async(member_email, subject, body)
    except Exception as exc:
        logger.warning("lms automation dispatch error [%s]: %s", trigger, exc)


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
        "course_code": course.course_code,
        "department": course.department,
        "term": course.term,
        "section": course.section,
        "credits": float(course.credits) if course.credits is not None else None,
        "capacity": course.capacity,
        "enrollment_policy": course.enrollment_policy,
        "starts_at": course.starts_at.isoformat() if course.starts_at else None,
        "ends_at": course.ends_at.isoformat() if course.ends_at else None,
        "level": course.level,
        "language": course.language,
        "is_published": course.is_published,
        "is_featured": course.is_featured,
        "price": float(course.price) if course.price is not None else None,
        "passing_score": course.passing_score,
        "is_marketplace_listed": course.is_marketplace_listed,
        "marketplace_price": float(course.marketplace_price) if course.marketplace_price is not None else None,
        "marketplace_description": course.marketplace_description,
        "preview_video_url": course.preview_video_url,
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


async def _get_org_for_user(
    me: CurrentUser,
    db: AsyncSession,
    organization_id: Optional[int] = None,
    required_permission: str = "organization:view",
) -> Organization:
    if organization_id is not None:
        from .organization_access_api import get_organization_for_access

        return await get_organization_for_access(db, me, required_permission, organization_id)
    res = await db.execute(
        select(Organization).where(Organization.user_id == me.id).limit(1)
    )
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadı.")
    return org


def _organization_id_from_request(request: Request) -> Optional[int]:
    from .organization_access_api import organization_id_from_request

    return organization_id_from_request(request)


async def _get_course_for_admin(
    course_id: int,
    me: CurrentUser,
    db: AsyncSession,
    organization_id: Optional[int] = None,
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
        org = await _get_org_for_user(me, db, organization_id, "organization:view")
        if course.org_id != org.id:
            raise HTTPException(status_code=403, detail="Bu kursa erişim yetkiniz yok.")
    if me.role == Role.superadmin and organization_id is not None and course.org_id != organization_id:
        raise HTTPException(status_code=403, detail="Bu kurs seçili organizasyona ait değil.")
    return course


LMS_EDIT_ROLES = {"instructor", "content_editor", "department_admin"}
LMS_ALL_ROLES = LMS_EDIT_ROLES | {"teaching_assistant", "viewer"}


async def _get_course_for_lms_user(
    course_id: int, me: CurrentUser, db: AsyncSession, *, require_edit: bool = True
) -> TrainingCourse:
    """Allow admin/superadmin OR org LMS staff with sufficient role."""
    if me.role in (Role.admin, Role.superadmin):
        return await _get_course_for_admin(course_id, me, db)

    # Check OrgLmsStaff
    res = await db.execute(
        select(TrainingCourse)
        .where(TrainingCourse.id == course_id)
        .options(selectinload(TrainingCourse.modules))
    )
    course = res.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Kurs bulunamadı.")

    allowed_roles = LMS_EDIT_ROLES if require_edit else LMS_ALL_ROLES
    staff_res = await db.execute(
        select(OrgLmsStaff).where(
            OrgLmsStaff.org_id == course.org_id,
            OrgLmsStaff.user_id == me.id,
            OrgLmsStaff.role.in_(allowed_roles),
        )
    )
    staff = staff_res.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=403, detail="Bu kursa erişim yetkiniz yok.")
    return course


# ---------------------------------------------------------------------------
# Admin: OrgLmsStaff CRUD
# ---------------------------------------------------------------------------


class OrgLmsStaffIn(BaseModel):
    user_email: str = Field(max_length=320)
    role: str = Field(pattern="^(instructor|teaching_assistant|content_editor|department_admin|viewer)$")
    course_id: Optional[int] = None


@router.get(
    "/api/admin/lms/staff",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_lms_staff(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db, _organization_id_from_request(request), "organization:team_manage")
    res = await db.execute(
        select(OrgLmsStaff, User)
        .join(User, User.id == OrgLmsStaff.user_id)
        .where(OrgLmsStaff.org_id == org.id)
        .order_by(OrgLmsStaff.created_at.desc())
    )
    rows = res.all()
    return {
        "staff": [
            {
                "id": s.id,
                "user_id": s.user_id,
                "user_email": u.email,
                "role": s.role,
                "course_id": s.course_id,
                "created_at": s.created_at.isoformat(),
            }
            for s, u in rows
        ]
    }


@router.post(
    "/api/admin/lms/staff",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def add_lms_staff(
    payload: OrgLmsStaffIn,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db, _organization_id_from_request(request), "organization:team_manage")
    # Resolve user by email
    user_res = await db.execute(
        select(User).where(func.lower(User.email) == payload.user_email.strip().lower())
    )
    target_user = user_res.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="Bu e-postada kayıtlı kullanıcı bulunamadı.")

    staff = OrgLmsStaff(
        org_id=org.id,
        user_id=target_user.id,
        role=payload.role,
        course_id=payload.course_id,
    )
    db.add(staff)
    try:
        await db.commit()
        await db.refresh(staff)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Bu kullanıcı zaten eklenmiş.")
    return {
        "id": staff.id,
        "user_id": staff.user_id,
        "user_email": target_user.email,
        "role": staff.role,
        "course_id": staff.course_id,
        "created_at": staff.created_at.isoformat(),
    }


@router.delete(
    "/api/admin/lms/staff/{staff_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def remove_lms_staff(
    staff_id: int,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db, _organization_id_from_request(request), "organization:team_manage")
    res = await db.execute(
        select(OrgLmsStaff).where(OrgLmsStaff.id == staff_id, OrgLmsStaff.org_id == org.id)
    )
    staff = res.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Personel kaydı bulunamadı.")
    await db.delete(staff)
    await db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Admin: Course CRUD
# ---------------------------------------------------------------------------


@router.get(
    "/api/admin/lms/courses",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_courses_admin(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db, _organization_id_from_request(request), "organization:view")
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
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db, _organization_id_from_request(request), "organization:view")
    course = TrainingCourse(
        org_id=org.id,
        title=payload.title.strip() or "Yeni Kurs",
        description=payload.description,
        thumbnail_url=payload.thumbnail_url,
        category=payload.category,
        course_code=payload.course_code,
        department=payload.department,
        term=payload.term,
        section=payload.section,
        credits=payload.credits,
        capacity=payload.capacity,
        enrollment_policy=payload.enrollment_policy,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
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
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    course = await _get_course_for_admin(course_id, me, db, _organization_id_from_request(request))
    return _course_to_dict(course, include_modules=True)


@router.patch(
    "/api/admin/lms/courses/{course_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_course(
    course_id: int,
    payload: CoursePatch,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    course = await _get_course_for_admin(course_id, me, db, _organization_id_from_request(request))
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
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    course = await _get_course_for_admin(course_id, me, db, _organization_id_from_request(request))
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
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    course = await _get_course_for_admin(course_id, me, db, _organization_id_from_request(request))
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
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_for_admin(course_id, me, db, _organization_id_from_request(request))
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
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_course_for_admin(course_id, me, db, _organization_id_from_request(request))
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
                "cert_pdf_url": enr.cert_pdf_url,
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

    import asyncio
    asyncio.create_task(
        _dispatch_lms_automation(
            "lms_course_enrolled",
            member.email or "",
            member.display_name or member.email or "Katılımcı",
            course.title,
            course.org_id,
        )
    )

    return {"enrollment_id": enr.id, "progress_pct": 0}


@router.post("/api/public/courses/{course_id}/modules/{module_id}/complete")
async def complete_module(
    course_id: int,
    module_id: int,
    background_tasks: BackgroundTasks,
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
    newly_completed = pct == 100 and enr.completed_at is None
    if newly_completed:
        enr.completed_at = now

    await db.commit()

    # Trigger certificate + automation on first completion
    if newly_completed:
        member_name = member.display_name or member.email or "Katılımcı"
        member_email = member.email or ""
        if course.cert_template_url and not enr.cert_pdf_url:
            background_tasks.add_task(_issue_lms_course_cert, enr.id, member_name)
        background_tasks.add_task(
            _dispatch_lms_automation,
            "lms_course_completed",
            member_email,
            member_name,
            course.title,
            course.org_id,
        )

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
    member_ids = [e.member_id for e in enrollments]
    members: dict[int, PublicMember] = {}
    if member_ids:
        member_rows = await db.execute(select(PublicMember).where(PublicMember.id.in_(member_ids)))
        members = {m.id: m for m in member_rows.scalars().all()}
    return {
        "enrollments": [
            {
                "id": e.id,
                "member_id": e.member_id,
                "member_email": members[e.member_id].email if e.member_id in members else None,
                "member_name": members[e.member_id].display_name if e.member_id in members else None,
                "enrolled_at": e.enrolled_at.isoformat(),
                "completed_at": e.completed_at.isoformat() if e.completed_at else None,
                "progress_pct": e.progress_pct,
                "final_grade": e.final_grade,
                "status": e.status,
            }
            for e in enrollments
        ]
    }


@router.post("/api/admin/lms/courses/{course_id}/enrollments/import")
async def import_course_enrollments(
    course_id: int,
    payload: EnrollmentImportIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    course = await _get_course_for_admin(course_id, me, db)
    existing_count = (await db.execute(
        select(func.count()).where(CourseEnrollment.course_id == course_id)
    )).scalar_one()

    created_members = 0
    created_enrollments = 0
    skipped: list[dict[str, str]] = []
    seen_emails: set[str] = set()

    for row in payload.students:
        email = row.email.strip().lower()
        if not email or "@" not in email:
            skipped.append({"email": row.email, "reason": "invalid_email"})
            continue
        if email in seen_emails:
            skipped.append({"email": email, "reason": "duplicate_in_import"})
            continue
        seen_emails.add(email)

        if course.capacity is not None and existing_count + created_enrollments >= course.capacity:
            skipped.append({"email": email, "reason": "capacity_full"})
            continue

        member = (await db.execute(select(PublicMember).where(PublicMember.email == email))).scalar_one_or_none()
        if not member:
            token = make_email_token({"email": email, "action": "public_member_verify"})
            member = PublicMember(
                public_id=await _generate_public_member_public_id(db),
                email=email,
                display_name=(row.display_name or email.split("@")[0]).strip()[:120],
                headline=row.student_no,
                bio=row.department,
                password_hash=hash_password(secrets.token_urlsafe(32)),
                is_verified=False,
                verification_token=token,
            )
            db.add(member)
            await db.flush()
            created_members += 1
        elif member.deleted_at is not None:
            member.deleted_at = None
            if row.display_name:
                member.display_name = row.display_name.strip()[:120]

        exists = (await db.execute(
            select(CourseEnrollment.id).where(
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.member_id == member.id,
            )
        )).scalar_one_or_none()
        if exists:
            skipped.append({"email": email, "reason": "already_enrolled"})
            continue

        db.add(CourseEnrollment(course_id=course_id, member_id=member.id))
        created_enrollments += 1

    await db.commit()
    return {
        "created_members": created_members,
        "created_enrollments": created_enrollments,
        "skipped": skipped,
        "capacity": course.capacity,
    }


@router.post("/api/admin/lms/courses/{course_id}/enrollments/invite")
async def invite_course_enrollments(
    course_id: int,
    payload: EnrollmentInviteIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    course = await _get_course_for_admin(course_id, me, db)
    stmt = select(CourseEnrollment).where(CourseEnrollment.course_id == course_id)
    if payload.enrollment_ids:
        stmt = stmt.where(CourseEnrollment.id.in_(payload.enrollment_ids))
    enrollments = (await db.execute(stmt)).scalars().all()
    if not enrollments:
        return {"sent": 0, "skipped": []}

    member_ids = [e.member_id for e in enrollments]
    members = (await db.execute(select(PublicMember).where(PublicMember.id.in_(member_ids)))).scalars().all()
    by_id = {m.id: m for m in members}
    skipped: list[dict[str, str]] = []
    sent = 0

    for enrollment in enrollments:
        member = by_id.get(enrollment.member_id)
        if not member or not member.email:
            skipped.append({"member_id": str(enrollment.member_id), "reason": "missing_email"})
            continue
        login_link = f"{settings.frontend_base_url.rstrip('/')}/login?mode=member"
        if not member.is_verified and not member.verification_token:
            member.verification_token = make_email_token({"email": member.email, "action": "public_member_verify"})
        verify_link = f"{settings.frontend_base_url.rstrip('/')}/member/verify-email?token={member.verification_token}" if not member.is_verified else login_link
        subject = f"{course.title} kurs davetiniz"
        body = f"""
        <p>Merhaba {member.display_name or member.email},</p>
        <p><strong>{course.title}</strong> kursuna kaydiniz olusturuldu.</p>
        <p>Ogrenci hesabinizla giris yapmak icin once e-postanizi dogrulayin:</p>
        <p><a href="{verify_link}">E-postayi dogrula</a></p>
        <p>Daha once dogruladiysaniz buradan giris yapabilirsiniz: <a href="{login_link}">{login_link}</a></p>
        """
        await send_email_async(member.email, subject, body)
        sent += 1

    await db.commit()
    return {"sent": sent, "skipped": skipped}


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
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db, _organization_id_from_request(request), "organization:view")
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
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db, _organization_id_from_request(request), "organization:view")
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


@router.get(
    "/api/admin/lms/journeys/{journey_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def get_journey(
    journey_id: int,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db, _organization_id_from_request(request), "organization:view")
    res = await db.execute(
        select(LmsJourney)
        .where(LmsJourney.id == journey_id, LmsJourney.org_id == org.id)
        .options(selectinload(LmsJourney.steps))
    )
    journey = res.scalar_one_or_none()
    if not journey:
        raise HTTPException(status_code=404, detail="Öğrenme yolu bulunamadı.")
    return _journey_to_dict(journey)


@router.patch(
    "/api/admin/lms/journeys/{journey_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_journey(
    journey_id: int,
    payload: JourneyPatch,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db, _organization_id_from_request(request), "organization:view")
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
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_for_user(me, db, _organization_id_from_request(request), "organization:view")
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


@router.get("/api/public/my-courses")
async def my_enrolled_courses(
    db: AsyncSession = Depends(get_db),
    member: CurrentPublicMember = Depends(get_current_public_member),
):
    from sqlalchemy.orm import joinedload

    res = await db.execute(
        select(CourseEnrollment)
        .where(CourseEnrollment.member_id == member.id)
        .options(
            selectinload(CourseEnrollment.module_progress),
            joinedload(CourseEnrollment.course).selectinload(TrainingCourse.modules),
        )
        .order_by(CourseEnrollment.enrolled_at.desc())
    )
    enrollments = res.unique().scalars().all()

    result = []
    for enr in enrollments:
        course = enr.course
        if not course:
            continue
        completed_module_ids = [mp.module_id for mp in enr.module_progress if mp.completed_at]
        d = _course_to_dict(course)
        d["enrollment"] = {
            "id": enr.id,
            "status": enr.status,
            "progress_pct": enr.progress_pct,
            "completed_at": enr.completed_at.isoformat() if enr.completed_at else None,
            "enrolled_at": enr.enrolled_at.isoformat() if enr.enrolled_at else None,
            "completed_module_ids": completed_module_ids,
            "final_grade": enr.final_grade,
            "cert_pdf_url": enr.cert_pdf_url,
        }
        result.append(d)

    in_progress = sum(1 for r in result if r["enrollment"]["progress_pct"] > 0 and not r["enrollment"]["completed_at"])
    completed = sum(1 for r in result if r["enrollment"]["completed_at"])

    return {
        "courses": result,
        "stats": {
            "total": len(result),
            "in_progress": in_progress,
            "completed": completed,
        },
    }
