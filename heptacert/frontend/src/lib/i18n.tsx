"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { tr } from "@/locales/tr";
import { en } from "@/locales/en";
import { de } from "@/locales/de";
import { fr } from "@/locales/fr";
import { es } from "@/locales/es";
import { it } from "@/locales/it";
import { pt } from "@/locales/pt";
import { nl } from "@/locales/nl";
import { ru } from "@/locales/ru";
import LanguageMenu from "@/components/i18n/LanguageMenu";
import type { AppLocale } from "@/i18n/routing";
import type { TranslationKey } from "@/locales/tr";
export type { TranslationKey } from "@/locales/tr";

// The authenticated app and locale-routed public pages share the same locale union and
// flat catalogs. Legacy inline tr/en copy maps use pickLang() and fall back to English;
// catalog-backed screens render the selected language directly.
export type Lang = AppLocale;

const DEFAULT_LANG: Lang = "tr";   // ultimate fallback / first-load default
const FALLBACK_LANG: Lang = "en";  // tried before DEFAULT_LANG for missing keys

const LANG_STORAGE_KEY = "heptacert-lang";

// A locale may be incomplete — Partial keeps new languages cheap; missing keys fall back.
const LOCALES: Record<Lang, Partial<Record<TranslationKey, string>>> = {
  tr,
  en,
  de,
  fr,
  es,
  it,
  pt,
  nl,
  ru,
};

// Native display names shown in the language switcher.
const LANG_LABELS: Record<Lang, string> = {
  tr: "Türkçe",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  ru: "Русский",
};

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

export type Translator = I18nContextValue["t"];

const I18nContext = createContext<I18nContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => key,
  supportedLangs: SUPPORTED_LANGS,
  langLabels: LANG_LABELS,
});

/** Catalog translator for plain modules and components that cannot use hooks. */
export function translate(
  lang: Lang,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  let str: string =
    LOCALES[lang]?.[key] ??
    LOCALES[FALLBACK_LANG]?.[key] ??
    LOCALES[DEFAULT_LANG]?.[key] ??
    key;
  if (vars) {
    Object.entries(vars).forEach(([name, value]) => {
      str = str.replaceAll(`{${name}}`, String(value));
    });
  }
  return str;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (isSupported(stored)) {
      setLangState(stored);
      return;
    }
    // First visit (no saved choice): pick the first browser language we support, by its
    // base subtag (e.g. en-US -> en). Falls through to DEFAULT_LANG otherwise.
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
    (key: TranslationKey, vars?: Record<string, string | number>): string => translate(lang, key, vars),
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
  const { lang, setLang, supportedLangs, langLabels, t } = useI18n();

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
 "inline-flex items-center gap-2 rounded-lg border border-surface-200 bg-raised px-3 py-1.5 text-xs font-bold text-surface-700 shadow-sm transition-colors hover:bg-surface-50 hover:text-surface-900"
        }
        aria-label={langLabels[nextLang]}
      >
        <span className="rounded bg-surface-100 px-1.5 py-0.5 text-11 font-extrabold tracking-[0.18em] text-surface-700">
          {lang.toUpperCase()}
        </span>
        <span>{langLabels[nextLang]}</span>
      </button>
    );
  }

  return (
    <LanguageMenu
      value={lang}
      options={supportedLangs}
      labels={langLabels}
      label={t("language_switcher_label")}
      onChange={(next) => setLang(next as Lang)}
      className={className}
    />
  );
}
