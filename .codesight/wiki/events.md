# Events

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Events subsystem handles **9 routes** and touches: auth, db, cache, queue, email, payment, ai.

## Routes

- `GET` `/api/events/{event_id}/capacities` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/events/{event_id}/attendees/{attendee_id}/badges` params(event_id, attendee_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/events/{event_id}/survey-access` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/events/{event_id}/participant-status` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/events/{event_id}/participant-status/me` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/events/{event_id}/info` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/events/{event_id}/registration-document` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/events/{event_id}/verify-email` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/events/{event_id}/resend-verification` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\main.py`

---
_Back to [overview.md](./overview.md)_