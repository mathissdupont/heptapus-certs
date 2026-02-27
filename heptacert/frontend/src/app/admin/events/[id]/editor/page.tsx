"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Draggable from "react-draggable";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save,
  UploadCloud,
  Settings,
  Type,
  QrCode,
  Hash,
  FileSpreadsheet,
  CheckCircle,
  ExternalLink,
  Download,
  Loader2,
  ChevronLeft,
  AlertCircle,
  Palette,
  Maximize
} from "lucide-react";
import Link from "next/link";

type EventOut = { id: number; name: string; template_image_url: string; config: any };
type Box = { x: number; y: number; w: number; h: number };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

export default function EventEditorPage({ params }: { params: { id: string } }) {
  const eventId = Number(params.id);

  const [event, setEvent] = useState<EventOut | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [imgUrl, setImgUrl] = useState<string>("");
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgTick, setImgTick] = useState(0);

  // draggable boxes (RENDER pixels)
  const [nameBox, setNameBox] = useState<Box>({ x: 120, y: 140, w: 320, h: 60 });
  const [qrBox, setQrBox] = useState<Box>({ x: 120, y: 240, w: 220, h: 220 });
  const [certIdBox, setCertIdBox] = useState<Box>({ x: 60, y: 60, w: 260, h: 44 });

  // style fields
  const [fontSize, setFontSize] = useState<number>(48);
  const [fontColor, setFontColor] = useState<string>("#FFFFFF");
  const [certIdFontSize, setCertIdFontSize] = useState<number>(18);
  const [certIdColor, setCertIdColor] = useState<string>("#94A3B8");

  // upload / bulk
  const [uploading, setUploading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);

  // image metrics
  const imgMetrics = useMemo(() => {
    const img = imgRef.current;
    if (!img || !img.complete) return null;
    return {
      renderW: img.clientWidth,
      renderH: img.clientHeight,
      naturalW: img.naturalWidth,
      naturalH: img.naturalHeight,
    };
  }, [imgTick, imgUrl]);

  function toRealPx(x: number, y: number) {
    const m = imgMetrics;
    if (!m) return { rx: Math.round(x), ry: Math.round(y) };
    const sx = m.naturalW / m.renderW;
    const sy = m.naturalH / m.renderH;
    return { rx: Math.round(x * sx), ry: Math.round(y * sy) };
  }

  function toRenderPx(rx: number, ry: number) {
    const m = imgMetrics;
    if (!m) return { x: rx, y: ry };
    const sx = m.renderW / m.naturalW;
    const sy = m.renderH / m.naturalH;
    return { x: Math.round(rx * sx), y: Math.round(ry * sy) };
  }

  async function loadEvent() {
    setErr(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}`, { method: "GET" });
      const data = await res.json();
      setEvent(data);

      const t = data.template_image_url;
      if (t && typeof t === "string") {
        if (t.startsWith("templates/")) setImgUrl(`${API_BASE}/files/${t}`);
        else setImgUrl(t);
      } else {
        setImgUrl("");
      }

      const cfg = data.config || {};
      setFontSize(cfg.font_size ?? 48);
      setFontColor(cfg.font_color ?? "#FFFFFF");
      setCertIdFontSize(cfg.cert_id_font_size ?? 18);
      setCertIdColor(cfg.cert_id_color ?? "#94A3B8");

    } catch (e: any) {
      setErr(e?.message || "Yükleme başarısız.");
    }
  }

  useEffect(() => {
    if (eventId) loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    if (!event?.config || !imgMetrics) return;
    const cfg = event.config;

    if (typeof cfg.isim_x === "number" && typeof cfg.isim_y === "number") {
      const p = toRenderPx(cfg.isim_x, cfg.isim_y);
      setNameBox((b) => ({ ...b, x: p.x, y: p.y }));
    }
    if (typeof cfg.qr_x === "number" && typeof cfg.qr_y === "number") {
      const p = toRenderPx(cfg.qr_x, cfg.qr_y);
      setQrBox((b) => ({ ...b, x: p.x, y: p.y }));
    }
    if (typeof cfg.cert_id_x === "number" && typeof cfg.cert_id_y === "number") {
      const p = toRenderPx(cfg.cert_id_x, cfg.cert_id_y);
      setCertIdBox((b) => ({ ...b, x: p.x, y: p.y }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgMetrics, event?.id]);

  async function saveConfig() {
    setErr(null);
    try {
      const { rx: isim_x, ry: isim_y } = toRealPx(nameBox.x, nameBox.y);
      const { rx: qr_x, ry: qr_y } = toRealPx(qrBox.x, qrBox.y);
      const { rx: cert_id_x, ry: cert_id_y } = toRealPx(certIdBox.x, certIdBox.y);

      await apiFetch(`/admin/events/${eventId}/config`, {
        method: "PUT",
        body: JSON.stringify({
          isim_x, isim_y, qr_x, qr_y,
          font_size: fontSize, font_color: fontColor,
          cert_id_x, cert_id_y,
          cert_id_font_size: certIdFontSize, cert_id_color: certIdColor,
        }),
      });

      alert("Şablon koordinatları ve stil ayarları başarıyla kaydedildi.");
      await loadEvent();
    } catch (e: any) {
      setErr(e?.message || "Kaydetme başarısız.");
    }
  }

  async function uploadTemplate(file: File) {
    setErr(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await apiFetch(`/admin/events/${eventId}/template-upload`, {
        method: "POST",
        body: form,
      });
      await loadEvent();
    } catch (e: any) {
      setErr(e?.message || "Görsel yüklenemedi.");
    } finally {
      setUploading(false);
    }
  }

  async function bulkGenerate(excelFile: File) {
    setErr(null);
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const form = new FormData();
      form.append("excel", excelFile);
      const res = await apiFetch(`/admin/events/${eventId}/bulk-generate`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      setBulkResult(data);
    } catch (e: any) {
      setErr(e?.message || "Excel işlenirken hata oluştu.");
    } finally {
      setBulkLoading(false);
    }
  }

  // Preview Scale Calculation for realistic live view
  const scaleRatio = imgMetrics ? (imgMetrics.renderW / imgMetrics.naturalW) : 1;

  return (
    <div className="flex flex-col gap-6 pb-20 pt-6">
      
      {/* --- TOP NAVIGATION --- */}
      <div className="flex items-center justify-between">
        <Link href="/admin/events" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-200 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Etkinliklere Dön
        </Link>

        <button onClick={saveConfig} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-black text-slate-950 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all">
          <Save className="h-4 w-4" /> Şablonu Kaydet
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* --- LEFT: CANVAS EDITOR --- */}
        <div className="lg:col-span-8 flex flex-col h-full">
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40 shadow-2xl backdrop-blur-sm flex flex-col flex-grow">
            
            {/* Editor Toolbar */}
            <div className="bg-slate-900/60 p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                <Maximize className="h-4 w-4 text-violet-400" /> Sürükle Bırak Editörü
              </div>

              <label className="group flex items-center gap-2 cursor-pointer rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> : <UploadCloud className="h-4 w-4 group-hover:text-amber-400 transition-colors" />}
                {uploading ? "Yükleniyor..." : "Görsel Yükle (Değiştir)"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadTemplate(e.target.files[0])} />
              </label>
            </div>

            {/* Canvas Area */}
            <div className="relative flex items-center justify-center bg-[url('https://transparenttextures.com/patterns/cubes.png')] bg-slate-950/80 p-6 flex-grow overflow-auto">
              {!imgUrl ? (
                <div className="flex flex-col items-center justify-center py-32 text-slate-600">
                  <div className="h-20 w-20 rounded-full bg-slate-900 flex items-center justify-center mb-4 border border-slate-800 border-dashed">
                    <UploadCloud className="h-8 w-8 opacity-50" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">Tasarım yapabilmek için önce bir sertifika şablonu (Boş PDF/PNG) yükleyin.</p>
                </div>
              ) : (
                <div className="relative inline-block border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                  <img
                    ref={imgRef}
                    src={imgUrl}
                    alt="template"
                    className="max-w-none w-[800px] h-auto select-none rounded-sm pointer-events-none"
                    onLoad={() => setImgTick((t) => t + 1)}
                  />

                  {/* 1. Name Draggable */}
                  <Draggable bounds="parent" position={{ x: nameBox.x, y: nameBox.y }} onDrag={(_, d) => setNameBox(b => ({ ...b, x: d.x, y: d.y }))}>
                    <div className="absolute top-0 left-0 cursor-move group">
                      {/* Canlı Önizleme Metni */}
                      <div className="whitespace-nowrap transition-colors" style={{ fontSize: `${fontSize * scaleRatio}px`, color: fontColor, lineHeight: 1 }}>
                        Ahmet Yılmaz (Önizleme)
                      </div>
                      {/* Çerçeve (Hover/Active durumunda görünür) */}
                      <div className="absolute inset-0 border-2 border-dashed border-violet-500/0 group-hover:border-violet-500/50 group-active:border-violet-500 group-active:bg-violet-500/10 transition-all rounded" />
                      {/* Etiket */}
                      <div className="absolute -top-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity bg-violet-500 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap">İSİM ALANI</div>
                    </div>
                  </Draggable>

                  {/* 2. QR Draggable */}
                  <Draggable bounds="parent" position={{ x: qrBox.x, y: qrBox.y }} onDrag={(_, d) => setQrBox(b => ({ ...b, x: d.x, y: d.y }))}>
                    <div className="absolute top-0 left-0 cursor-move border-2 border-dashed border-amber-500/50 hover:border-amber-500 hover:bg-amber-500/10 active:bg-amber-500/20 p-2 flex flex-col items-center justify-center transition-all group rounded-lg" style={{ width: 100 * scaleRatio, height: 100 * scaleRatio }}>
                      <QrCode className="w-full h-full text-amber-500/30 group-hover:text-amber-500/80 transition-colors" />
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-500 text-slate-900 text-[9px] font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap">QR KOD (Otomatik Oluşur)</div>
                    </div>
                  </Draggable>

                  {/* 3. CERT ID Draggable */}
                  <Draggable bounds="parent" position={{ x: certIdBox.x, y: certIdBox.y }} onDrag={(_, d) => setCertIdBox(b => ({ ...b, x: d.x, y: d.y }))}>
                    <div className="absolute top-0 left-0 cursor-move group">
                      {/* Canlı Önizleme Metni */}
                      <div className="whitespace-nowrap font-mono transition-colors" style={{ fontSize: `${certIdFontSize * scaleRatio}px`, color: certIdColor, lineHeight: 1 }}>
                        ID: c8f3a2-9b1d-4e...
                      </div>
                      {/* Çerçeve */}
                      <div className="absolute inset-0 border-2 border-dashed border-sky-500/0 group-hover:border-sky-500/50 group-active:border-sky-500 group-active:bg-sky-500/10 transition-all rounded" />
                      {/* Etiket */}
                      <div className="absolute -top-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity bg-sky-500 text-slate-900 text-[9px] font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap">SERTİFİKA NUMARASI</div>
                    </div>
                  </Draggable>

                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- RIGHT: CONTROLS & BULK --- */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Typography Panel */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-violet-500 opacity-50" />
            
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-6">
              <Palette className="h-4 w-4 text-violet-400" /> Stil ve Tipografi
            </h3>

            <div className="space-y-8">
              {/* İsim Ayarları */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-400"><Type className="h-3 w-3" /> İsim Alanı</div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-2 font-mono"><span>Boyut</span><span className="text-white">{fontSize}px</span></div>
                  <input type="range" min="12" max="150" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full accent-violet-500 cursor-pointer" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-2">Renk Kodu</label>
                  <div className="flex gap-2">
                    <input type="color" value={fontColor} onChange={(e) => setFontColor(e.target.value)} className="h-10 w-10 bg-transparent border-none cursor-pointer rounded-lg" />
                    <input type="text" value={fontColor} onChange={(e) => setFontColor(e.target.value)} className="flex-1 rounded-xl border border-slate-700 bg-slate-950/50 px-4 text-sm font-mono text-slate-200 uppercase outline-none focus:border-violet-500/50" />
                  </div>
                </div>
              </div>

              <hr className="border-slate-800/60" />

              {/* ID Ayarları */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-400"><Hash className="h-3 w-3" /> Sertifika ID Alanı</div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-2 font-mono"><span>Boyut</span><span className="text-white">{certIdFontSize}px</span></div>
                  <input type="range" min="8" max="72" value={certIdFontSize} onChange={(e) => setCertIdFontSize(Number(e.target.value))} className="w-full accent-sky-500 cursor-pointer" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-2">Renk Kodu</label>
                  <div className="flex gap-2">
                    <input type="color" value={certIdColor} onChange={(e) => setCertIdColor(e.target.value)} className="h-10 w-10 bg-transparent border-none cursor-pointer rounded-lg" />
                    <input type="text" value={certIdColor} onChange={(e) => setCertIdColor(e.target.value)} className="flex-1 rounded-xl border border-slate-700 bg-slate-950/50 px-4 text-sm font-mono text-slate-200 uppercase outline-none focus:border-sky-500/50" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Generation Panel */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-50" />
            
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" /> Excel ile Toplu Basım
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">Tasarladığınız bu şablonu kullanarak Excel listenizdeki herkes için tek tıkla sertifika üretin.</p>
            
            <label className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-4 py-4 text-sm font-bold text-white cursor-pointer hover:bg-emerald-500 transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              {bulkLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
              {bulkLoading ? "Sertifikalar Üretiliyor..." : "Excel Dosyası (.xlsx) Seç"}
              <input type="file" accept=".xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && bulkGenerate(e.target.files[0])} />
            </label>

            <AnimatePresence>
              {err && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                    <AlertCircle className="h-4 w-4 shrink-0" /> {err}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* --- BULK RESULTS FULL WIDTH --- */}
      <AnimatePresence>
        {bulkResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-8 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-emerald-300">İşlem Tamamlandı</h2>
                  <p className="text-sm text-emerald-500/60 font-medium">Excel dosyasındaki {bulkResult.created || 0} kayıt başarıyla basıldı.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {bulkResult.certificates?.map((c: any) => (
                <div key={c.uuid} className="group relative rounded-2xl border border-slate-800 bg-slate-950/60 p-5 hover:border-emerald-500/30 transition-all">
                  <div className="font-bold text-slate-200 mb-1 truncate group-hover:text-emerald-300 transition-colors">{c.student_name}</div>
                  <div className="text-[10px] font-mono text-slate-500 mb-4 uppercase flex items-center gap-1.5"><Hash className="h-3 w-3"/> ID: {c.public_id || "-"}</div>
                  
                  <div className="flex gap-2">
                    <a href={`/verify/${c.uuid}`} target="_blank" className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2.5 text-[11px] font-bold text-slate-400 hover:text-white border border-slate-800 transition-colors">
                      <ExternalLink className="h-3 w-3" /> Doğrula
                    </a>
                    <a href={c.pdf_url} target="_blank" className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 py-2.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500 hover:text-slate-900 transition-all border border-emerald-500/20">
                      <Download className="h-3 w-3" /> PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}