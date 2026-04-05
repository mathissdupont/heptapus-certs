"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  listSessions, createSession, updateSession, deleteSession,
  toggleSession, fetchSessionQr, apiFetch, getMySubscription,
  type SessionOut, type SubscriptionInfo
} from "@/lib/api";
import Link from "next/link";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import {
  Plus, Loader2, Calendar, Clock, MapPin, QrCode, ToggleLeft,
  ToggleRight, Pencil, Trash2, ChevronLeft, Check, X, Download, ExternalLink,
  LockKeyhole, Users, UserCheck, Hash, Link2, ClipboardCheck, ShieldAlert, Sparkles
} from "lucide-react";

function RegisterLinkBanner({ eventId }: { eventId: number }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/events/${eventId}/register` : `/events/${eventId}/register`;

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="mb-6 flex flex-col items-stretch gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 sm:flex-row sm:items-center">
      <Link2 className="w-4 h-4 text-sky-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-sky-700 mb-0.5">Katılımcı Kayıt Linki</p>
        <p className="text-xs text-sky-500 truncate font-mono">{url}</p>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-sky-600 transition hover:text-sky-800 sm:w-auto">
        <ExternalLink className="w-3.5 h-3.5" /> Aç
      </a>
      <button
        onClick={copy}
        className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors sm:w-auto"
        style={copied ? { background: "#d1fae5", borderColor: "#6ee7b7", color: "#065f46" } : { background: "#0ea5e9", borderColor: "#0ea5e9", color: "#fff" }}
      >
        {copied ? <><ClipboardCheck className="w-3.5 h-3.5" /> Kopyalandı!</> : <><Link2 className="w-3.5 h-3.5" /> Kopyala</>}
      </button>
    </div>
  );
}

export default function AdminSessionsPage() {
  const params = useParams();
  const eventId = Number(params?.id);

  const [sessions, setSessions] = useState<SessionOut[]>([]);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planOk, setPlanOk] = useState<boolean | null>(null);

  // Min sessions required
  const [minSessions, setMinSessions] = useState(1);
  const [savingMin, setSavingMin] = useState(false);

  // Create/edit form
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionOut | null>(null);
  const [formName, setFormName] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // QR modal
  const [qrModal, setQrModal] = useState<{ url: string; checkinUrl: string; sessionName: string; sessionId: number } | null>(null);
  const [qrLoading, setQrLoading] = useState<number | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  async function load() {
    try {
      const [sessRes, evRes, subInfo] = await Promise.all([
        listSessions(eventId).catch(() => []),
        apiFetch(`/admin/events/${eventId}`).then((r) => r.json()),
        getMySubscription().catch(() => ({ active: false, plan_id: null, expires_at: null, role: null } as SubscriptionInfo)),
      ]);
      const hasPaidPlan = subInfo.role === "superadmin" || (subInfo.active && ["pro", "growth", "enterprise"].includes(subInfo.plan_id ?? ""));
      setPlanOk(hasPaidPlan);
      setSessions(sessRes);
      setEventName(evRes.name);
      setMinSessions(evRes.min_sessions_required ?? 1);
    } catch (e: any) {
      setError(e.message || "Yükleme başarısız");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (eventId) load(); }, [eventId]);

  function openCreate() {
    setEditingSession(null);
    setFormName(""); setFormDate(""); setFormStart(""); setFormLocation("");
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(s: SessionOut) {
    setEditingSession(s);
    setFormName(s.name);
    setFormDate(s.session_date || "");
    setFormStart(s.session_start || "");
    setFormLocation(s.session_location || "");
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
        session_location: formLocation || undefined,
      };
      if (editingSession) {
        await updateSession(eventId, editingSession.id, data);
      } else {
        await createSession(eventId, data);
      }
      setShowForm(false);
      await load();
    } catch (e: any) {
      setFormError(e.message || "Kayıt başarısız");
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
      setError(e.message || "Kayıt başarısız");
    } finally {
      setSavingMin(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <EventAdminNav eventId={eventId} eventName={eventName} active="sessions" className="mb-6 flex flex-col gap-2" />

        {/* Plan gate */}
        {planOk === false && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-8 text-center mb-6">
            <ShieldAlert className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-800 mb-2">Pro veya Enterprise Plan Gerekli</h2>
            <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
              Oturum yönetimi, QR ile yoklama ve katılım takibi özellikleri sadece Pro ve Enterprise planlarında kullanılabilir.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition text-sm"
            >
              <Sparkles className="w-4 h-4" /> Planı Yükselt
            </Link>
          </div>
        )}

        {planOk !== false && (
          <>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Oturum Yönetimi</h1>
            <p className="text-sm text-gray-500 mt-0.5">{eventName}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link
              href={`/admin/events/${eventId}/attendees`}
              className="btn-secondary justify-center text-sm px-4 py-2 rounded-xl font-semibold"
            >
              Katılımcılar
            </Link>
            <button
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition"
            >
              <Plus className="w-4 h-4" /> Oturum Ekle
            </button>
          </div>
        </div>

        {/* Registration link banner */}
        <RegisterLinkBanner eventId={eventId} />

        {/* Min sessions required setting */}
        <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center">
          <Hash className="w-5 h-5 text-indigo-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800">Sertifika İçin Gereken Minimum Oturum Sayısı</p>
            <p className="text-xs text-gray-400 mt-0.5">Katılımcının sertifika alabilmesi için katılması gereken minimum oturum adedi</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <input
              type="number"
              min={1}
              max={1000}
              value={minSessions}
              onChange={(e) => setMinSessions(Math.max(1, +e.target.value || 1))}
              onBlur={(e) => handleSaveMinSessions(+e.target.value || 1)}
              className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400"
            />
            {savingMin && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
          </div>
        </div>

        {error && (
          <div className="error-banner mb-4">{error}</div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5">
            <h2 className="font-semibold text-gray-800 mb-4">
              {editingSession ? "Oturumu Düzenle" : "Yeni Oturum"}
            </h2>
            <form onSubmit={handleSaveSession} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Oturum Adı *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="örn. Açılış Töreni"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tarih</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Saat</label>
                  <input
                    type="time"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Konum</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Salon A"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              {formError && <p className="text-xs text-red-600">{formError}</p>}
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-xl border hover:bg-gray-50 transition">
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving || !formName.trim()}
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {editingSession ? "Kaydet" : "Ekle"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sessions list */}
        {sessions.length === 0 && !showForm ? (
          <div className="text-center py-16 text-gray-400">
            <QrCode className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Henüz oturum yok</p>
            <p className="text-sm mt-1">İlk oturumu ekleyerek QR ile yoklama almaya başlayın.</p>
            <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
              <Plus className="w-4 h-4" /> Oturum Ekle
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className={`bg-white rounded-2xl border p-4 shadow-sm ${s.is_active ? "border-green-300" : "border-gray-200"}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">{s.name}</span>
                      {s.is_active && (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                          Check-in Açık
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                      {s.session_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(s.session_date).toLocaleDateString("tr-TR")}
                        </span>
                      )}
                      {s.session_start && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {s.session_start}
                        </span>
                      )}
                      {s.session_location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {s.session_location}
                        </span>
                      )}
                      <span className="text-indigo-600 font-medium">{s.attendance_count} kişi katıldı</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 shrink-0">
                    {/* QR */}
                    <button
                      onClick={() => handleShowQr(s)}
                      disabled={qrLoading === s.id}
                      title="QR Göster"
                      className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 transition disabled:opacity-40"
                    >
                      {qrLoading === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                    </button>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(s)}
                      disabled={toggling === s.id}
                      title={s.is_active ? "Check-in kapat" : "Check-in aç"}
                      className={`p-2 rounded-lg transition ${s.is_active ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50"}`}
                    >
                      {toggling === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : s.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEdit(s)}
                      title="Düzenle"
                      className="p-2 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                      title="Sil"
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
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
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-xs w-full text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-gray-800 mb-1">{qrModal.sessionName}</h2>
            <p className="text-xs text-gray-400 mb-4">QR kodu ekranınızda gösterin veya yazdırın</p>
            <img src={qrModal.url} alt="Check-in QR" className="w-48 h-48 mx-auto rounded-xl border" />
            <p className="text-xs text-gray-400 mt-3 break-all">{qrModal.checkinUrl}</p>
            <div className="flex gap-2 mt-4">
              <a
                href={qrModal.url}
                download={`checkin-qr.png`}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-indigo-700 transition"
              >
                <Download className="w-4 h-4" /> İndir
              </a>
              <button
                onClick={() => {
                  window.open(
                    `/admin/events/${eventId}/qr-present?session=${qrModal!.sessionId}&name=${encodeURIComponent(qrModal!.sessionName)}`,
                    "_blank"
                  );
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-700 text-sm font-semibold py-2 rounded-xl hover:bg-gray-50 transition"
              >
                <ExternalLink className="w-4 h-4" /> Sunum
              </button>
            </div>
            <button onClick={() => setQrModal(null)} className="mt-2 w-full text-sm text-gray-400 hover:text-gray-600 py-1 transition">
              Kapat
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

