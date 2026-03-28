"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getPublicEventInfo, publicRegisterAttendee } from "@/lib/api";
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Loader2,
  UserPlus,
  ArrowRight,
  Shield,
  Award,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EventInfo {
  id: number;
  name: string;
  event_date: string | null;
  event_description: string | null;
  event_location: string | null;
  event_banner_url: string | null;
  min_sessions_required: number;
  survey?: {
    is_required: boolean;
    survey_type: "builtin" | "external" | "both";
    external_url?: string | null;
    has_builtin_questions: boolean;
  } | null;
  sessions: Array<{
    id: number;
    name: string;
    session_date: string | null;
    session_start: string | null;
    session_location: string | null;
  }>;
}

type BrandingData = {
  org_name?: string;
  brand_logo?: string | null;
  brand_color?: string | null;
  settings?: {
    hide_heptacert_home?: boolean;
  } | null;
};

export default function EventRegisterPage() {
  const params = useParams();
  const eventId = Number(params?.id);

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [branding, setBranding] = useState<BrandingData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attendeeId, setAttendeeId] = useState<number | null>(null);

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
    if (!eventId) return;
    getPublicEventInfo(eventId)
      .then(setEvent)
      .catch(() => setError("Etkinlik bulunamadı"))
      .finally(() => setLoading(false));
  }, [eventId]);

  const brandName = branding?.org_name || "HeptaCert";
  const brandColor = branding?.brand_color || "#7c73ff";

  const pageBg = useMemo(
    () => ({
      background: `
        radial-gradient(circle at top left, ${brandColor}18 0%, transparent 28%),
        radial-gradient(circle at top right, ${brandColor}14 0%, transparent 22%),
        linear-gradient(180deg, #070b14 0%, #0b1120 38%, #0f172a 100%)
      `,
    }),
    [brandColor]
  );

  const heroFallbackBg = useMemo(
    () => ({
      background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}D0 38%, #0b1120 100%)`,
    }),
    [brandColor]
  );

  const primaryBtnStyle = useMemo(
    () => ({
      background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}DD 100%)`,
      boxShadow: `0 18px 40px ${brandColor}40`,
    }),
    [brandColor]
  );

  const inputFocusStyle = useMemo(
    () => ({
      ["--tw-ring-color" as any]: `${brandColor}88`,
      borderColor: `${brandColor}33`,
    }),
    [brandColor]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const registered = await publicRegisterAttendee(eventId, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });

      setAttendeeId(registered.attendee_id);

      if (typeof window !== "undefined") {
        localStorage.setItem(`heptacert_attendee_${eventId}`, String(registered.attendee_id));
      }

      setSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || "Kayıt başarısız");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={pageBg}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: brandColor }} />
          <p className="text-sm text-white/70">Etkinlik yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={pageBg}>
        <div className="max-w-md w-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center shadow-2xl">
          <p className="text-5xl mb-4">😕</p>
          <p className="font-semibold text-white text-lg">{error || "Etkinlik bulunamadı"}</p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/50">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: brandColor }} />
            HeptaCert altyapısıyla güvence altındadır.
          </div>
        </div>
      </div>
    );
  }

  const hasBanner = !!event.event_banner_url;

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={pageBg}>
      <section className="relative overflow-hidden" style={{ minHeight: "38vh" }}>
        {hasBanner ? (
          <div
            className="absolute inset-0 bg-cover bg-center scale-[1.03]"
            style={{ backgroundImage: `url(${event.event_banner_url})` }}
          />
        ) : (
          <div className="absolute inset-0" style={heroFallbackBg} />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-[#0f172a]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_32%)]" />
        {hasBanner && <div className="absolute inset-0 backdrop-blur-[2px]" />}

        <div className="relative max-w-6xl mx-auto px-4 md:px-6 pt-16 md:pt-20 pb-20 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl rounded-[28px] border border-white/12 bg-black/30 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.35)] p-6 md:p-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-sm mb-5">
              <Shield className="w-3.5 h-3.5" style={{ color: brandColor }} />
              Sertifikalı Etkinlik · {brandName}
            </div>

            <div className="flex items-center gap-3 mb-5">
              {branding?.brand_logo ? (
                <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 backdrop-blur-sm">
                  <img
                    src={branding.brand_logo}
                    alt={brandName}
                    className="h-10 w-auto object-contain"
                  />
                </div>
              ) : (
                <div
                  className="rounded-2xl p-3 border border-white/10 bg-white/10"
                  style={{ boxShadow: `0 10px 30px ${brandColor}22` }}
                >
                  <Award className="w-7 h-7" style={{ color: brandColor }} />
                </div>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.04] text-white mb-4">
              {event.name}
            </h1>

            <div className="flex flex-wrap gap-3 mb-4">
              {event.event_date && (
                <span className="flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 text-sm text-white/85 backdrop-blur-sm">
                  <Calendar className="w-3.5 h-3.5" style={{ color: brandColor }} />
                  {new Date(event.event_date).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}

              {event.event_location && (
                <span className="flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 text-sm text-white/85 backdrop-blur-sm">
                  <MapPin className="w-3.5 h-3.5" style={{ color: brandColor }} />
                  {event.event_location}
                </span>
              )}
            </div>

            {event.event_description && (
              <p className="text-sm md:text-base text-white/80 max-w-2xl leading-relaxed">
                {event.event_description}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 pb-20 -mt-10 md:-mt-14">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {event.sessions.length > 0 && (
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
            >
              <div className="rounded-[28px] border border-white/10 bg-white/6 backdrop-blur-xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
                <h2 className="text-xs font-bold text-white/45 uppercase tracking-[0.22em] mb-5">
                  Etkinlik Oturumları
                </h2>

                <div className="space-y-3">
                  {event.sessions.map((s, i) => (
                    <div
                      key={s.id}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/7 p-4 hover:bg-white/10 transition-all"
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
                        style={{
                          backgroundColor: `${brandColor}22`,
                          color: brandColor,
                        }}
                      >
                        {i + 1}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white leading-snug">{s.name}</p>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                          {s.session_date && (
                            <span className="text-xs text-white/55">
                              {new Date(s.session_date).toLocaleDateString("tr-TR")}
                              {s.session_start ? ` · ${s.session_start}` : ""}
                            </span>
                          )}

                          {s.session_location && (
                            <span className="text-xs text-white/45">{s.session_location}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {event.min_sessions_required > 1 && (
                  <div
                    className="mt-4 rounded-2xl px-4 py-3 border"
                    style={{
                      borderColor: `${brandColor}40`,
                      backgroundColor: `${brandColor}16`,
                    }}
                  >
                    <p className="text-xs font-medium leading-relaxed" style={{ color: brandColor }}>
                      Sertifika almak için en az{" "}
                      <strong>{event.min_sessions_required} oturuma</strong> katılmanız gerekiyor.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <motion.div
            className={
              event.sessions.length > 0
                ? "lg:col-span-3"
                : "lg:col-span-5 max-w-2xl mx-auto w-full"
            }
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
          >
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="rounded-[28px] border border-emerald-400/25 bg-white/8 backdrop-blur-xl p-8 md:p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex justify-center mb-5">
                    <div className="rounded-full bg-emerald-500/15 p-5 border border-emerald-400/15">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                    </div>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
                    Kayıt Tamamlandı
                  </h2>

                  <p className="text-white/70 text-sm md:text-base leading-relaxed max-w-md mx-auto">
                    <span className="text-white font-semibold">{name}</span>, etkinliğe başarıyla
                    kaydoldunuz. Etkinlik günü QR kodu okutarak check-in yapabilirsiniz.
                  </p>

                  {event.survey?.is_required && (
                    <div className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-left max-w-md mx-auto">
                      <p className="text-sm text-amber-200 font-semibold">Anket zorunlu</p>
                      <p className="text-xs text-amber-100/85 mt-1 leading-relaxed">
                        Sertifikanızı indirebilmek için anketi check-in sonrasında, sertifika
                        adımına geçmeden önce doldurmanız gerekiyor.
                      </p>

                      <div className="mt-4">
                        {event.survey.external_url &&
                        (event.survey.survey_type === "external" ||
                          event.survey.survey_type === "both") ? (
                          <a
                            href={event.survey.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 text-black font-semibold px-4 py-2.5 text-sm hover:opacity-90 transition-opacity"
                          >
                            Anketi Aç
                            <ArrowRight className="w-4 h-4" />
                          </a>
                        ) : (
                          <a
                            href={`/events/${event.id}/survey${
                              attendeeId ? `?attendee_id=${attendeeId}` : ""
                            }`}
                            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 text-black font-semibold px-4 py-2.5 text-sm hover:opacity-90 transition-opacity"
                          >
                            Anketi Doldur
                            <ArrowRight className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-[28px] bg-white/95 text-gray-900 border border-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] p-7 md:p-8"
                  style={{ colorScheme: "light" }}
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div
                      className="rounded-xl p-2"
                      style={{ backgroundColor: `${brandColor}20` }}
                    >
                      <UserPlus className="w-4 h-4" style={{ color: brandColor }} />
                    </div>
                    Etkinliğe Kayıt Ol
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-[0.18em] mb-2">
                        Ad Soyad
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Adınız Soyadınız"
                        required
                        minLength={2}
                        className="w-full px-4 py-3.5 rounded-2xl border bg-gray-50/80 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-all"
                        style={inputFocusStyle}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-[0.18em] mb-2">
                        E-posta Adresi
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ornek@mail.com"
                        required
                        className="w-full px-4 py-3.5 rounded-2xl border bg-gray-50/80 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-all"
                        style={inputFocusStyle}
                      />
                    </div>

                    <AnimatePresence>
                      {submitError && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-2xl"
                        >
                          {submitError}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={submitting || !name.trim() || !email.trim()}
                      className="w-full disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 mt-2"
                      style={primaryBtnStyle}
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Kayıt Ol
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-4 md:px-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-white/55">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: brandColor }} />
            HeptaCert altyapısıyla güvence altındadır.
          </div>

          <p className="mt-2 text-[11px] text-white/30 max-w-2xl mx-auto leading-relaxed">
            Bu etkinlik sayfası kurumsal olarak özelleştirilmiş olsa da kayıt, doğrulama ve
            sertifika altyapısı HeptaCert tarafından sağlanır.
          </p>
        </div>
      </footer>
    </div>
  );
}