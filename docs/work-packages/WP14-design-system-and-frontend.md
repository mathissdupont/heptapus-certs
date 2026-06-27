# WP14 — Design System & Frontend UX

**Phase:** 4 — Experience, growth surface & quality · **Status:** ✅ Delivered · 🔄 Iterating · **Related ADRs:** [0003](../adr/0003-nextjs-frontend.md), [0014](../adr/0014-design-system-tailwind-tokens.md)

## Objective
Deliver a consistent, professional, accessible UI across admin, public, and
community surfaces from a single token-based design system and a shared component
library — so every screen looks and behaves like one product.

## Scope
**In:** Tailwind design tokens (surface palette, spacing, shadows, typography);
shared component layer (`.card`, `.btn-*`, `.badge-*`, banners, `.section-label`);
reusable React components (PageHeader, StatCard, EmptyState, fields, modals);
i18n (tr/en); theming; white-label branding; Framer Motion interaction language.
**Out:** per-domain page logic (their own WPs).

## Key deliverables
- `tailwind.config.ts` + `globals.css` design tokens and component classes.
- Shared admin components: `PageHeader`, `StatCard`, `EmptyState`, `DateField`,
  `TimeField`, `FilterActionBar`, `ConfirmModal`, `EventAdminNav`.
- Consistent page layout pattern and motion conventions.
- i18n provider with Turkish/English; white-label branding (logo, color, custom domain).
- Ongoing consistency passes (e.g. Integrations and Sessions pages aligned to the system).

## Key components
- `heptacert/frontend/tailwind.config.ts`, `heptacert/frontend/src/app/globals.css`.
- `heptacert/frontend/src/components/Admin/` — shared components.
- `heptacert/frontend/src/lib/i18n.ts`, `theme.ts`, `whiteLabel.ts`.
- `heptacert/frontend/src/app/_client-shell.tsx`, `_theme-initializer.tsx`.

## Acceptance criteria
- New pages compose from shared tokens/components without bespoke colors.
- No hard-coded hex colors or undefined utility classes in product pages.
- The UI renders correctly in tr/en and under white-label branding.
- TypeScript build is clean across the frontend.

## Dependencies & related ADRs
Upstream: WP01. Downstream: every UI-bearing WP. See ADR-0003, ADR-0014.
