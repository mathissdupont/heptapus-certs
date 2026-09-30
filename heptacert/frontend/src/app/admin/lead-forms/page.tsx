"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, ClipboardList, Loader2, Trash2, ChevronRight,
  ExternalLink, Copy, ToggleLeft, ToggleRight,
} from "lucide-react";
import { listLeadForms, createLeadForm, deleteLeadForm, updateLeadForm, type LeadFormOut } from "@/lib/api";
import { useI18n, translate } from "@/lib/i18n";

export default function LeadFormsPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const copy = { pageTitle: translate(lang, "migrated_app_admin_lead_forms_lead_forms_0fc2cd3e"), pageSubtitle: translate(lang, "migrated_app_admin_lead_forms_capture_leads_via_embed_or_link_9c6dd0a6"), newForm: translate(lang, "migrated_app_admin_lead_forms_new_form_b71424e9"), embedCopied: translate(lang, "migrated_app_admin_lead_forms_embed_code_copied_41f5b323"), createFailed: translate(lang, "migrated_app_admin_lead_forms_could_not_create_354f574d"), updateFailed: translate(lang, "migrated_app_admin_lead_forms_could_not_update_2ac45249"), deleteFailed: translate(lang, "migrated_app_admin_lead_forms_could_not_delete_01481880"), deleteConfirm: translate(lang, "migrated_app_admin_lead_forms_are_you_sure_you_want_to_delete_this_form__38545f99"), noForms: translate(lang, "migrated_app_admin_lead_forms_no_lead_forms_yet_ac818d6f"), noFormsHint: translate(lang, "migrated_app_admin_lead_forms_create_forms_you_can_embed_on_your_website_04a251cb"), newLeadForm: translate(lang, "migrated_app_admin_lead_forms_new_lead_form_53a2d7e1"), formNamePlaceholder: translate(lang, "migrated_app_admin_lead_forms_form_name_9c3f82aa"), create: translate(lang, "migrated_app_admin_lead_forms_create_4dbbd83a"), cancel: translate(lang, "migrated_app_admin_lead_forms_cancel_6631842b"), active: translate(lang, "migrated_app_admin_lead_forms_active_5e5a2795"), passive: translate(lang, "migrated_app_admin_lead_forms_inactive_d6291aa3"), fieldCount: (n: number) => translate(lang, "migrated_app_admin_lead_forms_value0_field_s_711b7000", { value0: n }), submissionCount: (n: number) => translate(lang, "migrated_app_admin_lead_forms_value0_submission_s_61b9a3fa", { value0: n }), preview: translate(lang, "migrated_app_admin_lead_forms_preview_form_3bdb0238"), copyEmbed: translate(lang, "migrated_app_admin_lead_forms_copy_embed_code_0b779bc9"), deactivate: translate(lang, "migrated_app_admin_lead_forms_deactivate_e237caba"), activate: translate(lang, "migrated_app_admin_lead_forms_activate_dbbf4faf"), edit: translate(lang, "migrated_app_admin_lead_forms_edit_216955b6") };

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
