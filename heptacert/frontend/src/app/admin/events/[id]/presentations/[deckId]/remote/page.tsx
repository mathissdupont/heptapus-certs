"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, MonitorPlay, NotebookPen, RotateCcw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  getPresentationSession,
  getPresentationSpeakerNote,
  updatePresentationSession,
  updatePresentationSpeakerNote,
  type PresentationDeck,
} from "@/lib/presentationsApi";
import { useI18n } from "@/lib/i18n";

export default function EventPresentationRemotePage() {
  const params = useParams<{ id: string; deckId: string }>();
  const deckId = Number(params.deckId);
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const [deck, setDeck] = useState<PresentationDeck | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(() => ({
    loading: isTr ? "Kumanda hazirlaniyor..." : "Preparing remote...",
    title: isTr ? "Telefon kumandasi" : "Phone remote",
    stage: isTr ? "Sahne ekranini ac" : "Open stage screen",
    previous: isTr ? "Onceki" : "Previous",
    next: isTr ? "Sonraki" : "Next",
    reset: isTr ? "Basa don" : "Reset",
    personalNotes: isTr ? "Kisisel notlar" : "Personal notes",
    notesHint: isTr ? "Bu notlar hesabinda saklanir ve tekrar girdiginde geri gelir." : "These notes are saved to your account and come back later.",
    placeholder: isTr ? "Konusurken hatirlamak istediklerini buraya yaz..." : "Write what you want to remember while presenting...",
    slide: isTr ? "Sayfa" : "Page",
    loadFailed: isTr ? "Kumanda acilamadi." : "Could not open remote.",
    syncFailed: isTr ? "Sahne guncellenemedi." : "Could not update stage.",
  }), [isTr]);

  const maxSlides = Math.max(deck?.slides?.length || 0, 500);

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
              {deck?.slides?.length ? <p className="text-xs font-bold text-surface-400">/ {deck.slides.length}</p> : null}
            </div>
            <button
              type="button"
              aria-label={copy.next}
              onClick={() => void go(slideIndex + 1)}
              disabled={saving || (Boolean(deck?.slides?.length) && slideIndex >= (deck?.slides.length || 1) - 1)}
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
