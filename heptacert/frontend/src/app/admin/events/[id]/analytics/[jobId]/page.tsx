"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  Mail, 
  CheckCircle2, 
  Eye, 
  XCircle, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  BarChart3,
  RefreshCw
} from "lucide-react";

interface DeliveryStats {
  job_id: number;
  total_recipients: number;
  sent: number;
  failed: number;
  bounced: number;
  opened: number;
  pending: number;
  open_rate: number;
  bounce_rate: number;
  failure_rate: number;
}

interface DeliveryLog {
  id: number;
  attendee: { id: number; name: string; email: string };
  status: string;
  reason?: string;
  sent_at: string;
  opened_at?: string;
}

interface LogsResponse {
  logs: DeliveryLog[];
  total: number;
  page: number;
  limit: number;
}

export default function DeliveryAnalyticsPage() {
  const params = useParams();
  const eventId = parseInt(params.id as string);
  const jobId = parseInt(params.jobId as string);
  
  const router = useRouter();

  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [logs, setLogs] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, [statusFilter, page]);

  const fetchData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        apiFetch(`/admin/events/${eventId}/bulk-email-jobs/${jobId}/delivery-stats`),
        apiFetch(
          `/admin/events/${eventId}/bulk-email-jobs/${jobId}/delivery-logs?${new URLSearchParams({
            ...(statusFilter && { status: statusFilter }),
            page: page.toString(),
            limit: '50',
          })}`
        ),
      ]);

      const statsData = await statsRes.json();
      setStats(statsData);

      const logsData = await logsRes.json();
      setLogs(logsData);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  if (!stats) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50/40 p-4 text-xs font-semibold text-red-600 flex items-center gap-2 antialiased">
        <AlertCircle className="h-4 w-4" />
        <span>Veriler yüklenemedi</span>
      </div>
    );
  }

  // Apple Tarzı Sadeleştirilmiş Lokal Metrik Kartı
  const CleanStatCard = ({ label, value, color = 'blue' }: any) => {
    const borders: Record<string, string> = {
      blue: 'border-surface-200',
      green: 'border-emerald-200/60 bg-emerald-50/10',
      amber: 'border-amber-200/60 bg-amber-50/10',
      red: 'border-red-200/60 bg-red-50/10',
    };

    const textColors: Record<string, string> = {
      blue: 'text-surface-900',
      green: 'text-emerald-700',
      amber: 'text-amber-700',
      red: 'text-red-600',
    };

    return (
      <div className={`rounded-2xl border p-4 shadow-sm transition-all ${borders[color] || borders.blue}`}>
        <p className="text-11 font-bold uppercase tracking-widest text-surface-400 truncate">{label}</p>
        <p className={`text-2xl font-bold tracking-tight mt-1 tabular-nums ${textColors[color] || textColors.blue}`}>
          {value}
        </p>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 antialiased text-surface-900 space-y-6">
      
      {/* ÜST GEÇMİŞ BAŞLIK ALANI */}
      <div className="flex flex-col gap-1.5 pb-2">
        <button
          onClick={() => router.back()}
          className="inline-flex w-fit items-center gap-1 text-11 font-bold text-surface-400 uppercase tracking-wider transition-colors hover:text-surface-900"
        >
          <ArrowLeft className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>Geri Dön</span>
        </button>
        <div className="flex items-center justify-between gap-4 mt-1">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-surface-900 sm:text-2xl">E-posta Gönderim Analitikleri</h1>
            <p className="text-xs text-surface-400 font-mono mt-0.5">Görev Kimliği: #JOB-{jobId}</p>
          </div>
          <button 
            type="button" 
            onClick={() => void fetchData()} 
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-500 shadow-sm hover:bg-surface-50 active:scale-95 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5 stroke-[2]" />
          </button>
        </div>
      </div>

      {/* 1. ANA METRİK KARTLARI GRUBU */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <CleanStatCard label="Toplam Alıcı" value={stats.total_recipients} color="blue" />
        <CleanStatCard label="Gönderilen" value={stats.sent} color="green" />
        <CleanStatCard label="Açılma Oranı" value={`%${stats.open_rate}`} color="amber" />
        <CleanStatCard label="Bounce Oranı" value={`%${stats.bounce_rate}`} color="red" />
        <CleanStatCard label="Başarısız Oran" value={`%${stats.failure_rate}`} color="red" />
      </div>

      {/* 2. DURUM DAĞILIMI (Breakdown Matrix) */}
      <div className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900 border-b border-surface-100 pb-2.5">Detaylı Durum Dağılımı</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Gönderilen", count: stats.sent, pct: ((stats.sent / stats.total_recipients) * 100).toFixed(1), color: "text-emerald-600 bg-emerald-50/50" },
            { label: "Beklemede", count: stats.pending, pct: ((stats.pending / stats.total_recipients) * 100).toFixed(1), color: "text-amber-600 bg-amber-50/50" },
            { label: "Açılan (Tekil)", count: stats.opened, pct: stats.open_rate, color: "text-blue-600 bg-blue-50/50" },
            { label: "Bounce", count: stats.bounced, pct: stats.bounce_rate, color: "text-orange-600 bg-orange-50/50" },
            { label: "Başarısız", count: stats.failed, pct: stats.failure_rate, color: "text-red-600 bg-red-50/50" },
          ].map((item, idx) => (
            <div key={idx} className="rounded-xl border border-surface-100 bg-surface-50/30 p-3 text-center space-y-1">
              <p className="text-11 font-semibold text-surface-400 tracking-tight">{item.label}</p>
              <p className={`text-xl font-bold tracking-tight ${item.color.split(" ")[0]} tabular-nums`}>{item.count}</p>
              <span className={`inline-block rounded px-1.5 py-0.5 text-11 font-bold ${item.color}`}>
                %{item.pct}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. GÖNDERİM GÜNLÜĞÜ VERİ TABLOSU */}
      <div className="rounded-2xl border border-surface-200 bg-white shadow-sm overflow-hidden flex flex-col">
        {/* Tablo Başlık Alanı ve Filtre */}
        <div className="px-5 py-4 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-surface-800 stroke-[2]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900">Gönderim Günlüğü</h2>
          </div>
          
          <div className="relative inline-flex items-center select-none">
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="appearance-none rounded-xl border border-surface-200 bg-white pl-3 pr-7 py-1.5 text-xs font-semibold text-surface-700 outline-none hover:border-surface-300 transition-all cursor-pointer"
            >
              <option value="">Tüm Durumlar</option>
              <option value="sent">Gönderilen</option>
              <option value="failed">Başarısız</option>
              <option value="bounced">Bounce</option>
              <option value="opened">Açılan</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-surface-400" />
          </div>
        </div>

        {/* Tablo İçeriği */}
        {logs && logs.logs.length === 0 ? (
          <div className="py-14 text-center text-xs font-semibold text-surface-400 tracking-tight">
            Gösterilecek günlük kaydı bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/50">
                  <th className="px-5 py-3 text-11 font-bold uppercase tracking-wider text-surface-400 select-none">Alıcı</th>
                  <th className="px-5 py-3 text-11 font-bold uppercase tracking-wider text-surface-400 select-none">E-posta</th>
                  <th className="px-5 py-3 text-11 font-bold uppercase tracking-wider text-surface-400 select-none">Durum</th>
                  <th className="px-5 py-3 text-11 font-bold uppercase tracking-wider text-surface-400 select-none">Gönderim Tarihi</th>
                  <th className="px-5 py-3 text-11 font-bold uppercase tracking-wider text-surface-400 select-none">Açılış Tarihi</th>
                  {stats.failure_rate > 0 && (
                    <th className="px-5 py-3 text-11 font-bold uppercase tracking-wider text-surface-400 select-none">Neden</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs?.logs.map(log => (
                  <tr key={log.id} className="transition-colors hover:bg-surface-50/40">
                    <td className="px-5 py-3.5 text-xs font-bold text-surface-900 tracking-tight">{log.attendee.name}</td>
                    <td className="px-5 py-3.5 text-xs font-medium text-surface-400 font-mono tracking-tight">{log.attendee.email}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-11 font-bold tracking-tight shadow-sm ${
                          log.status === 'sent'
                            ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                            : log.status === 'failed'
                            ? 'border-red-100 bg-red-50 text-red-600'
                            : log.status === 'bounced'
                            ? 'border-orange-100 bg-orange-50 text-orange-700'
                            : log.status === 'opened'
                            ? 'border-blue-100 bg-blue-50 text-blue-700'
                            : 'border-surface-100 bg-surface-50 text-surface-500'
                        }`}
                      >
                        {log.status === 'sent'
                          ? '✓ Gönderildi'
                          : log.status === 'failed'
                          ? '✗ Başarısız'
                          : log.status === 'bounced'
                          ? '↩ Bounce'
                          : log.status === 'opened'
                          ? 'Açıldı'
                          : log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-surface-500 font-mono">
                      {new Date(log.sent_at).toLocaleString('tr-TR', { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-surface-500 font-mono">
                      {log.opened_at
                        ? new Date(log.opened_at).toLocaleString('tr-TR', { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })
                        : '-'}
                    </td>
                    {stats.failure_rate > 0 && (
                      <td className="px-5 py-3.5 text-xs font-semibold text-red-500 max-w-xs truncate" title={log.reason}>
                        {log.reason || '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. SAYFALAMA KONTROLLERİ (Pagination) */}
        {logs && logs.total > logs.limit && (
          <div className="px-5 py-3.5 border-t border-surface-100 bg-white flex items-center justify-between text-xs text-surface-400 font-semibold tracking-tight">
            <div>
              Sayfa {logs.page} / {Math.ceil(logs.total / logs.limit)} <span className="font-normal text-surface-300">({logs.total} kayıt)</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-100 bg-white text-surface-400 transition-all hover:text-surface-900 disabled:opacity-30 shadow-sm"
              >
                <ChevronLeft className="h-4 w-4 stroke-[2]" />
              </button>
              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(logs.total / logs.limit)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-100 bg-white text-surface-400 transition-all hover:text-surface-900 disabled:opacity-30 shadow-sm"
              >
                <ChevronRight className="h-4 w-4 stroke-[2]" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}