---
name: attendees-checkin
description: Manage HeptaCert attendees, attendee lookup, bulk attendee import, check-in, attendance summaries, and attendee export.
---

# Attendees and Check-in

## Attendees

- Resolve the event with `list_events` before attendee writes when needed.
- Use `list_attendees` for event-scoped search and pagination.
- Use `add_attendee` for one person and `bulk_add_attendees` for up to the tool's supported batch size.
- Use `update_attendee` for name/email changes.
- Use `remove_attendee` in preview mode first and require explicit approval before confirmation.
- Use `export_event_attendees` when the user needs a complete structured attendee export for reporting or downstream work.

## Check-in

- Use `checkin_lookup` to find a participant by name or email before manual check-in when identity is uncertain.
- Use `list_sessions` to resolve a session before `manual_checkin`.
- Use `get_attendance_summary` for event-level and per-session attendance metrics.

Do not expose registration answers or personal fields that the tool intentionally omits. Do not claim to manage registration approval, uploaded registration documents, kiosk sessions, or ticket scanning unless such tools are exposed.
