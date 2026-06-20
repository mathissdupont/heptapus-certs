# Connections_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Connections_api subsystem handles **9 routes** and touches: auth, db.

## Routes

- `POST` `/api/public/members/{member_public_id}/follow` params(member_public_id) → out: list [auth, db]
  `heptacert\backend\src\connections_api.py`
- `DELETE` `/api/public/members/{member_public_id}/follow` params(member_public_id) → out: list [auth, db]
  `heptacert\backend\src\connections_api.py`
- `GET` `/api/public/members/{member_public_id}/followers` params(member_public_id) → in: CurrentPublicMembe, out: list [auth, db]
  `heptacert\backend\src\connections_api.py`
- `GET` `/api/public/members/{member_public_id}/following` params(member_public_id) → in: CurrentPublicMembe, out: list [auth, db]
  `heptacert\backend\src\connections_api.py`
- `GET` `/api/public/members/{member_public_id}/connection-stats` params(member_public_id) → in: CurrentPublicMembe, out: list [auth, db]
  `heptacert\backend\src\connections_api.py`
- `POST` `/api/public/members/{member_public_id}/block` params(member_public_id) → out: list [auth, db]
  `heptacert\backend\src\connections_api.py`
- `DELETE` `/api/public/members/{member_public_id}/block` params(member_public_id) → out: list [auth, db]
  `heptacert\backend\src\connections_api.py`
- `GET` `/api/public/members/me/privacy` → in: CurrentPublicMembe, out: list [auth, db]
  `heptacert\backend\src\connections_api.py`
- `PATCH` `/api/public/members/me/privacy` → in: ConnectionPrivacyIn, out: list [auth, db]
  `heptacert\backend\src\connections_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\connections_api.py`

---
_Back to [overview.md](./overview.md)_