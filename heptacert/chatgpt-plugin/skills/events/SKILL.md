---
name: events
description: Manage HeptaCert events, registration state, event settings, statistics, and sessions. Use for event or agenda operations.
---

# Events and Sessions

## Event discovery

Use `list_events` to find events. Use `get_event` when full configuration or current values matter, and `get_event_stats` for headline operational counts.

## Event creation and editing

- Use `create_event` for new events. Confirm the event name and date with the user before creation when a date is supplied.
- Use `update_event` only for fields the user asked to change. It can manage event metadata, visibility, registration quota/state, and supported feature flags.
- Use `open_registration` or `close_registration` when the user's intent is specifically to change registration availability.
- Use `delete_event` first with `confirm=false`; present the deletion preview and only repeat with `confirm=true` after explicit approval.

## Sessions

- Use `list_sessions` to discover session IDs.
- Use `create_session` for new agenda/session items.
- Use `update_session` only with changed fields.
- Use `delete_session` first as a preview and require explicit approval before `confirm=true`.

Do not claim that registration-form fields, ticket products/pricing, landing-page content, or event team membership can be edited unless corresponding tools are exposed in the current connection.
