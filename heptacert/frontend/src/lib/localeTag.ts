// Maps an app language code to the BCP-47 tag used for date, time and number formatting.
// This is the one place that knows the regional variant for each language: components
// call localeTag(lang) instead of hardcoding "tr-TR" / "en-US", so formatting follows
// the active language for every locale the app supports (WP32 Phase 2, enforced by
// `npm run check:ui`). Add a tag here whenever a locale is added to src/i18n/routing.ts.
const TAGS: Record<string, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
  pt: "pt-PT",
  nl: "nl-NL",
  ru: "ru-RU",
};

/**
 * Returns the formatting tag for a language code. A missing language falls back to the
 * app default (Turkish); a value that is already a region tag, or an unknown code, is
 * passed through for Intl to resolve.
 */
export function localeTag(lang?: string | null): string {
  if (!lang) return TAGS.tr;
  return TAGS[lang] ?? lang;
}
