"use client";

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
  Trash2,
} from "lucide-react";
import { listAuditLogs, AuditLogOut } from "@/lib/api";
import PageHeader from "@/components/Admin/PageHeader";
import EmptyState from "@/components/Admin/EmptyState";
import { useToast } from "@/hooks/useToast";
import { useI18n } from "@/lib/i18n";

function actionIcon(action: string) {
  if (action.includes("login")) return LogIn;
  if (action.includes("logout")) return LogOut;
  if (action.includes("delete") || action.includes("revoke")) return Trash2;
  if (action.includes("update") || action.includes("edit")) return PencilLine;
  return FileText;
}

function actionTone(action: string) {
  if (action.includes("login")) return "bg-emerald-50 text-emerald-700";
  if (action.includes("logout")) return "bg-sky-50 text-sky-700";
  if (action.includes("delete") || action.includes("revoke")) return "bg-rose-50 text-rose-700";
  if (action.includes("update") || action.includes("edit")) return "bg-amber-50 text-amber-700";
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

  const copy = lang === "tr"
    ? {
        title: "Denetim Kayıtları",
        subtitle: "Platformdaki kritik değişiklikleri, erişim hareketlerini ve sistem olaylarını izleyin",
        loadFailed: "Denetim kayıtları yüklenemedi",
        refresh: "Yenile",
        totalLogs: "Toplam kayıt",
        uniqueUsers: "Etkilenen kullanıcı",
        recentChanges: "Son 24 saat",
        actionTypes: "Aksiyon türü",
        search: "Kullanıcı, aksiyon veya kaynak ara...",
        allActions: "Tüm aksiyonlar",
        actor: "Aktör",
        target: "Hedef",
        details: "Detay",
        emptyTitle: "Gösterilecek kayıt yok",
        emptyBody: "Arama ya da filtreyi temizleyerek daha fazla kayıt görüntüleyin.",
        system: "Sistem",
        noDetails: "Ek detay yok",
        justNow: "Az önce",
        last24Hours: "24 saatte",
        records: "kayıt",
        locale: "tr-TR",
      }
    : {
        title: "Audit Log",
        subtitle: "Track critical platform changes, access activity, and system events in one place",
        loadFailed: "Failed to load audit logs",
        refresh: "Refresh",
        totalLogs: "Total logs",
        uniqueUsers: "Affected users",
        recentChanges: "Last 24 hours",
        actionTypes: "Action types",
        search: "Search by user, action, or resource...",
        allActions: "All actions",
        actor: "Actor",
        target: "Target",
        details: "Details",
        emptyTitle: "No matching logs",
        emptyBody: "Clear the search or filters to reveal more activity.",
        system: "System",
        noDetails: "No extra details",
        justNow: "Just now",
        last24Hours: "in the last 24h",
        records: "records",
        locale: "en-US",
      };

  const fetchLogs = async (mode: "load" | "refresh" = "load") => {
    try {
      if (mode === "load") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const result = await listAuditLogs({ page: 1, limit: 100 });
      setLogs(result.items);
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
  }, [lang]);

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
    () => new Intl.RelativeTimeFormat(lang === "tr" ? "tr" : "en", { numeric: "auto" }),
    [lang]
  );

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
          <button onClick={() => fetchLogs("refresh")} disabled={refreshing} className="btn-secondary gap-2 text-xs">
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {copy.refresh}
          </button>
        }
      />

      {error && (
        <div className="error-banner flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

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
                    </div>
                  </div>

                  <div className="rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm">
                    <p className="font-semibold text-surface-900">{new Date(log.created_at).toLocaleString(copy.locale)}</p>
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
