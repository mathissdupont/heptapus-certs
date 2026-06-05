"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { checkInEventTicket, listEventTickets, updateEventTicketStatus, type EventTicketOut } from "@/lib/api";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import { useI18n } from "@/lib/i18n";
import {
  Camera,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  ImageUp,
  Loader2,
  QrCode,
  RefreshCcw,
  Search,
  ScanLine,
  Ticket,
  UserCheck,
  Ban,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react";

type TicketFilter = "all" | "issued" | "used" | "cancelled" | "revoked";

function formatDate(value?: string | null, locale = "tr-TR") {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getTicketStatus(ticket: EventTicketOut, labels: { used: string; cancelled: string; ready: string }) {
  if (ticket.status === "used") {
    return {
      label: labels.used,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    };
  }
  if (ticket.status === "cancelled" || ticket.status === "revoked") {
    return {
      label: labels.cancelled,
      className: "border-red-200 bg-red-50 text-red-700",
      icon: <XCircle className="h-3.5 w-3.5" />,
    };
  }
  return {
    label: labels.ready,
    className: "border-sky-200 bg-sky-50 text-sky-700",
    icon: <QrCode className="h-3.5 w-3.5" />,
  };
}

function tokenFromQr(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/\/tickets\/([^/?#]+)/);
  if (match?.[1]) return decodeURIComponent(match[1]);
  return trimmed;
}

export default function EventTicketsPage() {
  const params = useParams();
  const eventId = Number(Array.isArray(params?.id) ? params.id[0] : params?.id);

  const { lang } = useI18n();
  const isTr = lang === "tr";
  const locale = isTr ? "tr-TR" : "en-US";
  const copy = {
    // Ticket status labels
    statusUsed: isTr ? "Giriş yapıldı" : "Checked in",
    statusCancelled: isTr ? "İptal" : "Cancelled",
    statusReady: isTr ? "Hazır" : "Ready",
    // Page header
    tagLabel: isTr ? "Bilet ve giriş kontrolü" : "Ticket and entry control",
    pageTitle: isTr ? "Dijital Biletler" : "Digital Tickets",
    pageSubtitle: isTr ? "Katılımcı biletlerini takip et, QR okut ve giriş durumunu tek ekrandan yönet." : "Track attendee tickets, scan QR codes, and manage entry status from a single screen.",
    btnRefresh: isTr ? "Yenile" : "Refresh",
    // Stats
    statTotal: isTr ? "Toplam" : "Total",
    statReady: isTr ? "Hazır" : "Ready",
    statUsed: isTr ? "Giriş Yapıldı" : "Checked In",
    statCancelled: isTr ? "İptal" : "Cancelled",
    statRate: isTr ? "Giriş Oranı" : "Entry Rate",
    // Quick check-in section
    quickCheckinTitle: isTr ? "Hızlı Check-in" : "Quick Check-in",
    quickCheckinSubtitle: isTr ? "Token, bilet linki veya QR çıktısı ile giriş onayla." : "Confirm entry with a token, ticket link, or QR output.",
    tokenPlaceholder: isTr ? "Token veya /tickets/... linki" : "Token or /tickets/... link",
    btnConfirmEntry: isTr ? "Girişi Onayla" : "Confirm Entry",
    btnClose: isTr ? "Kapat" : "Close",
    btnCamera: isTr ? "Kamera" : "Camera",
    // Scanner
    scannerLabel: isTr ? "Kamera ile okut veya QR görseli yükle" : "Scan with camera or upload QR image",
    btnUploadImage: isTr ? "Görsel Yükle" : "Upload Image",
    scannerReady: isTr ? "QR kodu çerçevenin içine alın" : "Place QR code inside the frame",
    scannerStarting: isTr ? "Kamera hazırlanıyor..." : "Camera starting...",
    // Pending ticket
    qrReadLabel: isTr ? "QR okundu" : "QR scanned",
    statusLabel: isTr ? "Durum" : "Status",
    pendingUsed: isTr ? "Giriş yapıldı" : "Checked in",
    pendingReady: isTr ? "Hazır" : "Ready",
    pendingCancelled: isTr ? "İptal edildi" : "Cancelled",
    btnCheckinClosed: isTr ? "Check-in kapalı" : "Check-in closed",
    btnCancel: isTr ? "Vazgeç" : "Cancel",
    // List control
    listControlTitle: isTr ? "Liste Kontrolü" : "List Control",
    searchPlaceholder: isTr ? "Ad, e-posta veya token ara" : "Search name, email or token",
    filterAll: isTr ? "Tümü" : "All",
    filterReady: isTr ? "Hazır" : "Ready",
    filterUsed: isTr ? "Giriş" : "Entry",
    filterCancelled: isTr ? "İptal" : "Cancelled",
    // Ticket table / list
    colIssuedAt: isTr ? "Oluşturma" : "Issued",
    colCheckedInAt: isTr ? "Giriş" : "Check-in",
    btnCopyLink: isTr ? "Link" : "Link",
    btnCopied: isTr ? "Kopyalandı" : "Copied",
    btnOpen: isTr ? "Aç" : "Open",
    btnCancelTicket: isTr ? "İptal et" : "Cancel",
    btnActivate: isTr ? "Aktif et" : "Activate",
    // Empty / loading states
    loadingTickets: isTr ? "Biletler yükleniyor..." : "Loading tickets...",
    emptyNoTickets: isTr ? "Henüz bilet oluşturulmamış" : "No tickets created yet",
    emptyNoTicketsHint: isTr ? "Bu etkinliğe yeni kayıt geldikçe biletler burada görünecek." : "Tickets will appear here as new registrations come in.",
    emptyNoMatch: isTr ? "Bu filtreyle eşleşen bilet bulunamadı." : "No tickets match this filter.",
    // Errors / messages
    errLoadTickets: isTr ? "Biletler yüklenemedi." : "Failed to load tickets.",
    errQrNotFound: isTr ? "QR okundu ancak bu etkinlikte eşleşen bilet bulunamadı. Listeyi yenileyip tekrar deneyin." : "QR scanned but no matching ticket found for this event. Refresh the list and try again.",
    errQrFileFailed: isTr ? "Yüklenen görselde okunabilir bir QR bulunamadı." : "No readable QR code found in the uploaded image.",
    errQrScannerFailed: isTr ? "QR okuyucu başlatılamadı." : "Failed to start QR reader.",
    errCheckinFailed: isTr ? "Check-in başarısız oldu." : "Check-in failed.",
    errStatusUpdateFailed: isTr ? "Bilet durumu güncellenemedi." : "Failed to update ticket status.",
    msgCheckinSuccess: (name: string) => isTr ? `${name} için giriş onaylandı.` : `Entry confirmed for ${name}.`,
    msgTicketActivated: (name: string) => isTr ? `${name} bileti tekrar aktif.` : `${name}'s ticket is active again.`,
    msgTicketCancelled: (name: string) => isTr ? `${name} bileti iptal edildi.` : `${name}'s ticket has been cancelled.`,
  };

  const [tickets, setTickets] = useState<EventTicketOut[]>([]);
  const [token, setToken] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TicketFilter>("all");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [pendingTicket, setPendingTicket] = useState<EventTicketOut | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<any>(null);

  const stats = useMemo(() => {
    const used = tickets.filter((ticket) => ticket.status === "used").length;
    const cancelled = tickets.filter((ticket) => ticket.status === "cancelled" || ticket.status === "revoked").length;
    const ready = tickets.length - used - cancelled;
    const usedRate = tickets.length ? Math.round((used / tickets.length) * 100) : 0;
    return { total: tickets.length, used, ready, cancelled, usedRate };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLocaleLowerCase(locale);
    return tickets.filter((ticket) => {
      const matchesFilter = filter === "all" || ticket.status === filter;
      const matchesSearch =
        !q ||
        ticket.attendee_name.toLocaleLowerCase(locale).includes(q) ||
        ticket.attendee_email.toLocaleLowerCase(locale).includes(q) ||
        ticket.token.toLocaleLowerCase(locale).includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search, tickets]);

  async function loadTickets() {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const nextTickets = await listEventTickets(eventId);
      setTickets(nextTickets);
      setPendingTicket((current) => (current ? nextTickets.find((ticket) => ticket.id === current.id) || current : null));
    } catch (err: any) {
      setError(err.message || copy.errLoadTickets);
    } finally {
      setLoading(false);
    }
  }

  function findTicketByToken(value: string, source = tickets) {
    const normalizedToken = tokenFromQr(value);
    return source.find((ticket) => ticket.token === normalizedToken);
  }

  function stageScannedTicket(value: string) {
    const normalizedToken = tokenFromQr(value);
    setToken(normalizedToken);
    setShowScanner(false);
    setError(null);
    setMessage(null);
    const ticket = findTicketByToken(normalizedToken);
    if (ticket) {
      setPendingTicket(ticket);
      return;
    }
    setPendingTicket(null);
    setError(copy.errQrNotFound);
  }

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    if (!showScanner) return;
    let cancelled = false;

    async function initScanner() {
      setScannerStarting(true);
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode("qr-reader", false);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 260, height: 260 },
          },
          (decodedText: string) => {
            stageScannedTicket(decodedText);
          },
          () => {},
        );
      } catch (err: any) {
        setError(err?.message || copy.errQrScannerFailed);
      } finally {
        if (!cancelled) setScannerStarting(false);
      }
    }

    initScanner();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        scanner.stop?.().catch?.(() => {}).finally?.(() => scanner.clear?.().catch?.(() => {}));
      }
    };
  }, [showScanner]);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const reader = new Html5Qrcode("qr-file-reader");
      const decodedText = await reader.scanFile(file, true);
      stageScannedTicket(decodedText);
      reader.clear();
    } catch {
      setError(copy.errQrFileFailed);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function confirmCheckIn(rawToken = token) {
    const normalizedToken = tokenFromQr(rawToken);
    if (!normalizedToken) return;
    setChecking(true);
    setMessage(null);
    setError(null);
    try {
      const checkedTicket = await checkInEventTicket(eventId, normalizedToken);
      setMessage(copy.msgCheckinSuccess(checkedTicket.attendee_name));
      setToken("");
      setPendingTicket(null);
      await loadTickets();
    } catch (err: any) {
      setError(err.message || copy.errCheckinFailed);
    } finally {
      setChecking(false);
    }
  }

  async function handleCheckIn(event: React.FormEvent) {
    event.preventDefault();
    await confirmCheckIn(token);
  }

  async function copyTicket(ticket: EventTicketOut) {
    await navigator.clipboard.writeText(ticket.qr_payload);
    setCopiedId(ticket.id);
    window.setTimeout(() => setCopiedId(null), 1600);
  }

  async function changeTicketStatus(ticket: EventTicketOut, status: "issued" | "cancelled" | "revoked") {
    setUpdatingId(ticket.id);
    setMessage(null);
    setError(null);
    try {
      const updated = await updateEventTicketStatus(eventId, ticket.id, status);
      setTickets((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (pendingTicket?.id === updated.id) setPendingTicket(updated);
      setMessage(status === "issued" ? copy.msgTicketActivated(updated.attendee_name) : copy.msgTicketCancelled(updated.attendee_name));
    } catch (err: any) {
      setError(err.message || copy.errStatusUpdateFailed);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 pb-10">
      <EventAdminNav eventId={eventId} active="tickets" className="mb-6 flex flex-col gap-2" />

      <section className="surface-panel overflow-hidden p-0">
        <div className="border-b border-surface-100 px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                <Ticket className="h-3.5 w-3.5" />
                {copy.tagLabel}
              </p>
              <h1 className="mt-3 text-2xl font-black text-surface-900">{copy.pageTitle}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-500">
                {copy.pageSubtitle}
              </p>
            </div>
            <button type="button" onClick={loadTickets} className="btn-secondary justify-center">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              {copy.btnRefresh}
            </button>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-surface-100 bg-surface-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-400">{copy.statTotal}</p>
            <p className="mt-1 text-2xl font-black text-surface-900">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-500">{copy.statReady}</p>
            <p className="mt-1 text-2xl font-black text-sky-700">{stats.ready}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-500">{copy.statUsed}</p>
            <p className="mt-1 text-2xl font-black text-emerald-700">{stats.used}</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-500">{copy.statCancelled}</p>
            <p className="mt-1 text-2xl font-black text-red-700">{stats.cancelled}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">{copy.statRate}</p>
            <p className="mt-1 text-2xl font-black text-amber-700">%{stats.usedRate}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-surface-900">{copy.quickCheckinTitle}</h2>
              <p className="text-sm text-surface-500">{copy.quickCheckinSubtitle}</p>
            </div>
          </div>

          <form onSubmit={handleCheckIn} className="mt-5 flex flex-col gap-3 md:flex-row">
            <input
              value={token}
              onChange={(event) => {
                setToken(event.target.value);
                setPendingTicket(findTicketByToken(event.target.value) || null);
              }}
              placeholder={copy.tokenPlaceholder}
              className="input-field flex-1"
            />
            <button type="submit" disabled={checking || !token.trim()} className="btn-primary justify-center">
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              {copy.btnConfirmEntry}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowScanner((value) => !value);
                setError(null);
              }}
              className="btn-secondary justify-center"
            >
              {showScanner ? <X className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              {showScanner ? copy.btnClose : copy.btnCamera}
            </button>
          </form>

          {showScanner && (
            <div className="mt-5 rounded-xl border border-dashed border-surface-200 bg-surface-50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-surface-700">{copy.scannerLabel}</p>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary min-h-0 px-3 py-2 text-xs">
                  <ImageUp className="h-4 w-4" />
                  {copy.btnUploadImage}
                </button>
              </div>
              <div className="relative overflow-hidden rounded-2xl border border-surface-200 bg-surface-950 p-3 shadow-inner">
                <div id="qr-reader" className="min-h-[320px] overflow-hidden rounded-xl bg-black [&_video]:h-full [&_video]:min-h-[320px] [&_video]:w-full [&_video]:object-cover" />
                <div className="pointer-events-none absolute inset-3 rounded-xl ring-1 ring-white/10" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-3xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(2,6,23,0.45)]" />
                <div className="pointer-events-none absolute inset-x-6 bottom-6 rounded-xl border border-white/10 bg-black/45 px-4 py-3 text-center text-xs font-semibold text-white backdrop-blur">
                  {scannerStarting ? copy.scannerStarting : copy.scannerReady}
                </div>
              </div>
              <div id="qr-file-reader" className="hidden" />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </div>
          )}

          {pendingTicket && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-brand-200 bg-brand-50">
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
                    <ScanLine className="h-3.5 w-3.5" />
                    {copy.qrReadLabel}
                  </p>
                  <h3 className="mt-2 text-lg font-black text-surface-900">{pendingTicket.attendee_name}</h3>
                  <p className="mt-1 text-sm text-surface-600">{pendingTicket.attendee_email}</p>
                  <p className="mt-2 text-xs text-surface-500">
                    {copy.statusLabel}: <span className="font-semibold">{pendingTicket.status === "used" ? copy.pendingUsed : pendingTicket.status === "issued" ? copy.pendingReady : copy.pendingCancelled}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {pendingTicket.status === "issued" ? (
                    <button type="button" onClick={() => confirmCheckIn(pendingTicket.token)} disabled={checking} className="btn-primary justify-center">
                      {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                      {copy.btnConfirmEntry}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700">
                      <Ban className="h-4 w-4" />
                      {copy.btnCheckinClosed}
                    </span>
                  )}
                  <button type="button" onClick={() => setPendingTicket(null)} className="btn-secondary justify-center">
                    <X className="h-4 w-4" />
                    {copy.btnCancel}
                  </button>
                </div>
              </div>
            </div>
          )}

          {message && (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-surface-900">{copy.listControlTitle}</h2>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              ["all", "Tümü"],
              ["issued", "Hazır"],
              ["used", "Giriş"],
              ["cancelled", "İptal"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value as TicketFilter)}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  filter === value
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-surface-200 bg-white text-surface-600 hover:border-surface-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-surface-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Biletler yükleniyor...
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-10 text-center">
            <Ticket className="mx-auto h-10 w-10 text-surface-300" />
            <p className="mt-3 font-semibold text-surface-800">Henüz bilet oluşturulmamış</p>
            <p className="mt-1 text-sm text-surface-500">Bu etkinliğe yeni kayıt geldikçe biletler burada görünecek.</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-10 text-center text-sm text-surface-500">Bu filtreyle eşleşen bilet bulunamadı.</div>
        ) : (
          <div className="divide-y divide-surface-100">
            {filteredTickets.map((ticket) => {
              const status = getTicketStatus(ticket, {
                used: copy.statusUsed,
                cancelled: copy.statusCancelled,
                ready: copy.statusReady,
              });
              return (
                <article key={ticket.id} className="grid gap-4 p-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-50">
                      <Ticket className="h-5 w-5 text-surface-500" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-surface-900">{ticket.attendee_name}</h3>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-surface-500">{ticket.attendee_email}</p>
                    <div className="mt-3 grid gap-2 text-xs text-surface-500 sm:grid-cols-2">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        {copy.colIssuedAt}: {formatDate(ticket.issued_at, locale)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {copy.colCheckedInAt}: {formatDate(ticket.checked_in_at, locale)}
                      </span>
                    </div>
                    <p className="mt-2 break-all rounded-lg bg-surface-50 px-3 py-2 text-xs text-surface-500">
                      {ticket.qr_payload}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button type="button" onClick={() => copyTicket(ticket)} className="btn-secondary min-h-0 px-3 py-2 text-xs">
                      <Copy className="h-4 w-4" />
                      {copiedId === ticket.id ? "Kopyalandı" : "Link"}
                    </button>
                    <a href={ticket.qr_payload} target="_blank" rel="noreferrer" className="btn-secondary min-h-0 px-3 py-2 text-xs">
                      <ExternalLink className="h-4 w-4" />
                      Aç
                    </a>
                    {ticket.status === "issued" && (
                      <button
                        type="button"
                        onClick={() => {
                          setToken(ticket.token);
                          setPendingTicket(ticket);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="btn-primary min-h-0 px-3 py-2 text-xs"
                      >
                        <UserCheck className="h-4 w-4" />
                        Check-in
                      </button>
                    )}
                    {ticket.status === "issued" || ticket.status === "used" ? (
                      <button
                        type="button"
                        onClick={() => changeTicketStatus(ticket, "cancelled")}
                        disabled={updatingId === ticket.id}
                        className="btn-secondary min-h-0 px-3 py-2 text-xs text-red-700 hover:border-red-200 hover:bg-red-50"
                      >
                        {updatingId === ticket.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                        İptal et
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => changeTicketStatus(ticket, "issued")}
                        disabled={updatingId === ticket.id}
                        className="btn-secondary min-h-0 px-3 py-2 text-xs"
                      >
                        {updatingId === ticket.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                        Aktif et
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
