# Lead_forms_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Lead_forms_api subsystem handles **2 routes** and touches: auth, db.

## Routes

- `GET` `/api/public/forms/{slug}/meta` params(slug) → out: list [auth, db]
  `heptacert\backend\src\lead_forms_api.py`
- `POST` `/api/public/forms/{slug}/submit` params(slug) → out: list [auth, db]
  `heptacert\backend\src\lead_forms_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\lead_forms_api.py`

---
_Back to [overview.md](./overview.md)_