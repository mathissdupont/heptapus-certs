import { defineRouting } from "next-intl/routing";

// Public-surface locales (ADR-0021). Only locales that have a real catalog
// (src/locales/<locale>.ts) are enabled, so we never expose an untranslated /xx/ URL
// (bad for SEO/duplicate content). Tier-1 targets de/fr/es/nl/ru/it/pt are added here
// one by one as their catalog lands. The authenticated app keeps its own custom i18n.
export const locales = ["tr", "en", "de"] as const;
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
