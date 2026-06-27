# HeptaCert — Project Documentation

HeptaCert is an end-to-end **event operating system**: a single platform that runs
the full event lifecycle — registration, QR check-in and attendance, automated and
publicly verifiable digital certificates, email campaigns and automation, CRM,
learning paths and LMS, accreditation/CPD, a public training marketplace, billing,
deep integrations, and an MCP server for AI agents.

This folder is the canonical engineering documentation for the platform. It is
written **as if the system were planned and built from scratch**: a Work Breakdown
Structure (Work Packages) describing *what was built and why*, and Architecture
Decision Records (ADRs) capturing *the decisions that shaped it*.

> Publisher: **Heptapus Group** · Primary language: Turkish (full English UI) ·
> Status: production-grade SaaS.

---

## How this documentation is organized

| Area | Path | Purpose |
|------|------|---------|
| **Work Packages** | [`work-packages/`](work-packages/README.md) | The Work Breakdown Structure (WBS). Each WP defines objective, scope, deliverables, key components, and acceptance criteria. |
| **Architecture Decision Records** | [`adr/`](adr/README.md) | Numbered, immutable records of significant technical decisions, their context, and consequences. |
| **Reference** | [`reference/`](reference/) | Preserved deep-dives: security audit, deployment checklist, discovery algorithm, product roadmap, pitch deck, test-gap inventories, API smoke-test scripts. |
| **Marketing** | [`marketing/`](marketing/) | Go-to-market collateral (positioning, sales enablement, social content, training series). Mostly Turkish. |
| **AI context map** | [`../.codesight/`](../.codesight/) | Machine-generated map of routes, schema, components, and module wiki. |

## System at a glance

| Dimension | Value |
|-----------|-------|
| Architecture | Modular monolith API + Next.js frontend + Python CLI, in a single monorepo |
| Backend | FastAPI, async SQLAlchemy, Pydantic, PostgreSQL, Alembic (100+ migrations), Redis |
| Frontend | Next.js (App + Pages routers), TypeScript, Tailwind design system, i18n (tr/en), white-label branding |
| API surface | ~690 REST routes across domain-split routers; OpenAPI; Bearer-token API keys with scopes |
| Data model | 150+ SQLAlchemy models |
| AI access | MCP (Model Context Protocol) server at `/mcp` exposing ~44 agent tools |
| Payments | iyzico / PayTR / Stripe behind a provider abstraction; HeptaCoin usage credits |
| Integrations | Slack, Teams, Discord, Google Chat, WhatsApp, HubSpot, Salesforce, Mailchimp, Google/Microsoft, Zoom, SSO/OIDC, webhooks |
| Deployment | Docker Compose; reverse proxy with custom-domain (white-label) support |

## Repository layout

```
heptacert/
  backend/    FastAPI app, SQLAlchemy models, Alembic migrations, MCP server, tests
  frontend/   Next.js app (admin, public, community), design system, i18n
  cli/        Python CLI (heptacert_cli) over the public API
  loadtest/   k6 load-test scenarios
  docs/       In-product documentation site (Next.js/MDX)
docs/         <- you are here: engineering WBS + ADRs + reference + marketing
.codesight/   AI context map (routes, schema, components, wiki)
```

## Reading order for newcomers

1. This file, then [`work-packages/README.md`](work-packages/README.md) for the WBS.
2. [`adr/0001-monorepo-and-workspace-separation.md`](adr/0001-monorepo-and-workspace-separation.md) → ADR log for the "why".
3. The WP closest to your task (e.g. [`work-packages/WP05-certificates-and-verification.md`](work-packages/WP05-certificates-and-verification.md)).
4. [`../.codesight/wiki/index.md`](../.codesight/wiki/index.md) to locate code, then the source itself.

---

_Last updated: 2026-06-27 · Documentation version 1.0_
