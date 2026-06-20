# Event_sponsors_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Event_sponsors_api subsystem handles **1 routes** and touches: auth, db.

## Routes

- `GET` `/api/public/events/{event_id}/sponsors` params(event_id) → out: SponsorSlotOut [auth, db, upload]
  `heptacert\backend\src\event_sponsors_api.py`

## Related Models

- **Event** (29 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\event_sponsors_api.py`

---
_Back to [overview.md](./overview.md)_