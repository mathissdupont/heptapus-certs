"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Native display names for the public (next-intl) locales.
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

  return (
    <label
      className={
        className ??
        "inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-bold text-gray-700 shadow-sm"
      }
    >
      <span className="sr-only">Language</span>
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-700">
        {locale}
      </span>
      <select
        value={locale}
        onChange={(e) => router.replace(pathname, { locale: e.target.value })}
        className="bg-transparent pr-1 font-bold text-gray-700 outline-none"
        aria-label="Select language"
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
