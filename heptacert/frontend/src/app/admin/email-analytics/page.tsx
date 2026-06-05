"use client";

import { useEffect, useState } from "react";
import { Mail, TrendingUp, Loader2, AlertCircle, Send, BarChart3, MousePointerClick, Eye, Percent } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/Admin/PageHeader";
import { FeatureGate } from "@/lib/useSubscription";
import EmptyState from "@/components/Admin/EmptyState";
import { useI18n } from "@/lib/i18n";

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
    <FeatureGate requiredPlans={["growth", "enterprise"]}>
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
          <div className="rounded-xl border border-red-100 bg-red-50/40 p-4 text-xs font-semibold text-red-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 30 GÜNLÜK TRACKING ÖZET KARTLARI */}
        {summary && summary.total_sent > 0 && (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: lang === "tr" ? "Gönderilen" : "Sent", value: summary.total_sent.toLocaleString(), icon: Send, color: "text-surface-700" },
              { label: lang === "tr" ? "Tekil Açılma" : "Unique Opens", value: summary.unique_opens.toLocaleString(), icon: Eye, color: "text-blue-600" },
              { label: lang === "tr" ? "Tekil Tıklama" : "Unique Clicks", value: summary.unique_clicks.toLocaleString(), icon: MousePointerClick, color: "text-violet-600" },
              { label: lang === "tr" ? "Açılma Oranı" : "Open Rate", value: `${summary.open_rate}%`, icon: Percent, color: "text-emerald-600" },
              { label: lang === "tr" ? "Tıklama Oranı" : "Click Rate", value: `${summary.click_rate}%`, icon: Percent, color: "text-amber-600" },
              { label: "CTOR", value: `${summary.click_to_open_rate}%`, icon: TrendingUp, color: "text-rose-600" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl border border-surface-100 bg-white p-3.5 shadow-sm">
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
        <div className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm flex items-start gap-3">
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
            className="w-full rounded-2xl border border-surface-200 bg-white shadow-sm overflow-hidden"
          >
            {/* Liste Başlığı */}
            <div className="border-b border-surface-100 px-5 py-4 bg-white">
              <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.events}</h2>
              <p className="mt-1 text-11 font-medium text-surface-400">{copy.chooseEvent(events.length)}</p>
            </div>
            
            {/* Satır Akış Modülü */}
            <div className="divide-y divide-gray-100 bg-white">
              {events.map((event) => (
                <div key={event.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface-50/40">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-bold text-surface-900 tracking-tight">{event.name}</p>
                    {event.event_date && (
                      <p className="text-11 font-semibold text-surface-400 font-mono uppercase">
                        {new Date(event.event_date).toLocaleDateString(copy.locale, { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  
                  {/* Aksiyon Buton Setleri */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <Link 
                      href={`/admin/events/${event.id}/bulk-emails`} 
                      className="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-11 font-semibold text-surface-700 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 active:scale-95"
                    >
                      <Send className="h-3 w-3 text-surface-400 group-hover:text-surface-600 stroke-[2]" /> 
                      <span>{copy.bulkEmail}</span>
                    </Link>
                    <Link 
                      href={`/admin/events/${event.id}/advanced-analytics`} 
                      className="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-11 font-semibold text-surface-700 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 active:scale-95"
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