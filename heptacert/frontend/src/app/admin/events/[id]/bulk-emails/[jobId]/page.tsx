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
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { getEmailJobDetails, EmailJobDetailsOut } from "@/lib/api";

export default function EmailJobDetailsPage() {
  const params = useParams();
  const eventId = parseInt(params.id as string);
  const jobId = parseInt(params.jobId as string);
  const router = useRouter();

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

  if (isNaN(eventId) || isNaN(jobId)) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50/40 p-4 text-xs font-semibold text-red-600 flex items-center gap-2 antialiased">
        <AlertCircle className="h-4 w-4" />
        <span>Geçersiz parametre</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex w-full min-h-[340px] items-center justify-center antialiased">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400 stroke-[2.5]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4 antialiased">
        <div className="flex items-start gap-3.5 bg-red-50/40 border border-red-100 rounded-2xl p-5">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0 stroke-[2]" />
          <div className="flex-1 space-y-1">
            <h3 className="font-bold text-sm text-red-950">İş Detayları Yüklenemedi</h3>
            <p className="text-red-700 text-xs font-medium leading-relaxed">{error}</p>
            <button
              onClick={fetchJobDetails}
              className="inline-flex pt-2 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
              Yeniden Dene →
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
    pending: { bg: "border-amber-100 bg-amber-50/30", text: "text-amber-700", icon: Clock, label: "Kuyrukta Bekliyor" },
    in_progress: { bg: "border-blue-100 bg-blue-50/30", text: "text-blue-700", icon: Clock, label: "İşleniyor (Canlı)" },
    completed: { bg: "border-emerald-100 bg-emerald-50/20", text: "text-emerald-700", icon: Check, label: "Başarıyla Tamamlandı" },
    failed: { bg: "border-red-100 bg-red-50/20", text: "text-red-600", icon: X, label: "Görev Başarısız" },
  } as Record<string, any>;

  const config = statusConfig[job.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  const totalProcessed = job.sent_count + job.failed_count;
  const progressPercent = job.total_recipients > 0 ? Math.round((totalProcessed / job.total_recipients) * 100) : 0;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 antialiased text-surface-900 space-y-5">
      
      {/* 1. ÜST GEÇMİŞ BAŞLIK BARLARI (Header) */}
      <div className="flex flex-col gap-1.5 pb-1">
        <Link
          href={`/admin/events/${eventId}`}
          className="inline-flex w-fit items-center gap-1 text-11 font-bold text-surface-400 uppercase tracking-wider transition-colors hover:text-surface-900"
        >
          <ArrowLeft className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>Etkinliğe Dön</span>
        </Link>
        <div className="flex items-center justify-between gap-4 mt-1">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-surface-900 sm:text-2xl">Toplu Gönderim Detayları</h1>
            <p className="text-xs text-surface-400 font-mono mt-0.5">Görev Kodu: #JOB-{job.id}</p>
          </div>
          
          {/* Durum Yenileme Bildirim Işığı */}
          {autoRefresh && job.status !== "completed" && job.status !== "failed" && (
            <div className="inline-flex items-center gap-1.5 bg-surface-50 border border-surface-100 rounded-lg px-2 py-1 text-11 font-bold text-surface-400 font-mono">
              <RefreshCw className="h-3 w-3 animate-spin text-surface-400" />
              <span>Canlı</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. STATÜ ROZET ALANI (Apple Soft Badge Panel) */}
      <div className={`rounded-2xl border p-4 shadow-sm transition-all duration-300 ${config.bg}`}>
        <div className="flex items-center gap-3.5">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-sm bg-white`}>
            <StatusIcon className={`h-4 w-4 ${config.text} stroke-[2.5]`} />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-11 font-bold uppercase tracking-widest text-surface-400">Gönderim Statüsü</p>
            <h2 className={`text-sm font-bold tracking-tight ${config.text}`}>{config.label}</h2>
          </div>
        </div>
      </div>

      {/* 3. İSTATİSTİK SAYAÇ IZGARASI (Stats Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Toplam Alıcı */}
        <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm space-y-1">
          <p className="text-11 font-bold uppercase tracking-widest text-surface-400 truncate">Toplam Alıcı</p>
          <p className="text-2xl font-bold tracking-tight text-surface-900 font-mono tabular-nums">{job.total_recipients}</p>
          <p className="text-11 font-medium text-surface-400 pt-1 leading-none">Hedeflenen kitle</p>
        </div>

        {/* Başarıyla Gönderilen */}
        <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm space-y-1">
          <p className="text-11 font-bold uppercase tracking-widest text-surface-400 truncate">Başarılı Sevk</p>
          <p className="text-2xl font-bold tracking-tight text-emerald-600 font-mono tabular-nums">{job.sent_count}</p>
          <p className="text-11 font-bold text-emerald-500 pt-1 leading-none">%{successRate} iletildi</p>
        </div>

        {/* Hata Alıp Başarısız Olan */}
        <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm space-y-1">
          <p className="text-11 font-bold uppercase tracking-widest text-surface-400 truncate">Hatalı / Başarısız</p>
          <p className="text-2xl font-bold tracking-tight text-red-600 font-mono tabular-nums">{job.failed_count}</p>
          <p className="text-11 font-medium text-red-400 pt-1 leading-none">Bağlantı/SMTP reddi</p>
        </div>

        {/* Kalan Bekleyen Alıcı */}
        <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm space-y-1">
          <p className="text-11 font-bold uppercase tracking-widest text-surface-400 truncate">Kuyrukta Kalan</p>
          <p className="text-2xl font-bold tracking-tight text-surface-900 font-mono tabular-nums">
            {Math.max(0, job.total_recipients - job.sent_count - job.failed_count)}
          </p>
          <p className="text-11 font-medium text-surface-400 pt-1 leading-none">İşlenmeyi bekleyen</p>
        </div>
      </div>

      {/* 4. APPLE PROGRESS BAR PANELİ */}
      <div className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900 border-b border-surface-100 pb-2.5">Kuyruk İlerleme Durumu</h3>
        
        {/* İnce Şık Siyah İlerleme Çubuğu */}
        <div className="w-full bg-surface-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-surface-900 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        <div className="flex justify-between items-center text-xs font-semibold tracking-tight">
          <span className="text-surface-400 font-medium">
            {totalProcessed} / {job.total_recipients} alıcı işlendi
          </span>
          <span className="text-surface-900 font-mono">
            %{progressPercent}
          </span>
        </div>
      </div>

      {/* 5. DİKEY ZAMAN ÇİZELGESİ (Timeline Flow) */}
      <div className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900 border-b border-surface-100 pb-2.5">Görev Zaman Çizelgesi</h3>
        <div className="relative pl-4 before:absolute before:bottom-1 before:left-1 before:top-1 before:w-[1px] before:bg-surface-100">
          <div className="space-y-4.5">
            
            {/* Adım 1: Görev Oluşturma */}
            <div className="relative group flex items-start gap-3">
              <div className="absolute -left-[19.5px] top-1 flex h-2 w-2 items-center justify-center rounded-full bg-white ring-4 ring-white border border-gray-400" />
              <div className="min-w-0 flex-1 space-y-0.5 text-xs">
                <p className="font-bold text-surface-900 tracking-tight">Görev Kuyruğa Alındı</p>
                <p className="font-medium text-surface-400 font-mono">{new Date(job.created_at).toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short", year: "numeric" })}</p>
              </div>
            </div>

            {/* Adım 2: Son Güncelleme Akışı */}
            {job.status !== "pending" && (
              <div className="relative group flex items-start gap-3">
                <div className="absolute -left-[19.5px] top-1 flex h-2 w-2 items-center justify-center rounded-full bg-white ring-4 ring-white border border-gray-950 bg-surface-900 shadow-sm" />
                <div className="min-w-0 flex-1 space-y-0.5 text-xs">
                  <p className="font-bold text-surface-900 tracking-tight">Kuyruk Son Hareket İzleme</p>
                  <p className="font-medium text-surface-400 font-mono">{new Date(job.updated_at).toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>

      {/* 6. ALT POLİTİKA KONTROLLERİ VE OTOMATİK YENİLEME SWITCHİ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1.5">
        <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
          <input
            type="checkbox"
            checked={autoRefresh && job.status !== "completed" && job.status !== "failed"}
            disabled={job.status === "completed" || job.status === "failed"}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-surface-300 text-surface-900 focus:ring-0 focus:ring-offset-0 cursor-pointer disabled:opacity-40"
          />
          <span className="text-xs font-semibold text-surface-600 tracking-tight">Verileri otomatik yenile (2 saniyede bir)</span>
        </label>

        <Link
          href={`/admin/events/${eventId}`}
          className="inline-flex min-h-[38px] items-center justify-center rounded-lg bg-surface-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-surface-800 active:scale-[0.98] text-center"
        >
          Tamamlandı, Geri Dön
        </Link>
      </div>

    </div>
  );
}