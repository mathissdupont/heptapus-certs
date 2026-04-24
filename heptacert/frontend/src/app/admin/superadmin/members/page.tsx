"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Mail, Search, Send, Users, RotateCcw, Square } from "lucide-react";
import PageHeader from "@/components/Admin/PageHeader";
import {
  cancelSuperadminBulkEmailJob,
  createSuperadminBulkEmailJob,
  getSuperadminEmailAudience,
  listSuperadminBulkEmailJobs,
  retrySuperadminBulkEmailJob,
  sendSuperadminBulkEmail,
  type SuperadminBulkEmailJob,
  type SuperadminAudienceItem,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type SourceFilter = "all" | "public_members" | "attendees";

export default function SuperadminMembersPage() {
  const { lang } = useI18n();
  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            title: "Uyeler ve Toplu Mail",
            subtitle: "Tum uyeleri ve kayitli katilimcilari tek panelde goruntuleyin, toplu duyuru gonderin.",
            source: "Hedef kitle",
            all: "Tum alicilar",
            members: "Public uyeler",
            attendees: "Kayitli katilimcilar",
            search: "Email ara...",
            refresh: "Yenile",
            uniqueAudience: "Benzersiz alici",
            publicMembers: "Public uye email",
            attendeeEmails: "Katilimci email",
            matchedRows: "Filtrelenen satir",
            mailSubject: "Mail konusu",
            mailBody: "Mail icerigi (HTML destekli)",
            dryRun: "Dry-run (sadece hedef say)",
            send: "Toplu Mail Gonder",
            sending: "Gonderiliyor...",
            loadError: "Liste yuklenemedi",
            sendError: "Toplu mail gonderimi basarisiz",
            invalidForm: "Konu ve icerik zorunludur",
            confirmSend: "Bu islem secili kitleye toplu mail gonderecek. Devam etmek istiyor musunuz?",
            result: "Sonuc",
            campaigns: "Kampanya gecmisi",
            status: "Durum",
            progress: "Ilerleme",
            created: "Olusturuldu",
            actions: "Islemler",
            cancel: "Iptal Et",
            retry: "Tekrar Dene",
            launching: "Kampanya baslatiliyor...",
            launchCampaign: "Kampanya Baslat",
            email: "Email",
            sources: "Kaynaklar",
            empty: "Kayit bulunamadi",
            emptyCampaigns: "Henuz kampanya yok",
            badgeMember: "Public uye",
            badgeAttendee: "Katilimci",
            status_pending: "Sirada",
            status_sending: "Gonderiliyor",
            status_completed: "Tamamlandi",
            status_failed: "Basarisiz",
            status_cancelled: "Iptal",
          }
        : {
            title: "Members & Bulk Email",
            subtitle: "View all members and registered attendees in one panel and send platform-wide announcements.",
            source: "Audience",
            all: "All recipients",
            members: "Public members",
            attendees: "Registered attendees",
            search: "Search email...",
            refresh: "Refresh",
            uniqueAudience: "Unique recipients",
            publicMembers: "Public member emails",
            attendeeEmails: "Attendee emails",
            matchedRows: "Filtered rows",
            mailSubject: "Email subject",
            mailBody: "Email content (HTML supported)",
            dryRun: "Dry run (count targets only)",
            send: "Send Bulk Email",
            sending: "Sending...",
            loadError: "Failed to load audience",
            sendError: "Failed to send bulk email",
            invalidForm: "Subject and content are required",
            confirmSend: "This will send a bulk email to the selected audience. Continue?",
            result: "Result",
            campaigns: "Campaign history",
            status: "Status",
            progress: "Progress",
            created: "Created",
            actions: "Actions",
            cancel: "Cancel",
            retry: "Retry",
            launching: "Launching campaign...",
            launchCampaign: "Launch Campaign",
            email: "Email",
            sources: "Sources",
            empty: "No records found",
            emptyCampaigns: "No campaigns yet",
            badgeMember: "Public member",
            badgeAttendee: "Attendee",
            status_pending: "Pending",
            status_sending: "Sending",
            status_completed: "Completed",
            status_failed: "Failed",
            status_cancelled: "Cancelled",
          },
    [lang]
  );

  const [source, setSource] = useState<SourceFilter>("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<SuperadminAudienceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [uniqueAudience, setUniqueAudience] = useState(0);
  const [uniquePublicMembers, setUniquePublicMembers] = useState(0);
  const [uniqueAttendees, setUniqueAttendees] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [jobs, setJobs] = useState<SuperadminBulkEmailJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [dryRun, setDryRun] = useState(false);

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
    if (status === "completed") return "bg-emerald-100 text-emerald-700";
    if (status === "failed") return "bg-rose-100 text-rose-700";
    if (status === "cancelled") return "bg-slate-200 text-slate-700";
    if (status === "sending") return "bg-blue-100 text-blue-700";
    return "bg-amber-100 text-amber-700";
  }

  return (
    <div className="space-y-6 pb-16">
      <PageHeader title={copy.title} subtitle={copy.subtitle} icon={<Users className="h-5 w-5" />} />

      <div className="card grid gap-3 p-4 md:grid-cols-[220px_minmax(0,1fr)_auto] md:items-end">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">{copy.source}</span>
          <select
            className="input"
            value={source}
            onChange={(e) => setSource(e.target.value as SourceFilter)}
          >
            <option value="all">{copy.all}</option>
            <option value="public_members">{copy.members}</option>
            <option value="attendees">{copy.attendees}</option>
          </select>
        </label>

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

        <button className="btn-secondary" onClick={() => void loadAudience()}>
          {copy.refresh}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-500">{copy.uniqueAudience}</p>
          <p className="mt-2 text-3xl font-black text-surface-900">{uniqueAudience}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-500">{copy.publicMembers}</p>
          <p className="mt-2 text-3xl font-black text-brand-700">{uniquePublicMembers}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-500">{copy.attendeeEmails}</p>
          <p className="mt-2 text-3xl font-black text-blue-700">{uniqueAttendees}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-500">{copy.matchedRows}</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{total}</p>
        </div>
      </div>

      {error && (
        <div className="error-banner flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {resultMessage && (
        <div className="card border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-semibold">{copy.result}</p>
          <p className="mt-1">{resultMessage}</p>
        </div>
      )}

      <div className="card space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-brand-600" />
          <p className="text-sm font-semibold text-surface-900">{copy.send}</p>
        </div>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">{copy.mailSubject}</span>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">{copy.mailBody}</span>
          <textarea
            className="input min-h-[180px]"
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
          />
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-surface-700">
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          {copy.dryRun}
        </label>

        <button className="btn-primary" onClick={() => void onSubmit()} disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? copy.sending : dryRun ? copy.send : copy.launchCampaign}
        </button>
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
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            {copy.badgeAttendee}
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
