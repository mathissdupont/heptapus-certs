"use client";

import { pickLang } from "@/lib/pickLang";
import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, clearToken, getRoleFromToken, getSelectedOrganizationId, setSelectedOrganizationId, type OrgModules } from "@/lib/api";
import { LanguageToggle, useI18n } from "@/lib/i18n";
import { orgRoleLabel } from "@/lib/orgRoles";
import InAppTourGuide from "@/components/Admin/InAppTourGuide";
import AIAssistant from "@/components/Admin/AIAssistant";
import HeptaCertLogoMark from "@/components/Brand/HeptaCertLogoMark";
import CommandPalette from "@/components/Admin/CommandPalette";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck2,
  ChartNoAxesCombined,
  MessageCircle,
  CreditCard,
  Gauge,
  KeyRound,
  Mail,
  Settings,
  Building2,
  Shield,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UsersRound,
  Loader2,
  Plug,
  Zap,
  Briefcase,
  ClipboardList,
  BarChart3,
  FileText,
  CalendarClock,
} from "lucide-react";

type NavItem = {
  superadminOnly?: boolean;
  href: string;
  label: { tr: string; en: string };
  icon: React.ElementType;
  exact?: boolean;
  /** Sınırlı organizasyon rolleri (owner/manager dışı üyeler) yalnızca bu izne
   *  sahip oldukları öğeleri görür. Tanımsızsa öğe yalnızca tam erişimli
   *  bağlamlarda (owner/manager/solo/superadmin) görünür. */
  permission?: string;
  /** Sınırlı rollerde bile her zaman görünür (örn. Dashboard). */
  alwaysVisible?: boolean;
};

type NavGroup = {
  label: { tr: string; en: string };
  items: NavItem[];
  /** If set, this group is hidden when the corresponding module is disabled */
  module?: keyof OrgModules;
  enterpriseOnly?: boolean;
};

type OrganizationContext = {
  id: number;
  org_name: string;
  role: string;
  owned: boolean;
  permissions: string[];
};

const DEFAULT_MODULES: OrgModules = { events: true, lms: false, accreditation: true, presentations: true, crm: true };

// Group indices (0-based):
// 0: Genel              — always visible
// 1: Etkinlikler        — module: events
// 2: Salon & Rezervasyon — permission-gated items (venues/reservations)
// 3: Akreditasyon       — module: accreditation
// 4: CRM & Satış        — always visible
// 5: İletişim           — always visible
// 6: Analitik           — always visible
// 7: Platform           — always visible

const NAV_GROUPS: NavGroup[] = [
  {
    label: { tr: "Genel", en: "General" },
    items: [
      { href: "/admin/dashboard", label: { tr: "Dashboard", en: "Dashboard" }, icon: Gauge, exact: true, alwaysVisible: true },
      { href: "/admin/jobs", label: { tr: "İşler", en: "Jobs" }, icon: Loader2, exact: true },
    ],
  },
  {
    label: { tr: "Etkinlikler", en: "Events" },
    module: "events",
    items: [
      { href: "/admin/events", label: { tr: "Etkinlikler", en: "Events" }, icon: CalendarCheck2, permission: "events:manage" },
    ],
  },
  {
    label: { tr: "Salon & Rezervasyon", en: "Venues & Reservations" },
    items: [
      { href: "/admin/venues", label: { tr: "Salonlar", en: "Venues" }, icon: Building2, permission: "venues:read" },
      { href: "/admin/reservations", label: { tr: "Rezervasyonlar", en: "Reservations" }, icon: CalendarClock, permission: "reservations:read" },
    ],
  },
  // LMS sistemi devre disi birakildi — arsivlendi
  // {
  //   label: { tr: "HeptaLMS", en: "HeptaLMS" },
  //   enterpriseOnly: true,
  //   module: "lms",
  //   items: [
  //     { href: "/admin/lms", label: { tr: "Kurslar", en: "Courses" }, icon: School },
  //     { href: "/admin/lms/journeys", label: { tr: "Öğrenme Yolları", en: "Learning Journeys" }, icon: Route },
  //     { href: "/admin/lms/outcomes", label: { tr: "Kazanımlar", en: "Outcomes" }, icon: GraduationCap },
  //     { href: "/admin/lms/badges", label: { tr: "Rozetler", en: "Badges" }, icon: Award },
  //     { href: "/admin/lms/integrations", label: { tr: "Entegrasyonlar", en: "Integrations" }, icon: Plug },
  //     { href: "/admin/lms/staff", label: { tr: "Akademik Kadro", en: "Academic Staff" }, icon: UsersRound },
  //     { href: "/admin/lms/white-label", label: { tr: "LMS White-label", en: "LMS White-label" }, icon: Palette },
  //     { href: "/admin/lms/analytics", label: { tr: "LMS Analitik", en: "LMS Analytics" }, icon: BarChart3 },
  //     { href: "/admin/training", label: { tr: "Uyum Takibi", en: "Compliance" }, icon: ClipboardList },
  //   ],
  // },
  {
    label: { tr: "Akreditasyon", en: "Accreditation" },
    module: "accreditation",
    items: [
      { href: "/admin/accreditation", label: { tr: "CPD / Akreditasyon", en: "CPD / Accreditation" }, icon: ChartNoAxesCombined },
    ],
  },
  {
    label: { tr: "CRM & Satış", en: "CRM & Sales" },
    module: "crm",
    enterpriseOnly: true,
    items: [
      { href: "/admin/crm", label: { tr: "Katılımcı CRM", en: "Participant CRM" }, icon: UsersRound, exact: true },
      { href: "/admin/crm/accounts", label: { tr: "Şirket Hesapları", en: "Accounts" }, icon: Building2 },
      { href: "/admin/crm/sequences", label: { tr: "Sequence'lar", en: "Sequences" }, icon: Zap },
      { href: "/admin/crm/pipeline", label: { tr: "Satış Pipeline", en: "Pipeline" }, icon: Briefcase },
      { href: "/admin/lead-forms", label: { tr: "Lead Formları", en: "Lead Forms" }, icon: ClipboardList },
    ],
  },
  {
    label: { tr: "İletişim", en: "Communication" },
    items: [
      { href: "/admin/email-dashboard", label: { tr: "Email Merkezi", en: "Email Center" }, icon: Mail },
      { href: "/admin/email-analytics", label: { tr: "Email Analitik", en: "Email Analytics" }, icon: ChartNoAxesCombined },
      { href: "/admin/assistant", label: { tr: "Asistan", en: "Assistant" }, icon: MessageCircle },
    ],
  },
  // "İçerik / Sunumlar" removed from the general nav: presentations now live under
  // each event (EventAdminNav → Sunumlar tab), so the top-level entry was redundant.
  {
    label: { tr: "Analitik & Raporlar", en: "Analytics & Reports" },
    items: [
      { href: "/admin/analytics", label: { tr: "Analitik", en: "Analytics" }, icon: BarChart3 },
      { href: "/admin/reports", label: { tr: "Raporlar", en: "Reports" }, icon: FileText },
    ],
  },
  {
    label: { tr: "Platform", en: "Platform" },
    items: [
      { href: "/admin/integrations", label: { tr: "Entegrasyonlar", en: "Integrations" }, icon: Plug, exact: true },
      { href: "/admin/payments/transactions", label: { tr: "Ödemeler", en: "Payments" }, icon: CreditCard },
      { href: "/admin/settings/api", label: { tr: "API Anahtarları", en: "API Keys" }, icon: KeyRound },
      { href: "/admin/settings/sso", label: { tr: "SSO / OAuth2", en: "SSO / OAuth2" }, icon: Shield },
      { href: "/admin/settings", label: { tr: "Ayarlar", en: "Settings" }, icon: Settings },
      { href: "/admin/superadmin", label: { tr: "Super Admin", en: "Super Admin" }, icon: Shield, superadminOnly: true },
    ],
  },
];

// Primary mobile nav — always-visible items (module-gated items excluded here)
// Indices: [0]=Genel, [1]=Etkinlikler, [5]=İletişim, [4]=CRM, [7]=Platform
// (Platform shifted 8→7 after the "İçerik/Sunumlar" group was removed above.)
const PRIMARY_MOBILE_ITEMS: NavItem[] = [
  NAV_GROUPS[0].items[0],  // Dashboard
  NAV_GROUPS[1].items[0],  // Etkinlikler
  NAV_GROUPS[5].items[0],  // Email Merkezi
  NAV_GROUPS[4].items[0],  // CRM
  NAV_GROUPS[7].items[4],  // Settings
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

function getTourIdByHref(href: string): string {
  const map: Record<string, string> = {
    "/admin/dashboard": "nav-dashboard",
    "/admin/events": "nav-events",
    "/admin/email-dashboard": "nav-email-dashboard",
    "/admin/email-analytics": "nav-email-analytics",
    "/admin/settings": "nav-settings",
    "/admin/superadmin": "nav-superadmin",
  };
  return map[href] || "";
}

function SidebarContent({
  pathname,
  collapsed,
  modules,
  enterpriseEnabled,
  navPermissions,
  onClose,
}: {
  pathname: string;
  collapsed: boolean;
  modules: OrgModules;
  enterpriseEnabled: boolean;
  /** null = tam erişim (owner/manager/solo/superadmin); aksi halde aktif
   *  kurumdaki üyelik izinleri — menü bunlara göre kısıtlanır. */
  navPermissions: string[] | null;
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

  const itemAllowed = (item: NavItem): boolean => {
    if (item.superadminOnly && role !== "superadmin") return false;
    if (navPermissions === null) return true; // tam erişim → eskisi gibi
    if (item.alwaysVisible) return true;
    return Boolean(item.permission && navPermissions.includes(item.permission));
  };

  const visibleGroups = NAV_GROUPS
    .filter((g) => (!g.module || modules[g.module]) && (!g.enterpriseOnly || enterpriseEnabled))
    .map((g) => ({ ...g, items: g.items.filter(itemAllowed) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center border-b border-sidebar-border ${collapsed ? "justify-center px-0 py-5" : "gap-2.5 px-4 py-5"}`}>
        <HeptaCertLogoMark className="h-8 w-8 rounded-lg shadow-card" />
        {!collapsed && (
          <>
            <span className="text-sm font-semibold tracking-tight text-surface-900">HeptaCert</span>
            <span className="ml-auto rounded-md bg-surface-100 px-1.5 py-0.5 text-11 font-medium uppercase tracking-wide text-surface-500">Admin</span>
          </>
        )}
      </div>

      <nav className={`flex-1 space-y-5 overflow-y-auto py-4 ${collapsed ? "px-2" : "px-3"}`}>
        {visibleGroups.map((group) => (
          <div key={group.label.en}>
            {!collapsed && (
              <p className="mb-1.5 px-2 text-11 font-semibold uppercase tracking-wider text-surface-400">
                {pickLang(group.label, lang)}
              </p>
            )}
            {collapsed && <div className="mb-1.5 border-t border-sidebar-border" />}
            <div className="space-y-1">
              {group.items
                .map((item) => {
                  const active = isActive(pathname, item);
                  const Icon = item.icon;
                  const label = pickLang(item.label, lang);
                  if (collapsed) {
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        data-tour-id={getTourIdByHref(item.href) || undefined}
                        onClick={onClose}
                        title={label}
                        className={`flex items-center justify-center rounded-lg p-2.5 transition-all ${
                          active
                            ? "border border-surface-300 bg-white text-surface-900 shadow-soft"
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
                      data-tour-id={getTourIdByHref(item.href) || undefined}
                      onClick={onClose}
                      className={active ? "sidebar-item-active" : "sidebar-item"}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 truncate">{label}</span>
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
  const router = useRouter();
  const pathname = usePathname() || "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [modules, setModules] = useState<OrgModules>(DEFAULT_MODULES);
  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem("heptacert-sidebar-collapsed");
      if (stored === "true") setCollapsed(true);
    } catch {
      // storage unavailable
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("heptacert-sidebar-collapsed", String(collapsed));
    } catch {
      // storage unavailable
    }
  }, [collapsed]);

  const [organizationContexts, setOrganizationContexts] = useState<OrganizationContext[]>([]);
  const [contextsLoaded, setContextsLoaded] = useState(false);
  const [activeOrganizationId, setActiveOrganizationId] = useState("");
  const [activeJobCount, setActiveJobCount] = useState(0);
  const [enterpriseEnabled, setEnterpriseEnabled] = useState(false);
  const currentSection = getCurrentSection(pathname);
  const { lang } = useI18n();
  const role = getRoleFromToken();

  // Aktif kurumdaki üyelik rolüne göre menü izinleri.
  // null = tam erişim (kendi kurumu, manager rolü, solo kullanıcı veya superadmin)
  // → menü eskisi gibi tam görünür; regresyon yok. Sınırlı üyelik rolleri
  // (venue_manager, viewer, event_manager...) yalnızca izinli menüleri görür.
  const navPermissions = useMemo<string[] | null>(() => {
    if (role === "superadmin") return null;
    const activeContext = organizationContexts.find((ctx) => String(ctx.id) === activeOrganizationId);
    if (!activeContext || activeContext.owned || activeContext.role === "manager") return null;
    return activeContext.permissions || [];
  }, [role, organizationContexts, activeOrganizationId]);

  useEffect(() => {
    if (isAuthPage(pathname)) return;
    if (role === "superadmin") {
      setEnterpriseEnabled(true);
      return;
    }
    let cancelled = false;
    apiFetch("/billing/subscription")
      .then((r) => r.json())
      .then((subscription: { active?: boolean; plan_id?: string | null }) => {
        if (!cancelled) setEnterpriseEnabled(Boolean(subscription?.active && subscription?.plan_id === "enterprise"));
      })
      .catch(() => {
        if (!cancelled) setEnterpriseEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, role]);

  // Mobile nav: swap Etkinlikler for first available module item
  const mobileNavItems = useMemo(() => {
    const base = [...PRIMARY_MOBILE_ITEMS];
    // LMS devre disi — LMS fallback kaldirildi
    // if (!modules.events && modules.lms && enterpriseEnabled) {
    //   base[1] = NAV_GROUPS[2].items[0];
    // }
    if (role === "superadmin") {
      base[4] = NAV_GROUPS[7].items[5];
    }
    // Sınırlı üyelik rolünde: yetkisi olmayan hızlı-erişim öğelerini gizle
    // (Dashboard her zaman kalır; ana menüyle tutarlı olsun diye).
    if (navPermissions !== null) {
      return base.filter(
        (item) => item.alwaysVisible || (item.permission && navPermissions.includes(item.permission)),
      );
    }
    return base;
  }, [enterpriseEnabled, modules, role, navPermissions]);

  const topbarText = useMemo(
    () => ({
      workspace: lang === "tr" ? "Admin Çalışma Alanı" : "Admin Workspace",
      live: lang === "tr" ? "Canlı" : "Live",
      openMenu: lang === "tr" ? "Menüyü Aç" : "Open menu",
      expandMenu: lang === "tr" ? "Menüyü Genişlet" : "Expand menu",
      collapseMenu: lang === "tr" ? "Menüyü Daralt" : "Collapse menu",
      organization: lang === "tr" ? "Organizasyon" : "Organization",
      ownOrg: lang === "tr" ? "kendi kurumum" : "own org",
    }),
    [lang]
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isAuthPage(pathname)) return;
    apiFetch("/admin/organization/contexts", { method: "GET" })
      .then((response) => response.json())
      .then((items: OrganizationContext[]) => {
        const contexts = items || [];
        setOrganizationContexts(contexts);
        const stored = getSelectedOrganizationId();
        const selected = contexts.find((ctx) => String(ctx.id) === stored) || contexts[0];
        if (selected) {
          setActiveOrganizationId(String(selected.id));
          setSelectedOrganizationId(selected.id);
        } else {
          setActiveOrganizationId("");
          setSelectedOrganizationId(null);
        }
      })
      .catch(() => {
        setOrganizationContexts([]);
      })
      .finally(() => {
        setContextsLoaded(true);
      });
  }, [pathname]);

  // Load module visibility after organization contexts are available. First-run progress
  // lives on /admin/onboarding and is derived from real organization/event state.
  useEffect(() => {
    if (isAuthPage(pathname) || !contextsLoaded) return;
    apiFetch("/admin/organization/modules")
      .then((response) => response.json())
      .then((data: { modules?: OrgModules }) => {
        if (data?.modules) setModules(data.modules);
      })
      .catch(() => undefined);
  }, [activeOrganizationId, contextsLoaded, pathname]);
  // Poll active job count every 10s
  useEffect(() => {
    if (isAuthPage(pathname)) return;
    const poll = () => {
      apiFetch("/admin/jobs?limit=1")
        .then(r => r.json())
        .then((data: { active_count: number }) => setActiveJobCount(data?.active_count ?? 0))
        .catch(() => undefined);
    };
    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [pathname]);

  if (isAuthPage(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50 text-surface-900">
      <aside
        className={`hidden border-r border-sidebar-border bg-sidebar/95 shadow-[1px_0_0_rgba(231,229,224,0.55)] backdrop-blur transition-all duration-200 lg:flex lg:shrink-0 lg:flex-col ${
          collapsed ? "lg:w-[64px]" : "lg:w-[240px]"
        }`}
      >
        <SidebarContent pathname={pathname} collapsed={collapsed} modules={modules} enterpriseEnabled={enterpriseEnabled} navPermissions={navPermissions} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 w-[min(88vw,320px)] border-r border-sidebar-border bg-sidebar/95 backdrop-blur">
            <SidebarContent pathname={pathname} collapsed={false} modules={modules} enterpriseEnabled={enterpriseEnabled} navPermissions={navPermissions} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(250,250,249,0.42))]" />
        <header className="relative z-20 flex shrink-0 items-center gap-3 border-b border-surface-200 bg-white/90 px-4 py-3 shadow-soft backdrop-blur lg:px-6">
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
            <HeptaCertLogoMark className="h-7 w-7 rounded-md" />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-surface-900">HeptaCert</div>
              <div className="truncate text-11 font-medium text-surface-400">{currentSection}</div>
            </div>
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-3">
            <CommandPalette />
            {activeJobCount > 0 && (
              <Link
                href="/admin/jobs"
                className="relative hidden sm:flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{activeJobCount} {lang === "tr" ? "iş devam ediyor" : "jobs running"}</span>
              </Link>
            )}
            {organizationContexts.length > 1 && (
              <label className="hidden min-w-[220px] max-w-[300px] items-center gap-2 rounded-lg border border-surface-200 bg-white px-2.5 py-1.5 shadow-sm md:flex">
                <Building2 className="h-4 w-4 shrink-0 text-surface-400" />
                <span className="sr-only">{topbarText.organization}</span>
                <select
                  value={activeOrganizationId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setActiveOrganizationId(nextId);
                    setSelectedOrganizationId(nextId || null);
                    router.refresh();
                    if (pathname.startsWith("/admin/events")) {
                      window.location.reload();
                    }
                  }}
                  className="min-w-0 flex-1 bg-transparent text-xs font-bold text-surface-700 outline-none"
                  aria-label={topbarText.organization}
                >
                  {organizationContexts.map((ctx) => (
                    <option key={ctx.id} value={ctx.id}>
                      {ctx.org_name} {ctx.owned ? `(${topbarText.ownOrg})` : `(${orgRoleLabel(ctx.role, lang)})`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <ThemeToggle />
            <LanguageToggle className="inline-flex items-center gap-2 rounded-lg border border-surface-200 bg-raised px-3 py-1.5 text-xs font-bold text-surface-700 shadow-sm transition-colors hover:bg-surface-50 hover:text-surface-900" />
            <div className="hidden min-w-0 items-center gap-3 lg:flex">
              <div className="text-right">
                <div className="text-11 font-medium uppercase tracking-wider text-surface-400">{topbarText.workspace}</div>
                <div className="text-sm font-medium text-surface-700">{currentSection}</div>
              </div>
              <div className="rounded-full border border-surface-200 bg-surface-50 px-2.5 py-0.5 text-11 font-medium text-surface-500">
                {topbarText.live}
              </div>
            </div>
          </div>
        </header>

        <main className="scrollbar-polished relative flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="mx-auto w-full max-w-[1600px] p-4 pb-28 lg:p-6 lg:pb-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <InAppTourGuide />
        <AIAssistant />
        <nav className="mobile-bottom-nav" aria-label={lang === "tr" ? "Hızlı gezinti" : "Quick navigation"}>
          <div className="flex items-stretch gap-1">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour-id={getTourIdByHref(item.href) || undefined}
                  className={active ? "mobile-bottom-nav-item-active" : "mobile-bottom-nav-item"}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{pickLang(item.label, lang)}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
