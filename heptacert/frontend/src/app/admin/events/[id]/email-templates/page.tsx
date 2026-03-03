"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Plus, Trash2, Edit2, Save, X, AlertCircle,
  Loader2, Mail, FileText, CheckCircle2, Eye, Copy, Settings, Send,
  LockKeyhole, QrCode, Users, UserCheck,
} from "lucide-react";

type EmailTemplate = {
  id: number;
  name: string;
  subject_tr: string;
  subject_en: string;
  body_html: string;
  template_type: string;
  is_system: boolean;
  created_at: string;
  created_by?: number;
  event_id?: number | null;
};

type EmailTemplateIn = {
  name: string;
  subject_tr: string;
  subject_en: string;
  body_html: string;
};

export default function EmailTemplatesPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [systemTemplates, setSystemTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"custom" | "system">("custom");

  // Create/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EmailTemplateIn>({
    name: "",
    subject_tr: "",
    subject_en: "",
    body_html: "",
  });

  // Preview state
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [previewLang, setPreviewLang] = useState<"tr" | "en">("tr");

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [eventId]);

  async function loadTemplates() {
    setLoading(true);
    setError(null);
    try {
      const [customRes, systemRes] = await Promise.all([
        apiFetch(`/admin/events/${eventId}/email-templates`),
        apiFetch("/system/email-templates"),
      ]);

      const customData = await customRes.json();
      const systemData = await systemRes.json();

      setTemplates(customData || []);
      setSystemTemplates(systemData || []);
    } catch (e: any) {
      setError(e?.message || "Şablonlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setError(null);

      if (!form.name.trim() || !form.subject_tr.trim() || !form.subject_en.trim() || !form.body_html.trim()) {
        setError("Tüm alanlar zorunludur");
        return;
      }

      if (isEditing && editingId) {
        // Update
        await apiFetch(`/admin/events/${eventId}/email-templates/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
      } else {
        // Create
        await apiFetch(`/admin/events/${eventId}/email-templates`, {
          method: "POST",
          body: JSON.stringify(form),
        });
      }

      setForm({ name: "", subject_tr: "", subject_en: "", body_html: "" });
      setShowModal(false);
      setIsEditing(false);
      setEditingId(null);
      await loadTemplates();
    } catch (e: any) {
      setError(e?.message || "İşlem başarısız oldu");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Bu şablonu silmek istediğinizden emin misiniz?")) return;

    try {
      setError(null);
      await apiFetch(`/admin/events/${eventId}/email-templates/${id}`, {
        method: "DELETE",
      });
      await loadTemplates();
    } catch (e: any) {
      setError(e?.message || "Silme işlemi başarısız oldu");
    }
  }

  function openCreateModal() {
    setForm({ name: "", subject_tr: "", subject_en: "", body_html: "" });
    setIsEditing(false);
    setEditingId(null);
    setShowModal(true);
  }

  function openEditModal(template: EmailTemplate) {
    setForm({
      name: template.name,
      subject_tr: template.subject_tr,
      subject_en: template.subject_en,
      body_html: template.body_html,
    });
    setIsEditing(true);
    setEditingId(template.id);
    setShowModal(true);
  }

  function getPreviewTemplate() {
    if (!previewId) return null;
    const list = selectedTab === "custom" ? templates : systemTemplates;
    return list.find((t) => t.id === previewId);
  }

  const previewTemplate = getPreviewTemplate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/admin/events/${eventId}/editor`} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="w-8 h-8 text-brand-600" />
                Email Şablonları
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Katılımcılara sertifika veya bildirim gönderirken kullanılacak email şablonları oluşturun ve yönetin. 
                Özel şablonlar oluşturabileceğiniz gibi, sistem şablonlarını da kullanabilirsiniz.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link href={`/admin/events/${eventId}/settings`} title="Ayarlar" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors text-sm font-medium">
              <Settings className="h-4 w-4" />
              Ayarlar
            </Link>
            <Link href={`/admin/events/${eventId}/bulk-emails`} title="Toplu Email" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors text-sm font-medium">
              <Send className="h-4 w-4" />
              Kampanya
            </Link>
            {selectedTab === "custom" && (
              <>
                <div className="border-l border-gray-200 mx-2 h-6" />
                <button
                  onClick={openCreateModal}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Şablon
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-1 flex-wrap">
            <Link href={`/admin/events/${eventId}/certificates`} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 shadow-sm transition-colors">
              <LockKeyhole className="h-3.5 w-3.5" /> Sertifikalar
            </Link>
            <Link href={`/admin/events/${eventId}/sessions`} className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 shadow-sm transition-colors">
              <QrCode className="h-3.5 w-3.5" /> Oturumlar
            </Link>
            <Link href={`/admin/events/${eventId}/attendees`} className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3.5 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50 shadow-sm transition-colors">
              <Users className="h-3.5 w-3.5" /> Katılımcılar
            </Link>
            <Link href={`/admin/events/${eventId}/checkin`} className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50 shadow-sm transition-colors">
              <UserCheck className="h-3.5 w-3.5" /> Check-in
            </Link>
            <Link href={`/admin/events/${eventId}/gamification`} className="flex items-center gap-1.5 rounded-lg border border-fuchsia-200 bg-white px-3.5 py-1.5 text-xs font-bold text-fuchsia-700 hover:bg-fuchsia-50 shadow-sm transition-colors">
              Gamification
            </Link>
            <Link href={`/admin/events/${eventId}/surveys`} className="flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-white px-3.5 py-1.5 text-xs font-bold text-cyan-700 hover:bg-cyan-50 shadow-sm transition-colors">
              Anket
            </Link>
            <Link href={`/admin/events/${eventId}/advanced-analytics`} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
              İleri Analitik
            </Link>
            <Link href={`/admin/events/${eventId}/editor`} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
              Editör
            </Link>
            <Link href={`/admin/events/${eventId}/email-templates`} className="flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm">
              <Mail className="h-3.5 w-3.5" /> Email
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 p-4 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex border-b border-gray-200">
          <button
            onClick={() => setSelectedTab("custom")}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              selectedTab === "custom"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Özel Şablonlar ({templates.length})
          </button>
          <button
            onClick={() => setSelectedTab("system")}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              selectedTab === "system"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Sistem Şablonları ({systemTemplates.length})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        ) : (
          <div>
            {selectedTab === "custom" ? (
              <div className="grid grid-cols-1 gap-4">
                {templates.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                    <Mail className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 font-medium mb-2">Henüz özel şablon yok</p>
                    <p className="text-sm text-gray-500 mb-4">Yeni bir email şablonu oluşturarak başlayın</p>
                    <button onClick={openCreateModal} className="btn btn-primary">
                      <Plus className="w-4 h-4 mr-2" />
                      İlk Şablonu Oluştur
                    </button>
                  </div>
                ) : (
                  templates.map((template) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="card p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 mb-2">{template.name}</h3>
                          <div className="space-y-1 mb-4">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">TR:</span> {template.subject_tr}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">EN:</span> {template.subject_en}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => {
                                setPreviewId(template.id);
                                setPreviewLang("tr");
                              }}
                              className="btn btn-sm btn-secondary flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              Önizleme
                            </button>
                            <button
                              onClick={() => openEditModal(template)}
                              className="btn btn-sm btn-secondary flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              Düzenle
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {systemTemplates.map((template) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-lg text-gray-900">{template.name}</h3>
                          <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            Sistem
                          </span>
                        </div>
                        <div className="space-y-1 mb-4">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">TR:</span> {template.subject_tr}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">EN:</span> {template.subject_en}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setPreviewId(template.id);
                            setPreviewLang("tr");
                          }}
                          className="btn btn-sm btn-secondary flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Önizleme
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
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
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {isEditing ? "Şablonu Düzenle" : "Yeni Şablon Oluştur"}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="label">Şablon Adı *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="ör. Sertifika Teslim"
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="label">Konu (Türkçe) *</label>
                    <input
                      type="text"
                      value={form.subject_tr}
                      onChange={(e) => setForm({ ...form, subject_tr: e.target.value })}
                      placeholder="ör. Sertifikanız hazır!"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Konu (English) *</label>
                    <input
                      type="text"
                      value={form.subject_en}
                      onChange={(e) => setForm({ ...form, subject_en: e.target.value })}
                      placeholder="e.g. Your certificate is ready!"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="label mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Email İçeriği (HTML) *
                  </label>
                  <textarea
                    value={form.body_html}
                    onChange={(e) => setForm({ ...form, body_html: e.target.value })}
                    placeholder={`<p>Merhaba {{recipient_name}},</p>\n<p>{{event_name}} etkinliğiniz için sertifikanız hazır!</p>\n<p><a href="{{certificate_link}}">Sertifikayı İndir</a></p>`}
                    className="input-field font-mono text-sm h-64"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Desteklenen değişkenler: {"{"}
                    {"{"}recipient_name{"}}"}, {"{"}
                    {"{"}event_name{"}}"}, {"{"}
                    {"{"}certificate_link{"}}"}, {"{"}
                    {"{"}event_date{"}}"}{"}"}
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                    İptal
                  </button>
                  <button onClick={handleSave} className="btn btn-primary flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Kaydet
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewTemplate && previewId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setPreviewId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Önizleme: {previewTemplate.name}</h2>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setPreviewLang("tr")}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        previewLang === "tr"
                          ? "bg-brand-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Türkçe
                    </button>
                    <button
                      onClick={() => setPreviewLang("en")}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        previewLang === "en"
                          ? "bg-brand-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>
                <button onClick={() => setPreviewId(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="border-b border-gray-200 pb-4">
                    <p className="text-sm text-gray-500 font-medium mb-1">Konu:</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {previewLang === "tr" ? previewTemplate.subject_tr : previewTemplate.subject_en}
                    </p>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: previewTemplate.body_html
                          .replace(/{{recipient_name}}/g, "Ahmet Yılmaz")
                          .replace(/{{event_name}}/g, "DevConf 2024")
                          .replace(/{{certificate_link}}/g, "#")
                          .replace(/{{event_date}}/g, "Mart 15, 2024"),
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
