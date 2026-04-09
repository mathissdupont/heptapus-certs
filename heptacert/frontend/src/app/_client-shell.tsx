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
  const communitiesLabel = lang === "tr" ? "Topluluklar" : "Communities";
  const discoverLabel = lang === "tr" ? "Keşfet" : "Discover";
  const myEventsLabel = lang === "tr" ? "Katıldıklarım" : "My Events";
  const profileLabel = lang === "tr" ? "Profilim" : "My Profile";
  const logoutLabel = lang === "tr" ? "Çıkış Yap" : "Sign Out";

  const links = isWhiteLabel
    ? [
        { href: "/verify", label: t("nav_verify") },
      ]
    : [
        { href: "/events", label: eventsLabel },
        { href: "/organizations", label: communitiesLabel },
        { href: "/discover", label: discoverLabel },
        ...(member ? [{ href: "/my-events", label: myEventsLabel }] : []),
        ...(member ? [{ href: "/profile", label: profileLabel }] : []),
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
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-40 w-full"
    >
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white/95 to-white/90 dark:from-gray-950 dark:via-gray-950/95 dark:to-gray-950/90 border-b border-slate-100/50 dark:border-gray-800/50"></div>
      
      {/* Animated gradient bar at top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"></div>

      <nav className="relative px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo Section */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Link href="/" className="flex items-center group">
              {brandLogo ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={brandLogo} 
                    alt="brand" 
                    className="h-10 w-auto max-w-xs object-contain group-hover:opacity-80 transition-opacity duration-200" 
                  />
                </div>
              ) : isWhiteLabel && orgName ? (
                <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent tracking-tight">
                  {orgName}
                </span>
              ) : (
                <Image
                  src="/logo.png"
                  alt="HeptaCert"
                  width={180}
                  height={50}
                  unoptimized
                  priority
                  className="h-10 w-auto object-contain group-hover:opacity-80 transition-opacity duration-200"
                />
              )}
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 px-8 justify-center">
            {links.map((l) => (
              <motion.div
                key={l.href}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link 
                  href={l.href} 
                  className="relative px-4 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 transition-colors duration-200 hover:text-slate-900 dark:hover:text-white group"
                >
                  {l.label}
                  <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Right Actions */}
          <div className="hidden lg:flex items-center gap-4">
            <LanguageToggle />
            
            {member ? (
              <>
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-3 pl-4 border-l border-slate-100 dark:border-gray-800"
                >
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{memberName}</p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">Logged in</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 dark:text-gray-300 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800/50 transition-colors duration-200"
                  >
                    {logoutLabel}
                  </button>
                </motion.div>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800/50 transition-colors duration-200"
                >
                  {t("nav_login")}
                </Link>

                {!isWhiteLabel && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      href="/register?mode=organizer"
                      className="inline-flex items-center px-6 py-2.5 text-sm font-bold text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700"
                    >
                      {t("nav_start_free")}
                    </Link>
                  </motion.div>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <motion.button 
            onClick={() => setOpen(!open)} 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="lg:hidden rounded-lg p-2.5 text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800/50 transition-colors duration-200"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </motion.button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {open && (
        <motion.div 
          initial={{ opacity: 0, y: -16, height: 0 }} 
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -16, height: 0 }}
          transition={{ duration: 0.3 }}
          className="relative border-t border-slate-100/50 dark:border-gray-800/50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm lg:hidden px-4 sm:px-6 py-4 overflow-hidden"
        >
          <div className="max-w-7xl mx-auto">
            <nav className="flex flex-col gap-2 pb-4">
              {links.map((l) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link 
                    href={l.href} 
                    onClick={() => setOpen(false)} 
                    className="block px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-gray-300 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800/50 transition-colors duration-200"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </nav>

            <div className="border-t border-slate-100 dark:border-gray-800 pt-4 flex items-center gap-3 justify-between mb-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-gray-400">LANGUAGE</span>
              <LanguageToggle />
            </div>

            {member ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <div className="rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-100 dark:border-blue-900/30 px-4 py-3">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">{memberName}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Logged in</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-300 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800/50 transition-colors duration-200"
                >
                  {logoutLabel}
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <Link 
                  href="/login" 
                  onClick={() => setOpen(false)}
                  className="block w-full px-4 py-2.5 text-center text-sm font-medium text-slate-700 dark:text-gray-300 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800/50 transition-colors duration-200"
                >
                  {t("nav_login")}
                </Link>

                {!isWhiteLabel && (
                  <Link
                    href="/register?mode=organizer"
                    onClick={() => setOpen(false)}
                    className="block w-full px-4 py-3 text-center text-sm font-bold text-white rounded-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 shadow-lg transition-all duration-200"
                  >
                    {t("nav_start_free")}
                  </Link>
                )}
              </motion.div>
            )}
          </div>
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
