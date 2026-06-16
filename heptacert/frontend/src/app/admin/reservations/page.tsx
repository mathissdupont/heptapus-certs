"use client";

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
import { useI18n } from "@/lib/i18n";

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

  const copy = {
    tr: {
      title: "Rezervasyonlar",
      subtitle: "Salon rezervasyon takvimini yönetin",
      newReservation: "Yeni rezervasyon",
      editReservation: "Rezervasyonu düzenle",
      exportIcs: "Takvimi indir (.ics)",
      venue: "Salon",
      selectVenue: "Salon seç",
      resTitle: "Başlık",
      description: "Açıklama",
      start: "Başlangıç",
      end: "Bitiş",
      save: "Kaydet",
      saving: "Kaydediliyor...",
      cancel: "Vazgeç",
      saved: "Rezervasyon kaydedildi.",
      saveFailed: "Rezervasyon kaydedilemedi.",
      cancelled: "Rezervasyon iptal edildi.",
      cancelFailed: "Rezervasyon iptal edilemedi.",
      loadFailed: "Veriler yüklenemedi.",
      confirmCancel: "Bu rezervasyonu iptal etmek istediğinize emin misiniz?",
      emptyTitle: "Henüz rezervasyon yok",
      emptyBody: "Sağ üstteki butonla ilk rezervasyonu oluşturun.",
      noVenuesTitle: "Önce bir salon ekleyin",
      noVenuesBody: "Rezervasyon oluşturmak için en az bir aktif salon gerekir.",
      titlePh: "Yıllık genel kurul",
      descPh: "Katılımcı sayısı, kurulum notları...",
      unknownVenue: "Bilinmeyen salon",
      connectGoogle: "Google Calendar bağla",
      syncGoogle: "Google çift yönlü sync",
      connectFailed: "Google Calendar bağlantısı başlatılamadı.",
      syncDone: (p: number, n: number, u: number) => `Senkronlandı. Çekilen: ${p}, yeni: ${n}, güncellenen: ${u}.`,
      syncFailed: "Google Calendar senkronu tamamlanamadı.",
    },
    en: {
      title: "Reservations",
      subtitle: "Manage the venue reservation calendar",
      newReservation: "New reservation",
      editReservation: "Edit reservation",
      exportIcs: "Export calendar (.ics)",
      venue: "Venue",
      selectVenue: "Select venue",
      resTitle: "Title",
      description: "Description",
      start: "Start",
      end: "End",
      save: "Save",
      saving: "Saving...",
      cancel: "Cancel",
      saved: "Reservation saved.",
      saveFailed: "Could not save reservation.",
      cancelled: "Reservation cancelled.",
      cancelFailed: "Could not cancel reservation.",
      loadFailed: "Could not load data.",
      confirmCancel: "Are you sure you want to cancel this reservation?",
      emptyTitle: "No reservations yet",
      emptyBody: "Create your first reservation with the button at the top right.",
      noVenuesTitle: "Add a venue first",
      noVenuesBody: "You need at least one active venue to create a reservation.",
      titlePh: "Annual general meeting",
      descPh: "Attendee count, setup notes...",
      unknownVenue: "Unknown venue",
      connectGoogle: "Connect Google Calendar",
      syncGoogle: "Google two-way sync",
      connectFailed: "Could not start Google Calendar connection.",
      syncDone: (p: number, n: number, u: number) => `Synced. Pulled: ${p}, new: ${n}, updated: ${u}.`,
      syncFailed: "Google Calendar sync could not complete.",
    },
  }[lang];

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
    return d.toLocaleString(lang === "tr" ? "tr-TR" : "en-US", {
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
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-700">{copy.start}</label>
              <input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} required className="input-field" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-700">{copy.end}</label>
              <input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} required className="input-field" />
            </div>
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
        <div className="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-card">
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
                  <button onClick={() => cancelReservation(r)} className="btn-ghost px-2.5 py-1.5 text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
