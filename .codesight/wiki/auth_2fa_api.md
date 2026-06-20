# Auth_2fa_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Auth_2fa_api subsystem handles **6 routes** and touches: auth, db.

## Routes

- `POST` `/setup` → out: TwoFAStatusOut [auth, db]
  `heptacert\backend\src\auth_2fa_api.py`
- `POST` `/enable` → out: TwoFAStatusOut [auth, db]
  `heptacert\backend\src\auth_2fa_api.py`
- `PATCH` `/disable` → out: TwoFAStatusOut [auth, db]
  `heptacert\backend\src\auth_2fa_api.py`
- `POST` `/backup-codes` → out: TwoFAStatusOut [auth, db]
  `heptacert\backend\src\auth_2fa_api.py`
- `GET` `/backup-codes/status` → in: CurrentUse, out: TwoFAStatusOut [auth, db]
  `heptacert\backend\src\auth_2fa_api.py`
- `POST` `/backup-codes/regenerate` → out: TwoFAStatusOut [auth, db]
  `heptacert\backend\src\auth_2fa_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\auth_2fa_api.py`

---
_Back to [overview.md](./overview.md)_