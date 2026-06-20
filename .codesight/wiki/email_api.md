# Email_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Email_api subsystem handles **21 routes** and touches: auth, db, cache, queue, payment.

## Routes

- `GET` `/api/system/email-templates` → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/superadmin/email-audience` → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `POST` `/api/superadmin/bulk-email` → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `POST` `/api/superadmin/bulk-email/test` → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `POST` `/api/superadmin/bulk-email/jobs` → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/public/track/open/{log_id}` params(log_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/public/track/click/{log_id}` params(log_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/public/attendees/{attendee_id}/unsubscribe-verify` params(attendee_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/superadmin/system-digest/config` → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `PATCH` `/api/superadmin/system-digest/config` → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `POST` `/api/superadmin/system-digest/send-now` → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `POST` `/api/superadmin/system-digest/test` → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/superadmin/system-digest/preview` → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/superadmin/bulk-email/jobs` → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/superadmin/email-activity` → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `POST` `/api/superadmin/bulk-email/jobs/{job_id}/cancel` params(job_id) → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `POST` `/api/superadmin/bulk-email/jobs/{job_id}/retry` params(job_id) → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/public/attendees/{attendee_id}/unsubscribe` params(attendee_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `POST` `/api/public/attendees/{attendee_id}/unsubscribe` params(attendee_id) → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `GET` `/api/public/members/{member_id}/unsubscribe-digest` params(member_id) → in: AsyncSessio, out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`
- `POST` `/api/public/members/{member_id}/unsubscribe-digest` params(member_id) → out: list [auth, db, cache, queue, payment]
  `heptacert\backend\src\email_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\email_api.py`

---
_Back to [overview.md](./overview.md)_