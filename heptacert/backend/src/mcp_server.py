"""
HeptaCert MCP Server

Expose HeptaCert as a full agentic MCP service. AI agents can create and manage
events, attendees, sessions, certificates, check-ins, automation rules, and query
analytics — all within proper security boundaries.

── Authentication ────────────────────────────────────────────────────────────────
  stdio mode (Claude Desktop):
    Set HEPTACERT_API_KEY env var then run the script.
    Each user runs their own process with their own API key.

  streamable-http mode (hosted / multi-user):
    Pass `Authorization: Bearer hc_live_...` in every request.
    The env var is only used by stdio; HTTP requires a per-request bearer token.
    Mount the same process for all users — auth is per-request.

── Scope Enforcement ────────────────────────────────────────────────────────────
  API keys generated from the HeptaCert dashboard carry granular scopes:
    events:read / events:write
    attendees:read / attendees:write
    certificates:read / certificates:write
    analytics:read
  Write tools will raise a clear error when the key lacks the required scope.

── Audit Trail ──────────────────────────────────────────────────────────────────
  Every write operation is logged to the HeptaCert agent audit trail
  (Admin Dashboard → Settings → Agent Logs). Fire-and-forget; tool does not
  block on log completion.

── Destructive Operations ───────────────────────────────────────────────────────
  delete_event, remove_attendee, revoke_certificate, delete_session all require
  confirm=True. Without it they return a preview of what would be deleted.

── Environment variables ─────────────────────────────────────────────────────────
  HEPTACERT_API_KEY   API key starting with hc_live_  (optional in HTTP mode)
  HEPTACERT_API_BASE  Base URL of the HeptaCert API   (default: http://localhost:8000)

── Usage ────────────────────────────────────────────────────────────────────────
  stdio:
    HEPTACERT_API_KEY=hc_live_... python mcp_server.py

  hosted HTTP (multi-user):
    python mcp_server.py --transport streamable-http --port 8100

  Claude Desktop config:
    {
      "mcpServers": {
        "heptacert": {
          "command": "python",
          "args": ["/path/to/heptacert/backend/src/mcp_server.py"],
          "env": { "HEPTACERT_API_KEY": "hc_live_..." }
        }
      }
    }

  Hosted Claude config (no local Python):
    {
      "mcpServers": {
        "heptacert": {
          "url": "https://yourapp.com/mcp",
          "headers": { "Authorization": "Bearer hc_live_..." }
        }
      }
    }
"""

import asyncio
import hashlib
import json
import os
import sys
from pathlib import Path
from typing import Annotated, Any, Optional
from urllib.parse import urlsplit

import httpx
from mcp.server.fastmcp import FastMCP, Context
from mcp.server.fastmcp.exceptions import ToolError
from mcp.server.transport_security import TransportSecuritySettings
from mcp.types import CallToolResult, TextContent, ToolAnnotations
from pydantic import BaseModel, ConfigDict, Field

# ── Configuration ──────────────────────────────────────────────────────────────

API_BASE = os.getenv("HEPTACERT_API_BASE", "http://localhost:8000").rstrip("/")
API_KEY_ENV = os.getenv("HEPTACERT_API_KEY", "")
_ALLOW_ENV_KEY = False  # enabled only by the direct stdio entry point
PUBLIC_BASE = os.getenv("PUBLIC_BASE_URL", API_BASE).rstrip("/")
# Certificate verification is a public page on the web app, not an API route.
FRONTEND_BASE = os.getenv("FRONTEND_BASE_URL", "").rstrip("/") or PUBLIC_BASE

# ChatGPT's per-tool OAuth declaration must match the server-side _require_scope
# precheck. Keep names stable for existing MCP clients and fail tests on drift.
TOOL_SCOPES: dict[str, str] = {
    "list_events": "events:read", "get_event": "events:read", "get_event_stats": "events:read",
    "create_event": "events:write", "update_event": "events:write", "delete_event": "events:write",
    "close_registration": "events:write", "open_registration": "events:write",
    "list_attendees": "attendees:read", "add_attendee": "attendees:write",
    "bulk_add_attendees": "attendees:write", "update_attendee": "attendees:write",
    "remove_attendee": "attendees:write", "list_sessions": "sessions:read",
    "create_session": "sessions:write", "update_session": "sessions:write",
    "delete_session": "sessions:write", "checkin_lookup": "attendees:read",
    "manual_checkin": "checkin:write", "get_attendance_summary": "attendees:read",
    "list_certificates": "certificates:read", "issue_certificates": "certificates:write",
    "revoke_certificate": "certificates:write", "get_certificate_tier_summary": "certificates:read",
    "list_automation_rules": "automations:read", "create_automation_rule": "automations:write",
    "get_survey_responses": "events:read", "get_organization_settings": "events:read",
    "list_agent_logs": "events:read", "update_automation_rule": "automations:write",
    "delete_automation_rule": "automations:write", "list_webhooks": "events:read",
    "create_webhook": "events:write", "delete_webhook": "events:write",
    "search_attendees_across_events": "crm:read", "export_event_attendees": "attendees:read",
    "get_event_analytics": "analytics:read", "get_certificate_by_public_id": "certificates:read",
}


# ── Apps SDK UI components ─────────────────────────────────────────────────────
#
# ChatGPT renders a tool result with an inline component when the tool points at
# a `ui://` resource. The component markup lives in mcp_widgets/ so it stays
# reviewable as HTML/CSS/JS instead of Python string literals, and is assembled
# at read time. Components are read-only views over structuredContent the server
# already redacted: they never hold a credential and never issue a write of
# their own — a widget button only ever drafts a follow-up prompt for the user.

_WIDGET_DIR = Path(__file__).resolve().parent / "mcp_widgets"
WIDGET_MIME = "text/html;profile=mcp-app"


def _origin(url: str) -> str:
    parts = urlsplit(url)
    return f"{parts.scheme}://{parts.netloc}" if parts.scheme and parts.netloc else url


# OpenAI requires a dedicated origin for hosted components when a plugin with UI
# is submitted for review. Default to the public origin so self-hosted and local
# installs keep working; production sets HEPTACERT_WIDGET_ORIGIN to the origin
# registered with OpenAI.
WIDGET_ORIGIN = os.getenv("HEPTACERT_WIDGET_ORIGIN", "").rstrip("/") or _origin(PUBLIC_BASE)

WIDGETS: dict[str, str] = {
    "event-list": "A scannable list of HeptaCert events with date, type and visibility.",
    "event-card": "A single HeptaCert event with its key counts and enabled features.",
    "attendee-table": "A page of event attendees with registration and certificate status.",
    "certificate-list": "Certificates issued for an event with their validity status.",
    "certificate-card": "A single certificate with its verification status and code.",
    "issue-confirmation": "A confirmation summary before certificates are queued for issuance.",
}

# Tools whose result ChatGPT should render with a component.
TOOL_WIDGETS: dict[str, str] = {
    "list_events": "event-list",
    "get_event": "event-card",
    "list_attendees": "attendee-table",
    "list_certificates": "certificate-list",
    "get_certificate_by_public_id": "certificate-card",
    "issue_certificates": "issue-confirmation",
}

# Status text shown while a tool runs and once it finishes (max 64 chars each).
TOOL_INVOCATION: dict[str, tuple[str, str]] = {
    "list_events": ("Loading your events", "Loaded events"),
    "get_event": ("Loading the event", "Loaded the event"),
    "list_attendees": ("Loading attendees", "Loaded attendees"),
    "list_certificates": ("Loading certificates", "Loaded certificates"),
    "get_certificate_by_public_id": ("Verifying the certificate", "Verified the certificate"),
    "issue_certificates": ("Preparing certificate issuance", "Prepared certificate issuance"),
}


def _widget_uri(name: str) -> str:
    return f"ui://heptacert/{name}.html"


def _widget_html(name: str) -> str:
    """Assemble one component: shared tokens + runtime bridge + the view itself."""
    css = (_WIDGET_DIR / "common.css").read_text(encoding="utf-8")
    runtime = (_WIDGET_DIR / "common.js").read_text(encoding="utf-8")
    body = (_WIDGET_DIR / f"{name}.html").read_text(encoding="utf-8")
    # A classic (non-module) script guarantees the shared runtime has executed
    # before the view's own script runs, in document order.
    return f"<style>\n{css}\n</style>\n<script>\n{runtime}\n</script>\n{body}"


def _widget_resource_meta(description: str) -> dict[str, Any]:
    # Components render server-provided structuredContent only, so no outbound
    # connection is allowed; assets resolve against HeptaCert's own origin.
    csp_domains = {"connectDomains": [], "resourceDomains": [WIDGET_ORIGIN]}
    return {
        "ui": {"prefersBorder": True, "domain": WIDGET_ORIGIN, "csp": csp_domains},
        "openai/widgetDescription": description,
        # Compatibility aliases for ChatGPT builds that predate the shared `ui` keys.
        "openai/widgetPrefersBorder": True,
        "openai/widgetDomain": WIDGET_ORIGIN,
        "openai/widgetCSP": {"connect_domains": [], "resource_domains": [WIDGET_ORIGIN]},
    }


def _tool_meta(name: str) -> dict[str, Any]:
    meta: dict[str, Any] = {}
    widget = TOOL_WIDGETS.get(name)
    if widget:
        uri = _widget_uri(widget)
        meta["ui"] = {"resourceUri": uri}
        meta["openai/outputTemplate"] = uri  # ChatGPT alias for ui.resourceUri
    phrases = TOOL_INVOCATION.get(name)
    if phrases:
        meta["openai/toolInvocation/invoking"] = phrases[0]
        meta["openai/toolInvocation/invoked"] = phrases[1]
    return meta


class HeptaCertMCP(FastMCP):
    async def list_tools(self):
        tools = await super().list_tools()
        for tool in tools:
            # MCP Python 1.28 permits protocol extension fields on Tool but does
            # not yet expose securitySchemes in FastMCP's decorator signature.
            tool.securitySchemes = [{"type": "oauth2", "scopes": [TOOL_SCOPES[tool.name]]}]
            # Declared here rather than on 38 decorators so the widget wiring
            # stays in one table next to the scope table it must agree with.
            meta = _tool_meta(tool.name)
            if meta:
                tool.meta = {**(tool.meta or {}), **meta}
        return tools

    async def call_tool(self, name: str, arguments: dict[str, Any]):
        try:
            return await super().call_tool(name, arguments)
        except ToolError as exc:
            cause = exc.__cause__
            if not (isinstance(cause, PermissionError) or
                    isinstance(cause, MCPAPIError) and cause.status_code in (401, 403)):
                raise
            error = "insufficient_scope" if isinstance(cause, PermissionError) or cause.status_code == 403 else "invalid_token"
            scope = TOOL_SCOPES.get(name, "")
            challenge = (
                f'Bearer resource_metadata="{PUBLIC_BASE}/.well-known/oauth-protected-resource", '
                f'error="{error}", error_description="Reconnect HeptaCert with the required permission", '
                f'scope="{scope}"'
            )
            return CallToolResult(
                content=[TextContent(type="text", text="HeptaCert authorization is required for this action.")],
                isError=True,
                _meta={"mcp/www_authenticate": [challenge]},
            )

mcp = HeptaCertMCP(
    "HeptaCert",
    # Serve the Streamable HTTP transport at the app root so that mounting this
    # sub-app at "/mcp" in main.py yields the endpoint at exactly "/mcp"
    # (the default "/mcp" path would otherwise resolve to "/mcp/mcp").
    streamable_http_path="/",
    # Stateless: the backend runs with multiple uvicorn workers; session state
    # must not be pinned to a single worker. Each request is self-contained and
    # authenticated via its own Bearer token.
    stateless_http=True,
    # Auth is per-request Bearer token (hc_live_...) and the server sits behind
    # the main API + reverse proxy, so the browser-oriented DNS-rebinding guard
    # (which otherwise 421s every Host) is not the relevant threat model here.
    transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
    instructions=(
        "You are connected to HeptaCert, a professional event management and certificate "
        "issuance platform. You can create and manage events, attendees, sessions, "
        "certificates, check-ins, automation rules, and view analytics.\n\n"
        "IMPORTANT RULES:\n"
        "- Always confirm event name and date with the user before creating records.\n"
        "- For destructive actions (delete_event, remove_attendee, revoke_certificate, "
        "delete_session, issue_certificates) call without confirm=True first to preview, then call again with "
        "confirm=True only after explicit user approval.\n"
        "- Use list_events to discover event IDs.\n"
        "- Never invent IDs — always look them up first."
    ),
)


def _register_widget_resources() -> None:
    """Publish each component as a `ui://` resource the host can fetch."""

    def _reader(widget_name: str):
        # A closure, not a default argument: FastMCP requires the reader's
        # signature to match the URI template, which takes no parameters.
        def _read() -> str:
            return _widget_html(widget_name)

        return _read

    for name, description in WIDGETS.items():
        mcp.resource(
            _widget_uri(name),
            name=f"heptacert-{name}",
            title=description,
            description=description,
            mime_type=WIDGET_MIME,
            meta=_widget_resource_meta(description),
        )(_reader(name))


_register_widget_resources()

# ── Auth helpers ───────────────────────────────────────────────────────────────


def _get_api_key(ctx: Optional[Context] = None) -> str:
    """
    Resolve the API key for this request.
    In HTTP mode, read from the request's Authorization header (per-user, per-request).
    In stdio mode, use the HEPTACERT_API_KEY environment variable.
    """
    if ctx is not None:
        try:
            request = ctx.request_context.request
        except AttributeError:
            request = None  # stdio transport has no HTTP request
        if request is not None:
            auth = request.headers.get("authorization", "")
            scheme, _, key = auth.partition(" ")
            if scheme.lower() == "bearer" and key.strip():
                # API keys and OAuth tokens are validated by the REST API.
                return key.strip()
            raise PermissionError("HTTP MCP requests require a Bearer credential.")
    if _ALLOW_ENV_KEY and API_KEY_ENV:
        return API_KEY_ENV
    raise RuntimeError(
        "No API key found. In stdio mode: set HEPTACERT_API_KEY env var. "
        "In HTTP mode: pass Authorization: Bearer <hc_live_... or OAuth token> "
        "in the request header."
    )


def _headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _fmt(data: object) -> str:
    # REST webhook responses include signing secrets. Never surface these (or
    # other credentials) in model-visible MCP tool results, including nested data.
    sensitive = {
        "secret", "client_secret", "clientsecret", "signing_secret", "session_secret",
        "webhook_secret", "access_token", "refresh_token", "password", "api_key",
        "apikey", "token", "authorization", "private_key", "set-cookie",
    }

    def redact(value: object) -> object:
        if isinstance(value, dict):
            return {k: "[REDACTED]" if k.lower() in sensitive else redact(v) for k, v in value.items()}
        if isinstance(value, list):
            return [redact(v) for v in value]
        return value

    return json.dumps(redact(data), ensure_ascii=False, indent=2, default=str)


# ── Structured output contract ─────────────────────────────────────────────────
#
# Every tool answers with both a JSON text block — what pre-structuredContent
# clients read — and `structuredContent` carrying the same redacted payload.
# Tools whose shape HeptaCert controls additionally declare an `outputSchema`
# via `Annotated[CallToolResult, Model]`, so a client (and the ChatGPT
# component) can rely on the field names.
#
# Two rules hold for every model below:
#   * all fields are optional, and extra keys are allowed — a new REST field
#     must never turn a working tool call into an output-validation error;
#   * lists are wrapped in a named object, because MCP `structuredContent` is
#     an object. Tools that used to answer with a bare JSON array therefore now
#     answer with `{total, <name>: [...]}`.


class _Out(BaseModel):
    model_config = ConfigDict(extra="allow")


class Record(_Out):
    """A HeptaCert API record forwarded unchanged; see the tool description."""

    id: Optional[int] = None


class EventSummary(_Out):
    id: Optional[int] = None
    name: Optional[str] = None
    event_date: Optional[str] = None
    event_type: Optional[str] = None
    visibility: Optional[str] = None
    certificate_enabled: Optional[bool] = None
    registration_enabled: Optional[bool] = None
    checkin_enabled: Optional[bool] = None
    registration_closed: Optional[bool] = None


class EventDetail(EventSummary):
    event_description: Optional[str] = None
    event_location: Optional[str] = None
    ticketing_enabled: Optional[bool] = None


class EventStats(_Out):
    attendee_count: Optional[int] = None
    session_count: Optional[int] = None
    certificate_count: Optional[int] = None
    active_certificate_count: Optional[int] = None
    checkin_count: Optional[int] = None
    ticket_count: Optional[int] = None


class EventListOutput(_Out):
    total: int = 0
    search: Optional[str] = None
    events: list[EventSummary] = Field(default_factory=list)


class EventOutput(_Out):
    status: Optional[str] = None
    event: EventDetail = Field(default_factory=EventDetail)
    stats: Optional[EventStats] = None


class EventStatsOutput(_Out):
    event_id: Optional[int] = None
    generated_at: Optional[str] = None
    stats: EventStats = Field(default_factory=EventStats)


class Attendee(_Out):
    id: Optional[int] = None
    name: Optional[str] = None
    email: Optional[str] = None
    source: Optional[str] = None
    registered_at: Optional[str] = None
    sessions_attended: Optional[int] = None
    has_certificate: Optional[bool] = None


class AttendeeListOutput(_Out):
    event_id: Optional[int] = None
    total: int = 0
    page: Optional[int] = None
    limit: Optional[int] = None
    has_more: bool = False
    attendees: list[Attendee] = Field(default_factory=list)


class CheckinMatch(_Out):
    attendee_id: Optional[int] = None
    name: Optional[str] = None
    email: Optional[str] = None
    ticket_status: Optional[str] = None
    checked_in_at: Optional[str] = None


class CheckinLookupOutput(_Out):
    event_id: Optional[int] = None
    query: Optional[str] = None
    total: int = 0
    matches: list[CheckinMatch] = Field(default_factory=list)


class Certificate(_Out):
    id: Optional[int] = None
    public_id: Optional[str] = None
    recipient_name: Optional[str] = None
    status: Optional[str] = None
    issued_at: Optional[str] = None
    verify_url: Optional[str] = None


class CertificateListOutput(_Out):
    event_id: Optional[int] = None
    total: int = 0
    page: Optional[int] = None
    limit: Optional[int] = None
    has_more: bool = False
    certificates: list[Certificate] = Field(default_factory=list)


class CertificateOutput(_Out):
    certificate: Certificate = Field(default_factory=Certificate)


class IssueCertificatesOutput(_Out):
    status: str = "preview"
    event_id: Optional[int] = None
    eligible_count: Optional[int] = None
    requires_confirm: bool = True
    warning: Optional[str] = None
    instruction: Optional[str] = None
    job_id: Optional[int] = None


class SessionListOutput(_Out):
    event_id: Optional[int] = None
    total: int = 0
    sessions: list[Record] = Field(default_factory=list)


class AutomationRuleListOutput(_Out):
    event_id: Optional[int] = None
    total: int = 0
    rules: list[Record] = Field(default_factory=list)


class WebhookListOutput(_Out):
    total: int = 0
    webhooks: list[Record] = Field(default_factory=list)


class AgentLogListOutput(_Out):
    total: int = 0
    logs: list[Record] = Field(default_factory=list)


class ContactListOutput(_Out):
    query: Optional[str] = None
    total: int = 0
    contacts: list[Record] = Field(default_factory=list)


class OperationOutput(_Out):
    """Result of a write, a preview of one, or a single passthrough report.

    `status` names the outcome ("created", "updated", "deleted", "preview",
    "queued", …); the remaining keys are documented per tool.
    """

    status: Optional[str] = None


# ── Result helper ──────────────────────────────────────────────────────────────


def _result(payload: Any, *, summary: Optional[str] = None) -> CallToolResult:
    """Build a tool result carrying the same redacted payload twice.

    The JSON text block keeps older clients working; `structuredContent` is what
    ChatGPT hands to the component and what the model reads verbatim. Round-
    tripping through `_fmt` guarantees the two can never drift, and that the
    structured half is plain JSON (no stray date or Decimal objects).
    """
    body = _fmt(payload)
    data = json.loads(body)
    if not isinstance(data, dict):  # pragma: no cover - every caller passes a dict
        data = {"result": data}
    blocks = [TextContent(type="text", text=body)]
    if summary:
        blocks.insert(0, TextContent(type="text", text=summary))
    return CallToolResult(content=blocks, structuredContent=data)


def _event_stats(health: Any) -> dict[str, Any]:
    """Flatten `GET /events/{id}/health` into the counts these tools document.

    The REST payload nests the counts under `overview` and names them
    differently (`attendees`, `sessions`, `certificates`). Reading them off the
    top level yields nothing — which is why the delete preview used to report
    every count as "unknown".
    """
    overview = health.get("overview") if isinstance(health, dict) else None
    if not isinstance(overview, dict):
        return {}
    return {
        "attendee_count": overview.get("attendees"),
        "session_count": overview.get("sessions"),
        "certificate_count": overview.get("certificates"),
        "active_certificate_count": overview.get("active_certificates"),
        "checkin_count": overview.get("attendance_records"),
        "ticket_count": overview.get("tickets"),
        "used_ticket_count": overview.get("used_tickets"),
    }


def _verify_url(public_id: Any) -> Optional[str]:
    return f"{FRONTEND_BASE}/verify/{public_id}" if public_id else None


def _certificate(record: Any) -> dict[str, Any]:
    """Project one certificate onto the fields these tools and the card show.

    `pdf_url` is deliberately dropped: the REST layer already withholds it for
    revoked and expired certificates, and the public verification page is the
    link we want a reader to follow.
    """
    if not isinstance(record, dict):
        return {}
    public_id = record.get("public_id") or record.get("uuid")
    return {
        "id": record.get("id"),
        "public_id": public_id,
        "recipient_name": record.get("student_name") or record.get("recipient_name"),
        "status": record.get("status"),
        "issued_at": record.get("issued_at"),
        "verify_url": _verify_url(public_id),
    }


def _as_list(data: Any, *keys: str) -> list:
    """Accept either a bare JSON array or an envelope that wraps one."""
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in keys:
            value = data.get(key)
            if isinstance(value, list):
                return value
    return []


_ATTENDEE_FIELDS = ("id", "name", "email", "source", "registered_at",
                    "sessions_attended", "has_certificate")


def _attendee(record: Any) -> dict[str, Any]:
    """Project one attendee down to the fields these tools document.

    The REST record also carries `registration_answers` — free-form answers to
    whatever custom questions the organizer asked — plus the linked public
    member's id, name and email. That is personal data no tool description
    promises and the model has no use for, so it stops here.
    """
    if not isinstance(record, dict):
        return {}
    return {key: record.get(key) for key in _ATTENDEE_FIELDS}


def _attendee_page(data: Any, event_id: int, page: int, limit: int) -> dict[str, Any]:
    """Normalise the REST `{items, total, page, limit}` page into our envelope."""
    envelope = data if isinstance(data, dict) else {}
    items = envelope.get("items", data)
    rows = [_attendee(a) for a in items] if isinstance(items, list) else []
    total = envelope.get("total", len(rows))
    page = envelope.get("page", page)
    limit = envelope.get("limit", limit)
    has_more = all(isinstance(v, int) for v in (total, page, limit)) and page * limit < total
    return {
        "event_id": event_id,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": has_more,
        "attendees": rows,
    }


# ── HTTP helpers ───────────────────────────────────────────────────────────────


class MCPAPIError(RuntimeError):
    """Model-safe REST failure without upstream URLs, bodies, or credentials."""

    def __init__(self, status_code: int):
        self.status_code = status_code
        message = {
            401: "Authentication failed. Reconnect HeptaCert.",
            403: "Permission denied for this HeptaCert resource.",
            404: "The requested HeptaCert resource was not found.",
            409: "The request conflicts with an existing record.",
            422: "Invalid input. Check required fields and formats.",
            429: "Rate limit reached. Retry later.",
        }.get(status_code, "HeptaCert API is temporarily unavailable." if status_code >= 500
              else "HeptaCert could not complete this request.")
        super().__init__(message)


def _check_response(resp: httpx.Response) -> None:
    if resp.is_error:
        raise MCPAPIError(resp.status_code)


async def _get(path: str, api_key: str, params: dict | None = None) -> Any:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{API_BASE}{path}", headers=_headers(api_key), params=params or {})
        _check_response(resp)
        return resp.json()


async def _post(path: str, api_key: str, body: dict) -> Any:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{API_BASE}{path}", headers=_headers(api_key), json=body)
        _check_response(resp)
        return resp.json()


async def _patch(path: str, api_key: str, body: dict) -> Any:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.patch(f"{API_BASE}{path}", headers=_headers(api_key), json=body)
        _check_response(resp)
        return resp.json()


async def _delete(path: str, api_key: str) -> Any:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.delete(f"{API_BASE}{path}", headers=_headers(api_key))
        _check_response(resp)
        return resp.json() if resp.content else {"status": "deleted"}


# ── Scope enforcement ──────────────────────────────────────────────────────────

_scope_cache: dict[str, tuple[float, list[str]]] = {}
_SCOPE_CACHE_TTL = 60.0  # seconds


async def _get_scopes(api_key: str) -> list[str]:
    """Fetch and cache the scopes for the given credential.

    Cache by a hash of the FULL token, not a prefix: every HS256 OAuth JWT
    shares the same leading characters (the encoded {"alg":"HS256"} header), so
    a prefix key would collide across users and leak one user's scopes to
    another. A hash uniquely identifies each credential.
    """
    import time
    cache_key = hashlib.sha256(api_key.encode()).hexdigest()[:32]
    cached = _scope_cache.get(cache_key)
    if cached and (time.time() - cached[0]) < _SCOPE_CACHE_TTL:
        return cached[1]
    # An unavailable/invalid identity endpoint must not be mistaken for an
    # unrestricted credential. Only a successful response may mean "unscoped".
    data = await _get("/api/admin/mcp/me", api_key)
    if not isinstance(data, dict) or not isinstance(data.get("scopes"), list):
        raise PermissionError("Credential scope verification failed.")
    scopes = data["scopes"]
    _scope_cache[cache_key] = (time.time(), scopes)
    return scopes


def _scope_satisfied(held: list[str], required: str) -> bool:
    """Mirror the REST layer's _scopes_satisfy: an exact match, or a ':write'
    scope implying the matching ':read'. Keeps the MCP pre-check from falsely
    denying (e.g. an events:write token calling a read tool)."""
    if required in held:
        return True
    if required.endswith(":read"):
        resource = required.split(":", 1)[0]
        if f"{resource}:write" in held:
            return True
    return False


async def _require_scope(api_key: str, scope: str) -> None:
    """
    Raise a clear error if the credential lacks the required scope.
    Unscoped credentials (interactive JWT / unrestricted key -> empty list) are
    treated as full access, matching the REST layer. The REST API enforces scope
    again on the forwarded call, so this is a friendly pre-check, not the only gate.
    """
    scopes = await _get_scopes(api_key)
    if not scopes:
        return  # unscoped credential → full access
    if not _scope_satisfied(scopes, scope):
        raise PermissionError(
            f"This credential does not have the '{scope}' scope. "
            f"Re-connect granting that scope, or (for an hc_live_ key) add it in "
            f"HeptaCert Admin → Settings → API Keys."
        )


# ── Audit logging ──────────────────────────────────────────────────────────────


def _fire_and_forget_log(
    api_key: str,
    tool_name: str,
    event_id: Optional[int] = None,
    payload: Optional[dict] = None,
    result_summary: Optional[str] = None,
) -> None:
    """Non-blocking agent action log — does not delay the tool response."""
    async def _log():
        try:
            # hc_live_ keys log their recognisable prefix; OAuth JWTs all share
            # the same leading chars, so log a short stable hash instead of a
            # useless "eyJhbGci" for every OAuth caller. (max_length=12)
            if api_key.startswith("hc_"):
                prefix = api_key[:8]
            else:
                prefix = "oauth:" + hashlib.sha256(api_key.encode()).hexdigest()[:6]
            body = {
                "tool_name": tool_name,
                "event_id": event_id,
                "payload": payload,
                "result_summary": (result_summary or "")[:500],
                "api_key_prefix": prefix,
            }
            await _post("/api/admin/mcp/agent-log", api_key, body)
        except Exception:
            pass  # log failures are non-fatal

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_log())
    except RuntimeError:
        pass


# ── Tools: Events (read) ───────────────────────────────────────────────────────


@mcp.tool(title="List Events", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def list_events(ctx: Context, search: str = "", limit: int = 20) -> Annotated[CallToolResult, EventListOutput]:
    """
    List events in the HeptaCert account.

    Args:
        search: Optional keyword to filter events by name (case-insensitive).
        limit: Maximum number of results (1–100). Default: 20.

    Returns a JSON object with `total` and `events` array containing: id, name,
    event_date, event_type, visibility, certificate_enabled, registration_enabled,
    checkin_enabled. Use the returned `id` values in all other tool calls.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:read")
    data = await _get("/api/admin/events", api_key)
    events: list = data if isinstance(data, list) else data.get("events", [])  # type: ignore[union-attr]
    if search:
        kw = search.lower()
        events = [e for e in events if kw in (e.get("name") or "").lower()]
    events = events[: max(1, min(limit, 100))]
    summary = [
        {
            "id": e.get("id"),
            "name": e.get("name"),
            "event_date": e.get("event_date"),
            "event_type": e.get("event_type"),
            "visibility": e.get("visibility"),
            "certificate_enabled": e.get("certificate_enabled"),
            "registration_enabled": e.get("registration_enabled"),
            "checkin_enabled": e.get("checkin_enabled"),
            "registration_closed": e.get("registration_closed"),
        }
        for e in events
    ]
    return _result({"total": len(summary), "search": search or None, "events": summary})


@mcp.tool(title="Get Event", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def get_event(ctx: Context, event_id: int) -> Annotated[CallToolResult, EventOutput]:
    """
    Get full details of a single event.

    Args:
        event_id: Numeric event ID (from list_events).

    Returns `{event, stats}` — every event field (feature flags, registration
    settings, template image URL, dates, location, description) plus the same
    headline counts get_event_stats reports, when they are available.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:read")
    # The counts come from a second read. Gather both so the card renders in one
    # round trip, and let the event itself decide the call's success: a health
    # failure only costs the numbers, not the event.
    data, health = await asyncio.gather(
        _get(f"/api/admin/events/{event_id}", api_key),
        _get(f"/api/admin/events/{event_id}/health", api_key),
        return_exceptions=True,
    )
    if isinstance(data, BaseException):
        raise data
    payload: dict = {"event": data}
    stats = _event_stats(health)
    if stats:
        payload["stats"] = stats
    return _result(payload)


@mcp.tool(title="Get Event Stats", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def get_event_stats(ctx: Context, event_id: int) -> Annotated[CallToolResult, EventStatsOutput]:
    """
    Get statistics for an event: attendee count, session count, certificates issued,
    check-in count, and tickets sold.

    Args:
        event_id: Numeric event ID.

    Returns `{event_id, generated_at, stats, latest_jobs}`. `stats` holds the
    counts above; `latest_jobs` reports the most recent certificate and email
    job with its status, so a failed batch is visible without another call.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:read")
    data = await _get(f"/api/admin/events/{event_id}/health", api_key)
    payload = {
        "event_id": data.get("event_id", event_id) if isinstance(data, dict) else event_id,
        "generated_at": data.get("generated_at") if isinstance(data, dict) else None,
        "stats": _event_stats(data),
    }
    if isinstance(data, dict) and data.get("latest_jobs"):
        payload["latest_jobs"] = data["latest_jobs"]
    return _result(payload)


# ── Tools: Events (write) ──────────────────────────────────────────────────────


@mcp.tool(title="Create Event", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False, openWorldHint=True, idempotentHint=False))
async def create_event(
    ctx: Context,
    name: str,
    event_date: Optional[str] = None,
    event_description: Optional[str] = None,
    event_location: Optional[str] = None,
    event_type: str = "certificate_event",
    certificate_enabled: bool = True,
    registration_enabled: bool = True,
    checkin_enabled: bool = True,
    ticketing_enabled: bool = False,
    visibility: str = "private",
) -> Annotated[CallToolResult, EventOutput]:
    """
    Create a new event. ALWAYS confirm name and date with the user first.

    Args:
        name: Event name (2–200 chars, required).
        event_date: Date in YYYY-MM-DD, e.g. "2025-09-15". Optional.
        event_description: Event description (plain text or HTML). Optional.
        event_location: Address or meeting link. Optional.
        event_type: certificate_event (default), seminar, workshop, conference,
                    concert, training, club_event, online_event, custom.
        certificate_enabled: Issue certificates. Default: True.
        registration_enabled: Allow public registration. Default: True.
        checkin_enabled: Enable QR check-in. Default: True.
        ticketing_enabled: Enable ticketing/payments. Default: False.
        visibility: "private" (not publicly listed) or "public" (directory). Default: private.

    Returns the created event object including its numeric `id`.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:write")
    create_body: dict = {
        "name": name,
        "template_image_url": "placeholder",
        "event_type": event_type,
        "certificate_enabled": certificate_enabled,
        "registration_enabled": registration_enabled,
        "checkin_enabled": checkin_enabled,
        "ticketing_enabled": ticketing_enabled,
        "config": {},
    }
    created = await _post("/api/admin/events", api_key, create_body)
    event_id: int = created.get("id")  # type: ignore[assignment]
    patch_body: dict = {"name": name}
    if event_date:
        patch_body["event_date"] = event_date
    if event_description:
        patch_body["event_description"] = event_description
    if event_location:
        patch_body["event_location"] = event_location
    if visibility != "private":
        patch_body["visibility"] = visibility
    result = created
    if len(patch_body) > 1:
        result = await _patch(f"/api/admin/events/{event_id}", api_key, patch_body)
    _fire_and_forget_log(api_key, "create_event", event_id=event_id,
                         payload={"name": name, "event_date": event_date, "event_type": event_type},
                         result_summary=f"Created event '{name}' (id={event_id})")
    return _result({"status": "created", "event": result})


@mcp.tool(title="Update Event", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False, openWorldHint=True, idempotentHint=False))
async def update_event(
    ctx: Context,
    event_id: int,
    name: Optional[str] = None,
    event_date: Optional[str] = None,
    event_description: Optional[str] = None,
    event_location: Optional[str] = None,
    event_type: Optional[str] = None,
    certificate_enabled: Optional[bool] = None,
    registration_enabled: Optional[bool] = None,
    checkin_enabled: Optional[bool] = None,
    ticketing_enabled: Optional[bool] = None,
    raffles_enabled: Optional[bool] = None,
    gamification_enabled: Optional[bool] = None,
    quiz_enabled: Optional[bool] = None,
    cpd_enabled: Optional[bool] = None,
    visibility: Optional[str] = None,
    registration_closed: Optional[bool] = None,
    registration_quota: Optional[int] = None,
    registration_quota_enabled: Optional[bool] = None,
) -> Annotated[CallToolResult, EventOutput]:
    """
    Update an existing event. Only provide fields you want to change.

    Args:
        event_id: Numeric event ID.
        name / event_date / event_description / event_location / event_type: Metadata.
        certificate_enabled / registration_enabled / checkin_enabled / ticketing_enabled:
            Feature flags.
        raffles_enabled / gamification_enabled / quiz_enabled / cpd_enabled:
            Engagement feature flags.
        visibility: "private" or "public".
        registration_closed: True = stop new registrations, False = reopen.
        registration_quota / registration_quota_enabled: Cap on total registrations.

    Returns the updated event object.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:write")
    fields = {
        "name": name, "event_date": event_date, "event_description": event_description,
        "event_location": event_location, "event_type": event_type,
        "certificate_enabled": certificate_enabled, "registration_enabled": registration_enabled,
        "checkin_enabled": checkin_enabled, "ticketing_enabled": ticketing_enabled,
        "raffles_enabled": raffles_enabled, "gamification_enabled": gamification_enabled,
        "quiz_enabled": quiz_enabled, "cpd_enabled": cpd_enabled,
        "visibility": visibility, "registration_closed": registration_closed,
        "registration_quota": registration_quota, "registration_quota_enabled": registration_quota_enabled,
    }
    patch_body = {k: v for k, v in fields.items() if v is not None}
    if not patch_body:
        return _result({"status": "unchanged", "error": "No fields provided — nothing to update."})
    updated = await _patch(f"/api/admin/events/{event_id}", api_key, patch_body)
    _fire_and_forget_log(api_key, "update_event", event_id=event_id,
                         payload=patch_body, result_summary=f"Updated event {event_id}: {list(patch_body)}")
    return _result({"status": "updated", "event": updated})


@mcp.tool(title="Delete Event", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True, openWorldHint=False, idempotentHint=False))
async def delete_event(ctx: Context, event_id: int, confirm: bool = False) -> Annotated[CallToolResult, OperationOutput]:
    """
    Delete an event permanently. This cannot be undone.

    Call WITHOUT confirm=True first — it returns a preview of what will be deleted.
    Call WITH confirm=True only after the user explicitly approves.

    Args:
        event_id: Numeric event ID.
        confirm: Set to True to confirm permanent deletion. Default: False (preview only).

    Returns confirmation message or preview of what will be deleted.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:write")
    event_data = await _get(f"/api/admin/events/{event_id}", api_key)
    event_name = event_data.get("name", f"ID {event_id}")
    if not confirm:
        health: Any = {}
        try:
            health = await _get(f"/api/admin/events/{event_id}/health", api_key)
        except Exception:
            pass
        stats = _event_stats(health)

        def _count(key: str) -> Any:
            value = stats.get(key)
            return "unknown" if value is None else value

        return _result({
            "status": "preview",
            "requires_confirm": True,
            "warning": "⚠️ This is a DESTRUCTIVE action that cannot be undone.",
            "event": {"id": event_id, "name": event_name},
            "will_delete": {
                "attendees": _count("attendee_count"),
                "certificates": _count("certificate_count"),
                "sessions": _count("session_count"),
            },
            "instruction": "Call delete_event again with confirm=True to permanently delete.",
        })
    await _delete(f"/api/admin/events/{event_id}", api_key)
    _fire_and_forget_log(api_key, "delete_event", event_id=event_id,
                         payload={"event_id": event_id},
                         result_summary=f"Deleted event '{event_name}' (id={event_id})")
    return _result({"status": "deleted", "event_id": event_id, "name": event_name})


@mcp.tool(title="Close Registration", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False, openWorldHint=False, idempotentHint=False))
async def close_registration(ctx: Context, event_id: int) -> Annotated[CallToolResult, EventOutput]:
    """
    Close registrations for an event — no new attendees can register.

    Args:
        event_id: Numeric event ID.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:write")
    updated = await _patch(f"/api/admin/events/{event_id}", api_key, {"registration_closed": True})
    _fire_and_forget_log(api_key, "close_registration", event_id=event_id,
                         result_summary=f"Closed registration for event {event_id}")
    return _result({"status": "registration_closed", "event": updated})


@mcp.tool(title="Open Registration", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False, openWorldHint=False, idempotentHint=False))
async def open_registration(ctx: Context, event_id: int) -> Annotated[CallToolResult, EventOutput]:
    """
    Reopen registrations for an event.

    Args:
        event_id: Numeric event ID.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:write")
    updated = await _patch(f"/api/admin/events/{event_id}", api_key, {"registration_closed": False})
    _fire_and_forget_log(api_key, "open_registration", event_id=event_id,
                         result_summary=f"Opened registration for event {event_id}")
    return _result({"status": "registration_opened", "event": updated})


# ── Tools: Attendees ───────────────────────────────────────────────────────────


@mcp.tool(title="List Attendees", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def list_attendees(
    ctx: Context,
    event_id: int,
    page: int = 1,
    limit: int = 50,
    search: str = "",
) -> Annotated[CallToolResult, AttendeeListOutput]:
    """
    List attendees for an event with optional pagination and search.

    Args:
        event_id: Numeric event ID.
        page: Page number (starts at 1). Default: 1.
        limit: Records per page (max 500). Default: 50.
        search: Filter by name or email.

    Returns `{event_id, total, page, limit, has_more, attendees}` where each
    attendee carries only: id, name, email, source, registered_at,
    sessions_attended, has_certificate.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "attendees:read")
    params: dict = {"page": page, "limit": limit}
    if search:
        params["search"] = search
    data = await _get(f"/api/admin/events/{event_id}/attendees", api_key, params=params)
    return _result(_attendee_page(data, event_id, page, limit))


@mcp.tool(title="Add Attendee", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False, openWorldHint=False, idempotentHint=False))
async def add_attendee(
    ctx: Context,
    event_id: int,
    first_name: str,
    last_name: str,
    email: str,
) -> Annotated[CallToolResult, OperationOutput]:
    """
    Add a single attendee to an event manually.

    Args:
        event_id: Numeric event ID.
        first_name: Attendee's first name.
        last_name: Attendee's last name.
        email: Attendee's email address.

    Returns the new attendee record with its `id`.
    Raises 409 if this email is already registered for this event.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "attendees:write")
    body = {"first_name": first_name, "last_name": last_name, "email": email}
    data = await _post(f"/api/admin/events/{event_id}/attendees", api_key, body)
    attendee_id = data.get("id")
    _fire_and_forget_log(api_key, "add_attendee", event_id=event_id,
                         payload={"attendee_id": attendee_id},
                         result_summary=f"Added attendee {attendee_id} to event {event_id}")
    return _result({"status": "added", "attendee": _attendee(data)})


@mcp.tool(title="Bulk Add Attendees", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True, openWorldHint=False, idempotentHint=False))
async def bulk_add_attendees(ctx: Context, event_id: int, attendees: list[dict]) -> Annotated[CallToolResult, OperationOutput]:
    """
    Add multiple attendees to an event. More efficient than calling add_attendee in a loop.
    Duplicate emails are silently skipped.

    Args:
        event_id: Numeric event ID.
        attendees: List of objects, each with "first_name", "last_name", "email".
          Example: [{"first_name": "Ali", "last_name": "Yılmaz", "email": "ali@example.com"}]

    Returns: {added: N, skipped: N, errors: [...]}
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "attendees:write")
    if not attendees or len(attendees) > 100:
        raise ValueError("Provide between 1 and 100 attendees per request.")
    results: dict = {"added": 0, "skipped": 0, "errors": []}
    for a in attendees:
        try:
            body = {
                "first_name": a.get("first_name", ""),
                "last_name": a.get("last_name", ""),
                "email": a.get("email", ""),
            }
            await _post(f"/api/admin/events/{event_id}/attendees", api_key, body)
            results["added"] += 1
        except MCPAPIError as exc:
            if exc.status_code == 409:
                results["skipped"] += 1
            else:
                results["errors"].append({"email": a.get("email"), "status_code": exc.status_code})
    _fire_and_forget_log(api_key, "bulk_add_attendees", event_id=event_id,
                         payload={"count": len(attendees)},
                         result_summary=f"Bulk added: {results['added']} added, {results['skipped']} skipped")
    return _result({"status": "imported", "event_id": event_id, "result": results})


@mcp.tool(title="Update Attendee", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False, openWorldHint=False, idempotentHint=False))
async def update_attendee(
    ctx: Context,
    event_id: int,
    attendee_id: int,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    email: Optional[str] = None,
) -> Annotated[CallToolResult, OperationOutput]:
    """
    Update an attendee's information. Only provide fields to change.

    Args:
        event_id: Numeric event ID.
        attendee_id: Numeric attendee ID (from list_attendees).
        first_name: New first name. Optional.
        last_name: New last name. Optional.
        email: New email address. Optional.

    Returns the updated attendee record.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "attendees:write")
    body: dict = {}
    if first_name is not None:
        body["first_name"] = first_name
    if last_name is not None:
        body["last_name"] = last_name
    if email is not None:
        body["email"] = email
    if not body:
        return _result({"status": "unchanged", "error": "No fields provided — nothing to update."})
    data = await _patch(f"/api/admin/events/{event_id}/attendees/{attendee_id}", api_key, body)
    _fire_and_forget_log(api_key, "update_attendee", event_id=event_id,
                         payload={"attendee_id": attendee_id, "changed_fields": sorted(body)},
                         result_summary=f"Updated attendee {attendee_id}")
    return _result({"status": "updated", "attendee": _attendee(data)})


@mcp.tool(title="Remove Attendee", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True, openWorldHint=False, idempotentHint=False))
async def remove_attendee(
    ctx: Context,
    event_id: int,
    attendee_id: int,
    confirm: bool = False,
) -> Annotated[CallToolResult, OperationOutput]:
    """
    Remove an attendee from an event permanently.

    Call WITHOUT confirm=True first to see who will be removed.
    Call WITH confirm=True only after explicit user approval.

    Args:
        event_id: Numeric event ID.
        attendee_id: Numeric attendee ID (from list_attendees).
        confirm: Set True to confirm permanent removal. Default: False (preview).
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "attendees:write")
    if not confirm:
        return _result({
            "status": "preview",
            "requires_confirm": True,
            "warning": "⚠️ This will permanently remove the attendee and their registration data.",
            "attendee_id": attendee_id,
            "event_id": event_id,
            "instruction": "Call remove_attendee again with confirm=True to proceed.",
        })
    await _delete(f"/api/admin/events/{event_id}/attendees/{attendee_id}", api_key)
    _fire_and_forget_log(api_key, "remove_attendee", event_id=event_id,
                         payload={"attendee_id": attendee_id},
                         result_summary=f"Removed attendee {attendee_id} from event {event_id}")
    return _result({"status": "removed", "event_id": event_id, "attendee_id": attendee_id})


# ── Tools: Sessions ────────────────────────────────────────────────────────────


@mcp.tool(title="List Sessions", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def list_sessions(ctx: Context, event_id: int) -> Annotated[CallToolResult, SessionListOutput]:
    """
    List all sessions (agenda items) for an event.

    Args:
        event_id: Numeric event ID.

    Returns `{event_id, total, sessions}` where each session has: id, title,
    description, start_time, end_time, location, speaker, capacity, is_active,
    attendance_count.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "sessions:read")
    data = await _get(f"/api/admin/events/{event_id}/sessions", api_key)
    sessions = _as_list(data, "items", "sessions")
    return _result({"event_id": event_id, "total": len(sessions), "sessions": sessions})


@mcp.tool(title="Create Session", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False, openWorldHint=False, idempotentHint=False))
async def create_session(
    ctx: Context,
    event_id: int,
    title: str,
    description: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    location: Optional[str] = None,
    speaker: Optional[str] = None,
    capacity: Optional[int] = None,
) -> Annotated[CallToolResult, OperationOutput]:
    """
    Add a new session to an event.

    Args:
        event_id: Numeric event ID.
        title: Session title (required).
        description: Abstract or description. Optional.
        start_time: ISO 8601 datetime, e.g. "2025-09-15T09:00:00". Optional.
        end_time: ISO 8601 datetime. Optional.
        location: Room or hall name. Optional.
        speaker: Speaker name(s). Optional.
        capacity: Max seats. Optional.

    Returns the new session object with its `id`.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "sessions:write")
    body: dict = {"title": title}
    if description is not None:
        body["description"] = description
    if start_time is not None:
        body["start_time"] = start_time
    if end_time is not None:
        body["end_time"] = end_time
    if location is not None:
        body["location"] = location
    if speaker is not None:
        body["speaker"] = speaker
    if capacity is not None:
        body["capacity"] = capacity
    data = await _post(f"/api/admin/events/{event_id}/sessions", api_key, body)
    session_id = data.get("id")
    _fire_and_forget_log(api_key, "create_session", event_id=event_id,
                         payload={"title": title},
                         result_summary=f"Created session '{title}' (id={session_id}) for event {event_id}")
    return _result({"status": "created", "event_id": event_id, "session": data})


@mcp.tool(title="Update Session", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False, openWorldHint=False, idempotentHint=False))
async def update_session(
    ctx: Context,
    event_id: int,
    session_id: int,
    title: Optional[str] = None,
    description: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    location: Optional[str] = None,
    speaker: Optional[str] = None,
    capacity: Optional[int] = None,
    is_active: Optional[bool] = None,
) -> Annotated[CallToolResult, OperationOutput]:
    """
    Update an existing session. Only provide fields to change.

    Args:
        event_id: Numeric event ID.
        session_id: Numeric session ID (from list_sessions).
        title / description / start_time / end_time / location / speaker / capacity: Fields to update.
        is_active: False to hide this session from attendees.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "sessions:write")
    fields = {
        "title": title, "description": description, "start_time": start_time,
        "end_time": end_time, "location": location, "speaker": speaker,
        "capacity": capacity, "is_active": is_active,
    }
    patch_body = {k: v for k, v in fields.items() if v is not None}
    if not patch_body:
        return _result({"status": "unchanged", "error": "No fields provided — nothing to update."})
    data = await _patch(f"/api/admin/events/{event_id}/sessions/{session_id}", api_key, patch_body)
    _fire_and_forget_log(api_key, "update_session", event_id=event_id,
                         payload={"session_id": session_id, **patch_body},
                         result_summary=f"Updated session {session_id}")
    return _result({"status": "updated", "event_id": event_id, "session": data})


@mcp.tool(title="Delete Session", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True, openWorldHint=False, idempotentHint=False))
async def delete_session(
    ctx: Context,
    event_id: int,
    session_id: int,
    confirm: bool = False,
) -> Annotated[CallToolResult, OperationOutput]:
    """
    Delete a session from an event permanently.

    Call WITHOUT confirm=True first to preview. Call WITH confirm=True after user approval.

    Args:
        event_id: Numeric event ID.
        session_id: Numeric session ID (from list_sessions).
        confirm: True to confirm deletion. Default: False (preview only).
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "sessions:write")
    if not confirm:
        sessions = await _get(f"/api/admin/events/{event_id}/sessions", api_key)
        target = next((s for s in _as_list(sessions, "items", "sessions") if s.get("id") == session_id), {})
        return _result({
            "status": "preview",
            "requires_confirm": True,
            "warning": "⚠️ This will permanently delete the session and all its attendance records.",
            "event_id": event_id,
            "session": target or {"id": session_id},
            "instruction": "Call delete_session again with confirm=True to proceed.",
        })
    await _delete(f"/api/admin/events/{event_id}/sessions/{session_id}", api_key)
    _fire_and_forget_log(api_key, "delete_session", event_id=event_id,
                         payload={"session_id": session_id},
                         result_summary=f"Deleted session {session_id} from event {event_id}")
    return _result({"status": "deleted", "event_id": event_id, "session_id": session_id})


# ── Tools: Check-in ────────────────────────────────────────────────────────────


@mcp.tool(title="Checkin Lookup", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def checkin_lookup(ctx: Context, event_id: int, query: str) -> Annotated[CallToolResult, CheckinLookupOutput]:
    """
    Look up attendees by name or email for check-in verification.

    Args:
        event_id: Numeric event ID.
        query: Name or email fragment to search (at least 1 character).

    Returns `{event_id, query, total, matches}` where each match has:
    attendee_id, name, email, ticket_status, checked_in_at.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "attendees:read")
    data = await _get(f"/api/admin/events/{event_id}/checkin-lookup", api_key, params={"query": query})
    matches = _as_list(data, "items", "matches")
    return _result({"event_id": event_id, "query": query, "total": len(matches), "matches": matches})


@mcp.tool(title="Manual Check-in", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False, openWorldHint=False, idempotentHint=False))
async def manual_checkin(
    ctx: Context,
    event_id: int,
    session_id: int,
    attendee_email: str,
) -> Annotated[CallToolResult, OperationOutput]:
    """
    Manually mark an attendee as checked-in for a specific session.

    Args:
        event_id: Numeric event ID.
        session_id: Numeric session ID (from list_sessions).
        attendee_email: Email address of the attendee to check in.

    Returns the check-in record.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "checkin:write")
    body = {"email": attendee_email}
    data = await _post(f"/api/admin/events/{event_id}/sessions/{session_id}/checkin", api_key, body)
    _fire_and_forget_log(api_key, "manual_checkin", event_id=event_id,
                         payload={"session_id": session_id},
                         result_summary=f"Checked in attendee to session {session_id}")
    return _result({"status": "checked_in", "event_id": event_id, "session_id": session_id, "result": data})


@mcp.tool(title="Get Attendance Summary", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def get_attendance_summary(ctx: Context, event_id: int) -> Annotated[CallToolResult, OperationOutput]:
    """
    Get attendance (check-in) records and summary for an event.

    Args:
        event_id: Numeric event ID.

    Returns `{event_id, attendance}` — total registered, total checked-in,
    attendance rate, and the per-session breakdown.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "attendees:read")
    data = await _get(f"/api/admin/events/{event_id}/attendance", api_key)
    return _result({"event_id": event_id, "attendance": data})


# ── Tools: Certificates ────────────────────────────────────────────────────────


@mcp.tool(title="List Certificates", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def list_certificates(
    ctx: Context,
    event_id: int,
    search: str = "",
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> Annotated[CallToolResult, CertificateListOutput]:
    """
    List certificates issued for an event.

    Args:
        event_id: Numeric event ID.
        search: Filter by recipient name. Optional.
        status: "active", "revoked", or "expired". Optional.
        page: Page number. Default: 1.
        limit: Records per page (max 200). Default: 20.

    Returns `{event_id, total, page, limit, has_more, certificates}` where each
    certificate has: id, public_id, recipient_name, status, issued_at, verify_url.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "certificates:read")
    params: dict = {"page": page, "limit": limit}
    if search:
        params["search"] = search
    if status:
        params["status"] = status
    data = await _get(f"/api/admin/events/{event_id}/certificates", api_key, params=params)
    envelope = data if isinstance(data, dict) else {}
    rows = [_certificate(c) for c in _as_list(data, "items", "certificates")]
    total = envelope.get("total", len(rows))
    page = envelope.get("page", page)
    limit = envelope.get("limit", limit)
    return _result({
        "event_id": event_id,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": all(isinstance(v, int) for v in (total, page, limit)) and page * limit < total,
        "certificates": rows,
    })


@mcp.tool(title="Issue Certificates", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True, openWorldHint=True, idempotentHint=False))
async def issue_certificates(
    ctx: Context,
    event_id: int,
    attendee_ids: Optional[list[int]] = None,
    confirm: bool = False,
) -> Annotated[CallToolResult, IssueCertificatesOutput]:
    """
    Queue certificate generation for all eligible attendees of an event.

    Requires an enabled certificate feature, saved template, paid plan and enough
    balance. This queues a background job; it does not issue immediately.

    Args:
        event_id: Numeric event ID.
        attendee_ids: Reserved for compatibility. Selected-ID issuance is not
            supported by the current backend; omit to target all eligible attendees.
        confirm: Must be True after explicit user approval. Default: False (preview).

    Returns a preview or the queued job object.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "certificates:write")
    if attendee_ids is not None:
        raise ValueError("Selected attendee IDs are not supported for bulk issuance. Omit attendee_ids to queue all eligible attendees.")
    if not confirm:
        # Best-effort headcount so the confirmation states what is about to
        # happen. A failure here must not block the preview — the point of the
        # preview is to stop, not to report.
        eligible: Optional[int] = None
        try:
            health = await _get(f"/api/admin/events/{event_id}/health", api_key)
            eligible = _event_stats(health).get("attendee_count")
        except Exception:
            pass
        return _result({
            "status": "preview",
            "event_id": event_id,
            "eligible_count": eligible,
            "requires_confirm": True,
            "warning": "This will queue certificate generation for all eligible attendees and may spend HeptaCoin balance.",
            "instruction": "Call again with confirm=True only after explicit user approval.",
        })
    data = await _post(f"/api/admin/events/{event_id}/bulk-certify-queue", api_key, {})
    _fire_and_forget_log(api_key, "issue_certificates", event_id=event_id,
                         payload={"scope": "all_eligible"},
                         result_summary=f"Queued certificates for event {event_id}")
    return _result({
        "status": "queued",
        "event_id": event_id,
        "requires_confirm": False,
        "job_id": data.get("id") if isinstance(data, dict) else None,
        "job": data,
    })


@mcp.tool(title="Revoke Certificate", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True, openWorldHint=False, idempotentHint=False))
async def revoke_certificate(
    ctx: Context,
    cert_id: int,
    confirm: bool = False,
) -> Annotated[CallToolResult, OperationOutput]:
    """
    Revoke a certificate permanently. The PDF link becomes inaccessible.

    Call WITHOUT confirm=True first to see what will be revoked.
    Call WITH confirm=True after explicit user approval.

    Args:
        cert_id: Numeric certificate ID (from list_certificates).
        confirm: True to confirm revocation. Default: False (preview).
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "certificates:write")
    if not confirm:
        return _result({
            "status": "preview",
            "requires_confirm": True,
            "warning": "⚠️ Revoking makes the certificate PDF inaccessible. This cannot be undone.",
            "cert_id": cert_id,
            "instruction": "Call revoke_certificate again with confirm=True to proceed.",
        })
    data = await _post(f"/api/admin/certificates/{cert_id}/revoke", api_key, {})
    _fire_and_forget_log(api_key, "revoke_certificate",
                         payload={"cert_id": cert_id},
                         result_summary=f"Revoked certificate {cert_id}")
    return _result({"status": "revoked", "certificate": _certificate(data)})


@mcp.tool(title="Get Certificate Tier Summary", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def get_certificate_tier_summary(ctx: Context, event_id: int) -> Annotated[CallToolResult, OperationOutput]:
    """
    Get certificate tier distribution for an event.

    Args:
        event_id: Numeric event ID.

    Returns `{event_id, tier_summary}` — tier names, thresholds, and attendee
    counts per tier.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "certificates:read")
    data = await _get(f"/api/admin/events/{event_id}/certificates/tier-summary", api_key)
    return _result({"event_id": event_id, "tier_summary": data})


# ── Tools: Automation Rules ────────────────────────────────────────────────────


@mcp.tool(title="List Automation Rules", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def list_automation_rules(ctx: Context, event_id: int) -> Annotated[CallToolResult, AutomationRuleListOutput]:
    """
    List all automation rules for an event.

    Args:
        event_id: Numeric event ID.

    Returns `{event_id, total, rules}` where each rule has: id, name, trigger,
    trigger_config, actions, enabled, execution counts.

    Trigger types:
      attended_event, registered_no_show, certificate_issued, survey_not_completed,
      badge_earned, audience_segment, compliance_overdue.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "automations:read")
    data = await _get(f"/api/admin/events/{event_id}/automations", api_key)
    rules = _as_list(data, "items", "rules", "automations")
    return _result({"event_id": event_id, "total": len(rules), "rules": rules})


@mcp.tool(title="Create Automation Rule", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False, openWorldHint=True, idempotentHint=False))
async def create_automation_rule(
    ctx: Context,
    event_id: int,
    name: str,
    trigger: str,
    actions: list[dict],
    trigger_config: Optional[dict] = None,
    enabled: bool = True,
) -> Annotated[CallToolResult, OperationOutput]:
    """
    Create a new automation rule for an event.

    Args:
        event_id: Numeric event ID.
        name: Rule name (e.g. "Send cert email after attendance").
        trigger: One of the trigger types (see list_automation_rules for the full list).
        actions: List of action objects. Each needs "type":
            - {"type": "send_email", "template_id": 123, "delay_hours": 0}
            - {"type": "create_reminder", "message": "...", "delay_hours": 24}
            - {"type": "webhook_dispatch", "url": "https://...", "method": "POST"}
        trigger_config: Optional trigger parameters dict.
        enabled: Whether the rule is immediately active. Default: True.

    Returns the updated automation rule set for the event.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "automations:write")
    body: dict = {
        "name": name, "trigger": trigger, "actions": actions,
        "trigger_config": trigger_config or {}, "enabled": enabled,
    }
    data = await _post(f"/api/admin/events/{event_id}/automations", api_key, body)
    _fire_and_forget_log(api_key, "create_automation_rule", event_id=event_id,
                         payload={"name": name, "trigger": trigger},
                         result_summary=f"Created automation '{name}' (trigger={trigger}) for event {event_id}")
    return _result({"status": "created", "event_id": event_id, "automation": data})


# ── Tools: Surveys & Analytics ─────────────────────────────────────────────────


@mcp.tool(title="Get Survey Responses", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def get_survey_responses(
    ctx: Context,
    event_id: int,
    page: int = 1,
    limit: int = 50,
) -> Annotated[CallToolResult, OperationOutput]:
    """
    Get survey responses collected for an event.

    Args:
        event_id: Numeric event ID. Must have a survey configured.
        page: Page number. Default: 1.
        limit: Records per page. Default: 50.

    Returns `{event_id, page, limit, survey_responses}` — paginated submissions
    with respondent name, email, submitted_at, and a `responses` dict keyed by
    question text.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:read")
    params: dict = {"page": page, "limit": limit}
    data = await _get(f"/api/admin/events/{event_id}/surveys/responses", api_key, params=params)
    return _result({"event_id": event_id, "page": page, "limit": limit, "survey_responses": data})


# ── Tools: Organization ────────────────────────────────────────────────────────


@mcp.tool(title="Get Organization Settings", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def get_organization_settings(ctx: Context) -> Annotated[CallToolResult, OperationOutput]:
    """
    Get the organization's settings and profile.

    Returns `{organization}` — org name, contact email, logo URL, plan details,
    enabled modules, and notification preferences.

    No arguments required.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:read")
    data = await _get("/api/admin/organization/settings", api_key)
    return _result({"organization": data})


@mcp.tool(title="List Agent Logs", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def list_agent_logs(
    ctx: Context,
    event_id: Optional[int] = None,
    tool_name: Optional[str] = None,
    limit: int = 20,
) -> Annotated[CallToolResult, AgentLogListOutput]:
    """
    View the agent action audit trail — all write operations performed by AI agents.

    Args:
        event_id: Filter by event. Optional.
        tool_name: Filter by tool name (e.g. "create_event"). Optional.
        limit: Max results to return. Default: 20.

    Returns `{total, logs}` with action IDs, tool names, event IDs and
    timestamps. Historic payloads may contain attendee PII, so they are
    intentionally omitted from MCP output.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:read")
    params: dict = {"limit": limit}
    if event_id:
        params["event_id"] = event_id
    if tool_name:
        params["tool_name"] = tool_name
    data = await _get("/api/admin/mcp/agent-logs", api_key, params=params)
    if not isinstance(data, list):
        raise ValueError("Unexpected agent log response.")
    logs = [{
        "id": row.get("id"), "tool_name": row.get("tool_name"),
        "event_id": row.get("event_id"), "created_at": row.get("created_at"),
    } for row in data]
    return _result({"total": len(logs), "logs": logs})


# ── Tools: Automation Rules (write) ───────────────────────────────────────────


@mcp.tool(title="Update Automation Rule", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False, openWorldHint=True, idempotentHint=False))
async def update_automation_rule(
    ctx: Context,
    event_id: int,
    rule_id: int,
    name: Optional[str] = None,
    enabled: Optional[bool] = None,
    actions: Optional[list] = None,
) -> Annotated[CallToolResult, OperationOutput]:
    """
    Update an existing automation rule.

    Args:
        event_id: The event that owns the rule.
        rule_id: The rule ID to update.
        name: New name for the rule. Optional.
        enabled: True to enable, False to disable. Optional.
        actions: Replacement actions list. Optional.

    Returns the updated rule object.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "automations:write")
    body: dict = {}
    if name is not None:
        body["name"] = name
    if enabled is not None:
        body["enabled"] = enabled
    if actions is not None:
        body["actions"] = actions
    data = await _patch(f"/api/admin/events/{event_id}/automations/{rule_id}", api_key, body)
    _fire_and_forget_log(api_key, "update_automation_rule", event_id=event_id,
                         payload={"rule_id": rule_id, **body}, result_summary=f"rule {rule_id} updated")
    return _result({"status": "updated", "event_id": event_id, "automation": data})


@mcp.tool(title="Delete Automation Rule", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True, openWorldHint=False, idempotentHint=False))
async def delete_automation_rule(
    ctx: Context,
    event_id: int,
    rule_id: int,
    confirm: bool = False,
) -> Annotated[CallToolResult, OperationOutput]:
    """
    Delete an automation rule.

    Args:
        event_id: The event that owns the rule.
        rule_id: The rule ID to delete.
        confirm: Must be True to proceed. Without it returns a preview.

    Returns confirmation or a preview of what will be deleted.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "automations:write")
    if not confirm:
        rules = await _get(f"/api/admin/events/{event_id}/automations", api_key)
        rule = next((r for r in _as_list(rules, "items", "rules", "automations") if r.get("id") == rule_id), None)
        return _result({
            "status": "preview",
            "requires_confirm": True,
            "warning": f"⚠️ This will permanently delete automation rule {rule_id}.",
            "event_id": event_id,
            "rule": rule,
            "instruction": "Call again with confirm=True to proceed.",
        })
    await _delete(f"/api/admin/events/{event_id}/automations/{rule_id}", api_key)
    _fire_and_forget_log(api_key, "delete_automation_rule", event_id=event_id,
                         payload={"rule_id": rule_id}, result_summary=f"rule {rule_id} deleted")
    return _result({"status": "deleted", "event_id": event_id, "rule_id": rule_id})


# ── Tools: Webhooks ────────────────────────────────────────────────────────────


@mcp.tool(title="List Webhooks", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def list_webhooks(ctx: Context) -> Annotated[CallToolResult, WebhookListOutput]:
    """
    List all webhooks configured for this account.

    Returns `{total, webhooks}` where each webhook has: id, url, events,
    is_active, created_at. Signing secrets are never included.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:read")
    data = await _get("/api/admin/webhooks", api_key)
    hooks = _as_list(data, "items", "webhooks")
    return _result({"total": len(hooks), "webhooks": hooks})


@mcp.tool(title="Create Webhook", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False, openWorldHint=True, idempotentHint=False))
async def create_webhook(
    ctx: Context,
    url: str,
    events: list,
    secret: Optional[str] = None,
) -> Annotated[CallToolResult, OperationOutput]:
    """
    Create a new webhook endpoint.

    Args:
        url: The HTTPS URL that will receive POST requests.
        events: List of event types to subscribe to. Available:
                attendee.registered, attendee.checkin, certificate.issued,
                certificate.revoked, event.created, event.updated, payment.completed
        secret: Optional signing secret for HMAC-SHA256 signature verification.

    Returns the created webhook object with its id.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:write")
    body: dict = {"url": url, "events": events}
    if secret:
        body["secret"] = secret
    data = await _post("/api/admin/webhooks", api_key, body)
    _fire_and_forget_log(api_key, "create_webhook", payload={"url": url, "events": events},
                         result_summary=f"webhook created for {url}")
    return _result({"status": "created", "webhook": data})


@mcp.tool(title="Delete Webhook", annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True, openWorldHint=False, idempotentHint=False))
async def delete_webhook(
    ctx: Context,
    webhook_id: int,
    confirm: bool = False,
) -> Annotated[CallToolResult, OperationOutput]:
    """
    Delete a webhook endpoint.

    Args:
        webhook_id: The webhook ID to delete.
        confirm: Must be True to proceed.

    Returns confirmation or a preview.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:write")
    if not confirm:
        webhooks = await _get("/api/admin/webhooks", api_key)
        hook = next((w for w in _as_list(webhooks, "items", "webhooks") if w.get("id") == webhook_id), None)
        return _result({
            "status": "preview",
            "requires_confirm": True,
            "warning": f"⚠️ This will permanently delete webhook {webhook_id}.",
            "webhook": hook,
            "instruction": "Call again with confirm=True to proceed.",
        })
    await _delete(f"/api/admin/webhooks/{webhook_id}", api_key)
    _fire_and_forget_log(api_key, "delete_webhook", payload={"webhook_id": webhook_id},
                         result_summary=f"webhook {webhook_id} deleted")
    return _result({"status": "deleted", "webhook_id": webhook_id})


# ── Tools: Cross-event & Export ────────────────────────────────────────────────


@mcp.tool(title="Search Attendees Across Events", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def search_attendees_across_events(
    ctx: Context,
    query: str,
    limit: int = 20,
) -> Annotated[CallToolResult, ContactListOutput]:
    """
    Search for an attendee across ALL events by name or email.

    Useful for finding a person's full history: which events they attended,
    whether they have certificates, check-in status.

    Args:
        query: Name or email to search (case-insensitive, partial match).
        limit: Max results. Default: 20.

    Returns `{query, total, contacts}` — each match carries its event context.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "crm:read")
    data = await _get("/api/admin/crm/contacts", api_key, params={"search": query, "limit": limit})
    contacts = _as_list(data, "items", "contacts")
    total = data.get("total", len(contacts)) if isinstance(data, dict) else len(contacts)
    return _result({"query": query, "total": total, "contacts": contacts})


@mcp.tool(title="Export Event Attendees", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def export_event_attendees(
    ctx: Context,
    event_id: int,
    include_certificates: bool = True,
) -> Annotated[CallToolResult, AttendeeListOutput]:
    """
    Export all attendees for an event as a structured list.
    Fetches all pages automatically (up to 2000 attendees).

    Args:
        event_id: The event ID.
        include_certificates: Reserved for compatibility; currently has no effect.

    Returns `{event_id, total, has_more, attendees}` with the same per-attendee
    fields as list_attendees, suitable for reporting or bulk operations.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "attendees:read")
    all_attendees: list[dict[str, Any]] = []
    page = 1
    truncated = False
    while True:
        data = await _get(f"/api/admin/events/{event_id}/attendees", api_key,
                          params={"page": page, "limit": 200})
        rows = _as_list(data, "items", "attendees")
        if not rows:
            break
        all_attendees.extend(_attendee(row) for row in rows)
        if len(rows) < 200:
            break
        if len(all_attendees) >= 2000:
            truncated = True
            break
        page += 1
    return _result({
        "event_id": event_id,
        "total": len(all_attendees),
        "has_more": truncated,
        "attendees": all_attendees,
    })


@mcp.tool(title="Get Event Analytics", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def get_event_analytics(ctx: Context, event_id: int) -> Annotated[CallToolResult, OperationOutput]:
    """
    Get detailed analytics for an event: registration trend, check-in timeline,
    certificate issuance stats, email open rates, session attendance breakdown.

    Args:
        event_id: The event ID.

    Returns `{event_id, analytics}` carrying the full analytics object.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "analytics:read")
    data = await _get(f"/api/admin/events/{event_id}/analytics", api_key)
    return _result({"event_id": event_id, "analytics": data})


@mcp.tool(title="Get Certificate By Public Id", annotations=ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False, idempotentHint=True))
async def get_certificate_by_public_id(ctx: Context, public_id: str) -> Annotated[CallToolResult, CertificateOutput]:
    """
    Look up a certificate by its public verification ID (from the verify URL).

    Useful for: checking if a certificate is valid, getting attendee details,
    verifying authenticity from a cert URL like
    heptacert.com/verify/550e8400-e29b-41d4-a716-446655440000.

    Args:
        public_id: The certificate UUID from the verification URL. The argument
            name is retained for compatibility with existing MCP clients.

    Returns `{certificate}` with public_id, recipient_name, event_name, status,
    issued_at and the public verify_url.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "certificates:read")
    data = await _get(f"/api/verify/{public_id}", api_key)
    certificate = _certificate(data)
    if isinstance(data, dict):
        certificate["event_name"] = data.get("event_name")
        certificate["event_date"] = data.get("event_date")
    return _result({"certificate": certificate})


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    transport = "stdio"
    port = 8100

    args = sys.argv[1:]
    for i, arg in enumerate(args):
        if arg == "--transport" and i + 1 < len(args):
            transport = args[i + 1]
        elif arg == "--port" and i + 1 < len(args):
            port = int(args[i + 1])

    if transport == "stdio" and not API_KEY_ENV:
        print(
            "ERROR: HEPTACERT_API_KEY is not set.\n"
            "Generate an API key from HeptaCert Admin Dashboard → Settings → API Keys\n"
            "then re-run: HEPTACERT_API_KEY=hc_live_... python mcp_server.py",
            file=sys.stderr,
        )
        sys.exit(1)

    if transport == "stdio":
        _ALLOW_ENV_KEY = True
        mcp.run(transport="stdio")
    elif transport in ("streamable-http", "http"):
        print(
            f"Starting HeptaCert MCP server on port {port} (streamable-http).\n"
            "Users authenticate per-request via Authorization: Bearer hc_live_... header.",
            file=sys.stderr,
        )
        # The hosted MCP process runs inside a container and must be reachable
        # by the reverse proxy on the container network.
        mcp.run(transport="streamable-http", host="0.0.0.0", port=port)  # nosec B104
    else:
        print(f"ERROR: Unknown transport '{transport}'. Use 'stdio' or 'streamable-http'.", file=sys.stderr)
        sys.exit(1)
