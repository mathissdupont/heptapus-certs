# Openapi-actions.json

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Openapi-actions.json subsystem handles **1 routes** and touches: auth, db, cache, queue, email, payment, ai.

## Routes

- `GET` `/api/openapi-actions.json` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\main.py`

---
_Back to [overview.md](./overview.md)_