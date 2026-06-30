"""OIDC/SSO authentication — Microsoft Entra ID, Okta, Google Workspace, etc.

Configuration is stored per-organization in:
  organization.settings["enterprise_integrations"]["oidc"]

Fields: enabled, issuer_url, client_id, client_secret (encrypted), allowed_domains

Flow:
  1. GET /api/auth/oidc/start?org_id=X  → redirect to IDP
  2. IDP  → GET /api/auth/oidc/callback?code=...&state=...
  3. Exchange code → ID token → extract email → find/provision user → issue JWT
  4. Redirect to frontend via oauth bridge cookie
"""

from __future__ import annotations

import secrets
from typing import Any
from urllib.parse import urlencode, urlparse

import httpx
import jwt as pyjwt
from jwt import PyJWKSet
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .webhooks import _is_private_address

from .main import (
    Organization,
    Role,
    User,
    _decrypt_secret,
    _oauth_bridge_redirect,
    create_access_token,
    get_db,
    hash_password,
    make_email_token,
    settings,
    verify_email_token,
)

router = APIRouter()

_STATE_ACTION = "oidc_sso"
_STATE_MAX_AGE = 300
_ENTERPRISE_KEY = "enterprise_integrations"


def _oidc_redirect_uri() -> str:
    return f"{settings.public_base_url.rstrip('/')}/api/auth/oidc/callback"


def _assert_safe_oidc_url(url: str, label: str) -> None:
    """Block SSRF: OIDC endpoints (issuer/token/jwks) are admin-configured, so they
    must be https and must not resolve to a private/internal/loopback address."""
    parsed = urlparse(url or "")
    if parsed.scheme != "https" or not parsed.hostname:
        raise HTTPException(status_code=400, detail=f"OIDC {label} must be a valid https URL.")
    if _is_private_address(parsed.hostname):
        raise HTTPException(status_code=400, detail=f"OIDC {label} is not allowed (internal address).")


async def _oidc_discovery(issuer_url: str) -> dict[str, Any]:
    _assert_safe_oidc_url(issuer_url, "issuer_url")
    url = f"{issuer_url.rstrip('/')}/.well-known/openid-configuration"
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
        res = await client.get(url)
    if res.status_code >= 400:
        raise HTTPException(status_code=502, detail="OIDC discovery document could not be fetched.")
    return res.json()


async def _verify_id_token(id_token: str, jwks_uri: str, client_id: str, expected_issuer: str) -> dict[str, Any]:
    """Verify the IdP id_token signature against the provider's JWKS and validate
    audience/expiry/issuer. Without this, a forged id_token could spoof any email
    claim and take over accounts."""
    _assert_safe_oidc_url(jwks_uri, "jwks_uri")
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
            res = await client.get(jwks_uri)
        res.raise_for_status()
        jwk_set = PyJWKSet.from_dict(res.json())
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"OIDC JWKS could not be fetched: {exc}")

    try:
        header = pyjwt.get_unverified_header(id_token)
        kid = header.get("kid")
        alg = header.get("alg") or "RS256"
        signing_key = None
        for key in jwk_set.keys:
            if kid is None or key.key_id == kid:
                signing_key = key
                break
        if signing_key is None:
            raise HTTPException(status_code=400, detail="OIDC signing key not found for id_token.")
        claims = pyjwt.decode(
            id_token,
            signing_key.key,
            algorithms=[alg] if alg in ("RS256", "RS384", "RS512", "ES256", "ES384") else ["RS256"],
            audience=client_id,
            options={"require": ["exp"], "verify_iss": False},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"ID token signature verification failed: {exc}")

    # Issuer check (trailing-slash tolerant).
    if expected_issuer:
        token_iss = str(claims.get("iss") or "").rstrip("/")
        if token_iss != expected_issuer.rstrip("/"):
            raise HTTPException(status_code=400, detail="ID token issuer mismatch.")
    return claims


async def _exchange_code(
    token_endpoint: str,
    code: str,
    client_id: str,
    client_secret: str,
) -> dict[str, Any]:
    _assert_safe_oidc_url(token_endpoint, "token_endpoint")
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=False) as client:
        res = await client.post(
            token_endpoint,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": _oidc_redirect_uri(),
                "client_id": client_id,
                "client_secret": client_secret,
            },
        )
    if res.status_code >= 400:
        raise HTTPException(status_code=400, detail="OIDC code exchange failed.")
    return res.json()


def _email_from_claims(claims: dict[str, Any]) -> str:
    email = str(claims.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email claim missing from ID token.")
    if claims.get("email_verified") is False:
        raise HTTPException(status_code=400, detail="OIDC email address is not verified.")
    return email


@router.get("/api/auth/oidc/start")
async def oidc_sso_start(
    org_id: int = Query(...),
    next: str = Query(default="/admin"),
    db: AsyncSession = Depends(get_db),
):
    """Redirect browser to the organization's OIDC identity provider."""
    # Open-redirect guard: only allow same-site relative paths in `next` (reject
    # absolute URLs and protocol-relative `//evil.com`) before signing it into state.
    if not (next.startswith("/") and not next.startswith("//")):
        next = "/admin"
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    oidc = ((org.settings or {}).get(_ENTERPRISE_KEY) or {}).get("oidc") or {}
    if not oidc.get("enabled") or not oidc.get("issuer_url") or not oidc.get("client_id"):
        raise HTTPException(status_code=400, detail="SSO is not configured for this organization.")

    discovery = await _oidc_discovery(str(oidc["issuer_url"]))
    auth_endpoint = discovery.get("authorization_endpoint")
    if not auth_endpoint:
        raise HTTPException(status_code=502, detail="OIDC authorization_endpoint not found in discovery document.")

    state = make_email_token({"action": _STATE_ACTION, "org_id": org_id, "next": next})
    params = urlencode({
        "client_id": oidc["client_id"],
        "redirect_uri": _oidc_redirect_uri(),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
    })
    return RedirectResponse(f"{auth_endpoint}?{params}")


@router.get("/api/auth/oidc/callback")
async def oidc_sso_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Handle IDP redirect, exchange code, provision user, issue JWT."""
    try:
        state_data = verify_email_token(state, max_age=_STATE_MAX_AGE)
    except Exception:
        raise HTTPException(status_code=400, detail="OIDC state is invalid or expired.")
    if state_data.get("action") != _STATE_ACTION:
        raise HTTPException(status_code=400, detail="Invalid OIDC state action.")

    org_id = int(state_data["org_id"])
    next_url = str(state_data.get("next") or "/admin")

    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    oidc = ((org.settings or {}).get(_ENTERPRISE_KEY) or {}).get("oidc") or {}
    issuer_url = str(oidc.get("issuer_url") or "")
    client_id = str(oidc.get("client_id") or "")
    raw_secret = str(oidc.get("client_secret") or "")
    client_secret = (_decrypt_secret(raw_secret) if raw_secret.startswith("enc:v1:") else raw_secret) or ""

    if not issuer_url or not client_id:
        raise HTTPException(status_code=400, detail="SSO configuration is incomplete.")

    discovery = await _oidc_discovery(issuer_url)
    token_endpoint = str(discovery.get("token_endpoint") or "")
    if not token_endpoint:
        raise HTTPException(status_code=502, detail="token_endpoint missing from OIDC discovery.")

    tokens = await _exchange_code(token_endpoint, code, client_id, client_secret)
    id_token = str(tokens.get("id_token") or "")
    if not id_token:
        raise HTTPException(status_code=400, detail="ID token missing from OIDC response.")

    jwks_uri = str(discovery.get("jwks_uri") or "")
    if not jwks_uri:
        raise HTTPException(status_code=502, detail="jwks_uri missing from OIDC discovery.")
    issuer_from_discovery = str(discovery.get("issuer") or issuer_url)
    claims = await _verify_id_token(id_token, jwks_uri, client_id, issuer_from_discovery)
    email = _email_from_claims(claims)

    # Domain allowlist
    allowed_domains = [str(d).strip().lower() for d in (oidc.get("allowed_domains") or []) if str(d).strip()]
    if allowed_domains:
        domain = email.split("@")[-1].lower()
        if domain not in allowed_domains:
            raise HTTPException(status_code=403, detail=f"Email domain '{domain}' is not permitted for this organization.")

    # Find or provision admin user
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        user = User(
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            role=Role.admin,
            heptacoin_balaonce=0,
            is_verified=True,
            verification_token=None,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif not user.is_verified:
        user.is_verified = True
        user.verification_token = None
        await db.commit()

    access_token = create_access_token(user_id=user.id, role=user.role)
    return _oauth_bridge_redirect(
        f"{settings.frontend_base_url.rstrip('/')}/auth/oidc/callback?next={next_url}",
        token=access_token,
        mode="admin",
    )
