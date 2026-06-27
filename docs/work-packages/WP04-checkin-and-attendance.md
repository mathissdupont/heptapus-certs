# WP04 — Check-in & Attendance

**Phase:** 1 — Core event lifecycle · **Status:** ✅ Delivered

## Objective
Capture attendance reliably at the venue: session-level QR check-in, a live
operations screen for gate staff, offline-tolerant scanning, and an attendance
matrix that feeds certificate eligibility.

## Scope
**In:** event sessions; QR generation per session; check-in scanning and manual
check-in; duplicate/invalid handling; live ops metrics; attendance activity logs;
minimum-sessions rule for certificate eligibility.
**Out:** certificate generation (WP05).

## Key deliverables
- Session entity with schedule, location, and active/inactive check-in toggle.
- Per-session QR codes; public check-in endpoint resolved by nonce/token.
- Live ops screen with real-time metrics; manual check-in fallback.
- Attendance activity log (method, source, success, duplicate, invalid reason).
- Minimum-sessions threshold enforced when issuing certificates.

## Key components
- `heptacert/backend/src/checkin_ops_api.py` — `publish_checkin_event`, `record_checkin_activity`, lookup/metrics/nonce.
- `heptacert/backend/src/main.py` — session CRUD, QR, toggle, bulk-certify gate.
- `heptacert/frontend/src/app/admin/events/[id]/sessions/` — session management UI.
- `heptacert/frontend/src/app/admin/events/[id]/qr-present/` — projector QR view.
- Migrations: `003_attendance`, `047_fix_attendance_table_name`, `054_checkin_activity_logs`, `063_checkin_wallet_template_phase14_15`.

## Acceptance criteria
- Each session produces a scannable QR that records attendance in real time.
- Duplicate and invalid scans are detected and logged, not double-counted.
- The live ops screen reflects check-ins within seconds.
- Certificate eligibility correctly honors the minimum-sessions rule.

## Dependencies & related ADRs
Upstream: WP03. Downstream: WP05, WP13.
