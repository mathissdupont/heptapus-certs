"""API key scope management — extends the existing /api/admin/api-keys endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .main import (
    ApiKey,
    CurrentUser,
    Role,
    get_current_user,
    get_db,
    require_role,
)

router = APIRouter()

# Grantable API-key scopes derive from the single source of truth in services.py
# so they can never drift out of sync with the scope-enforcement mapper
# (_required_scope_for_request). Previously this list omitted sessions/checkin/
# automations, which made those endpoints unreachable for any scoped key.
from .services import GRANTABLE_SCOPES as API_SCOPES


class ApiKeyUpdateIn(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    scopes: Optional[list[str]] = None
    is_active: Optional[bool] = None


class ApiKeyCreateFullIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    scopes: list[str] = Field(default_factory=list)
    expires_days: Optional[int] = Field(None, ge=1, le=3650)
    rate_limit_per_min: Optional[int] = Field(None, ge=10, le=10000)


class ApiKeyOutFull(BaseModel):
    id: int
    name: str
    key_prefix: str
    scopes: list[str]
    is_active: bool
    rate_limit_per_min: Optional[int]
    last_used_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime


@router.get("/api/admin/api-keys/scopes")
async def list_api_scopes(
    _: CurrentUser = Depends(get_current_user),
):
    return [{"value": k, "label": v} for k, v in API_SCOPES.items()]


@router.get(
    "/api/admin/api-keys/v2",
    response_model=list[ApiKeyOutFull],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_api_keys_full(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(ApiKey)
            .where(ApiKey.user_id == me.id)
            .order_by(ApiKey.created_at.desc())
        )
    ).scalars().all()
    return [_to_out(k) for k in rows]


@router.post(
    "/api/admin/api-keys/v2",
    response_model=dict,
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_api_key_with_scopes(
    payload: "ApiKeyCreateFullIn",
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import secrets as _secrets
    from datetime import timedelta

    valid_scopes = [s for s in (payload.scopes or []) if s in API_SCOPES]
    rand_prefix = _secrets.token_hex(4)
    full_key = f"hc_{rand_prefix}_{_secrets.token_urlsafe(32)}"
    key_prefix = full_key[:16]
    expires_at = None
    if payload.expires_days is not None:
        expires_at = datetime.now(timezone.utc) + timedelta(days=payload.expires_days)

    from hashlib import sha256
    key_hash = sha256(full_key.encode()).hexdigest()

    api_key = ApiKey(
        user_id=me.id,
        name=payload.name.strip(),
        key_prefix=key_prefix,
        key_hash=key_hash,
        scopes=valid_scopes,
        is_active=True,
        expires_at=expires_at,
        rate_limit_per_min=payload.rate_limit_per_min,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    out = _to_out(api_key)
    return {**out.model_dump(), "full_key": full_key}


@router.patch(
    "/api/admin/api-keys/{key_id}/scopes",
    response_model=ApiKeyOutFull,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_api_key(
    key_id: int,
    payload: ApiKeyUpdateIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    key = (
        await db.execute(
            select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == me.id)
        )
    ).scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")

    if payload.name is not None:
        key.name = payload.name.strip()
    if payload.scopes is not None:
        key.scopes = [s for s in payload.scopes if s in API_SCOPES]
    if payload.is_active is not None:
        key.is_active = payload.is_active

    await db.commit()
    await db.refresh(key)
    return _to_out(key)


def _to_out(k: ApiKey) -> ApiKeyOutFull:
    return ApiKeyOutFull(
        id=k.id,
        name=k.name,
        key_prefix=k.key_prefix,
        scopes=list(k.scopes or []),
        is_active=bool(k.is_active),
        rate_limit_per_min=k.rate_limit_per_min,
        last_used_at=k.last_used_at,
        expires_at=k.expires_at,
        created_at=k.created_at,
    )
