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
import { useI18n } from "@/lib/i18n";

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

type NavItem = {
  tab: EventAdminTab;
  label: { tr: string; en: string };
  icon: React.ElementType;
  href: (id: string | number) => string;
};

const NAV_ITEMS: NavItem[] = [
  { tab: "certificates", label: { tr: "Sertifikalar", en: "Certificates" }, icon: LockKeyhole, href: (id) => `/admin/events/${id}/certificates` },
  { tab: "sessions", label: { tr: "Oturumlar", en: "Sessions" }, icon: QrCode, href: (id) => `/admin/events/${id}/sessions` },
  { tab: "attendees", label: { tr: "Katılımcılar", en: "Attendees" }, icon: Users, href: (id) => `/admin/events/${id}/attendees` },
  { tab: "checkin", label: { tr: "Check-in", en: "Check-in" }, icon: UserCheck, href: (id) => `/admin/events/${id}/checkin` },
  { tab: "gamification", label: { tr: "Gamification", en: "Gamification" }, icon: Target, href: (id) => `/admin/events/${id}/gamification` },
  { tab: "raffles", label: { tr: "Çekilişler", en: "Raffles" }, icon: Gift, href: (id) => `/admin/events/${id}/raffles` },
  { tab: "surveys", label: { tr: "Anketler", en: "Surveys" }, icon: ClipboardList, href: (id) => `/admin/events/${id}/surveys` },
  { tab: "analytics", label: { tr: "İleri Analitik", en: "Advanced Analytics" }, icon: BarChart3, href: (id) => `/admin/events/${id}/advanced-analytics` },
  { tab: "editor", label: { tr: "Editör", en: "Editor" }, icon: Palette, href: (id) => `/admin/events/${id}/editor` },
  { tab: "email", label: { tr: "E-posta", en: "Email" }, icon: Mail, href: (id) => `/admin/events/${id}/email-templates` },
  { tab: "settings", label: { tr: "Ayarlar", en: "Settings" }, icon: Settings, href: (id) => `/admin/events/${id}/settings` },
];

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
  if (pathname.includes("/sessions")) return "sessions";
  if (pathname.includes("/attendees")) return "attendees";
  if (pathname.includes("/checkin")) return "checkin";
  if (pathname.includes("/gamification")) return "gamification";
  if (pathname.includes("/raffles")) return "raffles";
  if (pathname.includes("/surveys")) return "surveys";
  if (pathname.includes("/advanced-analytics") || pathname.includes("/analytics")) return "analytics";
  if (pathname.includes("/editor") || pathname.includes("/preview") || pathname.includes("/qr-present")) return "editor";
  if (pathname.includes("/email-templates") || pathname.includes("/bulk-emails") || pathname.includes("/schedule-email")) return "email";
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
  const { lang } = useI18n();
  const pathname = usePathname() || "";
  const { hideInlineNav } = useContext(EventAdminLayoutContext);
  const resolvedActive = active ?? getActiveFromPath(pathname);
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

  if (hideInlineNav && variant === "inline") {
    return null;
  }

  if (variant === "sidebar") {
    return (
      <div className={className || "space-y-3"}>
        <div className="card p-4 lg:p-5">
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
            {eventName || copy.eventFallback(eventId)}
          </p>
        </div>

        <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-center gap-2">
            {NAV_ITEMS.map(({ tab, label, icon: Icon, href }) => {
              const isAct = resolvedActive === tab;
              return (
                <Link
                  key={tab}
                  href={href(eventId)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isAct
                      ? "border-brand-200 bg-brand-50 text-surface-900 shadow-soft"
                      : "border-surface-200 bg-white text-surface-500 hover:border-surface-300 hover:text-surface-900"
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
      <Link href="/admin/events" className="mb-2 flex w-fit items-center gap-1 text-xs font-medium text-surface-400 transition-colors hover:text-surface-600">
        <ChevronLeft className="h-3.5 w-3.5" />
        {copy.allEvents}
      </Link>
      {eventName && <p className="mb-2 text-xs font-semibold text-surface-700">{eventName}</p>}
      <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-0.5 border-b border-surface-200">
          {NAV_ITEMS.map(({ tab, label, icon: Icon, href }) => {
            const isAct = resolvedActive === tab;
            return (
              <Link
                key={tab}
                href={href(eventId)}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                  isAct
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-surface-500 hover:border-surface-300 hover:text-surface-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label[lang]}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getActiveLabel(active: EventAdminTab, lang: "tr" | "en") {
  return NAV_ITEMS.find((item) => item.tab === active)?.label[lang] ?? "";
}
