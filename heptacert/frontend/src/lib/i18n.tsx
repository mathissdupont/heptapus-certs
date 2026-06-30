"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { tr } from "@/locales/tr";
import { en } from "@/locales/en";
import type { TranslationKey } from "@/locales/tr";

// This custom i18n powers the AUTHENTICATED app (admin/portal), where many components
// also carry inline `{ tr, en }[lang]` copy maps. Widening this union can't be done
// safely without touching every such component, so it stays tr/en by design.
// Additional public-facing languages (de/fr/es/...) are served by next-intl on the
// locale-routed public surfaces instead — see ADR-0021 and src/i18n/*.
export type Lang = "tr" | "en";

const DEFAULT_LANG: Lang = "tr";   // ultimate fallback / first-load default
const FALLBACK_LANG: Lang = "en";  // tried before DEFAULT_LANG for missing keys

const LANG_STORAGE_KEY = "heptacert-lang";

// A locale may be incomplete — Partial keeps new languages cheap; missing keys fall back.
const LOCALES: Record<Lang, Partial<Record<TranslationKey, string>>> = { tr, en };

// Native display names shown in the language switcher.
const LANG_LABELS: Record<Lang, string> = { tr: "Türkçe", en: "English" };

const SUPPORTED_LANGS = Object.keys(LOCALES) as Lang[];

function isSupported(value: string | null | undefined): value is Lang {
  return !!value && (SUPPORTED_LANGS as string[]).includes(value);
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  supportedLangs: Lang[];
  langLabels: Record<Lang, string>;
}

const I18nContext = createContext<I18nContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => key,
  supportedLangs: SUPPORTED_LANGS,
  langLabels: LANG_LABELS,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (isSupported(stored)) {
      setLangState(stored);
      return;
    }
    // First visit (no saved choice): pick the first browser language we support, by its
    // base subtag (e.g. "en-US" -> "en"). Falls through to DEFAULT_LANG otherwise.
    const browserLangs = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const candidate of browserLangs) {
      const base = (candidate || "").toLowerCase().split("-")[0];
      if (isSupported(base)) {
        setLangState(base);
        return;
      }
    }
  }, []);

  const setLang = useCallback((nextLang: Lang) => {
    setLangState(nextLang);
    localStorage.setItem(LANG_STORAGE_KEY, nextLang);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>): string => {
      // Resolution order: active language -> FALLBACK_LANG -> DEFAULT_LANG -> raw key.
      let str: string =
        LOCALES[lang]?.[key] ??
        LOCALES[FALLBACK_LANG]?.[key] ??
        LOCALES[DEFAULT_LANG]?.[key] ??
        key;
      if (vars) {
        Object.entries(vars).forEach(([name, value]) => {
          str = str.replace(`{${name}}`, String(value));
        });
      }
      return str;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t, supportedLangs: SUPPORTED_LANGS, langLabels: LANG_LABELS }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  return useContext(I18nContext).t;
}

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, supportedLangs, langLabels } = useI18n();

  // Two languages: keep the original one-tap toggle. Three or more: a compact dropdown.
  if (supportedLangs.length <= 2) {
    const nextLang: Lang = supportedLangs.find((l) => l !== lang) ?? lang;
    return (
      <button
        type="button"
        onClick={() => setLang(nextLang)}
        title={langLabels[nextLang]}
        className={
          className ??
          "inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
        }
        aria-label={langLabels[nextLang]}
      >
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-11 font-extrabold tracking-[0.18em] text-slate-700">
          {lang.toUpperCase()}
        </span>
        <span>{langLabels[nextLang]}</span>
      </button>
    );
  }

  return (
    <label
      className={
        className ??
        "inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-bold text-gray-700 shadow-sm"
      }
    >
      <span className="sr-only">Language</span>
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-11 font-extrabold tracking-[0.18em] text-slate-700">
        {lang.toUpperCase()}
      </span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="bg-transparent pr-1 font-bold text-gray-700 outline-none"
        aria-label="Select language"
      >
        {supportedLangs.map((l) => (
          <option key={l} value={l}>
            {langLabels[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
