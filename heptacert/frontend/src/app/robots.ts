import type { MetadataRoute } from "next";

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "https://heptacert.com/api";
const BASE_URL =
  process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || apiBase.replace(/\/api$/, "");

// Public, indexable surface — kept in one place so every crawler rule stays in sync.
const ALLOW = [
  "/",
  "/discover",
  "/marketplace",
  "/developers",
  "/learning-paths",
  "/pricing/business",
  "/verify",
  "/register",
  "/login",
  "/events",
  "/organizations",
  "/iletisim",
  "/gizlilik",
  "/kvkk",
  "/iade",
  "/mesafeli-satis",
  "/llms.txt",
  "/llms-full.txt",
];

const DISALLOW = [
  "/admin/",
  "/checkout/",
  "/attend/",
  "/public/forms/",
  "/events/*/register",
  "/events/*/status",
  "/events/*/survey",
  "/events/*/verify-email",
  "/api/",
];

// AI / answer-engine crawlers (GEO). Explicitly allowed on the public surface so
// HeptaCert is discoverable and citable by generative engines, not just classic search.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "Meta-ExternalAgent",
  "cohere-ai",
  "DuckAssistBot",
  "CCBot",
  "YouBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ALLOW, disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: ALLOW, disallow: DISALLOW })),
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
