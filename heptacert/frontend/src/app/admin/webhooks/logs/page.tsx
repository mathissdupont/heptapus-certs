"use client";

import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/Admin/PageHeader";
import { DataTable } from "@/components/DataTable/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { motion } from "framer-motion";

type WebhookLog = {
  id: number;
  webhook_id: number;
  event_type: string;
  status: "success" | "pending" | "failed" | "retrying";
  http_status: number | null;
  attempts: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  error_message: string | null;
  created_at: string;
};

type WebhookLogStats = {
  total_deliveries: number;
  successful: number;
  failed: number;
  pending: number;
  success_rate: number;
};

export default function WebhookLogsPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [stats, setStats] = useState<WebhookLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const [logsRes, statsRes] = await Promise.all([
        apiFetch("/admin/webhooks/logs?limit=100").catch(() => null),
        apiFetch("/admin/webhooks/stats").catch(() => null),
      ]);

      if (logsRes && logsRes.ok) {
        const data = await logsRes.json();
        setLogs(Array.isArray(data) ? data : data.items || []);
      }

      if (statsRes && statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (e: any) {
      const message = e?.message || "Failed to load webhook logs";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const statCards = useMemo(
    () => [
      {
        label: "Total Deliveries",
        value: stats?.total_deliveries ?? 0,
        icon: <RefreshCw className="h-5 w-5 text-blue-600" />,
        colorClass: "bg-blue-50 dark:bg-blue-900",
      },
      {
        label: "Successful",
        value: stats?.successful ?? 0,
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
        colorClass: "bg-emerald-50 dark:bg-emerald-900",
      },
      {
        label: "Failed",
        value: stats?.failed ?? 0,
        icon: <XCircle className="h-5 w-5 text-rose-600" />,
        colorClass: "bg-rose-50 dark:bg-rose-900",
      },
      {
        label: "Pending",
        value: stats?.pending ?? 0,
        icon: <Clock className="h-5 w-5 text-amber-600" />,
        colorClass: "bg-amber-50 dark:bg-amber-900",
      },
    ],
    [stats]
  );

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      success: "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200",
      pending: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
      failed: "bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200",
      retrying: "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200",
    };
    return colors[status] || "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-rose-600" />;
      case "pending":
      case "retrying":
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  const columns = useMemo<ColumnDef<WebhookLog>[]>(
    () => [
      {
        accessorKey: "event_type",
        header: "Event",
        cell: (info) => {
          const event = info.getValue() as string;
          return <span className="font-medium text-gray-800 dark:text-gray-200">{event}</span>;
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => {
          const status = info.getValue() as string;
          return (
            <div className="flex items-center gap-2">
              {getStatusIcon(status)}
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(status)}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "attempts",
        header: "Attempts",
        cell: (info) => <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{String(info.getValue())}</span>,
      },
      {
        accessorKey: "http_status",
        header: "HTTP Status",
        cell: (info) => {
          const status = String(info.getValue());
          return status && status !== 'undefined' ? (
            <span className="font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">{status}</span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">-</span>
          );
        },
      },
      {
        accessorKey: "last_attempt_at",
        header: "Last Attempt",
        cell: (info) => {
          const date = String(info.getValue());
          return date && date !== 'undefined' ? (
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              {new Date(date).toLocaleString()}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">-</span>
          );
        },
      },
      {
        accessorKey: "error_message",
        header: "Error",
        cell: (info) => {
          const error = String(info.getValue());
          return error && error !== 'undefined' ? (
            <span className="text-rose-600 dark:text-rose-400 text-xs truncate max-w-xs block">{error}</span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">-</span>
          );
        },
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Webhook Teslimat Günlüklerine"
        subtitle="Webhook olay teslimatlarını ve yeniden deneme geçmişini izleyin"
        icon={<RefreshCw className="h-5 w-5" />}
        breadcrumbs={[{ label: "Webhooks", href: "/admin/webhooks" }, { label: "Teslimat Günlükleri" }]}
        actions={
          <button onClick={fetchData} className="btn-primary">Yenile</button>
        }
      />

      {/* Error Alert */}
      {error && (
        <div className="error-banner mb-6">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Hata</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-6 flex items-center gap-4"
          >
            <div className={`p-3 rounded-lg ${card.colorClass}`}>{card.icon}</div>
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value.toLocaleString()}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Success Rate */}
      {stats && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="card mb-8 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Delivery Success Rate</p>
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {stats.success_rate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.success_rate}%` }}
              transition={{ delay: 0.35, duration: 0.8 }}
              className="h-4 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
            />
          </div>
        </motion.div>
      )}

      {/* Delivery Logs Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h2 className="text-xl font-bold text-surface-900 mb-4">Teslimat Geçmişi</h2>

        {logs.length === 0 ? (
          <div className="card p-12 text-center">
            <RefreshCw className="h-12 w-12 text-surface-300 mx-auto mb-4" />
            <p className="text-surface-500">Henüz webhook teslimatı yok</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={logs}
            pageSize={20}
            searchable={true}
            searchPlaceholder="Search by event, status, or error..."
            enableExport={true}
            exportFileName="webhook-logs.csv"
            enableColumnVisibility={true}
          />
        )}
      </motion.div>

      {/* Info Panel */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8 card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-6">
        <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-3">ℹ️ Webhook Delivery Information</h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <li>
            <strong>Success:</strong> Webhook was delivered and endpoint returned 2xx status code
          </li>
          <li>
            <strong>Failed:</strong> Webhook delivery failed after maximum retry attempts
          </li>
          <li>
            <strong>Pending:</strong> Webhook is waiting to be delivered
          </li>
          <li>
            <strong>Retrying:</strong> Webhook delivery failed but will be automatically retried
          </li>
          <li>
            <strong>Attempts:</strong> Number of times the webhook was sent (includes retries)
          </li>
        </ul>
      </motion.div>
    </div>
  );
}
