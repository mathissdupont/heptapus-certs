"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type WheelEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
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
  { tab: "details", label: { tr: "Etkinlik Detayları", en: "Event Details" }, icon: FolderKanban, href: (id) => `/admin/events/${id}` },
  { tab: "certificates", label: { tr: "Sertifikalar", en: "Certificates" }, icon: LockKeyhole, href: (id) => `/admin/events/${id}/certificates` },
  { tab: "sessions", label: { tr: "Oturumlar", en: "Sessions" }, icon: QrCode, href: (id) => `/admin/events/${id}/sessions` },
  { tab: "attendees", label: { tr: "Katılımcılar", en: "Attendees" }, icon: Users, href: (id) => `/admin/events/${id}/attendees` },
  { tab: "segments", label: { tr: "Segmentler", en: "Segments" }, icon: ListFilter, href: (id) => `/admin/events/${id}/segments` },
  { tab: "team", label: { tr: "Ekip", en: "Team" }, icon: UserCog, href: (id) => `/admin/events/${id}/team` },
  { tab: "tickets", label: { tr: "Biletler", en: "Tickets" }, icon: Ticket, href: (id) => `/admin/events/${id}/tickets` },
  { tab: "ops", label: { tr: "Canlı Operasyon", en: "Live Ops" }, icon: Activity, href: (id) => `/admin/events/${id}/ops` },
  { tab: "checkin", label: { tr: "Check-in", en: "Check-in" }, icon: UserCheck, href: (id) => `/admin/events/${id}/checkin` },
  { tab: "gamification", label: { tr: "Oyunlaştırma", en: "Gamification" }, icon: Target, href: (id) => `/admin/events/${id}/gamification` },
  { tab: "raffles", label: { tr: "Çekilişler", en: "Raffles" }, icon: Gift, href: (id) => `/admin/events/${id}/raffles` },
  { tab: "surveys", label: { tr: "Anketler", en: "Surveys" }, icon: ClipboardList, href: (id) => `/admin/events/${id}/surveys` },
  { tab: "analytics", label: { tr: "İleri Analitik", en: "Advanced Analytics" }, icon: BarChart3, href: (id) => `/admin/events/${id}/advanced-analytics` },
  { tab: "editor", label: { tr: "Editör", en: "Editor" }, icon: Palette, href: (id) => `/admin/events/${id}/editor` },
  { tab: "email", label: { tr: "E-posta", en: "Email" }, icon: Mail, href: (id) => `/admin/events/${id}/email-templates` },
  { tab: "automations", label: { tr: "Otomasyon", en: "Automation" }, icon: Workflow, href: (id) => `/admin/events/${id}/automations` },
  { tab: "settings", label: { tr: "Ayarlar", en: "Settings" }, icon: Settings, href: (id) => `/admin/events/${id}/settings` },
];

const EVENT_META_CACHE = new Map<string, EventOut>();
const EVENT_ACCESS_CACHE = new Map<string, EventAccessOut>();
const EVENT_META_REFRESH_EVENT = "heptacert:event-admin-meta-updated";

const TAB_PERMISSIONS: Partial<Record<EventAdminTab, EventTeamPermission>> = {
  details: "event:view",
  certificates: "certificates:write",
  sessions: "checkin:write",
  attendees: "attendees:read",
  segments: "attendees:read",
  team: "team:manage",
  ops: "checkin:write",
  checkin: "checkin:write",
  tickets: "checkin:write",
  gamification: "settings:write",
  raffles: "settings:write",
  surveys: "settings:write",
  analytics: "analytics:read",
  editor: "certificates:write",
  email: "email:write",
  automations: "email:write",
  settings: "settings:write",
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
  if (event.certificate_enabled === false && (item.tab === "certificates" || item.tab === "editor")) {
    return false;
  }
  if (
    event.checkin_enabled === false &&
    (item.tab === "sessions" || item.tab === "ops" || item.tab === "checkin")
  ) {
    return false;
  }
  if (item.tab === "raffles" && event.raffles_enabled !== true) {
    return false;
  }
  if (item.tab === "gamification" && event.gamification_enabled !== true) {
    return false;
  }
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
  if (pathname.includes("/certificates")) return "certificates";
  if (pathname.includes("/sessions")) return "sessions";
  if (pathname.includes("/attendees")) return "attendees";
  if (pathname.includes("/segments")) return "segments";
  if (pathname.includes("/team")) return "team";
  if (pathname.includes("/tickets")) return "tickets";
  if (pathname.includes("/ops")) return "ops";
  if (pathname.includes("/checkin")) return "checkin";
  if (pathname.includes("/gamification")) return "gamification";
  if (pathname.includes("/raffles")) return "raffles";
  if (pathname.includes("/surveys")) return "surveys";
  if (pathname.includes("/advanced-analytics") || pathname.includes("/analytics")) return "analytics";
  if (pathname.includes("/editor") || pathname.includes("/preview") || pathname.includes("/qr-present")) return "editor";
  if (pathname.includes("/email-templates") || pathname.includes("/bulk-emails") || pathname.includes("/schedule-email")) return "email";
  if (pathname.includes("/automations")) return "automations";
  if (pathname.includes("/settings")) return "settings";
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
  const cacheKey = String(eventId);
  const [eventMeta, setEventMeta] = useState<EventOut | null>(() => EVENT_META_CACHE.get(cacheKey) ?? null);
  const [eventAccess, setEventAccess] = useState<EventAccessOut | null>(() => EVENT_ACCESS_CACHE.get(cacheKey) ?? null);
  const [loadingEventMeta, setLoadingEventMeta] = useState(() => !EVENT_META_CACHE.has(cacheKey) || !EVENT_ACCESS_CACHE.has(cacheKey));
  
  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => {
      if (!isNavItemEnabled(item, eventMeta)) return false;
      if (!eventAccess) return false;
      const required = TAB_PERMISSIONS[item.tab];
      return !required || eventAccess.permissions.includes(required);
    }),
    [eventAccess, eventMeta],
  );

  const copy = {
    tr: {
      allEvents: "Tüm Etkinlikler",
      eventFallback: (id: string | number) => `Etkinlik #${id}`,
    },
    en: {
      allEvents: "All Events",
      eventFallback: (id: string | number) => `Event #${id}`,
    },
  }[lang];

  useEffect(() => {
    let cancelled = false;
    async function loadEventMeta() {
      const cached = EVENT_META_CACHE.get(cacheKey);
      if (cached) {
        setEventMeta(cached);
      } else {
        setEventMeta(null);
        setLoadingEventMeta(true);
      }
      const cachedAccess = EVENT_ACCESS_CACHE.get(cacheKey);
      if (cachedAccess) {
        setEventAccess(cachedAccess);
      } else {
        setEventAccess(null);
        setLoadingEventMeta(true);
      }

      try {
        const response = await apiFetch(`/admin/events/${eventId}`);
        const [data, access] = await Promise.all([
          response.json() as Promise<EventOut>,
          getEventAccess(Number(eventId)),
        ]);
        EVENT_META_CACHE.set(cacheKey, data);
        EVENT_ACCESS_CACHE.set(cacheKey, access);
        if (!cancelled) {
          setEventMeta(data);
          setEventAccess(access);
          setLoadingEventMeta(false);
        }
      } catch {
        if (!cancelled) {
          setEventMeta(null);
          setLoadingEventMeta(false);
        }
      }
    }

    void loadEventMeta();

    function handleRefresh(event: Event) {
      const customEvent = event as CustomEvent<{ eventId?: string | null }>;
      if (customEvent.detail?.eventId && customEvent.detail.eventId !== cacheKey) {
        return;
      }
      void loadEventMeta();
    }

    window.addEventListener(EVENT_META_REFRESH_EVENT, handleRefresh as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener(EVENT_META_REFRESH_EVENT, handleRefresh as EventListener);
    };
  }, [cacheKey, eventId]);

  useEffect(() => {
    if (!eventMeta || visibleNavItems.length === 0) return;
    if (visibleNavItems.some((item) => item.tab === resolvedActive)) return;
    router.replace(visibleNavItems[0].href(eventId));
  }, [eventId, eventMeta, resolvedActive, router, visibleNavItems]);

  if (hideInlineNav && variant === "inline" && !forceVisible) {
    return null;
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    const container = scrollerRef.current;
    if (!container) return;
    if (container.scrollWidth <= container.clientWidth) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    container.scrollLeft += event.deltaY;
  }

  // ----------------------------------------------------
  // VARIANT: SIDEBAR MODE
  // ----------------------------------------------------
  if (variant === "sidebar") {
    return (
      <div className={`w-full flex min-w-0 flex-col gap-3 antialiased ${className || ""}`}>
        {/* Üst Kart Alanı - Apple Bilgi Bloğu */}
        <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm">
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-900"
          >
            <ChevronLeft className="h-3.5 w-3.5 stroke-[2.5]" />
            {copy.allEvents}
          </Link>
          <div className="mt-3">
            <span className="inline-flex items-center rounded-md bg-gray-50 border border-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 uppercase tracking-tight">
              {getActiveLabel(resolvedActive, lang)}
            </span>
            <h2 className="mt-1.5 break-words text-base font-bold leading-tight text-gray-950 tracking-tight">
              {eventName || eventMeta?.name || copy.eventFallback(eventId)}
            </h2>
          </div>
        </div>

        {/* Buton Navigasyon Listesi */}
        <div
          ref={scrollerRef}
          onWheel={handleWheel}
          className="overflow-x-auto scrollbar-none"
        >
          <div className="flex min-w-max items-center gap-1 rounded-xl border border-gray-200/80 bg-gray-50/50 p-1.5 lg:min-w-0 lg:flex-col lg:items-stretch">
            {loadingEventMeta && !eventMeta ? (
              <NavSkeleton variant="sidebar" />
            ) : visibleNavItems.map(({ tab, label, icon: Icon, href }) => {
              const isAct = resolvedActive === tab;
              return (
                <Link
                  key={tab}
                  href={href(eventId)}
                  className={`inline-flex min-w-0 items-center gap-2.5 rounded-lg px-3.5 py-2 text-xs font-semibold tracking-tight transition-all duration-150 ${
                    isAct
                      ? "bg-white text-gray-950 shadow-sm border border-gray-200/60"
                      : "border border-transparent text-gray-500 hover:text-gray-900 hover:bg-white/60"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isAct ? "text-gray-950 stroke-[2]" : "text-gray-400 stroke-[1.8]"}`} />
                  <span className="min-w-0 truncate">{label[lang]}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // VARIANT: INLINE MODE (Üst Yatay Çubuk)
  // ----------------------------------------------------
  return (
    <div className={`w-full min-w-0 antialiased ${className || ""}`}>
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="mb-2.5 flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/admin/events"
              className="inline-flex w-fit max-w-full items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-900"
            >
              <ChevronLeft className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
              <span className="truncate">{copy.allEvents}</span>
            </Link>
            <h1 className="mt-1 truncate text-sm font-bold tracking-tight text-gray-950 sm:text-base">
              {eventName || eventMeta?.name || copy.eventFallback(eventId)}
            </h1>
          </div>
          {getActiveLabel(resolvedActive, lang) && (
            <span className="inline-flex w-fit max-w-full shrink-0 items-center rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">
              <span className="truncate">{getActiveLabel(resolvedActive, lang)}</span>
            </span>
          )}
        </div>

        <div
          ref={scrollerRef}
          onWheel={handleWheel}
          className="overflow-x-auto scrollbar-none"
        >
        <div className="flex min-w-max gap-1 rounded-xl border border-gray-200/80 bg-gray-50/60 p-1 lg:min-w-0 lg:flex-wrap">
          {loadingEventMeta && !eventMeta ? (
            <NavSkeleton variant="inline" />
          ) : visibleNavItems.map(({ tab, label, icon: Icon, href }) => {
            const isAct = resolvedActive === tab;
            return (
              <Link
                key={tab}
                href={href(eventId)}
                className={`group relative inline-flex max-w-[180px] items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-tight transition-all ${
                  isAct
                    ? "bg-white text-gray-950 shadow-sm border border-gray-200/60"
                    : "border border-transparent text-gray-500 hover:text-gray-900 hover:bg-white/40"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${isAct ? "text-gray-950 stroke-[2]" : "text-gray-400 stroke-[1.8]"}`} />
                <span className="min-w-0 truncate">{label[lang]}</span>
              </Link>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavSkeleton({ variant }: { variant: "inline" | "sidebar" }) {
  const itemClass =
    variant === "sidebar"
      ? "h-8 w-full rounded-lg bg-gray-200/60"
      : "h-7 w-20 rounded-lg bg-gray-200/60";
  return (
    <div className={`w-full flex ${variant === "sidebar" ? "flex-col gap-1" : "flex-row gap-1"}`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className={`${itemClass} animate-pulse`} />
      ))}
    </div>
  );
}

function getActiveLabel(active: EventAdminTab, lang: "tr" | "en") {
  return NAV_ITEMS.find((item) => item.tab === active)?.label[lang] ?? "";
}
