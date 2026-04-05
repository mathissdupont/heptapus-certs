"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Clock3,
  Database,
  HardDrive,
  Loader2,
  RefreshCw,
  ServerCog,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
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

function formatUptime(seconds: number, lang: "tr" | "en") {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return lang === "tr" ? `${days} gün ${hours} sa ${minutes} dk` : `${days}d ${hours}h ${minutes}m`;
}

export default function SuperadminHealthPage() {
  const { lang } = useI18n();
  const [data, setData] = useState<SystemHealth | null>(null);
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
        updatedAt: "Updated",
        locale: "en-US",
      };

  const load = async (mode: "load" | "refresh" = "load") => {
    try {
      if (mode === "load") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const response = await apiFetch("/superadmin/system-health");
      setData(await response.json());
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
      </div>
    </div>
  );
}
