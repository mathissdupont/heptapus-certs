# Document_outputs_api

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Document_outputs_api subsystem handles **2 routes** and touches: auth.

## Routes

- `POST` `/official-log` → in: OfficialLogDocumentIn [auth]
  `heptacert\backend\src\document_outputs_api.py`
- `POST` `/official-log/pdf` → in: OfficialLogDocumentIn [auth]
  `heptacert\backend\src\document_outputs_api.py`

## Source Files

Read these before implementing or modifying this subsystem:
- `heptacert\backend\src\document_outputs_api.py`

---
_Back to [overview.md](./overview.md)_