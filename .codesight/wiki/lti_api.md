# Lti_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Lti_api subsystem handles **1 routes** and touches: auth, db.

## Routes

- `POST` `/api/public/courses/{course_id}/modules/{module_id}/lti-launch` params(course_id, module_id) [auth, db]
  `heptacert\backend\src\lti_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\lti_api.py`

---
_Back to [overview.md](./overview.md)_