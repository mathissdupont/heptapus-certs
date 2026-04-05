"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FeatureGate } from '@/lib/useSubscription';
import {
  Send, AlertCircle, Loader2, CheckCircle2,
  Clock, X, Eye, Plus, Mail, TrendingUp, FileText, Users,
} from "lucide-react";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import PageHeader from "@/components/Admin/PageHeader";
import { useI18n } from "@/lib/i18n";

type BulkEmailJob = {
  id: number;
  event_id: number;
  email_template_id: number;
  email_template?: { name: string; subject_tr: string; subject_en?: string };
  recipient_type: string;
  sent_count: number;
  failed_count: number;
  total_recipients: number;
  status: "pending" | "sending" | "completed" | "failed";
  created_at: string;
  updated_at: string;
  error_message?: string | null;
};

type EmailTemplate = {
  id: number;
  name: string;
  subject_tr: string;
  subject_en: string;
  body_html: string;
  template_type: string;
  is_system: boolean;
  created_at: string;
};

export default function BulkEmailsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { lang } = useI18n();

  const [jobs, setJobs] = useState<BulkEmailJob[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create campaign modal
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [recipientType, setRecipientType] = useState<"attendees" | "certified">("attendees");
  const [creating, setCreating] = useState(false);

  // Polling for job updates
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const copy = lang === "tr"
    ? {
        pageTitle: "Toplu Email Kampanyalari",
        pageSubtitle: "Kampanya baslatma, ilerleme takibi ve hedef secimi artik daha net bir akista.",
        newCampaign: "Yeni kampanya",
        loadError: "Veri yukleme basarisiz.",
        selectTemplate: "Lutfen bir email sablonu secin.",
        createError: "Kampanya olusturma basarisiz.",
        totalCampaigns: "Toplam kampanya",
        completed: "Tamamlanan",
        sending: "Gonderiliyor",
        failed: "Sorunlu",
        emptyTitle: "Henuz kampanya yok",
        emptyBody: "Hazir sablonlardan birini secip katilimcilara toplu iletisim akislarini baslatabilirsiniz.",
        firstCampaign: "Ilk kampanyayi olustur",
        templateLabel: "Sablon",
        subjectLabel: "Konu",
        recipientLabel: "Hedef grup",
        successLabel: "Basarili",
        failedLabel: "Basarisiz",
        targetLabel: "Hedef",
        createdAt: "Olusturulma",
        startCampaign: "Kampanyayi baslat",
        creating: "Olusturuluyor...",
        infoTitle: "Bilgi",
        infoBody: "Kampanya olusturulduktan sonra arka planda islenir. Gonderim durumu otomatik olarak guncellenir.",
        attendeesTitle: "Tum katilimcilar",
        attendeesBody: "Etkinlige kayitli ve uygun tum kisiler",
        certifiedTitle: "Sertifikalandirilanlar",
        certifiedBody: "Yalnizca sertifikasi hazir olan kisiler",
        chooseTemplate: "Sablon secin",
        preview: "Detay",
        progressSent: "gonderildi",
        pending: "Sirada",
        statusSending: "Gonderiliyor",
        statusCompleted: "Tamamlandi",
        statusFailed: "Basarisiz",
      }
    : {
        pageTitle: "Bulk Email Campaigns",
        pageSubtitle: "Campaign creation, progress tracking and recipient targeting in a cleaner operational flow.",
        newCampaign: "New campaign",
        loadError: "Failed to load data.",
        selectTemplate: "Please choose an email template.",
        createError: "Failed to create campaign.",
        totalCampaigns: "Total campaigns",
        completed: "Completed",
        sending: "Sending",
        failed: "Failed",
        emptyTitle: "No campaigns yet",
        emptyBody: "Pick one of your templates and start a bulk communication flow for attendees.",
        firstCampaign: "Create first campaign",
        templateLabel: "Template",
        subjectLabel: "Subject",
        recipientLabel: "Recipient group",
        successLabel: "Successful",
        failedLabel: "Failed",
        targetLabel: "Target",
        createdAt: "Created",
        startCampaign: "Launch campaign",
        creating: "Creating...",
        infoTitle: "Info",
        infoBody: "Once created, the campaign is processed in the background and its progress updates automatically.",
        attendeesTitle: "All attendees",
        attendeesBody: "Everyone registered and eligible for this event",
        certifiedTitle: "Certified only",
        certifiedBody: "Only people whose certificates are ready",
        chooseTemplate: "Choose a template",
        preview: "Details",
        progressSent: "sent",
        pending: "Queued",
        statusSending: "Sending",
        statusCompleted: "Completed",
        statusFailed: "Failed",
      };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [eventId]);

  async function loadData() {
    try {
      setError(null);
      const [jobsRes, templatesRes] = await Promise.all([
        apiFetch(`/admin/events/${eventId}/bulk-emails`),
        apiFetch(`/admin/events/${eventId}/email-templates`),
      ]);

      const jobsData = await jobsRes.json();
      const templatesData = await templatesRes.json();

      setJobs(jobsData || []);
      setTemplates(templatesData || []);
    } catch (e: any) {
      setError(e?.message || copy.loadError);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCampaign() {
    if (!selectedTemplate) {
      setError(copy.selectTemplate);
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await apiFetch(`/admin/events/${eventId}/bulk-email`, {
        method: "POST",
        body: JSON.stringify({
          email_template_id: selectedTemplate,
          recipient_type: recipientType,
        }),
      });

      const newJob = await res.json();
      setShowModal(false);
      setSelectedTemplate(null);
      setRecipientType("attendees");
      setSelectedJobId(newJob.id);
      await loadData();
    } catch (e: any) {
      setError(e?.message || copy.createError);
    } finally {
      setCreating(false);
    }
  }

  function getStatusBadge(status: string) {
    const statusMap: Record<string, { bg: string; text: string; icon: JSX.Element; label: string }> = {
      pending: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        icon: <Clock className="h-4 w-4" />,
        label: copy.pending,
      },
      sending: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        icon: <Mail className="h-4 w-4" />,
        label: copy.statusSending,
      },
      completed: {
        bg: "bg-green-100",
        text: "text-green-800",
        icon: <CheckCircle2 className="h-4 w-4" />,
        label: copy.statusCompleted,
      },
      failed: {
        bg: "bg-red-100",
        text: "text-red-800",
        icon: <AlertCircle className="h-4 w-4" />,
        label: copy.statusFailed,
      },
    };

    const mapping = statusMap[status] || statusMap.pending;

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${mapping.bg} ${mapping.text}`}>
        {mapping.icon}
        {mapping.label}
      </span>
    );
  }

  function getProgressPercentage(job: BulkEmailJob) {
    if (job.total_recipients === 0) return 0;
    return Math.round(((job.sent_count + job.failed_count) / job.total_recipients) * 100);
  }

  function getRecipientLabel(type: string) {
    return type === "certified" ? copy.certifiedTitle : copy.attendeesTitle;
  }

  const selectedJob = jobs.find((job) => job.id === selectedJobId) || null;
  const completedCount = jobs.filter((job) => job.status === "completed").length;
  const sendingCount = jobs.filter((job) => job.status === "sending").length;
  const failedCount = jobs.filter((job) => job.status === "failed").length;
  const selectedTemplateItem = templates.find((template) => template.id === selectedTemplate) || null;

  return (
    <FeatureGate requiredPlans={["growth", "enterprise"]}>
      <div className="space-y-6 pb-20 pt-6">
        <EventAdminNav eventId={eventId} active="email" className="flex flex-col gap-2" />

        <PageHeader
          title={copy.pageTitle}
          subtitle={copy.pageSubtitle}
          icon={<Send className="h-5 w-5" />}
          actions={
            <>
              <Link href={`/admin/events/${eventId}/email-templates`} className="btn-secondary">
                <FileText className="h-4 w-4" />
                {copy.templateLabel}
              </Link>
              <button onClick={() => setShowModal(true)} className="btn-primary">
                <Plus className="h-4 w-4" />
                {copy.newCampaign}
              </button>
            </>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.totalCampaigns}</p>
            <p className="mt-2 text-3xl font-black text-surface-900">{jobs.length}</p>
            <p className="mt-1 text-xs text-surface-500">Campaigns</p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.completed}</p>
            <p className="mt-2 text-3xl font-black text-emerald-600">{completedCount}</p>
            <p className="mt-1 text-xs text-surface-500">{copy.statusCompleted}</p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.sending}</p>
            <p className="mt-2 text-3xl font-black text-blue-600">{sendingCount}</p>
            <p className="mt-1 text-xs text-surface-500">{copy.statusSending}</p>
          </div>
          <div className="card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.failed}</p>
            <p className="mt-2 text-3xl font-black text-rose-600">{failedCount}</p>
            <p className="mt-1 text-xs text-surface-500">{copy.statusFailed}</p>
          </div>
        </div>

        {error && (
          <div className="error-banner flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="card rounded-3xl border-2 border-dashed border-surface-300 bg-surface-50 p-12 text-center">
            <Send className="mx-auto mb-4 h-12 w-12 text-surface-400" />
            <p className="text-lg font-semibold text-surface-900">{copy.emptyTitle}</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-surface-500">{copy.emptyBody}</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mx-auto mt-5">
              <Plus className="h-4 w-4" />
              {copy.firstCampaign}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-4">
              {jobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`card p-5 sm:p-6 ${selectedJobId === job.id ? "border-brand-200 bg-brand-50/40" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-bold text-surface-900">
                          {job.email_template?.name || `${copy.templateLabel} #${job.email_template_id}`}
                        </h3>
                        {getStatusBadge(job.status)}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-surface-500">
                        <span className="rounded-full border border-surface-200 bg-surface-50 px-3 py-1">{copy.recipientLabel}: {getRecipientLabel(job.recipient_type)}</span>
                        <span className="rounded-full border border-surface-200 bg-surface-50 px-3 py-1">{copy.createdAt}: {new Date(job.created_at).toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}</span>
                      </div>
                      <p className="mt-3 text-sm text-surface-600">
                        {copy.subjectLabel || "Subject"}: {job.email_template?.subject_tr || job.email_template?.subject_en || "N/A"}
                      </p>
                    </div>
                    <button onClick={() => setSelectedJobId(job.id === selectedJobId ? null : job.id)} className="rounded-2xl p-2 text-surface-400 transition hover:bg-surface-100 hover:text-surface-700">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-surface-700">
                        {job.sent_count + job.failed_count} / {job.total_recipients} {copy.progressSent}
                      </span>
                      <span className="font-bold text-surface-900">{getProgressPercentage(job)}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-200">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${getProgressPercentage(job)}%` }}
                        transition={{ duration: 0.45 }}
                        className={`h-full rounded-full ${job.status === "failed" ? "bg-rose-500" : job.status === "completed" ? "bg-emerald-500" : "bg-blue-500"}`}
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-2xl bg-emerald-50 px-3 py-3">
                      <p className="font-bold text-emerald-700">{job.sent_count}</p>
                      <p className="mt-1 text-[11px] text-emerald-700">{copy.successLabel}</p>
                    </div>
                    <div className="rounded-2xl bg-rose-50 px-3 py-3">
                      <p className="font-bold text-rose-700">{job.failed_count}</p>
                      <p className="mt-1 text-[11px] text-rose-700">{copy.failedLabel}</p>
                    </div>
                    <div className="rounded-2xl bg-surface-100 px-3 py-3">
                      <p className="font-bold text-surface-900">{job.total_recipients}</p>
                      <p className="mt-1 text-[11px] text-surface-600">{copy.targetLabel}</p>
                    </div>
                  </div>

                  {job.error_message && (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {job.error_message}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-soft">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.preview}</p>
                  <h2 className="text-xl font-black tracking-tight text-surface-900">{selectedJob ? selectedJob.email_template?.name || `${copy.templateLabel} #${selectedJob.email_template_id}` : copy.newCampaign}</h2>
                </div>
              </div>

              {selectedJob ? (
                <div className="mt-5 space-y-3 text-sm text-surface-600">
                  <div className="rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.recipientLabel}</p>
                    <p className="mt-2 font-semibold text-surface-900">{getRecipientLabel(selectedJob.recipient_type)}</p>
                  </div>
                  <div className="rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.createdAt}</p>
                    <p className="mt-2 font-semibold text-surface-900">{new Date(selectedJob.created_at).toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}</p>
                  </div>
                  <div className="rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">Progress</p>
                    <p className="mt-2 font-semibold text-surface-900">{getProgressPercentage(selectedJob)}%</p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-surface-300 bg-surface-50 px-5 py-10 text-center text-sm text-surface-500">
                  {lang === "tr" ? "Detaylari gormek icin bir kampanya secin." : "Pick a campaign to see its details."}
                </div>
              )}
            </div>
          </div>
        )}

        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center sm:p-4"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-surface-200 bg-white shadow-lifted"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-surface-100 px-5 py-5 sm:px-6">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-surface-900">{copy.newCampaign}</h2>
                    <p className="mt-1 text-sm text-surface-500">{copy.pageSubtitle}</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="rounded-2xl border border-surface-200 p-2 text-surface-400 transition hover:border-surface-300 hover:text-surface-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
                  <div>
                    <label className="label mb-3">{copy.templateLabel}</label>
                    <select
                      value={selectedTemplate || ""}
                      onChange={(event) => setSelectedTemplate(event.target.value ? parseInt(event.target.value, 10) : null)}
                      className="input-field"
                    >
                      <option value="">{copy.chooseTemplate}</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    {selectedTemplateItem && (
                      <div className="mt-3 rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-600">
                        <p className="font-semibold text-surface-900">{selectedTemplateItem.name}</p>
                        <p className="mt-1">{selectedTemplateItem.subject_tr || selectedTemplateItem.subject_en}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="label mb-3">{copy.recipientLabel}</label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setRecipientType("attendees")}
                        className={`rounded-3xl border p-4 text-left transition ${recipientType === "attendees" ? "border-brand-200 bg-brand-50" : "border-surface-200 bg-white hover:border-surface-300"}`}
                      >
                        <p className="font-semibold text-surface-900">{copy.attendeesTitle}</p>
                        <p className="mt-2 text-sm leading-6 text-surface-500">{copy.attendeesBody}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecipientType("certified")}
                        className={`rounded-3xl border p-4 text-left transition ${recipientType === "certified" ? "border-brand-200 bg-brand-50" : "border-surface-200 bg-white hover:border-surface-300"}`}
                      >
                        <p className="font-semibold text-surface-900">{copy.certifiedTitle}</p>
                        <p className="mt-2 text-sm leading-6 text-surface-500">{copy.certifiedBody}</p>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm text-blue-900">
                    <span className="font-semibold">{copy.infoTitle}:</span> {copy.infoBody}
                  </div>
                </div>

                <div className="border-t border-surface-100 px-5 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button onClick={() => setShowModal(false)} className="btn-secondary justify-center">
                      {lang === "tr" ? "Iptal" : "Cancel"}
                    </button>
                    <button
                      onClick={handleCreateCampaign}
                      disabled={!selectedTemplate || creating}
                      className="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                      {creating ? copy.creating : copy.startCampaign}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FeatureGate>
  );
}
