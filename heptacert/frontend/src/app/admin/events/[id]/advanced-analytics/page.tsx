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
import { useI18n } from "@/lib/i18n";

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
      return "border-surface-100 bg-surface-50 text-surface-900";
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
      className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm antialiased"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-11 font-bold uppercase tracking-widest text-surface-400 truncate">{label}</p>
          <h3 className="text-2xl font-bold tracking-tight text-surface-900 tabular-nums">{value}</h3>
          {caption && <p className="text-11 font-medium text-surface-400 leading-normal pt-1">{caption}</p>}
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
    <div className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm antialiased flex flex-col">
      <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-50 border border-surface-100 shadow-sm text-surface-900">
          <Icon className="h-3.5 w-3.5 stroke-[2]" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900">{title}</h3>
      </div>
      <div className="mt-3.5 space-y-1.5 flex-1 max-h-[320px] overflow-y-auto scrollbar-none">
        {items.length === 0 ? (
          <p className="text-xs font-medium text-surface-400 py-4">{emptyText}</p>
        ) : (
          items.slice(0, 6).map((item) => (
            <div key={`${title}-${item.date}`} className="flex items-center justify-between rounded-xl border border-surface-100/50 bg-surface-50/30 px-3.5 py-2.5 text-xs font-medium">
              <span className="text-surface-400 font-mono">{item.date}</span>
              <span className="font-bold text-surface-900 tabular-nums">{item.count}</span>
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
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const copy = {
    loadError: isTr ? "Analitikler yüklenemedi" : "Could not load analytics",
    pageTitle: isTr ? "Gelişmiş Analitikler" : "Advanced Analytics",
    pageSubtitle: isTr ? "Katılım akış verileri, rozet atamaları ve sertifika metrikleri" : "Attendance flow data, badge assignments and certificate metrics",
    planFeature: isTr
      ? "İleri analitik, katılım eğilimleri, rozet dağılımı, sertifika trendleri ve zaman çizelgesi"
      : "Advanced analytics, attendance trends, badge distribution, certificate trends and timeline",
    tabEngagement: isTr ? "Katılım" : "Attendance",
    tabTickets: isTr ? "Biletler" : "Tickets",
    tabBadges: isTr ? "Rozetler" : "Badges",
    tabTiers: isTr ? "Seviyeler" : "Tiers",
    tabTimeline: isTr ? "Zaman Çizelgesi" : "Timeline",
    statTotalAttendees: isTr ? "Toplam Katılımcı" : "Total Attendees",
    statTotalAttendeesCaption: isTr ? "Analitikte takip edilen aktif katılımcı sayısı" : "Active attendees tracked in analytics",
    statAttendanceRate: isTr ? "Katılım Oranı" : "Attendance Rate",
    statAttendanceRateCaption: isTr ? "Check-in bazlı etkin katılım oranı" : "Check-in based effective attendance rate",
    statSurveyCompletion: isTr ? "Anket Tamamlama" : "Survey Completion",
    statSurveyCompletionCaption: (rate: number) => isTr ? `%${rate.toFixed(1)} tamamlanma` : `${rate.toFixed(1)}% completion`,
    statTicketUsage: isTr ? "Bilet Kullanımı" : "Ticket Usage",
    statTicketUsageCaption: (rate: number) => isTr ? `%${rate.toFixed(1)} biletli giriş` : `${rate.toFixed(1)}% ticketed entry`,
    statAvgBadge: isTr ? "Ortalama Rozet" : "Average Badge",
    statAvgBadgeCaption: isTr ? "Katılımcı başına ortalama rozet" : "Average badges per attendee",
    statCertificate: isTr ? "Sertifika" : "Certificate",
    statCertificateCaption: isTr ? "Üretilen sertifika sayısı" : "Number of certificates generated",
    engagementSectionTitle: isTr ? "Katılım Özet Analizi" : "Attendance Summary Analysis",
    engagementAttended: isTr ? "Katılım Gösteren" : "Attended",
    engagementNotAttended: isTr ? "Katılmayan" : "Not Attended",
    engagementNoShowRate: isTr ? "Mevcut No-show Oranı" : "Current No-show Rate",
    surveySectionTitle: isTr ? "Geri Bildirim Anket Dönüşümü" : "Feedback Survey Conversion",
    surveyCompleted: isTr ? "Tamamlanan Form" : "Completed Forms",
    surveyPending: isTr ? "Yanıt Bekleyen" : "Awaiting Response",
    ticketUsageSectionTitle: isTr ? "Bilet Kullanım Oranı" : "Ticket Usage Rate",
    ticketUsed: isTr ? "Giriş Yapan Biletli" : "Ticketed Entries",
    ticketTotal: isTr ? "Toplam Dağıtılan Bilet" : "Total Distributed Tickets",
    ticketActiveTotal: isTr ? "Aktif Kontenjanli Bilet" : "Active Quota Tickets",
    ticketSegmentation: isTr ? "Segmentasyon Durumları" : "Segmentation Status",
    ticketIssued: isTr ? "Bekleyen" : "Issued",
    ticketUsedLabel: isTr ? "Kullanılan" : "Used",
    ticketNoShow: isTr ? "No-show" : "No-show",
    ticketCancelled: isTr ? "İptal" : "Cancelled",
    ticketRevoked: isTr ? "Geri Alınan" : "Revoked",
    badgeDistributionTitle: isTr ? "Kazanılan Rozet Dağılımı" : "Earned Badge Distribution",
    badgeEmptyState: isTr ? "Henüz rozet verisi tetiklenmedi." : "No badge data triggered yet.",
    badgeMethodTitle: isTr ? "Rozet Kazanım Metodu" : "Badge Award Method",
    badgeAutomatic: isTr ? "Sistem (Otomatik)" : "System (Automatic)",
    badgeManual: isTr ? "Yönetici (Manuel)" : "Admin (Manual)",
    tierDistributionTitle: isTr ? "Sertifika Kırılım Dağılımı" : "Certificate Tier Distribution",
    tierEmptyState: isTr ? "Henüz seviye dağılım kırılımı oluşmadı." : "No tier distribution breakdown yet.",
    tierVerificationTitle: isTr ? "Doğrulama ve Sağlık İstatistikleri" : "Verification & Health Statistics",
    tierCertGenerated: isTr ? "Üretilen sertifika" : "Generated Certificates",
    tierUnassigned: isTr ? "Atama bekleyen" : "Pending Assignment",
    tierVerificationHits: isTr ? "Sorgulama (Hit)" : "Verification Hits",
    tierVerified: isTr ? "Başarıyla Doğrulanan" : "Successfully Verified",
    tierVerifiedCaption: (count: number) => isTr ? `${count} tekil sorgu` : `${count} unique queries`,
    timelineRegistrations: isTr ? "Kayıtlar" : "Registrations",
    timelineRegistrationsEmpty: isTr ? "Kayıt eğrisi henüz oluşmadı." : "No registration trend yet.",
    timelineTicketCheckins: isTr ? "Bilet Girişleri" : "Ticket Check-ins",
    timelineTicketCheckinsEmpty: isTr ? "Biletli giriş verisi yok." : "No ticket check-in data.",
    timelineSurveyResponses: isTr ? "Anket Yanıtları" : "Survey Responses",
    timelineSurveyEmpty: isTr ? "Anket verisi yok." : "No survey data.",
    timelineCertCreation: isTr ? "Sertifika Üretimi" : "Certificate Generation",
    timelineCertEmpty: isTr ? "Sertifika üretimi yok." : "No certificate generation.",
  };

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
          setError(err?.message || copy.loadError);
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
        <Loader2 className="h-6 w-6 animate-spin text-surface-400 stroke-[2.5]" />
      </div>
    );
  }

  const isTicketedEvent = engagement?.ticketing_enabled === true;
  const hasCertificates = engagement?.certificate_enabled !== false;
  const hasBadges = engagement?.gamification_enabled !== false || (badges?.total_badges ?? 0) > 0;

  const tabs = [
    { id: "engagement" as const, label: copy.tabEngagement, icon: Users, visible: true },
    { id: "tickets" as const, label: copy.tabTickets, icon: Ticket, visible: isTicketedEvent },
    { id: "badges" as const, label: copy.tabBadges, icon: Badge, visible: hasBadges },
    { id: "tiers" as const, label: copy.tabTiers, icon: Award, visible: hasCertificates },
    { id: "timeline" as const, label: copy.tabTimeline, icon: Calendar, visible: true },
  ].filter((tab) => tab.visible);

  const overviewCards = engagement
    ? [
        {
          label: copy.statTotalAttendees,
          value: engagement.total_attendees,
          icon: Users,
          tone: "brand" as const,
          caption: copy.statTotalAttendeesCaption,
        },
        {
          label: copy.statAttendanceRate,
          value: `${(engagement.attendance.attendance_rate || 0).toFixed(1)}%`,
          icon: Percent,
          tone: "sky" as const,
          caption: copy.statAttendanceRateCaption,
        },
        {
          label: copy.statSurveyCompletion,
          value: `${engagement.survey_completion.completed}/${engagement.total_attendees}`,
          icon: TrendingUp,
          tone: "emerald" as const,
          caption: copy.statSurveyCompletionCaption(engagement.survey_completion.completion_rate || 0),
        },
        isTicketedEvent && engagement.tickets
          ? {
              label: copy.statTicketUsage,
              value: `${engagement.tickets.used}/${engagement.tickets.active_total ?? engagement.tickets.total}`,
              icon: Ticket,
              tone: "amber" as const,
              caption: copy.statTicketUsageCaption(engagement.tickets.usage_rate || 0),
            }
          : {
              label: hasBadges ? copy.statAvgBadge : copy.statCertificate,
              value: hasBadges ? engagement.badges.average_per_attendee.toFixed(2) : tiers?.total_certificates ?? 0,
              icon: hasBadges ? Badge : Award,
              tone: "amber" as const,
              caption: hasBadges ? copy.statAvgBadgeCaption : copy.statCertificateCaption,
            },
      ]
    : [];

  return (
    <div className="w-full flex flex-col gap-6 pb-16 antialiased text-surface-900">

      {/* BAŞLIK GRUBU */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link href={`/admin/events/${eventId}`}>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-500 shadow-sm hover:bg-surface-50 active:scale-95 transition-all">
              <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-surface-900 sm:text-2xl">{copy.pageTitle}</h1>
            <p className="text-xs text-surface-400">{copy.pageSubtitle}</p>
          </div>
        </div>
      </div>

      <EventAdminNav eventId={eventId} active="analytics" className="mb-1" />

      {/* PLAN GATE KORUMALARI */}
      {!canViewAnalytics ? (
        <PlanGateCard
          feature={copy.planFeature}
          requiredPlans={["growth", "enterprise"]}
        />
      ) : planGateMessage ? (
        <PlanGateCard
          feature={copy.planFeature}
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
            <div className="flex min-w-max gap-1 border border-surface-200/80 bg-surface-50/60 p-1 rounded-xl lg:min-w-0">
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
                        ? "bg-white text-surface-900 shadow-sm border border-surface-200/60"
                        : "border border-transparent text-surface-500 hover:text-surface-900 hover:bg-white/40"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${isAct ? "text-surface-900 stroke-[2]" : "text-surface-400 stroke-[1.8]"}`} />
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
              <div className="rounded-2xl border border-surface-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
                  <UserCheck className="h-4 w-4 text-surface-800 stroke-[2]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.engagementSectionTitle}</h3>
                </div>
                <div className="space-y-3.5 text-xs font-semibold text-surface-600">
                  <div className="flex items-center justify-between">
                    <span className="text-surface-400 font-medium">{copy.engagementAttended}</span>
                    <span className="text-surface-900 tabular-nums">{engagement.attendance.attended}</span>
                  </div>
                  {/* Apple İnce Progress Line */}
                  <div className="h-1.5 w-full rounded-full bg-surface-100 overflow-hidden">
                    <div className="h-full bg-surface-900 rounded-full" style={{ width: `${Math.min(100, Math.max(0, engagement.attendance.attendance_rate || 0))}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-surface-400 font-medium">{copy.engagementNotAttended}</span>
                    <span className="text-surface-900 tabular-nums">{engagement.attendance.not_attended}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                    <span className="text-surface-400 font-medium">{copy.engagementNoShowRate}</span>
                    <span className="text-red-500 tabular-nums">%{(engagement.attendance.no_show_rate || 0).toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-surface-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 stroke-[2]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.surveySectionTitle}</h3>
                </div>
                <div className="space-y-3.5 text-xs font-semibold text-surface-600">
                  <div className="flex items-center justify-between">
                    <span className="text-surface-400 font-medium">{copy.surveyCompleted}</span>
                    <span className="text-surface-900 tabular-nums">{engagement.survey_completion.completed}</span>
                  </div>
                  {/* Apple İnce Progress Line */}
                  <div className="h-1.5 w-full rounded-full bg-surface-100 overflow-hidden">
                    <div className="h-full bg-surface-900 rounded-full" style={{ width: `${Math.min(100, Math.max(0, engagement.survey_completion.completion_rate || 0))}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-surface-400 font-medium">{copy.surveyPending}</span>
                    <span className="text-surface-900 tabular-nums">{engagement.survey_completion.pending}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BİLETLİ GİRİŞ RAPORU */}
          {activeTab === "tickets" && engagement?.tickets && (
            <div className="grid gap-4 lg:grid-cols-2 items-start">
              <div className="rounded-2xl border border-surface-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
                  <Ticket className="h-4 w-4 text-surface-800 stroke-[2]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.ticketUsageSectionTitle}</h3>
                </div>
                <div className="space-y-3.5 text-xs font-semibold text-surface-600">
                  <div className="flex items-center justify-between">
                    <span className="text-surface-400 font-medium">{copy.ticketUsed}</span>
                    <span className="text-surface-900 tabular-nums">{engagement.tickets.used}</span>
                  </div>
                  {/* Apple İnce Progress Line */}
                  <div className="h-1.5 w-full rounded-full bg-surface-100 overflow-hidden">
                    <div className="h-full bg-surface-900 rounded-full" style={{ width: `${Math.min(100, Math.max(0, engagement.tickets.usage_rate || 0))}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-surface-400 font-medium">{copy.ticketTotal}</span>
                    <span className="text-surface-900 tabular-nums">{engagement.tickets.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-surface-400 font-medium">{copy.ticketActiveTotal}</span>
                    <span className="text-surface-900 tabular-nums">{engagement.tickets.active_total ?? engagement.tickets.total}</span>
                  </div>
                </div>
              </div>

              {/* Bilet Alt Matris Dağılım Kartları */}
              <div className="rounded-2xl border border-surface-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
                  <BarChart3 className="h-4 w-4 text-surface-800 stroke-[2]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.ticketSegmentation}</h3>
                </div>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                  <StatCard icon={Ticket} label={copy.ticketIssued} value={engagement.tickets.issued} tone="sky" />
                  <StatCard icon={CheckCircle2} label={copy.ticketUsedLabel} value={engagement.tickets.used} tone="emerald" />
                  <StatCard icon={Percent} label={copy.ticketNoShow} value={engagement.tickets.no_show ?? engagement.tickets.issued} caption={`%${(engagement.tickets.no_show_rate || 0).toFixed(1)}`} tone="amber" />
                  <StatCard icon={AlertCircle} label={copy.ticketCancelled} value={engagement.tickets.cancelled} tone="amber" />
                  <StatCard icon={AlertCircle} label={copy.ticketRevoked} value={engagement.tickets.revoked} tone="amber" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OYUNLAŞTIRMA VE ROZET RAPORU */}
          {activeTab === "badges" && badges && (
            <div className="grid gap-4 lg:grid-cols-2 items-start">
              <div className="rounded-2xl border border-surface-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
                  <Badge className="h-4 w-4 text-surface-800 stroke-[1.8]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.badgeDistributionTitle}</h3>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-none">
                  {Object.entries(badges.by_type || {}).length === 0 ? (
                    <p className="text-xs font-medium text-surface-400 py-4">{copy.badgeEmptyState}</p>
                  ) : (
                    Object.entries(badges.by_type).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between rounded-xl border border-surface-100/50 bg-surface-50/40 px-4 py-2.5 text-xs font-medium">
                        <span className="text-surface-700">{type}</span>
                        <span className="font-bold text-surface-900 tabular-nums">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-surface-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
                  <Target className="h-4 w-4 text-surface-800 stroke-[2]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.badgeMethodTitle}</h3>
                </div>
                <div className="grid gap-3 grid-cols-2">
                  <StatCard icon={Badge} label={copy.badgeAutomatic} value={badges.by_award_method.automatic} tone="amber" />
                  <StatCard icon={Badge} label={copy.badgeManual} value={badges.by_award_method.manual} tone="sky" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AKILLI SERTİFİKA VE SEVİYE ANALİZİ */}
          {activeTab === "tiers" && tiers && (
            <div className="grid gap-4 lg:grid-cols-2 items-start">
              <div className="rounded-2xl border border-surface-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
                  <Award className="h-4 w-4 text-surface-800 stroke-[1.8]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.tierDistributionTitle}</h3>
                </div>
                <div className="space-y-3 max-h-[320px] overflow-y-auto scrollbar-none">
                  {Object.entries(tiers.tier_distribution || {}).length === 0 ? (
                    <p className="text-xs font-medium text-surface-400 py-4">{copy.tierEmptyState}</p>
                  ) : (
                    Object.entries(tiers.tier_distribution).map(([tier, detail]) => (
                      <div key={tier} className="rounded-xl border border-surface-100/50 bg-surface-50/20 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-surface-700">{tier}</span>
                          <span className="text-surface-900 tabular-nums">{detail.count}</span>
                        </div>
                        {/* Apple İnce Progress Line */}
                        <div className="h-1 w-full rounded-full bg-surface-100 overflow-hidden">
                          <div className="h-full bg-surface-900 rounded-full" style={{ width: `${Math.min(100, Math.max(0, detail.percentage || 0))}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-surface-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-surface-100 pb-2.5">
                  <BarChart3 className="h-4 w-4 text-surface-800 stroke-[2]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900">{copy.tierVerificationTitle}</h3>
                </div>
                <div className="grid gap-3 grid-cols-2">
                  <StatCard icon={Award} label={copy.tierCertGenerated} value={tiers.total_certificates} tone="emerald" />
                  <StatCard icon={AlertCircle} label={copy.tierUnassigned} value={tiers.unassigned_count} tone="amber" />
                  <StatCard icon={QrCode} label={copy.tierVerificationHits} value={tiers.verification_hits ?? 0} tone="sky" />
                  <StatCard icon={Percent} label={copy.tierVerified} value={`%${(tiers.verification_rate || 0).toFixed(1)}`} caption={copy.tierVerifiedCaption(tiers.verified_certificates ?? 0)} tone="brand" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ZAMAN SERİSİ EĞRİ AKIŞI (Timeline) */}
          {activeTab === "timeline" && timeline && (
            <div className={`grid gap-3.5 ${timeline.ticketing_enabled ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3 lg:grid-cols-3"}`}>
              <TimelineCard icon={CalendarDays} title={copy.timelineRegistrations} items={timeline.registrations} emptyText={copy.timelineRegistrationsEmpty} tone="brand" />
              {timeline.ticketing_enabled ? (
                <TimelineCard icon={Ticket} title={copy.timelineTicketCheckins} items={timeline.ticket_checkins || []} emptyText={copy.timelineTicketCheckinsEmpty} tone="amber" />
              ) : null}
              <TimelineCard icon={QrCode} title={copy.timelineSurveyResponses} items={timeline.survey_completions} emptyText={copy.timelineSurveyEmpty} tone="emerald" />
              <TimelineCard icon={CheckCircle2} title={copy.timelineCertCreation} items={timeline.certificate_creations} emptyText={copy.timelineCertEmpty} tone="sky" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
