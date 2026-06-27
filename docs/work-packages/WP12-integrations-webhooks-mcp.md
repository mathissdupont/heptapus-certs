# WP12 — Integrations, Webhooks & MCP (AI Agents)

**Phase:** 3 — Platform & ecosystem · **Status:** ✅ Delivered · 🔄 Iterating · **Related ADRs:** [0011](../adr/0011-integration-storage-and-secrets.md), [0012](../adr/0012-mcp-streamable-http-mount.md)

## Objective
Connect HeptaCert to the tools organizations already use, and expose the platform to
AI agents through a first-class MCP server — with a consistent connector pattern,
encrypted secrets, signed webhooks, and an integration catalog.

## Scope
**In:** notification channels (Slack, Teams, Discord, Google Chat, custom webhooks,
SMS, WhatsApp); CRM/marketing connectors (HubSpot, Salesforce, Mailchimp); data
sync (Google Sheets, Microsoft Excel, Calendar); enterprise (SSO/OIDC, Zoom/Teams
webinar, generic providers); outbound webhooks with HMAC; the MCP server.
**Out:** SSO auth flow (WP02), payment providers (WP11).

## Key deliverables
- Notification trigger fan-out with per-channel payload shaping and event filtering.
- Integration catalog endpoint driving the admin Integrations UI.
- Encrypted-at-rest secrets with masking and merge-on-update.
- Outbound webhooks with HMAC signing, delivery logging, and retries.
- MCP server (Streamable HTTP) at `/mcp` with ~44 tools, per-request Bearer auth,
  scope enforcement, and an agent audit trail.

## Key components
- `heptacert/backend/src/notification_integrations_api.py` — channels, payload builders (Slack/Teams/Discord/Google Chat), `trigger_notification_integrations`, catalog, secret masking.
- `heptacert/backend/src/webhooks.py` + `services.py` — `deliver_webhook`, signing, delivery logs.
- `heptacert/backend/src/mcp_server.py` — FastMCP app, 44 tools, scope enforcement.
- `heptacert/backend/src/main.py` — `/mcp` mount + session-manager lifecycle (see ADR-0012), agent log endpoints.
- `heptacert/backend/src/oauth_api.py`, `sso_api.py`, `lti_api.py` — identity/edu connectors.
- Frontend: `heptacert/frontend/src/app/admin/integrations/page.tsx`.
- Migrations: `041_google_sheets_integration`, `042_microsoft_excel_integration`, `087_lti_tools`, `088_sso_config`, `095_agent_action_logs`, `096_oauth_server`, `073_api_key_rate_limit`.

## Acceptance criteria
- Each notification channel receives a provider-correct payload for subscribed events.
- Secrets are encrypted, masked in responses, and preserved when left blank on update.
- Webhooks are HMAC-signed and retried; deliveries are logged.
- The `/mcp` endpoint completes an MCP `initialize` and runs tools under key scopes.

## Dependencies & related ADRs
Upstream: WP02, WP06, WP07. Downstream: WP13. See ADR-0011, ADR-0012.
