"""MCP tool metadata and transport/security regressions."""

import json
import inspect
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException
from mcp.server.fastmcp.exceptions import ToolError
from starlette.requests import Request

from src import mcp_server
from src import main  # initialize router imports before importing oauth_api directly
from src.oauth_api import _grant_scopes
from src.services import _enforce_api_scope


def _http_context(authorization: str):
    return SimpleNamespace(request_context=SimpleNamespace(
        request=SimpleNamespace(headers={"authorization": authorization})
    ))


def _text(result) -> str:
    """The JSON text block every tool still returns for pre-structured clients."""
    return result.content[-1].text


def test_http_never_uses_server_environment_key(monkeypatch):
    monkeypatch.setattr(mcp_server, "API_KEY_ENV", "server-owner-secret")
    monkeypatch.setattr(mcp_server, "_ALLOW_ENV_KEY", False)
    with pytest.raises(PermissionError):
        mcp_server._get_api_key(_http_context("Basic abc"))
    with pytest.raises(PermissionError):
        mcp_server._get_api_key(_http_context("Bearer "))
    assert mcp_server._get_api_key(_http_context("Bearer user-token")) == "user-token"
    with pytest.raises(RuntimeError):
        mcp_server._get_api_key(None)
    monkeypatch.setattr(mcp_server, "_ALLOW_ENV_KEY", True)
    assert mcp_server._get_api_key(None) == "server-owner-secret"


def test_oauth_rejects_empty_or_unapproved_scopes():
    with pytest.raises(HTTPException) as empty:
        _grant_scopes("unknown:read", ["events:read"])
    assert empty.value.status_code == 400
    with pytest.raises(HTTPException):
        _grant_scopes("", [])
    assert _grant_scopes("events:read", ["events:read"]) == ["events:read"]


def test_agent_logs_require_read_scope_even_on_rest_route():
    request = Request({"type": "http", "method": "GET", "path": "/api/admin/mcp/agent-logs",
                       "headers": [], "query_string": b"", "server": ("test", 80), "scheme": "http"})
    with pytest.raises(HTTPException) as denied:
        _enforce_api_scope(request, ["certificates:read"])
    assert denied.value.status_code == 403
    _enforce_api_scope(request, ["events:read"])


def test_upstream_errors_hide_internal_url_and_body():
    response = httpx.Response(403, text="secret=internal-token", request=httpx.Request("GET", "http://internal/me"))
    with pytest.raises(mcp_server.MCPAPIError) as error:
        mcp_server._check_response(response)
    assert "internal" not in str(error.value)
    assert "secret" not in str(error.value)


@pytest.mark.asyncio
async def test_scope_lookup_fails_closed(monkeypatch):
    async def denied(*args, **kwargs):
        raise httpx.HTTPStatusError("401", request=httpx.Request("GET", "http://test/me"),
                                    response=httpx.Response(401))

    monkeypatch.setattr(mcp_server, "_get", denied)
    mcp_server._scope_cache.clear()
    with pytest.raises(httpx.HTTPStatusError):
        await mcp_server._require_scope("invalid-token", "events:write")
    assert not mcp_server._scope_cache


@pytest.mark.asyncio
async def test_read_only_scope_cannot_write(monkeypatch):
    async def identity(*args, **kwargs):
        return {"scopes": ["events:read"]}

    monkeypatch.setattr(mcp_server, "_get", identity)
    mcp_server._scope_cache.clear()
    await mcp_server._require_scope("read-only-token", "events:read")
    with pytest.raises(PermissionError):
        await mcp_server._require_scope("read-only-token", "events:write")


@pytest.mark.asyncio
async def test_tool_annotations_are_truthful():
    tools = {tool.name: tool for tool in await mcp_server.mcp.list_tools()}
    assert len(tools) == 38
    assert all(tool.title and tool.annotations for tool in tools.values())
    assert all(tool.annotations.readOnlyHint is not None and
               tool.annotations.destructiveHint is not None and
               tool.annotations.openWorldHint is not None and
               tool.annotations.idempotentHint is not None for tool in tools.values())
    for name in ("list_events", "list_attendees", "get_event_analytics"):
        assert tools[name].annotations.readOnlyHint is True
    for name in ("delete_event", "remove_attendee", "revoke_certificate", "issue_certificates"):
        assert tools[name].annotations.destructiveHint is True
        assert tools[name].annotations.readOnlyHint is False
    for name in ("create_webhook", "create_automation_rule"):
        assert tools[name].annotations.openWorldHint is True


@pytest.mark.asyncio
async def test_every_tool_declares_the_scope_it_checks():
    tools = {tool.name: tool for tool in await mcp_server.mcp.list_tools()}
    assert tools.keys() == mcp_server.TOOL_SCOPES.keys()
    assert len(tools) == 38
    for name, tool in tools.items():
        assert tool.model_dump(by_alias=True)["securitySchemes"] == [
            {"type": "oauth2", "scopes": [mcp_server.TOOL_SCOPES[name]]}
        ]
        implementation = inspect.getsource(getattr(mcp_server, name))
        assert f'_require_scope(api_key, "{mcp_server.TOOL_SCOPES[name]}")' in implementation


@pytest.mark.asyncio
async def test_scope_failure_returns_mcp_authenticate_metadata(monkeypatch):
    async def forbidden(*args, **kwargs):
        try:
            raise PermissionError("scope denied")
        except PermissionError as exc:
            raise ToolError("hidden internals") from exc

    monkeypatch.setattr(mcp_server.mcp._tool_manager, "call_tool", forbidden)
    result = await mcp_server.mcp.call_tool("create_event", {"name": "Test"})
    assert result.isError is True
    assert result.meta["mcp/www_authenticate"]
    challenge = result.meta["mcp/www_authenticate"][0]
    assert 'error="insufficient_scope"' in challenge
    assert 'scope="events:write"' in challenge
    assert "hidden internals" not in str(result.content)


def test_model_visible_results_redact_nested_credentials():
    result = json.loads(mcp_server._fmt({"items": [{"secret": "private", "url": "https://example.com",
                                                   "headers": {"Authorization": "Bearer private"}}],
                                          "access_token": "oauth", "email": "owner@example.com"}))
    assert result["items"][0]["secret"] == "[REDACTED]"
    assert result["items"][0]["headers"]["Authorization"] == "[REDACTED]"
    assert result["access_token"] == "[REDACTED]"
    assert result["items"][0]["url"] == "https://example.com"


@pytest.mark.asyncio
async def test_agent_logs_omit_historic_pii(monkeypatch):
    async def allowed(*args, **kwargs):
        return None

    async def logs(*args, **kwargs):
        return [{"id": 3, "tool_name": "add_attendee", "event_id": 7,
                 "created_at": "2026-09-22T00:00:00Z", "payload": {"email": "private@example.com"},
                 "result_summary": "Added private@example.com"}]

    monkeypatch.setattr(mcp_server, "_require_scope", allowed)
    monkeypatch.setattr(mcp_server, "_get", logs)
    result = await mcp_server.list_agent_logs(_http_context("Bearer owner-token"))
    text = _text(result)
    assert "private@example.com" not in text
    assert result.structuredContent["logs"][0]["tool_name"] == "add_attendee"
    # The two halves of every result must carry exactly the same payload.
    assert json.loads(text) == result.structuredContent


@pytest.mark.asyncio
async def test_certificate_issuance_requires_confirmation(monkeypatch):
    async def allowed(*args, **kwargs):
        return None

    calls = []

    async def posted(path, api_key, body):
        calls.append((path, body))
        return {"id": 12}

    async def health(*args, **kwargs):
        return {"event_id": 7, "overview": {"attendees": 41}}

    monkeypatch.setattr(mcp_server, "_require_scope", allowed)
    monkeypatch.setattr(mcp_server, "_post", posted)
    monkeypatch.setattr(mcp_server, "_get", health)
    monkeypatch.setattr(mcp_server, "_fire_and_forget_log", lambda *a, **kw: None)
    ctx = _http_context("Bearer owner-token")
    with pytest.raises(ValueError):
        await mcp_server.issue_certificates(ctx, event_id=7, attendee_ids=[9], confirm=True)
    preview = (await mcp_server.issue_certificates(ctx, event_id=7)).structuredContent
    assert preview["status"] == "preview"
    assert preview["requires_confirm"] is True
    assert preview["eligible_count"] == 41
    assert calls == []
    result = (await mcp_server.issue_certificates(ctx, event_id=7, confirm=True)).structuredContent
    assert result["status"] == "queued"
    assert result["job_id"] == 12
    assert calls == [("/api/admin/events/7/bulk-certify-queue", {})]


@pytest.mark.asyncio
async def test_every_tool_declares_an_output_schema():
    tools = await mcp_server.mcp.list_tools()
    missing = [tool.name for tool in tools if not tool.outputSchema]
    assert missing == []
    assert all(tool.outputSchema.get("type") == "object" for tool in tools)


@pytest.mark.asyncio
async def test_widget_tools_point_at_a_published_component():
    tools = {tool.name: tool for tool in await mcp_server.mcp.list_tools()}
    published = {str(resource.uri) for resource in await mcp_server.mcp.list_resources()}
    assert published == {mcp_server._widget_uri(name) for name in mcp_server.WIDGETS}

    for name, widget in mcp_server.TOOL_WIDGETS.items():
        meta = tools[name].model_dump(by_alias=True)["_meta"]
        uri = mcp_server._widget_uri(widget)
        assert uri in published
        # The shared key and the ChatGPT alias must never drift apart.
        assert meta["ui"]["resourceUri"] == uri
        assert meta["openai/outputTemplate"] == uri
        assert len(meta["openai/toolInvocation/invoking"]) <= 64
        assert len(meta["openai/toolInvocation/invoked"]) <= 64

    for name, tool in tools.items():
        if name not in mcp_server.TOOL_WIDGETS:
            assert "openai/outputTemplate" not in (tool.meta or {})


@pytest.mark.asyncio
async def test_widget_components_are_self_contained():
    for resource in await mcp_server.mcp.list_resources():
        assert resource.mimeType == mcp_server.WIDGET_MIME
        meta = resource.meta or {}
        assert meta["ui"]["domain"] == mcp_server.WIDGET_ORIGIN
        # Components render server-supplied structuredContent only.
        assert meta["ui"]["csp"]["connectDomains"] == []
        html = "".join(c.content for c in await mcp_server.mcp.read_resource(str(resource.uri)))
        assert 'id="hc-root"' in html and "globalThis.HC" in html
        for forbidden in ("<script src=", "fetch(", "XMLHttpRequest", "localStorage"):
            assert forbidden not in html, f"{resource.uri} reaches outside the host bridge"


@pytest.mark.asyncio
async def test_attendee_projection_drops_unrequested_personal_data(monkeypatch):
    async def allowed(*args, **kwargs):
        return None

    async def attendees(*args, **kwargs):
        return {
            "items": [{
                "id": 4, "name": "Ada", "email": "ada@example.com", "source": "manual",
                "registered_at": "2026-09-01T10:00:00Z", "sessions_attended": 2,
                "has_certificate": True,
                # Fields the REST layer returns but no tool description promises.
                "registration_answers": {"National ID": "12345678901"},
                "public_member_id": 9, "public_member_email": "ada.private@example.com",
            }],
            "total": 120, "page": 1, "limit": 50,
        }

    monkeypatch.setattr(mcp_server, "_require_scope", allowed)
    monkeypatch.setattr(mcp_server, "_get", attendees)
    result = await mcp_server.list_attendees(_http_context("Bearer owner-token"), event_id=7)
    text = _text(result)
    assert "12345678901" not in text and "ada.private@example.com" not in text
    assert "public_member_id" not in text
    row = result.structuredContent["attendees"][0]
    assert set(row) == set(mcp_server._ATTENDEE_FIELDS)
    assert row["email"] == "ada@example.com"
    assert result.structuredContent["has_more"] is True


@pytest.mark.asyncio
async def test_delete_preview_reports_the_real_counts(monkeypatch):
    """The health payload nests its counts under `overview` with other names.

    Reading them off the top level made every count render as "unknown", which
    silently stripped a destructive confirmation of the numbers it exists for.
    """
    async def allowed(*args, **kwargs):
        return None

    async def get(path, api_key, params=None):
        if path.endswith("/health"):
            return {"overview": {"attendees": 12, "sessions": 3, "certificates": 8}}
        return {"id": 7, "name": "Demo Day"}

    monkeypatch.setattr(mcp_server, "_require_scope", allowed)
    monkeypatch.setattr(mcp_server, "_get", get)

    async def must_not_delete(*args, **kwargs):
        raise AssertionError("preview must not delete")

    monkeypatch.setattr(mcp_server, "_delete", must_not_delete)
    preview = (await mcp_server.delete_event(_http_context("Bearer owner-token"), event_id=7)).structuredContent
    assert preview["status"] == "preview"
    assert preview["will_delete"] == {"attendees": 12, "certificates": 8, "sessions": 3}


@pytest.mark.asyncio
async def test_certificate_projection_links_verification_not_pdf(monkeypatch):
    async def allowed(*args, **kwargs):
        return None

    async def certificates(*args, **kwargs):
        return {"items": [{"id": 5, "public_id": "abc-123", "student_name": "Ada",
                           "status": "revoked", "issued_at": "2026-09-01T00:00:00Z",
                           "pdf_url": "https://cdn.example.com/secret.pdf"}],
                "total": 1, "page": 1, "limit": 20}

    monkeypatch.setattr(mcp_server, "_require_scope", allowed)
    monkeypatch.setattr(mcp_server, "_get", certificates)
    result = await mcp_server.list_certificates(_http_context("Bearer owner-token"), event_id=7)
    cert = result.structuredContent["certificates"][0]
    assert cert["verify_url"].endswith("/verify/abc-123")
    assert cert["recipient_name"] == "Ada"
    assert "pdf_url" not in cert and "secret.pdf" not in _text(result)


@pytest.mark.asyncio
async def test_bulk_attendee_limit_blocks_mutation(monkeypatch):
    async def allowed(*args, **kwargs):
        return None

    async def must_not_post(*args, **kwargs):
        raise AssertionError("No attendee should be added")

    monkeypatch.setattr(mcp_server, "_require_scope", allowed)
    monkeypatch.setattr(mcp_server, "_post", must_not_post)
    with pytest.raises(ValueError):
        await mcp_server.bulk_add_attendees(_http_context("Bearer owner-token"), 7, [{}] * 101)
