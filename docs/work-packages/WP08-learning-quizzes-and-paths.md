# WP08 — Quizzes, Learning Paths & LMS

**Phase:** 2 — Engagement & growth · **Status:** ✅ Delivered · 🔄 Iterating

## Objective
Support structured learning and assessment: a quiz engine that can gate
certificates, multi-step learning paths with prerequisites, and a full course LMS
for organizations that run training programs.

## Scope
**In:** quiz authoring and grading; certificate-on-pass triggers; learning paths
with ordered steps and completion tracking; course LMS (modules, enrollment,
progress, assignments, grading, discussions, rubrics).
**Out:** accreditation/CPD accounting (WP09).

## Key deliverables
- Quiz engine: multiple-choice/true-false/open, passing score, attempt limits, timer.
- Automatic scoring and certificate trigger on pass.
- Learning paths: ordered steps, prerequisites, required vs optional, per-step minimums.
- Course LMS: courses, modules, enrollment, module progress, assignments,
  submissions, grade items, discussions, rubrics.
- An archived first-generation LMS retained for reference and data continuity.

## Key components
- `heptacert/backend/src/quiz_api.py` + `quiz_models.py` — quizzes, attempts, answers.
- `heptacert/backend/src/learning_path_api.py` + `learning_path_models.py` — paths, enrollments, step completion.
- `heptacert/backend/src/lms_models.py`, `lms_extended_models.py` — course LMS data model.
- `heptacert/backend/_archive_lms/` — archived prior LMS (kept; see project memory).
- Migrations: `074_quiz_tables`, `075_learning_paths`, `081_lms_tables`, `083_lms_extended`, `090–093_lms_*`, `094_event_quiz_cpd_toggles`.

## Acceptance criteria
- A passing quiz attempt issues a certificate automatically.
- Learning paths enforce prerequisites and track completion accurately.
- LMS enrollment, progress, and grading persist and report correctly.

## Dependencies & related ADRs
Upstream: WP03, WP05. Downstream: WP09, WP10, WP13.
