# WP15 — SEO, GEO & Public Web Presence

**Phase:** 4 — Experience, growth surface & quality · **Status:** ✅ Delivered · 🔄 Iterating · **Related ADRs:** [0015](../adr/0015-seo-geo-strategy.md)

## Objective
Make HeptaCert discoverable and correctly understood by both classic search engines
and generative AI engines (GEO), so the platform, its events, and its certificates
surface and are cited accurately.

## Scope
**In:** server-rendered metadata; canonical URLs and hreflang; Open Graph/Twitter
cards; structured data (JSON-LD: SoftwareApplication, Organization, WebSite, Course,
FAQPage, AggregateOffer); `sitemap.xml`; `robots.txt` with explicit AI-crawler
rules; `llms.txt` and `llms-full.txt`.
**Out:** the public pages' product logic (WP10).

## Key deliverables
- Root metadata + JSON-LD graph (org, app, website search action, FAQ, offers).
- Dynamic metadata for marketplace events and certificate verification pages.
- `sitemap.ts` (static + dynamic event routes) and `robots.ts`.
- Explicit allow rules for major AI crawlers (GPTBot, ClaudeBot, PerplexityBot,
  Google-Extended, and more).
- `llms.txt` (concise) and `llms-full.txt` (full reference: plans, integrations, API, MCP).

## Key components
- `heptacert/frontend/src/app/layout.tsx` — metadata + JSON-LD graph.
- `heptacert/frontend/src/app/robots.ts`, `sitemap.ts`.
- `heptacert/frontend/public/llms.txt`, `llms-full.txt`, `manifest.json`.
- Dynamic metadata: `app/marketplace/[event_id]/page.tsx`, `app/verify/[uuid]/page.tsx`.

## Acceptance criteria
- Public pages emit valid canonical, OG/Twitter, and JSON-LD without errors.
- `robots.txt` exposes the sitemap and explicitly permits AI crawlers.
- `llms.txt`/`llms-full.txt` are reachable and accurately describe the platform.
- Structured data validates (Organization, SoftwareApplication, FAQPage, Course).

## Dependencies & related ADRs
Upstream: WP10, WP14. Downstream: growth. See ADR-0015.
