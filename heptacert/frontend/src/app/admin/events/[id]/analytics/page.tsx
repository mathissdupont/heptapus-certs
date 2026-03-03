"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BarChart3,
  Users,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CalendarDays,
  QrCode,
  UserCheck,
  LockKeyhole,
  Mail,
  Target,
} from "lucide-react";
import Link from "next/link";
import { getEventAnalytics, EventAnalyticsOut } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function EventAnalyticsPage() {
  const params = useParams();
  const eventId = parseInt(params.id as string);
  const router = useRouter();
  const t = useT();

  if (isNaN(eventId)) {
    return <div className="p-4 text-red-600">Geçersiz etkinlik ID</div>;
  }

  const [analytics, setAnalytics] = useState<EventAnalyticsOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [eventId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEventAnalytics(eventId);
      setAnalytics(data);
    } catch (e: any) {
      console.error("Failed to load analytics:", e);
      setError(e?.message || "Analitikler yüklenemedi");
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
              onClick={fetchAnalytics}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Yeniden Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const certificationRate =
    analytics.total_attendees > 0
      ? Math.round((analytics.certified_count / analytics.total_attendees) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/admin/events/${eventId}`}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-gray-900">{analytics.event_name}</h1>
            <p className="text-sm text-gray-500 mt-1">Etkinlik Analitikleri</p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-4">
          <Link href={`/admin/events/${eventId}/certificates`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
            <BarChart3 className="h-3.5 w-3.5" /> Sertifikalar
          </Link>
          <Link href={`/admin/events/${eventId}/sessions`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
            <CalendarDays className="h-3.5 w-3.5" /> Oturumlar
          </Link>
          <Link href={`/admin/events/${eventId}/attendees`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
            <Users className="h-3.5 w-3.5" /> Katılımcılar
          </Link>
          <Link href={`/admin/events/${eventId}/checkin`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
            <QrCode className="h-3.5 w-3.5" /> Check-in
          </Link>
          <Link href={`/admin/events/${eventId}/gamification`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
            <Target className="h-3.5 w-3.5" /> Gamification
          </Link>
          <Link href={`/admin/events/${eventId}/surveys`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
            <UserCheck className="h-3.5 w-3.5" /> Anketler
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-700">
            <BarChart3 className="h-3.5 w-3.5" /> Analitik
          </span>
          <Link href={`/admin/events/${eventId}/email-templates`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
            <Mail className="h-3.5 w-3.5" /> Email
          </Link>
          <Link href={`/admin/events/${eventId}/settings`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
            <LockKeyhole className="h-3.5 w-3.5" /> Ayarlar
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Total Attendees */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600">Toplam Katılımcı</h3>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-black text-gray-900">{analytics.total_attendees}</p>
            <p className="text-xs text-gray-500 mt-2">Tüm katılımcılar</p>
          </div>

          {/* Certified */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600">Sertifikalandı</h3>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-black text-gray-900">{analytics.certified_count}</p>
            <p className="text-xs text-emerald-600 mt-2">{certificationRate}% sertifikasyon oranı</p>
          </div>

          {/* Pending */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600">Beklemede</h3>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-3xl font-black text-gray-900">{analytics.pending_count}</p>
            <p className="text-xs text-amber-600 mt-2">İşlenmesi bekleniyor</p>
          </div>

          {/* Certification Rate */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600">Sertifikasyon Oranı</h3>
              <BarChart3 className="h-5 w-5 text-brand-500" />
            </div>
            <p className="text-3xl font-black text-gray-900">{certificationRate}%</p>
            <p className="text-xs text-brand-600 mt-2">Hedefi {analytics.total_attendees > 0 ? "tamamlayan" : "0"}</p>
          </div>
        </div>

        {/* Sessions Analytics */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Oturum Katılım Oranları</h2>

          {analytics.sessions && analytics.sessions.length > 0 ? (
            <div className="space-y-4">
              {analytics.sessions.map((session) => {
                const attendanceRate = Math.round(session.attendance_rate * 100);
                return (
                  <div key={session.id} className="flex items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{session.name}</h3>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-brand-500 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${attendanceRate}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{attendanceRate}%</p>
                      <p className="text-xs text-gray-500">katılım</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Oturum verisi bulunamadı</p>
          )}
        </div>

        {/* Export Button */}
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Yazdır
          </button>
          <Link
            href={`/admin/events/${eventId}`}
            className="px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
          >
            Etkinliğe Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
