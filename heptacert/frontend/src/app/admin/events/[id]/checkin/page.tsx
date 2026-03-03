"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { listSessions, adminManualCheckin, apiFetch, getMySubscription, type SessionOut, type SubscriptionInfo } from "@/lib/api";
import Link from "next/link";
import { ChevronLeft, UserCheck, Loader2, CheckCircle2, XCircle, Search, Users, ToggleLeft, ToggleRight, QrCode, LockKeyhole, Hash, ShieldAlert, Sparkles } from "lucide-react";

interface CheckinEntry {
  email: string;
  name?: string;
  success: boolean;
  message: string;
  time: string;
}

export default function AdminCheckinPage() {
  const params = useParams();
  const eventId = Number(params?.id);

  const [eventName, setEventName] = useState("");
  const [sessions, setSessions] = useState<SessionOut[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [log, setLog] = useState<CheckinEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [planOk, setPlanOk] = useState<boolean | null>(null);

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
      // Auto-select the first active session
      const active = sessRes.find((s: SessionOut) => s.is_active);
      if (active) setSelectedSession(active.id);
      else if (sessRes.length > 0) setSelectedSession(sessRes[0].id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (eventId) load(); }, [eventId]);

  // Refocus input after each check-in
  useEffect(() => {
    if (!submitting) inputRef.current?.focus();
  }, [submitting]);

  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !selectedSession) return;
    setSubmitting(true);
    const now = new Date().toLocaleTimeString("tr-TR");
    try {
      const result = await adminManualCheckin(eventId, selectedSession, email.trim());
      setLog((prev) => [{
        email: email.trim(),
        success: result.ok,
        message: result.message,
        time: now,
      }, ...prev.slice(0, 49)]);
      setEmail("");
    } catch (e: any) {
      setLog((prev) => [{
        email: email.trim(),
        success: false,
        message: e.message || "Check-in başarısız",
        time: now,
      }, ...prev.slice(0, 49)]);
      setEmail("");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedSessionObj = sessions.find((s) => s.id === selectedSession);
  const todayAttendance = log.filter((l) => l.success).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumb + Event Tab Nav */}
        <div className="mb-6 flex flex-col gap-2">
          <Link href="/admin/events" className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors w-fit">
            <ChevronLeft className="w-3.5 h-3.5" /> Tüm Etkinlikler
          </Link>
          <div>
            <p className="text-xs text-gray-500 mb-2">{eventName}</p>
            <div className="flex items-center gap-1 flex-wrap">
              <Link href={`/admin/events/${eventId}/certificates`} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 shadow-sm transition-colors">
                <LockKeyhole className="w-3.5 h-3.5" /> Sertifikalar
              </Link>
              <Link href={`/admin/events/${eventId}/sessions`} className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 shadow-sm transition-colors">
                <QrCode className="w-3.5 h-3.5" /> Oturumlar
              </Link>
              <Link href={`/admin/events/${eventId}/attendees`} className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3.5 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50 shadow-sm transition-colors">
                <Users className="w-3.5 h-3.5" /> Katılımcılar
              </Link>
              <Link href={`/admin/events/${eventId}/checkin`} className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm">
                <UserCheck className="w-3.5 h-3.5" /> Check-in
              </Link>
              <Link href={`/admin/events/${eventId}/gamification`} className="flex items-center gap-1.5 rounded-lg border border-fuchsia-200 bg-white px-3.5 py-1.5 text-xs font-bold text-fuchsia-700 hover:bg-fuchsia-50 shadow-sm transition-colors">
                Gamification
              </Link>
              <Link href={`/admin/events/${eventId}/surveys`} className="flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-white px-3.5 py-1.5 text-xs font-bold text-cyan-700 hover:bg-cyan-50 shadow-sm transition-colors">
                Anket
              </Link>
              <Link href={`/admin/events/${eventId}/advanced-analytics`} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
                İleri Analitik
              </Link>
              <Link href={`/admin/events/${eventId}/editor`} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                Editör
              </Link>
              <Link href={`/admin/events/${eventId}/email-templates`} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                Email
              </Link>
            </div>
          </div>
        </div>

        {/* Plan gate */}
        {planOk === false && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-8 text-center mb-6">
            <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-800 mb-2">Pro veya Enterprise Plan Gerekli</h2>
            <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
              Manuel check-in ve yoklama sistemi sadece Pro ve Enterprise planlarında kullanılabilir.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-amber-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-amber-700 transition text-sm"
            >
              <Sparkles className="w-4 h-4" /> Planı Yükselt
            </Link>
          </div>
        )}

        {planOk !== false && (
          <>
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-gray-900">Manuel Check-in</h1>
          <p className="text-sm text-gray-500 mt-0.5">{eventName}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>
        )}

        {/* Session selector */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Oturum Seçin</label>
          <div className="space-y-2">
            {sessions.length === 0 ? (
              <p className="text-sm text-gray-400">
                Henüz oturum yok.{" "}
                <Link href={`/admin/events/${eventId}/sessions`} className="text-indigo-600 underline">
                  Oturum ekle
                </Link>
              </p>
            ) : (
              sessions.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${selectedSession === s.id ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:bg-gray-50"}`}
                >
                  <input
                    type="radio"
                    name="session"
                    value={s.id}
                    checked={selectedSession === s.id}
                    onChange={() => setSelectedSession(s.id)}
                    className="text-indigo-600"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm text-gray-800">{s.name}</span>
                    {s.session_date && <span className="text-xs text-gray-400 ml-2">{new Date(s.session_date).toLocaleDateString("tr-TR")}</span>}
                    {s.session_start && <span className="text-xs text-gray-400 ml-1">{s.session_start}</span>}
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className="text-xs text-indigo-600 font-medium">{s.attendance_count} kişi</span>
                    {s.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Açık
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Kapalı</span>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Checkin form */}
        {selectedSession && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-4">
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="w-5 h-5 text-indigo-500" />
              <h2 className="font-semibold text-gray-800">Check-in Yap</h2>
              {todayAttendance > 0 && (
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Bu oturumda: {todayAttendance} başarılı
                </span>
              )}
            </div>
            <form onSubmit={handleCheckin} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Katılımcı e-postası"
                  required
                  autoComplete="off"
                  className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold px-5 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition text-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                Check-in
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" />
              Katılımcılar kendi telefonlarından da QR okutarak check-in yapabilir.
            </p>
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Check-in Geçmişi</h3>
              <button onClick={() => setLog([])} className="text-xs text-gray-400 hover:text-red-500 transition">Temizle</button>
            </div>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {log.map((entry, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 ${entry.success ? "bg-green-50/30" : "bg-red-50/30"}`}>
                  {entry.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{entry.email}</p>
                    <p className="text-xs text-gray-400">{entry.message}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{entry.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
