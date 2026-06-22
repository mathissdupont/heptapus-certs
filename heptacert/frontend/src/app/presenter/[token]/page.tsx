"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { ChevronLeft, ChevronRight, LocateFixed, Loader2, Presentation, RotateCcw } from "lucide-react";
import { useParams } from "next/navigation";
import PdfPresenterPreview from "@/components/Admin/Presentations/PdfPresenterPreview";
import { apiUrl } from "@/lib/api";
import {
  getPublicControlPresentation,
  getPublicControlSession,
  updatePublicControlSession,
  type PublicPresentationDeck,
} from "@/lib/presentationsApi";

function publicFileUrl(path?: string | null) {
  if (!path) return null;
  return apiUrl(path.replace(/^\/api/, ""));
}

export default function PresenterTokenPage() {
  const params = useParams<{ token: string }>();
  const token = String(params.token || "");
  const [deck, setDeck] = useState<PublicPresentationDeck | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [pointerActive, setPointerActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pointerThrottleRef = useRef(0);
  const fileUrl = deck ? publicFileUrl(deck.file_url) : null;
  const convertedUrl = deck ? publicFileUrl(deck.converted_file_url) : null;
  const previewUrl = convertedUrl || fileUrl;
  const maxSlides = Math.max(pageCount || deck?.slides?.length || 0, 500);
  const handlePageCountChange = useCallback((nextPageCount: number) => setPageCount(nextPageCount), []);

  useEffect(() => {
    async function load() {
      try {
        const [deckRes, state] = await Promise.all([
          getPublicControlPresentation(token),
          getPublicControlSession(token),
        ]);
        setDeck(deckRes);
        setSlideIndex(Math.max(0, state.slide_index || 0));
        setError(null);
      } catch (ex: any) {
        setError(ex?.message || "Presenter link could not be opened.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token]);

  async function go(nextIndex: number) {
    const bounded = Math.min(Math.max(nextIndex, 0), maxSlides - 1);
    setSlideIndex(bounded);
    setSaving(true);
    try {
      await updatePublicControlSession(token, { slide_index: bounded });
      setError(null);
    } catch (ex: any) {
      setError(ex?.message || "Stage could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  function coordinatesFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }

  function sendPointer(active: boolean, x?: number, y?: number) {
    const now = Date.now();
    if (active && now - pointerThrottleRef.current < 70) return;
    pointerThrottleRef.current = now;
    updatePublicControlSession(token, {
      pointer_active: active,
      pointer_x: active ? x : null,
      pointer_y: active ? y : null,
    }).catch(() => undefined);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const coords = coordinatesFromPointer(event);
    setPointerActive(true);
    sendPointer(true, coords.x, coords.y);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointerActive) return;
    const coords = coordinatesFromPointer(event);
    sendPointer(true, coords.x, coords.y);
  }

  function stopPointer() {
    setPointerActive(false);
    updatePublicControlSession(token, { pointer_active: false, pointer_x: null, pointer_y: null }).catch(() => undefined);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-50 text-surface-900">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-50 px-4 py-5 text-surface-950">
      <section className="mx-auto flex max-w-md flex-col gap-4">
        <header className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm">
          <p className="text-11 font-black uppercase tracking-[0.2em] text-surface-400">HeptaDeck</p>
          <h1 className="mt-1 text-xl font-black text-surface-950">Presenter Control</h1>
          <p className="mt-2 line-clamp-2 text-sm font-semibold text-surface-500">{deck?.title || "Presentation"}</p>
        </header>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

        {previewUrl ? (
          <PdfPresenterPreview
            fileUrl={previewUrl}
            pageIndex={slideIndex}
            currentLabel="Current"
            nextLabel="Next"
            loadingLabel="Loading preview"
            unavailableLabel="No preview"
            onPageCountChange={handlePageCountChange}
          />
        ) : (
          <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-surface-200 bg-white p-5 text-center shadow-sm">
            <Presentation className="mb-2 h-6 w-6 text-surface-300" />
            <p className="text-sm font-bold text-surface-500">Preview is not available.</p>
          </div>
        )}

        <section className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-surface-400">Page</p>
            {saving && <Loader2 className="h-4 w-4 animate-spin text-surface-400" />}
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <button type="button" aria-label="Previous" onClick={() => void go(slideIndex - 1)} disabled={slideIndex <= 0 || saving} className="flex h-20 flex-1 items-center justify-center rounded-2xl bg-surface-100 text-surface-800 transition hover:bg-surface-200 disabled:opacity-40">
              <ChevronLeft className="h-8 w-8" />
            </button>
            <div className="min-w-24 text-center">
              <p className="text-5xl font-black tracking-tight text-surface-950">{slideIndex + 1}</p>
              {pageCount || deck?.slides?.length ? <p className="text-xs font-bold text-surface-400">/ {pageCount || deck?.slides.length}</p> : null}
            </div>
            <button type="button" aria-label="Next" onClick={() => void go(slideIndex + 1)} disabled={saving || (Boolean(pageCount || deck?.slides?.length) && slideIndex >= (pageCount || deck?.slides.length || 1) - 1)} className="flex h-20 flex-1 items-center justify-center rounded-2xl bg-surface-950 text-white transition hover:bg-surface-800 disabled:opacity-40">
              <ChevronRight className="h-8 w-8" />
            </button>
          </div>
          <button type="button" onClick={() => void go(0)} disabled={saving || slideIndex === 0} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-surface-200 bg-white px-4 py-3 text-sm font-black text-surface-700 transition hover:bg-surface-50 disabled:opacity-40">
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </section>

        <section className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <LocateFixed className="h-4 w-4 text-brand-700" />
            <p className="text-sm font-black text-surface-950">Laser pointer</p>
          </div>
          <div
            role="application"
            aria-label="Laser pointer"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopPointer}
            onPointerCancel={stopPointer}
            onPointerLeave={() => {
              if (pointerActive) stopPointer();
            }}
            className={`relative flex h-36 touch-none select-none items-center justify-center overflow-hidden rounded-2xl border text-sm font-bold transition ${
              pointerActive ? "border-red-200 bg-red-50 text-red-700" : "border-dashed border-surface-200 bg-surface-50 text-surface-400"
            }`}
          >
            <div className={`h-8 w-8 rounded-full border-2 border-white shadow-lg ${pointerActive ? "bg-red-500" : "bg-surface-300"}`} />
            <span className="absolute bottom-3 left-4 right-4 text-center text-xs font-semibold">Press and drag to point on stage.</span>
          </div>
        </section>
      </section>
    </main>
  );
}
