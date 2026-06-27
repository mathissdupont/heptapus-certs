# ADR-0014 — Token-Based Design System

**Status:** Accepted · **Date:** 2026-06-27

## Context
The app spans admin, public, and community surfaces built by iterative feature work.
Without a shared system, pages drift into inconsistent colors, spacing, and
components (e.g. hard-coded hex values, ad-hoc badges, bespoke headers).

## Decision
Adopt a **token-based design system**: a Tailwind config defining the `surface`
palette, spacing, shadows, and typography, plus a component layer in `globals.css`
(`.card`, `.btn-*`, `.badge-*`, banners, `.section-label`) and shared React
components (`PageHeader`, `StatCard`, `EmptyState`, field/modal primitives). Pages
compose from these; raw hex and undefined utilities are disallowed. Motion uses a
consistent Framer Motion language.

## Consequences
- New screens are consistent by default and faster to build.
- Theming, white-label branding, and dark-mode hooks live in one place.
- Consistency regressions are easy to spot and fix (e.g. Integrations/Sessions passes).
- Trade-off: contributors must learn the tokens/components rather than inline styling.
