"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  CheckCircle2,
  ExternalLink,
  Loader2,
  LockKeyhole,
  Sparkles,
  Ticket,
} from "lucide-react";
import {
  getPublicEventInfo,
  getPublicParticipantStatus,
  resolvePublicSurveyToken,
  submitBuiltinSurvey,
  type PublicParticipantBadge,
  type PublicParticipantStatus,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type SurveyQuestion = {
  id: string;
  type: string;
  question: string;
  required?: boolean;
  options?: string[];
};

type PublicSurvey = {
  is_required: boolean;
  survey_type: "builtin" | "external" | "both";
  external_url?: string | null;
  has_builtin_questions: boolean;
  builtin_questions?: SurveyQuestion[];
};

type EventInfo = {
  id: number;
  name: string;
  survey?: PublicSurvey | null;
};

function renderFieldType(question: SurveyQuestion) {
  if (question.type === "textarea" || question.type === "long_text") return "textarea";
  if (question.type === "select" || question.type === "multiple_choice" || (question.options && question.options.length > 0)) {
    return "select";
  }
  if (question.type === "rating") return "rating";
  return "text";
}

export default function EventSurveyPage() {
  const params = useParams();
  const rawEventId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const eventId = rawEventId ? String(rawEventId) : "";
  const { lang } = useI18n();
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surveyToken, setSurveyToken] = useState("");
  const [attendeeId, setAttendeeId] = useState<number | null>(null);
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [participantStatus, setParticipantStatus] = useState<PublicParticipantStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
          badgeEmpty: "Henüz görünür bir rozetiniz yok. Rozet verildiğinde burada görünecek.",
          automatic: "Otomatik",
          manual: "Manuel",
          type: "Tür",
          loadFailed: "Anket bilgileri yüklenemedi.",
          submitFailed: "Anket gönderilemedi.",
          privateLink: "Bu anket bağlantısı kişiye özeldir. Lütfen size gönderilen özel bağlantıyı kullanın.",
          requiredQuestions: "Lütfen zorunlu soruları doldurun.",
          eventNotFound: "Etkinlik bulunamadı.",
          back: "Kayıt sayfasına dön",
          flow: "Katılımcı anket akışı",
          intro: "Bu sayfa sadece katılımcıya gönderilen kişisel bağlantı ile açılır. İmzalı token, anketin yalnızca doğru kişi tarafından doldurulmasını sağlar.",
          surveyMissing: "Bu etkinlik için anket akışı kapalı veya henüz tanımlanmamış.",
          privateRequiredTitle: "Kişiye özel bağlantı gerekli",
          privateRequiredBody: "Bu anket herkese açık değildir. Sadece katılımcıya gönderilen özel bağlantı ile doldurulabilir.",
          externalTitle: "Harici anket",
          externalBody: "Bu etkinlik için harici anket bağlantısı tanımlandı. İsterseniz bu bağlantıyı yeni sekmede açabilirsiniz.",
          openExternal: "Harici anketi aç",
          builtinTitle: "Dahili anket",
          builtinSubtitle: "Yanıtlarınız etkinlik hesabına güvenli şekilde kaydedilir.",
          send: "Anketi gönder",
          sent: "Anket gönderildi",
          thankYou: "Yanıtlarınız kaydedildi. Sertifika ve rozet durumunuz aşağıda güncellenecek.",
          statusTitle: "Katılım özeti",
          sessions: "Oturum",
          survey: "Anket",
          badges: "Rozet",
          certificate: "Sertifika",
          completed: "Tamam",
          pending: "Bekliyor",
          ready: "Hazır",
          notReady: "Bekliyor",
          required: "Zorunlu",
          optional: "Opsiyonel",
          eligibleRaffles: "Uygun çekilişler",
          noRaffles: "Henüz uygun olduğunuz çekiliş yok.",
          badgeTitle: "Rozetlerim",
        }
        : {
          badgeEmpty: "You do not have a visible badge yet. It will appear here once assigned.",
          automatic: "Automatic",
          manual: "Manual",
          type: "Type",
          loadFailed: "Could not load survey details.",
          submitFailed: "Could not submit survey.",
          privateLink: "This survey link is personal. Please use the private link sent to you.",
          requiredQuestions: "Please fill in the required questions.",
          eventNotFound: "Event not found.",
          back: "Back to registration",
          flow: "Participant survey flow",
          intro: "This page is opened only through the participant's personal link. The signed token ensures only the correct attendee can submit the survey.",
          surveyMissing: "Survey is disabled or has not been configured for this event yet.",
          privateRequiredTitle: "Private link required",
          privateRequiredBody: "This survey is not public. It can only be completed with the private link sent to the attendee.",
          externalTitle: "External survey",
          externalBody: "An external survey link is configured for this event. You can open it in a new tab.",
          openExternal: "Open external survey",
          builtinTitle: "Built-in survey",
          builtinSubtitle: "Your answers are securely stored in the event account.",
          send: "Submit survey",
          sent: "Survey submitted",
          thankYou: "Your answers were saved. Your certificate and badge status will refresh below.",
          statusTitle: "Participation summary",
          sessions: "Sessions",
          survey: "Survey",
          badges: "Badges",
          certificate: "Certificate",
          completed: "Done",
          pending: "Pending",
          ready: "Ready",
          notReady: "Pending",
          required: "Required",
          optional: "Optional",
          eligibleRaffles: "Eligible raffles",
          noRaffles: "You are not eligible for any raffle yet.",
          badgeTitle: "My badges",
        },
    [lang],
  );

  const questions = eventInfo?.survey?.builtin_questions || [];
  const survey = eventInfo?.survey;
  const surveyType = survey?.survey_type;
  const supportsBuiltin = surveyType === "builtin" || surveyType === "both";
  const supportsExternal = surveyType === "external" || surveyType === "both";
  const hasSurveyAccess = Boolean(surveyToken && attendeeId && attendeeEmail);

  async function loadStatus(nextSurveyToken: string) {
    if (!eventId || !nextSurveyToken) {
      setParticipantStatus(null);
      return;
    }

    setStatusLoading(true);
    try {
      const status = await getPublicParticipantStatus(eventId, nextSurveyToken);
      setParticipantStatus(status);
    } catch {
      setParticipantStatus(null);
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    if (!eventId) return;

    async function loadPage() {
      setLoading(true);
      setError(null);

      try {
        const eventData = await getPublicEventInfo(eventId);
        setEventInfo(eventData);

        const search = typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams();
        const tokenFromQuery = (search.get("token") || "").trim();
        const tokenFromStorage = typeof window !== "undefined"
          ? localStorage.getItem(`heptacert_survey_token_${eventId}`) || ""
          : "";
        const resolvedToken = tokenFromQuery || tokenFromStorage;

        if (!resolvedToken) return;

        const access = await resolvePublicSurveyToken(eventId, resolvedToken);
        setSurveyToken(access.survey_token);
        setAttendeeId(access.attendee_id);
        setAttendeeEmail(access.attendee_email);
        await loadStatus(access.survey_token);

        if (typeof window !== "undefined") {
          localStorage.setItem(`heptacert_survey_token_${eventId}`, access.survey_token);
          localStorage.setItem(`heptacert_attendee_${eventId}`, String(access.attendee_id));
          localStorage.setItem(`heptacert_attendee_email_${eventId}`, access.attendee_email);
          if (localStorage.getItem(`heptacert_survey_done_${eventId}_${access.attendee_id}`) === "1") {
            setSaved(true);
          }
        }
      } catch (err: any) {
        setError(err?.message || copy.loadFailed);
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [copy.loadFailed, eventId]);

  async function handleSubmit(eventArg: React.FormEvent) {
    eventArg.preventDefault();

    if (!hasSurveyAccess || !attendeeId) {
      setError(copy.privateLink);
      return;
    }

    const missingRequired = questions.find((question) => question.required && !String(answers[question.id] ?? "").trim());
    if (missingRequired) {
      setError(copy.requiredQuestions);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await submitBuiltinSurvey(eventId, attendeeId, answers, surveyToken);
      setSaved(true);
      if (typeof window !== "undefined") {
        localStorage.setItem(`heptacert_survey_done_${eventId}_${attendeeId}`, "1");
      }
      await loadStatus(surveyToken);
    } catch (err: any) {
      setError(err?.message || copy.submitFailed);
    } finally {
      setSaving(false);
    }
  }

  function renderBadgeCard(badge: PublicParticipantBadge) {
    const color = badge.badge_color_hex || "#2563eb";
    return (
      <div key={badge.id} className="rounded-3xl border border-outline-subtle bg-raised p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-black text-content-primary">{badge.badge_name || badge.badge_type}</p>
            {badge.badge_description ? (
              <p className="mt-1 text-sm leading-6 text-content-secondary">{badge.badge_description}</p>
            ) : null}
          </div>
          <div
            className="inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
            style={{ color, borderColor: `${color}50`, backgroundColor: `${color}12` }}
          >
            <Award className="h-3.5 w-3.5" />
            {badge.is_automatic ? copy.automatic : copy.manual}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-content-muted">
          <span className="rounded-full border border-outline-subtle bg-canvas px-3 py-1">
            {copy.type}: {badge.badge_type}
          </span>
          <span className="rounded-full border border-outline-subtle bg-canvas px-3 py-1">
            {new Date(badge.awarded_at).toLocaleString(localeTag(lang))}
          </span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Loader2 className="h-8 w-8 animate-spin text-status-info-content" />
      </div>
    );
  }

  if (!eventInfo) {
    return (
      <div className="min-h-screen bg-canvas p-6">
        <div className="mx-auto max-w-xl rounded-3xl border border-outline-subtle bg-raised p-6 text-center shadow-sm">
          <p className="text-base font-semibold text-content-primary">{copy.eventNotFound}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href={`/events/${eventId}/register`}
          className="inline-flex items-center gap-2 rounded-full border border-outline-subtle bg-raised px-4 py-2 text-sm font-semibold text-content-secondary shadow-sm transition hover:border-outline-strong hover:text-content-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </Link>

        <div className="overflow-hidden rounded-[32px] border border-outline-subtle bg-raised shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-outline-subtle bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.14),_transparent_38%),linear-gradient(135deg,_#ffffff_15%,_#eef2ff_100%)] px-6 py-7 md:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-status-info-border bg-status-info-bg px-3 py-1 text-xs font-semibold text-status-info-content">
              <Sparkles className="h-3.5 w-3.5" />
              {copy.flow}
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-content-primary">{eventInfo.name}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-content-secondary">{copy.intro}</p>
          </div>

          <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
            {!survey ? (
              <div className="rounded-3xl border border-dashed border-outline-strong bg-canvas px-5 py-8 text-center text-sm text-content-muted">
                {copy.surveyMissing}
              </div>
            ) : null}

            {!hasSurveyAccess ? (
              <div className="rounded-3xl border border-status-warning-border bg-status-warning-bg p-5 md:p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-status-warning-bg p-3 text-status-warning-content">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-black text-status-warning-content">{copy.privateRequiredTitle}</h2>
                    <p className="mt-2 text-sm leading-6 text-status-warning-content">{copy.privateRequiredBody}</p>
                    {error ? (
                      <div className="mt-4 inline-flex items-start gap-2 rounded-2xl border border-status-danger-border bg-status-danger-bg px-4 py-3 text-sm text-status-danger-content">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        {error}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {supportsExternal && survey?.external_url ? (
              <div className="rounded-3xl border border-status-info-border bg-status-info-bg p-5 md:p-6">
                <h2 className="text-lg font-black text-status-info-content">{copy.externalTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-status-info-content">{copy.externalBody}</p>
                <a
                  href={survey.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  {copy.openExternal}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ) : null}

            {supportsBuiltin && survey?.has_builtin_questions ? (
              <form onSubmit={handleSubmit} className="rounded-3xl border border-outline-subtle bg-canvas p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-content-primary">{copy.builtinTitle}</h2>
                    <p className="mt-2 text-sm text-content-secondary">{copy.builtinSubtitle}</p>
                  </div>
                  <span className="rounded-full border border-outline-subtle bg-raised px-3 py-1 text-xs font-semibold text-content-secondary">
                    {survey.is_required ? copy.required : copy.optional}
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  {questions.map((question, index) => {
                    const fieldType = renderFieldType(question);
                    return (
                      <div key={question.id} className="rounded-2xl border border-outline-subtle bg-raised p-4">
                        <label className="block text-sm font-semibold text-content-primary">
                          {index + 1}. {question.question}
                          {question.required ? <span className="ml-1 text-status-danger-content">*</span> : null}
                        </label>

                        {fieldType === "textarea" ? (
                          <textarea
                            rows={4}
                            value={String(answers[question.id] ?? "")}
                            onChange={(eventArg) => setAnswers((current) => ({ ...current, [question.id]: eventArg.target.value }))}
                            className="mt-3 w-full rounded-2xl border border-outline-subtle px-4 py-3 text-sm text-content-secondary outline-none transition focus:border-status-info-border focus:ring-2 focus:ring-status-info-border"
                          />
                        ) : fieldType === "select" ? (
                          <select
                            value={String(answers[question.id] ?? "")}
                            onChange={(eventArg) => setAnswers((current) => ({ ...current, [question.id]: eventArg.target.value }))}
                            className="mt-3 w-full rounded-2xl border border-outline-subtle px-4 py-3 text-sm text-content-secondary outline-none transition focus:border-status-info-border focus:ring-2 focus:ring-status-info-border"
                          >
                            <option value="">{lang === "tr" ? "Se?in" : "Select"}</option>
                            {(question.options || []).map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : fieldType === "rating" ? (
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={String(answers[question.id] ?? "")}
                            onChange={(eventArg) => setAnswers((current) => ({ ...current, [question.id]: eventArg.target.value }))}
                            className="mt-3 w-full rounded-2xl border border-outline-subtle px-4 py-3 text-sm text-content-secondary outline-none transition focus:border-status-info-border focus:ring-2 focus:ring-status-info-border"
                          />
                        ) : (
                          <input
                            type="text"
                            value={String(answers[question.id] ?? "")}
                            onChange={(eventArg) => setAnswers((current) => ({ ...current, [question.id]: eventArg.target.value }))}
                            className="mt-3 w-full rounded-2xl border border-outline-subtle px-4 py-3 text-sm text-content-secondary outline-none transition focus:border-status-info-border focus:ring-2 focus:ring-status-info-border"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {error ? (
                  <div className="mt-5 rounded-2xl border border-status-danger-border bg-status-danger-bg px-4 py-3 text-sm text-status-danger-content">
                    {error}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-content-muted">{attendeeEmail}</div>
                  <button type="submit" disabled={saving || !hasSurveyAccess} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {copy.send}
                  </button>
                </div>
              </form>
            ) : null}

            {saved ? (
              <div className="rounded-3xl border border-status-success-border bg-status-success-bg p-5 text-status-success-content">
                <div className="flex items-center gap-2 text-base font-semibold">
                  <CheckCircle2 className="h-5 w-5" />
                  {copy.sent}
                </div>
                <p className="mt-2 text-sm leading-6 text-status-success-content">{copy.thankYou}</p>
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-outline-subtle bg-raised p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-content-primary">
                  <Ticket className="h-4 w-4 text-status-info-content" />
                  {copy.statusTitle}
                </div>
                {statusLoading ? (
                  <div className="mt-4 flex items-center gap-2 text-sm text-content-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {lang === "tr" ? "Durum g?ncelleniyor..." : "Refreshing status..."}
                  </div>
                ) : participantStatus ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-outline-subtle bg-canvas px-4 py-3 text-sm text-content-secondary">
                      {copy.sessions}: <span className="font-semibold">{participantStatus.sessions_attended}/{participantStatus.sessions_required}</span>
                    </div>
                    <div className="rounded-2xl border border-outline-subtle bg-canvas px-4 py-3 text-sm text-content-secondary">
                      {copy.survey}: <span className="font-semibold">{participantStatus.survey_completed ? copy.completed : copy.pending}</span>
                    </div>
                    <div className="rounded-2xl border border-outline-subtle bg-canvas px-4 py-3 text-sm text-content-secondary">
                      {copy.badges}: <span className="font-semibold">{participantStatus.badge_count}</span>
                    </div>
                    <div className="rounded-2xl border border-outline-subtle bg-canvas px-4 py-3 text-sm text-content-secondary">
                      {copy.certificate}: <span className="font-semibold">{participantStatus.certificate_ready ? copy.ready : copy.notReady}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-content-muted">
                    {lang === "tr" ? "Durum bilgisi henüz yüklenemedi." : "Status is not available yet."}
                  </div>
                )}

                <div className="mt-5">
                  <p className="text-sm font-semibold text-content-primary">{copy.eligibleRaffles}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {participantStatus?.eligible_raffles?.length ? (
                      participantStatus.eligible_raffles.map((raffle) => (
                        <span key={raffle.id} className="rounded-full border border-status-warning-border bg-status-warning-bg px-3 py-1 text-xs font-semibold text-status-warning-content">
                          {raffle.title}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-content-muted">{copy.noRaffles}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-outline-subtle bg-raised p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-content-primary">
                  <Award className="h-4 w-4 text-status-info-content" />
                  {copy.badgeTitle}
                </div>
                <div className="mt-4 space-y-3">
                  {participantStatus?.badges?.length ? (
                    participantStatus.badges.map(renderBadgeCard)
                  ) : (
                    <div className="rounded-3xl border border-dashed border-outline-strong bg-canvas px-5 py-8 text-center text-sm text-content-muted">
                      {copy.badgeEmpty}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
