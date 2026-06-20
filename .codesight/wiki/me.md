# Me

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Me subsystem handles **4 routes** and touches: auth, db, cache, queue, email, payment, ai.

## Routes

- `GET` `/api/me` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/me/export` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PATCH` `/api/me/email` → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `DELETE` `/api/me` → in: DeleteAccountIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\main.py`

---
_Back to [overview.md](./overview.md)_