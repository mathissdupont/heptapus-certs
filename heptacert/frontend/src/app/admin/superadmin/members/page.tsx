"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Mail, Search, Send, Users, RotateCcw, Square, Building2, UserRound, ListFilter } from "lucide-react";
import PageHeader from "@/components/Admin/PageHeader";
import {
  cancelSuperadminBulkEmailJob,
  createSuperadminBulkEmailJob,
  getSuperadminEmailAudience,
  listSuperadminBulkEmailJobs,
  retrySuperadminBulkEmailJob,
  sendSuperadminBulkEmail,
  sendSuperadminBulkEmailTest,
  type SuperadminBulkEmailJob,
  type SuperadminAudienceItem,
} from "@/lib/api";
import { useI18n, translate } from "@/lib/i18n";

type SourceFilter = "all" | "public_members" | "attendees" | "organizers";

export default function SuperadminMembersPage() {
  const { lang } = useI18n();
  const copy = useMemo(
    () =>
      ({ title: translate(lang, "migrated_app_admin_superadmin_members_members_bulk_email_322452fb"), subtitle: translate(lang, "migrated_app_admin_superadmin_members_view_all_members_and_registered_attendees__7f4b84d7"), source: translate(lang, "migrated_app_admin_superadmin_members_audience_7153185c"), all: translate(lang, "migrated_app_admin_superadmin_members_all_recipients_aad30536"), members: translate(lang, "migrated_app_admin_superadmin_members_public_members_a9494fda"), attendees: translate(lang, "migrated_app_admin_superadmin_members_registered_attendees_9f2fd88b"), organizers: translate(lang, "migrated_app_admin_superadmin_members_organizer_accounts_bbedcf2d"), search: translate(lang, "migrated_app_admin_superadmin_members_search_email_1e07936c"), refresh: translate(lang, "migrated_app_admin_superadmin_members_refresh_dde9d603"), uniqueAudience: translate(lang, "migrated_app_admin_superadmin_members_unique_recipients_5d8541ae"), publicMembers: translate(lang, "migrated_app_admin_superadmin_members_public_member_emails_bf4a47e2"), attendeeEmails: translate(lang, "migrated_app_admin_superadmin_members_attendee_emails_6638461e"), organizerEmails: translate(lang, "migrated_app_admin_superadmin_members_organizer_emails_bb0b3504"), matchedRows: translate(lang, "migrated_app_admin_superadmin_members_filtered_rows_420327a6"), mailSubject: translate(lang, "migrated_app_admin_superadmin_members_email_subject_62759980"), mailBody: translate(lang, "migrated_app_admin_superadmin_members_email_content_html_supported_99cc8b28"), dryRun: translate(lang, "migrated_app_admin_superadmin_members_dry_run_count_targets_only_ac1bd974"), send: translate(lang, "migrated_app_admin_superadmin_members_send_bulk_email_13b02d5b"), sending: translate(lang, "migrated_app_admin_superadmin_members_sending_7525b61b"), loadError: translate(lang, "migrated_app_admin_superadmin_members_failed_to_load_audience_93a149cb"), sendError: translate(lang, "migrated_app_admin_superadmin_members_failed_to_send_bulk_email_441ba343"), invalidForm: translate(lang, "migrated_app_admin_superadmin_members_subject_and_content_are_required_4a7c0935"), confirmSend: translate(lang, "migrated_app_admin_superadmin_members_this_will_send_a_bulk_email_to_the_selecte_5564e8ff"), result: translate(lang, "migrated_app_admin_superadmin_members_result_c62d2227"), campaigns: translate(lang, "migrated_app_admin_superadmin_members_campaign_history_def9d3a8"), status: translate(lang, "migrated_app_admin_superadmin_members_status_d3af0b15"), progress: translate(lang, "migrated_app_admin_superadmin_members_progress_28c4ee0c"), created: translate(lang, "migrated_app_admin_superadmin_members_created_980260ef"), actions: translate(lang, "migrated_app_admin_superadmin_members_actions_e2451b1f"), cancel: translate(lang, "migrated_app_admin_superadmin_members_cancel_2c78e4fc"), retry: translate(lang, "migrated_app_admin_superadmin_members_retry_360107e0"), launching: translate(lang, "migrated_app_admin_superadmin_members_launching_campaign_4931435f"), launchCampaign: translate(lang, "migrated_app_admin_superadmin_members_launch_campaign_860fea4e"), email: translate(lang, "migrated_app_admin_superadmin_members_email_a9601b9a"), sources: translate(lang, "migrated_app_admin_superadmin_members_sources_3da20dc0"), empty: translate(lang, "migrated_app_admin_superadmin_members_no_records_found_1860875a"), emptyCampaigns: translate(lang, "migrated_app_admin_superadmin_members_no_campaigns_yet_07a3f264"), badgeMember: translate(lang, "migrated_app_admin_superadmin_members_public_member_b09e07ee"), badgeAttendee: translate(lang, "migrated_app_admin_superadmin_members_attendee_dac98a72"), badgeOrganizer: translate(lang, "migrated_app_admin_superadmin_members_organizer_b62b08ee"), composerTitle: translate(lang, "migrated_app_admin_superadmin_members_send_bulk_email_416d2c11"), composerHint: translate(lang, "migrated_app_admin_superadmin_members_enter_subject_and_html_content_then_dry_ru_d0b2457a"), audienceSummary: translate(lang, "migrated_app_admin_superadmin_members_audience_summary_3baf60a0"), filterTitle: translate(lang, "migrated_app_admin_superadmin_members_target_filter_711e65d1"), notePublicOnly: translate(lang, "migrated_app_admin_superadmin_members_public_members_only_0f23d0d3"), noteOrganizersOnly: translate(lang, "migrated_app_admin_superadmin_members_organizer_accounts_only_87032b67"), status_pending: translate(lang, "migrated_app_admin_superadmin_members_pending_633678b6"), status_sending: translate(lang, "migrated_app_admin_superadmin_members_sending_51099031"), status_completed: translate(lang, "migrated_app_admin_superadmin_members_completed_fc89e8ed"), status_failed: translate(lang, "migrated_app_admin_superadmin_members_failed_2b6281ce"), status_cancelled: translate(lang, "migrated_app_admin_superadmin_members_cancelled_527d0df4") }),
    [lang]
  );

  const [source, setSource] = useState<SourceFilter>("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<SuperadminAudienceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [uniqueAudience, setUniqueAudience] = useState(0);
  const [uniquePublicMembers, setUniquePublicMembers] = useState(0);
  const [uniqueAttendees, setUniqueAttendees] = useState(0);
  const [uniqueOrganizers, setUniqueOrganizers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [jobs, setJobs] = useState<SuperadminBulkEmailJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [dryRun, setDryRun] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);

  async function loadAudience() {
    try {
      setError(null);
      const res = await getSuperadminEmailAudience({
        source,
        search: search.trim() || undefined,
        limit: 200,
        offset: 0,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
      setUniqueAudience(res.total || 0);
      setUniquePublicMembers(res.unique_public_member_emails || 0);
      setUniqueAttendees(res.unique_attendee_emails || 0);
      setUniqueOrganizers(res.unique_organizer_emails || 0);
    } catch (e: any) {
      setError(e?.message || copy.loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAudience();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  async function loadJobs() {
    try {
      const data = await listSuperadminBulkEmailJobs({ limit: 50, offset: 0 });
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      // jobs panel should not block rest of page
    } finally {
      setJobsLoading(false);
    }
  }

  useEffect(() => {
    void loadJobs();
    const interval = setInterval(() => {
      void loadJobs();
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit() {
    if (!subject.trim() || !bodyHtml.trim()) {
      setError(copy.invalidForm);
      return;
    }
    if (!dryRun && !window.confirm(copy.confirmSend)) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setResultMessage(null);
      const res = await sendSuperadminBulkEmail({
        subject, body_html: bodyHtml, source, dry_run: true,
      });
      if (dryRun) {
        setResultMessage(`${res.message} | targeted=${res.targeted}, sent=${res.sent}, failed=${res.failed}`);
      } else {
        await createSuperadminBulkEmailJob({
          subject,
          body_html: bodyHtml,
          source,
        });
        setResultMessage(copy.launching);
        await loadJobs();
      }
      await loadAudience();
    } catch (e: any) {
      setError(e?.message || copy.sendError);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSendTest() {
    if (!subject.trim() || !bodyHtml.trim()) {
      setError(copy.invalidForm);
      return;
    }
    if (!testEmail.trim() || !testEmail.includes("@")) {
      setError(translate(lang, "migrated_app_admin_superadmin_members_enter_a_valid_test_recipient_6e0ed506"));
      return;
    }

    try {
      setTestSending(true);
      setError(null);
      setResultMessage(null);
      const res = await sendSuperadminBulkEmailTest({
        to_email: testEmail.trim(),
        subject,
        body_html: bodyHtml,
      });
      setResultMessage(`${translate(lang, "migrated_app_admin_superadmin_members_test_email_sent_3baee7be")}: ${res.to_email}`);
    } catch (e: any) {
      setError(e?.message || (translate(lang, "migrated_app_admin_superadmin_members_failed_to_send_test_email_8e1f99f8")));
    } finally {
      setTestSending(false);
    }
  }

  async function onCancelJob(jobId: number) {
    try {
      setError(null);
      await cancelSuperadminBulkEmailJob(jobId);
      await loadJobs();
    } catch (e: any) {
      setError(e?.message || copy.sendError);
    }
  }

  async function onRetryJob(jobId: number) {
    try {
      setError(null);
      await retrySuperadminBulkEmailJob(jobId);
      await loadJobs();
    } catch (e: any) {
      setError(e?.message || copy.sendError);
    }
  }

  function getStatusLabel(status: string) {
    const key = `status_${status}` as const;
    return (copy as any)[key] || status;
  }

  function getStatusClass(status: string) {
    if (status === "completed") return "bg-status-success-bg text-status-success-content";
    if (status === "failed") return "bg-status-danger-bg text-status-danger-content";
    if (status === "cancelled") return "bg-sunken text-surface-700";
    if (status === "sending") return "bg-status-info-bg text-status-info-content";
    return "bg-status-warning-bg text-status-warning-content";
  }

  const filterOptions: Array<{ value: SourceFilter; label: string; note: string; icon: JSX.Element }> = [
    { value: "all", label: copy.all, note: copy.audienceSummary, icon: <ListFilter className="h-4 w-4" /> },
    { value: "public_members", label: copy.members, note: copy.notePublicOnly, icon: <UserRound className="h-4 w-4" /> },
    { value: "attendees", label: copy.attendees, note: copy.attendeeEmails, icon: <Mail className="h-4 w-4" /> },
    { value: "organizers", label: copy.organizers, note: copy.noteOrganizersOnly, icon: <Building2 className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader title={copy.title} subtitle={copy.subtitle} icon={<Users className="h-5 w-5" />} />

      <div className="card space-y-5 p-5 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.filterTitle}</p>
            <h2 className="mt-1 text-lg font-black text-surface-900">{copy.audienceSummary}</h2>
          </div>
          <button className="btn-secondary self-start" onClick={() => void loadAudience()}>
            {copy.refresh}
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          {filterOptions.map((option) => {
            const active = source === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setSource(option.value)}
                className={`rounded-2xl border p-4 text-left transition-all ${active ? "border-brand-500 bg-brand-50 shadow-sm" : "border-surface-200 bg-raised hover:border-surface-300"}`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-surface-900">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${active ? "bg-brand-600 text-white" : "bg-surface-100 text-surface-600"}`}>
                    {option.icon}
                  </span>
                  {option.label}
                </div>
                <p className="mt-2 text-xs leading-5 text-surface-500">{option.note}</p>
              </button>
            );
          })}
        </div>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">{copy.email}</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              className="input pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={copy.search}
              onKeyDown={(e) => {
                if (e.key === "Enter") void loadAudience();
              }}
            />
          </div>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="card p-4">
          <p className="text-11 font-semibold uppercase tracking-[0.18em] text-surface-500">{copy.uniqueAudience}</p>
          <p className="mt-2 text-3xl font-black text-surface-900">{uniqueAudience}</p>
        </div>
        <div className="card p-4">
          <p className="text-11 font-semibold uppercase tracking-[0.18em] text-surface-500">{copy.publicMembers}</p>
          <p className="mt-2 text-3xl font-black text-brand-700">{uniquePublicMembers}</p>
        </div>
        <div className="card p-4">
          <p className="text-11 font-semibold uppercase tracking-[0.18em] text-surface-500">{copy.attendeeEmails}</p>
          <p className="mt-2 text-3xl font-black text-status-info-content">{uniqueAttendees}</p>
        </div>
        <div className="card p-4">
          <p className="text-11 font-semibold uppercase tracking-[0.18em] text-surface-500">{copy.organizerEmails}</p>
          <p className="mt-2 text-3xl font-black text-status-info-content">{uniqueOrganizers}</p>
        </div>
        <div className="card p-4">
          <p className="text-11 font-semibold uppercase tracking-[0.18em] text-surface-500">{copy.matchedRows}</p>
          <p className="mt-2 text-3xl font-black text-status-success-content">{total}</p>
        </div>
      </div>

      {error && (
        <div className="error-banner flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {resultMessage && (
        <div className="card border border-status-success-border bg-status-success-bg p-4 text-sm text-status-success-content">
          <p className="font-semibold">{copy.result}</p>
          <p className="mt-1">{resultMessage}</p>
        </div>
      )}

      <div className="card space-y-4 p-5 md:p-6">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-brand-600" />
          <p className="text-sm font-semibold text-surface-900">{copy.composerTitle}</p>
        </div>
        <p className="text-sm text-surface-500">{copy.composerHint}</p>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">{copy.mailSubject}</span>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">{copy.mailBody}</span>
          <textarea className="input min-h-[260px] resize-y" value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} />
        </label>
        </div>

        <div className="grid gap-3 rounded-2xl border border-surface-200 bg-surface-50 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
              {translate(lang, "migrated_app_admin_superadmin_members_test_recipient_441f19bf")}
            </span>
            <input
              type="email"
              className="input"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <button className="btn-secondary" onClick={() => void onSendTest()} disabled={testSending || submitting}>
            {testSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {testSending
              ? translate(lang, "migrated_app_admin_superadmin_members_sending_test_58da9a2e")
              : translate(lang, "migrated_app_admin_superadmin_members_send_test_email_cbbf9529")}
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-surface-200 bg-surface-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-surface-700">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            {copy.dryRun}
          </label>

          <button className="btn-primary" onClick={() => void onSubmit()} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? copy.sending : dryRun ? copy.send : copy.launchCampaign}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-surface-100 px-4 py-3">
          <p className="text-sm font-semibold text-surface-900">{copy.campaigns}</p>
        </div>
        {jobsLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
          </div>
        ) : jobs.length === 0 ? (
          <p className="p-6 text-sm text-surface-500">{copy.emptyCampaigns}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-50 text-left text-xs uppercase tracking-[0.1em] text-surface-500">
                <tr>
                  <th className="px-4 py-3">{copy.mailSubject}</th>
                  <th className="px-4 py-3">{copy.status}</th>
                  <th className="px-4 py-3">{copy.progress}</th>
                  <th className="px-4 py-3">{copy.created}</th>
                  <th className="px-4 py-3">{copy.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="px-4 py-3 font-medium text-surface-900">{job.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusClass(job.status)}`}>
                        {getStatusLabel(job.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-surface-700">
                      {job.sent_count + job.failed_count}/{job.total_targets} (ok:{job.sent_count} fail:{job.failed_count})
                    </td>
                    <td className="px-4 py-3 text-surface-600">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {(job.status === "pending" || job.status === "sending") && (
                          <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => void onCancelJob(job.id)}>
                            <Square className="h-3.5 w-3.5" /> {copy.cancel}
                          </button>
                        )}
                        {(job.status === "failed" || job.status === "cancelled" || job.status === "completed") && (
                          <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => void onRetryJob(job.id)}>
                            <RotateCcw className="h-3.5 w-3.5" /> {copy.retry}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-surface-100 px-4 py-3">
          <p className="text-sm font-semibold text-surface-900">{copy.uniqueAudience}</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-surface-500">{copy.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-50 text-left text-xs uppercase tracking-[0.1em] text-surface-500">
                <tr>
                  <th className="px-4 py-3">{copy.email}</th>
                  <th className="px-4 py-3">{copy.sources}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {items.map((item) => (
                  <tr key={item.email}>
                    <td className="px-4 py-3 font-medium text-surface-900">{item.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {item.public_member_count > 0 && (
                          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                            {copy.badgeMember}
                          </span>
                        )}
                        {item.attendee_count > 0 && (
                          <span className="rounded-full bg-status-info-bg px-2 py-0.5 text-xs font-semibold text-status-info-content">
                            {copy.badgeAttendee}
                          </span>
                        )}
                        {source === "organizers" && (
                          <span className="rounded-full bg-status-info-bg px-2 py-0.5 text-xs font-semibold text-status-info-content">
                            {copy.badgeOrganizer}
                          </span>
                        )}
                      </div>
                    </td>
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
