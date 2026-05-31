"""Organization certificate template preset endpoints."""

from datetime import datetime
from typing import Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    CurrentUser,
    EventOut,
    Organization,
    CertificateTemplatePreset,
    Role,
    _event_to_out,
    _get_event_for_admin,
    get_current_user,
    get_db,
    require_role,
)

router = APIRouter()


class CertificateTemplatePresetIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class CertificateTemplatePresetOut(BaseModel):
    id: str
    name: str
    template_image_url: Optional[str] = None
    config: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


def _preset_key(scope: str, scope_id: int) -> str:
    return f"certificate_template_presets:{scope}:{scope_id}"


async def _owner_scope(db: AsyncSession, me: CurrentUser) -> tuple[str, int]:
    org_res = await db.execute(select(Organization.id).where(Organization.user_id == me.id))
    org_id = org_res.scalar_one_or_none()
    if org_id:
        return "org", int(org_id)
    return "user", me.id


async def _load_presets(db: AsyncSession, scope: str, scope_id: int) -> list[CertificateTemplatePreset]:
    rows_res = await db.execute(
        select(CertificateTemplatePreset)
        .where(CertificateTemplatePreset.scope_type == scope, CertificateTemplatePreset.scope_id == scope_id)
        .order_by(CertificateTemplatePreset.created_at.desc())
    )
    return rows_res.scalars().all()


def _serialize_preset(item: CertificateTemplatePreset) -> CertificateTemplatePresetOut:
    return CertificateTemplatePresetOut(
        id=item.id,
        name=item.name,
        template_image_url=item.template_image_url,
        config=dict(item.config or {}),
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get(
    "/api/admin/certificate-template-presets",
    response_model=list[CertificateTemplatePresetOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_certificate_template_presets(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    scope, scope_id = await _owner_scope(db, me)
    presets = await _load_presets(db, scope, scope_id)
    return [_serialize_preset(item) for item in presets]


@router.post(
    "/api/admin/events/{event_id}/certificate-template-presets",
    response_model=CertificateTemplatePresetOut,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def save_event_certificate_template_preset(
    event_id: int,
    payload: CertificateTemplatePresetIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "certificates:write")
    scope, scope_id = await _owner_scope(db, me)
    preset = CertificateTemplatePreset(
        id=uuid4().hex,
        scope_type=scope,
        scope_id=scope_id,
        name=payload.name.strip(),
        template_image_url=event.template_image_url,
        config=dict(event.config or {}),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(preset)
    await db.commit()
    await db.refresh(preset)
    return _serialize_preset(preset)


@router.post(
    "/api/admin/events/{event_id}/certificate-template-presets/{preset_id}/apply",
    response_model=EventOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def apply_certificate_template_preset(
    event_id: int,
    preset_id: str,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "certificates:write")
    scope, scope_id = await _owner_scope(db, me)
    preset_res = await db.execute(
        select(CertificateTemplatePreset).where(
            CertificateTemplatePreset.id == preset_id,
            CertificateTemplatePreset.scope_type == scope,
            CertificateTemplatePreset.scope_id == scope_id,
        )
    )
    preset = preset_res.scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail="Certificate template preset not found")

    if preset.template_image_url:
        event.template_image_url = preset.template_image_url
    event.config = dict(preset.config or {})
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return _event_to_out(event)


@router.delete(
    "/api/admin/certificate-template-presets/{preset_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_certificate_template_preset(
    preset_id: str,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    scope, scope_id = await _owner_scope(db, me)
    preset_res = await db.execute(
        select(CertificateTemplatePreset).where(
            CertificateTemplatePreset.id == preset_id,
            CertificateTemplatePreset.scope_type == scope,
            CertificateTemplatePreset.scope_id == scope_id,
        )
    )
    preset = preset_res.scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail="Certificate template preset not found")
    await db.delete(preset)
    await db.commit()
    return {"ok": True}
