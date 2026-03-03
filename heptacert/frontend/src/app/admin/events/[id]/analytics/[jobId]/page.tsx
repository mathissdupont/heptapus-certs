'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

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
  const eventId = parseInt(params.eventId as string);
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

  if (loading) {
    return <div className="p-8 text-center">Yükleniyor...</div>;
  }

  if (!stats) {
    return <div className="p-8 text-center text-red-600">Veriler yüklenemedi</div>;
  }

  const StatCard = ({ label, value, unit = '', color = 'blue' }: any) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200',
      red: 'bg-red-50 border-red-200',
      amber: 'bg-amber-50 border-amber-200',
    };

    return (
      <div className={`border-2 rounded-lg p-4 ${colors[color] || colors.blue}`}>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">
          {value}
          {unit && <span className="text-lg ml-1">{unit}</span>}
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Geri Dön
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Email Gönderim Analitikleri</h1>
          <p className="text-gray-600 mt-2">Job #{jobId}</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard label="Toplam Alıcı" value={stats.total_recipients} color="blue" />
          <StatCard
            label="Gönderilen"
            value={stats.sent}
            color="green"
          />
          <StatCard
            label="Açılan"
            value={`${stats.open_rate}%`}
            color="amber"
          />
          <StatCard
            label="Bounce"
            value={`${stats.bounce_rate}%`}
            color="red"
          />
          <StatCard
            label="Başarısız"
            value={`${stats.failure_rate}%`}
            color="red"
          />
        </div>

        {/* Status Breakdown */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Durum Dağılımı</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Gönderilen</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.sent}</p>
              <p className="text-xs text-gray-500 mt-1">
                ({((stats.sent / stats.total_recipients) * 100).toFixed(1)}%)
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Beklemede</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
              <p className="text-xs text-gray-500 mt-1">
                ({((stats.pending / stats.total_recipients) * 100).toFixed(1)}%)
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Açılan</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.opened}</p>
              <p className="text-xs text-gray-500 mt-1">
                ({stats.open_rate}%)
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Bounce</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{stats.bounced}</p>
              <p className="text-xs text-gray-500 mt-1">
                ({stats.bounce_rate}%)
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Başarısız</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.failed}</p>
              <p className="text-xs text-gray-500 mt-1">
                ({stats.failure_rate}%)
              </p>
            </div>
          </div>
        </div>

        {/* Delivery Logs */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Gönderim Günlüğü</h2>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Tüm Durumlar</option>
              <option value="sent">Gönderilen</option>
              <option value="failed">Başarısız</option>
              <option value="bounced">Bounce</option>
              <option value="opened">Açılan</option>
            </select>
          </div>

          {logs && logs.logs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Gösterilecek günlük yoktur
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Alıcı
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      E-posta
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Gönderim Tarihi
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Açılış Tarihi
                    </th>
                    {stats.failure_rate > 0 && (
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Neden
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs?.logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {log.attendee.name}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {log.attendee.email}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            log.status === 'sent'
                              ? 'bg-green-100 text-green-800'
                              : log.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : log.status === 'bounced'
                              ? 'bg-orange-100 text-orange-800'
                              : log.status === 'opened'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {log.status === 'sent'
                            ? '✓ Gönderildi'
                            : log.status === 'failed'
                            ? '✗ Başarısız'
                            : log.status === 'bounced'
                            ? '↩ Bounce'
                            : log.status === 'opened'
                            ? '👁 Açıldı'
                            : log.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {new Date(log.sent_at).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {log.opened_at
                          ? new Date(log.opened_at).toLocaleString('tr-TR')
                          : '-'}
                      </td>
                      {stats.failure_rate > 0 && (
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {log.reason || '-'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {logs && logs.total > logs.limit && (
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Sayfa {logs.page} / {Math.ceil(logs.total / logs.limit)} ({logs.total} toplam)
              </p>
              <div className="space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Önceki
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(logs.total / logs.limit)}
                  className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
