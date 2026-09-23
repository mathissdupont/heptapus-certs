"use client";

import Image from "next/image";
import NextLink from "next/link";
import { useTranslations } from "next-intl";

import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { LocalizedCookieConsent } from "@/components/CookieConsent/CookieConsent";
import { Link } from "@/i18n/navigation";

export default function PublicLocaleShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-content-primary">
      <header className="sticky top-0 z-50 border-b border-outline-subtle bg-raised/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8 lg:px-10" aria-label="HeptaCert">
          <Link href="/" className="shrink-0" aria-label="HeptaCert">
            <Image src="/logo.png" alt="HeptaCert" width={140} height={40} priority className="h-8 w-auto object-contain" />
          </Link>
          <div className="hidden items-center gap-1 xl:flex">
            <Link href="/events" className="rounded-lg px-3 py-2 text-sm font-semibold text-content-muted transition hover:bg-sunken hover:text-content-primary">{t("nav_events")}</Link>
            <Link href="/organizations" className="rounded-lg px-3 py-2 text-sm font-semibold text-content-muted transition hover:bg-sunken hover:text-content-primary">{t("nav_organizations")}</Link>
            <Link href="/discover" className="rounded-lg px-3 py-2 text-sm font-semibold text-content-muted transition hover:bg-sunken hover:text-content-primary">{t("nav_discover")}</Link>
            <Link href="/#features" className="rounded-lg px-3 py-2 text-sm font-semibold text-content-muted transition hover:bg-sunken hover:text-content-primary">{t("nav_features")}</Link>
            <NextLink href="/pricing" className="rounded-lg px-3 py-2 text-sm font-semibold text-content-muted transition hover:bg-sunken hover:text-content-primary">{t("nav_pricing")}</NextLink>
            <NextLink href="/verify" className="rounded-lg px-3 py-2 text-sm font-semibold text-content-muted transition hover:bg-sunken hover:text-content-primary">{t("nav_verify")}</NextLink>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-outline-subtle bg-sunken px-2 text-xs font-bold text-content-secondary" />
            <NextLink href="/login" className="btn-ghost hidden text-sm sm:inline-flex">{t("nav_login")}</NextLink>
            <NextLink href="/register?mode=organizer" className="btn-primary hidden text-sm lg:inline-flex">{t("nav_start_free")}</NextLink>
          </div>
        </nav>
        <nav className="flex items-center justify-center gap-1 overflow-x-auto border-t border-outline-subtle px-2 py-1 xl:hidden" aria-label={t("public_hub_title")}>
          <Link href="/events" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-content-muted hover:bg-sunken hover:text-content-primary">{t("nav_events")}</Link>
          <Link href="/organizations" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-content-muted hover:bg-sunken hover:text-content-primary">{t("nav_organizations")}</Link>
          <Link href="/discover" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-content-muted hover:bg-sunken hover:text-content-primary">{t("nav_discover")}</Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-outline-subtle bg-raised py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 sm:px-8 md:flex-row lg:px-10">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="HeptaCert" width={120} height={32} className="h-6 w-auto" />
            <span className="text-xs text-content-faint">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-content-muted">
            <NextLink href="/verify" className="hover:text-content-primary">{t("home_legal_verify")}</NextLink>
            <NextLink href="/pricing" className="hover:text-content-primary">{t("home_legal_pricing")}</NextLink>
            <NextLink href="/iletisim" className="hover:text-content-primary">{t("home_legal_contact")}</NextLink>
            <NextLink href="/gizlilik" className="hover:text-content-primary">{t("home_legal_privacy")}</NextLink>
            <NextLink href="/kullanim-kosullari" className="hover:text-content-primary">{t("heptapus_terms")}</NextLink>
          </div>
        </div>
      </footer>
      <LocalizedCookieConsent />
    </div>
  );
}
