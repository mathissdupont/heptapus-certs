# ADR-0003 — Next.js (App + Pages) Frontend

**Status:** Accepted · **Date:** 2026-06-27

## Context
The product has three audiences on the web — admin/staff dashboards, public
event/verification pages, and a member community — with different needs: rich
client interactivity for admin, and SEO/SSR for public surfaces.

## Decision
Use **Next.js** with **TypeScript**. Adopt the App Router for new public, SEO-bearing
surfaces (server-rendered metadata, JSON-LD, sitemap/robots) while retaining Pages
Router areas where already established. Centralize API access in a typed client.

## Consequences
- SSR/metadata enables strong SEO/GEO on public pages (ADR-0015).
- One codebase serves admin, public, and community with shared design tokens (ADR-0014).
- White-label branding and i18n (tr/en) are handled at the layout level.
- Trade-off: maintaining two router paradigms during migration adds some complexity.
