"use client";

import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  CheckCircle2,
  ShieldOff,
  Clock,
  Calendar,
  Loader2,
  AlertCircle,
  TrendingUp,
  Award,
  Plus,
  Send,
  Settings,
  ArrowRight,
  AlertTriangle,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";

type EventStat = {
  event_id: number;
  event_name: string;
  active: number;
  revoked: number;
  expired: number;
  total: number;
};

type DashboardStats = {
  total_certs: number;
  active_certs: number;
  revoked_certs: number;
  expired_certs: number;
  total_events: number;
  events_with_stats: EventStat[];
};

function StatCard({
  label,
  value,
  icon,
  colorClass,
  delay = 0,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="card p-6 flex items-center gap-4 dark:bg-gray-800 dark:border-gray-700"
    >
      <div className={`p-3 rounded-2xl ${colorClass}`}>{icon}</div>
      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">{value.toLocaleString()}</p>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch("/admin/dashboard/stats");
        setStats(await r.json());
      } catch (e: any) {
        const message = e?.message || "İstatistikler yüklenemedi.";
        setErr(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-32">
        <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
      </div>
    );
  }

  if (err || !stats) {
    return (
      <div className="flex items-center gap-3 p-8 text-rose-600">
        <AlertCircle className="h-5 w-5" /> {err}
      </div>
    );
  }

  const activePercent = stats.total_certs > 0 ? Math.round((stats.active_certs / stats.total_certs) * 100) : 0;

  return (
    <div className="flex flex-col gap-8 pt-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-brand-50 dark:bg-brand-900">
            <BarChart3 className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">Dashboard</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500">Genel sertifika istatistikleri and aksiyon yönetimi</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Link
          href="/admin/events/new"
          className="card p-4 flex items-center gap-3 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900 transition-all group"
        >
          <div className="p-2.5 rounded-lg bg-brand-50 dark:bg-brand-900 group-hover:bg-brand-100 dark:group-hover:bg-brand-800">
            <Plus className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Yeni Etkinlik</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Etkinlik ekle</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-brand-500" />
        </Link>

        <Link
          href="/admin/events"
          className="card p-4 flex items-center gap-3 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900 transition-all group"
        >
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-800">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sertifikalar</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Yönet ve kontrol et</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-emerald-500" />
        </Link>

        <Link
          href="/admin/email-dashboard"
          className="card p-4 flex items-center gap-3 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all group"
        >
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900 group-hover:bg-blue-100 dark:group-hover:bg-blue-800">
            <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email Kampanyaları</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Yönet ve takip et</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
        </Link>

        <Link
          href="/admin/settings"
          className="card p-4 flex items-center gap-3 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900 transition-all group"
        >
          <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900 group-hover:bg-purple-100 dark:group-hover:bg-purple-800">
            <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ayarlar</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Configür ve özelleştir</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-500" />
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Toplam Etkinlik" value={stats.total_events} icon={<Calendar className="h-5 w-5 text-purple-600" />} colorClass="bg-purple-50 dark:bg-purple-900" delay={0} />
        <StatCard label="Toplam Sertifika" value={stats.total_certs} icon={<Award className="h-5 w-5 text-brand-600" />} colorClass="bg-brand-50 dark:bg-brand-900" delay={0.05} />
        <StatCard label="Aktif" value={stats.active_certs} icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} colorClass="bg-emerald-50 dark:bg-emerald-900" delay={0.1} />
        <StatCard label="Revoke" value={stats.revoked_certs} icon={<ShieldOff className="h-5 w-5 text-rose-600" />} colorClass="bg-rose-50 dark:bg-rose-900" delay={0.15} />
        <StatCard label="Süresi Dolmuş" value={stats.expired_certs} icon={<Clock className="h-5 w-5 text-amber-600" />} colorClass="bg-amber-50 dark:bg-amber-900" delay={0.2} />
      </div>

      {/* Warnings Section */}
      {stats.expired_certs > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6 flex items-start gap-4"
        >
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-amber-900 dark:text-amber-100 mb-1">Süresi Dolmuş Sertifikalar</h3>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {stats.expired_certs} adet sertifikanın süresi dolmuş. Lütfen durumu gözden geçirin ve gerekli işlemleri yapın.
            </p>
            <Link href="/admin/events" className="text-sm font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-block mt-2">
              Sertifikaları Gözden Geçir →
            </Link>
          </div>
        </motion.div>
      )}

      {/* Overview bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="card p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-500" /> Genel Aktif Oran</p>
          <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{activePercent}%</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${activePercent}%` }}
            transition={{ delay: 0.35, duration: 0.8, ease: "easeOut" }}
            className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
          />
        </div>
        <div className="flex gap-4 mt-3 text-xs font-semibold text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Aktif {stats.active_certs}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Revoke {stats.revoked_certs}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Süresi Dolmuş {stats.expired_certs}</span>
        </div>
      </motion.div>

      {/* Per-event table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card overflow-hidden dark:bg-gray-800 dark:border-gray-700">
        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center gap-3 font-bold text-gray-700 dark:text-gray-300">
          <Activity className="h-4 w-4 text-gray-400" /> Son Etkinlik Detayları
        </div>
        {stats.events_with_stats.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400 dark:text-gray-500">Henüz etkinlik yok.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {stats.events_with_stats.slice(0, 5).map((ev, i) => {
              const evActive = ev.total > 0 ? Math.round((ev.active / ev.total) * 100) : 0;
              return (
                <motion.div
                  key={ev.event_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.04 }}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <Link href={`/admin/events/${ev.event_id}/certificates`} className="font-semibold text-gray-800 dark:text-gray-200 hover:text-brand-600 dark:hover:text-brand-400 transition-colors text-sm truncate block">
                      {ev.event_name}
                    </Link>
                    <div className="w-full bg-gray-100 dark:bg-gray-600 rounded-full h-1.5 mt-2 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${evActive}%` }} transition={{ delay: 0.4 + i * 0.04, duration: 0.6 }} className="h-1.5 rounded-full bg-emerald-500" />
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs font-bold shrink-0">
                    <span className="text-gray-400 dark:text-gray-500">Toplam <span className="text-gray-700 dark:text-gray-300">{ev.total}</span></span>
                    <span className="text-emerald-600 dark:text-emerald-400">{ev.active} aktif</span>
                    <span className="text-rose-500 dark:text-rose-400">{ev.revoked} revoke</span>
                    <span className="text-amber-500 dark:text-amber-400">{ev.expired} süresi dolmuş</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        {stats.events_with_stats.length > 5 && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 text-center">
            <Link href="/admin/events" className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline">
              Tüm Etkinlikleri Görüntüle →
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
