"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, Loader2, AlertCircle, TrendingUp, Users, Badge, Zap,
  BarChart3, LineChart, PieChart, Calendar, Award, Percent, CheckCircle2,
  CalendarDays, UserCheck, QrCode, LockKeyhole, Mail, Target,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { FeatureGate } from '@/lib/useSubscription';
import EventAdminNav from "@/components/Admin/EventAdminNav";

type EngagementAnalytics = {
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
  tier_distribution: Record<
    string,
    { count: number; percentage: number }
  >;
  unassigned_count: number;
};

type TimelineAnalytics = {
  registrations: Array<{ date: string; count: number }>;
  survey_completions: Array<{ date: string; count: number }>;
  certificate_creations: Array<{ date: string; count: number }>;
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  change,
  color = "brand",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: string;
  color?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl border border-gray-200 p-6"
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-gray-500 text-sm font-medium">{label}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
          {change && (
            <span className="text-sm text-green-600 font-semibold">
              {change}
            </span>
          )}
        </div>
      </div>
      <div
        className={`p-3 rounded-lg bg-${color}-100 text-${color}-600`}
      >
        {Icon}
      </div>
    </div>
  </motion.div>
);

export default function AdvancedAnalyticsPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [engagement, setEngagement] = useState<EngagementAnalytics | null>(
    null
  );
  const [badges, setBadges] = useState<BadgeAnalytics | null>(null);
  const [tiers, setTiers] = useState<TierAnalytics | null>(null);
  const [timeline, setTimeline] = useState<TimelineAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "engagement" | "badges" | "tiers" | "timeline"
  >("engagement");

  // Load all analytics
  useEffect(() => {
    loadAnalytics();
  }, [eventId]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const [engRes, badRes, tierRes, timelineRes] = await Promise.all([
        apiFetch(
          `/admin/events/${eventId}/analytics/engagement`,
          { method: "GET" }
        ),
        apiFetch(
          `/admin/events/${eventId}/analytics/badges`,
          { method: "GET" }
        ),
        apiFetch(
          `/admin/events/${eventId}/analytics/tiers`,
          { method: "GET" }
        ),
        apiFetch(
          `/admin/events/${eventId}/analytics/timeline`,
          { method: "GET" }
        ),
      ]);

      if (engRes) setEngagement(await engRes.json());
      if (badRes) setBadges(await badRes.json());
      if (tierRes) setTiers(await tierRes.json());
      if (timelineRes) setTimeline(await timelineRes.json());
    } catch (err: any) {
      setError(err.message || "Analitikler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <FeatureGate requiredPlans={["growth","enterprise"]}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/events/${eventId}/certificates`}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-lg p-2 hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gelişmiş Analitikler
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Katılım, rozetler ve sertifikalar
            </p>
          </div>
        </div>
      </div>

      <EventAdminNav eventId={eventId} active="analytics" className="mb-2 flex flex-col gap-2 border-b border-gray-200 pb-4" />

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {[
          { id: "engagement", label: "Katılım", icon: Users },
          { id: "badges", label: "Rozetler", icon: Badge },
          { id: "tiers", label: "Seviyeler", icon: Award },
          { id: "timeline", label: "Zaman Çizelgesi", icon: Calendar },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() =>
              setActiveTab(
                tab.id as "engagement" | "badges" | "tiers" | "timeline"
              )
            }
            className={`px-4 py-3 font-semibold text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? "text-brand-600 border-b-2 border-brand-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Engagement Tab */}
      {activeTab === "engagement" && engagement && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Users className="h-6 w-6" />}
              label="Toplam Katılımcı"
              value={engagement.total_attendees}
            />

            <StatCard
              icon={<Percent className="h-6 w-6" />}
              label="Katılım Oranı"
              value={`${(
                engagement.attendance.attendance_rate || 0
              ).toFixed(1)}%`}
            />

            <StatCard
              icon={<TrendingUp className="h-6 w-6" />}
              label="Anket Tamamlama"
              value={`${engagement.survey_completion.completed}/${engagement.total_attendees}`}
              change={`%${(
                engagement.survey_completion.completion_rate || 0
              ).toFixed(1)}`}
            />

            <StatCard
              icon={<Trophy className="h-6 w-6" />}
              label="Ortalama Rozet"
              value={engagement.badges.average_per_attendee.toFixed(2)}
            />
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Attendance */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-600" />
                Katılım
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Katıldı</span>
                  <span className="font-bold text-gray-900">
                    {engagement.attendance.attended}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${
                        engagement.total_attendees > 0
                          ? (engagement.attendance.attended /
                              engagement.total_attendees) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Katılmadı</span>
                  <span className="font-bold text-gray-900">
                    {engagement.attendance.not_attended}
                  </span>
                </div>
              </div>
            </div>

            {/* Survey Completion */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-brand-600" />
                Anket Tamamlama
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tamamlandı</span>
                  <span className="font-bold text-gray-900">
                    {engagement.survey_completion.completed}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${
                        engagement.total_attendees > 0
                          ? (engagement.survey_completion.completed /
                              engagement.total_attendees) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Beklemede</span>
                  <span className="font-bold text-gray-900">
                    {engagement.survey_completion.pending}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badges Tab */}
      {activeTab === "badges" && badges && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              icon={<Badge className="h-6 w-6" />}
              label="Toplam Rozetler"
              value={badges.total_badges}
              color="yellow"
            />

            <StatCard
              icon={<Zap className="h-6 w-6" />}
              label="Otomatik"
              value={badges.by_award_method.automatic}
              color="blue"
            />

            <StatCard
              icon={<CheckCircle2 className="h-6 w-6" />}
              label="Manuel"
              value={badges.by_award_method.manual}
              color="green"
            />
          </div>

          {/* Badge Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-brand-600" />
              Rozet Dağılımı
            </h3>

            {Object.keys(badges.by_type).length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Henüz rozet verilmedi
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(badges.by_type).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-gray-700">{type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-brand-600 h-2 rounded-full"
                          style={{
                            width: `${
                              badges.total_badges > 0
                                ? (count / badges.total_badges) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="font-bold text-gray-900 w-12 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tiers Tab */}
      {activeTab === "tiers" && tiers && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              icon={<Award className="h-6 w-6" />}
              label="Toplam Sertifika"
              value={tiers.total_certificates}
              color="purple"
            />

            <StatCard
              icon={<AlertCircle className="h-6 w-6" />}
              label="Atanmamış"
              value={tiers.unassigned_count}
              color="red"
            />
          </div>

          {/* Tier Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-brand-600" />
              Seviye Dağılımı
            </h3>

            {Object.keys(tiers.tier_distribution).length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Henüz sertifika verilmedi
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(tiers.tier_distribution).map(
                  ([tier, data]) => (
                    <div key={tier} className="flex items-center justify-between">
                      <div>
                        <span className="text-gray-900 font-semibold">
                          {tier}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">
                          {data.percentage}%
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-40 bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-brand-500 to-violet-500 h-3 rounded-full"
                            style={{ width: `${data.percentage}%` }}
                          />
                        </div>
                        <span className="font-bold text-gray-900 w-12 text-right">
                          {data.count}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === "timeline" && timeline && (
        <div className="space-y-6">
          {/* Registrations */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <LineChart className="h-5 w-5 text-brand-600" />
              Kayıtlar
            </h3>

            {timeline.registrations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Henüz kayıt yok
              </p>
            ) : (
              <div className="space-y-2">
                {timeline.registrations.map((item) => (
                  <div
                    key={item.date}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600">{item.date}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-100 rounded h-6">
                        <div
                          className="bg-brand-600 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
                          style={{
                            width: `${Math.min(
                              (item.count /
                                Math.max(
                                  ...timeline.registrations.map((r) => r.count)
                                )) *
                                100,
                              100
                            )}%`,
                          }}
                        >
                          {item.count > 0 && item.count}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Survey Completions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Anket Tamamlamaları
            </h3>

            {timeline.survey_completions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Henüz anket tamamlanmadı
              </p>
            ) : (
              <div className="space-y-2">
                {timeline.survey_completions.map((item) => (
                  <div
                    key={item.date}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600">{item.date}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-100 rounded h-6">
                        <div
                          className="bg-green-600 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
                          style={{
                            width: `${Math.min(
                              (item.count /
                                Math.max(
                                  ...timeline.survey_completions.map(
                                    (r) => r.count
                                  )
                                )) *
                                100,
                              100
                            )}%`,
                          }}
                        >
                          {item.count > 0 && item.count}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Certificate Creations */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              Sertifika Oluşturmaları
            </h3>

            {timeline.certificate_creations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Henüz sertifika oluşturulmadı
              </p>
            ) : (
              <div className="space-y-2">
                {timeline.certificate_creations.map((item) => (
                  <div
                    key={item.date}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600">{item.date}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-100 rounded h-6">
                        <div
                          className="bg-purple-600 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
                          style={{
                            width: `${Math.min(
                              (item.count /
                                Math.max(
                                  ...timeline.certificate_creations.map(
                                    (r) => r.count
                                  )
                                )) *
                                100,
                              100
                            )}%`,
                          }}
                        >
                          {item.count > 0 && item.count}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      </motion.div>
    </FeatureGate>
  );
}

// Missing Trophy icon import - using this as fallback
const Trophy = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-2 4h4m0 0h3a2 2 0 110 4h-3m0 0H7a2 2 0 110-4h3m-2-4a2 2 0 100-4m0 0a2 2 0 110 4"
    />
  </svg>
);
