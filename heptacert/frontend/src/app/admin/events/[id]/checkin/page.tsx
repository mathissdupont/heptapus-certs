"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  apiFetch,
  adminManualCheckin,
  checkInEventTicket,
  getMySubscription,
  listSessions,
  type SessionOut,
  type SubscriptionInfo,
} from "@/lib/api";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import {
  Camera,
  ArrowLeft,
  CheckCircle2,
  History,
  Loader2,
  QrCode,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Smartphone,
  Trash2,
  UserCheck,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";

type CheckinType = "manual" | "ticket";

type CheckinEntry = {
  email: string;
  type?: CheckinType;
  success: boolean;
  message: string;
  time: string;
  queued?: boolean;
};

type QueueEntry = {
  id: string;
  eventId: number;
  sessionId?: number | null;
  type: CheckinType;
  value: string;
  createdAt: string;
  attempts: number;
  lastError?: string | null;
};

const queueKey = (eventId: number) => `heptacert:offline-checkin:${eventId}`;

function readQueue(eventId: number): QueueEntry[] {
  if (typeof window === "undefined" || !eventId) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(queueKey(eventId)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(eventId: number, entries: QueueEntry[]) {
  if (typeof window === "undefined" || !eventId) return;
  window.localStorage.setItem(queueKey(eventId), JSON.stringify(entries.slice(0, 300)));
}

function normalizeTicketToken(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/\/tickets\/([^/?#]+)/);
  if (match?.[1]) return decodeURIComponent(match[1]);
  return trimmed.split("?")[0].split("#")[0];
}

function classifyScan(value: string): { type: CheckinType | "unsupported"; value: string; message?: string } {
  const trimmed = value.trim();
  if (!trimmed) return { type: "unsupported", value: trimmed, message: "Bos QR okundu." };
  if (trimmed.includes("/tickets/")) return { type: "ticket", value: normalizeTicketToken(trimmed) };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return { type: "manual", value: trimmed.toLowerCase() };
  if (trimmed.includes("/attend/")) {
    return { type: "unsupported", value: trimmed, message: "Bu oturum QR'i. Katilimci bileti ya da e-posta QR'i okut." };
  }
  if (trimmed.length >= 24 && !trimmed.includes(" ")) return { type: "ticket", value: normalizeTicketToken(trimmed) };
  return { type: "unsupported", value: trimmed, message: "QR icerigi e-posta veya bilet token'i degil." };
}

export default function AdminCheckinPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Number(params?.id);
  const [staffMode, setStaffMode] = useState(false);

  const [eventName, setEventName] = useState("");
  const [sessions, setSessions] = useState<SessionOut[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [log, setLog] = useState<CheckinEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [planOk, setPlanOk] = useState<boolean | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<QueueEntry[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<any>(null);
  const scannerRegionId = `heptacert-checkin-scanner-${eventId || "new"}`;

  async function load() {
    try {
      const [sessRes, evRes, subInfo] = await Promise.all([
        listSessions(eventId).catch(() => []),
        apiFetch(`/admin/events/${eventId}`).then((r) => r.json()),
        getMySubscription().catch(() => ({ active: false, plan_id: null, expires_at: null, role: null }) as SubscriptionInfo),
      ]);
      const hasPaidPlan = subInfo.role === "superadmin" || (subInfo.active && ["pro", "growth", "enterprise"].includes(subInfo.plan_id ?? ""));
      setPlanOk(hasPaidPlan);
      setSessions(sessRes);
      setEventName(evRes.name);
      const active = sessRes.find((s) => s.is_active);
      if (active) setSelectedSession(active.id);
      else if (sessRes.length > 0) setSelectedSession(sessRes[0].id);
    } catch (e: any) {
      setError(e.message || "Check-in ekrani yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (eventId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setStaffMode(new URLSearchParams(window.location.search).get("staff") === "1");
  }, []);

  useEffect(() => {
    if (!eventId) return;
    setOfflineQueue(readQueue(eventId));
  }, [eventId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setIsOnline(window.navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (planOk === false) router.replace("/pricing?source=admin-premium");
  }, [planOk, router]);

  useEffect(() => {
    if (!submitting) inputRef.current?.focus();
  }, [submitting]);

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0 && !syncing) void syncQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, offlineQueue.length]);

  useEffect(() => {
    if (!scannerOpen) {
      void stopScanner();
      return;
    }

    let cancelled = false;
    setScannerError(null);

    async function startScanner() {
      try {
        const mod = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new mod.Html5Qrcode(scannerRegionId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText: string) => {
            void handleScannedValue(decodedText);
          },
          () => undefined,
        );
      } catch (err: any) {
        if (!cancelled) setScannerError(err?.message || "Kamera baslatilamadi.");
      }
    }

    void startScanner();
    return () => {
      cancelled = true;
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen, scannerRegionId]);

  async function stopScanner() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      await scanner.clear();
    } catch {}
  }

  function appendLog(entry: CheckinEntry) {
    setLog((prev) => [entry, ...prev.slice(0, 79)]);
  }

  function queueCheckin(entry: Omit<QueueEntry, "id" | "createdAt" | "attempts">) {
    const queued: QueueEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastError: null,
    };
    const next = [queued, ...offlineQueue].slice(0, 300);
    setOfflineQueue(next);
    writeQueue(eventId, next);
    appendLog({
      email: entry.value,
      type: entry.type,
      success: true,
      queued: true,
      message: "Offline kuyruga alindi. Internet gelince senkronlanacak.",
      time: new Date().toLocaleTimeString("tr-TR"),
    });
  }

  async function performEntry(type: CheckinType, value: string, sessionId = selectedSession) {
    if (type === "ticket") {
      const ticket = await checkInEventTicket(eventId, normalizeTicketToken(value));
      return { ok: true, message: `${ticket.attendee_name} bilet girisi onaylandi.` };
    }
    if (!sessionId) throw new Error("Once oturum sec.");
    return adminManualCheckin(eventId, sessionId, value.trim());
  }

  async function submitValue(type: CheckinType, value: string) {
    const clean = value.trim();
    if (!clean) return;
    const now = new Date().toLocaleTimeString("tr-TR");
    if (!isOnline) {
      queueCheckin({ eventId, sessionId: selectedSession, type, value: clean });
      return;
    }
    setSubmitting(true);
    try {
      const result = await performEntry(type, clean);
      appendLog({ email: clean, type, success: result.ok, message: result.message, time: now });
    } catch (e: any) {
      if (!navigator.onLine) {
        queueCheckin({ eventId, sessionId: selectedSession, type, value: clean });
      } else {
        appendLog({ email: clean, type, success: false, message: e.message || "Check-in basarisiz", time: now });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleScannedValue(rawValue: string) {
    await stopScanner();
    setScannerOpen(false);
    const scan = classifyScan(rawValue);
    if (scan.type === "unsupported") {
      appendLog({
        email: scan.value,
        success: false,
        message: scan.message || "QR okunamadi.",
        time: new Date().toLocaleTimeString("tr-TR"),
      });
      return;
    }
    await submitValue(scan.type, scan.value);
  }

  async function syncQueue() {
    if (!eventId || syncing || offlineQueue.length === 0 || !navigator.onLine) return;
    setSyncing(true);
    const failed: QueueEntry[] = [];
    let synced = 0;
    for (const entry of [...offlineQueue].reverse()) {
      try {
        await performEntry(entry.type, entry.value, entry.sessionId || selectedSession);
        synced += 1;
        appendLog({
          email: entry.value,
          type: entry.type,
          success: true,
          message: "Offline kayit senkronlandi.",
          time: new Date().toLocaleTimeString("tr-TR"),
        });
      } catch (e: any) {
        failed.unshift({ ...entry, attempts: entry.attempts + 1, lastError: e?.message || "Sync basarisiz" });
      }
    }
    setOfflineQueue(failed);
    writeQueue(eventId, failed);
    if (synced > 0) {
      appendLog({
        email: `${synced} kayit`,
        success: true,
        message: "Kuyruk senkronizasyonu tamamlandi.",
        time: new Date().toLocaleTimeString("tr-TR"),
      });
    }
    setSyncing(false);
  }

  function clearQueue() {
    setOfflineQueue([]);
    writeQueue(eventId, []);
  }

  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !selectedSession) return;
    await submitValue("manual", email.trim());
    setEmail("");
  }

  const selectedSessionObj = sessions.find((s) => s.id === selectedSession);
  const todayAttendance = log.filter((l) => l.success && !l.queued).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className={`${staffMode ? "min-h-screen bg-zinc-100 px-3 pb-8 pt-3 md:px-4" : "min-h-screen bg-slate-50 px-3 pb-28 pt-4 md:px-8 md:pb-8"}`}>
      <div className={`mx-auto ${staffMode ? "max-w-xl" : "max-w-3xl"}`}>
        {!staffMode && <EventAdminNav eventId={eventId} eventName={eventName} active="checkin" className="mb-6 flex flex-col gap-2" />}
        {staffMode && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-3 shadow-sm">
            <Link href={`/admin/events/${eventId}/ops`} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black text-zinc-700">
              <ArrowLeft className="h-4 w-4" />
              Operasyon
            </Link>
            <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">Gorevli modu</span>
          </div>
        )}

        {planOk === false && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center">
            <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-amber-400" />
            <h2 className="mb-2 text-lg font-bold text-gray-800">Pro veya Enterprise Plan Gerekli</h2>
            <p className="mx-auto mb-4 max-w-md text-sm text-gray-500">
              Manuel check-in ve yoklama sistemi sadece Pro ve Enterprise planlarinda kullanilabilir.
            </p>
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700">
              <Sparkles className="h-4 w-4" /> Plani Yukselt
            </Link>
          </div>
        )}

        {planOk !== false && (
          <>
            <div className={`mb-4 rounded-3xl border border-slate-200 bg-white shadow-sm ${staffMode ? "p-4" : "p-5"}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">Mobil operasyon</p>
                  <h1 className={`${staffMode ? "mt-1 text-xl" : "mt-1 text-2xl"} font-black text-gray-950`}>Hizli Check-in</h1>
                  <p className="mt-1 text-sm text-gray-500">{eventName}</p>
                </div>
                <div className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${isOnline ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                  {isOnline ? "Online" : "Offline mod"}
                </div>
              </div>

              <div className={`mt-4 grid gap-2 ${staffMode ? "grid-cols-3" : "sm:grid-cols-3"}`}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Oturum</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-900">{selectedSessionObj?.name || "Secilmedi"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Basarili</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{todayAttendance}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kuyruk</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{offlineQueue.length} bekliyor</p>
                </div>
              </div>
            </div>

            {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className={`mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm ${staffMode ? "p-3" : "p-4"}`}>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Oturum Secin</label>
              <div className="space-y-2">
                {sessions.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    Henuz oturum yok.{" "}
                    <Link href={`/admin/events/${eventId}/sessions`} className="text-indigo-600 underline">
                      Oturum ekle
                    </Link>
                  </p>
                ) : (
                  sessions.map((s) => (
                    <label key={s.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border ${staffMode ? "p-2.5" : "p-3"} transition ${selectedSession === s.id ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:bg-gray-50"}`}>
                      <input type="radio" name="session" value={s.id} checked={selectedSession === s.id} onChange={() => setSelectedSession(s.id)} className="text-indigo-600" />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-gray-800">{s.name}</span>
                        {s.session_date && <span className="ml-2 text-xs text-gray-400">{new Date(s.session_date).toLocaleDateString("tr-TR")}</span>}
                        {s.session_start && <span className="ml-1 text-xs text-gray-400">{s.session_start}</span>}
                      </div>
                      <span className="shrink-0 text-xs font-medium text-indigo-600">{s.attendance_count} kisi</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {selectedSession && (
              <div className={`mb-4 rounded-2xl border border-gray-200 bg-white shadow-sm ${staffMode ? "p-4" : "p-5"}`}>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <UserCheck className="h-5 w-5 text-indigo-500" />
                  <h2 className="font-semibold text-gray-800">Check-in Yap</h2>
                  <button type="button" onClick={() => setScannerOpen((v) => !v)} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gray-950 px-3 py-2 text-xs font-bold text-white">
                    <Camera className="h-4 w-4" />
                    {scannerOpen ? "Kamerayi kapat" : "QR okut"}
                  </button>
                </div>

                {scannerOpen && (
                  <div className="mb-4 overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
                    <div id={scannerRegionId} className="min-h-[280px] overflow-hidden rounded-xl bg-black" />
                    {scannerError && <p className="mt-2 text-xs font-semibold text-rose-600">{scannerError}</p>}
                    <p className="mt-2 flex items-center gap-1 text-xs text-indigo-700">
                      <QrCode className="h-3.5 w-3.5" />
                      Bilet QR'i, bilet linki veya e-posta QR'i okutabilirsin.
                    </p>
                  </div>
                )}

                <form onSubmit={handleCheckin} className={`grid gap-2 ${staffMode ? "" : "sm:grid-cols-[1fr_auto]"}`}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input ref={inputRef} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Katilimci e-postasi" required autoComplete="off" className={`${staffMode ? "py-4 text-base" : "py-3 text-sm"} w-full rounded-xl border border-gray-200 pl-9 pr-4 outline-none focus:ring-2 focus:ring-indigo-500`} />
                  </div>
                  <button type="submit" disabled={submitting || !email.trim()} className={`${staffMode ? "py-4 text-base" : "py-3 text-sm"} inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50`}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                    Check-in
                  </button>
                </form>
              </div>
            )}

            <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className={`h-4 w-4 ${syncing ? "animate-spin text-indigo-500" : "text-gray-400"}`} />
                  <h3 className="text-sm font-black text-gray-800">Offline sync</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => void syncQueue()} disabled={!isOnline || syncing || offlineQueue.length === 0} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-40">
                    Senkronla
                  </button>
                  <button onClick={clearQueue} disabled={offlineQueue.length === 0} className="rounded-xl border border-rose-100 px-3 py-2 text-xs font-bold text-rose-600 disabled:opacity-40">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {offlineQueue.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-gray-400">
                  <Smartphone className="h-4 w-4" />
                  Bekleyen offline kayit yok.
                </p>
              ) : (
                <div className="max-h-48 divide-y divide-gray-100 overflow-y-auto">
                  {offlineQueue.map((item) => (
                    <div key={item.id} className="py-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gray-800">{item.type === "ticket" ? "Bilet" : "E-posta"}: {item.value}</span>
                        <span className="text-gray-400">{item.attempts} deneme</span>
                      </div>
                      {item.lastError && <p className="mt-1 text-rose-500">{item.lastError}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {log.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <History className="h-3.5 w-3.5" />
                    Check-in Gecmisi
                  </h3>
                  <button onClick={() => setLog([])} className="text-xs text-gray-400 transition hover:text-red-500">Temizle</button>
                </div>
                <div className="max-h-96 divide-y divide-gray-50 overflow-y-auto">
                  {log.map((entry, i) => (
                    <div key={`${entry.time}-${i}`} className={`flex items-center gap-3 px-4 py-3 ${entry.success ? "bg-green-50/30" : "bg-red-50/30"}`}>
                      {entry.success ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" /> : <XCircle className="h-5 w-5 shrink-0 text-red-500" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">{entry.email}</p>
                        <p className="text-xs text-gray-400">{entry.queued ? "Kuyrukta: " : ""}{entry.message}</p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">{entry.time}</span>
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
