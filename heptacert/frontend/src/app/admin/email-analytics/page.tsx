"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Mail,
  MailCheck,
  AlertCircle,
  MailOpen,
  TrendingUp,
  Calendar,
  Loader2,
  ArrowLeft,
  Send,
  XCircle,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/Admin/PageHeader";
import { DataTable } from "@/components/DataTable/DataTable";
import { ColumnDef } from "@tanstack/react-table";

type EmailJob = {
  id: number;
  event_id: number;
  template_id: number;
  recipient_email: string;
  status: "pending" | "sent" | "failed" | "bounced" | "opened";
  sent_at: string | null;
  opened_at: string | null;
  created_at: string;
};

type EmailStats = {
  total_sent: number;
  total_opened: number;
  total_failed: number;
  total_bounced: number;
  open_rate: number;
  bounce_rate: number;
  failure_rate: number;
};

export default function EmailAnalyticsPage() {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [jobs, setJobs] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      // Fetch email stats and jobs
      const [statsRes, jobsRes] = await Promise.all([
        apiFetch("/admin/email/stats").catch(() => null),
        apiFetch("/admin/email/jobs?limit=100").catch(() => null),
      ]);

      if (statsRes && statsRes.ok) {
        setStats(await statsRes.json());
      }

      if (jobsRes && jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(Array.isArray(data) ? data : data.items || []);
      }
    } catch (e: any) {
      const message = e?.message || "Failed to load email analytics";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const statCards = useMemo(
    () => [
      {
        label: "Total Sent",
        value: stats?.total_sent ?? 0,
        icon: <Mail className="h-5 w-5 text-blue-600" />,
        colorClass: "bg-blue-50 dark:bg-blue-900",
        textColor: "text-blue-600 dark:text-blue-400",
      },
      {
        label: "Opened",
        value: stats?.total_opened ?? 0,
        icon: <MailOpen className="h-5 w-5 text-emerald-600" />,
        colorClass: "bg-emerald-50 dark:bg-emerald-900",
        textColor: "text-emerald-600 dark:text-emerald-400",
      },
      {
        label: "Bounced",
        value: stats?.total_bounced ?? 0,
        icon: <AlertCircle className="h-5 w-5 text-amber-600" />,
        colorClass: "bg-amber-50 dark:bg-amber-900",
        textColor: "text-amber-600 dark:text-amber-400",
      },
      {
        label: "Failed",
        value: stats?.total_failed ?? 0,
        icon: <XCircle className="h-5 w-5 text-rose-600" />,
        colorClass: "bg-rose-50 dark:bg-rose-900",
        textColor: "text-rose-600 dark:text-rose-400",
      },
    ],
    [stats]
  );

  const rateCards = useMemo(
    () => [
      {
        label: "Open Rate",
        value: `${(stats?.open_rate ?? 0).toFixed(1)}%`,
        icon: <Eye className="h-5 w-5 text-blue-600" />,
        colorClass: "bg-blue-50 dark:bg-blue-900",
      },
      {
        label: "Bounce Rate",
        value: `${(stats?.bounce_rate ?? 0).toFixed(1)}%`,
        icon: <AlertCircle className="h-5 w-5 text-amber-600" />,
        colorClass: "bg-amber-50 dark:bg-amber-900",
      },
      {
        label: "Failure Rate",
        value: `${(stats?.failure_rate ?? 0).toFixed(1)}%`,
        icon: <XCircle className="h-5 w-5 text-rose-600" />,
        colorClass: "bg-rose-50 dark:bg-rose-900",
      },
    ],
    [stats]
  );

  const statusColors: Record<string, string> = {
    sent: "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200",
    opened: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
    pending: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200",
    failed: "bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200",
    bounced: "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200",
  };

  const columns = useMemo<ColumnDef<EmailJob>[]>(
    () => [
      {
        accessorKey: "recipient_email",
        header: "Recipient",
        cell: (info) => (
          <span className="text-gray-800 dark:text-gray-200 font-medium">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => {
          const status = info.getValue() as string;
          const colors = statusColors[status] || "bg-gray-100 text-gray-800";
          const labels: Record<string, string> = {
            sent: "Sent",
            opened: "Opened",
            pending: "Pending",
            failed: "Failed",
            bounced: "Bounced",
          };
          return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors}`}>{labels[status]}</span>;
        },
      },
      {
        accessorKey: "sent_at",
        header: "Sent Time",
        cell: (info) => {
          const date = info.getValue();
          return date ? (
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              {new Date(date as string).toLocaleString()}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
          );
        },
      },
      {
        accessorKey: "opened_at",
        header: "Opened Time",
        cell: (info) => {
          const date = info.getValue();
          return date ? (
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              {new Date(date as string).toLocaleString()}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: (info) => (
          <span className="text-gray-600 dark:text-gray-400 text-sm">
            {new Date(info.getValue() as string).toLocaleDateString()}
          </span>
        ),
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Email Analytics"
        subtitle="Email teslimatını, açılma oranlarını ve kampanya performansını takip edin"
        icon={<TrendingUp className="h-5 w-5" />}
        breadcrumbs={[{ label: "Email Dashboard", href: "/admin/email-dashboard" }, { label: "Email Analytics" }]}
        actions={
          <button onClick={fetchData} className="btn-primary">
            Yenile
          </button>
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

      {/* Statistics Cards */}
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
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">
                {card.label}
              </p>
              <p className={`text-2xl font-extrabold ${card.textColor}`}>{card.value.toLocaleString()}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Rate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {rateCards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className="card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${card.colorClass}`}>{card.icon}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Send className="h-5 w-5 text-brand-500" /> Email Delivery Log
        </h2>

        {jobs.length === 0 ? (
          <div className="card p-12 text-center dark:bg-gray-800 dark:border-gray-700">
            <Mail className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No email delivery history yet</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={jobs}
            pageSize={15}
            searchable={true}
            searchPlaceholder="Search by email or status..."
            enableExport={true}
            exportFileName="email-analytics.csv"
            enableColumnVisibility={true}
          />
        )}
      </motion.div>

      {/* Info Panel */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-6">
        <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" /> Analytics Information
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <li>
            <strong>Open Rate:</strong> Percentage of emails that were opened by recipients
          </li>
          <li>
            <strong>Bounce Rate:</strong> Percentage of emails that could not be delivered to the recipient
          </li>
          <li>
            <strong>Failure Rate:</strong> Percentage of emails that failed due to configuration or server errors
          </li>
          <li>
            <strong>Status Legend:</strong> Pending (queued), Sent (delivered), Opened (recipient opened), Bounced (recipient not found), Failed (delivery error)
          </li>
        </ul>
      </motion.div>
    </div>
  );
}
