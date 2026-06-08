"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCircle,
  X,
} from "lucide-react";
import { getPublicMemberToken, memberApiFetch } from "@/lib/api";

type Me = {
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

const NAV = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/portal/courses", label: "Kurslarım", icon: BookOpen },
  { href: "/portal/calendar", label: "Takvim", icon: CalendarDays },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getPublicMemberToken();
    if (!token) {
      router.push(`/login?next=/portal`);
      return;
    }
    setReady(true);
    memberApiFetch("/public/me")
      .then((r) => r.json())
      .then((d: Me) => setMe(d))
      .catch(() => null);
  }, []);

  function logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("public_member_token");
    }
    router.push("/login");
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile topbar */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-slate-900">Öğrenci Portalı</span>
        </div>
        <button onClick={() => setMobileOpen((v) => !v)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex pt-14">
          <div className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-xl">
            <nav className="flex-1 space-y-1 p-3 pt-4">
              {NAV.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            {me && (
              <div className="border-t border-slate-100 p-3">
                <div className="flex items-center gap-2 px-3 py-2 mb-1">
                  {me.avatar_url ? (
                    <img src={me.avatar_url} className="h-7 w-7 rounded-full object-cover" alt="" />
                  ) : (
                    <UserCircle className="h-7 w-7 text-slate-400" />
                  )}
                  <p className="truncate text-xs font-medium text-slate-700">{me.display_name || me.email}</p>
                </div>
                <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">
                  <LogOut className="h-4 w-4" />
                  Çıkış
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-60 border-r border-slate-200 bg-white shrink-0 sticky top-0 h-screen">
          {/* Brand */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Öğrenci Portalı</p>
              <p className="text-xs text-slate-400">Learning Hub</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 p-3 pt-4">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User block */}
          <div className="border-t border-slate-100 p-3">
            {me && (
              <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 mb-1">
                {me.avatar_url ? (
                  <img src={me.avatar_url} className="h-8 w-8 rounded-full object-cover" alt="" />
                ) : (
                  <UserCircle className="h-8 w-8 text-slate-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-700">{me.display_name || me.email}</p>
                  {me.display_name && <p className="truncate text-xs text-slate-400">{me.email}</p>}
                </div>
              </div>
            )}
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
            >
              <LogOut className="h-4 w-4" />
              Çıkış Yap
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
