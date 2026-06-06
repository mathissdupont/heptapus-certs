"use client";

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
import { useI18n } from "@/lib/i18n";

type Tab = "builder" | "submissions" | "embed";

export default function LeadFormBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const formId = Number(params.id);
  const { lang } = useI18n();

  const copy = lang === "tr"
    ? {
        // Field type labels
        fieldTypes: [
          { value: "text",     label: "Metin" },
          { value: "email",    label: "E-posta" },
          { value: "tel",      label: "Telefon" },
          { value: "number",   label: "Sayı" },
          { value: "textarea", label: "Uzun Metin" },
          { value: "dropdown", label: "Dropdown" },
          { value: "checkbox", label: "Onay Kutusu" },
        ],
        // Destination options
        destCrm: "CRM Profili Oluştur",
        destNone: "Sadece Kaydet",
        // Tabs
        tabBuilder: "Oluşturucu",
        tabSubmissions: (n: number) => `Gönderimler (${n})`,
        tabEmbed: "Embed",
        // Status
        active: "Aktif",
        passive: "Pasif",
        // Toast messages
        saved: "Kaydedildi.",
        saveFailed: "Kayıt başarısız.",
        copied: "Kopyalandı!",
        linkCopied: "Link kopyalandı!",
        // Builder — meta card
        formSettings: "Form Ayarları",
        labelFormName: "Form Adı",
        labelDestination: "Hedef",
        labelAutoTag: "Otomatik Tag",
        placeholderAutoTag: "ör: web-lead-2026",
        labelRedirectUrl: "Yönlendirme URL (opsiyonel)",
        placeholderRedirectUrl: "https://siteniz.com/tesekkurler",
        activeCheckbox: "Aktif (form dış dünyaya açık olsun)",
        // Builder — fields card
        fieldsTitle: (n: number) => `Alanlar (${n})`,
        noFields: "Henüz alan yok.",
        fieldN: (n: number) => `Alan ${n}`,
        labelFieldLabel: "Etiket",
        placeholderFieldLabel: "Ad Soyad",
        labelFieldName: "Alan Adı (otomatik)",
        placeholderFieldName: "ad_soyad",
        labelFieldType: "Tür",
        labelPlaceholder: "Placeholder",
        labelOptions: "Seçenekler (virgülle ayırın)",
        placeholderOptions: "Seçenek A, Seçenek B, Seçenek C",
        requiredField: "Zorunlu alan",
        addField: "Alan Ekle",
        save: "Kaydet",
        // Submissions tab
        noSubmissions: "Henüz gönderim yok.",
        colDate: "Tarih",
        // Embed tab
        embedTitle: "Bağlantı & Embed",
        labelStandardLink: "Standart Link",
        btnCopy: "Kopyala",
        btnOpen: "Aç",
        labelEmbedCode: "iframe Embed Kodu",
        btnCopyEmbed: "Embed kodunu kopyala",
      }
    : {
        fieldTypes: [
          { value: "text",     label: "Text" },
          { value: "email",    label: "Email" },
          { value: "tel",      label: "Phone" },
          { value: "number",   label: "Number" },
          { value: "textarea", label: "Long Text" },
          { value: "dropdown", label: "Dropdown" },
          { value: "checkbox", label: "Checkbox" },
        ],
        destCrm: "Create CRM Profile",
        destNone: "Save Only",
        tabBuilder: "Builder",
        tabSubmissions: (n: number) => `Submissions (${n})`,
        tabEmbed: "Embed",
        active: "Active",
        passive: "Inactive",
        saved: "Saved.",
        saveFailed: "Save failed.",
        copied: "Copied!",
        linkCopied: "Link copied!",
        formSettings: "Form Settings",
        labelFormName: "Form Name",
        labelDestination: "Destination",
        labelAutoTag: "Auto Tag",
        placeholderAutoTag: "e.g. web-lead-2026",
        labelRedirectUrl: "Redirect URL (optional)",
        placeholderRedirectUrl: "https://yoursite.com/thank-you",
        activeCheckbox: "Active (form is publicly accessible)",
        fieldsTitle: (n: number) => `Fields (${n})`,
        noFields: "No fields yet.",
        fieldN: (n: number) => `Field ${n}`,
        labelFieldLabel: "Label",
        placeholderFieldLabel: "Full Name",
        labelFieldName: "Field Name (auto)",
        placeholderFieldName: "full_name",
        labelFieldType: "Type",
        labelPlaceholder: "Placeholder",
        labelOptions: "Options (comma-separated)",
        placeholderOptions: "Option A, Option B, Option C",
        requiredField: "Required field",
        addField: "Add Field",
        save: "Save",
        noSubmissions: "No submissions yet.",
        colDate: "Date",
        embedTitle: "Link & Embed",
        labelStandardLink: "Standard Link",
        btnCopy: "Copy",
        btnOpen: "Open",
        labelEmbedCode: "iframe Embed Code",
        btnCopyEmbed: "Copy embed code",
      };

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
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
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
        <Link href="/admin/lead-forms" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 flex-1 truncate">{form?.name}</h1>
        <span className={`text-xs rounded-full px-2.5 py-1 font-medium ${
          active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        }`}>
          {active ? copy.active : copy.passive}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(["builder", "submissions", "embed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
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
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-medium text-gray-700">{copy.formSettings}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">{copy.labelFormName}</label>
                <input
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{copy.labelDestination}</label>
                <select
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  <option value="crm">{copy.destCrm}</option>
                  <option value="none">{copy.destNone}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{copy.labelAutoTag}</label>
                <input
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={copy.placeholderAutoTag}
                  value={autoTag}
                  onChange={(e) => setAutoTag(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">{copy.labelRedirectUrl}</label>
                <input
                  type="url"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={copy.placeholderRedirectUrl}
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
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
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700">{copy.fieldsTitle(fields.length)}</h2>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">{copy.noFields}</p>
            )}

            <div className="space-y-4">
              {fields.map((field, idx) => (
                <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400">{copy.fieldN(idx + 1)}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveField(idx, -1)} disabled={idx === 0} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30">
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30">
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button onClick={() => removeField(idx)} className="p-1 text-red-300 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{copy.labelFieldLabel}</label>
                      <input
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={copy.placeholderFieldLabel}
                        value={field.label}
                        onChange={(e) => updateField(idx, "label", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{copy.labelFieldName}</label>
                      <input
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-mono text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={copy.placeholderFieldName}
                        value={field.name}
                        onChange={(e) => updateField(idx, "name", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{copy.labelFieldType}</label>
                      <select
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={field.field_type}
                        onChange={(e) => updateField(idx, "field_type", e.target.value as any)}
                      >
                        {copy.fieldTypes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{copy.labelPlaceholder}</label>
                      <input
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={field.placeholder ?? ""}
                        onChange={(e) => updateField(idx, "placeholder", e.target.value)}
                      />
                    </div>
                    {field.field_type === "dropdown" && (
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">{copy.labelOptions}</label>
                        <input
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder={copy.placeholderOptions}
                          value={field.options.join(", ")}
                          onChange={(e) =>
                            updateField(idx, "options", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
                          }
                        />
                      </div>
                    )}
                    <label className="col-span-2 flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
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
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
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
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              {copy.noSubmissions}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {subFields.map((f) => (
                      <th key={f.name} className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                        {f.label}
                      </th>
                    ))}
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{copy.colDate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      {subFields.map((f) => (
                        <td key={f.name} className="px-4 py-3 text-gray-700">
                          {sub.data_json[f.name] ?? "—"}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(sub.submitted_at).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
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
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-medium text-gray-700">{copy.embedTitle}</h2>

            {/* Public link */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500">{copy.labelStandardLink}</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono text-gray-600"
                  value={getPublicUrl()}
                />
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                >
                  <Copy className="h-3.5 w-3.5" /> {copy.btnCopy}
                </button>
                <a
                  href={`/public/forms/${form?.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> {copy.btnOpen}
                </a>
              </div>
            </div>

            {/* Embed code */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500">{copy.labelEmbedCode}</label>
              <pre className="rounded-xl bg-gray-900 text-green-400 text-xs p-4 overflow-x-auto whitespace-pre-wrap font-mono">
                {`<iframe\n  src="${getPublicUrl()}"\n  width="100%"\n  height="500"\n  frameborder="0"\n  style="border-radius:12px;border:none"\n></iframe>`}
              </pre>
              <button
                onClick={copyEmbed}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
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
