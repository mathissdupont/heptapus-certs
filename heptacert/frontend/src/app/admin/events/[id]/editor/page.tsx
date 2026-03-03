"use client";

import {
  apiFetch, API_BASE, uploadEventBanner,
} from "@/lib/api";
import { useCallback, useEffect, useRef, useState } from "react";
import Draggable from "react-draggable";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ImagePlus,
  Save,
  TableProperties,
  FileText,
  Type,
  SlidersHorizontal,
  Hash,
  Loader2,
  AlertCircle,
  CheckCircle2,
  QrCode,
  User,
  Users,
  UserCheck,
  LockKeyhole,
  CreditCard,
  Download,
  Upload,
  RefreshCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  History,
  RotateCcw,
  Mail,
  Send,
  Settings,
} from "lucide-react";
import { useT } from "@/lib/i18n";

/* ─── Types ──────────────────────────────────────────────── */
type Pos = { x: number; y: number };
type FieldConfig = {
  x: number; y: number;
  font_size: number;
  font_color: string;
  font_weight: "normal" | "bold";
  font_style: "normal" | "italic";
  text_align: "left" | "center" | "right";
  show: boolean;
};
type EditorConfig = {
  image_width: number;
  image_height: number;
  background_image?: string | null;
  name: FieldConfig;
  cert_id: FieldConfig;
  qr: { x: number; y: number; size: number; show: boolean };
};

const RENDER_W = 780;

function toRenderPx(v: number, realW: number) {
  if (!realW || realW === 0) return v;
  return (v / realW) * RENDER_W;
}
function toRealPx(v: number, realW: number) {
  if (!realW || realW === 0) return v;
  return (v / RENDER_W) * realW;
}

const FIELD_DEFAULT: FieldConfig = {
  x: 50, y: 50,
  font_size: 32,
  font_color: "#1e293b",
  font_weight: "bold",
  font_style: "normal",
  text_align: "center",
  show: true,
};

const DEFAULT_CFG: EditorConfig = {
  image_width: 1240,
  image_height: 877,
  background_image: null,
  name: { ...FIELD_DEFAULT, x: 620, y: 438, font_size: 48, font_color: "#1e293b" },
  cert_id: { ...FIELD_DEFAULT, x: 620, y: 700, font_size: 22, font_color: "#334155", font_weight: "normal" },
  qr: { x: 80, y: 700, size: 120, show: true },
};

/* ─── Panel wrappers ─────────────────────────────────────── */
function PanelSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-800">
        <span className="p-1.5 rounded-lg bg-brand-50 text-brand-600">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function FieldPanel({ label, field, onChange }: {
  label: string;
  field: FieldConfig;
  onChange: (patch: Partial<FieldConfig>) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-600">{label}</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={field.show} onChange={e => onChange({ show: e.target.checked })} className="accent-brand-600 h-3.5 w-3.5" />
          <span className="text-[11px] font-medium text-gray-500">Göster</span>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label text-[10px]">Yazı Boyutu</label>
          <input type="number" value={field.font_size} min={8} max={200} onChange={e => onChange({ font_size: +e.target.value })} className="input-field py-1.5 text-xs" />
        </div>
        <div>
          <label className="label text-[10px]">Renk</label>
          <input type="color" value={field.font_color} onChange={e => onChange({ font_color: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border border-gray-200 bg-white p-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label text-[10px]">Kalınlık</label>
          <select value={field.font_weight} onChange={e => onChange({ font_weight: e.target.value as any })} className="input-field py-1.5 text-xs">
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
          </select>
        </div>
        <div>
          <label className="label text-[10px]">Stil</label>
          <select value={field.font_style} onChange={e => onChange({ font_style: e.target.value as any })} className="input-field py-1.5 text-xs">
            <option value="normal">Normal</option>
            <option value="italic">İtalik</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label text-[10px]">Hizalama</label>
        <select value={field.text_align} onChange={e => onChange({ text_align: e.target.value as any })} className="input-field py-1.5 text-xs">
          <option value="left">Sol</option>
          <option value="center">Orta</option>
          <option value="right">Sağ</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label text-[10px]">
            X (px)
          </label>
          <input type="number" value={field.x} min={0} onChange={e => onChange({ x: +e.target.value })} className="input-field py-1.5 text-xs" />
        </div>
        <div>
          <label className="label text-[10px]">Y (px)</label>
          <input type="number" value={field.y} min={0} onChange={e => onChange({ y: +e.target.value })} className="input-field py-1.5 text-xs" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────── */
export default function EditorPage({ params }: { params: { id: string } }) {
  const eventId = Number(params.id);
  const t = useT();

  const [cfg, setCfg] = useState<EditorConfig>(DEFAULT_CFG);
  const [cfgVersion, setCfgVersion] = useState(0);
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [activePanel, setActivePanel] = useState<"typography" | "bulk" | "history">("typography");

  // Template history
  type TemplateSnap = { id: number; template_image_url: string | null; created_at: string };
  const [snapshots, setSnapshots] = useState<TemplateSnap[]>([]);
  const [snapsLoading, setSnapsLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  async function loadSnapshots() {
    setSnapsLoading(true);
    try {
      const r = await apiFetch(`/admin/events/${eventId}/template-history`);
      setSnapshots(await r.json());
    } catch { /* silent */ } finally { setSnapsLoading(false); }
  }

  async function restoreSnapshot(snapId: number) {
    if (!confirm("Bu şablona geri dönmek istediğinize emin misiniz? Mevcut şablon kaybolacak.")) return;
    setRestoringId(snapId);
    try {
      await apiFetch(`/admin/events/${eventId}/template-history/${snapId}/restore`, { method: "POST" });
      await loadCfg();
      setActivePanel("typography");
    } catch (ex: any) {
      setErr(ex?.message || "Geri yükleme başarısız.");
    } finally { setRestoringId(null); }
  }

  useEffect(() => {
    if (activePanel === "history") loadSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel]);

  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);

  const [bgUploading, setBgUploading] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  async function uploadBanner(file: File) {
    setBannerUploading(true);
    setErr(null);
    try {
      const data = await uploadEventBanner(eventId, file);
      setBannerUrl(data.event_banner_url);
    } catch (e: any) {
      setErr(e?.message || "Banner yüklenemedi.");
    } finally {
      setBannerUploading(false);
    }
  }

  // Load initial banner URL from event data
  useEffect(() => {
    apiFetch(`/admin/events/${eventId}`, { method: "GET" })
      .then(r => r.json())
      .then((d: any) => { if (d.event_banner_url) setBannerUrl(d.event_banner_url); })
      .catch(() => {});
  }, [eventId]);

  const renderH = cfg.image_width > 0
    ? Math.round((cfg.image_height / cfg.image_width) * RENDER_W)
    : Math.round((877 / 1240) * RENDER_W);

  /* Load config */
  async function loadCfg() {
    setLoadingCfg(true);
    await apiFetch(`/admin/events/${eventId}`, { method: "GET" })
      .then(r => r.json())
      .then((d: { config: any }) => {
        if (d.config && Object.keys(d.config).length > 0) {
          const c = d.config;
          let merged: EditorConfig;
          if (c.name && typeof c.name === "object") {
            merged = { ...DEFAULT_CFG, ...c, name: { ...DEFAULT_CFG.name, ...c.name }, cert_id: { ...DEFAULT_CFG.cert_id, ...c.cert_id }, qr: { ...DEFAULT_CFG.qr, ...c.qr } };
          } else {
            merged = DEFAULT_CFG;
          }
          // Auto-fix: if image_width > 2000 but font sizes look like 1240px defaults
          // (ratio font_size/image_width < 0.02), rescale everything from 1240px reference.
          const refW = 1240;
          const imgW = merged.image_width;
          if (imgW > refW && merged.name.font_size / imgW < 0.02) {
            const scale = imgW / refW;
            merged = {
              ...merged,
              name: { ...merged.name, x: Math.round(merged.name.x * scale), y: Math.round(merged.name.y * scale), font_size: Math.round(merged.name.font_size * scale) },
              cert_id: { ...merged.cert_id, x: Math.round(merged.cert_id.x * scale), y: Math.round(merged.cert_id.y * scale), font_size: Math.round(merged.cert_id.font_size * scale) },
              qr: { ...merged.qr, x: Math.round(merged.qr.x * scale), y: Math.round(merged.qr.y * scale), size: Math.round(merged.qr.size * scale) },
            };
          }
          setCfg(merged);
          setCfgVersion(v => v + 1);
        }
      })
      .catch(() => {/* use defaults */})
      .finally(() => setLoadingCfg(false));
  }

  useEffect(() => { loadCfg(); }, [eventId]);

  /* Save config */
  async function saveConfig() {
    setSaving(true);
    setErr(null);
    try {
      await apiFetch(`/admin/events/${eventId}/config`, {
        method: "PUT",
        body: JSON.stringify(cfg),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setErr(e?.message || "Kaydetme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  /* Upload background */
  async function uploadBackground(file: File) {
    setBgUploading(true);
    setErr(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiFetch(`/admin/events/${eventId}/template-upload`, {
        method: "POST",
        body: form,
        headers: {},
      });
      const data = await res.json();
      // backend returns { template_image_url, url, width, height }
      const bgUrl = data.url || `${API_BASE.replace("/api", "")}/api/files/${data.template_image_url}`;
      setCfg(c => {
        const oldW = c.image_width || 1240;
        const newW = data.width || oldW;
        const scale = newW / oldW;
        // Rescale all field positions + font sizes proportionally so they
        // stay in the same visual location after an image dimension change.
        return {
          ...c,
          background_image: bgUrl,
          image_width: newW,
          image_height: data.height || c.image_height,
          name: {
            ...c.name,
            x: Math.round(c.name.x * scale),
            y: Math.round(c.name.y * scale),
            font_size: Math.round(c.name.font_size * scale),
          },
          cert_id: {
            ...c.cert_id,
            x: Math.round(c.cert_id.x * scale),
            y: Math.round(c.cert_id.y * scale),
            font_size: Math.round(c.cert_id.font_size * scale),
          },
          qr: {
            ...c.qr,
            x: Math.round(c.qr.x * scale),
            y: Math.round(c.qr.y * scale),
            size: Math.round(c.qr.size * scale),
          },
        };
      });
      setCfgVersion(v => v + 1);
    } catch (e: any) {
      setErr(e?.message || "Arka plan yüklenemedi.");
    } finally {
      setBgUploading(false);
    }
  }

  /* Bulk excel generate */
  async function generateBulk() {
    if (!bulkFile) return setErr("Lütfen bir Excel dosyası seçin.");
    setBulkLoading(true);
    setErr(null);
    setBulkProgress("Kuyruğa alınıyor...");
    try {
      const form = new FormData();
      form.append("file", bulkFile);
      const res = await apiFetch(`/admin/events/${eventId}/bulk-generate`, {
        method: "POST",
        body: form,
      });
      const job = await res.json();
      const jobId = job?.id;
      if (!jobId) throw new Error("Job başlatılamadı");

      const startedAt = Date.now();
      const MAX_WAIT_MS = 30 * 60 * 1000;

      while (true) {
        if (Date.now() - startedAt > MAX_WAIT_MS) {
          throw new Error("İşlem çok uzun sürdü. Job arka planda devam ediyor.");
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
        const statusRes = await apiFetch(`/admin/events/${eventId}/bulk-generate-jobs/${jobId}`);
        const status = await statusRes.json();

        const total = status?.total_count || 0;
        const current = status?.current_index || 0;
        const created = status?.created_count || 0;
        const failed = status?.failed_count || 0;
        setBulkProgress(`İşleniyor: ${current}/${total} • Oluşan: ${created} • Hata: ${failed}`);

        if (status?.status === "completed") {
          setBulkProgress("Tamamlandı, ZIP indiriliyor...");
          const dlRes = await apiFetch(`/admin/events/${eventId}/bulk-generate-jobs/${jobId}/download`);
          const blob = await dlRes.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `certificates-event-${eventId}-job-${jobId}.zip`;
          a.click();
          URL.revokeObjectURL(url);
          setBulkProgress(`Tamamlandı: ${created} sertifika üretildi.`);
          break;
        }

        if (status?.status === "failed") {
          throw new Error(status?.error_message || "Toplu üretim job başarısız.");
        }

        if (status?.status === "cancelled") {
          throw new Error("Toplu üretim job iptal edildi.");
        }
      }
    } catch (e: any) {
      setErr(e?.message || "Toplu üretim başarısız.");
    } finally {
      setBulkLoading(false);
    }
  }

  /* Drag handlers */
  // Text elements are RENDER_W-wide: x is always 0 in the canvas (full-width).
  // Dragging only moves them vertically. Horizontal position (anchor) is set via the X input.
  // Using controlled `position` prop so input changes immediately reflect in the canvas.
  const onNameDrag = useCallback((_: any, d: { x: number; y: number }) => {
    setCfg(c => ({
      ...c,
      name: { ...c.name, x: Math.round(toRealPx(d.x, c.image_width)), y: Math.round(toRealPx(d.y, c.image_width)) }
    }));
  }, []);

  const onCertIdDrag = useCallback((_: any, d: { x: number; y: number }) => {
    setCfg(c => ({
      ...c,
      cert_id: { ...c.cert_id, x: Math.round(toRealPx(d.x, c.image_width)), y: Math.round(toRealPx(d.y, c.image_width)) }
    }));
  }, []);

  const onQrStop = useCallback((_: any, d: { x: number; y: number }) => {
    setCfg(c => ({
      ...c,
      qr: { ...c.qr, x: Math.round(toRealPx(d.x, c.image_width)), y: Math.round(toRealPx(d.y, c.image_width)) }
    }));
  }, []);

  if (loadingCfg) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  // Render-space coordinates for text elements (freely draggable)
  const nameRX    = toRenderPx(cfg.name.x,    cfg.image_width);
  const nameRY    = toRenderPx(cfg.name.y,    cfg.image_width);
  const certIdRX  = toRenderPx(cfg.cert_id.x, cfg.image_width);
  const certIdRY  = toRenderPx(cfg.cert_id.y, cfg.image_width);

  // Alignment offset: shift visual element so the anchor point matches the generator
  const alignTransform = (align: string) =>
    align === "center" ? "translateX(-50%)" : align === "right" ? "translateX(-100%)" : "none";
  const qrRX = toRenderPx(cfg.qr.x, cfg.image_width);
  const qrRY = toRenderPx(cfg.qr.y, cfg.image_width);
  const qrRS = toRenderPx(cfg.qr.size, cfg.image_width);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">

      {/* TOP BAR */}
      <div className="px-6 py-3 border-b border-gray-100 bg-white shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/events" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
              <ChevronLeft className="h-4 w-4" /> {t("editor_back")}
            </Link>
            <span className="text-gray-200">/</span>
            <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
              <FileText className="h-4 w-4 text-brand-500" />
              {t("editor_title")} — Event {eventId}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2">
              <Link href={`/admin/events/${eventId}/settings`} title="Ayarlar" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors text-sm font-medium">
                <Settings className="h-4 w-4" />
                Ayarlar
              </Link>
              <Link href={`/admin/events/${eventId}/email-templates`} title="Email Şablonları" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors text-sm font-medium">
                <Mail className="h-4 w-4" />
                Email
              </Link>
              <Link href={`/admin/events/${eventId}/bulk-emails`} title="Toplu Email" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors text-sm font-medium">
                <Send className="h-4 w-4" />
                Kampanya
              </Link>
            </div>
            <div className="border-l border-gray-200 mx-2 h-6" />
            <AnimatePresence>
              {saved && (
                <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t("editor_saved")}
                </motion.span>
              )}
            </AnimatePresence>
            <button onClick={saveConfig} disabled={saving} className="btn-primary flex items-center gap-2 px-5 py-2 text-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("editor_save")}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <Link href={`/admin/events/${eventId}/certificates`} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 shadow-sm transition-colors">
            <LockKeyhole className="h-3.5 w-3.5" /> Sertifikalar
          </Link>
          <Link href={`/admin/events/${eventId}/sessions`} className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 shadow-sm transition-colors">
            <QrCode className="h-3.5 w-3.5" /> Oturumlar
          </Link>
          <Link href={`/admin/events/${eventId}/attendees`} className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3.5 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50 shadow-sm transition-colors">
            <Users className="h-3.5 w-3.5" /> Katılımcılar
          </Link>
          <Link href={`/admin/events/${eventId}/checkin`} className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50 shadow-sm transition-colors">
            <UserCheck className="h-3.5 w-3.5" /> Check-in
          </Link>
          <Link href={`/admin/events/${eventId}/gamification`} className="flex items-center gap-1.5 rounded-lg border border-fuchsia-200 bg-white px-3.5 py-1.5 text-xs font-bold text-fuchsia-700 hover:bg-fuchsia-50 shadow-sm transition-colors">
            Gamification
          </Link>
          <Link href={`/admin/events/${eventId}/surveys`} className="flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-white px-3.5 py-1.5 text-xs font-bold text-cyan-700 hover:bg-cyan-50 shadow-sm transition-colors">
            Anket
          </Link>
          <Link href={`/admin/events/${eventId}/advanced-analytics`} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
            İleri Analitik
          </Link>
          <Link href={`/admin/events/${eventId}/editor`} className="flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm">
            Editör
          </Link>
          <Link href={`/admin/events/${eventId}/email-templates`} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
            <Mail className="h-3.5 w-3.5" /> Email
          </Link>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* CANVAS AREA — intentionally dark (design tool experience) */}
        <div className="flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-8">
          <div className="relative" style={{ width: RENDER_W, height: renderH }}>

            {/* Background */}
            {cfg.background_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cfg.background_image} alt="bg" className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-2xl" draggable={false} />
            ) : (
              <div className="absolute inset-0 rounded-lg border-2 border-dashed border-slate-600 bg-slate-800 flex flex-col items-center justify-center gap-3 cursor-pointer group"
                onClick={() => bgInputRef.current?.click()}>
                {bgUploading ? (
                  <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
                ) : (
                  <>
                    <ImagePlus className="h-10 w-10 text-slate-500 group-hover:text-slate-300 transition-colors" />
                    <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors font-medium">{t("editor_upload_bg")}</span>
                  </>
                )}
              </div>
            )}

            {/* Upload overlay button */}
            {cfg.background_image && (
              <button onClick={() => bgInputRef.current?.click()} title="Değiştir"
                className="absolute top-3 right-3 z-50 p-2 rounded-xl bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-sm">
                <RefreshCcw className="h-4 w-4" />
              </button>
            )}

            <input ref={bgInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { if (e.target.files?.[0]) uploadBackground(e.target.files[0]); }} />

            {/* Name draggable — freely movable in X+Y */}
            {cfg.name.show && (
              <Draggable
                key={`name-${cfgVersion}`}
                position={{ x: nameRX, y: nameRY }}
                onDrag={onNameDrag}
                bounds="parent"
              >
                <div
                  className="absolute cursor-move select-none z-20"
                  style={{ lineHeight: 1.3 }}
                >
                  <div style={{ transform: alignTransform(cfg.name.text_align) }}>
                    <span
                      className="rounded border-2 border-dashed border-brand-400/60 px-2 py-0.5 hover:border-brand-500 transition-colors bg-white/5 backdrop-blur-sm whitespace-nowrap inline-block"
                      style={{
                        fontSize: toRenderPx(cfg.name.font_size, cfg.image_width),
                        color: cfg.name.font_color,
                        fontWeight: cfg.name.font_weight,
                        fontStyle: cfg.name.font_style,
                      }}
                    >
                      {t("editor_preview_name")}
                    </span>
                  </div>
                </div>
              </Draggable>
            )}

            {/* Cert ID draggable — freely movable in X+Y */}
            {cfg.cert_id.show && (
              <Draggable
                key={`certid-${cfgVersion}`}
                position={{ x: certIdRX, y: certIdRY }}
                onDrag={onCertIdDrag}
                bounds="parent"
              >
                <div
                  className="absolute cursor-move select-none z-20"
                  style={{ lineHeight: 1.3 }}
                >
                  <div style={{ transform: alignTransform(cfg.cert_id.text_align) }}>
                    <span
                      className="rounded border-2 border-dashed border-amber-400/60 px-2 py-0.5 hover:border-amber-500 transition-colors bg-white/5 backdrop-blur-sm whitespace-nowrap inline-block"
                      style={{
                        fontSize: toRenderPx(cfg.cert_id.font_size, cfg.image_width),
                        color: cfg.cert_id.font_color,
                        fontWeight: cfg.cert_id.font_weight,
                        fontStyle: cfg.cert_id.font_style,
                      }}
                    >
                      {t("editor_preview_cert_id")}
                    </span>
                  </div>
                </div>
              </Draggable>
            )}

            {/* QR draggable */}
            {cfg.qr.show && (
              <Draggable key={`qr-${cfgVersion}`} position={{ x: qrRX, y: qrRY }} onDrag={onQrStop} bounds="parent">
                <div className="absolute cursor-move" style={{ width: qrRS, height: qrRS }}>
                  <div className="w-full h-full rounded-md border-2 border-dashed border-emerald-400/60 bg-white/10 backdrop-blur flex items-center justify-center hover:border-emerald-400 transition-colors">
                    <QrCode className="text-emerald-300" style={{ width: "50%", height: "50%" }} />
                  </div>
                </div>
              </Draggable>
            )}
          </div>
        </div>

        {/* RIGHT PANEL — light theme */}
        <div className="w-80 flex flex-col overflow-hidden border-l border-gray-100 bg-gray-50">

          {/* Panel tabs */}
          <div className="flex shrink-0 border-b border-gray-100 bg-white">
            <button onClick={() => setActivePanel("typography")}
              className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-bold transition-all border-b-2 ${activePanel === "typography" ? "border-brand-500 text-brand-600" : "border-transparent text-gray-400 hover:text-gray-700"}`}>
              <Type className="h-3.5 w-3.5" /> {t("editor_tab_typography")}
            </button>
            <button onClick={() => setActivePanel("bulk")}
              className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-bold transition-all border-b-2 ${activePanel === "bulk" ? "border-brand-500 text-brand-600" : "border-transparent text-gray-400 hover:text-gray-700"}`}>
              <TableProperties className="h-3.5 w-3.5" /> {t("editor_tab_bulk")}
            </button>
            <button onClick={() => setActivePanel("history")}
              className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-bold transition-all border-b-2 ${activePanel === "history" ? "border-brand-500 text-brand-600" : "border-transparent text-gray-400 hover:text-gray-700"}`}>
              <History className="h-3.5 w-3.5" /> Geçmiş
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            <AnimatePresence>
              {err && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <div className="error-banner flex items-center gap-2 text-xs">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {err}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {activePanel === "typography" && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">

                {/* Canvas dimensions */}
                <PanelSection icon={<Maximize2 className="h-3.5 w-3.5" />} title={t("editor_dimensions")}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-[10px]">{t("editor_width")} (px)</label>
                      <input type="number" value={cfg.image_width} onChange={e => setCfg(c => ({ ...c, image_width: +e.target.value }))} className="input-field py-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="label text-[10px]">{t("editor_height")} (px)</label>
                      <input type="number" value={cfg.image_height} onChange={e => setCfg(c => ({ ...c, image_height: +e.target.value }))} className="input-field py-1.5 text-xs" />
                    </div>
                  </div>
                </PanelSection>

                {/* Name field */}
                <PanelSection icon={<User className="h-3.5 w-3.5" />} title={t("editor_name_field")}>
                  <FieldPanel label="Ad Soyad" field={cfg.name} onChange={p => setCfg(c => ({ ...c, name: { ...c.name, ...p } }))} />
                </PanelSection>

                {/* Cert ID field */}
                <PanelSection icon={<Hash className="h-3.5 w-3.5" />} title={t("editor_certid_field")}>
                  <FieldPanel label="Sertifika ID" field={cfg.cert_id} onChange={p => setCfg(c => ({ ...c, cert_id: { ...c.cert_id, ...p } }))} />
                </PanelSection>

                {/* QR */}
                <PanelSection icon={<QrCode className="h-3.5 w-3.5" />} title={t("editor_qr_field")}>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-600">QR Kodu</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={cfg.qr.show} onChange={e => setCfg(c => ({ ...c, qr: { ...c.qr, show: e.target.checked } }))} className="accent-brand-600 h-3.5 w-3.5" />
                        <span className="text-[11px] font-medium text-gray-500">Göster</span>
                      </label>
                    </div>
                    <div>
                      <label className="label text-[10px]">Boyut (px)</label>
                      <input type="number" value={cfg.qr.size} min={40} max={400}
                        onChange={e => setCfg(c => ({ ...c, qr: { ...c.qr, size: +e.target.value } }))} className="input-field py-1.5 text-xs" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label text-[10px]">X (px)</label>
                        <input type="number" value={cfg.qr.x} min={0} onChange={e => setCfg(c => ({ ...c, qr: { ...c.qr, x: +e.target.value } }))} className="input-field py-1.5 text-xs" />
                      </div>
                      <div>
                        <label className="label text-[10px]">Y (px)</label>
                        <input type="number" value={cfg.qr.y} min={0} onChange={e => setCfg(c => ({ ...c, qr: { ...c.qr, y: +e.target.value } }))} className="input-field py-1.5 text-xs" />
                      </div>
                    </div>
                  </div>
                </PanelSection>

                {/* HeptaCert Hologram */}
                <PanelSection icon={<SlidersHorizontal className="h-3.5 w-3.5" />} title="HeptaCert Hologramı">
                  <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-gray-700">Hologram Damgası</span>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                          Sağ alt köşeye yarı saydam HeptaCert™ mührü basar.
                        </p>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer shrink-0 ml-3">
                        <input
                          type="checkbox"
                          checked={(cfg as any).show_hologram !== false}
                          onChange={e => setCfg(c => ({ ...c, show_hologram: e.target.checked } as any))}
                          className="accent-brand-600 h-4 w-4"
                        />
                        <span className="text-xs font-semibold text-brand-700">Aktif</span>
                      </label>
                    </div>
                  </div>
                </PanelSection>

                {/* Event Banner / Hero Image */}
                <PanelSection icon={<ImagePlus className="h-3.5 w-3.5" />} title="Etkinlik Kapak Görseli">
                  <div className="space-y-3">
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Kayıt sayfasında hero bölümünde gösterilecek görsel.
                    </p>
                    {bannerUrl && (
                      <div className="relative rounded-xl overflow-hidden border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={bannerUrl} alt="Banner" className="w-full h-24 object-cover" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => bannerInputRef.current?.click()}>
                          <span className="text-white text-xs font-bold">Değiştir</span>
                        </div>
                      </div>
                    )}
                    <div
                      className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-5 hover:border-brand-300 hover:bg-brand-50/30 transition-all group cursor-pointer"
                      onClick={() => bannerInputRef.current?.click()}
                    >
                      {bannerUploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-gray-300 group-hover:text-brand-400 transition-colors" />
                          <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors font-medium">
                            {bannerUrl ? "Yeni görsel yükle" : "Kapak görseli yükle"}
                          </span>
                        </>
                      )}
                    </div>
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { if (e.target.files?.[0]) uploadBanner(e.target.files[0]); }}
                    />
                  </div>
                </PanelSection>

                <div className="pt-2">
                  <div className="rounded-xl border border-dashed border-gray-200 px-4 py-3 space-y-1.5">
                    <div className="flex items-start gap-2.5">
                      <Move className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Tüm elemanları (İsim, Sertifika No, QR) sürükleyerek istediğiniz yere taşıyabilirsiniz.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activePanel === "bulk" && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <PanelSection icon={<TableProperties className="h-3.5 w-3.5" />} title={t("editor_bulk_title")}>
                  <div className="space-y-3">
                    <p className="text-[11px] text-gray-400 leading-relaxed">{t("editor_bulk_desc")}</p>
                    <label className="flex flex-col gap-1.5 cursor-pointer">
                      <span className="label">{t("editor_bulk_file")}</span>
                      <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-6 hover:border-brand-300 hover:bg-brand-50/30 transition-all group">
                        <Upload className="h-6 w-6 text-gray-300 group-hover:text-brand-400 transition-colors" />
                        <span className="text-xs text-gray-400">
                          {bulkFile ? bulkFile.name : t("editor_bulk_select")}
                        </span>
                        <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                          onChange={e => setBulkFile(e.target.files?.[0] || null)} />
                      </div>
                    </label>
                    <button onClick={generateBulk} disabled={bulkLoading || !bulkFile}
                      className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                      {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      {t("editor_bulk_generate")}
                    </button>
                    {bulkProgress && (
                      <p className="text-[11px] text-gray-500 leading-relaxed">{bulkProgress}</p>
                    )}
                  </div>
                </PanelSection>
              </motion.div>
            )}

            {activePanel === "history" && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-700 flex items-center gap-2">
                    <History className="h-3.5 w-3.5 text-gray-400" /> Şablon Geçmişi
                  </p>
                  <button onClick={loadSnapshots} className="text-gray-400 hover:text-gray-700 transition-colors">
                    <RefreshCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
                {snapsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>
                ) : snapshots.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">Geçmiş snapshot bulunamadı.</p>
                ) : (
                  <div className="space-y-2">
                    {snapshots.map((snap) => (
                      <div key={snap.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {snap.template_image_url ? (
                            <img src={snap.template_image_url} alt="" className="h-10 w-16 object-cover rounded border border-gray-200" />
                          ) : (
                            <div className="h-10 w-16 rounded border border-gray-200 bg-gray-100 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-gray-300" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-gray-700">#{snap.id}</p>
                            <p className="text-[10px] text-gray-400">{new Date(snap.created_at).toLocaleString("tr-TR")}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => restoreSnapshot(snap.id)}
                          disabled={restoringId === snap.id}
                          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                        >
                          {restoringId === snap.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                          Geri Yükle
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
