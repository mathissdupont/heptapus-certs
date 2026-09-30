"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  FileText,
  Loader2,
  LogIn,
  LogOut,
  PencilLine,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { downloadAuditLogExport, getSecurityEvents, listAuditLogs, AuditLogOut, type SecurityEventsOut } from "@/lib/api";
import PageHeader from "@/components/Admin/PageHeader";
import EmptyState from "@/components/Admin/EmptyState";
import { useToast } from "@/hooks/useToast";
import { useI18n, translate } from "@/lib/i18n";

function actionIcon(action: string) {
  if (action.includes("login")) return LogIn;
  if (action.includes("logout")) return LogOut;
  if (action.includes("delete") || action.includes("revoke")) return Trash2;
  if (action.includes("update") || action.includes("edit")) return PencilLine;
  return FileText;
}

function actionTone(action: string) {
  if (action.includes("login")) return "bg-status-success-bg text-status-success-content";
  if (action.includes("logout")) return "bg-status-info-bg text-status-info-content";
  if (action.includes("delete") || action.includes("revoke")) return "bg-status-danger-bg text-status-danger-content";
  if (action.includes("update") || action.includes("edit")) return "bg-status-warning-bg text-status-warning-content";
  return "bg-surface-100 text-surface-700";
}

export default function AuditLogsPage() {
  const toast = useToast();
  const { lang } = useI18n();
  const [logs, setLogs] = useState<AuditLogOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [category, setCategory] = useState<"all" | "legal" | "security">("all");
  const [security, setSecurity] = useState<SecurityEventsOut | null>(null);

  const copy = { title: translate(lang, "migrated_app_admin_superadmin_audit_logs_audit_log_d7d2e5d9"), subtitle: translate(lang, "migrated_app_admin_superadmin_audit_logs_track_critical_platform_changes_access_act_22fcaca3"), loadFailed: translate(lang, "migrated_app_admin_superadmin_audit_logs_failed_to_load_audit_logs_1c872b8b"), refresh: translate(lang, "migrated_app_admin_superadmin_audit_logs_refresh_6bfe6d82"), exportCsv: translate(lang, "migrated_app_admin_superadmin_audit_logs_export_csv_9cbadee7"), exportPdf: translate(lang, "migrated_app_admin_superadmin_audit_logs_export_pdf_eaa7c6aa"), allLogs: translate(lang, "migrated_app_admin_superadmin_audit_logs_all_1d7b4bcc"), legalLogs: translate(lang, "migrated_app_admin_superadmin_audit_logs_kvkk_consent_856125bc"), securityLogs: translate(lang, "migrated_app_admin_superadmin_audit_logs_security_events_bf023bb1"), suspiciousIps: translate(lang, "migrated_app_admin_superadmin_audit_logs_suspicious_ips_0dab29d1"), totalLogs: translate(lang, "migrated_app_admin_superadmin_audit_logs_total_logs_53980728"), uniqueUsers: translate(lang, "migrated_app_admin_superadmin_audit_logs_affected_users_94728987"), recentChanges: translate(lang, "migrated_app_admin_superadmin_audit_logs_last_24_hours_80415a04"), actionTypes: translate(lang, "migrated_app_admin_superadmin_audit_logs_action_types_0fe3021e"), search: translate(lang, "migrated_app_admin_superadmin_audit_logs_search_by_user_action_or_resource_20c3945d"), allActions: translate(lang, "migrated_app_admin_superadmin_audit_logs_all_actions_c78130d1"), actor: translate(lang, "migrated_app_admin_superadmin_audit_logs_actor_477ce3a8"), target: translate(lang, "migrated_app_admin_superadmin_audit_logs_target_f0a8a82d"), details: translate(lang, "migrated_app_admin_superadmin_audit_logs_details_dd9e1d24"), emptyTitle: translate(lang, "migrated_app_admin_superadmin_audit_logs_no_matching_logs_e4481c13"), emptyBody: translate(lang, "migrated_app_admin_superadmin_audit_logs_clear_the_search_or_filters_to_reveal_more_3044203e"), system: translate(lang, "migrated_app_admin_superadmin_audit_logs_system_057847e4"), noDetails: translate(lang, "migrated_app_admin_superadmin_audit_logs_no_extra_details_282c382a"), justNow: translate(lang, "migrated_app_admin_superadmin_audit_logs_just_now_b200888d"), last24Hours: translate(lang, "migrated_app_admin_superadmin_audit_logs_in_the_last_24h_908fb0c1"), records: translate(lang, "migrated_app_admin_superadmin_audit_logs_records_7e11b440") };

  const fetchLogs = async (mode: "load" | "refresh" = "load") => {
    try {
      if (mode === "load") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const result = await listAuditLogs({ page: 1, limit: 500, category: category === "all" ? undefined : category });
      setLogs(result.items);
      if (category === "security") setSecurity(await getSecurityEvents());
    } catch (e: any) {
      const message = e?.message || copy.loadFailed;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, category]);

  const actions = useMemo(() => Array.from(new Set(logs.map((log) => log.action))).sort(), [logs]);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      const haystack = [log.user_email, log.action, log.resource_type, log.resource_id, log.details]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesAction && (!term || haystack.includes(term));
    });
  }, [actionFilter, logs, search]);

  const recentCount = useMemo(
    () => logs.filter((log) => Date.now() - new Date(log.created_at).getTime() <= 24 * 60 * 60 * 1000).length,
    [logs]
  );

  const uniqueUsers = useMemo(
    () => new Set(logs.map((log) => log.user_email || `${copy.system}-${log.user_id ?? "0"}`)).size,
    [copy.system, logs]
  );

  const timeFormatter = useMemo(
    () => new Intl.RelativeTimeFormat(translate(lang, "migrated_app_admin_superadmin_audit_logs_en_411ab378"), { numeric: "auto" }),
    [lang]
  );

  const exportLogs = async (format: "csv" | "pdf") => {
    try {
      const result = await downloadAuditLogExport(format, category === "all" ? undefined : category);
      toast.success(result?.queued ? result.message : "CSV hazır.");
    } catch (e: any) {
      toast.error(e?.message || "Dışa aktarım başarısız.");
    }
  };

  const formatRelative = (value: string) => {
    const diffMs = new Date(value).getTime() - Date.now();
    const diffMinutes = Math.round(diffMs / 60000);
    if (Math.abs(diffMinutes) < 1) return copy.justNow;
    if (Math.abs(diffMinutes) < 60) return timeFormatter.format(diffMinutes, "minute");
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) return timeFormatter.format(diffHours, "hour");
    const diffDays = Math.round(diffHours / 24);
    return timeFormatter.format(diffDays, "day");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        icon={<ShieldAlert className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <button onClick={() => void exportLogs("csv")} className="btn-secondary gap-2 text-xs">
              <FileText className="h-3.5 w-3.5" />
              {copy.exportCsv}
            </button>
            <button onClick={() => void exportLogs("pdf")} className="btn-secondary gap-2 text-xs">
              <FileText className="h-3.5 w-3.5" />
              {copy.exportPdf}
            </button>
            <button onClick={() => fetchLogs("refresh")} disabled={refreshing} className="btn-secondary gap-2 text-xs">
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {copy.refresh}
            </button>
          </div>
        }
      />

      {error && (
        <div className="error-banner flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {([
          ["all", copy.allLogs],
          ["legal", copy.legalLogs],
          ["security", copy.securityLogs],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setCategory(value)}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              category === value ? "border-brand-200 bg-brand-50 text-brand-700" : "border-surface-200 bg-raised text-surface-600 hover:bg-surface-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-surface-400">{copy.totalLogs}</p>
          <p className="mt-3 text-3xl font-black text-surface-900">{logs.length}</p>
          <p className="mt-1 text-sm text-surface-500">{copy.records}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-surface-400">{copy.uniqueUsers}</p>
          <p className="mt-3 text-3xl font-black text-surface-900">{uniqueUsers}</p>
          <p className="mt-1 text-sm text-surface-500">{copy.actor}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-surface-400">{copy.recentChanges}</p>
          <p className="mt-3 text-3xl font-black text-surface-900">{recentCount}</p>
          <p className="mt-1 text-sm text-surface-500">{copy.last24Hours}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-surface-400">{copy.actionTypes}</p>
          <p className="mt-3 text-3xl font-black text-surface-900">{actions.length}</p>
          <p className="mt-1 text-sm text-surface-500">{copy.records}</p>
        </div>
      </div>

      {category === "security" && security && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card p-5">
            <div className="flex items-center gap-2 text-status-danger-content">
              <ShieldCheck className="h-4 w-4" />
              <p className="text-sm font-bold">{copy.securityLogs}</p>
            </div>
            <p className="mt-3 text-3xl font-black text-surface-900">{security.total_24h}</p>
            <p className="text-sm text-surface-500">{copy.last24Hours}</p>
          </div>
          <div className="card p-5 lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-surface-400">{copy.suspiciousIps}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {security.suspicious_ips.length === 0 ? (
                <span className="text-sm text-surface-500">Eşik üstü IP yok.</span>
              ) : security.suspicious_ips.map((item) => (
                <span key={item.ip} className="rounded-full bg-status-danger-bg px-3 py-1 text-xs font-semibold text-status-danger-content">{item.ip} · {item.count}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="input-field pl-10" placeholder={copy.search} />
          </label>
          <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} className="input-field">
            <option value="all">{copy.allActions}</option>
            {actions.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <EmptyState icon={<ShieldAlert className="h-7 w-7" />} title={copy.emptyTitle} description={copy.emptyBody} />
      ) : (
        <div className="grid gap-4">
          {filteredLogs.map((log) => {
            const Icon = actionIcon(log.action);
            return (
              <article key={log.id} className="card overflow-hidden p-4 transition-shadow hover:shadow-soft sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${actionTone(log.action)}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {log.action}
                      </span>
                      <span className="rounded-full border border-surface-200 px-3 py-1 text-xs font-medium text-surface-500">#{log.id}</span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">{copy.actor}</p>
                        <p className="mt-1 break-all text-sm font-medium text-surface-900">{log.user_email || copy.system}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">{copy.target}</p>
                        <p className="mt-1 text-sm font-medium text-surface-900">{[log.resource_type, log.resource_id].filter(Boolean).join(" #") || "-"}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">{copy.details}</p>
                        <p className="mt-1 text-sm text-surface-600">{log.details || copy.noDetails}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">IP</p>
                        <p className="mt-1 break-all text-sm font-medium text-surface-900">{log.ip_address || "-"}</p>
                      </div>
                    </div>

                    {log.extra && Object.keys(log.extra).length > 0 && (
                      <details className="mt-3 rounded-xl border border-surface-200 bg-surface-50 px-4 py-3">
                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-surface-500">Extra JSON</summary>
                        <pre className="mt-3 overflow-x-auto text-xs leading-5 text-surface-600">{JSON.stringify(log.extra, null, 2)}</pre>
                      </details>
                    )}
                  </div>

                  <div className="rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm">
                    <p className="font-semibold text-surface-900">{new Date(log.created_at).toLocaleString(localeTag(lang))}</p>
                    <p className="mt-1 text-xs text-surface-500">{formatRelative(log.created_at)}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
