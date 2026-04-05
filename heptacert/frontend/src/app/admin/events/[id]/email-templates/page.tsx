"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Edit2, Save, X, AlertCircle,
  Loader2, Mail, FileText, CheckCircle2, Eye, Settings, Send, Sparkles,
} from "lucide-react";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import PageHeader from "@/components/Admin/PageHeader";
import ConfirmModal from "@/components/Admin/ConfirmModal";
import { useToast } from "@/hooks/useToast";
import { useI18n } from "@/lib/i18n";

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
  const { lang } = useI18n();
  const toast = useToast();

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
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const copy = lang === "tr"
    ? {
        pageTitle: "Email Sablonlari",
        pageSubtitle: "Sertifika, bilgilendirme ve kampanya akislarinda kullanilan sablonlari tek yerde yonetin.",
        createTemplate: "Yeni sablon",
        settings: "Ayarlar",
        campaigns: "Kampanyalar",
        customTab: "Ozel sablonlar",
        systemTab: "Sistem sablonlari",
        templatesCount: "Sablon",
        subjectTr: "Turkce konu",
        subjectEn: "English subject",
        preview: "Onizle",
        edit: "Duzenle",
        delete: "Sil",
        system: "Sistem",
        emptyCustomTitle: "Henuz ozel sablon yok",
        emptyCustomBody: "Ilk sablonunuzu olusturup kampanya ve bildirim akislarini standartlastirin.",
        firstTemplate: "Ilk sablonu olustur",
        emptySystemTitle: "Sistem sablonu bulunamadi",
        emptySystemBody: "Varsayilan sablonlar yuklenemedi ya da henuz tanimli degil.",
        editorTitleCreate: "Yeni sablon olustur",
        editorTitleEdit: "Sablonu duzenle",
        templateName: "Sablon adi",
        templateNamePlaceholder: "Orn. Sertifika teslim",
        bodyTitle: "Email icerigi (HTML)",
        htmlHint: "Desteklenen degiskenler",
        cancel: "Iptal",
        save: "Kaydet",
        previewTitle: "Onizleme",
        subject: "Konu",
        confirmDeleteTitle: "Sablonu sil",
        confirmDeleteBody: "Bu sablonu silmek istediginize emin misiniz? Bu islem geri alinamaz.",
        loadError: "Sablonlar yuklenemedi.",
        requiredError: "Tum alanlar zorunludur.",
        saveError: "Islem basarisiz oldu.",
        deleteError: "Silme islemi basarisiz oldu.",
        deleteSuccess: "Sablon silindi.",
        saveSuccessCreate: "Sablon olusturuldu.",
        saveSuccessEdit: "Sablon guncellendi.",
        sampleName: "Ayse Yilmaz",
        sampleEvent: "Hepta Summit 2026",
        sampleDate: "15 Nisan 2026",
      }
    : {
        pageTitle: "Email Templates",
        pageSubtitle: "Manage the templates used across certificates, updates and bulk campaign flows from one place.",
        createTemplate: "New template",
        settings: "Settings",
        campaigns: "Campaigns",
        customTab: "Custom templates",
        systemTab: "System templates",
        templatesCount: "Templates",
        subjectTr: "Turkish subject",
        subjectEn: "English subject",
        preview: "Preview",
        edit: "Edit",
        delete: "Delete",
        system: "System",
        emptyCustomTitle: "No custom templates yet",
        emptyCustomBody: "Create your first template to standardize campaign and attendee communication flows.",
        firstTemplate: "Create first template",
        emptySystemTitle: "No system templates found",
        emptySystemBody: "Default templates could not be loaded or are not configured yet.",
        editorTitleCreate: "Create template",
        editorTitleEdit: "Edit template",
        templateName: "Template name",
        templateNamePlaceholder: "e.g. Certificate delivery",
        bodyTitle: "Email body (HTML)",
        htmlHint: "Supported variables",
        cancel: "Cancel",
        save: "Save",
        previewTitle: "Preview",
        subject: "Subject",
        confirmDeleteTitle: "Delete template",
        confirmDeleteBody: "Are you sure you want to delete this template? This action cannot be undone.",
        loadError: "Failed to load templates.",
        requiredError: "All fields are required.",
        saveError: "The operation failed.",
        deleteError: "Failed to delete template.",
        deleteSuccess: "Template deleted.",
        saveSuccessCreate: "Template created.",
        saveSuccessEdit: "Template updated.",
        sampleName: "Alex Morgan",
        sampleEvent: "Hepta Summit 2026",
        sampleDate: "April 15, 2026",
      };

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
      setError(e?.message || copy.loadError);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setError(null);

      if (!form.name.trim() || !form.subject_tr.trim() || !form.subject_en.trim() || !form.body_html.trim()) {
        setError(copy.requiredError);
        return;
      }

      if (isEditing && editingId) {
        await apiFetch(`/admin/events/${eventId}/email-templates/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch(`/admin/events/${eventId}/email-templates`, {
          method: "POST",
          body: JSON.stringify(form),
        });
      }

      setForm({ name: "", subject_tr: "", subject_en: "", body_html: "" });
      setShowModal(false);
      setIsEditing(false);
      setEditingId(null);
      toast.success(isEditing ? copy.saveSuccessEdit : copy.saveSuccessCreate);
      await loadTemplates();
    } catch (e: any) {
      setError(e?.message || copy.saveError);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      setError(null);
      await apiFetch(`/admin/events/${eventId}/email-templates/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setDeleteTarget(null);
      toast.success(copy.deleteSuccess);
      await loadTemplates();
    } catch (e: any) {
      setError(e?.message || copy.deleteError);
    } finally {
      setDeleteLoading(false);
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
    return list.find((template) => template.id === previewId);
  }

  const previewTemplate = getPreviewTemplate();
  const activeTemplates = selectedTab === "custom" ? templates : systemTemplates;

  return (
    <div className="space-y-6 pb-20 pt-6">
      <EventAdminNav eventId={eventId} active="email" className="flex flex-col gap-2" />

      <PageHeader
        title={copy.pageTitle}
        subtitle={copy.pageSubtitle}
        icon={<Mail className="h-5 w-5" />}
        actions={
          <>
            <Link href={`/admin/events/${eventId}/settings`} className="btn-secondary">
              <Settings className="h-4 w-4" />
              {copy.settings}
            </Link>
            <Link href={`/admin/events/${eventId}/bulk-emails`} className="btn-secondary">
              <Send className="h-4 w-4" />
              {copy.campaigns}
            </Link>
            {selectedTab === "custom" && (
              <button onClick={openCreateModal} className="btn-primary">
                <Plus className="h-4 w-4" />
                {copy.createTemplate}
              </button>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.customTab}</p>
          <p className="mt-2 text-3xl font-black text-surface-900">{templates.length}</p>
          <p className="mt-1 text-xs text-surface-500">{copy.templatesCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.systemTab}</p>
          <p className="mt-2 text-3xl font-black text-surface-900">{systemTemplates.length}</p>
          <p className="mt-1 text-xs text-surface-500">{copy.templatesCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">TR / EN</p>
          <p className="mt-2 text-3xl font-black text-surface-900">2</p>
          <p className="mt-1 text-xs text-surface-500">{lang === "tr" ? "Dil alani" : "Language surfaces"}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">HTML</p>
          <p className="mt-2 text-3xl font-black text-surface-900">{activeTemplates.length}</p>
          <p className="mt-1 text-xs text-surface-500">{lang === "tr" ? "Aktif liste" : "Current list"}</p>
        </div>
      </div>

      {error && (
        <div className="error-banner flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="inline-flex min-w-full gap-2 rounded-3xl border border-surface-200 bg-white p-2 shadow-soft sm:min-w-0">
          <button
            onClick={() => setSelectedTab("custom")}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              selectedTab === "custom" ? "bg-brand-600 text-white shadow-soft" : "text-surface-500 hover:bg-surface-50 hover:text-surface-900"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            {copy.customTab} ({templates.length})
          </button>
          <button
            onClick={() => setSelectedTab("system")}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              selectedTab === "system" ? "bg-brand-600 text-white shadow-soft" : "text-surface-500 hover:bg-surface-50 hover:text-surface-900"
            }`}
          >
            <FileText className="h-4 w-4" />
            {copy.systemTab} ({systemTemplates.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : activeTemplates.length === 0 ? (
        <div className="card rounded-3xl border-2 border-dashed border-surface-300 bg-surface-50 p-12 text-center">
          <Mail className="mx-auto mb-4 h-12 w-12 text-surface-400" />
          <p className="text-lg font-semibold text-surface-900">
            {selectedTab === "custom" ? copy.emptyCustomTitle : copy.emptySystemTitle}
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-surface-500">
            {selectedTab === "custom" ? copy.emptyCustomBody : copy.emptySystemBody}
          </p>
          {selectedTab === "custom" && (
            <button onClick={openCreateModal} className="btn-primary mx-auto mt-5">
              <Plus className="h-4 w-4" />
              {copy.firstTemplate}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {activeTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="card p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-bold text-surface-900">{template.name}</h3>
                    {template.is_system && (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                        {copy.system}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.subjectTr}</p>
                      <p className="mt-2 text-sm font-medium text-surface-700">{template.subject_tr}</p>
                    </div>
                    <div className="rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.subjectEn}</p>
                      <p className="mt-2 text-sm font-medium text-surface-700">{template.subject_en}</p>
                    </div>
                  </div>
                </div>
                {!template.is_system && (
                  <button onClick={() => setDeleteTarget(template)} className="rounded-2xl p-2 text-rose-600 transition hover:bg-rose-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setPreviewId(template.id);
                    setPreviewLang("tr");
                  }}
                  className="btn-secondary"
                >
                  <Eye className="h-4 w-4" />
                  {copy.preview}
                </button>
                {!template.is_system && (
                  <button onClick={() => openEditModal(template)} className="btn-secondary">
                    <Edit2 className="h-4 w-4" />
                    {copy.edit}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
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
              className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-surface-200 bg-white shadow-lifted"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-surface-100 px-5 py-5 sm:px-6">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-surface-900">
                    {isEditing ? copy.editorTitleEdit : copy.editorTitleCreate}
                  </h2>
                  <p className="mt-1 text-sm text-surface-500">{copy.pageSubtitle}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="rounded-2xl border border-surface-200 p-2 text-surface-400 transition hover:border-surface-300 hover:text-surface-700">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="grid gap-6">
                  <div>
                    <label className="label">{copy.templateName}</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={copy.templateNamePlaceholder}
                      className="input-field"
                    />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <label className="label">{copy.subjectTr}</label>
                      <input
                        type="text"
                        value={form.subject_tr}
                        onChange={(e) => setForm({ ...form, subject_tr: e.target.value })}
                        placeholder={lang === "tr" ? "Orn. Sertifikaniz hazir" : "e.g. Your certificate is ready"}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label">{copy.subjectEn}</label>
                      <input
                        type="text"
                        value={form.subject_en}
                        onChange={(e) => setForm({ ...form, subject_en: e.target.value })}
                        placeholder="e.g. Your certificate is ready"
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {copy.bodyTitle}
                    </label>
                    <textarea
                      value={form.body_html}
                      onChange={(e) => setForm({ ...form, body_html: e.target.value })}
                      placeholder={`<p>${copy.sampleName},</p>\n<p>{{event_name}}</p>\n<p><a href="{{certificate_link}}">Link</a></p>`}
                      className="input-field h-72 font-mono text-sm"
                    />
                    <p className="mt-2 text-xs text-surface-500">
                      {copy.htmlHint}: <code>{"{{recipient_name}}"}</code>, <code>{"{{event_name}}"}</code>, <code>{"{{certificate_link}}"}</code>, <code>{"{{event_date}}"}</code>
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-surface-100 px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button onClick={() => setShowModal(false)} className="btn-secondary justify-center">
                    {copy.cancel}
                  </button>
                  <button onClick={handleSave} className="btn-primary justify-center">
                    <Save className="h-4 w-4" />
                    {copy.save}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewTemplate && previewId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setPreviewId(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-surface-200 bg-white shadow-lifted"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-surface-100 px-5 py-5 sm:px-6">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-surface-900">{copy.previewTitle}: {previewTemplate.name}</h2>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setPreviewLang("tr")}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${previewLang === "tr" ? "bg-brand-600 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"}`}
                    >
                      Turkce
                    </button>
                    <button
                      onClick={() => setPreviewLang("en")}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${previewLang === "en" ? "bg-brand-600 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"}`}
                    >
                      English
                    </button>
                  </div>
                </div>
                <button onClick={() => setPreviewId(null)} className="rounded-2xl border border-surface-200 p-2 text-surface-400 transition hover:border-surface-300 hover:text-surface-700">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                <div className="rounded-3xl border border-surface-200 bg-surface-50 p-5 sm:p-6">
                  <div className="border-b border-surface-200 pb-4">
                    <p className="text-sm font-medium text-surface-500">{copy.subject}</p>
                    <p className="mt-2 text-lg font-semibold text-surface-900">
                      {previewLang === "tr" ? previewTemplate.subject_tr : previewTemplate.subject_en}
                    </p>
                  </div>
                  <div className="prose prose-sm mt-5 max-w-none text-surface-700">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: previewTemplate.body_html
                          .replace(/{{recipient_name}}/g, copy.sampleName)
                          .replace(/{{event_name}}/g, copy.sampleEvent)
                          .replace(/{{certificate_link}}/g, "#")
                          .replace(/{{event_date}}/g, copy.sampleDate),
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={deleteTarget !== null}
        title={copy.confirmDeleteTitle}
        description={copy.confirmDeleteBody}
        danger
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
