"""SSO / OAuth2 configuration API — per-org Google/Microsoft/custom OAuth2 login."""

import json
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from .main import (
    Base,
    CurrentUser,
    Organization,
    Role,
    get_current_user,
    get_db,
    make_email_token,
    require_role,
    settings,
    verify_email_token,
    PublicMember,
    hash_password,
    create_public_member_access_token,
    func,
)
import secrets as _secrets

router = APIRouter()

SSO_PROVIDERS = {
    "google": {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v3/userinfo",
        "scope": "openid email profile",
    },
    "microsoft": {
        "auth_url": "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize",
        "token_url": "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token",
        "userinfo_url": "https://graph.microsoft.com/v1.0/me",
        "scope": "openid email profile User.Read",
    },
    "generic_oidc": {
        "auth_url": "",
        "token_url": "",
        "userinfo_url": "",
        "scope": "openid email profile",
    },
}


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------


class OrgSsoConfig(Base):
    __tablename__ = "org_sso_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    client_id: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    client_secret: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    tenant_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    redirect_uri: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extra_config_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (UniqueConstraint("org_id", "provider", name="uq_org_sso_provider"),)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class SsoConfigIn(BaseModel):
    provider: str = Field(pattern="^(google|microsoft|generic_oidc)$")
    client_id: str = Field(max_length=500)
    client_secret: str = Field(max_length=500)
    tenant_id: Optional[str] = Field(default=None, max_length=200)
    extra_config: Optional[dict] = None


class SsoConfigPatch(BaseModel):
    client_id: Optional[str] = Field(default=None, max_length=500)
    client_secret: Optional[str] = Field(default=None, max_length=500)
    tenant_id: Optional[str] = Field(default=None, max_length=200)
    extra_config: Optional[dict] = None
    is_active: Optional[bool] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_org(me: CurrentUser, db: AsyncSession) -> Organization:
    res = await db.execute(select(Organization).where(Organization.owner_id == me.id))
    org = res.scalar_one_or_none()
    if org is None:
        raise HTTPException(404, "Organizasyon bulunamadı.")
    return org


def _config_out(c: OrgSsoConfig) -> dict:
    extra = {}
    if c.extra_config_json:
        try:
            extra = json.loads(c.extra_config_json)
        except Exception:
            pass
    return {
        "id": c.id,
        "provider": c.provider,
        "client_id": c.client_id,
        "has_secret": bool(c.client_secret),
        "tenant_id": c.tenant_id,
        "is_active": c.is_active,
        "extra_config": extra,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


def _get_redirect_uri(provider: str) -> str:
    base = settings.frontend_base_url.rstrip("/")
    return f"{base}/auth/sso/callback/{provider}"


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/api/admin/sso",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def list_sso_configs(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org(me, db)
    rows = (await db.execute(
        select(OrgSsoConfig).where(OrgSsoConfig.org_id == org.id)
    )).scalars().all()
    return {
        "configs": [_config_out(c) for c in rows],
        "available_providers": list(SSO_PROVIDERS.keys()),
    }


@router.post(
    "/api/admin/sso",
    status_code=201,
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def create_sso_config(
    body: SsoConfigIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org(me, db)
    existing = (await db.execute(
        select(OrgSsoConfig).where(
            OrgSsoConfig.org_id == org.id, OrgSsoConfig.provider == body.provider
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(409, "Bu sağlayıcı için zaten bir SSO yapılandırması var.")

    config = OrgSsoConfig(
        org_id=org.id,
        provider=body.provider,
        client_id=body.client_id,
        client_secret=body.client_secret,
        tenant_id=body.tenant_id,
        redirect_uri=_get_redirect_uri(body.provider),
        extra_config_json=json.dumps(body.extra_config) if body.extra_config else None,
        is_active=False,
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return _config_out(config)


@router.patch(
    "/api/admin/sso/{config_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def update_sso_config(
    config_id: int,
    body: SsoConfigPatch,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org(me, db)
    config = (await db.execute(
        select(OrgSsoConfig).where(OrgSsoConfig.id == config_id, OrgSsoConfig.org_id == org.id)
    )).scalar_one_or_none()
    if not config:
        raise HTTPException(404, "SSO yapılandırması bulunamadı.")
    if body.client_id is not None:
        config.client_id = body.client_id
    if body.client_secret is not None:
        config.client_secret = body.client_secret
    if body.tenant_id is not None:
        config.tenant_id = body.tenant_id
    if body.extra_config is not None:
        config.extra_config_json = json.dumps(body.extra_config)
    if body.is_active is not None:
        config.is_active = body.is_active
    config.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(config)
    return _config_out(config)


@router.delete(
    "/api/admin/sso/{config_id}",
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
)
async def delete_sso_config(
    config_id: int,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    org = await _get_org(me, db)
    config = (await db.execute(
        select(OrgSsoConfig).where(OrgSsoConfig.id == config_id, OrgSsoConfig.org_id == org.id)
    )).scalar_one_or_none()
    if not config:
        raise HTTPException(404, "SSO yapılandırması bulunamadı.")
    await db.delete(config)
    await db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Public SSO flow endpoints
# ---------------------------------------------------------------------------


@router.get("/api/auth/sso/{provider}/authorize")
async def sso_authorize(
    provider: str,
    org_slug: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Redirect to OAuth2 provider's authorization URL."""
    if provider not in SSO_PROVIDERS:
        raise HTTPException(400, "Desteklenmeyen SSO sağlayıcısı.")

    # Find org config
    stmt = select(OrgSsoConfig).where(
        OrgSsoConfig.provider == provider,
        OrgSsoConfig.is_active.is_(True),
    )
    config = (await db.execute(stmt)).scalar_one_or_none()
    if not config:
        raise HTTPException(404, "Bu sağlayıcı için aktif SSO yapılandırması bulunamadı.")

    provider_info = SSO_PROVIDERS[provider]
    auth_url = provider_info["auth_url"]
    if provider == "microsoft" and config.tenant_id:
        auth_url = auth_url.replace("{tenant_id}", config.tenant_id)

    state_token = make_email_token({"action": "sso_state", "provider": provider, "org_id": config.org_id})
    redirect_uri = config.redirect_uri or _get_redirect_uri(provider)

    params = {
        "client_id": config.client_id or "",
        "response_type": "code",
        "scope": provider_info["scope"],
        "redirect_uri": redirect_uri,
        "state": state_token,
        "prompt": "select_account",
    }
    return RedirectResponse(url=f"{auth_url}?{urlencode(params)}")


@router.get("/api/auth/sso/{provider}/callback")
async def sso_callback(
    provider: str,
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Handle OAuth2 callback — exchange code for user info, create/login member."""
    import httpx

    if provider not in SSO_PROVIDERS:
        raise HTTPException(400, "Desteklenmeyen SSO sağlayıcısı.")

    try:
        state_data = verify_email_token(state, max_age=600)
        if state_data.get("action") != "sso_state":
            raise ValueError("Invalid state")
    except Exception:
        raise HTTPException(400, "Geçersiz state parametresi.")

    org_id = state_data.get("org_id")
    config = (await db.execute(
        select(OrgSsoConfig).where(
            OrgSsoConfig.provider == provider,
            OrgSsoConfig.org_id == org_id,
            OrgSsoConfig.is_active.is_(True),
        )
    )).scalar_one_or_none()
    if not config:
        raise HTTPException(404, "SSO yapılandırması bulunamadı.")

    provider_info = SSO_PROVIDERS[provider]
    token_url = provider_info["token_url"]
    if provider == "microsoft" and config.tenant_id:
        token_url = token_url.replace("{tenant_id}", config.tenant_id)

    redirect_uri = config.redirect_uri or _get_redirect_uri(provider)

    async with httpx.AsyncClient() as client:
        try:
            token_resp = await client.post(token_url, data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": config.client_id,
                "client_secret": config.client_secret,
            }, headers={"Accept": "application/json"})
            token_data = token_resp.json()
            access_token = token_data.get("access_token")
            if not access_token:
                raise HTTPException(400, "Token alınamadı.")

            userinfo_resp = await client.get(
                provider_info["userinfo_url"],
                headers={"Authorization": f"Bearer {access_token}"},
            )
            userinfo = userinfo_resp.json()
        except Exception as exc:
            raise HTTPException(502, f"SSO sağlayıcısıyla iletişim hatası: {exc}")

    email = (
        userinfo.get("email")
        or userinfo.get("mail")
        or userinfo.get("userPrincipalName", "")
    ).strip().lower()
    if not email:
        raise HTTPException(400, "SSO sağlayıcısından e-posta alınamadı.")

    name = (
        userinfo.get("name")
        or userinfo.get("displayName")
        or f"{userinfo.get('given_name', '')} {userinfo.get('family_name', '')}".strip()
        or email
    )

    # Find or create PublicMember
    member = (await db.execute(
        select(PublicMember).where(func.lower(PublicMember.email) == email)
    )).scalar_one_or_none()

    if not member:
        from .main import _generate_public_member_public_id
        try:
            pub_id = await _generate_public_member_public_id(db)
        except Exception:
            pub_id = _secrets.token_urlsafe(8)
        member = PublicMember(
            public_id=pub_id,
            email=email,
            display_name=name,
            password_hash=hash_password(_secrets.token_urlsafe(32)),
            is_verified=True,
        )
        db.add(member)
        await db.commit()
        await db.refresh(member)
    else:
        if not member.display_name and name:
            member.display_name = name
            await db.commit()

    access_token = create_public_member_access_token(member_id=member.id)
    frontend_base = settings.frontend_base_url.rstrip("/")
    return RedirectResponse(url=f"{frontend_base}/auth/sso/success?token={access_token}&provider={provider}")
