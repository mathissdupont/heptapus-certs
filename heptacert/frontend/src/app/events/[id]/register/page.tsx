"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
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
  const { lang } = useI18n();
  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            eventNotFound: "Etkinlik bulunamadı",
            registerFailed: "Kayıt başarısız",
            loading: "Etkinlik yükleniyor...",
            securePowered: "HeptaCert altyapısıyla güvence altındadır.",
            certifiedEvent: "Sertifikalı Etkinlik",
            sessionsTitle: "Etkinlik Oturumları",
            minSessionsText: "Sertifika almak için en az",
            sessionsRequired: "oturuma katılmanız gerekiyor.",
            alreadyRegisteredTitle: "Zaten Kayıtlısınız",
            successTitle: "Kayıt Tamamlandı",
            alreadyRegisteredBody: "bu etkinlik için zaten kayıtlı görünüyorsunuz. Aşağıda dijital katılım kartınızı görebilir ve kendi akışınıza devam edebilirsiniz.",
            successBody: "etkinliğe başarıyla kaydoldunuz. Etkinlik günü QR kodu okutarak check-in yapabilirsiniz.",
            digitalCard: "Dijital Katılım Kartı",
            existingRegistration: "Mevcut Kayıt",
            registered: "Kayıtlı",
            cardOwner: "Kart Sahibi",
            participationRule: "Katılım Kuralı",
            status: "Durum",
            newRegistrationCreated: "Yeni kayıt oluşturuldu",
            registrationExists: "Kayıt zaten mevcut",
            openCard: "Katılım Kartını Aç",
            surveyLink: "Anket Bağlantısı",
            surveyRequired: "Anket zorunlu",
            surveyRequiredBody: "Sertifikanızı indirebilmek için anketi check-in sonrasında, sertifika adımına geçmeden önce doldurmanız gerekiyor.",
            statusPage: "Durum Sayfası",
            openSurvey: "Anketi Aç",
            fillSurvey: "Anketi Doldur",
            registerForEvent: "Etkinliğe Kayıt Ol",
            fullName: "Ad Soyad",
            fullNamePlaceholder: "Adınız Soyadınız",
            email: "E-posta Adresi",
            emailPlaceholder: "ornek@mail.com",
            submit: "Kayıt Ol",
            cardRuleLabel: "Min. {count} oturum",
            poweredFooter: "Bu etkinlik sayfası kurumsal olarak özelleştirilmiş olsa da kayıt, doğrulama ve sertifika altyapısı HeptaCert tarafından sağlanır.",
          }
        : {
            eventNotFound: "Event not found",
            registerFailed: "Registration failed",
            loading: "Loading event...",
            securePowered: "Secured by HeptaCert infrastructure.",
            certifiedEvent: "Certified Event",
            sessionsTitle: "Event Sessions",
            minSessionsText: "To receive a certificate, you must attend at least",
            sessionsRequired: "sessions.",
            alreadyRegisteredTitle: "You Are Already Registered",
            successTitle: "Registration Complete",
            alreadyRegisteredBody: "you already appear to be registered for this event. You can view your digital attendance card below and continue from there.",
            successBody: "you have been successfully registered for the event. On event day, you can check in by scanning the QR code.",
            digitalCard: "Digital Attendance Card",
            existingRegistration: "Existing Registration",
            registered: "Registered",
            cardOwner: "Card Holder",
            participationRule: "Participation Rule",
            status: "Status",
            newRegistrationCreated: "New registration created",
            registrationExists: "Registration already exists",
            openCard: "Open Attendance Card",
            surveyLink: "Survey Link",
            surveyRequired: "Survey required",
            surveyRequiredBody: "To download your certificate, you must complete the survey after check-in and before moving to the certificate step.",
            statusPage: "Status Page",
            openSurvey: "Open Survey",
            fillSurvey: "Fill Survey",
            registerForEvent: "Register for Event",
            fullName: "Full Name",
            fullNamePlaceholder: "Your full name",
            email: "Email Address",
            emailPlaceholder: "name@email.com",
            submit: "Register",
            cardRuleLabel: "Min. {count} sessions",
            poweredFooter: "Even if this event page is customized for the organization, registration, verification, and certificate infrastructure are provided by HeptaCert.",
          },
    [lang]
  );

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [surveyUrl, setSurveyUrl] = useState<string | null>(null);
  const [statusUrl, setStatusUrl] = useState<string | null>(null);

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
      .catch(() => setError(copy.eventNotFound))
      .finally(() => setLoading(false));
  }, [eventId, copy.eventNotFound]);

  const brandName = branding?.org_name || "HeptaCert";
  const brandColor = branding?.brand_color || "#7c73ff";
  const locale = lang === "tr" ? "tr-TR" : "en-US";

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

      setAlreadyRegistered(Boolean(registered.already_registered));
      setVerificationRequired(Boolean(registered.verification_required));
      setName(registered.attendee_name || name.trim());
      setEmail(registered.attendee_email || email.trim().toLowerCase());
      setSurveyUrl(registered.email_verified ? registered.survey_url || null : null);
      setStatusUrl(registered.email_verified ? registered.status_url || null : null);

      if (typeof window !== "undefined" && registered.email_verified) {
        localStorage.setItem(`heptacert_attendee_${eventId}`, String(registered.attendee_id));
        localStorage.setItem(`heptacert_attendee_email_${eventId}`, registered.attendee_email || email.trim().toLowerCase());
        if (registered.survey_token) {
          localStorage.setItem(`heptacert_survey_token_${eventId}`, registered.survey_token);
        }
      }

      setSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || copy.registerFailed);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={pageBg}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin" style={{ color: brandColor }} />
          <p className="text-sm text-white/70">{copy.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" style={pageBg}>
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-xl">
          <p className="mb-4 text-5xl">:(</p>
          <p className="text-lg font-semibold text-white">{error || copy.eventNotFound}</p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/50">
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: brandColor }} />
            {copy.securePowered}
          </div>
        </div>
      </div>
    );
  }

  const hasBanner = !!event.event_banner_url;

  return (
    <div className="min-h-screen overflow-x-hidden text-white" style={pageBg}>
      <section className="relative overflow-hidden" style={{ minHeight: "38vh" }}>
        {hasBanner ? (
          <div className="absolute inset-0 scale-[1.03] bg-cover bg-center" style={{ backgroundImage: `url(${event.event_banner_url})` }} />
        ) : (
          <div className="absolute inset-0" style={heroFallbackBg} />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-[#0f172a]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_32%)]" />
        {hasBanner && <div className="absolute inset-0 backdrop-blur-[2px]" />}

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 md:px-6 md:pb-24 md:pt-20">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }} className="max-w-3xl rounded-[28px] border border-white/12 bg-black/30 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-8">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-sm">
              <Shield className="h-3.5 w-3.5" style={{ color: brandColor }} />
              {copy.certifiedEvent} · {brandName}
            </div>

            <div className="mb-5 flex items-center gap-3">
              {branding?.brand_logo ? (
                <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={branding.brand_logo} alt={brandName} className="h-10 w-auto object-contain" />
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3" style={{ boxShadow: `0 10px 30px ${brandColor}22` }}>
                  <Award className="h-7 w-7" style={{ color: brandColor }} />
                </div>
              )}
            </div>

            <h1 className="mb-4 text-4xl font-black leading-[1.04] tracking-tight text-white md:text-5xl">{event.name}</h1>

            <div className="mb-4 flex flex-wrap gap-3">
              {event.event_date && (
                <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-sm text-white/85 backdrop-blur-sm">
                  <Calendar className="h-3.5 w-3.5" style={{ color: brandColor }} />
                  {new Date(event.event_date).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}

              {event.event_location && (
                <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-sm text-white/85 backdrop-blur-sm">
                  <MapPin className="h-3.5 w-3.5" style={{ color: brandColor }} />
                  {event.event_location}
                </span>
              )}
            </div>

            {event.event_description && <p className="max-w-2xl text-sm leading-relaxed text-white/80 md:text-base">{event.event_description}</p>}
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 pb-20 md:-mt-14 md:px-6">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
          {event.sessions.length > 0 && (
            <motion.div className="lg:col-span-2" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.08 }}>
              <div className="rounded-[28px] border border-white/10 bg-white/6 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                <h2 className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-white/45">{copy.sessionsTitle}</h2>

                <div className="space-y-3">
                  {event.sessions.map((session, index) => (
                    <div key={session.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/7 p-4 transition-all hover:bg-white/10">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold" style={{ backgroundColor: `${brandColor}22`, color: brandColor }}>
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-snug text-white">{session.name}</p>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                          {session.session_date && (
                            <span className="text-xs text-white/55">
                              {new Date(session.session_date).toLocaleDateString(locale)}
                              {session.session_start ? ` · ${session.session_start}` : ""}
                            </span>
                          )}
                          {session.session_location && <span className="text-xs text-white/45">{session.session_location}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {event.min_sessions_required > 1 && (
                  <div className="mt-4 rounded-2xl border px-4 py-3" style={{ borderColor: `${brandColor}40`, backgroundColor: `${brandColor}16` }}>
                    <p className="text-xs font-medium leading-relaxed" style={{ color: brandColor }}>
                      {copy.minSessionsText} <strong>{event.min_sessions_required}</strong> {copy.sessionsRequired}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <motion.div className={event.sessions.length > 0 ? "lg:col-span-3" : "mx-auto w-full max-w-2xl lg:col-span-5"} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.12 }}>
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="rounded-[28px] border border-emerald-400/25 bg-white/8 p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl md:p-10">
                  <div className="mb-5 flex justify-center">
                    <div className="rounded-full border border-emerald-400/15 bg-emerald-500/15 p-5">
                      <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                    </div>
                  </div>

                  <h2 className="mb-2 text-2xl font-black text-white md:text-3xl">{alreadyRegistered ? copy.alreadyRegisteredTitle : copy.successTitle}</h2>

                  <p className="mx-auto max-w-md text-sm leading-relaxed text-white/70 md:text-base">
                    <span className="font-semibold text-white">{name}</span>, {alreadyRegistered ? copy.alreadyRegisteredBody : copy.successBody}
                  </p>

                  <div className="mx-auto mt-6 max-w-lg overflow-hidden rounded-[28px] border border-white/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.06))] p-5 text-left shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">{copy.digitalCard}</p>
                        <p className="mt-3 text-2xl font-black text-white">{event.name}</p>
                        <p className="mt-1 text-sm text-white/70">{name}</p>
                        <p className="text-xs text-white/50">{email}</p>
                      </div>
                      <div className="rounded-2xl px-3 py-2 text-xs font-semibold" style={{ backgroundColor: `${brandColor}22`, color: brandColor, border: `1px solid ${brandColor}55` }}>
                        {alreadyRegistered ? copy.existingRegistration : copy.registered}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">{copy.cardOwner}</p>
                        <p className="mt-2 text-sm font-semibold text-white">{name}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">{copy.participationRule}</p>
                        <p className="mt-2 text-sm font-semibold text-white">{copy.cardRuleLabel.replace("{count}", String(event.min_sessions_required))}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">{copy.status}</p>
                        <p className="mt-2 text-sm font-semibold text-white">{alreadyRegistered ? copy.registrationExists : copy.newRegistrationCreated}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <a href={statusUrl || `/events/${eventId}/status`} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:opacity-90">
                        {copy.openCard}
                        <ArrowRight className="h-4 w-4" />
                      </a>
                      {surveyUrl ? (
                        <a href={surveyUrl} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90">
                          {copy.surveyLink}
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {!verificationRequired && event.survey?.is_required && (
                    <div className="mx-auto mt-6 max-w-md rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-left">
                      <p className="text-sm font-semibold text-amber-200">{copy.surveyRequired}</p>
                      <p className="mt-1 text-xs leading-relaxed text-amber-100/85">{copy.surveyRequiredBody}</p>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <a href={`/events/${eventId}/status`} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-opacity hover:opacity-90">
                          {copy.statusPage}
                          <ArrowRight className="h-4 w-4" />
                        </a>
                        {event.survey.external_url && event.survey.survey_type === "external" && !event.survey.has_builtin_questions ? (
                          <a href={event.survey.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90">
                            {copy.openSurvey}
                            <ArrowRight className="h-4 w-4" />
                          </a>
                        ) : (
                          <a href={surveyUrl || "#"} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90">
                            {copy.fillSurvey}
                            <ArrowRight className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-[28px] border border-white bg-white/95 p-7 text-gray-900 shadow-[0_24px_70px_rgba(15,23,42,0.18)] md:p-8" style={{ colorScheme: "light" }}>
                  <h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-gray-900">
                    <div className="rounded-xl p-2" style={{ backgroundColor: `${brandColor}20` }}>
                      <UserPlus className="h-4 w-4" style={{ color: brandColor }} />
                    </div>
                    {copy.registerForEvent}
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{copy.fullName}</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={copy.fullNamePlaceholder}
                        required
                        minLength={2}
                        className="w-full rounded-2xl border bg-gray-50/80 px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2"
                        style={inputFocusStyle}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{copy.email}</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={copy.emailPlaceholder}
                        required
                        className="w-full rounded-2xl border bg-gray-50/80 px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2"
                        style={inputFocusStyle}
                      />
                    </div>

                    <AnimatePresence>
                      {submitError && (
                        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                          {submitError}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={submitting || !name.trim() || !email.trim()}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                      style={primaryBtnStyle}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{copy.submit}<ArrowRight className="h-4 w-4" /></>}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center md:px-6">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-white/55">
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: brandColor }} />
            {copy.securePowered}
          </div>
          <p className="mx-auto mt-2 max-w-2xl text-[11px] leading-relaxed text-white/30">{copy.poweredFooter}</p>
        </div>
      </footer>
    </div>
  );
}
