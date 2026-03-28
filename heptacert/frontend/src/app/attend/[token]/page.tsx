"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getCheckinSessionInfo, selfCheckin, apiFetch } from "@/lib/api";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  QrCode,
  MapPin,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  Award,
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
  const brandColor = branding?.brand_color || "#6366f1";

  const pageBg = useMemo(
    () => ({
      background: `linear-gradient(135deg, ${brandColor}14, ${brandColor}08)`,
    }),
    [brandColor]
  );

  const headerBg = useMemo(
    () => ({
      background: `linear-gradient(90deg, ${brandColor}, ${brandColor}DD)`,
    }),
    [brandColor]
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
        sessions_required: 1,
        total_sessions: 0,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={pageBg}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: brandColor }} />
          <p className="text-sm text-gray-500">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={pageBg}>
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center overflow-hidden">
          <div className="h-1.5" style={{ backgroundColor: brandColor }} />
          <div className="pt-6">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-800 mb-2">QR Kodu Geçersiz</h1>
            <p className="text-gray-500 text-sm">{error}</p>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              HeptaCert altyapısıyla güvence altındadır.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionInfo?.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={pageBg}>
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center overflow-hidden">
          <div className="h-1.5" style={{ backgroundColor: brandColor }} />
          <div className="pt-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              {branding?.brand_logo ? (
                <img
                  src={branding.brand_logo}
                  alt={brandName}
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <Award className="w-8 h-8" style={{ color: brandColor }} />
              )}
              <span className="font-bold text-gray-800">{brandName}</span>
            </div>

            <QrCode className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-800 mb-2">{sessionInfo?.session_name}</h1>
            <p className="text-sm text-gray-500 mb-1">{sessionInfo?.event_name}</p>

            <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full"
              style={{ backgroundColor: `${brandColor}18`, color: brandColor }}>
              <Clock className="w-4 h-4" />
              Check-in henüz açılmadı
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              HeptaCert altyapısıyla güvence altındadır.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={pageBg}>
      <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full overflow-hidden">
        <div className="p-6 text-white text-center" style={headerBg}>
          <div className="flex items-center justify-center gap-3 mb-3">
            {branding?.brand_logo ? (
              <div className="bg-white/10 rounded-xl px-3 py-2">
                <img
                  src={branding.brand_logo}
                  alt={brandName}
                  className="h-10 w-auto object-contain"
                />
              </div>
            ) : (
              <Award className="w-8 h-8 opacity-90" />
            )}
          </div>

          <QrCode className="w-10 h-10 mx-auto mb-2 opacity-80" />
          <h1 className="text-xl font-bold">{sessionInfo.session_name}</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.85)" }}>
            {sessionInfo.event_name}
          </p>
          <p className="text-xs mt-2 font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>
            {brandName}
          </p>
        </div>

        <div className="px-6 pt-4 pb-2 flex flex-wrap gap-3 justify-center text-xs text-gray-500">
          {sessionInfo.session_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(sessionInfo.session_date).toLocaleDateString("tr-TR")}
            </span>
          )}
          {sessionInfo.session_start && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {sessionInfo.session_start}
            </span>
          )}
          {sessionInfo.session_location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {sessionInfo.session_location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {sessionInfo.attendance_count} katılımcı
          </span>
        </div>

        <div className="px-6 pb-6">
          {result ? (
            <div className={`mt-4 rounded-2xl p-5 text-center ${result.success ? "bg-green-50" : "bg-red-50"}`}>
              {result.success ? (
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
              ) : (
                <XCircle className="w-14 h-14 text-red-500 mx-auto mb-3" />
              )}
              <p className={`font-semibold text-base ${result.success ? "text-green-700" : "text-red-700"}`}>
                {result.message}
              </p>

              {result.sessions_attended > 0 && (
                <div className="mt-3 text-sm text-gray-600">
                  <p>
                    Katıldığınız oturum sayısı:{" "}
                    <span className="font-bold" style={{ color: brandColor }}>
                      {result.sessions_attended}/{result.total_sessions}
                    </span>
                  </p>

                  {result.sessions_attended >= result.sessions_required ? (
                    <p className="mt-1 text-green-600 font-medium">
                      🎉 Sertifika almanız için gerekli oturum sayısını tamamladınız!
                    </p>
                  ) : (
                    <p className="mt-1 text-gray-500">
                      Sertifika için {result.sessions_required - result.sessions_attended} oturum daha gerekiyor.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleCheckin} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-posta adresiniz
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@mail.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 text-sm"
                  style={{ ["--tw-ring-color" as any]: brandColor }}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Etkinliğe kayıt sırasında kullandığınız e-posta.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="w-full text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                style={headerBg}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Check-in Yap
              </button>
            </form>
          )}

          <p className="text-xs text-gray-400 text-center mt-4">
            Kayıtlı değil misiniz?{" "}
            <a
              href={`/events/${sessionInfo.event_id}/register`}
              className="underline"
              style={{ color: brandColor }}
            >
              Etkinliğe kayıt ol
            </a>
          </p>

          <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col items-center gap-1 text-center">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: brandColor }} />
              HeptaCert altyapısıyla güvence altındadır.
            </div>
            <p className="text-[11px] text-gray-400">
              Bu etkinlik sayfası kurumsal olarak özelleştirilmiş olsa da doğrulama ve kayıt güvenliği HeptaCert tarafından sağlanır.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}