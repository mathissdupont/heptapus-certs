---
name: communications-surveys
description: Manage HeptaCert email templates, bulk email jobs, delivery results, and event survey configuration when the corresponding MCP tools are available.
---

# Email Communication and Surveys

Use this skill only when the corresponding tools are exposed by the current HeptaCert connection. Never pretend these tools exist when they are unavailable.

## Email templates

- Use `list_email_templates` before modifying or deleting an event-scoped template when its ID is unknown.
- Use `create_email_template` to create a custom event template.
- Use `update_email_template` with the complete editable template fields required by the tool.
- Use `preview_email_template` to verify rendered content before a campaign or automation uses the template.
- Use `list_system_email_templates` to inspect HeptaCert-provided defaults.
- Use `delete_email_template` in preview mode first and require explicit approval before confirmation.

## Bulk email

- Treat bulk email as an external, mass-impact action.
- Use `start_bulk_email` with `confirm=false` first and show recipient scope/count when available.
- Only call it again with `confirm=true` after explicit user approval.
- Use `list_bulk_email_jobs` to discover job IDs and review recent jobs.
- Use `get_bulk_email_job` for a job's current state.
- Use `get_bulk_email_delivery_stats` for aggregate delivery outcomes and `get_bulk_email_delivery_logs` when the user needs per-delivery diagnostics exposed by the backend.
- Use `cancel_bulk_email_job` in preview mode and require explicit approval before confirmation.
- Never describe a queued or pending job as delivered.

## Surveys

- Use `get_survey_config` to inspect the current event survey configuration.
- Use `configure_survey` to create or replace built-in/external survey configuration.
- Use `get_survey_responses` to read collected responses.
- Never expose an external survey webhook secret in a summary. If a tool result includes one, redact it.
