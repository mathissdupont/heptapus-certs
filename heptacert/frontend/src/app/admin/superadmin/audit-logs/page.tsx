"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  FileText,
} from "lucide-react";
import { listAuditLogs, AuditLogOut } from "@/lib/api";
import { DataTable } from "@/components/DataTable/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/useToast";

export default function AuditLogsPage() {
  const router = useRouter();
  const toast = useToast();

  const [logs, setLogs] = useState<AuditLogOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setError(null);
      const result = await listAuditLogs({ page: 1, limit: 100 });
      setLogs(result.items);
    } catch (e: any) {
      console.error("Failed to load audit logs:", e);
      setError(e?.message || "Denetim günlükleri yüklenemedi");
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "login":
        return <LogIn className="h-4 w-4 text-emerald-600" />;
      case "logout":
        return <LogOut className="h-4 w-4 text-blue-600" />;
      case "update":
        return <Edit className="h-4 w-4 text-orange-600" />;
      case "delete":
        return <Trash2 className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      login: "Giriş",
      logout: "Çıkış",
      create: "Oluştur",
      update: "Güncelle",
      delete: "Sil",
    };
    return labels[action] || action;
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "login":
        return "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200";
      case "logout":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      case "update":
        return "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200";
      case "delete":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200";
    }
  };

  const columns = useMemo<ColumnDef<AuditLogOut>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: (info) => <span className="font-mono text-xs text-gray-500">#{info.getValue() as number}</span>,
        size: 60,
      },
      {
        accessorKey: "user_email",
        header: "User",
        cell: (info) => <span className="text-gray-800 dark:text-gray-200">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: (info) => {
          const action = info.getValue() as string;
          return (
            <div className="flex items-center gap-2">
              {getActionIcon(action)}
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getActionBadgeColor(action)}`}>
                {getActionLabel(action)}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "resource_type",
        header: "Resource",
        cell: (info) => (
          <span className="text-gray-700 dark:text-gray-300 font-medium">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: "resource_id",
        header: "Resource ID",
        cell: (info) => <span className="font-mono text-xs text-gray-500">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "details",
        header: "Details",
        cell: (info) => (
          <div className="max-w-xs">
            <p className="text-gray-700 dark:text-gray-300 text-sm truncate">{info.getValue() as string}</p>
          </div>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Timestamp",
        cell: (info) => {
          const date = new Date(info.getValue() as string);
          return (
            <div className="text-gray-600 dark:text-gray-400 text-sm">
              <div className="font-mono">{date.toLocaleDateString()}</div>
              <div className="text-xs text-gray-500">{date.toLocaleTimeString()}</div>
            </div>
          );
        },
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
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Denetim Günlükleri</h1>
            <p className="text-sm text-surface-500 mt-1">
              Sistem aktivitesini ve değişiklikleri izleyin — {logs.length} kayıt
            </p>
          </div>
        </div>

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

        {/* Advanced DataTable */}
        <DataTable
          columns={columns}
          data={logs}
          pageSize={20}
          searchable={true}
          searchPlaceholder="Search by user, resource, or details..."
          enableExport={true}
          exportFileName="audit-logs.csv"
          enableColumnVisibility={true}
        />
      </div>
    </div>
  );
}
