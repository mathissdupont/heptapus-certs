"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useMemo, useState } from "react";
import {
  apiFetch,
  getReservationGoogleCalendarStatus,
  startReservationGoogleCalendarOAuth,
  syncReservationGoogleCalendar,
  type GoogleCalendarReservationStatus,
} from "@/lib/api";
import { CalendarClock, Plus, Trash2, Download, Loader2, Building2, Pencil, X, MapPin, Link2, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/Admin/PageHeader";
import EmptyState from "@/components/Admin/EmptyState";
import DateTimeField from "@/components/Admin/DateTimeField";
import { useI18n, translate } from "@/lib/i18n";

type OrganizationVenue = { id: number; name: string; location: string | null; is_active: boolean };
type Reservation = {
  id: number;
  venue_id: number;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  status: string;
};

const EMPTY_FORM = { venue_id: 0, title: "", description: "", start_at: "", end_at: "" };

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function AdminReservations() {
  const { lang } = useI18n();
  const toast = useToast();

  const [venues, setVenues] = useState<OrganizationVenue[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarReservationStatus | null>(null);

  const copy = { title: translate(lang, "migrated_app_admin_reservations_reservations_3f91a87b"), subtitle: translate(lang, "migrated_app_admin_reservations_manage_the_venue_reservation_calendar_d74fd446"), newReservation: translate(lang, "migrated_app_admin_reservations_new_reservation_e1157b52"), editReservation: translate(lang, "migrated_app_admin_reservations_edit_reservation_f22276b1"), exportIcs: translate(lang, "migrated_app_admin_reservations_export_calendar_ics_a305b947"), venue: translate(lang, "migrated_app_admin_reservations_venue_8deaf354"), selectVenue: translate(lang, "migrated_app_admin_reservations_select_venue_ff0376d8"), resTitle: translate(lang, "migrated_app_admin_reservations_title_55a5a183"), description: translate(lang, "migrated_app_admin_reservations_description_4db8dff5"), start: translate(lang, "migrated_app_admin_reservations_start_18e9752e"), end: translate(lang, "migrated_app_admin_reservations_end_66956ac6"), save: translate(lang, "migrated_app_admin_reservations_save_13c2607c"), saving: translate(lang, "migrated_app_admin_reservations_saving_3e6b9824"), cancel: translate(lang, "migrated_app_admin_reservations_cancel_b077bf06"), saved: translate(lang, "migrated_app_admin_reservations_reservation_saved_4407d711"), saveFailed: translate(lang, "migrated_app_admin_reservations_could_not_save_reservation_30188251"), cancelled: translate(lang, "migrated_app_admin_reservations_reservation_cancelled_f46309c1"), cancelFailed: translate(lang, "migrated_app_admin_reservations_could_not_cancel_reservation_723021bf"), loadFailed: translate(lang, "migrated_app_admin_reservations_could_not_load_data_514340ef"), confirmCancel: translate(lang, "migrated_app_admin_reservations_are_you_sure_you_want_to_cancel_this_reser_c326aeb2"), emptyTitle: translate(lang, "migrated_app_admin_reservations_no_reservations_yet_bbead5f3"), emptyBody: translate(lang, "migrated_app_admin_reservations_create_your_first_reservation_with_the_but_7153d752"), noVenuesTitle: translate(lang, "migrated_app_admin_reservations_add_a_venue_first_ac7680c2"), noVenuesBody: translate(lang, "migrated_app_admin_reservations_you_need_at_least_one_active_venue_to_crea_b1666ec0"), titlePh: translate(lang, "migrated_app_admin_reservations_annual_general_meeting_f63c7a07"), descPh: translate(lang, "migrated_app_admin_reservations_attendee_count_setup_notes_c4ed99e6"), unknownVenue: translate(lang, "migrated_app_admin_reservations_unknown_venue_62abcac8"), connectGoogle: translate(lang, "migrated_app_admin_reservations_connect_google_calendar_72661027"), syncGoogle: translate(lang, "migrated_app_admin_reservations_google_two_way_sync_42a9880c"), connectFailed: translate(lang, "migrated_app_admin_reservations_could_not_start_google_calendar_connection_c4074a1a"), syncDone: (p: number, n: number, u: number) => translate(lang, "migrated_app_admin_reservations_synced_pulled_value0_new_value1_updated_va_948ee043", { value0: p, value1: n, value2: u }), syncFailed: translate(lang, "migrated_app_admin_reservations_google_calendar_sync_could_not_complete_3a2f7fee") };

  const venueName = useMemo(() => {
    const map = new Map<number, OrganizationVenue>();
    venues.forEach((v) => map.set(v.id, v));
    return map;
  }, [venues]);

  async function load() {
    setLoading(true);
    try {
      const [venuesRes, resRes, statusData] = await Promise.all([
        apiFetch("/admin/organization/venues"),
        apiFetch("/admin/organization/venue-reservations"),
        getReservationGoogleCalendarStatus().catch(() => null),
      ]);
      setVenues(((await venuesRes.json()) as OrganizationVenue[]) || []);
      setReservations(((await resRes.json()) as Reservation[]) || []);
      setCalendarStatus(statusData);
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeVenues = venues.filter((v) => v.is_active);

  function openNew() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, venue_id: activeVenues[0]?.id ?? 0 });
    setShowForm(true);
  }

  function openEdit(r: Reservation) {
    setEditingId(r.id);
    setForm({
      venue_id: r.venue_id,
      title: r.title,
      description: r.description || "",
      start_at: toLocalInput(r.start_at),
      end_at: toLocalInput(r.end_at),
    });
    setShowForm(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.venue_id) return;
    setSaving(true);
    try {
      const path = editingId
        ? `/admin/organization/venue-reservations/${editingId}`
        : "/admin/organization/venue-reservations";
      await apiFetch(path, {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify({
          venue_id: form.venue_id,
          title: form.title,
          description: form.description || null,
          start_at: form.start_at,
          end_at: form.end_at,
        }),
      });
      toast.success(copy.saved);
      setShowForm(false);
      await load();
    } catch (error: unknown) {
      // 409 çakışması dahil sunucu mesajını göster
      toast.error((error as { message?: string })?.message || copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function cancelReservation(r: Reservation) {
    if (!window.confirm(copy.confirmCancel)) return;
    try {
      await apiFetch(`/admin/organization/venue-reservations/${r.id}`, { method: "DELETE" });
      toast.success(copy.cancelled);
      await load();
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || copy.cancelFailed);
    }
  }

  async function exportIcs() {
    try {
      const res = await apiFetch("/admin/organization/venue-reservations/calendar.ics");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "venue-reservations.ics";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || copy.loadFailed);
    }
  }

  async function connectGoogleCalendar() {
    try {
      const { authorization_url } = await startReservationGoogleCalendarOAuth("/admin/reservations");
      window.location.href = authorization_url;
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || copy.connectFailed);
    }
  }

  async function syncGoogleCalendar() {
    setSyncing(true);
    try {
      const result = await syncReservationGoogleCalendar();
      toast.success(copy.syncDone(result.pulled, result.pushed, result.updated));
      await load();
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || copy.syncFailed);
    } finally {
      setSyncing(false);
    }
  }

  function fmt(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(localeTag(lang), {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {reservations.length > 0 && (
              <button onClick={exportIcs} className="btn-secondary text-xs">
                <Download className="h-3.5 w-3.5" /> {copy.exportIcs}
              </button>
            )}
            {calendarStatus?.connected ? (
              <button onClick={syncGoogleCalendar} disabled={syncing} className="btn-secondary text-xs">
                {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />} {copy.syncGoogle}
              </button>
            ) : calendarStatus?.configured ? (
              <button onClick={connectGoogleCalendar} className="btn-secondary text-xs">
                <Link2 className="h-3.5 w-3.5" /> {copy.connectGoogle}
              </button>
            ) : null}
            <button onClick={openNew} disabled={activeVenues.length === 0} className="btn-primary">
              <Plus className="h-4 w-4" /> {copy.newReservation}
            </button>
          </div>
        }
      />

      {/* Form */}
      {showForm && (
        <form onSubmit={submit} className="surface-panel p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-surface-900">{editingId ? copy.editReservation : copy.newReservation}</h2>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost p-1.5"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-surface-700">{copy.venue}</label>
              <select value={form.venue_id} onChange={(e) => setForm({ ...form, venue_id: Number(e.target.value) })} required className="input-field">
                <option value={0} disabled>{copy.selectVenue}</option>
                {activeVenues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}{v.location ? ` — ${v.location}` : ""}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-surface-700">{copy.resTitle}</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={2} maxLength={200} className="input-field" placeholder={copy.titlePh} />
            </div>
            <DateTimeField label={copy.start} value={form.start_at} onChange={(start_at) => setForm({ ...form, start_at })} required />
            <DateTimeField label={copy.end} value={form.end_at} min={form.start_at || undefined} onChange={(end_at) => setForm({ ...form, end_at })} required />
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-surface-700">{copy.description}</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} rows={2} className="input-field" placeholder={copy.descPh} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button disabled={saving} className="btn-primary">{saving ? copy.saving : copy.save}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{copy.cancel}</button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-surface-400" /></div>
      ) : activeVenues.length === 0 ? (
        <EmptyState title={copy.noVenuesTitle} description={copy.noVenuesBody} icon={<Building2 className="h-6 w-6" />} />
      ) : reservations.length === 0 ? (
        <EmptyState title={copy.emptyTitle} description={copy.emptyBody} icon={<CalendarClock className="h-6 w-6" />} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-surface-200 bg-raised shadow-card">
          {reservations.map((r, i) => {
            const venue = venueName.get(r.venue_id);
            return (
              <div key={r.id} className={`flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-surface-50 sm:flex-row sm:items-center ${i < reservations.length - 1 ? "border-b border-surface-100" : ""}`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-surface-50 text-surface-400">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-surface-900">{r.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-surface-500">
                    <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {venue?.name || copy.unknownVenue}</span>
                    {venue?.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {venue.location}</span>}
                    <span>{fmt(r.start_at)} → {fmt(r.end_at)}</span>
                  </div>
                  {r.description && <p className="mt-1 line-clamp-1 text-xs text-surface-400">{r.description}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => openEdit(r)} className="btn-ghost px-2.5 py-1.5 text-xs"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => cancelReservation(r)} className="btn-ghost px-2.5 py-1.5 text-xs text-status-danger-content hover:bg-status-danger-bg hover:text-status-danger-content"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
