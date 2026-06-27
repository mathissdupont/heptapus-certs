# WP16 — Security, Compliance, QA & DevOps

**Phase:** 4 — Experience, growth surface & quality (cross-cutting) · **Status:** 🧪 Hardening · **Related ADRs:** [0013](../adr/0013-background-jobs-and-workers.md), [0016](../adr/0016-modular-monolith-api.md)

## Objective
Keep the platform secure, compliant, tested, and operable: input hardening, abuse
controls, data-protection compliance, automated tests, load testing, and a
repeatable deployment with background workers.

## Scope
**In:** security hardening (rate limiting, upload scanning, moderation, audit logs,
PDF signing, watermarking); KVKK/data-protection posture; automated tests; k6 load
testing; Docker-based deployment; background job/worker orchestration; the CLI.
**Out:** feature-specific logic (their WPs).

## Key deliverables
- Rate limiting (global + per-API-key) and abuse protection.
- Upload security (ClamAV scanning) and text moderation.
- Audit logging of sensitive actions; soft-delete; 2FA (WP02).
- Document/PDF signing and certificate watermarking (forensics).
- Test suites (unit + integration) and API smoke scripts; k6 load scenarios.
- Production Docker Compose with API workers, background workers, Redis, reverse proxy.
- Python CLI for operators/integrators over the public API.

## Key components
- `heptacert/backend/src/ratelimit.py` — limiter, key strategy, trusted-proxy handling.
- `heptacert/backend/src/upload_security.py` (`scan_upload_with_clamav`), `moderation.py`.
- `heptacert/backend/src/services.py` (`write_audit_log`), `signing.py`, `watermark.py`.
- `heptacert/backend/tests/` — pytest suites; [`../reference/test_all_endpoints.py`](../reference/test_all_endpoints.py) smoke script.
- `heptacert/loadtest/k6-public-mixed.js` — load test.
- `docker-compose.yml`, `heptacert/cli/` — deployment & CLI.
- Reference: [`../reference/SECURITY_AUDIT.md`](../reference/SECURITY_AUDIT.md), [`../reference/DEPLOYMENT_CHECKLIST.md`](../reference/DEPLOYMENT_CHECKLIST.md), [`../reference/TEST_COVERAGE_GAP_INVENTORY.md`](../reference/TEST_COVERAGE_GAP_INVENTORY.md).

## Acceptance criteria
- Abusive request patterns are throttled; malicious uploads are rejected.
- Sensitive actions are audited; secrets never appear in logs or API responses.
- Test suites pass in CI; load tests meet target latency/throughput.
- A clean environment can be deployed from the documented checklist.

## Dependencies & related ADRs
Cross-cutting over all WPs. See ADR-0013, ADR-0016, and the reference security audit.
