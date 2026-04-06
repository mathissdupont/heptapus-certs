"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Users,
  CreditCard,
  Tag,
  BarChart3,
  Building2,
  ScrollText,
  Activity,
  ClipboardList,
  Crown,
} from "lucide-react";
import PageHeader from "@/components/Admin/PageHeader";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const TABS = [
  { href: "/admin/superadmin/admins", label: { tr: "Adminler", en: "Admins" }, icon: Users },
  { href: "/admin/superadmin/subscriptions", label: { tr: "Abonelikler", en: "Subscriptions" }, icon: CreditCard },
  { href: "/admin/superadmin/pricing", label: { tr: "Fiyatlandırma", en: "Pricing" }, icon: Tag },
  { href: "/admin/superadmin/stats", label: { tr: "İstatistikler", en: "Stats" }, icon: BarChart3 },
  { href: "/admin/superadmin/payment", label: { tr: "Ödeme", en: "Payments" }, icon: CreditCard },
  { href: "/admin/superadmin/orgs", label: { tr: "Kurumlar", en: "Organizations" }, icon: Building2 },
  { href: "/admin/superadmin/audit-logs", label: { tr: "Denetim Kaydı", en: "Audit Log" }, icon: ScrollText },
  { href: "/admin/superadmin/health", label: { tr: "Sistem Sağlığı", en: "System Health" }, icon: Activity },
  { href: "/admin/superadmin/waitlist", label: { tr: "Bekleme Listesi", en: "Waitlist" }, icon: ClipboardList },
];

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang } = useI18n();
  const [checking, setChecking] = useState(true);

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
    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return <div className="p-10 text-sm text-surface-500">{lang === "tr" ? "Yetki kontrol ediliyor..." : "Checking access..."}</div>;
  }

  return (
    <div className="space-y-0">
      <PageHeader
        title={lang === "tr" ? "Super Admin" : "Super Admin"}
        subtitle={lang === "tr" ? "Platform yönetim merkezi - sadece süper yöneticiler" : "Platform control center - superadmins only"}
        icon={<Crown className="h-5 w-5" />}
      />

      <div className="mb-6 flex gap-0 overflow-x-auto border-b border-surface-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-surface-500 hover:border-surface-300 hover:text-surface-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label[lang]}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
