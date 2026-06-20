# Public

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Public subsystem handles **17 routes** and touches: auth, db, cache, queue, email, payment, ai.

## Routes

- `GET` `/api/public/me/export` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/public/me` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/public/me/email-preferences` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/public/me/email-prefereonces` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PATCH` `/api/public/me/email-preferences` → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PATCH` `/api/public/me/email-prefereonces` → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `PATCH` `/api/public/me` → in: PublicMemberProfileUpdateIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/public/me/avatar` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/public/members/{member_public_id}` params(member_public_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `DELETE` `/api/public/me` → in: DeleteAccountIn, out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/public/my-events` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/public/branding` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/public/events` → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/public/events/{event_id}` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `GET` `/api/public/events/{event_id}/comments` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/public/events/{event_id}/comments` params(event_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`
- `POST` `/api/public/events/{event_id}/comments/{comment_id}/report` params(event_id, comment_id) → out: BadgeRulesOut [auth, db, cache, queue, email, payment, upload, ai]
  `heptacert\backend\src\main.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\main.py`

---
_Back to [overview.md](./overview.md)_