"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";
import {
  CalendarCheck2,
  ChartNoAxesCombined,
  CreditCard,
  Gauge,
  KeyRound,
  Mail,
  MailCheck,
  MailCog,
  Settings,
  Shield,
  Webhook,
  LogOut,
  Menu,
  X,
  Layers,
} from "lucide-react";

type NavItem = {
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
      { href: "/admin/email-settings/smtp-config", label: "SMTP Ayarları", icon: MailCog },
    ],
  },
  {
    label: "Sistem",
    items: [
      { href: "/admin/payments/transactions", label: "Ödemeler", icon: CreditCard },
      { href: "/admin/webhooks", label: "Webhooks", icon: Webhook },
      { href: "/admin/api-keys", label: "API Anahtarları", icon: KeyRound },
      { href: "/admin/settings", label: "Ayarlar", icon: Settings },
      { href: "/admin/superadmin", label: "Super Admin", icon: Shield },
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

function SidebarContent({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.push("/admin/login");
    onClose?.();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-brand">
          <Layers className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold text-surface-900 tracking-tight">HeptaCert</span>
        <span className="ml-auto rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600 uppercase tracking-wide">Admin</span>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-surface-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;
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
      <div className="border-t border-sidebar-border px-3 py-3">
        <button
          onClick={handleLogout}
          className="sidebar-item w-full text-left text-red-500 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}

export function AdminLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isAuthPage(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside className="hidden lg:flex lg:w-[240px] lg:shrink-0 lg:flex-col border-r border-sidebar-border bg-sidebar">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* ── Mobile Drawer ────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* drawer */}
          <aside className="relative z-10 w-[240px] bg-sidebar border-r border-sidebar-border animate-slide-right">
            <SidebarContent pathname={pathname} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top bar (mobile only) */}
        <header className="flex items-center gap-3 border-b border-surface-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-surface-600 hover:bg-surface-100"
            aria-label="Menüyü Aç"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-white">
              <Layers className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-bold text-surface-900">HeptaCert</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1280px] p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
