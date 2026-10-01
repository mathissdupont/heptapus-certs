---
name: automations-integrations
description: Manage HeptaCert automation rules, webhooks, and related integration workflows.
---

# Automations and Integrations

## Automation rules

- Use `list_automation_rules` before editing or deleting a rule when its ID is unknown.
- Use `create_automation_rule` for supported triggers/actions.
- Use `update_automation_rule` only for supported fields.
- Use `delete_automation_rule` in preview mode and require explicit approval before confirmation.
- Never invent an automation trigger or action type that the tool schema does not support.

## Webhooks

- Use `list_webhooks` to inspect configured endpoints.
- Use `create_webhook` only for user-provided HTTPS destinations and supported event types.
- Never reveal webhook signing secrets from tool output or memory.
- Use `delete_webhook` in preview mode and require explicit approval before confirmation.

If the user asks to run an automation immediately, inspect execution history, retry a webhook delivery, or update an existing webhook and the corresponding tool is not exposed, state that the connected MCP does not currently provide that operation.
