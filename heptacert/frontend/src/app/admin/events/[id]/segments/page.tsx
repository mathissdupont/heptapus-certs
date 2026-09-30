"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, AlertCircle, Loader2, CheckCircle2,
  Clock, X, Eye, Plus, Mail, BarChart3, FileText, Users,
  ListFilter, Search, Trash2, Download, Save, ExternalLink, FileSpreadsheet, ChevronDown, RefreshCw, Workflow
} from "lucide-react";

import {
  apiFetch,
  consumeOAuthBridgeToken,
  getEventSegmentExportUrl,
  createSegmentExportJob,
  deleteSavedEventSegment,
  getSegmentExportJobDownloadUrl,
  getToken,
  handoffSegmentToAutomation,
  handoffSegmentToCrm,
  listEventSegments,
  listSavedEventSegments,
  listSegmentExportJobs,
  previewEventSegment,
  saveEventSegment,
  setToken,
  type AudienceSegment,
  type AudienceSegmentKey,
  type AudienceSegmentPreview,
  type SegmentComposition,
  type SegmentExportJob,
  type SavedAudienceSegment,
} from "@/lib/api";
import { FeatureGate } from "@/lib/useSubscription";
import { useI18n, translate, type TranslationKey } from "@/lib/i18n";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import PageHeader from "@/components/Admin/PageHeader";

const STANDARD_KEYS: AudienceSegmentKey[] = [
 "attended_no_certificate",
 "certificate_holders",
 "survey_respondents",
 "no_shows",
 "repeat_attendees",
];

const SEGMENT_KEY_LABELS: Record<string, TranslationKey> = {
  attended_no_certificate: "admin_segment_attended_no_certificate",
  certificate_holders: "admin_segment_certificate_holders",
  survey_respondents: "admin_segment_survey_respondents",
  no_shows: "admin_segment_no_shows",
  repeat_attendees: "admin_segment_repeat_attendees",
  registration_answer: "admin_segment_registration_answer",
  location_filter: "admin_segment_location_filter",
  composition: "admin_segment_composition",
};

type EventSheetsStatus = {
  google_configured: boolean;
  google_connected: boolean;
  google_email?: string | null;
  spreadsheet_id?: string | null;
  spreadsheet_url?: string | null;
  sheet_name?: string | null;
  enabled: boolean;
  last_synced_at?: string | null;
  missing_scopes?: string[];
};

export default function EventSegmentsPage() {
  const params = useParams();
  const eventId = Number(params.id);
  const { lang } = useI18n();

  const copy = { gate: translate(lang, "migrated_app_admin_events_id_segments_audience_segmentation_is_available_on_grow_0bbeccc8"), title: translate(lang, "migrated_app_admin_events_id_segments_participant_segments_0ba0a03b"), subtitle: translate(lang, "migrated_app_admin_events_id_segments_quickly_split_audiences_by_attendance_cert_f7dacef7"), loadError: translate(lang, "migrated_app_admin_events_id_segments_could_not_load_segments_778061d9"), previewError: translate(lang, "migrated_app_admin_events_id_segments_could_not_load_segment_preview_6324bef7"), exportError: translate(lang, "migrated_app_admin_events_id_segments_could_not_export_segment_258aeba1"), dynamicFilter: translate(lang, "migrated_app_admin_events_id_segments_dynamic_filtering_station_1abf9cba"), fieldPlaceholder: translate(lang, "migrated_app_admin_events_id_segments_registration_field_id_e_g_department_5d3dac77"), answerPlaceholder: translate(lang, "migrated_app_admin_events_id_segments_answer_contains_e_g_marketing_1f387907"), locationPlaceholder: translate(lang, "migrated_app_admin_events_id_segments_location_city_e_g_izmir_7085e3a2"), apply: translate(lang, "migrated_app_admin_events_id_segments_apply_query_7b284c32"), preview: translate(lang, "migrated_app_admin_events_id_segments_preview_390b29f2"), previewTitle: translate(lang, "migrated_app_admin_events_id_segments_live_preview_6b5b984a"), people: translate(lang, "migrated_app_admin_events_id_segments_people_31ceefe6"), chooseSegment: translate(lang, "migrated_app_admin_events_id_segments_choose_a_segment_922463ac"), previewHint: translate(lang, "migrated_app_admin_events_id_segments_the_first_50_participants_appear_here_7a799892"), emailVerified: translate(lang, "migrated_app_admin_events_id_segments_email_verified_8940787e"), surveyDone: translate(lang, "migrated_app_admin_events_id_segments_survey_complete_1952af3f"), savedSegments: translate(lang, "migrated_app_admin_events_id_segments_saved_segments_1682d1ef"), saveSegment: translate(lang, "migrated_app_admin_events_id_segments_save_segment_1cf6992d"), segmentName: translate(lang, "migrated_app_admin_events_id_segments_segment_name_bc581b8b"), builder: translate(lang, "migrated_app_admin_events_id_segments_rule_group_builder_composition_521a952a"), addRule: translate(lang, "migrated_app_admin_events_id_segments_add_rule_247b3658"), runBuilder: translate(lang, "migrated_app_admin_events_id_segments_preview_group_7075898a"), exportJobs: translate(lang, "migrated_app_admin_events_id_segments_background_export_jobs_b0bf31f7"), queuedExport: translate(lang, "migrated_app_admin_events_id_segments_export_queued_a2e94c7d"), syncSheets: translate(lang, "migrated_app_admin_events_id_segments_google_sheets_sync_b58f9917"), backgroundExport: translate(lang, "migrated_app_admin_events_id_segments_background_export_a7173a16") };

  const sheetsCopy = { title: translate(lang, "migrated_app_admin_events_id_segments_segment_google_sheets_automation_9fc15898"), subtitle: translate(lang, "migrated_app_admin_events_id_segments_create_a_dedicated_google_sheet_for_the_se_13f763f2"), googleNotConfigured: translate(lang, "migrated_app_admin_events_id_segments_google_oauth_settings_are_missing_in_env_fd0830f5"), googleNotConnected: translate(lang, "migrated_app_admin_events_id_segments_google_account_is_not_connected_7fc730b1"), grantGoogle: translate(lang, "migrated_app_admin_events_id_segments_grant_google_access_4321e547"), completeGooglePermission: translate(lang, "migrated_app_admin_events_id_segments_complete_sheets_permission_78f206d3"), createSegmentSheet: translate(lang, "migrated_app_admin_events_id_segments_create_sheet_and_sync_eb280f37"), syncSegmentSheet: translate(lang, "migrated_app_admin_events_id_segments_sync_segment_to_sheets_ecd04a19"), openSheet: translate(lang, "migrated_app_admin_events_id_segments_open_sheet_05451f89"), latestSheet: translate(lang, "migrated_app_admin_events_id_segments_latest_segment_sheet_1173ed67"), checkingSheets: translate(lang, "migrated_app_admin_events_id_segments_checking_status_7926f5b6"), missingPermission: translate(lang, "migrated_app_admin_events_id_segments_sheets_permission_missing_b956aa4a") };

  const [segments, setSegments] = useState<AudienceSegment[]>([]);
  const [savedSegments, setSavedSegments] = useState<SavedAudienceSegment[]>([]);
  const [exportJobs, setExportJobs] = useState<SegmentExportJob[]>([]);
  const [preview, setPreview] = useState<AudienceSegmentPreview | null>(null);
  const [selectedKey, setSelectedKey] = useState<AudienceSegmentKey>("attended_no_certificate");
  const [segmentName, setSegmentName] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [answer, setAnswer] = useState("");
  const [location, setLocation] = useState("");
  const [compositionOperator, setCompositionOperator] = useState<"AND" | "OR">("AND");
  const [compositionRules, setCompositionRules] = useState<Array<{ segment_key: AudienceSegmentKey; field_id: string; answer: string; location: string }>>([
    { segment_key: "attended_no_certificate", field_id: "", answer: "", location: "" },
    { segment_key: "survey_respondents", field_id: "", answer: "", location: "" },
  ]);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [savingSegment, setSavingSegment] = useState(false);
  const [piiMode, setPiiMode] = useState<"masked" | "full">("masked");
  const [sheetsStatus, setSheetsStatus] = useState<EventSheetsStatus | null>(null);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsAction, setSheetsAction] = useState<"auth" | "sync" | null>(null);
  const [handoffLoading, setHandoffLoading] = useState<"crm" | "automation" | null>(null);
  const [authBridgeReady, setAuthBridgeReady] = useState(false);

  async function loadSegments() {
    setLoading(true);
    try {
      const filters = { field_id: fieldId || undefined, answer: answer || undefined, location: location || undefined };
      const [nextSegments, nextSaved, nextJobs] = await Promise.all([
        listEventSegments(eventId, filters),
        listSavedEventSegments(eventId),
        listSegmentExportJobs(eventId),
      ]);
      setSegments(nextSegments);
      setSavedSegments(nextSaved);
      setExportJobs(nextJobs);
    } catch (ex: any) {
      // no-op
    } finally {
      setLoading(false);
    }
  }

  async function loadSheetsStatus() {
    if (!eventId) return;
    setSheetsLoading(true);
    try {
      const response = await apiFetch(`/admin/events/${eventId}/sheets`);
      setSheetsStatus(await response.json());
    } catch {
      setSheetsStatus(null);
    } finally {
      setSheetsLoading(false);
    }
  }

  async function loadPreview(key: AudienceSegmentKey) {
    setSelectedKey(key);
    setPreviewLoading(true);
    try {
      setPreview(await previewEventSegment(eventId, key, {
        field_id: fieldId || undefined,
        answer: answer || undefined,
        location: location || undefined,
        limit: 50,
      }));
    } catch (ex: any) {
      // no-op
    } finally {
      setPreviewLoading(false);
    }
  }

  function compositionPayload(): SegmentComposition {
    return {
      operator: compositionOperator,
      rules: compositionRules.map(rule => ({
        segment_key: rule.segment_key,
        filters: {
          field_id: rule.field_id || undefined,
          answer: rule.answer || undefined,
          location: rule.location || undefined,
        },
      })),
    };
  }

  async function loadCompositionPreview() {
    setSelectedKey("composition");
    setPreviewLoading(true);
    try {
      setPreview(await previewEventSegment(eventId, "composition", {
        composition: compositionPayload(),
        limit: 50,
      }));
    } catch (ex: any) {
      // no-op
    } finally {
      setPreviewLoading(false);
    }
  }

  async function saveCurrentSegment() {
    setSavingSegment(true);
    try {
      const selected = segments.find(segment => segment.key === selectedKey);
      const name = segmentName.trim() || selected?.label || selectedKey;
      await saveEventSegment(eventId, {
        name,
        segment_key: selectedKey,
        filters: selectedKey === "composition"
          ? { composition: compositionPayload() }
          : { field_id: fieldId || undefined, answer: answer || undefined, location: location || undefined },
        visibility: "event",
      });
      setSegmentName("");
      setSavedSegments(await listSavedEventSegments(eventId));
    } catch (ex: any) {
      // no-op
    } finally {
      setSavingSegment(false);
    }
  }

  async function removeSavedSegment(segmentId: number) {
    await deleteSavedEventSegment(eventId, segmentId);
    setSavedSegments(items => items.filter(item => item.id !== segmentId));
  }

  async function openSavedSegment(segment: SavedAudienceSegment) {
    const nextField = String(segment.filters?.field_id || "");
    const nextAnswer = String(segment.filters?.answer || "");
    const nextLocation = String(segment.filters?.location || "");
    setSelectedKey(segment.segment_key);
    setFieldId(nextField);
    setAnswer(nextAnswer);
    setLocation(nextLocation);
    const savedComposition = segment.filters?.composition as SegmentComposition | undefined;
    if (segment.segment_key === "composition" && savedComposition) {
      setCompositionOperator(savedComposition.operator === "OR" ? "OR" : "AND");
      setCompositionRules(
        savedComposition.rules.map(rule => ({
          segment_key: rule.segment_key,
          field_id: String(rule.filters?.field_id || ""),
          answer: String(rule.filters?.answer || ""),
          location: String(rule.filters?.location || ""),
        })),
      );
    }
    setPreviewLoading(true);
    try {
      setPreview(await previewEventSegment(eventId, segment.segment_key, {
        field_id: nextField || undefined,
        answer: nextAnswer || undefined,
        location: nextLocation || undefined,
        composition: savedComposition,
        limit: 50,
      }));
    } catch (ex: any) {
      // no-op
    } finally {
      setPreviewLoading(false);
    }
  }

  async function exportSegment(key: AudienceSegmentKey) {
    const url = getEventSegmentExportUrl(eventId, key, {
      field_id: fieldId || undefined,
      answer: answer || undefined,
      location: location || undefined,
      composition: key === "composition" ? compositionPayload() : undefined,
      pii_mode: piiMode,
    });
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `event-${eventId}-${key}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  async function queueSegmentExport(key: AudienceSegmentKey, syncGoogleSheets = false) {
    const filters = key === "composition"
      ? { composition: compositionPayload() }
      : { field_id: fieldId || undefined, answer: answer || undefined, location: location || undefined };
    try {
      await createSegmentExportJob(eventId, {
        segment_key: key,
        filters,
        sync_google_sheets: syncGoogleSheets,
        pii_mode: piiMode,
      });
      setExportJobs(await listSegmentExportJobs(eventId));
    } catch (ex: any) {
      // no-op
    }
  }

  async function handleConnectGoogleSheetsAuth() {
    setSheetsAction("auth");
    try {
      const frontendOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const params = new URLSearchParams({
        next: `/admin/events/${eventId}/segments`,
        frontend_origin: frontendOrigin,
        event_id: String(eventId),
      });
      const response = await apiFetch(`/admin/google/sheets/start?${params.toString()}`);
      const data = await response.json();
      if (!data?.authorization_url) throw new Error("Google yetkilendirme adresi alınamadı.");
      window.location.href = data.authorization_url;
    } catch (ex: any) {
      setSheetsAction(null);
    }
  }

  async function handleSyncSegmentSheet() {
    setSheetsAction("sync");
    try {
      await queueSegmentExport(selectedKey, true);
      await loadSheetsStatus();
    } finally {
      setSheetsAction(null);
    }
  }

  function currentSegmentFilters(key: AudienceSegmentKey) {
    return key === "composition"
      ? { composition: compositionPayload() }
      : { field_id: fieldId || undefined, answer: answer || undefined, location: location || undefined };
  }

  async function handleCrmHandoff(key: AudienceSegmentKey) {
    setHandoffLoading("crm");
    try {
      await handoffSegmentToCrm(eventId, key, { add_tags: ["segment", `segment:${key}`] }, currentSegmentFilters(key));
    } catch (ex: any) {
      // no-op
    } finally {
      setHandoffLoading(null);
    }
  }

  async function handleAutomationHandoff(key: AudienceSegmentKey) {
    setHandoffLoading("automation");
    try {
      await handoffSegmentToAutomation(eventId, key, { name: `Segment otomasyonu: ${key}`, enabled: true }, currentSegmentFilters(key));
    } catch (ex: any) {
      // no-op
    } finally {
      setHandoffLoading(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const hasBridge = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("oauth_bridge") === "1";
    const finish = () => {
      if (!cancelled) setAuthBridgeReady(true);
    };
    if (!hasBridge) {
      finish();
      return () => { cancelled = true; };
    }
    void consumeOAuthBridgeToken()
      .then(({ access_token, mode }) => {
        if (cancelled || mode !== "admin") return;
        setToken(access_token);
        const url = new URL(window.location.href);
        url.searchParams.delete("oauth_bridge");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      })
      .finally(finish);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!authBridgeReady) return;
    void loadSegments();
    void loadSheetsStatus();
  }, [eventId, authBridgeReady]);

  const standardSegments = segments.filter(segment => STANDARD_KEYS.includes(segment.key));
  const dynamicSegments = segments.filter(segment => segment.dynamic);
  const latestSheetJob = exportJobs.find(job => Boolean(job.google_spreadsheet_url)) || exportJobs.find(job => job.sync_google_sheets);

  return (
    <FeatureGate requiredPlans={["growth", "enterprise"]} message={copy.gate}>
      <div className="w-full flex flex-col gap-5 antialiased text-surface-900 pb-16">

        {/* ÜST NAVİGASYON */}
        <EventAdminNav eventId={eventId} active="segments" />

        {/* SAYFA BAŞLIĞI */}
        <PageHeader
          title={copy.title}
          subtitle={copy.subtitle}
          icon={<ListFilter className="h-4 w-4 stroke-[2]" />}
        />

        {/* 1. DİNAMİK FİLTRE İSTASYONU */}
        <section className="rounded-2xl border border-surface-200 bg-raised p-5 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
            <Search className="h-4 w-4 text-surface-800 stroke-[2]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.dynamicFilter}</h2>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-[1fr_1fr_1fr_auto]">
            <input value={fieldId} onChange={event => setFieldId(event.target.value)} className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 placeholder:text-surface-400" placeholder={copy.fieldPlaceholder} />
            <input value={answer} onChange={event => setAnswer(event.target.value)} className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 placeholder:text-surface-400" placeholder={copy.answerPlaceholder} />
            <input value={location} onChange={event => setLocation(event.target.value)} className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 placeholder:text-surface-400" placeholder={copy.locationPlaceholder} />
            <button type="button" onClick={() => void loadSegments()} className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-surface-900 px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-surface-800 active:scale-[0.98]">
              <ListFilter className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>{copy.apply}</span>
            </button>
          </div>
        </section>

        {/* 2. KURAL GRUBU MİMARI (Composition Builder) */}
        <section className="rounded-2xl border border-surface-200 bg-raised p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-surface-800 stroke-[2]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.builder}</h2>
            </div>
            <div className="relative inline-flex items-center select-none">
              <select
                value={compositionOperator}
                onChange={event => setCompositionOperator(event.target.value as "AND" | "OR")}
                className="appearance-none rounded-xl border border-surface-200 bg-raised pl-3 pr-7 py-1 min-h-[30px] text-xs font-bold text-surface-800 outline-none hover:border-surface-300 cursor-pointer"
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-surface-400" />
            </div>
          </div>

          <div className="space-y-2">
            {compositionRules.map((rule, index) => (
              <div key={index} className="grid gap-2 rounded-xl border border-surface-100 bg-surface-50/20 p-3 md:grid-cols-[160px_1fr_1fr_1fr_auto] items-center">
                <div className="relative inline-flex items-center w-full">
                  <select
                    value={rule.segment_key}
                    onChange={event => setCompositionRules(items => items.map((item, i) => i === index ? { ...item, segment_key: event.target.value as AudienceSegmentKey } : item))}
                    className="w-full min-h-[34px] appearance-none rounded-lg border border-surface-200 bg-raised px-2.5 text-xs font-semibold outline-none cursor-pointer"
                  >
                    {STANDARD_KEYS.map(key => (
                      <option key={key} value={key}>
                        {SEGMENT_KEY_LABELS[key] ? translate(lang, SEGMENT_KEY_LABELS[key]) : key}
                      </option>
                    ))}
                    <option value="registration_answer">{translate(lang, SEGMENT_KEY_LABELS.registration_answer)}</option>
                    <option value="location_filter">{translate(lang, SEGMENT_KEY_LABELS.location_filter)}</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-surface-400" />
                </div>
                <input value={rule.field_id} onChange={event => setCompositionRules(items => items.map((item, i) => i === index ? { ...item, field_id: event.target.value } : item))} className="w-full min-h-[34px] rounded-lg border border-surface-200 bg-raised px-2.5 text-xs font-semibold outline-none focus:border-outline-strong" placeholder={copy.fieldPlaceholder} />
                <input value={rule.answer} onChange={event => setCompositionRules(items => items.map((item, i) => i === index ? { ...item, answer: event.target.value } : item))} className="w-full min-h-[34px] rounded-lg border border-surface-200 bg-raised px-2.5 text-xs font-semibold outline-none focus:border-outline-strong" placeholder={copy.answerPlaceholder} />
                <input value={rule.location} onChange={event => setCompositionRules(items => items.map((item, i) => i === index ? { ...item, location: event.target.value } : item))} className="w-full min-h-[34px] rounded-lg border border-surface-200 bg-raised px-2.5 text-xs font-semibold outline-none focus:border-outline-strong" placeholder={copy.locationPlaceholder} />
                <button type="button" onClick={() => setCompositionRules(items => items.filter((_, i) => i !== index))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-100 bg-raised text-surface-400 hover:bg-status-danger-bg hover:text-status-danger-content transition-all active:scale-90 shadow-sm shrink-0">
                  <Trash2 className="h-3.5 w-3.5 stroke-[1.8]" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => setCompositionRules(items => [...items, { segment_key: "no_shows", field_id: "", answer: "", location: "" }])} className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold text-surface-700 shadow-sm transition hover:bg-surface-50 active:scale-95">
              <Plus className="h-4 w-4 stroke-[2.5]" /> <span>{copy.addRule}</span>
            </button>
            <button type="button" onClick={() => void loadCompositionPreview()} className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg bg-surface-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-surface-800 active:scale-95">
              <Eye className="h-4 w-4 stroke-[2]" /> <span>{copy.runBuilder}</span>
            </button>
            <button type="button" onClick={() => void queueSegmentExport("composition")} className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold text-surface-700 shadow-sm transition hover:bg-surface-50 active:scale-95">
              <Download className="h-4 w-4 stroke-[1.8]" /> <span>{copy.backgroundExport}</span>
            </button>
            <button type="button" onClick={() => void handleCrmHandoff("composition")} disabled={handoffLoading === "crm"} className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold text-surface-700 shadow-sm transition hover:bg-surface-50 disabled:opacity-40">
              {handoffLoading === "crm" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} <span>CRM'e Aktar</span>
            </button>
            <button type="button" onClick={() => void handleAutomationHandoff("composition")} disabled={handoffLoading === "automation"} className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold text-surface-700 shadow-sm transition hover:bg-surface-50 disabled:opacity-40">
              {handoffLoading === "automation" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} <span>Otomasyon Oluştur</span>
            </button>
          </div>
        </section>

        {/* 3. KAYDEDİLEN SEGMENTLER VE PII AYARLARI */}
        <section className="rounded-2xl border border-surface-200 bg-raised p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-surface-100 pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.savedSegments}</h2>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative inline-flex items-center select-none flex-1 sm:flex-initial">
                <select value={piiMode} onChange={event => setPiiMode(event.target.value as "masked" | "full")} className="w-full sm:w-44 min-h-[34px] appearance-none rounded-xl border border-surface-200 bg-raised px-3 text-xs font-semibold outline-none hover:border-surface-300 cursor-pointer">
                  <option value="masked">{translate(lang, "migrated_app_admin_events_id_segments_masked_pii_8fc04c9c")}</option>
                  <option value="full">{translate(lang, "migrated_app_admin_events_id_segments_full_data_enterprise_0d82a3f6")}</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-surface-400" />
              </div>
              <input value={segmentName} onChange={event => setSegmentName(event.target.value)} className="flex-1 sm:w-48 min-h-[34px] rounded-xl border border-surface-200 bg-raised px-3 text-xs font-semibold outline-none focus:border-surface-900 placeholder:text-surface-400" placeholder={copy.segmentName} />
              <button type="button" onClick={() => void saveCurrentSegment()} disabled={savingSegment} className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg bg-surface-900 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-surface-800 disabled:opacity-40">
                {savingSegment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 stroke-[1.8]" />}
                <span>{copy.saveSegment}</span>
              </button>
            </div>
          </div>

          {savedSegments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {savedSegments.map(segment => (
                <button key={segment.id} type="button" onClick={() => void openSavedSegment(segment)} className="inline-flex items-center gap-2 rounded-lg border border-surface-200 bg-raised pl-3 pr-2 py-1 text-xs font-semibold text-surface-700 hover:border-surface-300 shadow-sm transition-all">
                  <span>{segment.name} · <span className="font-mono text-surface-400">{segment.last_count}</span></span>
                  <span onClick={(e) => { e.stopPropagation(); void removeSavedSegment(segment.id); }} className="p-1 rounded-md hover:bg-status-danger-bg text-surface-400 hover:text-status-danger-content transition-colors"><X className="h-3 w-3 stroke-[2.5]" /></span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 4. GOOGLE SHEETS LIVE OTOMASYONU */}
        <section className="rounded-2xl border border-surface-200 bg-raised p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-status-success-border bg-status-success-bg text-status-success-content shadow-sm">
                <FileSpreadsheet className="h-4 w-4 stroke-[2]" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <h2 className="text-xs font-bold text-surface-900 tracking-tight">{sheetsCopy.title}</h2>
                <p className="text-11 leading-relaxed text-surface-400 max-w-2xl">{sheetsCopy.subtitle}</p>

                <div className="pt-1 flex flex-wrap items-center gap-2 text-11 font-bold text-surface-400">
                  {sheetsLoading ? (
                    <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> {sheetsCopy.checkingSheets}</span>
                  ) : sheetsStatus?.google_email ? (
                    <span className="rounded-md bg-status-success-bg border border-status-success-border/50 px-1.5 py-0.5 text-status-success-content">{sheetsStatus.google_email}</span>
                  ) : (
                    <span>{sheetsCopy.googleNotConnected}</span>
                  )}
                  {Boolean(sheetsStatus?.missing_scopes?.length) && (
                    <span className="rounded-md bg-status-warning-bg border border-status-warning-border/50 px-1.5 py-0.5 text-status-warning-content">{sheetsCopy.missingPermission}</span>
                  )}
                  {latestSheetJob?.google_spreadsheet_url && (
                    <span>{sheetsCopy.latestSheet}: #{latestSheetJob.id}{latestSheetJob.row_count ? ` · ${latestSheetJob.row_count} alıcı` : ""}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Google Sheets Düğme Kontrolleri */}
            <div className="flex flex-wrap gap-2 lg:justify-end shrink-0 w-full lg:w-auto">
              {!sheetsStatus?.google_configured ? (
                <div className="rounded-lg border border-status-warning-border bg-status-warning-bg/50 px-2.5 py-1.5 text-11 font-semibold text-status-warning-content">{sheetsCopy.googleNotConfigured}</div>
              ) : !sheetsStatus?.google_connected ? (
                <button type="button" onClick={handleConnectGoogleSheetsAuth} disabled={Boolean(sheetsAction)} className="w-full lg:w-auto inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-40">
                  {sheetsAction === "auth" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 stroke-[2]" />}
                  <span>{sheetsStatus?.google_email ? sheetsCopy.completeGooglePermission : sheetsCopy.grantGoogle}</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 w-full lg:w-auto">
                  {latestSheetJob?.google_spreadsheet_url && (
                    <a href={latestSheetJob.google_spreadsheet_url} target="_blank" rel="noreferrer" className="flex-1 lg:flex-initial inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-surface-200 bg-raised px-2.5 text-11 font-semibold text-surface-700 shadow-sm hover:bg-surface-50">
                      <ExternalLink className="h-3 w-3" /> {sheetsCopy.openSheet}
                    </a>
                  )}
                  <button type="button" onClick={handleSyncSegmentSheet} disabled={Boolean(sheetsAction)} className="flex-1 lg:flex-initial inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 text-11 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40">
                    {sheetsAction === "sync" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 stroke-[2.2]" />}
                    <span>{latestSheetJob?.google_spreadsheet_url ? sheetsCopy.syncSegmentSheet : sheetsCopy.createSegmentSheet}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 5. ARKA PLAN KUYRUĞU TAKİBİ (Export Jobs) */}
        {exportJobs.length > 0 && (
          <section className="rounded-2xl border border-surface-200 bg-raised p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between gap-3 border-b border-surface-100 pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900 flex items-center gap-1.5"><FileText className="h-4 w-4 text-surface-400 stroke-[1.8]" /> {copy.exportJobs}</h2>
              <button type="button" onClick={() => void listSegmentExportJobs(eventId).then(setExportJobs)} className="inline-flex min-h-[26px] items-center justify-center rounded-lg border border-surface-200 bg-raised px-2.5 text-11 font-bold text-surface-700 shadow-sm hover:bg-surface-50">{copy.apply.split(" ")[0]}</button>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 font-medium">
              {exportJobs.map(job => (
                <div key={job.id} className="rounded-xl border border-surface-100 bg-raised p-3 shadow-sm flex items-start justify-between gap-3 transition-colors hover:border-surface-200">
                  <div className="min-w-0 flex-1 space-y-0.5 text-xs">
                    <p className="font-bold text-surface-900 font-mono truncate">İş ID: #{job.id} · {job.segment_key}</p>
                    <p className="text-11 text-surface-400">{job.status} · <span className="font-mono">{job.row_count} satır</span></p>
                    {job.error_message && <p className="text-11 font-semibold text-status-danger-content truncate">{job.error_message}</p>}
                    {job.google_spreadsheet_url && <a href={job.google_spreadsheet_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-11 font-bold text-status-success-content underline">E-Tablo Linki <ExternalLink className="h-2.5 w-2.5" /></a>}
                  </div>
                  {job.status === "completed" && (
                    <a href={getSegmentExportJobDownloadUrl(eventId, job.id)} className="shrink-0 inline-flex h-7 items-center justify-center rounded-lg border border-surface-200 bg-raised px-2.5 text-11 font-bold text-surface-800 shadow-sm hover:bg-surface-50" target="_blank" rel="noreferrer">CSV</a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. ANA SEGMENT KARTLARI HAVUZU VE MATRİS CANLI ÖNİZLEME YAN PANELİ */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-surface-400 stroke-[2.5]" /></div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] items-start w-full">

            {/* Sol Hücre Seti: Hazır & Dinamik Segment Kartları */}
            <section className="grid gap-3 sm:grid-cols-2 w-full">
              {[...standardSegments, ...dynamicSegments].map((segment) => {
                const isSegSel = selectedKey === segment.key;
                return (
                  <article key={`${segment.key}-${segment.label}`} className={`rounded-2xl border bg-raised p-4 shadow-sm flex flex-col justify-between gap-4 transition-all duration-300 ${isSegSel ? "border-outline-strong ring-1 ring-outline-strong" : "border-surface-200"}`}>
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0 space-y-0.5 flex-1">
                        <p className="font-bold text-xs text-surface-900 tracking-tight truncate">{segment.label}</p>
                        <p className="text-11 leading-relaxed text-surface-400 line-clamp-2 font-medium">{segment.description}</p>
                      </div>
                      <span className="shrink-0 inline-flex rounded-md bg-surface-50 border border-surface-100 px-2 py-0.5 text-xs font-bold font-mono text-surface-900 shadow-inner tabular-nums">{segment.count}</span>
                    </div>

                    {/* Kart İçi Mikro Aksiyon Düğmeleri Şeridi */}
                    <div className="grid grid-cols-5 gap-1 pt-1.5 border-t border-outline-subtle text-11 font-bold">
                      <button type="button" onClick={() => void loadPreview(segment.key)} className="col-span-2 inline-flex h-7 items-center justify-center gap-1 rounded-md border border-surface-200 bg-raised text-surface-700 shadow-sm hover:bg-surface-50 transition-all">
                        <Eye className="h-3 w-3 text-surface-400" /> <span>{copy.preview.split(" ")[0]}</span>
                      </button>
                      <button type="button" onClick={() => void exportSegment(segment.key)} className="inline-flex h-7 items-center justify-center rounded-md border border-surface-100 bg-surface-50 px-1 text-surface-600 hover:bg-surface-100">CSV</button>
                      <button type="button" onClick={() => void queueSegmentExport(segment.key)} className="inline-flex h-7 items-center justify-center rounded-md border border-surface-100 bg-surface-50 px-1 text-surface-600 hover:bg-surface-100" title="Arka Plan Kuyruğuna Gönder">Kuyruk</button>
                      <button type="button" onClick={() => void handleCrmHandoff(segment.key)} className="inline-flex h-7 items-center justify-center rounded-md border border-surface-100 bg-surface-50 px-1 text-surface-600 hover:bg-surface-100" title="CRM Veritabanına Aktar">CRM</button>
                    </div>
                  </article>
                );
              })}
            </section>

            {/* Sağ Hücre Seti: Canlı Katılımcı Önizleme Listesi Panel Filtresi */}
            <aside className="rounded-2xl border border-surface-200 bg-raised p-5 shadow-sm space-y-4 h-fit sticky top-5">
              <div className="flex items-center justify-between gap-3 border-b border-surface-100 pb-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900 flex items-center gap-1.5"><Users className="h-4 w-4 text-surface-400 stroke-[1.8]" /> {copy.previewTitle}</h2>
                {preview && <span className="rounded-md bg-surface-900 px-2 py-0.5 text-11 font-bold text-white shadow-sm animate-in fade-in duration-100 tabular-nums">{preview.segment.count} {copy.people}</span>}
              </div>

              {previewLoading ? (
                <div className="flex justify-center py-14"><Loader2 className="h-6 w-6 animate-spin text-surface-400 stroke-[2.5]" /></div>
              ) : !preview ? (
                <div className="py-14 text-center">
                  <Users className="mx-auto h-9 w-9 text-surface-300 stroke-[1.5]" />
                  <p className="mt-3 text-xs font-bold text-surface-900 tracking-tight">{copy.chooseSegment}</p>
                  <p className="mt-1 text-11 text-surface-400 leading-relaxed">{copy.previewHint}</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-0.5 scrollbar-none bg-raised">
                  {preview.attendees.map((attendee) => (
                    <div key={attendee.id} className="rounded-xl border border-surface-100 bg-raised p-3 shadow-sm space-y-1.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-surface-900 tracking-tight">{attendee.name}</p>
                        <p className="truncate text-11 font-medium text-surface-400 font-mono mt-0.5">{attendee.email}</p>
                      </div>

                      {/* Küçük Durum Sinyal Rozetleri */}
                      {(attendee.email_verified || attendee.survey_completed) && (
                        <div className="flex flex-wrap gap-1">
                          {attendee.email_verified && <span className="rounded bg-status-success-bg px-1.5 py-0.5 text-11 font-bold text-status-success-content">{copy.emailVerified.split(" ")[0]}</span>}
                          {attendee.survey_completed && <span className="rounded bg-status-info-bg px-1.5 py-0.5 text-11 font-bold text-status-info-content">{copy.surveyDone}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>
        )}

      </div>
    </FeatureGate>
  );
}
