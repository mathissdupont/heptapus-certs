"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Native display names for the public (next-intl) locales. These are deliberately not
// translated: a language is always listed in its own name.
const LABELS: Record<string, string> = {
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

// Language switcher for locale-routed public pages. Switches locale while keeping the
// user on the same path (next-intl navigation rewrites the /xx/ prefix).
export default function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();

  return (
    <label
      className={
        className ??
        "inline-flex items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 px-2 py-1.5 text-xs font-bold text-surface-700 shadow-soft"
      }
    >
      <span className="sr-only">{t("language_switcher_label")}</span>
      <span className="rounded bg-surface-100 px-1.5 py-0.5 text-11 font-extrabold uppercase tracking-[0.18em] text-surface-700">
        {locale}
      </span>
      <select
        value={locale}
        onChange={(e) => router.replace(pathname, { locale: e.target.value })}
        className="bg-transparent pr-1 font-bold text-surface-700 outline-none"
        aria-label={t("language_switcher_label")}
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {LABELS[l] ?? l}
          </option>
        ))}
      </select>
    </label>
  );
}
