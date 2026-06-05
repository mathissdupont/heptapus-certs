"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FeatureGate } from '@/lib/useSubscription';
import {
  Send, AlertCircle, Loader2, CheckCircle2,
  Clock, X, Eye, Plus, Mail, BarChart3, FileText, Users, ChevronDown, Workflow
} from "lucide-react";

import { apiFetch, listEventSegments, type AudienceSegment } from "@/lib/api";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import PageHeader from "@/components/Admin/PageHeader";
import EmailTemplateSelect from "@/components/Admin/EmailTemplateSelect";
import AdminEmptyState from "@/components/Admin/EmptyState";
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
  const [segments, setSegments] = useState<AudienceSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create campaign modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [recipientType, setRecipientType] = useState<string>("attendees");
  const [creating, setCreating] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const copy = lang === "tr"
    ? {
        pageTitle: "Toplu E-posta Kampanyaları",
        pageSubtitle: "Kampanya başlatma, ilerleme takibi ve hedef seçimi artık daha net bir akışta.",
        newCampaign: "Yeni kampanya",
        loadError: "Veri yükleme başarısız.",
        selectTemplate: "Lütfen bir e-posta şablonu seçin.",
        createError: "Kampanya oluşturma başarısız.",
        totalCampaigns: "Toplam kampanya",
        completed: "Tamamlanan",
        sending: "Gönderiliyor",
        failed: "Sorunlu",
        emptyTitle: "Henüz kampanya yok",
        emptyBody: "Hazır şablonlardan birini seçip katılımcılara toplu iletişim akışlarını başlatabilirsiniz.",
        firstCampaign: "İlk kampanyayı oluştur",
        templateLabel: "Şablon",
        subjectLabel: "Konu",
        recipientLabel: "Hedef grup",
        successLabel: "Başarılı",
        failedLabel: "Başarısız",
        targetLabel: "Hedef",
        createdAt: "Oluşturulma",
        startCampaign: "Kampanyayı başlat",
        creating: "Oluşturuluyor...",
        infoTitle: "Bilgi",
        infoBody: "Kampanya oluşturulduktan sonra arka planda işlenir. Gönderim durumu otomatik olarak güncellenir.",
        attendeesTitle: "Tüm katılımcılar",
        attendeesBody: "Etkinliğe kayıtlı ve uygun tüm kişiler",
        certifiedTitle: "Sertifikalandırılanlar",
        certifiedBody: "Yalnızca sertifikası hazır olan kişiler",
        chooseTemplate: "Şablon seçin",
        preview: "Detay Raporu",
        progressSent: "gönderildi",
        pending: "Sırada",
        statusSending: "Gönderiliyor",
        statusCompleted: "Tamamlandı",
        statusFailed: "Başarısız",
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
        preview: "Details Report",
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
      const [jobsRes, templatesRes, segmentsData] = await Promise.all([
        apiFetch(`/admin/events/${eventId}/bulk-emails`),
        apiFetch(`/admin/events/${eventId}/email-templates`),
        listEventSegments(Number(eventId)).catch(() => []),
      ]);

      const jobsData = await jobsRes.json();
      const templatesData = await templatesRes.json();

      setJobs(jobsData || []);
      setTemplates(templatesData || []);
      setSegments((segmentsData || []).filter((segment) => !segment.dynamic));
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
      pending: { bg: "bg-amber-50 border-amber-100/60 text-amber-700", text: "text-amber-700", icon: <Clock className="h-3 w-3 stroke-[2]" />, label: copy.pending },
      sending: { bg: "bg-blue-50 border-blue-100/60 text-blue-700", text: "text-blue-700", icon: <Mail className="h-3 w-3 stroke-[2]" />, label: copy.statusSending },
      completed: { bg: "bg-emerald-50 border-emerald-100/60 text-emerald-700", text: "text-emerald-700", icon: <CheckCircle2 className="h-3 w-3 stroke-[2.5]" />, label: copy.statusCompleted },
      failed: { bg: "bg-red-50 border-red-100/60 text-red-600", text: "text-red-700", icon: <AlertCircle className="h-3 w-3 stroke-[2]" />, label: copy.statusFailed },
    };

    const mapping = statusMap[status] || statusMap.pending;

    return (
      <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-11 font-bold tracking-tight shadow-sm ${mapping.bg}`}>
        {mapping.icon}
        <span>{mapping.label}</span>
      </span>
    );
  }

  function getProgressPercentage(job: BulkEmailJob) {
    if (job.total_recipients === 0) return 0;
    return Math.round(((job.sent_count + job.failed_count) / job.total_recipients) * 100);
  }

  function getRecipientLabel(type: string) {
    if (type.startsWith("segment:")) {
      const key = type.split(":", 2)[1];
      return segments.find((segment) => segment.key === key)?.label || key;
    }
    return type === "certified" ? copy.certifiedTitle : copy.attendeesTitle;
  }

  const selectedJob = jobs.find((job) => job.id === selectedJobId) || null;
  const completedCount = jobs.filter((job) => job.status === "completed").length;
  const sendingCount = jobs.filter((job) => job.status === "sending").length;
  const failedCount = jobs.filter((job) => job.status === "failed").length;
  const selectedTemplateItem = templates.find((template) => template.id === selectedTemplate) || null;

  return (
    <FeatureGate requiredPlans={["growth", "enterprise"]}>
      <div className="w-full flex flex-col gap-5 antialiased text-surface-900 pb-16">
        
        {/* ÜST ETKİNLİK NAVİGASYONU */}
        <EventAdminNav eventId={Number(eventId)} active="email" className="mb-1" />

        {/* SAYFA BAŞLIĞI */}
        <PageHeader
          title={copy.pageTitle}
          subtitle={copy.pageSubtitle}
          icon={<Send className="h-4 w-4 stroke-[2]" />}
          actions={
            <div className="flex items-center gap-2">
              <Link href={`/admin/events/${eventId}/email-templates`} className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-surface-200 bg-white px-3.5 text-xs font-semibold text-surface-700 shadow-sm transition hover:bg-surface-50">
                <FileText className="h-3.5 w-3.5 text-surface-400 stroke-[1.8]" />
                <span>{copy.templateLabel}</span>
              </Link>
              <button 
                onClick={() => setShowModal(true)} 
                className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-surface-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-surface-800 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>{copy.newCampaign}</span>
              </button>
            </div>
          }
        />

        {/* METRİK HÜCRE IZGARASI */}
        <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
          {[
            { label: copy.totalCampaigns, val: jobs.length, sub: "Üretilen görev", color: "text-surface-900" },
            { label: copy.completed, val: completedCount, sub: copy.statusCompleted, color: "text-emerald-600" },
            { label: copy.sending, val: sendingCount, sub: copy.statusSending, color: "text-blue-600" },
            { label: copy.failed, val: failedCount, sub: copy.statusFailed, color: "text-red-600" },
          ].map((stat, i) => (
            <div key={i} className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm space-y-1">
              <p className="text-11 font-bold uppercase tracking-widest text-surface-400 truncate">{stat.label}</p>
              <p className={`text-2xl font-bold tracking-tight font-mono tabular-nums ${stat.color}`}>{stat.val}</p>
              <p className="text-11 font-medium text-surface-400">{stat.sub}</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50/40 p-4 text-xs font-semibold text-red-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* BOŞ DURUM VEYA DETAYLI ÇİFT SÜTUN AKIŞI */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-surface-400 stroke-[2.5]" /></div>
        ) : jobs.length === 0 ? (
          <AdminEmptyState
            icon={<Send className="h-5 w-5 stroke-[1.5] text-surface-300" />}
            title={copy.emptyTitle}
            description={copy.emptyBody}
            action={<button onClick={() => setShowModal(true)} className="inline-flex min-h-[34px] items-center justify-center rounded-lg bg-surface-900 px-4 text-xs font-semibold text-white transition hover:bg-surface-800 shadow-sm">{copy.firstCampaign}</button>}
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] items-start">
            
            {/* SOL SÜTUN: KAMPANYA KARTLARI LİSTESİ */}
            <div className="space-y-3.5">
              {jobs.map((job, index) => {
                const isSelected = selectedJobId === job.id;
                const progress = getProgressPercentage(job);
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 ${
                      isSelected ? "border-gray-900 ring-1 ring-gray-950" : "border-surface-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="font-bold text-xs text-surface-900 tracking-tight truncate">
                            {job.email_template?.name || `${copy.templateLabel} #${job.email_template_id}`}
                          </h3>
                          {getStatusBadge(job.status)}
                        </div>
                        
                        <p className="text-xs font-medium text-surface-500 max-w-xl truncate">
                          <span className="font-semibold text-surface-400">{copy.subjectLabel}:</span> {job.email_template?.subject_tr || job.email_template?.subject_en || "—"}
                        </p>
                        
                        <div className="pt-1 flex flex-wrap gap-1.5 text-11 font-bold text-surface-400 uppercase tracking-wider">
                          <span className="bg-surface-50 border border-surface-100 px-2 py-0.5 rounded-md">{copy.recipientLabel}: {getRecipientLabel(job.recipient_type)}</span>
                          <span className="bg-surface-50 border border-surface-100 px-2 py-0.5 rounded-md font-mono">{new Date(job.created_at).toLocaleDateString("tr-TR")}</span>
                        </div>
                      </div>
                      
                      <button 
                        type="button" 
                        onClick={() => setSelectedJobId(job.id === selectedJobId ? null : job.id)} 
                        className="p-2 rounded-xl text-surface-400 hover:bg-surface-50 hover:text-surface-900 transition-colors"
                      >
                        <Eye className="h-4 w-4 stroke-[1.8]" />
                      </button>
                    </div>

                    {/* İlerleme İndikatörü */}
                    <div className="mt-4 pt-1">
                      <div className="flex justify-between items-center text-11 font-semibold text-surface-500 mb-1.5">
                        <span>{progress}% {copy.progressSent}</span>
                        <span className="font-mono text-surface-900 tracking-tight">{job.sent_count + job.failed_count} / {job.total_recipients}</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ease-out ${job.status === "failed" ? "bg-red-500" : "bg-surface-900"}`} 
                          style={{ width: `${progress}%` }} 
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* SAĞ SÜTUN: STICKY DETAY ÖZET KUTUSU */}
            <aside className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm sticky top-5 space-y-4 h-fit">
              <div className="flex items-center gap-3 border-b border-surface-100 pb-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-50 border border-surface-100 shadow-sm text-surface-900">
                  <Workflow className="h-4 w-4 stroke-[2]" />
                </div>
                <div>
                  <p className="text-11 font-bold uppercase tracking-widest text-surface-400">{copy.preview}</p>
                  <h2 className="text-xs font-bold text-surface-900 tracking-tight truncate max-w-[200px]">
                    {selectedJob ? selectedJob.email_template?.name || `Görev #${selectedJob.id}` : copy.newCampaign}
                  </h2>
                </div>
              </div>

              {selectedJob ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-surface-100 bg-surface-50/50 p-3.5 space-y-2.5 text-xs font-semibold text-surface-600">
                    <div className="flex justify-between"><span className="text-surface-400 font-medium">Hedef Kitle</span><span className="text-surface-900">{getRecipientLabel(selectedJob.recipient_type)}</span></div>
                    <div className="flex justify-between"><span className="text-surface-400 font-medium">Başarılı Sevk</span><span className="text-emerald-600 font-mono">{selectedJob.sent_count}</span></div>
                    <div className="flex justify-between"><span className="text-surface-400 font-medium">Reddedilen / Hata</span><span className="text-red-500 font-mono">{selectedJob.failed_count}</span></div>
                    <div className="flex justify-between pt-2 border-t border-surface-100"><span className="text-surface-400 font-medium">Kuyruk Yoğunluğu</span><span className="text-surface-900 font-mono">{selectedJob.total_recipients}</span></div>
                  </div>
                  
                  {selectedJob.error_message && (
                    <div className="rounded-xl border border-red-100 bg-red-50/30 p-3 text-11 font-semibold text-red-600 leading-relaxed">
                      {selectedJob.error_message}
                    </div>
                  )}

                  <Link 
                    href={`/admin/events/${eventId}/analytics/${selectedJob.id}`}
                    className="w-full inline-flex min-h-[34px] items-center justify-center rounded-lg border border-surface-200 bg-white px-3 text-xs font-semibold text-surface-800 shadow-sm transition hover:bg-surface-50"
                  >
                    <span>Detaylı Log Günlüğünü Aç</span>
                  </Link>
                </div>
              ) : (
                <p className="text-xs font-medium text-surface-400 text-center py-10 leading-relaxed">Sistem akış detaylarını ve sayaç kırılımlarını izlemek için listeden bir kampanya kartı seçin.</p>
              )}
            </aside>
          </div>
        )}

        {/* MODAL KATMANI: YENİ KAMPANYA BAŞLATMA PENCERESİ */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-surface-800/20 backdrop-blur-md" onClick={() => { if (!creating) setShowModal(false); }} />
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-surface-200 bg-white/95 p-6 shadow-xl backdrop-blur-xl space-y-4">
                
                <div>
                  <h2 className="text-sm font-bold text-surface-900 tracking-tight">{copy.newCampaign}</h2>
                  <p className="mt-1 text-11 text-surface-400 leading-relaxed">Katılımcı gruplarına toplu bülten veya sertifika gönderim kuralı kurgulayın.</p>
                </div>

                {/* Şablon Seçim Modülü */}
                <div className="space-y-1">
                  <EmailTemplateSelect eventId={Number(eventId)} value={selectedTemplate} onChange={setSelectedTemplate} label={copy.templateLabel} placeholder={copy.chooseTemplate} emptyText="No templates available" />
                  {selectedTemplateItem && (
                    <div className="rounded-xl border border-surface-100 bg-surface-50/40 p-3 text-11 font-medium text-surface-500 space-y-0.5">
                      <p className="font-bold text-surface-900 truncate">{selectedTemplateItem.name}</p>
                      <p className="truncate"><span className="font-semibold text-surface-300">Konu:</span> {selectedTemplateItem.subject_tr || selectedTemplateItem.subject_en || "—"}</p>
                    </div>
                  )}
                </div>

                {/* Hedef Alıcı Seçimi */}
                <div className="space-y-2">
                  <span className="block text-11 font-bold text-surface-500">{copy.recipientLabel}</span>
                  <div className="grid gap-2 grid-cols-2">
                    <button type="button" onClick={() => setRecipientType("attendees")} className={`p-3 rounded-xl border text-left text-xs font-bold transition-all relative flex flex-col justify-between h-[88px] ${recipientType === "attendees" ? "border-gray-950 bg-white ring-1 ring-gray-950 shadow-sm" : "border-surface-200 bg-white hover:border-surface-300"}`}>
                      <p className="text-surface-900 tracking-tight">{copy.attendeesTitle}</p>
                      <p className="text-11 font-medium text-surface-400 leading-normal">{copy.attendeesBody}</p>
                    </button>
                    
                    <button type="button" onClick={() => setRecipientType("certified")} className={`p-3 rounded-xl border text-left text-xs font-bold transition-all relative flex flex-col justify-between h-[88px] ${recipientType === "certified" ? "border-gray-950 bg-white ring-1 ring-gray-950 shadow-sm" : "border-surface-200 bg-white hover:border-surface-300"}`}>
                      <p className="text-surface-900 tracking-tight">{copy.certifiedTitle}</p>
                      <p className="text-11 font-medium text-surface-400 leading-normal">{copy.certifiedBody}</p>
                    </button>
                  </div>

                  {/* Dinamik Özel Segmentler Dökümü */}
                  {segments.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="block text-11 font-bold uppercase tracking-wider text-surface-400">Veritabanı Özel Segmentleri</span>
                      <div className="grid gap-2 sm:grid-cols-2 max-h-36 overflow-y-auto scrollbar-none pr-0.5">
                        {segments.map((segment) => {
                          const val = `segment:${segment.key}`;
                          const isSegSel = recipientType === val;
                          return (
                            <button key={segment.key} type="button" onClick={() => setRecipientType(val)} className={`p-2.5 rounded-xl border text-left transition-all ${isSegSel ? "border-gray-950 bg-white ring-1 ring-gray-950 shadow-sm" : "border-surface-100 bg-white hover:border-surface-200"}`}>
                              <div className="flex items-center justify-between gap-2 text-xs font-bold">
                                <p className="text-surface-900 truncate tracking-tight">{segment.label}</p>
                                <span className={`rounded-full px-1.5 font-mono text-11 ${isSegSel ? "bg-surface-900 text-white" : "bg-surface-50 border border-surface-100 text-surface-400"}`}>{segment.count}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bilgi Şeridi */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-11 font-medium text-blue-800 leading-relaxed">
                  <strong>{copy.infoTitle}:</strong> {copy.infoBody}
                </div>

                {/* Alt Kontrol Butonları */}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} disabled={creating} className="flex-1 rounded-xl border border-surface-200 bg-white px-4 py-2.5 text-xs font-semibold text-surface-700 shadow-sm transition hover:bg-surface-50">İptal</button>
                  <button type="button" onClick={handleCreateCampaign} disabled={!selectedTemplate || creating} className="flex-1 inline-flex items-center justify-center rounded-lg bg-surface-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-surface-800 disabled:opacity-40">
                    {creating ? (
                      <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {copy.creating}</span>
                    ) : (
                      <span>{copy.startCampaign}</span>
                    )}
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </FeatureGate>
  );
}