# Lms_extended_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Lms_extended_api subsystem handles **6 routes** and touches: auth, db.

## Routes

- `GET` `/api/public/courses/{course_id}/discussions` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/public/courses/{course_id}/discussions/{discussion_id}` params(course_id, discussion_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/public/courses/{course_id}/discussions` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `POST` `/api/public/courses/{course_id}/discussions/{discussion_id}/replies` params(course_id, discussion_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/public/courses/{course_id}/calendar` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`
- `GET` `/api/public/courses/{course_id}/my-grades` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_extended_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\_archive_lms\lms_extended_api.py`

---
_Back to [overview.md](./overview.md)_