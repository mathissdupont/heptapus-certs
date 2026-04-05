"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { I18nProvider, LanguageToggle, useT, useI18n } from "@/lib/i18n";
import {
  PUBLIC_MEMBER_TOKEN_EVENT,
  clearPublicMemberToken,
  getPublicMemberMe,
  getPublicMemberToken,
} from "@/lib/api";

const HEPTACERT_PRIMARY_HOSTS = new Set([
  "heptacert.com",
  "www.heptacert.com",
  "cert.heptapusgroup.com",
  "localhost",
  "127.0.0.1",
]);

function HtmlLangSync() {
  const { lang } = useI18n();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const t = useT();
  const { lang } = useI18n();

  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [settings, setSettings] = useState<{ hide_heptacert_home?: boolean } | null>(null);
  const [host, setHost] = useState<string>("");
  const [member, setMember] = useState<{ display_name: string; email: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHost(window.location.hostname);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch("/api/branding")
      .then((res) => res.json())
      .then((j) => {
        if (!mounted) return;
        setBrandLogo(j.brand_logo || null);
        setBrandColor(j.brand_color || null);
        setOrgName(j.org_name || null);
        setSettings(j.settings || null);
        if (j.brand_color) {
          document.documentElement.style.setProperty("--site-brand-color", j.brand_color);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function syncMember() {
      if (!getPublicMemberToken()) {
        if (mounted) setMember(null);
        return;
      }

      try {
        const data = await getPublicMemberMe();
        if (mounted) setMember(data);
      } catch {
        clearPublicMemberToken();
        if (mounted) setMember(null);
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key && event.key !== "heptacert_public_member_token") return;
      void syncMember();
    }

    function handleTokenChange() {
      void syncMember();
    }

    void syncMember();
    window.addEventListener("storage", handleStorage);
    window.addEventListener(PUBLIC_MEMBER_TOKEN_EVENT, handleTokenChange);

    return () => {
      mounted = false;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(PUBLIC_MEMBER_TOKEN_EVENT, handleTokenChange);
    };
  }, []);

  const isHeptaCertHost = useMemo(() => {
    if (!host) return true; // Sayfa yüklenmeden layout shift olmaması için default true
    return HEPTACERT_PRIMARY_HOSTS.has(host);
  }, [host]);

  const isWhiteLabel = useMemo(() => {
    if (settings?.hide_heptacert_home) return true;
    if (!host) return false;
    return !isHeptaCertHost;
  }, [host, isHeptaCertHost, settings]);

  const eventsLabel = lang === "tr" ? "Etkinlikler" : "Events";
  const myEventsLabel = lang === "tr" ? "Katildiklarim" : "My Events";
  const logoutLabel = lang === "tr" ? "Cikis Yap" : "Sign Out";

  const links = isWhiteLabel
    ? [
        { href: "/verify", label: t("nav_verify") },
      ]
    : [
        { href: "/events", label: eventsLabel },
        ...(member ? [{ href: "/my-events", label: myEventsLabel }] : []),
        { href: "/#features", label: t("nav_features") },
        { href: "/pricing", label: t("nav_pricing") },
        { href: "/verify", label: t("nav_verify") },
      ];

  const memberName = member?.display_name || member?.email || "";

  function handleLogout() {
    clearPublicMemberToken();
    setMember(null);
    setOpen(false);
  }

  return (
    <motion.header
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-[3px] z-40 mb-8 mt-4"
    >
      <div className="relative flex items-center justify-between rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-[0_4px_28px_rgba(0,0,0,0.09)] dark:shadow-[0_4px_28px_rgba(0,0,0,0.3)] backdrop-blur-md overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full w-1 rounded-l-2xl hidden md:block"
          style={{
            background: brandColor ? `${brandColor}` : undefined,
          }}
        />
        <Link href="/" className="flex items-center group pl-4 md:pl-5 pr-3 py-3">
          {brandLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brandLogo} alt="brand" className="h-14 w-auto group-hover:opacity-85 transition-opacity drop-shadow-sm" />
          ) : isWhiteLabel && orgName ? (
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight ml-2">{orgName}</span>
          ) : (
            <Image
              src="/logo.png"
              alt="HeptaCert"
              width={220}
              height={60}
              unoptimized
              priority
              className="h-14 w-auto group-hover:opacity-85 transition-opacity drop-shadow-sm"
            />
          )}
          {orgName && !isWhiteLabel && (
            <span className="ml-3 hidden md:inline-block text-lg font-semibold text-gray-700 dark:text-gray-200 brand-text">{orgName}</span>
          )}
        </Link>
        <nav className="hidden md:flex items-center gap-0.5 flex-1 px-2 justify-end mr-4">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2 pr-4 py-3">
          <LanguageToggle />
          {member ? (
            <>
              <div className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                {memberName}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:text-gray-900"
              >
                {logoutLabel}
              </button>
            </>
          ) : (
            <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
              {t("nav_login")}
            </Link>
          )}

          {!isWhiteLabel && !member && (
            <Link
              href="/register?mode=organizer"
              className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-brand hover:opacity-90 transition-opacity"
              style={{
                background: `linear-gradient(90deg, ${brandColor || "#7c3aed"}, #7c3aed)`,
              }}
            >
              {t("nav_start_free")}
            </Link>
          )}
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden rounded-lg p-2.5 mr-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-lifted md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">{l.label}</Link>
            ))}
            <hr className="my-2 border-gray-100 dark:border-gray-800" />
            <div className="px-3 py-2 flex items-center gap-2">
              <LanguageToggle />
            </div>
            {member ? (
              <>
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  {memberName}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {logoutLabel}
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                {t("nav_login")}
              </Link>
            )}

            {!isWhiteLabel && !member && (
              <Link
                href="/register?mode=organizer"
                onClick={() => setOpen(false)}
                className="mt-1 inline-flex w-full items-center justify-center rounded-xl py-3 text-sm font-bold text-white shadow-brand"
                style={{
                  background: `linear-gradient(90deg, ${brandColor || "#7c3aed"}, #7c3aed)`,
                }}
              >
                {t("nav_start_free")}
              </Link>
            )}
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
}

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAdmin = pathname?.startsWith("/admin");

  const hideNavbar =
    pathname === "/verify" ||
    pathname?.startsWith("/verify/") ||
    pathname?.startsWith("/checkout") ||
    pathname?.startsWith("/attend/") ||
    pathname?.match(/^\/events\/\d+\/register$/) !== null;

  if (isAdmin) {
    return (
      <I18nProvider>
        <HtmlLangSync />
        {children}
      </I18nProvider>
    );
  }

  if (hideNavbar) {
    return (
      <I18nProvider>
        <HtmlLangSync />
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="min-h-screen w-full"
        >
          {children}
        </motion.main>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <HtmlLangSync />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 min-h-screen flex flex-col">
        <Navbar />
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex-grow w-full"
        >
          {children}
        </motion.main>
      </div>
    </I18nProvider>
  );
}
