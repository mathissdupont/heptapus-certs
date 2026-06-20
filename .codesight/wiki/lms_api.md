# Lms_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Lms_api subsystem handles **16 routes** and touches: auth, db.

## Routes

- `GET` `/api/public/courses` → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `GET` `/api/public/courses/{course_id}` params(course_id) → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `POST` `/api/public/courses/{course_id}/enroll` params(course_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `POST` `/api/public/courses/{course_id}/modules/{module_id}/complete` params(course_id, module_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `GET` `/api/public/lms/journeys` → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `POST` `/api/public/lms/journeys/{journey_id}/enroll` params(journey_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `POST` `/api/public/courses/{course_id}/modules/{module_id}/submit` params(course_id, module_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `GET` `/api/public/orgs/{org_id}/lms-branding` params(org_id) → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `GET` `/api/public/quizzes/{quiz_id}` params(quiz_id) → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `GET` `/api/public/quizzes/{quiz_id}/my-attempts` params(quiz_id) → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `POST` `/api/public/quizzes/{quiz_id}/start` params(quiz_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `POST` `/api/public/quiz-attempts/{attempt_id}/submit` params(attempt_id) [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `GET` `/api/public/quiz-attempts/{attempt_id}/result` params(attempt_id) → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `GET` `/api/public/courses/{course_id}/announcements` params(course_id) → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `GET` `/api/public/courses/{course_id}/syllabus` params(course_id) → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`
- `GET` `/api/public/my-courses` → in: Optional [auth, db]
  `heptacert\backend\_archive_lms\lms_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\_archive_lms\lms_api.py`

---
_Back to [overview.md](./overview.md)_