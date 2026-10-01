"use client";

import { localeTag } from "@/lib/localeTag";
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
import { useI18n, type TranslationKey } from "@/lib/i18n";

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

const EXTERNAL_PROVIDERS = [
  { value: "typeform", label: "Typeform" },
  { value: "qualtrics", label: "Qualtrics" },
  { value: "google_forms", label: "Google Forms" },
  { value: "surveymonkey", label: "SurveyMonkey" },
];

export default function SurveysPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { lang, t } = useI18n();
  const formatPercent = (value: number) => new Intl.NumberFormat(localeTag(lang), {
    style: "percent", maximumFractionDigits: 0,
  }).format(value / 100);

  const copy = {
    pageTitle: t("admin_surveys_page_title"),
    pageSubtitle: t("admin_surveys_page_subtitle"),
    surveyMode: t("admin_surveys_survey_mode"),
    modeBoth: t("admin_surveys_mode_both"),
    modeBuiltin: t("admin_surveys_mode_builtin"),
    modeExternal: t("admin_surveys_mode_external"),
    modeDisabled: t("admin_surveys_mode_disabled"),
    requiredHint: t("admin_surveys_required_hint"),
    optionalHint: t("admin_surveys_optional_hint"),
    questionCount: t("admin_surveys_question_count"),
    questionsReady: t("admin_surveys_questions_ready"),
    noQuestions: t("admin_surveys_no_questions"),
    completed: t("admin_surveys_completed"),
    pending: t("admin_surveys_pending"),
    pendingHint: t("admin_surveys_pending_hint"),
    tabConfig: t("admin_surveys_tab_config"),
    loadError: t("admin_surveys_load_error"),
    saveSuccess: t("admin_surveys_save_success"),
    saveError: t("admin_surveys_save_error"),
    copyError: t("admin_surveys_copy_error"),
    errorQuestionRequired: t("admin_surveys_error_question_required"),
    errorDuplicateId: t("admin_surveys_error_duplicate_id"),
    errorNoOptions: t("admin_surveys_error_no_options"),
    errorDuplicateOption: t("admin_surveys_error_duplicate_option"),
    generalSetup: t("admin_surveys_general_setup"),
    generalSetupDesc: t("admin_surveys_general_setup_desc"),
    required: t("admin_surveys_required"),
    optional: t("admin_surveys_optional"),
    requireBeforeCert: t("admin_surveys_require_before_cert"),
    requireBeforeCertDesc: t("admin_surveys_require_before_cert_desc"),
    disableSurvey: t("admin_surveys_disable_survey"),
    disableSurveyDesc: t("admin_surveys_disable_survey_desc"),
    surveyClosed: t("admin_surveys_survey_closed"),
    closeSurvey: t("admin_surveys_close_survey"),
    builtinForm: t("admin_surveys_builtin_form"),
    builtinFormDesc: t("admin_surveys_builtin_form_desc"),
    externalProvider: t("admin_surveys_external_provider"),
    externalProviderDesc: t("admin_surveys_external_provider_desc"),
    hybridUsage: t("admin_surveys_hybrid_usage"),
    hybridUsageDesc: t("admin_surveys_hybrid_usage_desc"),
    builtinQuestions: t("admin_surveys_builtin_questions"),
    builtinQuestionsDesc: t("admin_surveys_builtin_questions_desc"),
    noQuestionsYet: t("admin_surveys_no_questions_yet"),
    addQuestion: t("admin_surveys_add_question"),
    questionId: t("admin_surveys_question_id"),
    questionType: t("admin_surveys_question_type"),
    questionText: t("admin_surveys_question_text"),
    questionTextPlaceholder: t("admin_surveys_question_text_placeholder"),
    options: t("admin_surveys_options"),
    optionPlaceholder: t("admin_surveys_option_placeholder"),
    addOption: t("admin_surveys_add_option"),
    noOptionsYet: t("admin_surveys_no_options_yet"),
    makeRequired: t("admin_surveys_make_required"),
    addQuestionBtn: t("admin_surveys_add_question_btn"),
    externalProviderTitleDesc: t("admin_surveys_external_provider_title_desc"),
    providerLabel: t("admin_surveys_provider_label"),
    providerSelect: t("admin_surveys_provider_select"),
    surveyUrl: t("admin_surveys_survey_url"),
    webhookKey: t("admin_surveys_webhook_key"),
    webhookKeyHint: t("admin_surveys_webhook_key_hint"),
    webhookInfo: t("admin_surveys_webhook_info"),
    attendeeLinks: t("admin_surveys_attendee_links"),
    attendeeLinksDesc: t("admin_surveys_attendee_links_desc"),
    surveyClosedLinks: t("admin_surveys_survey_closed_links"),
    generalEntryAddress: t("admin_surveys_general_entry_address"),
    copyLink: t("admin_surveys_copy_link"),
    copyLinkSuccess: t("admin_surveys_copy_link_success"),
    goToAttendees: t("admin_surveys_go_to_attendees"),
    personalLinkHint: t("admin_surveys_personal_link_hint"),
    liveSummary: t("admin_surveys_live_summary"),
    flowReady: t("admin_surveys_flow_ready"),
    modeLabel: t("admin_surveys_mode_label"),
    webhookLabel: t("admin_surveys_webhook_label"),
    webhookReady: t("admin_surveys_webhook_ready"),
    webhookNotNeeded: t("admin_surveys_webhook_not_needed"),
    webhookWillGenerate: t("admin_surveys_webhook_will_generate"),
    builtinResponse: t("admin_surveys_builtin_response"),
    externalResponse: t("admin_surveys_external_response"),
    saveSettings: t("admin_surveys_save_settings"),
    totalResponses: t("admin_surveys_total_responses"),
    completionRateLabel: t("admin_surveys_completion_rate_label"),
    filterResult: t("admin_surveys_filter_result"),
    searchPlaceholder: t("admin_surveys_search_placeholder"),
    allResponses: t("admin_surveys_all_responses"),
    noResponses: t("admin_surveys_no_responses"),
    noResponsesHint: t("admin_surveys_no_responses_hint"),
    noEmail: t("admin_surveys_no_email"),
    externalResponseId: t("admin_surveys_external_response_id"),
    completedBadge: t("admin_surveys_completed_badge"),
    noBuiltinAnswers: t("admin_surveys_no_builtin_answers"),
    noAnswer: t("admin_surveys_no_answer"),
    yes: t("admin_surveys_yes"),
    no: t("admin_surveys_no"),
    flowRequired: t("admin_surveys_flow_required"),
    flowOptional: t("admin_surveys_flow_optional"),
    modeBothFull: t("admin_surveys_mode_both_full"),
    typeText: t("admin_surveys_type_text"),
    typeTextarea: t("admin_surveys_type_textarea"),
    typeMultipleChoice: t("admin_surveys_type_multiple_choice"),
    typeRating: t("admin_surveys_type_rating"),
    typeYesNo: t("admin_surveys_type_yes_no"),
    webhookPlaceholder: t("admin_surveys_webhook_placeholder"),
    backCertificates: t("admin_surveys_back_certificates"),
    removeQuestion: t("admin_surveys_remove_question"),
    removeOption: t("admin_surveys_remove_option"),
    loading: t("admin_surveys_loading"),
    externalProviderTitle: t("admin_surveys_external_provider"),
    builtin: t("admin_surveys_mode_builtin"),
    external: t("admin_surveys_mode_external"),
    questionCountLabel: t("admin_surveys_question_count"),
    completionRate: (rate: number) => t("admin_surveys_completion_rate", { rate: formatPercent(rate) }),
    tabResponses: (count: number) => t("admin_surveys_tab_responses", { count }),
    questionCountBadge: (count: number) => t("admin_surveys_question_count_badge", { count }),
    optionsLabel: (options: string[]) => t("admin_surveys_options_label", { options: options.join(", ") }),
    attendeeLabel: (id: number) => t("admin_surveys_attendee_label", { id }),
    webhookDesc: (_endpoint: string) => t("admin_surveys_webhook_desc"),
    flowDesc: (required: boolean) => t(required ? "admin_surveys_flow_required" : "admin_surveys_flow_optional"),
  };

  const QUESTION_TYPES = [
    { value: "text", label: copy.typeText },
    { value: "textarea", label: copy.typeTextarea },
    { value: "multiple_choice", label: copy.typeMultipleChoice },
    { value: "rating", label: copy.typeRating },
    { value: "yes_no", label: copy.typeYesNo },
  ];

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
  const [error, setError] = useState<{ key: TranslationKey } | { message: string } | null>(null);
  const [success, setSuccess] = useState<TranslationKey | null>(null);
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
      setError(err?.message ? { message: String(err.message) } : { key: "admin_surveys_load_error" });
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

      setSuccess("admin_surveys_save_success");
      await loadData();
    } catch (err: any) {
      setError(err?.message ? { message: String(err.message) } : { key: "admin_surveys_save_error" });
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    const questionId = (newQuestion.id || "").trim();
    const questionText = (newQuestion.question || "").trim();

    if (!questionId || !questionText) {
      setError({ key: "admin_surveys_error_question_required" });
      return;
    }

    if (builtinQuestions.some((question) => question.id === questionId)) {
      setError({ key: "admin_surveys_error_duplicate_id" });
      return;
    }

    if (
      newQuestion.type === "multiple_choice" &&
      (!newQuestion.options || newQuestion.options.length === 0)
    ) {
      setError({ key: "admin_surveys_error_no_options" });
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
      setError({ key: "admin_surveys_error_duplicate_option" });
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

  async function copyText(value: string, message: TranslationKey) {
    try {
      await navigator.clipboard.writeText(value);
      setSuccess(message);
    } catch {
      setError({ key: "admin_surveys_copy_error" });
    }
  }

  const getSurveyModeLabel = () => {
    if (surveyType === "both") return copy.modeBoth;
    if (surveyType === "builtin") return copy.modeBuiltin;
    if (surveyType === "external") return copy.modeExternal;
    return copy.modeDisabled;
  };

  const getSurveyModeLabelFull = () => {
    if (surveyType === "both") return copy.modeBothFull;
    if (surveyType === "builtin") return copy.modeBuiltin;
    return surveyType === "external" ? copy.modeExternal : copy.modeDisabled;
  };

  if (loading) {
    return (
      <div role="status" aria-label={copy.loading} className="flex h-96 items-center justify-center">
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
              aria-label={copy.backCertificates}
              className="inline-flex rounded-xl border border-surface-200 bg-raised p-2.5 text-surface-700 shadow-card transition hover:border-surface-300 hover:text-surface-700"
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
            <div key={item.label} className="rounded-xl border border-surface-200 bg-raised p-5 shadow-card">
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
          className="flex items-start gap-3 rounded-xl border border-status-danger-border bg-status-danger-bg p-4"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-danger-content" />
          <p className="text-sm text-status-danger-content">{"key" in error ? t(error.key) : error.message}</p>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-status-success-border bg-status-success-bg p-4"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-status-success-content" />
          <p className="text-sm text-status-success-content">{t(success)}</p>
        </motion.div>
      )}

      {activeTab === "config" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.4fr,0.9fr]">
            <div className="space-y-6">
              <div className="rounded-xl border border-surface-200 bg-raised p-6 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-surface-900">{copy.generalSetup}</h2>
                    <p className="mt-1 text-sm text-surface-500">{copy.generalSetupDesc}</p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold ${isRequired ? "bg-status-warning-bg text-status-warning-content" : "bg-status-success-bg text-status-success-content"}`}>
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
                          ? "bg-inverse-surface text-inverse-content"
                          : "border border-surface-200 bg-raised text-surface-700 hover:bg-surface-100"
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
                          : "border-surface-200 bg-surface-50 hover:border-surface-300 hover:bg-raised"
                      }`}
                    >
                      <div className="font-semibold text-surface-900">{item.title}</div>
                      <p className="mt-1 text-sm text-surface-500">{item.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {(surveyType === "builtin" || surveyType === "both") && (
                <div className="space-y-4 rounded-xl border border-surface-200 bg-raised p-6 shadow-card">
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
                                <span className="rounded-full bg-raised px-2.5 py-1 text-xs font-semibold text-surface-600">#{question.id}</span>
                                <span className="rounded-full bg-surface-100 px-2.5 py-1 text-xs font-semibold text-surface-700">{getQuestionTypeLabel(question.type)}</span>
                                {question.required ? (
                                  <span className="rounded-full bg-status-warning-bg px-2.5 py-1 text-xs font-semibold text-status-warning-content">{copy.required}</span>
                                ) : (
                                  <span className="rounded-full bg-status-success-bg px-2.5 py-1 text-xs font-semibold text-status-success-content">{copy.optional}</span>
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
                              aria-label={t("admin_surveys_remove_question", { question: question.question })}
                              className="rounded-xl p-2 text-status-danger-content transition hover:bg-status-danger-bg"
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
                        <label htmlFor="survey-question-id" className="mb-2 block text-sm font-semibold text-surface-700">{copy.questionId}</label>
                        <input
                          type="text"
                          id="survey-question-id"
                          placeholder="q1"
                          value={newQuestion.id || ""}
                          onChange={(event) => setNewQuestion({ ...newQuestion, id: event.target.value })}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label htmlFor="survey-question-type" className="mb-2 block text-sm font-semibold text-surface-700">{copy.questionType}</label>
                        <select
                          id="survey-question-type"
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
                      <label htmlFor="survey-question-text" className="mb-2 block text-sm font-semibold text-surface-700">{copy.questionText}</label>
                      <textarea
                        id="survey-question-text"
                        placeholder={copy.questionTextPlaceholder}
                        value={newQuestion.question || ""}
                        onChange={(event) => setNewQuestion({ ...newQuestion, question: event.target.value })}
                        className="min-h-24 input-field"
                      />
                    </div>

                    {newQuestion.type === "multiple_choice" && (
                      <div className="mt-4">
                        <label htmlFor="survey-question-option" className="mb-2 block text-sm font-semibold text-surface-700">{copy.options}</label>
                        <div className="rounded-xl border border-surface-200 bg-raised p-4">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              id="survey-question-option"
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
                              className="inline-flex items-center gap-2 rounded-lg bg-inverse-surface px-4 py-2.5 text-sm font-semibold text-inverse-content transition hover:bg-inverse-surface"
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
                                    aria-label={t("admin_surveys_remove_option", { option })}
                                    className="rounded-full p-0.5 text-surface-400 transition hover:bg-raised hover:text-status-danger-content"
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
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-inverse-surface px-4 py-2.5 text-sm font-semibold text-inverse-content transition hover:bg-inverse-surface/90"
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
                <div className="rounded-xl border border-surface-200 bg-raised p-6 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-surface-900">{copy.externalProviderTitle}</h2>
                      <p className="mt-1 text-sm text-surface-500">{copy.externalProviderTitleDesc}</p>
                    </div>
                    <div className="rounded-xl bg-status-warning-bg p-3 text-status-warning-content">
                      <Link2 className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label htmlFor="survey-provider" className="mb-2 block text-sm font-semibold text-surface-700">{copy.providerLabel}</label>
                      <select
                        id="survey-provider"
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
                      <label htmlFor="survey-url" className="mb-2 block text-sm font-semibold text-surface-700">{copy.surveyUrl}</label>
                      <input
                        type="url"
                        id="survey-url"
                        placeholder="https://example.typeform.com/..."
                        value={externalUrl}
                        onChange={(event) => setExternalUrl(event.target.value)}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label htmlFor="survey-webhook-key" className="mb-2 block text-sm font-semibold text-surface-700">{copy.webhookKey}</label>
                      <input
                        type="text"
                        id="survey-webhook-key"
                        placeholder={copy.webhookPlaceholder}
                        value={externalWebhookKey}
                        onChange={(event) => setExternalWebhookKey(event.target.value)}
                        className="input-field font-mono"
                      />
                      <p className="mt-2 text-xs text-surface-500">{copy.webhookKeyHint}</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-surface-200 bg-surface-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-surface-800">
                      <ExternalLink className="h-4 w-4 text-surface-600" />
                      {copy.webhookInfo}
                    </div>
                    <code className="mt-3 block rounded-xl bg-raised p-3 text-xs text-surface-700 break-all">POST {webhookEndpoint}</code>
                    <p className="mt-2 text-xs text-surface-500">{copy.webhookDesc(webhookEndpoint)}</p>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-surface-200 bg-raised p-6 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-surface-900">{copy.attendeeLinks}</h2>
                    <p className="mt-1 text-sm text-surface-500">{copy.attendeeLinksDesc}</p>
                  </div>
                  <div className="rounded-xl bg-status-info-bg p-3 text-status-info-content">
                    <Link2 className="h-5 w-5" />
                  </div>
                </div>

                {surveyType === "disabled" ? (
                  <div className="mt-5 rounded-xl border border-dashed border-outline-strong bg-surface-50 px-4 py-6 text-sm text-surface-600">
                    {copy.surveyClosedLinks}
                  </div>
                ) : (
                  <>
                <div className="mt-5 rounded-xl border border-surface-200 bg-surface-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-500">{copy.generalEntryAddress}</p>
                  <code className="mt-3 block break-all rounded-xl bg-raised p-3 text-xs text-surface-700">
                    {surveyLandingUrl}
                  </code>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => copyText(surveyLandingUrl, "admin_surveys_copy_link_success")}
                      className="inline-flex items-center gap-2 rounded-xl border border-surface-200 bg-raised px-4 py-2.5 text-sm font-semibold text-surface-700 transition hover:bg-surface-50"
                    >
                      <Copy className="h-4 w-4" />
                      {copy.copyLink}
                    </button>
                    <Link
                      href={`/admin/events/${eventId}/attendees`}
                      className="inline-flex items-center gap-2 rounded-xl bg-inverse-surface px-4 py-2.5 text-sm font-semibold text-inverse-content transition hover:bg-inverse-surface/90"
                    >
                      {copy.goToAttendees}
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-status-warning-content">
                  {copy.personalLinkHint}
                </div>
                  </>
                )}
              </div>
              <div className="rounded-xl border border-outline bg-inverse-surface p-6 text-inverse-content shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-inverse-content/70">{copy.liveSummary}</p>
                    <h3 className="mt-2 text-xl font-semibold">{copy.flowReady}</h3>
                    <p className="mt-2 text-sm text-inverse-content/70">{copy.flowDesc(isRequired)}</p>
                  </div>
                  <div className="rounded-xl bg-inverse-content/10 p-3">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-5 grid gap-3 text-sm text-inverse-content/80">
                  <div className="rounded-xl border border-inverse-content/10 bg-inverse-content/5 px-4 py-3">{copy.modeLabel}: <span className="font-semibold">{getSurveyModeLabelFull()}</span></div>
                  <div className="rounded-xl border border-inverse-content/10 bg-inverse-content/5 px-4 py-3">{copy.questionCountLabel}: <span className="font-semibold">{builtinQuestionCount}</span></div>
                  <div className="rounded-xl border border-inverse-content/10 bg-inverse-content/5 px-4 py-3">{copy.webhookLabel}: <span className="font-semibold">{externalWebhookKey ? copy.webhookReady : surveyType === "builtin" ? copy.webhookNotNeeded : copy.webhookWillGenerate}</span></div>
                  <div className="rounded-xl border border-inverse-content/10 bg-inverse-content/5 px-4 py-3">{copy.builtinResponse}: <span className="font-semibold">{builtinResponseCount}</span> • {copy.externalResponse}: <span className="font-semibold">{externalResponseCount}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-inverse-surface px-5 py-3 text-sm font-semibold text-inverse-content transition hover:bg-inverse-surface/90 disabled:opacity-50"
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
            <div className="rounded-xl border border-surface-200 bg-raised p-5 shadow-card">
              <p className="text-sm font-medium text-surface-500">{copy.totalResponses}</p>
              <p className="mt-3 text-3xl font-semibold text-surface-900">{responses.length}</p>
            </div>
            <div className="rounded-xl border border-surface-200 bg-raised p-5 shadow-card">
              <p className="text-sm font-medium text-surface-500">{copy.completionRateLabel}</p>
              <p className="mt-3 text-3xl font-semibold text-surface-900">{formatPercent(completionRate)}</p>
            </div>
            <div className="rounded-xl border border-surface-200 bg-raised p-5 shadow-card">
              <p className="text-sm font-medium text-surface-500">{copy.filterResult}</p>
              <p className="mt-3 text-3xl font-semibold text-surface-900">{filteredResponses.length}</p>
            </div>
          </div>

          <div className="rounded-xl border border-surface-200 bg-raised p-4 shadow-card">
            <div className="grid gap-3 md:grid-cols-[1fr,200px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  value={responseQuery}
                  onChange={(event) => setResponseQuery(event.target.value)}
                  aria-label={copy.searchPlaceholder}
                  placeholder={copy.searchPlaceholder}
                  className="input-field pl-10"
                />
              </label>
              <select
                aria-label={copy.allResponses}
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
            <div className="rounded-xl border border-surface-200 bg-raised px-6 py-12 text-center shadow-card">
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
                    className="rounded-xl border border-surface-200 bg-raised p-5 shadow-card"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-surface-900">
                            {response.attendee_name || copy.attendeeLabel(response.attendee_id)}
                          </h3>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${response.survey_type === "external" ? "bg-status-warning-bg text-status-warning-content" : "bg-surface-100 text-surface-700"}`}>
                            {response.survey_type === "external" ? copy.external : copy.builtin}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-surface-500">{response.attendee_email || copy.noEmail}</p>
                        <p className="mt-2 text-xs text-surface-400">{new Date(response.completed_at).toLocaleString(localeTag(lang))}</p>
                        {response.external_response_id ? (
                          <p className="mt-2 text-xs font-medium text-surface-500">{copy.externalResponseId}: <span className="font-mono text-surface-700">{response.external_response_id}</span></p>
                        ) : null}
                      </div>
                      <div className="rounded-full bg-status-success-bg px-3 py-1 text-sm font-semibold text-status-success-content">
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
