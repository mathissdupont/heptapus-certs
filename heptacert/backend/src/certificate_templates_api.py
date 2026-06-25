"""Organization certificate template preset endpoints."""

import hashlib
import json
import os
from datetime import datetime
from typing import Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    CurrentUser,
    EventOut,
    Organization,
    CertificateTemplatePreset,
    CertificateTemplatePresetVersion,
    CertificateTemplateRegressionSnapshot,
    Role,
    Subscription,
    _event_to_out,
    _get_event_for_admin,
    get_current_user,
    get_db,
    require_role,
)

router = APIRouter()


class CertificateTemplatePresetIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    enterprise_locked: bool = False
    min_plan: str = Field(default="growth", pattern="^(growth|enterprise)$")


class CertificateTemplatePresetOut(BaseModel):
    id: str
    name: str
    template_image_url: Optional[str] = None
    config: dict[str, Any] = Field(default_factory=dict)
    min_plan: str = "growth"
    enterprise_locked: bool = False
    version: int = 1
    created_at: datetime
    updated_at: datetime


class TemplateVersionOut(BaseModel):
    version: int
    created_at: datetime


class TemplateRegressionSnapshotOut(BaseModel):
    id: int
    scenario: str
    render_hash: str
    created_at: datetime


def _validate_template_config(config: dict[str, Any]) -> None:
    raw_fields = config.get("textFields") or config.get("fields") or []
    if raw_fields and not isinstance(raw_fields, list):
        raise HTTPException(status_code=400, detail="Template fields must be a list")
    if isinstance(raw_fields, list) and len(raw_fields) > 80:
        raise HTTPException(status_code=400, detail="Template has too many fields")
    for field in raw_fields:
        if not isinstance(field, dict):
            raise HTTPException(status_code=400, detail="Template fields must be objects")
        for coord in ("x", "y"):
            value = field.get(coord)
            if value is not None and (not isinstance(value, (int, float)) or value < -5000 or value > 5000):
                raise HTTPException(status_code=400, detail="Template field coordinates are out of bounds")
        for size_key in ("fontSize", "width", "height"):
            value = field.get(size_key)
            if value is not None and (not isinstance(value, (int, float)) or value < 0 or value > 5000):
                raise HTTPException(status_code=400, detail="Template field sizes are out of bounds")


async def _has_enterprise(db: AsyncSession, user_id: int) -> bool:
    sub = (
        await db.execute(
            select(Subscription)
            .where(Subscription.user_id == user_id, Subscription.is_active.is_(True))
            .order_by(Subscription.expires_at.desc())
        )
    ).scalar_one_or_none()
    return bool(sub and sub.plan_id == "enterprise")


def _preset_key(scope: str, scope_id: int) -> str:
    return f"certificate_template_presets:{scope}:{scope_id}"


async def _owner_scope(
    db: AsyncSession,
    me: CurrentUser,
    request: Optional[Request] = None,
    required_permission: str = "organization:view",
) -> tuple[str, int]:
    """Preset kapsamini AKTIF org context'ine (X-Organization-Id) gore cozer.

    Kullanici baska bir kurumun uyesiyse preset'ler o kurumun kapsaminda olmali
    (kendi bos org'unda degil). Eskiden yalnizca cagiranin SAHIP oldugu org'a
    cozuluyordu; bu yuzden bir uye, uyesi oldugu kurumda preset goremiyor/
    yonetemiyordu. Kurum sahibi her zaman tam erisir (get_organization_for_access
    sahip kullaniciyi izin kontrolunden muaf tutar).
    """
    from .organization_access_api import get_organization_for_access, organization_id_from_request

    org_id_hint = organization_id_from_request(request) if request is not None else None
    org = await get_organization_for_access(db, me, required_permission, org_id_hint)
    return "org", int(org.id)


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
        min_plan=item.min_plan,
        enterprise_locked=bool(item.enterprise_locked),
        version=int(item.version or 1),
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get(
    "/api/admin/certificate-template-presets",
    response_model=list[CertificateTemplatePresetOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_certificate_template_presets(
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    scope, scope_id = await _owner_scope(db, me, request)
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
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "certificates:write")
    _validate_template_config(dict(event.config or {}))
    if payload.enterprise_locked and not await _has_enterprise(db, me.id):
        raise HTTPException(status_code=403, detail="Enterprise plan is required for locked organization presets")
    # Yetki zaten _get_event_for_admin ile dogrulandi; burada yalnizca aktif org kapsamini cozuyoruz.
    scope, scope_id = await _owner_scope(db, me, request)
    preset = CertificateTemplatePreset(
        id=uuid4().hex,
        scope_type=scope,
        scope_id=scope_id,
        name=payload.name.strip(),
        template_image_url=event.template_image_url,
        config=dict(event.config or {}),
        min_plan=payload.min_plan,
        enterprise_locked=payload.enterprise_locked,
        version=1,
        locked_by=me.id if payload.enterprise_locked else None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(preset)
    db.add(
        CertificateTemplatePresetVersion(
            preset_id=preset.id,
            version=1,
            template_image_url=preset.template_image_url,
            config=dict(preset.config or {}),
            created_by=me.id,
        )
    )
    for scenario in ("short_name", "long_name", "turkish_chars"):
        payload_hash = hashlib.sha256(json.dumps({"scenario": scenario, "config": preset.config}, sort_keys=True, default=str).encode()).hexdigest()
        db.add(CertificateTemplateRegressionSnapshot(preset_id=preset.id, scenario=scenario, render_hash=payload_hash, payload={"scenario": scenario}))
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
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await _get_event_for_admin(event_id, me, db, "certificates:write")
    scope, scope_id = await _owner_scope(db, me, request)
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
    if preset.enterprise_locked and not await _has_enterprise(db, event.admin_id):
        raise HTTPException(status_code=403, detail="This preset is locked to Enterprise organizations")

    if preset.template_image_url:
        event.template_image_url = preset.template_image_url
    event.config = dict(preset.config or {})
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return _event_to_out(event)


@router.get(
    "/api/admin/certificate-template-presets/{preset_id}/versions",
    response_model=list[TemplateVersionOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_certificate_template_preset_versions(
    preset_id: str,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    scope, scope_id = await _owner_scope(db, me, request)
    preset = (await db.execute(select(CertificateTemplatePreset).where(CertificateTemplatePreset.id == preset_id, CertificateTemplatePreset.scope_type == scope, CertificateTemplatePreset.scope_id == scope_id))).scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail="Certificate template preset not found")
    rows = (await db.execute(select(CertificateTemplatePresetVersion).where(CertificateTemplatePresetVersion.preset_id == preset_id).order_by(CertificateTemplatePresetVersion.version.desc()))).scalars().all()
    return [TemplateVersionOut(version=row.version, created_at=row.created_at) for row in rows]


@router.post(
    "/api/admin/certificate-template-presets/{preset_id}/rollback/{version}",
    response_model=CertificateTemplatePresetOut,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def rollback_certificate_template_preset(
    preset_id: str,
    version: int,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    scope, scope_id = await _owner_scope(db, me, request, "events:manage")
    preset = (await db.execute(select(CertificateTemplatePreset).where(CertificateTemplatePreset.id == preset_id, CertificateTemplatePreset.scope_type == scope, CertificateTemplatePreset.scope_id == scope_id))).scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail="Certificate template preset not found")
    version_row = (await db.execute(select(CertificateTemplatePresetVersion).where(CertificateTemplatePresetVersion.preset_id == preset_id, CertificateTemplatePresetVersion.version == version))).scalar_one_or_none()
    if not version_row:
        raise HTTPException(status_code=404, detail="Template version not found")
    _validate_template_config(dict(version_row.config or {}))
    preset.template_image_url = version_row.template_image_url
    preset.config = dict(version_row.config or {})
    preset.version = int(preset.version or 1) + 1
    preset.updated_at = datetime.utcnow()
    db.add(CertificateTemplatePresetVersion(preset_id=preset.id, version=preset.version, template_image_url=preset.template_image_url, config=preset.config, created_by=me.id))
    await db.commit()
    await db.refresh(preset)
    return _serialize_preset(preset)


@router.get(
    "/api/admin/certificate-template-presets/{preset_id}/snapshots",
    response_model=list[TemplateRegressionSnapshotOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_certificate_template_snapshots(
    preset_id: str,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    scope, scope_id = await _owner_scope(db, me, request)
    preset = (await db.execute(select(CertificateTemplatePreset).where(CertificateTemplatePreset.id == preset_id, CertificateTemplatePreset.scope_type == scope, CertificateTemplatePreset.scope_id == scope_id))).scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail="Certificate template preset not found")
    rows = (await db.execute(select(CertificateTemplateRegressionSnapshot).where(CertificateTemplateRegressionSnapshot.preset_id == preset_id).order_by(CertificateTemplateRegressionSnapshot.created_at.desc()))).scalars().all()
    return [TemplateRegressionSnapshotOut(id=row.id, scenario=row.scenario, render_hash=row.render_hash, created_at=row.created_at) for row in rows]


@router.get(
    "/api/admin/certificate-template-presets/builtin",
    response_model=list[CertificateTemplatePresetOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
    summary="List built-in (platform-level) certificate template presets",
)
async def list_builtin_certificate_template_presets(
    db: AsyncSession = Depends(get_db),
):
    """Return the platform-wide built-in templates seeded at startup."""
    rows = (
        await db.execute(
            select(CertificateTemplatePreset)
            .where(CertificateTemplatePreset.scope_type == "builtin")
            .order_by(CertificateTemplatePreset.created_at)
        )
    ).scalars().all()
    return [_serialize_preset(row) for row in rows]


@router.delete(
    "/api/admin/certificate-template-presets/{preset_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_certificate_template_preset(
    preset_id: str,
    request: Request,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    scope, scope_id = await _owner_scope(db, me, request, "events:manage")
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
