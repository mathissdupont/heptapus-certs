"use client";

import { useEffect, useState } from "react";
import { Mail, TrendingUp, Loader2, AlertCircle, Send, BarChart3, ChevronRight } from "lucide-react";
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
      <div className="flex w-full items-center justify-center p-24">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400 stroke-[2.5]" />
      </div>
    );
  }

  return (
    <FeatureGate requiredPlans={["growth", "enterprise"]}>
      <div className="flex w-full flex-col gap-5 antialiased text-gray-900">
        
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

        {/* REHBER BİLGİ KUTUSU (Apple Tarzı Soft Kart) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-900 shadow-sm">
            <Mail className="h-4 w-4 stroke-[1.8]" />
          </div>
          <p className="text-xs leading-relaxed text-gray-500 font-medium pt-0.5">
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
              <Link href="/admin/events" className="inline-flex min-h-[34px] items-center justify-center rounded-xl bg-gray-950 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-900">
                {copy.goEvents}
              </Link>
            }
          />
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
          >
            {/* Liste Başlığı */}
            <div className="border-b border-gray-100 px-5 py-4 bg-white">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">{copy.events}</h2>
              <p className="mt-1 text-[11px] font-medium text-gray-400">{copy.chooseEvent(events.length)}</p>
            </div>
            
            {/* Satır Akış Modülü */}
            <div className="divide-y divide-gray-100 bg-white">
              {events.map((event) => (
                <div key={event.id} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-gray-50/40">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-bold text-gray-950 tracking-tight">{event.name}</p>
                    {event.event_date && (
                      <p className="text-[10px] font-semibold text-gray-400 font-mono uppercase">
                        {new Date(event.event_date).toLocaleDateString(copy.locale, { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  
                  {/* Aksiyon Buton Setleri */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <Link 
                      href={`/admin/events/${event.id}/bulk-emails`} 
                      className="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-950 active:scale-95"
                    >
                      <Send className="h-3 w-3 text-gray-400 group-hover:text-gray-600 stroke-[2]" /> 
                      <span>{copy.bulkEmail}</span>
                    </Link>
                    <Link 
                      href={`/admin/events/${event.id}/advanced-analytics`} 
                      className="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-950 active:scale-95"
                    >
                      <BarChart3 className="h-3 w-3 text-gray-400 group-hover:text-gray-600 stroke-[2]" /> 
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