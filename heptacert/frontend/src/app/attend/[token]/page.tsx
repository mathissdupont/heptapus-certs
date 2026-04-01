"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getCheckinSessionInfo, selfCheckin } from "@/lib/api";
import {
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MapPin,
  QrCode,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";

interface SessionInfo {
  session_id: number;
  session_name: string;
  session_date: string | null;
  session_start: string | null;
  session_location: string | null;
  is_active: boolean;
  event_id: number;
  event_name: string;
  event_date: string | null;
  min_sessions_required: number;
  attendance_count: number;
}

interface CheckinResult {
  success: boolean;
  message: string;
  attendee_name: string;
  sessions_attended: number;
  sessions_required: number;
  total_sessions: number;
}

type BrandingData = {
  org_name?: string;
  brand_logo?: string | null;
  brand_color?: string | null;
  settings?: {
    hide_heptacert_home?: boolean;
  } | null;
};

function formatSessionDate(value?: string | null) {
  if (!value) return "Tarih paylaşılmadı";
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function AttendCheckinPage() {
  const params = useParams();
  const token = params?.token as string;

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);

  useEffect(() => {
    fetch("/api/branding")
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

  useEffect(() => {
    if (!token) return;
    getCheckinSessionInfo(token)
      .then(setSessionInfo)
      .catch((e) => setError(e.message || "QR kodu geçersiz"))
      .finally(() => setLoading(false));
  }, [token]);

  const brandName = branding?.org_name || "HeptaCert";
  const brandColor = branding?.brand_color || "#2563eb";
  const progress = result
    ? Math.min(100, Math.round((result.sessions_attended / Math.max(result.sessions_required, 1)) * 100))
    : 0;
  const completedRequirement = Boolean(
    result && result.sessions_attended >= result.sessions_required,
  );
  const surveyHref = sessionInfo ? `/events/${sessionInfo.event_id}/survey` : "#";
  const eventHref = sessionInfo ? `/events/${sessionInfo.event_id}/register` : "#";

  const pageBg = useMemo(
    () => ({
      background: `
        radial-gradient(circle at top left, ${brandColor}22 0%, transparent 26%),
        radial-gradient(circle at top right, ${brandColor}18 0%, transparent 22%),
        linear-gradient(180deg, #f8fbff 0%, #eef4ff 44%, #f8fafc 100%)
      `,
    }),
    [brandColor],
  );

  const accentSurface = useMemo(
    () => ({
      background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}DD 100%)`,
      boxShadow: `0 24px 60px ${brandColor}2A`,
    }),
    [brandColor],
  );

  async function handleCheckin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const res = await selfCheckin(token, email.trim());
      setResult(res);
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || "Check-in başarısız",
        attendee_name: "",
        sessions_attended: 0,
        sessions_required: sessionInfo?.min_sessions_required || 1,
        total_sessions: 0,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function resetResult() {
    setResult(null);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={pageBg}>
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="rounded-[32px] border border-white/80 bg-white/90 px-8 py-10 text-center shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur"
        >
          <Loader2 className="mx-auto h-10 w-10 animate-spin" style={{ color: brandColor }} />
          <p className="mt-4 text-sm font-medium text-slate-500">Check-in ekranı hazırlanıyor...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10" style={pageBg}>
        <div className="w-full max-w-lg overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.12)]">
          <div className="px-8 py-8 text-white" style={accentSurface}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
              <ShieldCheck className="h-3.5 w-3.5" />
              Güvenli doğrulama
            </div>
            <h1 className="mt-4 text-3xl font-black">QR kodu doğrulanamadı</h1>
            <p className="mt-2 max-w-md text-sm text-white/80">
              Bağlantı süresi dolmuş, hatalı kopyalanmış veya artık geçerli olmayan bir check-in sayfası açılmış olabilir.
            </p>
          </div>
          <div className="px-8 py-8 text-center">
            <XCircle className="mx-auto h-16 w-16 text-rose-500" />
            <p className="mt-5 text-base font-semibold text-slate-900">{error}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Etkinlik görevlisinden QR kodunu yeniden okutmasını isteyebilirsiniz.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionInfo?.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10" style={pageBg}>
        <div className="w-full max-w-xl overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.12)]">
          <div className="px-8 py-8 text-white" style={accentSurface}>
            <div className="flex items-center gap-3">
              {branding?.brand_logo ? (
                <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
                  <img src={branding.brand_logo} alt={brandName} className="h-10 w-auto object-contain" />
                </div>
              ) : (
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                  <Award className="h-6 w-6" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-white/90">{brandName}</p>
                <p className="text-xs text-white/70">Etkinlik check-in ekranı</p>
              </div>
            </div>

            <h1 className="mt-6 text-3xl font-black">{sessionInfo.session_name}</h1>
            <p className="mt-2 text-sm text-white/80">{sessionInfo.event_name}</p>
          </div>

          <div className="px-8 py-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
              <Clock className="h-4 w-4" />
              Check-in henüz açılmadı
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tarih</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatSessionDate(sessionInfo.session_date)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saat</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{sessionInfo.session_start || "Henüz açıklanmadı"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 md:px-6 md:py-12" style={pageBg}>
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.section
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="overflow-hidden rounded-[36px] border border-white/80 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.12)]"
        >
          <div className="px-7 py-8 text-white md:px-9" style={accentSurface}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/90">
              <QrCode className="h-3.5 w-3.5" />
              Canlı check-in oturumu
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {branding?.brand_logo ? (
                <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
                  <img src={branding.brand_logo} alt={brandName} className="h-10 w-auto object-contain" />
                </div>
              ) : (
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
                  <Award className="h-6 w-6" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-white/90">{brandName}</p>
                <p className="text-xs text-white/70">Etkinlik doğrulama deneyimi</p>
              </div>
            </div>

            <h1 className="mt-6 text-3xl font-black leading-tight md:text-4xl">
              {sessionInfo.session_name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/82 md:text-base">
              {sessionInfo.event_name} için katılımınızı birkaç saniyede onaylayın. E-posta adresiniz eşleştiğinde sistem oturum ilerlemenizi anında günceller.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/65">Tarih</p>
                <p className="mt-2 text-sm font-semibold text-white">{formatSessionDate(sessionInfo.session_date)}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/65">Saat</p>
                <p className="mt-2 text-sm font-semibold text-white">{sessionInfo.session_start || "Henüz açıklanmadı"}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/65">Konum</p>
                <p className="mt-2 text-sm font-semibold text-white">{sessionInfo.session_location || "Paylaşılmadı"}</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/65">Katılımcı</p>
                <p className="mt-2 text-sm font-semibold text-white">{sessionInfo.attendance_count} kişi</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-slate-100 px-7 py-7 md:px-9 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <Calendar className="h-4 w-4 text-slate-500" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Etkinlik</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{sessionInfo.event_name}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <Users className="h-4 w-4 text-slate-500" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Sertifika Eşiği</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">En az {sessionInfo.min_sessions_required} oturum</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <MapPin className="h-4 w-4 text-slate-500" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Durum</p>
              <p className="mt-1 text-sm font-semibold text-emerald-700">Check-in şu anda aktif</p>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-[36px] border border-white/80 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.12)] md:p-8"
        >
          {!result ? (
            <>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Katılım doğrulama adımı
              </div>

              <h2 className="mt-5 text-2xl font-black text-slate-900">Check-in işlemini tamamla</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Etkinliğe kayıt olurken kullandığınız e-posta adresini girin. Sistem sizi bulduğunda bu oturum için katılımınız anında işlenecek.
              </p>

              <form onSubmit={handleCheckin} className="mt-8 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">E-posta adresiniz</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@mail.com"
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2"
                      style={{ ["--tw-ring-color" as any]: `${brandColor}33` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Kayıt sırasında kullandığınız adres ile aynı olmalı.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sonraki adım</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Doğrulama başarılı olursa oturum ilerlemeniz güncellenir ve sertifika için kalan durumunuz hemen gösterilir.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !email.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                  style={accentSurface}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Check-in Yap
                </button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.28 }}
                className={`rounded-[28px] border px-5 py-5 ${
                  result.success
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-rose-200 bg-rose-50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                      result.success ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {result.success ? <CheckCircle2 className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${result.success ? "text-emerald-700" : "text-rose-700"}`}>
                      {result.success ? "İşlem tamamlandı" : "İşlem tamamlanamadı"}
                    </p>
                    <h2 className={`mt-1 text-xl font-black ${result.success ? "text-emerald-950" : "text-rose-950"}`}>
                      {result.message}
                    </h2>
                    {result.attendee_name ? (
                      <p className="mt-2 text-sm text-slate-600">
                        Katılımcı: <span className="font-semibold text-slate-900">{result.attendee_name}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.05 }}
                className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Oturum İlerlemesi</p>
                    <p className="mt-2 text-2xl font-black text-slate-900">
                      {result.sessions_attended}/{Math.max(result.total_sessions, result.sessions_required)}
                    </p>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      completedRequirement
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {completedRequirement ? "Sertifika eşiği tamam" : "Biraz daha kaldı"}
                  </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
                  <motion.div
                    className="h-full rounded-full transition-all duration-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    style={{
                      background: `linear-gradient(90deg, ${brandColor}, ${brandColor}CC)`,
                    }}
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Toplam katıldığınız</p>
                    <p className="mt-2 text-lg font-black text-slate-900">{result.sessions_attended} oturum</p>
                  </div>
                  <div className="rounded-2xl border border-white bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gerekli minimum</p>
                    <p className="mt-2 text-lg font-black text-slate-900">{result.sessions_required} oturum</p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {completedRequirement
                    ? "Sertifika için gereken minimum oturum sayısını tamamladınız. Etkinlik akışında bir sonraki adımda sertifika veya anket ekranına geçebilirsiniz."
                    : `Sertifika için ${Math.max(result.sessions_required - result.sessions_attended, 0)} oturum daha tamamlamanız gerekiyor.`}
                </p>
              </motion.div>

              {result.success && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: 0.1 }}
                  className="rounded-[28px] border border-slate-200 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sonraki Adım</p>
                      <h3 className="mt-2 text-lg font-black text-slate-900">
                        {completedRequirement ? "Anket ve sertifika akışına geçebilirsiniz" : "Etkinlik akışını takip etmeye devam edin"}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {completedRequirement
                          ? "Minimum oturum şartını tamamladığınız için anket ve sertifika adımları için hazır durumdasınız."
                          : "Henüz minimum oturum sayısı tamamlanmadı. Yine de etkinlik sayfasından programı ve sonraki adımları takip edebilirsiniz."}
                      </p>
                    </div>
                    <Sparkles className="mt-1 h-5 w-5 shrink-0 text-amber-500" />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Link
                      href={eventHref}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Etkinlik Sayfası
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href={surveyHref}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
                        completedRequirement ? "" : "opacity-90"
                      }`}
                      style={accentSurface}
                    >
                      Anket Sayfasını Aç
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </motion.div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={resetResult}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Başka bir e-posta dene
                </button>

                <Link
                  href={eventHref}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition"
                  style={accentSurface}
                >
                  Etkinlik Sayfasına Git
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          )}

          <div className="mt-8 border-t border-slate-100 pt-5 text-center">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: brandColor }} />
              HeptaCert altyapısıyla güvence altındadır
            </div>
            <p className="mx-auto mt-2 max-w-md text-[11px] leading-5 text-slate-400">
              Bu sayfa kurumsal olarak özelleştirilmiş olsa da kayıt doğrulama ve check-in güvenliği HeptaCert tarafından sağlanır.
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
