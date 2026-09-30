"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, CheckCircle2,
  AlertCircle, GripVertical, ChevronUp, ChevronDown, Copy,
  ExternalLink, Eye,
} from "lucide-react";
import {
  getLeadForm, updateLeadForm, getLeadFormSubmissions,
  type LeadFormOut, type FormFieldDef, type LeadSubmissionOut,
} from "@/lib/api";
import { useI18n, translate } from "@/lib/i18n";

type Tab = "builder" | "submissions" | "embed";

export default function LeadFormBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const formId = Number(params.id);
  const { lang } = useI18n();

  const copy = { fieldTypes: [{ value: "text", label: translate(lang, "migrated_app_admin_lead_forms_id_text_01181f88") }, { value: "email", label: translate(lang, "migrated_app_admin_lead_forms_id_email_10cb46f2") }, { value: "tel", label: translate(lang, "migrated_app_admin_lead_forms_id_phone_c58c0fcf") }, { value: "number", label: translate(lang, "migrated_app_admin_lead_forms_id_number_9709cb6a") }, { value: "textarea", label: translate(lang, "migrated_app_admin_lead_forms_id_long_text_6e4636a1") }, { value: "dropdown", label: "Dropdown" }, { value: "checkbox", label: translate(lang, "migrated_app_admin_lead_forms_id_checkbox_471650d6") }], destCrm: translate(lang, "migrated_app_admin_lead_forms_id_create_crm_profile_2eb8acf0"), destNone: translate(lang, "migrated_app_admin_lead_forms_id_save_only_f5bddb3e"), tabBuilder: translate(lang, "migrated_app_admin_lead_forms_id_builder_c712f394"), tabSubmissions: (n: number) => translate(lang, "migrated_app_admin_lead_forms_id_submissions_value0_e3d6d2cd", { value0: n }), tabEmbed: translate(lang, "migrated_app_admin_lead_forms_id_embed_1d636076"), active: translate(lang, "migrated_app_admin_lead_forms_id_active_5063c095"), passive: translate(lang, "migrated_app_admin_lead_forms_id_inactive_747dd496"), saved: translate(lang, "migrated_app_admin_lead_forms_id_saved_a2e99736"), saveFailed: translate(lang, "migrated_app_admin_lead_forms_id_save_failed_fc1ed791"), copied: translate(lang, "migrated_app_admin_lead_forms_id_copied_e6c682ac"), linkCopied: translate(lang, "migrated_app_admin_lead_forms_id_link_copied_180b82d6"), formSettings: translate(lang, "migrated_app_admin_lead_forms_id_form_settings_5d7c4e5a"), labelFormName: translate(lang, "migrated_app_admin_lead_forms_id_form_name_0e1dc042"), labelDestination: translate(lang, "migrated_app_admin_lead_forms_id_destination_3e2be8f0"), labelAutoTag: translate(lang, "migrated_app_admin_lead_forms_id_auto_tag_8dfbb0b0"), placeholderAutoTag: translate(lang, "migrated_app_admin_lead_forms_id_e_g_web_lead_2026_3328ce36"), labelRedirectUrl: translate(lang, "migrated_app_admin_lead_forms_id_redirect_url_optional_e12c0f93"), placeholderRedirectUrl: translate(lang, "migrated_app_admin_lead_forms_id_https_yoursite_com_thank_you_b6c05023"), activeCheckbox: translate(lang, "migrated_app_admin_lead_forms_id_active_form_is_publicly_accessible_40e80254"), fieldsTitle: (n: number) => translate(lang, "migrated_app_admin_lead_forms_id_fields_value0_2a03054a", { value0: n }), noFields: translate(lang, "migrated_app_admin_lead_forms_id_no_fields_yet_7ecef382"), fieldN: (n: number) => translate(lang, "migrated_app_admin_lead_forms_id_field_value0_6f4d5e13", { value0: n }), labelFieldLabel: translate(lang, "migrated_app_admin_lead_forms_id_label_6d1e927b"), placeholderFieldLabel: translate(lang, "migrated_app_admin_lead_forms_id_full_name_3f1945f3"), labelFieldName: translate(lang, "migrated_app_admin_lead_forms_id_field_name_auto_5e7a0bea"), placeholderFieldName: translate(lang, "migrated_app_admin_lead_forms_id_full_name_f479baab"), labelFieldType: translate(lang, "migrated_app_admin_lead_forms_id_type_692c000f"), labelPlaceholder: translate(lang, "migrated_app_admin_lead_forms_id_placeholder_a70cdf73"), labelOptions: translate(lang, "migrated_app_admin_lead_forms_id_options_comma_separated_7f905153"), placeholderOptions: translate(lang, "migrated_app_admin_lead_forms_id_option_a_option_b_option_c_3f58c2d9"), requiredField: translate(lang, "migrated_app_admin_lead_forms_id_required_field_843e2b0f"), addField: translate(lang, "migrated_app_admin_lead_forms_id_add_field_9c32310e"), save: translate(lang, "migrated_app_admin_lead_forms_id_save_63095e80"), noSubmissions: translate(lang, "migrated_app_admin_lead_forms_id_no_submissions_yet_c73f1e12"), colDate: translate(lang, "migrated_app_admin_lead_forms_id_date_ae32e957"), embedTitle: translate(lang, "migrated_app_admin_lead_forms_id_link_embed_81fc96f3"), labelStandardLink: translate(lang, "migrated_app_admin_lead_forms_id_standard_link_0ccc6777"), btnCopy: translate(lang, "migrated_app_admin_lead_forms_id_copy_6b342bc0"), btnOpen: translate(lang, "migrated_app_admin_lead_forms_id_open_6d15a8ce"), labelEmbedCode: translate(lang, "migrated_app_admin_lead_forms_id_iframe_embed_code_8207eb69"), btnCopyEmbed: translate(lang, "migrated_app_admin_lead_forms_id_copy_embed_code_296d034b") };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("builder");
  const [form, setForm] = useState<LeadFormOut | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Builder state
  const [name, setName] = useState("");
  const [fields, setFields] = useState<FormFieldDef[]>([]);
  const [destination, setDestination] = useState("crm");
  const [autoTag, setAutoTag] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [active, setActive] = useState(true);

  // Submissions state
  const [submissions, setSubmissions] = useState<LeadSubmissionOut[]>([]);
  const [subLoading, setSubLoading] = useState(false);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    getLeadForm(formId)
      .then((f) => {
        setForm(f);
        setName(f.name);
        setFields(f.fields_json || []);
        setDestination(f.destination);
        setAutoTag(f.auto_tag ?? "");
        setRedirectUrl(f.redirect_url ?? "");
        setActive(f.active);
      })
      .catch(() => router.push("/admin/lead-forms"))
      .finally(() => setLoading(false));
  }, [formId]);

  useEffect(() => {
    if (tab !== "submissions") return;
    setSubLoading(true);
    getLeadFormSubmissions(formId)
      .then(setSubmissions)
      .catch(() => {})
      .finally(() => setSubLoading(false));
  }, [tab, formId]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateLeadForm(formId, {
        name: name.trim(),
        fields,
        destination,
        auto_tag: autoTag.trim() || null,
        redirect_url: redirectUrl.trim() || null,
        active,
      });
      setForm(updated);
      showToast("success", copy.saved);
    } catch {
      showToast("error", copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  function newField(): FormFieldDef {
    return { name: "", label: "", field_type: "text", required: true, options: [], placeholder: "" };
  }

  function toFieldName(label: string): string {
    return label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  }

  function addField() {
    setFields((f) => [...f, newField()]);
  }

  function removeField(idx: number) {
    setFields((f) => f.filter((_, i) => i !== idx));
  }

  function moveField(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= fields.length) return;
    setFields((f) => {
      const arr = [...f];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  }

  function updateField<K extends keyof FormFieldDef>(idx: number, key: K, val: FormFieldDef[K]) {
    setFields((f) =>
      f.map((x, i) => {
        if (i !== idx) return x;
        const updated = { ...x, [key]: val };
        if (key === "label" && !x.name) {
          updated.name = toFieldName(String(val));
        }
        return updated;
      })
    );
  }

  function getPublicUrl() {
    if (!form) return "";
    if (typeof window === "undefined") return `/public/forms/${form.slug}`;
    return `${window.location.origin}/public/forms/${form.slug}`;
  }

  function copyEmbed() {
    const url = getPublicUrl();
    const code = `<iframe src="${url}" width="100%" height="500" frameborder="0" style="border-radius:12px;border:none"></iframe>`;
    navigator.clipboard.writeText(code).then(() => showToast("success", copy.copied));
  }

  function copyLink() {
    navigator.clipboard.writeText(getPublicUrl()).then(() => showToast("success", copy.linkCopied));
  }

  const subFields = fields.filter((f) => f.name);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg text-white ${
          toast.type === "success" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/lead-forms" className="text-content-muted hover:text-content-secondary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold text-content-primary flex-1 truncate">{form?.name}</h1>
        <span className={`text-xs rounded-full px-2.5 py-1 font-medium ${
          active ? "bg-status-success-bg text-status-success-content" : "bg-sunken text-content-muted"
        }`}>
          {active ? copy.active : copy.passive}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-sunken p-1 w-fit">
        {(["builder", "submissions", "embed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t ? "bg-raised shadow text-content-primary" : "text-content-muted hover:text-content-secondary"
            }`}
          >
            {t === "builder"
              ? copy.tabBuilder
              : t === "submissions"
              ? copy.tabSubmissions(form?.submission_count ?? 0)
              : copy.tabEmbed}
          </button>
        ))}
      </div>

      {/* ── Builder Tab ── */}
      {tab === "builder" && (
        <div className="space-y-5">
          {/* Meta card */}
          <div className="rounded-2xl border border-outline-subtle bg-raised p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-medium text-content-secondary">{copy.formSettings}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-content-muted mb-1">{copy.labelFormName}</label>
                <input
                  className="w-full rounded-xl border border-outline-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-content-muted mb-1">{copy.labelDestination}</label>
                <select
                  className="w-full rounded-xl border border-outline-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  <option value="crm">{copy.destCrm}</option>
                  <option value="none">{copy.destNone}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-content-muted mb-1">{copy.labelAutoTag}</label>
                <input
                  className="w-full rounded-xl border border-outline-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                  placeholder={copy.placeholderAutoTag}
                  value={autoTag}
                  onChange={(e) => setAutoTag(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-content-muted mb-1">{copy.labelRedirectUrl}</label>
                <input
                  type="url"
                  className="w-full rounded-xl border border-outline-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                  placeholder={copy.placeholderRedirectUrl}
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm text-content-secondary cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                {copy.activeCheckbox}
              </label>
            </div>
          </div>

          {/* Fields card */}
          <div className="rounded-2xl border border-outline-subtle bg-raised p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-content-secondary">{copy.fieldsTitle(fields.length)}</h2>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-content-muted text-center py-4">{copy.noFields}</p>
            )}

            <div className="space-y-4">
              {fields.map((field, idx) => (
                <div key={idx} className="rounded-xl border border-outline-subtle bg-canvas p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-content-muted">{copy.fieldN(idx + 1)}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveField(idx, -1)} disabled={idx === 0} className="p-1 text-content-muted hover:text-content-secondary disabled:opacity-30">
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1} className="p-1 text-content-muted hover:text-content-secondary disabled:opacity-30">
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button onClick={() => removeField(idx)} className="p-1 text-status-danger-content hover:text-status-danger-content">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-content-muted mb-1">{copy.labelFieldLabel}</label>
                      <input
                        className="w-full rounded-lg border border-outline-subtle bg-raised px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                        placeholder={copy.placeholderFieldLabel}
                        value={field.label}
                        onChange={(e) => updateField(idx, "label", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-content-muted mb-1">{copy.labelFieldName}</label>
                      <input
                        className="w-full rounded-lg border border-outline-subtle bg-raised px-3 py-1.5 text-sm font-mono text-content-muted focus:outline-none focus:ring-2 focus:ring-status-info-border"
                        placeholder={copy.placeholderFieldName}
                        value={field.name}
                        onChange={(e) => updateField(idx, "name", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-content-muted mb-1">{copy.labelFieldType}</label>
                      <select
                        className="w-full rounded-lg border border-outline-subtle bg-raised px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                        value={field.field_type}
                        onChange={(e) => updateField(idx, "field_type", e.target.value as any)}
                      >
                        {copy.fieldTypes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-content-muted mb-1">{copy.labelPlaceholder}</label>
                      <input
                        className="w-full rounded-lg border border-outline-subtle bg-raised px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                        value={field.placeholder ?? ""}
                        onChange={(e) => updateField(idx, "placeholder", e.target.value)}
                      />
                    </div>
                    {field.field_type === "dropdown" && (
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-content-muted mb-1">{copy.labelOptions}</label>
                        <input
                          className="w-full rounded-lg border border-outline-subtle bg-raised px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                          placeholder={copy.placeholderOptions}
                          value={field.options.join(", ")}
                          onChange={(e) =>
                            updateField(idx, "options", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
                          }
                        />
                      </div>
                    )}
                    <label className="col-span-2 flex items-center gap-2 text-xs text-content-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={field.required}
                        onChange={(e) => updateField(idx, "required", e.target.checked)}
                      />
                      {copy.requiredField}
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addField}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-outline-strong bg-canvas px-4 py-3 text-sm text-content-muted hover:border-status-info-border hover:text-status-info-content hover:bg-status-info-bg transition"
            >
              <Plus className="h-4 w-4" /> {copy.addField}
            </button>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {copy.save}
            </button>
          </div>
        </div>
      )}

      {/* ── Submissions Tab ── */}
      {tab === "submissions" && (
        <div className="space-y-4">
          {subLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-16 text-content-muted text-sm">
              {copy.noSubmissions}
            </div>
          ) : (
            <div className="rounded-2xl border border-outline-subtle bg-raised shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-canvas border-b border-outline-subtle">
                  <tr>
                    {subFields.map((f) => (
                      <th key={f.name} className="text-left px-4 py-3 text-xs font-medium text-content-muted">
                        {f.label}
                      </th>
                    ))}
                    <th className="text-left px-4 py-3 text-xs font-medium text-content-muted">{copy.colDate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-subtle">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-canvas">
                      {subFields.map((f) => (
                        <td key={f.name} className="px-4 py-3 text-content-secondary">
                          {sub.data_json[f.name] ?? "—"}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-content-muted text-xs">
                        {new Date(sub.submitted_at).toLocaleString(localeTag(lang), { dateStyle: "short", timeStyle: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Embed Tab ── */}
      {tab === "embed" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-outline-subtle bg-raised p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-medium text-content-secondary">{copy.embedTitle}</h2>

            {/* Public link */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-content-muted">{copy.labelStandardLink}</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  className="flex-1 rounded-xl border border-outline-subtle bg-canvas px-3 py-2 text-sm font-mono text-content-secondary"
                  value={getPublicUrl()}
                />
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1.5 rounded-xl border border-outline-subtle px-3 py-2 text-xs text-content-secondary hover:bg-canvas"
                >
                  <Copy className="h-3.5 w-3.5" /> {copy.btnCopy}
                </button>
                <a
                  href={`/public/forms/${form?.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl border border-outline-subtle px-3 py-2 text-xs text-content-secondary hover:bg-canvas"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> {copy.btnOpen}
                </a>
              </div>
            </div>

            {/* Embed code */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-content-muted">{copy.labelEmbedCode}</label>
              <pre className="rounded-xl bg-inverse-surface text-status-success-content text-xs p-4 overflow-x-auto whitespace-pre-wrap font-mono">
                {`<iframe\n  src="${getPublicUrl()}"\n  width="100%"\n  height="500"\n  frameborder="0"\n  style="border-radius:12px;border:none"\n></iframe>`}
              </pre>
              <button
                onClick={copyEmbed}
                className="flex items-center gap-1.5 rounded-xl border border-outline-subtle px-3 py-2 text-xs text-content-secondary hover:bg-canvas"
              >
                <Copy className="h-3.5 w-3.5" /> {copy.btnCopyEmbed}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
