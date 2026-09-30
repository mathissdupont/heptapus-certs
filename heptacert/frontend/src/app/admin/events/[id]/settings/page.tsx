"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Save,
  Sparkles,
  Upload,
  Wand2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type,
  AlignLeft,
  Phone,
  Hash,
  Calendar,
  ExternalLink,
  FileSpreadsheet,
  List,
  FileUp,
  Eye,
  Info,
  Lightbulb,
  Settings,
  ShieldAlert,
  RefreshCw,
  Unplug,
  Building2,
  X,
} from "lucide-react";
import {
  apiFetch,
  API_BASE,
  getToken,
  consumeOAuthBridgeToken,
  getMySubscription,
  setToken,
  updateAdminEventComment,
  listAdminEventComments,
  type RegistrationField,
  type SubscriptionInfo,
  type PublicEventComment
} from "@/lib/api";
import EventAdminNav, { refreshEventAdminMeta } from "@/components/Admin/EventAdminNav";
import PageHeader from "@/components/Admin/PageHeader";
import DateField from "@/components/Admin/DateField";
import DateTimeField from "@/components/Admin/DateTimeField";
import RetentionPolicySection from "@/components/Admin/RetentionPolicySection";
import RichTextEditor from "@/components/RichTextEditor";
import { useI18n, useT, translate } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import { PlanGateCard } from "@/lib/useSubscription";
import { useToast } from "@/hooks/useToast";
import useKeyboardShortcut from "@/hooks/useKeyboardShortcut";
import useUnsavedChanges from "@/hooks/useUnsavedChanges";

type EventOut = {
  id: number;
  name: string;
  config?: {
    registration_fields?: RegistrationField[];
    registration_closed?: boolean;
    registration_quota?: number;
    registration_quota_enabled?: boolean;
    visibility?: "private" | "unlisted" | "public";
    organizer_privacy_notice_enabled?: boolean;
    organizer_privacy_notice_text?: string;
    data_controller_name?: string;
    data_controller_contact_email?: string;
    data_retention_note?: string;
    [key: string]: unknown;
  };
  event_date?: string | null;
  event_description?: string;
  event_location?: string | null;
  event_banner_url?: string | null;
  registration_closed?: boolean;
  auto_email_on_cert?: boolean;
  cert_email_template_id?: number | null;
  visibility?: "private" | "unlisted" | "public";
  require_email_verification?: boolean;
  registration_quota?: number | null;
  registration_quota_enabled?: boolean;
  event_type?: EventType;
  certificate_enabled?: boolean;
  checkin_enabled?: boolean;
  ticketing_enabled?: boolean;
  registration_enabled?: boolean;
  raffles_enabled?: boolean;
  gamification_enabled?: boolean;
  requires_approval?: boolean;
  quiz_enabled?: boolean;
  cpd_enabled?: boolean;
  agenda_enabled?: boolean;
  cfp_enabled?: boolean;
  networking_meetings_enabled?: boolean;
  live_engagement_enabled?: boolean;
  organization_venue_id?: number | null;
  venue_reservation_id?: number | null;
  venue_reservation_start_at?: string | null;
  venue_reservation_end_at?: string | null;
};

type EmailTemplate = {
  id: number;
  name: string;
  subject_tr: string;
  subject_en: string;
  template_type: string;
  event_id?: number | null;
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

type EventMicrosoftExcelStatus = {
  ms365_configured: boolean;
  ms365_connected: boolean;
  microsoft_email?: string | null;
  workbook_url?: string | null;
  workbook_name?: string | null;
  enabled: boolean;
  last_synced_at?: string | null;
  missing_scopes?: string[];
};

type FormState = {
  name: string;
  event_date: string;
  event_description: string;
  event_location: string;
  event_banner_url: string;
  registration_closed: boolean;
  visibility: "private" | "unlisted" | "public";
  registration_fields: RegistrationField[];
  require_email_verification: boolean;
  registration_quota_enabled: boolean;
  registration_quota: string;
  auto_email_on_cert: boolean;
  cert_email_template_id: number | null;
  event_type: EventType;
  certificate_enabled: boolean;
  checkin_enabled: boolean;
  ticketing_enabled: boolean;
  registration_enabled: boolean;
  raffles_enabled: boolean;
  gamification_enabled: boolean;
  requires_approval: boolean;
  quiz_enabled: boolean;
  cpd_enabled: boolean;
  agenda_enabled: boolean;
  cfp_enabled: boolean;
  networking_meetings_enabled: boolean;
  live_engagement_enabled: boolean;
  organizer_privacy_notice_enabled: boolean;
  organizer_privacy_notice_text: string;
  show_cross_border_transfer_notice: boolean;
  require_cross_border_transfer_consent: boolean;
  data_controller_name: string;
  data_controller_contact_email: string;
  data_retention_note: string;
  organization_venue_id: string;
  auto_reserve_venue: boolean;
  venue_reservation_start_at: string;
  venue_reservation_end_at: string;
};

type OrganizationVenue = {
  id: number;
  name: string;
  capacity?: number | null;
  location?: string | null;
  is_active: boolean;
};

type EventType =
  | "certificate_event"
  | "seminar"
  | "workshop"
  | "conference"
  | "concert"
  | "training"
  | "club_event"
  | "online_event"
  | "custom";

const FIELD_TYPE_OPTIONS: Array<{ value: RegistrationField["type"]; labelKey: TranslationKey; icon?: any }> = [
  { value: "text", labelKey: "admin_settings_field_short_text", icon: Type },
  { value: "textarea", labelKey: "admin_settings_field_long_text", icon: AlignLeft },
  { value: "tel", labelKey: "admin_settings_field_phone", icon: Phone },
  { value: "number", labelKey: "admin_settings_field_number", icon: Hash },
  { value: "date", labelKey: "admin_settings_field_date", icon: Calendar },
  { value: "select", labelKey: "admin_settings_field_select", icon: List },
  { value: "file", labelKey: "admin_settings_field_file", icon: FileUp },
];

const VISIBILITY_OPTIONS = [
  { value: "private", labelKey: "admin_settings_visibility_private" },
  { value: "unlisted", labelKey: "admin_settings_visibility_unlisted" },
  { value: "public", labelKey: "admin_settings_visibility_public" },
] as const;

const EVENT_TYPE_OPTIONS: Array<{ value: EventType; labelKey: TranslationKey }> = [
  { value: "certificate_event", labelKey: "admin_settings_event_certificate" },
  { value: "seminar", labelKey: "admin_settings_event_seminar" },
  { value: "workshop", labelKey: "admin_settings_event_workshop" },
  { value: "conference", labelKey: "admin_settings_event_conference" },
  { value: "concert", labelKey: "admin_settings_event_concert" },
  { value: "training", labelKey: "admin_settings_event_training" },
  { value: "club_event", labelKey: "admin_settings_event_club" },
  { value: "online_event", labelKey: "admin_settings_event_online" },
  { value: "custom", labelKey: "admin_settings_event_custom" },
];

type EventFeatureFlags = {
  certificate_enabled: boolean;
  checkin_enabled: boolean;
  ticketing_enabled: boolean;
  registration_enabled: boolean;
  raffles_enabled: boolean;
  gamification_enabled: boolean;
};

// Fallback only — used until the backend preset map (single source of truth, ADR-0018)
// is fetched, or if that fetch fails. Do not extend per-type logic here.
function fallbackDefaultsForEventType(eventType: EventType): EventFeatureFlags {
  if (eventType === "concert" || eventType === "club_event") {
    return {
      certificate_enabled: false,
      checkin_enabled: true,
      ticketing_enabled: true,
      registration_enabled: true,
      raffles_enabled: false,
      gamification_enabled: false,
    };
  }
  if (eventType === "online_event") {
    return {
      certificate_enabled: false,
      checkin_enabled: false,
      ticketing_enabled: false,
      registration_enabled: true,
      raffles_enabled: false,
      gamification_enabled: false,
    };
  }
  if (eventType === "custom") {
    return {
      certificate_enabled: false,
      checkin_enabled: true,
      ticketing_enabled: false,
      registration_enabled: true,
      raffles_enabled: false,
      gamification_enabled: false,
    };
  }
  return {
    certificate_enabled: true,
    checkin_enabled: true,
    ticketing_enabled: false,
    registration_enabled: true,
    raffles_enabled: false,
    gamification_enabled: false,
  };
}

// Map a backend preset (snake_case, all flags) down to the 6 flags this form edits.
function flagsFromPreset(p: Record<string, boolean>): EventFeatureFlags {
  return {
    certificate_enabled: !!p.certificate_enabled,
    checkin_enabled: !!p.checkin_enabled,
    ticketing_enabled: !!p.ticketing_enabled,
    registration_enabled: !!p.registration_enabled,
    raffles_enabled: !!p.raffles_enabled,
    gamification_enabled: !!p.gamification_enabled,
  };
}

const SETTINGS_TABS = [
  { id: "general", labelKey: "admin_settings_tab_general", icon: FileText },
  { id: "registration", labelKey: "admin_settings_tab_registration", icon: ClipboardList },
  { id: "banner", labelKey: "admin_settings_tab_banner", icon: ImageIcon },
  { id: "email", labelKey: "admin_settings_tab_email", icon: Mail },
  { id: "comments", labelKey: "admin_settings_tab_comments", icon: MessageSquare },
] as const;

function createRegistrationField(): RegistrationField {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `field_${crypto.randomUUID().slice(0, 8)}`
      : `field_${Date.now().toString(36)}`;

  return {
    id,
    label: "",
    type: "text",
    required: false,
    placeholder: "",
    helper_text: "",
    options: [],
    selection_mode: "single",
    pii: false,
  };
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

export default function EventSettingsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const toast = useToast();
  const { lang } = useI18n();
  const t = useT();

  const copy = { title: translate(lang, "migrated_app_admin_events_id_settings_event_settings_ef2b1490"), subtitle: translate(lang, "migrated_app_admin_events_id_settings_manage_event_details_certificate_appearanc_d88cb88f"), loadingError: translate(lang, "migrated_app_admin_events_id_settings_failed_to_load_data_26fd604b"), requiredName: translate(lang, "migrated_app_admin_events_id_settings_event_name_is_required_0d6cc084"), saveSuccess: translate(lang, "migrated_app_admin_events_id_settings_settings_saved_f61a0a13"), saveError: translate(lang, "migrated_app_admin_events_id_settings_failed_to_save_settings_577b6801"), bannerError: translate(lang, "migrated_app_admin_events_id_settings_banner_upload_failed_505f228a"), upgradeTitle: translate(lang, "migrated_app_admin_events_id_settings_growth_or_enterprise_is_required_for_autom_96db6099"), upgradeBody: translate(lang, "migrated_app_admin_events_id_settings_automatic_certificate_delivery_emails_and__1974950c"), upgradeCta: translate(lang, "migrated_app_admin_events_id_settings_view_plans_ace91c1e"), basicTitle: translate(lang, "migrated_app_admin_events_id_settings_basic_information_98c7ec2e"), basicBody: translate(lang, "migrated_app_admin_events_id_settings_update_the_main_event_details_shown_during_b5f65400"), visibilityTitle: translate(lang, "migrated_app_admin_events_id_settings_public_visibility_86dd0d00"), visibilityBody: translate(lang, "migrated_app_admin_events_id_settings_this_setting_only_affects_the_public_disco_b1158976"), visibilityLabel: translate(lang, "migrated_app_admin_events_id_settings_visibility_mode_748c5be6"), visibilityHint: translate(lang, "migrated_app_admin_events_id_settings_private_stays_hidden_unlisted_opens_only_v_0e1dbe68"), registrationTitleMeta: translate(lang, "migrated_app_admin_events_id_settings_registration_form_a1f2a1ec"), registrationTitle: translate(lang, "migrated_app_admin_events_id_settings_registration_form_fields_2d253356"), registrationBody: translate(lang, "migrated_app_admin_events_id_settings_define_the_extra_information_you_want_to_c_7a36c2aa"), verificationTitle: translate(lang, "migrated_app_admin_events_id_settings_email_verification_c5a52a70"), verificationBody: translate(lang, "migrated_app_admin_events_id_settings_you_can_require_post_registration_email_ve_c3d201e2"), registrationStatusTitle: translate(lang, "migrated_app_admin_events_id_settings_registration_status_fabef59e"), registrationStatusBody: translate(lang, "migrated_app_admin_events_id_settings_close_the_registration_flow_from_the_syste_dec22231"), registrationToggle: translate(lang, "migrated_app_admin_events_id_settings_close_new_registrations_9657c63e"), registrationHint: translate(lang, "migrated_app_admin_events_id_settings_when_enabled_the_public_registration_endpo_a04b514f"), registrationQuotaLabel: translate(lang, "migrated_app_admin_events_id_settings_registration_quota_ce0ff726"), registrationQuotaToggle: translate(lang, "migrated_app_admin_events_id_settings_enable_registration_quota_770a0525"), registrationQuotaHint: translate(lang, "migrated_app_admin_events_id_settings_leave_empty_for_unlimited_registration_aut_6819746f"), registrationQuotaPlaceholder: translate(lang, "migrated_app_admin_events_id_settings_e_g_300_0196e900"), verificationToggle: translate(lang, "migrated_app_admin_events_id_settings_require_email_verification_after_registrat_83b09599"), verificationHint: translate(lang, "migrated_app_admin_events_id_settings_when_off_attendees_become_active_immediate_b68a4a32"), addField: translate(lang, "migrated_app_admin_events_id_settings_add_field_d0ed7757"), emptyFields: translate(lang, "migrated_app_admin_events_id_settings_no_custom_registration_field_has_been_adde_9335242b"), fieldLabel: translate(lang, "migrated_app_admin_events_id_settings_field_label_5fc42030"), fieldType: translate(lang, "migrated_app_admin_events_id_settings_field_type_fa3dd9b0"), fieldPlaceholder: translate(lang, "migrated_app_admin_events_id_settings_placeholder_text_453e20d5"), fieldHelper: translate(lang, "migrated_app_admin_events_id_settings_helper_text_86d52de5"), fieldOptions: translate(lang, "migrated_app_admin_events_id_settings_options_3d88d29e"), fieldOptionsHint: translate(lang, "migrated_app_admin_events_id_settings_write_one_option_per_line_b9af83d1"), requiredField: translate(lang, "migrated_app_admin_events_id_settings_required_field_fa2aeca4"), conditionalRequirement: translate(lang, "migrated_app_admin_events_id_settings_conditional_requirement_2737e22f"), conditionalDependsOn: translate(lang, "migrated_app_admin_events_id_settings_depends_on_field_9bc49464"), conditionalValue: translate(lang, "migrated_app_admin_events_id_settings_condition_value_d8e858f9"), conditionalValuePlaceholder: translate(lang, "migrated_app_admin_events_id_settings_select_an_option_b9b6a93a"), conditionalHint: translate(lang, "migrated_app_admin_events_id_settings_this_field_becomes_required_when_the_selec_b3096729"), removeField: translate(lang, "migrated_app_admin_events_id_settings_remove_field_10afeac7"), labelPlaceholder: translate(lang, "migrated_app_admin_events_id_settings_e_g_national_id_number_ae480f42"), helperPlaceholder: translate(lang, "migrated_app_admin_events_id_settings_explain_what_the_attendee_should_enter_872a3bad"), previewHint: translate(lang, "migrated_app_admin_events_id_settings_these_fields_appear_on_the_public_registra_007f8f09"), name: translate(lang, "migrated_app_admin_events_id_settings_event_name_95ffa3e5"), namePlaceholder: translate(lang, "migrated_app_admin_events_id_settings_e_g_hepta_summit_2026_c90ca8a1"), date: translate(lang, "migrated_app_admin_events_id_settings_event_date_7e1dc675"), datePlaceholder: translate(lang, "migrated_app_admin_events_id_settings_select_the_event_date_cb9d843b"), location: translate(lang, "migrated_app_admin_events_id_settings_event_location_42e9163e"), locationPlaceholder: translate(lang, "migrated_app_admin_events_id_settings_e_g_izmir_ataturk_cultural_center_4fc8c9f6"), description: translate(lang, "migrated_app_admin_events_id_settings_event_description_a809cdb2"), descriptionPlaceholder: translate(lang, "migrated_app_admin_events_id_settings_use_line_breaks_bold_text_font_choices_and_ddc5ff02"), bannerTitle: translate(lang, "migrated_app_admin_events_id_settings_event_banner_644cbb7c"), bannerBody: translate(lang, "migrated_app_admin_events_id_settings_update_the_visual_used_on_registration_and_99fdc13d"), uploadBanner: translate(lang, "migrated_app_admin_events_id_settings_upload_banner_ccfe36a3"), bannerHint: translate(lang, "migrated_app_admin_events_id_settings_recommended_size_1200_400_jpg_png_or_webp_c4a78881"), noBanner: translate(lang, "migrated_app_admin_events_id_settings_no_banner_uploaded_yet_ac921bb9"), emailTitle: translate(lang, "migrated_app_admin_events_id_settings_automatic_certificate_email_2294a17d"), emailBody: translate(lang, "migrated_app_admin_events_id_settings_choose_which_email_template_should_be_sent_d9f8f0e3"), autoEmail: translate(lang, "migrated_app_admin_events_id_settings_send_an_automatic_email_when_a_certificate_34c75f20"), autoEmailHint: translate(lang, "migrated_app_admin_events_id_settings_as_soon_as_a_participant_certificate_is_ge_677b1b1c"), templateLabel: translate(lang, "migrated_app_admin_events_id_settings_email_template_2b81a164"), templatePlaceholder: translate(lang, "migrated_app_admin_events_id_settings_select_a_template_277ed97b"), customTemplates: translate(lang, "migrated_app_admin_events_id_settings_event_templates_7cb568d1"), systemTemplates: translate(lang, "migrated_app_admin_events_id_settings_system_templates_2b3d71a8"), noTemplates: translate(lang, "migrated_app_admin_events_id_settings_no_email_template_is_available_yet_create__6feab06d"), manageTemplates: translate(lang, "migrated_app_admin_events_id_settings_manage_email_templates_f971dcdb"), manageCampaigns: translate(lang, "migrated_app_admin_events_id_settings_go_to_bulk_email_campaigns_4e65abc0"), openEditor: translate(lang, "migrated_app_admin_events_id_settings_open_in_editor_f60af45e"), cancel: translate(lang, "migrated_app_admin_events_id_settings_cancel_437429de"), save: translate(lang, "migrated_app_admin_events_id_settings_save_settings_dc3d1fda"), saving: translate(lang, "migrated_app_admin_events_id_settings_saving_b5ff3932"), active: translate(lang, "migrated_app_admin_events_id_settings_active_ccf3cc92"), enterprise: translate(lang, "migrated_app_admin_events_id_settings_enterprise_4ca075c4"), growth: translate(lang, "migrated_app_admin_events_id_settings_growth_f811ce79"), commentsTitle: translate(lang, "migrated_app_admin_events_id_settings_comment_moderation_c6aff116"), commentsSubtitle: translate(lang, "migrated_app_admin_events_id_settings_review_public_event_comments_inspect_repor_99d2a6c1"), commentsEmpty: translate(lang, "migrated_app_admin_events_id_settings_there_are_no_comments_for_this_event_yet_1caa7a53"), commentsReported: translate(lang, "migrated_app_admin_events_id_settings_reports_796d96e4"), commentsHide: translate(lang, "migrated_app_admin_events_id_settings_hide_ca8163d8"), commentsPublish: translate(lang, "migrated_app_admin_events_id_settings_publish_7e70d79d"), commentsMember: translate(lang, "migrated_app_admin_events_id_settings_member_9b6b95c7"), commentsUpdated: translate(lang, "migrated_app_admin_events_id_settings_updated_106e14ae"), commentsFallback: translate(lang, "migrated_app_admin_events_id_settings_failed_to_load_comments_675eb251") };

  const [event, setEvent] = useState<EventOut | null>(null);
  const [customEmailTemplates, setCustomEmailTemplates] = useState<EmailTemplate[]>([]);
  const [systemEmailTemplates, setSystemEmailTemplates] = useState<EmailTemplate[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [venues, setVenues] = useState<OrganizationVenue[]>([]);
  // Backend-resolved feature presets per event type (single source of truth, ADR-0018).
  const [presetMap, setPresetMap] = useState<Record<string, Record<string, boolean>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/admin/event-feature-presets");
        const data = await res.json();
        if (!cancelled && data?.presets) setPresetMap(data.presets);
      } catch {
        // Non-fatal: fall back to local defaults if the preset endpoint is unavailable.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function defaultsForEventType(eventType: EventType): EventFeatureFlags {
    const p = presetMap?.[eventType];
    return p ? flagsFromPreset(p) : fallbackDefaultsForEventType(eventType);
  }

  const [formData, setFormData] = useState<FormState>({
    name: "",
    event_date: "",
    event_description: "",
    event_location: "",
    event_banner_url: "",
    registration_closed: false,
    visibility: "private",
    registration_fields: [],
    require_email_verification: true,
    registration_quota_enabled: false,
    registration_quota: "",
    auto_email_on_cert: false,
    cert_email_template_id: null,
    event_type: "certificate_event",
    certificate_enabled: true,
    checkin_enabled: true,
    ticketing_enabled: false,
    registration_enabled: true,
    raffles_enabled: false,
    gamification_enabled: false,
    requires_approval: false,
    quiz_enabled: false,
    cpd_enabled: false,
    agenda_enabled: false,
    cfp_enabled: false,
    networking_meetings_enabled: false,
    live_engagement_enabled: false,
    organizer_privacy_notice_enabled: false,
    organizer_privacy_notice_text: "",
    show_cross_border_transfer_notice: true,
    require_cross_border_transfer_consent: true,
    data_controller_name: "",
    data_controller_contact_email: "",
    data_retention_note: "",
    organization_venue_id: "",
    auto_reserve_venue: false,
    venue_reservation_start_at: "",
    venue_reservation_end_at: "",
  });

  const [savedFormSnapshot, setSavedFormSnapshot] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"general" | "registration" | "banner" | "email" | "comments" >("general");
  const [comments, setComments] = useState<PublicEventComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsSavingId, setCommentsSavingId] = useState<number | null>(null);
  const [sheetsStatus, setSheetsStatus] = useState<EventSheetsStatus | null>(null);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsAction, setSheetsAction] = useState<"auth" | "connect" | "sync" | "disconnect" | null>(null);
  const [excelStatus, setExcelStatus] = useState<EventMicrosoftExcelStatus | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelAction, setExcelAction] = useState<"auth" | "connect" | "sync" | "disconnect" | null>(null);
  const [authBridgeReady, setAuthBridgeReady] = useState(false);

  const isDirty = savedFormSnapshot !== "" && JSON.stringify(formData) !== savedFormSnapshot;

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 4000);
    return () => clearTimeout(t);
  }, [success]);

  useUnsavedChanges(isDirty && !saving, translate(lang, "migrated_app_admin_events_id_settings_you_have_unsaved_event_settings_7ebc2112"));
  useKeyboardShortcut("s", () => void handleSave(), { meta: true, enabled: !saving });

  const hasGrowthPlan = subscription?.role === "superadmin" || (subscription?.active && ["growth", "enterprise"].includes(subscription?.plan_id || ""));

  const fieldTypeOptions = FIELD_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: translate(lang, option.labelKey),
  }));
  const visibilityOptions = VISIBILITY_OPTIONS.map((option) => ({
    value: option.value,
    label: translate(lang, option.labelKey),
  }));

  const availableEmailTemplates = useMemo(
    () => [...customEmailTemplates, ...systemEmailTemplates],
    [customEmailTemplates, systemEmailTemplates],
  );

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
    void loadData();
  }, [eventId, authBridgeReady]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [eventRes, customRes, systemRes, subRes, venuesRes] = await Promise.all([
        apiFetch(`/admin/events/${eventId}`),
        apiFetch(`/admin/events/${eventId}/email-templates`),
        apiFetch("/system/email-templates"),
        getMySubscription(),
        apiFetch("/admin/organization/venues").catch(() => null),
      ]);

      const eventData = (await eventRes.json()) as EventOut;
      const customData = (await customRes.json()) as EmailTemplate[];
      const systemData = (await systemRes.json()) as EmailTemplate[];

      setEvent(eventData);
      setCustomEmailTemplates(customData || []);
      setSystemEmailTemplates(systemData || []);
      setSubscription(subRes);
      if (venuesRes) {
        const venueItems = (await venuesRes.json()) as OrganizationVenue[];
        setVenues((venueItems || []).filter((venue) => venue.is_active));
      } else {
        setVenues([]);
      }
      void loadSheetsStatus();
      void loadMicrosoftExcelStatus();

      const nextFormData: FormState = {
        name: eventData.name || "",
        event_date: eventData.event_date || "",
        event_description: eventData.event_description || "",
        event_location: eventData.event_location || "",
        event_banner_url: eventData.event_banner_url || "",
        registration_closed: Boolean(eventData.registration_closed ?? eventData.config?.registration_closed),
        registration_quota_enabled: Boolean(
          eventData.registration_quota_enabled
            ?? eventData.config?.registration_quota_enabled
            ?? ((eventData.registration_quota ?? eventData.config?.registration_quota) != null)
        ),
        registration_quota:
          (eventData.registration_quota ?? eventData.config?.registration_quota) != null
            ? String(eventData.registration_quota ?? eventData.config?.registration_quota)
            : "",
        visibility: eventData.visibility || (eventData.config?.visibility as FormState["visibility"]) || "private",
        registration_fields: Array.isArray(eventData.config?.registration_fields)
          ? eventData.config.registration_fields.map((field) => ({
              ...field,
              selection_mode:
                field.type === "select"
                  ? (field.selection_mode === "multiple" ? "multiple" : "single")
                  : undefined,
              options: Array.isArray(field.options)
                ? field.options.map((opt: any) =>
                    typeof opt === "string" ? { label: opt, capacity: null } : { label: opt.label || String(opt), capacity: opt.capacity ?? null }
                  )
                : [],
            }))
          : [],
        require_email_verification: eventData.require_email_verification ?? true,
        auto_email_on_cert: Boolean(eventData.auto_email_on_cert),
        cert_email_template_id: eventData.cert_email_template_id || null,
        event_type: eventData.event_type || "certificate_event",
        certificate_enabled: eventData.certificate_enabled ?? true,
        checkin_enabled: eventData.checkin_enabled ?? true,
        ticketing_enabled: eventData.ticketing_enabled ?? false,
        registration_enabled: eventData.registration_enabled ?? true,
        raffles_enabled: eventData.raffles_enabled ?? false,
        gamification_enabled: eventData.gamification_enabled ?? false,
        requires_approval: eventData.requires_approval ?? false,
        quiz_enabled: eventData.quiz_enabled ?? false,
        cpd_enabled: eventData.cpd_enabled ?? false,
        agenda_enabled: eventData.agenda_enabled ?? false,
        cfp_enabled: eventData.cfp_enabled ?? false,
        networking_meetings_enabled: eventData.networking_meetings_enabled ?? false,
        live_engagement_enabled: eventData.live_engagement_enabled ?? false,
        organizer_privacy_notice_enabled: Boolean(eventData.config?.organizer_privacy_notice_enabled),
        organizer_privacy_notice_text: String(eventData.config?.organizer_privacy_notice_text || ""),
        show_cross_border_transfer_notice: true,
        require_cross_border_transfer_consent: true,
        data_controller_name: String(eventData.config?.data_controller_name || ""),
        data_controller_contact_email: String(eventData.config?.data_controller_contact_email || ""),
        data_retention_note: String(eventData.config?.data_retention_note || ""),
        organization_venue_id: eventData.organization_venue_id ? String(eventData.organization_venue_id) : "",
        auto_reserve_venue: Boolean(eventData.venue_reservation_id || eventData.organization_venue_id),
        venue_reservation_start_at: toDateTimeLocal(eventData.venue_reservation_start_at),
        venue_reservation_end_at: toDateTimeLocal(eventData.venue_reservation_end_at),
      };
      setFormData(nextFormData);
      setSavedFormSnapshot(JSON.stringify(nextFormData));
    } catch (e: any) {
      setError(e?.message || copy.loadingError);
    } finally {
      setLoading(false);
    }
  }

  async function loadSheetsStatus() {
    if (!eventId) return;
    setSheetsLoading(true);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/sheets`);
      setSheetsStatus(await res.json());
    } catch {
      setSheetsStatus(null);
    } finally {
      setSheetsLoading(false);
    }
  }

  async function loadMicrosoftExcelStatus() {
    if (!eventId) return;
    setExcelLoading(true);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/microsoft-excel`);
      setExcelStatus(await res.json());
    } catch {
      setExcelStatus(null);
    } finally {
      setExcelLoading(false);
    }
  }

  async function handleConnectGoogleSheetsAuth() {
    setSheetsAction("auth");
    setError(null);
    try {
      const frontendOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const params = new URLSearchParams({
        next: `/admin/events/${eventId}/settings`,
        frontend_origin: frontendOrigin,
        event_id: String(eventId),
      });
      const res = await apiFetch(`/admin/google/sheets/start?${params.toString()}`);
      const data = await res.json();
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error(translate(lang, "migrated_app_admin_events_id_settings_could_not_get_google_authorization_url_0bad564b"));
      }
    } catch (err: any) {
      const message = err?.message || (translate(lang, "migrated_app_admin_events_id_settings_google_sheets_connection_could_not_be_star_74bfe83c"));
      setError(message);
      toast.error(message);
    } finally {
      setSheetsAction(null);
    }
  }

  async function handleCreateGoogleSheet() {
    setSheetsAction("connect");
    setError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/sheets/connect`, { method: "POST" });
      setSheetsStatus(await res.json());
      toast.success(translate(lang, "migrated_app_admin_events_id_settings_google_sheet_created_and_registrations_syn_a607a860"));
    } catch (err: any) {
      const message = err?.message || (translate(lang, "migrated_app_admin_events_id_settings_google_sheet_could_not_be_created_0c2b3235"));
      setError(message);
      toast.error(message);
    } finally {
      setSheetsAction(null);
    }
  }

  async function handleSyncGoogleSheet() {
    setSheetsAction("sync");
    setError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/sheets/sync`, { method: "POST" });
      setSheetsStatus(await res.json());
      toast.success(translate(lang, "migrated_app_admin_events_id_settings_google_sheet_synced_bb7ec399"));
    } catch (err: any) {
      const message = err?.message || (translate(lang, "migrated_app_admin_events_id_settings_google_sheet_could_not_be_synced_1b281ae4"));
      setError(message);
      toast.error(message);
    } finally {
      setSheetsAction(null);
    }
  }

  async function handleDisconnectGoogleSheet() {
    setSheetsAction("disconnect");
    setError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/sheets`, { method: "DELETE" });
      setSheetsStatus(await res.json());
      toast.success(translate(lang, "migrated_app_admin_events_id_settings_google_sheet_connection_disabled_25ab511e"));
    } catch (err: any) {
      const message = err?.message || (translate(lang, "migrated_app_admin_events_id_settings_connection_could_not_be_disabled_65c65626"));
      setError(message);
      toast.error(message);
    } finally {
      setSheetsAction(null);
    }
  }

  async function handleConnectMicrosoftExcelAuth() {
    setExcelAction("auth");
    setError(null);
    try {
      const frontendOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const params = new URLSearchParams({
        next: `/admin/events/${eventId}/settings`,
        frontend_origin: frontendOrigin,
        event_id: String(eventId),
      });
      const res = await apiFetch(`/admin/microsoft/excel/start?${params.toString()}`);
      const data = await res.json();
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error(translate(lang, "migrated_app_admin_events_id_settings_could_not_get_microsoft_authorization_url_95672501"));
      }
    } catch (err: any) {
      const message = err?.message || (translate(lang, "migrated_app_admin_events_id_settings_microsoft_excel_connection_could_not_be_st_1d88ffd6"));
      setError(message);
      toast.error(message);
    } finally {
      setExcelAction(null);
    }
  }

  async function handleCreateMicrosoftExcel() {
    setExcelAction("connect");
    setError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/microsoft-excel/connect`, { method: "POST" });
      setExcelStatus(await res.json());
      toast.success(translate(lang, "migrated_app_admin_events_id_settings_microsoft_excel_workbook_created_and_regis_12b7669a"));
    } catch (err: any) {
      const message = err?.message || (translate(lang, "migrated_app_admin_events_id_settings_microsoft_excel_workbook_could_not_be_crea_a5f6bd8b"));
      setError(message);
      toast.error(message);
    } finally {
      setExcelAction(null);
    }
  }

  async function handleSyncMicrosoftExcel() {
    setExcelAction("sync");
    setError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/microsoft-excel/sync`, { method: "POST" });
      setExcelStatus(await res.json());
      toast.success(translate(lang, "migrated_app_admin_events_id_settings_microsoft_excel_workbook_synced_e381329a"));
    } catch (err: any) {
      const message = err?.message || (translate(lang, "migrated_app_admin_events_id_settings_microsoft_excel_workbook_could_not_be_sync_d25d4455"));
      setError(message);
      toast.error(message);
    } finally {
      setExcelAction(null);
    }
  }

  async function handleDisconnectMicrosoftExcel() {
    setExcelAction("disconnect");
    setError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/microsoft-excel`, { method: "DELETE" });
      setExcelStatus(await res.json());
      toast.success(translate(lang, "migrated_app_admin_events_id_settings_microsoft_excel_connection_disabled_e2519c18"));
    } catch (err: any) {
      const message = err?.message || (translate(lang, "migrated_app_admin_events_id_settings_connection_could_not_be_disabled_65c65626"));
      setError(message);
      toast.error(message);
    } finally {
      setExcelAction(null);
    }
  }

  useEffect(() => {
    if (activeTab !== "comments") return;

    let active = true;
    setCommentsLoading(true);
    setError(null);

    listAdminEventComments(Number(eventId))
      .then((commentData) => {
        if (!active) return;
        setComments(commentData);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || copy.commentsFallback);
      })
      .finally(() => {
        if (active) setCommentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTab, eventId, lang]);

  function handleBannerSelect(file: File) {
    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setBannerPreview(event.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCommentStatusChange(commentId: number, status: "visible" | "hidden" | "reported") {
    setCommentsSavingId(commentId);
    setError(null);
    try {
      const updated = await updateAdminEventComment(Number(eventId), commentId, status);
      setComments((current) => current.map((comment) => (comment.id === commentId ? updated : comment)));
    } catch (err: any) {
      setError(err?.message || copy.commentsFallback);
    } finally {
      setCommentsSavingId(null);
    }
  }

  function addRegistrationField() {
    setFormData((current) => ({
      ...current,
      registration_fields: [...current.registration_fields, createRegistrationField()],
    }));
  }

  function updateRegistrationField(fieldId: string, patch: Partial<RegistrationField>) {
    setFormData((current) => ({
      ...current,
      registration_fields: current.registration_fields.map((field) =>
        field.id === fieldId ? { ...field, ...patch } : field,
      ),
    }));
  }

  function removeRegistrationField(fieldId: string) {
    setFormData((current) => ({
      ...current,
      registration_fields: current.registration_fields.filter((field) => field.id !== fieldId),
    }));
  }

  function moveRegistrationField(fieldId: string, direction: "up" | "down") {
    setFormData((current) => {
      const fields = [...current.registration_fields];
      const index = fields.findIndex((f) => f.id === fieldId);
      if (index === -1) return current;
      if (direction === "up" && index > 0) {
        [fields[index], fields[index - 1]] = [fields[index - 1], fields[index]];
      } else if (direction === "down" && index < fields.length - 1) {
        [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
      }
      return { ...current, registration_fields: fields };
    });
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      setError(copy.requiredName);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        event_date: formData.event_date || null,
        event_description: formData.event_description.trim(),
        event_location: formData.event_location.trim(),
        registration_closed: formData.registration_closed,
        visibility: formData.visibility,
        registration_fields: formData.registration_fields.map((field) => ({
          id: field.id,
          label: field.label.trim(),
          type: field.type,
          required: Boolean(field.required),
          pii: Boolean(field.pii),
          required_when_field_id: field.required_when_field_id?.trim() || null,
          required_when_equals: field.required_when_equals?.trim() || null,
          placeholder: field.placeholder?.trim() || null,
          helper_text: field.helper_text?.trim() || null,
          selection_mode:
            field.type === "select"
              ? (field.selection_mode === "multiple" ? "multiple" : "single")
              : null,
          options: field.type === "select"
            ? (field.options || []).map((option: any) =>
                typeof option === "string" ? { label: option.trim() } : { label: (option.label || "").trim(), capacity: option.capacity ?? null }
              ).filter((o: any) => o.label)
            : [],
        })).filter((field) => field.label),
        require_email_verification: formData.require_email_verification,
        registration_quota_enabled: formData.registration_quota_enabled,
        registration_quota: formData.registration_quota_enabled && formData.registration_quota.trim()
          ? Number(formData.registration_quota)
          : null,
        event_type: formData.event_type,
        certificate_enabled: formData.certificate_enabled,
        checkin_enabled: formData.checkin_enabled,
        ticketing_enabled: formData.ticketing_enabled,
        registration_enabled: formData.registration_enabled,
        raffles_enabled: formData.raffles_enabled,
        gamification_enabled: formData.gamification_enabled,
        requires_approval: formData.requires_approval,
        quiz_enabled: formData.quiz_enabled,
        cpd_enabled: formData.cpd_enabled,
        agenda_enabled: formData.agenda_enabled,
        cfp_enabled: formData.cfp_enabled,
        networking_meetings_enabled: formData.networking_meetings_enabled,
        live_engagement_enabled: formData.live_engagement_enabled,
        organizer_privacy_notice_enabled: formData.organizer_privacy_notice_enabled,
        organizer_privacy_notice_text: formData.organizer_privacy_notice_text.trim() || null,
        show_cross_border_transfer_notice: true,
        require_cross_border_transfer_consent: true,
        data_controller_name: formData.data_controller_name.trim() || null,
        data_controller_contact_email: formData.data_controller_contact_email.trim() || null,
        data_retention_note: formData.data_retention_note.trim() || null,
        organization_venue_id: formData.organization_venue_id ? Number(formData.organization_venue_id) : null,
        auto_reserve_venue: Boolean(formData.auto_reserve_venue && formData.organization_venue_id),
        venue_reservation_start_at: formData.venue_reservation_start_at ? new Date(formData.venue_reservation_start_at).toISOString() : null,
        venue_reservation_end_at: formData.venue_reservation_end_at ? new Date(formData.venue_reservation_end_at).toISOString() : null,
      };

      if (hasGrowthPlan) {
        payload.auto_email_on_cert = formData.auto_email_on_cert;
        payload.cert_email_template_id = formData.cert_email_template_id;
      }

      await apiFetch(`/admin/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (bannerFile) {
        const uploadForm = new FormData();
        uploadForm.append("file", bannerFile);
        await apiFetch(`/admin/events/${eventId}/banner-upload`, {
          method: "POST",
          body: uploadForm,
        });
        setBannerFile(null);
        setBannerPreview(null);
      }

      setSuccess(copy.saveSuccess);
      toast.success(copy.saveSuccess);
      refreshEventAdminMeta(eventId);
      await loadData();
    } catch (e: any) {
      const message = e?.message || copy.saveError;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex w-full min-h-[340px] items-center justify-center antialiased">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400 stroke-[2.5]" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-5 antialiased text-surface-900 pb-16">

      {/* ÜST ETKİNLİK NAVİGASYONU */}
      <EventAdminNav eventId={Number(eventId)} eventName={event?.name} active="settings" />

      {/* SAYFA BAŞLIĞI */}
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        icon={<Settings className="h-4 w-4 stroke-[2]" />}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/admin/events/${eventId}/editor`} className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold text-surface-700 shadow-sm transition hover:bg-surface-50">
              {copy.openEditor}
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-surface-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-surface-800 active:scale-95 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 stroke-[2.5]" />}
              <span>{saving ? copy.saving : copy.save}</span>
            </button>
          </div>
        }
      />

      {/* AI ASSISTANT PREFILL BANNERI */}
      {(event?.config as any)?.ai_assistant_populated_kvkk && (
        <div className="rounded-2xl border border-status-warning-border bg-status-warning-bg/20 p-4 flex items-start gap-3 animate-in fade-in duration-200">
          <ShieldAlert className="h-4 w-4 text-status-warning-content mt-0.5 shrink-0" />
          <div className="space-y-2 flex-1 text-xs">
            <h4 className="font-bold text-status-warning-content tracking-tight">Otomatik Eklenmiş KVKK / Gizlilik Öğeleri</h4>
            <p className="text-status-warning-content leading-relaxed font-medium">AI Asistanı bu etkinlik için KVKK/gizlilik öğelerini otomatik ekledi. Lütfen gözden geçirip doğrulayın.</p>
            <button
              type="button"
              onClick={() => {
                if (!event) return;
                const cfg = (event.config as any) || {};
                setFormData((current) => ({
                  ...current,
                  organizer_privacy_notice_enabled: Boolean(cfg.organizer_privacy_notice_enabled ?? current.organizer_privacy_notice_enabled ?? false),
                  organizer_privacy_notice_text: String(cfg.organizer_privacy_notice_text ?? current.organizer_privacy_notice_text ?? ""),
                  show_cross_border_transfer_notice: Boolean(cfg.show_cross_border_transfer_notice ?? current.show_cross_border_transfer_notice ?? true),
                  require_cross_border_transfer_consent: Boolean(cfg.require_cross_border_transfer_consent ?? current.require_cross_border_transfer_consent ?? true),
                  data_controller_name: String(cfg.data_controller_name ?? current.data_controller_name ?? ""),
                  data_controller_contact_email: String(cfg.data_controller_contact_email ?? current.data_controller_contact_email ?? ""),
                  data_retention_note: String(cfg.data_retention_note ?? current.data_retention_note ?? ""),
                }));
                refreshEventAdminMeta(eventId);
                void loadData();
              }}
              className="inline-flex min-h-[30px] items-center justify-center rounded-lg bg-amber-600 px-3 font-bold text-white shadow-sm transition hover:bg-amber-700 active:scale-95"
            >
              Prefill Verileri İncele
            </button>
          </div>
        </div>
      )}

      {/* DURUM BİLGİLENDİRME ŞERİTLERİ */}
      {error && (
        <div className="rounded-xl border border-status-danger-border bg-status-danger-bg/40 p-4 text-xs font-semibold text-status-danger-content flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-status-success-border bg-status-success-bg/40 p-4 text-xs font-semibold text-status-success-content flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* APPLE SEGMENTED CONTROL TASARIMINDA SABİTLENMİŞ SEKME ÇUBUĞU */}
      <div className="overflow-x-auto scrollbar-none">
        <div className="flex min-w-max gap-1 border border-surface-200/80 bg-surface-50/60 p-1 rounded-xl lg:min-w-0">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const label = translate(lang, tab.labelKey);
            const isAct = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold tracking-tight transition-all ${
                  isAct
                    ? "bg-raised text-surface-900 shadow-sm border border-surface-200/60"
                    : "border border-transparent text-surface-500 hover:text-surface-900 hover:bg-raised/40"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isAct ? "text-surface-900 stroke-[2]" : "text-surface-400 stroke-[1.8]"}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DEĞİŞİKLİK VE KAYDETME YÜZEY UYARI ÇUBUĞU */}
      {isDirty && !saving && (
        <div className="rounded-xl border border-status-warning-border bg-status-warning-bg/30 p-3 text-center text-11 font-bold text-status-warning-content tracking-tight animate-in fade-in duration-150">
          ⚠️ {translate(lang, "migrated_app_admin_events_id_settings_you_have_unsaved_changes_use_ctrl_s_to_syn_84f58c52")}
        </div>
      )}

      {/* 5. AKTİF SEKME AYAR KAPSÜLLERİ GÖVDESİ */}
      <div className="space-y-4">

        {/* TAB 1: GENEL AYARLAR VE SALON REZERVASYON Katmanı */}
        {activeTab === "general" && (
          <div className="space-y-4 w-full">
            {/* Blok A: Temel Bilgiler Formu */}
            <section className="rounded-2xl border border-surface-200 bg-raised p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
                <FileText className="h-4 w-4 text-surface-800 stroke-[1.8]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.basicTitle}</h2>
              </div>

              <div className="grid gap-4">
                <label className="block w-full">
                  <span className="block text-11 font-bold text-surface-500 mb-1">{copy.name}</span>
                  <input value={formData.name} onChange={(e) => setFormData((curr) => ({ ...curr, name: e.target.value }))} className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900" placeholder={copy.namePlaceholder} />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <DateField label={copy.date} value={formData.event_date} onChange={(val) => setFormData((curr) => ({ ...curr, event_date: val }))} placeholder={copy.datePlaceholder} locale={localeTag(lang)} />
                  <label className="block w-full">
                    <span className="block text-11 font-bold text-surface-500 mb-1">{copy.location}</span>
                    <input value={formData.event_location} onChange={(e) => setFormData((curr) => ({ ...curr, event_location: e.target.value }))} className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900" placeholder={copy.locationPlaceholder} />
                  </label>
                </div>

                <label className="block w-full">
                  <span className="block text-11 font-bold text-surface-500 mb-1">{copy.description}</span>
                  <RichTextEditor value={formData.event_description} onChange={(val) => setFormData((curr) => ({ ...curr, event_description: val }))} placeholder={copy.descriptionPlaceholder} />
                </label>
              </div>
            </section>

            {/* Blok B: Salon Rezervasyon Otomasyonu */}
            {venues.length > 0 && (
              <section className="rounded-2xl border border-surface-200 bg-raised p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
                  <Building2 className="h-4 w-4 text-surface-800 stroke-[1.8]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{translate(lang, "migrated_app_admin_events_id_settings_venue_and_reservation_4a03cc8a")}</h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block w-full">
                    <span className="block text-11 font-bold text-surface-500 mb-1">{translate(lang, "migrated_app_admin_events_id_settings_venue_56964031")}</span>
                    <div className="relative inline-flex items-center w-full">
                      <select
                        value={formData.organization_venue_id}
                        onChange={(e) => setFormData((curr) => ({ ...curr, organization_venue_id: e.target.value, auto_reserve_venue: e.target.value ? curr.auto_reserve_venue : false }))}
                        className="w-full min-h-[38px] appearance-none rounded-xl border border-surface-200 bg-raised px-3 text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value="">{translate(lang, "migrated_app_admin_events_id_settings_no_venue_selected_17655d2e")}</option>
                        {venues.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}{v.capacity ? ` (${v.capacity} kişi)` : ""}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-surface-400" />
                    </div>
                  </label>

                  <DateTimeField value={formData.venue_reservation_start_at} onChange={(val) => setFormData((curr) => ({ ...curr, venue_reservation_start_at: val }))} label={translate(lang, "migrated_app_admin_events_id_settings_reservation_start_701f6a0e")} disabled={!formData.organization_venue_id} locale={localeTag(lang)} />
                  <DateTimeField value={formData.venue_reservation_end_at} onChange={(val) => setFormData((curr) => ({ ...curr, venue_reservation_end_at: val }))} label={translate(lang, "migrated_app_admin_events_id_settings_reservation_end_e50df5f5")} disabled={!formData.organization_venue_id} locale={localeTag(lang)} />
                </div>

                <label className="flex items-center gap-2.5 select-none pt-1">
                  <input type="checkbox" checked={formData.auto_reserve_venue} disabled={!formData.organization_venue_id} onChange={(e) => setFormData((curr) => ({ ...curr, auto_reserve_venue: e.target.checked }))} className="h-4 w-4 rounded-md border-surface-300 text-surface-900 focus:ring-0 cursor-pointer disabled:opacity-40" />
                  <span className="text-xs font-semibold text-surface-700 tracking-tight">{translate(lang, "migrated_app_admin_events_id_settings_auto_reserve_venue_based_on_current_availa_6f3a2505")}</span>
                </label>
              </section>
            )}

            {/* Blok C: Etkinlik Özellik Matrisi ve Switch Kapakları */}
            <section className="rounded-2xl border border-surface-200 bg-raised p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
                <Settings className="h-4 w-4 text-surface-800 stroke-[1.8]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{translate(lang, "migrated_app_admin_events_id_settings_feature_configuration_matrix_2be29c71")}</h2>
              </div>

              <div className="space-y-3.5">
                <label className="block w-full sm:max-w-xs">
                  <span className="block text-11 font-bold text-surface-500 mb-1">{translate(lang, "migrated_app_admin_events_id_settings_base_event_type_cf4b61af")}</span>
                  <div className="relative inline-flex items-center w-full">
                    <select
                      value={formData.event_type}
                      onChange={(e) => setFormData((curr) => ({ ...curr, event_type: e.target.value as EventType, ...defaultsForEventType(e.target.value as EventType) }))}
                      className="w-full min-h-[38px] appearance-none rounded-xl border border-surface-200 bg-raised px-3 text-xs font-semibold outline-none cursor-pointer"
                    >
                      {EVENT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{translate(lang, option.labelKey)}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-surface-400" />
                  </div>
                </label>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-1">
                  {[
                    { key: "certificate_enabled", label: translate(lang, "migrated_app_admin_events_id_settings_certificate_engine_active_007779be"), hint: translate(lang, "migrated_app_admin_events_id_settings_deactivates_credential_ledger_features_4e44355c") },
                    { key: "checkin_enabled", label: translate(lang, "migrated_app_admin_events_id_settings_qr_check_in_engine_active_901bab52"), hint: translate(lang, "migrated_app_admin_events_id_settings_deactivates_onsite_gate_sync_matrices_eb7bb9cb") },
                    { key: "ticketing_enabled", label: translate(lang, "migrated_app_admin_events_id_settings_pass_card_ticketing_system_77010321"), hint: translate(lang, "migrated_app_admin_events_id_settings_generates_wallet_bound_pass_codes_692c4303") },
                    { key: "raffles_enabled", label: translate(lang, "migrated_app_admin_events_id_settings_raffle_execution_hub_7c19869d"), hint: translate(lang, "migrated_app_admin_events_id_settings_enables_attendee_bound_randomizer_luck_alg_f847248d") },
                    { key: "gamification_enabled", label: translate(lang, "migrated_app_admin_events_id_settings_engagement_badge_logic_3d2c4e64"), hint: translate(lang, "migrated_app_admin_events_id_settings_activates_behavioral_achievement_badges_88a25097") },
                    { key: "registration_enabled", label: translate(lang, "migrated_app_admin_events_id_settings_self_registration_landing_3b3bce46"), hint: translate(lang, "migrated_app_admin_events_id_settings_restricts_entry_to_internal_import_pipelin_b943f77a") },
                    { key: "requires_approval", label: translate(lang, "migrated_app_admin_events_id_settings_admin_approval_lifecycle_51dbe594"), hint: translate(lang, "migrated_app_admin_events_id_settings_holds_incoming_entries_in_staging_queues_32c67a7c") },
                    { key: "quiz_enabled", label: translate(lang, "migrated_app_admin_events_id_settings_quiz_module_9b035d1a"), hint: translate(lang, "migrated_app_admin_events_id_settings_enables_quiz_configuration_and_certificate_184bfdae") },
                    { key: "cpd_enabled", label: translate(lang, "migrated_app_admin_events_id_settings_cpd_module_8e1551a6"), hint: translate(lang, "migrated_app_admin_events_id_settings_automatically_logs_cpd_hours_when_a_certif_3ff9a022") },
                    { key: "agenda_enabled", label: t("agenda_settings_label"), hint: t("agenda_settings_hint") },
                    { key: "cfp_enabled", label: t("cfp_settings_label"), hint: t("cfp_settings_hint") },
                    { key: "networking_meetings_enabled", label: t("net_settings_label"), hint: t("net_settings_hint") },
                    { key: "live_engagement_enabled", label: t("live_settings_label"), hint: t("live_settings_hint") },
                  ].map((feature) => (
                    <label key={feature.key} className="flex items-start gap-3 rounded-xl border border-surface-100 bg-surface-50/40 p-4 select-none cursor-pointer hover:bg-surface-50 transition-colors">
                      <input type="checkbox" checked={Boolean(formData[feature.key as keyof FormState])} onChange={(e) => setFormData((curr) => ({ ...curr, [feature.key]: e.target.checked }))} className="mt-0.5 h-4 w-4 rounded-md border-surface-300 text-surface-900 focus:ring-0 cursor-pointer" />
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-surface-900 tracking-tight">{feature.label}</p>
                        <p className="text-11 leading-normal text-surface-400 font-medium">{feature.hint}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </section>

            {/* Blok D: Görünürlük Ayarı */}
            <section className="rounded-2xl border border-surface-200 bg-raised p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
                <Sparkles className="h-4 w-4 text-surface-800 stroke-[1.8]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.visibilityTitle}</h2>
              </div>
              <p className="text-11 leading-relaxed text-surface-400 font-medium">{copy.visibilityBody}</p>

              <div className="space-y-3.5 max-w-sm">
                <label className="block w-full">
                  <span className="block text-11 font-bold text-surface-500 mb-1">{copy.visibilityLabel}</span>
                  <div className="relative inline-flex items-center w-full">
                    <select value={formData.visibility} onChange={(e) => setFormData((curr) => ({ ...curr, visibility: e.target.value as FormState["visibility"] }))} className="w-full min-h-[38px] appearance-none rounded-xl border border-surface-200 bg-raised px-3 text-xs font-semibold outline-none cursor-pointer focus:border-surface-900">
                      {visibilityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-surface-400" />
                  </div>
                </label>
                <p className="text-11 leading-relaxed text-surface-400 font-medium">{copy.visibilityHint}</p>
              </div>
            </section>

            {/* Blok E: Kota ve Kayıt Durumu Sınırları */}
            <section className="rounded-2xl border border-surface-200 bg-raised p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
                <AlertCircle className="h-4 w-4 text-surface-800 stroke-[1.8]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.registrationStatusTitle}</h2>
              </div>
              <p className="text-11 leading-relaxed text-surface-400 font-medium">{copy.registrationStatusBody}</p>

              <div className="space-y-3.5">
                <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
                  <input type="checkbox" checked={formData.registration_closed} onChange={(e) => setFormData((curr) => ({ ...curr, registration_closed: e.target.checked }))} className="h-4 w-4 rounded-md border-surface-300 text-surface-900 focus:ring-0 cursor-pointer" />
                  <span className="text-xs font-semibold text-surface-800 tracking-tight">{copy.registrationToggle}</span>
                </label>
                <p className="text-11 leading-none text-surface-400 font-medium pl-6">{copy.registrationHint}</p>

                <div className="border-t border-outline-subtle pt-3 max-w-sm space-y-2.5">
                  <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
                    <input type="checkbox" checked={formData.registration_quota_enabled} onChange={(e) => setFormData((curr) => ({ ...curr, registration_quota_enabled: e.target.checked }))} className="h-4 w-4 rounded-md border-surface-300 text-surface-900 focus:ring-0 cursor-pointer" />
                    <span className="text-xs font-semibold text-surface-800 tracking-tight">{copy.registrationQuotaToggle}</span>
                  </label>
                  <p className="text-11 leading-normal text-surface-400 font-medium pl-6">{copy.registrationQuotaHint}</p>

                  {formData.registration_quota_enabled && (
                    <div className="pl-6 pt-1">
                      <input type="number" min={1} step={1} value={formData.registration_quota} onChange={(e) => setFormData((curr) => ({ ...curr, registration_quota: e.target.value }))} className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold font-mono outline-none transition focus:border-surface-900 placeholder:text-surface-400" placeholder={copy.registrationQuotaPlaceholder} />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Blok F: KVKK, Aydınlatma Sorumluluk Grubu */}
            <section className="rounded-2xl border border-surface-200 bg-raised p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
                <ShieldAlert className="h-4 w-4 text-surface-800 stroke-[1.8]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{translate(lang, "migrated_app_admin_events_id_settings_privacy_and_data_processing_2735069c")}</h2>
              </div>
              <p className="text-11 leading-relaxed text-surface-400 font-medium">{translate(lang, "migrated_app_admin_events_id_settings_map_regulatory_notice_nodes_3651241d")}</p>

              <div className="space-y-4">
                <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
                  <input type="checkbox" checked={formData.organizer_privacy_notice_enabled} onChange={(e) => setFormData((curr) => ({ ...curr, organizer_privacy_notice_enabled: e.target.checked }))} className="h-4 w-4 rounded-md border-surface-300 text-surface-900 focus:ring-0 cursor-pointer" />
                  <span className="text-xs font-semibold text-surface-800 tracking-tight">{translate(lang, "migrated_app_admin_events_id_settings_organizer_notice_required_2dec7709")}</span>
                </label>

                <div className="space-y-1">
                  <span className="block text-11 font-bold text-surface-500 mb-1">{translate(lang, "migrated_app_admin_events_id_settings_organizer_privacy_notice_ea8bc210")}</span>
                  <RichTextEditor value={formData.organizer_privacy_notice_text} onChange={(val) => setFormData((curr) => ({ ...curr, organizer_privacy_notice_text: val }))} placeholder="Mevzuat uyumluluk metnini yazın..." />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block w-full">
                    <span className="block text-11 font-bold text-surface-500 mb-1">Veri Sorumlusu Kurum Unvanı</span>
                    <input value={formData.data_controller_name} onChange={(e) => setFormData((curr) => ({ ...curr, data_controller_name: e.target.value }))} className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900" placeholder="Örn: Heptapus Teknoloji Grubu" />
                  </label>
                  <label className="block w-full">
                    <span className="block text-11 font-bold text-surface-500 mb-1">Mevzuat Veri Sorumlusu E-postası</span>
                    <input type="email" value={formData.data_controller_contact_email} onChange={(e) => setFormData((curr) => ({ ...curr, data_controller_contact_email: e.target.value }))} className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900" placeholder="contact@heptapusgroup.com" />
                  </label>
                </div>

                <label className="block w-full">
                  <span className="block text-11 font-bold text-surface-500 mb-1">Veri İmha ve Saklama Politikası Notu</span>
                  <textarea value={formData.data_retention_note} onChange={(e) => setFormData((curr) => ({ ...curr, data_retention_note: e.target.value }))} className="w-full rounded-xl border border-surface-200 bg-raised p-3 text-xs font-medium outline-none transition focus:border-surface-900 min-h-24 resize-none placeholder:text-surface-400" placeholder="Örn: Veriler kanuni süre uyarınca etkinlik tamamlandıktan 180 gün sonra imha edilir." />
                </label>

                {/* Sabit Yasal Uyarı Paneli */}
                <div className="rounded-xl border border-status-warning-border bg-status-warning-bg/30 p-3.5 flex items-start gap-3">
                  <Info className="h-4 w-4 shrink-0 text-status-warning-content mt-0.5 stroke-[2]" />
                  <div className="space-y-1 text-11 leading-relaxed text-status-warning-content font-medium">
                    <p className="font-bold">{translate(lang, "migrated_app_admin_events_id_settings_cross_border_data_transfer_node_38d12766")}</p>
                    <p>{translate(lang, "migrated_app_admin_events_id_settings_system_forces_cross_border_acknowledgement_e93f1269")}</p>
                  </div>
                </div>
              </div>
            </section>

            <RetentionPolicySection eventId={Number(eventId)} />
          </div>
        )}

        {/* TAB 2: KAYIT FORMU ÖZEL ALAN YAPILANDIRMASI */}
        {activeTab === "registration" && (
          <div className="space-y-4 w-full">
            <section className="rounded-2xl border border-surface-200 bg-raised p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-surface-100 pb-2.5">
                <div className="space-y-0.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.registrationTitleMeta}</h2>
                  <p className="text-11 font-medium text-surface-400">Ad ve e-postaya ek olarak toplanacak form girdileri</p>
                </div>
                <button type="button" onClick={addRegistrationField} className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg bg-surface-900 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-surface-800 active:scale-95">
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" /> <span>{copy.addField}</span>
                </button>
              </div>

              {/* Boş Durum Sinyali */}
              {formData.registration_fields.length === 0 ? (
                <div className="rounded-xl border border-dashed border-surface-200 py-12 text-center text-xs font-semibold text-surface-400 tracking-tight">{copy.emptyFields}</div>
              ) : (
                /* Özel Alan Kartları Döngüsü */
                <div className="space-y-3.5">
                  {formData.registration_fields.map((field, index) => {
                    const conditionalSourceFields = formData.registration_fields.filter((c) => c.id !== field.id && c.type === "select");
                    const selectedConditionalSource = conditionalSourceFields.find((c) => c.id === field.required_when_field_id);
                    const conditionalValueOptions = (selectedConditionalSource?.options || []).map((o: any) => typeof o === "string" ? o : o.label || String(o)).map((s: string) => s.trim()).filter(Boolean);

                    return (
                      <div key={field.id} className="rounded-2xl border border-surface-200 bg-raised p-5 shadow-sm space-y-4 relative transition-all hover:border-surface-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-subtle pb-3">
                          <div className="flex items-center gap-2.5 text-xs font-bold text-surface-900 tracking-tight">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-surface-900 font-mono text-11 text-white shadow-sm">{index + 1}</span>
                            <span className="truncate max-w-[240px]">{field.label || "İsimsiz Alan Çeperi"}</span>
                          </div>

                          {/* Alan Hiyerarşi Değiştirme Butonları */}
                          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                            <button type="button" onClick={() => moveRegistrationField(field.id, "up")} disabled={index === 0} className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-100 bg-raised text-surface-400 hover:text-surface-900 disabled:opacity-20 shadow-sm"><ChevronUp className="h-4 w-4 stroke-[2]" /></button>
                            <button type="button" onClick={() => moveRegistrationField(field.id, "down")} disabled={index === formData.registration_fields.length - 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-100 bg-raised text-surface-400 hover:text-surface-900 disabled:opacity-20 shadow-sm"><ChevronDown className="h-4 w-4 stroke-[2]" /></button>
                            <button type="button" onClick={() => removeRegistrationField(field.id)} className="inline-flex min-h-[28px] items-center justify-center gap-1 rounded-lg border border-status-danger-border bg-raised px-2 text-11 font-bold text-status-danger-content shadow-sm hover:bg-status-danger-bg"><Trash2 className="h-3 w-3 stroke-[1.8]" /> <span>Kaldır</span></button>
                          </div>
                        </div>

                        {/* Kart İçi Form Girdileri */}
                        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 font-semibold text-surface-600">
                          <label className="block w-full">
                            <span className="block text-11 font-bold text-surface-500 mb-1">{copy.fieldLabel}</span>
                            <input value={field.label} onChange={(e) => updateRegistrationField(field.id, { label: e.target.value })} className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900" placeholder="Örn: Şirket / Kurum Unvanı" />
                          </label>

                          <label className="block w-full">
                            <span className="block text-11 font-bold text-surface-500 mb-1">{copy.fieldType}</span>
                            <div className="relative inline-flex items-center w-full">
                              <select value={field.type} onChange={(e) => updateRegistrationField(field.id, { type: e.target.value as any, options: e.target.value === "select" ? (field.options || [""]) : [] })} className="w-full min-h-[38px] appearance-none rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold outline-none cursor-pointer">
                                {fieldTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-surface-400" />
                            </div>
                          </label>

                          <label className="block w-full sm:col-span-2">
                            <span className="block text-11 font-bold text-surface-500 mb-1">{copy.fieldPlaceholder}</span>
                            <input value={field.placeholder || ""} onChange={(e) => updateRegistrationField(field.id, { placeholder: e.target.value })} className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900" placeholder="Kutunun içinde silik görünecek açıklama..." />
                          </label>
                        </div>

                        <label className="block w-full">
                          <span className="block text-11 font-bold text-surface-500 mb-1">{copy.fieldHelper}</span>
                          <RichTextEditor value={field.helper_text || ""} onChange={(val) => updateRegistrationField(field.id, { helper_text: val })} placeholder="Katılımcıyı yönlendirecek kılavuz alt metni kurgulayın..." />
                        </label>

                        {/* SEÇENEKLER ALANI */}
                        {field.type === "select" && (
                          <div className="rounded-xl border border-surface-100 bg-surface-50/40 p-4 space-y-4">
                            <div className="space-y-1.5">
                              <span className="block text-11 font-bold text-surface-500">Çoklu Seçim Tolerans Ayarı</span>
                              <div className="flex gap-2 font-bold text-xs">
                                <button type="button" onClick={() => updateRegistrationField(field.id, { selection_mode: "single" })} className={`inline-flex h-8 px-4 items-center justify-center rounded-xl border transition-all ${(!field.selection_mode || field.selection_mode === "single") ? "border-outline-strong bg-surface-900 text-white shadow-sm" : "border-surface-200 bg-raised text-surface-600 hover:bg-surface-900"}`}>Tekil Radyo Seçimi</button>
                                <button type="button" onClick={() => updateRegistrationField(field.id, { selection_mode: "multiple" })} className={`inline-flex h-8 px-4 items-center justify-center rounded-xl border transition-all ${(field.selection_mode === "multiple") ? "border-outline-strong bg-surface-900 text-white shadow-sm" : "border-surface-200 bg-raised text-surface-600 hover:bg-surface-900"}`}>Çoklu Onay Kutusu (Checkbox)</button>
                              </div>
                            </div>

                            <div className="space-y-2.5">
                              <span className="block text-11 font-bold text-surface-500">{copy.fieldOptions}</span>
                              {Array.isArray(field.options) && field.options.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 rounded-xl border border-surface-100 bg-raised p-3 shadow-inner">
                                  {field.options.map((opt: any, idx) => (
                                    <div key={idx} className="inline-flex items-center gap-2 rounded-lg border border-surface-100 bg-surface-50/50 pl-2.5 pr-1.5 py-1 text-xs font-semibold text-surface-800">
                                      <span>{typeof opt === "string" ? opt : opt.label}</span>
                                      {typeof opt === "object" && opt.capacity != null && <span className="font-mono text-11 text-status-success-content bg-status-success-bg px-1 rounded">Maks {opt.capacity}</span>}
                                      <input
                                        type="number"
                                        placeholder="Kota"
                                        value={typeof opt === "object" && opt.capacity != null ? String(opt.capacity) : ""}
                                        onChange={(e) => {
                                          const v = e.target.value.trim();
                                          updateRegistrationField(field.id, {
                                            options: (field.options || []).map((o: any, i: number) => i === idx ? { label: typeof o === "string" ? o : o.label, capacity: v ? Number(v) : null } : o)
                                          });
                                        }}
                                        className="w-12 border border-surface-200 rounded px-1 text-center font-mono text-11 bg-raised h-5 outline-none"
                                      />
                                      <span onClick={() => updateRegistrationField(field.id, { options: (field.options || []).filter((_, i) => i !== idx) })} className="p-0.5 text-surface-400 hover:text-status-danger-content transition-colors cursor-pointer"><X className="h-3 w-3 stroke-[2.5]" /></span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-2 max-w-sm">
                                <input id={`option-input-${field.id}`} placeholder="Yeni seçenek metnini yazın..." onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const inp = e.currentTarget; const val = inp.value.trim(); if (val) { updateRegistrationField(field.id, { options: [...(field.options || []), { label: val, capacity: null }] }); inp.value = ""; } } }} className="w-full min-h-[34px] rounded-xl border border-surface-200 bg-raised px-3 text-xs font-semibold outline-none transition focus:border-surface-900" />
                                <button type="button" onClick={() => { const inp = document.getElementById(`option-input-${field.id}`) as HTMLInputElement; if (inp) { const val = inp.value.trim(); if (val) { updateRegistrationField(field.id, { options: [...(field.options || []), { label: val, capacity: null }] }); inp.value = ""; } } }} className="inline-flex min-h-[34px] items-center justify-center rounded-lg bg-surface-900 px-3.5 text-xs font-bold text-white shadow-sm hover:bg-surface-800">Ekle</button>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-4 pt-1">
                          <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
                            <input type="checkbox" checked={field.required} onChange={(e) => updateRegistrationField(field.id, { required: e.target.checked })} className="h-4 w-4 rounded-md border-surface-300 text-surface-900 focus:ring-0 cursor-pointer" />
                            <span className="text-xs font-semibold text-surface-800 tracking-tight">{copy.requiredField}</span>
                          </label>
                          <label className="inline-flex cursor-pointer items-center gap-2.5 select-none" title={t("field_pii_hint")}>
                            <input type="checkbox" checked={Boolean(field.pii)} onChange={(e) => updateRegistrationField(field.id, { pii: e.target.checked })} className="h-4 w-4 rounded-md border-surface-300 text-status-warning-content focus:ring-0 cursor-pointer" />
                            <span className="text-xs font-semibold text-status-warning-content tracking-tight">{t("field_pii_label")}</span>
                          </label>
                        </div>

                        {/* KOŞULLU ZORUNLULUK SİHİRBAZI */}
                        <details className="rounded-xl border border-surface-200 bg-surface-50/30 group overflow-hidden">
                          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 font-bold text-surface-900 text-xs select-none bg-surface-50/50 [&::-webkit-details-marker]:hidden">
                            <span className="flex items-center gap-1.5"><Settings className="h-3.5 w-3.5 text-surface-500" /> <span>{copy.conditionalRequirement}</span></span>
                            <ChevronDown className="h-3.5 w-3.5 text-surface-400 transition-transform duration-200 group-open:rotate-180" />
                          </summary>
                          <div className="border-t border-surface-100 p-4 space-y-3 font-semibold text-surface-600 text-xs">
                            <p className="text-surface-400 font-medium leading-relaxed mb-1">{copy.conditionalHint}</p>
                            <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
                              <label className="block w-full">
                                <span className="block text-11 font-bold text-surface-500 mb-1">{copy.conditionalDependsOn}</span>
                                <div className="relative inline-flex items-center w-full">
                                  <select value={field.required_when_field_id || ""} onChange={(e) => { const nextId = e.target.value; updateRegistrationField(field.id, { required_when_field_id: nextId || undefined, required_when_equals: nextId ? (field.required_when_equals || "") : undefined }); }} className="w-full min-h-[36px] appearance-none rounded-xl border border-surface-200 bg-raised px-3 font-semibold outline-none cursor-pointer">
                                    <option value="">{translate(lang, "migrated_app_admin_events_id_settings_none_8eef562a")}</option>
                                    {conditionalSourceFields.map((c) => <option key={c.id} value={c.id}>{c.label || c.id}</option>)}
                                  </select>
                                  <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-surface-400" />
                                </div>
                              </label>

                              <label className="block w-full">
                                <span className="block text-11 font-bold text-surface-500 mb-1">{copy.conditionalValue}</span>
                                <div className="relative inline-flex items-center w-full">
                                  <select value={field.required_when_equals || ""} onChange={(e) => updateRegistrationField(field.id, { required_when_equals: e.target.value })} disabled={!field.required_when_field_id || !conditionalValueOptions.length} className="w-full min-h-[36px] appearance-none rounded-xl border border-surface-200 bg-raised px-3 font-semibold outline-none cursor-pointer disabled:opacity-40">
                                    <option value="">{copy.conditionalValuePlaceholder}</option>
                                    {conditionalValueOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                  <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-surface-400" />
                                </div>
                              </label>
                            </div>
                          </div>
                        </details>

                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 3: AFİŞ / BANNER YÜKLEME PANELİ */}
        {activeTab === "banner" && (
          <section className="rounded-2xl border border-surface-200 bg-raised p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3 border-b border-surface-100 pb-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-100 bg-surface-50 text-surface-500 shadow-sm">
                <ImageIcon className="h-4 w-4 stroke-[1.8]" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold tracking-tight text-surface-900">{copy.bannerTitle}</h2>
                <p className="text-xs text-surface-400 font-medium">{copy.bannerBody}</p>
              </div>
            </div>

            <div className="space-y-3.5 max-w-2xl">
              <div className="overflow-hidden rounded-xl border border-surface-200 bg-surface-50 shadow-inner relative group">
                {bannerPreview || formData.event_banner_url ? (
                  <img src={bannerPreview || formData.event_banner_url} alt={copy.bannerTitle} className="h-48 w-full object-cover mix-blend-multiply sm:h-56" />
                ) : (
                  <div className="flex h-48 sm:h-56 items-center justify-center text-xs font-semibold text-surface-400">{copy.noBanner}</div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold text-surface-800 shadow-sm transition hover:bg-surface-50 cursor-pointer select-none">
                  <Upload className="h-3.5 w-3.5 text-surface-500 stroke-[2]" />
                  <span>{copy.uploadBanner}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleBannerSelect(e.target.files[0])} />
                </label>
                <p className="text-11 font-medium text-surface-400">{copy.bannerHint}</p>
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: OTOMATİK SERTİFİKA TESLİMAT BÜLTEN KANALI */}
        {activeTab === "email" && (
          <section className="rounded-2xl border border-surface-200 bg-raised p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3 border-b border-surface-100 pb-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-100 bg-surface-50 text-surface-500 shadow-sm">
                <Mail className="h-4 w-4 stroke-[1.8]" />
              </div>
              <div className="min-w-0 space-y-0.5 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold tracking-tight text-surface-900">{copy.emailTitle}</h2>
                  {hasGrowthPlan && <span className="inline-flex rounded-md bg-status-success-bg border border-status-success-border px-1.5 py-0.5 text-11 font-bold uppercase text-status-success-content shadow-sm">{subscription?.plan_id === "enterprise" ? copy.enterprise : copy.growth}</span>}
                </div>
                <p className="text-xs text-surface-400 font-medium">{copy.emailBody}</p>
              </div>
            </div>

            {!hasGrowthPlan ? (
              <div className="pt-2"><PlanGateCard feature={copy.autoEmail} requiredPlans={["growth", "enterprise"]} compact /></div>
            ) : (
              <div className="space-y-4.5">
                <label className="inline-flex cursor-pointer items-center gap-2.5 select-none py-1">
                  <input type="checkbox" checked={formData.auto_email_on_cert} onChange={(e) => setFormData((curr) => ({ ...curr, auto_email_on_cert: e.target.checked }))} className="h-4 w-4 rounded-md border-surface-300 text-surface-900 focus:ring-0 cursor-pointer" />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-surface-900 tracking-tight block">{copy.autoEmail}</span>
                    <span className="text-11 text-surface-400 font-medium block">{copy.autoEmailHint}</span>
                  </div>
                </label>

                {formData.auto_email_on_cert && (
                  <div className="space-y-3 max-w-sm pt-1 animate-in fade-in duration-150">
                    <label className="block w-full">
                      <span className="block text-11 font-bold text-surface-500 mb-1">{copy.templateLabel}</span>
                      <div className="relative inline-flex items-center w-full">
                        <select value={formData.cert_email_template_id || ""} onChange={(e) => setFormData((curr) => ({ ...curr, cert_email_template_id: e.target.value ? Number(e.target.value) : null }))} className="w-full min-h-[38px] appearance-none rounded-xl border border-surface-200 bg-raised px-3 text-xs font-semibold outline-none cursor-pointer">
                          <option value="">{copy.templatePlaceholder}</option>
                          {customEmailTemplates.length > 0 && <optgroup label={copy.customTemplates}>{customEmailTemplates.map((t) => <option key={`custom-${t.id}`} value={t.id}>{t.name}</option>)}</optgroup>}
                          {systemEmailTemplates.length > 0 && <optgroup label={copy.systemTemplates}>{systemEmailTemplates.map((t) => <option key={`system-${t.id}`} value={t.id}>{t.name}</option>)}</optgroup>}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-surface-400" />
                      </div>
                    </label>

                    {availableEmailTemplates.length === 0 && <div className="rounded-xl border border-status-warning-border bg-status-warning-bg/20 p-3.5 text-xs font-semibold text-status-warning-content">{copy.noTemplates}</div>}

                    {formData.cert_email_template_id && (
                      <div className="rounded-xl border border-surface-100 bg-surface-50/50 p-3 text-xs flex items-center justify-between gap-3">
                        <div className="min-w-0"><p className="text-11 font-bold text-surface-400 uppercase tracking-wide">{copy.active}</p><p className="font-bold text-surface-900 mt-0.5 truncate">{availableEmailTemplates.find((t) => t.id === formData.cert_email_template_id)?.name}</p></div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs font-bold pt-1.5 border-t border-outline-subtle">
                  <Link href={`/admin/events/${eventId}/email-templates`} className="text-surface-900 hover:text-surface-900 underline underline-offset-2">{copy.manageTemplates}</Link>
                  <Link href={`/admin/events/${eventId}/bulk-emails`} className="text-surface-400 hover:text-surface-900 transition-colors font-medium">{copy.manageCampaigns}</Link>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 5: ETKİNLİK YORUM MODERASYON PANELİ */}
        {activeTab === "comments" && (
          <section className="rounded-2xl border border-surface-200 bg-raised p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3 border-b border-surface-100 pb-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-100 bg-surface-50 text-surface-500 shadow-sm">
                <MessageSquare className="h-4 w-4 stroke-[1.8]" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold tracking-tight text-surface-900">{copy.commentsTitle}</h2>
                <p className="text-xs text-surface-400 font-medium">{copy.commentsSubtitle}</p>
              </div>
            </div>

            {commentsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-surface-400 stroke-[2.5]" /></div>
            ) : comments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-200 py-12 text-center text-xs font-semibold text-surface-400 tracking-tight">{copy.commentsEmpty}</div>
            ) : (
              <div className="space-y-3.5 max-h-[560px] overflow-y-auto scrollbar-none pr-0.5 bg-raised">
                {comments.map((comment) => {
                  const commentSel = comment.status === "visible" ? "border-status-success-border bg-status-success-bg/10 text-status-success-content" : comment.status === "reported" ? "border-status-warning-border bg-status-warning-bg/10 text-status-warning-content" : "border-surface-100 bg-surface-50/40 text-surface-400";
                  return (
                    <article key={comment.id} className="rounded-xl border border-surface-100 bg-raised p-4 shadow-sm flex flex-col justify-between lg:flex-row lg:items-center gap-4 transition-colors hover:border-surface-200">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-surface-900 tracking-tight">{comment.member_name}</span>
                          <span className="text-11 font-medium text-surface-400 font-mono">{comment.member_email}</span>
                          <span className={`rounded-md border px-1.5 py-0.5 text-11 font-bold uppercase tracking-tight shadow-sm ${commentSel}`}>{comment.status}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-surface-700 font-medium whitespace-pre-wrap">{comment.body}</p>
                        <div className="pt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-11 font-bold text-surface-400 uppercase tracking-wider">
                          <span>{copy.commentsMember}: {comment.member_public_id}</span>
                          <span className={comment.report_count > 0 ? "text-status-danger-content" : ""}>{copy.commentsReported}: {comment.report_count}</span>
                          <span className="font-mono text-surface-300 font-medium lowercase">{new Date(comment.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end lg:self-auto w-full lg:w-auto">
                        <button type="button" onClick={() => void handleCommentStatusChange(comment.id, "visible")} disabled={commentsSavingId === comment.id || comment.status === "visible"} className="flex-1 lg:flex-initial inline-flex h-7 items-center justify-center rounded-lg border border-status-success-border bg-raised px-2.5 text-11 font-bold text-status-success-content shadow-sm hover:bg-status-success-bg disabled:opacity-20">
                          {commentsSavingId === comment.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />} <span>{copy.commentsPublish}</span>
                        </button>
                        <button type="button" onClick={() => void handleCommentStatusChange(comment.id, "hidden")} disabled={commentsSavingId === comment.id || comment.status === "hidden"} className="flex-1 lg:flex-initial inline-flex h-7 items-center justify-center rounded-lg border border-status-danger-border bg-raised px-2.5 text-11 font-bold text-status-danger-content shadow-sm hover:bg-status-danger-bg disabled:opacity-20">
                          {commentsSavingId === comment.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />} <span>{copy.commentsHide}</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

      </div>

      {/* SÜZÜLEN ALT ANA AKSİYON OPERASYON KONSOLU */}
      {(isDirty || saving) && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2.5 items-center w-full max-w-xs px-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-full bg-surface-900 px-6 font-bold text-white shadow-xl transition hover:bg-surface-800 active:scale-[0.98] disabled:opacity-50"
          title={`${copy.save} (Ctrl/⌘ + S)`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 stroke-[2.5]" />}
          <span className="text-xs">{saving ? copy.saving : copy.save}</span>
        </button>
      </div>}

    </div>
  );
}
