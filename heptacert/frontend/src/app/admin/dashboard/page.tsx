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
import { StatCard, StatCardSkeleton } from "@/components/Admin/StatCard";
import PageHeader from "@/components/Admin/PageHeader";

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
      <div className="flex flex-col gap-8 pb-20">
        <PageHeader title="Dashboard" subtitle="Genel sertifika istatistikleri ve aksiyon yönetimi" icon={<BarChart3 className="h-5 w-5" />} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="card p-4 animate-pulse"><div className="h-14 rounded-lg bg-surface-100" /></div>)}
        </div>
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
    <div className="flex flex-col gap-8 pb-20">
      <PageHeader
        title="Dashboard"
        subtitle="Genel sertifika istatistikleri ve aksiyon yönetimi"
        icon={<BarChart3 className="h-5 w-5" />}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Link href="/admin/events" className="card p-4 flex items-center gap-3 hover:border-brand-400 hover:bg-brand-50 transition-all group">
          <div className="p-2.5 rounded-lg bg-brand-50 group-hover:bg-brand-100"><Plus className="h-5 w-5 text-brand-600" /></div>
          <div className="flex-1"><p className="text-sm font-semibold text-surface-700">Yeni Etkinlik</p><p className="text-xs text-surface-500">Etkinlik ekle</p></div>
          <ArrowRight className="h-4 w-4 text-surface-400 group-hover:text-brand-500" />
        </Link>

        <Link href="/admin/events" className="card p-4 flex items-center gap-3 hover:border-emerald-400 hover:bg-emerald-50 transition-all group">
          <div className="p-2.5 rounded-lg bg-emerald-50 group-hover:bg-emerald-100"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
          <div className="flex-1"><p className="text-sm font-semibold text-surface-700">Sertifikalar</p><p className="text-xs text-surface-500">Yönet ve kontrol et</p></div>
          <ArrowRight className="h-4 w-4 text-surface-400 group-hover:text-emerald-500" />
        </Link>

        <Link href="/admin/email-dashboard" className="card p-4 flex items-center gap-3 hover:border-blue-400 hover:bg-blue-50 transition-all group">
          <div className="p-2.5 rounded-lg bg-blue-50 group-hover:bg-blue-100"><Send className="h-5 w-5 text-blue-600" /></div>
          <div className="flex-1"><p className="text-sm font-semibold text-surface-700">Email Kampanyaları</p><p className="text-xs text-surface-500">Yönet ve takip et</p></div>
          <ArrowRight className="h-4 w-4 text-surface-400 group-hover:text-blue-500" />
        </Link>

        <Link href="/admin/settings" className="card p-4 flex items-center gap-3 hover:border-purple-400 hover:bg-purple-50 transition-all group">
          <div className="p-2.5 rounded-lg bg-purple-50 group-hover:bg-purple-100"><Settings className="h-5 w-5 text-purple-600" /></div>
          <div className="flex-1"><p className="text-sm font-semibold text-surface-700">Ayarlar</p><p className="text-xs text-surface-500">Yapılandır ve özelleştir</p></div>
          <ArrowRight className="h-4 w-4 text-surface-400 group-hover:text-purple-500" />
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Toplam Etkinlik" value={stats.total_events} icon={<Calendar className="h-5 w-5 text-purple-600" />} iconBg="bg-purple-50 text-purple-600" delay={0} />
        <StatCard label="Toplam Sertifika" value={stats.total_certs} icon={<Award className="h-5 w-5 text-brand-600" />} iconBg="bg-brand-50 text-brand-600" delay={0.05} />
        <StatCard label="Aktif" value={stats.active_certs} icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} iconBg="bg-emerald-50 text-emerald-600" delay={0.1} />
        <StatCard label="İptal" value={stats.revoked_certs} icon={<ShieldOff className="h-5 w-5 text-rose-600" />} iconBg="bg-rose-50 text-rose-600" delay={0.15} />
        <StatCard label="Süresi Dolmuş" value={stats.expired_certs} icon={<Clock className="h-5 w-5 text-amber-600" />} iconBg="bg-amber-50 text-amber-600" delay={0.2} />
      </div>

      {/* Warnings Section */}
      {stats.expired_certs > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card border-amber-200 bg-amber-50 p-6 flex items-start gap-4"
        >
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-amber-900 mb-1">Süresi Dolmuş Sertifikalar</h3>
            <p className="text-sm text-amber-800">
              {stats.expired_certs} adet sertifikanın süresi dolmuş. Lütfen durumu gözden geçirin ve gerekli işlemleri yapın.
            </p>
            <Link href="/admin/events" className="text-sm font-semibold text-amber-600 hover:underline inline-block mt-2">
              Sertifikaları Gözden Geçir →
            </Link>
          </div>
        </motion.div>
      )}

      {/* Overview bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-surface-700 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-500" /> Genel Aktif Oran</p>
          <span className="text-lg font-extrabold text-emerald-600">{activePercent}%</span>
        </div>
        <div className="w-full bg-surface-100 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${activePercent}%` }}
            transition={{ delay: 0.35, duration: 0.8, ease: "easeOut" }}
            className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
          />
        </div>
        <div className="flex gap-4 mt-3 text-xs font-semibold text-surface-400">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Aktif {stats.active_certs}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Revoke {stats.revoked_certs}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Süresi Dolmuş {stats.expired_certs}</span>
        </div>
      </motion.div>

      {/* Per-event table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card overflow-hidden">
        <div className="bg-surface-50 border-b border-surface-100 px-6 py-4 flex items-center gap-3 font-bold text-surface-700">
          <Activity className="h-4 w-4 text-surface-400" /> Son Etkinlik Detayları
        </div>
        {stats.events_with_stats.length === 0 ? (
          <div className="p-12 text-center text-sm text-surface-400">Henüz etkinlik yok.</div>
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
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <Link href={`/admin/events/${ev.event_id}/certificates`} className="font-semibold text-surface-800 hover:text-brand-600 transition-colors text-sm truncate block">
                      {ev.event_name || (ev as any).name || `Etkinlik #${ev.event_id}`}
                    </Link>
                    <div className="w-full bg-surface-100 rounded-full h-1.5 mt-2 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${evActive}%` }} transition={{ delay: 0.4 + i * 0.04, duration: 0.6 }} className="h-1.5 rounded-full bg-emerald-500" />
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs font-bold shrink-0">
                    <span className="text-surface-400">Toplam <span className="text-surface-700">{ev.total}</span></span>
                    <span className="text-emerald-600">{ev.active} aktif</span>
                    <span className="text-rose-500">{ev.revoked} revoke</span>
                    <span className="text-amber-500">{ev.expired} süresi dolmuş</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        {stats.events_with_stats.length > 5 && (
          <div className="px-6 py-3 bg-surface-50 text-center">
            <Link href="/admin/events" className="text-sm font-semibold text-brand-600 hover:underline">
              Tüm Etkinlikleri Görüntüle →
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
