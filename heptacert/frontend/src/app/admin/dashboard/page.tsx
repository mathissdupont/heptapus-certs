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
      workspaceLabel: "Calisma Alani",
      actionHubTitle: "Hizli Aksiyonlar",
      overviewLabel: "Genel Gorunum",
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
      workspaceLabel: "Workspace",
      actionHubTitle: "Action Hub",
      overviewLabel: "Overview",
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
  const quickActions = [
    {
      title: copy.quickCreate,
      description: copy.quickCreateDesc,
      href: "/admin/events",
      icon: Plus,
      color: "bg-brand-50 text-brand-600 group-hover:bg-brand-100",
      hover: "hover:border-brand-400 hover:bg-brand-50",
      arrow: "group-hover:text-brand-500",
    },
    {
      title: copy.quickCertificates,
      description: copy.quickCertificatesDesc,
      href: "/admin/events",
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
      hover: "hover:border-emerald-400 hover:bg-emerald-50",
      arrow: "group-hover:text-emerald-500",
    },
    {
      title: copy.quickEmail,
      description: copy.quickEmailDesc,
      href: "/admin/email-dashboard",
      icon: Send,
      color: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
      hover: "hover:border-blue-400 hover:bg-blue-50",
      arrow: "group-hover:text-blue-500",
    },
    {
      title: copy.quickSettings,
      description: copy.quickSettingsDesc,
      href: "/admin/settings",
      icon: Settings,
      color: "bg-purple-50 text-purple-600 group-hover:bg-purple-100",
      hover: "hover:border-purple-400 hover:bg-purple-50",
      arrow: "group-hover:text-purple-500",
    },
  ];

  return (
    <div className="flex flex-col gap-8 pb-20">
      <PageHeader
        title="Dashboard"
        subtitle={copy.subtitle}
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <>
            <Link href="/admin/events" className="btn-secondary">
              {copy.eventsViewAll}
            </Link>
            <Link href="/admin/email-dashboard" className="btn-primary">
              {copy.quickEmail}
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard label={copy.totalEvents} value={stats.total_events} icon={<Calendar className="h-5 w-5 text-purple-600" />} iconBg="bg-purple-50 text-purple-600" delay={0} />
        <StatCard label={copy.totalCertificates} value={stats.total_certs} icon={<Award className="h-5 w-5 text-brand-600" />} iconBg="bg-brand-50 text-brand-600" delay={0.05} />
        <StatCard label={copy.active} value={stats.active_certs} icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} iconBg="bg-emerald-50 text-emerald-600" delay={0.1} />
        <StatCard label={copy.revoked} value={stats.revoked_certs} icon={<ShieldOff className="h-5 w-5 text-rose-600" />} iconBg="bg-rose-50 text-rose-600" delay={0.15} />
        <StatCard label={copy.expired} value={stats.expired_certs} icon={<Clock className="h-5 w-5 text-amber-600" />} iconBg="bg-amber-50 text-amber-600" delay={0.2} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="card p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.workspaceLabel}</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-surface-900">{copy.actionHubTitle}</h2>
            </div>
            <div className="rounded-full border border-surface-200 bg-surface-50 px-3 py-1 text-xs font-semibold text-surface-500">
              {stats.total_events} {copy.totalEvents.toLowerCase()}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href} className={`card group flex items-center gap-3 p-4 transition-all ${action.hover}`}>
                  <div className={`rounded-2xl p-3 transition ${action.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-surface-700">{action.title}</p>
                    <p className="text-xs text-surface-500">{action.description}</p>
                  </div>
                  <ArrowRight className={`h-4 w-4 text-surface-400 transition ${action.arrow}`} />
                </Link>
              );
            })}
          </div>
        </motion.section>

        <motion.aside initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="card p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-bold text-surface-700">
              <TrendingUp className="h-4 w-4 text-brand-500" /> {copy.activeRate}
            </p>
            <span className="text-lg font-extrabold text-emerald-600">{activePercent}%</span>
          </div>
          <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-surface-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${activePercent}%` }}
              transition={{ delay: 0.35, duration: 0.8, ease: "easeOut" }}
              className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> {copy.active} {stats.active_certs}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-rose-700">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500" /> {copy.revokeShort} {stats.revoked_certs}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-amber-700">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" /> {copy.expired} {stats.expired_certs}
            </span>
          </div>

          {stats.expired_certs > 0 ? (
            <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <h3 className="font-bold text-amber-900">{copy.expiredTitle}</h3>
                  <p className="mt-1 text-sm leading-6 text-amber-800">{copy.expiredBody(stats.expired_certs)}</p>
                  <Link href="/admin/events" className="mt-3 inline-flex text-sm font-semibold text-amber-700 hover:underline">
                    {copy.reviewCertificates}
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-emerald-900">{copy.activeRate}</h3>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">
                    {lang === "tr" ? "Sertifika sagligi simdilik temiz gorunuyor." : "Certificate health looks clean for now."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.aside>
      </div>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-surface-700">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-50 text-surface-500 shadow-soft">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.overviewLabel}</p>
              <h2 className="text-2xl font-black tracking-tight text-surface-900">{copy.recentEvents}</h2>
            </div>
          </div>
          {stats.events_with_stats.length > 0 && (
            <Link href="/admin/events" className="btn-secondary">
              {copy.eventsViewAll}
            </Link>
          )}
        </div>

        {stats.events_with_stats.length === 0 ? (
          <div className="card p-12 text-center text-sm text-surface-400">{copy.noEvents}</div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {stats.events_with_stats.slice(0, 6).map((ev, i) => {
              const evActive = ev.total > 0 ? Math.round((ev.active / ev.total) * 100) : 0;
              return (
                <motion.div
                  key={ev.event_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.36 + i * 0.04 }}
                  className="card p-5 sm:p-6"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/admin/events/${ev.event_id}/certificates`} className="block truncate text-base font-bold text-surface-900 transition-colors hover:text-brand-600">
                          {ev.event_name || (ev as any).name || copy.eventFallback(ev.event_id)}
                        </Link>
                        <p className="mt-1 text-sm text-surface-500">{copy.total}: {ev.total}</p>
                      </div>
                      <span className="rounded-full border border-surface-200 bg-surface-50 px-3 py-1 text-xs font-semibold text-surface-500">
                        {evActive}% {copy.active.toLowerCase()}
                      </span>
                    </div>

                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-100">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${evActive}%` }} transition={{ delay: 0.42 + i * 0.04, duration: 0.6 }} className="h-2.5 rounded-full bg-emerald-500" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                      <div className="rounded-2xl bg-emerald-50 px-3 py-3 text-center text-emerald-700">
                        <div>{ev.active}</div>
                        <div className="mt-1 text-[11px]">{copy.active}</div>
                      </div>
                      <div className="rounded-2xl bg-rose-50 px-3 py-3 text-center text-rose-700">
                        <div>{ev.revoked}</div>
                        <div className="mt-1 text-[11px]">{copy.revoked}</div>
                      </div>
                      <div className="rounded-2xl bg-amber-50 px-3 py-3 text-center text-amber-700">
                        <div>{ev.expired}</div>
                        <div className="mt-1 text-[11px]">{copy.expired}</div>
                      </div>
                    </div>

                    <Link href={`/admin/events/${ev.event_id}/certificates`} className="btn-secondary justify-center">
                      {copy.reviewCertificates}
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>
    </div>
  );
}
