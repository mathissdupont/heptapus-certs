"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getPublicEventInfo, submitBuiltinSurvey } from "@/lib/api";
import { Loader2, CheckCircle2, ArrowLeft, ExternalLink } from "lucide-react";

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
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!eventId) return;

    const attendeeFromQuery = Number(search.get("attendee_id"));
    const attendeeFromStorage = Number(
      typeof window !== "undefined" ? localStorage.getItem(`heptacert_attendee_${eventId}`) : ""
    );

    if (!Number.isNaN(attendeeFromQuery) && attendeeFromQuery > 0) {
      setAttendeeId(attendeeFromQuery);
    } else if (!Number.isNaN(attendeeFromStorage) && attendeeFromStorage > 0) {
      setAttendeeId(attendeeFromStorage);
    }

    getPublicEventInfo(eventId)
      .then((data) => setEventInfo(data))
      .catch(() => setError("Etkinlik bilgisi alınamadı"))
      .finally(() => setLoading(false));
  }, [eventId, search]);

  const questions = useMemo(() => {
    return eventInfo?.survey?.builtin_questions || [];
  }, [eventInfo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!attendeeId) {
      setError("Anket göndermek için katılımcı bilgisi bulunamadı. Kayıt sayfasından tekrar girin.");
      return;
    }

    const missingRequired = questions.find((q) => q.required && !String(answers[q.id] ?? "").trim());
    if (missingRequired) {
      setError("Lütfen zorunlu soruları doldurun.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await submitBuiltinSurvey(eventId, attendeeId, answers);
      setSaved(true);
    } catch (err: any) {
      setError(err.message || "Anket gönderilemedi");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!eventInfo) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <p className="text-gray-700 font-semibold">Etkinlik bulunamadı</p>
        </div>
      </div>
    );
  }

  const survey = eventInfo.survey;
  const surveyType = survey?.survey_type;
  const supportsExternal = surveyType === "external" || surveyType === "both";
  const supportsBuiltin = surveyType === "builtin" || surveyType === "both";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link href={`/events/${eventId}/register`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Kayıt sayfasına dön
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900">{eventInfo.name} · Anket</h1>
          <p className="text-sm text-gray-500 mt-1">Sertifika öncesi geri bildirim adımı</p>

          {!survey?.is_required && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 text-sm">
              Bu etkinlikte anket zorunlu değil.
            </div>
          )}

          {supportsExternal && survey?.external_url && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800 font-semibold">Bu etkinlikte harici anket kullanılıyor</p>
              <p className="text-xs text-amber-700 mt-1">Anketi tamamladıktan sonra sertifika adımına geçebilirsiniz.</p>
              <a
                href={survey.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-500 text-black px-3 py-2 text-xs font-semibold hover:bg-amber-400"
              >
                Anketi Aç
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {supportsBuiltin && survey?.has_builtin_questions && !saved && (
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              {questions.map((q) => (
                <div key={q.id}>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    {q.question} {q.required ? <span className="text-red-500">*</span> : null}
                  </label>

                  {q.type === "multiple_choice" && Array.isArray(q.options) && q.options.length > 0 ? (
                    <select
                      value={String(answers[q.id] ?? "")}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="">Seçiniz</option>
                      {q.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : q.type === "yes_no" ? (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: "yes", label: "Evet" },
                        { value: "no", label: "HayÄ±r" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: option.value }))}
                          className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                            String(answers[q.id] ?? "") === option.value
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : q.type === "rating" ? (
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={String(answers[q.id] ?? "")}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                      placeholder="1-5"
                    />
                  ) : q.type === "text" ? (
                    <input
                      type="text"
                      value={String(answers[q.id] ?? "")}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                      placeholder="YanÄ±tÄ±nÄ±zÄ± yazÄ±n"
                    />
                  ) : (
                    <textarea
                      value={String(answers[q.id] ?? "")}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm min-h-24"
                      placeholder="Yanıtınızı yazın"
                    />
                  )}
                </div>
              ))}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Anketi Gönder
              </button>
            </form>
          )}

          {saved && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Anketiniz alındı
              </div>
              <p className="mt-1">Teşekkürler. Sertifika adımına geçebilirsiniz.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
