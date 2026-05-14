"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { API_BASE, getPublicTicket, type PublicTicketInfo } from "@/lib/api";
import {
  CheckCircle2,
  Copy,
  FileText,
  Home,
  ImageIcon,
  Loader2,
  Mail,
  QrCode,
  Ticket,
  User,
  WalletCards,
  XCircle,
} from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

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
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [homeHint, setHomeHint] = useState(false);

  const qrUrl = useMemo(() => {
    if (!token) return "";
    return `${API_BASE}/tickets/${encodeURIComponent(String(token))}/qr`;
  }, [token]);

  const pngUrl = useMemo(() => {
    if (!token) return "";
    return `${API_BASE}/tickets/${encodeURIComponent(String(token))}/png`;
  }, [token]);

  const pdfUrl = useMemo(() => {
    if (!token) return "";
    return `${API_BASE}/tickets/${encodeURIComponent(String(token))}/pdf`;
  }, [token]);

  useEffect(() => {
    if (!token) return;
    getPublicTicket(String(token))
      .then(setTicket)
      .catch(() => setError("Bilet bulunamadı veya artık geçerli değil."));
  }, [token]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function copyTicketLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function addToHomeScreen() {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice.catch(() => null);
      setInstallPrompt(null);
      return;
    }
    setHomeHint(true);
    window.setTimeout(() => setHomeHint(false), 6000);
  }

  // Yükleniyor veya Hata durumları için minimalist Apple stili
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F5F7] px-4">
        <div className="w-full max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <XCircle className="mx-auto h-12 w-12 text-red-500" strokeWidth={1.5} />
          <h2 className="mt-4 text-lg font-semibold text-zinc-900">Hata</h2>
          <p className="mt-2 text-sm text-zinc-500">{error}</p>
        </div>
      </main>
    );
  }

  if (!ticket || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F5F7] px-4">
        <div className="flex flex-col items-center gap-4 text-zinc-400">
          <Loader2 className="h-8 w-8 animate-spin" strokeWidth={1.5} />
          <span className="text-sm font-medium">Biletiniz hazırlanıyor...</span>
        </div>
      </main>
    );
  }

  const used = ticket.status === "used";
  const cancelled = ticket.status === "cancelled" || ticket.status === "revoked";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F5F7] px-4 py-12 font-sans selection:bg-blue-100 selection:text-blue-900">
      <section className="w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/[0.03]">
        
        {/* Üst Kısım: Etkinlik Başlığı */}
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 text-zinc-900 ring-1 ring-black/[0.05]">
            <Ticket className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Dijital Bilet
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">
            {ticket.event_name}
          </h1>
        </div>

        {/* Orta Kısım: QR Kod */}
        <div className="flex flex-col items-center px-8 pb-8">
          <div className="rounded-3xl bg-white p-5 shadow-[0_0_24px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.02]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="Bilet QR kodu"
              className="h-48 w-48 object-contain"
              draggable={false}
            />
          </div>

          <div
            className={`mt-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
              cancelled
                ? "bg-red-50 text-red-600"
                : used
                ? "bg-zinc-100 text-zinc-500"
                : "bg-blue-50 text-blue-600"
            }`}
          >
            {cancelled ? (
              <XCircle className="h-4 w-4" />
            ) : used ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <QrCode className="h-4 w-4" />
            )}
            {cancelled ? "İptal Edildi" : used ? "Kullanıldı" : "Girişe Hazır"}
          </div>
        </div>

        {/* Bilet Ayırıcı Çizgi (Apple Wallet Stili) */}
        <div className="relative flex w-full items-center">
          <div className="absolute -left-4 h-8 w-8 rounded-full bg-[#F5F5F7] ring-1 ring-inset ring-black/[0.03]"></div>
          <div className="w-full border-t-2 border-dashed border-zinc-200"></div>
          <div className="absolute -right-4 h-8 w-8 rounded-full bg-[#F5F5F7] ring-1 ring-inset ring-black/[0.03]"></div>
        </div>

        {/* Alt Kısım: Bilet Detayları */}
        <div className="bg-zinc-50/50 px-8 py-8">
          <div className="space-y-5">
            {/* Katılımcı */}
            <div>
              <p className="flex items-center gap-2 text-[13px] font-medium text-zinc-400">
                <User className="h-4 w-4" strokeWidth={2} />
                Katılımcı
              </p>
              <p className="mt-1 text-base font-semibold text-zinc-900">
                {ticket.attendee_name}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-zinc-500">
                <Mail className="h-3.5 w-3.5" />
                {ticket.attendee_email}
              </p>
            </div>

            <hr className="border-zinc-200" />

            {/* Tarihler */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[13px] font-medium text-zinc-400">Oluşturma</p>
                <p className="mt-1 text-sm font-medium text-zinc-900">
                  {formatDate(ticket.issued_at)}
                </p>
              </div>
              <div>
                <p className="text-[13px] font-medium text-zinc-400">Giriş Zamanı</p>
                <p className="mt-1 text-sm font-medium text-zinc-900">
                  {formatDate(ticket.checked_in_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Kurumsal Apple Wallet Açıklaması */}
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-zinc-800">
              <WalletCards className="h-4.5 w-4.5 text-zinc-900" />
              Apple Wallet
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
              Cüzdan entegrasyonu için altyapı çalışmalarımız devam etmektedir. Bu özellik planlanan gelecek güncellemelerle birlikte aktif edilecektir.
            </p>
          </div>

          {/* Aksiyon Butonları Grubu */}
          <div className="mt-6 flex flex-col gap-3">
            
            {/* İndirme Seçenekleri (Segmented Control Stili) */}
            {!cancelled && (
              <div className="flex w-full items-center rounded-2xl bg-zinc-200/50 p-1 ring-1 ring-inset ring-zinc-200/50">
                <a
                  href={pdfUrl}
                  download
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-transparent py-2.5 text-[14px] font-semibold text-zinc-600 transition-all hover:bg-white hover:text-zinc-900 hover:shadow-sm active:scale-[0.98]"
                >
                  <FileText className="h-4 w-4" />
                  PDF İndir
                </a>
                <div className="mx-1 h-5 w-[1px] bg-zinc-300"></div>
                <a
                  href={pngUrl}
                  download
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-transparent py-2.5 text-[14px] font-semibold text-zinc-600 transition-all hover:bg-white hover:text-zinc-900 hover:shadow-sm active:scale-[0.98]"
                >
                  <ImageIcon className="h-4 w-4" />
                  PNG İndir
                </a>
              </div>
            )}

            <button
              type="button"
              onClick={addToHomeScreen}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-[15px] font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-200 transition-all hover:bg-zinc-50 active:scale-[0.98]"
            >
              <Home className="h-5 w-5" />
              Ana Ekrana Ekle
            </button>
            
            {homeHint && (
              <p className="rounded-2xl bg-blue-50 px-4 py-3 text-[13px] leading-5 text-blue-700">
                iPhone Safari: <strong>Paylaş</strong> simgesi &gt; <strong>Ana Ekrana Ekle</strong>. <br/> Android Chrome: <strong>Menü (⋮)</strong> &gt; <strong>Ana Ekrana Ekle</strong>.
              </p>
            )}

            <button
              type="button"
              onClick={copyTicketLink}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98] active:bg-blue-800 disabled:opacity-50"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Kopyalandı
                </>
              ) : (
                <>
                  <Copy className="h-5 w-5" />
                  Bilet Linkini Kopyala
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}