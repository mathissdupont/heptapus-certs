import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// Single source of truth: next-intl serves the SAME flat key catalogs the custom app
// i18n uses (src/locales/<locale>.ts), so a string is translated once and reused on both
// public (next-intl) and authenticated (custom) surfaces. Flat keys like "nav_pricing"
// are used directly via useTranslations() — no namespaces. Missing catalog -> English.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  let messages: Record<string, string>;
  try {
    const mod = (await import(`../locales/${locale}`)) as Record<string, Record<string, string>>;
    messages = mod[locale];
  } catch {
    const fallback = (await import(`../locales/en`)) as Record<string, Record<string, string>>;
    messages = fallback.en;
  }

  return { locale, messages };
});
