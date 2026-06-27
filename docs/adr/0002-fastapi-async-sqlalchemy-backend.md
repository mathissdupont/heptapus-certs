# ADR-0002 — FastAPI + Async SQLAlchemy Backend

**Status:** Accepted · **Date:** 2026-06-27

## Context
The platform needs a high-throughput API with strong typing, automatic OpenAPI,
first-class async I/O (DB, HTTP calls to payment/integration providers, email), and
a productive developer experience in Python.

## Decision
Build the backend on **FastAPI** with **async SQLAlchemy** and **Pydantic** schemas.
Database sessions are provided via a `get_db` dependency over an async engine; all
request handlers are `async`.

## Consequences
- Native async means provider calls, webhooks, and bulk jobs scale without blocking.
- Pydantic gives validated request/response models and OpenAPI for free.
- Type hints + dependency injection make guards (auth, plan gating) composable.
- Trade-off: async correctness requires discipline (no sync DB calls in handlers);
  CPU-heavy work (PDF rendering) is offloaded to threads.
