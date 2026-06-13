"""
OAuth 2.0 Authorization Server for HeptaCert.

Enables ChatGPT GPT (and other OAuth clients) to authenticate as HeptaCert
users via standard Authorization Code flow with optional PKCE.

Flow:
  1. Client redirects user to https://heptacert.com/oauth/authorize?client_id=...
  2. Frontend page shows HeptaCert login + consent screen
  3. User approves → frontend POSTs to /api/oauth/authorize (with admin JWT)
  4. Backend issues auth code → returns redirect URL with code
  5. Client POSTs to /api/oauth/token → receives access_token + refresh_token
  6. All subsequent API calls: Authorization: Bearer <access_token>

Access tokens are short-lived JWTs (60 min) signed with jwt_secret, carrying
a "scope" claim that the existing get_current_user middleware ignores — so all
existing endpoints remain compatible without changes.
"""

from __future__ import annotations

import base64
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import jwt as pyjwt
from fastapi import APIRouter, Depends, Form, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, DateTime, Integer, String, Text, select
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from .main import (
    Base,
    CurrentUser,
    Role,
    User,
    get_current_user,
    get_db,
    require_role,
    settings,
)

router = APIRouter()

# ── Constants ──────────────────────────────────────────────────────────────────

ACCESS_TOKEN_MINUTES  = 60          # short-lived JWT
REFRESH_TOKEN_DAYS    = 30          # long-lived opaque token
AUTH_CODE_MINUTES     = 10          # one-time auth code window

VALID_SCOPES = {
    "events:read", "events:write",
    "attendees:read", "attendees:write",
    "certificates:read", "certificates:write",
    "crm:read", "crm:write",
    "analytics:read",
    "forms:read", "forms:write",
    "reports:read",
}


# ── DB Models ──────────────────────────────────────────────────────────────────

class OAuthClient(Base):
    __tablename__ = "oauth_clients"

    id:                 Mapped[int]           = mapped_column(Integer, primary_key=True)
    client_id:          Mapped[str]           = mapped_column(String(64), unique=True, nullable=False)
    client_secret_hash: Mapped[str]           = mapped_column(String(128), nullable=False)
    name:               Mapped[str]           = mapped_column(String(200), nullable=False)
    redirect_uris:      Mapped[list]          = mapped_column(JSONB, nullable=False, default=list)
    allowed_scopes:     Mapped[list]          = mapped_column(JSONB, nullable=False, default=list)
    logo_url:           Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active:          Mapped[bool]          = mapped_column(Boolean, nullable=False, default=True)
    created_at:         Mapped[datetime]      = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class OAuthCode(Base):
    __tablename__ = "oauth_codes"

    id:                    Mapped[int]           = mapped_column(Integer, primary_key=True)
    code_hash:             Mapped[str]           = mapped_column(String(128), unique=True, nullable=False)
    client_id:             Mapped[str]           = mapped_column(String(64), nullable=False)
    user_id:               Mapped[int]           = mapped_column(Integer, nullable=False)
    redirect_uri:          Mapped[str]           = mapped_column(Text, nullable=False)
    scopes:                Mapped[list]          = mapped_column(JSONB, nullable=False, default=list)
    code_challenge:        Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    code_challenge_method: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    expires_at:            Mapped[datetime]      = mapped_column(DateTime(timezone=True), nullable=False)
    used:                  Mapped[bool]          = mapped_column(Boolean, nullable=False, default=False)
    created_at:            Mapped[datetime]      = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class OAuthRefreshToken(Base):
    __tablename__ = "oauth_refresh_tokens"

    id:         Mapped[int]      = mapped_column(Integer, primary_key=True)
    token_hash: Mapped[str]      = mapped_column(String(128), unique=True, nullable=False)
    client_id:  Mapped[str]      = mapped_column(String(64), nullable=False)
    user_id:    Mapped[int]      = mapped_column(Integer, nullable=False)
    scopes:     Mapped[list]     = mapped_column(JSONB, nullable=False, default=list)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked:    Mapped[bool]     = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


# ── Helpers ────────────────────────────────────────────────────────────────────

def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _make_access_token(*, user_id: int, role: str, scopes: list[str]) -> str:
    now = _now()
    payload = {
        "sub": str(user_id),
        "role": role,
        "scope": " ".join(scopes),
        "iat": int(now.timestamp()),
        "exp": now + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }
    return pyjwt.encode(payload, settings.jwt_secret, algorithm="HS256")


async def _load_client(client_id: str, db: AsyncSession) -> OAuthClient:
    row = (await db.execute(
        select(OAuthClient).where(
            OAuthClient.client_id == client_id,
            OAuthClient.is_active.is_(True),
        )
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=400, detail="Unknown or inactive OAuth client")
    return row


def _verify_pkce(challenge: str, method: str, verifier: str) -> bool:
    method = (method or "S256").upper()
    if method == "S256":
        digest = hashlib.sha256(verifier.encode()).digest()
        computed = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    else:
        computed = verifier
    return computed == challenge


# ── Public: validate client (called by frontend consent page) ─────────────────

class ValidateOut(BaseModel):
    client_name:      str
    logo_url:         Optional[str]
    requested_scopes: list[str]
    granted_scopes:   list[str]  # intersection of requested + allowed


@router.get("/api/oauth/validate", response_model=ValidateOut, tags=["oauth"])
async def validate_oauth_params(
    client_id:    str = Query(...),
    redirect_uri: str = Query(...),
    scope:        str = Query(default=""),
    db: AsyncSession = Depends(get_db),
):
    """
    Validate OAuth client + redirect_uri before showing the consent UI.
    Called client-side by the /oauth/authorize Next.js page.
    """
    client = await _load_client(client_id, db)
    if redirect_uri not in (client.redirect_uris or []):
        raise HTTPException(status_code=400, detail="redirect_uri not registered for this client")

    requested = [s for s in scope.split() if s]
    granted   = [s for s in requested if s in (client.allowed_scopes or [])]

    return ValidateOut(
        client_name=client.name,
        logo_url=client.logo_url,
        requested_scopes=requested,
        granted_scopes=granted,
    )


# ── Authorize: issue auth code (called by frontend after user approval) ────────

class AuthorizeIn(BaseModel):
    client_id:             str
    redirect_uri:          str
    scope:                 str = ""
    state:                 str = ""
    code_challenge:        Optional[str] = None
    code_challenge_method: Optional[str] = None


class AuthorizeOut(BaseModel):
    redirect_url: str   # frontend follows window.location.href = redirect_url


@router.post("/api/oauth/authorize", response_model=AuthorizeOut, tags=["oauth"])
async def issue_auth_code(
    payload: AuthorizeIn,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a one-time authorization code and return the redirect URL.
    Caller must be authenticated (Authorization: Bearer <admin_jwt>).
    """
    client = await _load_client(payload.client_id, db)

    if payload.redirect_uri not in (client.redirect_uris or []):
        raise HTTPException(status_code=400, detail="redirect_uri not registered")

    scopes = [
        s for s in payload.scope.split()
        if s in (client.allowed_scopes or [])
    ]

    raw_code  = secrets.token_urlsafe(32)
    code_record = OAuthCode(
        code_hash             = _sha256(raw_code),
        client_id             = payload.client_id,
        user_id               = me.id,
        redirect_uri          = payload.redirect_uri,
        scopes                = scopes,
        code_challenge        = payload.code_challenge,
        code_challenge_method = payload.code_challenge_method,
        expires_at            = _now() + timedelta(minutes=AUTH_CODE_MINUTES),
        used                  = False,
    )
    db.add(code_record)
    await db.commit()

    qs: dict = {"code": raw_code}
    if payload.state:
        qs["state"] = payload.state
    return AuthorizeOut(redirect_url=f"{payload.redirect_uri}?{urlencode(qs)}")


# ── Token endpoint ─────────────────────────────────────────────────────────────

@router.post("/api/oauth/token", tags=["oauth"])
async def token_endpoint(
    grant_type:     str           = Form(...),
    client_id:      str           = Form(...),
    client_secret:  Optional[str] = Form(default=None),
    code:           Optional[str] = Form(default=None),
    redirect_uri:   Optional[str] = Form(default=None),
    code_verifier:  Optional[str] = Form(default=None),
    refresh_token:  Optional[str] = Form(default=None),
    db: AsyncSession = Depends(get_db),
):
    """
    OAuth 2.0 token endpoint.
    - grant_type=authorization_code → access_token + refresh_token
    - grant_type=refresh_token      → new access_token
    """
    client = await _load_client(client_id, db)

    if client_secret is not None and _sha256(client_secret) != client.client_secret_hash:
        raise HTTPException(status_code=401, detail="Invalid client credentials")

    # ── Authorization Code grant ───────────────────────────────────────────────
    if grant_type == "authorization_code":
        if not code or not redirect_uri:
            raise HTTPException(status_code=400, detail="code and redirect_uri are required")

        code_rec = (await db.execute(
            select(OAuthCode).where(
                OAuthCode.code_hash == _sha256(code),
                OAuthCode.client_id == client_id,
                OAuthCode.used.is_(False),
            )
        )).scalar_one_or_none()

        if not code_rec:
            raise HTTPException(status_code=400, detail="Invalid or already-used authorization code")

        exp = code_rec.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < _now():
            raise HTTPException(status_code=400, detail="Authorization code expired")

        if code_rec.redirect_uri != redirect_uri:
            raise HTTPException(status_code=400, detail="redirect_uri does not match")

        # PKCE verification
        if code_rec.code_challenge:
            if not code_verifier:
                raise HTTPException(status_code=400, detail="code_verifier is required")
            if not _verify_pkce(
                code_rec.code_challenge,
                code_rec.code_challenge_method or "S256",
                code_verifier,
            ):
                raise HTTPException(status_code=400, detail="code_verifier is invalid")

        code_rec.used = True
        await db.flush()

        user = (await db.execute(
            select(User).where(User.id == code_rec.user_id)
        )).scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=400, detail="User not found")

        access_token  = _make_access_token(
            user_id=user.id,
            role=user.role.value if hasattr(user.role, "value") else str(user.role),
            scopes=code_rec.scopes,
        )
        raw_refresh   = secrets.token_urlsafe(48)
        db.add(OAuthRefreshToken(
            token_hash = _sha256(raw_refresh),
            client_id  = client_id,
            user_id    = user.id,
            scopes     = code_rec.scopes,
            expires_at = _now() + timedelta(days=REFRESH_TOKEN_DAYS),
            revoked    = False,
        ))
        await db.commit()

        return {
            "access_token":  access_token,
            "token_type":    "bearer",
            "expires_in":    ACCESS_TOKEN_MINUTES * 60,
            "refresh_token": raw_refresh,
            "scope":         " ".join(code_rec.scopes),
        }

    # ── Refresh Token grant ────────────────────────────────────────────────────
    elif grant_type == "refresh_token":
        if not refresh_token:
            raise HTTPException(status_code=400, detail="refresh_token is required")

        rt_rec = (await db.execute(
            select(OAuthRefreshToken).where(
                OAuthRefreshToken.token_hash == _sha256(refresh_token),
                OAuthRefreshToken.client_id  == client_id,
                OAuthRefreshToken.revoked.is_(False),
            )
        )).scalar_one_or_none()

        if not rt_rec:
            raise HTTPException(status_code=400, detail="Invalid or revoked refresh token")

        exp = rt_rec.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < _now():
            raise HTTPException(status_code=400, detail="Refresh token expired")

        user = (await db.execute(
            select(User).where(User.id == rt_rec.user_id)
        )).scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=400, detail="User not found")

        access_token = _make_access_token(
            user_id=user.id,
            role=user.role.value if hasattr(user.role, "value") else str(user.role),
            scopes=rt_rec.scopes,
        )
        return {
            "access_token": access_token,
            "token_type":   "bearer",
            "expires_in":   ACCESS_TOKEN_MINUTES * 60,
            "scope":        " ".join(rt_rec.scopes),
        }

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported grant_type: {grant_type}")


# ── Superadmin: manage registered OAuth clients ────────────────────────────────

class OAuthClientCreateIn(BaseModel):
    name:          str            = Field(..., min_length=1, max_length=200)
    redirect_uris: list[str]      = Field(..., min_length=1)
    allowed_scopes: list[str]     = Field(default_factory=list)
    logo_url:      Optional[str]  = None


class OAuthClientOut(BaseModel):
    client_id:      str
    name:           str
    redirect_uris:  list[str]
    allowed_scopes: list[str]
    logo_url:       Optional[str]
    is_active:      bool
    created_at:     datetime


@router.get(
    "/api/admin/superadmin/oauth-clients",
    response_model=list[OAuthClientOut],
    dependencies=[Depends(require_role(Role.superadmin))],
    tags=["oauth-admin"],
)
async def list_oauth_clients(db: AsyncSession = Depends(get_db)) -> list[OAuthClientOut]:
    rows = (await db.execute(
        select(OAuthClient).order_by(OAuthClient.created_at.desc())
    )).scalars().all()
    return [
        OAuthClientOut(
            client_id      = r.client_id,
            name           = r.name,
            redirect_uris  = r.redirect_uris or [],
            allowed_scopes = r.allowed_scopes or [],
            logo_url       = r.logo_url,
            is_active      = r.is_active,
            created_at     = r.created_at,
        )
        for r in rows
    ]


@router.post(
    "/api/admin/superadmin/oauth-clients",
    status_code=201,
    dependencies=[Depends(require_role(Role.superadmin))],
    tags=["oauth-admin"],
)
async def create_oauth_client(
    payload: OAuthClientCreateIn,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Register a new OAuth client. Returns the client_secret once (not stored in plain text).
    Use this to register the ChatGPT GPT, Zapier, etc.
    """
    raw_secret = secrets.token_urlsafe(32)
    client_id  = f"hc_{secrets.token_hex(8)}"

    allowed = [s for s in (payload.allowed_scopes or []) if s in VALID_SCOPES]
    if not allowed:
        allowed = ["events:read", "events:write",
                   "attendees:read", "attendees:write",
                   "certificates:read", "certificates:write",
                   "analytics:read"]

    db.add(OAuthClient(
        client_id          = client_id,
        client_secret_hash = _sha256(raw_secret),
        name               = payload.name.strip(),
        redirect_uris      = payload.redirect_uris,
        allowed_scopes     = allowed,
        logo_url           = payload.logo_url,
        is_active          = True,
    ))
    await db.commit()

    return {
        "client_id":      client_id,
        "client_secret":  raw_secret,   # shown ONCE — store securely
        "name":           payload.name,
        "redirect_uris":  payload.redirect_uris,
        "allowed_scopes": allowed,
    }


class OAuthClientPatchIn(BaseModel):
    is_active: Optional[bool] = None
    name:      Optional[str]  = None
    logo_url:  Optional[str]  = None


@router.patch(
    "/api/admin/superadmin/oauth-clients/{client_id}",
    dependencies=[Depends(require_role(Role.superadmin))],
    tags=["oauth-admin"],
)
async def update_oauth_client(
    client_id: str,
    payload:   OAuthClientPatchIn,
    db: AsyncSession = Depends(get_db),
) -> OAuthClientOut:
    # load regardless of is_active so we can toggle inactive → active
    client = (await db.execute(
        select(OAuthClient).where(OAuthClient.client_id == client_id)
    )).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="OAuth client not found")
    is_active = payload.is_active
    name      = payload.name
    logo_url  = payload.logo_url
    if is_active is not None:
        client.is_active = is_active
    if name is not None:
        client.name = name.strip()
    if logo_url is not None:
        client.logo_url = logo_url
    await db.commit()
    await db.refresh(client)
    return OAuthClientOut(
        client_id      = client.client_id,
        name           = client.name,
        redirect_uris  = client.redirect_uris or [],
        allowed_scopes = client.allowed_scopes or [],
        logo_url       = client.logo_url,
        is_active      = client.is_active,
        created_at     = client.created_at,
    )


@router.delete(
    "/api/admin/superadmin/oauth-clients/{client_id}/tokens",
    dependencies=[Depends(require_role(Role.superadmin))],
    tags=["oauth-admin"],
)
async def revoke_all_tokens_for_client(
    client_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Revoke all active refresh tokens for a client (emergency kill-switch)."""
    from sqlalchemy import update as sa_update
    await db.execute(
        sa_update(OAuthRefreshToken)
        .where(OAuthRefreshToken.client_id == client_id)
        .values(revoked=True)
    )
    await db.commit()
    return {"client_id": client_id, "tokens_revoked": True}
