"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Maximize2, StickyNote } from "lucide-react";
import { publicApiFetch } from "@/lib/api";
import type { PublicPresentationDeck } from "@/lib/presentationsApi";

export default function PublicPresentationPage() {
  const params = useParams<{ token: string }>();
  const [deck, setDeck] = useState<PublicPresentationDeck | null>(null);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<"slides" | "notes">("slides");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    publicApiFetch(`/public/presentations/${params.token}`)
      .then((res) => res.json())
      .then((data) => {
        setDeck(data);
        setError(null);
      })
      .catch((ex: any) => setError(ex?.message || "Sunum açılamadı."))
      .finally(() => setLoading(false));
  }, [params.token]);

  const slides = deck?.slides || [];
  const slide = slides[index] || null;
  const progress = slides.length ? Math.round(((index + 1) / slides.length) * 100) : 0;
  const primary = deck?.theme?.primary || "#2563eb";
  const isTr = (deck?.language || "tr") === "tr";
  const copy = {
    notFoundTitle: isTr ? "Sunum bulunamadı" : "Presentation not found",
    notFoundBody: isTr ? "Link geçersiz veya yenilenmiş olabilir." : "The link may be invalid or refreshed.",
    slideMode: isTr ? "Slayt" : "Slides",
    notesMode: isTr ? "Notlar" : "Notes",
    speakerNotes: isTr ? "Konuşmacı Notları" : "Speaker Notes",
    noNotes: isTr ? "Bu slayt için henüz not eklenmemiş." : "No notes have been added for this slide yet.",
    slideBullets: isTr ? "Slayttaki maddeler" : "Slide bullets",
    previous: isTr ? "Önceki" : "Previous",
    next: isTr ? "Sonraki" : "Next",
  };

  const bullets = useMemo(() => {
    if (!slide) return [];
    if (Array.isArray(slide.bullets) && slide.bullets.length) return slide.bullets;
    return slide.body ? [slide.body] : [];
  }, [slide]);

  function go(next: number) {
    setIndex(Math.min(Math.max(next, 0), Math.max(slides.length - 1, 0)));
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === " ") go(index + 1);
      if (event.key === "ArrowLeft") go(index - 1);
      if (event.key.toLowerCase() === "n") setMode("notes");
      if (event.key.toLowerCase() === "s") setMode("slides");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, slides.length]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-950 text-white">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  }

  if (error || !deck || !slide) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-950 p-6 text-center text-white">
        <div>
          <p className="text-lg font-bold">{copy.notFoundTitle}</p>
          <p className="mt-2 text-sm text-white/60">{error || copy.notFoundBody}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-950 text-white">
      <div className="fixed inset-x-0 top-0 z-20 border-b border-white/10 bg-surface-950/85 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{deck.title}</p>
            <p className="text-xs text-white/50">{copy.slideMode} {index + 1} / {slides.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMode("slides")} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === "slides" ? "bg-white text-surface-950" : "bg-white/10 text-white"}`}>
              <Maximize2 className="mr-1 inline h-3.5 w-3.5" />
              {copy.slideMode}
            </button>
            <button type="button" onClick={() => setMode("notes")} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === "notes" ? "bg-white text-surface-950" : "bg-white/10 text-white"}`}>
              <StickyNote className="mr-1 inline h-3.5 w-3.5" />
              {copy.notesMode}
            </button>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
          <div className="h-full transition-all" style={{ width: `${progress}%`, backgroundColor: primary }} />
        </div>
      </div>

      <section className="mx-auto flex min-h-screen max-w-7xl items-center px-4 pb-24 pt-24">
        {mode === "slides" ? (
          <div className="w-full rounded-xl border border-white/10 bg-white p-8 text-surface-950 shadow-modal md:p-14" style={{ aspectRatio: "16 / 9" }}>
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: primary }}>HeptaDeck</p>
            <h1 className="mt-8 max-w-5xl text-4xl font-black leading-tight md:text-6xl">{slide.title}</h1>
            {slide.layout === "title" ? (
              <p className="mt-6 max-w-3xl text-xl text-surface-500 md:text-2xl">{slide.subtitle}</p>
            ) : (
              <ul className="mt-8 grid gap-4 text-xl font-semibold text-surface-700 md:text-3xl">
                {bullets.map((bullet, bulletIndex) => (
                  <li key={bulletIndex} className="flex gap-3">
                    <span style={{ color: primary }}>•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="w-full rounded-xl border border-amber-200/30 bg-amber-50 p-6 text-surface-950 shadow-modal md:p-10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">{copy.speakerNotes}</p>
            <h1 className="mt-3 text-2xl font-black md:text-4xl">{slide.title}</h1>
            <div className="mt-6 whitespace-pre-wrap text-2xl font-medium leading-relaxed text-surface-800 md:text-4xl">
              {slide.notes || copy.noNotes}
            </div>
            <div className="mt-8 rounded-lg bg-white/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-surface-400">{copy.slideBullets}</p>
              <ul className="mt-2 space-y-2 text-base text-surface-600">
                {bullets.map((bullet, bulletIndex) => <li key={bulletIndex}>- {bullet}</li>)}
              </ul>
            </div>
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-surface-950/85 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className="rounded-lg bg-white/10 px-4 py-3 text-sm font-bold disabled:opacity-40">
            <ChevronLeft className="mr-1 inline h-4 w-4" />
            {copy.previous}
          </button>
          <span className="text-sm font-bold text-white/60">{index + 1} / {slides.length}</span>
          <button type="button" onClick={() => go(index + 1)} disabled={index >= slides.length - 1} className="rounded-lg bg-white/10 px-4 py-3 text-sm font-bold disabled:opacity-40">
            {copy.next}
            <ChevronRight className="ml-1 inline h-4 w-4" />
          </button>
        </div>
      </div>
    </main>
  );
}
