"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  Bot,
  CalendarDays,
  Check,
  Database,
  ExternalLink,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  LogOut,
  MessageSquare,
  Plug,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Wifi,
  WifiOff,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import {
  getGoogleSheetsConnectionStatus,
  getEnterpriseIntegrations,
  getIntegrationCatalog,
  getMicrosoftExcelConnectionStatus,
  getNotificationIntegrations,
  getReservationGoogleCalendarStatus,
  removeNotificationChannel,
  startGoogleSheetsOAuth,
  startMicrosoftExcelOAuth,
  startReservationGoogleCalendarOAuth,
  syncReservationGoogleCalendar,
  testNotificationChannel,
  testProviderConfig,
  updateEnterpriseIntegrations,
  updateNotificationIntegrations,
  type EnterpriseIntegrationsConfig,
  type GenericProviderConfig,
  type GenericProviderKey,
  type GoogleCalendarReservationStatus,
  type GoogleSheetsConnectionStatus,
  type IntegrationCatalogItem,
  type MicrosoftExcelConnectionStatus,
  type NotificationIntegrationsConfig,
  type NotificationWebhookChannel,
  type OidcSsoConfig,
  type WebinarImportConfig,
} from "@/lib/api";
import { apiFetch } from "@/lib/api";
import { useI18n, type TranslationKey, type Translator } from "@/lib/i18n";
import PageHeader from "@/components/Admin/PageHeader";
import { StatCard } from "@/components/Admin/StatCard";

type MyOAuthConnection = {
  client_id:    string;
  name:         string;
  logo_url:     string | null;
  scopes:       string[];
  connected_at: string;
};

type IntegrationStatus = "loading" | "connected" | "disconnected" | "not_configured" | "error";
type NotificationChannelKey = "slack" | "teams" | "discord" | "google_chat" | "custom";
type Feedback = { key: TranslationKey; vars?: Record<string, string | number> } | { message: string };

const channelCopy: Record<NotificationChannelKey, { name: string; placeholder: string; helpKey: TranslationKey }> = {
  slack: {
    name: "Slack",
    placeholder: "https://hooks.slack.com/services/...",
    helpKey: "admin_integrations_channel_help_slack",
  },
  teams: {
    name: "Microsoft Teams",
    placeholder: "https://...logic.azure.com/...",
    helpKey: "admin_integrations_channel_help_teams",
  },
  discord: {
    name: "Discord",
    placeholder: "https://discord.com/api/webhooks/...",
    helpKey: "admin_integrations_channel_help_discord",
  },
  google_chat: {
    name: "Google Chat",
    placeholder: "https://chat.googleapis.com/v1/spaces/.../messages?key=...",
    helpKey: "admin_integrations_channel_help_google_chat",
  },
  custom: {
    name: "Zapier / Make / Custom",
    placeholder: "https://hooks.zapier.com/hooks/catch/...",
    helpKey: "admin_integrations_channel_help_custom",
  },
};

const categoryIcons: Record<string, React.ElementType> = {
 "Data sync": FileSpreadsheet,
  Calendar: CalendarDays,
  Notifications: MessageSquare,
  Automation: Workflow,
  CRM: Database,
  Identity: ShieldCheck,
  Events: CalendarDays,
  Messaging: Bell,
  Marketing: Send,
 "Document storage": FileSpreadsheet,
  Analytics: Database,
  Learning: ShieldCheck,
  Accounting: Database,
};

const categoryKeys: Record<string, TranslationKey> = {
  "Data sync": "admin_integrations_category_data_sync",
  Calendar: "admin_integrations_category_calendar",
  Notifications: "admin_integrations_category_notifications",
  Automation: "admin_integrations_category_automation",
  CRM: "admin_integrations_category_crm",
  Identity: "admin_integrations_category_identity",
  Events: "admin_integrations_category_events",
  Messaging: "admin_integrations_category_messaging",
  Marketing: "admin_integrations_category_marketing",
  "Document storage": "admin_integrations_category_document_storage",
  Analytics: "admin_integrations_category_analytics",
  Learning: "admin_integrations_category_learning",
  Accounting: "admin_integrations_category_accounting",
};

const catalogDescriptionKeys: Partial<Record<string, TranslationKey>> = {
  google_sheets: "admin_integrations_catalog_desc_google_sheets",
  microsoft_excel: "admin_integrations_catalog_desc_microsoft_excel",
  google_calendar: "admin_integrations_catalog_desc_google_calendar",
  slack: "admin_integrations_catalog_desc_slack",
  microsoft_teams: "admin_integrations_catalog_desc_microsoft_teams",
  discord: "admin_integrations_catalog_desc_discord",
  google_chat: "admin_integrations_catalog_desc_google_chat",
  zapier: "admin_integrations_catalog_desc_zapier",
  make: "admin_integrations_catalog_desc_make",
  hubspot: "admin_integrations_catalog_desc_hubspot",
  salesforce: "admin_integrations_catalog_desc_salesforce",
  sso_saml_oidc: "admin_integrations_catalog_desc_sso",
  scim: "admin_integrations_catalog_desc_scim",
  zoom_teams_webinar: "admin_integrations_catalog_desc_webinar",
  whatsapp_sms: "admin_integrations_catalog_desc_whatsapp",
  mailchimp_brevo: "admin_integrations_catalog_desc_marketing",
  drive_sharepoint_archive: "admin_integrations_catalog_desc_archive",
  power_bi_looker: "admin_integrations_catalog_desc_analytics",
  lms: "admin_integrations_catalog_desc_lms",
  accounting_tr: "admin_integrations_catalog_desc_accounting",
};

const connectTypeKeys: Partial<Record<string, TranslationKey>> = {
  oauth: "admin_integrations_connect_oauth",
  webhook: "admin_integrations_connect_webhook",
  private_app_token: "admin_integrations_connect_private_token",
  sso: "admin_integrations_connect_sso",
  scim: "admin_integrations_connect_scim",
  provider_credentials: "admin_integrations_connect_provider_credentials",
  api_key: "admin_integrations_connect_api_key",
  data_export: "admin_integrations_connect_data_export",
};

const providerDefaults: Record<
  GenericProviderKey,
  {
    name: string;
    provider: string;
    auth_type: GenericProviderConfig["auth_type"];
    base_url: string;
    primaryId: keyof GenericProviderConfig;
    placeholderKey: TranslationKey;
    purposeKey: TranslationKey;
  }
> = {
  salesforce: {
    name: "Salesforce",
    provider: "salesforce",
    auth_type: "bearer_token",
    base_url: "https://your-instance.my.salesforce.com/services/data/v60.0",
    primaryId: "account_id",
    placeholderKey: "admin_integrations_placeholder_salesforce_account",
    purposeKey: "admin_integrations_provider_purpose_salesforce",
  },
  mailchimp_brevo: {
    name: "Mailchimp / Brevo",
    provider: "mailchimp",
    auth_type: "api_key",
    base_url: "https://api.mailchimp.com/3.0",
    primaryId: "list_id",
    placeholderKey: "admin_integrations_placeholder_audience_list",
    purposeKey: "admin_integrations_provider_purpose_marketing",
  },
  whatsapp_sms: {
    name: "WhatsApp Business / SMS",
    provider: "twilio",
    auth_type: "api_key",
    base_url: "https://api.twilio.com/2010-04-01",
    primaryId: "account_id",
    placeholderKey: "admin_integrations_placeholder_messaging_account",
    purposeKey: "admin_integrations_provider_purpose_messaging",
  },
  drive_sharepoint_archive: {
    name: "Drive / SharePoint Archive",
    provider: "sharepoint",
    auth_type: "oauth",
    base_url: "https://graph.microsoft.com/v1.0",
    primaryId: "folder_id",
    placeholderKey: "admin_integrations_placeholder_folder_id",
    purposeKey: "admin_integrations_provider_purpose_archive",
  },
  power_bi_looker: {
    name: "Power BI / Looker Studio",
    provider: "power_bi",
    auth_type: "bearer_token",
    base_url: "https://api.powerbi.com/v1.0/myorg",
    primaryId: "report_id",
    placeholderKey: "admin_integrations_placeholder_report_id",
    purposeKey: "admin_integrations_provider_purpose_analytics",
  },
  lms: {
    name: "Moodle / Canvas LMS",
    provider: "moodle",
    auth_type: "api_key",
    base_url: "https://lms.example.com",
    primaryId: "course_id",
    placeholderKey: "admin_integrations_placeholder_course_id",
    purposeKey: "admin_integrations_provider_purpose_lms",
  },
  accounting_tr: {
    name: "Logo / Parasut / Mikro",
    provider: "parasut",
    auth_type: "api_key",
    base_url: "https://api.parasut.com",
    primaryId: "account_id",
    placeholderKey: "admin_integrations_placeholder_company_account",
    purposeKey: "admin_integrations_provider_purpose_accounting",
  },
};

const providerKeys = Object.keys(providerDefaults) as GenericProviderKey[];

function emptyProviderConfig(key: GenericProviderKey): GenericProviderConfig {
  const defaults = providerDefaults[key];
  return {
    enabled: false,
    provider: defaults.provider,
    auth_type: defaults.auth_type,
    base_url: defaults.base_url,
    api_key: "",
    access_token: "",
    client_id: "",
    client_secret: "",
    account_id: "",
    list_id: "",
    folder_id: "",
    report_id: "",
    course_id: "",
    field_mapping: {},
    notes: "",
  };
}

function statusBadge(status: IntegrationStatus | string, t: Translator) {
  const labels: Record<string, TranslationKey> = {
    loading: "admin_integrations_status_loading",
    connected: "admin_integrations_status_connected",
    disconnected: "admin_integrations_status_disconnected",
    not_configured: "admin_integrations_status_not_configured",
    available: "admin_integrations_status_available",
    planned: "admin_integrations_status_planned",
    error: "admin_integrations_status_error",
  };
  const color =
    status === "connected"
      ? "border-status-success-border bg-status-success-bg text-status-success-content"
      : status === "planned"
        ? "border-surface-200 bg-surface-50 text-surface-500"
        : status === "not_configured" || status === "disconnected"
          ? "border-status-warning-border bg-status-warning-bg text-status-warning-content"
          : status === "error"
            ? "border-status-danger-border bg-status-danger-bg text-status-danger-content"
            : "border-brand-100 bg-brand-50 text-brand-700";
  const Icon = status === "connected" ? Wifi : status === "loading" ? Loader2 : WifiOff;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      <Icon className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`} />
      {labels[status] ? t(labels[status]) : status}
    </span>
  );
}

function getStatus(status: { configured: boolean; connected: boolean } | null): IntegrationStatus {
  if (!status) return "error";
  if (!status.configured) return "not_configured";
  return status.connected ? "connected" : "disconnected";
}

function OauthCard({
  icon: Icon,
  name,
  description,
  status,
  connectedAs,
  onConnect,
  onSync,
  settingsHref,
  connecting,
  syncing,
  t,
}: {
  icon: React.ElementType;
  name: string;
  description: string;
  status: IntegrationStatus;
  connectedAs?: string | null;
  onConnect?: () => void;
  onSync?: () => void;
  settingsHref?: string;
  connecting: boolean;
  syncing?: boolean;
  t: Translator;
}) {
  return (
    <div className={`card p-5 ${status === "connected" ? "ring-1 ring-status-success-border" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-surface-200 bg-raised text-surface-700">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-surface-900">{name}</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-surface-500">{description}</p>
          </div>
        </div>
        {statusBadge(status, t)}
      </div>

      {connectedAs && (
        <p className="mt-3 rounded-lg border border-status-success-border bg-status-success-bg px-3 py-2 text-xs font-semibold text-status-success-content">
          <Check className="mr-1 inline h-3.5 w-3.5" />
          {t("admin_integrations_connected_as", { account: connectedAs })}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {status === "disconnected" && onConnect && (
          <button type="button" onClick={onConnect} disabled={connecting} className="btn-primary px-3 py-2 text-xs">
            {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
            {t("admin_integrations_connect")}
          </button>
        )}
        {status === "connected" && onSync && (
          <button type="button" onClick={onSync} disabled={syncing} className="btn-secondary px-3 py-2 text-xs">
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {t("admin_integrations_sync")}
          </button>
        )}
        {settingsHref && (
          <Link href={settingsHref} className="btn-secondary px-3 py-2 text-xs">
            <ExternalLink className="h-3.5 w-3.5" />
            {t("admin_integrations_settings")}
          </Link>
        )}
      </div>
    </div>
  );
}

function CatalogCard({ item, t }: { item: IntegrationCatalogItem; t: Translator }) {
  const Icon = categoryIcons[item.category] || Plug;
  const categoryKey = categoryKeys[item.category];
  const descriptionKey = catalogDescriptionKeys[item.key];
  const connectTypeKey = connectTypeKeys[item.connect_type];
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-raised text-surface-700">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-surface-900">{item.name}</h3>
              <span className="rounded-full bg-surface-100 px-2 py-0.5 text-11 font-semibold text-surface-500">{categoryKey ? t(categoryKey) : item.category}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-surface-500">{descriptionKey ? t(descriptionKey) : item.description}</p>
          </div>
        </div>
        {statusBadge(item.status, t)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md border border-surface-200 bg-surface-50 px-2 py-1 font-semibold text-surface-600">{connectTypeKey ? t(connectTypeKey) : item.connect_type}</span>
        {item.settings_href && (
          <Link href={item.settings_href} className="font-semibold text-brand-700 hover:underline">
            {t("admin_integrations_settings")}
          </Link>
        )}
        {item.docs_url && (
          <a href={item.docs_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-surface-600 hover:text-brand-700">
            {t("admin_integrations_docs")} <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {item.setup_url && (
          <a href={item.setup_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-surface-600 hover:text-brand-700">
            {t("admin_integrations_app_setup")} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function AdminIntegrationsPage() {
  const { t } = useI18n();

  const [sheetsStatus, setSheetsStatus] = useState<GoogleSheetsConnectionStatus | null>(null);
  const [excelStatus, setExcelStatus] = useState<MicrosoftExcelConnectionStatus | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarReservationStatus | null>(null);
  const [catalog, setCatalog] = useState<IntegrationCatalogItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationIntegrationsConfig | null>(null);
  const [enterpriseConfig, setEnterpriseConfig] = useState<EnterpriseIntegrationsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Feedback | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [channel, setChannel] = useState<NotificationChannelKey>("slack");
  const [form, setForm] = useState<NotificationWebhookChannel>({ url: "", events: ["attendee.registered", "cert.issued"], enabled: true, secret: "" });
  const [oidcForm, setOidcForm] = useState<OidcSsoConfig>({ enabled: false, issuer_url: "", client_id: "", client_secret: "", allowed_domains: [] });
  const [webinarForm, setWebinarForm] = useState<WebinarImportConfig>({ enabled: false, provider: "zoom", account_id: "", client_id: "", client_secret: "" });
  const [oidcDomainsText, setOidcDomainsText] = useState("");
  const [providerForms, setProviderForms] = useState<Record<GenericProviderKey, GenericProviderConfig>>(() =>
    providerKeys.reduce((acc, key) => ({ ...acc, [key]: emptyProviderConfig(key) }), {} as Record<GenericProviderKey, GenericProviderConfig>),
  );
  const [myConnections, setMyConnections]       = useState<MyOAuthConnection[]>([]);
  const [disconnecting, setDisconnecting]       = useState<string | null>(null);

  const loadMyConnections = async () => {
    try {
      const res = await apiFetch<Response>("/admin/me/oauth-connections");
      const data = await res.json() as MyOAuthConnection[];
      setMyConnections(data);
    } catch { /* ignore */ }
  };

  const handleDisconnect = async (clientId: string) => {
    setDisconnecting(clientId);
    try {
      await apiFetch(`/oauth/disconnect/${clientId}`, { method: "DELETE" });
      await loadMyConnections();
    } catch { /* ignore */ } finally {
      setDisconnecting(null);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const [s, e, c, cat, notif, enterprise] = await Promise.all([
        getGoogleSheetsConnectionStatus().catch(() => null),
        getMicrosoftExcelConnectionStatus().catch(() => null),
        getReservationGoogleCalendarStatus().catch(() => null),
        getIntegrationCatalog().catch(() => ({ items: [], supported_events: [] })),
        getNotificationIntegrations().catch(() => null),
        getEnterpriseIntegrations().catch(() => null),
      ]);
      setSheetsStatus(s);
      setExcelStatus(e);
      setCalendarStatus(c);
      setCatalog(cat.items || []);
      setNotifications(notif);
      setEnterpriseConfig(enterprise);
      setError(null);
    } catch (ex: any) {
      setError(ex?.message ? { message: ex.message } : { key: "admin_integrations_load_error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void loadMyConnections();
  }, []);

  useEffect(() => {
    const existing = notifications?.[channel];
    setForm({
      url: existing?.url || "",
      events: existing?.events?.length ? existing.events : ["attendee.registered", "cert.issued"],
      enabled: existing?.enabled ?? true,
      secret: existing?.secret || "",
    });
  }, [channel, notifications]);

  useEffect(() => {
    const oidc = enterpriseConfig?.oidc;
    const webinar = enterpriseConfig?.webinar;
    setOidcForm(oidc || { enabled: false, issuer_url: "", client_id: "", client_secret: "", allowed_domains: [] });
    setOidcDomainsText((oidc?.allowed_domains || []).join(", "));
    setWebinarForm(webinar || { enabled: false, provider: "zoom", account_id: "", client_id: "", client_secret: "" });
    setProviderForms(
      providerKeys.reduce((acc, key) => {
        acc[key] = enterpriseConfig?.providers?.[key] || emptyProviderConfig(key);
        return acc;
      }, {} as Record<GenericProviderKey, GenericProviderConfig>),
    );
  }, [enterpriseConfig]);

  const groupedCatalog = useMemo(() => {
    return catalog.reduce<Record<string, IntegrationCatalogItem[]>>((acc, item) => {
      acc[item.category] = acc[item.category] || [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [catalog]);

  const connectedCount = catalog.filter(item => item.connected || item.status === "connected").length;
  const notifChannelsCount = (["slack", "teams", "discord", "google_chat", "custom"] as NotificationChannelKey[]).filter(key => notifications?.[key]).length;
  const supportedEvents = notifications?.supported_events?.filter(event => event !== "attendee.register") || ["attendee.registered", "cert.issued", "cert.bulk_completed", "checkin.completed", "crm.lead_score_changed"];

  const startOAuth = async (kind: "sheets" | "excel" | "calendar") => {
    setConnecting(kind);
    try {
      const result =
        kind === "sheets"
          ? await startGoogleSheetsOAuth("/admin/integrations")
          : kind === "excel"
            ? await startMicrosoftExcelOAuth("/admin/integrations")
            : await startReservationGoogleCalendarOAuth("/admin/integrations");
      window.location.href = result.authorization_url;
    } finally {
      setConnecting(null);
    }
  };

  const handleSaveNotification = async () => {
    if (!form.url.trim()) {
      setError({ key: "admin_integrations_webhook_required" });
      return;
    }
    setSaving(channel);
    try {
      await updateNotificationIntegrations({ [channel]: { ...form, url: form.url.trim(), secret: form.secret || null } });
      await load();
    } finally {
      setSaving(null);
    }
  };

  const handleTestNotification = async () => {
    setSaving(`test-${channel}`);
    try {
      await testNotificationChannel({ ...form, url: form.url.trim(), secret: form.secret || null });
    } finally {
      setSaving(null);
    }
  };

  const handleRemoveNotification = async () => {
    setSaving(`remove-${channel}`);
    try {
      await removeNotificationChannel(channel);
      await load();
    } finally {
      setSaving(null);
    }
  };

  const handleSyncCalendar = async () => {
    setSyncingCalendar(true);
    try {
      await syncReservationGoogleCalendar();
      await load();
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handleSaveOidc = async () => {
    setSaving("oidc");
    try {
      const allowed_domains = oidcDomainsText
        .split(",")
        .map(value => value.trim().toLowerCase())
        .filter(Boolean);
      await updateEnterpriseIntegrations({ oidc: { ...oidcForm, allowed_domains } });
      await load();
    } finally {
      setSaving(null);
    }
  };

  const handleSaveWebinar = async () => {
    setSaving("webinar");
    try {
      await updateEnterpriseIntegrations({ webinar: webinarForm });
      await load();
    } finally {
      setSaving(null);
    }
  };

  const updateProviderForm = (key: GenericProviderKey, patch: Partial<GenericProviderConfig>) => {
    setProviderForms(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const handleSaveProvider = async (key: GenericProviderKey) => {
    setSaving(key);
    try {
      await updateEnterpriseIntegrations({ providers: { [key]: providerForms[key] } });
      await load();
    } finally {
      setSaving(null);
    }
  };

  const handleTestProvider = async (key: GenericProviderKey) => {
    setSaving(`test-${key}`);
    try {
      await testProviderConfig(key);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Plug />}
        title={t("admin_integrations_title")}
        subtitle={t("admin_integrations_subtitle")}
        actions={
          <button type="button" onClick={() => void load()} disabled={loading} className="btn-secondary">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("admin_integrations_refresh")}
          </button>
        }
      />

      {error && (
        <div className="error-banner flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {"key" in error ? t(error.key, error.vars) : error.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <StatCard
          label={t("admin_integrations_active_connections")}
          value={loading ? "—" : connectedCount}
          icon={<Wifi />}
          iconBg="bg-status-success-bg text-status-success-content border border-status-success-border"
          delay={0}
        />
        <StatCard
          label={t("admin_integrations_total_connectors")}
          value={loading ? "—" : catalog.length}
          icon={<Plug />}
          delay={0.05}
        />
        <StatCard
          label={t("admin_integrations_categories")}
          value={loading ? "—" : Object.keys(groupedCatalog).length}
          icon={<Database />}
          delay={0.1}
        />
        <StatCard
          label={t("admin_integrations_notification_channels")}
          value={loading ? "—" : notifChannelsCount}
          icon={<Bell />}
          delay={0.15}
        />
      </div>

      <div className="warning-banner">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">{t("admin_integrations_credential_security")}</p>
          <p className="mt-1 text-xs leading-relaxed">
            {t("admin_integrations_credential_security_desc")}
          </p>
        </div>
      </div>

      {myConnections.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-label">
            {t("admin_integrations_connected_assistants")}
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {myConnections.map((conn) => (
              <div key={conn.client_id} className="card flex items-start justify-between gap-4 p-4 ring-1 ring-status-success-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-surface-200 bg-raised text-surface-700">
                    {conn.logo_url
                      ? <img src={conn.logo_url} alt={conn.name} className="h-7 w-7 rounded object-contain" />
                      : <Bot className="h-5 w-5" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-bold text-surface-900">{conn.name}</p>
                    <p className="mt-0.5 font-mono text-10 text-surface-400">{conn.client_id}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {conn.scopes.map((s) => (
                        <span key={s} className="rounded-full border border-surface-200 bg-surface-50 px-2 py-0.5 text-10 text-surface-500">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDisconnect(conn.client_id)}
                  disabled={disconnecting === conn.client_id}
                  title={t("admin_integrations_disconnect")}
                  aria-label={t("admin_integrations_disconnect_named", { name: conn.name })}
                  className="shrink-0 rounded-lg border border-surface-200 p-2 text-surface-400 hover:border-status-danger-border hover:bg-status-danger-bg hover:text-status-danger-content disabled:opacity-40"
                >
                  {disconnecting === conn.client_id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <LogOut className="h-4 w-4" />
                  }
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="section-label">{t("admin_integrations_live_connectors")}</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <OauthCard
            icon={FileSpreadsheet}
            name="Google Sheets"
            description={t("admin_integrations_sheets_desc")}
            status={loading ? "loading" : getStatus(sheetsStatus)}
            connectedAs={sheetsStatus?.connected ? sheetsStatus.google_email : null}
            onConnect={() => void startOAuth("sheets")}
            connecting={connecting === "sheets"}
            settingsHref="/admin/events"
            t={t}
          />
          <OauthCard
            icon={FileSpreadsheet}
            name="Microsoft Excel"
            description={t("admin_integrations_excel_desc")}
            status={loading ? "loading" : getStatus(excelStatus)}
            connectedAs={excelStatus?.connected ? excelStatus.microsoft_email : null}
            onConnect={() => void startOAuth("excel")}
            connecting={connecting === "excel"}
            settingsHref="/admin/events"
            t={t}
          />
          <OauthCard
            icon={CalendarDays}
            name="Google Calendar"
            description={t("admin_integrations_calendar_desc")}
            status={loading ? "loading" : getStatus(calendarStatus)}
            connectedAs={calendarStatus?.connected ? calendarStatus.google_email : null}
            onConnect={() => void startOAuth("calendar")}
            onSync={calendarStatus?.connected ? handleSyncCalendar : undefined}
            connecting={connecting === "calendar"}
            syncing={syncingCalendar}
            settingsHref="/admin/settings?tab=venues"
            t={t}
          />
        </div>
        {!loading && (getStatus(sheetsStatus) === "not_configured" || getStatus(excelStatus) === "not_configured") && (
          <div className="rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-xs leading-relaxed text-status-warning-content">
            <p className="font-bold text-status-warning-content">{t("admin_integrations_oauth_missing")}</p>
            <p className="mt-1">
              {t("admin_integrations_oauth_missing_desc")}
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="card p-4">
          <h2 className="text-sm font-bold text-surface-900">{t("admin_integrations_notification_channels")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-surface-500">
            {t("admin_integrations_notification_channels_desc")}
          </p>
          <div className="mt-4 grid gap-2">
            {(["slack", "teams", "discord", "google_chat", "custom"] as NotificationChannelKey[]).map(key => (
              <button
                key={key}
                type="button"
                onClick={() => setChannel(key)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm font-semibold ${channel === key ? "border-brand-200 bg-brand-50 text-brand-800" : "border-surface-200 bg-raised text-surface-700"}`}
              >
                <span>{channelCopy[key].name}</span>
                {notifications?.[key] ? <Check className="h-4 w-4 text-status-success-content" /> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-surface-900">{channelCopy[channel].name}</h2>
              <p className="mt-1 text-xs text-surface-500">{t(channelCopy[channel].helpKey)}</p>
            </div>
            {notifications?.[channel] ? statusBadge("connected", t) : statusBadge("available", t)}
          </div>

          <label className="mt-4 block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">{t("admin_integrations_webhook_url")}</span>
            <input
              className="input"
              value={form.url}
              onChange={event => setForm(prev => ({ ...prev, url: event.target.value }))}
              placeholder={channelCopy[channel].placeholder}
            />
          </label>

          <label className="mt-3 block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">{t("admin_integrations_secret")}</span>
            <input
              type="password"
              className="input"
              value={form.secret || ""}
              onChange={event => setForm(prev => ({ ...prev, secret: event.target.value }))}
              placeholder={t("admin_integrations_optional_secret")}
            />
          </label>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">{t("admin_integrations_events")}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {supportedEvents.map(eventName => (
                <label key={eventName} className="flex items-center gap-2 rounded-lg border border-surface-200 bg-raised px-3 py-2 text-xs font-semibold text-surface-700">
                  <input
                    type="checkbox"
                    checked={form.events.includes(eventName)}
                    onChange={event => setForm(prev => ({
                      ...prev,
                      events: event.target.checked ? Array.from(new Set([...prev.events, eventName])) : prev.events.filter(value => value !== eventName),
                    }))}
                  />
                  {eventName}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => void handleSaveNotification()} disabled={Boolean(saving)} className="btn-primary px-3 py-2 text-xs">
              {saving === channel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {t("admin_integrations_save")}
            </button>
            <button type="button" onClick={() => void handleTestNotification()} disabled={Boolean(saving) || !form.url} className="btn-secondary px-3 py-2 text-xs">
              {saving === `test-${channel}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {t("admin_integrations_test")}
            </button>
            {notifications?.[channel] && (
              <button type="button" onClick={() => void handleRemoveNotification()} disabled={Boolean(saving)} className="btn-secondary px-3 py-2 text-xs text-status-danger-content">
                {saving === `remove-${channel}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {t("admin_integrations_remove")}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-label">{t("admin_integrations_enterprise_setup")}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-raised text-surface-700">
                  <KeyRound className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-surface-900">OIDC SSO</h3>
                  <p className="mt-1 text-xs text-surface-500">
                    {t("admin_integrations_oidc_desc")}
                  </p>
                </div>
              </div>
              {statusBadge(oidcForm.enabled && oidcForm.issuer_url ? "connected" : "available", t)}
            </div>
            <div className="mt-4 grid gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-surface-700">
                <input type="checkbox" checked={oidcForm.enabled} onChange={event => setOidcForm(prev => ({ ...prev, enabled: event.target.checked }))} />
                {t("admin_integrations_sso_enabled")}
              </label>
              <input className="input" value={oidcForm.issuer_url} onChange={event => setOidcForm(prev => ({ ...prev, issuer_url: event.target.value }))} placeholder="https://login.microsoftonline.com/{tenant}/v2.0" />
              <input className="input" value={oidcForm.client_id} onChange={event => setOidcForm(prev => ({ ...prev, client_id: event.target.value }))} placeholder={t("admin_integrations_client_id")} />
              <input type="password" className="input" value={oidcForm.client_secret} onChange={event => setOidcForm(prev => ({ ...prev, client_secret: event.target.value }))} placeholder={t("admin_integrations_client_secret")} />
              <input className="input" value={oidcDomainsText} onChange={event => setOidcDomainsText(event.target.value)} placeholder="example.com, kurum.com" />
              <button type="button" onClick={() => void handleSaveOidc()} disabled={Boolean(saving)} className="btn-primary w-fit px-3 py-2 text-xs">
                {saving === "oidc" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {t("admin_integrations_save_sso")}
              </button>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-raised text-surface-700">
                  <CalendarDays className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-surface-900">Zoom / Teams Webinar</h3>
                  <p className="mt-1 text-xs text-surface-500">
                    {t("admin_integrations_webinar_desc")}
                  </p>
                </div>
              </div>
              {statusBadge(webinarForm.enabled && webinarForm.client_id ? "connected" : "available", t)}
            </div>
            <div className="mt-4 grid gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-surface-700">
                <input type="checkbox" checked={webinarForm.enabled} onChange={event => setWebinarForm(prev => ({ ...prev, enabled: event.target.checked }))} />
                {t("admin_integrations_import_enabled")}
              </label>
              <select className="input" value={webinarForm.provider} onChange={event => setWebinarForm(prev => ({ ...prev, provider: event.target.value as WebinarImportConfig["provider"] }))}>
                <option value="zoom">Zoom</option>
                <option value="microsoft_teams">Microsoft Teams</option>
              </select>
              <input className="input" value={webinarForm.account_id} onChange={event => setWebinarForm(prev => ({ ...prev, account_id: event.target.value }))} placeholder={webinarForm.provider === "zoom" ? t("admin_integrations_zoom_account_id") : t("admin_integrations_tenant_id")} />
              <input className="input" value={webinarForm.client_id} onChange={event => setWebinarForm(prev => ({ ...prev, client_id: event.target.value }))} placeholder={t("admin_integrations_client_id")} />
              <input type="password" className="input" value={webinarForm.client_secret} onChange={event => setWebinarForm(prev => ({ ...prev, client_secret: event.target.value }))} placeholder={t("admin_integrations_client_secret")} />
              <button type="button" onClick={() => void handleSaveWebinar()} disabled={Boolean(saving)} className="btn-primary w-fit px-3 py-2 text-xs">
                {saving === "webinar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {t("admin_integrations_save_webinar")}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-label">{t("admin_integrations_other_connectors")}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {providerKeys.map(key => {
            const cfg = providerForms[key];
            const def = providerDefaults[key];
            return (
              <div key={key} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-raised text-surface-700">
                      <Plug className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-surface-900">{def.name}</h3>
                      <p className="mt-1 text-xs text-surface-500">{t(def.purposeKey)}</p>
                    </div>
                  </div>
                  {statusBadge(cfg.enabled ? "connected" : "available", t)}
                </div>

                <div className="mt-4 grid gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-surface-700">
                    <input type="checkbox" checked={cfg.enabled} onChange={event => updateProviderForm(key, { enabled: event.target.checked })} />
                    {t("admin_integrations_enabled")}
                  </label>
                  <input className="input" value={cfg.base_url} onChange={event => updateProviderForm(key, { base_url: event.target.value })} placeholder={t("admin_integrations_base_api_url")} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input className="input" value={String(cfg[def.primaryId] || "")} onChange={event => updateProviderForm(key, { [def.primaryId]: event.target.value } as Partial<GenericProviderConfig>)} placeholder={t(def.placeholderKey)} />
                    <input className="input" value={cfg.client_id} onChange={event => updateProviderForm(key, { client_id: event.target.value })} placeholder={t("admin_integrations_client_id")} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input type="password" className="input" value={cfg.api_key} onChange={event => updateProviderForm(key, { api_key: event.target.value })} placeholder={t("admin_integrations_api_key")} />
                    <input type="password" className="input" value={cfg.access_token} onChange={event => updateProviderForm(key, { access_token: event.target.value })} placeholder={t("admin_integrations_access_token")} />
                  </div>
                  <input type="password" className="input" value={cfg.client_secret} onChange={event => updateProviderForm(key, { client_secret: event.target.value })} placeholder={t("admin_integrations_client_secret")} />
                  <textarea className="input min-h-[70px] py-2" value={cfg.notes} onChange={event => updateProviderForm(key, { notes: event.target.value })} placeholder={t("admin_integrations_notes_placeholder")} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void handleSaveProvider(key)} disabled={Boolean(saving)} className="btn-primary px-3 py-2 text-xs">
                    {saving === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {t("admin_integrations_save")}
                  </button>
                  <button type="button" onClick={() => void handleTestProvider(key)} disabled={Boolean(saving) || !cfg.enabled} className="btn-secondary px-3 py-2 text-xs">
                    {saving === `test-${key}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {t("admin_integrations_test")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="section-label">{t("admin_integrations_catalog_title")}</h2>
        {Object.entries(groupedCatalog).map(([category, items]) => (
          <div key={category} className="space-y-3">
            <h3 className="card-title">{categoryKeys[category] ? t(categoryKeys[category]) : category}</h3>
            <div className="grid gap-3 lg:grid-cols-2">
              {items.map(item => <CatalogCard key={item.key} item={item} t={t} />)}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
