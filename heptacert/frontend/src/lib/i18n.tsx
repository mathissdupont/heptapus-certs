"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { tr } from "@/locales/tr";
import { en } from "@/locales/en";
import type { TranslationKey } from "@/locales/tr";

export type Lang = "tr" | "en";

const LANG_STORAGE_KEY = "heptacert-lang";

const translations: Record<Lang, Record<TranslationKey, string>> = { tr, en };

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "tr",
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("tr");

  useEffect(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
    if (stored === "en" || stored === "tr") {
      setLangState(stored);
    }
  }, []);

  const setLang = useCallback((nextLang: Lang) => {
    setLangState(nextLang);
    localStorage.setItem(LANG_STORAGE_KEY, nextLang);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>): string => {
      let str: string = translations[lang][key] ?? translations.tr[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([name, value]) => {
          str = str.replace(`{${name}}`, String(value));
        });
      }
      return str;
    },
    [lang]
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  return useContext(I18nContext).t;
}

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const nextLang: Lang = lang === "tr" ? "en" : "tr";

  return (
    <button
      type="button"
      onClick={() => setLang(nextLang)}
      title={lang === "tr" ? "Switch to English" : "Türkçe'ye geç"}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
      }
      aria-label={lang === "tr" ? "Switch to English" : "Switch to Turkish"}
    >
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold tracking-[0.18em] text-slate-700">
        {lang.toUpperCase()}
      </span>
      <span>{lang === "tr" ? "English" : "Türkçe"}</span>
    </button>
  );
}

