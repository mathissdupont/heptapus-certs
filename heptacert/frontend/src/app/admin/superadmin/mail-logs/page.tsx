"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/Admin/PageHeader";
import { listSuperadminEmailActivity, type SuperadminEmailActivityItem } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type ChannelFilter = "all" | "event_bulk" | "superadmin_bulk";

export default function SuperadminMailLogsPage() {
  const { lang } = useI18n();
  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            title: "Mail Loglari",
            subtitle: "Kim hangi maili ne zaman gonderdi, tum kampanya kanallarinda merkezi olarak izleyin.",
            refresh: "Yenile",
            channel: "Kanal",
            all: "Tum kanallar",
            eventBulk: "Event Bulk",
            superadminBulk: "Superadmin Bulk",
            status: "Durum",
            allStatus: "Tum durumlar",
            search: "Gonderen, konu veya etkinlik ara...",
            total: "Toplam",
            sent: "Gonderilen",
            failed: "Basarisiz",
            sender: "Gonderen",
            subject: "Konu",
            event: "Etkinlik",
            recipientGroup: "Alici grubu",
            progress: "Ilerleme",
            created: "Olusturuldu",
            noRows: "Kayit bulunamadi",
            loadError: "Mail loglari yuklenemedi",
          }
        : {
            title: "Mail Logs",
            subtitle: "Track who sent which email and when, across all campaign channels.",
            refresh: "Refresh",
            channel: "Channel",
            all: "All channels",
            eventBulk: "Event Bulk",
            superadminBulk: "Superadmin Bulk",
            status: "Status",
            allStatus: "All statuses",
            search: "Search sender, subject, or event...",
            total: "Total",
            sent: "Sent",
            failed: "Failed",
            sender: "Sender",
            subject: "Subject",
            event: "Event",
            recipientGroup: "Recipient group",
            progress: "Progress",
            created: "Created",
            noRows: "No records found",
            loadError: "Failed to load mail logs",
          },
    [lang]
  );

  const [rows, setRows] = useState<SuperadminEmailActivityItem[]>([]);
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(mode: "load" | "refresh" = "load") {
    try {
      if (mode === "load") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const res = await listSuperadminEmailActivity({
        channel,
        status: status === "all" ? undefined : status,
        search: search.trim() || undefined,
        limit: 200,
        offset: 0,
      });
      setRows(res.items || []);
    } catch (e: any) {
      setError(e?.message || copy.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, status]);

  const totalSent = rows.reduce((acc, row) => acc + row.sent_count, 0);
  const totalFailed = rows.reduce((acc, row) => acc + row.failed_count, 0);

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        icon={<ShieldCheck className="h-5 w-5" />}
        actions={
          <button onClick={() => void load("refresh")} disabled={refreshing} className="btn-secondary gap-2 text-xs">
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {copy.refresh}
          </button>
        }
      />

      {error && (
        <div className="error-banner flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="card grid gap-3 p-4 lg:grid-cols-[220px_220px_minmax(0,1fr)]">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">{copy.channel}</span>
          <select className="input" value={channel} onChange={(e) => setChannel(e.target.value as ChannelFilter)}>
            <option value="all">{copy.all}</option>
            <option value="event_bulk">{copy.eventBulk}</option>
            <option value="superadmin_bulk">{copy.superadminBulk}</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">{copy.status}</span>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">{copy.allStatus}</option>
            <option value="pending">pending</option>
            <option value="sending">sending</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
            <option value="cancelled">cancelled</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">Search</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              className="input pl-9"
              placeholder={copy.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load("refresh");
              }}
            />
          </div>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-500">{copy.total}</p>
          <p className="mt-2 text-3xl font-black text-surface-900">{rows.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-500">{copy.sent}</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{totalSent}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-500">{copy.failed}</p>
          <p className="mt-2 text-3xl font-black text-rose-700">{totalFailed}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-surface-500">{copy.noRows}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-50 text-left text-xs uppercase tracking-[0.1em] text-surface-500">
                <tr>
                  <th className="px-4 py-3">{copy.sender}</th>
                  <th className="px-4 py-3">{copy.subject}</th>
                  <th className="px-4 py-3">{copy.event}</th>
                  <th className="px-4 py-3">{copy.recipientGroup}</th>
                  <th className="px-4 py-3">{copy.status}</th>
                  <th className="px-4 py-3">{copy.progress}</th>
                  <th className="px-4 py-3">{copy.created}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {rows.map((row) => (
                  <tr key={`${row.channel}-${row.job_id}`}>
                    <td className="px-4 py-3 text-surface-900">{row.sender_email}</td>
                    <td className="px-4 py-3 text-surface-900">{row.subject}</td>
                    <td className="px-4 py-3 text-surface-700">{row.event_name || "-"}</td>
                    <td className="px-4 py-3 text-surface-700">{row.recipient_group}</td>
                    <td className="px-4 py-3 text-surface-700">{row.status}</td>
                    <td className="px-4 py-3 text-surface-700">{row.sent_count + row.failed_count}/{row.total_targets}</td>
                    <td className="px-4 py-3 text-surface-700">{new Date(row.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
