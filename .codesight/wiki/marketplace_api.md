# Marketplace_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Marketplace_api subsystem handles **5 routes** and touches: auth, db.

## Routes

- `GET` `/api/public/marketplace` → in: Optional, out: list [auth, db]
  `heptacert\backend\src\marketplace_api.py`
- `GET` `/api/public/marketplace/categories` → in: Optional, out: list [auth, db]
  `heptacert\backend\src\marketplace_api.py`
- `GET` `/api/public/marketplace/{event_id}` params(event_id) → in: Optional, out: list [auth, db]
  `heptacert\backend\src\marketplace_api.py`
- `GET` `/api/public/marketplace/courses` → in: Optional, out: list [auth, db]
  `heptacert\backend\src\marketplace_api.py`
- `GET` `/api/public/marketplace/courses/{course_id}` params(course_id) → in: Optional, out: list [auth, db]
  `heptacert\backend\src\marketplace_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\marketplace_api.py`

---
_Back to [overview.md](./overview.md)_