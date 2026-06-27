# ADR-0013 — Background Jobs via Scheduler Loops + Redis Workers

**Status:** Accepted · **Date:** 2026-06-27

## Context
Many operations must run outside the request cycle: bulk certificate generation,
bulk and scheduled email, drip-sequence steps, document/segment exports, monthly
HeptaCoin renewal, certificate hosting auto-renewal, training renewals, and AI
digests. They must be reliable, resumable, and safe across multiple workers.

## Decision
Run background work as **periodic processing functions** (e.g.
`process_automation_dispatches_once`, `process_due_sequence_steps`,
`process_document_export_jobs_once`, monthly HC renewal) driven by the app lifecycle,
with **Redis** for rate-limit storage and coordination and dedicated worker processes
(e.g. the presentation conversion worker). Jobs claim work with row locking
(`with_for_update(skip_locked=True)`) and persist progress for resumability.

## Consequences
- Long/bulk work never blocks the API; jobs resume after interruption.
- `skip_locked` claiming makes multi-worker processing safe (no double-processing).
- Idempotent crediting/state transitions avoid duplicates on retry.
- Trade-off: scheduler-loop semantics need careful cadence and locking; some flows
  may later warrant a dedicated queue/broker as volume grows.
