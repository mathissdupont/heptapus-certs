"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  QrCode,
  RefreshCw,
  RotateCcw,
  Ticket,
  UserCheck,
  Users,
  Calendar,
  ChevronDown,
} from "lucide-react";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import MobileActionBar from "@/components/Admin/MobileActionBar";
import { useI18n } from "@/lib/i18n";
import {
  getEventOperations,
  undoAttendanceRecord,
  type EventOperationCheckin,
  type EventOperationSnapshot,
} from "@/lib/api";

function formatTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  title,
  value,
  note,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  note?: string;
  icon: ElementType;
}) {
  return (
    <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-card flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-11 font-bold uppercase tracking-widest text-surface-400 truncate">{title}</p>
        <p className="text-2xl font-bold tracking-tight text-surface-900 font-mono tabular-nums">{value}</p>
        {note && <p className="text-11 font-medium text-surface-400 truncate leading-none pt-0.5">{note}</p>}
      </div>
      <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-150 bg-surface-50 text-surface-600 sm:flex">
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}

export default function EventOperationsPage() {
  const params = useParams();
  const eventId = Number(params?.id);
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const copy = {
    loadError:    isTr ? "Canlı operasyon verisi alınamadı." : "Could not load live operations data.",
    undoSuccess:  isTr ? "Check-in kaydı geri alındı." : "Check-in record undone.",
    undoError:    isTr ? "Check-in geri alınamadı." : "Could not undo check-in.",
    noActiveSess: isTr ? "Aktif oturum yok" : "No active sessions",
    eyebrow:      isTr ? "Canlı operasyon ekranı" : "Live operations",
    eventFallback:(id: number) => isTr ? `Etkinlik #${id}` : `Event #${id}`,
    lastUpdate:   isTr ? "Son Güncelleme:" : "Last Update:",
    staffMode:    isTr ? "Görevli Modu" : "Staff Mode",
    refresh:      isTr ? "Yenile" : "Refresh",
    statAttendees:isTr ? "Katılımcı" : "Attendees",
    statCheckin:  isTr ? "Check-in" : "Check-ins",
    statSessions: isTr ? "Aktif Oturum" : "Active Sessions",
    statTickets:  isTr ? "Bilet Kullanımı" : "Ticket Usage",
    noteAttendees:isTr ? "Kayıtlı toplam kitle" : "Total registered audience",
    noteCheckin:  isTr ? "Üretilen anlık yoklama" : "Live attendance records",
    noteTickets:  isTr ? "Giriş yapan davetli biletleri" : "Admitted guest tickets",
    sessionTitle: isTr ? "Seans Yoklama Durumları" : "Session Attendance",
    sessionSub:   isTr ? "Oturum bazında canlı katılım sayıları" : "Live attendance counts by session",
    live:         isTr ? "Canlı" : "Live",
    noSchedule:   isTr ? "Zaman Planı Yok" : "No Schedule",
    noSessions:   isTr ? "Henüz tanımlanmış bir seans akışı bulunmuyor." : "No sessions defined yet.",
    logTitle:     isTr ? "Son Giriş Hareketleri" : "Recent Check-ins",
    logSub:       isTr ? "Hatalı okutma iptalleri ve kapı sevk günlüğü" : "Entry logs and undo operations",
    noCheckins:   isTr ? "Kapılardan henüz bir check-in sinyali alınmadı." : "No check-in signals received yet.",
    undo:         isTr ? "Geri Al" : "Undo",
    undoConfirm:  (name: string, session: string) => isTr
      ? `${name} için ${session} check-in kaydı geri alınsın mı?`
      : `Undo check-in for ${name} in ${session}?`,
  };

  const [snapshot, setSnapshot] = useState<EventOperationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoingId, setUndoingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load({ soft = false } = {}) {
    if (!eventId) return;
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getEventOperations(eventId);
      setSnapshot(data);
    } catch (err: any) {
      setError(err?.message || copy.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load({ soft: true }), 10_000);
    return () => window.clearInterval(timer);
  }, [eventId]);

  async function undo(record: EventOperationCheckin) {
    if (!window.confirm(copy.undoConfirm(record.attendee_name, record.session_name))) return;
    setUndoingId(record.id);
    setNotice(null);
    try {
      const result = await undoAttendanceRecord(eventId, record.id);
      setNotice(result.message || copy.undoSuccess);
      await load({ soft: true });
    } catch (err: any) {
      setError(err?.message || copy.undoError);
    } finally {
      setUndoingId(null);
    }
  }

  const activeSessionNames = useMemo(
    () => snapshot?.sessions.filter((session) => session.is_active).map((session) => session.name).join(", ") || copy.noActiveSess,
    [snapshot],
  );

  if (loading && !snapshot) {
    return (
      <div className="flex w-full min-h-[340px] items-center justify-center antialiased">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400 stroke-[2.5]" />
      </div>
    );
  }

  return (
    <div className="w-full mx-auto max-w-7xl pb-24 md:pb-8 antialiased text-surface-900 space-y-5">
      
      {/* ÜST ETKİNLİK NAVİGASYONU */}
      <EventAdminNav eventId={eventId} eventName={snapshot?.event_name} active="ops" />

      {/* ANA SAYFA BAŞLIK ALANI */}
      <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-card flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-0.5">
          <p className="text-11 font-bold uppercase tracking-widest text-surface-400">{copy.eyebrow}</p>
          <h1 className="text-xl font-bold tracking-tight text-surface-900 sm:text-2xl">
            {snapshot?.event_name || copy.eventFallback(eventId)}
          </h1>
          <div className="flex items-center gap-1 text-11 font-semibold text-surface-400 font-mono uppercase">
            <span>{copy.lastUpdate} {formatTime(snapshot?.generated_at)}</span>
          </div>
        </div>
        
        {/* Masaüstü Hızlı Aksiyonlar */}
        <div className="hidden flex-wrap items-center gap-2 sm:flex">
          <Link 
            href={`/admin/events/${eventId}/checkin?staff=1`} 
            className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-surface-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-surface-800 active:scale-95"
          >
            <QrCode className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>{copy.staffMode}</span>
          </Link>
          <button
            type="button"
            onClick={() => void load({ soft: true })}
            disabled={refreshing}
            className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-surface-200 bg-white px-3.5 text-xs font-semibold text-surface-700 shadow-sm transition hover:bg-surface-50 active:scale-95 disabled:opacity-40"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 stroke-[2]" />}
            <span>{copy.refresh}</span>
          </button>
        </div>
      </div>

      {/* DURUM BANNERLARI VE SİNYALLER */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50/40 p-4 text-xs font-semibold text-red-600 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2]" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 text-xs font-semibold text-emerald-600 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 stroke-[2.5]" />
          <span>{notice}</span>
        </div>
      )}

      {snapshot && (
        <>
          {/* ANLIK CANLI METRİK KARTLARI SETİ */}
          <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
            <StatCard title={copy.statAttendees} value={snapshot.overview.attendees} note={copy.noteAttendees} icon={Users} />
            <StatCard title={copy.statCheckin} value={snapshot.overview.attendance_records} note={copy.noteCheckin} icon={UserCheck} />
            <StatCard title={copy.statSessions} value={snapshot.overview.active_sessions} note={activeSessionNames.length > 25 ? activeSessionNames.slice(0, 25) + "..." : activeSessionNames} icon={Activity} />
            <StatCard title={copy.statTickets} value={`${snapshot.overview.tickets_used}/${snapshot.overview.tickets_total}`} note={copy.noteTickets} icon={Ticket} />
          </div>

          {/* Sessions + checkin log */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-start">
            
            {/* SOL SÜTUN: OTURUM KAPASİTE DURUMLARI */}
            <section className="rounded-xl border border-surface-200 bg-white p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-surface-100 pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.sessionTitle}</h2>
                  <p className="text-11 font-medium text-surface-400">{copy.sessionSub}</p>
                </div>
                <Clock3 className="h-4 w-4 text-surface-400 stroke-[1.8]" />
              </div>
              
              <div className="space-y-2.5">
                {snapshot.sessions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-surface-200 p-6 text-center text-xs font-semibold text-surface-400">
                    {copy.noSessions}
                  </div>
                ) : (
                  snapshot.sessions.map((session) => (
                    <div key={session.id} className="rounded-xl border border-surface-100 bg-white p-4 shadow-sm flex items-center justify-between gap-4 transition-colors hover:border-surface-200">
                      <div className="min-w-0 space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-bold text-surface-900 truncate tracking-tight">{session.name}</p>
                          {session.is_active && (
                            <span className="inline-flex rounded-md border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-11 font-bold uppercase text-emerald-700 animate-pulse shadow-sm">
                              {copy.live}
                            </span>
                          )}
                        </div>
                        <p className="text-11 font-semibold text-surface-400 font-mono uppercase">
                          {[session.session_date, session.session_start].filter(Boolean).join(" · ") || copy.noSchedule}
                        </p>
                      </div>
                      <p className="text-xl font-bold tracking-tight text-surface-900 font-mono tabular-nums shrink-0">{session.attendance_count}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* SAĞ SÜTUN: GERÇEK ZAMANLI LOG AKIŞI VE GERİ ALMA MERKEZİ */}
            <section className="rounded-xl border border-surface-200 bg-white p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-surface-100 pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.logTitle}</h2>
                  <p className="text-11 font-medium text-surface-400">{copy.logSub}</p>
                </div>
                <UserCheck className="h-4 w-4 text-surface-400 stroke-[1.8]" />
              </div>
              
              <div className="max-h-[580px] divide-y divide-surface-100 overflow-y-auto pr-0.5 scrollbar-none bg-white">
                {snapshot.recent_checkins.length === 0 ? (
                  <div className="py-12 text-center text-xs font-semibold text-surface-400 tracking-tight">
                    {copy.noCheckins}
                  </div>
                ) : (
                  snapshot.recent_checkins.map((record) => (
                    <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 py-3.5 bg-white transition-colors hover:bg-surface-50/30 first:pt-0 last:pb-0">
                      <div className="min-w-0 space-y-0.5 flex-1">
                        <p className="text-xs font-bold text-surface-900 tracking-tight truncate">{record.attendee_name}</p>
                        <p className="text-11 font-medium text-surface-400 font-mono truncate">{record.attendee_email}</p>
                        <div className="pt-1 flex flex-wrap gap-x-2 text-11 font-bold text-surface-400">
                          <span className="text-surface-900">{record.session_name}</span>
                          <span>·</span>
                          <span className="font-mono text-surface-400">{formatTime(record.checked_in_at)}</span>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => void undo(record)}
                        disabled={undoingId === record.id}
                        className="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 text-11 font-bold text-red-600 shadow-sm transition hover:bg-red-50 active:scale-90 disabled:opacity-40 shrink-0 self-end sm:self-auto"
                      >
                        {undoingId === record.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3 stroke-[2.5]" />}
                        <span>{copy.undo}</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {/* MOBİL ALT AKSİYON TUTUCU (iOS Standartları) */}
      <MobileActionBar>
        <Link 
          href={`/admin/events/${eventId}/checkin?staff=1`} 
          className="flex-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-surface-900 px-4 text-xs font-bold text-white shadow-sm transition active:scale-[0.98]"
        >
          <QrCode className="h-4 w-4 stroke-[2.5]" />
          <span>Görevli Modu</span>
        </Link>
        <button
          type="button"
          onClick={() => void load({ soft: true })}
          disabled={refreshing}
          className="flex-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-surface-200 bg-white px-4 text-xs font-bold text-surface-700 shadow-sm transition active:scale-[0.98] disabled:opacity-40"
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 stroke-[2]" />}
          <span>Yenile</span>
        </button>
      </MobileActionBar>

    </div>
  );
}