# Presentation_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Presentation_api subsystem handles **25 routes** and touches: auth, db, cache, queue, ai.

## Routes

- `GET` `/events/{event_id}` params(event_id) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `POST` `/events/{event_id}/upload` params(event_id) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `POST` `/generate` → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `GET` `/{deck_id}` params(deck_id) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `GET` `/{deck_id}/security` params(deck_id) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `PATCH` `/{deck_id}/security` params(deck_id) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `GET` `/{deck_id}/session` params(deck_id) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `PATCH` `/{deck_id}/session` params(deck_id) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `GET` `/{deck_id}/notes/{slide_index}` params(deck_id, slide_index) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `PUT` `/{deck_id}/notes/{slide_index}` params(deck_id, slide_index) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `GET` `/{deck_id}/file` params(deck_id) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `GET` `/{deck_id}/remote-qr` params(deck_id) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `PATCH` `/{deck_id}` params(deck_id) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `DELETE` `/{deck_id}` params(deck_id) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `POST` `/{deck_id}/export` params(deck_id) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `GET` `/{deck_id}/export` params(deck_id) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `POST` `/{deck_id}/presenter-token` params(deck_id) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `GET` `/audience/{token}` params(token) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `GET` `/audience/{token}/session` params(token) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `GET` `/audience/{token}/file` params(token) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `GET` `/control/{token}` params(token) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `GET` `/control/{token}/session` params(token) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `PATCH` `/control/{token}/session` params(token) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `GET` `/control/{token}/file` params(token) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`
- `GET` `/{token}` params(token) → out: list [auth, db, cache, queue, upload, ai]
  `heptacert\backend\src\presentation_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\presentation_api.py`

---
_Back to [overview.md](./overview.md)_