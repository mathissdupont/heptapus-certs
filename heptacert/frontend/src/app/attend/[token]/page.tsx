"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getCheckinSessionInfo, selfCheckin } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  QrCode,
  RefreshCcw,
  ShieldCheck,
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
  event_public_id: string;
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
};

export default function AttendCheckinPage() {
  const { lang } = useI18n();
  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            invalidQr: "QR kodu geçersiz",
            checkinFailed: "Check-in başarısız",
            preparing: "Check-in hazırlanıyor...",
            notOpened: "Check-in henüz açılmadı",
            title: "E-posta ile check-in yap",
            subtitle: "Etkinliğe kayıt olurken kullandığınız e-posta adresini girin.",
            email: "E-posta adresiniz",
            emailPlaceholder: "ornek@mail.com",
            submit: "Check-in Yap",
            done: "İşlem tamamlandı",
            failedTitle: "İşlem tamamlanamadı",
            attendee: "Katılımcı",
            minComplete: "Minimum oturum şartını tamamladınız. Anket veya sertifika akışına geçebilirsiniz.",
            minRemaining: "Toplam {attended} oturuma katıldınız. Sertifika için {remaining} oturum daha gerekiyor.",
            retry: "Tekrar dene",
            statusPage: "Durum Sayfasına Git",
            eventPage: "Etkinlik Sayfasına Git",
            secured: "HeptaCert altyapısıyla güvence altındadır",
          }
        : {
            invalidQr: "Invalid QR code",
            checkinFailed: "Check-in failed",
            preparing: "Preparing check-in...",
            notOpened: "Check-in has not opened yet",
            title: "Check in with your email",
            subtitle: "Enter the email address you used while registering for the event.",
            email: "Your email address",
            emailPlaceholder: "name@email.com",
            submit: "Check In",
            done: "Completed",
            failedTitle: "Could not complete the action",
            attendee: "Attendee",
            minComplete: "You completed the minimum session requirement. You can proceed to the survey or certificate flow.",
            minRemaining: "You have attended {attended} sessions so far. You need {remaining} more sessions for the certificate.",
            retry: "Try again",
            statusPage: "Go to Status Page",
            eventPage: "Go to Event Page",
            secured: "Secured by HeptaCert infrastructure",
          },
    [lang]
  );

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
        if (data.brand_color) document.documentElement.style.setProperty("--site-brand-color", data.brand_color);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) return;
    getCheckinSessionInfo(token)
      .then(setSessionInfo)
      .catch((e) => setError(e.message || copy.invalidQr))
      .finally(() => setLoading(false));
  }, [token, copy.invalidQr]);

  const brandName = branding?.org_name || "HeptaCert";
  const brandColor = branding?.brand_color || "#2563eb";
  const eventHref = sessionInfo ? `/events/${sessionInfo.event_public_id}/register` : "#";
  const statusHref = sessionInfo ? `/events/${sessionInfo.event_public_id}/status` : "#";
  const locale = lang === "tr" ? "tr-TR" : "en-US";

  const pageBg = useMemo(
    () => ({
      background: `
        radial-gradient(circle at top left, ${brandColor}18 0%, transparent 28%),
        linear-gradient(180deg, #f8fbff 0%, #eef4ff 52%, #f8fafc 100%)
      `,
    }),
    [brandColor]
  );

  const primaryStyle = useMemo(
    () => ({
      background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}DD 100%)`,
      boxShadow: `0 20px 45px ${brandColor}26`,
    }),
    [brandColor]
  );

  function formatSessionMeta(session: SessionInfo) {
    const parts = [session.event_name];
    if (session.session_date) {
      parts.push(new Date(session.session_date).toLocaleDateString(locale, { day: "numeric", month: "long" }));
    }
    if (session.session_start) parts.push(session.session_start);
    return parts.join(" • ");
  }

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
        message: err.message || copy.checkinFailed,
        attendee_name: "",
        sessions_attended: 0,
        sessions_required: sessionInfo?.min_sessions_required || 1,
        total_sessions: 0,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={pageBg}>
        <div className="rounded-[32px] border border-white/80 bg-white/90 px-8 py-10 text-center shadow-[0_30px_100px_rgba(15,23,42,0.12)]">
          <Loader2 className="mx-auto h-10 w-10 animate-spin" style={{ color: brandColor }} />
          <p className="mt-4 text-sm font-medium text-slate-500">{copy.preparing}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10" style={pageBg}>
        <div className="w-full max-w-lg rounded-[32px] border border-white/80 bg-white p-8 text-center shadow-[0_30px_100px_rgba(15,23,42,0.12)]">
          <XCircle className="mx-auto h-16 w-16 text-rose-500" />
          <h1 className="mt-5 text-2xl font-black text-slate-900">{copy.invalidQr}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!sessionInfo) return null;

  if (!sessionInfo.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10" style={pageBg}>
        <div className="w-full max-w-lg rounded-[32px] border border-white/80 bg-white p-8 text-center shadow-[0_30px_100px_rgba(15,23,42,0.12)]">
          <Clock className="mx-auto h-14 w-14 text-amber-500" />
          <h1 className="mt-5 text-2xl font-black text-slate-900">{copy.notOpened}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">{sessionInfo.session_name}</p>
          <p className="mt-1 text-sm text-slate-400">{formatSessionMeta(sessionInfo)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8" style={pageBg}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="w-full max-w-xl rounded-[36px] border border-white/80 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.12)] md:p-8">
        {!result ? (
          <>
            <div className="flex items-center gap-3">
              {branding?.brand_logo ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={branding.brand_logo} alt={brandName} className="h-10 w-auto object-contain" />
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <Award className="h-6 w-6" style={{ color: brandColor }} />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">{sessionInfo.session_name}</p>
                <p className="text-xs text-slate-500">{formatSessionMeta(sessionInfo)}</p>
              </div>
            </div>

            <h1 className="mt-8 text-3xl font-black text-slate-900">{copy.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{copy.subtitle}</p>

            <form onSubmit={handleCheckin} className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">{copy.email}</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={copy.emailPlaceholder}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2"
                    style={{ ["--tw-ring-color" as any]: `${brandColor}33` }}
                  />
                </div>
              </div>

              <button type="submit" disabled={submitting || !email.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50" style={primaryStyle}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                {copy.submit}
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-5">
            <div className={`rounded-[28px] border p-5 ${result.success ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
              <div className="flex items-start gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${result.success ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {result.success ? <CheckCircle2 className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${result.success ? "text-emerald-700" : "text-rose-700"}`}>{result.success ? copy.done : copy.failedTitle}</p>
                  <h2 className={`mt-1 text-xl font-black ${result.success ? "text-emerald-950" : "text-rose-950"}`}>{result.message}</h2>
                  {result.attendee_name ? <p className="mt-2 text-sm text-slate-600">{copy.attendee}: <span className="font-semibold text-slate-900">{result.attendee_name}</span></p> : null}
                </div>
              </div>
            </div>

            {result.success ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                {result.sessions_attended >= result.sessions_required
                  ? copy.minComplete
                  : copy.minRemaining.replace("{attended}", String(result.sessions_attended)).replace("{remaining}", String(Math.max(result.sessions_required - result.sessions_attended, 0)))}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setResult(null)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <RefreshCcw className="h-4 w-4" />
                {copy.retry}
              </button>

              <Link href={result.success ? statusHref : eventHref} className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition" style={primaryStyle}>
                {result.success ? copy.statusPage : copy.eventPage}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: brandColor }} />
            {copy.secured}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
