"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, ImageUp, Loader2, QrCode, Search, ShieldCheck, Upload, XCircle } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Tab = "uuid" | "image";
type Branding = { org_name?: string; brand_logo?: string | null; brand_color?: string | null; settings?: { verification_path?: string; hide_heptacert_home?: boolean } | null };
type WatermarkResult = { valid: boolean; message: string; public_id?: string; cert_uuid?: string; student_name?: string; event_name?: string; issued_at?: string; status?: string };

export default function VerifyIndexPage() {
  const { lang } = useI18n();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uuid, setUuid] = useState("");
  const [tab, setTab] = useState<Tab>("uuid");
  const [branding, setBranding] = useState<Branding | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WatermarkResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const copy = useMemo(() => lang === "tr" ? {
    title: "Sertifika doğrulama",
    body: "UUID ile arayın ya da sertifika görselini yükleyerek dijital damgayı kontrol edin.",
    badge: "Güvenli doğrulama akışı",
    uuidTab: "UUID veya QR ile",
    imageTab: "Görsel yükle",
    uuidLabel: "Sertifika kimliği (UUID)",
    uuidPlaceholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    uuidHint: "UUID bilgisini sertifika üzerindeki QR alanından veya belge metninden bulabilirsiniz.",
    submit: "Doğrula",
    uploadTitle: "Sertifika görselini sürükleyin veya seçin",
    uploadBody: "PNG ve JPEG desteklenir. Orijinal belge ile doğrulama daha sağlıklı çalışır.",
    uploadCta: "Görsel seç",
    loading: "Dijital damga analiz ediliyor...",
    validTitle: "Geçerli sertifika",
    invalidTitle: "Doğrulama başarısız",
    owner: "Sahip",
    event: "Etkinlik",
    code: "Sertifika kodu",
    issuedAt: "Verilme tarihi",
    openFull: "Tam doğrulama sayfasını aç",
    uploadAnother: "Başka bir görsel yükle",
    trustTitle: "Neler doğrulanır?",
    trustPoints: ["UUID ve QR ile anlık kontrol", "Görsel yükleyerek damga okuma", "Geçerli / iptal / süresi dolmuş durum bilgisi"],
  } : {
    title: "Certificate verification",
    body: "Search by UUID or upload a certificate image to validate its digital watermark.",
    badge: "Secure verification flow",
    uuidTab: "UUID or QR",
    imageTab: "Upload image",
    uuidLabel: "Certificate identifier (UUID)",
    uuidPlaceholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    uuidHint: "You can find the UUID near the QR section or in the certificate text.",
    submit: "Verify",
    uploadTitle: "Drop or choose a certificate image",
    uploadBody: "PNG and JPEG are supported. Original files provide the most reliable validation.",
    uploadCta: "Choose image",
    loading: "Analyzing digital watermark...",
    validTitle: "Valid certificate",
    invalidTitle: "Verification failed",
    owner: "Owner",
    event: "Event",
    code: "Certificate code",
    issuedAt: "Issued at",
    openFull: "Open full verification page",
    uploadAnother: "Upload another image",
    trustTitle: "What gets validated?",
    trustPoints: ["Instant checks with UUID and QR", "Watermark detection from images", "Clear active / revoked / expired status feedback"],
  }, [lang]);

  useEffect(() => {
    fetch("/api/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setBranding(data);
        if (data.brand_color) document.documentElement.style.setProperty("--site-brand-color", data.brand_color);
      })
      .catch(() => {});
  }, []);

  const verifyBasePath = useMemo(() => {
    const raw = branding?.settings?.verification_path?.trim();
    if (!raw) return "/verify";
    return raw.startsWith("/") ? raw : `/${raw}`;
  }, [branding]);

  const brandName = branding?.org_name || "HeptaCert";
  const locale = lang === "tr" ? "tr-TR" : "en-US";

  function buildVerifyHref(certUuid: string) {
    return `${verifyBasePath}/${certUuid}`;
  }

  function resetImage() {
    setPreviewUrl(null);
    setResult(null);
    setLoading(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = uuid.trim();
    if (!trimmed) return;
    router.push(buildVerifyHref(trimmed));
  }

  async function analyseFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setResult({ valid: false, message: lang === "tr" ? "Lütfen geçerli bir görsel dosyası yükleyin." : "Please upload a valid image file." });
      return;
    }
    setResult(null);
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/verify-watermark", { method: "POST", body: fd });
      setResult(await res.json());
    } catch (err) {
      if (err instanceof ApiError) setResult({ valid: false, message: err.message });
      else setResult({ valid: false, message: lang === "tr" ? "Beklenmeyen bir hata oluştu." : "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void analyseFile(file);
  }, [lang]);

  const cardTone = result?.valid ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6">
      <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="card overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-surface-200 bg-surface-50 px-4 py-2 text-xs font-semibold text-surface-700">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-600" /> {copy.badge}
              </div>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-brand overflow-hidden">
                  {branding?.brand_logo ? <img src={branding.brand_logo} alt={brandName} className="h-10 w-10 object-contain" /> : <ShieldCheck className="h-7 w-7" />}
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{copy.title}</h1>
                  <p className="mt-1 text-sm text-slate-500">{brandName}</p>
                </div>
              </div>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-500">{copy.body}</p>
            </div>

            <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
              <button onClick={() => { setTab("uuid"); setResult(null); }} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${tab === "uuid" ? "bg-white text-slate-950 shadow-soft" : "text-slate-500 hover:text-slate-800"}`}><Search className="mr-2 inline h-4 w-4" />{copy.uuidTab}</button>
              <button onClick={() => { setTab("image"); resetImage(); }} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${tab === "image" ? "bg-white text-slate-950 shadow-soft" : "text-slate-500 hover:text-slate-800"}`}><ImageUp className="mr-2 inline h-4 w-4" />{copy.imageTab}</button>
            </div>

            <AnimatePresence mode="wait">
              {tab === "uuid" ? (
                <motion.form key="uuid" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} onSubmit={onSubmit} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                  <label className="label">{copy.uuidLabel}</label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input-field pl-10" value={uuid} onChange={(e) => setUuid(e.target.value)} placeholder={copy.uuidPlaceholder} spellCheck={false} /></div>
                    <button type="submit" className="btn-primary justify-center px-6">{copy.submit}</button>
                  </div>
                  <p className="mt-3 text-xs leading-6 text-slate-400">{copy.uuidHint}</p>
                </motion.form>
              ) : (
                <motion.div key="image" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
                  {!result && (
                    <div onClick={() => fileInputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} className={`rounded-3xl border-2 border-dashed p-8 transition ${dragging ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-slate-50 hover:border-brand-400 hover:bg-white"}`}>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void analyseFile(file); e.target.value = ""; }} />
                      {loading ? (
                        <div className="flex flex-col items-center gap-3 text-brand-600"><Loader2 className="h-10 w-10 animate-spin" /><p className="text-sm font-medium">{copy.loading}</p></div>
                      ) : previewUrl ? (
                        <div className="flex flex-col items-center gap-3"><img src={previewUrl} alt="Preview" className="max-h-44 rounded-2xl object-contain shadow-soft" /><p className="text-xs text-slate-400">{copy.loading}</p></div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-center"><Upload className="h-10 w-10 text-slate-400" /><div><p className="text-sm font-semibold text-slate-900">{copy.uploadTitle}</p><p className="mt-2 text-xs leading-6 text-slate-500">{copy.uploadBody}</p></div><span className="btn-secondary text-xs">{copy.uploadCta}</span></div>
                      )}
                    </div>
                  )}

                  {result && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-3xl border p-5 sm:p-6 ${cardTone}`}>
                      <div className="flex items-start gap-4">
                        {result.valid ? <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-7 w-7 shrink-0 text-rose-500" />}
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold ${result.valid ? "text-emerald-800" : "text-rose-700"}`}>{result.valid ? copy.validTitle : copy.invalidTitle}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{result.message}</p>
                          {result.valid && (
                            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                              {result.student_name && <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{copy.owner}</dt><dd className="mt-1 font-semibold text-slate-900">{result.student_name}</dd></div>}
                              {result.event_name && <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{copy.event}</dt><dd className="mt-1 font-semibold text-slate-900">{result.event_name}</dd></div>}
                              {result.public_id && <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{copy.code}</dt><dd className="mt-1 font-mono text-xs text-slate-700">{result.public_id}</dd></div>}
                              {result.issued_at && <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{copy.issuedAt}</dt><dd className="mt-1 font-semibold text-slate-900">{new Date(result.issued_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}</dd></div>}
                            </dl>
                          )}
                          {result.valid && result.cert_uuid && <a href={buildVerifyHref(result.cert_uuid)} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline"><QrCode className="h-4 w-4" />{copy.openFull}</a>}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {result && <button onClick={resetImage} className="btn-secondary w-full text-sm">{copy.uploadAnother}</button>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        <motion.aside initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }} className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{copy.trustTitle}</p>
            <div className="mt-4 space-y-3">{copy.trustPoints.map((point) => <div key={point} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><p className="text-sm font-medium leading-6 text-slate-700">{point}</p></div>)}</div>
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{lang === "tr" ? "Hızlı ipucu" : "Quick tip"}</p>
            <p className="mt-3 text-sm leading-7 text-slate-500">{lang === "tr" ? "En doğru sonuç için orijinal sertifika dosyasını veya UUID bilgisini kullanın. Ekran görüntüleri ve yeniden kaydedilmiş dosyalar damga tespitini zorlaştırabilir." : "For the most accurate result, use the original certificate file or the UUID value. Screenshots and re-saved files may reduce watermark detection quality."}</p>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
