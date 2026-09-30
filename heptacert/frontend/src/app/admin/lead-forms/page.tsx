"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, ClipboardList, Loader2, Trash2, ChevronRight,
  ExternalLink, Copy, ToggleLeft, ToggleRight,
} from "lucide-react";
import { listLeadForms, createLeadForm, deleteLeadForm, updateLeadForm, type LeadFormOut } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function LeadFormsPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const copy = lang === "tr"
    ? {
        pageTitle: "Lead Formları",
        pageSubtitle: "Embed veya link ile lead yakalayın",
        newForm: "Yeni Form",
        embedCopied: "Embed kodu kopyalandı!",
        createFailed: "Oluşturulamadı.",
        updateFailed: "Güncellenemedi.",
        deleteFailed: "Silinemedi.",
        deleteConfirm: "Bu formu ve tüm gönderimlerini silmek istediğinizden emin misiniz?",
        noForms: "Henüz lead formu yok.",
        noFormsHint: "Web sitenize embed edebileceğiniz formlar oluşturun.",
        newLeadForm: "Yeni lead formu",
        formNamePlaceholder: "Form adı...",
        create: "Oluştur",
        cancel: "İptal",
        active: "Aktif",
        passive: "Pasif",
        fieldCount: (n: number) => `${n} alan`,
        submissionCount: (n: number) => `${n} gönderim`,
        preview: "Formu önizle",
        copyEmbed: "Embed kodu kopyala",
        deactivate: "Pasife al",
        activate: "Aktifleştir",
        edit: "Düzenle",
      }
    : {
        pageTitle: "Lead Forms",
        pageSubtitle: "Capture leads via embed or link",
        newForm: "New Form",
        embedCopied: "Embed code copied!",
        createFailed: "Could not create.",
        updateFailed: "Could not update.",
        deleteFailed: "Could not delete.",
        deleteConfirm: "Are you sure you want to delete this form and all its submissions?",
        noForms: "No lead forms yet.",
        noFormsHint: "Create forms you can embed on your website.",
        newLeadForm: "New lead form",
        formNamePlaceholder: "Form name...",
        create: "Create",
        cancel: "Cancel",
        active: "Active",
        passive: "Inactive",
        fieldCount: (n: number) => `${n} field${n === 1 ? "" : "s"}`,
        submissionCount: (n: number) => `${n} submission${n === 1 ? "" : "s"}`,
        preview: "Preview form",
        copyEmbed: "Copy embed code",
        deactivate: "Deactivate",
        activate: "Activate",
        edit: "Edit",
      };

  const [forms, setForms] = useState<LeadFormOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    listLeadForms()
      .then(setForms)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const form = await createLeadForm({ name: newName.trim(), fields: [], active: true });
      router.push(`/admin/lead-forms/${form.id}`);
    } catch {
      showMsg(copy.createFailed);
      setCreating(false);
    }
  }

  async function handleToggleActive(form: LeadFormOut) {
    try {
      const updated = await updateLeadForm(form.id, {
        name: form.name,
        fields: form.fields_json,
        destination: form.destination,
        auto_tag: form.auto_tag,
        redirect_url: form.redirect_url,
        active: !form.active,
      });
      setForms((prev) => prev.map((f) => (f.id === form.id ? updated : f)));
    } catch {
      showMsg(copy.updateFailed);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(copy.deleteConfirm)) return;
    try {
      await deleteLeadForm(id);
      setForms((prev) => prev.filter((f) => f.id !== id));
    } catch {
      showMsg(copy.deleteFailed);
    }
  }

  function getPublicUrl(slug: string) {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/public/forms/${slug}`;
  }

  function copyEmbedCode(slug: string) {
    const url = getPublicUrl(slug);
    const code = `<iframe src="${url}" width="100%" height="500" frameborder="0" style="border-radius:12px"></iframe>`;
    navigator.clipboard.writeText(code).then(() => showMsg(copy.embedCopied));
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-inverse-surface text-white text-sm rounded-xl px-4 py-2.5 shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-status-info-content" />
          <div>
            <h1 className="text-xl font-semibold text-content-primary">{copy.pageTitle}</h1>
            <p className="text-sm text-content-muted">{copy.pageSubtitle}</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> {copy.newForm}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-status-info-border bg-status-info-bg p-5 space-y-3">
          <p className="text-sm font-medium text-status-info-content">{copy.newLeadForm}</p>
          <div className="flex gap-3">
            <input
              autoFocus
              className="flex-1 rounded-xl border border-outline-subtle bg-raised px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
              placeholder={copy.formNamePlaceholder}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <button
              disabled={creating || !newName.trim()}
              onClick={handleCreate}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-indigo-700"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.create}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewName(""); }}
              className="rounded-xl border border-outline-subtle bg-raised px-3 py-2 text-sm text-content-muted"
            >
              {copy.cancel}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
        </div>
      ) : forms.length === 0 ? (
        <div className="text-center py-20 text-content-muted">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{copy.noForms}</p>
          <p className="text-xs mt-1">{copy.noFormsHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => (
            <div key={form.id} className="rounded-2xl border border-outline-subtle bg-raised shadow-sm p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/lead-forms/${form.id}`}
                    className="font-medium text-content-primary hover:text-status-info-content truncate"
                  >
                    {form.name}
                  </Link>
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium flex-shrink-0 ${
                    form.active ? "bg-status-success-bg text-status-success-content" : "bg-sunken text-content-muted"
                  }`}>
                    {form.active ? copy.active : copy.passive}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-content-muted">
                  <span>{copy.fieldCount(form.fields_json.length)}</span>
                  <span>{copy.submissionCount(form.submission_count)}</span>
                  <span className="font-mono text-content-muted">/public/forms/{form.slug}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={`/public/forms/${form.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-outline-subtle p-1.5 text-content-muted hover:bg-canvas"
                  title={copy.preview}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => copyEmbedCode(form.slug)}
                  className="rounded-lg border border-outline-subtle p-1.5 text-content-muted hover:bg-canvas"
                  title={copy.copyEmbed}
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleToggleActive(form)}
                  className="rounded-lg border border-outline-subtle p-1.5 text-content-muted hover:bg-canvas"
                  title={form.active ? copy.deactivate : copy.activate}
                >
                  {form.active
                    ? <ToggleRight className="h-4 w-4 text-status-success-content" />
                    : <ToggleLeft className="h-4 w-4" />}
                </button>
                <Link
                  href={`/admin/lead-forms/${form.id}`}
                  className="flex items-center gap-1 rounded-lg border border-outline-subtle px-3 py-1.5 text-xs text-content-secondary hover:bg-canvas"
                >
                  {copy.edit} <ChevronRight className="h-3 w-3" />
                </Link>
                <button
                  onClick={() => handleDelete(form.id)}
                  className="rounded-lg border border-outline-subtle p-1.5 text-status-danger-content hover:bg-status-danger-bg"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
