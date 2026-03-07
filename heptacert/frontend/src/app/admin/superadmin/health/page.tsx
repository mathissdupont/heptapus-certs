"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import {
  Loader2, AlertCircle, RefreshCcw, HardDrive, Database, Clock,
} from "lucide-react";

type SystemHealth = {
  disk_total_gb: number; disk_used_gb: number; disk_free_gb: number;
  disk_percent: number; db_size_mb: number; db_active_connections: number;
  uptime_seconds: number; recent_24h_actions: number;
};

function fmtUptime(secs: number) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${d}g ${h}s ${m}dk`;
}

export default function SuperadminHealthPage() {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const r = await apiFetch("/superadmin/system-health");
      setData(await r.json());
    } catch (e: any) { setErr(e?.message || "Sistem sağlığı bilgisi alınamadı."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-surface-900">Sistem Sağlığı</h2>
          <p className="text-sm text-surface-500">Otomatik 30 saniyede bir yenilenir.</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />} Yenile
        </button>
      </div>

      {err && <div className="flex items-center gap-2 text-rose-600 text-sm"><AlertCircle className="h-4 w-4" />{err}</div>}

      {loading && !data && (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
      )}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Disk */}
          <div className="card p-5 col-span-2">
            <div className="flex items-center gap-2 text-sm font-bold text-surface-700 mb-3">
              <HardDrive className="h-4 w-4 text-surface-400" /> Disk Kullanımı
            </div>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-extrabold text-surface-800">{data.disk_percent}%</span>
              <span className="text-xs text-surface-400">{data.disk_used_gb.toFixed(1)} / {data.disk_total_gb.toFixed(1)} GB</span>
            </div>
            <div className="w-full bg-surface-100 rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(data.disk_percent, 100)}%` }}
                transition={{ duration: 0.6 }}
                className={`h-3 rounded-full ${data.disk_percent > 85 ? "bg-rose-500" : data.disk_percent > 65 ? "bg-amber-400" : "bg-emerald-500"}`}
              />
            </div>
            <p className="text-xs text-surface-400 mt-1">{data.disk_free_gb.toFixed(1)} GB boş</p>
          </div>

          {/* DB */}
          <div className="card p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-surface-700 mb-3">
              <Database className="h-4 w-4 text-surface-400" /> Veritabanı
            </div>
            <p className="text-2xl font-extrabold text-surface-800">{data.db_size_mb.toFixed(1)} <span className="text-sm font-semibold text-surface-400">MB</span></p>
            <p className="text-xs text-surface-400 mt-1">{data.db_active_connections} aktif bağlantı</p>
          </div>

          {/* Uptime */}
          <div className="card p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-surface-700 mb-3">
              <Clock className="h-4 w-4 text-surface-400" /> Uptime
            </div>
            <p className="text-2xl font-extrabold text-surface-800">{fmtUptime(data.uptime_seconds)}</p>
            <p className="text-xs text-surface-400 mt-1">{data.recent_24h_actions} işlem / son 24 saat</p>
          </div>

          {/* Status */}
          <div className="card p-5 flex items-center gap-4 col-span-1 sm:col-span-2 lg:col-span-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <span className="text-sm font-bold text-emerald-600">Sistem Çevrimiçi</span>
            </div>
            <div className="text-xs text-surface-400">Son güncelleme: {new Date().toLocaleTimeString("tr-TR")}</div>
          </div>
        </div>
      )}
    </div>
  );
}
