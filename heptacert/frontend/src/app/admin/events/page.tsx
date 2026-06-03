"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, getMySubscription, getSelectedOrganizationId, setSelectedOrganizationId } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  AlertCircle,
  Shield,
  ListChecks,
  Pencil,
  Coins,
  CalendarRange,
  FolderKanban,
  Trash2,
  Check,
  X,
  Link2,
  ClipboardCheck,
  Search,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/Admin/PageHeader";
import ConfirmModal from "@/components/Admin/ConfirmModal";
import EmptyState from "@/components/Admin/EmptyState";
import { StatCard } from "@/components/Admin/StatCard";
import CreateEventDrawer from "@/components/Admin/CreateEventDrawer";
import { useI18n } from "@/lib/i18n";

type EventOut = {
  id: number;
  public_id?: string | null;
  name: string;
  template_image_url: string;
  config: unknown;
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

const EVENT_TYPE_OPTIONS: Array<{ value: EventType; label: { tr: string; en: string } }> = [
  { value: "certificate_event", label: { tr: "Sertifikalı Etkinlik", en: "Certificate Event" } },
  { value: "seminar", label: { tr: "Seminer", en: "Seminar" } },
  { value: "workshop", label: { tr: "Workshop", en: "Workshop" } },
  { value: "conference", label: { tr: "Konferans", en: "Conference" } },
  { value: "concert", label: { tr: "Konser", en: "Concert" } },
  { value: "training", label: { tr: "Eğitim", en: "Training" } },
  { value: "club_event", label: { tr: "Kulüp Etkinliği", en: "Club Event" } },
  { value: "online_event", label: { tr: "Online Etkinlik", en: "Online Event" } },
  { value: "custom", label: { tr: "Özel Etkinlik", en: "Custom Event" } },
];

export default function AdminEvents() {
  const { lang } = useI18n();
  const toast = useToast();
  const router = useRouter();

  const [events, setEvents] = useState<EventOut[]>([]);
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
  const [search, setSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<"all" | EventType>("all");
  const [organizationContexts, setOrganizationContexts] = useState<OrganizationContext[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState("");
  const [venues, setVenues] = useState<OrganizationVenue[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const copy = {
    tr: {
      title: "Etkinlikler",
      subtitle: "Etkinliklerinizi yönetin ve sertifika süreçlerini takip edin",
      loadFailed: "Yükleme başarısız.",
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
      newEvent: "Yeni Etkinlik",
      allEventTypes: "Tüm Türler",
      searchPlaceholder: "Etkinlik ara...",
      eventCount: (n: number) => `${n} etkinlik`,
      filteredCount: (n: number, t: number) => `${n} / ${t} etkinlik`,
      emptyTitle: "Henüz Etkinlik Yok",
      emptyBody: "İlk etkinliğinizi oluşturmak için sağ üstteki butonu kullanın.",
      searchEmptyTitle: "Aramaya uyan etkinlik bulunamadı",
      searchEmptyBody: "Filtreyi temizleyerek tüm etkinlikleri listeleyin.",
      clearFilter: "Temizle",
      rename: "Yeniden Adlandır",
      eventDetails: "Etkinlik Detayları",
      paidPlanRequired: "Ücretli plan gerekli",
      copied: "Kopyalandı!",
      registerLink: "Kayıt Linki",
      delete: "Sil",
      deleteTitle: "Etkinliği sil",
      deleteDescription: (eventName: string) =>
        `"${eventName}" etkinliğini ve tüm sertifikalarını kalıcı olarak silmek istediğinizden emin misiniz?`,
      superadmin: "Superadmin",
      certificates: "Sertifikalar",
      tickets: "Biletler",
      templateUploaded: "Şablon yüklendi",
      templateMissing: "Şablon eksik",
      organization: "Organizasyon",
      orgContext: "Etkinlikleri hangi kurum adına yönettiğini seç.",
    },
    en: {
      title: "Events",
      subtitle: "Manage your events and track certificate workflows",
      loadFailed: "Failed to load data.",
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
      newEvent: "New Event",
      allEventTypes: "All Types",
      searchPlaceholder: "Search events...",
      eventCount: (n: number) => `${n} events`,
      filteredCount: (n: number, t: number) => `${n} of ${t} events`,
      emptyTitle: "No Events Yet",
      emptyBody: "Use the button above to create your first event.",
      searchEmptyTitle: "No events match your search",
      searchEmptyBody: "Clear the filter to list all events.",
      clearFilter: "Clear",
      rename: "Rename",
      eventDetails: "Event Details",
      paidPlanRequired: "Paid plan required",
      copied: "Copied!",
      registerLink: "Registration Link",
      delete: "Delete",
      deleteTitle: "Delete event",
      deleteDescription: (eventName: string) =>
        `Are you sure you want to permanently delete "${eventName}" and all of its certificates?`,
      superadmin: "Superadmin",
      certificates: "Certificates",
      tickets: "Tickets",
      templateUploaded: "Template uploaded",
      templateMissing: "Template missing",
      organization: "Organization",
      orgContext: "Choose which organization owns these events.",
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
        } else {
          setSelectedOrganizationIdState("");
          setSelectedOrganizationId(null);
        }
      }
      const [eventsRes, meRes, venuesRes] = await Promise.all([
        apiFetch("/admin/events", { method: "GET" }),
        apiFetch("/me", { method: "GET" }),
        apiFetch("/admin/organization/venues", { method: "GET" }).catch(() => null),
      ]);
      setEvents(await eventsRes.json());
      setMe((await meRes.json()) as MeOut);
      if (venuesRes) {
        const venueItems = (await venuesRes.json()) as OrganizationVenue[];
        setVenues((venueItems || []).filter((v) => v.is_active));
      } else {
        setVenues([]);
      }
      apiFetch("/admin/dashboard/stats")
        .then((r) => r.json())
        .then((d: { events_with_stats?: EventStat[] }) => {
          const map: Record<number, EventStat> = {};
          (d.events_with_stats || []).forEach((s) => { map[s.event_id] = s; });
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
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || "";
      setErr(msg || copy.loadFailed);
      if (msg.toLowerCase().includes("missing") || msg.toLowerCase().includes("invalid")) {
        router.push("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    } catch (e: unknown) {
      setErr((e as { message?: string })?.message || copy.renameFailed);
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
    } catch (e: unknown) {
      setErr((e as { message?: string })?.message || copy.deleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  const totalCertificates = Object.values(certStats).reduce((sum, stat) => sum + (stat?.total || 0), 0);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((ev) => {
      if (eventTypeFilter !== "all" && (ev.event_type || "certificate_event") !== eventTypeFilter) return false;
      if (!q) return true;
      return [ev.name, ev.id].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [eventTypeFilter, events, search]);

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {me?.heptacoin_balance !== undefined && me.heptacoin_balance > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
                <Coins className="h-3.5 w-3.5" /> {me.heptacoin_balance} HC
              </span>
            )}
            {me?.role === "superadmin" && (
              <button onClick={() => router.push("/admin/superadmin")} className="btn-secondary text-xs">
                <Shield className="h-3.5 w-3.5" /> {copy.superadmin}
              </button>
            )}
            <button onClick={() => setDrawerOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> {copy.newEvent}
            </button>
          </div>
        }
      />

      {/* Organization context selector */}
      {organizationContexts.length > 1 && (
        <div className="surface-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">{copy.organization}</p>
            <p className="mt-0.5 text-sm text-surface-500">{copy.orgContext}</p>
          </div>
          <select
            value={selectedOrganizationId}
            onChange={(e) => {
              const nextId = e.target.value;
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatCard label={copy.totalEvents} value={events.length} icon={<CalendarRange className="h-4 w-4 stroke-[1.8]" />} />
        <StatCard label={copy.totalCertificates} value={totalCertificates} icon={<ListChecks className="h-4 w-4 stroke-[1.8]" />} iconBg="bg-emerald-50 border border-emerald-100 text-emerald-600" />
        <StatCard label={copy.planStatus} value={hasPaidPlan ? copy.premium : copy.starter} icon={<Sparkles className="h-4 w-4 stroke-[1.8]" />} iconBg="bg-amber-50 border border-amber-100 text-amber-600" />
        <StatCard label={copy.balance} value={`${me?.heptacoin_balance ?? 0} HC`} icon={<Coins className="h-4 w-4 stroke-[1.8]" />} iconBg="bg-sky-50 border border-sky-100 text-sky-600" />
      </div>

      {/* Search + filter toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            className="input-field pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={copy.searchPlaceholder}
          />
        </div>
        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value as "all" | EventType)}
          className="input-field sm:w-52"
        >
          <option value="all">{copy.allEventTypes}</option>
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label[lang]}</option>
          ))}
        </select>
        <span className="shrink-0 text-sm text-surface-400">
          {search || eventTypeFilter !== "all"
            ? copy.filteredCount(filteredEvents.length, events.length)
            : copy.eventCount(events.length)}
        </span>
      </div>

      {/* Error */}
      <AnimatePresence>
        {err && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="error-banner">
              <AlertCircle className="h-4 w-4 shrink-0" /> {err}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse p-4">
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-lg bg-surface-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-surface-100" />
                  <div className="h-3 w-32 rounded bg-surface-100" />
                </div>
                <div className="hidden h-8 w-56 rounded-lg bg-surface-100 sm:block" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title={copy.emptyTitle}
          description={copy.emptyBody}
          icon={<FolderKanban className="h-6 w-6" />}
          action={
            <button onClick={() => setDrawerOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> {copy.newEvent}
            </button>
          }
        />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title={copy.searchEmptyTitle}
          description={copy.searchEmptyBody}
          icon={<Search className="h-6 w-6" />}
          action={
            <button onClick={() => { setSearch(""); setEventTypeFilter("all"); }} className="btn-secondary">
              {copy.clearFilter}
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-card">
          {filteredEvents.map((ev, i) => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className={`group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface-50 sm:flex-row sm:items-center ${
                i < filteredEvents.length - 1 ? "border-b border-surface-100" : ""
              }`}
            >
              {/* Event info */}
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-surface-50 text-surface-400 transition-colors group-hover:border-surface-300">
                  <FolderKanban className="h-4 w-4" />
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
                    <button onClick={() => saveRename(ev.id)} className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100 transition-colors">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setRenamingId(null)} className="rounded-lg bg-surface-100 p-1.5 text-surface-500 hover:bg-surface-200 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-surface-900">{ev.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="badge-neutral text-[10px]">
                        {EVENT_TYPE_OPTIONS.find((o) => o.value === (ev.event_type || "certificate_event"))?.label[lang] || ev.event_type}
                      </span>
                      {ev.ticketing_enabled && (
                        <span className="inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                          {copy.tickets}
                        </span>
                      )}
                      {ev.certificate_enabled !== false && (
                        <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          {copy.certificates}
                        </span>
                      )}
                      {ev.template_image_url !== "placeholder" ? (
                        <span className="text-[10px] text-emerald-600">· {copy.templateUploaded}</span>
                      ) : (
                        <span className="text-[10px] text-rose-500">· {copy.templateMissing}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Row actions */}
              {renamingId !== ev.id && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setRenamingId(ev.id); setRenameValue(ev.name); }}
                    className="btn-ghost px-2.5 py-1.5 text-xs"
                    title={copy.rename}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{copy.rename}</span>
                  </button>

                  {hasPaidPlan && (
                    <button
                      onClick={() => copyRegisterLink(ev.id, ev.public_id)}
                      className="btn-ghost px-2.5 py-1.5 text-xs"
                      title={copy.registerLink}
                    >
                      {copiedId === ev.id ? (
                        <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden lg:inline">
                        {copiedId === ev.id ? copy.copied : copy.registerLink}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => setDeleteTargetId(ev.id)}
                    aria-label={`${copy.delete}: ${ev.name}`}
                    className="btn-ghost px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                    title={copy.delete}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <Link
                    href={`/admin/events/${ev.id}`}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    {copy.eventDetails}
                  </Link>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Create event drawer */}
      <CreateEventDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        venues={venues}
        onCreated={(eventId) => {
          setDrawerOpen(false);
          load();
          router.push(`/admin/events/${eventId}`);
        }}
      />

      {/* Delete confirmation */}
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
