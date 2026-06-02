"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, getMySubscription, getSelectedOrganizationId, setSelectedOrganizationId } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  LayoutGrid,
  Image as ImageIcon,
  Hash,
  AlertCircle,
  Loader2,
  Shield,
  ListChecks,
  Pencil,
  Coins,
  Zap,
  FolderKanban,
  Trash2,
  Check,
  X,
  Link2,
  ClipboardCheck,
  Search,
  Sparkles,
  CalendarRange,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/Admin/PageHeader";
import DateTimeField from "@/components/Admin/DateTimeField";
import ConfirmModal from "@/components/Admin/ConfirmModal";
import EmptyState from "@/components/Admin/EmptyState";
import { StatCard } from "@/components/Admin/StatCard";
import { useI18n } from "@/lib/i18n";

type EventOut = {
  id: number;
  public_id?: string | null;
  name: string;
  template_image_url: string;
  config: any;
  event_type?: EventType;
  certificate_enabled?: boolean;
  checkin_enabled?: boolean;
  ticketing_enabled?: boolean;
  registration_enabled?: boolean;
  raffles_enabled?: boolean;
  gamification_enabled?: boolean;
};
type MeOut = { id: number; email: string; role: "admin" | "superadmin"; heptacoin_balance: number };
type EventStat = { event_id: number; active: number; total: number };
type EventType = "certificate_event" | "seminar" | "workshop" | "conference" | "concert" | "training" | "club_event" | "online_event" | "custom";
type OrganizationContext = { id: number; org_name: string; role: string; owned: boolean; permissions: string[] };
type OrganizationVenue = { id: number; name: string; capacity?: number | null; location?: string | null; is_active: boolean };

const EVENT_TYPE_OPTIONS: Array<{ value: EventType; label: string }> = [
  { value: "certificate_event", label: "Sertifikalı etkinlik" },
  { value: "seminar", label: "Seminer" },
  { value: "workshop", label: "Workshop" },
  { value: "conference", label: "Konferans" },
  { value: "concert", label: "Konser" },
  { value: "training", label: "Eğitim" },
  { value: "club_event", label: "Kulüp etkinliği" },
  { value: "online_event", label: "Online etkinlik" },
  { value: "custom", label: "Özel etkinlik" },
];

function defaultsForEventType(eventType: EventType) {
  if (eventType === "concert" || eventType === "club_event") {
    return { certificateEnabled: false, checkinEnabled: true, ticketingEnabled: true, registrationEnabled: true, rafflesEnabled: false, gamificationEnabled: false };
  }
  if (eventType === "online_event") {
    return { certificateEnabled: false, checkinEnabled: false, ticketingEnabled: false, registrationEnabled: true, rafflesEnabled: false, gamificationEnabled: false };
  }
  if (eventType === "custom") {
    return { certificateEnabled: false, checkinEnabled: true, ticketingEnabled: false, registrationEnabled: true, rafflesEnabled: false, gamificationEnabled: false };
  }
  return { certificateEnabled: true, checkinEnabled: true, ticketingEnabled: false, registrationEnabled: true, rafflesEnabled: false, gamificationEnabled: false };
}

export default function AdminEvents() {
  const { lang } = useI18n();
  const toast = useToast();
  const [events, setEvents] = useState<EventOut[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeOut | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [certStats, setCertStats] = useState<Record<number, EventStat>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [hasPaidPlan, setHasPaidPlan] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<"all" | EventType>("all");
  const [eventType, setEventType] = useState<EventType>("certificate_event");
  const [certificateEnabled, setCertificateEnabled] = useState(true);
  const [checkinEnabled, setCheckinEnabled] = useState(true);
  const [ticketingEnabled, setTicketingEnabled] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [rafflesEnabled, setRafflesEnabled] = useState(false);
  const [gamificationEnabled, setGamificationEnabled] = useState(false);
  const [organizationContexts, setOrganizationContexts] = useState<OrganizationContext[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState("");
  const [venues, setVenues] = useState<OrganizationVenue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [reserveVenue, setReserveVenue] = useState(false);
  const [reservationStartAt, setReservationStartAt] = useState("");
  const [reservationEndAt, setReservationEndAt] = useState("");

  const copy = {
    tr: {
      title: "Etkinlikler",
      subtitle: "Etkinlikler, oturumlar ve sertifikalar",
      loadFailed: "Yükleme başarısız.",
      created: (nameValue: string) => `"${nameValue}" etkinliği oluşturuldu.`,
      createFailed: "Etkinlik oluşturma işlemi başarısız oldu.",
      renamed: "Etkinlik yeniden adlandırıldı.",
      renameFailed: "Yeniden adlandırma başarısız.",
      deleted: "Etkinlik silindi.",
      deleteFailed: "Silme işlemi başarısız.",
      totalEvents: "Toplam Etkinlik",
      totalCertificates: "Toplam Sertifika",
      planStatus: "Plan Durumu",
      premium: "Premium",
      starter: "Başlangıç",
      balance: "Bakiye",
      flowTitle: "Yeni etkinlik akışı",
      flowBody: "Etkinlik türünü ve aktif modülleri seç; oluşturduktan sonra sadece ilgili ekranlar görünsün.",
      eventNamePlaceholder: "Yeni etkinlik adı...",
      eventType: "Etkinlik Türü",
      allEventTypes: "Tüm Türler",
      features: "Özellikler",
      certificateFeature: "Sertifika",
      checkinFeature: "Check-in / Oturum",
      ticketFeature: "Bilet / Giriş kartı",
      registrationFeature: "Herkese açık kayıt",
      raffleFeature: "Çekiliş",
      gamificationFeature: "Oyunlaştırma",
      newEvent: "Yeni Etkinlik",
      searchLabel: "Etkinliklerde Ara",
      searchPlaceholder: "Ad veya ID ile ara",
      allEventsVisible: (count: number) => `${count} etkinlik görüntüleniyor.`,
      filteredEvents: (count: number) => `${count} etkinlik filtreye uyuyor.`,
      activeEvents: "Aktif Etkinlikler",
      eventCount: (count: number) => `${count} Etkinlik`,
      emptyTitle: "Henüz Etkinlik Yok",
      emptyBody: "Yukarıdaki formu kullanarak ilk sertifika etkinliğinizi oluşturun.",
      searchEmptyTitle: "Aramaya uyan etkinlik bulunamadı",
      searchEmptyBody: "Arama terimini temizleyerek tüm etkinlikleri yeniden listeleyebilirsin.",
      clearFilter: "Filtreyi Temizle",
      id: "ID",
      template: "Şablon",
      uploaded: "Yüklendi",
      missing: "Eksik",
      rename: "Yeniden Adlandır",
      eventDetails: "Etkinlik Detayları",
      editor: "Editör",
      certificates: "Sertifikalar",
      sessions: "Oturumlar",
      tickets: "Biletler",
      raffles: "Çekilişler",
      gamification: "Oyunlaştırma",
      paidPlanRequired: "Pro veya Enterprise plan gerekli",
      copied: "Kopyalandı!",
      registerLink: "Kayıt Linki",
      delete: "Sil",
      deleteTitle: "Etkinliği sil",
      deleteDescription: (eventName: string) =>
        `"${eventName}" etkinliğini ve tüm sertifikalarını kalıcı olarak silmek istediğinizden emin misiniz?`,
      superadmin: "Superadmin",
    },
    en: {
      title: "Events",
      subtitle: "Events, sessions, and certificates",
      loadFailed: "Failed to load data.",
      created: (nameValue: string) => `Event "${nameValue}" was created.`,
      createFailed: "Failed to create event.",
      renamed: "Event renamed.",
      renameFailed: "Failed to rename event.",
      deleted: "Event deleted.",
      deleteFailed: "Failed to delete event.",
      totalEvents: "Total Events",
      totalCertificates: "Total Certificates",
      planStatus: "Plan Status",
      premium: "Premium",
      starter: "Starter",
      balance: "Balance",
      flowTitle: "New event flow",
      flowBody: "Choose the event type and active modules; only relevant screens will appear after creation.",
      eventNamePlaceholder: "New event name...",
      eventType: "Event Type",
      allEventTypes: "All Types",
      features: "Features",
      certificateFeature: "Certificate",
      checkinFeature: "Check-in / Sessions",
      ticketFeature: "Ticket / Pass",
      registrationFeature: "Public registration",
      raffleFeature: "Raffle",
      gamificationFeature: "Gamification",
      newEvent: "New Event",
      searchLabel: "Search Events",
      searchPlaceholder: "Search by name or ID",
      allEventsVisible: (count: number) => `${count} events displayed.`,
      filteredEvents: (count: number) => `${count} events match the filter.`,
      activeEvents: "Active Events",
      eventCount: (count: number) => `${count} Events`,
      emptyTitle: "No Events Yet",
      emptyBody: "Use the form above to create your first certificate event.",
      searchEmptyTitle: "No events match your search",
      searchEmptyBody: "Clear the search term to list all events again.",
      clearFilter: "Clear Filter",
      id: "ID",
      template: "Template",
      uploaded: "Uploaded",
      missing: "Missing",
      rename: "Rename",
      eventDetails: "Event Details",
      editor: "Editor",
      certificates: "Certificates",
      sessions: "Sessions",
      tickets: "Tickets",
      raffles: "Raffles",
      gamification: "Gamification",
      paidPlanRequired: "Pro or Enterprise plan required",
      copied: "Copied!",
      registerLink: "Registration Link",
      delete: "Delete",
      deleteTitle: "Delete event",
      deleteDescription: (eventName: string) =>
        `Are you sure you want to permanently delete "${eventName}" and all of its certificates?`,
      superadmin: "Superadmin",
    },
  }[lang];

  function copyRegisterLink(id: number, publicId?: string | null) {
    const routeId = publicId || String(id);
    const url = `${window.location.origin}/events/${routeId}/register`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  const router = useRouter();

  function applyEventTypeDefaults(nextType: EventType) {
    const defaults = defaultsForEventType(nextType);
    setEventType(nextType);
    setCertificateEnabled(defaults.certificateEnabled);
    setCheckinEnabled(defaults.checkinEnabled);
    setTicketingEnabled(defaults.ticketingEnabled);
    setRegistrationEnabled(defaults.registrationEnabled);
    setRafflesEnabled(defaults.rafflesEnabled);
    setGamificationEnabled(defaults.gamificationEnabled);
  }

  async function load() {
    setErr(null);
    try {
      const contextsRes = await apiFetch("/admin/organization/contexts", { method: "GET" }).catch(() => null);
      if (contextsRes) {
        const contexts = (await contextsRes.json()) as OrganizationContext[];
        setOrganizationContexts(contexts || []);
        const stored = getSelectedOrganizationId();
        const selected = (contexts || []).find((ctx) => String(ctx.id) === stored) || contexts?.[0];
        if (selected) {
          setSelectedOrganizationIdState(String(selected.id));
          setSelectedOrganizationId(selected.id);
        }
      }

      const [eventsRes, meRes, venuesRes] = await Promise.all([
        apiFetch("/admin/events", { method: "GET" }),
        apiFetch("/me", { method: "GET" }),
        apiFetch("/admin/organization/venues", { method: "GET" }).catch(() => null),
      ]);
      setEvents(await eventsRes.json());
      const meData = (await meRes.json()) as MeOut;
      setMe(meData);
      if (venuesRes) {
        const venueItems = (await venuesRes.json()) as OrganizationVenue[];
        setVenues((venueItems || []).filter((venue) => venue.is_active));
      } else {
        setVenues([]);
      }
      apiFetch("/admin/dashboard/stats")
        .then((r) => r.json())
        .then((d: { events_with_stats?: EventStat[] }) => {
          const map: Record<number, EventStat> = {};
          (d.events_with_stats || []).forEach((s) => {
            map[s.event_id] = s;
          });
          setCertStats(map);
        })
        .catch(() => {});
      getMySubscription()
        .then((sub) => {
          if (sub.role === "superadmin" || (sub.active && ["pro", "growth", "enterprise"].includes(sub.plan_id ?? ""))) {
            setHasPaidPlan(true);
          }
        })
        .catch(() => {});
    } catch (e: any) {
      const msg = e?.message || "";
      setErr(msg || copy.loadFailed);
      if (msg.toLowerCase().includes("missing") || msg.toLowerCase().includes("invalid")) {
        router.push("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createEvent() {
    if (!name.trim()) return;
    if (reserveVenue && selectedVenueId && (!reservationStartAt || !reservationEndAt)) {
      setErr(lang === "tr" ? "Salon rezervasyonu için başlangıç ve bitiş zamanı gerekir." : "Start and end time are required for venue reservations.");
      return;
    }
    setErr(null);
    setCreating(true);
    try {
      const res = await apiFetch("/admin/events", {
        method: "POST",
        body: JSON.stringify({
          name,
          template_image_url: "placeholder",
          config: { visibility: "unlisted" },
          event_type: eventType,
          certificate_enabled: certificateEnabled,
          checkin_enabled: checkinEnabled,
          ticketing_enabled: ticketingEnabled,
          registration_enabled: registrationEnabled,
          raffles_enabled: rafflesEnabled,
          gamification_enabled: gamificationEnabled,
          organization_venue_id: selectedVenueId ? Number(selectedVenueId) : null,
          auto_reserve_venue: Boolean(reserveVenue && selectedVenueId),
          venue_reservation_start_at: reservationStartAt ? new Date(reservationStartAt).toISOString() : null,
          venue_reservation_end_at: reservationEndAt ? new Date(reservationEndAt).toISOString() : null,
        }),
      });
      const created = await res.json();
      setName("");
      setSelectedVenueId("");
      setReserveVenue(false);
      setReservationStartAt("");
      setReservationEndAt("");
      toast.success(copy.created(created.name));
      await load();
      router.push(`/admin/events/${created.id}`);
    } catch (e: any) {
      setErr(e?.message || copy.createFailed);
    } finally {
      setCreating(false);
    }
  }

  async function saveRename(id: number) {
    if (!renameValue.trim()) return;
    setErr(null);
    try {
      await apiFetch(`/admin/events/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      toast.success(copy.renamed);
      setRenamingId(null);
      await load();
    } catch (e: any) {
      setErr(e?.message || copy.renameFailed);
    }
  }

  async function deleteEvent() {
    if (!deleteTargetId) return;
    setDeleting(true);
    setErr(null);
    try {
      await apiFetch(`/admin/events/${deleteTargetId}`, { method: "DELETE" });
      toast.success(copy.deleted);
      setDeleteTargetId(null);
      await load();
    } catch (e: any) {
      setErr(e?.message || copy.deleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const itemVars = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  };
  const totalCertificates = Object.values(certStats).reduce((sum, stat) => sum + (stat?.total || 0), 0);
  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((event) => {
      if (eventTypeFilter !== "all" && (event.event_type || "certificate_event") !== eventTypeFilter) return false;
      if (!q) return true;
      return [event.name, event.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [eventTypeFilter, events, search]);

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        icon={<LayoutGrid className="h-5 w-5" />}
        actions={
          me ? (
            <div className="flex flex-wrap items-center gap-2">
              {me.heptacoin_balance > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                  <Coins className="h-3.5 w-3.5" /> {me.heptacoin_balance} HC
                </span>
              )}
              {me.role === "superadmin" && (
                <button onClick={() => router.push("/admin/superadmin")} className="btn-secondary gap-2 text-xs">
                  <Shield className="h-3.5 w-3.5" /> {copy.superadmin}
                </button>
              )}
            </div>
          ) : null
        }
      />

      {organizationContexts.length > 0 && (
        <div className="surface-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-surface-400">Organizasyon</p>
            <p className="mt-1 text-sm text-surface-500">
              {lang === "tr" ? "Etkinlikleri hangi kurum adına yönettiğini seç." : "Choose which organization owns these events."}
            </p>
          </div>
          <select
            value={selectedOrganizationId}
            onChange={(event) => {
              const nextId = event.target.value;
              setSelectedOrganizationIdState(nextId);
              setSelectedOrganizationId(nextId || null);
              window.location.reload();
            }}
            className="input-field sm:max-w-xs"
          >
            {organizationContexts.map((ctx) => (
              <option key={ctx.id} value={ctx.id}>
                {ctx.org_name} {ctx.owned ? "(kendi kurumum)" : `(${ctx.role})`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label={copy.totalEvents} value={events.length} icon={<CalendarRange className="h-5 w-5 text-brand-600" />} />
        <StatCard label={copy.totalCertificates} value={totalCertificates} icon={<ListChecks className="h-5 w-5 text-emerald-600" />} iconBg="bg-emerald-50 text-emerald-600" />
        <StatCard label={copy.planStatus} value={hasPaidPlan ? copy.premium : copy.starter} icon={<Sparkles className="h-5 w-5 text-amber-600" />} iconBg="bg-amber-50 text-amber-600" />
        <StatCard label={copy.balance} value={`${me?.heptacoin_balance ?? 0} HC`} icon={<Coins className="h-5 w-5 text-sky-600" />} iconBg="bg-sky-50 text-sky-600" />
      </div>

      <div className="surface-panel overflow-hidden p-5">
        <div className="grid gap-4 lg:grid-cols-[1.25fr,0.95fr]">
          <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white p-3 text-brand-600 shadow-soft">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-surface-900">{copy.flowTitle}</h2>
                <p className="mt-1 text-sm leading-6 text-surface-500">{copy.flowBody}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="relative flex-1">
                <Zap className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  className="input-field pl-10"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createEvent()}
                  placeholder={copy.eventNamePlaceholder}
                />
              </div>
              <select
                value={eventType}
                onChange={(event) => applyEventTypeDefaults(event.target.value as EventType)}
                className="input-field"
                aria-label={copy.eventType}
              >
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [copy.certificateFeature, certificateEnabled, setCertificateEnabled],
                [copy.checkinFeature, checkinEnabled, setCheckinEnabled],
                [copy.ticketFeature, ticketingEnabled, setTicketingEnabled],
                [copy.registrationFeature, registrationEnabled, setRegistrationEnabled],
                [copy.raffleFeature, rafflesEnabled, setRafflesEnabled],
                [copy.gamificationFeature, gamificationEnabled, setGamificationEnabled],
              ].map(([label, enabled, setter]) => {
                const toggle = setter as (updater: (value: boolean) => boolean) => void;
                return (
                  <button
                    key={String(label)}
                    type="button"
                    onClick={() => toggle((value) => !value)}
                    className={`inline-flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      enabled
                        ? "border-brand-200 bg-white text-brand-700"
                        : "border-surface-200 bg-white/60 text-surface-400"
                    }`}
                  >
                    <span>{label as string}</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${enabled ? "bg-brand-500" : "bg-surface-300"}`} />
                  </button>
                );
              })}
            </div>
            {venues.length > 0 && (
              <div className="mt-4 rounded-xl border border-surface-200 bg-white/80 p-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-surface-400">
                      {lang === "tr" ? "Salon" : "Venue"}
                    </label>
                    <select value={selectedVenueId} onChange={(event) => setSelectedVenueId(event.target.value)} className="input-field">
                      <option value="">{lang === "tr" ? "Salon seçme" : "No venue"}</option>
                      {venues.map((venue) => (
                        <option key={venue.id} value={venue.id}>
                          {venue.name}{venue.capacity ? ` - ${venue.capacity} kişi` : ""}{venue.location ? ` - ${venue.location}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <DateTimeField
                    value={reservationStartAt}
                    onChange={setReservationStartAt}
                    label={lang === "tr" ? "Başlangıç" : "Start"}
                    disabled={!selectedVenueId}
                    locale={lang === "tr" ? "tr-TR" : "en-US"}
                  />
                  <DateTimeField
                    value={reservationEndAt}
                    onChange={setReservationEndAt}
                    label={lang === "tr" ? "Bitiş" : "End"}
                    disabled={!selectedVenueId}
                    locale={lang === "tr" ? "tr-TR" : "en-US"}
                  />
                </div>
                <label className="mt-3 flex items-start gap-2 text-sm font-semibold text-surface-700">
                  <input
                    type="checkbox"
                    checked={reserveVenue}
                    onChange={(event) => setReserveVenue(event.target.checked)}
                    disabled={!selectedVenueId}
                    className="mt-1 h-4 w-4 accent-brand-600"
                  />
                  <span>{lang === "tr" ? "Salon uygunsa otomatik rezervasyon oluştur" : "Automatically reserve this venue if available"}</span>
                </label>
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <button onClick={createEvent} disabled={!name.trim() || creating} className="btn-primary gap-2 px-6">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {copy.newEvent}
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-surface-200 bg-surface-50/80 p-5">
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-surface-400">
              {copy.searchLabel}
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                className="input-field pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={copy.searchPlaceholder}
              />
            </div>
            <p className="mt-3 text-sm text-surface-500">
              {filteredEvents.length === events.length
                ? copy.allEventsVisible(events.length)
                : copy.filteredEvents(filteredEvents.length)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEventTypeFilter("all")}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${eventTypeFilter === "all" ? "border-brand-200 bg-brand-50 text-brand-700" : "border-surface-200 bg-white text-surface-500 hover:text-surface-800"}`}
              >
                {copy.allEventTypes}
              </button>
              {EVENT_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setEventTypeFilter(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${eventTypeFilter === option.value ? "border-brand-200 bg-brand-50 text-brand-700" : "border-surface-200 bg-white text-surface-500 hover:text-surface-800"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <AnimatePresence>
          {err && (
            <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: "auto", marginTop: 12 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden">
              <div className="error-banner flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {err}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <FolderKanban className="h-4 w-4 text-surface-400" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-surface-400">{copy.activeEvents}</h2>
          <span className="ml-auto rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-bold text-surface-500">
            {copy.eventCount(events.length)}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card animate-pulse p-5">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-lg bg-surface-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 rounded bg-surface-100" />
                    <div className="h-3 w-32 rounded bg-surface-100" />
                  </div>
                  <div className="hidden h-8 w-64 rounded-lg bg-surface-100 sm:block" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <motion.div variants={containerVars} initial="hidden" animate="show" className="grid gap-3">
            {events.length === 0 ? (
              <EmptyState title={copy.emptyTitle} description={copy.emptyBody} icon={<FolderKanban className="h-8 w-8" />} />
            ) : filteredEvents.length === 0 ? (
              <EmptyState
                title={copy.searchEmptyTitle}
                description={copy.searchEmptyBody}
                icon={<Search className="h-8 w-8" />}
                action={
                  <button onClick={() => { setSearch(""); setEventTypeFilter("all"); }} className="btn-secondary">
                    {copy.clearFilter}
                  </button>
                }
              />
            ) : (
              filteredEvents.map((ev) => {
                return (
                <motion.div key={ev.id} variants={itemVars}>
                  <div className="group card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-surface-50 text-surface-400 transition-all group-hover:border-brand-100 group-hover:bg-brand-50 group-hover:text-brand-600">
                          <ImageIcon className="h-5 w-5" />
                        </div>

                        {renamingId === ev.id ? (
                          <div className="flex flex-1 items-center gap-2">
                            <input
                              className="input-field flex-1 py-1.5 text-sm"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveRename(ev.id);
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                              autoFocus
                            />
                            <button onClick={() => saveRename(ev.id)} className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 transition-colors hover:bg-emerald-100">
                              <Check className="h-4 w-4" />
                            </button>
                            <button onClick={() => setRenamingId(null)} className="rounded-lg bg-surface-100 p-1.5 text-surface-500 transition-colors hover:bg-surface-200">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-surface-800">{ev.name}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-surface-500">
                              <span className="rounded-full border border-surface-200 bg-surface-50 px-2 py-0.5">
                                {EVENT_TYPE_OPTIONS.find((option) => option.value === (ev.event_type || "certificate_event"))?.label || ev.event_type}
                              </span>
                              {ev.ticketing_enabled ? <span className="rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-sky-700">{copy.tickets}</span> : null}
                              {ev.certificate_enabled !== false ? <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-emerald-700">{copy.certificates}</span> : null}
                            </div>
                            <div className="mt-1.5 flex items-center gap-3 text-[11px] font-medium text-surface-400">
                              <span className="flex items-center gap-1">
                                <Hash className="h-3 w-3" /> {copy.id} {ev.id}
                              </span>
                              <span>·</span>
                              <span>
                                {copy.template}:{" "}
                                {ev.template_image_url !== "placeholder" ? (
                                  <span className="text-emerald-600">{copy.uploaded}</span>
                                ) : (
                                  <span className="text-rose-500">{copy.missing}</span>
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {renamingId !== ev.id && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => {
                              setRenamingId(ev.id);
                              setRenameValue(ev.name);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                          >
                            <Pencil className="h-3.5 w-3.5" /> {copy.rename}
                          </button>
                          <Link href={`/admin/events/${ev.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100">
                            <FolderKanban className="h-3.5 w-3.5" /> {copy.eventDetails}
                          </Link>
                          {hasPaidPlan && (
                            <button onClick={() => copyRegisterLink(ev.id, ev.public_id)} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100">
                              {copiedId === ev.id ? (
                                <>
                                  <ClipboardCheck className="h-3.5 w-3.5" /> {copy.copied}
                                </>
                              ) : (
                                <>
                                  <Link2 className="h-3.5 w-3.5" /> {copy.registerLink}
                                </>
                              )}
                            </button>
                          )}
                          <button onClick={() => setDeleteTargetId(ev.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100">
                            <Trash2 className="h-3.5 w-3.5" /> {copy.delete}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </div>

      <ConfirmModal
        open={deleteTargetId !== null}
        title={copy.deleteTitle}
        description={copy.deleteDescription(events.find((e) => e.id === deleteTargetId)?.name ?? "")}
        danger
        loading={deleting}
        onConfirm={deleteEvent}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
