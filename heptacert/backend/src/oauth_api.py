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
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import jwt as pyjwt
from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, DateTime, Integer, String, Text, select
from .db_types import JSONB
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

ACCESS_TOKEN_MINUTES  = 60          # short-lived JWT (revocation is handled via DB check in get_current_user)
REFRESH_TOKEN_DAYS    = 30          # long-lived opaque token
AUTH_CODE_MINUTES     = 10          # one-time auth code window

# Grantable OAuth scopes derive from the single source of truth in services.py
# (GRANTABLE_SCOPES) so the OAuth server, API keys and the scope-enforcement
# mapper stay in lockstep. Previously this set omitted sessions/checkin/
# automations, so an OAuth token could never be granted them and MCP tools like
# create_session / manual_checkin / create_automation_rule failed with 403.
from .services import GRANTABLE_SCOPES
VALID_SCOPES = set(GRANTABLE_SCOPES)


# ── DB Models ──────────────────────────────────────────────────────────────────

class OAuthClient(Base):
    __tablename__ = "oauth_clients"

    id:                 Mapped[int]           = mapped_column(Integer, primary_key=True)
    client_id:          Mapped[str]           = mapped_column(String(64), unique=True, nullable=False)
    # NULL == public client (PKCE, no secret). Set == confidential client.
    client_secret_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
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


def _make_access_token(*, user_id: int, role: str, scopes: list[str], client_id: str) -> str:
    now = _now()
    payload = {
        "sub":       str(user_id),
        "role":      role,
        "scope":     " ".join(scopes),
        "client_id": client_id,          # allows instant revocation check in get_current_user
        "iat":       int(now.timestamp()),
        "exp":       now + timedelta(minutes=ACCESS_TOKEN_MINUTES),
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

    allowed   = list(client.allowed_scopes or [])
    requested = [s for s in scope.split() if s]
    # A client that requests no scope is granted the client's full allowed set —
    # NOT an empty set. An empty scope claim would be read as "full access" by the
    # REST enforcement layer, so tokens must always carry explicit scopes. The
    # consent screen shows exactly this list, keeping approval honest.
    granted   = [s for s in requested if s in allowed] if requested else allowed

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

    # Mirror /api/oauth/validate: no scope requested → grant the client's full
    # allowed set (explicit, never empty). This prevents an empty scope claim from
    # being interpreted as unrestricted "full access" downstream.
    allowed    = list(client.allowed_scopes or [])
    requested  = [s for s in payload.scope.split() if s]
    scopes     = [s for s in requested if s in allowed] if requested else allowed

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

    # Authenticate the client. Every registered client is confidential (it always
    # has a client_secret_hash), so a presented secret must match (constant-time).
    # A *missing* secret is only acceptable when the grant is bound by PKCE — see
    # the per-grant checks below. Previously a missing secret skipped auth entirely,
    # letting anyone who intercepted an auth code redeem it for tokens.
    secret_ok = client_secret is not None and hmac.compare_digest(
        _sha256(client_secret), client.client_secret_hash or ""
    )
    if client_secret is not None and not secret_ok:
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
        used_pkce = bool(code_rec.code_challenge)
        if used_pkce:
            if not code_verifier:
                raise HTTPException(status_code=400, detail="code_verifier is required")
            if not _verify_pkce(
                code_rec.code_challenge,
                code_rec.code_challenge_method or "S256",
                code_verifier,
            ):
                raise HTTPException(status_code=400, detail="code_verifier is invalid")

        # Without PKCE the code is only bound to the client by its secret, so a
        # valid client_secret is mandatory; otherwise a stolen code is redeemable.
        if not used_pkce and not secret_ok:
            raise HTTPException(status_code=401, detail="Client authentication required (client_secret or PKCE)")

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
            client_id=code_rec.client_id,
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
        # Confidential clients must present their secret. PUBLIC clients (PKCE, no
        # stored secret — the common MCP case) authenticate by binding: the query
        # below only returns a token issued to THIS client_id, and the opaque
        # refresh token itself is the proof of possession.
        client_is_public = not (client.client_secret_hash or "")
        if not client_is_public and not secret_ok:
            raise HTTPException(status_code=401, detail="Client authentication required")

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
            client_id=rt_rec.client_id,
        )
        return {
            "access_token": access_token,
            "token_type":   "bearer",
            "expires_in":   ACCESS_TOKEN_MINUTES * 60,
            "scope":        " ".join(rt_rec.scopes),
        }

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported grant_type: {grant_type}")


# ── Dynamic Client Registration (RFC 7591) ─────────────────────────────────────
# Open registration: any OAuth/MCP client (claude.ai, Claude Desktop, Cursor,
# Windsurf, a custom agent) can register itself, so users don't need a superadmin
# to pre-register every tool. This is safe because a freshly registered client is
# inert — it can do nothing until a real user completes the login + consent flow,
# every issued token is per-user and scope-bounded at consent time, and a
# superadmin can deactivate any client / revoke its tokens at any moment.

# Registration abuse (row spam) is throttled per IP.
_DCR_MAX_PER_HOUR = 20


def _is_registerable_redirect_uri(uri: str) -> bool:
    """Only https redirect URIs are allowed, plus http on loopback for local dev.
    Blocks non-http(s) schemes and plain-http public URLs (open-redirect / token
    exfiltration risk)."""
    u = (uri or "").strip().lower()
    if u.startswith("https://"):
        return True
    if u.startswith("http://"):
        host = u[len("http://"):].split("/", 1)[0].split(":", 1)[0]
        return host in ("localhost", "127.0.0.1", "[::1]")
    return False


class ClientRegistrationIn(BaseModel):
    # RFC 7591 metadata. redirect_uris is the only hard requirement for the
    # authorization-code flow we support.
    redirect_uris:              list[str]      = Field(..., min_length=1)
    client_name:                Optional[str]  = Field(default=None, max_length=200)
    scope:                      Optional[str]  = None   # space-separated
    grant_types:                Optional[list[str]] = None
    response_types:             Optional[list[str]] = None
    token_endpoint_auth_method: str            = "none"  # default: public (PKCE)
    logo_uri:                   Optional[str]  = Field(default=None, max_length=500)


@router.post("/api/oauth/register", status_code=201, tags=["oauth"])
async def register_client(
    payload: ClientRegistrationIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Dynamic Client Registration endpoint (RFC 7591).

    Public clients (token_endpoint_auth_method="none", the MCP default) are stored
    with no secret and authenticate via PKCE. Confidential clients
    ("client_secret_post") receive a client_secret ONCE in the response.
    """
    # ── Per-IP rate limit ──────────────────────────────────────────────────────
    ip = (request.client.host if request.client else "unknown")
    try:
        from .cache import cache
        import time as _time
        bucket = int(_time.time() // 3600)
        rl_key = f"dcr_rl:{ip}:{bucket}"
        current = int(await cache.get(rl_key) or 0)
        if current >= _DCR_MAX_PER_HOUR:
            raise HTTPException(status_code=429, detail="Too many client registrations; try again later.")
        await cache.set(rl_key, current + 1, ttl=3600)
    except HTTPException:
        raise
    except Exception:
        pass  # never let a cache hiccup block legitimate registration

    # ── Validate redirect URIs ───────────────────────────────────────────────────
    redirect_uris = [u.strip() for u in payload.redirect_uris if u and u.strip()]
    if not redirect_uris:
        raise HTTPException(status_code=400, detail="At least one redirect_uri is required")
    bad = [u for u in redirect_uris if not _is_registerable_redirect_uri(u)]
    if bad:
        raise HTTPException(
            status_code=400,
            detail=f"redirect_uri must be https (or http on localhost): {bad[0]}",
        )

    # ── Scopes: bound to what a token can actually be granted ────────────────────
    requested = [s for s in (payload.scope or "").split() if s]
    allowed = [s for s in requested if s in VALID_SCOPES]
    if not allowed:
        # No (valid) scope requested → allow the full grantable set; the user still
        # approves only what they want on the consent screen.
        allowed = sorted(VALID_SCOPES)

    # ── Public vs confidential ───────────────────────────────────────────────────
    auth_method = (payload.token_endpoint_auth_method or "none").lower()
    is_confidential = auth_method == "client_secret_post"

    client_id = f"hc_{secrets.token_hex(8)}"
    raw_secret: Optional[str] = None
    secret_hash: Optional[str] = None
    if is_confidential:
        raw_secret = secrets.token_urlsafe(32)
        secret_hash = _sha256(raw_secret)

    db.add(OAuthClient(
        client_id          = client_id,
        client_secret_hash = secret_hash,   # NULL for public clients
        name               = (payload.client_name or "MCP Client").strip()[:200] or "MCP Client",
        redirect_uris      = redirect_uris,
        allowed_scopes     = allowed,
        logo_url           = payload.logo_uri,
        is_active          = True,
    ))
    await db.commit()

    resp: dict = {
        "client_id":                  client_id,
        "client_id_issued_at":        int(_now().timestamp()),
        "client_secret_expires_at":   0,   # never expires
        "redirect_uris":              redirect_uris,
        "token_endpoint_auth_method": "client_secret_post" if is_confidential else "none",
        "grant_types":                ["authorization_code", "refresh_token"],
        "response_types":             ["code"],
        "scope":                      " ".join(allowed),
        "client_name":                (payload.client_name or "MCP Client"),
    }
    if raw_secret is not None:
        resp["client_secret"] = raw_secret   # shown ONCE
    return resp


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
    is_active:     Optional[bool]      = None
    name:          Optional[str]       = None
    logo_url:      Optional[str]       = None
    redirect_uris: Optional[list[str]] = None


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
    if payload.is_active is not None:
        client.is_active = payload.is_active
    if payload.name is not None:
        client.name = payload.name.strip()
    if payload.logo_url is not None:
        client.logo_url = payload.logo_url
    if payload.redirect_uris is not None:
        client.redirect_uris = [u.strip() for u in payload.redirect_uris if u.strip()]
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


@router.get("/api/oauth/userinfo", tags=["oauth"])
async def oauth_userinfo(
    me: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Standard OIDC userinfo endpoint.
    Returns ONLY sub + email — no extra PII — to comply with KVKK data minimisation.
    """
    return {
        "sub":   str(me.id),
        "email": str(me.email),
    }


class MyConnectionOut(BaseModel):
    client_id:   str
    name:        str
    logo_url:    Optional[str]
    scopes:      list[str]
    connected_at: str


@router.get(
    "/api/admin/me/oauth-connections",
    response_model=list[MyConnectionOut],
    dependencies=[Depends(require_role(Role.admin, Role.superadmin))],
    tags=["oauth"],
)
async def list_my_oauth_connections(
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MyConnectionOut]:
    """List OAuth clients the current user has granted access to."""
    rows = (await db.execute(
        select(OAuthRefreshToken, OAuthClient)
        .join(OAuthClient, OAuthClient.client_id == OAuthRefreshToken.client_id)
        .where(
            OAuthRefreshToken.user_id  == me.id,
            OAuthRefreshToken.revoked.is_(False),
            OAuthRefreshToken.expires_at > _now(),
        )
        .order_by(OAuthRefreshToken.created_at.desc())
    )).all()

    seen: set[str] = set()
    result: list[MyConnectionOut] = []
    for rt, client in rows:
        if client.client_id in seen:
            continue
        seen.add(client.client_id)
        result.append(MyConnectionOut(
            client_id    = client.client_id,
            name         = client.name,
            logo_url     = client.logo_url,
            scopes       = rt.scopes or [],
            connected_at = rt.created_at.isoformat(),
        ))
    return result


@router.delete(
    "/api/oauth/disconnect/{client_id}",
    tags=["oauth"],
)
async def disconnect_my_oauth(
    client_id: str,
    me: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Revoke the calling user's refresh tokens for a specific client. Allows re-auth with a different account."""
    from sqlalchemy import update as sa_update
    result = await db.execute(
        sa_update(OAuthRefreshToken)
        .where(
            OAuthRefreshToken.client_id == client_id,
            OAuthRefreshToken.user_id   == me.id,
            OAuthRefreshToken.revoked.is_(False),
        )
        .values(revoked=True)
    )
    await db.commit()
    return {"disconnected": True, "tokens_revoked": result.rowcount}
