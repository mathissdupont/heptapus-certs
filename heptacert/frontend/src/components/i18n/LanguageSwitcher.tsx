"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import LanguageMenu from "@/components/i18n/LanguageMenu";

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
export default function LanguageSwitcher({
  className,
  compactOnMobile,
}: {
  className?: string;
  compactOnMobile?: boolean;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();

  return (
    <LanguageMenu
      value={locale}
      options={routing.locales}
      labels={LABELS}
      label={t("language_switcher_label")}
      onChange={(next) => router.replace(pathname, { locale: next })}
      className={className}
      compactOnMobile={compactOnMobile}
    />
  );
}
