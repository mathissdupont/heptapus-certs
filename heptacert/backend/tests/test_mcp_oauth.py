"""Tests for "connect from any AI client" OAuth/MCP support.

Covers the four pieces that make HeptaCert's OAuth server usable by any
standards-compliant MCP client (not just a hand-registered ChatGPT GPT):

  1. Scope taxonomy is consistent — every scope the enforcement mapper can
     require is actually grantable (regression for the sessions/checkin/
     automations bug where scoped tokens got 403 on those endpoints).
  2. Discovery metadata documents (RFC 8414 + RFC 9728).
  3. The /mcp endpoint returns a 401 + WWW-Authenticate challenge so clients
     can discover how to authenticate.
  4. Dynamic Client Registration (RFC 7591) + full authorization-code + PKCE
     flow, ending with real end-to-end scope enforcement on an OAuth token.
"""
import base64
import hashlib
import secrets
from urllib.parse import urlparse, parse_qs

import pytest
from httpx import AsyncClient, ASGITransport

from src.main import (
    app, SessionLocal, User, Organization, Subscription, Role,
    create_access_token, hash_password,
)
from src.services import GRANTABLE_SCOPES, _required_scope_for_request


@pytest.fixture(autouse=True)
def _disable_rate_limiter():
    from src.main import limiter
    prev = limiter.enabled
    limiter.enabled = False
    yield
    limiter.enabled = prev


def _client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _pkce():
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()
    return verifier, challenge


async def _admin(email: str, org_public_id: str):
    async with SessionLocal() as db:
        admin = User(email=email, password_hash=hash_password("AdminPass123!"), role=Role.admin)
        db.add(admin)
        await db.flush()
        db.add(Organization(user_id=admin.id, public_id=org_public_id, org_name="Org",
                            brand_color="#111111", settings={}))
        db.add(Subscription(user_id=admin.id, plan_id="growth", is_active=True))
        await db.commit()
        await db.refresh(admin)
        return admin.id, {"Authorization": f"Bearer {create_access_token(user_id=admin.id, role=Role.admin)}"}


# ── 1. Scope taxonomy invariant ─────────────────────────────────────────────────


class TestScopeTaxonomy:
    """The scope the enforcement mapper requires for a path MUST be grantable,
    otherwise scoped credentials can never reach that endpoint."""

    @pytest.mark.parametrize("method,path,expected", [
        ("GET",  "/api/admin/events",                        "events:read"),
        ("POST", "/api/admin/events",                        "events:write"),
        ("GET",  "/api/admin/events/1/attendees",            "attendees:read"),
        ("POST", "/api/admin/events/1/attendees",            "attendees:write"),
        ("GET",  "/api/admin/events/1/sessions",             "sessions:read"),
        ("POST", "/api/admin/events/1/sessions",             "sessions:write"),
        ("POST", "/api/admin/events/1/sessions/2/checkin",   "checkin:write"),
        ("GET",  "/api/admin/events/1/certificates",         "certificates:read"),
        ("POST", "/api/admin/events/1/certificates",         "certificates:write"),
        ("GET",  "/api/admin/events/1/automations",          "automations:read"),
        ("POST", "/api/admin/events/1/automations",          "automations:write"),
        ("GET",  "/api/admin/events/1/analytics",            "analytics:read"),
        # Previously-unclassified surfaces the MCP tools touch (would 403 for any
        # scoped token). Must now classify to a grantable scope.
        ("GET",  "/api/admin/lms/courses",                   "events:read"),
        ("POST", "/api/admin/lms/courses/1/enrollments/import", "attendees:write"),
        ("GET",  "/api/admin/lms/courses/1/analytics",       "analytics:read"),
        ("GET",  "/api/admin/webhooks",                      "events:read"),
        ("POST", "/api/admin/webhooks",                      "events:write"),
        ("GET",  "/api/admin/organization/settings",         "events:read"),
        ("GET",  "/api/admin/crm/contacts",                  "crm:read"),
        ("GET",  "/api/admin/events/1/surveys/responses",    "events:read"),
        ("GET",  "/api/admin/events/1/attendance",           "attendees:read"),
    ])
    def test_required_scope_is_grantable(self, method, path, expected):
        required = _required_scope_for_request(method, path)
        assert required == expected, f"{method} {path} -> {required}, beklenen {expected}"
        assert required in GRANTABLE_SCOPES, f"{required} grant edilemez!"

    def test_previously_missing_scopes_are_now_grantable(self):
        # The exact scopes that used to be required-but-not-grantable.
        for s in ("sessions:read", "sessions:write", "checkin:write",
                  "automations:read", "automations:write"):
            assert s in GRANTABLE_SCOPES


# ── 2. Discovery metadata ───────────────────────────────────────────────────────


class TestDiscoveryMetadata:
    @pytest.mark.asyncio
    async def test_authorization_server_metadata(self):
        async with _client() as ac:
            r = await ac.get("/.well-known/oauth-authorization-server")
        assert r.status_code == 200
        d = r.json()
        assert d["issuer"]
        assert d["token_endpoint"].endswith("/api/oauth/token")
        assert d["registration_endpoint"].endswith("/api/oauth/register")
        assert "/oauth/authorize" in d["authorization_endpoint"]
        assert d["code_challenge_methods_supported"] == ["S256"]
        assert "none" in d["token_endpoint_auth_methods_supported"]
        assert set(d["scopes_supported"]) == set(GRANTABLE_SCOPES)

    @pytest.mark.asyncio
    async def test_protected_resource_metadata(self):
        async with _client() as ac:
            r = await ac.get("/.well-known/oauth-protected-resource")
        assert r.status_code == 200
        d = r.json()
        assert d["resource"].endswith("/mcp")
        assert isinstance(d["authorization_servers"], list) and d["authorization_servers"]


# ── 3. MCP 401 challenge ────────────────────────────────────────────────────────


class TestMCPChallenge:
    @pytest.mark.asyncio
    async def test_mcp_without_token_returns_401_with_resource_metadata(self):
        # Starlette redirects the bare mount path /mcp -> /mcp/ (307); real MCP
        # clients follow it, then hit the auth-challenge wrapper. follow_redirects
        # mirrors that real-client behaviour.
        async with _client() as ac:
            r = await ac.post("/mcp", json={"jsonrpc": "2.0", "method": "initialize", "id": 1},
                              follow_redirects=True)
        assert r.status_code == 401
        assert "resource_metadata" in r.headers.get("www-authenticate", "").lower()

    @pytest.mark.asyncio
    async def test_mcp_slash_path_challenges_directly(self):
        # /mcp/ (trailing slash) hits the wrapper with no redirect hop.
        async with _client() as ac:
            r = await ac.post("/mcp/", json={"jsonrpc": "2.0", "method": "initialize", "id": 1})
        assert r.status_code == 401
        assert "resource_metadata" in r.headers.get("www-authenticate", "").lower()


# ── 4. DCR + full flow + scope enforcement ──────────────────────────────────────


class TestDynamicClientRegistration:
    @pytest.mark.asyncio
    async def test_public_client_has_no_secret(self):
        async with _client() as ac:
            r = await ac.post("/api/oauth/register", json={
                "client_name": "Public MCP Client",
                "redirect_uris": ["https://claude.ai/api/mcp/auth_callback"],
                "token_endpoint_auth_method": "none",
                "scope": "events:read events:write",
            })
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["client_id"].startswith("hc_")
        assert d["token_endpoint_auth_method"] == "none"
        assert "client_secret" not in d
        assert set(d["scope"].split()) == {"events:read", "events:write"}

    @pytest.mark.asyncio
    async def test_confidential_client_gets_secret_once(self):
        async with _client() as ac:
            r = await ac.post("/api/oauth/register", json={
                "redirect_uris": ["https://example.com/cb"],
                "token_endpoint_auth_method": "client_secret_post",
            })
        assert r.status_code == 201, r.text
        assert r.json().get("client_secret")

    @pytest.mark.asyncio
    async def test_insecure_redirect_uri_rejected(self):
        async with _client() as ac:
            r = await ac.post("/api/oauth/register", json={
                "redirect_uris": ["http://evil.example.com/cb"],
            })
        assert r.status_code == 400

    @pytest.mark.asyncio
    async def test_localhost_http_redirect_allowed_for_dev(self):
        async with _client() as ac:
            r = await ac.post("/api/oauth/register", json={
                "redirect_uris": ["http://localhost:8080/callback"],
            })
        assert r.status_code == 201, r.text


class TestEndToEndScopeEnforcement:
    @pytest.mark.asyncio
    async def test_scoped_public_client_token_is_enforced(self):
        """DCR -> authorize (PKCE) -> token -> the resulting events:read token can
        read events but is denied on write. Exercises the whole 'any client'
        chain plus REST-layer scope enforcement of the OAuth token."""
        _uid, admin_headers = await _admin("mcp-oauth-e2e@test.com", "org_mcp_e2e")
        verifier, challenge = _pkce()
        redirect_uri = "https://claude.ai/api/mcp/auth_callback"

        async with _client() as ac:
            # 1. Register a public client limited to events:read.
            reg = await ac.post("/api/oauth/register", json={
                "client_name": "Scoped Client",
                "redirect_uris": [redirect_uri],
                "token_endpoint_auth_method": "none",
                "scope": "events:read",
            })
            assert reg.status_code == 201, reg.text
            client_id = reg.json()["client_id"]

            # 2. User consents -> authorization code.
            authz = await ac.post("/api/oauth/authorize", headers=admin_headers, json={
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "scope": "events:read",
                "state": "st-123",
                "code_challenge": challenge,
                "code_challenge_method": "S256",
            })
            assert authz.status_code == 200, authz.text
            qs = parse_qs(urlparse(authz.json()["redirect_url"]).query)
            assert qs.get("state") == ["st-123"]
            code = qs["code"][0]

            # 3. Public client exchanges the code with PKCE (no secret).
            tok = await ac.post("/api/oauth/token", data={
                "grant_type": "authorization_code",
                "client_id": client_id,
                "code": code,
                "redirect_uri": redirect_uri,
                "code_verifier": verifier,
            })
            assert tok.status_code == 200, tok.text
            payload = tok.json()
            assert payload["scope"] == "events:read"
            assert payload.get("refresh_token")
            oauth_headers = {"Authorization": f"Bearer {payload['access_token']}"}

            # 4a. events:read granted -> read allowed.
            rd = await ac.get("/api/admin/events", headers=oauth_headers)
            assert rd.status_code == 200, rd.text

            # 4b. events:write NOT granted -> write denied by scope enforcement.
            wr = await ac.post("/api/admin/events", headers=oauth_headers, json={
                "name": "Should be blocked", "template_image_url": "placeholder"})
            assert wr.status_code == 403, wr.text

    @pytest.mark.asyncio
    async def test_public_client_can_refresh_without_secret(self):
        """Public clients must be able to use the refresh_token grant (they hold
        no secret). Regression for the branch that required client auth."""
        _uid, admin_headers = await _admin("mcp-oauth-refresh@test.com", "org_mcp_refresh")
        verifier, challenge = _pkce()
        redirect_uri = "https://claude.ai/api/mcp/auth_callback"

        async with _client() as ac:
            reg = await ac.post("/api/oauth/register", json={
                "redirect_uris": [redirect_uri],
                "token_endpoint_auth_method": "none",
                "scope": "events:read",
            })
            client_id = reg.json()["client_id"]
            authz = await ac.post("/api/oauth/authorize", headers=admin_headers, json={
                "client_id": client_id, "redirect_uri": redirect_uri, "scope": "events:read",
                "code_challenge": challenge, "code_challenge_method": "S256",
            })
            code = parse_qs(urlparse(authz.json()["redirect_url"]).query)["code"][0]
            tok = await ac.post("/api/oauth/token", data={
                "grant_type": "authorization_code", "client_id": client_id,
                "code": code, "redirect_uri": redirect_uri, "code_verifier": verifier,
            })
            refresh_token = tok.json()["refresh_token"]

            # Refresh with NO client_secret must succeed for a public client.
            refreshed = await ac.post("/api/oauth/token", data={
                "grant_type": "refresh_token",
                "client_id": client_id,
                "refresh_token": refresh_token,
            })
        assert refreshed.status_code == 200, refreshed.text
        assert refreshed.json().get("access_token")
