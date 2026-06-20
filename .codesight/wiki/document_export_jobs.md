# Document_export_jobs

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Document_export_jobs subsystem handles **4 routes** and touches: auth, db, queue.

## Routes

- `POST` `` → out: DocumentExportJobOut [auth, db, queue]
  `heptacert\backend\src\document_export_jobs.py`
- `GET` `` → out: DocumentExportJobOut [auth, db, queue]
  `heptacert\backend\src\document_export_jobs.py`
- `GET` `/{job_id}` params(job_id) → out: DocumentExportJobOut [auth, db, queue]
  `heptacert\backend\src\document_export_jobs.py`
- `GET` `/{job_id}/download` params(job_id) → out: DocumentExportJobOut [auth, db, queue]
  `heptacert\backend\src\document_export_jobs.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\document_export_jobs.py`

---
_Back to [overview.md](./overview.md)_