"use client";

import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  TrendingUp,
  Award,
  Plus,
  Send,
  ArrowRight,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import { StatCard } from "@/components/Admin/StatCard";
import PageHeader from "@/components/Admin/PageHeader";
import { useI18n } from "@/lib/i18n";
import { EmptyState as AdminEmptyState } from "@/components/Admin/AdminState";

type EventStat = {
  event_id: number;
  event_name?: string;
  name?: string;
  active?: number;
  revoked?: number;
  expired?: number;
  total?: number;
  active_count?: number;
  revoked_count?: number;
  expired_count?: number;
  cert_count?: number;
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
      title: "Dashboard",
      subtitle: "Genel bakış ve hızlı erişim",
      loadError: "İstatistikler yüklenemedi.",
      totalEvents: "Toplam Etkinlik",
      totalCertificates: "Toplam Sertifika",
      activeCerts: "Aktif Sertifika",
      activeRate: "Aktif Oran",
      active: "Aktif",
      revoked: "İptal",
      expired: "Süresi Dolmuş",
      expiredTitle: "Süresi Dolmuş Sertifikalar",
      expiredBody: (count: number) =>
        `${count} sertifikanın süresi dolmuş. Lütfen gözden geçirin.`,
      reviewCertificates: "Sertifikaları İncele →",
      certHealthTitle: "Sertifika Sağlığı",
      recentEvents: "Son Etkinlikler",
      noEvents: "Henüz etkinlik yok",
      noEventsDesc:
        "İlk etkinliğini oluşturun; sertifika ve katılımcı istatistikleri burada görünecek.",
      eventFallback: (id: number) => `Etkinlik #${id}`,
      eventsViewAll: "Tüm Etkinlikler",
      newEvent: "Yeni Etkinlik",
      emailCampaigns: "E-posta Kampanyaları",
      quickActions: "Hızlı Erişim",
      eventDetails: "Etkinlik Detayları",
      certCount: "sertifika",
      allHealthy: "Sertifika sağlığı temiz.",
    },
    en: {
      title: "Dashboard",
      subtitle: "Overview and quick access",
      loadError: "Failed to load statistics.",
      totalEvents: "Total Events",
      totalCertificates: "Total Certificates",
      activeCerts: "Active Certificates",
      activeRate: "Active Rate",
      active: "Active",
      revoked: "Revoked",
      expired: "Expired",
      expiredTitle: "Expired Certificates",
      expiredBody: (count: number) =>
        `${count} certificates have expired. Please review them.`,
      reviewCertificates: "Review Certificates →",
      certHealthTitle: "Certificate Health",
      recentEvents: "Recent Events",
      noEvents: "No events yet",
      noEventsDesc:
        "Create your first event — certificate and attendee stats will appear here.",
      eventFallback: (id: number) => `Event #${id}`,
      eventsViewAll: "All Events",
      newEvent: "New Event",
      emailCampaigns: "Email Campaigns",
      quickActions: "Quick Access",
      eventDetails: "Event Details",
      certCount: "certificates",
      allHealthy: "Certificate health looks clean.",
    },
  }[lang];

  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch("/admin/dashboard/stats");
        setStats(await r.json());
      } catch (e: unknown) {
        const message = (e as { message?: string })?.message || copy.loadError;
        setErr(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex w-full flex-col gap-5 pb-16 antialiased">
        <PageHeader title={copy.title} subtitle={copy.subtitle} />
        <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="w-full rounded-xl border border-surface-100 bg-white p-5 shadow-card animate-pulse"
            >
              <div className="space-y-2.5">
                <div className="h-2.5 w-16 rounded bg-surface-100" />
                <div className="h-6 w-12 rounded bg-surface-100" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
          <div className="rounded-xl border border-surface-100 bg-white h-64 animate-pulse shadow-card" />
          <div className="rounded-xl border border-surface-100 bg-white h-64 animate-pulse shadow-card" />
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────
  if (err || !stats) {
    return (
      <div className="error-banner">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{err || copy.loadError}</span>
      </div>
    );
  }

  const activePercent =
    stats.total_certs > 0
      ? Math.round((stats.active_certs / stats.total_certs) * 100)
      : 0;

  const normalizedEvents = (stats.events_with_stats || []).map((ev) => ({
    event_id: ev.event_id,
    event_name:
      ev.event_name || ev.name || copy.eventFallback(ev.event_id),
    total: Number(ev.total ?? ev.cert_count ?? 0),
    active: Number(ev.active ?? ev.active_count ?? 0),
    revoked: Number(ev.revoked ?? ev.revoked_count ?? 0),
    expired: Number(ev.expired ?? ev.expired_count ?? 0),
  }));

  const quickActions = [
    {
      label: copy.newEvent,
      href: "/admin/events",
      icon: Plus,
    },
    {
      label: copy.emailCampaigns,
      href: "/admin/email-dashboard",
      icon: Send,
    },
    {
      label: copy.eventsViewAll,
      href: "/admin/events",
      icon: BarChart3,
    },
  ];

  return (
    <div className="flex w-full flex-col gap-6 pb-16 antialiased">
      {/* Page header */}
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        actions={
          <Link href="/admin/events" className="btn-primary">
            <Plus className="h-4 w-4" />
            {copy.newEvent}
          </Link>
        }
      />

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <StatCard
          label={copy.totalEvents}
          value={stats.total_events}
          icon={<Calendar className="h-4 w-4 stroke-[1.8]" />}
          delay={0}
        />
        <StatCard
          label={copy.totalCertificates}
          value={stats.total_certs}
          icon={<Award className="h-4 w-4 stroke-[1.8]" />}
          delay={0.04}
        />
        <StatCard
          label={copy.activeCerts}
          value={stats.active_certs}
          icon={<CheckCircle2 className="h-4 w-4 stroke-[2]" />}
          iconBg="bg-emerald-50 border border-emerald-100 text-emerald-600"
          delay={0.08}
        />
        <StatCard
          label={copy.activeRate}
          value={`${activePercent}%`}
          icon={<TrendingUp className="h-4 w-4 stroke-[1.8]" />}
          iconBg={
            activePercent >= 90
              ? "bg-emerald-50 border border-emerald-100 text-emerald-600"
              : activePercent >= 70
              ? "bg-amber-50 border border-amber-100 text-amber-600"
              : "bg-red-50 border border-red-100 text-red-600"
          }
          delay={0.12}
        />
      </div>

      {/* Main content: Recent Events + Side panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_288px]">
        {/* Recent Events */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.2, ease: "easeOut" }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-surface-900">
              {copy.recentEvents}
            </h2>
            {normalizedEvents.length > 0 && (
              <Link
                href="/admin/events"
                className="flex items-center gap-1 text-xs font-medium text-surface-500 transition-colors hover:text-surface-900"
              >
                {copy.eventsViewAll}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {normalizedEvents.length === 0 ? (
            <AdminEmptyState
              icon={<Calendar className="h-5 w-5 stroke-[1.5]" />}
              title={copy.noEvents}
              description={copy.noEventsDesc}
              action={
                <Link href="/admin/events" className="btn-primary">
                  <Plus className="h-4 w-4" />
                  {copy.newEvent}
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col divide-y divide-surface-100 overflow-hidden rounded-xl border border-surface-200 bg-white shadow-card">
              {normalizedEvents.slice(0, 6).map((ev, i) => (
                <motion.div
                  key={ev.event_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.18 + i * 0.03 }}
                  className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-surface-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-surface-900 group-hover:text-surface-700">
                      {ev.event_name}
                    </p>
                    <p className="mt-0.5 text-xs text-surface-400">
                      {ev.total} {copy.certCount}
                      {ev.active > 0 && (
                        <span className="ml-2 text-emerald-600">
                          · {ev.active} {copy.active.toLowerCase()}
                        </span>
                      )}
                      {ev.expired > 0 && (
                        <span className="ml-2 text-amber-600">
                          · {ev.expired} {copy.expired.toLowerCase()}
                        </span>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/admin/events/${ev.event_id}`}
                    className="btn-ghost shrink-0 text-xs"
                  >
                    {copy.eventDetails}
                    <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* Right side panel */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.2, ease: "easeOut" }}
          className="flex flex-col gap-4"
        >
          {/* Quick Actions */}
          <div className="rounded-xl border border-surface-200 bg-white shadow-card">
            <div className="border-b border-surface-100 px-4 py-3">
              <p className="text-11 font-semibold uppercase tracking-wider text-surface-400">
                {copy.quickActions}
              </p>
            </div>
            <div className="p-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-surface-700 transition-colors hover:bg-surface-50 hover:text-surface-900"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-surface-400" />
                    {action.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Certificate Health */}
          <div className="rounded-xl border border-surface-200 bg-white shadow-card">
            <div className="border-b border-surface-100 px-4 py-3">
              <p className="text-11 font-semibold uppercase tracking-wider text-surface-400">
                {copy.certHealthTitle}
              </p>
            </div>
            <div className="p-4 space-y-4">
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-surface-500">{copy.active}</span>
                  <span className="text-sm font-semibold text-surface-900">
                    {activePercent}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${activePercent}%` }}
                    transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
                    className="h-full rounded-full bg-surface-900"
                  />
                </div>
              </div>

              {/* Counts */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-surface-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {copy.active}
                  </span>
                  <span className="font-medium text-surface-700">{stats.active_certs}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-surface-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    {copy.revoked}
                  </span>
                  <span className="font-medium text-surface-700">{stats.revoked_certs}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-surface-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {copy.expired}
                  </span>
                  <span className="font-medium text-surface-700">{stats.expired_certs}</span>
                </div>
              </div>

              {/* Alert */}
              {stats.expired_certs > 0 ? (
                <div className="warning-banner">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-semibold">{copy.expiredTitle}</p>
                    <p className="mt-0.5 text-11 leading-relaxed">
                      {copy.expiredBody(stats.expired_certs)}
                    </p>
                    <Link
                      href="/admin/events"
                      className="mt-1.5 block text-11 font-semibold hover:underline"
                    >
                      {copy.reviewCertificates}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="success-banner">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <p>{copy.allHealthy}</p>
                </div>
              )}
            </div>
          </div>

          {/* Expiring soon reminder */}
          {stats.expired_certs === 0 && stats.revoked_certs === 0 && (
            <div className="rounded-xl border border-surface-150 bg-surface-50 p-4">
              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 shrink-0 text-surface-400 mt-0.5" />
                <p className="text-xs leading-relaxed text-surface-500">
                  {lang === "tr"
                    ? "Sertifika süresi takibi için periyodik kontrol yapmanızı öneririz."
                    : "We recommend periodic reviews to keep certificate statuses current."}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
