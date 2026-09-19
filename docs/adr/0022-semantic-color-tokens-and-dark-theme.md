# ADR-0022 — Semantic Color Tokens and a Real Dark Theme

**Status:** Accepted · **Date:** 2026-09-19 · **Refines:** [0014](0014-design-system-tailwind-tokens.md) · **Related:** [WP32](../work-packages/WP32-ui-overhaul-landing-onboarding-theming.md)

## Context

ADR-0014 established a token-based design system and noted that "theming, white-label
branding, and dark-mode hooks live in one place." In practice dark mode was never
delivered and is now actively suppressed: `_theme-initializer.tsx` writes `light` into
`localStorage` and strips the `.dark` class on every page load, `ThemeToggle.tsx`
returns `null`, and the otherwise-correct `lib/theme.ts` is unreachable. 158 `dark:`
utilities across 8 files are dead code.

The blocker is not the toggle. It is that the palette is expressed as *literal* scales
rather than *roles*. A measurement on 2026-09-19 found ≈3088 token-based color
utilities (`surface-*`) but ≈3350 off-token ones (`bg-white` 983, `text-gray-*` 1063,
`border-gray-*` 476, `bg-gray-*` 306, `text-slate-*` 311, `bg-slate-*` 183,
`border-slate-*` 148). A literal scale cannot invert: `bg-white` means white in every
theme. So adding `.dark` variants utility-by-utility would mean ~3350 edits with no
structural improvement, and any new screen would immediately reintroduce the problem.

## Decision

Introduce a **semantic color layer** between Tailwind and the components, and define
the dark theme by redefining that layer — not by adding `dark:` variants at call sites.

- Declare CSS variables for **roles**, not shades, on bare `:root` (complete light
  palette): canvas/raised/sunken surfaces, primary/muted/inverted content, subtle/strong
  borders, accent, and success/warning/danger pairs.
- Redefine **only those variables** under `.dark`. Tailwind is already
  `darkMode: "class"`; `lib/theme.ts` already resolves `light | dark | system`.
- Re-express the `globals.css` component layer (`.card`, `.btn-*`, `.input`, `.badge-*`,
  banners, `.table-*`, `.sidebar-item`, `.empty-state`) in terms of the roles, and map
  the Tailwind `surface-*` scale onto them, so every surface already composing from the
  design system themes itself with no per-page edits.
- Keep runtime white-label branding authoritative: `--site-brand-color`, injected from
  `/branding`, continues to override the accent role in both themes.
- Treat off-token utilities as a migration backlog with a CI ratchet, and forbid new
  ones in migrated paths.
- Roll out **by complete surface**, with the toggle hidden until every surface is done,
  so the app is never visibly half-themed.

## Consequences

- Dark mode becomes a property of the design system rather than a per-page effort; the
  ~3088 already-tokenized utilities convert for free.
- The remaining ≈3350 off-token utilities become a measurable, ratcheted backlog instead
  of an unbounded one, and the same guard prevents regrowth.
- Component authors gain a vocabulary of roles, which is what ADR-0014 intended;
  "which grey is this" stops being a per-screen decision.
- Trade-off: one more indirection (utility → role → value), and contributors must learn
  the roles. A surface that bypasses the component layer still needs manual migration.
- Trade-off: until the rollout completes, the theme toggle stays hidden, so the work
  delivers no user-visible value until the final wave lands. This is deliberate — the
  alternative is shipping broken-looking screens.
- If this ADR is rejected, the honest alternative is to delete `lib/theme.ts`,
  `ThemeToggle.tsx`, and the 158 orphan `dark:` utilities, and state that the product is
  light-only.
