"use client";

import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  LockKeyhole,
  QrCode,
  Users,
  UserCheck,
  Target,
  Gift,
  BarChart3,
  Mail,
  Settings,
  Palette,
  ClipboardList,
} from "lucide-react";

type NavItem = {
  tab: EventAdminTab;
  label: string;
  icon: React.ElementType;
  href: (id: string | number) => string;
};

const NAV_ITEMS: NavItem[] = [
  { tab: "certificates", label: "Sertifikalar",  icon: LockKeyhole,  href: (id) => `/admin/events/${id}/certificates` },
  { tab: "sessions",     label: "Oturumlar",      icon: QrCode,       href: (id) => `/admin/events/${id}/sessions` },
  { tab: "attendees",    label: "Katılımcılar",   icon: Users,        href: (id) => `/admin/events/${id}/attendees` },
  { tab: "checkin",      label: "Check-in",       icon: UserCheck,    href: (id) => `/admin/events/${id}/checkin` },
  { tab: "gamification", label: "Gamification",   icon: Target,       href: (id) => `/admin/events/${id}/gamification` },
  { tab: "raffles",      label: "Çekilişler",     icon: Gift,         href: (id) => `/admin/events/${id}/raffles` },
  { tab: "surveys",      label: "Anket",          icon: ClipboardList,href: (id) => `/admin/events/${id}/surveys` },
  { tab: "analytics",    label: "İleri Analitik", icon: BarChart3,    href: (id) => `/admin/events/${id}/advanced-analytics` },
  { tab: "editor",       label: "Editör",         icon: Palette,      href: (id) => `/admin/events/${id}/editor` },
  { tab: "email",        label: "Email",          icon: Mail,         href: (id) => `/admin/events/${id}/email-templates` },
  { tab: "settings",     label: "Ayarlar",        icon: Settings,     href: (id) => `/admin/events/${id}/settings` },
];

type EventAdminTab =
  | "certificates"
  | "sessions"
  | "attendees"
  | "checkin"
  | "gamification"
  | "raffles"
  | "surveys"
  | "analytics"
  | "editor"
  | "email"
  | "settings";

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
  return (
    <EventAdminLayoutContext.Provider value={{ hideInlineNav }}>
      {children}
    </EventAdminLayoutContext.Provider>
  );
}

function getActiveFromPath(pathname: string): EventAdminTab {
  if (pathname.includes("/sessions")) return "sessions";
  if (pathname.includes("/attendees")) return "attendees";
  if (pathname.includes("/checkin")) return "checkin";
  if (pathname.includes("/gamification")) return "gamification";
  if (pathname.includes("/raffles")) return "raffles";
  if (pathname.includes("/surveys")) return "surveys";
  if (pathname.includes("/advanced-analytics") || pathname.includes("/analytics")) return "analytics";
  if (pathname.includes("/editor") || pathname.includes("/preview") || pathname.includes("/qr-present")) return "editor";
  if (
    pathname.includes("/email-templates") ||
    pathname.includes("/bulk-emails") ||
    pathname.includes("/schedule-email")
  )
    return "email";
  if (pathname.includes("/settings")) return "settings";
  return "certificates";
}

export default function EventAdminNav({
  eventId,
  active,
  eventName,
  className,
  variant = "inline",
}: EventAdminNavProps) {
  const pathname = usePathname() || "";
  const { hideInlineNav } = useContext(EventAdminLayoutContext);
  const resolvedActive = active ?? getActiveFromPath(pathname);

  if (hideInlineNav && variant === "inline") {
    return null;
  }

  /* ── Sidebar variant ──────────────────────────────────── */
  if (variant === "sidebar") {
    return (
      <aside
        className={
          className ||
          "h-fit rounded-xl border border-surface-200 bg-white shadow-soft lg:sticky lg:top-6"
        }
      >
        {/* Back + event name */}
        <div className="px-4 py-4 border-b border-surface-100">
          <Link
            href="/admin/events"
            className="mb-1.5 flex items-center gap-1 text-xs font-medium text-surface-400 hover:text-surface-600 transition-colors w-fit"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Tüm Etkinlikler
          </Link>
          <p className="text-xs font-semibold text-surface-900 leading-snug">
            {eventName || `Etkinlik #${eventId}`}
          </p>
        </div>

        {/* Nav items */}
        <nav className="p-2 space-y-0.5">
          {NAV_ITEMS.map(({ tab, label, icon: Icon, href }) => {
            const isAct = resolvedActive === tab;
            return (
              <Link
                key={tab}
                href={href(eventId)}
                className={isAct ? "sidebar-item-active" : "sidebar-item"}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
    );
  }

  /* ── Inline (horizontal tab bar) variant ─────────────── */
  return (
    <div className={className || "mb-6"}>
      <Link
        href="/admin/events"
        className="mb-2 flex items-center gap-1 text-xs font-medium text-surface-400 hover:text-surface-600 transition-colors w-fit"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Tüm Etkinlikler
      </Link>
      {eventName && (
        <p className="mb-2 text-xs font-semibold text-surface-700">{eventName}</p>
      )}
      <div className="flex items-center gap-0.5 flex-wrap border-b border-surface-200">
        {NAV_ITEMS.map(({ tab, label, icon: Icon, href }) => {
          const isAct = resolvedActive === tab;
          return (
            <Link
              key={tab}
              href={href(eventId)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                isAct
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-surface-500 hover:text-surface-800 hover:border-surface-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
