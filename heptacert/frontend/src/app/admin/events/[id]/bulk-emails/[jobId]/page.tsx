"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Mail,
  Check,
  X,
  Clock,
  CalendarDays,
  QrCode,
  User,
  UserCheck,
  LockKeyhole,
  BarChart3,
  Target,
  Send,
} from "lucide-react";
import Link from "next/link";
import { getEmailJobDetails, EmailJobDetailsOut } from "@/lib/api";

export default function EmailJobDetailsPage() {
  const params = useParams();
  const eventId = parseInt(params.id as string);
  const jobId = parseInt(params.jobId as string);
  const router = useRouter();

  if (isNaN(eventId) || isNaN(jobId)) {
    return <div className="p-4 text-red-600">Geçersiz parametre</div>;
  }

  const [job, setJob] = useState<EmailJobDetailsOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchJobDetails();
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchJobDetails();
    }, 2000);

    return () => clearInterval(interval);
  }, [eventId, jobId, autoRefresh]);

  const fetchJobDetails = async () => {
    try {
      setError(null);
      const data = await getEmailJobDetails(eventId, jobId);
      setJob(data);

      // Stop auto-refresh when job is completed or failed
      if (data.status === "completed" || data.status === "failed") {
        setAutoRefresh(false);
      }
    } catch (e: any) {
      console.error("Failed to load job details:", e);
      setError(e?.message || "İş detayları yüklenemedi");
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
              onClick={fetchJobDetails}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Yeniden Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  const successRate =
    job.total_recipients > 0
      ? Math.round(((job.sent_count / job.total_recipients) * 100))
      : 0;

  const statusConfig = {
    pending: { bg: "bg-amber-50", text: "text-amber-700", icon: Clock, label: "Bekleniyor" },
    in_progress: { bg: "bg-blue-50", text: "text-blue-700", icon: Clock, label: "İşleniyor" },
    completed: { bg: "bg-emerald-50", text: "text-emerald-700", icon: Check, label: "Tamamlandı" },
    failed: { bg: "bg-red-50", text: "text-red-700", icon: X, label: "Başarısız" },
  } as Record<string, any>;

  const config = statusConfig[job.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/admin/events/${eventId}`}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-gray-900">Email Gönderiş Detayları</h1>
            <p className="text-sm text-gray-500 mt-1">İş #ID: {job.id}</p>
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
            <User className="h-3.5 w-3.5" /> Katılımcılar
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
          <Link href={`/admin/events/${eventId}/advanced-analytics`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
            <BarChart3 className="h-3.5 w-3.5" /> Analitik
          </Link>
          <Link href={`/admin/events/${eventId}/email-templates`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
            <Mail className="h-3.5 w-3.5" /> Email
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-700">
            <Send className="h-3.5 w-3.5" /> Toplu Email
          </span>
          <Link href={`/admin/events/${eventId}/settings`} className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
            <LockKeyhole className="h-3.5 w-3.5" /> Ayarlar
          </Link>
        </div>

        {/* Status Card */}
        <div className={`${config.bg} border border-current rounded-xl p-6 mb-8`}>
          <div className="flex items-center gap-4">
            <StatusIcon className={`h-8 w-8 ${config.text}`} />
            <div>
              <p className={`text-sm font-semibold ${config.text}`}>Durum</p>
              <p className={`text-2xl font-black ${config.text}`}>{config.label}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Total Recipients */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">Toplam Alıcı</h3>
            <p className="text-3xl font-black text-gray-900">{job.total_recipients}</p>
            <p className="text-xs text-gray-500 mt-2">Email gönderilecek</p>
          </div>

          {/* Sent */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">Gönderilen</h3>
            <p className="text-3xl font-black text-emerald-600">{job.sent_count}</p>
            <p className="text-xs text-emerald-600 mt-2">{successRate}% başarılı</p>
          </div>

          {/* Failed */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">Başarısız</h3>
            <p className="text-3xl font-black text-red-600">{job.failed_count}</p>
            <p className="text-xs text-red-600 mt-2">Hata oluşan emails</p>
          </div>

          {/* Remaining */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-600 mb-4">Kalan</h3>
            <p className="text-3xl font-black text-gray-900">
              {Math.max(0, job.total_recipients - job.sent_count - job.failed_count)}
            </p>
            <p className="text-xs text-gray-500 mt-2">İşlenmeye bekliyor</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">İlerleme</h3>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-brand-500 to-brand-600 h-3 rounded-full transition-all duration-300"
              style={{
                width: `${Math.round(((job.sent_count + job.failed_count) / job.total_recipients) * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-gray-600">
              {job.sent_count + job.failed_count} / {job.total_recipients} işlendi
            </span>
            <span className="text-sm font-medium text-gray-900">
              {Math.round(((job.sent_count + job.failed_count) / job.total_recipients) * 100)}%
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Zaman Çizelgesi</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Görev Oluşturuldu</p>
                <p className="text-xs text-gray-500">{new Date(job.created_at).toLocaleString("tr-TR")}</p>
              </div>
            </div>
            {job.status !== "pending" && (
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-brand-300" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Son Güncelleme</p>
                  <p className="text-xs text-gray-500">{new Date(job.updated_at).toLocaleString("tr-TR")}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Auto-refresh Toggle */}
        <div className="flex justify-between items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh && job.status !== "completed" && job.status !== "failed"}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-gray-700">Otomatik yenile (2 saniye)</span>
          </label>

          <Link
            href={`/admin/events/${eventId}`}
            className="px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
          >
            Geri Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
