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
} from "lucide-react";
import EventAdminNav from "@/components/Admin/EventAdminNav";
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
          {note && <p className="mt-1 text-xs font-semibold text-slate-500">{note}</p>}
        </div>
        <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function EventOperationsPage() {
  const params = useParams();
  const eventId = Number(params?.id);
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
      setError(err?.message || "Canlı operasyon verisi alınamadı.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load({ soft: true }), 10_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function undo(record: EventOperationCheckin) {
    if (!window.confirm(`${record.attendee_name} için ${record.session_name} check-in kaydı geri alınsın mı?`)) return;
    setUndoingId(record.id);
    setNotice(null);
    try {
      const result = await undoAttendanceRecord(eventId, record.id);
      setNotice(result.message || "Check-in kaydı geri alındı.");
      await load({ soft: true });
    } catch (err: any) {
      setError(err?.message || "Check-in geri alınamadı.");
    } finally {
      setUndoingId(null);
    }
  }

  const activeSessionNames = useMemo(
    () => snapshot?.sessions.filter((session) => session.is_active).map((session) => session.name).join(", ") || "Aktif oturum yok",
    [snapshot],
  );

  if (loading && !snapshot) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="pb-28 md:pb-8">
      <EventAdminNav eventId={eventId} eventName={snapshot?.event_name} active="ops" className="mb-6 flex flex-col gap-2" />

      <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">Canlı operasyon</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">{snapshot?.event_name || `Etkinlik #${eventId}`}</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">Son guncelleme: {formatTime(snapshot?.generated_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/events/${eventId}/checkin?staff=1`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">
            <QrCode className="h-4 w-4" />
            Görevli Modu
          </Link>
          <button
            type="button"
            onClick={() => void load({ soft: true })}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Yenile
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </div>
      )}

      {snapshot && (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Katılımcı" value={snapshot.overview.attendees} note="Kayıtlı kişi" icon={Users} />
            <StatCard title="Check-in" value={snapshot.overview.attendance_records} note="Toplam oturum kaydı" icon={UserCheck} />
            <StatCard title="Aktif Oturum" value={snapshot.overview.active_sessions} note={activeSessionNames} icon={Activity} />
            <StatCard title="Bilet" value={`${snapshot.overview.tickets_used}/${snapshot.overview.tickets_total}`} note="Kullanilan / toplam" icon={Ticket} />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Oturum Durumu</h2>
                  <p className="text-sm font-semibold text-slate-500">Anlık katılım sayıları</p>
                </div>
                <Clock3 className="h-5 w-5 text-slate-400" />
              </div>
              <div className="space-y-3">
                {snapshot.sessions.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Henüz oturum yok.</p>
                ) : (
                  snapshot.sessions.map((session) => (
                    <div key={session.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-black text-slate-950">{session.name}</p>
                            {session.is_active && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700">Aktif</span>}
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            {[session.session_date, session.session_start].filter(Boolean).join(" - ") || "Tarih yok"}
                          </p>
                        </div>
                        <p className="shrink-0 text-lg font-black text-indigo-600">{session.attendance_count}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Son Check-in'ler</h2>
                  <p className="text-sm font-semibold text-slate-500">Yanlis okutma varsa buradan geri al</p>
                </div>
                <UserCheck className="h-5 w-5 text-slate-400" />
              </div>
              <div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto">
                {snapshot.recent_checkins.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Check-in kaydı yok.</p>
                ) : (
                  snapshot.recent_checkins.map((record) => (
                    <div key={record.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">{record.attendee_name}</p>
                        <p className="truncate text-xs font-semibold text-slate-500">{record.attendee_email}</p>
                        <p className="mt-1 text-xs font-semibold text-indigo-600">
                          {record.session_name} - {formatTime(record.checked_in_at)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void undo(record)}
                        disabled={undoingId === record.id}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-100 px-3 py-2 text-xs font-black text-rose-600 disabled:opacity-50"
                      >
                        {undoingId === record.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        Geri al
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
