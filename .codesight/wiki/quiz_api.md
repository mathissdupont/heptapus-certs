# Quiz_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Quiz_api subsystem handles **4 routes** and touches: auth, db.

## Routes

- `GET` `/api/public/events/{event_id}/quiz` params(event_id) [auth, db]
  `heptacert\backend\src\quiz_api.py`
- `POST` `/api/public/events/{event_id}/quiz/start` params(event_id) [auth, db]
  `heptacert\backend\src\quiz_api.py`
- `POST` `/api/public/events/{event_id}/quiz/submit` params(event_id) [auth, db]
  `heptacert\backend\src\quiz_api.py`
- `GET` `/api/public/events/{event_id}/quiz/my-result` params(event_id) [auth, db]
  `heptacert\backend\src\quiz_api.py`

## Related Models

- **Quiz** (11 fields) → [database.md](./database.md)

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\quiz_api.py`

---
_Back to [overview.md](./overview.md)_