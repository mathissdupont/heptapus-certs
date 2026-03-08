"use client";

import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Loader2, AlertCircle, TrendingUp, DollarSign, CheckCircle2, XCircle, Clock } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/Admin/PageHeader";
import { DataTable } from "@/components/DataTable/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { motion } from "framer-motion";

type Transaction = {
  id: number;
  event_id: number | null;
  event_name: string | null;
  user_email: string;
  amount: number;
  currency: string;
  status: "completed" | "pending" | "failed" | "refunded";
  payment_method: string;
  description: string;
  created_at: string;
  completed_at: string | null;
};

type PaymentStats = {
  total_revenue: number;
  total_transactions: number;
  completed_transactions: number;
  pending_transactions: number;
  failed_transactions: number;
  refunded_amount: number;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const [txRes, statsRes] = await Promise.all([
        apiFetch("/admin/payments/transactions?limit=100").catch(() => null),
        apiFetch("/admin/payments/stats").catch(() => null),
      ]);

      if (txRes && txRes.ok) {
        const data = await txRes.json();
        setTransactions(Array.isArray(data) ? data : data.items || []);
      }

      if (statsRes && statsRes.ok) {
        setStats(await statsRes.json());
      } else {
        // Mock data for demo
        setStats({
          total_revenue: 12500.0,
          total_transactions: 45,
          completed_transactions: 42,
          pending_transactions: 2,
          failed_transactions: 1,
          refunded_amount: 250.0,
        });
      }
    } catch (e: any) {
      const message = e?.message || "Failed to load transactions";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const statCards = useMemo(
    () => [
      {
        label: "Total Revenue",
        value: `$${(stats?.total_revenue ?? 0).toFixed(2)}`,
        icon: <DollarSign className="h-5 w-5 text-emerald-600" />,
        colorClass: "bg-emerald-50 dark:bg-emerald-900",
      },
      {
        label: "Completed",
        value: stats?.completed_transactions ?? 0,
        icon: <CheckCircle2 className="h-5 w-5 text-blue-600" />,
        colorClass: "bg-blue-50 dark:bg-blue-900",
      },
      {
        label: "Pending",
        value: stats?.pending_transactions ?? 0,
        icon: <Clock className="h-5 w-5 text-amber-600" />,
        colorClass: "bg-amber-50 dark:bg-amber-900",
      },
      {
        label: "Failed",
        value: stats?.failed_transactions ?? 0,
        icon: <XCircle className="h-5 w-5 text-rose-600" />,
        colorClass: "bg-rose-50 dark:bg-rose-900",
      },
    ],
    [stats]
  );

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200",
      pending: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
      failed: "bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200",
      refunded: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200",
    };
    return colors[status] || "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200";
  };

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Transaction ID",
        cell: (info) => <span className="font-mono text-xs text-gray-600 dark:text-gray-400">#{String(info.getValue())}</span>,
        size: 100,
      },
      {
        accessorKey: "user_email",
        header: "Customer",
        cell: (info) => <span className="text-gray-800 dark:text-gray-200">{String(info.getValue())}</span>,
      },
      {
        accessorKey: "event_name",
        header: "Event",
        cell: (info) => (
          <span className="text-gray-700 dark:text-gray-300 font-medium">{(info.getValue() as string) || "-"}</span>
        ),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: (info) => {
          const tx = info.row.original;
          return (
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {tx.currency} {Number(info.getValue()).toFixed(2)}
            </span>
          );
        },
      },
      {
        accessorKey: "payment_method",
        header: "Method",
        cell: (info) => (
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            {String(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => {
          const status = info.getValue() as string;
          const labels: Record<string, string> = {
            completed: "Completed",
            pending: "Pending",
            failed: "Failed",
            refunded: "Refunded",
          };
          return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(status)}`}>
              {labels[status] || status}
            </span>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Date",
        cell: (info) => (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {new Date(info.getValue() as string).toLocaleDateString()}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: (info) => <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs">{String(info.getValue())}</span>,
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
        title="Ödeme İşlemleri"
        subtitle="Tüm ödemeleri, iadeleri ve finansal işlemleri takip edin"
        icon={<TrendingUp className="h-5 w-5" />}
        breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Ödeme İşlemleri" }]}
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
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Refund Summary */}
      {stats && stats.refunded_amount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="card mb-8 p-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 dark:border dark:border-amber-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Total Refunded</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">${stats.refunded_amount.toFixed(2)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-amber-600 dark:text-amber-400 opacity-20" />
          </div>
        </motion.div>
      )}

      {/* Transactions Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Transaction History</h2>

        {transactions.length === 0 ? (
          <div className="card p-12 text-center dark:bg-gray-800 dark:border-gray-700">
            <DollarSign className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={transactions}
            pageSize={20}
            searchable={true}
            searchPlaceholder="Search by email, event, or ID..."
            enableExport={true}
            exportFileName="transactions.csv"
            enableColumnVisibility={true}
          />
        )}
      </motion.div>

      {/* Info Panel */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 p-6">
        <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-3">💼 Transaction Information</h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <li>
            <strong>Completed:</strong> Payment was successfully processed and settled
          </li>
          <li>
            <strong>Pending:</strong> Payment is processing and settlement is awaiting confirmation
          </li>
          <li>
            <strong>Failed:</strong> Payment processing failed - customer was not charged
          </li>
          <li>
            <strong>Refunded:</strong> Original payment was reversed and refunded to customer
          </li>
        </ul>
      </motion.div>
    </div>
  );
}
