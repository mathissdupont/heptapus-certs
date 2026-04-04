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
import { useI18n } from "@/lib/i18n";

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
  const { lang } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();

  const copy = {
    tr: {
      subtitle: "Genel sertifika istatistikleri ve hızlı aksiyonlar",
      loadError: "İstatistikler yüklenemedi.",
      quickCreate: "Yeni Etkinlik",
      quickCreateDesc: "Etkinlik ekle",
      quickCertificates: "Sertifikalar",
      quickCertificatesDesc: "Yönet ve kontrol et",
      quickEmail: "E-posta Kampanyaları",
      quickEmailDesc: "Yönet ve takip et",
      quickSettings: "Ayarlar",
      quickSettingsDesc: "Yapılandır ve özelleştir",
      totalEvents: "Toplam Etkinlik",
      totalCertificates: "Toplam Sertifika",
      active: "Aktif",
      revoked: "İptal",
      expired: "Süresi Dolmuş",
      expiredTitle: "Süresi Dolmuş Sertifikalar",
      expiredBody: (count: number) =>
        `${count} adet sertifikanın süresi dolmuş. Lütfen durumu gözden geçirin ve gerekli işlemleri yapın.`,
      reviewCertificates: "Sertifikaları Gözden Geçir",
      activeRate: "Genel Aktif Oran",
      revokeShort: "İptal",
      recentEvents: "Son Etkinlik Detayları",
      noEvents: "Henüz etkinlik yok.",
      eventFallback: (id: number) => `Etkinlik #${id}`,
      total: "Toplam",
      eventsViewAll: "Tüm Etkinlikleri Görüntüle",
    },
    en: {
      subtitle: "Overall certificate metrics and quick actions",
      loadError: "Failed to load statistics.",
      quickCreate: "New Event",
      quickCreateDesc: "Create an event",
      quickCertificates: "Certificates",
      quickCertificatesDesc: "Manage and review",
      quickEmail: "Email Campaigns",
      quickEmailDesc: "Manage and monitor",
      quickSettings: "Settings",
      quickSettingsDesc: "Configure and customize",
      totalEvents: "Total Events",
      totalCertificates: "Total Certificates",
      active: "Active",
      revoked: "Revoked",
      expired: "Expired",
      expiredTitle: "Expired Certificates",
      expiredBody: (count: number) =>
        `${count} certificates have expired. Please review them and take the necessary actions.`,
      reviewCertificates: "Review Certificates",
      activeRate: "Overall Active Rate",
      revokeShort: "Revoked",
      recentEvents: "Recent Event Details",
      noEvents: "No events yet.",
      eventFallback: (id: number) => `Event #${id}`,
      total: "Total",
      eventsViewAll: "View All Events",
    },
  }[lang];

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch("/admin/dashboard/stats");
        setStats(await r.json());
      } catch (e: any) {
        const message = e?.message || copy.loadError;
        setErr(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [copy.loadError, toast]);

  if (loading) {
    return (
      <div className="flex flex-col gap-8 pb-20">
        <PageHeader title="Dashboard" subtitle={copy.subtitle} icon={<BarChart3 className="h-5 w-5" />} />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse p-4">
              <div className="h-14 rounded-lg bg-surface-100" />
            </div>
          ))}
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
      <PageHeader title="Dashboard" subtitle={copy.subtitle} icon={<BarChart3 className="h-5 w-5" />} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Link href="/admin/events" className="card flex items-center gap-3 p-4 transition-all group hover:border-brand-400 hover:bg-brand-50">
          <div className="rounded-lg bg-brand-50 p-2.5 group-hover:bg-brand-100">
            <Plus className="h-5 w-5 text-brand-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-surface-700">{copy.quickCreate}</p>
            <p className="text-xs text-surface-500">{copy.quickCreateDesc}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-surface-400 group-hover:text-brand-500" />
        </Link>

        <Link href="/admin/events" className="card flex items-center gap-3 p-4 transition-all group hover:border-emerald-400 hover:bg-emerald-50">
          <div className="rounded-lg bg-emerald-50 p-2.5 group-hover:bg-emerald-100">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-surface-700">{copy.quickCertificates}</p>
            <p className="text-xs text-surface-500">{copy.quickCertificatesDesc}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-surface-400 group-hover:text-emerald-500" />
        </Link>

        <Link href="/admin/email-dashboard" className="card flex items-center gap-3 p-4 transition-all group hover:border-blue-400 hover:bg-blue-50">
          <div className="rounded-lg bg-blue-50 p-2.5 group-hover:bg-blue-100">
            <Send className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-surface-700">{copy.quickEmail}</p>
            <p className="text-xs text-surface-500">{copy.quickEmailDesc}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-surface-400 group-hover:text-blue-500" />
        </Link>

        <Link href="/admin/settings" className="card flex items-center gap-3 p-4 transition-all group hover:border-purple-400 hover:bg-purple-50">
          <div className="rounded-lg bg-purple-50 p-2.5 group-hover:bg-purple-100">
            <Settings className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-surface-700">{copy.quickSettings}</p>
            <p className="text-xs text-surface-500">{copy.quickSettingsDesc}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-surface-400 group-hover:text-purple-500" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label={copy.totalEvents} value={stats.total_events} icon={<Calendar className="h-5 w-5 text-purple-600" />} iconBg="bg-purple-50 text-purple-600" delay={0} />
        <StatCard label={copy.totalCertificates} value={stats.total_certs} icon={<Award className="h-5 w-5 text-brand-600" />} iconBg="bg-brand-50 text-brand-600" delay={0.05} />
        <StatCard label={copy.active} value={stats.active_certs} icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} iconBg="bg-emerald-50 text-emerald-600" delay={0.1} />
        <StatCard label={copy.revoked} value={stats.revoked_certs} icon={<ShieldOff className="h-5 w-5 text-rose-600" />} iconBg="bg-rose-50 text-rose-600" delay={0.15} />
        <StatCard label={copy.expired} value={stats.expired_certs} icon={<Clock className="h-5 w-5 text-amber-600" />} iconBg="bg-amber-50 text-amber-600" delay={0.2} />
      </div>

      {stats.expired_certs > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card flex items-start gap-4 border-amber-200 bg-amber-50 p-6"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <h3 className="mb-1 font-bold text-amber-900">{copy.expiredTitle}</h3>
            <p className="text-sm text-amber-800">{copy.expiredBody(stats.expired_certs)}</p>
            <Link href="/admin/events" className="mt-2 inline-block text-sm font-semibold text-amber-600 hover:underline">
              {copy.reviewCertificates} →
            </Link>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-bold text-surface-700">
            <TrendingUp className="h-4 w-4 text-brand-500" /> {copy.activeRate}
          </p>
          <span className="text-lg font-extrabold text-emerald-600">{activePercent}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-surface-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${activePercent}%` }}
            transition={{ delay: 0.35, duration: 0.8, ease: "easeOut" }}
            className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
          />
        </div>
        <div className="mt-3 flex gap-4 text-xs font-semibold text-surface-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> {copy.active} {stats.active_certs}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500" /> {copy.revokeShort} {stats.revoked_certs}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" /> {copy.expired} {stats.expired_certs}
          </span>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-surface-100 bg-surface-50 px-6 py-4 font-bold text-surface-700">
          <Activity className="h-4 w-4 text-surface-400" /> {copy.recentEvents}
        </div>
        {stats.events_with_stats.length === 0 ? (
          <div className="p-12 text-center text-sm text-surface-400">{copy.noEvents}</div>
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
                  className="flex flex-col justify-between gap-3 px-6 py-4 transition-colors hover:bg-surface-50 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/events/${ev.event_id}/certificates`} className="block truncate text-sm font-semibold text-surface-800 transition-colors hover:text-brand-600">
                      {ev.event_name || (ev as any).name || copy.eventFallback(ev.event_id)}
                    </Link>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-100">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${evActive}%` }} transition={{ delay: 0.4 + i * 0.04, duration: 0.6 }} className="h-1.5 rounded-full bg-emerald-500" />
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-4 text-xs font-bold">
                    <span className="text-surface-400">{copy.total} <span className="text-surface-700">{ev.total}</span></span>
                    <span className="text-emerald-600">{ev.active} {copy.active.toLowerCase()}</span>
                    <span className="text-rose-500">{ev.revoked} {copy.revokeShort.toLowerCase()}</span>
                    <span className="text-amber-500">{ev.expired} {copy.expired.toLowerCase()}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        {stats.events_with_stats.length > 5 && (
          <div className="bg-surface-50 px-6 py-3 text-center">
            <Link href="/admin/events" className="text-sm font-semibold text-brand-600 hover:underline">
              {copy.eventsViewAll} →
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
