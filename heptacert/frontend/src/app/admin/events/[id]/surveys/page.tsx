"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  LockKeyhole,
  Plus,
  Save,
  Search,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import EventAdminNav from "@/components/Admin/EventAdminNav";

type SurveyQuestion = {
  id: string;
  type: string;
  question: string;
  required: boolean;
  options?: string[];
};

type EventSurvey = {
  id: number;
  event_id: number;
  is_required: boolean;
  survey_type: "builtin" | "external" | "both";
  builtin_questions: SurveyQuestion[];
  external_provider?: string | null;
  external_url?: string | null;
  external_webhook_key?: string | null;
  created_at: string;
  updated_at: string;
};

type SurveyResponse = {
  id: number;
  event_id: number;
  attendee_id: number;
  attendee_name?: string | null;
  attendee_email?: string | null;
  survey_type: "builtin" | "external";
  answers?: Record<string, unknown> | null;
  external_response_id?: string | null;
  completed_at: string;
  completion_proof?: Record<string, any> | null;
};

type ResponseStats = {
  completed: number;
  pending: number;
};

const QUESTION_TYPES = [
  { value: "text", label: "Kısa Metin" },
  { value: "textarea", label: "Uzun Metin" },
  { value: "multiple_choice", label: "Çoktan Seçmeli" },
  { value: "rating", label: "Değerlendirme" },
  { value: "yes_no", label: "Evet/Hayır" },
];

const EXTERNAL_PROVIDERS = [
  { value: "typeform", label: "Typeform" },
  { value: "qualtrics", label: "Qualtrics" },
  { value: "google_forms", label: "Google Forms" },
  { value: "surveymonkey", label: "SurveyMonkey" },
];

function getQuestionTypeLabel(type: string) {
  return QUESTION_TYPES.find((item) => item.value === type)?.label || type;
}

function formatAnswer(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Yanıt yok";
  }
  if (typeof value === "boolean") {
    return value ? "Evet" : "Hayır";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export default function SurveysPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [config, setConfig] = useState<EventSurvey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [responseStats, setResponseStats] = useState<ResponseStats>({ completed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"config" | "responses">("config");
  const [responseQuery, setResponseQuery] = useState("");
  const [responseTypeFilter, setResponseTypeFilter] = useState<"all" | "builtin" | "external">("all");

  const [isRequired, setIsRequired] = useState(true);
  const [surveyType, setSurveyType] = useState<"builtin" | "external" | "both">("builtin");
  const [builtinQuestions, setBuiltinQuestions] = useState<SurveyQuestion[]>([]);
  const [externalProvider, setExternalProvider] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [externalWebhookKey, setExternalWebhookKey] = useState("");
  const [newQuestion, setNewQuestion] = useState<Partial<SurveyQuestion>>({
    type: "text",
    required: true,
  });

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [configRes, responsesRes] = await Promise.all([
        apiFetch(`/admin/events/${eventId}/survey-config`, { method: "GET" }),
        apiFetch(`/admin/events/${eventId}/surveys/responses`, { method: "GET" }),
      ]);

      const configData = configRes ? await configRes.json() : null;
      const responsesData = responsesRes ? await responsesRes.json() : null;

      if (configData) {
        setConfig(configData);
        setIsRequired(Boolean(configData.is_required));
        setSurveyType((configData.survey_type || "builtin") as "builtin" | "external" | "both");
        setBuiltinQuestions(configData.builtin_questions || []);
        setExternalProvider(configData.external_provider || "");
        setExternalUrl(configData.external_url || "");
        setExternalWebhookKey(configData.external_webhook_key || "");
      } else {
        setConfig(null);
        setIsRequired(true);
        setSurveyType("builtin");
        setBuiltinQuestions([]);
        setExternalProvider("");
        setExternalUrl("");
        setExternalWebhookKey("");
      }

      setResponses(responsesData?.responses || []);
      setResponseStats({
        completed: Number(responsesData?.response_rate?.completed || 0),
        pending: Number(responsesData?.response_rate?.pending || 0),
      });
    } catch (err: any) {
      setError(err.message || "Anket verisi yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch(`/admin/events/${eventId}/survey-config`, {
        method: "POST",
        body: JSON.stringify({
          is_required: isRequired,
          survey_type: surveyType,
          builtin_questions: builtinQuestions,
          external_provider: externalProvider || null,
          external_url: externalUrl || null,
          external_webhook_key: externalWebhookKey || null,
        }),
      });

      setSuccess("Anket ayarları kaydedildi");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    const questionId = (newQuestion.id || "").trim();
    const questionText = (newQuestion.question || "").trim();

    if (!questionId || !questionText) {
      setError("Soru ID ve soru metni zorunludur");
      return;
    }

    if (builtinQuestions.some((question) => question.id === questionId)) {
      setError("Aynı soru ID zaten kullanılıyor");
      return;
    }

    if (
      newQuestion.type === "multiple_choice" &&
      (!newQuestion.options || newQuestion.options.length === 0)
    ) {
      setError("Çoktan seçmeli sorular için en az bir seçenek girin");
      return;
    }

    setBuiltinQuestions([
      ...builtinQuestions,
      {
        id: questionId,
        question: questionText,
        type: newQuestion.type || "text",
        required: Boolean(newQuestion.required),
        options: newQuestion.options || [],
      },
    ]);
    setNewQuestion({ type: "text", required: true });
    setError(null);
  };

  const removeQuestion = (index: number) => {
    setBuiltinQuestions(builtinQuestions.filter((_, itemIndex) => itemIndex !== index));
  };

  const questionLabelMap = useMemo(() => {
    return Object.fromEntries(
      builtinQuestions.map((question) => [question.id, question.question])
    );
  }, [builtinQuestions]);

  const filteredResponses = useMemo(() => {
    return responses.filter((response) => {
      const matchesType = responseTypeFilter === "all" || response.survey_type === responseTypeFilter;
      const haystack = [
        response.attendee_name,
        response.attendee_email,
        response.attendee_id,
        response.external_response_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !responseQuery.trim() || haystack.includes(responseQuery.trim().toLowerCase());
      return matchesType && matchesQuery;
    });
  }, [responseQuery, responseTypeFilter, responses]);

  const builtinQuestionCount = builtinQuestions.length;
  const completionRate = responseStats.completed + responseStats.pending > 0
    ? Math.round((responseStats.completed / (responseStats.completed + responseStats.pending)) * 100)
    : 0;
  const webhookEndpoint = `/api/surveys/external/webhook?event_id=${eventId}&attendee_id=[ATTENDEE_ID]`;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/admin/events/${eventId}`}>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-700 shadow-sm transition hover:border-brand-200 hover:text-brand-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Katılımcı Anketleri</h1>
            <p className="mt-1 text-sm text-gray-500">Anket kurgusunu yönetin, cevapları izleyin ve sertifika akışına etkisini kontrol edin.</p>
          </div>
        </div>
      </div>

      <EventAdminNav eventId={eventId} active="surveys" className="mb-2 flex flex-col gap-2 border-b border-gray-200 pb-4" />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Anket Modu",
            value: surveyType === "both" ? "Çift Akış" : surveyType === "builtin" ? "Yerleşik" : "Harici",
            hint: isRequired ? "Sertifika öncesi zorunlu" : "Opsiyonel deneyim",
            icon: ClipboardList,
          },
          {
            label: "Soru Sayısı",
            value: String(builtinQuestionCount),
            hint: builtinQuestionCount > 0 ? "Hazır sorular mevcut" : "Soru tanımlanmadı",
            icon: FileText,
          },
          {
            label: "Tamamlayanlar",
            value: String(responseStats.completed),
            hint: `${completionRate}% tamamlanma`,
            icon: CheckCircle2,
          },
          {
            label: "Bekleyenler",
            value: String(responseStats.pending),
            hint: "Henüz yanıt vermeyenler",
            icon: Users,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-gray-900">{item.value}</p>
                  <p className="mt-2 text-sm text-gray-500">{item.hint}</p>
                </div>
                <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: "config", label: "Anket Ayarları" },
          { key: "responses", label: `Cevaplar (${responses.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "config" | "responses")}
            className={`px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-brand-600 text-brand-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-700">{success}</p>
        </motion.div>
      )}

      {activeTab === "config" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.4fr,0.9fr]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Genel Kurgu</h2>
                    <p className="mt-1 text-sm text-gray-500">Anketin sertifika akışını nasıl etkileyeceğini ve hangi kanal ile toplanacağını belirleyin.</p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold ${isRequired ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>
                    {isRequired ? "Zorunlu" : "Opsiyonel"}
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-amber-50 p-5">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isRequired}
                      onChange={(event) => setIsRequired(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded"
                    />
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <LockKeyhole className="h-4 w-4 text-brand-600" />
                        Sertifika öncesi anketi zorunlu tut
                      </div>
                      <p className="mt-1 text-sm text-gray-600">Açılırsa katılımcı sertifika indirmeden önce anketi tamamlamak zorunda olur. Kapatılırsa anket sadece geri bildirim aracı olarak kalır.</p>
                    </div>
                  </label>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  {[
                    { value: "builtin", title: "Yerleşik Form", description: "Tüm soru ve cevaplar panel içinde toplanır." },
                    { value: "external", title: "Harici Sağlayıcı", description: "Typeform veya benzeri bir aracı bağlayın." },
                    { value: "both", title: "Hibrit Kullanım", description: "İsterseniz iki akışı birlikte sunun." },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSurveyType(item.value as "builtin" | "external" | "both")}
                      className={`rounded-2xl border p-4 text-left transition ${
                        surveyType === item.value
                          ? "border-brand-500 bg-brand-50 shadow-sm"
                          : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white"
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{item.title}</div>
                      <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {(surveyType === "builtin" || surveyType === "both") && (
                <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Yerleşik Sorular</h2>
                      <p className="mt-1 text-sm text-gray-500">Katılımcılardan toplayacağınız soru setini oluşturun.</p>
                    </div>
                    <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                      {builtinQuestionCount} soru
                    </div>
                  </div>

                  {builtinQuestions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                      Henüz soru eklenmedi. İlk soruyu aşağıdaki formdan oluşturabilirsiniz.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {builtinQuestions.map((question, index) => (
                        <motion.div
                          key={`${question.id}-${index}`}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">#{question.id}</span>
                                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">{getQuestionTypeLabel(question.type)}</span>
                                {question.required ? (
                                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Zorunlu</span>
                                ) : (
                                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Opsiyonel</span>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{question.question}</p>
                                {question.type === "multiple_choice" && question.options?.length ? (
                                  <p className="mt-2 text-sm text-gray-500">Seçenekler: {question.options.join(", ")}</p>
                                ) : null}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeQuestion(index)}
                              className="rounded-xl p-2 text-red-600 transition hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-5">
                    <h3 className="text-base font-semibold text-gray-900">Yeni Soru Ekle</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">Soru ID</label>
                        <input
                          type="text"
                          placeholder="q1"
                          value={newQuestion.id || ""}
                          onChange={(event) => setNewQuestion({ ...newQuestion, id: event.target.value })}
                          className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">Soru Türü</label>
                        <select
                          value={newQuestion.type || "text"}
                          onChange={(event) => setNewQuestion({ ...newQuestion, type: event.target.value })}
                          className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
                        >
                          {QUESTION_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-semibold text-gray-700">Soru Metni</label>
                      <textarea
                        placeholder="Sorunuzu yazın"
                        value={newQuestion.question || ""}
                        onChange={(event) => setNewQuestion({ ...newQuestion, question: event.target.value })}
                        className="min-h-24 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
                      />
                    </div>

                    {newQuestion.type === "multiple_choice" && (
                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-semibold text-gray-700">Seçenekler</label>
                        <textarea
                          placeholder="Her satıra bir seçenek girin"
                          value={(newQuestion.options || []).join("\n")}
                          onChange={(event) =>
                            setNewQuestion({
                              ...newQuestion,
                              options: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                            })
                          }
                          className="min-h-24 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
                        />
                      </div>
                    )}

                    <label className="mt-4 flex items-center gap-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={Boolean(newQuestion.required)}
                        onChange={(event) => setNewQuestion({ ...newQuestion, required: event.target.checked })}
                        className="h-4 w-4 rounded"
                      />
                      Bu soru zorunlu olsun
                    </label>

                    <button
                      type="button"
                      onClick={addQuestion}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                    >
                      <Plus className="h-4 w-4" />
                      Soruyu Ekle
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {(surveyType === "external" || surveyType === "both") && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Harici Sağlayıcı</h2>
                      <p className="mt-1 text-sm text-gray-500">Typeform veya benzeri bir araçtan yanıt alıp sertifika akışına bağlayın.</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                      <Link2 className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">Sağlayıcı</label>
                      <select
                        value={externalProvider}
                        onChange={(event) => setExternalProvider(event.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
                      >
                        <option value="">Seçin</option>
                        {EXTERNAL_PROVIDERS.map((provider) => (
                          <option key={provider.value} value={provider.value}>{provider.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">Anket URL</label>
                      <input
                        type="url"
                        placeholder="https://example.typeform.com/..."
                        value={externalUrl}
                        onChange={(event) => setExternalUrl(event.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">Webhook Anahtarı</label>
                      <input
                        type="text"
                        placeholder="Webhook verification key"
                        value={externalWebhookKey}
                        onChange={(event) => setExternalWebhookKey(event.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 font-mono text-sm"
                      />
                      <p className="mt-2 text-xs text-gray-500">Boş bırakırsanız sistem otomatik anahtar üretir.</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <ExternalLink className="h-4 w-4 text-brand-600" />
                      Webhook Bağlantı Bilgisi
                    </div>
                    <code className="mt-3 block rounded-xl bg-white p-3 text-xs text-gray-700 break-all">POST {webhookEndpoint}</code>
                    <p className="mt-2 text-xs text-gray-500">Harici sağlayıcınız her tamamlanan anketten sonra bu endpointi çağırmalı ve <span className="font-mono">X-Webhook-Key</span> header'ı ile anahtarı göndermeli.</p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-gray-200 bg-slate-950 p-6 text-white shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-300">Canlı Özet</p>
                    <h3 className="mt-2 text-xl font-semibold">Katılımcı akışı hazır</h3>
                    <p className="mt-2 text-sm text-slate-300">Mevcut kurguda katılımcı {isRequired ? "anketi bitirince" : "isterse ankete girip"} sertifika adımına devam edecek.</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-5 grid gap-3 text-sm text-slate-200">
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">Mod: <span className="font-semibold">{surveyType === "both" ? "Yerleşik + Harici" : surveyType === "builtin" ? "Yerleşik" : "Harici"}</span></div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">Soru sayısı: <span className="font-semibold">{builtinQuestionCount}</span></div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">Webhook: <span className="font-semibold">{externalWebhookKey ? "Hazır" : surveyType === "builtin" ? "Gerekmiyor" : "Kayıt anında üretilecek"}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Anket Ayarlarını Kaydet
            </button>
          </div>
        </div>
      )}

      {activeTab === "responses" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Toplam Yanıt</p>
              <p className="mt-3 text-3xl font-semibold text-gray-900">{responses.length}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Tamamlama Oranı</p>
              <p className="mt-3 text-3xl font-semibold text-gray-900">%{completionRate}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Filtre Sonucu</p>
              <p className="mt-3 text-3xl font-semibold text-gray-900">{filteredResponses.length}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr,200px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={responseQuery}
                  onChange={(event) => setResponseQuery(event.target.value)}
                  placeholder="Ad, e-posta veya external response ID ara"
                  className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm"
                />
              </label>
              <select
                value={responseTypeFilter}
                onChange={(event) => setResponseTypeFilter(event.target.value as "all" | "builtin" | "external")}
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
              >
                <option value="all">Tüm Yanıtlar</option>
                <option value="builtin">Yerleşik</option>
                <option value="external">Harici</option>
              </select>
            </div>
          </div>

          {filteredResponses.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
              <FileText className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <p className="text-base font-semibold text-gray-800">Henüz gösterilecek anket cevabı yok</p>
              <p className="mt-2 text-sm text-gray-500">Filtreleri temizleyin veya katılımcıların anketi tamamlamasını bekleyin.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResponses.map((response) => {
                const answerEntries = Object.entries(response.answers || {});
                return (
                  <motion.div
                    key={response.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {response.attendee_name || `Katılımcı #${response.attendee_id}`}
                          </h3>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${response.survey_type === "external" ? "bg-amber-100 text-amber-800" : "bg-brand-100 text-brand-700"}`}>
                            {response.survey_type === "external" ? "Harici" : "Yerleşik"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{response.attendee_email || "E-posta bilgisi yok"}</p>
                        <p className="mt-2 text-xs text-gray-400">{new Date(response.completed_at).toLocaleString("tr-TR")}</p>
                        {response.external_response_id ? (
                          <p className="mt-2 text-xs font-medium text-gray-500">External Response ID: <span className="font-mono text-gray-700">{response.external_response_id}</span></p>
                        ) : null}
                      </div>
                      <div className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                        Tamamlandı
                      </div>
                    </div>

                    {answerEntries.length > 0 ? (
                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        {answerEntries.map(([questionId, answer]) => (
                          <div key={questionId} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{questionId}</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">{questionLabelMap[questionId] || questionId}</p>
                            <p className="mt-2 text-sm text-gray-600">{formatAnswer(answer)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                        Bu yanıt kaydında gösterilecek yerleşik soru cevabı bulunmuyor.
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
