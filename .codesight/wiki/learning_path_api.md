# Learning_path_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Learning_path_api subsystem handles **4 routes** and touches: auth, db.

## Routes

- `GET` `/api/public/learning-paths` → in: Optional [auth, db]
  `heptacert\backend\src\learning_path_api.py`
- `POST` `/api/public/learning-paths/{path_id}/enroll` params(path_id) [auth, db]
  `heptacert\backend\src\learning_path_api.py`
- `GET` `/api/public/learning-paths/{path_id}/progress` params(path_id) → in: Optional [auth, db]
  `heptacert\backend\src\learning_path_api.py`
- `POST` `/api/public/learning-paths/{path_id}/steps/{step_id}/complete` params(path_id, step_id) [auth, db]
  `heptacert\backend\src\learning_path_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\learning_path_api.py`

---
_Back to [overview.md](./overview.md)_