"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type WheelEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  LockKeyhole,
  QrCode,
  Users,
  UserCog,
  UserCheck,
  Target,
  Gift,
  BarChart3,
  Mail,
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
  | "team"
  | "checkin"
  | "tickets"
  | "gamification"
  | "raffles"
  | "surveys"
  | "analytics"
  | "editor"
  | "email"
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
  { tab: "team", label: { tr: "Ekip", en: "Team" }, icon: UserCog, href: (id) => `/admin/events/${id}/team` },
  { tab: "tickets", label: { tr: "Biletler", en: "Tickets" }, icon: Ticket, href: (id) => `/admin/events/${id}/tickets` },
  { tab: "checkin", label: { tr: "Check-in", en: "Check-in" }, icon: UserCheck, href: (id) => `/admin/events/${id}/checkin` },
  { tab: "gamification", label: { tr: "Oyunlaştırma", en: "Gamification" }, icon: Target, href: (id) => `/admin/events/${id}/gamification` },
  { tab: "raffles", label: { tr: "Çekilişler", en: "Raffles" }, icon: Gift, href: (id) => `/admin/events/${id}/raffles` },
  { tab: "surveys", label: { tr: "Anketler", en: "Surveys" }, icon: ClipboardList, href: (id) => `/admin/events/${id}/surveys` },
  { tab: "analytics", label: { tr: "İleri Analitik", en: "Advanced Analytics" }, icon: BarChart3, href: (id) => `/admin/events/${id}/advanced-analytics` },
  { tab: "editor", label: { tr: "Editör", en: "Editor" }, icon: Palette, href: (id) => `/admin/events/${id}/editor` },
  { tab: "email", label: { tr: "E-posta", en: "Email" }, icon: Mail, href: (id) => `/admin/events/${id}/email-templates` },
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
  team: "team:manage",
  checkin: "checkin:write",
  tickets: "checkin:write",
  gamification: "settings:write",
  raffles: "settings:write",
  surveys: "settings:write",
  analytics: "analytics:read",
  editor: "certificates:write",
  email: "email:write",
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
    return !["certificates", "editor", "sessions", "checkin", "raffles", "gamification"].includes(item.tab);
  }
  if (event.certificate_enabled === false && (item.tab === "certificates" || item.tab === "editor")) {
    return false;
  }
  if (
    event.checkin_enabled === false &&
    (item.tab === "sessions" || item.tab === "checkin")
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
  if (pathname.includes("/team")) return "team";
  if (pathname.includes("/tickets")) return "tickets";
  if (pathname.includes("/checkin")) return "checkin";
  if (pathname.includes("/gamification")) return "gamification";
  if (pathname.includes("/raffles")) return "raffles";
  if (pathname.includes("/surveys")) return "surveys";
  if (pathname.includes("/advanced-analytics") || pathname.includes("/analytics")) return "analytics";
  if (pathname.includes("/editor") || pathname.includes("/preview") || pathname.includes("/qr-present")) return "editor";
  if (pathname.includes("/email-templates") || pathname.includes("/bulk-emails") || pathname.includes("/schedule-email")) return "email";
  if (pathname.includes("/settings")) return "settings";
  return "details";
}

export default function EventAdminNav({
  eventId,
  active,
  eventName,
  className,
  variant = "inline",
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

  if (hideInlineNav && variant === "inline") {
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

  if (variant === "sidebar") {
    return (
      <div className={className || "space-y-3"}>
        <div className="surface-panel p-4 lg:p-5">
          <Link
            href="/admin/events"
            className="mb-2 flex w-fit items-center gap-1 text-xs font-medium text-surface-400 transition-colors hover:text-surface-600"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {copy.allEvents}
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">
            {getActiveLabel(resolvedActive, lang)}
          </p>
          <p className="mt-1 text-base font-bold leading-snug text-surface-900 lg:text-lg">
            {eventName || eventMeta?.name || copy.eventFallback(eventId)}
          </p>
        </div>

        <div
          ref={scrollerRef}
          onWheel={handleWheel}
          className="scrollbar-polished overflow-x-auto pb-1"
        >
          <div className="flex min-w-max items-center gap-1.5 rounded-lg border border-surface-200 bg-surface-50 p-1.5 lg:min-w-0 lg:flex-wrap">
            {loadingEventMeta && !eventMeta ? (
              <NavSkeleton variant="sidebar" />
            ) : visibleNavItems.map(({ tab, label, icon: Icon, href }) => {
              const isAct = resolvedActive === tab;
              return (
                <Link
                  key={tab}
                  href={href(eventId)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition ${
                    isAct
                      ? "border-brand-300 bg-white text-brand-700 shadow-soft"
                      : "border-transparent bg-transparent text-surface-600 hover:border-surface-200 hover:bg-white hover:text-surface-900"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label[lang]}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className || "mb-6"}>
      <Link href="/admin/events" className="mb-3 flex w-fit items-center gap-1.5 text-xs font-semibold text-surface-500 uppercase tracking-wider transition-colors hover:text-brand-600">
        <ChevronLeft className="h-3.5 w-3.5" />
        {copy.allEvents}
      </Link>
      {(eventName || eventMeta?.name) && <p className="mb-3 text-sm font-bold text-surface-900">{eventName || eventMeta?.name}</p>}
      <div
        ref={scrollerRef}
        onWheel={handleWheel}
        className="scrollbar-polished overflow-x-auto pb-2"
      >
        <div className="flex min-w-max gap-0.5 border-b border-surface-200 lg:min-w-0 lg:flex-wrap lg:gap-1 lg:rounded-lg lg:border lg:bg-surface-50 lg:p-1.5">
          {loadingEventMeta && !eventMeta ? (
            <NavSkeleton variant="inline" />
          ) : visibleNavItems.map(({ tab, label, icon: Icon, href }) => {
            const isAct = resolvedActive === tab;
            return (
              <Link
                key={tab}
                href={href(eventId)}
                className={`group relative flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all lg:px-3.5 ${
                  isAct
                    ? "text-brand-700 bg-brand-50 lg:bg-white lg:border lg:border-brand-200"
                    : "text-surface-600 hover:text-surface-900 hover:bg-surface-100 lg:hover:bg-white lg:hover:border lg:hover:border-surface-200"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                <span className="hidden sm:inline">{label[lang]}</span>
                {isAct && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-t-full lg:hidden" />}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NavSkeleton({ variant }: { variant: "inline" | "sidebar" }) {
  const itemClass =
    variant === "sidebar"
      ? "h-10 w-28 rounded-lg bg-surface-200/70"
      : "h-9 w-10 rounded-lg bg-surface-200/70 sm:w-24";
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className={`${itemClass} animate-pulse`} />
      ))}
    </>
  );
}

function getActiveLabel(active: EventAdminTab, lang: "tr" | "en") {
  return NAV_ITEMS.find((item) => item.tab === active)?.label[lang] ?? "";
}
