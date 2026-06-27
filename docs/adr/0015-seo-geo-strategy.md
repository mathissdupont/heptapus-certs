# ADR-0015 — SEO + GEO (AI Discoverability) Strategy

**Status:** Accepted · **Date:** 2026-06-27

## Context
Discovery increasingly happens through both classic search engines and generative AI
engines (ChatGPT, Claude, Perplexity, AI Overviews). The platform must be indexable
*and* accurately understood and citable by LLMs (Generative Engine Optimization).

## Decision
Implement a dual strategy in the Next.js layer:
- **SEO:** server-rendered metadata, canonical URLs + hreflang, Open Graph/Twitter
  cards, `sitemap.xml` (static + dynamic events), dynamic metadata for event and
  verification pages.
- **GEO:** a rich JSON-LD graph (SoftwareApplication, Organization with contact,
  WebSite + SearchAction, FAQPage, AggregateOffer, Course), explicit `robots.txt`
  allow rules for major AI crawlers, and `llms.txt` + `llms-full.txt` describing the
  product, plans, integrations, API, and MCP for AI systems.

## Consequences
- Public pages are both search-indexable and AI-citable with accurate facts.
- AI engines can answer "what is HeptaCert / how much / what integrations" correctly.
- Trade-off: structured data and the llms files must be kept truthful and in sync with
  the product as it evolves (owned by WP15).
