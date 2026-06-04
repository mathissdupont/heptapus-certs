"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Unplug,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import {
  getGoogleSheetsConnectionStatus,
  getMicrosoftExcelConnectionStatus,
  getReservationGoogleCalendarStatus,
  startGoogleSheetsOAuth,
  startMicrosoftExcelOAuth,
  startReservationGoogleCalendarOAuth,
  syncReservationGoogleCalendar,
  type GoogleCalendarReservationStatus,
  type GoogleSheetsConnectionStatus,
  type MicrosoftExcelConnectionStatus,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type IntegrationStatus = "loading" | "connected" | "disconnected" | "not_configured" | "error";

function statusBadge(status: IntegrationStatus, lang: string) {
  const map: Record<IntegrationStatus, { label: string; labelEn: string; color: string; icon: React.ElementType }> = {
    loading:        { label: "Yükleniyor",     labelEn: "Loading",        color: "bg-surface-100 text-surface-500", icon: Loader2 },
    connected:      { label: "Bağlı",          labelEn: "Connected",      color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Wifi },
    disconnected:   { label: "Bağlı değil",   labelEn: "Disconnected",   color: "bg-amber-50 text-amber-700 border-amber-200", icon: WifiOff },
    not_configured: { label: "Yapılandırılmamış", labelEn: "Not configured", color: "bg-surface-100 text-surface-500", icon: AlertCircle },
    error:          { label: "Hata",           labelEn: "Error",          color: "bg-rose-50 text-rose-700 border-rose-200", icon: AlertCircle },
  };
  const cfg = map[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
      <Icon className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`} />
      {lang === "tr" ? cfg.label : cfg.labelEn}
    </span>
  );
}

function IntegrationCard({
  icon,
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
  const Icon = icon;
  const isTr = lang === "tr";

  return (
    <div className={`card overflow-hidden transition-shadow ${status === "connected" ? "ring-1 ring-emerald-100" : ""}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
              status === "connected" ? "border-emerald-100 bg-emerald-50 text-emerald-600" :
              status === "not_configured" ? "border-surface-200 bg-surface-50 text-surface-400" :
              "border-surface-200 bg-white text-surface-600"
            }`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-surface-900">{name}</h3>
              <p className="mt-0.5 text-xs text-surface-500">{description}</p>
            </div>
          </div>
          {statusBadge(status, lang)}
        </div>

        {connectedAs && (
          <p className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <Check className="mr-1.5 inline h-3.5 w-3.5" />
            {isTr ? "Bağlı hesap:" : "Connected as:"} {connectedAs}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {status === "not_configured" && (
            <p className="text-xs text-surface-400">
              {isTr ? "Bu entegrasyon için OAuth credentials henüz yapılandırılmamış." : "OAuth credentials are not configured for this integration."}
            </p>
          )}
          {status === "disconnected" && onConnect && (
            <button
              type="button"
              onClick={onConnect}
              disabled={connecting}
              className="btn-primary px-3 py-2 text-xs"
            >
              {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
              {isTr ? "Bağlan" : "Connect"}
            </button>
          )}
          {status === "connected" && onSync && (
            <button
              type="button"
              onClick={onSync}
              disabled={syncing}
              className="btn-secondary px-3 py-2 text-xs"
            >
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {isTr ? "Şimdi senkronla" : "Sync now"}
            </button>
          )}
          {settingsHref && (
            <Link href={settingsHref} className="btn-secondary px-3 py-2 text-xs">
              <ExternalLink className="h-3.5 w-3.5" />
              {isTr ? "Ayarlara git" : "Go to settings"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminIntegrationsPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const [sheetsStatus, setSheetsStatus] = useState<GoogleSheetsConnectionStatus | null>(null);
  const [excelStatus, setExcelStatus] = useState<MicrosoftExcelConnectionStatus | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarReservationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingSheets, setConnectingSheets] = useState(false);
  const [connectingExcel, setConnectingExcel] = useState(false);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [s, e, c] = await Promise.all([
        getGoogleSheetsConnectionStatus().catch(() => null),
        getMicrosoftExcelConnectionStatus().catch(() => null),
        getReservationGoogleCalendarStatus().catch(() => null),
      ]);
      setSheetsStatus(s);
      setExcelStatus(e);
      setCalendarStatus(c);
      setError(null);
    } catch (ex: any) {
      setError(ex?.message || (isTr ? "Entegrasyon durumları yüklenemedi." : "Failed to load integration statuses."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const getStatus = (status: { configured: boolean; connected: boolean } | null): IntegrationStatus => {
    if (!status) return "error";
    if (!status.configured) return "not_configured";
    return status.connected ? "connected" : "disconnected";
  };

  const handleConnectSheets = async () => {
    setConnectingSheets(true);
    try {
      const { authorization_url } = await startGoogleSheetsOAuth("/admin/integrations");
      window.location.href = authorization_url;
    } catch { setConnectingSheets(false); }
  };

  const handleConnectExcel = async () => {
    setConnectingExcel(true);
    try {
      const { authorization_url } = await startMicrosoftExcelOAuth("/admin/integrations");
      window.location.href = authorization_url;
    } catch { setConnectingExcel(false); }
  };

  const handleConnectCalendar = async () => {
    setConnectingCalendar(true);
    try {
      const { authorization_url } = await startReservationGoogleCalendarOAuth("/admin/integrations");
      window.location.href = authorization_url;
    } catch { setConnectingCalendar(false); }
  };

  const handleSyncCalendar = async () => {
    setSyncingCalendar(true);
    try {
      await syncReservationGoogleCalendar();
    } finally {
      setSyncingCalendar(false);
      await load();
    }
  };

  const connectedCount = [sheetsStatus?.connected, excelStatus?.connected, calendarStatus?.connected].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
            {isTr ? "Dış Sistemler" : "Integrations"}
          </p>
          <h1 className="mt-1.5 text-2xl font-black text-surface-900">
            {isTr ? "Entegrasyonlar" : "Integrations"}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-surface-500">
            {isTr
              ? "Google Sheets, Microsoft Excel ve Google Calendar bağlantılarını buradan yönetin."
              : "Manage Google Sheets, Microsoft Excel, and Google Calendar connections."}
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

      {/* Summary */}
      {!loading && (
        <div className="card flex items-center gap-4 p-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${connectedCount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-surface-100 text-surface-400"}`}>
            <Wifi className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-surface-900">
              {connectedCount} / 3 {isTr ? "entegrasyon aktif" : "integration(s) connected"}
            </p>
            <p className="text-xs text-surface-500">
              {isTr
                ? "Etkinlik bazlı entegrasyonlar (Sheets, Excel) olay ayarlarından da yapılandırılabilir."
                : "Event-level integrations (Sheets, Excel) can also be configured per-event from event settings."}
            </p>
          </div>
        </div>
      )}

      {/* Google integrations */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-surface-400">Google</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <IntegrationCard
            icon={FileSpreadsheet}
            name="Google Sheets"
            description={isTr
              ? "Etkinlik katılımcılarını Google Sheets'e otomatik senkronla."
              : "Sync event attendees to Google Sheets automatically."}
            status={loading ? "loading" : getStatus(sheetsStatus)}
            connectedAs={sheetsStatus?.connected ? sheetsStatus.google_email : null}
            onConnect={handleConnectSheets}
            settingsHref={sheetsStatus?.connected ? undefined : undefined}
            connecting={connectingSheets}
            lang={lang}
          />
          <IntegrationCard
            icon={CalendarDays}
            name="Google Calendar"
            description={isTr
              ? "Salon rezervasyonlarını Google Calendar ile çift yönlü senkronla."
              : "Two-way sync venue reservations with Google Calendar."}
            status={loading ? "loading" : getStatus(calendarStatus)}
            connectedAs={calendarStatus?.connected ? calendarStatus.google_email : null}
            onConnect={handleConnectCalendar}
            onSync={calendarStatus?.connected ? handleSyncCalendar : undefined}
            settingsHref="/admin/settings?tab=venues"
            connecting={connectingCalendar}
            syncing={syncingCalendar}
            lang={lang}
          />
        </div>
      </section>

      {/* Microsoft integrations */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-surface-400">Microsoft</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <IntegrationCard
            icon={FileSpreadsheet}
            name="Microsoft Excel (OneDrive)"
            description={isTr
              ? "Etkinlik katılımcılarını OneDrive'daki Excel dosyasına senkronla."
              : "Sync event attendees to an Excel workbook stored in OneDrive."}
            status={loading ? "loading" : getStatus(excelStatus)}
            connectedAs={excelStatus?.connected ? excelStatus.microsoft_email : null}
            onConnect={handleConnectExcel}
            connecting={connectingExcel}
            lang={lang}
          />
        </div>
      </section>

      {/* Info box: per-event configuration */}
      <section className="card border-brand-100 bg-brand-50/30 p-5">
        <h3 className="text-sm font-bold text-brand-800">
          {isTr ? "Etkinlik bazlı yapılandırma" : "Per-event configuration"}
        </h3>
        <p className="mt-1 text-xs text-brand-700">
          {isTr
            ? "Google Sheets ve Microsoft Excel entegrasyonları her etkinlik için ayrıca yapılandırılabilir — hangi sayfaya yazılacağı, etkinlik adı ve sync frekansı gibi ayarları etkinlik ayarlarından özelleştirebilirsiniz."
            : "Google Sheets and Microsoft Excel integrations can be configured per-event — including which spreadsheet to write to, naming, and sync settings."}
        </p>
        <Link href="/admin/events" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline">
          {isTr ? "Etkinliklere git" : "Go to events"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </div>
  );
}
