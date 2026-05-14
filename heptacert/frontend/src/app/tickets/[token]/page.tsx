"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { API_BASE, getPublicTicket, type PublicTicketInfo } from "@/lib/api";
import {
  CalendarCheck,
  CheckCircle2,
  Copy,
  Loader2,
  Mail,
  QrCode,
  Ticket,
  User,
  XCircle,
} from "lucide-react";

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function PublicTicketPage() {
  const params = useParams();
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token;
  const [ticket, setTicket] = useState<PublicTicketInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const qrUrl = useMemo(() => {
    if (!token) return "";
    return `${API_BASE}/tickets/${encodeURIComponent(String(token))}/qr`;
  }, [token]);

  useEffect(() => {
    if (!token) return;
    getPublicTicket(String(token))
      .then(setTicket)
      .catch(() => setError("Bilet bulunamadı veya artık geçerli değil."));
  }, [token]);

  async function copyTicketLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
          <XCircle className="mx-auto h-10 w-10 text-red-500" />
          <p className="mt-4 text-sm font-semibold text-surface-800">{error}</p>
        </div>
      </main>
    );
  }

  if (!ticket || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-50 px-4">
        <div className="inline-flex items-center gap-2 text-sm text-surface-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Bilet yükleniyor...
        </div>
      </main>
    );
  }

  const used = ticket.status === "used";
  const cancelled = ticket.status === "cancelled";

  return (
    <main className="min-h-screen bg-surface-50 px-4 py-8 text-surface-900">
      <section className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm">
        <div className="border-b border-surface-100 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
                <Ticket className="h-3.5 w-3.5" />
                Dijital Bilet
              </p>
              <h1 className="mt-3 truncate text-2xl font-black text-surface-900">{ticket.event_name}</h1>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-50 text-surface-600">
              <QrCode className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="px-5 py-6">
          <div className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="Bilet QR kodu" className="mx-auto h-64 w-64 max-w-full object-contain" />
          </div>

          <div
            className={`mt-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
              cancelled
                ? "border-red-200 bg-red-50 text-red-700"
                : used
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-sky-200 bg-sky-50 text-sky-700"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              {cancelled ? <XCircle className="h-4 w-4" /> : used ? <CheckCircle2 className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
              {cancelled ? "Bilet iptal edildi" : used ? "Giriş yapıldı" : "Giriş için hazır"}
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">{ticket.status}</span>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">
                <User className="h-3.5 w-3.5" />
                Katılımcı
              </p>
              <p className="mt-2 font-semibold text-surface-900">{ticket.attendee_name}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-surface-500">
                <Mail className="h-3.5 w-3.5" />
                {ticket.attendee_email}
              </p>
            </div>

            <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">
                <CalendarCheck className="h-3.5 w-3.5" />
                Bilet Bilgisi
              </p>
              <div className="mt-3 grid gap-2 text-sm text-surface-600 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-surface-400">Oluşturma</p>
                  <p className="font-medium text-surface-800">{formatDate(ticket.issued_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-400">Giriş</p>
                  <p className="font-medium text-surface-800">{formatDate(ticket.checked_in_at)}</p>
                </div>
              </div>
            </div>
          </div>

          <button type="button" onClick={copyTicketLink} className="btn-primary mt-5 w-full justify-center">
            <Copy className="h-4 w-4" />
            {copied ? "Kopyalandı" : "Bilet Linkini Kopyala"}
          </button>
        </div>
      </section>
    </main>
  );
}
