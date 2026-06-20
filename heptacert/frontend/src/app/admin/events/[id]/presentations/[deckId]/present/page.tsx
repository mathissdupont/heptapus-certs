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
  const [controlsVisible, setControlsVisible] = useState(true);

  const copy = useMemo(() => ({
    loadFailed: isTr ? "Sunum açılamadı." : "Could not open presentation.",
    noFile: isTr ? "Bu sunuma bağlı dosya bulunamadı." : "No file is attached to this presentation.",
    download: isTr ? "Dosyayı aç / indir" : "Open / download file",
    fullscreen: isTr ? "Tam ekran" : "Fullscreen",
    pptxTitle: isTr ? "PowerPoint dosyası hazır" : "PowerPoint file is ready",
    pptxBody: isTr
      ? "Dönüştürülmüş PDF henüz hazır değil. Orijinal dosyayı açabilir ya da worker'ın dönüşümü bitirmesini bekleyebilirsiniz."
      : "The converted PDF is not ready yet. Open the original file or wait for the worker to finish conversion.",
    convertingTitle: isTr ? "Sunum hazırlanıyor" : "Preparing presentation",
    convertingBody: isTr ? "PowerPoint dosyası arka planda PDF'e dönüştürülüyor. Bu sayfa birazdan otomatik yenilenir." : "The PowerPoint file is being converted to PDF in the background. This page refreshes automatically.",
    failedTitle: isTr ? "Dönüşüm başarısız" : "Conversion failed",
    secured: isTr ? "HeptaCert sahne modu" : "HeptaCert stage mode",
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
  }, [deckId]);

  const fileUrl = deck ? presentationFileUrl(deck) : null;
  const convertedUrl = deck ? presentationConvertedFileUrl(deck) : null;
  const stageUrl = convertedUrl || (deck && isPdf(deck) ? fileUrl : null);
  const stageUrlWithPage = stageUrl ? `${stageUrl}#page=${slideIndex + 1}&toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&view=FitH` : null;

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
    apiFetch("/admin/organization/settings")
      .then((res) => res.json())
      .then((data) => setBranding({ ...data, brand_logo: normalizeApiAssetUrl(data?.brand_logo) }))
      .catch(() => setBranding(null));
  }, []);

  useEffect(() => {
    if (!deckId) return;
    let cancelled = false;
    async function syncSession() {
      try {
        const state = await getPresentationSession(deckId);
        if (!cancelled) setSlideIndex(Math.max(0, state.slide_index || 0));
      } catch {
        // Keep the stage visible even if the remote state cannot be read momentarily.
      }
    }
    void syncSession();
    const timer = window.setInterval(() => void syncSession(), 1200);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [deckId]);

  useEffect(() => {
    let timer = window.setTimeout(() => setControlsVisible(false), 2600);
    function revealControls() {
      setControlsVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setControlsVisible(false), 2600);
    }
    window.addEventListener("mousemove", revealControls);
    window.addEventListener("keydown", revealControls);
    window.addEventListener("touchstart", revealControls);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", revealControls);
      window.removeEventListener("keydown", revealControls);
      window.removeEventListener("touchstart", revealControls);
    };
  }, []);

  function requestFullscreen() {
    const root = document.documentElement;
    if (root.requestFullscreen) void root.requestFullscreen();
  }

  return (
    <main className={`fixed inset-0 z-[220] overflow-hidden bg-[#020617] text-white ${controlsVisible ? "" : "cursor-none"}`}>
      <div className="absolute inset-0 bg-black" />

      <header className={`absolute left-4 right-4 top-4 z-30 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-surface-950/72 px-4 py-3 shadow-2xl backdrop-blur transition-all duration-500 ${controlsVisible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1.5">
            {branding?.brand_logo ? (
              <img src={branding.brand_logo} alt={branding.org_name || "Logo"} className="max-h-full max-w-full object-contain" />
            ) : (
              <HeptaCertLogoMark className="h-full w-full" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-11 font-black uppercase tracking-[0.22em] text-white/35">{branding?.org_name || "HeptaDeck"}</p>
            <h1 className="truncate text-sm font-bold text-white">{deck?.title || "Presentation"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {fileUrl && (
            <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/15">
              <Download className="h-4 w-4" />
              {copy.download}
            </a>
          )}
          <Link href={`/admin/events/${params.id}/presentations/${deckId}/remote`} target="_blank" className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/15">
            <Smartphone className="h-4 w-4" />
            {isTr ? "Telefon" : "Remote"}
          </Link>
          <button type="button" onClick={requestFullscreen} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-surface-950 transition hover:bg-white/90">
            <Expand className="h-4 w-4" />
            {copy.fullscreen}
          </button>
        </div>
      </header>

      <section className="relative z-10 flex h-screen items-center justify-center">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        ) : error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-6 text-center text-red-100">{error}</div>
        ) : !deck || !fileUrl ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <FileText className="mx-auto mb-4 h-10 w-10 text-white/40" />
            <p className="font-bold">{copy.noFile}</p>
          </div>
        ) : stageUrl ? (
          <iframe
            key={stageUrlWithPage}
            title={deck.title}
            src={stageUrlWithPage || stageUrl}
            className="absolute inset-0 h-full w-full border-0 bg-white"
          />
        ) : isConverting(deck) ? (
          <div className="max-w-2xl rounded-[28px] border border-white/10 bg-white/8 p-8 text-center shadow-2xl backdrop-blur">
            <Loader2 className="mx-auto mb-5 h-14 w-14 animate-spin text-white/60" />
            <h2 className="text-3xl font-black">{copy.convertingTitle}</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/60">{copy.convertingBody}</p>
          </div>
        ) : (
          <div className="max-w-2xl rounded-[28px] border border-white/10 bg-white/8 p-8 text-center shadow-2xl backdrop-blur">
            <Presentation className="mx-auto mb-5 h-14 w-14 text-white/60" />
            <h2 className="text-3xl font-black">{deck.conversion_status === "failed" ? copy.failedTitle : copy.pptxTitle}</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/60">{deck.conversion_error || copy.pptxBody}</p>
            <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-surface-950 transition hover:bg-white/90">
              <Download className="h-4 w-4" />
              {copy.download}
            </a>
          </div>
        )}
      </section>

      <footer className={`absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/10 bg-surface-950/60 px-4 py-2 text-center text-11 font-semibold uppercase tracking-[0.18em] text-white/35 shadow-2xl backdrop-blur transition-all duration-500 ${controlsVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}>
        {copy.secured} · {slideIndex + 1}
      </footer>
    </main>
  );
}
