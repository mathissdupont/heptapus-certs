from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from .main import Base, CurrentUser, Organization, Role, get_current_user, get_db, require_role, write_audit_log
from .organization_access_api import get_organization_for_access, organization_id_from_request


router = APIRouter()


class OrganizationVenue(Base):
    __tablename__ = "organization_venues"
    __table_args__ = (UniqueConstraint("organization_id", "name", name="uq_organization_venue_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(150))
    capacity: Mapped[int] = mapped_column(Integer)
    location: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class VenueIn(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    capacity: int = Field(ge=1, le=1_000_000)
    location: Optional[str] = Field(default=None, max_length=300)
    notes: Optional[str] = Field(default=None, max_length=1000)
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Venue name is too short")
        return cleaned

    @field_validator("location", "notes")
    @classmethod
    def strip_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class VenueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    name: str
    capacity: int
    location: Optional[str]
    notes: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime


async def _organization_for_user(db: AsyncSession, me: CurrentUser, permission: str, organization_id: Optional[int] = None) -> Organization:
    return await get_organization_for_access(db, me, permission, organization_id)


async def _venue_owned_by_user(db: AsyncSession, me: CurrentUser, venue_id: int, permission: str, organization_id: Optional[int] = None) -> OrganizationVenue:
    organization = await _organization_for_user(db, me, permission, organization_id)
    result = await db.execute(
        select(OrganizationVenue).where(
            OrganizationVenue.id == venue_id,
            OrganizationVenue.organization_id == organization.id,
        )
    )
    venue = result.scalar_one_or_none()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    return venue


async def _ensure_unique_name(
    db: AsyncSession,
    organization_id: int,
    name: str,
    exclude_id: Optional[int] = None,
) -> None:
    query = select(OrganizationVenue.id).where(
        OrganizationVenue.organization_id == organization_id,
        func.lower(func.trim(OrganizationVenue.name)) == name.lower(),
    )
    if exclude_id is not None:
        query = query.where(OrganizationVenue.id != exclude_id)
    if (await db.execute(query)).scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="A venue with this name already exists")


@router.get(
    "/api/admin/organization/venues",
    response_model=list[VenueOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_venues(request: Request, me: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    organization = await _organization_for_user(db, me, "venues:read", organization_id_from_request(request))
    result = await db.execute(
        select(OrganizationVenue)
        .where(OrganizationVenue.organization_id == organization.id)
        .order_by(OrganizationVenue.is_active.desc(), OrganizationVenue.name.asc())
    )
    return list(result.scalars().all())


@router.post(
    "/api/admin/organization/venues",
    response_model=VenueOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_venue(payload: VenueIn, request: Request, me: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    organization = await _organization_for_user(db, me, "venues:write", organization_id_from_request(request))
    await _ensure_unique_name(db, organization.id, payload.name)
    venue = OrganizationVenue(organization_id=organization.id, **payload.model_dump())
    db.add(venue)
    await db.flush()
    await write_audit_log(
        db,
        user_id=me.id,
        action="organization.venue.create",
        resource_type="organization_venue",
        resource_id=str(venue.id),
        extra={"organization_id": organization.id},
    )
    await db.commit()
    await db.refresh(venue)
    return venue


@router.patch(
    "/api/admin/organization/venues/{venue_id}",
    response_model=VenueOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_venue(
    venue_id: int,
    payload: VenueIn,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    venue = await _venue_owned_by_user(db, me, venue_id, "venues:write", organization_id_from_request(request))
    await _ensure_unique_name(db, venue.organization_id, payload.name, exclude_id=venue.id)
    for key, value in payload.model_dump().items():
        setattr(venue, key, value)
    await write_audit_log(
        db,
        user_id=me.id,
        action="organization.venue.update",
        resource_type="organization_venue",
        resource_id=str(venue.id),
        extra={"organization_id": venue.organization_id},
    )
    await db.commit()
    await db.refresh(venue)
    return venue


@router.delete(
    "/api/admin/organization/venues/{venue_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_venue(venue_id: int, request: Request, me: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    venue = await _venue_owned_by_user(db, me, venue_id, "venues:write", organization_id_from_request(request))
    await write_audit_log(
        db,
        user_id=me.id,
        action="organization.venue.delete",
        resource_type="organization_venue",
        resource_id=str(venue.id),
        extra={"organization_id": venue.organization_id},
    )
    await db.delete(venue)
    await db.commit()
    return {"ok": True}
