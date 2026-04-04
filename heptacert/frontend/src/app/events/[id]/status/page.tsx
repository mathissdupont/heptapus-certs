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
} from "lucide-react";
import { getPublicParticipantStatus, type PublicParticipantStatus } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type BrandingData = {
  org_name?: string;
  brand_logo?: string | null;
  brand_color?: string | null;
};

function readStoredSurveyToken(eventId: number) {
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
            completed: "Tamam",
            pending: "Bekliyor",
            requiredForCert: "Sertifika için gerekli",
            optional: "Opsiyonel",
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
            completed: "Done",
            pending: "Pending",
            requiredForCert: "Required for certificate",
            optional: "Optional",
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
          },
    [lang]
  );

  const params = useParams();
  const eventId = Number(params?.id);
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

  const pageBg = useMemo(
    () => ({
      background: `radial-gradient(circle at top left, ${brandColor}16 0%, transparent 28%), radial-gradient(circle at top right, rgba(249,115,22,0.12) 0%, transparent 24%), linear-gradient(180deg, #f8fbff 0%, #eef2ff 52%, #f8fafc 100%)`,
    }),
    [brandColor]
  );

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center px-4" style={pageBg}><div className="rounded-[32px] border border-white/80 bg-white/90 px-8 py-10 text-center shadow-[0_30px_100px_rgba(15,23,42,0.12)]"><Loader2 className="mx-auto h-10 w-10 animate-spin" style={{ color: brandColor }} /><p className="mt-4 text-sm font-medium text-slate-500">{copy.loading}</p></div></div>;
  }

  if (!token || !status) {
    return (
      <div className="min-h-screen px-4 py-10" style={pageBg}>
        <div className="mx-auto max-w-3xl space-y-6">
          <Link href={`/events/${eventId}/register`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />{copy.back}</Link>
          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.14),_transparent_38%),linear-gradient(135deg,_#ffffff_15%,_#eef2ff_100%)] px-6 py-7 md:px-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"><ShieldCheck className="h-3.5 w-3.5" />{copy.personalArea}</div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">{copy.notFoundTitle}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{copy.notFoundBody}</p>
            </div>
            <div className="space-y-5 px-6 py-6 md:px-8 md:py-8">
              {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">{copy.notFoundHint}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 md:px-8 md:py-10" style={pageBg}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/events/${eventId}/register`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />{copy.back}</Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm"><Sparkles className="h-4 w-4" style={{ color: brandColor }} />{brandName} {copy.panelBadge}</div>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.14),_transparent_38%),linear-gradient(135deg,_#ffffff_15%,_#eef2ff_100%)] px-6 py-7 md:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"><BadgeCheck className="h-3.5 w-3.5" />{copy.allStatus}</div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{copy.subtitle}</p>
          </div>

          <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.sessions}</p><p className="mt-2 text-2xl font-black text-slate-900">{status.sessions_attended}/{Math.max(status.total_sessions, status.sessions_required)}</p><p className="mt-1 text-xs text-slate-500">{copy.minSessions.replace("{count}", String(status.sessions_required))}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.survey}</p><p className="mt-2 text-2xl font-black text-slate-900">{status.survey_completed ? copy.completed : copy.pending}</p><p className="mt-1 text-xs text-slate-500">{status.survey_required ? copy.requiredForCert : copy.optional}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.badges}</p><p className="mt-2 text-2xl font-black text-slate-900">{status.badge_count}</p><p className="mt-1 text-xs text-slate-500">{copy.totalBadges}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.certificate}</p><p className="mt-2 text-2xl font-black text-slate-900">{status.certificate_ready ? copy.ready : status.certificate_count > 0 ? copy.produced : copy.pending}</p><p className="mt-1 text-xs text-slate-500">{status.certificate_ready ? copy.visibleReady : copy.waits}</p></div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">{copy.nextStep}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{status.certificate_ready ? copy.certReadyText : status.survey_required && !status.survey_completed ? copy.surveyStep : status.sessions_attended < status.sessions_required ? copy.moreSessions.replace("{count}", String(status.sessions_required - status.sessions_attended)) : copy.waitingUpdates}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={surveyHref} className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition" style={{ background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}DD 100%)` }}>{copy.surveyPage}<ExternalLink className="h-4 w-4" /></Link>
                  {status.latest_certificate_verify_url ? <a href={status.latest_certificate_verify_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">{copy.viewCertificate}<ExternalLink className="h-4 w-4" /></a> : null}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Clock3 className="h-4 w-4" style={{ color: brandColor }} />{copy.eligibilitySummary}</div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{copy.completedSessions}: <span className="font-semibold">{status.sessions_attended}</span></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{copy.surveyStatus}: <span className="font-semibold">{status.survey_completed ? copy.completed : copy.pending}</span></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{copy.visibleBadges}: <span className="font-semibold">{status.badges.length}</span></div>
                </div>
              </div>
            </div>

            {status.eligible_raffles.length > 0 ? <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-amber-900"><Ticket className="h-4 w-4" />{copy.eligibleRaffles}</div><div className="mt-3 flex flex-wrap gap-2">{status.eligible_raffles.map((raffle) => <span key={raffle.id} className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-800">{raffle.title} • {raffle.prize_name}</span>)}</div></div> : null}

            <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between"><div><h2 className="text-xl font-black text-slate-900">{copy.badgesTitle}</h2><p className="mt-1 text-sm text-slate-500">{copy.badgesSubtitle}</p></div></div>
              {status.badges.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">{copy.noBadges}</div> : <div className="grid gap-3 md:grid-cols-2">{status.badges.map((badge) => { const color = badge.badge_color_hex || brandColor; return <div key={badge.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-lg font-black text-slate-900">{badge.badge_name || badge.badge_type}</p>{badge.badge_description ? <p className="mt-1 text-sm leading-6 text-slate-600">{badge.badge_description}</p> : null}</div><div className="inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold" style={{ color, borderColor: `${color}50`, backgroundColor: `${color}12` }}><Award className="h-3.5 w-3.5" />{badge.is_automatic ? copy.automatic : copy.manual}</div></div><div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500"><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{copy.type}: {badge.badge_type}</span><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{badgeDateFormatter.format(new Date(badge.awarded_at))}</span></div></div>; })}</div>}
            </div>

            {status.certificate_ready ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-900"><div className="flex items-center gap-2 text-base font-semibold"><CheckCircle2 className="h-5 w-5" />{copy.certReadyBanner}</div><p className="mt-2 text-sm leading-6 text-emerald-800">{copy.certReadyBannerBody}</p></div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
