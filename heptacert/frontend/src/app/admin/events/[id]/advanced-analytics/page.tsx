"use client";

import { useEffect, useState, type ElementType } from "react";
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
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useSubscription } from "@/lib/useSubscription";
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
      return "border-emerald-100 bg-emerald-50 text-emerald-600";
    case "amber":
      return "border-amber-100 bg-amber-50 text-amber-600";
    case "sky":
      return "border-sky-100 bg-sky-50 text-sky-600";
    default:
      return "border-brand-100 bg-brand-50 text-brand-600";
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
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <h3 className="mt-2 text-3xl font-bold text-gray-900">{value}</h3>
          {caption && <p className="mt-2 text-xs text-gray-500">{caption}</p>}
        </div>
        <div className={`rounded-xl border p-3 ${toneStyles(tone)}`}>
          <Icon className="h-6 w-6" />
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
  const titleColor = tone === "brand" ? "text-brand-600" : tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : "text-sky-600";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${titleColor}`} />
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">{emptyText}</p>
        ) : (
          items.slice(0, 6).map((item) => (
            <div key={`${title}-${item.date}`} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
              <span className="text-gray-600">{item.date}</span>
              <span className="font-semibold text-gray-900">{item.count}</span>
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
  const [activeTab, setActiveTab] = useState<"engagement" | "tickets" | "badges" | "tiers" | "timeline">("engagement");

  useEffect(() => {
    if (subscriptionLoading) return;
    if (!canViewAnalytics) {
      setLoading(false);
      setError(null);
      return;
    }

    let mounted = true;

    async function loadAnalytics() {
      setLoading(true);
      setError(null);

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
        setError(err?.message || "Analitikler yüklenemedi");
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
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
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
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/admin/events/${eventId}/certificates`}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="rounded-lg p-2 hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gelişmiş Analitikler</h1>
            <p className="mt-1 text-sm text-gray-500">Katılım, rozetler, sertifikalar ve zaman içi eğilimler</p>
          </div>
        </div>
      </div>

      <EventAdminNav eventId={eventId} active="analytics" className="mb-2 flex flex-col gap-2 border-b border-gray-200 pb-4" />

      {!canViewAnalytics ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <div className="flex items-start gap-3">
            <BarChart3 className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold">Growth veya Enterprise gerekiyor</h2>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                İleri analitik, etkinlik katılım eğilimleri, rozet dağılımı, sertifika üretim trendleri ve zaman çizelgesi görünümü üst planlarda açılır.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-amber-200 bg-white/80 p-4">
              <p className="text-sm font-semibold">Katılım eğilimleri</p>
              <p className="mt-1 text-xs text-amber-700">Oturum bazlı performans ve tamamlanma oranı</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white/80 p-4">
              <p className="text-sm font-semibold">Rozet dağılımı</p>
              <p className="mt-1 text-xs text-amber-700">Hangi rozetin ne kadar üretildiğini görün</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white/80 p-4">
              <p className="text-sm font-semibold">Zaman çizelgesi</p>
              <p className="mt-1 text-xs text-amber-700">Kayıt, anket ve sertifika üretim ritmi</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </motion.div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {overviewCards.map((card) => (
              <StatCard key={card.label} icon={card.icon} label={card.label} value={card.value} caption={card.caption} tone={card.tone} />
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === tab.id ? "border-brand-600 text-brand-600" : "border-transparent text-gray-600 hover:text-gray-900"}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "engagement" && engagement && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-brand-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Katılım özeti</h3>
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Katıldı</span>
                    <span className="font-semibold text-gray-900">{engagement.attendance.attended}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.min(100, Math.max(0, engagement.attendance.attendance_rate || 0))}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Katılmadı</span>
                    <span className="font-semibold text-gray-900">{engagement.attendance.not_attended}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">No-show oranı</span>
                    <span className="font-semibold text-gray-900">%{(engagement.attendance.no_show_rate || 0).toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Anket tamamlanma</h3>
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Tamamlandı</span>
                    <span className="font-semibold text-gray-900">{engagement.survey_completion.completed}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.min(100, Math.max(0, engagement.survey_completion.completion_rate || 0))}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Bekliyor</span>
                    <span className="font-semibold text-gray-900">{engagement.survey_completion.pending}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tickets" && engagement?.tickets && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-brand-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Bilet kullanımı</h3>
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Kullanıldı</span>
                    <span className="font-semibold text-gray-900">{engagement.tickets.used}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.min(100, Math.max(0, engagement.tickets.usage_rate || 0))}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Toplam bilet</span>
                    <span className="font-semibold text-gray-900">{engagement.tickets.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Aktif bilet</span>
                    <span className="font-semibold text-gray-900">{engagement.tickets.active_total ?? engagement.tickets.total}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Bilet durumları</h3>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <StatCard icon={Ticket} label="Bekleyen" value={engagement.tickets.issued} tone="sky" />
                  <StatCard icon={CheckCircle2} label="Kullanılan" value={engagement.tickets.used} tone="emerald" />
                  <StatCard icon={Percent} label="No-show" value={engagement.tickets.no_show ?? engagement.tickets.issued} caption={`%${(engagement.tickets.no_show_rate || 0).toFixed(1)} aktif bilet`} tone="amber" />
                  <StatCard icon={AlertCircle} label="İptal" value={engagement.tickets.cancelled} tone="amber" />
                  <StatCard icon={AlertCircle} label="İptal edilen" value={engagement.tickets.revoked} tone="amber" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "badges" && badges && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Badge className="h-5 w-5 text-brand-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Rozet dağılımı</h3>
                </div>
                <div className="mt-4 space-y-2">
                  {Object.entries(badges.by_type || {}).length === 0 ? (
                    <p className="text-sm text-gray-500">Henüz rozet verisi yok.</p>
                  ) : (
                    Object.entries(badges.by_type).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
                        <span className="font-medium text-gray-700">{type}</span>
                        <span className="font-semibold text-gray-900">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-amber-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Atama yöntemi</h3>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <StatCard icon={Badge} label="Otomatik" value={badges.by_award_method.automatic} tone="amber" />
                  <StatCard icon={Badge} label="Manuel" value={badges.by_award_method.manual} tone="sky" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "tiers" && tiers && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-brand-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Sertifika dağılımı</h3>
                </div>
                <div className="mt-4 space-y-2">
                  {Object.entries(tiers.tier_distribution || {}).length === 0 ? (
                    <p className="text-sm text-gray-500">Henüz seviye dağılımı yok.</p>
                  ) : (
                    Object.entries(tiers.tier_distribution).map(([tier, detail]) => (
                      <div key={tier} className="rounded-xl bg-gray-50 px-4 py-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">{tier}</span>
                          <span className="font-semibold text-gray-900">{detail.count}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-gray-200">
                          <div className="h-2 rounded-full bg-brand-600" style={{ width: `${Math.min(100, Math.max(0, detail.percentage || 0))}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Özet</h3>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <StatCard icon={Award} label="Toplam sertifika" value={tiers.total_certificates} tone="emerald" />
                  <StatCard icon={AlertCircle} label="Atanmayan" value={tiers.unassigned_count} tone="amber" />
                  <StatCard icon={QrCode} label="Doğrulama hit" value={tiers.verification_hits ?? 0} tone="sky" />
                  <StatCard icon={Percent} label="Doğrulanan" value={`%${(tiers.verification_rate || 0).toFixed(1)}`} caption={`${tiers.verified_certificates ?? 0} sertifika`} tone="brand" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "timeline" && timeline && (
            <div className={`grid gap-4 ${timeline.ticketing_enabled ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
              <TimelineCard icon={CalendarDays} title="Kayıtlar" items={timeline.registrations} emptyText="Kayıt eğrisi henüz oluşmadı." tone="brand" />
              {timeline.ticketing_enabled ? (
                <TimelineCard icon={Ticket} title="Biletli girişler" items={timeline.ticket_checkins || []} emptyText="Biletli giriş verisi yok." tone="amber" />
              ) : null}
              <TimelineCard icon={QrCode} title="Anket tamamlamaları" items={timeline.survey_completions} emptyText="Anket verisi yok." tone="emerald" />
              <TimelineCard icon={CheckCircle2} title="Sertifika üretimleri" items={timeline.certificate_creations} emptyText="Sertifika üretimi yok." tone="sky" />
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
