"use client";

import type { ElementType } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Command,
  Gauge,
  Mail,
  QrCode,
  Search,
  Settings,
  Shield,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

type CommandItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: ElementType;
  keywords?: string;
};

function getEventId(pathname: string): string | null {
  const match = pathname.match(/^\/admin\/events\/(\d+)/);
  return match?.[1] || null;
}

export default function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const eventId = getEventId(pathname);

  const copy = {
    tr: {
      button: "Komut paleti",
      placeholder: "Sayfa, işlem veya modül ara...",
      hint: "Ctrl/⌘ K",
      empty: "Eşleşen komut bulunamadı.",
      general: "Genel komutlar",
      event: "Bu etkinlik",
      dashboard: "Dashboard",
      dashboardDesc: "Organizatör özetine git",
      events: "Etkinlikler",
      eventsDesc: "Etkinlik listesini aç",
      email: "E-posta merkezi",
      emailDesc: "Kampanya ve şablonları yönet",
      settings: "Ayarlar",
      settingsDesc: "Sistem ayarlarına git",
      eventHome: "Etkinlik özeti",
      attendees: "Katılımcılar",
      checkin: "Check-in",
      ops: "Canlı operasyon",
      certificates: "Sertifikalar",
      tickets: "Biletler",
      eventSettings: "Etkinlik ayarları",
    },
    en: {
      button: "Command palette",
      placeholder: "Search pages, actions, or modules...",
      hint: "Ctrl/⌘ K",
      empty: "No matching command found.",
      general: "General commands",
      event: "This event",
      dashboard: "Dashboard",
      dashboardDesc: "Open organizer overview",
      events: "Events",
      eventsDesc: "Open event list",
      email: "Email center",
      emailDesc: "Manage campaigns and templates",
      settings: "Settings",
      settingsDesc: "Open system settings",
      eventHome: "Event overview",
      attendees: "Attendees",
      checkin: "Check-in",
      ops: "Live operations",
      certificates: "Certificates",
      tickets: "Tickets",
      eventSettings: "Event settings",
    },
  }[lang];

  const commands = useMemo<CommandItem[]>(() => {
    const base: CommandItem[] = [
      { id: "dashboard", title: copy.dashboard, description: copy.dashboardDesc, href: "/admin/dashboard", icon: Gauge, keywords: "home overview organizer" },
      { id: "events", title: copy.events, description: copy.eventsDesc, href: "/admin/events", icon: CalendarCheck2, keywords: "event etkinlik list create" },
      { id: "email", title: copy.email, description: copy.emailDesc, href: "/admin/email-dashboard", icon: Mail, keywords: "mail campaign template" },
      { id: "settings", title: copy.settings, description: copy.settingsDesc, href: "/admin/settings", icon: Settings, keywords: "config preferences" },
    ];
    if (!eventId) return base;
    return [
      ...base,
      { id: "event-home", title: copy.eventHome, description: `#${eventId}`, href: `/admin/events/${eventId}`, icon: Shield, keywords: "event detail health" },
      { id: "event-attendees", title: copy.attendees, description: `#${eventId}`, href: `/admin/events/${eventId}/attendees`, icon: Users, keywords: "participant registration" },
      { id: "event-checkin", title: copy.checkin, description: `#${eventId}`, href: `/admin/events/${eventId}/checkin`, icon: QrCode, keywords: "qr attendance" },
      { id: "event-ops", title: copy.ops, description: `#${eventId}`, href: `/admin/events/${eventId}/ops`, icon: CheckCircle2, keywords: "live operation" },
      { id: "event-certs", title: copy.certificates, description: `#${eventId}`, href: `/admin/events/${eventId}/certificates`, icon: Shield, keywords: "certificate sertifika" },
      { id: "event-tickets", title: copy.tickets, description: `#${eventId}`, href: `/admin/events/${eventId}/tickets`, icon: Ticket, keywords: "ticket bilet" },
      { id: "event-settings", title: copy.eventSettings, description: `#${eventId}`, href: `/admin/events/${eventId}/settings`, icon: Settings, keywords: "kvkk form consent" },
    ];
  }, [copy, eventId]);

  const filteredCommands = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return commands;
    return commands.filter((item) =>
      `${item.title} ${item.description} ${item.href} ${item.keywords || ""}`.toLowerCase().includes(term)
    );
  }, [commands, query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [pathname]);

  function runCommand(item: CommandItem) {
    setOpen(false);
    setQuery("");
    router.push(item.href);
  }

  return (
    <>
      {/* Tetikleyici Buton: Apple Tarzı İnce Çizgili Üst Arama Çubuğu Elemanı */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-500 shadow-sm transition-all hover:bg-surface-50 hover:text-surface-900 hover:border-gray-300 md:inline-flex"
        aria-label={copy.button}
      >
        <Command className="h-3.5 w-3.5 stroke-[2]" />
        <span className="tracking-tight">{copy.button}</span>
        <kbd className="rounded-md border border-surface-200 bg-surface-50 px-1.5 py-0.5 font-mono text-11 font-medium text-surface-400 tracking-tight">
          {copy.hint}
        </kbd>
      </button>

      {/* Komut Paleti Modalı */}
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-surface-800/25 px-3 pt-16 backdrop-blur-md sm:pt-28">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-surface-200 bg-white/95 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            
            {/* Arama Alanı */}
            <div className="flex items-center gap-3 border-b border-surface-100 px-4 py-3.5">
              <Search className="h-4 w-4 text-surface-400 stroke-[2.5]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.placeholder}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-surface-900 outline-none placeholder:text-surface-400"
              />
              <button 
                type="button" 
                onClick={() => setOpen(false)} 
                className="rounded-lg p-1 text-surface-400 hover:bg-surface-50 hover:text-surface-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Sonuç Listesi */}
            <div className="max-h-[45vh] overflow-y-auto p-1.5">
              {filteredCommands.length === 0 ? (
                <div className="p-8 text-center text-xs font-medium text-surface-400">{copy.empty}</div>
              ) : (
                <div className="space-y-0.5">
                  {filteredCommands.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => runCommand(item)}
                        className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-surface-50 active:bg-surface-100/70"
                      >
                        {/* İkon Yuvası */}
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-surface-100 bg-white text-surface-500 shadow-sm transition group-hover:border-surface-200 group-hover:text-surface-900">
                          <Icon className="h-4 w-4 stroke-[1.8]" />
                        </span>
                        
                        {/* Metin Alanı */}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-surface-800 tracking-tight group-hover:text-surface-900">
                            {item.title}
                          </span>
                          <span className="block truncate text-11 font-medium text-surface-400 mt-0.5">
                            {item.description}
                          </span>
                        </span>
                        
                        {/* Sağ Ok İşareti */}
                        <ArrowRight className="h-3.5 w-3.5 text-gray-300 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-surface-600" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}