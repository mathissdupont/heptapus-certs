// Picks the entry for the active language from a per-language map, falling back to
// English. This is the stopgap for legacy per-language objects indexed directly by the
// language code (WP32 Phase 2): a bare index returns `undefined` — and usually crashes —
// for any language the object does not list. Those maps move into the translation
// catalog in WP32 Phase 7.
//
// Deliberately a plain module (no "use client"), so server code can use it too.
export type LangMap<T> = { tr: T; en: T } & Partial<Record<string, T>>;

export function pickLang<T>(map: LangMap<T>, lang: string): T;
export function pickLang<T>(map: LangMap<T> | null | undefined, lang: string): T | undefined;
export function pickLang<T>(map: LangMap<T> | null | undefined, lang: string): T | undefined {
  if (!map) return undefined;
  return map[lang] ?? map.en;
}
