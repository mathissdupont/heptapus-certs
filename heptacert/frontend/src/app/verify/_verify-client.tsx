"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, ImageUp, Loader2, QrCode, Search, ShieldCheck, Upload, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
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
    navHome: "Ana Sayfa",
    navLogin: "Sistem Girişi",
    title: "Sertifika Doğrulama",
    body: "Belgenin orijinalliğini kanıtlamak için UUID numarasını girin veya sertifika görselini yükleyerek dijital damgayı analiz edin.",
    badge: "Güvenli Doğrulama Akışı",
    uuidTab: "UUID / QR Kodu",
    imageTab: "Görsel Yükle",
    uuidLabel: "Sertifika Kimliği (UUID)",
    uuidPlaceholder: "Örn: 123e4567-e89b-12d3-a456-426614174000",
    uuidHint: "UUID kodunu sertifikanın sol alt köşesinde veya QR kodun hemen altında bulabilirsiniz.",
    submit: "Sorgula",
    uploadTitle: "Sertifika görselini buraya sürükleyin",
    uploadBody: "PNG veya JPEG formatında, belgenin orijinal halini yükleyin.",
    uploadCta: "Bilgisayardan Seç",
    loading: "Dijital damga ve kriptografik imza analiz ediliyor...",
    validTitle: "Geçerli ve Orijinal Sertifika",
    invalidTitle: "Doğrulama Başarısız",
    owner: "Katılımcı",
    event: "Etkinlik",
    code: "Sertifika Kodu",
    issuedAt: "Düzenlenme Tarihi",
    openFull: "Tam Doğrulama Sayfasını Aç",
    uploadAnother: "Yeni Bir Görsel Yükle",
    trustTitle: "Güvenlik Kontrolleri",
    trustPoints: [
      "Kriptografik UUID eşleşmesi",
      "Görsel içi görünmez dijital damga okuma",
      "İptal (Revoked) ve süre (Expired) kontrolü"
    ],
    quickTipTitle: "Doğrulama İpucu",
    quickTipBody: "Ekran görüntüleri veya WhatsApp üzerinden sıkıştırılarak iletilmiş dosyalar dijital damganın okunmasını zorlaştırabilir. Mümkünse orijinal PDF'ten dışa aktarılmış görseli kullanın."
  } : {
    navHome: "Home",
    navLogin: "System Login",
    title: "Certificate Verification",
    body: "Enter the UUID or upload a certificate image to analyze its digital watermark and prove its authenticity.",
    badge: "Secure Verification Flow",
    uuidTab: "UUID / QR Code",
    imageTab: "Upload Image",
    uuidLabel: "Certificate Identifier (UUID)",
    uuidPlaceholder: "e.g. 123e4567-e89b-12d3-a456-426614174000",
    uuidHint: "You can find the UUID code in the bottom corner of the certificate or just below the QR code.",
    submit: "Verify",
    uploadTitle: "Drag and drop the certificate image here",
    uploadBody: "Upload the original document in PNG or JPEG format.",
    uploadCta: "Browse Files",
    loading: "Analyzing digital watermark and cryptographic signature...",
    validTitle: "Valid & Authentic Certificate",
    invalidTitle: "Verification Failed",
    owner: "Attendee",
    event: "Event",
    code: "Certificate Code",
    issuedAt: "Date Issued",
    openFull: "Open Full Verification Page",
    uploadAnother: "Upload Another Image",
    trustTitle: "Security Checks",
    trustPoints: [
      "Cryptographic UUID matching",
      "Invisible digital watermark detection",
      "Revocation and expiration status check"
    ],
    quickTipTitle: "Verification Tip",
    quickTipBody: "Screenshots or compressed files sent via messaging apps might degrade the digital watermark. Use the original exported image if possible."
  }, [lang]);

  useEffect(() => {
    fetch("/api/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setBranding(data);
        if (data.brand_color) document.documentElement.style.setProperty("--site-brand-color", data.brand_color);
      })
      .catch(() => { });
  }, []);

  const verifyBasePath = useMemo(() => {
    const raw = branding?.settings?.verification_path?.trim();
    if (!raw) return "/verify";
    return raw.startsWith("/") ? raw : `/${raw}`;
  }, [branding]);

  const brandName = branding?.org_name || "HeptaCert";
  const isWhiteLabel = branding?.settings?.hide_heptacert_home;
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
      setResult({ valid: false, message: lang === "tr" ? "Lütfen geçerli bir görsel (PNG/JPG) yükleyin." : "Please upload a valid image file (PNG/JPG)." });
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
      else setResult({ valid: false, message: lang === "tr" ? "Sunucuyla iletişim kurulurken bir hata oluştu." : "An error occurred while communicating with the server." });
    } finally {
      setLoading(false);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void analyseFile(file);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 selection:bg-slate-200">

      {/* NAVBAR */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            {branding?.brand_logo ? (
              <img src={branding.brand_logo} alt={brandName} className="h-8 w-auto object-contain" />
            ) : (
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-slate-900" />
                <span className="text-lg font-bold tracking-tight text-slate-900">{brandName}</span>
              </div>
            )}
          </Link>

          <nav className="flex items-center gap-4">
            {!isWhiteLabel && (
              <Link href="/" className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:block">
                {copy.navHome}
              </Link>
            )}
            <Link href="/admin/login" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900">
              {copy.navLogin} <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 py-12 sm:px-6 lg:flex-row lg:items-start lg:gap-12 lg:py-16">

        {/* LEFT / CENTER: Verification Area */}
        <div className="w-full lg:max-w-2xl lg:flex-1">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>

            {/* Header Text */}
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> {copy.badge}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{copy.title}</h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600">{copy.body}</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm sm:p-3">
              {/* Custom Segmented Control (Tabs) */}
              <div className="flex rounded-2xl bg-slate-100 p-1">
                <button
                  onClick={() => { setTab("uuid"); setResult(null); }}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 ${tab === "uuid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <Search className="mr-2 inline h-4 w-4" />{copy.uuidTab}
                </button>
                <button
                  onClick={() => { setTab("image"); resetImage(); }}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 ${tab === "image" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <ImageUp className="mr-2 inline h-4 w-4" />{copy.imageTab}
                </button>
              </div>

              <div className="mt-2 p-3 sm:p-5">
                <AnimatePresence mode="wait">
                  {tab === "uuid" ? (
                    <motion.form key="uuid" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }} onSubmit={onSubmit} className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">{copy.uuidLabel}</label>
                        <div className="relative flex items-center">
                          <Search className="absolute left-4 h-5 w-5 text-slate-400" />
                          <input
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-900 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900 placeholder:text-slate-400 font-mono text-sm"
                            value={uuid}
                            onChange={(e) => setUuid(e.target.value)}
                            placeholder={copy.uuidPlaceholder}
                            spellCheck={false}
                          />
                        </div>
                        <p className="mt-3 text-xs font-medium text-slate-500">{copy.uuidHint}</p>
                      </div>
                      <button type="submit" disabled={!uuid.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed">
                        {copy.submit} <ArrowRight className="h-4 w-4" />
                      </button>
                    </motion.form>
                  ) : (
                    <motion.div key="image" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-4">

                      {/* UPLOAD DROPZONE */}
                      {!result && (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                          onDragLeave={() => setDragging(false)}
                          onDrop={onDrop}
                          className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${dragging ? "border-slate-900 bg-slate-50 scale-[1.02]" : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50"}`}
                        >
                          <input ref={fileInputRef} type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void analyseFile(file); e.target.value = ""; }} />

                          {loading ? (
                            <div className="flex flex-col items-center gap-4 text-slate-900">
                              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                              <p className="text-sm font-bold">{copy.loading}</p>
                            </div>
                          ) : previewUrl ? (
                            <div className="flex flex-col items-center gap-4">
                              <img src={previewUrl} alt="Preview" className="max-h-48 rounded-xl object-contain shadow-sm ring-1 ring-slate-200" />
                              <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" /> Analiz ediliyor...
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100">
                                <Upload className="h-6 w-6 text-slate-500" />
                              </div>
                              <h3 className="text-sm font-bold text-slate-900">{copy.uploadTitle}</h3>
                              <p className="mt-2 max-w-xs text-xs font-medium text-slate-500">{copy.uploadBody}</p>
                              <div className="mt-6 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
                                {copy.uploadCta}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* RESULT CARD */}
                      {result && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`overflow-hidden rounded-2xl border ${result.valid ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50"}`}>
                          <div className={`flex items-center gap-3 border-b px-5 py-4 ${result.valid ? "border-emerald-100 bg-emerald-100/50 text-emerald-800" : "border-rose-100 bg-rose-100/50 text-rose-800"}`}>
                            {result.valid ? <CheckCircle2 className="h-6 w-6 shrink-0" /> : <XCircle className="h-6 w-6 shrink-0" />}
                            <div>
                              <h3 className="font-bold">{result.valid ? copy.validTitle : copy.invalidTitle}</h3>
                              <p className="text-xs font-medium opacity-80">{result.message}</p>
                            </div>
                          </div>

                          {result.valid && (
                            <div className="p-5">
                              <dl className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                                {result.student_name && (
                                  <div>
                                    <dt className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70">{copy.owner}</dt>
                                    <dd className="mt-1 text-sm font-bold text-slate-900">{result.student_name}</dd>
                                  </div>
                                )}
                                {result.event_name && (
                                  <div>
                                    <dt className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70">{copy.event}</dt>
                                    <dd className="mt-1 text-sm font-bold text-slate-900">{result.event_name}</dd>
                                  </div>
                                )}
                                {result.public_id && (
                                  <div className="col-span-full">
                                    <dt className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70">{copy.code}</dt>
                                    <dd className="mt-1 rounded-md bg-white px-2 py-1.5 font-mono text-xs font-medium text-slate-700 ring-1 ring-slate-200/50 w-fit">{result.public_id}</dd>
                                  </div>
                                )}
                              </dl>

                              {result.cert_uuid && (
                                <a href={buildVerifyHref(result.cert_uuid)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700">
                                  <QrCode className="h-4 w-4" /> {copy.openFull}
                                </a>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}

                      {result && (
                        <button onClick={resetImage} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
                          <ArrowLeft className="h-4 w-4" /> {copy.uploadAnother}
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>

        {/* RIGHT: Info Sidebar */}
        <motion.aside initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }} className="mt-8 w-full shrink-0 space-y-6 lg:mt-0 lg:w-[340px]">

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{copy.trustTitle}</h3>
            <ul className="mt-5 space-y-4">
              {copy.trustPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100">
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-700" />
                  </div>
                  <span className="text-sm font-medium leading-relaxed text-slate-700">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600/80">{copy.quickTipTitle}</h3>
            <p className="mt-3 text-sm leading-relaxed font-medium text-amber-900/80">
              {copy.quickTipBody}
            </p>
          </div>

        </motion.aside>

      </main>
    </div>
  );
}