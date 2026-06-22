"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, LocateFixed, MonitorPlay, NotebookPen, Pause, Play, RotateCcw, TimerReset } from "lucide-react";
import PdfPresenterPreview from "@/components/Admin/Presentations/PdfPresenterPreview";
import { apiFetch } from "@/lib/api";
import {
  getPresentationSession,
  getPresentationSpeakerNote,
  presentationAuthHeaders,
  presentationConvertedFileUrl,
  presentationFileUrl,
  updatePresentationSession,
  updatePresentationSpeakerNote,
  updatePresentationPointer,
  type PresentationDeck,
} from "@/lib/presentationsApi";
import { useI18n } from "@/lib/i18n";

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function isPdf(deck: PresentationDeck | null) {
  if (!deck) return false;
  return deck.file_content_type === "application/pdf" || (deck.file_filename || "").toLowerCase().endsWith(".pdf");
}

export default function EventPresentationRemotePage() {
  const params = useParams<{ id: string; deckId: string }>();
  const deckId = Number(params.deckId);
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const [deck, setDeck] = useState<PresentationDeck | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [pausedElapsedSeconds, setPausedElapsedSeconds] = useState(0);
  const [nowMs, setNowMs] = useState(Date.now());
  const [pointerActive, setPointerActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pointerThrottleRef = useRef(0);
  const pdfRequestHeaders = useMemo(() => presentationAuthHeaders(), []);

  const copy = useMemo(() => ({
    loading: isTr ? "Sunucu ekrani hazirlaniyor..." : "Preparing presenter view...",
    title: isTr ? "Sunucu ekrani" : "Presenter view",
    stage: isTr ? "Sahne ekranini ac" : "Open stage screen",
    previous: isTr ? "Onceki" : "Previous",
    next: isTr ? "Sonraki" : "Next",
    reset: isTr ? "Basa don" : "Reset",
    timer: isTr ? "Sure" : "Timer",
    elapsed: isTr ? "Gecen" : "Elapsed",
    remaining: isTr ? "Kalan" : "Remaining",
    start: isTr ? "Baslat" : "Start",
    pause: isTr ? "Duraklat" : "Pause",
    resetTimer: isTr ? "Sureyi sifirla" : "Reset timer",
    minutes: isTr ? "dk" : "min",
    finalWarning: isTr ? "Son 2 dakika" : "Final 2 minutes",
    currentPreview: isTr ? "Mevcut" : "Current",
    nextPreview: isTr ? "Sonraki" : "Next",
    previewLoading: isTr ? "Onizleme yukleniyor" : "Loading preview",
    previewUnavailable: isTr ? "Onizleme yok" : "No preview",
    laser: isTr ? "Laser pointer" : "Laser pointer",
    laserHint: isTr ? "Sahnede nokta gostermek icin alana basili tutup parmagini gezdir." : "Press and drag in the pad to show a pointer on stage.",
    personalNotes: isTr ? "Kisisel notlar" : "Personal notes",
    notesHint: isTr ? "Bu notlar hesabinda saklanir ve tekrar girdiginde geri gelir." : "These notes are saved to your account and come back later.",
    placeholder: isTr ? "Konusurken hatirlamak istediklerini buraya yaz..." : "Write what you want to remember while presenting...",
    slide: isTr ? "Sayfa" : "Page",
    loadFailed: isTr ? "Kumanda acilamadi." : "Could not open remote.",
    syncFailed: isTr ? "Sahne guncellenemedi." : "Could not update stage.",
  }), [isTr]);

  const fileUrl = deck ? presentationFileUrl(deck) : null;
  const convertedUrl = deck ? presentationConvertedFileUrl(deck) : null;
  const previewUrl = convertedUrl || (deck && isPdf(deck) ? fileUrl : null);
  const maxSlides = Math.max(pageCount || deck?.slides?.length || 0, 500);
  const durationSeconds = durationMinutes * 60;
  const liveElapsedSeconds =
    timerRunning && timerStartedAt
      ? pausedElapsedSeconds + Math.floor((nowMs - timerStartedAt) / 1000)
      : pausedElapsedSeconds;
  const elapsedSeconds = Math.min(liveElapsedSeconds, durationSeconds);
  const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
  const isFinalWarning = timerRunning && remainingSeconds <= 120 && remainingSeconds > 0;
  const progress = durationSeconds > 0 ? Math.min(100, (elapsedSeconds / durationSeconds) * 100) : 0;
  const handlePageCountChange = useCallback((nextPageCount: number) => setPageCount(nextPageCount), []);

  useEffect(() => {
    async function load() {
      try {
        const [deckRes, state] = await Promise.all([
          apiFetch(`/admin/presentations/${deckId}`).then((res) => res.json()),
          getPresentationSession(deckId),
        ]);
        setDeck(deckRes);
        setSlideIndex(Math.max(0, state.slide_index || 0));
        setError(null);
      } catch (ex: any) {
        setError(ex?.message || copy.loadFailed);
      } finally {
        setLoading(false);
      }
    }
    if (deckId) void load();
  }, [copy.loadFailed, deckId]);

  useEffect(() => {
    const saved = window.localStorage.getItem(`heptacert:presentation:${deckId}:timer`);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      const savedDuration = Number(parsed.durationMinutes);
      const savedPaused = Number(parsed.pausedElapsedSeconds);
      const savedStartedAt = typeof parsed.timerStartedAt === "number" ? parsed.timerStartedAt : null;
      const savedRunning = Boolean(parsed.timerRunning && savedStartedAt);
      if (savedDuration >= 1 && savedDuration <= 240) setDurationMinutes(savedDuration);
      if (savedPaused >= 0) setPausedElapsedSeconds(savedPaused);
      setTimerStartedAt(savedStartedAt);
      setTimerRunning(savedRunning);
    } catch {
      window.localStorage.removeItem(`heptacert:presentation:${deckId}:timer`);
    }
  }, [deckId]);

  useEffect(() => {
    window.localStorage.setItem(
      `heptacert:presentation:${deckId}:timer`,
      JSON.stringify({
        durationMinutes,
        pausedElapsedSeconds,
        timerRunning,
        timerStartedAt,
      })
    );
  }, [deckId, durationMinutes, pausedElapsedSeconds, timerRunning, timerStartedAt]);

  useEffect(() => {
    if (!timerRunning) return;
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [timerRunning]);

  useEffect(() => {
    if (elapsedSeconds < durationSeconds) return;
    setTimerRunning(false);
    setTimerStartedAt(null);
    setPausedElapsedSeconds(durationSeconds);
  }, [durationSeconds, elapsedSeconds]);

  useEffect(() => {
    let cancelled = false;
    setNotesDirty(false);
    getPresentationSpeakerNote(deckId, slideIndex)
      .then((data) => {
        if (!cancelled) setNotes(data.note || "");
      })
      .catch(() => {
        if (!cancelled) setNotes("");
      });
    return () => {
      cancelled = true;
    };
  }, [deckId, slideIndex]);

  useEffect(() => {
    if (!notesDirty) return;
    const timer = window.setTimeout(() => {
      setNotesSaving(true);
      updatePresentationSpeakerNote(deckId, slideIndex, notes)
        .catch(() => setError(copy.syncFailed))
        .finally(() => setNotesSaving(false));
      setNotesDirty(false);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [copy.syncFailed, deckId, notes, notesDirty, slideIndex]);

  async function go(nextIndex: number) {
    const bounded = Math.min(Math.max(nextIndex, 0), maxSlides - 1);
    setSlideIndex(bounded);
    setSaving(true);
    try {
      await updatePresentationSession(deckId, bounded);
      setError(null);
    } catch (ex: any) {
      setError(ex?.message || copy.syncFailed);
    } finally {
      setSaving(false);
    }
  }

  function resetTimer() {
    setTimerRunning(false);
    setTimerStartedAt(null);
    setPausedElapsedSeconds(0);
    setNowMs(Date.now());
  }

  function toggleTimer() {
    if (timerRunning) {
      setPausedElapsedSeconds(elapsedSeconds);
      setTimerStartedAt(null);
      setTimerRunning(false);
      return;
    }
    if (elapsedSeconds >= durationSeconds) {
      setPausedElapsedSeconds(0);
    }
    setNowMs(Date.now());
    setTimerStartedAt(Date.now());
    setTimerRunning(true);
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
    updatePresentationPointer(deckId, { active, x, y }).catch(() => undefined);
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
    updatePresentationPointer(deckId, { active: false }).catch(() => undefined);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-50 text-surface-900">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
        <span className="ml-3 text-sm font-semibold text-surface-500">{copy.loading}</span>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-50 px-4 py-5 text-surface-950">
      <section className="mx-auto flex max-w-md flex-col gap-4">
        <header className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm">
          <p className="text-11 font-black uppercase tracking-[0.2em] text-surface-400">HeptaDeck</p>
          <h1 className="mt-1 text-xl font-black text-surface-950">{copy.title}</h1>
          <p className="mt-2 line-clamp-2 text-sm font-semibold text-surface-500">{deck?.title || "Presentation"}</p>
          <a
            href={`/admin/events/${params.id}/presentations/${deckId}/present`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-surface-950 px-4 py-3 text-sm font-black text-white transition hover:bg-surface-800"
          >
            <MonitorPlay className="h-4 w-4" />
            {copy.stage}
          </a>
        </header>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

        {previewUrl && (
          <PdfPresenterPreview
            fileUrl={previewUrl}
            pageIndex={slideIndex}
            requestHeaders={pdfRequestHeaders}
            currentLabel={copy.currentPreview}
            nextLabel={copy.nextPreview}
            loadingLabel={copy.previewLoading}
            unavailableLabel={copy.previewUnavailable}
            onPageCountChange={handlePageCountChange}
          />
        )}

        <section className={`rounded-2xl border bg-white p-5 shadow-sm ${isFinalWarning ? "border-amber-300" : "border-surface-200"}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-surface-400">{copy.timer}</p>
              <p className={`mt-1 text-4xl font-black tracking-tight ${isFinalWarning ? "text-amber-600" : "text-surface-950"}`}>
                {formatClock(remainingSeconds)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-surface-400">{copy.elapsed}</p>
              <p className="text-lg font-black text-surface-800">{formatClock(elapsedSeconds)}</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-100">
            <div className={`h-full rounded-full ${isFinalWarning ? "bg-amber-500" : "bg-surface-950"}`} style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
            <label className="flex items-center rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-sm font-bold text-surface-700">
              <input
                type="number"
                min={1}
                max={240}
                value={durationMinutes}
                onChange={(event) => {
                  setDurationMinutes(Math.max(1, Math.min(240, Number(event.target.value) || 1)));
                  setPausedElapsedSeconds(0);
                  setTimerStartedAt(null);
                  setTimerRunning(false);
                  setNowMs(Date.now());
                }}
                className="w-full bg-transparent text-base font-black outline-none"
              />
              <span className="text-xs text-surface-400">{copy.minutes}</span>
            </label>
            <button
              type="button"
              onClick={toggleTimer}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface-950 px-4 py-3 text-sm font-black text-white transition hover:bg-surface-800"
            >
              {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span className="sr-only">{timerRunning ? copy.pause : copy.start}</span>
            </button>
            <button
              type="button"
              onClick={resetTimer}
              className="inline-flex items-center justify-center rounded-xl border border-surface-200 bg-white px-4 py-3 text-surface-700 transition hover:bg-surface-50"
              aria-label={copy.resetTimer}
            >
              <TimerReset className="h-4 w-4" />
            </button>
          </div>
          {isFinalWarning && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-black text-amber-700">{copy.finalWarning}</p>}
        </section>

        <section className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-surface-400">{copy.slide}</p>
            {saving && <Loader2 className="h-4 w-4 animate-spin text-surface-400" />}
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <button
              type="button"
              aria-label={copy.previous}
              onClick={() => void go(slideIndex - 1)}
              disabled={slideIndex <= 0 || saving}
              className="flex h-20 flex-1 items-center justify-center rounded-2xl bg-surface-100 text-surface-800 transition hover:bg-surface-200 disabled:opacity-40"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <div className="min-w-24 text-center">
              <p className="text-5xl font-black tracking-tight text-surface-950">{slideIndex + 1}</p>
              {pageCount || deck?.slides?.length ? <p className="text-xs font-bold text-surface-400">/ {pageCount || deck?.slides.length}</p> : null}
            </div>
            <button
              type="button"
              aria-label={copy.next}
              onClick={() => void go(slideIndex + 1)}
              disabled={saving || (Boolean(pageCount || deck?.slides?.length) && slideIndex >= (pageCount || deck?.slides.length || 1) - 1)}
              className="flex h-20 flex-1 items-center justify-center rounded-2xl bg-surface-950 text-white transition hover:bg-surface-800 disabled:opacity-40"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => void go(0)}
            disabled={saving || slideIndex === 0}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-surface-200 bg-white px-4 py-3 text-sm font-black text-surface-700 transition hover:bg-surface-50 disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
            {copy.reset}
          </button>
        </section>

        <section className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <LocateFixed className="h-4 w-4 text-brand-700" />
            <p className="text-sm font-black text-surface-950">{copy.laser}</p>
          </div>
          <div
            role="application"
            aria-label={copy.laser}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopPointer}
            onPointerCancel={stopPointer}
            onPointerLeave={() => {
              if (pointerActive) stopPointer();
            }}
            className={`relative flex h-36 touch-none select-none items-center justify-center overflow-hidden rounded-2xl border text-sm font-bold transition ${
              pointerActive
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-dashed border-surface-200 bg-surface-50 text-surface-400"
            }`}
          >
            <div className={`h-8 w-8 rounded-full border-2 border-white shadow-lg ${pointerActive ? "bg-red-500" : "bg-surface-300"}`} />
            <span className="absolute bottom-3 left-4 right-4 text-center text-xs font-semibold">{copy.laserHint}</span>
          </div>
        </section>

        <section className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-brand-700" />
            <p className="text-sm font-black text-surface-950">{copy.personalNotes}</p>
            {notesSaving && <Loader2 className="ml-auto h-4 w-4 animate-spin text-surface-400" />}
          </div>
          <p className="mt-1 text-xs font-semibold text-surface-400">{copy.notesHint}</p>
          <textarea
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              setNotesDirty(true);
            }}
            placeholder={copy.placeholder}
            className="mt-4 min-h-44 w-full resize-none rounded-xl border border-surface-200 bg-surface-50 p-4 text-base font-medium leading-relaxed text-surface-900 outline-none transition focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-100"
          />
        </section>
      </section>
    </main>
  );
}
