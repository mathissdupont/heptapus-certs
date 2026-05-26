from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from .main import (
    Base,
    CurrentUser,
    JSONB,
    Organization,
    Role,
    User,
    _get_or_create_admin_organization,
    get_current_user,
    get_db,
    require_role,
    write_audit_log,
)


router = APIRouter()

ORGANIZATION_MEMBER_ROLES = {"manager", "venue_manager", "event_manager", "profile_manager", "viewer"}
ORGANIZATION_MEMBER_STATUSES = {"active", "disabled"}
ORGANIZATION_PERMISSION_LABELS = {
    "organization:view": "Kurumu goruntuleyebilir",
    "organization:team_manage": "Kurum calisanlarini ve yetkilerini yonetebilir",
    "organization:profile_write": "Kurum profilini duzenleyebilir",
    "venues:read": "Salonlari goruntuleyebilir",
    "venues:write": "Salonlari duzenleyebilir",
    "reservations:read": "Rezervasyon takvimini goruntuleyebilir",
    "reservations:write": "Salon rezervasyonlarini yonetebilir",
    "events:manage": "Kurum etkinliklerini yonetebilir",
}
ORGANIZATION_ROLE_PERMISSIONS = {
    "manager": set(ORGANIZATION_PERMISSION_LABELS.keys()),
    "venue_manager": {"organization:view", "venues:read", "venues:write", "reservations:read", "reservations:write"},
    "event_manager": {"organization:view", "events:manage"},
    "profile_manager": {"organization:view", "organization:profile_write"},
    "viewer": {"organization:view", "venues:read", "reservations:read"},
}


class OrganizationMember(Base):
    __tablename__ = "organization_members"
    __table_args__ = (UniqueConstraint("organization_id", "email", name="uq_organization_member_email"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(320))
    role: Mapped[str] = mapped_column(String(32), default="viewer")
    permissions: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="active")
    invited_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


def _normalize_permissions(raw_permissions: Optional[list[str]]) -> Optional[list[str]]:
    if raw_permissions is None:
        return None
    allowed = set(ORGANIZATION_PERMISSION_LABELS.keys())
    normalized = list(dict.fromkeys(item.strip() for item in raw_permissions if item.strip()))
    invalid = [item for item in normalized if item not in allowed]
    if invalid:
        raise ValueError(f"invalid permissions: {', '.join(invalid)}")
    if "organization:view" not in normalized:
        normalized.insert(0, "organization:view")
    return normalized


def effective_organization_permissions(member: OrganizationMember) -> list[str]:
    if isinstance(member.permissions, list) and member.permissions:
        try:
            return _normalize_permissions([str(item) for item in member.permissions]) or []
        except ValueError:
            return ["organization:view"]
    return sorted(ORGANIZATION_ROLE_PERMISSIONS.get(member.role, {"organization:view"}))


def member_allows(member: OrganizationMember, permission: Optional[str]) -> bool:
    return permission is None or permission in effective_organization_permissions(member)


class OrganizationMemberIn(BaseModel):
    email: EmailStr
    role: str = Field(default="viewer", max_length=32)
    permissions: Optional[list[str]] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        role = value.strip().lower()
        if role not in ORGANIZATION_MEMBER_ROLES:
            raise ValueError(f"role must be one of: {', '.join(sorted(ORGANIZATION_MEMBER_ROLES))}")
        return role

    @field_validator("permissions")
    @classmethod
    def validate_permissions(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        return _normalize_permissions(value)


class OrganizationMemberUpdateIn(BaseModel):
    role: Optional[str] = Field(default=None, max_length=32)
    permissions: Optional[list[str]] = None
    status: Optional[str] = Field(default=None, max_length=24)

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        role = value.strip().lower()
        if role not in ORGANIZATION_MEMBER_ROLES:
            raise ValueError(f"role must be one of: {', '.join(sorted(ORGANIZATION_MEMBER_ROLES))}")
        return role

    @field_validator("permissions")
    @classmethod
    def validate_permissions(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        return _normalize_permissions(value)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        status = value.strip().lower()
        if status not in ORGANIZATION_MEMBER_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(sorted(ORGANIZATION_MEMBER_STATUSES))}")
        return status


class OrganizationMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: str
    permissions: list[str]
    status: str
    created_at: datetime
    updated_at: datetime


def _member_out(member: OrganizationMember) -> OrganizationMemberOut:
    return OrganizationMemberOut(
        id=member.id,
        email=member.email,
        role=member.role,
        permissions=effective_organization_permissions(member),
        status=member.status,
        created_at=member.created_at,
        updated_at=member.updated_at,
    )


async def _active_member_for_org(db: AsyncSession, organization_id: int, me: CurrentUser) -> Optional[OrganizationMember]:
    normalized_email = (me.email or "").strip().lower()
    result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.status == "active",
            or_(
                OrganizationMember.user_id == me.id,
                func.lower(func.trim(OrganizationMember.email)) == normalized_email,
            ),
        )
    )
    return result.scalar_one_or_none()


async def user_can_manage_owner_organization(
    db: AsyncSession,
    me: CurrentUser,
    owner_user_id: int,
    required_permission: str,
) -> bool:
    result = await db.execute(select(Organization).where(Organization.user_id == owner_user_id))
    organization = result.scalar_one_or_none()
    if organization is None:
        return False
    member = await _active_member_for_org(db, organization.id, me)
    return bool(member and member_allows(member, required_permission))


async def get_organization_for_access(
    db: AsyncSession,
    me: CurrentUser,
    required_permission: Optional[str] = "organization:view",
) -> Organization:
    result = await db.execute(select(Organization).where(Organization.user_id == me.id))
    owned = result.scalar_one_or_none()
    if owned:
        return owned

    normalized_email = (me.email or "").strip().lower()
    result = await db.execute(
        select(Organization, OrganizationMember)
        .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
        .where(
            OrganizationMember.status == "active",
            or_(
                OrganizationMember.user_id == me.id,
                func.lower(func.trim(OrganizationMember.email)) == normalized_email,
            ),
        )
        .order_by(OrganizationMember.created_at.asc())
    )
    memberships = result.all()
    for organization, member in memberships:
        if member_allows(member, required_permission):
            return organization

    if memberships:
        raise HTTPException(status_code=403, detail="Organization permission denied")
    if required_permission is None:
        raise HTTPException(status_code=403, detail="Organization access denied")
    # Owners receive an organization lazily; organization staff must first be invited.
    if not normalized_email:
        raise HTTPException(status_code=403, detail="Organization access denied")
    if required_permission == "organization:view":
        return await _get_or_create_admin_organization(db, me.id)
    owner_org = await _get_or_create_admin_organization(db, me.id)
    return owner_org


async def _member_in_manageable_organization(
    db: AsyncSession,
    me: CurrentUser,
    member_id: int,
) -> tuple[Organization, OrganizationMember]:
    organization = await get_organization_for_access(db, me, "organization:team_manage")
    result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.id == member_id,
            OrganizationMember.organization_id == organization.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Organization member not found")
    return organization, member


@router.get(
    "/api/admin/organization/team",
    response_model=list[OrganizationMemberOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_organization_members(me: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    organization = await get_organization_for_access(db, me, "organization:team_manage")
    result = await db.execute(
        select(OrganizationMember)
        .where(OrganizationMember.organization_id == organization.id)
        .order_by(OrganizationMember.created_at.asc())
    )
    return [_member_out(member) for member in result.scalars().all()]


@router.post(
    "/api/admin/organization/team",
    response_model=OrganizationMemberOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_organization_member(
    payload: OrganizationMemberIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    organization = await get_organization_for_access(db, me, "organization:team_manage")
    normalized_email = str(payload.email).strip().lower()
    if normalized_email == (me.email or "").strip().lower():
        raise HTTPException(status_code=409, detail="Organization owner cannot be added as a member")
    existing = await db.execute(
        select(OrganizationMember.id).where(
            OrganizationMember.organization_id == organization.id,
            func.lower(func.trim(OrganizationMember.email)) == normalized_email,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="This employee is already in the organization")
    user_result = await db.execute(select(User.id).where(func.lower(func.trim(User.email)) == normalized_email))
    member = OrganizationMember(
        organization_id=organization.id,
        user_id=user_result.scalar_one_or_none(),
        email=normalized_email,
        role=payload.role,
        permissions=payload.permissions,
        status="active",
        invited_by=me.id,
    )
    db.add(member)
    await db.flush()
    await write_audit_log(
        db,
        user_id=me.id,
        action="organization.member.create",
        resource_type="organization_member",
        resource_id=str(member.id),
        extra={"organization_id": organization.id, "role": member.role},
    )
    await db.commit()
    await db.refresh(member)
    return _member_out(member)


@router.patch(
    "/api/admin/organization/team/{member_id}",
    response_model=OrganizationMemberOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_organization_member(
    member_id: int,
    payload: OrganizationMemberUpdateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    organization, member = await _member_in_manageable_organization(db, me, member_id)
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(member, key, value)
    await write_audit_log(
        db,
        user_id=me.id,
        action="organization.member.update",
        resource_type="organization_member",
        resource_id=str(member.id),
        extra={"organization_id": organization.id},
    )
    await db.commit()
    await db.refresh(member)
    return _member_out(member)


@router.delete(
    "/api/admin/organization/team/{member_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_organization_member(
    member_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    organization, member = await _member_in_manageable_organization(db, me, member_id)
    await write_audit_log(
        db,
        user_id=me.id,
        action="organization.member.delete",
        resource_type="organization_member",
        resource_id=str(member.id),
        extra={"organization_id": organization.id},
    )
    await db.delete(member)
    await db.commit()
    return {"ok": True}
