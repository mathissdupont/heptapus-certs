"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  QrCode,
  ShieldCheck,
  ImageUp,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  Award,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";

type Tab = "uuid" | "image";

interface WatermarkResult {
  valid: boolean;
  message: string;
  public_id?: string;
  cert_uuid?: string;
  student_name?: string;
  event_name?: string;
  issued_at?: string;
  status?: string;
}

type BrandingData = {
  org_name?: string;
  brand_logo?: string | null;
  brand_color?: string | null;
  settings?: {
    verification_path?: string;
    hide_heptacert_home?: boolean;
  } | null;
};

export default function VerifyIndexPage() {
  const [uuid, setUuid] = useState("");
  const [tab, setTab] = useState<Tab>("uuid");
  const router = useRouter();

  const [branding, setBranding] = useState<BrandingData | null>(null);

  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WatermarkResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch("/public/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setBranding(data);

        if (data.brand_color) {
          document.documentElement.style.setProperty("--site-brand-color", data.brand_color);
        }
      })
      .catch(() => {});
  }, []);

  const verifyBasePath = useMemo(() => {
    const raw = branding?.settings?.verification_path?.trim();
    if (!raw) return "/verify";
    return raw.startsWith("/") ? raw : `/${raw}`;
  }, [branding]);

  const brandName = branding?.org_name || "HeptaCert";
  const showHeptaCertName = !branding?.settings?.hide_heptacert_home;
  const validCertTitle = showHeptaCertName
    ? `Geçerli ${brandName} Sertifikası`
    : "Geçerli Sertifika";

  function buildVerifyHref(certUuid: string) {
    return `${verifyBasePath}/${certUuid}`;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = uuid.trim();
    if (!trimmed) return;
    router.push(buildVerifyHref(trimmed));
  }

  async function analyseFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setResult({
        valid: false,
        message: "Lütfen geçerli bir görsel dosyası yükleyin (PNG, JPEG…)",
      });
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
      const data: WatermarkResult = await res.json();
      setResult(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setResult({ valid: false, message: err.message });
      } else {
        setResult({ valid: false, message: "Beklenmeyen bir hata oluştu." });
      }
    } finally {
      setLoading(false);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) analyseFile(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) analyseFile(file);
    e.target.value = "";
  };

  function resetImage() {
    setResult(null);
    setPreviewUrl(null);
  }

  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center py-12 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-brand overflow-hidden">
          {branding?.brand_logo ? (
            <img
              src={branding.brand_logo}
              alt={brandName}
              className="h-12 w-12 object-contain"
            />
          ) : (
            <ShieldCheck className="h-8 w-8" />
          )}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {showHeptaCertName ? "Sertifika Doğrulama" : `${brandName} Sertifika Doğrulama`}
        </h1>

        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          UUID ile arayın ya da sertifika görselini yükleyerek görünmez dijital damgasını okutun.
        </p>

        {!showHeptaCertName && branding?.org_name && (
          <p className="text-sm font-semibold mb-6" style={{ color: "var(--site-brand-color)" }}>
            {branding.org_name}
          </p>
        )}

        <div className="flex rounded-xl bg-gray-100 p-1 mb-6 gap-1">
          <button
            onClick={() => setTab("uuid")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
              tab === "uuid"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Search className="h-4 w-4" />
            UUID / QR ile Doğrula
          </button>
          <button
            onClick={() => {
              setTab("image");
              resetImage();
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
              tab === "image"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <ImageUp className="h-4 w-4" />
            Görsel ile Doğrula
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === "uuid" ? (
            <motion.div
              key="uuid"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
            >
              <form onSubmit={onSubmit} className="card p-6">
                <label className="label text-left block mb-2">Sertifika Kimliği (UUID)</label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      className="input-field pl-10"
                      type="text"
                      value={uuid}
                      onChange={(e) => setUuid(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      spellCheck={false}
                    />
                  </div>
                  <button type="submit" className="btn-primary shrink-0">
                    Sorgula
                  </button>
                </div>
                <p className="mt-3 text-left text-xs text-gray-400">
                  UUID'yi sertifika üzerindeki QR kodun altında veya belge metninde bulabilirsiniz.
                </p>
              </form>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="rounded-xl border border-gray-100 bg-white p-5">
                  <QrCode className="h-5 w-5 text-brand-600 mb-3" />
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">QR Kod</h3>
                  <p className="text-xs text-gray-500">
                    Telefonunuzla QR kodu okutun; doğrulama sayfasına otomatik yönlendirilirsiniz.
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-5">
                  <Search className="h-5 w-5 text-emerald-600 mb-3" />
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Manuel Sorgulama</h3>
                  <p className="text-xs text-gray-500">
                    UUID'yi yukarıdaki alana yapıştırarak da doğrulama yapabilirsiniz.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="image"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {!result && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={`card p-8 cursor-pointer transition-all border-2 border-dashed ${
                    dragging
                      ? "border-brand-500 bg-brand-50"
                      : "border-gray-200 hover:border-brand-400 hover:bg-gray-50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFileChange}
                  />

                  {loading ? (
                    <div className="flex flex-col items-center gap-3 text-brand-600">
                      <Loader2 className="h-10 w-10 animate-spin" />
                      <p className="text-sm font-medium">Dijital damga okunuyor…</p>
                    </div>
                  ) : previewUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      <img
                        src={previewUrl}
                        alt="Yüklenen sertifika"
                        className="max-h-40 rounded-lg object-contain shadow"
                      />
                      <p className="text-xs text-gray-400">Analiz ediliyor…</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <Upload className="h-10 w-10" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Sertifika görselini sürükleyin ya da tıklayın
                        </p>
                        <p className="text-xs mt-1">PNG, JPEG · Maks 30 MB</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className={`card p-6 text-left border-2 ${
                      result.valid
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {result.valid ? (
                        <CheckCircle2 className="h-7 w-7 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-7 w-7 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-semibold text-sm ${
                            result.valid ? "text-emerald-800" : "text-red-700"
                          }`}
                        >
                          {result.valid ? validCertTitle : "Doğrulama Başarısız"}
                        </p>
                        <p className="text-xs mt-0.5 text-gray-600">{result.message}</p>

                        {result.valid && (
                          <dl className="mt-4 grid grid-cols-1 gap-y-2 text-sm">
                            {result.student_name && (
                              <div>
                                <dt className="text-xs text-gray-500 uppercase tracking-wide">Sahip</dt>
                                <dd className="font-semibold text-gray-900">{result.student_name}</dd>
                              </div>
                            )}
                            {result.event_name && (
                              <div>
                                <dt className="text-xs text-gray-500 uppercase tracking-wide">Etkinlik</dt>
                                <dd className="text-gray-800">{result.event_name}</dd>
                              </div>
                            )}
                            {result.public_id && (
                              <div>
                                <dt className="text-xs text-gray-500 uppercase tracking-wide">Sertifika Kodu</dt>
                                <dd className="font-mono text-xs text-gray-700">{result.public_id}</dd>
                              </div>
                            )}
                            {result.issued_at && (
                              <div>
                                <dt className="text-xs text-gray-500 uppercase tracking-wide">Verilme Tarihi</dt>
                                <dd className="text-gray-800">
                                  {new Date(result.issued_at).toLocaleDateString("tr-TR", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </dd>
                              </div>
                            )}
                          </dl>
                        )}

                        {result.valid && result.cert_uuid && (
                          <a
                            href={buildVerifyHref(result.cert_uuid)}
                            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Tam doğrulama sayfasını aç
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {result && (
                <button onClick={resetImage} className="w-full btn-secondary text-sm">
                  Başka bir görsel yükle
                </button>
              )}

              {!result && !loading && (
                <p className="text-xs text-gray-400 px-2">
                  Sadece orijinal <strong>PNG</strong> dosyası desteklenmektedir.
                  JPEG, ekran görüntüsü veya yeniden kaydedilmiş dosyalarda
                  dijital damga tespit edilemez.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!showHeptaCertName && branding?.org_name && (
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Award className="h-3.5 w-3.5" />
            {branding.org_name}
          </div>
        )}
      </motion.div>
    </div>
  );
}