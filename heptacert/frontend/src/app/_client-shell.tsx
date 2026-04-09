"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Plus } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { I18nProvider, LanguageToggle, useT, useI18n } from "@/lib/i18n";
import {
  PUBLIC_MEMBER_TOKEN_EVENT,
  clearPublicMemberToken,
  getPublicMemberMe,
  getPublicMemberSubscription,
  getPublicMemberToken,
} from "@/lib/api";
import { Sparkles, Crown } from "lucide-react";

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
  const [subscription, setSubscription] = useState<{ plan_id: string | null; active: boolean } | null>(null);

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
        if (mounted) setSubscription(null);
        return;
      }

      try {
        const data = await getPublicMemberMe();
        if (mounted) setMember(data);
        
        // Also load subscription
        try {
          const sub = await getPublicMemberSubscription();
          if (mounted) setSubscription(sub);
        } catch {
          if (mounted) setSubscription({ plan_id: "free", active: false });
        }
      } catch {
        clearPublicMemberToken();
        if (mounted) setMember(null);
        if (mounted) setSubscription(null);
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
    if (!host) return true;
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
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800"
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo Section */}
        <Link href="/" className="flex items-center group shrink-0">
          {brandLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={brandLogo} 
              alt="brand" 
              className="h-8 w-auto max-w-[160px] object-contain group-hover:opacity-80 transition-opacity" 
            />
          ) : isWhiteLabel && orgName ? (
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              {orgName}
            </span>
          ) : (
            <Image
              src="/logo.png"
              alt="HeptaCert"
              width={140}
              height={40}
              unoptimized
              priority
              className="h-8 w-auto object-contain group-hover:opacity-80 transition-opacity"
            />
          )}
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1 flex-1 px-8 justify-center">
          {links.map((l) => (
            <Link 
              key={l.href}
              href={l.href} 
              className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800/50 rounded-md transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          <LanguageToggle />
          
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1" />

          {member ? (
            <div className="flex items-center gap-4">
              <Link
                href="/post/create"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-gray-100 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                {lang === "tr" ? "Gönderi" : "Post"}
              </Link>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">
                    {memberName}
                  </p>
                  {subscription && subscription.plan_id && subscription.plan_id !== "free" && (
                    <Link
                      href="/community/settings/subscription"
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      {subscription.plan_id === "pro" && <Sparkles className="h-3 w-3" />}
                      {subscription.plan_id === "enterprise" && <Crown className="h-3 w-3" />}
                      {lang === "tr"
                        ? subscription.plan_id === "pro"
                          ? "Pro"
                          : "Enterprise"
                        : subscription.plan_id === "pro"
                          ? "Pro"
                          : "Enterprise"}
                    </Link>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  {logoutLabel}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link 
                href="/login" 
                className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                {t("nav_login")}
              </Link>

              {!isWhiteLabel && (
                <Link
                  href="/register?mode=organizer"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-gray-100 transition-colors shadow-sm"
                >
                  {t("nav_start_free")}
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setOpen(!open)} 
          className="lg:hidden p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {links.map((l) => (
                <Link 
                  key={l.href}
                  href={l.href} 
                  onClick={() => setOpen(false)} 
                  className="block px-3 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center justify-between mb-4 px-3">
                <span className="text-sm font-medium text-gray-500">Dil Seçimi</span>
                <LanguageToggle />
              </div>

              {member ? (
                <div className="space-y-3">
                  <Link
                    href="/community/settings/subscription"
                    className="block px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{memberName}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {subscription && subscription.plan_id && subscription.plan_id !== "free" ? (
                        <>
                          {subscription.plan_id === "pro" && <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" />}
                          {subscription.plan_id === "enterprise" && <Crown className="h-3 w-3 text-amber-600 dark:text-amber-400" />}
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            {subscription.plan_id === "pro" ? "Pro" : "Enterprise"} {lang === "tr" ? "Üye" : "Member"}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {lang === "tr" ? "Ücretsiz Üye" : "Free Member"}
                        </span>
                      )}
                    </div>
                  </Link>
                  <Link
                    href="/post/create"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    {lang === "tr" ? "Yeni Gönderi Oluştur" : "Create New Post"}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {logoutLabel}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Link 
                    href="/login" 
                    onClick={() => setOpen(false)}
                    className="flex w-full justify-center px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {t("nav_login")}
                  </Link>

                  {!isWhiteLabel && (
                    <Link
                      href="/register?mode=organizer"
                      onClick={() => setOpen(false)}
                      className="flex w-full justify-center px-4 py-2.5 text-sm font-medium text-white rounded-lg bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      {t("nav_start_free")}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="min-h-screen w-full bg-[#F9FAFB] dark:bg-gray-950"
        >
          {children}
        </motion.main>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <HtmlLangSync />
      {/* DÜZELTME BURADA: Navbar artık max-w-7xl içine hapsedilmedi. 
        Ana wrapper tam genişlik alıyor, içeriği flex-col ile diziyor.
      */}
      <div className="min-h-screen flex flex-col bg-[#F9FAFB] dark:bg-gray-950 font-sans text-slate-900">
        <Navbar />
        
        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex-grow w-full"
        >
          {children}
        </motion.main>
      </div>
    </I18nProvider>
  );
}