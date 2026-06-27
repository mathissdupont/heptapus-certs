# WP13 — Analytics, Reporting & Observability

**Phase:** 3 — Platform & ecosystem · **Status:** ✅ Delivered

## Objective
Make the platform measurable for both customers (dashboards, scheduled reports) and
operators (product telemetry, performance observability, platform health).

## Scope
**In:** organization dashboards and funnels; scheduled PDF report generation and
delivery; document export jobs; product telemetry; request observability; platform
health; AI-assisted proactive digests and anomaly hints.
**Out:** raw event/CRM data capture (their own WPs).

## Key deliverables
- Organization analytics: certificates, events, members, engagement, compliance
  heatmap, CRM funnel, learning-path completion.
- Scheduled reports (daily/weekly/monthly) rendered to PDF and emailed.
- Async document/segment export jobs.
- Product telemetry ingestion with metadata sanitization.
- Request-level observability (slow-request tracking) and a platform-health view.
- AI proactive layer: digests and anomaly detection over platform activity.

## Key components
- `heptacert/backend/src/org_analytics_api.py`, `stats` endpoints — dashboards/funnels.
- `heptacert/backend/src/report_scheduler_api.py` + `report_scheduler_models.py` — scheduled reports.
- `heptacert/backend/src/document_export_jobs.py`, `document_outputs.py` — exports, official documents.
- `heptacert/backend/src/product_telemetry.py` + `product_telemetry_api.py`, `product_observability.py` — telemetry & observability.
- `heptacert/backend/src/ai_proactive_api.py` — digests & anomalies; `platform_health_api`.
- Migrations: `055_product_query_indexes`, `070_performance_indexes`, `067_document_export_jobs`, `078_scheduled_reports`, `097_ai_digest_jobs`.

## Acceptance criteria
- Dashboards reflect live data; funnels reconcile with source records.
- Scheduled reports generate and deliver on cadence.
- Telemetry is sanitized (no PII leakage) and queryable.
- Slow requests are surfaced; platform-health reflects real status.

## Dependencies & related ADRs
Upstream: WP03–WP12. Downstream: operations. See ADR-0013.
