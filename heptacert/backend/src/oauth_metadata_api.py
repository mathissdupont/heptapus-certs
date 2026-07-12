"""
OAuth 2.0 / MCP discovery metadata endpoints.

These make HeptaCert's existing OAuth Authorization Server (oauth_api.py)
auto-discoverable by ANY standards-compliant OAuth/MCP client — claude.ai,
Claude Desktop, Cursor, Windsurf, Continue, Cline, or a custom agent — instead
of only a hand-registered ChatGPT GPT. Two documents are published:

  /.well-known/oauth-authorization-server   (RFC 8414 — Authorization Server Metadata)
  /.well-known/oauth-protected-resource      (RFC 9728 — Protected Resource Metadata)

Discovery chain for an MCP client:
  1. Client calls {public_base_url}/mcp with no token.
  2. The mount wrapper in main.py answers 401 + WWW-Authenticate with
     resource_metadata pointing at /.well-known/oauth-protected-resource.
  3. Client reads that doc -> finds the authorization server (this issuer).
  4. Client reads /.well-known/oauth-authorization-server -> registration,
     authorize and token endpoints.
  5. Client registers itself (DCR, /api/oauth/register), runs the Authorization
     Code + PKCE flow, and calls /mcp with the resulting Bearer access token.

Routing note: in production the reverse proxy sends /api/* to the backend and
everything else to the frontend. These /.well-known/* paths are therefore
exposed to the backend via Next.js rewrites (frontend/next.config.mjs) — and,
for Caddy-level routing, via Caddyfile.whitelabel.example. Every absolute URL
below is built from settings (public_base_url / frontend_base_url), never from
request headers, so the documents stay correct behind the proxy.
"""

from __future__ import annotations

from fastapi import APIRouter

from .config import settings
from .services import GRANTABLE_SCOPES

router = APIRouter(tags=["oauth-metadata"])


def _backend() -> str:
    # Authorization server issuer + backend-hosted endpoints (token, register, userinfo).
    return settings.public_base_url.rstrip("/")


def _frontend() -> str:
    # The interactive login + consent page is a Next.js route on the frontend host.
    return settings.frontend_base_url.rstrip("/")


def _authorization_server_metadata() -> dict:
    base = _backend()
    return {
        "issuer": base,
        "authorization_endpoint": f"{_frontend()}/oauth/authorize",
        "token_endpoint": f"{base}/api/oauth/token",
        "registration_endpoint": f"{base}/api/oauth/register",
        "userinfo_endpoint": f"{base}/api/oauth/userinfo",
        "scopes_supported": sorted(GRANTABLE_SCOPES.keys()),
        "response_types_supported": ["code"],
        "response_modes_supported": ["query"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        # MCP requires PKCE; we only advertise S256 (never "plain").
        "code_challenge_methods_supported": ["S256"],
        # "none" == public client authenticating via PKCE (typical for MCP clients);
        # "client_secret_post" == confidential client presenting its secret.
        "token_endpoint_auth_methods_supported": ["client_secret_post", "none"],
        "service_documentation": f"{_frontend()}/docs/mcp-agent",
    }


def _protected_resource_metadata() -> dict:
    base = _backend()
    return {
        "resource": f"{base}/mcp",
        "authorization_servers": [base],
        "scopes_supported": sorted(GRANTABLE_SCOPES.keys()),
        "bearer_methods_supported": ["header"],
        "resource_documentation": f"{_frontend()}/docs/mcp-agent",
    }


# ── Authorization Server Metadata (RFC 8414) ────────────────────────────────────


@router.get("/.well-known/oauth-authorization-server")
async def oauth_authorization_server_metadata() -> dict:
    return _authorization_server_metadata()


# Some MCP clients derive the AS metadata path by appending the resource path
# ("/mcp") to the well-known prefix. Serve that variant too so discovery never
# depends on which convention the client picked.
@router.get("/.well-known/oauth-authorization-server/mcp")
async def oauth_authorization_server_metadata_mcp() -> dict:
    return _authorization_server_metadata()


# OIDC discovery alias — a handful of clients probe this path first.
@router.get("/.well-known/openid-configuration")
async def openid_configuration() -> dict:
    return _authorization_server_metadata()


# ── Protected Resource Metadata (RFC 9728) ──────────────────────────────────────


@router.get("/.well-known/oauth-protected-resource")
async def oauth_protected_resource_metadata() -> dict:
    return _protected_resource_metadata()


@router.get("/.well-known/oauth-protected-resource/mcp")
async def oauth_protected_resource_metadata_mcp() -> dict:
    return _protected_resource_metadata()
