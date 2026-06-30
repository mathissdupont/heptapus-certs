# Work Breakdown Structure (Work Packages)

This is the Work Breakdown Structure for HeptaCert, written as if the platform were
planned and delivered from scratch. Each **Work Package (WP)** is a self-contained
unit of delivery with a clear objective, scope, deliverables, the concrete
components that implement it, and acceptance criteria.

The WBS is grouped into five delivery phases. Phases are logical, not strictly
sequential — later phases assume the foundations of earlier ones but several WPs
were developed in parallel.

## Phases & Work Packages

### Phase 0 — Foundations
| WP | Title | Outcome |
|----|-------|---------|
| [WP01](WP01-platform-foundation-and-architecture.md) | Platform Foundation & Architecture | Monorepo, API skeleton, DB, migrations, Docker, CI |
| [WP02](WP02-identity-access-and-tenancy.md) | Identity, Access & Multi-Tenancy | Auth, 2FA, RBAC, organization scoping, OAuth server, SSO |

### Phase 1 — Core event lifecycle
| WP | Title | Outcome |
|----|-------|---------|
| [WP03](WP03-event-and-registration.md) | Event & Registration Management | Events, custom registration, tickets, public pages |
| [WP04](WP04-checkin-and-attendance.md) | Check-in & Attendance | Session QR check-in, live ops, attendance matrix |
| [WP05](WP05-certificates-and-verification.md) | Certificate Issuance & Verification | Templated PDF certs, watermark, public QR verification |

### Phase 2 — Engagement & growth
| WP | Title | Outcome |
|----|-------|---------|
| [WP06](WP06-email-and-automation.md) | Email, Templates & Automation | Bulk email, drip sequences, tracking |
| [WP07](WP07-crm-and-lead-management.md) | CRM & Lead Management | Contacts, accounts, deals, lead forms |
| [WP08](WP08-learning-quizzes-and-paths.md) | Quizzes, Learning Paths & LMS | Assessments, learning paths, course LMS |
| [WP09](WP09-accreditation-and-cpd.md) | Accreditation & CPD | CPD hours, accreditation bodies, transcripts |

### Phase 3 — Platform & ecosystem
| WP | Title | Outcome |
|----|-------|---------|
| [WP10](WP10-marketplace-community-discovery.md) | Marketplace, Community & Discovery | Public catalog, social feed, discovery ranking |
| [WP11](WP11-billing-subscriptions-heptacoin.md) | Billing, Subscriptions & HeptaCoin | Plans, payments, usage credits, feature gating |
| [WP12](WP12-integrations-webhooks-mcp.md) | Integrations, Webhooks & MCP | Connectors, webhooks, AI-agent MCP server |
| [WP13](WP13-analytics-reporting-observability.md) | Analytics, Reporting & Observability | Dashboards, scheduled reports, telemetry |

### Phase 4 — Experience, growth surface & quality
| WP | Title | Outcome |
|----|-------|---------|
| [WP14](WP14-design-system-and-frontend.md) | Design System & Frontend UX | Token-based design system, shared components |
| [WP15](WP15-seo-geo-and-web-presence.md) | SEO, GEO & Public Web Presence | SSR metadata, structured data, AI discoverability |
| [WP16](WP16-security-compliance-qa-devops.md) | Security, Compliance, QA & DevOps | Hardening, KVKK, testing, deployment |

### Phase 5 — Competitive expansion (planned)
Closing feature gaps versus Cvent / Bizzabo / Swapcard / Whova / Eventbrite. Every
event-scoped item follows the two-layer gate (ADR-0017) and event-type presets (ADR-0018);
see [FEATURE_ROADMAP_2026](../reference/FEATURE_ROADMAP_2026.md) for sequencing.

| WP | Title | Outcome |
|----|-------|---------|
| [WP17](WP17-event-type-presets-and-feature-framework.md) | Event-Type Presets & Feature-Toggle Framework | Uniform two-layer gate + type-driven defaults (foundation) |
| [WP18](WP18-internationalization.md) | Internationalization (i18n) | UI catalogs (tr/en) + JSONB content language maps |
| [WP19](WP19-promotion-and-discount-codes.md) | Promotion & Discount Codes | Promo/discount engine on ticket types |
| [WP20](WP20-agenda-sessions-personal-schedule.md) | Agenda, Sessions & Personal Schedule | Tracks/rooms, capacity, personal schedule, ICS |
| [WP21](WP21-speaker-portal-and-call-for-papers.md) | Speaker Portal & Call-for-Papers | Abstract submission + review workflow |
| [WP22](WP22-networking-and-meeting-scheduling.md) | Networking & Meeting Scheduling | 1:1 meetings on the connection graph |
| [WP23](WP23-live-engagement.md) | Live Engagement (Q&A & Live Polls) | Real-time in-session interaction |
| [WP24](WP24-gamification-engine.md) | Gamification Engine | Points/leaderboard/achievements (fills existing flag) |
| [WP25](WP25-exhibitor-and-lead-retrieval.md) | Exhibitor & Booth Management + Lead Retrieval | Booths + scoped exhibitor lead capture |
| [WP26](WP26-onsite-badge-printing.md) | On-Site Badge Design & Printing | Physical badge design + print at check-in |
| [WP27](WP27-seating-and-floor-plans.md) | Seating & Floor Plans | Reserved seating (demand-gated) |

**Deferred (strategic, pending segment decision — not yet greenlit):** Native mobile app
(consider PWA + web-push as an interim step) and a native virtual/hybrid stage
(streaming/breakout/virtual booths). See FEATURE_ROADMAP_2026 §3 Phase 4.

## Dependency overview

```
WP01 ──┬─> WP02 ──┬─> WP03 ──> WP04 ──> WP05
       │          │             │
       │          └─> WP07      └─> WP06 ──> WP12
       │                                     ▲
       ├─> WP11 (gates all paid features) ───┘
       ├─> WP08, WP09  (build on WP03/WP05)
       ├─> WP10 (builds on WP03/WP05/WP02)
       ├─> WP13 (consumes all domains)
       ├─> WP14 (frontend for all UIs)
       ├─> WP15 (public surface of WP10)
       └─> WP16 (cross-cutting, all WPs)
```

## Work Package template

Every WP follows the same structure:

- **Objective** — the business outcome.
- **Scope** — what is in / out.
- **Key deliverables** — shippable artifacts.
- **Key components** — concrete files/modules implementing it.
- **Acceptance criteria** — how "done" is verified.
- **Dependencies & related ADRs** — upstream WPs and decisions.

## Status legend

`✅ Delivered` · `🔄 Iterating` · `🧪 Hardening` · `📐 Planned`

All WPs below are **✅ Delivered** and in production; several are **🔄 Iterating**
as the product expands.

---

_Last updated: 2026-06-30 · Documentation version 1.1_
