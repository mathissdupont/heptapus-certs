"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Copy,
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
import { useI18n } from "@/lib/i18n";

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
  survey_type: "disabled" | "builtin" | "external" | "both";
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

const QUESTION_TYPES_TR = [
  { value: "text", label: "Kısa Metin" },
  { value: "textarea", label: "Uzun Metin" },
  { value: "multiple_choice", label: "Çoktan Seçmeli" },
  { value: "rating", label: "Değerlendirme" },
  { value: "yes_no", label: "Evet/Hayır" },
];

const QUESTION_TYPES_EN = [
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "rating", label: "Rating" },
  { value: "yes_no", label: "Yes/No" },
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
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const copy = {
    pageTitle: isTr ? "Katılımcı Anketleri" : "Participant Surveys",
    pageSubtitle: isTr
      ? "Anket kurgusunu yönetin, cevapları izleyin ve sertifika akışına etkisini kontrol edin."
      : "Manage survey setup, monitor responses, and control the effect on certificate flow.",
    surveyMode: isTr ? "Anket Modu" : "Survey Mode",
    modeBoth: isTr ? "Çift Akış" : "Dual Flow",
    modeBuiltin: isTr ? "Yerleşik" : "Built-in",
    modeExternal: isTr ? "Harici" : "External",
    modeDisabled: isTr ? "Kapalı" : "Disabled",
    requiredHint: isTr ? "Sertifika öncesi zorunlu" : "Required before certificate",
    optionalHint: isTr ? "Opsiyonel deneyim" : "Optional experience",
    questionCount: isTr ? "Soru Sayısı" : "Question Count",
    questionsReady: isTr ? "Hazır sorular mevcut" : "Questions ready",
    noQuestions: isTr ? "Soru tanımlanmadı" : "No questions defined",
    completed: isTr ? "Tamamlayanlar" : "Completed",
    completionRate: (rate: number) => isTr ? `%${rate} tamamlanma` : `${rate}% completion`,
    pending: isTr ? "Bekleyenler" : "Pending",
    pendingHint: isTr ? "Henüz yanıt vermeyenler" : "Yet to respond",
    tabConfig: isTr ? "Anket Ayarları" : "Survey Settings",
    tabResponses: (count: number) => isTr ? `Cevaplar (${count})` : `Responses (${count})`,
    loadError: isTr ? "Anket verisi yüklenemedi" : "Failed to load survey data",
    saveSuccess: isTr ? "Anket ayarları kaydedildi" : "Survey settings saved",
    saveError: isTr ? "Kaydedilemedi" : "Could not save",
    copyError: isTr ? "Panoya kopyalama başarısız oldu" : "Failed to copy to clipboard",
    errorQuestionRequired: isTr ? "Soru ID ve soru metni zorunludur" : "Question ID and text are required",
    errorDuplicateId: isTr ? "Aynı soru ID zaten kullanılıyor" : "This question ID is already in use",
    errorNoOptions: isTr
      ? "Çoktan seçmeli sorular için en az bir seçenek girin"
      : "Enter at least one option for multiple choice questions",
    errorDuplicateOption: isTr ? "Aynı seçenek zaten eklenmiş" : "This option has already been added",
    generalSetup: isTr ? "Genel Kurgu" : "General Setup",
    generalSetupDesc: isTr
      ? "Anketin sertifika akışını nasıl etkileyeceğini ve hangi kanal ile toplanacağını belirleyin."
      : "Define how the survey affects the certificate flow and which channel it is collected through.",
    required: isTr ? "Zorunlu" : "Required",
    optional: isTr ? "Opsiyonel" : "Optional",
    requireBeforeCert: isTr ? "Sertifika öncesi anketi zorunlu tut" : "Require survey before certificate",
    requireBeforeCertDesc: isTr
      ? "Açılırsa katılımcı sertifika indirmeden önce anketi tamamlamak zorunda olur. Kapatılırsa anket sadece geri bildirim aracı olarak kalır."
      : "When enabled, the participant must complete the survey before downloading the certificate. When disabled, the survey remains as a feedback tool only.",
    disableSurvey: isTr ? "Anketi tamamen kapat" : "Disable Survey Entirely",
    disableSurveyDesc: isTr
      ? "Bu mod açıksa katılımcı kartında ve kayıt sonrası akışta anket adımı hiç gösterilmez."
      : "When this mode is on, the survey step will not be shown on the participant card or in the post-registration flow.",
    surveyClosed: isTr ? "Anket kapalı" : "Survey closed",
    closeSurvey: isTr ? "Anketi kapat" : "Close Survey",
    builtinForm: isTr ? "Yerleşik Form" : "Built-in Form",
    builtinFormDesc: isTr ? "Tüm soru ve cevaplar panel içinde toplanır." : "All questions and answers are collected within the panel.",
    externalProvider: isTr ? "Harici Sağlayıcı" : "External Provider",
    externalProviderDesc: isTr ? "Typeform veya benzeri bir aracı bağlayın." : "Connect Typeform or a similar tool.",
    hybridUsage: isTr ? "Hibrit Kullanım" : "Hybrid Usage",
    hybridUsageDesc: isTr ? "İsterseniz iki akışı birlikte sunun." : "Offer both flows together if needed.",
    builtinQuestions: isTr ? "Yerleşik Sorular" : "Built-in Questions",
    builtinQuestionsDesc: isTr
      ? "Katılımcılardan toplayacağınız soru setini oluşturun."
      : "Build the question set you will collect from participants.",
    questionCountBadge: (count: number) => isTr ? `${count} soru` : `${count} questions`,
    noQuestionsYet: isTr
      ? "Henüz soru eklenmedi. İlk soruyu aşağıdaki formdan oluşturabilirsiniz."
      : "No questions added yet. Create your first question using the form below.",
    optionsLabel: (opts: string[]) => isTr ? `Seçenekler: ${opts.join(", ")}` : `Options: ${opts.join(", ")}`,
    addQuestion: isTr ? "Yeni Soru Ekle" : "Add New Question",
    questionId: isTr ? "Soru ID" : "Question ID",
    questionType: isTr ? "Soru Türü" : "Question Type",
    questionText: isTr ? "Soru Metni" : "Question Text",
    questionTextPlaceholder: isTr ? "Sorunuzu yazın" : "Enter your question",
    options: isTr ? "Seçenekler" : "Options",
    optionPlaceholder: isTr ? "Seçenek yazın" : "Type an option",
    addOption: isTr ? "Ekle" : "Add",
    noOptionsYet: isTr ? "Henüz seçenek eklenmedi." : "No options added yet.",
    makeRequired: isTr ? "Bu soru zorunlu olsun" : "Make this question required",
    addQuestionBtn: isTr ? "Soruyu Ekle" : "Add Question",
    externalProviderTitle: isTr ? "Harici Sağlayıcı" : "External Provider",
    externalProviderTitleDesc: isTr
      ? "Typeform veya benzeri bir araçtan yanıt alıp sertifika akışına bağlayın."
      : "Collect responses from Typeform or a similar tool and connect them to the certificate flow.",
    providerLabel: isTr ? "Sağlayıcı" : "Provider",
    providerSelect: isTr ? "Seçin" : "Select",
    surveyUrl: isTr ? "Anket URL" : "Survey URL",
    webhookKey: isTr ? "Webhook Anahtarı" : "Webhook Key",
    webhookKeyHint: isTr ? "Boş bırakırsanız sistem otomatik anahtar üretir." : "If left empty, the system will generate a key automatically.",
    webhookInfo: isTr ? "Webhook Bağlantı Bilgisi" : "Webhook Connection Info",
    webhookDesc: isTr
      ? (endpoint: string) =>
          `Harici sağlayıcınız her tamamlanan anketten sonra bu endpointi çağırmalı ve X-Webhook-Key header'ı ile anahtarı göndermeli.`
      : (_: string) =>
          "Your external provider must call this endpoint after each completed survey and send the key via the X-Webhook-Key header.",
    attendeeLinks: isTr ? "Katılımcı bağlantıları" : "Attendee Links",
    attendeeLinksDesc: isTr
      ? "Genel anket adresi sadece giriş noktasıdır. Form, yalnızca kişiye özel token ile açılır."
      : "The general survey address is only an entry point. The form opens only with a person-specific token.",
    surveyClosedLinks: isTr
      ? "Anket kapalı olduğu için katılımcıya ayrı bir anket bağlantısı gösterilmez."
      : "Since the survey is closed, no separate survey link is shown to the participant.",
    generalEntryAddress: isTr ? "Genel giriş adresi" : "General entry address",
    copyLink: isTr ? "Linki kopyala" : "Copy link",
    copyLinkSuccess: isTr ? "Genel anket adresi panoya kopyalandı" : "General survey address copied to clipboard",
    goToAttendees: isTr ? "Katılımcılara git" : "Go to attendees",
    personalLinkHint: isTr
      ? "Kişiye özel anket bağlantısını katılımcılar ekranındaki ilgili kişi satırından kopyalayın."
      : "Copy the personalized survey link from the relevant person's row on the attendees screen.",
    liveSummary: isTr ? "Canlı Özet" : "Live Summary",
    flowReady: isTr ? "Katılımcı akışı hazır" : "Participant flow is ready",
    flowDesc: (required: boolean) =>
      isTr
        ? `Mevcut kurguda katılımcı ${required ? "anketi bitirince" : "isterse ankete girip"} sertifika adımına devam edecek.`
        : `In the current setup, the participant will proceed to the certificate step ${required ? "after completing the survey" : "optionally via the survey"}.`,
    modeLabel: isTr ? "Mod" : "Mode",
    questionCountLabel: isTr ? "Soru sayısı" : "Question count",
    webhookLabel: isTr ? "Webhook" : "Webhook",
    webhookReady: isTr ? "Hazır" : "Ready",
    webhookNotNeeded: isTr ? "Gerekmiyor" : "Not needed",
    webhookWillGenerate: isTr ? "Kayıt anında üretilecek" : "Will be generated on save",
    builtinResponse: isTr ? "Yerleşik yanıt" : "Built-in responses",
    externalResponse: isTr ? "Harici yanıt" : "External responses",
    saveSettings: isTr ? "Anket Ayarlarını Kaydet" : "Save Survey Settings",
    totalResponses: isTr ? "Toplam Yanıt" : "Total Responses",
    completionRateLabel: isTr ? "Tamamlama Oranı" : "Completion Rate",
    filterResult: isTr ? "Filtre Sonucu" : "Filter Result",
    searchPlaceholder: isTr ? "Ad, e-posta veya external response ID ara" : "Search name, email or external response ID",
    allResponses: isTr ? "Tüm Yanıtlar" : "All Responses",
    builtin: isTr ? "Yerleşik" : "Built-in",
    external: isTr ? "Harici" : "External",
    noResponses: isTr ? "Henüz gösterilecek anket cevabı yok" : "No survey responses to show yet",
    noResponsesHint: isTr
      ? "Filtreleri temizleyin veya katılımcıların anketi tamamlamasını bekleyin."
      : "Clear filters or wait for participants to complete the survey.",
    attendeeLabel: (id: number) => isTr ? `Katılımcı #${id}` : `Attendee #${id}`,
    noEmail: isTr ? "E-posta bilgisi yok" : "No email on record",
    externalResponseId: isTr ? "External Response ID" : "External Response ID",
    completedBadge: isTr ? "Tamamlandı" : "Completed",
    noBuiltinAnswers: isTr
      ? "Bu yanıt kaydında gösterilecek yerleşik soru cevabı bulunmuyor."
      : "No built-in question answers found in this response record.",
    noAnswer: isTr ? "Yanıt yok" : "No answer",
    yes: isTr ? "Evet" : "Yes",
    no: isTr ? "Hayır" : "No",
  };

  const QUESTION_TYPES = isTr ? QUESTION_TYPES_TR : QUESTION_TYPES_EN;

  function getQuestionTypeLabel(type: string) {
    return QUESTION_TYPES.find((item) => item.value === type)?.label || type;
  }

  function formatAnswer(value: unknown) {
    if (value === null || value === undefined || value === "") {
      return copy.noAnswer;
    }
    if (typeof value === "boolean") {
      return value ? copy.yes : copy.no;
    }
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  }

  const [config, setConfig] = useState<EventSurvey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [responseStats, setResponseStats] = useState<ResponseStats>({ completed: 0, pending: 0 });
  const [eventPublicId, setEventPublicId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"config" | "responses">("config");
  const [responseQuery, setResponseQuery] = useState("");
  const [responseTypeFilter, setResponseTypeFilter] = useState<"all" | "builtin" | "external">("all");

  const [isRequired, setIsRequired] = useState(true);
  const [surveyType, setSurveyType] = useState<"disabled" | "builtin" | "external" | "both">("builtin");
  const [builtinQuestions, setBuiltinQuestions] = useState<SurveyQuestion[]>([]);
  const [externalProvider, setExternalProvider] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [externalWebhookKey, setExternalWebhookKey] = useState("");
  const [newOption, setNewOption] = useState("");
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
      apiFetch(`/admin/events/${eventId}`, { method: "GET" })
        .then((response) => response.json())
        .then((eventData) => setEventPublicId(eventData.public_id || String(eventId)))
        .catch(() => setEventPublicId(String(eventId)));

      const configData = configRes ? await configRes.json() : null;
      const responsesData = responsesRes ? await responsesRes.json() : null;

      if (configData) {
        setConfig(configData);
        setIsRequired(Boolean(configData.is_required));
        setSurveyType((configData.survey_type || "builtin") as "disabled" | "builtin" | "external" | "both");
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
      setError(err.message || copy.loadError);
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

      setSuccess(copy.saveSuccess);
      await loadData();
    } catch (err: any) {
      setError(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    const questionId = (newQuestion.id || "").trim();
    const questionText = (newQuestion.question || "").trim();

    if (!questionId || !questionText) {
      setError(copy.errorQuestionRequired);
      return;
    }

    if (builtinQuestions.some((question) => question.id === questionId)) {
      setError(copy.errorDuplicateId);
      return;
    }

    if (
      newQuestion.type === "multiple_choice" &&
      (!newQuestion.options || newQuestion.options.length === 0)
    ) {
      setError(copy.errorNoOptions);
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
    setNewOption("");
    setError(null);
  };

  const addMultipleChoiceOption = () => {
    const option = newOption.trim();
    if (!option) return;
    if ((newQuestion.options || []).includes(option)) {
      setError(copy.errorDuplicateOption);
      return;
    }
    setNewQuestion({
      ...newQuestion,
      options: [...(newQuestion.options || []), option],
    });
    setNewOption("");
    setError(null);
  };

  const removeMultipleChoiceOption = (option: string) => {
    setNewQuestion({
      ...newQuestion,
      options: (newQuestion.options || []).filter((item) => item !== option),
    });
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
  const builtinResponseCount = responses.filter((item) => item.survey_type === "builtin").length;
  const externalResponseCount = responses.filter((item) => item.survey_type === "external").length;
  const completionRate = responseStats.completed + responseStats.pending > 0
    ? Math.round((responseStats.completed / (responseStats.completed + responseStats.pending)) * 100)
    : 0;
  const webhookEndpoint = `/api/surveys/external/webhook?event_id=${eventId}&attendee_id=[ATTENDEE_ID]`;
  const surveyLandingUrl =
    typeof window !== "undefined" ? `${window.location.origin}/events/${eventPublicId || eventId}/survey` : `/events/${eventPublicId || eventId}/survey`;

  async function copyText(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      setSuccess(message);
    } catch {
      setError(copy.copyError);
    }
  }

  const getSurveyModeLabel = () => {
    if (surveyType === "both") return copy.modeBoth;
    if (surveyType === "builtin") return copy.modeBuiltin;
    if (surveyType === "external") return copy.modeExternal;
    return copy.modeDisabled;
  };

  const getSurveyModeLabelFull = () => {
    if (surveyType === "both") return isTr ? "Yerleşik + Harici" : "Built-in + External";
    if (surveyType === "builtin") return copy.modeBuiltin;
    return copy.modeExternal;
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-surface-600" />
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
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Link
              href={`/admin/events/${eventId}/certificates`}
              className="inline-flex rounded-xl border border-surface-200 bg-white p-2.5 text-surface-700 shadow-card transition hover:border-surface-300 hover:text-surface-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold text-surface-900">{copy.pageTitle}</h1>
            <p className="mt-1 text-sm text-surface-500">{copy.pageSubtitle}</p>
          </div>
        </div>
      </div>

      <EventAdminNav eventId={eventId} active="surveys" className="mb-2 flex flex-col gap-2 border-b border-surface-200 pb-4" />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: copy.surveyMode,
            value: getSurveyModeLabel(),
            hint: isRequired ? copy.requiredHint : copy.optionalHint,
            icon: ClipboardList,
          },
          {
            label: copy.questionCount,
            value: String(builtinQuestionCount),
            hint: builtinQuestionCount > 0 ? copy.questionsReady : copy.noQuestions,
            icon: FileText,
          },
          {
            label: copy.completed,
            value: String(responseStats.completed),
            hint: copy.completionRate(completionRate),
            icon: CheckCircle2,
          },
          {
            label: copy.pending,
            value: String(responseStats.pending),
            hint: copy.pendingHint,
            icon: Users,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-xl border border-surface-200 bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-surface-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-surface-900">{item.value}</p>
                  <p className="mt-2 text-sm text-surface-500">{item.hint}</p>
                </div>
                <div className="rounded-lg border border-surface-150 bg-surface-50 p-3 text-surface-600">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 border-b border-surface-200">
        {[
          { key: "config", label: copy.tabConfig },
          { key: "responses", label: copy.tabResponses(responses.length) },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "config" | "responses")}
            className={`px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-surface-900 text-surface-900"
                : "text-surface-600 hover:text-surface-900"
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
              <div className="rounded-xl border border-surface-200 bg-white p-6 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-surface-900">{copy.generalSetup}</h2>
                    <p className="mt-1 text-sm text-surface-500">{copy.generalSetupDesc}</p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold ${isRequired ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>
                    {isRequired ? copy.required : copy.optional}
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-surface-150 bg-surface-50 p-5">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isRequired}
                      onChange={(event) => setIsRequired(event.target.checked)}
                      disabled={surveyType === "disabled"}
                      className="mt-1 h-4 w-4 rounded"
                    />
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-surface-900">
                        <LockKeyhole className="h-4 w-4 text-surface-600" />
                        {copy.requireBeforeCert}
                      </div>
                      <p className="mt-1 text-sm text-surface-600">{copy.requireBeforeCertDesc}</p>
                    </div>
                  </label>
                </div>

                <div className="mt-4 rounded-xl border border-surface-200 bg-surface-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-surface-900">{copy.disableSurvey}</p>
                      <p className="mt-1 text-sm text-surface-600">{copy.disableSurveyDesc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSurveyType("disabled");
                        setIsRequired(false);
                      }}
                      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                        surveyType === "disabled"
                          ? "bg-surface-900 text-white"
                          : "border border-surface-200 bg-white text-surface-700 hover:bg-surface-100"
                      }`}
                    >
                      {surveyType === "disabled" ? copy.surveyClosed : copy.closeSurvey}
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  {[
                    { value: "builtin", title: copy.builtinForm, description: copy.builtinFormDesc },
                    { value: "external", title: copy.externalProvider, description: copy.externalProviderDesc },
                    { value: "both", title: copy.hybridUsage, description: copy.hybridUsageDesc },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSurveyType(item.value as "builtin" | "external" | "both")}
                      className={`rounded-xl border p-4 text-left transition ${
                        surveyType === item.value
                          ? "border-surface-900 bg-surface-50 shadow-card"
                          : "border-surface-200 bg-surface-50 hover:border-surface-300 hover:bg-white"
                      }`}
                    >
                      <div className="font-semibold text-surface-900">{item.title}</div>
                      <p className="mt-1 text-sm text-surface-500">{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {(surveyType === "builtin" || surveyType === "both") && (
                <div className="space-y-4 rounded-xl border border-surface-200 bg-white p-6 shadow-card">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-surface-900">{copy.builtinQuestions}</h2>
                      <p className="mt-1 text-sm text-surface-500">{copy.builtinQuestionsDesc}</p>
                    </div>
                    <div className="rounded-full bg-surface-100 px-3 py-1 text-xs font-semibold text-surface-600">
                      {copy.questionCountBadge(builtinQuestionCount)}
                    </div>
                  </div>

                  {builtinQuestions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-surface-300 bg-surface-50 p-6 text-sm text-surface-500">
                      {copy.noQuestionsYet}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {builtinQuestions.map((question, index) => (
                        <motion.div
                          key={`${question.id}-${index}`}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl border border-surface-200 bg-surface-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-surface-600">#{question.id}</span>
                                <span className="rounded-full bg-surface-100 px-2.5 py-1 text-xs font-semibold text-surface-700">{getQuestionTypeLabel(question.type)}</span>
                                {question.required ? (
                                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">{copy.required}</span>
                                ) : (
                                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">{copy.optional}</span>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-surface-900">{question.question}</p>
                                {question.type === "multiple_choice" && question.options?.length ? (
                                  <p className="mt-2 text-sm text-surface-500">{copy.optionsLabel(question.options)}</p>
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

                  <div className="rounded-xl border-2 border-dashed border-surface-200 bg-surface-50 p-5">
                    <h3 className="text-base font-semibold text-surface-900">{copy.addQuestion}</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-surface-700">{copy.questionId}</label>
                        <input
                          type="text"
                          placeholder="q1"
                          value={newQuestion.id || ""}
                          onChange={(event) => setNewQuestion({ ...newQuestion, id: event.target.value })}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-surface-700">{copy.questionType}</label>
                        <select
                          value={newQuestion.type || "text"}
                          onChange={(event) => setNewQuestion({ ...newQuestion, type: event.target.value })}
                          className="input-field"
                        >
                          {QUESTION_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-semibold text-surface-700">{copy.questionText}</label>
                      <textarea
                        placeholder={copy.questionTextPlaceholder}
                        value={newQuestion.question || ""}
                        onChange={(event) => setNewQuestion({ ...newQuestion, question: event.target.value })}
                        className="min-h-24 input-field"
                      />
                    </div>

                    {newQuestion.type === "multiple_choice" && (
                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-semibold text-surface-700">{copy.options}</label>
                        <div className="rounded-xl border border-surface-200 bg-white p-4">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder={copy.optionPlaceholder}
                              value={newOption}
                              onChange={(event) => setNewOption(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  addMultipleChoiceOption();
                                }
                              }}
                              className="input-field"
                            />
                            <button
                              type="button"
                              onClick={addMultipleChoiceOption}
                              className="inline-flex items-center gap-2 rounded-lg bg-surface-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                              <Plus className="h-4 w-4" />
                              {copy.addOption}
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {(newQuestion.options || []).length === 0 ? (
                              <div className="rounded-xl border border-dashed border-surface-300 bg-surface-50 px-4 py-3 text-sm text-surface-500">
                                {copy.noOptionsYet}
                              </div>
                            ) : (
                              (newQuestion.options || []).map((option) => (
                                <div
                                  key={option}
                                  className="inline-flex items-center gap-2 rounded-full border border-surface-200 bg-surface-50 px-3 py-1.5 text-sm font-medium text-surface-700"
                                >
                                  <span>{option}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeMultipleChoiceOption(option)}
                                    className="rounded-full p-0.5 text-surface-400 transition hover:bg-white hover:text-rose-600"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <label className="mt-4 flex items-center gap-3 text-sm text-surface-700">
                      <input
                        type="checkbox"
                        checked={Boolean(newQuestion.required)}
                        onChange={(event) => setNewQuestion({ ...newQuestion, required: event.target.checked })}
                        className="h-4 w-4 rounded"
                      />
                      {copy.makeRequired}
                    </label>

                    <button
                      type="button"
                      onClick={addQuestion}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-surface-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-surface-800"
                    >
                      <Plus className="h-4 w-4" />
                      {copy.addQuestionBtn}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {(surveyType === "external" || surveyType === "both") && (
                <div className="rounded-xl border border-surface-200 bg-white p-6 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-surface-900">{copy.externalProviderTitle}</h2>
                      <p className="mt-1 text-sm text-surface-500">{copy.externalProviderTitleDesc}</p>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                      <Link2 className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-surface-700">{copy.providerLabel}</label>
                      <select
                        value={externalProvider}
                        onChange={(event) => setExternalProvider(event.target.value)}
                        className="input-field"
                      >
                        <option value="">{copy.providerSelect}</option>
                        {EXTERNAL_PROVIDERS.map((provider) => (
                          <option key={provider.value} value={provider.value}>{provider.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-surface-700">{copy.surveyUrl}</label>
                      <input
                        type="url"
                        placeholder="https://example.typeform.com/..."
                        value={externalUrl}
                        onChange={(event) => setExternalUrl(event.target.value)}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-surface-700">{copy.webhookKey}</label>
                      <input
                        type="text"
                        placeholder="Webhook verification key"
                        value={externalWebhookKey}
                        onChange={(event) => setExternalWebhookKey(event.target.value)}
                        className="w-full rounded-xl border border-surface-300 px-3 py-2.5 font-mono text-sm"
                      />
                      <p className="mt-2 text-xs text-surface-500">{copy.webhookKeyHint}</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-surface-200 bg-surface-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-surface-800">
                      <ExternalLink className="h-4 w-4 text-surface-600" />
                      {copy.webhookInfo}
                    </div>
                    <code className="mt-3 block rounded-xl bg-white p-3 text-xs text-surface-700 break-all">POST {webhookEndpoint}</code>
                    <p className="mt-2 text-xs text-surface-500">{copy.webhookDesc(webhookEndpoint)}</p>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-surface-200 bg-white p-6 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-surface-900">{copy.attendeeLinks}</h2>
                    <p className="mt-1 text-sm text-surface-500">{copy.attendeeLinksDesc}</p>
                  </div>
                  <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                    <Link2 className="h-5 w-5" />
                  </div>
                </div>

                {surveyType === "disabled" ? (
                  <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-surface-50 px-4 py-6 text-sm text-surface-600">
                    {copy.surveyClosedLinks}
                  </div>
                ) : (
                  <>
                <div className="mt-5 rounded-xl border border-surface-200 bg-surface-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-500">{copy.generalEntryAddress}</p>
                  <code className="mt-3 block break-all rounded-xl bg-white p-3 text-xs text-surface-700">
                    {surveyLandingUrl}
                  </code>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => copyText(surveyLandingUrl, copy.copyLinkSuccess)}
                      className="inline-flex items-center gap-2 rounded-xl border border-surface-200 bg-white px-4 py-2.5 text-sm font-semibold text-surface-700 transition hover:bg-surface-50"
                    >
                      <Copy className="h-4 w-4" />
                      {copy.copyLink}
                    </button>
                    <Link
                      href={`/admin/events/${eventId}/attendees`}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
                    >
                      {copy.goToAttendees}
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {copy.personalLinkHint}
                </div>
                  </>
                )}
              </div>
              <div className="rounded-xl border border-surface-200 bg-surface-900 p-6 text-white shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-300">{copy.liveSummary}</p>
                    <h3 className="mt-2 text-xl font-semibold">{copy.flowReady}</h3>
                    <p className="mt-2 text-sm text-slate-300">{copy.flowDesc(isRequired)}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-5 grid gap-3 text-sm text-surface-200">
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">{copy.modeLabel}: <span className="font-semibold">{getSurveyModeLabelFull()}</span></div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">{copy.questionCountLabel}: <span className="font-semibold">{builtinQuestionCount}</span></div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">{copy.webhookLabel}: <span className="font-semibold">{externalWebhookKey ? copy.webhookReady : surveyType === "builtin" ? copy.webhookNotNeeded : copy.webhookWillGenerate}</span></div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">{copy.builtinResponse}: <span className="font-semibold">{builtinResponseCount}</span> • {copy.externalResponse}: <span className="font-semibold">{externalResponseCount}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-surface-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-surface-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {copy.saveSettings}
            </button>
          </div>
        </div>
      )}

      {activeTab === "responses" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-card">
              <p className="text-sm font-medium text-surface-500">{copy.totalResponses}</p>
              <p className="mt-3 text-3xl font-semibold text-surface-900">{responses.length}</p>
            </div>
            <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-card">
              <p className="text-sm font-medium text-surface-500">{copy.completionRateLabel}</p>
              <p className="mt-3 text-3xl font-semibold text-surface-900">{isTr ? `%${completionRate}` : `${completionRate}%`}</p>
            </div>
            <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-card">
              <p className="text-sm font-medium text-surface-500">{copy.filterResult}</p>
              <p className="mt-3 text-3xl font-semibold text-surface-900">{filteredResponses.length}</p>
            </div>
          </div>

          <div className="rounded-xl border border-surface-200 bg-white p-4 shadow-card">
            <div className="grid gap-3 md:grid-cols-[1fr,200px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  value={responseQuery}
                  onChange={(event) => setResponseQuery(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="w-full rounded-xl border border-surface-300 py-2.5 pl-10 pr-3 text-sm"
                />
              </label>
              <select
                value={responseTypeFilter}
                onChange={(event) => setResponseTypeFilter(event.target.value as "all" | "builtin" | "external")}
                className="input-field"
              >
                <option value="all">{copy.allResponses}</option>
                <option value="builtin">{copy.builtin}</option>
                <option value="external">{copy.external}</option>
              </select>
            </div>
          </div>

          {filteredResponses.length === 0 ? (
            <div className="rounded-xl border border-surface-200 bg-white px-6 py-12 text-center shadow-card">
              <FileText className="mx-auto mb-4 h-16 w-16 text-surface-300" />
              <p className="text-base font-semibold text-surface-800">{copy.noResponses}</p>
              <p className="mt-2 text-sm text-surface-500">{copy.noResponsesHint}</p>
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
                    className="rounded-xl border border-surface-200 bg-white p-5 shadow-card"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-surface-900">
                            {response.attendee_name || copy.attendeeLabel(response.attendee_id)}
                          </h3>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${response.survey_type === "external" ? "bg-amber-100 text-amber-800" : "bg-surface-100 text-surface-700"}`}>
                            {response.survey_type === "external" ? copy.external : copy.builtin}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-surface-500">{response.attendee_email || copy.noEmail}</p>
                        <p className="mt-2 text-xs text-surface-400">{new Date(response.completed_at).toLocaleString(isTr ? "tr-TR" : "en-US")}</p>
                        {response.external_response_id ? (
                          <p className="mt-2 text-xs font-medium text-surface-500">{copy.externalResponseId}: <span className="font-mono text-surface-700">{response.external_response_id}</span></p>
                        ) : null}
                      </div>
                      <div className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                        {copy.completedBadge}
                      </div>
                    </div>

                    {answerEntries.length > 0 ? (
                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        {answerEntries.map(([questionId, answer]) => (
                          <div key={questionId} className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-surface-500">{questionId}</p>
                            <p className="mt-1 text-sm font-semibold text-surface-900">{questionLabelMap[questionId] || questionId}</p>
                            <p className="mt-2 text-sm text-surface-600">{formatAnswer(answer)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-5 rounded-xl border border-dashed border-surface-300 bg-surface-50 p-4 text-sm text-surface-500">
                        {copy.noBuiltinAnswers}
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
