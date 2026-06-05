"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
  type WheelEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronDown,
  LockKeyhole,
  QrCode,
  Users,
  ListFilter,
  UserCog,
  UserCheck,
  Target,
  Gift,
  BarChart3,
  Activity,
  Mail,
  Workflow,
  Settings,
  Palette,
  ClipboardList,
  Ticket,
  FolderKanban,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { apiFetch, getEventAccess, type EventAccessOut, type EventOut, type EventTeamPermission } from "@/lib/api";

type EventAdminTab =
  | "details"
  | "certificates"
  | "sessions"
  | "attendees"
  | "segments"
  | "team"
  | "ops"
  | "checkin"
  | "tickets"
  | "gamification"
  | "raffles"
  | "surveys"
  | "analytics"
  | "editor"
  | "email"
  | "automations"
  | "settings";

type NavItem = {
  tab: EventAdminTab;
  label: { tr: string; en: string };
  icon: React.ElementType;
  href: (id: string | number) => string;
};

const NAV_ITEMS: NavItem[] = [
  { tab: "details",      label: { tr: "Detaylar",       en: "Details"      }, icon: FolderKanban, href: (id) => `/admin/events/${id}` },
  { tab: "attendees",    label: { tr: "Katılımcılar",   en: "Attendees"    }, icon: Users,        href: (id) => `/admin/events/${id}/attendees` },
  { tab: "certificates", label: { tr: "Sertifikalar",   en: "Certificates" }, icon: LockKeyhole,  href: (id) => `/admin/events/${id}/certificates` },
  { tab: "sessions",     label: { tr: "Oturumlar",      en: "Sessions"     }, icon: QrCode,       href: (id) => `/admin/events/${id}/sessions` },
  { tab: "email",        label: { tr: "E-posta",        en: "Email"        }, icon: Mail,         href: (id) => `/admin/events/${id}/email-templates` },
  { tab: "editor",       label: { tr: "Editör",         en: "Editor"       }, icon: Palette,      href: (id) => `/admin/events/${id}/editor` },
  { tab: "checkin",      label: { tr: "Check-in",       en: "Check-in"     }, icon: UserCheck,    href: (id) => `/admin/events/${id}/checkin` },
  { tab: "tickets",      label: { tr: "Biletler",       en: "Tickets"      }, icon: Ticket,       href: (id) => `/admin/events/${id}/tickets` },
  // — overflow tabs (visible in "More" menu) —
  { tab: "analytics",    label: { tr: "Analitik",       en: "Analytics"    }, icon: BarChart3,    href: (id) => `/admin/events/${id}/advanced-analytics` },
  { tab: "surveys",      label: { tr: "Anketler",       en: "Surveys"      }, icon: ClipboardList,href: (id) => `/admin/events/${id}/surveys` },
  { tab: "segments",     label: { tr: "Segmentler",     en: "Segments"     }, icon: ListFilter,   href: (id) => `/admin/events/${id}/segments` },
  { tab: "team",         label: { tr: "Ekip",           en: "Team"         }, icon: UserCog,      href: (id) => `/admin/events/${id}/team` },
  { tab: "gamification", label: { tr: "Oyunlaştırma",   en: "Gamification" }, icon: Target,       href: (id) => `/admin/events/${id}/gamification` },
  { tab: "raffles",      label: { tr: "Çekilişler",     en: "Raffles"      }, icon: Gift,         href: (id) => `/admin/events/${id}/raffles` },
  { tab: "automations",  label: { tr: "Otomasyon",      en: "Automation"   }, icon: Workflow,     href: (id) => `/admin/events/${id}/automations` },
  { tab: "ops",          label: { tr: "Canlı Ops",      en: "Live Ops"     }, icon: Activity,     href: (id) => `/admin/events/${id}/ops` },
  { tab: "settings",     label: { tr: "Ayarlar",        en: "Settings"     }, icon: Settings,     href: (id) => `/admin/events/${id}/settings` },
];

// First N tabs are shown inline; the rest go into the "More" dropdown
const PRIMARY_TAB_COUNT = 8;

const EVENT_META_CACHE = new Map<string, EventOut>();
const EVENT_ACCESS_CACHE = new Map<string, EventAccessOut>();
const EVENT_META_REFRESH_EVENT = "heptacert:event-admin-meta-updated";

const TAB_PERMISSIONS: Partial<Record<EventAdminTab, EventTeamPermission>> = {
  details:       "event:view",
  certificates:  "certificates:write",
  sessions:      "checkin:write",
  attendees:     "attendees:read",
  segments:      "attendees:read",
  team:          "team:manage",
  ops:           "checkin:write",
  checkin:       "checkin:write",
  tickets:       "checkin:write",
  gamification:  "settings:write",
  raffles:       "settings:write",
  surveys:       "settings:write",
  analytics:     "analytics:read",
  editor:        "certificates:write",
  email:         "email:write",
  automations:   "email:write",
  settings:      "settings:write",
};

export function refreshEventAdminMeta(eventId?: string | number) {
  if (typeof window === "undefined") return;
  if (eventId !== undefined && eventId !== null) {
    EVENT_META_CACHE.delete(String(eventId));
  } else {
    EVENT_META_CACHE.clear();
  }
  window.dispatchEvent(
    new CustomEvent(EVENT_META_REFRESH_EVENT, {
      detail: { eventId: eventId !== undefined && eventId !== null ? String(eventId) : null },
    }),
  );
}

function isNavItemEnabled(item: NavItem, event: EventOut | null) {
  if (item.tab === "tickets") return event?.ticketing_enabled === true;
  if (!event) {
    return !["certificates", "editor", "sessions", "ops", "checkin", "raffles", "gamification"].includes(item.tab);
  }
  if (event.certificate_enabled === false && (item.tab === "certificates" || item.tab === "editor")) return false;
  if (event.checkin_enabled === false && (item.tab === "sessions" || item.tab === "ops" || item.tab === "checkin")) return false;
  if (item.tab === "raffles" && event.raffles_enabled !== true) return false;
  if (item.tab === "gamification" && event.gamification_enabled !== true) return false;
  return true;
}

type EventAdminNavProps = {
  eventId: string | number;
  active?: EventAdminTab;
  eventName?: string;
  className?: string;
  variant?: "inline" | "sidebar";
  forceVisible?: boolean;
};

const EventAdminLayoutContext = createContext<{ hideInlineNav: boolean }>({ hideInlineNav: false });

export function EventAdminLayoutProvider({
  hideInlineNav,
  children,
}: {
  hideInlineNav: boolean;
  children: ReactNode;
}) {
  return <EventAdminLayoutContext.Provider value={{ hideInlineNav }}>{children}</EventAdminLayoutContext.Provider>;
}

function getActiveFromPath(pathname: string): EventAdminTab {
  if (pathname.includes("/certificates"))       return "certificates";
  if (pathname.includes("/sessions"))           return "sessions";
  if (pathname.includes("/attendees"))          return "attendees";
  if (pathname.includes("/segments"))           return "segments";
  if (pathname.includes("/team"))               return "team";
  if (pathname.includes("/tickets"))            return "tickets";
  if (pathname.includes("/ops"))                return "ops";
  if (pathname.includes("/checkin"))            return "checkin";
  if (pathname.includes("/gamification"))       return "gamification";
  if (pathname.includes("/raffles"))            return "raffles";
  if (pathname.includes("/surveys"))            return "surveys";
  if (pathname.includes("/advanced-analytics") || pathname.includes("/analytics")) return "analytics";
  if (pathname.includes("/editor") || pathname.includes("/preview") || pathname.includes("/qr-present")) return "editor";
  if (pathname.includes("/email-templates") || pathname.includes("/bulk-emails") || pathname.includes("/schedule-email")) return "email";
  if (pathname.includes("/automations"))        return "automations";
  if (pathname.includes("/settings"))           return "settings";
  return "details";
}

export default function EventAdminNav({
  eventId,
  active,
  eventName,
  className,
  variant = "inline",
  forceVisible = false,
}: EventAdminNavProps) {
  const { lang } = useI18n();
  const pathname = usePathname() || "";
  const router = useRouter();
  const { hideInlineNav } = useContext(EventAdminLayoutContext);
  const resolvedActive = active ?? getActiveFromPath(pathname);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLDivElement | null>(null);
  const mobileMoreRef = useRef<HTMLDivElement | null>(null);
  const cacheKey = String(eventId);

  const [eventMeta, setEventMeta] = useState<EventOut | null>(() => EVENT_META_CACHE.get(cacheKey) ?? null);
  const [eventAccess, setEventAccess] = useState<EventAccessOut | null>(() => EVENT_ACCESS_CACHE.get(cacheKey) ?? null);
  const [loadingEventMeta, setLoadingEventMeta] = useState(() => !EVENT_META_CACHE.has(cacheKey) || !EVENT_ACCESS_CACHE.has(cacheKey));
  const [moreOpen, setMoreOpen] = useState(false);

  const visibleNavItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (!isNavItemEnabled(item, eventMeta)) return false;
        if (!eventAccess) return false;
        const required = TAB_PERMISSIONS[item.tab];
        return !required || eventAccess.permissions.includes(required);
      }),
    [eventAccess, eventMeta],
  );

  const primaryItems = visibleNavItems.slice(0, PRIMARY_TAB_COUNT);
  const overflowItems = visibleNavItems.slice(PRIMARY_TAB_COUNT);
  const activeIsOverflow = overflowItems.some((item) => item.tab === resolvedActive);
  const activeItem = visibleNavItems.find((item) => item.tab === resolvedActive);
  const ActiveIcon = activeItem?.icon;

  const copy = {
    tr: { allEvents: "Tüm Etkinlikler", eventFallback: (id: string | number) => `Etkinlik #${id}`, more: "Daha Fazla" },
    en: { allEvents: "All Events",       eventFallback: (id: string | number) => `Event #${id}`,   more: "More" },
  }[lang];

  useEffect(() => {
    let cancelled = false;
    async function loadEventMeta() {
      const cached = EVENT_META_CACHE.get(cacheKey);
      if (cached) { setEventMeta(cached); } else { setEventMeta(null); setLoadingEventMeta(true); }
      const cachedAccess = EVENT_ACCESS_CACHE.get(cacheKey);
      if (cachedAccess) { setEventAccess(cachedAccess); } else { setEventAccess(null); setLoadingEventMeta(true); }
      try {
        const response = await apiFetch(`/admin/events/${eventId}`);
        const [data, access] = await Promise.all([
          response.json() as Promise<EventOut>,
          getEventAccess(Number(eventId)),
        ]);
        EVENT_META_CACHE.set(cacheKey, data);
        EVENT_ACCESS_CACHE.set(cacheKey, access);
        if (!cancelled) { setEventMeta(data); setEventAccess(access); setLoadingEventMeta(false); }
      } catch {
        if (!cancelled) setLoadingEventMeta(false);
      }
    }
    void loadEventMeta();
    function handleRefresh(event: Event) {
      const customEvent = event as CustomEvent<{ eventId?: string | null }>;
      if (customEvent.detail?.eventId && customEvent.detail.eventId !== cacheKey) return;
      void loadEventMeta();
    }
    window.addEventListener(EVENT_META_REFRESH_EVENT, handleRefresh as EventListener);
    return () => { cancelled = true; window.removeEventListener(EVENT_META_REFRESH_EVENT, handleRefresh as EventListener); };
  }, [cacheKey, eventId]);

  useEffect(() => {
    if (!eventMeta || visibleNavItems.length === 0) return;
    if (visibleNavItems.some((item) => item.tab === resolvedActive)) return;
    router.replace(visibleNavItems[0].href(eventId));
  }, [eventId, eventMeta, resolvedActive, router, visibleNavItems]);

  // Close "More" dropdown on outside click
  useEffect(() => {
    if (!moreOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideDesktop = moreRef.current?.contains(target) ?? false;
      const insideMobile = mobileMoreRef.current?.contains(target) ?? false;
      if (!insideDesktop && !insideMobile) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreOpen]);

  if (hideInlineNav && variant === "inline" && !forceVisible) return null;

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    const container = scrollerRef.current;
    if (!container) return;
    if (container.scrollWidth <= container.clientWidth) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    container.scrollLeft += event.deltaY;
  }

  // ── SIDEBAR VARIANT ──────────────────────────────────────────────────
  if (variant === "sidebar") {
    return (
      <div className={`flex w-full min-w-0 flex-col gap-3 antialiased ${className || ""}`}>
        {/* Back + event info */}
        <div className="rounded-xl border border-surface-200 bg-white p-4 shadow-card">
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-1 text-11 font-semibold uppercase tracking-wider text-surface-400 transition-colors hover:text-surface-900"
          >
            <ChevronLeft className="h-3.5 w-3.5 stroke-[2.5]" />
            {copy.allEvents}
          </Link>
          <div className="mt-3">
            <span className="inline-flex items-center rounded-md border border-surface-150 bg-surface-50 px-2 py-0.5 text-11 font-semibold uppercase tracking-tight text-surface-500">
              {getActiveLabel(resolvedActive, lang)}
            </span>
            <h2 className="mt-1.5 break-words text-sm font-semibold leading-tight text-surface-900">
              {eventName || eventMeta?.name || copy.eventFallback(eventId)}
            </h2>
          </div>
        </div>

        {/* Sidebar nav list */}
        <div className="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-card">
          <div className="p-1.5">
            {loadingEventMeta && !eventMeta ? (
              <NavSkeleton variant="sidebar" />
            ) : (
              visibleNavItems.map(({ tab, label, icon: Icon, href }) => {
                const isAct = resolvedActive === tab;
                return (
                  <Link
                    key={tab}
                    href={href(eventId)}
                    className={`flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isAct
                        ? "bg-surface-100 text-surface-900"
                        : "text-surface-500 hover:bg-surface-50 hover:text-surface-900"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isAct ? "text-surface-700" : "text-surface-400"}`} />
                    <span className="min-w-0 truncate">{label[lang]}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── INLINE VARIANT (horizontal tab bar) ─────────────────────────────
  return (
    <div className={`w-full min-w-0 antialiased ${className || ""}`}>
      <div className="rounded-xl border border-surface-200 bg-white shadow-card">
        {/* Event breadcrumb row */}
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-surface-100 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/admin/events"
              className="inline-flex items-center gap-1 text-11 font-semibold uppercase tracking-wider text-surface-400 transition-colors hover:text-surface-900 shrink-0"
            >
              <ChevronLeft className="h-3.5 w-3.5 stroke-[2.5]" />
              {copy.allEvents}
            </Link>
            <span className="text-surface-200">›</span>
            <span className="truncate text-sm font-medium text-surface-700">
              {eventName || eventMeta?.name || copy.eventFallback(eventId)}
            </span>
          </div>
          {getActiveLabel(resolvedActive, lang) && (
            <span className="shrink-0 rounded-md border border-surface-150 bg-surface-50 px-2 py-0.5 text-11 font-semibold uppercase tracking-wide text-surface-500">
              {getActiveLabel(resolvedActive, lang)}
            </span>
          )}
        </div>

        {/* Tab row — scroll area + "More" button side by side */}
        {!loadingEventMeta && visibleNavItems.length > 0 && (
          <div ref={mobileMoreRef} className="relative flex items-center gap-2 border-b border-surface-100 px-3 py-2 md:hidden">
            {activeItem && (
              <Link
                href={activeItem.href(eventId)}
                className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm font-semibold text-surface-900"
              >
                {ActiveIcon && <ActiveIcon className="h-4 w-4 shrink-0 text-surface-500" />}
                <span className="min-w-0 truncate">{activeItem.label[lang]}</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-semibold text-surface-700 shadow-sm"
            >
              {copy.more}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${moreOpen ? "rotate-180" : ""}`} />
            </button>

            {moreOpen && (
              <div role="menu" className="absolute left-3 right-3 top-full z-50 mt-1 grid grid-cols-2 gap-1 rounded-xl border border-surface-200 bg-white p-2 shadow-float">
                {visibleNavItems.map(({ tab, label, icon: Icon, href }) => {
                  const isAct = resolvedActive === tab;
                  return (
                    <Link
                      key={tab}
                      href={href(eventId)}
                      onClick={() => setMoreOpen(false)}
                      className={`flex min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isAct
                          ? "bg-surface-100 text-surface-900"
                          : "text-surface-600 hover:bg-surface-50 hover:text-surface-900"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-surface-400" />
                      <span className="min-w-0 truncate">{label[lang]}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="hidden items-end md:flex">
          {/* Scrollable primary tabs */}
          <div
            ref={scrollerRef}
            onWheel={handleWheel}
            className="min-w-0 flex-1 overflow-x-auto scrollbar-none px-2"
          >
          {loadingEventMeta && !eventMeta ? (
            <div className="flex gap-1 py-2">
              <NavSkeleton variant="inline" />
            </div>
          ) : (
            <div className="flex items-end gap-0.5">
              {/* Primary tabs */}
              {primaryItems.map(({ tab, label, href }) => {
                const isAct = resolvedActive === tab;
                return (
                  <Link
                    key={tab}
                    href={href(eventId)}
                    className={`relative inline-flex items-center whitespace-nowrap px-3.5 py-3 text-sm font-medium transition-colors ${
                      isAct
                        ? "text-surface-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-surface-900 after:content-['']"
                        : "text-surface-500 hover:text-surface-800"
                    }`}
                  >
                    {label[lang]}
                  </Link>
                );
              })}
            </div>
          )}
          </div>

          {/* "More" dropdown — outside scroll area so it never gets clipped */}
          {overflowItems.length > 0 && !loadingEventMeta && (
            <div ref={moreRef} className="relative shrink-0 border-l border-surface-100 px-1">
              <button
                onClick={() => setMoreOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                aria-label={copy.more}
                className={`inline-flex items-center gap-1 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors ${
                  activeIsOverflow
                    ? "text-surface-900"
                    : "text-surface-500 hover:text-surface-800"
                }`}
              >
                {copy.more}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${moreOpen ? "rotate-180" : ""}`} />
              </button>

              {moreOpen && (
                <div role="menu" className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-surface-200 bg-white py-1 shadow-float">
                      {overflowItems.map(({ tab, label, icon: Icon, href }) => {
                        const isAct = resolvedActive === tab;
                        return (
                          <Link
                            key={tab}
                            href={href(eventId)}
                            onClick={() => setMoreOpen(false)}
                            className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                              isAct
                                ? "bg-surface-100 text-surface-900"
                                : "text-surface-600 hover:bg-surface-50 hover:text-surface-900"
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0 text-surface-400" />
                            {label[lang]}
                          </Link>
                        );
                      })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavSkeleton({ variant }: { variant: "inline" | "sidebar" }) {
  const cls =
    variant === "sidebar"
      ? "h-8 w-full rounded-lg bg-surface-100"
      : "h-8 w-20 rounded-lg bg-surface-100";
  return (
    <div className={`flex w-full ${variant === "sidebar" ? "flex-col gap-1 p-1.5" : "flex-row gap-1 py-2"}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`${cls} animate-pulse`} />
      ))}
    </div>
  );
}

function getActiveLabel(active: EventAdminTab, lang: "tr" | "en") {
  return NAV_ITEMS.find((item) => item.tab === active)?.label[lang] ?? "";
}
