# Infra

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Infra subsystem handles **1 routes** and touches: auth, db.

## Routes

- `GET` `/status` → in: CurrentUse, out: TwoFAStatusOut [auth, db]
  `heptacert\backend\src\auth_2fa_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\auth_2fa_api.py`

---
_Back to [overview.md](./overview.md)_