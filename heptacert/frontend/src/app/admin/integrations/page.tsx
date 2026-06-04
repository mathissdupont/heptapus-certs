"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  CalendarDays,
  Check,
  Database,
  ExternalLink,
  FileSpreadsheet,
  KeyRound,
  Loader2,
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
import { useI18n } from "@/lib/i18n";

type IntegrationStatus = "loading" | "connected" | "disconnected" | "not_configured" | "error";
type NotificationChannelKey = "slack" | "teams" | "custom";

const channelCopy: Record<NotificationChannelKey, { name: string; placeholder: string; help: string }> = {
  slack: {
    name: "Slack",
    placeholder: "https://hooks.slack.com/services/...",
    help: "Slack Incoming Webhook URL for a selected channel.",
  },
  teams: {
    name: "Microsoft Teams",
    placeholder: "https://...logic.azure.com/...",
    help: "Teams Workflows webhook URL for posting operational cards.",
  },
  custom: {
    name: "Zapier / Make / Custom",
    placeholder: "https://hooks.zapier.com/hooks/catch/... or Make webhook URL",
    help: "Use this for Zapier Catch Hook, Make custom webhooks, or your own HTTPS endpoint.",
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

const providerDefaults: Record<
  GenericProviderKey,
  {
    name: string;
    provider: string;
    auth_type: GenericProviderConfig["auth_type"];
    base_url: string;
    primaryId: keyof GenericProviderConfig;
    placeholder: string;
    purposeTr: string;
    purposeEn: string;
  }
> = {
  salesforce: {
    name: "Salesforce",
    provider: "salesforce",
    auth_type: "bearer_token",
    base_url: "https://your-instance.my.salesforce.com/services/data/v60.0",
    primaryId: "account_id",
    placeholder: "Salesforce instance / account id",
    purposeTr: "Katılımcıları lead/contact olarak aktarır, sertifika durumunu CRM kaydına işler.",
    purposeEn: "Sync event participants and certificate status into Salesforce leads or contacts.",
  },
  mailchimp_brevo: {
    name: "Mailchimp / Brevo",
    provider: "mailchimp",
    auth_type: "api_key",
    base_url: "https://api.mailchimp.com/3.0",
    primaryId: "list_id",
    placeholder: "Audience/List ID",
    purposeTr: "Etkinlik segmentlerini mailing listelerine ve kampanya otomasyonlarına aktarır.",
    purposeEn: "Export event segments to mailing lists and campaign automation.",
  },
  whatsapp_sms: {
    name: "WhatsApp Business / SMS",
    provider: "twilio",
    auth_type: "api_key",
    base_url: "https://api.twilio.com/2010-04-01",
    primaryId: "account_id",
    placeholder: "Twilio SID or WhatsApp Business account",
    purposeTr: "Bilet, hatırlatma ve sertifika bildirimlerini SMS/WhatsApp kanalına taşır.",
    purposeEn: "Send ticket, reminder, and certificate notifications via SMS or WhatsApp.",
  },
  drive_sharepoint_archive: {
    name: "Drive / SharePoint Archive",
    provider: "sharepoint",
    auth_type: "oauth",
    base_url: "https://graph.microsoft.com/v1.0",
    primaryId: "folder_id",
    placeholder: "Drive/SharePoint folder ID",
    purposeTr: "Oluşturulan sertifikaları ve raporları kurum klasörlerine arşivler.",
    purposeEn: "Archive generated certificates and reports into organization folders.",
  },
  power_bi_looker: {
    name: "Power BI / Looker Studio",
    provider: "power_bi",
    auth_type: "bearer_token",
    base_url: "https://api.powerbi.com/v1.0/myorg",
    primaryId: "report_id",
    placeholder: "Workspace/Report/Dataset ID",
    purposeTr: "Etkinlik ve sertifika metriklerini yönetici dashboardlarına aktarır.",
    purposeEn: "Push event and certificate metrics into executive dashboards.",
  },
  lms: {
    name: "Moodle / Canvas LMS",
    provider: "moodle",
    auth_type: "api_key",
    base_url: "https://lms.example.com",
    primaryId: "course_id",
    placeholder: "Course ID",
    purposeTr: "Kurs tamamlama verisini sertifika uygunluğu ile eşleştirir.",
    purposeEn: "Match course completion data with certificate eligibility.",
  },
  accounting_tr: {
    name: "Logo / Parasut / Mikro",
    provider: "parasut",
    auth_type: "api_key",
    base_url: "https://api.parasut.com",
    primaryId: "account_id",
    placeholder: "Company/account ID",
    purposeTr: "Kurumsal ödeme, fatura ve cari referanslarını muhasebe sistemine bağlar.",
    purposeEn: "Link institutional payments, invoices, and billing references to your accounting system.",
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

function statusBadge(status: IntegrationStatus | string, lang: string) {
  const isTr = lang === "tr";
  const labels: Record<string, string> = {
    loading: isTr ? "Yukleniyor" : "Loading",
    connected: isTr ? "Bagli" : "Connected",
    disconnected: isTr ? "Bagli degil" : "Disconnected",
    not_configured: isTr ? "Yapilandirilmamis" : "Not configured",
    available: isTr ? "Hazir" : "Available",
    planned: isTr ? "Planlandi" : "Planned",
    error: isTr ? "Hata" : "Error",
  };
  const color =
    status === "connected"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "planned"
        ? "border-surface-200 bg-surface-50 text-surface-500"
        : status === "not_configured" || status === "disconnected"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : status === "error"
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-brand-100 bg-brand-50 text-brand-700";
  const Icon = status === "connected" ? Wifi : status === "loading" ? Loader2 : WifiOff;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      <Icon className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`} />
      {labels[status] || status}
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
  lang,
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
  lang: string;
}) {
  const isTr = lang === "tr";
  return (
    <div className={`card p-5 ${status === "connected" ? "ring-1 ring-emerald-100" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-700">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-surface-900">{name}</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-surface-500">{description}</p>
          </div>
        </div>
        {statusBadge(status, lang)}
      </div>

      {connectedAs && (
        <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          <Check className="mr-1 inline h-3.5 w-3.5" />
          {isTr ? "Bagli hesap:" : "Connected as:"} {connectedAs}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {status === "disconnected" && onConnect && (
          <button type="button" onClick={onConnect} disabled={connecting} className="btn-primary px-3 py-2 text-xs">
            {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
            {isTr ? "Baglan" : "Connect"}
          </button>
        )}
        {status === "connected" && onSync && (
          <button type="button" onClick={onSync} disabled={syncing} className="btn-secondary px-3 py-2 text-xs">
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {isTr ? "Senkronla" : "Sync"}
          </button>
        )}
        {settingsHref && (
          <Link href={settingsHref} className="btn-secondary px-3 py-2 text-xs">
            <ExternalLink className="h-3.5 w-3.5" />
            {isTr ? "Ayarlara git" : "Settings"}
          </Link>
        )}
      </div>
    </div>
  );
}

function CatalogCard({ item, lang }: { item: IntegrationCatalogItem; lang: string }) {
  const Icon = categoryIcons[item.category] || Plug;
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-white text-surface-700">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-surface-900">{item.name}</h3>
              <span className="rounded-full bg-surface-100 px-2 py-0.5 text-[11px] font-semibold text-surface-500">{item.category}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-surface-500">{item.description}</p>
          </div>
        </div>
        {statusBadge(item.status, lang)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md border border-surface-200 bg-surface-50 px-2 py-1 font-semibold text-surface-600">{item.connect_type}</span>
        {item.settings_href && (
          <Link href={item.settings_href} className="font-semibold text-brand-700 hover:underline">
            Settings
          </Link>
        )}
        {item.docs_url && (
          <a href={item.docs_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-surface-600 hover:text-brand-700">
            Docs <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {item.setup_url && (
          <a href={item.setup_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-surface-600 hover:text-brand-700">
            App setup <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {item.app_required && (
        <div className="mt-3 space-y-2 rounded-lg border border-surface-200 bg-surface-50 p-3 text-xs text-surface-600">
          <p className="font-bold text-surface-800">Provider app required: {item.app_provider || item.name}</p>
          {item.callback_urls.length > 0 && (
            <div>
              <p className="font-semibold text-surface-500">Callback URL</p>
              {item.callback_urls.map(url => (
                <code key={url} className="mt-1 block break-all rounded-md bg-white px-2 py-1 text-[11px] text-surface-700">{url}</code>
              ))}
            </div>
          )}
          {item.required_scopes.length > 0 && (
            <p><span className="font-semibold text-surface-500">Scopes:</span> {item.required_scopes.join(", ")}</p>
          )}
          {item.credential_fields.length > 0 && (
            <p><span className="font-semibold text-surface-500">Credentials:</span> {item.credential_fields.join(", ")}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminIntegrationsPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const [sheetsStatus, setSheetsStatus] = useState<GoogleSheetsConnectionStatus | null>(null);
  const [excelStatus, setExcelStatus] = useState<MicrosoftExcelConnectionStatus | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarReservationStatus | null>(null);
  const [catalog, setCatalog] = useState<IntegrationCatalogItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationIntegrationsConfig | null>(null);
  const [enterpriseConfig, setEnterpriseConfig] = useState<EnterpriseIntegrationsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setError(ex?.message || (isTr ? "Entegrasyonlar yuklenemedi." : "Failed to load integrations."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
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
      setError(isTr ? "Webhook URL gerekli." : "Webhook URL is required.");
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{isTr ? "Kurumsal baglantilar" : "Enterprise connections"}</p>
          <h1 className="mt-1.5 text-2xl font-black text-surface-900">{isTr ? "Entegrasyonlar" : "Integrations"}</h1>
          <p className="mt-1 max-w-2xl text-sm text-surface-500">
            {isTr
              ? "Sheets, Excel, Calendar, Slack, Teams, Zapier, Make, CRM, SSO ve diger kurumsal baglantilari buradan yonetin."
              : "Manage Sheets, Excel, Calendar, Slack, Teams, Zapier, Make, CRM, SSO, and other enterprise connections."}
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="btn-secondary">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {isTr ? "Yenile" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="error-banner flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="card flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Plug className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-surface-900">
            {connectedCount} / {catalog.length || 18} {isTr ? "baglanti aktif" : "connections active"}
          </p>
          <p className="text-xs text-surface-500">
            {isTr ? "Aktif bağlantıları yönetin, yeni entegrasyon ekleyin veya mevcut bağlantıları test edin." : "Manage active connections, add new integrations, or test existing ones."}
          </p>
        </div>
      </div>

      <div className="card border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-bold text-amber-900">{isTr ? "Credential guvenligi" : "Credential security"}</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
              {isTr
                ? "Secret, token ve API key alanları kaydedildikten sonra maskelenir. Alan boş veya ******** bırakılırsa mevcut değer korunur; yeni değer yazarsanız güncellenir."
                : "Secret, token, and API key fields are masked after saving. Leaving a field empty or as ******** keeps the current value; entering a new value replaces it."}
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-surface-400">{isTr ? "Canli baglantilar" : "Live connectors"}</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <OauthCard
            icon={FileSpreadsheet}
            name="Google Sheets"
            description={isTr ? "Etkinlik katılımcılarını ve segmentleri Sheets'e senkronla." : "Sync attendees and segments to Sheets."}
            status={loading ? "loading" : getStatus(sheetsStatus)}
            connectedAs={sheetsStatus?.connected ? sheetsStatus.google_email : null}
            onConnect={() => void startOAuth("sheets")}
            connecting={connecting === "sheets"}
            settingsHref="/admin/events"
            lang={lang}
          />
          <OauthCard
            icon={FileSpreadsheet}
            name="Microsoft Excel"
            description={isTr ? "OneDrive veya SharePoint workbook'una etkinlik verisi yaz." : "Write event data to OneDrive or SharePoint workbooks."}
            status={loading ? "loading" : getStatus(excelStatus)}
            connectedAs={excelStatus?.connected ? excelStatus.microsoft_email : null}
            onConnect={() => void startOAuth("excel")}
            connecting={connecting === "excel"}
            settingsHref="/admin/events"
            lang={lang}
          />
          <OauthCard
            icon={CalendarDays}
            name="Google Calendar"
            description={isTr ? "Salon rezervasyonlarını Calendar ile çift yönlü senkronla." : "Two-way sync venue reservations with Calendar."}
            status={loading ? "loading" : getStatus(calendarStatus)}
            connectedAs={calendarStatus?.connected ? calendarStatus.google_email : null}
            onConnect={() => void startOAuth("calendar")}
            onSync={calendarStatus?.connected ? handleSyncCalendar : undefined}
            connecting={connecting === "calendar"}
            syncing={syncingCalendar}
            settingsHref="/admin/settings?tab=venues"
            lang={lang}
          />
        </div>
        {!loading && (getStatus(sheetsStatus) === "not_configured" || getStatus(excelStatus) === "not_configured") && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
            <p className="font-bold text-amber-900">{isTr ? "OAuth kimlik bilgileri yapılandırılmamış" : "OAuth credentials not configured"}</p>
            <p className="mt-1">
              {isTr
                ? "Google entegrasyonları için backend .env dosyasına GOOGLE_OAUTH_CLIENT_ID ve GOOGLE_OAUTH_CLIENT_SECRET, Microsoft entegrasyonları için MS365_OAUTH_CLIENT_ID ve MS365_OAUTH_CLIENT_SECRET değerlerini ekleyin."
                : "To enable Google integrations, set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in the backend .env file. For Microsoft integrations, set MS365_OAUTH_CLIENT_ID and MS365_OAUTH_CLIENT_SECRET."}
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="card p-4">
          <h2 className="text-sm font-bold text-surface-900">{isTr ? "Bildirim kanallari" : "Notification channels"}</h2>
          <p className="mt-1 text-xs leading-relaxed text-surface-500">
            {isTr ? "Slack, Teams, Zapier, Make veya ozel webhook URL'lerine olay gonderin." : "Send events to Slack, Teams, Zapier, Make, or custom webhook URLs."}
          </p>
          <div className="mt-4 grid gap-2">
            {(["slack", "teams", "custom"] as NotificationChannelKey[]).map(key => (
              <button
                key={key}
                type="button"
                onClick={() => setChannel(key)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm font-semibold ${channel === key ? "border-brand-200 bg-brand-50 text-brand-800" : "border-surface-200 bg-white text-surface-700"}`}
              >
                <span>{channelCopy[key].name}</span>
                {notifications?.[key] ? <Check className="h-4 w-4 text-emerald-600" /> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-surface-900">{channelCopy[channel].name}</h2>
              <p className="mt-1 text-xs text-surface-500">{channelCopy[channel].help}</p>
            </div>
            {notifications?.[channel] ? statusBadge("connected", lang) : statusBadge("available", lang)}
          </div>

          <label className="mt-4 block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">Webhook URL</span>
            <input
              className="input"
              value={form.url}
              onChange={event => setForm(prev => ({ ...prev, url: event.target.value }))}
              placeholder={channelCopy[channel].placeholder}
            />
          </label>

          <label className="mt-3 block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">Secret</span>
            <input
              type="password"
              className="input"
              value={form.secret || ""}
              onChange={event => setForm(prev => ({ ...prev, secret: event.target.value }))}
              placeholder={isTr ? "Opsiyonel imza anahtari" : "Optional signature secret"}
            />
          </label>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">Events</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {supportedEvents.map(eventName => (
                <label key={eventName} className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs font-semibold text-surface-700">
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
              {isTr ? "Kaydet" : "Save"}
            </button>
            <button type="button" onClick={() => void handleTestNotification()} disabled={Boolean(saving) || !form.url} className="btn-secondary px-3 py-2 text-xs">
              {saving === `test-${channel}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Test
            </button>
            {notifications?.[channel] && (
              <button type="button" onClick={() => void handleRemoveNotification()} disabled={Boolean(saving)} className="btn-secondary px-3 py-2 text-xs text-rose-600">
                {saving === `remove-${channel}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {isTr ? "Kaldir" : "Remove"}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-surface-400">{isTr ? "Enterprise kurulum" : "Enterprise setup"}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-white text-surface-700">
                  <KeyRound className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-surface-900">OIDC SSO</h3>
                  <p className="mt-1 text-xs text-surface-500">
                    {isTr ? "Entra ID, Okta veya Google Workspace icin OIDC ayarlarini saklayin." : "Store OIDC settings for Entra ID, Okta, or Google Workspace."}
                  </p>
                </div>
              </div>
              {statusBadge(oidcForm.enabled && oidcForm.issuer_url ? "connected" : "available", lang)}
            </div>
            <div className="mt-4 grid gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-surface-700">
                <input type="checkbox" checked={oidcForm.enabled} onChange={event => setOidcForm(prev => ({ ...prev, enabled: event.target.checked }))} />
                {isTr ? "SSO aktif" : "SSO enabled"}
              </label>
              <input className="input" value={oidcForm.issuer_url} onChange={event => setOidcForm(prev => ({ ...prev, issuer_url: event.target.value }))} placeholder="https://login.microsoftonline.com/{tenant}/v2.0" />
              <input className="input" value={oidcForm.client_id} onChange={event => setOidcForm(prev => ({ ...prev, client_id: event.target.value }))} placeholder="Client ID" />
              <input type="password" className="input" value={oidcForm.client_secret} onChange={event => setOidcForm(prev => ({ ...prev, client_secret: event.target.value }))} placeholder="Client secret" />
              <input className="input" value={oidcDomainsText} onChange={event => setOidcDomainsText(event.target.value)} placeholder="example.com, kurum.com" />
              <button type="button" onClick={() => void handleSaveOidc()} disabled={Boolean(saving)} className="btn-primary w-fit px-3 py-2 text-xs">
                {saving === "oidc" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {isTr ? "SSO ayarlarini kaydet" : "Save SSO settings"}
              </button>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-white text-surface-700">
                  <CalendarDays className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-surface-900">Zoom / Teams Webinar</h3>
                  <p className="mt-1 text-xs text-surface-500">
                    {isTr ? "Webinar katilim verisini sertifika uygunluguna baglamak icin credential saklayin." : "Store credentials for importing webinar attendance into certificate eligibility."}
                  </p>
                </div>
              </div>
              {statusBadge(webinarForm.enabled && webinarForm.client_id ? "connected" : "available", lang)}
            </div>
            <div className="mt-4 grid gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-surface-700">
                <input type="checkbox" checked={webinarForm.enabled} onChange={event => setWebinarForm(prev => ({ ...prev, enabled: event.target.checked }))} />
                {isTr ? "Import aktif" : "Import enabled"}
              </label>
              <select className="input" value={webinarForm.provider} onChange={event => setWebinarForm(prev => ({ ...prev, provider: event.target.value as WebinarImportConfig["provider"] }))}>
                <option value="zoom">Zoom</option>
                <option value="microsoft_teams">Microsoft Teams</option>
              </select>
              <input className="input" value={webinarForm.account_id} onChange={event => setWebinarForm(prev => ({ ...prev, account_id: event.target.value }))} placeholder={webinarForm.provider === "zoom" ? "Zoom account ID" : "Tenant ID"} />
              <input className="input" value={webinarForm.client_id} onChange={event => setWebinarForm(prev => ({ ...prev, client_id: event.target.value }))} placeholder="Client ID" />
              <input type="password" className="input" value={webinarForm.client_secret} onChange={event => setWebinarForm(prev => ({ ...prev, client_secret: event.target.value }))} placeholder="Client secret" />
              <button type="button" onClick={() => void handleSaveWebinar()} disabled={Boolean(saving)} className="btn-primary w-fit px-3 py-2 text-xs">
                {saving === "webinar" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {isTr ? "Webinar ayarlarini kaydet" : "Save webinar settings"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-surface-400">{isTr ? "Tum diger connectorlar" : "All remaining connectors"}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {providerKeys.map(key => {
            const cfg = providerForms[key];
            const def = providerDefaults[key];
            return (
              <div key={key} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-white text-surface-700">
                      <Plug className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-surface-900">{def.name}</h3>
                      <p className="mt-1 text-xs text-surface-500">{isTr ? def.purposeTr : def.purposeEn}</p>
                    </div>
                  </div>
                  {statusBadge(cfg.enabled ? "connected" : "available", lang)}
                </div>

                <div className="mt-4 grid gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-surface-700">
                    <input type="checkbox" checked={cfg.enabled} onChange={event => updateProviderForm(key, { enabled: event.target.checked })} />
                    {isTr ? "Aktif" : "Enabled"}
                  </label>
                  <input className="input" value={cfg.base_url} onChange={event => updateProviderForm(key, { base_url: event.target.value })} placeholder="Base API URL" />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input className="input" value={String(cfg[def.primaryId] || "")} onChange={event => updateProviderForm(key, { [def.primaryId]: event.target.value } as Partial<GenericProviderConfig>)} placeholder={def.placeholder} />
                    <input className="input" value={cfg.client_id} onChange={event => updateProviderForm(key, { client_id: event.target.value })} placeholder="Client ID" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input type="password" className="input" value={cfg.api_key} onChange={event => updateProviderForm(key, { api_key: event.target.value })} placeholder="API key" />
                    <input type="password" className="input" value={cfg.access_token} onChange={event => updateProviderForm(key, { access_token: event.target.value })} placeholder="Access token" />
                  </div>
                  <input type="password" className="input" value={cfg.client_secret} onChange={event => updateProviderForm(key, { client_secret: event.target.value })} placeholder="Client secret" />
                  <textarea className="input min-h-[70px] py-2" value={cfg.notes} onChange={event => updateProviderForm(key, { notes: event.target.value })} placeholder={isTr ? "Notlar, mapping detaylari, ortam bilgisi" : "Notes, mapping details, environment info"} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void handleSaveProvider(key)} disabled={Boolean(saving)} className="btn-primary px-3 py-2 text-xs">
                    {saving === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {isTr ? "Kaydet" : "Save"}
                  </button>
                  <button type="button" onClick={() => void handleTestProvider(key)} disabled={Boolean(saving) || !cfg.enabled} className="btn-secondary px-3 py-2 text-xs">
                    {saving === `test-${key}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Test
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-surface-400">{isTr ? "Kurumsal entegrasyon katalogu" : "Enterprise integration catalog"}</h2>
        {Object.entries(groupedCatalog).map(([category, items]) => (
          <div key={category} className="space-y-3">
            <h3 className="text-sm font-black text-surface-900">{category}</h3>
            <div className="grid gap-3 lg:grid-cols-2">
              {items.map(item => <CatalogCard key={item.key} item={item} lang={lang} />)}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
