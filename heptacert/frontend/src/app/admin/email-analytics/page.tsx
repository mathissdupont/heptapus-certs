"use client";

import { useEffect, useState } from "react";
import { Mail, TrendingUp, Loader2, AlertCircle, Send, BarChart3 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/Admin/PageHeader";
import { FeatureGate } from "@/lib/useSubscription";
import EmptyState from "@/components/Admin/EmptyState";
import { useI18n } from "@/lib/i18n";

type Event = { id: number; name: string; event_date: string | null };

export default function EmailAnalyticsPage() {
  const { lang } = useI18n();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = {
    tr: {
      loadFailed: "Etkinlikler yüklenemedi",
      title: "E-posta Analitik",
      subtitle: "Etkinlik bazlı e-posta teslimat ve performans takibi",
      center: "E-posta Merkezi",
      info: "E-posta analitikleri etkinlik bazında takip edilir. Aşağıdan bir etkinlik seçerek toplu e-posta iş geçmişini ve teslimat istatistiklerini inceleyebilirsiniz.",
      emptyTitle: "Henüz etkinlik yok",
      emptyBody: "E-posta analitiği görüntülemek için önce bir etkinlik oluşturun",
      goEvents: "Etkinliklere Git",
      events: "Etkinlikler",
      chooseEvent: (count: number) => `${count} etkinlik · Analitik için etkinlik seçin`,
      bulkEmail: "Toplu E-posta",
      analytics: "Analitik",
      locale: "tr-TR",
    },
    en: {
      loadFailed: "Failed to load events",
      title: "Email Analytics",
      subtitle: "Track delivery and performance by event",
      center: "Email Center",
      info: "Email analytics are tracked per event. Choose an event below to review bulk email job history and delivery metrics.",
      emptyTitle: "No events yet",
      emptyBody: "Create an event first to view email analytics",
      goEvents: "Go to Events",
      events: "Events",
      chooseEvent: (count: number) => `${count} events · Choose an event for analytics`,
      bulkEmail: "Bulk Email",
      analytics: "Analytics",
      locale: "en-US",
    },
  }[lang];

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setError(null);
      const res = await apiFetch("/admin/events");
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || copy.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <FeatureGate requiredPlans={["growth", "enterprise"]}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={copy.title}
          subtitle={copy.subtitle}
          icon={<TrendingUp className="h-5 w-5" />}
          breadcrumbs={[{ label: copy.center, href: "/admin/email-dashboard" }, { label: copy.title }]}
        />

        {error && (
          <div className="error-banner">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="card flex items-start gap-3 border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <p>{copy.info}</p>
        </div>

        {events.length === 0 ? (
          <EmptyState
            icon={<Mail className="h-7 w-7" />}
            title={copy.emptyTitle}
            description={copy.emptyBody}
            action={<Link href="/admin/events" className="btn-primary">{copy.goEvents}</Link>}
          />
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
            <div className="border-b border-surface-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-surface-900">{copy.events}</h2>
              <p className="mt-0.5 text-xs text-surface-400">{copy.chooseEvent(events.length)}</p>
            </div>
            <div className="divide-y divide-surface-100">
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-surface-50">
                  <div>
                    <p className="font-medium text-surface-900">{event.name}</p>
                    {event.event_date && (
                      <p className="mt-0.5 text-xs text-surface-400">
                        {new Date(event.event_date).toLocaleDateString(copy.locale, { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/events/${event.id}/bulk-emails`} className="btn-secondary flex items-center gap-1 px-3 py-1.5 text-xs">
                      <Send className="h-3.5 w-3.5" /> {copy.bulkEmail}
                    </Link>
                    <Link href={`/admin/events/${event.id}/analytics`} className="btn-secondary flex items-center gap-1 px-3 py-1.5 text-xs">
                      <BarChart3 className="h-3.5 w-3.5" /> {copy.analytics}
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
