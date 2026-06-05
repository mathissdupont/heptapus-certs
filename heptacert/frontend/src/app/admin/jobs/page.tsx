"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileBadge2,
  Loader2,
  Mail,
  RefreshCw,
  TableProperties,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { apiFetch, getApiBase, getToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Job = {
  id: number;
  type: "bulk_email" | "bulk_certificate" | "segment_export";
  type_label: string;
  event_id: number;
  event_name: string | null;
  status: string;
  total: number;
  done: number;
  success: number;
  failed: number;
  already_exists?: number;
  progress_pct: number;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  detail_url: string;
  download_url: string | null;
  can_cancel: boolean;
  can_download: boolean;
};

type JobsResponse = { jobs: Job[]; active_count: number };

const TYPE_ICON: Record<string, React.ElementType> = {
  bulk_email: Mail,
  bulk_certificate: FileBadge2,
  segment_export: TableProperties,
};

const STATUS_CONFIG: Record<string, { label: string; labelEn: string; color: string; icon: React.ElementType }> = {
  pending:    { label: "Kuyrukta",    labelEn: "Queued",      color: "bg-amber-50 text-amber-700 border-amber-200",   icon: Clock3 },
  sending:    { label: "Gönderiliyor", labelEn: "Sending",    color: "bg-blue-50 text-blue-700 border-blue-200",      icon: Loader2 },
  in_progress:{ label: "İşleniyor",  labelEn: "Processing",  color: "bg-blue-50 text-blue-700 border-blue-200",      icon: Loader2 },
  processing: { label: "İşleniyor",  labelEn: "Processing",  color: "bg-blue-50 text-blue-700 border-blue-200",      icon: Loader2 },
  completed:  { label: "Tamamlandı", labelEn: "Completed",   color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  failed:     { label: "Hata",       labelEn: "Failed",      color: "bg-rose-50 text-rose-700 border-rose-200",      icon: XCircle },
  cancelled:  { label: "İptal",      labelEn: "Cancelled",   color: "bg-surface-100 text-surface-500 border-surface-200", icon: XCircle },
};

function formatTime(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function elapsedSeconds(start: string | null, end: string | null): string {
  if (!start) return "";
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}dk ${s % 60}s`;
}

const ACTIVE_STATUSES = new Set(["pending", "sending", "in_progress", "processing"]);

export default function AdminJobsPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const [data, setData] = useState<JobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async (mode: "load" | "refresh" = "load") => {
    try {
      if (mode === "refresh") setRefreshing(true);
      const res = await apiFetch("/admin/jobs?limit=60");
      setData(await res.json());
      setError(null);
    } catch (ex: any) {
      setError(ex?.message || (isTr ? "İşler yüklenemedi." : "Failed to load jobs."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Poll every 3s when there are active jobs, every 15s otherwise
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const hasActive = (data?.active_count ?? 0) > 0;
    intervalRef.current = setInterval(() => void load("refresh"), hasActive ? 3000 : 15000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [data?.active_count]);

  const handleCancel = async (job: Job) => {
    setCancelling(job.id);
    try {
      await apiFetch(`/admin/events/${job.event_id}/bulk-generate-jobs/${job.id}/cancel`, { method: "POST" });
      await load("refresh");
    } catch {
      // ignore
    } finally {
      setCancelling(null);
    }
  };

  const handleDownload = (job: Job) => {
    if (!job.download_url) return;
    const token = getToken();
    const url = `${getApiBase()}${job.download_url.replace(/^\/api/, "")}`;
    const a = document.createElement("a");
    a.href = token ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : url;
    a.click();
  };

  const jobs = data?.jobs ?? [];
  const activeJobs = jobs.filter(j => ACTIVE_STATUSES.has(j.status));
  const recentJobs = jobs.filter(j => !ACTIVE_STATUSES.has(j.status));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
            {isTr ? "İş Merkezi" : "Job Center"}
          </p>
          <h1 className="mt-1.5 text-2xl font-black text-surface-900">
            {isTr ? "Arkaplan İşleri" : "Background Jobs"}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-surface-500">
            {isTr
              ? "Toplu e-posta, sertifika üretimi ve export işlemlerinin durumunu gerçek zamanlı takip edin."
              : "Track bulk email, certificate generation, and export jobs in real time."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load("refresh")}
          disabled={refreshing}
          className="btn-secondary"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {isTr ? "Yenile" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="error-banner flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
            <h2 className="text-sm font-bold text-surface-900">
              {isTr ? `${activeJobs.length} İşlem Devam Ediyor` : `${activeJobs.length} Running`}
            </h2>
          </div>
          {activeJobs.map(job => <JobCard key={`${job.type}-${job.id}`} job={job} isTr={isTr} onCancel={handleCancel} onDownload={handleDownload} cancelling={cancelling} />)}
        </section>
      )}

      {/* Recent completed/failed */}
      {recentJobs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-surface-500 uppercase tracking-wider">
            {isTr ? "Son İşlemler (7 Gün)" : "Recent (7 Days)"}
          </h2>
          {recentJobs.map(job => <JobCard key={`${job.type}-${job.id}`} job={job} isTr={isTr} onCancel={handleCancel} onDownload={handleDownload} cancelling={cancelling} />)}
        </section>
      )}

      {jobs.length === 0 && (
        <div className="card flex flex-col items-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 text-surface-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="mt-4 text-base font-bold text-surface-900">
            {isTr ? "Aktif iş yok" : "No jobs yet"}
          </p>
          <p className="mt-1 text-sm text-surface-500">
            {isTr
              ? "Toplu e-posta veya sertifika işlemi başlatıldığında burada görünür."
              : "Bulk email or certificate jobs will appear here when started."}
          </p>
        </div>
      )}
    </div>
  );
}

function JobCard({
  job,
  isTr,
  onCancel,
  onDownload,
  cancelling,
}: {
  job: Job;
  isTr: boolean;
  onCancel: (job: Job) => void;
  onDownload: (job: Job) => void;
  cancelling: number | null;
}) {
  const locale = isTr ? "tr-TR" : "en-US";
  const sc = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = sc.icon;
  const TypeIcon = TYPE_ICON[job.type] ?? Mail;
  const isActive = ACTIVE_STATUSES.has(job.status);

  return (
    <div className={`card overflow-hidden transition-shadow ${isActive ? "shadow-md ring-1 ring-blue-100" : ""}`}>
      {/* Progress bar strip at top */}
      {job.total > 0 && (
        <div className="h-1 w-full bg-surface-100">
          <div
            className={`h-1 transition-all duration-500 ${
              job.status === "failed" ? "bg-rose-400" :
              job.status === "completed" ? "bg-emerald-500" : "bg-blue-500"
            }`}
            style={{ width: `${job.progress_pct}%` }}
          />
        </div>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {/* Left: type + event + status */}
          <div className="flex items-start gap-3 min-w-0">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${sc.color}`}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-surface-900">{job.type_label}</p>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-11 font-bold ${sc.color}`}>
                  <StatusIcon className={`h-3 w-3 ${isActive ? "animate-spin" : ""}`} />
                  {isTr ? sc.label : sc.labelEn}
                </span>
              </div>
              {job.event_name && (
                <p className="mt-0.5 truncate text-xs text-surface-500">
                  {job.event_name}
                </p>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex shrink-0 items-center gap-2">
            {job.can_download && (
              <button
                type="button"
                onClick={() => onDownload(job)}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                {isTr ? "İndir" : "Download"}
              </button>
            )}
            {job.can_cancel && (
              <button
                type="button"
                onClick={() => onCancel(job)}
                disabled={cancelling === job.id}
                className="btn-secondary px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
              >
                {cancelling === job.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <XCircle className="h-3.5 w-3.5" />}
                {isTr ? "İptal" : "Cancel"}
              </button>
            )}
            <Link
              href={job.detail_url}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {isTr ? "Detay" : "Detail"}
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-wrap">
          {job.total > 0 && (
            <Stat label={isTr ? "Toplam" : "Total"} value={job.total} />
          )}
          {job.success > 0 && (
            <Stat label={isTr ? "Başarılı" : "Success"} value={job.success} color="text-emerald-600" />
          )}
          {job.failed > 0 && (
            <Stat label={isTr ? "Hata" : "Failed"} value={job.failed} color="text-rose-600" />
          )}
          {(job.already_exists ?? 0) > 0 && (
            <Stat label={isTr ? "Zaten var" : "Exists"} value={job.already_exists!} color="text-amber-600" />
          )}
          {job.total > 0 && (
            <Stat label="%" value={`${job.progress_pct}%`} color="text-brand-600" />
          )}
        </div>

        {/* Timing + error */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-11 text-surface-400">
          {job.created_at && (
            <span>{isTr ? "Başlatıldı" : "Started"}: {formatTime(job.created_at, locale)}</span>
          )}
          {job.completed_at ? (
            <span>{isTr ? "Tamamlandı" : "Done"}: {formatTime(job.completed_at, locale)}</span>
          ) : job.started_at ? (
            <span className="text-blue-500 font-semibold">
              ⏱ {elapsedSeconds(job.started_at, null)} {isTr ? "geçti" : "elapsed"}
            </span>
          ) : null}
        </div>

        {job.error_message && (
          <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {job.error_message}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color = "text-surface-900" }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-xl border border-surface-100 bg-surface-50 px-3 py-2 text-center">
      <p className="text-11 font-bold uppercase tracking-wide text-surface-400">{label}</p>
      <p className={`mt-0.5 text-base font-black tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
