"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useState } from "react";
import { Mail, TrendingUp, Loader2, AlertCircle, Send, BarChart3, MousePointerClick, Eye, Percent } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/Admin/PageHeader";
import { FeatureGate } from "@/lib/useSubscription";
import EmptyState from "@/components/Admin/EmptyState";
import { useI18n, translate } from "@/lib/i18n";

type Event = { id: number; name: string; event_date: string | null };

type TrackingSummary = {
  total_sent: number;
  unique_opens: number;
  unique_clicks: number;
  open_rate: number;
  click_rate: number;
  click_to_open_rate: number;
  days: number;
};

export default function EmailAnalyticsPage() {
  const { lang } = useI18n();
  const [events, setEvents] = useState<Event[]>([]);
  const [summary, setSummary] = useState<TrackingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = { loadFailed: translate(lang, "migrated_app_admin_email_analytics_failed_to_load_events_361d7c71"), title: translate(lang, "migrated_app_admin_email_analytics_email_analytics_b9ba5a21"), subtitle: translate(lang, "migrated_app_admin_email_analytics_track_delivery_and_performance_by_event_e47250be"), center: translate(lang, "migrated_app_admin_email_analytics_email_center_801ba3d1"), info: translate(lang, "migrated_app_admin_email_analytics_email_analytics_are_tracked_per_event_choo_a83a4d10"), emptyTitle: translate(lang, "migrated_app_admin_email_analytics_no_events_yet_34dad637"), emptyBody: translate(lang, "migrated_app_admin_email_analytics_create_an_event_first_to_view_email_analyt_69cba607"), goEvents: translate(lang, "migrated_app_admin_email_analytics_go_to_events_131f12ce"), events: translate(lang, "migrated_app_admin_email_analytics_events_ff35fd18"), chooseEvent: (count: number) => translate(lang, "migrated_app_admin_email_analytics_value0_events_choose_an_event_for_analytic_e03084b5", { value0: count }), bulkEmail: translate(lang, "migrated_app_admin_email_analytics_bulk_email_4ed73881"), analytics: translate(lang, "migrated_app_admin_email_analytics_analytics_03ae6a4f") };

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setError(null);
      const [evRes, sumRes] = await Promise.all([
        apiFetch("/admin/events"),
        apiFetch("/admin/email-analytics/summary?days=30").catch(() => null),
      ]);
      const data = await evRes.json();
      setEvents(Array.isArray(data) ? data : []);
      if (sumRes) setSummary(await sumRes.json().catch(() => null));
    } catch (e: any) {
      setError(e?.message || copy.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center p-24">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400 stroke-[2.5]" />
      </div>
    );
  }

  return (
    <FeatureGate featureKey="advanced_analytics">
      <div className="flex w-full flex-col gap-5 antialiased text-surface-900">

        {/* SAYFA BAŞLIĞI */}
        <PageHeader
          title={copy.title}
          subtitle={copy.subtitle}
          icon={<TrendingUp className="h-4 w-4 stroke-[2]" />}
          breadcrumbs={[{ label: copy.center, href: "/admin/email-dashboard" }, { label: copy.title }]}
        />

        {/* HATA BANNERI */}
        {error && (
          <div className="rounded-xl border border-status-danger-border bg-status-danger-bg/40 p-4 text-xs font-semibold text-status-danger-content flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 30 GÜNLÜK TRACKING ÖZET KARTLARI */}
        {summary && summary.total_sent > 0 && (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: translate(lang, "migrated_app_admin_email_analytics_sent_1b43f2d1"), value: summary.total_sent.toLocaleString(), icon: Send, color: "text-surface-700" },
              { label: translate(lang, "migrated_app_admin_email_analytics_unique_opens_38d0a121"), value: summary.unique_opens.toLocaleString(), icon: Eye, color: "text-status-info-content" },
              { label: translate(lang, "migrated_app_admin_email_analytics_unique_clicks_03be1dc0"), value: summary.unique_clicks.toLocaleString(), icon: MousePointerClick, color: "text-status-info-content" },
              { label: translate(lang, "migrated_app_admin_email_analytics_open_rate_1b6d1ecd"), value: `${summary.open_rate}%`, icon: Percent, color: "text-status-success-content" },
              { label: translate(lang, "migrated_app_admin_email_analytics_click_rate_12d216f4"), value: `${summary.click_rate}%`, icon: Percent, color: "text-status-warning-content" },
              { label: "CTOR", value: `${summary.click_to_open_rate}%`, icon: TrendingUp, color: "text-status-danger-content" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl border border-surface-100 bg-raised p-3.5 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <p className="text-11 font-bold uppercase tracking-wider text-surface-400">{label}</p>
                </div>
                <p className={`text-xl font-black tracking-tight ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* REHBER BİLGİ KUTUSU (Apple Tarzı Soft Kart) */}
        <div className="rounded-2xl border border-surface-200 bg-raised p-4 shadow-sm flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-surface-100 bg-surface-50 text-surface-900 shadow-sm">
            <Mail className="h-4 w-4 stroke-[1.8]" />
          </div>
          <p className="text-xs leading-relaxed text-surface-500 font-medium pt-0.5">
            {copy.info}
          </p>
        </div>

        {/* ETKİNLİK LİSTESİ VEYA BOŞ DURUM ALANI */}
        {events.length === 0 ? (
          <EmptyState
            icon={<Mail className="h-5 w-5 stroke-[1.5]" />}
            title={copy.emptyTitle}
            description={copy.emptyBody}
            action={
              <Link href="/admin/events" className="inline-flex min-h-[34px] items-center justify-center rounded-lg bg-surface-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-surface-800">
                {copy.goEvents}
              </Link>
            }
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl border border-surface-200 bg-raised shadow-sm overflow-hidden"
          >
            {/* Liste Başlığı */}
            <div className="border-b border-surface-100 px-5 py-4 bg-raised">
              <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.events}</h2>
              <p className="mt-1 text-11 font-medium text-surface-400">{copy.chooseEvent(events.length)}</p>
            </div>

            {/* Satır Akış Modülü */}
            <div className="divide-y divide-outline-subtle bg-raised">
              {events.map((event) => (
                <div key={event.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface-50/40">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-bold text-surface-900 tracking-tight">{event.name}</p>
                    {event.event_date && (
                      <p className="text-11 font-semibold text-surface-400 font-mono uppercase">
                        {new Date(event.event_date).toLocaleDateString(localeTag(lang), { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>

                  {/* Aksiyon Buton Setleri */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <Link
                      href={`/admin/events/${event.id}/bulk-emails`}
                      className="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg border border-surface-200 bg-raised px-3 py-1.5 text-11 font-semibold text-surface-700 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 active:scale-95"
                    >
                      <Send className="h-3 w-3 text-surface-400 group-hover:text-surface-600 stroke-[2]" />
                      <span>{copy.bulkEmail}</span>
                    </Link>
                    <Link
                      href={`/admin/events/${event.id}/advanced-analytics`}
                      className="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg border border-surface-200 bg-raised px-3 py-1.5 text-11 font-semibold text-surface-700 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 active:scale-95"
                    >
                      <BarChart3 className="h-3 w-3 text-surface-400 group-hover:text-surface-600 stroke-[2]" />
                      <span>{copy.analytics}</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </FeatureGate>
  );
}
