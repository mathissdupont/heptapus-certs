"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Activity, CalendarDays, Home, Menu, QrCode, Share, Shield, Smartphone, Ticket, X, Plus } from "lucide-react";
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
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const registerServiceWorker = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };
    window.addEventListener("load", registerServiceWorker);
    return () => window.removeEventListener("load", registerServiceWorker);
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
  const discoverLabel = lang === "tr" ? "Merkez" : "Hub";
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
                    href="/profile"
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{memberName}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{lang === "tr" ? "Profil ayarları" : "Profile settings"}</p>
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

function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [iosInstallHelp, setIosInstallHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem("heptacert:pwa-install-dismissed") === "1";
    const userAgent = window.navigator.userAgent || "";
    const isIos = /iphone|ipad|ipod/i.test(userAgent) || (userAgent.includes("Macintosh") && "ontouchend" in document);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as any).standalone);
    if (isStandalone) {
      setVisible(false);
      return;
    }
    const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(userAgent);
    if (isIos && isSafari && !isStandalone && !dismissed) {
      setIosInstallHelp(true);
      setVisible(true);
    }
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event);
      if (!dismissed) setVisible(true);
    };
    const onAppInstalled = () => {
      window.localStorage.setItem("heptacert:pwa-install-dismissed", "1");
      setVisible(false);
      setPromptEvent(null);
      setIosInstallHelp(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (!visible || (!promptEvent && !iosInstallHelp)) return null;

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    try {
      const choice = await promptEvent.userChoice;
      if (choice?.outcome === "accepted" || choice?.outcome === "dismissed") {
        window.localStorage.setItem("heptacert:pwa-install-dismissed", "1");
      }
    } catch {
      window.localStorage.setItem("heptacert:pwa-install-dismissed", "1");
    }
    setVisible(false);
    setPromptEvent(null);
  }

  function dismiss() {
    window.localStorage.setItem("heptacert:pwa-install-dismissed", "1");
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-3 bottom-20 z-[70] rounded-2xl border border-indigo-100 bg-white p-4 shadow-2xl md:bottom-5 md:left-auto md:right-5 md:w-96">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-black text-slate-950">HeptaCert'i ana ekrana ekle</p>
            <button type="button" onClick={dismiss} className="-mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {iosInstallHelp
              ? "iPhone'da Safari paylaş menüsü üzerinden Ana Ekrana Ekle seçeneğini kullan."
              : "Check-in ve bilet kontrolünü uygulama gibi aç."}
          </p>
          {iosInstallHelp && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
              <p className="flex items-center gap-2">
                <Share className="h-4 w-4 text-indigo-600" />
                Safari'de Paylaş'a bas
              </p>
              <p className="mt-1 pl-6">Sonra Ana Ekrana Ekle seç.</p>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            {promptEvent && <button type="button" onClick={install} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">Ekle</button>}
            <button type="button" onClick={dismiss} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Sonra</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminMobileNav() {
  const pathname = usePathname() || "";
  const eventMatch = pathname.match(/^\/admin\/events\/(\d+)/);
  const eventId = eventMatch?.[1];
  const items = eventId
    ? [
        { href: `/admin/events/${eventId}`, label: "Özet", icon: Home },
        { href: `/admin/events/${eventId}/ops`, label: "Canlı", icon: Activity },
        { href: `/admin/events/${eventId}/checkin`, label: "Check-in", icon: QrCode },
        { href: `/admin/events/${eventId}/tickets`, label: "Bilet", icon: Ticket },
        { href: `/admin/events/${eventId}/certificates`, label: "Sertifika", icon: Shield },
      ]
    : [
        { href: "/admin/dashboard", label: "Panel", icon: Home },
        { href: "/admin/events", label: "Etkinlik", icon: CalendarDays },
      ];

  return (
    <nav className="fixed inset-x-3 bottom-3 z-[60] rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-2xl backdrop-blur md:hidden">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== `/admin/events/${eventId}` && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-black ${active ? "bg-indigo-600 text-white" : "text-slate-500"}`}>
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
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
        <InstallPrompt />
        <AdminMobileNav />
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
        <InstallPrompt />
      </div>
    </I18nProvider>
  );
}
