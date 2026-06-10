"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import EventAdminNav, { EventAdminLayoutProvider } from "@/components/Admin/EventAdminNav";
import { getEventAccess, type EventTeamPermission } from "@/lib/api";
import { Loader2 } from "lucide-react";

type EventAdminLayoutShellProps = {
  eventId: string;
  children: ReactNode;
};

const ROUTE_PERMISSIONS: Array<{ match: string; href: (id: string) => string; permission: EventTeamPermission }> = [
  { match: "/team", href: (id) => `/admin/events/${id}/team`, permission: "team:manage" },
  { match: "/attendees", href: (id) => `/admin/events/${id}/attendees`, permission: "attendees:read" },
  { match: "/segments", href: (id) => `/admin/events/${id}/segments`, permission: "attendees:read" },
  { match: "/tickets", href: (id) => `/admin/events/${id}/tickets`, permission: "checkin:write" },
  { match: "/ops", href: (id) => `/admin/events/${id}/ops`, permission: "checkin:write" },
  { match: "/checkin", href: (id) => `/admin/events/${id}/checkin`, permission: "checkin:write" },
  { match: "/sessions", href: (id) => `/admin/events/${id}/sessions`, permission: "checkin:write" },
  { match: "/certificates", href: (id) => `/admin/events/${id}/certificates`, permission: "certificates:write" },
  { match: "/editor", href: (id) => `/admin/events/${id}/editor`, permission: "certificates:write" },
  { match: "/preview", href: (id) => `/admin/events/${id}/preview`, permission: "certificates:write" },
  { match: "/qr-present", href: (id) => `/admin/events/${id}/qr-present`, permission: "certificates:write" },
  { match: "/email-templates", href: (id) => `/admin/events/${id}/email-templates`, permission: "email:write" },
  { match: "/bulk-emails", href: (id) => `/admin/events/${id}/bulk-emails`, permission: "email:write" },
  { match: "/schedule-email", href: (id) => `/admin/events/${id}/schedule-email`, permission: "email:write" },
  { match: "/automations", href: (id) => `/admin/events/${id}/automations`, permission: "email:write" },
  { match: "/advanced-analytics", href: (id) => `/admin/events/${id}/advanced-analytics`, permission: "analytics:read" },
  { match: "/analytics", href: (id) => `/admin/events/${id}/advanced-analytics`, permission: "analytics:read" },
  { match: "/settings", href: (id) => `/admin/events/${id}/settings`, permission: "settings:write" },
  { match: "/gamification", href: (id) => `/admin/events/${id}/gamification`, permission: "settings:write" },
  { match: "/raffles", href: (id) => `/admin/events/${id}/raffles`, permission: "settings:write" },
  { match: "/surveys", href: (id) => `/admin/events/${id}/surveys`, permission: "settings:write" },
  { match: "/quiz", href: (id) => `/admin/events/${id}/quiz`, permission: "certificates:write" },
  { match: "/cpd", href: (id) => `/admin/events/${id}/cpd`, permission: "settings:write" },
];

function currentRoutePermission(pathname: string): EventTeamPermission {
  const route = ROUTE_PERMISSIONS.find((item) => pathname.includes(item.match));
  return route?.permission ?? "event:view";
}

function firstAllowedHref(eventId: string, permissions: EventTeamPermission[]) {
  if (permissions.includes("event:view")) return `/admin/events/${eventId}`;
  const route = ROUTE_PERMISSIONS.find((item) => permissions.includes(item.permission));
  return route?.href(eventId) ?? "/admin/events";
}

export function EventAdminLayoutShell({ eventId, children }: EventAdminLayoutShellProps) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    
    async function checkAccess() {
      try {
        const access = await getEventAccess(Number(eventId));
        const required = currentRoutePermission(pathname);
        if (!access.permissions.includes(required)) {
          router.replace(firstAllowedHref(eventId, access.permissions));
          return;
        }
        if (!cancelled) {
          setAllowed(true);
          setChecking(false);
        }
      } catch {
        router.replace("/admin/events");
      }
    }
    
    setAllowed(false);
    void checkAccess();
    
    return () => {
      cancelled = true;
    };
  }, [eventId, pathname, router]);

  return (
    <EventAdminLayoutProvider hideInlineNav>
      <div className="w-full flex min-w-0 flex-col gap-4 antialiased text-surface-900">
        {/* Yenilediğimiz Premium Sol Navigasyon Menüsü */}
        <EventAdminNav eventId={eventId} variant="inline" forceVisible />
        
        {/* Güvenlik Onaylı İçerik Slotu */}
        <div className="min-w-0 flex-1">
          {allowed ? (
            children
          ) : checking ? (
            /* Apple Tarzı Kibar Yükleniyor Durumu (Layout Shift Engelleme) */
            <div className="w-full rounded-2xl border border-surface-100 bg-white/40 p-16 flex items-center justify-center shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-surface-400 stroke-[2.5]" />
            </div>
          ) : null}
        </div>
      </div>
    </EventAdminLayoutProvider>
  );
}
