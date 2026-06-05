"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  Crown,
  Headset,
  LayoutDashboard,
  Mail,
  Menu,
  ScrollText,
  Settings2,
  ShieldAlert,
  Tag,
  Users,
  X,
  Zap,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type NavItem = {
  href: string;
  label: { tr: string; en: string };
  icon: React.ElementType;
};

type NavGroup = {
  label: { tr: string; en: string };
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: { tr: "Genel Bakış", en: "Overview" },
    items: [
      { href: "/admin/superadmin/admins",   label: { tr: "Adminler",        en: "Admins" },        icon: Users },
      { href: "/admin/superadmin/stats",    label: { tr: "İstatistikler",   en: "Stats" },         icon: BarChart3 },
      { href: "/admin/superadmin/health",   label: { tr: "Sistem Sağlığı", en: "System Health" }, icon: Activity },
    ],
  },
  {
    label: { tr: "Kullanıcılar", en: "Users" },
    items: [
      { href: "/admin/superadmin/members",       label: { tr: "Üyeler & Mail",    en: "Members & Mail" },   icon: LayoutDashboard },
      { href: "/admin/superadmin/orgs",          label: { tr: "Kurumlar",         en: "Organizations" },    icon: Building2 },
      { href: "/admin/superadmin/subscriptions", label: { tr: "Abonelikler",      en: "Subscriptions" },    icon: CreditCard },
      { href: "/admin/superadmin/waitlist",      label: { tr: "Bekleme Listesi", en: "Waitlist" },         icon: ClipboardList },
    ],
  },
  {
    label: { tr: "İletişim", en: "Communication" },
    items: [
      { href: "/admin/superadmin/system-digest", label: { tr: "Sistem Maili", en: "System Digest" }, icon: Mail },
      { href: "/admin/superadmin/mail-logs",     label: { tr: "Mail Logları", en: "Mail Logs" },     icon: ScrollText },
    ],
  },
  {
    label: { tr: "Destek & Güvenlik", en: "Support & Security" },
    items: [
      { href: "/admin/superadmin/support-tickets", label: { tr: "Destek Talepleri", en: "Support Tickets" }, icon: Headset },
      { href: "/admin/superadmin/audit-logs",      label: { tr: "Denetim Kaydı",   en: "Audit Log" },       icon: ShieldAlert },
    ],
  },
  {
    label: { tr: "Sistem", en: "System" },
    items: [
      { href: "/admin/superadmin/pricing", label: { tr: "Fiyatlandırma",  en: "Pricing" },        icon: Tag },
      { href: "/admin/superadmin/payment", label: { tr: "Ödeme Ayarları", en: "Payment Config" }, icon: Settings2 },
    ],
  },
];

function NavContent({
  pathname,
  lang,
  onNavigate,
}: {
  pathname: string;
  lang: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-5 py-2">
      {NAV_GROUPS.map((group) => (
        <div key={group.label.en}>
          <p className="mb-1.5 px-2 text-11 font-bold uppercase tracking-widest text-surface-400">
            {group.label[lang as "tr" | "en"]}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-surface-600 hover:bg-surface-100 hover:text-surface-900"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${active ? "text-brand-600" : "text-surface-400"}`}
                  />
                  <span className="truncate">{item.label[lang as "tr" | "en"]}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-600 shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang } = useI18n();
  const [checking, setChecking] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    let mounted = true;
    apiFetch("/me")
      .then((res) => res.json())
      .then((me) => {
        if (!mounted) return;
        if (me?.role !== "superadmin") {
          router.replace("/admin/events");
          return;
        }
        setChecking(false);
      })
      .catch(() => {
        if (!mounted) return;
        router.replace("/admin/login");
      });
    return () => { mounted = false; };
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center p-16 text-sm text-surface-500">
        <span className="animate-pulse">
          {lang === "tr" ? "Yetki kontrol ediliyor..." : "Checking access..."}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 sm:px-5 sm:py-4">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-amber-700 hover:bg-amber-100 lg:hidden"
          aria-label="Menüyü aç"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shadow-sm">
          <Crown className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-black tracking-tight text-surface-900">Super Admin</h1>
          <p className="hidden text-xs text-surface-500 sm:block">
            {lang === "tr"
              ? "Platform yönetim merkezi — sadece süper yöneticiler"
              : "Platform control center — superadmins only"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100/60 px-2.5 py-1">
          <Zap className="h-3 w-3 text-amber-600" />
          <span className="text-11 font-bold uppercase tracking-wide text-amber-700">superadmin</span>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white px-4 py-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-bold text-surface-900">Super Admin</span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavContent pathname={pathname || ""} lang={lang} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* 2-column: sidebar (desktop) + content */}
      <div className="flex gap-6 items-start">
        {/* Desktop sidebar */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-0">
            <NavContent pathname={pathname || ""} lang={lang} />
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
