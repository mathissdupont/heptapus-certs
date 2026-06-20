# Social_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Social_api subsystem handles **11 routes** and touches: auth, db.

## Routes

- `GET` `/api/public/feed` → in: in, out: list [auth, db]
  `heptacert\backend\src\social_api.py`
- `POST` `/api/public/feed` → in: CommunityPostCreateIn, out: list [auth, db]
  `heptacert\backend\src\social_api.py`
- `GET` `/api/public/organizations/{org_public_id}/feed` params(org_public_id) → in: in, out: list [auth, db]
  `heptacert\backend\src\social_api.py`
- `POST` `/api/public/organizations/{org_public_id}/feed` params(org_public_id) → in: CommunityPostCreateIn, out: list [auth, db]
  `heptacert\backend\src\social_api.py`
- `POST` `/api/public/posts/{post_public_id}/like` params(post_public_id) → in: CommunityPostCreateIn, out: list [auth, db]
  `heptacert\backend\src\social_api.py`
- `DELETE` `/api/public/posts/{post_public_id}/like` params(post_public_id) → out: list [auth, db]
  `heptacert\backend\src\social_api.py`
- `PATCH` `/api/public/posts/{post_public_id}` params(post_public_id) → out: list [auth, db]
  `heptacert\backend\src\social_api.py`
- `DELETE` `/api/public/posts/{post_public_id}` params(post_public_id) → out: list [auth, db]
  `heptacert\backend\src\social_api.py`
- `GET` `/api/public/posts/{post_public_id}/history` params(post_public_id) → in: in, out: list [auth, db]
  `heptacert\backend\src\social_api.py`
- `GET` `/api/public/posts/{post_public_id}/comments` params(post_public_id) → in: in, out: list [auth, db]
  `heptacert\backend\src\social_api.py`
- `POST` `/api/public/posts/{post_public_id}/comments` params(post_public_id) → in: CommunityPostCreateIn, out: list [auth, db]
  `heptacert\backend\src\social_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\social_api.py`

---
_Back to [overview.md](./overview.md)_