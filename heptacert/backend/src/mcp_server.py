"""
HeptaCert MCP Server

Expose HeptaCert as a full agentic MCP service. AI agents can create and manage
events, attendees, sessions, certificates, check-ins, LMS courses, automation rules,
and query analytics — all within proper security boundaries.

── Authentication ────────────────────────────────────────────────────────────────
  stdio mode (Claude Desktop):
    Set HEPTACERT_API_KEY env var then run the script.
    Each user runs their own process with their own API key.

  streamable-http mode (hosted / multi-user):
    Pass `Authorization: Bearer hc_live_...` in every request.
    The env var is a fallback; per-request header takes precedence.
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
import json
import os
import sys
from typing import Any, Optional

import httpx
from mcp.server.fastmcp import FastMCP, Context

# ── Configuration ──────────────────────────────────────────────────────────────

API_BASE = os.getenv("HEPTACERT_API_BASE", "http://localhost:8000").rstrip("/")
API_KEY_ENV = os.getenv("HEPTACERT_API_KEY", "")

mcp = FastMCP(
    "HeptaCert",
    instructions=(
        "You are connected to HeptaCert, a professional event management and certificate "
        "issuance platform. You can create and manage events, attendees, sessions, "
        "certificates, check-ins, LMS courses, automation rules, and view analytics.\n\n"
        "IMPORTANT RULES:\n"
        "- Always confirm event name and date with the user before creating records.\n"
        "- For destructive actions (delete_event, remove_attendee, revoke_certificate, "
        "delete_session) call without confirm=True first to preview, then call again with "
        "confirm=True only after explicit user approval.\n"
        "- Use list_events to discover event IDs. Use list_lms_courses for course IDs.\n"
        "- Never invent IDs — always look them up first."
    ),
)

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
            auth = request.headers.get("authorization", "")
            if auth.lower().startswith("bearer "):
                key = auth.split(" ", 1)[1].strip()
                if key and key.startswith("hc_live_"):
                    return key
        except Exception:
            pass
    if API_KEY_ENV:
        return API_KEY_ENV
    raise RuntimeError(
        "No API key found. In stdio mode: set HEPTACERT_API_KEY env var. "
        "In HTTP mode: pass Authorization: Bearer hc_live_... in the request header."
    )


def _headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _fmt(data: object) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2, default=str)


# ── HTTP helpers ───────────────────────────────────────────────────────────────


async def _get(path: str, api_key: str, params: dict | None = None) -> Any:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{API_BASE}{path}", headers=_headers(api_key), params=params or {})
        resp.raise_for_status()
        return resp.json()


async def _post(path: str, api_key: str, body: dict) -> Any:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{API_BASE}{path}", headers=_headers(api_key), json=body)
        resp.raise_for_status()
        return resp.json()


async def _patch(path: str, api_key: str, body: dict) -> Any:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.patch(f"{API_BASE}{path}", headers=_headers(api_key), json=body)
        resp.raise_for_status()
        return resp.json()


async def _delete(path: str, api_key: str) -> Any:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.delete(f"{API_BASE}{path}", headers=_headers(api_key))
        resp.raise_for_status()
        return resp.json() if resp.content else {"status": "deleted"}


# ── Scope enforcement ──────────────────────────────────────────────────────────

_scope_cache: dict[str, tuple[float, list[str]]] = {}
_SCOPE_CACHE_TTL = 60.0  # seconds


async def _get_scopes(api_key: str) -> list[str]:
    """Fetch and cache the scopes for the given API key (by prefix)."""
    import time
    prefix = api_key[:12]
    cached = _scope_cache.get(prefix)
    if cached and (time.time() - cached[0]) < _SCOPE_CACHE_TTL:
        return cached[1]
    try:
        data = await _get("/api/admin/mcp/me", api_key)
        scopes = list(data.get("scopes") or [])
    except Exception:
        scopes = []
    _scope_cache[prefix] = (time.time(), scopes)
    return scopes


async def _require_scope(api_key: str, scope: str) -> None:
    """
    Raise a clear error if the API key lacks the required scope.
    JWT-authenticated sessions (empty scopes list) are treated as having all scopes.
    """
    scopes = await _get_scopes(api_key)
    if not scopes:
        return  # JWT / unscoped key → full access
    if scope not in scopes:
        raise PermissionError(
            f"API key does not have the '{scope}' scope. "
            f"Go to HeptaCert Admin → Settings → API Keys and add this scope to your key."
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
            prefix = api_key[:8] if len(api_key) >= 8 else api_key
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


@mcp.tool()
async def list_events(ctx: Context, search: str = "", limit: int = 20) -> str:
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
    return _fmt({"total": len(summary), "events": summary})


@mcp.tool()
async def get_event(ctx: Context, event_id: int) -> str:
    """
    Get full details of a single event.

    Args:
        event_id: Numeric event ID (from list_events).

    Returns all event fields including feature flags, registration settings,
    template image URL, dates, location, and description.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:read")
    data = await _get(f"/api/admin/events/{event_id}", api_key)
    return _fmt(data)


@mcp.tool()
async def get_event_stats(ctx: Context, event_id: int) -> str:
    """
    Get statistics for an event: attendee count, session count, certificates issued,
    check-in count, and tickets sold.

    Args:
        event_id: Numeric event ID.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:read")
    data = await _get(f"/api/admin/events/{event_id}/health", api_key)
    return _fmt(data)


# ── Tools: Events (write) ──────────────────────────────────────────────────────


@mcp.tool()
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
) -> str:
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
        visibility: "private" (link-only) or "public" (directory). Default: private.

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
    return _fmt({"status": "created", "event": result})


@mcp.tool()
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
) -> str:
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
        return _fmt({"error": "No fields provided — nothing to update."})
    updated = await _patch(f"/api/admin/events/{event_id}", api_key, patch_body)
    _fire_and_forget_log(api_key, "update_event", event_id=event_id,
                         payload=patch_body, result_summary=f"Updated event {event_id}: {list(patch_body)}")
    return _fmt({"status": "updated", "event": updated})


@mcp.tool()
async def delete_event(ctx: Context, event_id: int, confirm: bool = False) -> str:
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
        stats = {}
        try:
            stats = await _get(f"/api/admin/events/{event_id}/health", api_key)
        except Exception:
            pass
        return _fmt({
            "status": "preview",
            "warning": "⚠️ This is a DESTRUCTIVE action that cannot be undone.",
            "event": {"id": event_id, "name": event_name},
            "will_delete": {
                "attendees": stats.get("attendee_count", "unknown"),
                "certificates": stats.get("certificate_count", "unknown"),
                "sessions": stats.get("session_count", "unknown"),
            },
            "instruction": "Call delete_event again with confirm=True to permanently delete.",
        })
    await _delete(f"/api/admin/events/{event_id}", api_key)
    _fire_and_forget_log(api_key, "delete_event", event_id=event_id,
                         payload={"event_id": event_id},
                         result_summary=f"Deleted event '{event_name}' (id={event_id})")
    return _fmt({"status": "deleted", "event_id": event_id, "name": event_name})


@mcp.tool()
async def close_registration(ctx: Context, event_id: int) -> str:
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
    return _fmt({"status": "registration_closed", "event": updated})


@mcp.tool()
async def open_registration(ctx: Context, event_id: int) -> str:
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
    return _fmt({"status": "registration_opened", "event": updated})


# ── Tools: Attendees ───────────────────────────────────────────────────────────


@mcp.tool()
async def list_attendees(
    ctx: Context,
    event_id: int,
    page: int = 1,
    limit: int = 50,
    search: str = "",
) -> str:
    """
    List attendees for an event with optional pagination and search.

    Args:
        event_id: Numeric event ID.
        page: Page number (starts at 1). Default: 1.
        limit: Records per page (max 500). Default: 50.
        search: Filter by name or email.

    Returns paginated attendees with: id, name, email, source, registered_at,
    sessions_attended, has_certificate.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "attendees:read")
    params: dict = {"page": page, "limit": limit}
    if search:
        params["search"] = search
    data = await _get(f"/api/admin/events/{event_id}/attendees", api_key, params=params)
    return _fmt(data)


@mcp.tool()
async def add_attendee(
    ctx: Context,
    event_id: int,
    first_name: str,
    last_name: str,
    email: str,
) -> str:
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
                         payload={"email": email, "name": f"{first_name} {last_name}"},
                         result_summary=f"Added attendee {email} to event {event_id}")
    return _fmt({"status": "added", "attendee": data})


@mcp.tool()
async def bulk_add_attendees(ctx: Context, event_id: int, attendees: list[dict]) -> str:
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
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 409:
                results["skipped"] += 1
            else:
                results["errors"].append({"email": a.get("email"), "error": exc.response.text})  # type: ignore[union-attr]
    _fire_and_forget_log(api_key, "bulk_add_attendees", event_id=event_id,
                         payload={"count": len(attendees)},
                         result_summary=f"Bulk added: {results['added']} added, {results['skipped']} skipped")
    return _fmt({"status": "imported", "result": results})


@mcp.tool()
async def update_attendee(
    ctx: Context,
    event_id: int,
    attendee_id: int,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    email: Optional[str] = None,
) -> str:
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
        return _fmt({"error": "No fields provided — nothing to update."})
    data = await _patch(f"/api/admin/events/{event_id}/attendees/{attendee_id}", api_key, body)
    _fire_and_forget_log(api_key, "update_attendee", event_id=event_id,
                         payload={"attendee_id": attendee_id, **body},
                         result_summary=f"Updated attendee {attendee_id}")
    return _fmt({"status": "updated", "attendee": data})


@mcp.tool()
async def remove_attendee(
    ctx: Context,
    event_id: int,
    attendee_id: int,
    confirm: bool = False,
) -> str:
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
        return _fmt({
            "status": "preview",
            "warning": "⚠️ This will permanently remove the attendee and their registration data.",
            "attendee_id": attendee_id,
            "event_id": event_id,
            "instruction": "Call remove_attendee again with confirm=True to proceed.",
        })
    await _delete(f"/api/admin/events/{event_id}/attendees/{attendee_id}", api_key)
    _fire_and_forget_log(api_key, "remove_attendee", event_id=event_id,
                         payload={"attendee_id": attendee_id},
                         result_summary=f"Removed attendee {attendee_id} from event {event_id}")
    return _fmt({"status": "removed", "attendee_id": attendee_id})


# ── Tools: Sessions ────────────────────────────────────────────────────────────


@mcp.tool()
async def list_sessions(ctx: Context, event_id: int) -> str:
    """
    List all sessions (agenda items) for an event.

    Args:
        event_id: Numeric event ID.

    Returns array of sessions with: id, title, description, start_time, end_time,
    location, speaker, capacity, is_active, attendance_count.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:read")
    data = await _get(f"/api/admin/events/{event_id}/sessions", api_key)
    return _fmt(data)


@mcp.tool()
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
) -> str:
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
    await _require_scope(api_key, "events:write")
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
    return _fmt({"status": "created", "session": data})


@mcp.tool()
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
) -> str:
    """
    Update an existing session. Only provide fields to change.

    Args:
        event_id: Numeric event ID.
        session_id: Numeric session ID (from list_sessions).
        title / description / start_time / end_time / location / speaker / capacity: Fields to update.
        is_active: False to hide this session from attendees.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:write")
    fields = {
        "title": title, "description": description, "start_time": start_time,
        "end_time": end_time, "location": location, "speaker": speaker,
        "capacity": capacity, "is_active": is_active,
    }
    patch_body = {k: v for k, v in fields.items() if v is not None}
    if not patch_body:
        return _fmt({"error": "No fields provided — nothing to update."})
    data = await _patch(f"/api/admin/events/{event_id}/sessions/{session_id}", api_key, patch_body)
    _fire_and_forget_log(api_key, "update_session", event_id=event_id,
                         payload={"session_id": session_id, **patch_body},
                         result_summary=f"Updated session {session_id}")
    return _fmt({"status": "updated", "session": data})


@mcp.tool()
async def delete_session(
    ctx: Context,
    event_id: int,
    session_id: int,
    confirm: bool = False,
) -> str:
    """
    Delete a session from an event permanently.

    Call WITHOUT confirm=True first to preview. Call WITH confirm=True after user approval.

    Args:
        event_id: Numeric event ID.
        session_id: Numeric session ID (from list_sessions).
        confirm: True to confirm deletion. Default: False (preview only).
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:write")
    if not confirm:
        sessions = await _get(f"/api/admin/events/{event_id}/sessions", api_key)
        target = next((s for s in (sessions if isinstance(sessions, list) else []) if s.get("id") == session_id), {})
        return _fmt({
            "status": "preview",
            "warning": "⚠️ This will permanently delete the session and all its attendance records.",
            "session": target or {"id": session_id},
            "instruction": "Call delete_session again with confirm=True to proceed.",
        })
    await _delete(f"/api/admin/events/{event_id}/sessions/{session_id}", api_key)
    _fire_and_forget_log(api_key, "delete_session", event_id=event_id,
                         payload={"session_id": session_id},
                         result_summary=f"Deleted session {session_id} from event {event_id}")
    return _fmt({"status": "deleted", "session_id": session_id})


# ── Tools: Check-in ────────────────────────────────────────────────────────────


@mcp.tool()
async def checkin_lookup(ctx: Context, event_id: int, query: str) -> str:
    """
    Look up attendees by name or email for check-in verification.

    Args:
        event_id: Numeric event ID.
        query: Name or email fragment to search (at least 1 character).

    Returns matching attendees with their check-in status:
    attendee_id, name, email, ticket_status, checked_in_at.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "attendees:read")
    data = await _get(f"/api/admin/events/{event_id}/checkin-lookup", api_key, params={"query": query})
    return _fmt(data)


@mcp.tool()
async def manual_checkin(
    ctx: Context,
    event_id: int,
    session_id: int,
    attendee_email: str,
) -> str:
    """
    Manually mark an attendee as checked-in for a specific session.

    Args:
        event_id: Numeric event ID.
        session_id: Numeric session ID (from list_sessions).
        attendee_email: Email address of the attendee to check in.

    Returns the check-in record.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "attendees:write")
    body = {"email": attendee_email}
    data = await _post(f"/api/admin/events/{event_id}/sessions/{session_id}/checkin", api_key, body)
    _fire_and_forget_log(api_key, "manual_checkin", event_id=event_id,
                         payload={"session_id": session_id, "email": attendee_email},
                         result_summary=f"Checked in {attendee_email} to session {session_id}")
    return _fmt({"status": "checked_in", "result": data})


@mcp.tool()
async def get_attendance_summary(ctx: Context, event_id: int) -> str:
    """
    Get attendance (check-in) records and summary for an event.

    Args:
        event_id: Numeric event ID.

    Returns total registered, total checked-in, attendance rate, and per-session breakdown.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "attendees:read")
    data = await _get(f"/api/admin/events/{event_id}/attendance", api_key)
    return _fmt(data)


# ── Tools: Certificates ────────────────────────────────────────────────────────


@mcp.tool()
async def list_certificates(
    ctx: Context,
    event_id: int,
    search: str = "",
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> str:
    """
    List certificates issued for an event.

    Args:
        event_id: Numeric event ID.
        search: Filter by recipient name. Optional.
        status: "active", "revoked", or "expired". Optional.
        page: Page number. Default: 1.
        limit: Records per page (max 200). Default: 20.

    Returns {total, page, limit, certificates[]} where each cert has:
    id, uuid, student_name, status, issued_at, pdf_url.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "certificates:read")
    params: dict = {"page": page, "limit": limit}
    if search:
        params["search"] = search
    if status:
        params["status"] = status
    data = await _get(f"/api/admin/events/{event_id}/certificates", api_key, params=params)
    return _fmt(data)


@mcp.tool()
async def issue_certificates(
    ctx: Context,
    event_id: int,
    attendee_ids: Optional[list[int]] = None,
) -> str:
    """
    Issue (generate and send) certificates for an event.

    If attendee_ids is omitted, issues for all eligible attendees.
    The event must have certificate_enabled = True.

    Args:
        event_id: Numeric event ID.
        attendee_ids: Optional list of specific attendee IDs to issue to.

    Returns {issued, skipped, errors}.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "certificates:write")
    body: dict = {}
    if attendee_ids is not None:
        body["attendee_ids"] = attendee_ids
    data = await _post(f"/api/admin/events/{event_id}/certificates", api_key, body)
    count = data.get("issued", data.get("count", "unknown"))
    _fire_and_forget_log(api_key, "issue_certificates", event_id=event_id,
                         payload={"attendee_ids": attendee_ids},
                         result_summary=f"Issued {count} certificates for event {event_id}")
    return _fmt(data)


@mcp.tool()
async def revoke_certificate(
    ctx: Context,
    cert_id: int,
    confirm: bool = False,
) -> str:
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
        return _fmt({
            "status": "preview",
            "warning": "⚠️ Revoking makes the certificate PDF inaccessible. This cannot be undone.",
            "cert_id": cert_id,
            "instruction": "Call revoke_certificate again with confirm=True to proceed.",
        })
    data = await _post(f"/api/admin/certificates/{cert_id}/revoke", api_key, {})
    _fire_and_forget_log(api_key, "revoke_certificate",
                         payload={"cert_id": cert_id},
                         result_summary=f"Revoked certificate {cert_id}")
    return _fmt({"status": "revoked", "certificate": data})


@mcp.tool()
async def get_certificate_tier_summary(ctx: Context, event_id: int) -> str:
    """
    Get certificate tier distribution for an event.

    Args:
        event_id: Numeric event ID.

    Returns tier names, thresholds, and attendee counts per tier.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "certificates:read")
    data = await _get(f"/api/admin/events/{event_id}/certificates/tier-summary", api_key)
    return _fmt(data)


# ── Tools: Automation Rules ────────────────────────────────────────────────────


@mcp.tool()
async def list_automation_rules(ctx: Context, event_id: int) -> str:
    """
    List all automation rules for an event.

    Args:
        event_id: Numeric event ID.

    Returns rules with: id, name, trigger, trigger_config, actions, enabled, execution counts.

    Trigger types:
      attended_event, registered_no_show, certificate_issued, survey_not_completed,
      badge_earned, audience_segment, lms_course_enrolled, lms_course_completed,
      lms_module_completed, lms_assignment_graded, lms_journey_completed, compliance_overdue.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:read")
    data = await _get(f"/api/admin/events/{event_id}/automations", api_key)
    return _fmt(data)


@mcp.tool()
async def create_automation_rule(
    ctx: Context,
    event_id: int,
    name: str,
    trigger: str,
    actions: list[dict],
    trigger_config: Optional[dict] = None,
    enabled: bool = True,
) -> str:
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
    await _require_scope(api_key, "events:write")
    body: dict = {
        "name": name, "trigger": trigger, "actions": actions,
        "trigger_config": trigger_config or {}, "enabled": enabled,
    }
    data = await _post(f"/api/admin/events/{event_id}/automations", api_key, body)
    _fire_and_forget_log(api_key, "create_automation_rule", event_id=event_id,
                         payload={"name": name, "trigger": trigger},
                         result_summary=f"Created automation '{name}' (trigger={trigger}) for event {event_id}")
    return _fmt({"status": "created", "automation": data})


# ── Tools: LMS ────────────────────────────────────────────────────────────────


@mcp.tool()
async def list_lms_courses(ctx: Context, search: str = "", limit: int = 20) -> str:
    """
    List LMS courses in the account.

    Args:
        search: Filter by course title. Optional.
        limit: Max results (1–100). Default: 20.

    Returns {total, courses[]} with: id, title, status, enrollment_count,
    module_count, completion_rate.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:read")
    data = await _get("/api/admin/lms/courses", api_key)
    courses: list = data if isinstance(data, list) else data.get("courses", data.get("items", []))  # type: ignore[union-attr]
    if search:
        kw = search.lower()
        courses = [c for c in courses if kw in (c.get("title") or "").lower()]
    courses = courses[: max(1, min(limit, 100))]
    return _fmt({"total": len(courses), "courses": courses})


@mcp.tool()
async def get_lms_course(ctx: Context, course_id: int) -> str:
    """
    Get full details of an LMS course including modules and settings.

    Args:
        course_id: Numeric course ID (from list_lms_courses).
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:read")
    data = await _get(f"/api/admin/lms/courses/{course_id}", api_key)
    return _fmt(data)


@mcp.tool()
async def list_lms_enrollments(
    ctx: Context,
    course_id: int,
    page: int = 1,
    limit: int = 50,
    search: str = "",
) -> str:
    """
    List learner enrollments for an LMS course.

    Args:
        course_id: Numeric course ID.
        page: Page number. Default: 1.
        limit: Records per page (max 200). Default: 50.
        search: Filter by learner name or email. Optional.

    Returns paginated enrollments with: id, learner name, email, enrolled_at,
    progress_pct, completed_at, grade.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "attendees:read")
    params: dict = {"page": page, "limit": limit}
    if search:
        params["search"] = search
    data = await _get(f"/api/admin/lms/courses/{course_id}/enrollments", api_key, params=params)
    return _fmt(data)


@mcp.tool()
async def enroll_in_lms_course(
    ctx: Context,
    course_id: int,
    email: str,
    first_name: str,
    last_name: str,
) -> str:
    """
    Enroll a learner in an LMS course.

    Args:
        course_id: Numeric LMS course ID.
        email: Learner's email address.
        first_name: Learner's first name.
        last_name: Learner's last name.

    Returns the enrollment record.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "attendees:write")
    body = {"enrollments": [{"email": email, "first_name": first_name, "last_name": last_name}]}
    data = await _post(f"/api/admin/lms/courses/{course_id}/enrollments/import", api_key, body)
    _fire_and_forget_log(api_key, "enroll_in_lms_course",
                         payload={"course_id": course_id, "email": email},
                         result_summary=f"Enrolled {email} in course {course_id}")
    return _fmt({"status": "enrolled", "result": data})


@mcp.tool()
async def get_lms_course_analytics(ctx: Context, course_id: int) -> str:
    """
    Get analytics for an LMS course: enrollment trends, completion rates, module drop-off.

    Args:
        course_id: Numeric course ID.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "analytics:read")
    data = await _get(f"/api/admin/lms/courses/{course_id}/analytics", api_key)
    return _fmt(data)


@mcp.tool()
async def get_lms_analytics(ctx: Context) -> str:
    """
    Get org-wide LMS analytics: total enrollments, active learners, completion rate,
    top courses, recent activity.

    No arguments required.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "analytics:read")
    data = await _get("/api/admin/lms/analytics", api_key)
    return _fmt(data)


# ── Tools: Surveys & Analytics ─────────────────────────────────────────────────


@mcp.tool()
async def get_survey_responses(
    ctx: Context,
    event_id: int,
    page: int = 1,
    limit: int = 50,
) -> str:
    """
    Get survey responses collected for an event.

    Args:
        event_id: Numeric event ID. Must have a survey configured.
        page: Page number. Default: 1.
        limit: Records per page. Default: 50.

    Returns paginated submissions with respondent name, email, submitted_at,
    and a `responses` dict keyed by question text.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "analytics:read")
    params: dict = {"page": page, "limit": limit}
    data = await _get(f"/api/admin/events/{event_id}/surveys/responses", api_key, params=params)
    return _fmt(data)


# ── Tools: Organization ────────────────────────────────────────────────────────


@mcp.tool()
async def get_organization_settings(ctx: Context) -> str:
    """
    Get the organization's settings and profile.

    Returns org name, contact email, logo URL, plan details, enabled modules,
    and notification preferences.

    No arguments required.
    """
    api_key = _get_api_key(ctx)
    await _require_scope(api_key, "events:read")
    data = await _get("/api/admin/organization/settings", api_key)
    return _fmt(data)


@mcp.tool()
async def list_agent_logs(
    ctx: Context,
    event_id: Optional[int] = None,
    tool_name: Optional[str] = None,
    limit: int = 20,
) -> str:
    """
    View the agent action audit trail — all write operations performed by AI agents.

    Args:
        event_id: Filter by event. Optional.
        tool_name: Filter by tool name (e.g. "create_event"). Optional.
        limit: Max results to return. Default: 20.

    Returns a list of logged agent actions with: tool_name, event_id,
    api_key_prefix, payload, result_summary, created_at.
    """
    api_key = _get_api_key(ctx)
    params: dict = {"limit": limit}
    if event_id:
        params["event_id"] = event_id
    if tool_name:
        params["tool_name"] = tool_name
    data = await _get("/api/admin/mcp/agent-logs", api_key, params=params)
    return _fmt(data)


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
        mcp.run(transport="stdio")
    elif transport in ("streamable-http", "http"):
        print(
            f"Starting HeptaCert MCP server on port {port} (streamable-http).\n"
            "Users authenticate per-request via Authorization: Bearer hc_live_... header.",
            file=sys.stderr,
        )
        mcp.run(transport="streamable-http", host="0.0.0.0", port=port)
    else:
        print(f"ERROR: Unknown transport '{transport}'. Use 'stdio' or 'streamable-http'.", file=sys.stderr)
        sys.exit(1)
