"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download, FileText, Loader2, MonitorPlay, Presentation, RefreshCw, Trash2, Upload } from "lucide-react";
import { deletePresentation, listEventPresentations, presentationFileUrl, uploadEventPresentation, type PresentationDeck } from "@/lib/presentationsApi";
import { useI18n } from "@/lib/i18n";

function formatBytes(value?: number | null) {
  if (!value) return "-";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKind(deck: PresentationDeck) {
  const name = (deck.file_filename || "").toLowerCase();
  if (deck.file_content_type === "application/pdf" || name.endsWith(".pdf")) return "PDF";
  if (name.endsWith(".ppt")) return "PPT";
  return "PPTX";
}

export default function EventPresentationsPage() {
  const params = useParams<{ id: string }>();
  const eventId = Number(params.id);
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const [items, setItems] = useState<PresentationDeck[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(() => ({
    title: isTr ? "Etkinlik sunumları" : "Event presentations",
    subtitle: isTr
      ? "PDF veya PowerPoint dosyalarını etkinliğe bağlayın ve sahne modunda tam ekran sunun."
      : "Attach PDF or PowerPoint files to this event and present them in fullscreen stage mode.",
    uploadTitle: isTr ? "Sunum dosyası yükle" : "Upload a presentation file",
    name: isTr ? "Sunum adı" : "Presentation title",
    description: isTr ? "Not / açıklama" : "Note / description",
    choose: isTr ? "PDF, PPTX veya PPT seç" : "Choose PDF, PPTX, or PPT",
    upload: isTr ? "Yükle" : "Upload",
    uploading: isTr ? "Yükleniyor..." : "Uploading...",
    refresh: isTr ? "Yenile" : "Refresh",
    empty: isTr ? "Bu etkinliğe henüz sunum yüklenmemiş." : "No presentations uploaded for this event yet.",
    stage: isTr ? "Sahne modu" : "Stage mode",
    download: isTr ? "Dosyayı indir/aç" : "Open/download file",
    remove: isTr ? "Sil" : "Delete",
    deleteConfirm: isTr ? "Bu sunum dosyasını silmek istiyor musunuz?" : "Delete this presentation file?",
    loadFailed: isTr ? "Sunumlar yüklenemedi." : "Could not load presentations.",
    uploadFailed: isTr ? "Sunum yüklenemedi." : "Could not upload presentation.",
    pptxNote: isTr
      ? "Not: PDF dosyaları sahne içinde gömülü gösterilir. PowerPoint dosyaları güvenli dosya olarak açılır; gerçek slayt-render dönüşümü ayrı altyapı gerektirir."
      : "Note: PDFs render inside the stage view. PowerPoint files open as secure files; native slide rendering requires a separate conversion layer.",
  }), [isTr]);

  async function load() {
    setLoading(true);
    try {
      setItems(await listEventPresentations(eventId));
      setError(null);
    } catch (ex: any) {
      setError(ex?.message || copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (eventId) void load();
  }, [eventId]);

  async function handleUpload() {
    if (!file) return;
    setWorking(true);
    try {
      const next = await uploadEventPresentation(eventId, {
        title: title.trim() || file.name.replace(/\.(pdf|pptx?|PDF|PPTX?)$/, ""),
        description: description.trim() || undefined,
        language: isTr ? "tr" : "en",
        file,
      });
      setItems((current) => [next, ...current]);
      setTitle("");
      setDescription("");
      setFile(null);
      setError(null);
    } catch (ex: any) {
      setError(ex?.message || copy.uploadFailed);
    } finally {
      setWorking(false);
    }
  }

  async function handleDelete(deck: PresentationDeck) {
    if (!window.confirm(copy.deleteConfirm)) return;
    await deletePresentation(deck.id);
    setItems((current) => current.filter((item) => item.id !== deck.id));
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="section-label">HeptaDeck</p>
          <h1 className="page-title">{copy.title}</h1>
          <p className="page-subtitle">{copy.subtitle}</p>
        </div>
        <button type="button" onClick={() => void load()} className="btn-secondary">
          <RefreshCw className="h-4 w-4" />
          {copy.refresh}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="card space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Presentation className="h-4 w-4 text-brand-700" />
            <h2 className="card-title">{copy.uploadTitle}</h2>
          </div>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={copy.name} />
          <textarea className="input min-h-20" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={copy.description} />
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-surface-200 bg-surface-50 px-4 py-8 text-center transition hover:border-surface-300 hover:bg-white">
            <Upload className="mb-2 h-6 w-6 text-surface-400" />
            <span className="text-sm font-semibold text-surface-700">{file?.name || copy.choose}</span>
            <span className="mt-1 text-xs text-surface-400">PDF, PPTX, PPT</span>
            <input
              type="file"
              accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>
          <button type="button" onClick={() => void handleUpload()} disabled={working || !file} className="btn-primary w-full">
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {working ? copy.uploading : copy.upload}
          </button>
          <p className="helper-text">{copy.pptxNote}</p>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="card flex items-center justify-center p-12">
              <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="card empty-state">
              <FileText className="h-8 w-8 text-surface-300" />
              <p className="empty-state-title">{copy.empty}</p>
            </div>
          ) : (
            items.map((deck) => {
              const fileUrl = presentationFileUrl(deck);
              return (
                <div key={deck.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge-neutral">{fileKind(deck)}</span>
                        <h2 className="truncate text-sm font-bold text-surface-900">{deck.title}</h2>
                      </div>
                      {deck.description && <p className="body-xs mt-2">{deck.description}</p>}
                      <p className="mt-2 text-xs text-surface-400">{deck.file_filename || "-"} · {formatBytes(deck.file_size)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/events/${eventId}/presentations/${deck.id}/present`} target="_blank" className="btn-primary">
                        <MonitorPlay className="h-4 w-4" />
                        {copy.stage}
                      </Link>
                      {fileUrl && (
                        <a href={fileUrl} target="_blank" rel="noreferrer" className="btn-secondary">
                          <Download className="h-4 w-4" />
                          {copy.download}
                        </a>
                      )}
                      <button type="button" onClick={() => void handleDelete(deck)} className="btn-secondary text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                        {copy.remove}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
