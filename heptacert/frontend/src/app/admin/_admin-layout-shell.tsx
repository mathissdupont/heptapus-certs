"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getRoleFromToken } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck2,
  ChartNoAxesCombined,
  CreditCard,
  Gauge,
  KeyRound,
  Mail,
  MailOpen,
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
  label: string;
  icon: React.ElementType;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Genel",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: Gauge, exact: true },
      { href: "/admin/events", label: "Etkinlikler", icon: CalendarCheck2 },
    ],
  },
  {
    label: "İletişim",
    items: [
      { href: "/admin/email-dashboard", label: "Email Merkezi", icon: Mail },
      { href: "/admin/email-analytics", label: "Email Analitik", icon: ChartNoAxesCombined },
      { href: "/admin/email-settings/smtp-config", label: "SMTP Ayarları", icon: MailOpen },
    ],
  },
  {
    label: "Sistem",
    items: [
      { href: "/admin/payments/transactions", label: "Ödemeler", icon: CreditCard },
      { href: "/admin/webhooks", label: "Webhooks", icon: Webhook },
      { href: "/admin/api-keys", label: "API Anahtarları", icon: KeyRound },
      { href: "/admin/settings", label: "Ayarlar", icon: Settings },
      { href: "/admin/superadmin", label: "Super Admin", icon: Shield, superadminOnly: true },
    ],
  },
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

  function handleLogout() {
    clearToken();
    router.push("/admin/login");
    onClose?.();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={`flex items-center border-b border-sidebar-border ${collapsed ? "justify-center px-0 py-5" : "gap-2.5 px-4 py-5"}`}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-brand">
          <Layers className="h-4 w-4" />
        </div>
        {!collapsed && (
          <>
            <span className="text-sm font-bold text-surface-900 tracking-tight">HeptaCert</span>
            <span className="ml-auto rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600 uppercase tracking-wide">Admin</span>
          </>
        )}
      </div>

      {/* Nav groups */}
      <nav className={`flex-1 overflow-y-auto py-4 space-y-5 ${collapsed ? "px-2" : "px-3"}`}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-surface-400">
                {group.label}
              </p>
            )}
            {collapsed && <div className="mb-1.5 border-t border-sidebar-border" />}
            <div className="space-y-1">
              {group.items.filter(item => !item.superadminOnly || role === "superadmin").map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;
                if (collapsed) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      title={item.label}
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
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={active ? "sidebar-item-active" : "sidebar-item"}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={`border-t border-sidebar-border py-3 ${collapsed ? "px-2" : "px-3"}`}>
        <button
          onClick={handleLogout}
          title="Çıkış Yap"
          className={`transition-all text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg ${
            collapsed
              ? "flex items-center justify-center p-2.5 w-full"
              : "sidebar-item w-full text-left"
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && "Çıkış Yap"}
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

  if (isAuthPage(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside
        className={`hidden lg:flex lg:shrink-0 lg:flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur transition-all duration-200 ${
          collapsed ? "lg:w-[64px]" : "lg:w-[240px]"
        }`}
      >
        <SidebarContent pathname={pathname} collapsed={collapsed} />
      </aside>

      {/* ── Mobile Drawer ────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-[240px] border-r border-sidebar-border bg-sidebar/95 backdrop-blur">
            <SidebarContent pathname={pathname} collapsed={false} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="relative flex flex-1 flex-col overflow-hidden min-w-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.10),transparent_22%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_18%)]" />
        {/* Top bar — always visible */}
        <header className="relative flex shrink-0 items-center gap-3 border-b border-surface-200 bg-white/80 px-4 py-3 backdrop-blur lg:px-6">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-surface-600 hover:bg-surface-100 lg:hidden"
            aria-label="Menüyü Aç"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="hidden lg:flex rounded-lg p-1.5 text-surface-500 hover:bg-surface-100 hover:text-surface-800 transition-colors"
            aria-label={collapsed ? "Menüyü Genişlet" : "Menüyü Daralt"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>

          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-white">
              <Layers className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-bold text-surface-900">HeptaCert</span>
          </div>
          <div className="ml-auto hidden min-w-0 items-center gap-3 lg:flex">
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">
                Admin Workspace
              </div>
              <div className="text-sm font-semibold text-surface-800">
                {currentSection}
              </div>
            </div>
            <div className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-surface-700">
              Live
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="relative flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="mx-auto w-full max-w-[1600px] p-4 lg:p-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
