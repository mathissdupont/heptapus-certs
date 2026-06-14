"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BarChart3,
  BookOpen,
  GraduationCap,
  Palette,
  Plug,
  Route,
  UserPlus,
  Users,
} from "lucide-react";
import { FeatureGate } from "@/lib/useSubscription";

export default function AdminLmsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const nav = [
    { href: "/admin/lms", label: "Kurslar", icon: BookOpen, exact: true },
    { href: "/admin/lms/journeys", label: "Yollar", icon: Route },
    { href: "/admin/lms/outcomes", label: "Kazanimlar", icon: GraduationCap },
    { href: "/admin/lms/badges", label: "Rozetler", icon: Award },
    { href: "/admin/lms/staff", label: "Ekip", icon: Users },
    { href: "/admin/lms/white-label", label: "White-label", icon: Palette },
    { href: "/admin/lms/integrations", label: "Entegrasyonlar", icon: Plug },
    { href: "/admin/lms/analytics", label: "Analitik", icon: BarChart3 },
  ];

  return (
    <FeatureGate requiredPlans={["enterprise"]} message="LMS Enterprise planina ozeldir.">
      <div className="min-h-screen bg-slate-50">
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  <UserPlus className="h-3.5 w-3.5" />
                  HeptaLMS
                </div>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">HeptaLMS</h1>
                <p className="mt-1 text-sm text-slate-500">Kurs, ogrenci, akademik ekip, white-label portal ve entegrasyon yonetimi.</p>
              </div>
            </div>
            <nav className="flex gap-2 overflow-x-auto pb-1">
              {nav.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-slate-950 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center gap-3 p-8">
          <p className="text-lg font-medium text-gray-700">Bu özellik geçici olarak devre dışı bırakıldı.</p>
          <p className="text-sm text-gray-500">Yakında tekrar kullanıma açılacak.</p>
        </div>
      </div>
    </FeatureGate>
  );
}
