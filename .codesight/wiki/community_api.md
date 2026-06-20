# Community_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Community_api subsystem handles **4 routes** and touches: auth, db.

## Routes

- `GET` `/api/public/organizations` → out: list [auth, db]
  `heptacert\backend\src\community_api.py`
- `GET` `/api/public/organizations/{org_public_id}` params(org_public_id) → out: list [auth, db]
  `heptacert\backend\src\community_api.py`
- `POST` `/api/public/organizations/{org_public_id}/follow` params(org_public_id) → out: list [auth, db]
  `heptacert\backend\src\community_api.py`
- `DELETE` `/api/public/organizations/{org_public_id}/follow` params(org_public_id) → out: list [auth, db]
  `heptacert\backend\src\community_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\community_api.py`

---
_Back to [overview.md](./overview.md)_