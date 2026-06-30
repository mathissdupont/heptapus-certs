import { defineRouting } from "next-intl/routing";

// Public-surface locales (ADR-0021). Tier 0 (tr/en) + Tier 1 (de/fr/es/nl/ru/it/pt).
// Adding a locale here + a messages/<locale>.json file is all that a new public
// language needs. The authenticated app keeps the custom i18n (src/lib/i18n.tsx).
export const locales = ["tr", "en", "de", "fr", "es", "nl", "ru", "it", "pt"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "tr";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Always prefix so every locale has a distinct, crawlable URL (/tr/.., /de/..),
  // which is what makes per-locale SEO + hreflang work.
  localePrefix: "always",
  // Don't auto-redirect by Accept-Language at the edge; the landing locale is handled
  // explicitly and the custom-app side keeps its own detection.
  localeDetection: false,
});
