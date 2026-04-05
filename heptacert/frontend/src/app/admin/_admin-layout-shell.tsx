"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getRoleFromToken } from "@/lib/api";
import { LanguageToggle, useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck2,
  ChartNoAxesCombined,
  CreditCard,
  Gauge,
  KeyRound,
  Mail,
  Settings,
  Shield,
  Webhook,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
} from "lucide-react";

type NavItem = {
  superadminOnly?: boolean;
  href: string;
  label: { tr: string; en: string };
  icon: React.ElementType;
  exact?: boolean;
};

type NavGroup = {
  label: { tr: string; en: string };
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: { tr: "Genel", en: "General" },
    items: [
      { href: "/admin/dashboard", label: { tr: "Dashboard", en: "Dashboard" }, icon: Gauge, exact: true },
      { href: "/admin/events", label: { tr: "Etkinlikler", en: "Events" }, icon: CalendarCheck2 },
    ],
  },
  {
    label: { tr: "İletişim", en: "Communication" },
    items: [
      { href: "/admin/email-dashboard", label: { tr: "Email Merkezi", en: "Email Center" }, icon: Mail },
      { href: "/admin/email-analytics", label: { tr: "Email Analitik", en: "Email Analytics" }, icon: ChartNoAxesCombined },
    ],
  },
  {
    label: { tr: "Sistem", en: "System" },
    items: [
      { href: "/admin/payments/transactions", label: { tr: "Ödemeler", en: "Payments" }, icon: CreditCard },
      { href: "/admin/webhooks", label: { tr: "Webhooks", en: "Webhooks" }, icon: Webhook },
      { href: "/admin/api-keys", label: { tr: "API Anahtarları", en: "API Keys" }, icon: KeyRound },
      { href: "/admin/settings", label: { tr: "Ayarlar", en: "Settings" }, icon: Settings },
      { href: "/admin/superadmin", label: { tr: "Super Admin", en: "Super Admin" }, icon: Shield, superadminOnly: true },
    ],
  },
];

const PRIMARY_MOBILE_ITEMS: NavItem[] = [
  NAV_GROUPS[0].items[0],
  NAV_GROUPS[0].items[1],
  NAV_GROUPS[1].items[0],
  NAV_GROUPS[2].items[0],
  NAV_GROUPS[2].items[3],
];

const AUTH_PATH_PREFIXES = ["/admin/login", "/admin/magic-verify", "/admin/auth"];

function isAuthPage(pathname: string): boolean {
  return AUTH_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function getCurrentSection(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "dashboard";
  if (last === "admin") return "Dashboard";
  return last
    .replace(/\[|\]/g, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function SidebarContent({
  pathname,
  collapsed,
  onClose,
}: {
  pathname: string;
  collapsed: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const role = getRoleFromToken();
  const { lang } = useI18n();

  function handleLogout() {
    clearToken();
    router.push("/admin/login");
    onClose?.();
  }

  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center border-b border-sidebar-border ${collapsed ? "justify-center px-0 py-5" : "gap-2.5 px-4 py-5"}`}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-brand">
          <Layers className="h-4 w-4" />
        </div>
        {!collapsed && (
          <>
            <span className="text-sm font-bold tracking-tight text-surface-900">HeptaCert</span>
            <span className="ml-auto rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600">Admin</span>
          </>
        )}
      </div>

      <nav className={`flex-1 space-y-5 overflow-y-auto py-4 ${collapsed ? "px-2" : "px-3"}`}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label.en}>
            {!collapsed && (
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-surface-400">
                {group.label[lang]}
              </p>
            )}
            {collapsed && <div className="mb-1.5 border-t border-sidebar-border" />}
            <div className="space-y-1">
              {group.items
                .filter((item) => !item.superadminOnly || role === "superadmin")
                .map((item) => {
                  const active = isActive(pathname, item);
                  const Icon = item.icon;
                  const label = item.label[lang];
                  if (collapsed) {
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        title={label}
                        className={`flex items-center justify-center rounded-lg p-2.5 transition-all ${
                          active
                            ? "border border-brand-200 bg-brand-50 text-surface-900 shadow-soft"
                            : "text-surface-500 hover:bg-sidebar-hover hover:text-surface-900"
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                      </Link>
                    );
                  }
                  return (
                    <Link key={item.href} href={item.href} onClick={onClose} className={active ? "sidebar-item-active" : "sidebar-item"}>
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`border-t border-sidebar-border py-3 ${collapsed ? "px-2" : "px-3"}`}>
        <button
          onClick={handleLogout}
          title={lang === "tr" ? "Çıkış Yap" : "Sign Out"}
          className={`rounded-lg text-red-500 transition-all hover:bg-red-50 hover:text-red-700 ${
            collapsed ? "flex w-full items-center justify-center p-2.5" : "sidebar-item w-full text-left"
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && (lang === "tr" ? "Çıkış Yap" : "Sign Out")}
        </button>
      </div>
    </div>
  );
}

export function AdminLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const currentSection = getCurrentSection(pathname);
  const { lang } = useI18n();
  const role = getRoleFromToken();
  const mobileNavItems =
    role === "superadmin"
      ? [...PRIMARY_MOBILE_ITEMS.slice(0, 4), NAV_GROUPS[2].items[4]]
      : PRIMARY_MOBILE_ITEMS;

  const topbarText = useMemo(
    () => ({
      workspace: lang === "tr" ? "Admin Çalışma Alanı" : "Admin Workspace",
      live: lang === "tr" ? "Canlı" : "Live",
      openMenu: lang === "tr" ? "Menüyü Aç" : "Open menu",
      expandMenu: lang === "tr" ? "Menüyü Genişlet" : "Expand menu",
      collapseMenu: lang === "tr" ? "Menüyü Daralt" : "Collapse menu",
    }),
    [lang]
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isAuthPage(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      <aside
        className={`hidden border-r border-sidebar-border bg-sidebar/95 backdrop-blur transition-all duration-200 lg:flex lg:shrink-0 lg:flex-col ${
          collapsed ? "lg:w-[64px]" : "lg:w-[240px]"
        }`}
      >
        <SidebarContent pathname={pathname} collapsed={collapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 w-[min(88vw,320px)] border-r border-sidebar-border bg-sidebar/95 backdrop-blur">
            <SidebarContent pathname={pathname} collapsed={false} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.10),transparent_22%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_18%)]" />
        <header className="relative flex shrink-0 items-center gap-3 border-b border-surface-200 bg-white/80 px-4 py-3 backdrop-blur lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-surface-600 hover:bg-surface-100 lg:hidden"
            aria-label={topbarText.openMenu}
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            onClick={() => setCollapsed((value) => !value)}
            className="hidden rounded-lg p-1.5 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-800 lg:flex"
            aria-label={collapsed ? topbarText.expandMenu : topbarText.collapseMenu}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>

          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-600 text-white">
              <Layers className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-surface-900">HeptaCert</div>
              <div className="truncate text-[11px] font-medium text-surface-400">{currentSection}</div>
            </div>
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-3">
            <LanguageToggle className="inline-flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-xs font-bold text-surface-700 shadow-sm transition-colors hover:bg-surface-50 hover:text-surface-900" />
            <div className="hidden min-w-0 items-center gap-3 lg:flex">
              <div className="text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">{topbarText.workspace}</div>
                <div className="text-sm font-semibold text-surface-800">{currentSection}</div>
              </div>
              <div className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-surface-700">
                {topbarText.live}
              </div>
            </div>
          </div>
        </header>

        <main className="relative flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="mx-auto w-full max-w-[1600px] p-4 pb-28 lg:p-6 lg:pb-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="mobile-bottom-nav" aria-label={lang === "tr" ? "Hızlı gezinti" : "Quick navigation"}>
          <div className="flex items-stretch gap-1">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "mobile-bottom-nav-item-active" : "mobile-bottom-nav-item"}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label[lang]}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
