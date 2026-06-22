"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Presentation } from "lucide-react";
import { useParams } from "next/navigation";
import PdfStageViewer from "@/components/Admin/Presentations/PdfStageViewer";
import { apiUrl } from "@/lib/api";
import { getPublicAudiencePresentation, getPublicAudienceSession, type PublicPresentationDeck } from "@/lib/presentationsApi";

function publicFileUrl(path?: string | null) {
  if (!path) return null;
  return apiUrl(path.replace(/^\/api/, ""));
}

export default function AudiencePresentationPage() {
  const params = useParams<{ token: string }>();
  const token = String(params.token || "");
  const [deck, setDeck] = useState<PublicPresentationDeck | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileUrl = deck ? publicFileUrl(deck.file_url) : null;
  const convertedUrl = deck ? publicFileUrl(deck.converted_file_url) : null;
  const stageUrl = convertedUrl || fileUrl;
  const handlePageCountChange = useCallback((nextPageCount: number) => setPageCount(nextPageCount), []);

  useEffect(() => {
    getPublicAudiencePresentation(token)
      .then((data) => {
        setDeck(data);
        setError(null);
      })
      .catch((ex: any) => setError(ex?.message || "Presentation could not be opened."))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      try {
        const state = await getPublicAudienceSession(token);
        if (!cancelled) setSlideIndex(Math.max(0, state.slide_index || 0));
      } catch {
        // Audience view stays on the last known page during short network drops.
      }
    }
    void sync();
    const timer = window.setInterval(() => void sync(), 1200);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token]);

  const watermarkText = useMemo(() => `${deck?.title || "HeptaCert"} Confidential`, [deck?.title]);

  return (
    <main className="min-h-screen bg-surface-100 text-surface-950">
      <header className="sticky top-0 z-20 border-b border-surface-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-11 font-black uppercase tracking-[0.22em] text-surface-400">HeptaDeck</p>
            <h1 className="truncate text-sm font-black text-surface-950">{deck?.title || "Presentation"}</h1>
          </div>
          <div className="flex items-center gap-2">
            {deck?.allow_download && stageUrl && (
              <a href={stageUrl} className="inline-flex items-center gap-2 rounded-lg bg-surface-950 px-3 py-2 text-xs font-black text-white">
                <Download className="h-4 w-4" />
                PDF
              </a>
            )}
            <span className="rounded-lg bg-surface-100 px-3 py-2 text-xs font-black text-surface-500">
              {slideIndex + 1}{pageCount ? ` / ${pageCount}` : ""}
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto h-[calc(100vh-65px)] max-w-6xl p-3">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-surface-400" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm font-bold text-red-700">{error}</div>
          </div>
        ) : stageUrl ? (
          <div className="relative h-full w-full">
            <PdfStageViewer
              fileUrl={stageUrl}
              pageIndex={slideIndex}
              title={deck?.title || "Presentation"}
              loadingLabel="PDF loading"
              errorLabel="PDF could not be displayed."
              retryLabel="Retry"
              pageLabel="Page"
              onPageCountChange={handlePageCountChange}
            />
            {deck?.watermark_enabled && (
              <div className="pointer-events-none absolute inset-0 z-10 grid grid-cols-3 gap-8 overflow-hidden p-10 opacity-[0.08]">
                {Array.from({ length: 18 }).map((_, index) => (
                  <div key={index} className="whitespace-nowrap text-2xl font-black uppercase tracking-[0.24em] text-surface-950" style={{ transform: "rotate(-24deg)" }}>
                    {watermarkText}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-surface-200 bg-white text-center shadow-sm">
            <Presentation className="mb-3 h-8 w-8 text-surface-300" />
            <p className="text-sm font-bold text-surface-500">Presentation file is not available.</p>
          </div>
        )}
      </section>
    </main>
  );
}
