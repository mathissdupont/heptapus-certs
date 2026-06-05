"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Database,
  HardDrive,
  Loader2,
  RefreshCw,
  ServerCog,
  XCircle,
} from "lucide-react";
import { apiFetch, getPlatformHealth } from "@/lib/api";
import PageHeader from "@/components/Admin/PageHeader";
import { useI18n } from "@/lib/i18n";

type SystemHealth = {
  disk_total_gb?: number;
  disk_used_gb?: number;
  disk_free_gb?: number;
  disk_percent?: number;
  db_size_mb?: number;
  db_active_connections?: number;
  uptime_seconds?: number;
  recent_24h_actions?: number;
};

type PlatformHealth = {
  checked_at: string;
  probes: Record<string, { ok: boolean; status: string; detail: string }>;
};

function formatUptime(seconds: number, lang: "tr" | "en") {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return lang === "tr" ? `${days} gün ${hours} sa ${minutes} dk` : `${days}d ${hours}h ${minutes}m`;
}

export default function SuperadminHealthPage() {
  const { lang } = useI18n();
  const [data, setData] = useState<SystemHealth | null>(null);
  const [platform, setPlatform] = useState<PlatformHealth | null>(null);
  const [jobs, setJobs] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = lang === "tr"
    ? {
        title: "Sistem Sağlığı",
        subtitle: "Altyapı kapasitesini, veritabanı yükünü ve son aktiviteyi tek ekranda izleyin",
        refresh: "Yenile",
        loadFailed: "Sistem sağlığı bilgisi alınamadı",
        diskUsage: "Disk kullanımı",
        database: "Veritabanı",
        uptime: "Çalışma süresi",
        activity: "Son 24 saat",
        freeSpace: "boş alan",
        activeConnections: "aktif bağlantı",
        operations: "işlem",
        online: "Çevrimiçi",
        onlineDetail: "Servisler yanıt veriyor ve sağlık metrikleri düzenli olarak güncelleniyor.",
        probes: "Servis kontrolleri",
        updatedAt: "Son güncelleme",
        locale: "tr-TR",
      }
    : {
        title: "System Health",
        subtitle: "Monitor infrastructure capacity, database load, and recent activity from one screen",
        refresh: "Refresh",
        loadFailed: "Failed to load system health data",
        diskUsage: "Disk usage",
        database: "Database",
        uptime: "Uptime",
        activity: "Last 24 hours",
        freeSpace: "free space",
        activeConnections: "active connections",
        operations: "operations",
        online: "Online",
        onlineDetail: "Core services are responding and health metrics are updating normally.",
        probes: "Service probes",
        updatedAt: "Updated",
        locale: "en-US",
      };

  const load = async (mode: "load" | "refresh" = "load") => {
    try {
      if (mode === "load") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const [response, platformHealth, jobsResponse] = await Promise.all([
        apiFetch("/superadmin/system-health"),
        getPlatformHealth().catch(() => null),
        apiFetch("/superadmin/job-status").catch(() => null),
      ]);
      setData(await response.json());
      setPlatform(platformHealth);
      if (jobsResponse) setJobs(await jobsResponse.json().catch(() => null));
    } catch (e: any) {
      setError(e?.message || copy.loadFailed);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => load("refresh"), 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const diskPercent = Math.min(data?.disk_percent ?? 0, 100);
  const diskTone = diskPercent > 85 ? "bg-rose-500" : diskPercent > 65 ? "bg-amber-400" : "bg-emerald-500";

  const stats = useMemo(
    () => [
      {
        label: copy.diskUsage,
        value: `${(data?.disk_percent ?? 0).toFixed(1)}%`,
        detail: `${(data?.disk_free_gb ?? 0).toFixed(1)} GB ${copy.freeSpace}`,
        icon: <HardDrive className="h-5 w-5" />,
      },
      {
        label: copy.database,
        value: `${(data?.db_size_mb ?? 0).toFixed(1)} MB`,
        detail: `${data?.db_active_connections ?? 0} ${copy.activeConnections}`,
        icon: <Database className="h-5 w-5" />,
      },
      {
        label: copy.uptime,
        value: formatUptime(data?.uptime_seconds ?? 0, lang),
        detail: copy.online,
        icon: <Clock3 className="h-5 w-5" />,
      },
      {
        label: copy.activity,
        value: `${data?.recent_24h_actions ?? 0}`,
        detail: copy.operations,
        icon: <Activity className="h-5 w-5" />,
      },
    ],
    [copy.activeConnections, copy.activity, copy.database, copy.diskUsage, copy.freeSpace, copy.online, copy.operations, copy.uptime, data, lang]
  );

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
        icon={<ServerCog className="h-5 w-5" />}
        actions={
          <button onClick={() => load("refresh")} disabled={refreshing} className="btn-secondary gap-2 text-xs">
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
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center gap-3 text-surface-500">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-50 text-brand-600">
                {stat.icon}
              </div>
              <p className="text-sm font-semibold">{stat.label}</p>
            </div>
            <p className="mt-4 text-2xl font-black text-surface-900">{stat.value}</p>
            <p className="mt-1 text-sm text-surface-500">{stat.detail}</p>
          </div>
        ))}
      </div>

      {platform && (
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-surface-900">{copy.probes}</h2>
              <p className="text-sm text-surface-500">{new Date(platform.checked_at).toLocaleString(copy.locale)}</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {Object.entries(platform.probes).map(([key, probe]) => (
              <div key={key} className={`rounded-2xl border p-4 ${probe.ok ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"}`}>
                <p className={`text-xs font-black uppercase tracking-wider ${probe.ok ? "text-emerald-700" : "text-amber-700"}`}>{key}</p>
                <p className="mt-2 text-sm font-semibold text-surface-900">{probe.ok ? "OK" : "Warning"}</p>
                <p className="mt-1 text-xs leading-5 text-surface-600">{probe.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="card p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-surface-900">{copy.diskUsage}</h2>
              <p className="text-sm text-surface-500">
                {(data?.disk_used_gb ?? 0).toFixed(1)} / {(data?.disk_total_gb ?? 0).toFixed(1)} GB
              </p>
            </div>
            <span className="rounded-full bg-surface-100 px-3 py-1 text-sm font-semibold text-surface-700">
              {diskPercent.toFixed(1)}%
            </span>
          </div>
          <div className="mt-5 overflow-hidden rounded-full bg-surface-100">
            <motion.div
              className={`h-4 rounded-full ${diskTone}`}
              initial={{ width: 0 }}
              animate={{ width: `${diskPercent}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-surface-500">
            <span>{(data?.disk_free_gb ?? 0).toFixed(1)} GB {copy.freeSpace}</span>
            <span>{(data?.db_active_connections ?? 0)} {copy.activeConnections}</span>
          </div>
        </div>

        <div className="card flex flex-col gap-4 p-6">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-700">{copy.online}</p>
              <p className="text-sm text-surface-500">{copy.onlineDetail}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
            <p className="font-semibold text-surface-900">{copy.updatedAt}</p>
            <p className="mt-1">{new Date().toLocaleString(copy.locale)}</p>
          </div>
        </div>

        {/* Background Job Status */}
        {jobs && (
          <div className="card p-5">
            <div className="flex items-center gap-2 border-b border-surface-100 pb-3 mb-4">
              <Activity className="h-4 w-4 text-brand-600" />
              <h2 className="text-sm font-bold text-surface-900">
                {lang === "tr" ? "Arkaplan İş Kuyruğu" : "Background Job Queue"}
              </h2>
              <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-11 font-bold text-emerald-700">
                {lang === "tr" ? "Ayrı worker container'da çalışıyor" : "Runs in dedicated worker container"}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {[
                { key: "bulk_email", label: lang === "tr" ? "Toplu E-posta" : "Bulk Email" },
                { key: "segment_export", label: lang === "tr" ? "Segment Export" : "Segment Export" },
                { key: "document_export", label: lang === "tr" ? "Doküman Export" : "Document Export" },
                { key: "certificate_bulk", label: lang === "tr" ? "Sertifika Bulk" : "Certificate Bulk" },
                { key: "training_notifications", label: lang === "tr" ? "Eğitim Bildirimleri" : "Training Notifs" },
              ].map(({ key, label }) => {
                const q = jobs[key] || {};
                const hasPending = (q.pending || 0) > 0 || (q.processing || 0) > 0;
                const hasFailed = (q.failed_last_hour || 0) > 0;
                return (
                  <div key={key} className={`rounded-xl border p-3 ${hasFailed ? "border-rose-200 bg-rose-50/50" : hasPending ? "border-amber-200 bg-amber-50/50" : "border-surface-200 bg-white"}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      {hasFailed
                        ? <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        : hasPending
                        ? <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin shrink-0" />
                        : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                      <p className="text-11 font-bold text-surface-700 truncate">{label}</p>
                    </div>
                    <div className="space-y-0.5 text-11 text-surface-500">
                      {q.pending !== undefined && <p>{lang === "tr" ? "Bekleyen" : "Pending"}: <span className="font-bold text-surface-700">{q.pending}</span></p>}
                      {q.processing !== undefined && <p>{lang === "tr" ? "İşleniyor" : "Processing"}: <span className="font-bold text-surface-700">{q.processing}</span></p>}
                      {q.failed_last_hour !== undefined && <p className={q.failed_last_hour > 0 ? "text-rose-600 font-bold" : ""}>{lang === "tr" ? "Hata (1s)" : "Failed (1h)"}: <span className="font-bold">{q.failed_last_hour}</span></p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
