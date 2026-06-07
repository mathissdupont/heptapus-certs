"""Org-wide staff roles and invite management."""

import secrets
from datetime import datetime, timezone
from html import escape
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from .main import (
    Base,
    CurrentUser,
    Organization,
    Role,
    User,
    get_current_user,
    get_db,
    make_email_token,
    require_role,
    send_email_async,
    settings,
    verify_email_token,
)

router = APIRouter()

ORG_STAFF_ROLES = {"instructor", "teaching_assistant", "content_editor", "department_admin", "viewer"}


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------


class OrgStaff(Base):
    __tablename__ = "org_staff"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False, server_default="viewer")
    department: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    invited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class StaffInviteIn(BaseModel):
    email: EmailStr
    role: str = Field(default="viewer")
    display_name: Optional[str] = Field(default=None, max_length=200)
    department: Optional[str] = Field(default=None, max_length=200)


class StaffPatch(BaseModel):
    role: Optional[str] = None
    department: Optional[str] = Field(default=None, max_length=200)
    is_active: Optional[bool] = None


class StaffAcceptIn(BaseModel):
    token: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_org(me: CurrentUser, db: AsyncSession) -> Organization:
    res = await db.execute(select(Organization).where(Organization.user_id == me.id))
    org = res.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=404, detail="Organizasyon bulunamadı.")
    return org


async def _get_org_from_request(request: Request, me: CurrentUser, db: AsyncSession) -> Organization:
    from .organization_access_api import get_organization_for_access, organization_id_from_request

    return await get_organization_for_access(
        db,
        me,
        "organization:view",
        organization_id_from_request(request),
    )


def _staff_out(s: OrgStaff) -> dict:
    return {
        "id": s.id,
        "email": s.email,
        "display_name": s.display_name,
        "role": s.role,
        "department": s.department,
        "is_active": s.is_active,
        "joined": s.joined_at is not None,
        "invited_at": s.invited_at.isoformat() if s.invited_at else None,
        "joined_at": s.joined_at.isoformat() if s.joined_at else None,
    }


async def _send_invite_email(email: str, org_name: str, role: str, invited_by_email: str) -> None:
    token = make_email_token({"action": "org_staff_invite", "email": email.strip().lower()})
    accept_url = f"{settings.frontend_base_url.rstrip('/')}/accept-invite?token={token}"
    role_labels = {
        "instructor": "Eğitmen",
        "teaching_assistant": "Asistan Eğitmen",
        "content_editor": "İçerik Editörü",
        "department_admin": "Departman Yöneticisi",
        "viewer": "İzleyici",
    }
    role_label = role_labels.get(role, role)
    subject = f"{escape(org_name)} — HeptaCert ekip daveti"
    html = f"""
<div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#1f2937">
  <h2 style="margin:0 0 12px">Ekibe davet edildiniz</h2>
  <p><strong>{escape(org_name)}</strong> organizasyonuna <strong>{escape(role_label)}</strong>
  rolüyle eklenmek üzere davet edildiniz.</p>
  <p>Davet eden: {escape(invited_by_email)}</p>
  <p style="margin:24px 0">
    <a href="{accept_url}"
       style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">
      Daveti Kabul Et
    </a>
  </p>
  <p style="font-size:12px;color:#6b7280">
    Bu bağlantı 14 gün geçerlidir.<br>
    Beklenmedik bir davet aldıysanız bu e-postayı yoksayabilirsiniz.
  </p>
</div>"""
    await send_email_async(to_email=email, subject=subject, html_body=html)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/api/admin/org/staff",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_staff(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_from_request(request, me, db)
    res = await db.execute(
        select(OrgStaff)
        .where(OrgStaff.org_id == org.id)
        .order_by(OrgStaff.invited_at.desc())
    )
    staff = res.scalars().all()
    return {"staff": [_staff_out(s) for s in staff]}


@router.post(
    "/api/admin/org/staff/invite",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def invite_staff(
    payload: StaffInviteIn,
    background_tasks: BackgroundTasks,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.role not in ORG_STAFF_ROLES:
        raise HTTPException(status_code=400, detail=f"Geçersiz rol. Seçenekler: {', '.join(sorted(ORG_STAFF_ROLES))}")

    org = await _get_org_from_request(request, me, db)
    normalized = payload.email.strip().lower()

    # Check for existing active staff
    existing = (await db.execute(
        select(OrgStaff).where(OrgStaff.org_id == org.id, OrgStaff.email == normalized)
    )).scalar_one_or_none()

    if existing:
        # Re-send invite if not yet joined
        if existing.joined_at is None:
            background_tasks.add_task(_send_invite_email, normalized, org.org_name, existing.role, me.email)
            return {**_staff_out(existing), "resent": True}
        raise HTTPException(status_code=409, detail="Bu e-posta zaten ekipte.")

    staff = OrgStaff(
        org_id=org.id,
        email=normalized,
        display_name=payload.display_name,
        role=payload.role,
        department=payload.department,
        is_active=True,
    )
    db.add(staff)
    await db.commit()
    await db.refresh(staff)

    background_tasks.add_task(_send_invite_email, normalized, org.org_name, payload.role, me.email)
    return _staff_out(staff)


@router.patch(
    "/api/admin/org/staff/{staff_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_staff(
    staff_id: int,
    payload: StaffPatch,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_from_request(request, me, db)
    res = await db.execute(
        select(OrgStaff).where(OrgStaff.id == staff_id, OrgStaff.org_id == org.id)
    )
    staff = res.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Personel bulunamadı.")
    if payload.role is not None:
        if payload.role not in ORG_STAFF_ROLES:
            raise HTTPException(status_code=400, detail="Geçersiz rol.")
        staff.role = payload.role
    if payload.department is not None:
        staff.department = payload.department
    if payload.is_active is not None:
        staff.is_active = payload.is_active
    await db.commit()
    await db.refresh(staff)
    return _staff_out(staff)


@router.delete(
    "/api/admin/org/staff/{staff_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def remove_staff(
    staff_id: int,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org_from_request(request, me, db)
    res = await db.execute(
        select(OrgStaff).where(OrgStaff.id == staff_id, OrgStaff.org_id == org.id)
    )
    staff = res.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Personel bulunamadı.")
    await db.delete(staff)
    await db.commit()
    return {"ok": True}


@router.post("/api/org/staff/accept")
async def accept_staff_invite(
    payload: StaffAcceptIn,
    db: AsyncSession = Depends(get_db),
):
    try:
        data = verify_email_token(payload.token, max_age=60 * 60 * 24 * 14)
    except Exception:
        raise HTTPException(status_code=400, detail="Davet bağlantısı geçersiz veya süresi dolmuş.")

    if data.get("action") != "org_staff_invite":
        raise HTTPException(status_code=400, detail="Geçersiz davet türü.")

    email = data.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Davet verisinde e-posta eksik.")

    res = await db.execute(
        select(OrgStaff).where(OrgStaff.email == email, OrgStaff.joined_at.is_(None))
    )
    staff = res.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Davet bulunamadı veya zaten kabul edildi.")

    # Link to user account if one exists
    user_res = await db.execute(select(User).where(func.lower(User.email) == email))
    user = user_res.scalar_one_or_none()
    if user:
        staff.user_id = user.id
        if not staff.display_name:
            staff.display_name = user.email

    staff.joined_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(staff)
    return {"ok": True, "role": staff.role, "email": staff.email}
