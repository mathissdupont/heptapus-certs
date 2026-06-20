"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, FileText, Loader2, Plus, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import { exportPresentation, generatePresentation, listPresentations, updatePresentation, deletePresentation, regeneratePresenterToken, type PresentationDeck, type PresentationSlide } from "@/lib/presentationsApi";
import { getApiBase, getToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function emptyForm(isTr: boolean) {
  return {
    topic: "",
    audience: isTr ? "Profesyonel ekip" : "Professional team",
    slide_count: 6,
    style: isTr ? "modern ve sade" : "modern and minimal",
    extra_notes: "",
  };
}

function downloadUrl(path: string): string {
  const url = `${getApiBase()}${path.replace(/^\/api/, "")}`;
  const token = getToken();
  return token ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : url;
}

function slideText(slide: PresentationSlide): string {
  if (slide.layout === "title") return slide.subtitle || "";
  return (slide.bullets || []).join("\n") || slide.body || "";
}

function applySlideText(slide: PresentationSlide, value: string): PresentationSlide {
  if (slide.layout === "title") return { ...slide, subtitle: value };
  return {
    ...slide,
    bullets: value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

export default function AdminPresentationsPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const [decks, setDecks] = useState<PresentationDeck[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState(() => emptyForm(isTr));
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => decks.find((deck) => deck.id === selectedId) || decks[0] || null, [decks, selectedId]);

  async function load() {
    setLoading(true);
    try {
      const rows = await listPresentations();
      setDecks(rows);
      if (!selectedId && rows[0]) setSelectedId(rows[0].id);
      setError(null);
    } catch (ex: any) {
      setError(ex?.message || (isTr ? "Sunumlar yüklenemedi." : "Failed to load presentations."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleGenerate() {
    if (!form.topic.trim()) return;
    setWorking(true);
    try {
      const deck = await generatePresentation({
        ...form,
        topic: form.topic.trim(),
        language: isTr ? "tr" : "en",
        extra_notes: form.extra_notes.trim() || undefined,
      });
      setDecks((current) => [deck, ...current]);
      setSelectedId(deck.id);
      setForm(emptyForm(isTr));
      setError(null);
    } catch (ex: any) {
      setError(ex?.message || (isTr ? "Sunum oluşturulamadı." : "Could not generate the deck."));
    } finally {
      setWorking(false);
    }
  }

  async function patchSelected(patch: Partial<PresentationDeck>) {
    if (!selected) return;
    setSaving(true);
    try {
      const next = await updatePresentation(selected.id, patch);
      setDecks((current) => current.map((deck) => (deck.id === next.id ? next : deck)));
      setError(null);
    } catch (ex: any) {
      setError(ex?.message || (isTr ? "Kaydedilemedi." : "Could not save."));
    } finally {
      setSaving(false);
    }
  }

  async function handleExport(deck: PresentationDeck) {
    setWorking(true);
    try {
      const exported = await exportPresentation(deck.id);
      setDecks((current) => current.map((item) => (item.id === exported.id ? exported : item)));
      if (exported.export_url) window.location.href = downloadUrl(exported.export_url);
    } catch (ex: any) {
      setError(ex?.message || (isTr ? "Export alınamadı." : "Could not export."));
    } finally {
      setWorking(false);
    }
  }

  async function handleDelete(deck: PresentationDeck) {
    if (!window.confirm(isTr ? "Bu sunumu silmek istiyor musun?" : "Delete this presentation?")) return;
    await deletePresentation(deck.id);
    setDecks((current) => current.filter((item) => item.id !== deck.id));
    setSelectedId(null);
  }

  async function handleRegeneratePresenterLink(deck: PresentationDeck) {
    setWorking(true);
    try {
      const next = await regeneratePresenterToken(deck.id);
      setDecks((current) => current.map((item) => (item.id === next.id ? next : item)));
      setError(null);
    } catch (ex: any) {
      setError(ex?.message || (isTr ? "Sunum linki yenilenemedi." : "Could not refresh presenter link."));
    } finally {
      setWorking(false);
    }
  }

  const copy = {
    title: isTr ? "Sunumlar" : "Presentations",
    subtitle: isTr
      ? "Genel sunumlar oluşturun, düzenleyin ve PowerPoint olarak dışa aktarın."
      : "Create, edit, and export general slide decks as PowerPoint files.",
    generate: isTr ? "Sunum oluştur" : "Generate deck",
    topic: isTr ? "Konu" : "Topic",
    audience: isTr ? "Hedef kitle" : "Audience",
    style: isTr ? "Stil" : "Style",
    notes: isTr ? "Ek notlar" : "Extra notes",
    slides: isTr ? "Slide sayısı" : "Slides",
    empty: isTr ? "Henüz sunum yok. İlk sunumu AI ile oluştur." : "No decks yet. Generate the first one with AI.",
    save: isTr ? "Kaydet" : "Save",
    export: isTr ? "PowerPoint indir" : "Download PowerPoint",
    present: isTr ? "Sunum modu" : "Presenter mode",
    refreshLink: isTr ? "Linki yenile" : "Refresh link",
    speakerNotes: isTr ? "Konuşmacı notları" : "Speaker notes",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">HeptaDeck</p>
          <h1 className="mt-1.5 text-2xl font-black text-surface-900">{copy.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-surface-500">{copy.subtitle}</p>
        </div>
        <button type="button" onClick={() => void load()} className="btn-secondary">
          <RefreshCw className="h-4 w-4" />
          {isTr ? "Yenile" : "Refresh"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <div className="card space-y-4 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-surface-900">
              <Sparkles className="h-4 w-4 text-brand-600" />
              {copy.generate}
            </div>
            <input className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm" placeholder={copy.topic} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <input className="rounded-lg border border-surface-200 px-3 py-2 text-sm" placeholder={copy.audience} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
              <input className="rounded-lg border border-surface-200 px-3 py-2 text-sm" placeholder={copy.style} value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} />
            </div>
            <label className="block text-xs font-semibold text-surface-500">
              {copy.slides}
              <input className="mt-1 w-full" type="range" min={3} max={15} value={form.slide_count} onChange={(e) => setForm({ ...form, slide_count: Number(e.target.value) })} />
              <span>{form.slide_count}</span>
            </label>
            <textarea className="min-h-20 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm" placeholder={copy.notes} value={form.extra_notes} onChange={(e) => setForm({ ...form, extra_notes: e.target.value })} />
            <button type="button" onClick={() => void handleGenerate()} disabled={working || !form.topic.trim()} className="btn-primary w-full">
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {copy.generate}
            </button>
          </div>

          <div className="space-y-2">
            {decks.map((deck) => (
              <button
                key={deck.id}
                type="button"
                onClick={() => setSelectedId(deck.id)}
                className={`w-full rounded-lg border p-3 text-left transition ${selected?.id === deck.id ? "border-brand-300 bg-brand-50" : "border-surface-200 bg-white hover:bg-surface-50"}`}
              >
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 text-surface-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-surface-900">{deck.title}</p>
                    <p className="text-xs text-surface-500">{deck.slides.length} slides · {deck.source}</p>
                  </div>
                </div>
              </button>
            ))}
            {decks.length === 0 && <div className="card p-5 text-sm text-surface-500">{copy.empty}</div>}
          </div>
        </div>

        {selected && (
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-100 p-4">
              <input
                className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-xl font-black text-surface-900 focus:border-surface-200"
                value={selected.title}
                onChange={(e) => setDecks((current) => current.map((deck) => deck.id === selected.id ? { ...deck, title: e.target.value } : deck))}
              />
              <div className="flex gap-2">
                <button type="button" className="btn-secondary" disabled={saving} onClick={() => void patchSelected({ title: selected.title, slides: selected.slides })}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {copy.save}
                </button>
                <button type="button" className="btn-secondary" disabled={working} onClick={() => void handleExport(selected)}>
                  <Download className="h-4 w-4" />
                  {copy.export}
                </button>
                {selected.presenter_url && (
                  <a className="btn-secondary" href={selected.presenter_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    {copy.present}
                  </a>
                )}
                <button type="button" className="btn-secondary" disabled={working} onClick={() => void handleRegeneratePresenterLink(selected)}>
                  <RefreshCw className="h-4 w-4" />
                  {copy.refreshLink}
                </button>
                <button type="button" className="btn-secondary text-rose-600 hover:bg-rose-50" onClick={() => void handleDelete(selected)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-4 p-4 xl:grid-cols-2">
              {selected.slides.map((slide, index) => (
                <div key={index} className="rounded-lg border border-surface-200 bg-white p-4">
                  <div className="mb-3 aspect-video rounded-lg border border-surface-100 bg-surface-950 p-5 text-white">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/50">Slide {index + 1}</p>
                    <h3 className="mt-4 text-xl font-black">{slide.title || "Untitled"}</h3>
                    <div className="mt-4 space-y-1 text-sm text-white/75">
                      {slide.layout === "title" ? <p>{slide.subtitle}</p> : (slide.bullets || []).slice(0, 4).map((bullet, bulletIndex) => <p key={bulletIndex}>- {bullet}</p>)}
                    </div>
                  </div>
                  <input
                    className="mb-2 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm font-semibold"
                    value={slide.title}
                    onChange={(e) => {
                      const slides = [...selected.slides];
                      slides[index] = { ...slide, title: e.target.value };
                      setDecks((current) => current.map((deck) => deck.id === selected.id ? { ...deck, slides } : deck));
                    }}
                  />
                  <textarea
                    className="min-h-28 w-full rounded-lg border border-surface-200 px-3 py-2 text-sm"
                    value={slideText(slide)}
                    onChange={(e) => {
                      const slides = [...selected.slides];
                      slides[index] = applySlideText(slide, e.target.value);
                      setDecks((current) => current.map((deck) => deck.id === selected.id ? { ...deck, slides } : deck));
                    }}
                  />
                  <label className="mt-3 block text-xs font-bold uppercase tracking-[0.14em] text-surface-400">
                    {copy.speakerNotes}
                  </label>
                  <textarea
                    className="mt-1 min-h-24 w-full rounded-lg border border-surface-200 bg-amber-50/40 px-3 py-2 text-sm"
                    value={slide.notes || ""}
                    onChange={(e) => {
                      const slides = [...selected.slides];
                      slides[index] = { ...slide, notes: e.target.value };
                      setDecks((current) => current.map((deck) => deck.id === selected.id ? { ...deck, slides } : deck));
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
