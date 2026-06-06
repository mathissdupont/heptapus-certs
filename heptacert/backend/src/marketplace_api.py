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
