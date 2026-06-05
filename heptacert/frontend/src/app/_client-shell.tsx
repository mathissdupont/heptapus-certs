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
  normalizeApiAssetUrl,
  apiUrl,
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
    fetch(apiUrl("/branding"), { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((j) => {
        if (!mounted || !j) return;
        setBrandLogo(normalizeApiAssetUrl(j.brand_logo));
        setBrandColor(j.brand_color || null);
        setOrgName(j.org_name || null);
        setSettings(j.settings || null);
        if (j.brand_color) {
          document.documentElement.style.setProperty("--site-brand-color", j.brand_color);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
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

    void syncMember();
    window.addEventListener("storage", handleStorage);
    window.addEventListener(PUBLIC_MEMBER_TOKEN_EVENT, () => void syncMember());

    return () => {
      mounted = false;
      window.removeEventListener("storage", handleStorage);
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

  const eventsLabel      = lang === "tr" ? "Etkinlikler"  : "Events";
  const communitiesLabel = lang === "tr" ? "Topluluklar"  : "Communities";
  const discoverLabel    = lang === "tr" ? "Merkez"       : "Hub";
  const myEventsLabel    = lang === "tr" ? "Katıldıklarım": "My Events";
  const profileLabel     = lang === "tr" ? "Profilim"     : "My Profile";
  const logoutLabel      = lang === "tr" ? "Çıkış Yap"   : "Sign Out";

  const links = isWhiteLabel
    ? [{ href: "/verify", label: t("nav_verify") }]
    : [
        { href: "/events",        label: eventsLabel },
        { href: "/organizations", label: communitiesLabel },
        { href: "/discover",      label: discoverLabel },
        ...(member ? [{ href: "/my-events", label: myEventsLabel }] : []),
        ...(member ? [{ href: "/profile",   label: profileLabel   }] : []),
        { href: "/pricing", label: t("nav_pricing") },
        { href: "/verify",  label: t("nav_verify")  },
      ];

  const memberName = member?.display_name || member?.email || "";

  useEffect(() => {
    if (!isWhiteLabel || !orgName || typeof document === "undefined") return;
    const currentTitle = document.title || "";
    document.title = currentTitle.includes("HeptaCert")
      ? currentTitle.replace(/HeptaCert/g, orgName)
      : orgName;
  }, [isWhiteLabel, orgName]);

  useEffect(() => {
    if (!isWhiteLabel || !brandLogo || typeof document === "undefined") return;

    function withIconCacheKey(value: string) {
      try {
        const url = new URL(value, window.location.origin);
        url.searchParams.set("wl_icon", orgName || "brand");
        return url.toString();
      } catch {
        return value;
      }
    }

    const iconHref = withIconCacheKey(brandLogo);
    const iconLinks = Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']"));
    if (iconLinks.length === 0) {
      const link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
      iconLinks.push(link);
    }
    iconLinks.forEach((link) => {
      link.href = iconHref;
      link.type = "";
    });

    let appleLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    if (!appleLink) {
      appleLink = document.createElement("link");
      appleLink.rel = "apple-touch-icon";
      document.head.appendChild(appleLink);
    }
    appleLink.href = iconHref;
  }, [brandLogo, isWhiteLabel, orgName]);

  function handleLogout() {
    clearPublicMemberToken();
    setMember(null);
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-200 bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex shrink-0 items-center">
          {brandLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brandLogo}
              alt="brand"
              className="h-8 w-auto max-w-[160px] object-contain opacity-100 transition-opacity group-hover:opacity-75"
            />
          ) : isWhiteLabel && orgName ? (
            <span className="text-base font-bold tracking-tight text-surface-900">{orgName}</span>
          ) : (
            <Image
              src="/logo.png"
              alt="HeptaCert"
              width={140}
              height={40}
              unoptimized
              priority
              className="h-8 w-auto object-contain transition-opacity group-hover:opacity-75"
            />
          )}
        </Link>

        {/* Desktop nav links — centered */}
        <div className="hidden flex-1 items-center justify-center gap-0.5 px-8 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-surface-600 transition-colors hover:text-surface-900"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop right actions */}
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <LanguageToggle />
          <div className="mx-1 h-5 w-px bg-surface-200" />

          {isWhiteLabel ? null : member ? (
            <>
              <Link
                href="/post/create"
                className="btn-ghost text-sm"
              >
                <Plus className="h-4 w-4" />
                {lang === "tr" ? "Gönderi" : "Post"}
              </Link>
              <span className="text-sm font-medium text-surface-700 max-w-[140px] truncate">
                {memberName}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-ghost text-sm"
              >
                {logoutLabel}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost text-sm">
                {t("nav_login")}
              </Link>
              {!isWhiteLabel && (
                <Link href="/register?mode=organizer" className="btn-primary text-sm">
                  {t("nav_start_free")}
                </Link>
              )}
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? (lang === "tr" ? "Menüyü Kapat" : "Close menu") : (lang === "tr" ? "Menüyü Aç" : "Open menu")}
          aria-expanded={open}
          className="rounded-lg p-2 text-surface-600 transition-colors hover:bg-surface-100 hover:text-surface-900 lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden border-t border-surface-100 bg-white lg:hidden"
          >
            {/* Nav links */}
            <div className="space-y-0.5 px-4 py-3">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-50 hover:text-surface-900"
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Auth section */}
            <div className="border-t border-surface-100 bg-surface-50 px-4 py-4">
              <div className="mb-4 flex items-center justify-between px-1">
                <span className="text-xs font-medium text-surface-500">
                  {lang === "tr" ? "Dil" : "Language"}
                </span>
                <LanguageToggle />
              </div>

              {isWhiteLabel ? null : member ? (
                <div className="space-y-2">
                  <Link
                    href="/profile"
                    onClick={() => setOpen(false)}
                    className="block rounded-xl border border-surface-200 bg-white px-4 py-3"
                  >
                    <p className="truncate text-sm font-medium text-surface-900">{memberName}</p>
                    <p className="mt-0.5 text-xs text-surface-400">
                      {lang === "tr" ? "Profil ayarları" : "Profile settings"}
                    </p>
                  </Link>
                  <Link
                    href="/post/create"
                    onClick={() => setOpen(false)}
                    className="btn-secondary flex w-full justify-center"
                  >
                    <Plus className="h-4 w-4" />
                    {lang === "tr" ? "Yeni Gönderi" : "New Post"}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn-ghost w-full justify-center"
                  >
                    {logoutLabel}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="btn-secondary flex w-full justify-center"
                  >
                    {t("nav_login")}
                  </Link>
                  {!isWhiteLabel && (
                    <Link
                      href="/register?mode=organizer"
                      onClick={() => setOpen(false)}
                      className="btn-primary flex w-full justify-center"
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
    </header>
  );
}

function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<unknown>(null);
  const [visible, setVisible] = useState(false);
  const [iosInstallHelp, setIosInstallHelp] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem("heptacert:pwa-install-dismissed") === "1";
    const userAgent = window.navigator.userAgent || "";
    const isIos = /iphone|ipad|ipod/i.test(userAgent) || (userAgent.includes("Macintosh") && "ontouchend" in document);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as { standalone?: boolean }).standalone);
    if (isStandalone) { setVisible(false); return; }
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
    const pe = promptEvent as { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
    await pe.prompt();
    try {
      const choice = await pe.userChoice;
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
    <div className="fixed inset-x-3 bottom-20 z-[70] rounded-2xl border border-surface-200 bg-white p-4 shadow-float md:bottom-5 md:left-auto md:right-5 md:w-96">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-surface-150 bg-surface-50 p-2 text-surface-600">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-surface-900">HeptaCert&apos;i ana ekrana ekle</p>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Kapat"
              className="btn-ghost -mt-1 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-surface-500">
            {iosInstallHelp
              ? "iPhone'da Safari paylaş menüsü üzerinden Ana Ekrana Ekle seçeneğini kullan."
              : "Check-in ve bilet kontrolünü uygulama gibi aç."}
          </p>
          {iosInstallHelp && (
            <div className="mt-3 rounded-xl border border-surface-150 bg-surface-50 p-3 text-xs text-surface-600">
              <p className="flex items-center gap-2">
                <Share className="h-4 w-4 text-surface-500" />
                Safari&apos;de Paylaş&apos;a bas
              </p>
              <p className="mt-1 pl-6">Sonra Ana Ekrana Ekle seç.</p>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            {promptEvent !== null && (
              <button type="button" onClick={install} className="btn-primary text-xs">
                Ekle
              </button>
            )}
            <button type="button" onClick={dismiss} className="btn-secondary text-xs">
              Sonra
            </button>
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
        { href: `/admin/events/${eventId}`,              label: "Özet",     icon: Home       },
        { href: `/admin/events/${eventId}/ops`,           label: "Canlı",    icon: Activity   },
        { href: `/admin/events/${eventId}/checkin`,       label: "Check-in", icon: QrCode     },
        { href: `/admin/events/${eventId}/tickets`,       label: "Bilet",    icon: Ticket     },
        { href: `/admin/events/${eventId}/certificates`,  label: "Sertifika",icon: Shield     },
      ]
    : [
        { href: "/admin/dashboard", label: "Panel",    icon: Home        },
        { href: "/admin/events",    label: "Etkinlik", icon: CalendarDays},
      ];

  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-[60] rounded-2xl border border-surface-200 bg-white/95 p-1.5 shadow-float backdrop-blur md:hidden"
      aria-label="Admin hızlı gezinti"
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== `/admin/events/${eventId}` && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-11 font-semibold transition-colors ${
                active ? "bg-surface-900 text-white" : "text-surface-500 hover:bg-surface-100 hover:text-surface-900"
              }`}
            >
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
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="min-h-screen w-full bg-surface-50"
        >
          {children}
        </motion.main>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <HtmlLangSync />
      <div className="flex min-h-screen flex-col bg-surface-50 font-sans text-surface-900">
        <Navbar />
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full flex-grow"
        >
          {children}
        </motion.main>
        <InstallPrompt />
      </div>
    </I18nProvider>
  );
}
