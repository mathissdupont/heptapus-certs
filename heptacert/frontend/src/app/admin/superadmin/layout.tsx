"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users, CreditCard, Tag, BarChart3, Building2,
  ScrollText, Activity, ClipboardList, Crown,
} from "lucide-react";
import PageHeader from "@/components/Admin/PageHeader";

const TABS = [
  { href: "/admin/superadmin/admins",        label: "Adminler",        icon: Users },
  { href: "/admin/superadmin/subscriptions", label: "Abonelikler",     icon: CreditCard },
  { href: "/admin/superadmin/pricing",       label: "Fiyatlandırma",   icon: Tag },
  { href: "/admin/superadmin/stats",         label: "İstatistikler",   icon: BarChart3 },
  { href: "/admin/superadmin/payment",       label: "Ödeme",           icon: CreditCard },
  { href: "/admin/superadmin/orgs",          label: "Kurumlar",        icon: Building2 },
  { href: "/admin/superadmin/audit-logs",    label: "Denetim Kaydı",   icon: ScrollText },
  { href: "/admin/superadmin/health",        label: "Sistem Sağlığı",  icon: Activity },
  { href: "/admin/superadmin/waitlist",      label: "Bekleme Listesi", icon: ClipboardList },
];

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-0">
      <PageHeader
        title="Super Admin"
        subtitle="Platform yönetim merkezi — sadece süper yöneticiler"
        icon={<Crown className="h-5 w-5" />}
      />

      {/* Sub-navigation tab bar */}
      <div className="flex gap-0 border-b border-surface-200 overflow-x-auto mb-6">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                isActive
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-surface-500 hover:text-surface-800 hover:border-surface-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
