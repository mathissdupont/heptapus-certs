"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, Save, Plus, X, Loader2, CheckCircle2, AlertCircle,
  FileText, Link2, Trash2, Eye, Download, BarChart3, CalendarDays,
  User, UserCheck, QrCode, LockKeyhole, Mail, Target,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

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
  survey_type: string;
  builtin_questions: SurveyQuestion[];
  external_provider?: string;
  external_url?: string;
  created_at: string;
  updated_at: string;
};

type SurveyResponse = {
  id: number;
  event_id: number;
  attendee_id: number;
  survey_type: string;
  completed_at: string;
  completion_proof?: Record<string, any>;
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

export default function SurveysPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [config, setConfig] = useState<EventSurvey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"config" | "responses">("config");

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

  // Load data
  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configRes, responsesRes] = await Promise.all([
        apiFetch(`/admin/events/${eventId}/survey-config`, { method: "GET" }),
        apiFetch(`/admin/events/${eventId}/surveys/responses`, { method: "GET" }),
      ]);

      if (configRes) {
        const configData = await configRes.json();
        setConfig(configData);
        setIsRequired(configData.is_required);
        setSurveyType(configData.survey_type);
        setBuiltinQuestions(configData.builtin_questions || []);
        setExternalProvider(configData.external_provider || "");
        setExternalUrl(configData.external_url || "");
        setExternalWebhookKey(configData.external_webhook_key || "");
      } else {
        setBuiltinQuestions([]);
      }

      if (responsesRes) {
        const responsesData = await responsesRes.json();
        if (responsesData?.responses) {
          setResponses(responsesData.responses);
        }
      }
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
    if (!newQuestion.id || !newQuestion.question) {
      setError("Soru ID'si ve metni gereklidir");
      return;
    }

    if (
      newQuestion.type === "multiple_choice" &&
      (!newQuestion.options || newQuestion.options.length === 0)
    ) {
      setError("Çoktan seçmeli sorular için seçenekler gereklidir");
      return;
    }

    setBuiltinQuestions([
      ...builtinQuestions,
      newQuestion as SurveyQuestion,
    ]);

    setNewQuestion({ type: "text", required: true });
  };

  const removeQuestion = (index: number) => {
    setBuiltinQuestions(builtinQuestions.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/events/${eventId}`}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-lg p-2 hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Katılımcı Anketleri</h1>
            <p className="text-gray-500 text-sm mt-1">Geri bildirim almak için anket yapılandırın</p>
          </div>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-4">
        <Link href={`/admin/events/${eventId}/certificates`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <BarChart3 className="h-3.5 w-3.5" /> Sertifikalar
        </Link>
        <Link href={`/admin/events/${eventId}/sessions`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <CalendarDays className="h-3.5 w-3.5" /> Oturumlar
        </Link>
        <Link href={`/admin/events/${eventId}/attendees`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <User className="h-3.5 w-3.5" /> Katılımcılar
        </Link>
        <Link href={`/admin/events/${eventId}/checkin`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <QrCode className="h-3.5 w-3.5" /> Check-in
        </Link>
        <Link href={`/admin/events/${eventId}/gamification`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <Target className="h-3.5 w-3.5" /> Gamification
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-700">
          <UserCheck className="h-3.5 w-3.5" /> Anketler
        </span>
        <Link href={`/admin/events/${eventId}/advanced-analytics`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <BarChart3 className="h-3.5 w-3.5" /> Analitik
        </Link>
        <Link href={`/admin/events/${eventId}/email-templates`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <Mail className="h-3.5 w-3.5" /> Email
        </Link>
        <Link href={`/admin/events/${eventId}/settings`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
          <LockKeyhole className="h-3.5 w-3.5" /> Ayarlar
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {["config", "responses"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "config" | "responses")}
            className={`px-4 py-3 font-semibold text-sm transition-colors ${
              activeTab === tab
                ? "text-brand-600 border-b-2 border-brand-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab === "config" ? "Anket Ayarları" : `Cevaplar (${responses.length})`}
          </button>
        ))}
      </div>

      {/* Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-start gap-3"
        >
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-700 text-sm">{success}</p>
        </motion.div>
      )}

      {/* Config Tab */}
      {activeTab === "config" && (
        <div className="space-y-6">
          {/* General Settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Genel Ayarlar</h3>

            <div className="space-y-4">
              {/* Required Toggle */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="font-semibold text-gray-900">
                    Anket Zorunlu
                  </span>
                </label>
                <p className="text-gray-500 text-sm mt-2">
                  Etkinleştirilirse, katılımcılar sertifikamı indirmeden önce anketi tamamlaması gerekir.
                </p>
              </div>

              {/* Survey Type */}
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <label className="block font-semibold text-gray-900">Anket Türü</label>
                <div className="space-y-2">
                  {[
                    { value: "builtin", label: "Yerleşik Form" },
                    { value: "external", label: "Harici Sağlayıcı" },
                    { value: "both", label: "Her İkisi" },
                  ].map((type) => (
                    <label
                      key={type.value}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="survey_type"
                        value={type.value}
                        checked={surveyType === type.value}
                        onChange={(e) =>
                          setSurveyType(
                            e.target.value as "builtin" | "external" | "both"
                          )
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-gray-700">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Built-in Survey */}
          {(surveyType === "builtin" || surveyType === "both") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Sorular</h3>
                <span className="text-sm text-gray-500">
                  {builtinQuestions.length} soru
                </span>
              </div>

              {builtinQuestions.map((question, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="font-semibold text-gray-900">
                      Soru {idx + 1}
                    </div>
                    <button
                      onClick={() => removeQuestion(idx)}
                      className="p-1 hover:bg-red-50 rounded-lg text-red-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Soru ID
                        </label>
                        <input
                          disabled
                          type="text"
                          value={question.id}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Soru Türü
                        </label>
                        <select
                          disabled
                          value={question.type}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50"
                        >
                          {QUESTION_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Soru Metni
                      </label>
                      <textarea
                        disabled
                        value={question.question}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm h-16 bg-gray-50 resize-none"
                      />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled
                        checked={question.required}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-gray-700">Zorunlu</span>
                    </label>
                  </div>
                </motion.div>
              ))}

              {/* Add Question */}
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-4"
              >
                <h4 className="font-semibold text-gray-900 mb-4">Yeni Soru Ekle</h4>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Soru ID*
                      </label>
                      <input
                        type="text"
                        placeholder="q1"
                        value={newQuestion.id || ""}
                        onChange={(e) =>
                          setNewQuestion({ ...newQuestion, id: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Soru Türü*
                      </label>
                      <select
                        value={newQuestion.type || "text"}
                        onChange={(e) =>
                          setNewQuestion({
                            ...newQuestion,
                            type: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        {QUESTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Soru Metni*
                    </label>
                    <textarea
                      placeholder="Sorunuzu yazın..."
                      value={newQuestion.question || ""}
                      onChange={(e) =>
                        setNewQuestion({
                          ...newQuestion,
                          question: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm h-20 resize-none"
                    />
                  </div>

                  {newQuestion.type === "multiple_choice" && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Seçenekler (her satırda bir)
                      </label>
                      <textarea
                        placeholder="Seçenek 1&#10;Seçenek 2&#10;Seçenek 3"
                        value={(newQuestion.options || []).join("\n")}
                        onChange={(e) =>
                          setNewQuestion({
                            ...newQuestion,
                            options: e.target.value
                              .split("\n")
                              .filter((o) => o.trim()),
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm h-24 resize-none"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newQuestion.required || false}
                      onChange={(e) =>
                        setNewQuestion({
                          ...newQuestion,
                          required: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-700">Zorunlu</span>
                  </label>

                  <button
                    onClick={addQuestion}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-600 text-white font-semibold py-2 hover:bg-brand-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Soru Ekle
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* External Survey */}
          {(surveyType === "external" || surveyType === "both") && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Harici Sağlayıcı</h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sağlayıcı
                </label>
                <select
                  value={externalProvider}
                  onChange={(e) => setExternalProvider(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Seçin...</option>
                  {EXTERNAL_PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Anket URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.typeform.com/..."
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Webhook Anahtarı
                </label>
                <input
                  type="password"
                  placeholder="Verify key for webhooks"
                  value={externalWebhookKey}
                  onChange={(e) => setExternalWebhookKey(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Harici sağlayıcıdan webhook tanımlamak için webhook URL:
                  <code className="block mt-1 bg-gray-100 p-2 rounded text-xs break-all">
                    POST /api/surveys/external/webhook?event_id={eventId}&attendee_id=[ATTENDEE_ID]
                  </code>
                </p>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand-600 text-white font-semibold py-3 hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              Anket Ayarlarını Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Responses Tab */}
      {activeTab === "responses" && (
        <div className="space-y-4">
          {responses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Henüz anket cevabı yok</p>
            </div>
          ) : (
            responses.map((response) => (
              <motion.div
                key={response.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between"
              >
                <div>
                  <div className="font-semibold text-gray-900">
                    Katılımcı #{response.attendee_id}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Tür: {response.survey_type === "external" ? "Harici" : "Yerleşik"}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(response.completed_at).toLocaleString("tr-TR")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-sm">
                    ✓ Tamamlandı
                  </span>
                </div>
              </motion.div>
            ))
          )}

          {responses.length > 0 && (
            <div className="text-center pt-4">
              <p className="text-gray-500 text-sm">
                {responses.length} kişi anketi tamamladı
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
