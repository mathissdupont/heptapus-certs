# ADR-0012 — MCP Server Mounted as a Streamable HTTP Sub-App

**Status:** Accepted · **Date:** 2026-06-27

## Context
HeptaCert should be operable by AI agents, not just humans. The Model Context
Protocol (MCP) is the emerging standard. The server must run inside the existing
FastAPI deployment (no separate service), support multiple workers, and authenticate
each agent independently.

## Decision
Expose a **FastMCP** server (~44 tools) mounted at **`/mcp`** as a Streamable HTTP
sub-app. To make this work correctly inside FastAPI, four settings are mandatory:
- `streamable_http_path="/"` so mounting at `/mcp` yields the endpoint at `/mcp`
  (the default would resolve to `/mcp/mcp`);
- the StreamableHTTP **session manager is started in the app lifecycle**
  (`on_event` startup/shutdown), because `app.mount()` does not run a sub-app's
  lifespan — otherwise every request fails with "Task group is not initialized";
- `stateless_http=True` so sessions are not pinned to a single worker;
- DNS-rebinding protection disabled (auth is per-request Bearer token behind a proxy).

Authentication is per-request `Authorization: Bearer hc_live_...`; key scopes are
enforced per tool and every write is recorded in an agent audit log.

## Consequences
- Agents connect to a single, stable `/mcp` endpoint that scales across workers.
- No separate MCP service to deploy or secure.
- Trade-off: the four settings are load-bearing — regressing any one breaks `/mcp`
  (captured in project memory and validated with an isolated mount test).
