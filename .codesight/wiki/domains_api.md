# Domains_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Domains_api subsystem handles **6 routes** and touches: auth, db.

## Routes

- `POST` `/api/domains` → out: DomainOut [auth, db]
  `heptacert\backend\src\domains_api.py`
- `GET` `/api/domains/{domain}` params(domain) → out: DomainOut [auth, db]
  `heptacert\backend\src\domains_api.py`
- `POST` `/api/domains/{domain}/regenerate` params(domain) → out: DomainOut [auth, db]
  `heptacert\backend\src\domains_api.py`
- `DELETE` `/api/domains/{domain}` params(domain) → out: DomainOut [auth, db]
  `heptacert\backend\src\domains_api.py`
- `GET` `/api/domains/{domain}/check` params(domain) → out: DomainOut [auth, db]
  `heptacert\backend\src\domains_api.py`
- `GET` `/.internal/caddy/authorize` → out: DomainOut [auth, db]
  `heptacert\backend\src\domains_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\domains_api.py`

---
_Back to [overview.md](./overview.md)_