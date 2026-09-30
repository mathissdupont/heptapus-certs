"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, getMySubscription, getSelectedOrganizationId, setSelectedOrganizationId } from "@/lib/api";
import { orgRoleLabel, canManageEvents } from "@/lib/orgRoles";
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
import { useI18n, translate, type TranslationKey } from "@/lib/i18n";

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

const EVENT_TYPE_OPTIONS: Array<{ value: EventType; labelKey: TranslationKey }> = [
  { value: "certificate_event", labelKey: "admin_settings_event_certificate" },
  { value: "seminar", labelKey: "admin_settings_event_seminar" },
  { value: "workshop", labelKey: "admin_settings_event_workshop" },
  { value: "conference", labelKey: "admin_settings_event_conference" },
  { value: "concert", labelKey: "admin_settings_event_concert" },
  { value: "training", labelKey: "admin_settings_event_training" },
  { value: "club_event", labelKey: "admin_settings_event_club" },
  { value: "online_event", labelKey: "admin_settings_event_online" },
  { value: "custom", labelKey: "admin_settings_event_custom" },
];

export default function AdminEvents() {
  const { lang, t } = useI18n();
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

  const copy = { title: translate(lang, "migrated_app_admin_events_events_0cf28b30"), subtitle: translate(lang, "migrated_app_admin_events_manage_your_events_and_track_certificate_w_9dfcb7a0"), loadFailed: translate(lang, "migrated_app_admin_events_failed_to_load_data_2407c16b"), renamed: translate(lang, "migrated_app_admin_events_event_renamed_08d8b2ed"), renameFailed: translate(lang, "migrated_app_admin_events_failed_to_rename_event_ac0167a9"), deleted: translate(lang, "migrated_app_admin_events_event_deleted_dbd9ed49"), deleteFailed: translate(lang, "migrated_app_admin_events_failed_to_delete_event_13fe6988"), totalEvents: translate(lang, "migrated_app_admin_events_total_events_8f804d20"), totalCertificates: translate(lang, "migrated_app_admin_events_total_certificates_4c219e82"), planStatus: translate(lang, "migrated_app_admin_events_plan_status_8e80d971"), premium: "Premium", starter: translate(lang, "migrated_app_admin_events_starter_70a3ae58"), balance: translate(lang, "migrated_app_admin_events_balance_b6fe99e2"), newEvent: translate(lang, "migrated_app_admin_events_new_event_e2186dc8"), allEventTypes: translate(lang, "migrated_app_admin_events_all_types_a2808922"), searchPlaceholder: translate(lang, "migrated_app_admin_events_search_events_0b5cff2f"), eventCount: (n: number) => translate(lang, "migrated_app_admin_events_value0_events_e15aff4e", { value0: n }), filteredCount: (n: number, t: number) => translate(lang, "migrated_app_admin_events_value0_of_value1_events_c76fe439", { value0: n, value1: t }), emptyTitle: translate(lang, "migrated_app_admin_events_no_events_yet_b2294c82"), emptyBody: translate(lang, "migrated_app_admin_events_use_the_button_above_to_create_your_first__35f274f0"), searchEmptyTitle: translate(lang, "migrated_app_admin_events_no_events_match_your_search_5e0d0f6e"), searchEmptyBody: translate(lang, "migrated_app_admin_events_clear_the_filter_to_list_all_events_a226f085"), clearFilter: translate(lang, "migrated_app_admin_events_clear_e0d77aa0"), rename: translate(lang, "migrated_app_admin_events_rename_8d2579e9"), eventDetails: translate(lang, "migrated_app_admin_events_event_details_fafaa7b7"), paidPlanRequired: translate(lang, "migrated_app_admin_events_paid_plan_required_71e92672"), copied: translate(lang, "migrated_app_admin_events_copied_7a27e83d"), registerLink: translate(lang, "migrated_app_admin_events_registration_link_518c0a19"), delete: translate(lang, "migrated_app_admin_events_delete_2462ad14"), deleteTitle: translate(lang, "migrated_app_admin_events_delete_event_91fe1687"), deleteDescription: (eventName: string) => translate(lang, "migrated_app_admin_events_are_you_sure_you_want_to_permanently_delet_723c1dcc", { value0: eventName }), superadmin: "Superadmin", certificates: translate(lang, "migrated_app_admin_events_certificates_5c42f5fb"), tickets: translate(lang, "migrated_app_admin_events_tickets_9f10da00"), templateUploaded: translate(lang, "migrated_app_admin_events_template_uploaded_fc409814"), templateMissing: translate(lang, "migrated_app_admin_events_template_missing_f1f7ba22"), organization: translate(lang, "migrated_app_admin_events_organization_dc04f7db"), orgContext: translate(lang, "migrated_app_admin_events_choose_which_organization_owns_these_event_4dcb0190"), ownOrg: translate(lang, "migrated_app_admin_events_my_organization_69d9771f"), noEventAccess: translate(lang, "migrated_app_admin_events_no_event_access_f63fbb93"), noEventPermTitle: translate(lang, "migrated_app_admin_events_you_don_t_have_event_access_in_this_organi_d7ece6ef"), noEventPermBody: translate(lang, "migrated_app_admin_events_in_this_organization_you_can_only_access_t_619a7cff"), switchToOwn: translate(lang, "migrated_app_admin_events_switch_to_my_organization_e82cd9c7") };

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
        // Bu sayfa yalnızca etkinlik yönetme yetkisi olan kurumlar için anlamlı.
        // Saklanan kurum yetkiliyse onu kullan; değilse kullanıcının kendi
        // kurumuna (veya etkinlik yetkili herhangi bir kuruma) otomatik düş —
        // böylece salon-yöneticisi gibi roller "yetki yok" hatasına düşmez.
        const all = contexts || [];
        const eventCapable = all.filter(canManageEvents);
        const selected =
          eventCapable.find((ctx) => String(ctx.id) === stored) ||
          eventCapable.find((ctx) => ctx.owned) ||
          eventCapable[0] ||
          all.find((ctx) => String(ctx.id) === stored) ||
          all[0];
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

  const isPermissionError = !!err && /permission denied|yetki/i.test(err);
  const eventCapableTarget = useMemo(
    () =>
      organizationContexts.find((ctx) => canManageEvents(ctx) && ctx.owned) ||
      organizationContexts.find((ctx) => canManageEvents(ctx)) ||
      null,
    [organizationContexts],
  );

  function switchToEventCapableOrg() {
    if (!eventCapableTarget) return;
    setSelectedOrganizationIdState(String(eventCapableTarget.id));
    setSelectedOrganizationId(eventCapableTarget.id);
    window.location.reload();
  }

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
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-status-warning-border bg-status-warning-bg px-2.5 py-1.5 text-xs font-medium text-status-warning-content">
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
            <p className="text-11 font-semibold uppercase tracking-wider text-surface-400">{copy.organization}</p>
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
            {organizationContexts.map((ctx) => {
              const manageable = canManageEvents(ctx);
              const roleText = ctx.owned ? copy.ownOrg : orgRoleLabel(ctx.role, t);
              return (
                <option key={ctx.id} value={ctx.id} disabled={!manageable}>
                  {ctx.org_name} · {roleText}{manageable ? "" : ` — ${copy.noEventAccess}`}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatCard label={copy.totalEvents} value={events.length} icon={<CalendarRange className="h-4 w-4 stroke-[1.8]" />} />
        <StatCard label={copy.totalCertificates} value={totalCertificates} icon={<ListChecks className="h-4 w-4 stroke-[1.8]" />} iconBg="bg-status-success-bg border border-status-success-border text-status-success-content" />
        <StatCard label={copy.planStatus} value={hasPaidPlan ? copy.premium : copy.starter} icon={<Sparkles className="h-4 w-4 stroke-[1.8]" />} iconBg="bg-status-warning-bg border border-status-warning-border text-status-warning-content" />
        <StatCard label={copy.balance} value={`${me?.heptacoin_balance ?? 0} HC`} icon={<Coins className="h-4 w-4 stroke-[1.8]" />} iconBg="bg-status-info-bg border border-status-info-border text-status-info-content" />
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
            <option key={opt.value} value={opt.value}>{translate(lang, opt.labelKey)}</option>
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
            {isPermissionError ? (
              <div className="flex items-start gap-3 rounded-xl border border-status-warning-border bg-status-warning-bg p-4">
                <Shield className="h-5 w-5 shrink-0 text-status-warning-content" />
                <div className="text-sm">
                  <p className="font-medium text-status-warning-content">{copy.noEventPermTitle}</p>
                  <p className="mt-0.5 text-status-warning-content/90">{copy.noEventPermBody}</p>
                  {eventCapableTarget && (
                    <button onClick={switchToEventCapableOrg} className="btn-secondary mt-2.5 text-xs">
                      {copy.switchToOwn}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="error-banner">
                <AlertCircle className="h-4 w-4 shrink-0" /> {err}
              </div>
            )}
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
        <div className="overflow-hidden rounded-xl border border-surface-200 bg-raised shadow-card">
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
                    <button onClick={() => saveRename(ev.id)} className="rounded-lg bg-status-success-bg p-1.5 text-status-success-content transition-colors hover:brightness-95">
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
                      <span className="badge-neutral text-11">
                        {(() => {
                          const key = EVENT_TYPE_OPTIONS.find((o) => o.value === (ev.event_type || "certificate_event"))?.labelKey;
                          return key ? translate(lang, key) : ev.event_type;
                        })()}
                      </span>
                      {ev.ticketing_enabled && (
                        <span className="inline-flex items-center rounded-full border border-status-info-border bg-status-info-bg px-2 py-0.5 text-11 font-medium text-status-info-content">
                          {copy.tickets}
                        </span>
                      )}
                      {ev.certificate_enabled !== false && (
                        <span className="inline-flex items-center rounded-full border border-status-success-border bg-status-success-bg px-2 py-0.5 text-11 font-medium text-status-success-content">
                          {copy.certificates}
                        </span>
                      )}
                      {ev.template_image_url !== "placeholder" ? (
                        <span className="text-11 text-status-success-content">· {copy.templateUploaded}</span>
                      ) : (
                        <span className="text-11 text-status-danger-content">· {copy.templateMissing}</span>
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
                        <ClipboardCheck className="h-3.5 w-3.5 text-status-success-content" />
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
                    className="btn-ghost px-2.5 py-1.5 text-xs text-status-danger-content hover:bg-status-danger-bg hover:text-status-danger-content"
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
