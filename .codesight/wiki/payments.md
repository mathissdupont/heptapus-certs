# Payments

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Payments subsystem handles **14 routes** and touches: auth, db, cache, queue, email, payment, ai.

## Routes

- `POST` `/api/surveys/external/webhook` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/webhooks` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/admin/webhooks` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PATCH` `/api/admin/webhooks/{webhook_id}` params(webhook_id) → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `DELETE` `/api/admin/webhooks/{webhook_id}` params(webhook_id) → in: DeleteAccountIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/admin/webhooks/{webhook_id}/test` params(webhook_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/pricing/config` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/superadmin/pricing` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PATCH` `/api/superadmin/pricing` → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/billing/status` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/billing/create-payment` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/billing/webhook/{provider_name}` params(provider_name) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/billing/orders` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/billing/subscription` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\main.py`

---
_Back to [overview.md](./overview.md)_