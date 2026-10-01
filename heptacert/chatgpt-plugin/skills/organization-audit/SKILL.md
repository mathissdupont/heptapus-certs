---
name: organization-audit
description: Inspect HeptaCert organization settings and the AI agent action audit trail.
---

# Organization and Agent Audit

- Use `get_organization_settings` to read the current organization's profile, enabled modules, plan information, and supported settings.
- Use `list_agent_logs` to inspect AI-agent write activity by event/tool when requested.
- Do not surface historic sensitive payloads that the audit tool intentionally omits.
- Do not claim to update organization settings, team roles, billing, API keys, or plan configuration unless corresponding tools are exposed.
