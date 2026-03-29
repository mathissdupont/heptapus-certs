"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FeatureGate } from '@/lib/useSubscription';
import {
  Send, AlertCircle, Loader2, CheckCircle2,
  Clock, X, Eye, Plus, Mail, TrendingUp,
} from "lucide-react";

type BulkEmailJob = {
  id: number;
  event_id: number;
  email_template_id: number;
  email_template?: { name: string; subject_tr: string };
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
      setError(e?.message || "Veri yükleme başarısız");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCampaign() {
    if (!selectedTemplate) {
      setError("Lütfen bir email şablonu seçin");
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
      setError(e?.message || "Kampanya oluşturma başarısız");
    } finally {
      setCreating(false);
    }
  }

  function getStatusBadge(status: string) {
    const statusMap: Record<string, { bg: string; text: string; icon: any }> = {
      pending: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        icon: <Clock className="w-4 h-4" />,
      },
      sending: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        icon: <Mail className="w-4 h-4" />,
      },
      completed: {
        bg: "bg-green-100",
        text: "text-green-800",
        icon: <CheckCircle2 className="w-4 h-4" />,
      },
      failed: {
        bg: "bg-red-100",
        text: "text-red-800",
        icon: <AlertCircle className="w-4 h-4" />,
      },
    };

    const mapping = statusMap[status] || statusMap.pending;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${mapping.bg} ${mapping.text}`}>
        {mapping.icon}
        {status === "pending" && "Yapılacak"}
        {status === "sending" && "Gönderiliyor"}
        {status === "completed" && "Tamamlandı"}
        {status === "failed" && "Başarısız"}
      </span>
    );
  }

  function getProgressPercentage(job: BulkEmailJob) {
    if (job.total_recipients === 0) return 0;
    return Math.round(((job.sent_count + job.failed_count) / job.total_recipients) * 100);
  }

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <FeatureGate requiredPlans={["growth","enterprise"]}>
      <div className="py-8">
        <div className="mx-auto max-w-6xl px-4">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Send className="w-8 h-8 text-brand-600" />
                Toplu Email Kampanyaları
              </h1>
              <p className="text-sm text-gray-500 mt-1">Email kampanyalarını oluşturun ve izleyin</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Yeni Kampanya
            </button>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 p-4 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Stats Cards */}
          {!loading && jobs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Toplam Kampanya</p>
                    <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
                  </div>
                  <Mail className="w-8 h-8 text-gray-300" />
                </div>
              </div>
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Tamamlanan</p>
                    <p className="text-2xl font-bold text-green-600">{jobs.filter((j) => j.status === "completed").length}</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-300" />
                </div>
              </div>
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Gönderiliyor</p>
                    <p className="text-2xl font-bold text-blue-600">{jobs.filter((j) => j.status === "sending").length}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-300" />
                </div>
              </div>
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Kayıtlar</p>
                    <p className="text-2xl font-bold text-red-600">{jobs.filter((j) => j.status === "failed").length}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-300" />
                </div>
              </div>
            </div>
          )}

          {/* Jobs List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
          ) : (
            <div>
              {jobs.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                  <Send className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium mb-2">Henüz kampanya yok</p>
                  <p className="text-sm text-gray-500 mb-4">Katılımcılara toplu olarak email göndermeye başlayın</p>
                  <button onClick={() => setShowModal(true)} className="btn btn-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    İlk Kampanyayı Oluştur
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="card p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg text-gray-900">
                              {job.email_template?.name || "Şablon #" + job.email_template_id}
                            </h3>
                            {getStatusBadge(job.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            Konu: {job.email_template?.subject_tr || "N/A"}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedJobId(job.id === selectedJobId ? null : job.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {job.sent_count + job.failed_count} / {job.total_recipients} gönderildi
                          </span>
                          <span className="text-sm font-bold text-gray-900">{getProgressPercentage(job)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${getProgressPercentage(job)}%` }}
                            transition={{ duration: 0.5 }}
                            className={`h-full rounded-full transition-colors ${
                              job.status === "failed"
                                ? "bg-red-500"
                                : job.status === "completed"
                                ? "bg-green-500"
                                : "bg-blue-500"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">Başarılı</p>
                          <p className="font-bold text-green-600">{job.sent_count}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Başarısız</p>
                          <p className="font-bold text-red-600">{job.failed_count}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Hedef</p>
                          <p className="font-bold text-gray-900">{job.total_recipients}</p>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                        Oluşturulma: {new Date(job.created_at).toLocaleString("tr-TR")}
                      </div>

                      {/* Error Message */}
                      {job.error_message && (
                        <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-xs font-medium text-red-800 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Hata: {job.error_message}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Campaign Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl shadow-xl max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-gray-200 p-6 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Yeni Email Kampanyası</h2>
                  <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <label className="label mb-3">Email Şablonu *</label>
                    <select
                      value={selectedTemplate || ""}
                      onChange={(e) => setSelectedTemplate(e.target.value ? parseInt(e.target.value) : null)}
                      className="input-field"
                    >
                      <option value="">Şablon Seçin</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label mb-3">Alıcı Türü *</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" style={{borderColor: recipientType === "attendees" ? "#3b82f6" : undefined, backgroundColor: recipientType === "attendees" ? "#f0f9ff" : undefined}}>
                        <input
                          type="radio"
                          value="attendees"
                          checked={recipientType === "attendees"}
                          onChange={(e) => setRecipientType(e.target.value as any)}
                          className="w-4 h-4 accent-brand-600"
                        />
                        <div>
                          <p className="font-medium text-gray-900">Tüm Katılımcılar</p>
                          <p className="text-sm text-gray-500">Etkinliğe kayıtlı tüm kişiler</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" style={{borderColor: recipientType === "certified" ? "#3b82f6" : undefined, backgroundColor: recipientType === "certified" ? "#f0f9ff" : undefined}}>
                        <input
                          type="radio"
                          value="certified"
                          checked={recipientType === "certified"}
                          onChange={(e) => setRecipientType(e.target.value as any)}
                          className="w-4 h-4 accent-brand-600"
                        />
                        <div>
                          <p className="font-medium text-gray-900">Sertifikalandırılanlar</p>
                          <p className="text-sm text-gray-500">Sadece sertifika almış olanlar</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <span className="font-medium">Bilgi:</span> Kampanya oluşturulduktan sonra otomatik olarak işlenmeye başlayacak. Email gönderme işlemi arka planda çalışacaktır.
                    </p>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                      İptal
                    </button>
                    <button
                      onClick={handleCreateCampaign}
                      disabled={!selectedTemplate || creating}
                      className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                      {creating ? "Oluşturuluyor..." : "Kampanyayı Başlat"}
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