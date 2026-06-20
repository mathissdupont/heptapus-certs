# Tickets_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Tickets_api subsystem handles **5 routes** and touches: auth, db, cache.

## Routes

- `GET` `/api/tickets/{token}` params(token) → out: PublicTicketOut [auth, db, cache]
  `heptacert\backend\src\tickets_api.py`
- `GET` `/api/tickets/{token}/qr` params(token) → out: PublicTicketOut [auth, db, cache]
  `heptacert\backend\src\tickets_api.py`
- `GET` `/api/tickets/{token}/png` params(token) → out: PublicTicketOut [auth, db, cache]
  `heptacert\backend\src\tickets_api.py`
- `GET` `/api/tickets/{token}/pdf` params(token) → out: PublicTicketOut [auth, db, cache]
  `heptacert\backend\src\tickets_api.py`
- `GET` `/api/tickets/{token}/apple-wallet` params(token) → out: PublicTicketOut [auth, db, cache]
  `heptacert\backend\src\tickets_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\tickets_api.py`

---
_Back to [overview.md](./overview.md)_