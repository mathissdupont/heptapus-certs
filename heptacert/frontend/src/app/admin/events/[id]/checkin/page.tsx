"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  apiFetch,
  adminManualCheckin,
  checkInEventTicket,
  getCheckinMetrics,
  listSessions,
  type CheckinMetrics,
  type SessionOut,
} from "@/lib/api";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import { PlanGateCard, isPlanGateError } from "@/lib/useSubscription";
import {
  Camera,
  ArrowLeft,
  CheckCircle2,
  History,
  Loader2,
  QrCode,
  RotateCcw,
  Search,
  Smartphone,
  Trash2,
  UserCheck,
  Wifi,
  WifiOff,
  XCircle,
  ChevronRight,
  User,
  AlertCircle,
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
  if (!trimmed) return { type: "unsupported", value: trimmed, message: "Boş QR okundu." };
  if (trimmed.includes("/tickets/")) return { type: "ticket", value: normalizeTicketToken(trimmed) };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return { type: "manual", value: trimmed.toLowerCase() };
  if (trimmed.includes("/attend/")) {
    return { type: "unsupported", value: trimmed, message: "Bu oturum QR'i. Katılımcı bilet ya da e-posta QR'i okutun." };
  }
  if (trimmed.length >= 24 && !trimmed.includes(" ")) return { type: "ticket", value: normalizeTicketToken(trimmed) };
  return { type: "unsupported", value: trimmed, message: "QR içeriği e-posta veya bilet token'i değil." };
}

export default function AdminCheckinPage() {
  const params = useParams();
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
  const [planGateMessage, setPlanGateMessage] = useState<string | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<QueueEntry[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<CheckinMetrics | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<any>(null);
  const scannerRegionId = `heptacert-checkin-scanner-${eventId || "new"}`;

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
      const active = sessRes.find((s) => s.is_active);
      if (active) setSelectedSession(active.id);
      else if (sessRes.length > 0) setSelectedSession(sessRes[0].id);
      getCheckinMetrics(eventId).then(setMetrics).catch(() => undefined);
    } catch (e: any) {
      if (e?.status === 403 && isPlanGateError(e?.message)) {
        setPlanOk(false);
        setPlanGateMessage(e.message);
        setError(null);
      } else {
        setError(e.message || "Check-in ekranı yüklenemedi.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (eventId) void load();
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
    if (!submitting) inputRef.current?.focus();
  }, [submitting]);

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0 && !syncing) void syncQueue();
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
        if (!cancelled) setScannerError(err?.message || "Kamera başlatılamadı.");
      }
    }

    void startScanner();
    return () => {
      cancelled = true;
      void stopScanner();
    };
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
      message: "Offline kuyruğa alındı. İnternet gelince senkronlanacak.",
      time: new Date().toLocaleTimeString("tr-TR"),
    });
  }

  async function performEntry(type: CheckinType, value: string, sessionId = selectedSession) {
    if (type === "ticket") {
      const ticket = await checkInEventTicket(eventId, normalizeTicketToken(value));
      return { ok: true, message: `${ticket.attendee_name} bilet girişi onaylandı.` };
    }
    if (!sessionId) throw new Error("Önce oturum seç.");
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
      getCheckinMetrics(eventId).then(setMetrics).catch(() => undefined);
    } catch (e: any) {
      if (!navigator.onLine) {
        queueCheckin({ eventId, sessionId: selectedSession, type, value: clean });
      } else {
        appendLog({ email: clean, type, success: false, message: e.message || "Check-in başarısız", time: now });
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
        message: scan.message || "QR okunamadı.",
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
          message: "Offline kayıt senkronlandı.",
          time: new Date().toLocaleTimeString("tr-TR"),
        });
      } catch (e: any) {
        failed.unshift({ ...entry, attempts: entry.attempts + 1, lastError: e?.message || "Sync başarısız" });
      }
    }
    setOfflineQueue(failed);
    writeQueue(eventId, failed);
    if (synced > 0) {
      appendLog({
        email: `${synced} kayıt`,
        success: true,
        message: "Kuyruk senkronizasyonu tamamlandı.",
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
      <div className="flex w-full min-h-[340px] items-center justify-center antialiased">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400 stroke-[2.5]" />
      </div>
    );
  }

  return (
    <div className={`antialiased text-surface-900 w-full ${staffMode ? "min-h-screen bg-surface-50 px-3 pb-8 pt-3 md:px-4" : "mx-auto max-w-6xl space-y-5 pb-10"}`}>
      <div className={`mx-auto w-full ${staffMode ? "max-w-xl" : "max-w-6xl"}`}>
        
        {/* ÜST MODÜL DEKORASYONU */}
        {!staffMode && <EventAdminNav eventId={eventId} eventName={eventName} active="checkin" />}
        {staffMode && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-surface-200 bg-white p-3 shadow-sm">
            <Link href={`/admin/events/${eventId}/ops`} className="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 text-xs font-bold text-surface-700 hover:bg-surface-50 active:scale-95">
              <ArrowLeft className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Operasyon</span>
            </Link>
            <span className="inline-flex rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-tight shadow-sm animate-pulse">Görevli Modu</span>
          </div>
        )}

        {/* PLAN GATE KORUMALARI */}
        {planOk === false && (
          <PlanGateCard feature="Manuel check-in ve yoklama sistemi" serverMessage={planGateMessage} />
        )}

        {planOk !== false && (
          <div className="space-y-4">
            
            {/* KAPALILIK VE CANLI DURUM ADASI */}
            <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-card space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">Mobil saha operasyonu</p>
                  <h1 className="text-lg font-bold tracking-tight text-surface-900 sm:text-xl">Hızlı Check-in Kapısı</h1>
                  <p className="text-xs text-surface-400 font-medium truncate max-w-xs sm:max-w-md">{eventName}</p>
                </div>
                
                <div className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight shadow-sm self-start ${
                  isOnline ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"
                }`}>
                  {isOnline ? <Wifi className="h-3.5 w-3.5 mr-1" /> : <WifiOff className="h-3.5 w-3.5 mr-1" />}
                  <span>{isOnline ? "Canlı (Online)" : "Offline Mod"}</span>
                </div>
              </div>

              {/* HIZLI DURUM PENCERELERİ (Mini Matrix Grid) */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-xl border border-surface-100 bg-surface-50 p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-surface-400 truncate">Aktif Oturum</p>
                  <p className="mt-0.5 text-xs font-bold text-surface-900 truncate">{selectedSessionObj?.name || "Seçilmedi"}</p>
                </div>
                <div className="rounded-xl border border-surface-100 bg-surface-50 p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-surface-400 truncate">Anlık Kabul</p>
                  <p className="mt-0.5 text-sm font-bold text-surface-900 font-mono tabular-nums">{todayAttendance}</p>
                </div>
                <div className="rounded-xl border border-surface-100 bg-surface-50 p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-surface-400 truncate">Offline Kuyruk</p>
                  <p className="mt-0.5 text-sm font-bold text-surface-900 font-mono tabular-nums">{offlineQueue.length}</p>
                </div>
              </div>

              {/* SAHA CANLI İSTATİSTİKLERİ DEPOSU */}
              {metrics && (
                <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-6 pt-1">
                  <div className="rounded-xl border border-surface-100 bg-white p-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-surface-400">Kapı Akışı</p>
                    <p className="mt-0.5 text-xs font-bold text-surface-900 font-mono">{metrics.last_hour}/saat</p>
                  </div>
                  <div className="rounded-xl border border-surface-100 bg-white p-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-surface-400">Sevk Başarı</p>
                    <p className="mt-0.5 text-xs font-bold text-surface-900 font-mono">{metrics.successful}/{metrics.total}</p>
                  </div>
                  <div className="rounded-xl border border-surface-100 bg-white p-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-surface-400">En Aktif Masası</p>
                    <p className="mt-0.5 text-[10px] font-bold text-surface-900 truncate font-mono">{metrics.by_staff[0]?.email || "—"}</p>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/20 p-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600">Tekrarlanan</p>
                    <p className="mt-0.5 text-xs font-bold text-amber-900 font-mono">{metrics.duplicate_count}</p>
                  </div>
                  <div className="rounded-xl border border-red-100 bg-red-50/20 p-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-red-500">Geçersiz QR</p>
                    <p className="mt-0.5 text-xs font-bold text-red-600 font-mono">{metrics.invalid_count}</p>
                  </div>
                  <div className="rounded-xl border border-sky-100 bg-sky-50/20 p-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-sky-600">Sınır Alarmı</p>
                    <p className="mt-0.5 text-xs font-bold text-sky-900 font-mono">{metrics.capacity_alerts.length}</p>
                  </div>
                </div>
              )}

              {/* DOLULUK TEHLİKE ALARMI */}
              {metrics?.capacity_alerts?.length ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 text-[11px] font-semibold text-amber-800 flex items-center gap-1.5 animate-in fade-in duration-200">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  <span>{metrics.capacity_alerts[0].session_name}: %{metrics.capacity_alerts[0].fill_rate} salon doluluk uyarısı!</span>
                </div>
              ) : null}
            </div>

            {error && <div className="rounded-xl border border-red-100 bg-red-50/40 p-3.5 text-xs font-semibold text-red-600">{error}</div>}

            {/* ANA OTURUM SEÇME PANELİ */}
            <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-card space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900 border-b border-surface-100 pb-2.5">Giriş Yapılacak Oturumu Belirleyin</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-none pr-0.5">
                {sessions.length === 0 ? (
                  <p className="text-xs font-semibold text-surface-400 py-2">
                    Etkinliğe henüz bir yoklama oturumu eklenmemiş.{" "}
                    <Link href={`/admin/events/${eventId}/sessions`} className="text-surface-900 underline underline-offset-2">
                      Buradan yeni oturum ekle
                    </Link>
                  </p>
                ) : (
                  sessions.map((s) => {
                    const isSessSel = selectedSession === s.id;
                    return (
                      <label key={s.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${
                        isSessSel ? "border-gray-950 bg-white ring-1 ring-gray-950 shadow-sm" : "border-surface-100 bg-white hover:border-surface-300"
                      }`}>
                        <input type="radio" name="session" value={s.id} checked={isSessSel} onChange={() => setSelectedSession(s.id)} className="h-3.5 w-3.5 text-surface-900 focus:ring-0 focus:ring-offset-0 cursor-pointer" />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-xs font-bold text-surface-900 truncate">{s.name}</p>
                          <div className="flex gap-1.5 text-[10px] font-semibold text-surface-400 font-mono uppercase">
                            {s.session_date && <span>{new Date(s.session_date).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}</span>}
                            {s.session_start && <span>· {s.session_start}</span>}
                          </div>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 border rounded-md shadow-sm ${isSessSel ? "border-gray-950 bg-gray-50 text-surface-900" : "border-surface-100 bg-gray-50 text-surface-400"}`}>
                          {s.attendance_count} Kabul
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* YOKLAMA KABUL KAPISI (Check-in Area & QR Hub) */}
            {selectedSession && (
              <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-card space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-surface-100 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-surface-700 stroke-[2]" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">Giriş Yetkilendirme Kapısı</h2>
                  </div>
                  
                  <button type="button" onClick={() => setScannerOpen((v) => !v)} className="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 text-xs font-bold text-surface-700 shadow-sm transition hover:bg-surface-50 active:scale-95">
                    <Camera className="h-3.5 w-3.5 text-surface-500 stroke-[1.8]" />
                    <span>{scannerOpen ? "Kamerayı Kapat" : "Canlı QR Tarayıcı Aç"}</span>
                  </button>
                </div>

                {/* QR Canlı Kamera Okuma Yuvası */}
                {scannerOpen && (
                  <div className="overflow-hidden rounded-xl border border-surface-200 bg-gray-900 p-3 shadow-inner max-w-sm mx-auto animate-in zoom-in-98 duration-200 w-full">
                    <div id={scannerRegionId} className="min-h-[240px] overflow-hidden rounded-lg bg-black flex items-center justify-center text-xs text-white" />
                    {scannerError && <p className="mt-2 text-[10px] font-bold text-red-500 text-center">{scannerError}</p>}
                    <p className="mt-2.5 text-[10px] font-semibold text-surface-400 flex items-center justify-center gap-1">
                      <QrCode className="h-3.5 w-3.5" />
                      <span>Bilet QR kodu, e-posta veya üye kimlik cüzdanı okutabilirsiniz.</span>
                    </p>
                  </div>
                )}

                {/* Manuel E-posta İle Check-in Giriş Girişi */}
                <form onSubmit={inputRef.current?.value ? handleCheckin : undefined} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400 stroke-[2]" />
                    <input 
                      ref={inputRef} 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="Katılımcı kayıt e-posta adresini girin..." 
                      required 
                      autoComplete="off" 
                      disabled={submitting}
                      className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-white pl-9 pr-3.5 text-xs font-semibold outline-none transition focus:border-surface-900" 
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={submitting || !email.trim()} 
                    className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-surface-900 px-5 text-xs font-bold text-white shadow-sm transition hover:bg-surface-800 disabled:opacity-40 active:scale-[0.98]"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5 stroke-[2.5]" />}
                    <span>Kabul Et (Check-in)</span>
                  </button>
                </form>
              </div>
            )}

            {/* OFFLINE SENKRONİZASYON YÖNETİM MERKEZİ */}
            <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-surface-100 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <RotateCcw className={`h-4 w-4 ${syncing ? "animate-spin text-surface-900" : "text-surface-400 stroke-[2]"}`} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900">Yerel Çevrimdışı Bellek Havuzu</h3>
                </div>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => void syncQueue()} disabled={!isOnline || syncing || offlineQueue.length === 0} className="rounded-lg border border-surface-200 bg-white px-2.5 py-1 text-[10px] font-bold text-surface-700 shadow-sm hover:bg-surface-50 disabled:opacity-40">
                    Kuyruğu Eşitle
                  </button>
                  <button type="button" onClick={clearQueue} disabled={offlineQueue.length === 0} className="rounded-lg border border-red-100 bg-white px-2 py-1 text-[10px] font-bold text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-40">
                    <Trash2 className="h-3.5 w-3.5 stroke-[1.8]" />
                  </button>
                </div>
              </div>
              
              {offlineQueue.length === 0 ? (
                <p className="flex items-center gap-1.5 text-xs font-medium text-surface-400">
                  <Smartphone className="h-3.5 w-3.5 text-gray-300" />
                  <span>Cihaz hafızasında senkronizasyon bekleyen offline kayıt bulunmuyor.</span>
                </p>
              ) : (
                <div className="max-h-40 divide-y divide-gray-100 overflow-y-auto pr-0.5 scrollbar-none font-mono text-[11px] font-medium text-surface-500">
                  {offlineQueue.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between gap-3">
                      <span className="truncate text-surface-700"><strong className="font-sans text-[10px] uppercase text-surface-400 mr-1">{item.type === "ticket" ? "Bilet" : "E-posta"}:</strong> {item.value}</span>
                      <span className="shrink-0 text-surface-400 font-sans font-bold">{item.attempts} deneme</span>
                      {item.lastError && <p className="text-red-500 text-[10px] tracking-tight">{item.lastError}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* GÜNLÜK ANLIK KAYIT GÜNLÜĞÜ GEÇMİŞİ */}
            {log.length > 0 && (
              <div className="rounded-2xl border border-surface-200 bg-white shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between border-b border-surface-100 bg-surface-50 px-4.5 py-3">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-surface-900">
                    <History className="h-3.5 w-3.5 text-surface-400 stroke-[2]" />
                    <span>Kapı Giriş Hareketleri Günlüğü</span>
                  </h3>
                  <button type="button" onClick={() => setLog([])} className="text-[10px] font-bold text-surface-400 hover:text-red-500 transition-colors">Temizle</button>
                </div>
                
                <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto scrollbar-none bg-white">
                  {log.map((entry, i) => (
                    <div key={`${entry.time}-${i}`} className={`flex items-start gap-3 px-4.5 py-3 transition-colors ${entry.success ? "bg-white" : "bg-red-50/10"}`}>
                      {entry.success ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5 stroke-[2.5]" /> : <XCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5 stroke-[2]" />}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="truncate text-xs font-bold text-surface-900 tracking-tight">{entry.email}</p>
                        <p className="text-[11px] font-medium text-surface-400 leading-normal">{entry.queued ? "⚠️ " : ""}{entry.message}</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold text-surface-400 font-mono pt-0.5">{entry.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}