"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Download,
  FileBadge2,
  Loader2,
  Mail,
  Save,
  Search,
  Send,
  Tag,
  Ticket,
  UsersRound,
  User,
  AlertCircle,
  Calendar,
  Columns3,
  List,
  Upload,
  UserX,
  Database,
  KeyRound,
} from "lucide-react";
import {
  exportSelectedCrmParticipants,
  getCrmParticipant,
  getHubSpotIntegration,
  importCrmFromCsv,
  listCrmDuplicateCandidates,
  listCrmParticipants,
  mergeCrmParticipants,
  pushCrmParticipantsToHubSpot,
  sendCrmBulkEmail,
  tagCrmNoShows,
  testHubSpotIntegration,
  updateHubSpotIntegration,
  updateCrmParticipant,
  type CrmDuplicateCandidate,
  type HubSpotIntegrationStatus,
  type CrmParticipantDetail,
  type CrmParticipantListItem,
} from "@/lib/api";
import EmailTemplateSelect from "@/components/Admin/EmailTemplateSelect";
import DateTimeField from "@/components/Admin/DateTimeField";
import { FeatureGate } from "@/lib/useSubscription";
import { useI18n, translate } from "@/lib/i18n";

// Lifecycle labels are rendered via copy.lifecycleOptions below (bilingual)
const LIFECYCLE_VALUES = ["lead", "active", "vip", "renewal", "inactive"] as const;

const TAG_DISPLAY_LABELS: Record<string, string> = {
  attended_no_certificate: "Katıldı, Sertifikasız",
  certificate_holders: "Sertifika Alanlar",
  certificate_holder: "Sertifika Alanlar",
  survey_respondents: "Anket Yanıtlayanlar",
  no_shows: "Gelmeyen Kayıtlılar",
  no_show: "Gelmeyen Kayıtlılar",
  repeat_attendees: "Tekrar Katılanlar",
  segment: "Segment",
  // Lifecycle statuses
  lead: "Lead",
  active: "Aktif",
  vip: "VIP",
  renewal: "Yenileme",
  inactive: "Pasif",
};

function formatTag(raw: string): string {
  // Strip "segment:" prefix if present
  const stripped = raw.startsWith("segment:") ? raw.slice(8) : raw;
  if (stripped === "segment") return "Segment";
  if (TAG_DISPLAY_LABELS[stripped]) return TAG_DISPLAY_LABELS[stripped];
  // Convert underscores/hyphens to spaces, capitalize first letter
  return stripped.replace(/[_-]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function formatDate(value?: string | null, lang?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(localeTag(lang), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function timelineIcon(type: string) {
  if (type === "certificate") return FileBadge2;
  if (type === "ticket" || type === "checkin") return Ticket;
  if (type === "survey" || type === "attendance") return CheckCircle2;
  if (type === "email_verified") return Mail;
  return Clock3;
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function AdminCrmPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const lifecycleOptions = [
    { value: "lead",     label: isTr ? "Lead"      : "Lead" },
    { value: "active",   label: isTr ? "Aktif"     : "Active" },
    { value: "vip",      label: "VIP" },
    { value: "renewal",  label: isTr ? "Yenileme"  : "Renewal" },
    { value: "inactive", label: isTr ? "Pasif"     : "Inactive" },
  ];
  const copy = { eyebrow: translate(lang, "migrated_app_admin_crm_event_crm_6d1b119a"), title: translate(lang, "migrated_app_admin_crm_participant_crm_fdcf6122"), subtitle: translate(lang, "migrated_app_admin_crm_manage_organization_wide_participant_histo_84b1627b"), searchPlaceholder: translate(lang, "migrated_app_admin_crm_search_name_or_email_44b7bbe1"), allStatuses: translate(lang, "migrated_app_admin_crm_all_statuses_e4d384bd"), tagPlaceholder: translate(lang, "migrated_app_admin_crm_tag_filter_1338c399"), search: translate(lang, "migrated_app_admin_crm_search_e1242dc9"), people: translate(lang, "migrated_app_admin_crm_people_53a36ab3"), noMatches: translate(lang, "migrated_app_admin_crm_no_matching_participants_found_7304afdc"), attendee: translate(lang, "migrated_app_admin_crm_attendee_fd00bdfa"), selectPerson: translate(lang, "migrated_app_admin_crm_select_a_participant_45fa36fc"), detailHint: translate(lang, "migrated_app_admin_crm_participant_details_history_and_metrics_wi_a291edd4"), save: translate(lang, "migrated_app_admin_crm_save_changes_d4989288"), attendance: translate(lang, "migrated_app_admin_crm_attendance_c1d13e4e"), events: translate(lang, "migrated_app_admin_crm_events_e9303360"), info: translate(lang, "migrated_app_admin_crm_crm_profile_details_4ac7759a"), status: translate(lang, "migrated_app_admin_crm_lifecycle_status_31497e2c"), tags: translate(lang, "migrated_app_admin_crm_tags_comma_separated_414cb6e3"), priority: translate(lang, "migrated_app_admin_crm_priority_level_b989e81b"), leadScore: translate(lang, "migrated_app_admin_crm_lead_score_0_100_f9a69354"), followUp: translate(lang, "migrated_app_admin_crm_next_follow_up_date_eeba10d4"), customFields: translate(lang, "migrated_app_admin_crm_custom_fields_json_05589b7b"), duplicates: translate(lang, "migrated_app_admin_crm_possible_duplicates_e0139656"), merge: translate(lang, "migrated_app_admin_crm_merge_records_87ba5868"), selected: translate(lang, "migrated_app_admin_crm_selected_432ef4fe"), selectAll: translate(lang, "migrated_app_admin_crm_select_all_23c35fdd"), clearSelection: translate(lang, "migrated_app_admin_crm_clear_63c35abc"), exportCsv: translate(lang, "migrated_app_admin_crm_export_csv_7b42358d"), templateId: translate(lang, "migrated_app_admin_crm_email_template_ad7304e2"), sendEmail: translate(lang, "migrated_app_admin_crm_send_email_6ee2a99b"), bulkEmailResult: translate(lang, "migrated_app_admin_crm_result_014b6406"), notes: translate(lang, "migrated_app_admin_crm_internal_operation_notes_db105d61"), notesPlaceholder: translate(lang, "migrated_app_admin_crm_sales_support_or_event_notes_for_this_part_f57a8bd3"), updated: translate(lang, "migrated_app_admin_crm_last_updated_ab986d17"), timeline: translate(lang, "migrated_app_admin_crm_credential_event_timeline_1ca09367"), emptyTimeline: translate(lang, "migrated_app_admin_crm_no_timeline_records_yet_b2b739a7"), history: translate(lang, "migrated_app_admin_crm_attended_events_history_5086a60f"), registered: translate(lang, "migrated_app_admin_crm_registered_15480763"), emailVerified: translate(lang, "migrated_app_admin_crm_email_verified_3ae34649"), surveyDone: translate(lang, "migrated_app_admin_crm_survey_complete_735898a4"), checkinExists: translate(lang, "migrated_app_admin_crm_checked_in_f9e79b7b"), tickets: translate(lang, "migrated_app_admin_crm_tickets_1d6309fa"), certificates: translate(lang, "migrated_app_admin_crm_certificates_5e99a6df"), loadError: translate(lang, "migrated_app_admin_crm_could_not_load_crm_list_2db02e5d"), detailError: translate(lang, "migrated_app_admin_crm_could_not_load_participant_details_12b45c57"), saveError: translate(lang, "migrated_app_admin_crm_could_not_save_crm_notes_50904395"), listView: translate(lang, "migrated_app_admin_crm_list_83eb37d5"), kanbanView: translate(lang, "migrated_app_admin_crm_kanban_fb8326cd"), tagNoShows: translate(lang, "migrated_app_admin_crm_tag_no_shows_60df523f"), csvImport: translate(lang, "migrated_app_admin_crm_import_csv_d8e5832f"), hubSpotSave: translate(lang, "migrated_app_admin_crm_save_2811cc13"), hubSpotTest: translate(lang, "migrated_app_admin_crm_test_5c716500"), hubSpotPush: translate(lang, "migrated_app_admin_crm_push_selected_fd324462"), hubSpotConnected: translate(lang, "migrated_app_admin_crm_connected_d5f13020"), hubSpotNotConfigured: translate(lang, "migrated_app_admin_crm_not_configured_616b867c"), scoreLabel: translate(lang, "migrated_app_admin_crm_score_d2c4ec14"), certShort: translate(lang, "migrated_app_admin_crm_certs_fab3ecbd"), surveyShort: translate(lang, "migrated_app_admin_crm_surveys_ce24726c"), noShowSuccess: (tagged: number, skipped: number) => translate(lang, "migrated_app_admin_crm_no_show_tagging_value0_tagged_value1_skipp_8edc7b44", { value0: tagged, value1: skipped }), noShowError: translate(lang, "migrated_app_admin_crm_no_show_tagging_failed_9ecc443b"), csvSuccess: (created: number, updated: number, skipped: number, err?: string) => translate(lang, "migrated_app_admin_crm_csv_import_value0_new_value1_updated_value_3d68d651", { value0: created, value1: updated, value2: skipped, value3: err ? ` (${err})` : "" }), csvError: translate(lang, "migrated_app_admin_crm_csv_import_failed_f4ae16f8"), hubSpotSaved: translate(lang, "migrated_app_admin_crm_hubspot_connection_saved_29f072a4"), hubSpotSaveError: translate(lang, "migrated_app_admin_crm_could_not_save_hubspot_token_26d1fe36"), hubSpotTestSuccess: translate(lang, "migrated_app_admin_crm_hubspot_token_test_successful_84328590"), hubSpotTestError: translate(lang, "migrated_app_admin_crm_hubspot_token_test_failed_ad421cb0"), hubSpotPushSuccess: (pushed: number, created: number, updated: number, failed: number) => translate(lang, "migrated_app_admin_crm_hubspot_value0_pushed_value1_created_value_5b85d374", { value0: pushed, value1: created, value2: updated, value3: failed }), hubSpotPushError: translate(lang, "migrated_app_admin_crm_hubspot_push_failed_5170034a"), customFieldsError: translate(lang, "migrated_app_admin_crm_custom_fields_must_be_valid_json_65af5898"), priorityLow: translate(lang, "migrated_app_admin_crm_low_a0efe2f4"), priorityNormal: translate(lang, "migrated_app_admin_crm_normal_ec8305fc"), priorityHigh: translate(lang, "migrated_app_admin_crm_high_87429e7d"), priorityUrgent: translate(lang, "migrated_app_admin_crm_urgent_3b47e095"), exportError: translate(lang, "migrated_app_admin_crm_crm_export_failed_2f639a56"), bulkEmailError: translate(lang, "migrated_app_admin_crm_crm_bulk_email_failed_208d1e5c"), bulkEmailSummary: (sent: number, skipped: number, failed: number) => translate(lang, "migrated_app_admin_crm_result_value0_sent_value1_skipped_value2_f_a5622031", { value0: sent, value1: skipped, value2: failed }), mergeError: translate(lang, "migrated_app_admin_crm_crm_merge_failed_3928e1b3"), hubSpotTokenPlaceholder: translate(lang, "migrated_app_admin_crm_hubspot_private_app_token_69a68ccf") };

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [tag, setTag] = useState("");
  const [participants, setParticipants] = useState<CrmParticipantListItem[]>([]);
  const [duplicates, setDuplicates] = useState<CrmDuplicateCandidate[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [detail, setDetail] = useState<CrmParticipantDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [lifecycleStatus, setLifecycleStatus] = useState("lead");
  const [priority, setPriority] = useState("normal");
  const [leadScore, setLeadScore] = useState(0);
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [customFieldsText, setCustomFieldsText] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkTemplateId, setBulkTemplateId] = useState("");
  const [bulkWorking, setBulkWorking] = useState(false);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);
  const [hubSpotStatus, setHubSpotStatus] = useState<HubSpotIntegrationStatus | null>(null);
  const [hubSpotToken, setHubSpotToken] = useState("");
  const [hubSpotWorking, setHubSpotWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "kanban">("list");
  const searchDebounceReady = useRef(false);

  const knownTags = useMemo(() => {
    const values = new Set<string>();
    participants.forEach((participant) => participant.meta.tags.forEach((item) => values.add(item)));
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [participants]);
  const visibleEmails = useMemo(() => participants.map((participant) => participant.email), [participants]);
  const selectedVisibleCount = selectedEmails.filter((email) => visibleEmails.includes(email)).length;

  function toggleSelectedEmail(email: string) {
    setSelectedEmails((items) =>
      items.includes(email) ? items.filter((item) => item !== email) : [...items, email],
    );
  }

  function selectVisibleParticipants() {
    setSelectedEmails((items) => Array.from(new Set([...items, ...visibleEmails])));
  }

  async function runTagNoShows() {
    setBulkWorking(true);
    setBulkNotice(null);
    setError(null);
    try {
      const result = await tagCrmNoShows();
      setBulkNotice(copy.noShowSuccess(result.tagged, result.skipped));
      await loadParticipants(null);
    } catch (ex: any) {
      setError(ex?.message || copy.noShowError);
    } finally {
      setBulkWorking(false);
    }
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkWorking(true);
    setBulkNotice(null);
    setError(null);
    try {
      const result = await importCrmFromCsv(file);
      setBulkNotice(copy.csvSuccess(result.created, result.updated, result.skipped, result.errors.length ? result.errors[0] : undefined));
      await loadParticipants(null);
    } catch (ex: any) {
      setError(ex?.message || copy.csvError);
    } finally {
      setBulkWorking(false);
      e.target.value = "";
    }
  }

  async function exportSelected() {
    if (selectedEmails.length === 0) return;
    setBulkWorking(true);
    setBulkNotice(null);
    setError(null);
    try {
      const { blob, filename } = await exportSelectedCrmParticipants(selectedEmails);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (ex: any) {
      setError(ex?.message || copy.exportError);
    } finally {
      setBulkWorking(false);
    }
  }

  async function sendBulkEmail() {
    const templateId = Number(bulkTemplateId);
    if (!templateId || selectedEmails.length === 0) return;
    setBulkWorking(true);
    setBulkNotice(null);
    setError(null);
    try {
      const result = await sendCrmBulkEmail({ emails: selectedEmails, email_template_id: templateId });
      setBulkNotice(copy.bulkEmailSummary(result.sent, result.skipped, result.failed));
    } catch (ex: any) {
      setError(ex?.message || copy.bulkEmailError);
    } finally {
      setBulkWorking(false);
    }
  }

  async function loadHubSpotStatus() {
    try {
      const status = await getHubSpotIntegration();
      setHubSpotStatus(status);
    } catch {
      setHubSpotStatus(null);
    }
  }

  async function saveHubSpotToken() {
    if (!hubSpotToken.trim()) return;
    setHubSpotWorking(true);
    setError(null);
    try {
      const status = await updateHubSpotIntegration({ private_app_token: hubSpotToken.trim(), enabled: true });
      setHubSpotStatus(status);
      setHubSpotToken("");
      setBulkNotice(copy.hubSpotSaved);
    } catch (ex: any) {
      setError(ex?.message || copy.hubSpotSaveError);
    } finally {
      setHubSpotWorking(false);
    }
  }

  async function testHubSpot() {
    setHubSpotWorking(true);
    setError(null);
    try {
      await testHubSpotIntegration();
      setBulkNotice(copy.hubSpotTestSuccess);
    } catch (ex: any) {
      setError(ex?.message || copy.hubSpotTestError);
    } finally {
      setHubSpotWorking(false);
    }
  }

  async function pushHubSpot() {
    if (selectedEmails.length === 0) return;
    setHubSpotWorking(true);
    setError(null);
    try {
      const result = await pushCrmParticipantsToHubSpot({ emails: selectedEmails, create_missing: true });
      setBulkNotice(copy.hubSpotPushSuccess(result.pushed, result.created, result.updated, result.failed));
    } catch (ex: any) {
      setError(ex?.message || copy.hubSpotPushError);
    } finally {
      setHubSpotWorking(false);
    }
  }

  async function loadParticipants(nextSelectedEmail?: string | null) {
    setLoading(true);
    setError(null);
    try {
      const rows = await listCrmParticipants({
        query: query || undefined,
        tag: tag || undefined,
        status: status || undefined,
        limit: 100,
      });
      void loadHubSpotStatus();
      setParticipants(rows);
      setSelectedEmails((items) => items.filter((email) => rows.some((row) => row.email === email)));
      listCrmDuplicateCandidates({ limit: 5 }).then(setDuplicates).catch(() => undefined);
      const email = nextSelectedEmail ?? selectedEmail;
      const stillVisible = email ? rows.some((row) => row.email === email) : false;
      setSelectedEmail(stillVisible ? email : null);
      if (stillVisible && email) void loadDetail(email);
      else setDetail(null);
    } catch (ex: any) {
      setError(ex?.message || copy.loadError);
    } finally {
      setLoading(false);
    }
  }

  async function mergeDuplicate(candidate: CrmDuplicateCandidate) {
    const [target, ...sources] = candidate.emails;
    if (!target || sources.length === 0) return;
    setError(null);
    try {
      await mergeCrmParticipants({ target_email: target, source_emails: sources });
      await loadParticipants(target);
    } catch (ex: any) {
      setError(ex?.message || copy.mergeError);
    }
  }

  async function loadDetail(email: string) {
    setDetailLoading(true);
    setError(null);
    try {
      const next = await getCrmParticipant(email);
      setDetail(next);
      setNotes(next.meta.notes || "");
      setTagsText((next.meta.tags || []).join(", "));
      setLifecycleStatus(next.meta.lifecycle_status || "lead");
      setPriority(next.meta.priority || "normal");
      setLeadScore(next.meta.lead_score || 0);
      setNextFollowUpAt(toDateTimeLocal(next.meta.next_follow_up_at));
      setCustomFieldsText(JSON.stringify(next.meta.custom_fields || {}, null, 2));
    } catch (ex: any) {
      setError(ex?.message || copy.detailError);
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveMeta() {
    if (!detail) return;
    setSaving(true);
    setError(null);
    try {
      const tags = tagsText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      let customFields: Record<string, any> = {};
      try {
        customFields = customFieldsText.trim() ? JSON.parse(customFieldsText) : {};
      } catch {
        setError(translate(lang, "migrated_app_admin_crm_custom_fields_must_be_valid_json_9e63a0a9"));
        setSaving(false);
        return;
      }
      const meta = await updateCrmParticipant({
        email: detail.email,
        notes,
        tags,
        lifecycle_status: lifecycleStatus,
        priority,
        lead_score: leadScore,
        next_follow_up_at: fromDateTimeLocal(nextFollowUpAt),
        custom_fields: customFields,
      });
      const nextDetail = { ...detail, meta };
      setDetail(nextDetail);
      setParticipants((items) =>
        items.map((item) => (item.email === detail.email ? { ...item, meta } : item)),
      );
    } catch (ex: any) {
      setError(ex?.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadParticipants(null);
  }, []);

  useEffect(() => {
    if (!searchDebounceReady.current) {
      searchDebounceReady.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      void loadParticipants(null);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, status, tag]);

  return (
    <FeatureGate requiredPlans={["enterprise"]} message={translate(lang, "migrated_app_admin_crm_event_crm_is_available_on_the_enterprise_p_d06fd65c")}>
    <div className="w-full space-y-5 antialiased text-surface-900">

      {/* BAŞLIK GRUBU */}
      <div className="w-full flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-11 font-bold uppercase tracking-widest text-surface-400">{copy.eyebrow}</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-surface-900 sm:text-2xl">{copy.title}</h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-surface-400">{copy.subtitle}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-xl border border-surface-200 bg-raised shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-11 font-semibold transition ${view === "list" ? "bg-surface-900 text-white" : "text-surface-500 hover:bg-surface-50"}`}
            >
              <List className="h-3.5 w-3.5" />
              Liste
            </button>
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-11 font-semibold transition ${view === "kanban" ? "bg-surface-900 text-white" : "text-surface-500 hover:bg-surface-50"}`}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Kanban
            </button>
          </div>
          {/* No-show tagger */}
          <button
            type="button"
            onClick={() => void runTagNoShows()}
            disabled={bulkWorking}
            className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200 bg-raised px-3 py-1.5 text-11 font-semibold text-surface-700 shadow-sm hover:bg-surface-50 disabled:opacity-40"
          >
            <UserX className="h-3.5 w-3.5" />
            No-Show Etiketle
          </button>
          {/* CSV Import */}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-surface-200 bg-raised px-3 py-1.5 text-11 font-semibold text-surface-700 shadow-sm hover:bg-surface-50">
            <Upload className="h-3.5 w-3.5" />
            CSV İçe Aktar
            <input type="file" accept=".csv" className="sr-only" onChange={handleCsvImport} />
          </label>
        </div>
      </div>

      {/* GLOBAL ERROR BANNER */}
      {error && (
        <div className="rounded-xl border border-status-danger-border bg-status-danger-bg/40 p-3.5 text-xs font-semibold text-status-danger-content flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* MÜKERRER KAYIT UYARI ALANI (Duplicates) */}
      {duplicates.length > 0 && (
        <section className="w-full rounded-2xl border border-status-warning-border/60 bg-status-warning-bg/20 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-status-warning-content">{copy.duplicates}</h2>
            <span className="rounded-full bg-status-warning-bg px-2 py-0.5 text-11 font-bold text-status-warning-content">{duplicates.length}</span>
          </div>
          <div className="mt-3.5 grid gap-3 lg:grid-cols-2">
            {duplicates.map((candidate) => (
              <div key={candidate.name_key} className="rounded-xl border border-surface-200/80 bg-raised p-3.5 shadow-sm flex flex-col justify-between sm:flex-row sm:items-center gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-surface-900 tracking-tight">{candidate.display_name}</p>
                  <p className="mt-0.5 text-11 font-medium text-surface-400 truncate">{candidate.emails.join(" → ")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void mergeDuplicate(candidate)}
                  className="rounded-xl border border-surface-200 bg-raised px-3 py-1.5 text-11 font-semibold text-surface-800 shadow-sm hover:bg-surface-50 active:scale-95 transition-all shrink-0"
                >
                  {copy.merge}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* GLOBAL ARAC ÇUBUĞU (FilterActionBar Stili Üst Arama Modülü) */}
      <section className="w-full rounded-2xl border border-surface-200 bg-raised p-3.5 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-[1fr_160px_160px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400 stroke-[2]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void loadParticipants(null)}
              className="w-full input pl-9 pr-3.5"
              placeholder={copy.searchPlaceholder}
            />
          </div>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full input cursor-pointer"
          >
            <option value="">{copy.allStatuses}</option>
            {lifecycleOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <input
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            className="w-full input px-3.5"
            placeholder={copy.tagPlaceholder}
            list="crm-tags"
          />
          <datalist id="crm-tags">
            {knownTags.map((item) => <option key={item} value={item} />)}
          </datalist>

          <button
            type="button"
            onClick={() => void loadParticipants(null)}
            className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-surface-900 px-4 text-xs font-semibold text-white transition hover:bg-surface-800 active:scale-95"
          >
            <Search className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>{copy.search}</span>
          </button>
        </div>
      </section>

      {/* KANBAN GÖRÜNÜMÜ */}
      {view === "kanban" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {lifecycleOptions.map((col) => {
              const colItems = participants.filter((p) => p.meta.lifecycle_status === col.value);
              return (
                <div key={col.value} className="w-64 shrink-0 rounded-2xl border border-surface-200 bg-surface-50/50 overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between border-b border-surface-100 bg-raised px-4 py-3">
                    <span className="text-11 font-bold uppercase tracking-wider text-surface-700">{col.label}</span>
                    <span className="rounded-full bg-surface-100 px-2 py-0.5 text-11 font-bold text-surface-500">{colItems.length}</span>
                  </div>
                  <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto scrollbar-none">
                    {colItems.length === 0 && (
                      <p className="py-8 text-center text-11 text-surface-400">—</p>
                    )}
                    {colItems.map((p) => (
                      <button
                        key={p.email}
                        type="button"
                        onClick={() => { setSelectedEmail(p.email); void loadDetail(p.email); setView("list"); }}
                        className="w-full text-left rounded-xl border border-surface-200 bg-raised p-3 shadow-sm hover:border-surface-300 transition-colors"
                      >
                        <p className="truncate text-11 font-bold text-surface-900">{p.name}</p>
                        <p className="truncate text-11 text-surface-400">{p.email}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.meta.tags.slice(0, 3).map((t) => (
                            <span key={t} className="rounded-md bg-surface-50 px-1.5 py-0.5 text-11 font-semibold text-surface-500">{formatTag(t)}</span>
                          ))}
                        </div>
                        {(p.meta.lead_score ?? 0) > 0 && (
                          <p className="mt-1.5 text-11 font-bold text-surface-400">Skor: {p.meta.lead_score}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CRM ANA ÇİFT SÜTUN DÜZENİ */}
      {view === "list" && <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)] items-start">

        {/* SOL TARAF: KATILIMCI SEÇİM LİSTESİ */}
        <section className="rounded-2xl border border-surface-200 bg-raised overflow-hidden shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-surface-100 px-4.5 py-3.5 bg-raised">
            <div className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-surface-800 stroke-[2]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.people}</h2>
            </div>
            <span className="rounded-md bg-surface-50 border border-surface-100 px-2 py-0.5 text-11 font-bold text-surface-500 tracking-tight">
              {participants.length}
            </span>
          </div>

          {/* Toplu E-posta ve Yönetim İstasyonu (Bulk Action Kısmı) */}
          <div className="border-b border-surface-100 bg-surface-50/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-11 font-bold text-surface-500 pr-1">
                {selectedVisibleCount} {copy.selected}
              </span>
              <button type="button" onClick={selectVisibleParticipants} className="rounded-lg border border-surface-200 bg-raised px-2.5 py-1 text-11 font-semibold text-surface-700 shadow-sm hover:bg-surface-50">
                {copy.selectAll}
              </button>
              <button type="button" onClick={() => setSelectedEmails([])} className="rounded-lg border border-surface-200 bg-raised px-2.5 py-1 text-11 font-semibold text-surface-500 shadow-sm hover:bg-surface-50">
                {copy.clearSelection}
              </button>
              <button
                type="button"
                onClick={() => void exportSelected()}
                disabled={bulkWorking || selectedEmails.length === 0}
                className="inline-flex items-center gap-1 rounded-lg border border-surface-200 bg-raised px-2.5 py-1 text-11 font-semibold text-surface-700 shadow-sm hover:bg-surface-50 disabled:opacity-40"
              >
                <Download className="h-3 w-3" />
                <span>{copy.exportCsv}</span>
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <EmailTemplateSelect
                value={bulkTemplateId ? Number(bulkTemplateId) : null}
                onChange={(templateId) => setBulkTemplateId(templateId ? String(templateId) : "")}
                label={copy.templateId}
                placeholder={translate(lang, "migrated_app_admin_crm_choose_template_fe58877f")}
                emptyText={translate(lang, "migrated_app_admin_crm_search_template_46ccbdd9")}
              />
              <button
                type="button"
                onClick={() => void sendBulkEmail()}
                disabled={bulkWorking || selectedEmails.length === 0 || !Number(bulkTemplateId)}
                className="w-full inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg bg-surface-900 px-3 text-xs font-semibold text-white transition hover:bg-surface-800 disabled:opacity-30"
              >
                {bulkWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>{copy.sendEmail}</span>
              </button>
            </div>

            <div className="rounded-xl border border-surface-200 bg-raised p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-surface-700" />
                  <span className="text-11 font-bold text-surface-800">HubSpot</span>
                </div>
                <span className={`rounded-md px-1.5 py-0.5 text-11 font-bold ${hubSpotStatus?.configured ? "bg-status-success-bg text-status-success-content" : "bg-surface-100 text-surface-500"}`}>
                  {hubSpotStatus?.configured ? hubSpotStatus.token_preview || copy.hubSpotConnected : copy.hubSpotNotConfigured}
                </span>
              </div>
              <div className="flex gap-1.5">
                <input
                  value={hubSpotToken}
                  onChange={(event) => setHubSpotToken(event.target.value)}
                  placeholder={copy.hubSpotTokenPlaceholder}
                  className="min-w-0 flex-1 rounded-lg border border-surface-200 bg-raised px-2 py-1.5 text-11 font-semibold outline-none focus:border-surface-900"
                />
                <button type="button" onClick={() => void saveHubSpotToken()} disabled={hubSpotWorking || !hubSpotToken.trim()} className="inline-flex items-center gap-1 rounded-lg bg-surface-800 px-2.5 py-1 text-11 font-semibold text-white disabled:opacity-40">
                  {hubSpotWorking ? <Loader2 className="h-3 w-3 animate-spin" /> : <KeyRound className="h-3 w-3" />}
                  {copy.hubSpotSave}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => void testHubSpot()} disabled={hubSpotWorking || !hubSpotStatus?.configured} className="inline-flex items-center gap-1 rounded-lg border border-surface-200 bg-raised px-2.5 py-1 text-11 font-semibold text-surface-700 disabled:opacity-40">
                  {copy.hubSpotTest}
                </button>
                <button type="button" onClick={() => void pushHubSpot()} disabled={hubSpotWorking || !hubSpotStatus?.configured || selectedEmails.length === 0} className="inline-flex items-center gap-1 rounded-lg border border-status-success-border bg-status-success-bg px-2.5 py-1 text-11 font-semibold text-status-success-content disabled:opacity-40">
                  {hubSpotWorking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  {copy.hubSpotPush}
                </button>
              </div>
            </div>
            {bulkNotice && <p className="text-11 font-bold text-status-success-content mt-1.5 bg-status-success-bg border border-status-success-border px-2.5 py-1 rounded-lg">{bulkNotice}</p>}
          </div>

          {/* Katılımcı Kartları Listesi */}
          {loading ? (
            <div className="flex justify-center py-14">
              <Loader2 className="h-6 w-6 animate-spin text-surface-400 stroke-[2.5]" />
            </div>
          ) : participants.length === 0 ? (
            <div className="px-5 py-12 text-center text-xs font-semibold text-surface-400 tracking-tight">{copy.noMatches}</div>
          ) : (
            <div className="max-h-[640px] overflow-y-auto divide-y divide-outline-subtle scrollbar-none bg-raised">
              {participants.map((participant) => {
                const active = participant.email === selectedEmail;
                const checked = selectedEmails.includes(participant.email);
                return (
                  <article
                    key={participant.email}
                    className={`flex items-start gap-3 px-4 py-3.5 text-left transition-colors relative ${
                      active ? "bg-surface-50" : "hover:bg-surface-50/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelectedEmail(participant.email)}
                      className="mt-1 h-3.5 w-3.5 cursor-pointer rounded-md border-surface-300 text-surface-900 focus:ring-0 focus:ring-offset-0"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmail(participant.email);
                        void loadDetail(participant.email);
                      }}
                      className="min-w-0 flex-1 text-left outline-none group"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-surface-900 group-hover:text-surface-900 tracking-tight">{participant.name}</p>
                          <p className="truncate text-11 font-medium text-surface-400 mt-0.5">{participant.email}</p>
                        </div>
                        <span className="shrink-0 inline-flex rounded-md border border-surface-100 bg-raised px-1.5 py-0.5 text-11 font-bold text-surface-500 uppercase tracking-tight shadow-sm">
                          {formatTag(participant.meta.lifecycle_status ?? "lead")}
                        </span>
                      </div>

                      {/* Mikro Matris Sayıcıları */}
                      <div className="mt-2.5 grid grid-cols-4 gap-1 text-center text-11 font-bold text-surface-400 tracking-tight">
                        <span className="truncate bg-surface-50/70 border border-surface-100/50 py-1 rounded-md">{participant.event_count} {copy.events.toLowerCase()}</span>
                        <span className="truncate bg-surface-50/70 border border-surface-100/50 py-1 rounded-md">{participant.attended_count} {copy.attendance.toLowerCase()}</span>
                        <span className="truncate bg-surface-50/70 border border-surface-100/50 py-1 rounded-md">{participant.certificate_count} sert.</span>
                        <span className="truncate bg-surface-50/70 border border-surface-100/50 py-1 rounded-md">{participant.survey_count} anket</span>
                      </div>

                      {participant.meta.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {participant.meta.tags.slice(0, 3).map((item) => (
                            <span key={item} className="rounded-md bg-surface-50 px-1.5 py-0.5 text-11 font-semibold text-surface-500">
                              {formatTag(item)}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* SAĞ TARAF: DETAY / EDİTÖR VE ZAMAN TÜNELİ PANELI */}
        <section className="space-y-4">
          {detailLoading ? (
            <div className="rounded-2xl border border-surface-200 bg-raised flex justify-center py-24 shadow-sm">
              <Loader2 className="h-6 w-6 animate-spin text-surface-400 stroke-[2.5]" />
            </div>
          ) : !detail ? (
            <div className="rounded-2xl border border-surface-200 bg-raised px-6 py-20 text-center shadow-sm">
              <div className="flex h-11 w-11 mx-auto items-center justify-center rounded-full border border-surface-100 bg-surface-50 text-surface-400 shadow-sm">
                <UsersRound className="h-4 w-4 stroke-[1.8]" />
              </div>
              <p className="mt-3.5 text-xs font-bold text-surface-900 tracking-tight">{copy.selectPerson}</p>
              <p className="mt-1 text-11 text-surface-400 max-w-xs mx-auto leading-relaxed">{copy.detailHint}</p>
            </div>
          ) : (
            <>
              {/* Profil Üst Başlık Kartı */}
              <div className="rounded-2xl border border-surface-200 bg-raised p-5 shadow-sm flex flex-col justify-between sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-900 text-white shadow-sm">
                    <User className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h2 className="truncate text-base font-bold text-surface-900 tracking-tight">{detail.name}</h2>
                    <p className="truncate text-xs font-medium text-surface-400">{detail.email}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void saveMeta()}
                  disabled={saving}
                  className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-surface-900 px-4 text-xs font-semibold text-white transition hover:bg-surface-800 disabled:opacity-40 shadow-sm shrink-0"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>{copy.save}</span>
                </button>
              </div>

              {/* Hızlı Sayaç Izgarası */}
              <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-4">
                {[
                  [copy.events, detail.summary.events || 0],
                  [copy.attendance, detail.summary.attended || 0],
                  [copy.certificates, detail.summary.certificates || 0],
                  [copy.surveyDone, detail.summary.surveys || 0],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl border border-surface-200 bg-raised p-3 shadow-sm">
                    <p className="text-11 font-bold text-surface-400 uppercase tracking-wide">{String(label)}</p>
                    <p className="mt-1 text-xl font-bold tracking-tight text-surface-900 tabular-nums">{String(value)}</p>
                  </div>
                ))}
              </div>

              {/* Form Ayarları ve Zaman Tüneli Yan Yana Grid Düzeni */}
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">

                {/* Sol Profil Editörü */}
                <div className="rounded-2xl border border-surface-200 bg-raised p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
                    <Tag className="h-4 w-4 text-surface-800 stroke-[2]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.info}</h3>
                  </div>

                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <label className="block w-full">
                      <span className="block text-11 font-bold text-surface-500 mb-1">{copy.status}</span>
                      <select value={lifecycleStatus} onChange={(event) => setLifecycleStatus(event.target.value)} className="w-full input px-2.5 cursor-pointer">
                        {lifecycleOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block w-full">
                      <span className="block text-11 font-bold text-surface-500 mb-1">{copy.tags}</span>
                      <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} className="w-full input" placeholder="vip, alumni, sponsor" />
                    </label>

                    <label className="block w-full">
                      <span className="block text-11 font-bold text-surface-500 mb-1">{copy.priority}</span>
                      <select value={priority} onChange={(event) => setPriority(event.target.value)} className="w-full input px-2.5 cursor-pointer">
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </label>

                    <label className="block w-full">
                      <span className="block text-11 font-bold text-surface-500 mb-1">{copy.leadScore}</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={leadScore}
                        onChange={(event) => setLeadScore(Number(event.target.value))}
                        className="w-full input"
                      />
                    </label>

                    <DateTimeField
                      label={copy.followUp}
                      value={nextFollowUpAt}
                      onChange={setNextFollowUpAt}
                      className="sm:col-span-2"
                    />

                    <label className="block w-full sm:col-span-2">
                      <span className="block text-11 font-bold text-surface-500 mb-1">{copy.customFields}</span>
                      <textarea
                        value={customFieldsText}
                        onChange={(event) => setCustomFieldsText(event.target.value)}
                        className="input font-mono min-h-[84px] resize-none"
                      />
                    </label>
                  </div>

                  <label className="block w-full pt-1">
                    <span className="block text-11 font-bold text-surface-500 mb-1">{copy.notes}</span>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="input min-h-[140px] resize-none"
                      placeholder={copy.notesPlaceholder}
                    />
                  </label>

                  <div className="flex items-center gap-1 text-11 font-semibold text-surface-400 pt-1 border-t border-outline-subtle">
                    <Calendar className="h-3 w-3" />
                    <span>{copy.updated}: {formatDate(detail.meta.updated_at, lang)}</span>
                  </div>
                </div>

                {/* Sağ Akışkan Zaman Tüneli */}
                <div className="rounded-2xl border border-surface-200 bg-raised p-5 shadow-sm flex flex-col">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900 border-b border-surface-100 pb-2.5">{copy.timeline}</h3>
                  <div className="mt-4 flex-1 max-h-[460px] overflow-y-auto pr-0.5 scrollbar-none relative pl-3.5 before:absolute before:bottom-1 before:left-1.5 before:top-1 before:w-[1px] before:bg-surface-100">
                    {detail.timeline.length === 0 ? (
                      <p className="text-xs font-medium text-surface-400 py-4">{copy.emptyTimeline}</p>
                    ) : (
                      <div className="space-y-4.5">
                        {detail.timeline.slice(0, 30).map((item, index) => {
                          const Icon = timelineIcon(item.type);
                          return (
                            <div key={`${item.type}-${item.at}-${index}`} className="relative group flex items-start gap-3">
                              {/* Kronolojik Düğüm Noktası */}
                              <div className="absolute -left-[18px] top-1 h-2 w-2 rounded-full bg-raised ring-4 ring-white border border-outline-strong group-hover:border-outline-strong transition-colors" />

                              <div className="min-w-0 flex-1 space-y-0.5">
                                <p className="text-xs font-semibold text-surface-800 tracking-tight group-hover:text-surface-900 flex items-center gap-1">
                                  <Icon className="h-3 w-3 shrink-0 text-surface-400" />
                                  <span>{item.label}</span>
                                </p>
                                <p className="text-11 font-medium text-surface-400 font-mono">{formatDate(item.at, lang)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Alt Geniş Blok: Etkinlik Katılım Geçmişi */}
              <div className="rounded-2xl border border-surface-200 bg-raised p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900 border-b border-surface-100 pb-2.5">{copy.history}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {detail.history.map((item: any) => (
                    <article key={`${item.event_id}-${item.registered_at}`} className="rounded-xl border border-surface-100/80 bg-raised p-3.5 shadow-sm hover:border-surface-200 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-surface-900 tracking-tight truncate">{item.event_name}</h4>
                          <p className="mt-0.5 text-11 font-medium text-surface-400">{copy.registered}: {formatDate(item.registered_at, lang)}</p>
                        </div>
                        <span className="shrink-0 rounded-md bg-surface-50 border border-surface-100 px-1.5 py-0.5 text-11 font-bold text-surface-400">
                          #{item.event_id}
                        </span>
                      </div>

                      {/* Katılım Statü Rozetleri */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {item.email_verified && <span className="rounded-md bg-status-success-bg border border-status-success-border px-1.5 py-0.5 text-11 font-bold text-status-success-content">{copy.emailVerified}</span>}
                        {item.survey_completed && <span className="rounded-md bg-status-info-bg border border-status-info-border px-1.5 py-0.5 text-11 font-bold text-status-info-content">{copy.surveyDone}</span>}
                        {(item.attendance_count || 0) > 0 && <span className="rounded-md bg-surface-900 px-1.5 py-0.5 text-11 font-bold text-white shadow-sm">{copy.checkinExists}</span>}
                      </div>

                      {/* Alt Sayıcı Hücre Matrisi */}
                      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-11 font-bold text-surface-500">
                        <span className="rounded-lg bg-surface-50/70 border border-surface-100/50 px-2 py-1.5 text-surface-700 truncate">{item.tickets?.length || 0} {copy.tickets}</span>
                        <span className="rounded-lg bg-surface-50/70 border border-surface-100/50 px-2 py-1.5 text-surface-700 truncate">{item.attendance_count || 0} {copy.attendance.toLowerCase()}</span>
                        <span className="rounded-lg bg-surface-50/70 border border-surface-100/50 px-2 py-1.5 text-surface-700 truncate">{item.certificates?.length || 0} {copy.certificates}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>}

    </div>
    </FeatureGate>
  );
}
