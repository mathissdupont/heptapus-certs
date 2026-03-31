"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  getPublicAttendeeBadges,
  getPublicEventInfo,
  submitBuiltinSurvey,
  type PublicParticipantBadge,
} from "@/lib/api";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";

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

const badgeDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

function BadgeGallery({ badges }: { badges: PublicParticipantBadge[] }) {
  if (badges.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
        Henüz görünür bir rozetiniz yok. Rozet verildiğinde burada görünecek.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {badges.map((badge) => {
        const color = badge.badge_color_hex || "#2563eb";
        return (
          <div
            key={badge.id}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-black text-slate-900">
                  {badge.badge_name || badge.badge_type}
                </p>
                {badge.badge_description ? (
                  <p className="mt-1 text-sm leading-6 text-slate-600">{badge.badge_description}</p>
                ) : null}
              </div>
              <div
                className="inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
                style={{
                  color,
                  borderColor: `${color}50`,
                  backgroundColor: `${color}12`,
                }}
              >
                <Award className="h-3.5 w-3.5" />
                {badge.is_automatic ? "Otomatik" : "Manuel"}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                Tür: {badge.badge_type}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                {badgeDateFormatter.format(new Date(badge.awarded_at))}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function EventSurveyPage() {
  const params = useParams();
  const search = useSearchParams();
  const eventId = Number(params?.id);

  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attendeeId, setAttendeeId] = useState<number | null>(null);
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [badges, setBadges] = useState<PublicParticipantBadge[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(false);

  const questions = useMemo(() => eventInfo?.survey?.builtin_questions || [], [eventInfo]);

  async function loadBadges(nextAttendeeId: number, nextEmail: string) {
    if (!eventId || !nextAttendeeId || !nextEmail) {
      setBadges([]);
      return;
    }

    setBadgesLoading(true);
    try {
      const data = await getPublicAttendeeBadges(eventId, nextAttendeeId, nextEmail);
      setBadges(data.badges || []);
    } catch {
      setBadges([]);
    } finally {
      setBadgesLoading(false);
    }
  }

  useEffect(() => {
    if (!eventId) return;

    const attendeeFromQuery = Number(search.get("attendee_id"));
    const attendeeFromStorage = Number(
      typeof window !== "undefined" ? localStorage.getItem(`heptacert_attendee_${eventId}`) : "",
    );
    const emailFromQuery = (search.get("email") || "").trim();
    const emailFromStorage =
      typeof window !== "undefined" ? localStorage.getItem(`heptacert_attendee_email_${eventId}`) || "" : "";

    const resolvedAttendeeId = !Number.isNaN(attendeeFromQuery) && attendeeFromQuery > 0
      ? attendeeFromQuery
      : !Number.isNaN(attendeeFromStorage) && attendeeFromStorage > 0
        ? attendeeFromStorage
        : null;
    const resolvedEmail = emailFromQuery || emailFromStorage;

    if (resolvedAttendeeId) {
      setAttendeeId(resolvedAttendeeId);
      if (typeof window !== "undefined") {
        localStorage.setItem(`heptacert_attendee_${eventId}`, String(resolvedAttendeeId));
        if (localStorage.getItem(`heptacert_survey_done_${eventId}_${resolvedAttendeeId}`) === "1") {
          setSaved(true);
        }
      }
    }

    if (resolvedEmail) {
      setAttendeeEmail(resolvedEmail);
      if (typeof window !== "undefined") {
        localStorage.setItem(`heptacert_attendee_email_${eventId}`, resolvedEmail);
      }
    }

    getPublicEventInfo(eventId)
      .then((data) => setEventInfo(data))
      .catch(() => setError("Etkinlik bilgisi alınamadı."))
      .finally(() => setLoading(false));
  }, [eventId, search]);

  useEffect(() => {
    if (attendeeId && attendeeEmail) {
      void loadBadges(attendeeId, attendeeEmail);
    }
  }, [attendeeEmail, attendeeId, eventId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!attendeeId) {
      setError("Anket göndermek için katılımcı bilgisi bulunamadı. Kayıt sayfasından tekrar giriş yapın.");
      return;
    }

    const missingRequired = questions.find((question) => question.required && !String(answers[question.id] ?? "").trim());
    if (missingRequired) {
      setError("Lütfen zorunlu soruları doldurun.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await submitBuiltinSurvey(eventId, attendeeId, answers);
      setSaved(true);
      if (typeof window !== "undefined") {
        localStorage.setItem(`heptacert_survey_done_${eventId}_${attendeeId}`, "1");
      }
      if (attendeeEmail) {
        await loadBadges(attendeeId, attendeeEmail);
      }
    } catch (err: any) {
      setError(err.message || "Anket gönderilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!eventInfo) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-800">Etkinlik bulunamadı.</p>
        </div>
      </div>
    );
  }

  const survey = eventInfo.survey;
  const surveyType = survey?.survey_type;
  const supportsBuiltin = surveyType === "builtin" || surveyType === "both";
  const supportsExternal = surveyType === "external" || surveyType === "both";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href={`/events/${eventId}/register`}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kayıt sayfasına dön
        </Link>

        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.14),_transparent_38%),linear-gradient(135deg,_#ffffff_15%,_#eef2ff_100%)] px-6 py-7 md:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              Katılımcı anket akışı
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">{eventInfo.name} Anketi</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Sertifika öncesi geri bildirimi bu sayfadan tamamlayabilir, varsa harici anket bağlantısına geçebilir ve kazandığınız rozetleri görebilirsiniz.
            </p>
          </div>

          <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
            {!survey ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                Bu etkinlik için henüz bir anket tanımlanmamış.
              </div>
            ) : null}

            {survey && !survey.is_required ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
                Bu etkinlikte anket zorunlu değil. Yine de doldurursanız organizasyon geri bildirim toplayabilir.
              </div>
            ) : null}

            {supportsExternal && survey?.external_url ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Harici anket bağlantısı hazır</p>
                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      {supportsBuiltin
                        ? "Yerleşik formu bu sayfadan doldurabilir, isterseniz harici anket bağlantısına da geçebilirsiniz."
                        : "Anket bu etkinlikte harici sağlayıcı üzerinden toplanıyor."}
                    </p>
                  </div>
                  <a
                    href={survey.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-amber-400"
                  >
                    Harici anketi aç
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ) : null}

            {supportsBuiltin && survey?.has_builtin_questions ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 md:p-6">
                <div className="mb-5">
                  <h2 className="text-xl font-black text-slate-900">Yerleşik anket soruları</h2>
                  <p className="mt-1 text-sm text-slate-500">Yanıtlarınız doğrudan etkinlik paneline kaydedilir.</p>
                </div>

                {!saved ? (
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    {questions.map((question) => (
                      <div key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <label className="mb-2 block text-sm font-semibold text-slate-800">
                          {question.question} {question.required ? <span className="text-rose-500">*</span> : null}
                        </label>

                        {question.type === "multiple_choice" && Array.isArray(question.options) && question.options.length > 0 ? (
                          <select
                            value={String(answers[question.id] ?? "")}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                          >
                            <option value="">Seçiniz</option>
                            {question.options.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : question.type === "yes_no" ? (
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { value: "yes", label: "Evet" },
                              { value: "no", label: "Hayır" },
                            ].map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option.value }))}
                                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                                  String(answers[question.id] ?? "") === option.value
                                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        ) : question.type === "rating" ? (
                          <input
                            type="number"
                            min={1}
                            max={5}
                            value={String(answers[question.id] ?? "")}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                            placeholder="1-5"
                          />
                        ) : question.type === "text" ? (
                          <input
                            type="text"
                            value={String(answers[question.id] ?? "")}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                            placeholder="Yanıtınızı yazın"
                          />
                        ) : (
                          <textarea
                            value={String(answers[question.id] ?? "")}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                            className="min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400"
                            placeholder="Yanıtınızı yazın"
                          />
                        )}
                      </div>
                    ))}

                    {error ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Anketi gönder
                    </button>
                  </form>
                ) : (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-900">
                    <div className="flex items-center gap-2 text-base font-semibold">
                      <CheckCircle2 className="h-5 w-5" />
                      Anketiniz alındı
                    </div>
                    <p className="mt-2 text-sm leading-6 text-emerald-800">
                      Teşekkürler. Sertifika akışına devam edebilirsiniz. Rozetler atanırsa aşağıdaki bölümde görünecek.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {attendeeId && attendeeEmail ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
                <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Kazandığınız rozetler</h2>
                    <p className="mt-1 text-sm text-slate-500">Etkinlik yönetimi tarafından verilen rozetler burada görünür.</p>
                  </div>
                  {badgesLoading ? (
                    <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Rozetler yükleniyor
                    </div>
                  ) : null}
                </div>
                <BadgeGallery badges={badges} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
