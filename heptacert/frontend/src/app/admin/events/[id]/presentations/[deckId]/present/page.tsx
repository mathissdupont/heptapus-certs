"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Database, Download, Expand, FileText, Loader2, Presentation, QrCode, Smartphone } from "lucide-react";
import PdfStageViewer from "@/components/Admin/Presentations/PdfStageViewer";
import HeptaCertLogoMark from "@/components/Brand/HeptaCertLogoMark";
import { apiFetch, normalizeApiAssetUrl } from "@/lib/api";
import {
  downloadPresentationFile,
  getPresentationSession,
  presentationAuthHeaders,
  presentationConvertedFileUrl,
  presentationFileUrl,
  type PresentationDeck,
} from "@/lib/presentationsApi";
import { useI18n } from "@/lib/i18n";

type StageBranding = {
  org_name?: string | null;
  brand_logo?: string | null;
};

function isPdf(deck: PresentationDeck | null) {
  if (!deck) return false;
  return deck.file_content_type === "application/pdf" || (deck.file_filename || "").toLowerCase().endsWith(".pdf");
}

function isConverting(deck: PresentationDeck | null) {
  return deck?.conversion_status === "queued" || deck?.conversion_status === "processing";
}

export default function EventPresentationStagePage() {
  const params = useParams<{ id: string; deckId: string }>();
  const deckId = Number(params.deckId);
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const [deck, setDeck] = useState<PresentationDeck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [pointer, setPointer] = useState<{ active: boolean; x: number; y: number }>({ active: false, x: 0.5, y: 0.5 });
  const [branding, setBranding] = useState<StageBranding | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [preloadSignal, setPreloadSignal] = useState(0);
  const [preloadStatus, setPreloadStatus] = useState<"idle" | "loading" | "ready">("idle");
  const pdfRequestHeaders = useMemo(() => presentationAuthHeaders(), []);

  const copy = useMemo(() => ({
    loadFailed: isTr ? "Sunum acilamadi." : "Could not open presentation.",
    noFile: isTr ? "Bu sunuma bagli dosya bulunamadi." : "No file is attached to this presentation.",
    download: isTr ? "Dosyayi ac / indir" : "Open / download file",
    phoneQr: isTr ? "Telefon QR" : "Phone QR",
    phoneQrHint: isTr ? "Yetkili hesabinizla telefondan okutun. Kontrol yetkisi olmayan kullanicilar sayfa degistiremez." : "Scan with an authorized account. Users without control permission cannot change slides.",
    fullscreen: isTr ? "Tam ekran" : "Fullscreen",
    pptxTitle: isTr ? "PowerPoint dosyasi hazir" : "PowerPoint file is ready",
    pptxBody: isTr
      ? "Donusturulmus PDF henuz hazir degil. Orijinal dosyayi acabilir ya da worker'in donusumu bitirmesini bekleyebilirsiniz."
      : "The converted PDF is not ready yet. Open the original file or wait for the worker to finish conversion.",
    convertingTitle: isTr ? "Sunum hazirlaniyor" : "Preparing presentation",
    convertingBody: isTr
      ? "PowerPoint dosyasi arka planda PDF'e donusturuluyor. Bu sayfa birazdan otomatik yenilenir."
      : "The PowerPoint file is being converted to PDF in the background. This page refreshes automatically.",
    failedTitle: isTr ? "Donusum basarisiz" : "Conversion failed",
    pdfLoading: isTr ? "PDF yukleniyor" : "Loading PDF",
    pdfRendering: isTr ? "Sayfa hazirlaniyor" : "Rendering page",
    pdfError: isTr ? "PDF gosterilemedi." : "Could not display PDF.",
    retry: isTr ? "Tekrar dene" : "Retry",
    page: isTr ? "Sayfa" : "Page",
    preload: isTr ? "Bellege al" : "Preload",
    preloading: isTr ? "Aliniyor" : "Loading",
    preloaded: isTr ? "Hazir" : "Ready",
  }), [isTr]);

  useEffect(() => {
    apiFetch(`/admin/presentations/${deckId}`)
      .then((res) => res.json())
      .then((data) => {
        setDeck(data);
        setError(null);
      })
      .catch((ex: any) => setError(ex?.message || copy.loadFailed))
      .finally(() => setLoading(false));
  }, [copy.loadFailed, deckId]);

  useEffect(() => {
    apiFetch("/admin/organization/settings")
      .then((res) => res.json())
      .then((data) => setBranding({ ...data, brand_logo: normalizeApiAssetUrl(data?.brand_logo) }))
      .catch(() => setBranding(null));
  }, []);

  useEffect(() => {
    if (!isConverting(deck)) return;
    const timer = window.setTimeout(() => {
      apiFetch(`/admin/presentations/${deckId}`)
        .then((res) => res.json())
        .then((data) => setDeck(data))
        .catch(() => undefined);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [deck, deckId]);

  useEffect(() => {
    if (!deckId) return;
    let cancelled = false;
    async function syncSession() {
      try {
        const state = await getPresentationSession(deckId);
        if (!cancelled) {
          setSlideIndex(Math.max(0, state.slide_index || 0));
          setPointer({
            active: Boolean(state.pointer_active),
            x: typeof state.pointer_x === "number" ? state.pointer_x : 0.5,
            y: typeof state.pointer_y === "number" ? state.pointer_y : 0.5,
          });
        }
      } catch {
        // The stage should keep rendering even if remote state is temporarily unavailable.
      }
    }
    void syncSession();
    const timer = window.setInterval(() => void syncSession(), 250);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [deckId]);

  useEffect(() => {
    if (!qrOpen || qrImageUrl) return;
    let cancelled = false;
    apiFetch(`/admin/presentations/${deckId}/remote-qr`)
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        setQrImageUrl(URL.createObjectURL(blob));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [deckId, qrImageUrl, qrOpen]);

  useEffect(() => {
    return () => {
      if (qrImageUrl) URL.revokeObjectURL(qrImageUrl);
    };
  }, [qrImageUrl]);

  const fileUrl = deck ? presentationFileUrl(deck) : null;
  const convertedUrl = deck ? presentationConvertedFileUrl(deck) : null;
  const stageUrl = convertedUrl || (deck && isPdf(deck) ? fileUrl : null);
  const handlePageCountChange = useCallback((nextPageCount: number) => {
    setPageCount(nextPageCount);
  }, []);

  function requestFullscreen() {
    const root = document.documentElement;
    if (root.requestFullscreen) void root.requestFullscreen();
  }

  async function handleDownload() {
    if (!deck) return;
    await downloadPresentationFile(deck);
  }

  return (
    <main className="fixed inset-0 z-[220] overflow-hidden bg-surface-100 text-surface-950">
      <header className="absolute left-3 right-3 top-3 z-30 flex items-center justify-between gap-3 rounded-2xl border border-surface-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-surface-200 bg-surface-50 p-1.5">
            {branding?.brand_logo ? (
              <img src={branding.brand_logo} alt={branding.org_name || "Logo"} className="max-h-full max-w-full object-contain" />
            ) : (
              <HeptaCertLogoMark className="h-full w-full" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-11 font-black uppercase tracking-[0.22em] text-surface-400">{branding?.org_name || "HeptaDeck"}</p>
            <h1 className="truncate text-sm font-bold text-surface-950">{deck?.title || "Presentation"}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {fileUrl && (
            <button type="button" onClick={() => void handleDownload()} className="hidden items-center gap-2 rounded-lg bg-surface-100 px-3 py-2 text-xs font-bold text-surface-800 transition hover:bg-surface-200 sm:inline-flex">
              <Download className="h-4 w-4" />
              {copy.download}
            </button>
          )}
          <div className="relative">
            <button type="button" onClick={() => setQrOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-lg bg-surface-100 px-3 py-2 text-xs font-bold text-surface-800 transition hover:bg-surface-200">
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">{copy.phoneQr}</span>
            </button>
            {qrOpen && (
              <div className="absolute right-0 top-12 w-64 rounded-2xl border border-surface-200 bg-white p-4 text-center shadow-xl">
                {qrImageUrl ? (
                  <img src={qrImageUrl} alt={copy.phoneQr} className="mx-auto h-44 w-44 rounded-xl border border-surface-100 bg-white object-contain" />
                ) : (
                  <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-xl border border-surface-100 bg-surface-50">
                    <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
                  </div>
                )}
                <p className="mt-3 text-xs font-semibold leading-relaxed text-surface-500">{copy.phoneQrHint}</p>
              </div>
            )}
          </div>
          <Link href={`/admin/events/${params.id}/presentations/${deckId}/remote`} target="_blank" className="inline-flex items-center gap-2 rounded-lg bg-surface-100 px-3 py-2 text-xs font-bold text-surface-800 transition hover:bg-surface-200">
            <Smartphone className="h-4 w-4" />
            {isTr ? "Telefon" : "Remote"}
          </Link>
          <button
            type="button"
            onClick={() => {
              setPreloadStatus("loading");
              setPreloadSignal((value) => value + 1);
            }}
            disabled={!stageUrl || preloadStatus === "loading"}
            className="hidden items-center gap-2 rounded-lg bg-surface-100 px-3 py-2 text-xs font-bold text-surface-800 transition hover:bg-surface-200 disabled:opacity-50 md:inline-flex"
          >
            {preloadStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            {preloadStatus === "ready" ? copy.preloaded : preloadStatus === "loading" ? copy.preloading : copy.preload}
          </button>
          <span className="hidden rounded-lg bg-surface-100 px-3 py-2 text-xs font-black text-surface-500 sm:inline-flex">
            {slideIndex + 1}{pageCount ? ` / ${pageCount}` : ""}
          </span>
          <button type="button" onClick={requestFullscreen} className="inline-flex items-center gap-2 rounded-lg bg-surface-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-surface-800">
            <Expand className="h-4 w-4" />
            <span className="hidden sm:inline">{copy.fullscreen}</span>
          </button>
        </div>
      </header>

      <section className="relative z-10 flex h-screen items-center justify-center px-3 pb-3 pt-[78px]">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-surface-400" />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center font-semibold text-red-700">{error}</div>
        ) : !deck || !fileUrl ? (
          <div className="rounded-2xl border border-surface-200 bg-white p-8 text-center shadow-sm">
            <FileText className="mx-auto mb-4 h-10 w-10 text-surface-300" />
            <p className="font-bold">{copy.noFile}</p>
          </div>
        ) : stageUrl ? (
          <div className="relative h-full w-full">
            <PdfStageViewer
              fileUrl={stageUrl}
              pageIndex={slideIndex}
              title={deck.title}
              loadingLabel={copy.pdfLoading}
              errorLabel={copy.pdfError}
              retryLabel={copy.retry}
              pageLabel={copy.page}
              requestHeaders={pdfRequestHeaders}
              preloadAllSignal={preloadSignal}
              onPreloadStatusChange={setPreloadStatus}
              onPageCountChange={handlePageCountChange}
            />
            {deck.watermark_enabled && (
              <div className="pointer-events-none absolute inset-0 z-10 grid grid-cols-3 gap-8 overflow-hidden p-10 opacity-[0.08]">
                {Array.from({ length: 18 }).map((_, index) => (
                  <div key={index} className="whitespace-nowrap text-2xl font-black uppercase tracking-[0.24em] text-surface-950" style={{ transform: "rotate(-24deg)" }}>
                    {branding?.org_name || "HeptaCert"} Confidential
                  </div>
                ))}
              </div>
            )}
            {pointer.active && (
              <div
                className="pointer-events-none absolute z-20 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-500 shadow-[0_0_0_10px_rgba(239,68,68,0.18),0_8px_24px_rgba(15,23,42,0.28)]"
                style={{ left: `${pointer.x * 100}%`, top: `${pointer.y * 100}%` }}
              />
            )}
          </div>
        ) : isConverting(deck) ? (
          <div className="max-w-2xl rounded-2xl border border-surface-200 bg-white p-8 text-center shadow-sm">
            <Loader2 className="mx-auto mb-5 h-14 w-14 animate-spin text-surface-400" />
            <h2 className="text-3xl font-black">{copy.convertingTitle}</h2>
            <p className="mt-4 text-sm leading-relaxed text-surface-500">{copy.convertingBody}</p>
          </div>
        ) : (
          <div className="max-w-2xl rounded-2xl border border-surface-200 bg-white p-8 text-center shadow-sm">
            <Presentation className="mx-auto mb-5 h-14 w-14 text-surface-400" />
            <h2 className="text-3xl font-black">{deck.conversion_status === "failed" ? copy.failedTitle : copy.pptxTitle}</h2>
            <p className="mt-4 text-sm leading-relaxed text-surface-500">{deck.conversion_error || copy.pptxBody}</p>
            <button type="button" onClick={() => void handleDownload()} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-surface-950 px-5 py-3 text-sm font-black text-white transition hover:bg-surface-800">
              <Download className="h-4 w-4" />
              {copy.download}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
