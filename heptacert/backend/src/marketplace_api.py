"""Certificate Marketplace — public catalog of listed events/programs."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    CurrentUser,
    Event,
    Organization,
    Role,
    get_current_user,
    get_db,
    require_role,
)
from .organization_access_api import (
    get_organization_for_access,
    organization_id_from_request,
)
from .lms_models import TrainingCourse

router = APIRouter()

MARKETPLACE_CATEGORIES = [
    "Bilgi Teknolojileri",
    "Proje Yönetimi",
    "İnsan Kaynakları",
    "Finans & Muhasebe",
    "Pazarlama",
    "Satış",
    "Üretim & Kalite",
    "Sağlık & Güvenlik",
    "Hukuk & Uyum",
    "Kişisel Gelişim",
    "Liderlik & Yönetim",
    "Diğer",
]


class MarketplaceEventOut(BaseModel):
    id: int
    public_id: Optional[str]
    name: str
    event_date: Optional[str]
    event_location: Optional[str]
    event_banner_url: Optional[str]
    marketplace_category: Optional[str]
    marketplace_description: Optional[str]
    marketplace_price: Optional[float]
    org_name: Optional[str]
    org_logo: Optional[str]
    org_public_id: Optional[str]
    certificate_enabled: bool


class MarketplaceSettingsIn(BaseModel):
    is_marketplace_listed: bool
    marketplace_category: Optional[str] = None
    marketplace_description: Optional[str] = None
    marketplace_price: Optional[float] = None


def _event_to_out(event: Event, org: Optional[Organization] = None) -> MarketplaceEventOut:
    price = event.marketplace_price
    return MarketplaceEventOut(
        id=event.id,
        public_id=event.public_id,
        name=event.name,
        event_date=str(event.event_date) if event.event_date else None,
        event_location=event.event_location,
        event_banner_url=event.event_banner_url,
        marketplace_category=event.marketplace_category,
        marketplace_description=event.marketplace_description,
        marketplace_price=float(price) if price is not None else None,
        org_name=org.org_name if org else None,
        org_logo=org.brand_logo if org else None,
        org_public_id=org.public_id if org else None,
        certificate_enabled=bool(event.certificate_enabled),
    )


@router.get("/api/public/marketplace", response_model=list[MarketplaceEventOut])
async def list_marketplace_events(
    category: Optional[str] = Query(None),
    free_only: bool = Query(False),
    q: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Event, Organization)
        .join(Organization, Organization.user_id == Event.admin_id, isouter=True)
        .where(Event.is_marketplace_listed.is_(True))
    )
    if category:
        stmt = stmt.where(Event.marketplace_category == category)
    if free_only:
        stmt = stmt.where(
            (Event.marketplace_price.is_(None)) | (Event.marketplace_price == 0)
        )
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            Event.name.ilike(like) | Event.marketplace_description.ilike(like)
        )
    stmt = stmt.order_by(Event.created_at.desc()).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).all()
    return [_event_to_out(event, org) for event, org in rows]


@router.get("/api/public/marketplace/categories")
async def list_marketplace_categories():
    return MARKETPLACE_CATEGORIES


@router.get("/api/public/marketplace/{event_id}", response_model=MarketplaceEventOut)
async def get_marketplace_event(event_id: int, db: AsyncSession = Depends(get_db)):
    row = (
        await db.execute(
            select(Event, Organization)
            .join(Organization, Organization.user_id == Event.admin_id, isouter=True)
            .where(Event.id == event_id, Event.is_marketplace_listed.is_(True))
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Event not found in marketplace")
    return _event_to_out(row[0], row[1])


@router.patch(
    "/api/admin/events/{event_id}/marketplace",
    response_model=MarketplaceEventOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_marketplace_settings(
    event_id: int,
    payload: MarketplaceSettingsIn,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await get_organization_for_access(
        db, me, "events:manage", organization_id_from_request(request)
    )
    event = await db.get(Event, event_id)
    if not event or event.admin_id != org.user_id:
        raise HTTPException(status_code=404, detail="Event not found")

    event.is_marketplace_listed = payload.is_marketplace_listed
    if payload.marketplace_category is not None:
        event.marketplace_category = payload.marketplace_category
    if payload.marketplace_description is not None:
        event.marketplace_description = payload.marketplace_description
    event.marketplace_price = payload.marketplace_price

    await db.commit()
    await db.refresh(event)
    return _event_to_out(event, org)


# ===========================================================================
# COURSE MARKETPLACE
# ===========================================================================


def _course_to_marketplace_dict(c: TrainingCourse, org: Optional[Organization] = None) -> dict:
    return {
        "id": c.id,
        "title": c.title,
        "description": c.marketplace_description or c.description,
        "thumbnail_url": c.thumbnail_url,
        "preview_video_url": c.preview_video_url,
        "category": c.category,
        "level": c.level,
        "language": c.language,
        "price": float(c.marketplace_price) if c.marketplace_price is not None else (float(c.price) if c.price else None),
        "module_count": len(c.modules) if hasattr(c, "modules") and c.modules else 0,
        "org_name": org.org_name if org else None,
        "org_logo": org.brand_logo if org else None,
    }


@router.get("/api/public/marketplace/courses")
async def list_marketplace_courses(
    category: Optional[str] = Query(None),
    free_only: bool = Query(False),
    q: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy.orm import selectinload
    stmt = (
        select(TrainingCourse, Organization)
        .join(Organization, Organization.id == TrainingCourse.org_id, isouter=True)
        .where(
            TrainingCourse.is_marketplace_listed.is_(True),
            TrainingCourse.is_published.is_(True),
        )
        .options(selectinload(TrainingCourse.modules))
    )
    if category:
        stmt = stmt.where(TrainingCourse.category == category)
    if free_only:
        stmt = stmt.where(
            (TrainingCourse.marketplace_price.is_(None)) | (TrainingCourse.marketplace_price == 0)
        )
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            TrainingCourse.title.ilike(like) | TrainingCourse.marketplace_description.ilike(like)
        )
    stmt = stmt.order_by(TrainingCourse.created_at.desc()).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).all()
    return [_course_to_marketplace_dict(c, org) for c, org in rows]


@router.get("/api/public/marketplace/courses/{course_id}")
async def get_marketplace_course(course_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    row = (await db.execute(
        select(TrainingCourse, Organization)
        .join(Organization, Organization.id == TrainingCourse.org_id, isouter=True)
        .where(
            TrainingCourse.id == course_id,
            TrainingCourse.is_marketplace_listed.is_(True),
            TrainingCourse.is_published.is_(True),
        )
        .options(selectinload(TrainingCourse.modules))
    )).first()
    if not row:
        raise HTTPException(404, "Kurs marketplace'te bulunamadı.")
    return _course_to_marketplace_dict(row[0], row[1])


class CourseMarketplaceSettingsIn(BaseModel):
    is_marketplace_listed: bool
    marketplace_price: Optional[float] = None
    marketplace_description: Optional[str] = None
    preview_video_url: Optional[str] = None


@router.patch(
    "/api/admin/lms/courses/{course_id}/marketplace",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_course_marketplace_settings(
    course_id: int,
    payload: CourseMarketplaceSettingsIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from decimal import Decimal as _Decimal
    course = await db.get(TrainingCourse, course_id)
    if not course:
        raise HTTPException(404, "Kurs bulunamadı.")
    course.is_marketplace_listed = payload.is_marketplace_listed
    if payload.marketplace_price is not None:
        course.marketplace_price = _Decimal(str(payload.marketplace_price))
    if payload.marketplace_description is not None:
        course.marketplace_description = payload.marketplace_description
    if payload.preview_video_url is not None:
        course.preview_video_url = payload.preview_video_url
    await db.commit()
    await db.refresh(course)
    return {
        "id": course.id,
        "is_marketplace_listed": course.is_marketplace_listed,
        "marketplace_price": float(course.marketplace_price) if course.marketplace_price else None,
        "marketplace_description": course.marketplace_description,
        "preview_video_url": course.preview_video_url,
    }
