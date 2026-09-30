"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/Admin/PageHeader";
import { listSuperadminEmailActivity, type SuperadminEmailActivityItem } from "@/lib/api";
import { useI18n, translate } from "@/lib/i18n";

type ChannelFilter = "all" | "event_bulk" | "superadmin_bulk" | "crm_bulk" | "automation";

export default function SuperadminMailLogsPage() {
  const { lang } = useI18n();
  const copy = useMemo(
    () =>
      ({ title: translate(lang, "migrated_app_admin_superadmin_mail_logs_mail_logs_41714b92"), subtitle: translate(lang, "migrated_app_admin_superadmin_mail_logs_track_who_sent_which_email_and_when_across_e3aab5af"), refresh: translate(lang, "migrated_app_admin_superadmin_mail_logs_refresh_555d6b84"), channel: translate(lang, "migrated_app_admin_superadmin_mail_logs_channel_82db8469"), all: translate(lang, "migrated_app_admin_superadmin_mail_logs_all_channels_28f4e45a"), eventBulk: translate(lang, "migrated_app_admin_superadmin_mail_logs_event_bulk_39fac21f"), superadminBulk: translate(lang, "migrated_app_admin_superadmin_mail_logs_superadmin_bulk_4c730c05"), crmBulk: translate(lang, "migrated_app_admin_superadmin_mail_logs_crm_bulk_mail_21191103"), automation: translate(lang, "migrated_app_admin_superadmin_mail_logs_automation_a3507da0"), status: translate(lang, "migrated_app_admin_superadmin_mail_logs_status_fb690c6c"), allStatus: translate(lang, "migrated_app_admin_superadmin_mail_logs_all_statuses_655bc307"), search: translate(lang, "migrated_app_admin_superadmin_mail_logs_search_sender_subject_or_event_bdf620d5"), total: translate(lang, "migrated_app_admin_superadmin_mail_logs_total_4343372b"), sent: translate(lang, "migrated_app_admin_superadmin_mail_logs_sent_b07c6e2b"), failed: translate(lang, "migrated_app_admin_superadmin_mail_logs_failed_17910a5e"), sender: translate(lang, "migrated_app_admin_superadmin_mail_logs_sender_1b498e8b"), subject: translate(lang, "migrated_app_admin_superadmin_mail_logs_subject_2d5f93d9"), event: translate(lang, "migrated_app_admin_superadmin_mail_logs_event_968fa1c3"), recipientGroup: translate(lang, "migrated_app_admin_superadmin_mail_logs_recipient_group_b935d8cb"), progress: translate(lang, "migrated_app_admin_superadmin_mail_logs_progress_e2c48bef"), created: translate(lang, "migrated_app_admin_superadmin_mail_logs_created_631055de"), noRows: translate(lang, "migrated_app_admin_superadmin_mail_logs_no_records_found_1681d563"), loadError: translate(lang, "migrated_app_admin_superadmin_mail_logs_failed_to_load_mail_logs_e2535f0a") }),
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
            <option value="crm_bulk">{copy.crmBulk}</option>
            <option value="automation">{copy.automation}</option>
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
          <p className="text-11 font-semibold uppercase tracking-[0.18em] text-surface-500">{copy.total}</p>
          <p className="mt-2 text-3xl font-black text-surface-900">{rows.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-11 font-semibold uppercase tracking-[0.18em] text-surface-500">{copy.sent}</p>
          <p className="mt-2 text-3xl font-black text-status-success-content">{totalSent}</p>
        </div>
        <div className="card p-4">
          <p className="text-11 font-semibold uppercase tracking-[0.18em] text-surface-500">{copy.failed}</p>
          <p className="mt-2 text-3xl font-black text-status-danger-content">{totalFailed}</p>
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
