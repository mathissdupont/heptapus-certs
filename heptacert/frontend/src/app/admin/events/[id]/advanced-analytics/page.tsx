"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  Award,
  BarChart3,
  Badge,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Percent,
  QrCode,
  Target,
  Ticket,
  TrendingUp,
  UserCheck,
  Users,
  ChevronDown,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PlanGateCard, isPlanGateError, useSubscription } from "@/lib/useSubscription";
import EventAdminNav from "@/components/Admin/EventAdminNav";

type EngagementAnalytics = {
  event_type?: string;
  certificate_enabled?: boolean;
  checkin_enabled?: boolean;
  ticketing_enabled?: boolean;
  registration_enabled?: boolean;
  raffles_enabled?: boolean;
  gamification_enabled?: boolean;
  total_attendees: number;
  survey_completion: {
    completed: number;
    pending: number;
    completion_rate: number;
  };
  badges: {
    total_awarded: number;
    average_per_attendee: number;
  };
  attendance: {
    attended: number;
    not_attended: number;
    attendance_rate: number;
    no_show_rate?: number;
  };
  tickets?: {
    total: number;
    active_total?: number;
    issued: number;
    used: number;
    cancelled: number;
    revoked: number;
    no_show?: number;
    no_show_rate?: number;
    usage_rate: number;
  };
};

type BadgeAnalytics = {
  by_type: Record<string, number>;
  by_award_method: {
    automatic: number;
    manual: number;
  };
  total_badges: number;
};

type TierAnalytics = {
  total_certificates: number;
  tier_distribution: Record<string, { count: number; percentage: number }>;
  unassigned_count: number;
  verification_hits?: number;
  verified_certificates?: number;
  verification_rate?: number;
};

type TimelineAnalytics = {
  event_type?: string;
  ticketing_enabled?: boolean;
  certificate_enabled?: boolean;
  checkin_enabled?: boolean;
  registrations: Array<{ date: string; count: number }>;
  survey_completions: Array<{ date: string; count: number }>;
  certificate_creations: Array<{ date: string; count: number }>;
  ticket_checkins?: Array<{ date: string; count: number }>;
};

type StatTone = "brand" | "emerald" | "amber" | "sky";

function toneStyles(tone: StatTone) {
  switch (tone) {
    case "emerald":
      return "border-emerald-100 bg-emerald-50/50 text-emerald-600";
    case "amber":
      return "border-amber-100 bg-amber-50/50 text-amber-600";
    case "sky":
      return "border-sky-100 bg-sky-50/50 text-sky-600";
    default:
      return "border-gray-100 bg-gray-50 text-gray-900";
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  caption,
  tone = "brand",
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  caption?: string;
  tone?: StatTone;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm antialiased"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 truncate">{label}</p>
          <h3 className="text-2xl font-bold tracking-tight text-gray-950 tabular-nums">{value}</h3>
          {caption && <p className="text-[11px] font-medium text-gray-400 leading-normal pt-1">{caption}</p>}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-sm ${toneStyles(tone)}`}>
          <Icon className="h-4 w-4 stroke-[2]" />
        </div>
      </div>
    </motion.div>
  );
}

function TimelineCard({
  icon: Icon,
  title,
  items,
  emptyText,
  tone,
}: {
  icon: ElementType;
  title: string;
  items: Array<{ date: string; count: number }>;
  emptyText: string;
  tone: StatTone;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm antialiased flex flex-col">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-50 border border-gray-100 shadow-sm text-gray-900">
          <Icon className="h-3.5 w-3.5 stroke-[2]" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-950">{title}</h3>
      </div>
      <div className="mt-3.5 space-y-1.5 flex-1 max-h-[320px] overflow-y-auto scrollbar-none">
        {items.length === 0 ? (
          <p className="text-xs font-medium text-gray-400 py-4">{emptyText}</p>
        ) : (
          items.slice(0, 6).map((item) => (
            <div key={`${title}-${item.date}`} className="flex items-center justify-between rounded-xl border border-gray-100/50 bg-gray-50/30 px-3.5 py-2.5 text-xs font-medium">
              <span className="text-gray-400 font-mono">{item.date}</span>
              <span className="font-bold text-gray-950 tabular-nums">{item.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AdvancedAnalyticsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { loading: subscriptionLoading, hasPlan } = useSubscription();
  const canViewAnalytics = hasPlan(["growth", "enterprise"]);

  const [engagement, setEngagement] = useState<EngagementAnalytics | null>(null);
  const [badges, setBadges] = useState<BadgeAnalytics | null>(null);
  const [tiers, setTiers] = useState<TierAnalytics | null>(null);
  const [timeline, setTimeline] = useState<TimelineAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planGateMessage, setPlanGateMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"engagement" | "tickets" | "badges" | "tiers" | "timeline">("engagement");

  useEffect(() => {
    if (subscriptionLoading) return;
    if (!canViewAnalytics) {
      setLoading(false);
      setError(null);
      setPlanGateMessage(null);
      return;
    }

    let mounted = true;

    async function loadAnalytics() {
      setLoading(true);
      setError(null);
      setPlanGateMessage(null);

      try {
        const [engRes, badRes, tierRes, timelineRes] = await Promise.all([
          apiFetch(`/admin/events/${eventId}/analytics/engagement`),
          apiFetch(`/admin/events/${eventId}/analytics/badges`),
          apiFetch(`/admin/events/${eventId}/analytics/tiers`),
          apiFetch(`/admin/events/${eventId}/analytics/timeline`),
        ]);

        if (!mounted) return;

        if (engRes.ok) setEngagement((await engRes.json()) as EngagementAnalytics);
        if (badRes.ok) setBadges((await badRes.json()) as BadgeAnalytics);
        if (tierRes.ok) setTiers((await tierRes.json()) as TierAnalytics);
        if (timelineRes.ok) setTimeline((await timelineRes.json()) as TimelineAnalytics);
      } catch (err: any) {
        if (!mounted) return;
        if (err?.status === 403 && isPlanGateError(err?.message)) {
          setPlanGateMessage(err.message);
          setError(null);
        } else {
          setError(err?.message || "Analitikler yüklenemedi");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadAnalytics();

    return () => {
      mounted = false;
    };
  }, [canViewAnalytics, eventId, subscriptionLoading]);

  useEffect(() => {
    if (activeTab === "tickets" && engagement && engagement.ticketing_enabled !== true) setActiveTab("engagement");
    if (activeTab === "tiers" && engagement && engagement.certificate_enabled === false) setActiveTab("engagement");
    if (activeTab === "badges" && engagement && engagement.gamification_enabled === false && (badges?.total_badges ?? 0) === 0) setActiveTab("engagement");
  }, [activeTab, badges?.total_badges, engagement]);

  if (subscriptionLoading || (canViewAnalytics && loading)) {
    return (
      <div className="flex w-full min-h-[380px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400 stroke-[2.5]" />
      </div>
    );
  }

  const isTicketedEvent = engagement?.ticketing_enabled === true;
  const hasCertificates = engagement?.certificate_enabled !== false;
  const hasBadges = engagement?.gamification_enabled !== false || (badges?.total_badges ?? 0) > 0;
  
  const tabs = [
    { id: "engagement" as const, label: "Katılım", icon: Users, visible: true },
    { id: "tickets" as const, label: "Biletler", icon: Ticket, visible: isTicketedEvent },
    { id: "badges" as const, label: "Rozetler", icon: Badge, visible: hasBadges },
    { id: "tiers" as const, label: "Seviyeler", icon: Award, visible: hasCertificates },
    { id: "timeline" as const, label: "Zaman Çizelgesi", icon: Calendar, visible: true },
  ].filter((tab) => tab.visible);

  const overviewCards = engagement
    ? [
        {
          label: "Toplam Katılımcı",
          value: engagement.total_attendees,
          icon: Users,
          tone: "brand" as const,
          caption: "Analitikte takip edilen aktif katılımcı sayısı",
        },
        {
          label: "Katılım Oranı",
          value: `${(engagement.attendance.attendance_rate || 0).toFixed(1)}%`,
          icon: Percent,
          tone: "sky" as const,
          caption: "Check-in bazlı etkin katılım oranı",
        },
        {
          label: "Anket Tamamlama",
          value: `${engagement.survey_completion.completed}/${engagement.total_attendees}`,
          icon: TrendingUp,
          tone: "emerald" as const,
          caption: `%${(engagement.survey_completion.completion_rate || 0).toFixed(1)} tamamlanma`,
        },
        isTicketedEvent && engagement.tickets
          ? {
              label: "Bilet Kullanımı",
              value: `${engagement.tickets.used}/${engagement.tickets.active_total ?? engagement.tickets.total}`,
              icon: Ticket,
              tone: "amber" as const,
              caption: `%${(engagement.tickets.usage_rate || 0).toFixed(1)} biletli giriş`,
            }
          : {
              label: hasBadges ? "Ortalama Rozet" : "Sertifika",
              value: hasBadges ? engagement.badges.average_per_attendee.toFixed(2) : tiers?.total_certificates ?? 0,
              icon: hasBadges ? Badge : Award,
              tone: "amber" as const,
              caption: hasBadges ? "Katılımcı başına ortalama rozet" : "Üretilen sertifika sayısı",
            },
      ]
    : [];

  return (
    <div className="w-full flex flex-col gap-6 pb-16 antialiased text-gray-900">
      
      {/* BAŞLIK GRUBU */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link href={`/admin/events/${eventId}`}>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 active:scale-95 transition-all">
              <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-950 sm:text-2xl">Gelişmiş Analitikler</h1>
            <p className="text-xs text-gray-400">Katılım akış verileri, rozet atamaları ve sertifika metrikleri</p>
          </div>
        </div>
      </div>

      <EventAdminNav eventId={eventId} active="analytics" className="mb-1" />

      {/* PLAN GATE KORUMALARI */}
      {!canViewAnalytics ? (
        <PlanGateCard
          feature="İleri analitik, katılım eğilimleri, rozet dağılımı, sertifika trendleri ve zaman çizelgesi"
          requiredPlans={["growth", "enterprise"]}
        />
      ) : planGateMessage ? (
        <PlanGateCard
          feature="İleri analitik, katılım eğilimleri, rozet dağılımı, sertifika trendleri ve zaman çizelgesi"
          requiredPlans={["growth", "enterprise"]}
          serverMessage={planGateMessage}
        />
      ) : (
        <>
          {/* HATA BANNERI */}
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50/40 p-4 text-xs font-semibold text-red-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TEPE GENEL BAKIŞ STAT KARTLARI GRUBU */}
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((card) => (
              <StatCard key={card.label} icon={card.icon} label={card.label} value={card.value} caption={card.caption} tone={card.tone} />
            ))}
          </div>

          {/* APPLE SEGMENTED CONTROL TASARIMINDA ALT SEKMELER MENÜSÜ */}
          <div className="overflow-x-auto scrollbar-none">
            <div className="flex min-w-max gap-1 border border-gray-200/80 bg-gray-50/60 p-1 rounded-xl lg:min-w-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isAct = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold tracking-tight transition-all ${
                      isAct
                        ? "bg-white text-gray-950 shadow-sm border border-gray-200/60"
                        : "border border-transparent text-gray-500 hover:text-gray-900 hover:bg-white/40"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${isAct ? "text-gray-950 stroke-[2]" : "text-gray-400 stroke-[1.8]"}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB İÇERİKLERİ KATMANI */}
          
          {/* TAB 1: KATILIM VE ANKET RAPORU */}
          {activeTab === "engagement" && engagement && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                  <UserCheck className="h-4 w-4 text-gray-800 stroke-[2]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-950">Katılım Özet Analizi</h3>
                </div>
                <div className="space-y-3.5 text-xs font-semibold text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium">Katılım Gösteren</span>
                    <span className="text-gray-950 tabular-nums">{engagement.attendance.attended}</span>
                  </div>
                  {/* Apple İnce Progress Line */}
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-gray-950 rounded-full" style={{ width: `${Math.min(100, Math.max(0, engagement.attendance.attendance_rate || 0))}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium">Katılmayan</span>
                    <span className="text-gray-950 tabular-nums">{engagement.attendance.not_attended}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                    <span className="text-gray-400 font-medium">Mevcut No-show Oranı</span>
                    <span className="text-red-500 tabular-nums">%{(engagement.attendance.no_show_rate || 0).toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 stroke-[2]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-950">Geri Bildirim Anket Dönüşümü</h3>
                </div>
                <div className="space-y-3.5 text-xs font-semibold text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium">Tamamlanan Form</span>
                    <span className="text-gray-950 tabular-nums">{engagement.survey_completion.completed}</span>
                  </div>
                  {/* Apple İnce Progress Line */}
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-gray-950 rounded-full" style={{ width: `${Math.min(100, Math.max(0, engagement.survey_completion.completion_rate || 0))}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium">Yanıt Bekleyen</span>
                    <span className="text-gray-950 tabular-nums">{engagement.survey_completion.pending}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BİLETLİ GİRİŞ RAPORU */}
          {activeTab === "tickets" && engagement?.tickets && (
            <div className="grid gap-4 lg:grid-cols-2 items-start">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                  <Ticket className="h-4 w-4 text-gray-800 stroke-[2]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-950">Bilet Kullanım Oranı</h3>
                </div>
                <div className="space-y-3.5 text-xs font-semibold text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium">Giriş Yapan Biletli</span>
                    <span className="text-gray-950 tabular-nums">{engagement.tickets.used}</span>
                  </div>
                  {/* Apple İnce Progress Line */}
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-gray-950 rounded-full" style={{ width: `${Math.min(100, Math.max(0, engagement.tickets.usage_rate || 0))}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium">Toplam Dağıtılan Bilet</span>
                    <span className="text-gray-950 tabular-nums">{engagement.tickets.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-medium">Aktif Kontenjanli Bilet</span>
                    <span className="text-gray-950 tabular-nums">{engagement.tickets.active_total ?? engagement.tickets.total}</span>
                  </div>
                </div>
              </div>

              {/* Bilet Alt Matris Dağılım Kartları */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                  <BarChart3 className="h-4 w-4 text-gray-800 stroke-[2]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-950">Segmentasyon Durumları</h3>
                </div>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                  <StatCard icon={Ticket} label="Bekleyen" value={engagement.tickets.issued} tone="sky" />
                  <StatCard icon={CheckCircle2} label="Kullanılan" value={engagement.tickets.used} tone="emerald" />
                  <StatCard icon={Percent} label="No-show" value={engagement.tickets.no_show ?? engagement.tickets.issued} caption={`%${(engagement.tickets.no_show_rate || 0).toFixed(1)}`} tone="amber" />
                  <StatCard icon={AlertCircle} label="İptal" value={engagement.tickets.cancelled} tone="amber" />
                  <StatCard icon={AlertCircle} label="Geri Alınan" value={engagement.tickets.revoked} tone="amber" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OYUNLAŞTIRMA VE ROZET RAPORU */}
          {activeTab === "badges" && badges && (
            <div className="grid gap-4 lg:grid-cols-2 items-start">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                  <Badge className="h-4 w-4 text-gray-800 stroke-[1.8]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-950">Kazanılan Rozet Dağılımı</h3>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-none">
                  {Object.entries(badges.by_type || {}).length === 0 ? (
                    <p className="text-xs font-medium text-gray-400 py-4">Henüz rozet verisi tetiklenmedi.</p>
                  ) : (
                    Object.entries(badges.by_type).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between rounded-xl border border-gray-100/50 bg-gray-50/40 px-4 py-2.5 text-xs font-medium">
                        <span className="text-gray-700">{type}</span>
                        <span className="font-bold text-gray-950 tabular-nums">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                  <Target className="h-4 w-4 text-gray-800 stroke-[2]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-950">Rozet Kazanım Metodu</h3>
                </div>
                <div className="grid gap-3 grid-cols-2">
                  <StatCard icon={Badge} label="Sistem (Otomatik)" value={badges.by_award_method.automatic} tone="amber" />
                  <StatCard icon={Badge} label="Yönetici (Manuel)" value={badges.by_award_method.manual} tone="sky" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AKILLI SERTİFİKA VE SEVİYE ANALİZİ */}
          {activeTab === "tiers" && tiers && (
            <div className="grid gap-4 lg:grid-cols-2 items-start">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                  <Award className="h-4 w-4 text-gray-800 stroke-[1.8]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-950">Sertifika Kırılım Dağılımı</h3>
                </div>
                <div className="space-y-3 max-h-[320px] overflow-y-auto scrollbar-none">
                  {Object.entries(tiers.tier_distribution || {}).length === 0 ? (
                    <p className="text-xs font-medium text-gray-400 py-4">Henüz seviye dağılım kırılımı oluşmadı.</p>
                  ) : (
                    Object.entries(tiers.tier_distribution).map(([tier, detail]) => (
                      <div key={tier} className="rounded-xl border border-gray-100/50 bg-gray-50/20 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-gray-700">{tier}</span>
                          <span className="text-gray-950 tabular-nums">{detail.count}</span>
                        </div>
                        {/* Apple İnce Progress Line */}
                        <div className="h-1 w-full rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full bg-gray-950 rounded-full" style={{ width: `${Math.min(100, Math.max(0, detail.percentage || 0))}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                  <BarChart3 className="h-4 w-4 text-gray-800 stroke-[2]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-950">Doğrulama ve Sağlık İstatistikleri</h3>
                </div>
                <div className="grid gap-3 grid-cols-2">
                  <StatCard icon={Award} label="Üretilen sertifika" value={tiers.total_certificates} tone="emerald" />
                  <StatCard icon={AlertCircle} label="Atama bekleyen" value={tiers.unassigned_count} tone="amber" />
                  <StatCard icon={QrCode} label="Sorgulama (Hit)" value={tiers.verification_hits ?? 0} tone="sky" />
                  <StatCard icon={Percent} label="Başarıyla Doğrulanan" value={`%${(tiers.verification_rate || 0).toFixed(1)}`} caption={`${tiers.verified_certificates ?? 0} tekil sorgu`} tone="brand" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ZAMAN SERİSİ EĞRİ AKIŞI (Timeline) */}
          {activeTab === "timeline" && timeline && (
            <div className={`grid gap-3.5 ${timeline.ticketing_enabled ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3 lg:grid-cols-3"}`}>
              <TimelineCard icon={CalendarDays} title="Kayıtlar" items={timeline.registrations} emptyText="Kayıt eğrisi henüz oluşmadı." tone="brand" />
              {timeline.ticketing_enabled ? (
                <TimelineCard icon={Ticket} title="Bilet Girişleri" items={timeline.ticket_checkins || []} emptyText="Biletli giriş verisi yok." tone="amber" />
              ) : null}
              <TimelineCard icon={QrCode} title="Anket Yanıtları" items={timeline.survey_completions} emptyText="Anket verisi yok." tone="emerald" />
              <TimelineCard icon={CheckCircle2} title="Sertifika Üretimi" items={timeline.certificate_creations} emptyText="Sertifika üretimi yok." tone="sky" />
            </div>
          )}
        </>
      )}
    </div>
  );
}