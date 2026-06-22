"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download, Expand, FileText, Loader2, Presentation, Smartphone } from "lucide-react";
import HeptaCertLogoMark from "@/components/Brand/HeptaCertLogoMark";
import { apiFetch, normalizeApiAssetUrl } from "@/lib/api";
import { getPresentationSession, presentationConvertedFileUrl, presentationFileUrl, type PresentationDeck } from "@/lib/presentationsApi";
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
  const [branding, setBranding] = useState<StageBranding | null>(null);

  const copy = useMemo(() => ({
    loadFailed: isTr ? "Sunum acilamadi." : "Could not open presentation.",
    noFile: isTr ? "Bu sunuma bagli dosya bulunamadi." : "No file is attached to this presentation.",
    download: isTr ? "Dosyayi ac / indir" : "Open / download file",
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
        if (!cancelled) setSlideIndex(Math.max(0, state.slide_index || 0));
      } catch {
        // The stage should keep rendering even if remote state is temporarily unavailable.
      }
    }
    void syncSession();
    const timer = window.setInterval(() => void syncSession(), 1200);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [deckId]);

  const fileUrl = deck ? presentationFileUrl(deck) : null;
  const convertedUrl = deck ? presentationConvertedFileUrl(deck) : null;
  const stageUrl = convertedUrl || (deck && isPdf(deck) ? fileUrl : null);
  const stageUrlWithPage = stageUrl ? `${stageUrl}#page=${slideIndex + 1}&toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&view=FitH` : null;

  function requestFullscreen() {
    const root = document.documentElement;
    if (root.requestFullscreen) void root.requestFullscreen();
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
            <a href={fileUrl} target="_blank" rel="noreferrer" className="hidden items-center gap-2 rounded-lg bg-surface-100 px-3 py-2 text-xs font-bold text-surface-800 transition hover:bg-surface-200 sm:inline-flex">
              <Download className="h-4 w-4" />
              {copy.download}
            </a>
          )}
          <Link href={`/admin/events/${params.id}/presentations/${deckId}/remote`} target="_blank" className="inline-flex items-center gap-2 rounded-lg bg-surface-100 px-3 py-2 text-xs font-bold text-surface-800 transition hover:bg-surface-200">
            <Smartphone className="h-4 w-4" />
            {isTr ? "Telefon" : "Remote"}
          </Link>
          <span className="hidden rounded-lg bg-surface-100 px-3 py-2 text-xs font-black text-surface-500 sm:inline-flex">
            {slideIndex + 1}
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
          <iframe
            key={stageUrlWithPage}
            title={deck.title}
            src={stageUrlWithPage || stageUrl}
            className="h-full w-full rounded-xl border border-surface-200 bg-white shadow-sm"
          />
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
            <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-surface-950 px-5 py-3 text-sm font-black text-white transition hover:bg-surface-800">
              <Download className="h-4 w-4" />
              {copy.download}
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
