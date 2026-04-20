"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Award,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Sparkles,
  Ticket,
  ArrowLeft,
  Clock3,
  IdCard,
} from "lucide-react";
import { getPublicParticipantStatus, type PublicParticipantStatus } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type BrandingData = {
  org_name?: string;
  brand_logo?: string | null;
  brand_color?: string | null;
};

function readStoredSurveyToken(eventId: string) {
  if (typeof window === "undefined") return "";
  const query = new URLSearchParams(window.location.search);
  return (query.get("token") || localStorage.getItem(`heptacert_survey_token_${eventId}`) || "").trim();
}

export default function EventParticipantStatusPage() {
  const { lang } = useI18n();
  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            loadFailed: "Katılımcı durumu yüklenemedi.",
            loading: "Katılımcı durumu hazırlanıyor...",
            back: "Etkinlik sayfasına dön",
            personalArea: "Kişiye özel durum alanı",
            notFoundTitle: "Katılımcı durumu bulunamadı",
            notFoundBody: "Bu sayfa sadece size özel bağlantı ile açılır. Kayıt olduktan sonra veya size gönderilen kişisel anket bağlantısı ile tekrar deneyin.",
            notFoundHint: "Önce kayıt akışından ilerleyin veya organizasyonun size gönderdiği özel anket bağlantısını açın. Ardından bu sayfada check-in, anket, rozet ve sertifika durumunuzu birlikte görebilirsiniz.",
            panelBadge: "katılımcı paneli",
            allStatus: "Tek bakışta tüm durumunuz",
            title: "Katılımcı durumunuz",
            subtitle: "Check-in, anket, rozetler ve sertifika uygunluğu aynı ekranda. Buradaki bilgiler size özel bağlantı üzerinden yüklenir.",
            sessions: "Oturum",
            minSessions: "Minimum {count} oturum",
            survey: "Anket",
            surveyDisabled: "Kapalı",
            completed: "Tamam",
            pending: "Bekliyor",
            requiredForCert: "Sertifika için gerekli",
            optional: "Opsiyonel",
            notEnabled: "Bu etkinlikte anket akışı kapalı",
            badges: "Rozetlerim",
            totalBadges: "Toplam kazanılan rozet",
            certificate: "Sertifika",
            ready: "Hazır",
            produced: "Üretildi",
            visibleReady: "Görüntülemeye uygun",
            waits: "Koşullar tamamlanınca açılır",
            nextStep: "Sonraki önerilen adım",
            certReadyText: "Sertifikanız hazır. Doğrulama bağlantısından görüntüleyebilir veya indirebilirsiniz.",
            surveyStep: "Önce anketi tamamlayın. Sistem sertifika uygunluğunu otomatik güncelleyecek.",
            noSurveyStep: "Bu etkinlikte anket adımı kapalı. Check-in, rozet ve sertifika güncellemelerini bu karttan takip edebilirsiniz.",
            moreSessions: "Sertifika için {count} oturum daha tamamlamanız gerekiyor.",
            waitingUpdates: "Katılım koşullarını tamamladınız. Sertifika veya yeni rozet güncellemeleri bu alana yansıyacak.",
            surveyPage: "Anket sayfasına git",
            viewCertificate: "Sertifikayı görüntüle",
            eligibilitySummary: "Uygunluk özeti",
            completedSessions: "Check-in tamamlanan oturum",
            surveyStatus: "Anket durumu",
            visibleBadges: "Görünür rozet",
            eligibleRaffles: "Uygun olduğunuz çekilişler",
            badgesTitle: "Rozetlerim",
            badgesSubtitle: "Etkinlik yönetimi tarafından verilen rozetler burada görünür.",
            noBadges: "Henüz görünür bir rozetiniz yok. Rozet atandığında bu alanda otomatik olarak görünecek.",
            automatic: "Otomatik",
            manual: "Manuel",
            type: "Tür",
            certReadyBanner: "Sertifikanız hazır görünüyor",
            certReadyBannerBody: "Son koşullar tamamlanmış. Eğer görüntüleme bağlantısı mevcutsa yukarıdaki butondan doğrudan açabilirsiniz.",
            cardEyebrow: "Dijital Katılım Kartı",
            cardIssued: "Kart aktif",
            cardHolder: "Katılımcı",
            cardTrack: "Akış",
          }
        : {
            loadFailed: "Could not load participant status.",
            loading: "Preparing participant status...",
            back: "Back to event page",
            personalArea: "Private status area",
            notFoundTitle: "Participant status not found",
            notFoundBody: "This page is only available through your personal link. Please try again after registration or from the survey link sent to you.",
            notFoundHint: "Complete the registration flow first or open the private survey link shared by the organizer. Then you can see your check-in, survey, badge, and certificate status here.",
            panelBadge: "participant panel",
            allStatus: "Everything at a glance",
            title: "Your participant status",
            subtitle: "Check-in, survey, badges, and certificate eligibility are shown on the same screen. This data is loaded through your personal link.",
            sessions: "Sessions",
            minSessions: "Minimum {count} sessions",
            survey: "Survey",
            surveyDisabled: "Disabled",
            completed: "Done",
            pending: "Pending",
            requiredForCert: "Required for certificate",
            optional: "Optional",
            notEnabled: "Survey flow is disabled for this event",
            badges: "My badges",
            totalBadges: "Total badges earned",
            certificate: "Certificate",
            ready: "Ready",
            produced: "Generated",
            visibleReady: "Ready to view",
            waits: "Available after requirements are met",
            nextStep: "Recommended next step",
            certReadyText: "Your certificate is ready. You can view or download it from the verification link.",
            surveyStep: "Complete the survey first. The system will automatically refresh your certificate eligibility.",
            noSurveyStep: "Survey is disabled for this event. You can track check-in, badge, and certificate updates from this card.",
            moreSessions: "You need {count} more sessions for the certificate.",
            waitingUpdates: "You completed the participation requirements. Certificate or badge updates will appear here.",
            surveyPage: "Go to survey page",
            viewCertificate: "View certificate",
            eligibilitySummary: "Eligibility summary",
            completedSessions: "Checked-in sessions",
            surveyStatus: "Survey status",
            visibleBadges: "Visible badges",
            eligibleRaffles: "Raffles you are eligible for",
            badgesTitle: "My badges",
            badgesSubtitle: "Badges assigned by the event team appear here.",
            noBadges: "You do not have any visible badges yet. They will appear here automatically once assigned.",
            automatic: "Automatic",
            manual: "Manual",
            type: "Type",
            certReadyBanner: "Your certificate looks ready",
            certReadyBannerBody: "All requirements appear complete. If a view link exists, you can open it directly from the button above.",
            cardEyebrow: "Digital attendance card",
            cardIssued: "Card active",
            cardHolder: "Participant",
            cardTrack: "Flow",
          },
    [lang]
  );

  const params = useParams();
  const rawEventId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const eventId = rawEventId ? String(rawEventId) : "";
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [status, setStatus] = useState<PublicParticipantStatus | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/branding").then((r) => (r.ok ? r.json() : null)).then((data) => data && setBranding(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!eventId) return;
    const nextToken = readStoredSurveyToken(eventId);
    setToken(nextToken);
    if (!nextToken) {
      setLoading(false);
      setStatus(null);
      return;
    }
    setLoading(true);
    setError(null);
    getPublicParticipantStatus(eventId, nextToken)
      .then((data) => {
        setStatus(data);
        if (typeof window !== "undefined") localStorage.setItem(`heptacert_survey_token_${eventId}`, nextToken);
      })
      .catch((err: any) => {
        setStatus(null);
        setError(err?.message || copy.loadFailed);
      })
      .finally(() => setLoading(false));
  }, [eventId, copy.loadFailed]);

  const brandColor = branding?.brand_color || "#4f46e5";
  const brandName = branding?.org_name || "HeptaCert";
  const surveyHref = token ? `/events/${eventId}/survey?token=${encodeURIComponent(token)}` : `/events/${eventId}/survey`;
  const locale = lang === "tr" ? "tr-TR" : "en-US";
  const badgeDateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }), [locale]);

  // Çok hafif, modern bir arka plan
  const pageBg = { background: "#fafafa" };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={pageBg}>
        <div className="rounded-[32px] border border-zinc-200/60 bg-white px-8 py-12 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" style={{ color: brandColor }} />
          <p className="mt-4 text-sm font-medium text-zinc-500">{copy.loading}</p>
        </div>
      </div>
    );
  }

  if (!token || !status) {
    return (
      <div className="min-h-screen px-4 py-10" style={pageBg}>
        <div className="mx-auto max-w-3xl space-y-6">
          <Link href={`/events/${eventId}/register`} className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900">
            <ArrowLeft className="h-4 w-4" />{copy.back}
          </Link>
          <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-8 md:px-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                <ShieldCheck className="h-3.5 w-3.5" />{copy.personalArea}
              </div>
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">{copy.notFoundTitle}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600">{copy.notFoundBody}</p>
            </div>
            <div className="space-y-5 px-6 py-8 md:px-10">
              {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-8 text-center text-sm leading-relaxed text-zinc-500">
                {copy.notFoundHint}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasSurvey = status.survey_enabled;
  const nextStepDescription = status.certificate_ready
    ? copy.certReadyText
    : hasSurvey && status.survey_required && !status.survey_completed
      ? copy.surveyStep
      : !hasSurvey
        ? copy.noSurveyStep
        : status.sessions_attended < status.sessions_required
          ? copy.moreSessions.replace("{count}", String(status.sessions_required - status.sessions_attended))
          : copy.waitingUpdates;

  return (
    <div className="min-h-screen px-4 py-8 md:px-8 md:py-12" style={pageBg}>
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Üst Navigasyon */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href={`/events/${eventId}/register`} className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900">
            <ArrowLeft className="h-4 w-4" />{copy.back}
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-600 shadow-sm">
            <Sparkles className="h-4 w-4" style={{ color: brandColor }} />
            {brandName} {copy.panelBadge}
          </div>
        </div>

        {/* Ana İçerik Konteyneri */}
        <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          
          {/* Header Kısmı */}
          <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-8 md:px-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm">
              <BadgeCheck className="h-3.5 w-3.5" style={{ color: brandColor }} />
              {copy.allStatus}
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">{copy.subtitle}</p>
          </div>

          <div className="space-y-8 px-6 py-8 md:px-10 md:py-10">
            
            {/* Minimalist Dijital Kimlik Kartı */}
            <div className="relative overflow-hidden rounded-3xl border border-zinc-200/60 bg-white p-6 shadow-sm sm:p-8">
              {/* Marka Rengi Hafif Glow Efekti */}
              <div 
                className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-[0.08] blur-3xl" 
                style={{ backgroundColor: brandColor }} 
              />
              
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-5">
                  {/* Katılımcı Baş Harfi (Yedigen / Heptagon Formunda) */}
                  <div 
                    className="flex h-20 w-20 shrink-0 items-center justify-center bg-zinc-100 text-3xl font-bold text-zinc-700 shadow-inner"
                    style={{ clipPath: "polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%)" }}
                  >
                    {status.attendee_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{copy.cardHolder}</p>
                    <h2 className="mt-1 text-2xl font-bold text-zinc-900">{status.attendee_name}</h2>
                    <p className="text-sm text-zinc-500">{status.attendee_email}</p>
                  </div>
                </div>
                
                {/* Hızlı Bilgi Etiketleri */}
                <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                  <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700">
                    <IdCard className="h-4 w-4 text-zinc-400" /> {copy.cardIssued}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {status.sessions_attended}/{Math.max(status.total_sessions, status.sessions_required)} {copy.sessions}
                  </div>
                </div>
              </div>
            </div>

            {/* İstatistikler Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5 transition hover:bg-white hover:shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{copy.sessions}</p>
                <p className="mt-3 text-3xl font-bold text-zinc-900">{status.sessions_attended}<span className="text-xl text-zinc-400">/{Math.max(status.total_sessions, status.sessions_required)}</span></p>
                <p className="mt-2 text-xs text-zinc-500">{copy.minSessions.replace("{count}", String(status.sessions_required))}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5 transition hover:bg-white hover:shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{copy.survey}</p>
                <p className="mt-3 text-xl font-bold text-zinc-900">{hasSurvey ? (status.survey_completed ? copy.completed : copy.pending) : copy.surveyDisabled}</p>
                <p className="mt-2 text-xs text-zinc-500">{hasSurvey ? (status.survey_required ? copy.requiredForCert : copy.optional) : copy.notEnabled}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5 transition hover:bg-white hover:shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{copy.badges}</p>
                <p className="mt-3 text-3xl font-bold text-zinc-900">{status.badge_count}</p>
                <p className="mt-2 text-xs text-zinc-500">{copy.totalBadges}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5 transition hover:bg-white hover:shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{copy.certificate}</p>
                <p className="mt-3 text-xl font-bold text-zinc-900">{status.certificate_ready ? copy.ready : status.certificate_count > 0 ? copy.produced : copy.pending}</p>
                <p className="mt-2 text-xs text-zinc-500">{status.certificate_ready ? copy.visibleReady : copy.waits}</p>
              </div>
            </div>

            {/* Adım & Özet Alanı */}
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="rounded-3xl border border-zinc-200/80 bg-zinc-50/30 p-6 sm:p-8">
                <h3 className="text-base font-semibold text-zinc-900">{copy.nextStep}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">{nextStepDescription}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {hasSurvey ? (
                    <Link 
                      href={surveyHref} 
                      className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90" 
                      style={{ backgroundColor: brandColor }}
                    >
                      {copy.surveyPage} <ExternalLink className="h-4 w-4" />
                    </Link>
                  ) : null}
                  {status.latest_certificate_verify_url ? (
                    <a 
                      href={status.latest_certificate_verify_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
                    >
                      {copy.viewCertificate} <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <Clock3 className="h-4 w-4" style={{ color: brandColor }} />
                  {copy.eligibilitySummary}
                </div>
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 text-sm">
                    <span className="text-zinc-500">{copy.completedSessions}</span>
                    <span className="font-semibold text-zinc-900">{status.sessions_attended}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 text-sm">
                    <span className="text-zinc-500">{copy.surveyStatus}</span>
                    <span className="font-semibold text-zinc-900">{hasSurvey ? (status.survey_completed ? copy.completed : copy.pending) : copy.surveyDisabled}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">{copy.visibleBadges}</span>
                    <span className="font-semibold text-zinc-900">{status.badges.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Çekilişler */}
            {status.eligible_raffles.length > 0 ? (
              <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <Ticket className="h-4 w-4" />{copy.eligibleRaffles}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {status.eligible_raffles.map((raffle) => (
                    <span key={raffle.id} className="rounded-full border border-amber-200 bg-white px-4 py-1.5 text-xs font-semibold text-amber-800 shadow-sm">
                      {raffle.title} • {raffle.prize_name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Hazır Sertifika Uyarı Bannerı */}
            {status.certificate_ready ? (
              <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 px-6 py-5 text-emerald-900">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />{copy.certReadyBanner}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-emerald-800/80">{copy.certReadyBannerBody}</p>
              </div>
            ) : null}

            {/* Rozetler Alanı */}
            <div className="pt-4 border-t border-zinc-100">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-zinc-900">{copy.badgesTitle}</h2>
                <p className="mt-1 text-sm text-zinc-500">{copy.badgesSubtitle}</p>
              </div>
              
              {status.badges.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-500">
                  {copy.noBadges}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {status.badges.map((badge) => {
                    const color = badge.badge_color_hex || brandColor;
                    return (
                      <div key={badge.id} className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition hover:shadow-md">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-base font-bold text-zinc-900">{badge.badge_name || badge.badge_type}</p>
                            {badge.badge_description ? (
                              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{badge.badge_description}</p>
                            ) : null}
                          </div>
                          <div 
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold" 
                            style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}
                          >
                            <Award className="h-3.5 w-3.5" />
                            {badge.is_automatic ? copy.automatic : copy.manual}
                          </div>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-medium text-zinc-500">
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1">{copy.type}: {badge.badge_type}</span>
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1">{badgeDateFormatter.format(new Date(badge.awarded_at))}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}