"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  listSessions, createSession, updateSession, deleteSession,
  toggleSession, fetchSessionQr, apiFetch,
  type SessionOut
} from "@/lib/api";
import Link from "next/link";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import PageHeader from "@/components/Admin/PageHeader";
import DateField from "@/components/Admin/DateField";
import TimeField from "@/components/Admin/TimeField";
import { PlanGateCard, isPlanGateError } from "@/lib/useSubscription";
import { useI18n, useT } from "@/lib/i18n";
import {
  Plus, Loader2, Calendar, Clock, MapPin, QrCode, ToggleLeft,
  ToggleRight, Pencil, Trash2, ChevronLeft, Check, X, Download, ExternalLink,
  LockKeyhole, Users, UserCheck, Hash, Link2, ClipboardCheck, Mic2, Layers
} from "lucide-react";

function RegisterLinkBanner({ eventId }: { eventId: string }) {
  const [copied, setCopied] = useState(false);
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const bannerCopy = {
    label: isTr ? "Katılımcı Kayıt Linki" : "Attendee Registration Link",
    open: isTr ? "Aç" : "Open",
    copy: isTr ? "Kopyala" : "Copy",
    copied: isTr ? "Kopyalandı!" : "Copied!",
  };
  const url = typeof window !== "undefined" ? `${window.location.origin}/events/${eventId}/register` : `/events/${eventId}/register`;

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-3 rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 sm:flex-row sm:items-center">
      <Link2 className="w-4 h-4 text-surface-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-surface-700 mb-0.5">{bannerCopy.label}</p>
        <p className="text-xs text-surface-500 truncate font-mono">{url}</p>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-surface-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-surface-600 transition-colors hover:text-surface-900 sm:w-auto">
        <ExternalLink className="w-3.5 h-3.5" /> {bannerCopy.open}
      </a>
      <button
        onClick={copy}
        className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors sm:w-auto ${
          copied
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-surface-900 bg-surface-900 text-white hover:bg-surface-800"
        }`}
      >
        {copied ? <><ClipboardCheck className="w-3.5 h-3.5" /> {bannerCopy.copied}</> : <><Link2 className="w-3.5 h-3.5" /> {bannerCopy.copy}</>}
      </button>
    </div>
  );
}

export default function AdminSessionsPage() {
  const params = useParams();
  const eventId = Number(params?.id);
  const { lang } = useI18n();
  const t = useT();
  const isTr = lang === "tr";

  const copy = {
    checkinInfra: isTr ? "Check-in altyapısı" : "Check-in infrastructure",
    sessionManagement: isTr ? "Oturum Yönetimi" : "Session Management",
    attendees: isTr ? "Katılımcılar" : "Attendees",
    addSession: isTr ? "Oturum Ekle" : "Add Session",
    minSessionsTitle: isTr ? "Sertifika İçin Gereken Minimum Oturum Sayısı" : "Minimum Sessions Required for Certificate",
    minSessionsDesc: isTr ? "Katılımcının sertifika alabilmesi için katılması gereken minimum oturum adedi" : "Minimum number of sessions an attendee must attend to receive a certificate",
    editSession: isTr ? "Oturumu Düzenle" : "Edit Session",
    newSession: isTr ? "Yeni Oturum" : "New Session",
    sessionName: isTr ? "Oturum Adı *" : "Session Name *",
    date: isTr ? "Tarih" : "Date",
    time: isTr ? "Saat" : "Time",
    location: isTr ? "Konum" : "Location",
    sessionPlaceholder: isTr ? "örn. Açılış Töreni" : "e.g. Opening Ceremony",
    datePlaceholder: isTr ? "Tarih seçin" : "Select date",
    timePlaceholder: isTr ? "Saat seçin" : "Select time",
    locationPlaceholder: isTr ? "Salon A" : "Hall A",
    cancel: isTr ? "İptal" : "Cancel",
    save: isTr ? "Kaydet" : "Save",
    add: isTr ? "Ekle" : "Add",
    noSessions: isTr ? "Henüz oturum yok" : "No sessions yet",
    noSessionsDesc: isTr ? "İlk oturumu ekleyerek QR ile yoklama almaya başlayın." : "Add your first session to start taking attendance with QR.",
    attended: isTr ? "kişi katıldı" : "attended",
    checkinOpen: isTr ? "Check-in Açık" : "Check-in Open",
    showQr: isTr ? "QR Göster" : "Show QR",
    checkinClose: isTr ? "Check-in kapat" : "Close check-in",
    checkinOpenAction: isTr ? "Check-in aç" : "Open check-in",
    edit: isTr ? "Düzenle" : "Edit",
    delete: isTr ? "Sil" : "Delete",
    qrInstructions: isTr ? "QR kodu ekranınızda gösterin veya yazdırın" : "Display or print the QR code on your screen",
    download: isTr ? "İndir" : "Download",
    present: isTr ? "Sunum" : "Present",
    close: isTr ? "Kapat" : "Close",
    loadFailed: isTr ? "Yükleme başarısız" : "Loading failed",
    saveFailed: isTr ? "Kayıt başarısız" : "Save failed",
  };

  const [sessions, setSessions] = useState<SessionOut[]>([]);
  const [eventName, setEventName] = useState("");
  const [eventPublicId, setEventPublicId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planOk, setPlanOk] = useState<boolean | null>(null);
  const [planGateMessage, setPlanGateMessage] = useState<string | null>(null);

  // Min sessions required
  const [minSessions, setMinSessions] = useState(1);
  const [savingMin, setSavingMin] = useState(false);

  // Create/edit form
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionOut | null>(null);
  const [formName, setFormName] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formTrack, setFormTrack] = useState("");
  const [formSpeaker, setFormSpeaker] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // QR modal
  const [qrModal, setQrModal] = useState<{ url: string; checkinUrl: string; sessionName: string; sessionId: number } | null>(null);
  const [qrLoading, setQrLoading] = useState<number | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  async function load() {
    try {
      const [sessRes, evRes] = await Promise.all([
        listSessions(eventId),
        apiFetch(`/admin/events/${eventId}`).then((r) => r.json()),
      ]);
      setPlanOk(true);
      setPlanGateMessage(null);
      setSessions(sessRes);
      setEventName(evRes.name);
      setEventPublicId(evRes.public_id || String(eventId));
      setMinSessions(evRes.min_sessions_required ?? 1);
    } catch (e: any) {
      if (e?.status === 403 && isPlanGateError(e?.message)) {
        setPlanOk(false);
        setPlanGateMessage(e.message);
        setError(null);
        try {
          const evRes = await apiFetch(`/admin/events/${eventId}`).then((r) => r.json());
          setEventName(evRes.name);
          setEventPublicId(evRes.public_id || String(eventId));
        } catch {}
      } else {
        setError(e.message || copy.loadFailed);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (eventId) load(); }, [eventId]);

  function openCreate() {
    setEditingSession(null);
    setFormName(""); setFormDate(""); setFormStart(""); setFormEnd(""); setFormLocation("");
    setFormTrack(""); setFormSpeaker(""); setFormDescription(""); setFormCapacity("");
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(s: SessionOut) {
    setEditingSession(s);
    setFormName(s.name);
    setFormDate(s.session_date || "");
    setFormStart(s.session_start || "");
    setFormEnd(s.session_end || "");
    setFormLocation(s.session_location || "");
    setFormTrack(s.track || "");
    setFormSpeaker(s.speaker_name || "");
    setFormDescription(s.description || "");
    setFormCapacity(s.capacity != null ? String(s.capacity) : "");
    setFormError(null);
    setShowForm(true);
  }

  async function handleSaveSession(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      const data = {
        name: formName.trim(),
        session_date: formDate || undefined,
        session_start: formStart || undefined,
        session_end: formEnd || undefined,
        session_location: formLocation || undefined,
        track: formTrack.trim() || undefined,
        speaker_name: formSpeaker.trim() || undefined,
        description: formDescription.trim() || undefined,
        capacity: formCapacity.trim() === "" ? null : Math.max(0, parseInt(formCapacity, 10) || 0),
      };
      if (editingSession) {
        await updateSession(eventId, editingSession.id, data);
      } else {
        await createSession(eventId, data);
      }
      setShowForm(false);
      await load();
    } catch (e: any) {
      setFormError(e.message || copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(s: SessionOut) {
    setToggling(s.id);
    try {
      const updated = await toggleSession(eventId, s.id);
      setSessions((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(sessionId: number) {
    setDeletingId(sessionId);
    try {
      await deleteSession(eventId, sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleShowQr(s: SessionOut) {
    setQrLoading(s.id);
    try {
      const { blob, checkinUrl } = await fetchSessionQr(eventId, s.id);
      const url = URL.createObjectURL(blob);
      setQrModal({ url, checkinUrl, sessionName: s.name, sessionId: s.id });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setQrLoading(null);
    }
  }

  async function handleSaveMinSessions(val: number) {
    const clamped = Math.max(1, Math.min(val, 1000));
    setMinSessions(clamped);
    setSavingMin(true);
    try {
      await apiFetch(`/admin/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: eventName, min_sessions_required: clamped }),
      });
    } catch (e: any) {
      setError(e.message || copy.saveFailed);
    } finally {
      setSavingMin(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-surface-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="space-y-6">
        <EventAdminNav eventId={eventId} eventName={eventName} active="sessions" className="mb-2" />

        {/* Plan gate */}
        {planOk === false && (
          <PlanGateCard
            feature="Oturum yönetimi, QR ile yoklama ve katılım takibi"
            serverMessage={planGateMessage}
          />
        )}

        {planOk !== false && (
          <>
        <PageHeader
          title={copy.sessionManagement}
          subtitle={eventName}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/admin/events/${eventId}/attendees`} className="btn-secondary text-xs">
                {copy.attendees}
              </Link>
              <button onClick={openCreate} className="btn-primary text-xs">
                <Plus className="h-3.5 w-3.5" /> {copy.addSession}
              </button>
            </div>
          }
        />

        {/* Registration link banner */}
      <RegisterLinkBanner eventId={eventPublicId || String(eventId)} />

        {/* Min sessions required setting */}
        <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <Hash className="w-5 h-5 text-surface-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-surface-900">{copy.minSessionsTitle}</p>
            <p className="mt-0.5 text-xs text-surface-500">{copy.minSessionsDesc}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <input
              type="number"
              min={1}
              max={1000}
              value={minSessions}
              onChange={(e) => setMinSessions(Math.max(1, +e.target.value || 1))}
              onBlur={(e) => handleSaveMinSessions(+e.target.value || 1)}
              className="input-field w-24 text-center font-semibold"
            />
            {savingMin && <Loader2 className="w-4 h-4 animate-spin text-surface-400" />}
          </div>
        </div>

        {error && (
          <div className="error-banner mb-4">{error}</div>
        )}

        {/* Form */}
        {showForm && (
          <div className="card p-5">
            <h2 className="mb-4 font-semibold text-surface-900">
              {editingSession ? copy.editSession : copy.newSession}
            </h2>
            <form onSubmit={handleSaveSession} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">{copy.sessionName}</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={copy.sessionPlaceholder}
                  className="input-field"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DateField
                  label={copy.date}
                  value={formDate}
                  onChange={setFormDate}
                  placeholder={copy.datePlaceholder}
                  locale={isTr ? "tr-TR" : "en-US"}
                />
                <TimeField
                  label={copy.time}
                  value={formStart}
                  onChange={setFormStart}
                  placeholder={copy.timePlaceholder}
                />
                <TimeField
                  label={t("agenda_field_end_time")}
                  value={formEnd}
                  onChange={setFormEnd}
                  placeholder={copy.timePlaceholder}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">{copy.location}</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder={copy.locationPlaceholder}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">{t("agenda_field_track")}</label>
                  <input
                    type="text"
                    value={formTrack}
                    onChange={(e) => setFormTrack(e.target.value)}
                    placeholder={t("agenda_track_placeholder")}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">{t("agenda_field_speaker")}</label>
                  <input
                    type="text"
                    value={formSpeaker}
                    onChange={(e) => setFormSpeaker(e.target.value)}
                    placeholder={t("agenda_speaker_placeholder")}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">{t("agenda_field_capacity")}</label>
                  <input
                    type="number"
                    min={0}
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    placeholder={t("agenda_capacity_placeholder")}
                    className="input-field"
                  />
                  <p className="mt-1 text-11 text-surface-400">{t("agenda_capacity_hint")}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">{t("agenda_field_description")}</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={t("agenda_description_placeholder")}
                  rows={3}
                  className="input-field resize-y"
                />
              </div>
              {formError && <p className="text-xs text-red-600">{formError}</p>}
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary justify-center">
                  {copy.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving || !formName.trim()}
                  className="btn-primary justify-center disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {editingSession ? copy.save : copy.add}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sessions list */}
        {sessions.length === 0 && !showForm ? (
          <div className="card border-dashed p-12 text-center text-surface-500">
            <QrCode className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">{copy.noSessions}</p>
            <p className="text-sm mt-1">{copy.noSessionsDesc}</p>
            <button onClick={openCreate} className="btn-primary mx-auto mt-4">
              <Plus className="w-4 h-4" /> {copy.addSession}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className={`card p-4 ${s.is_active ? "border-emerald-200 bg-emerald-50/30" : ""}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-surface-900">{s.name}</span>
                      {s.is_active && (
                        <span className="badge-active">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block" />
                          {copy.checkinOpen}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-surface-500">
                      {s.session_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(s.session_date).toLocaleDateString(isTr ? "tr-TR" : "en-US")}
                        </span>
                      )}
                      {s.session_start && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {s.session_start}{s.session_end ? `–${s.session_end}` : ""}
                        </span>
                      )}
                      {s.session_location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {s.session_location}
                        </span>
                      )}
                      {s.track && (
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          {s.track}
                        </span>
                      )}
                      {s.speaker_name && (
                        <span className="flex items-center gap-1">
                          <Mic2 className="w-3.5 h-3.5" />
                          {s.speaker_name}
                        </span>
                      )}
                      <span className="text-emerald-600 font-medium">{s.attendance_count} {copy.attended}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 shrink-0">
                    {/* QR */}
                    <button
                      onClick={() => handleShowQr(s)}
                      disabled={qrLoading === s.id}
                      title={copy.showQr}
                      className="p-2 rounded-lg hover:bg-surface-100 text-surface-600 transition disabled:opacity-40"
                    >
                      {qrLoading === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                    </button>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(s)}
                      disabled={toggling === s.id}
                      title={s.is_active ? copy.checkinClose : copy.checkinOpenAction}
                      className={`p-2 rounded-lg transition ${s.is_active ? "text-emerald-600 hover:bg-emerald-50" : "text-surface-400 hover:bg-surface-50"}`}
                    >
                      {toggling === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : s.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEdit(s)}
                      title={copy.edit}
                      className="p-2 rounded-lg hover:bg-surface-50 text-surface-500 hover:text-surface-700 transition"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                      title={copy.delete}
                      className="p-2 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-600 transition"
                    >
                      {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* QR Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setQrModal(null)}>
          <div className="bg-white rounded-2xl shadow-modal p-6 max-w-xs w-full text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-surface-700 mb-1">{qrModal.sessionName}</h2>
            <p className="text-xs text-surface-400 mb-4">{copy.qrInstructions}</p>
            <img src={qrModal.url} alt="Check-in QR" className="w-48 h-48 mx-auto rounded-xl border" />
            <p className="text-xs text-surface-400 mt-3 break-all">{qrModal.checkinUrl}</p>
            <div className="flex gap-2 mt-4">
              <a
                href={qrModal.url}
                download={`checkin-qr.png`}
                className="flex-1 inline-flex items-center justify-center gap-2 btn-primary justify-center text-sm"
              >
                <Download className="w-4 h-4" /> {copy.download}
              </a>
              <button
                onClick={() => {
                  window.open(
                    `/admin/events/${eventId}/qr-present?session=${qrModal!.sessionId}&name=${encodeURIComponent(qrModal!.sessionName)}`,
                    "_blank"
                  );
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 border border-surface-200 text-surface-700 text-sm font-semibold py-2 rounded-xl hover:bg-surface-50 transition"
              >
                <ExternalLink className="w-4 h-4" /> {copy.present}
              </button>
            </div>
            <button onClick={() => setQrModal(null)} className="mt-2 w-full text-sm text-surface-400 hover:text-surface-600 py-1 transition">
              {copy.close}
            </button>
          </div>
        </div>
      )}
          </>
        )}
      </div>
    </div>
  );
}
