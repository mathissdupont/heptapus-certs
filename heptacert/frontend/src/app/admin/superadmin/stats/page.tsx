"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Users,
  BarChart3,
  TrendingUp,
  Mail,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { getSuperAdminStats, SuperAdminStatsOut } from "@/lib/api";

export default function SuperAdminStatsPage() {
  const router = useRouter();

  const [stats, setStats] = useState<SuperAdminStatsOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setError(null);
      const data = await getSuperAdminStats();
      setStats(data);
    } catch (e: any) {
      console.error("Failed to load stats:", e);
      setError(e?.message || "İstatistikler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="flex items-start gap-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">Hata</h3>
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={fetchStats}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Yeniden Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const userGrowthRate = stats.total_users > 0
    ? Math.round(((stats.active_users / stats.total_users) * 100))
    : 0;

  const eventEngagementRate = stats.total_events > 0
    ? Math.round(((stats.completed_events / stats.total_events) * 100))
    : 0;

  const certificateSuccess = stats.total_certificates > 0
    ? Math.round(((stats.issued_certificates / stats.total_certificates) * 100))
    : 0;

  const emailDeliveryRate = stats.total_emails > 0
    ? Math.round(((stats.delivered_emails / stats.total_emails) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin"
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-gray-900">Sistem İstatistikleri</h1>
            <p className="text-sm text-gray-500 mt-1">Platform genelindeki performans metriklerini izleyin</p>
          </div>
          <button
            onClick={fetchStats}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-white transition-colors"
          >
            Yenile
          </button>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Users */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600">Toplam Kullanıcı</h3>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-3xl font-black text-gray-900">{stats.total_users}</p>
            <p className="text-xs text-blue-600 mt-2">{stats.active_users} aktif ({userGrowthRate}%)</p>
          </div>

          {/* Total Events */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600">Toplam Etkinlik</h3>
              <BarChart3 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-3xl font-black text-gray-900">{stats.total_events}</p>
            <p className="text-xs text-emerald-600 mt-2">{stats.completed_events} tamamlandı ({eventEngagementRate}%)</p>
          </div>

          {/* Total Certificates */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600">Sertifikalar</h3>
              <Lock className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-3xl font-black text-gray-900">{stats.total_certificates}</p>
            <p className="text-xs text-purple-600 mt-2">{stats.issued_certificates} verildi ({certificateSuccess}%)</p>
          </div>

          {/* Total Emails */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600">Emailler</h3>
              <Mail className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-3xl font-black text-gray-900">{stats.total_emails}</p>
            <p className="text-xs text-orange-600 mt-2">{stats.delivered_emails} iletildi ({emailDeliveryRate}%)</p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Metrics */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Kullanıcı Metrikleri
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Aktif Kullanıcılar</span>
                  <span className="text-sm font-bold text-gray-900">{userGrowthRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${userGrowthRate}%` }} />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Toplam Admin:</span> {stats.total_admins}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Toplam Organizasyon:</span> {stats.total_organizations}
                </p>
              </div>
            </div>
          </div>

          {/* Event Metrics */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              Etkinlik Metrikleri
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Tamamlanma Oranı</span>
                  <span className="text-sm font-bold text-gray-900">{eventEngagementRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${eventEngagementRate}%` }} />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Devam Eden:</span> {Math.max(0, stats.total_events - stats.completed_events)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Toplam Katılımcı:</span> {stats.total_attendees}
                </p>
              </div>
            </div>
          </div>

          {/* Certificate Metrics */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Lock className="h-5 w-5 text-purple-600" />
              Sertifika Metrikleri
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Başarı Oranı</span>
                  <span className="text-sm font-bold text-gray-900">{certificateSuccess}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${certificateSuccess}%` }} />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Beklemede:</span> {Math.max(0, stats.total_certificates - stats.issued_certificates)}
                </p>
              </div>
            </div>
          </div>

          {/* Email Metrics */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Mail className="h-5 w-5 text-orange-600" />
              Email Metrikleri
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">İletim Oranı</span>
                  <span className="text-sm font-bold text-gray-900">{emailDeliveryRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${emailDeliveryRate}%` }} />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Başarısız:</span> {Math.max(0, stats.total_emails - stats.delivered_emails)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-center text-sm text-gray-500">
          Son güncelleme: {new Date().toLocaleString("tr-TR")}
        </div>
      </div>
    </div>
  );
}
