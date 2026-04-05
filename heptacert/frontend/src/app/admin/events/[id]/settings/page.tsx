"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader2,
  Lock,
  Mail,
  Save,
  Sparkles,
  Upload,
  Wand2,
  Plus,
  Trash2,
} from "lucide-react";
import { apiFetch, getMySubscription, type RegistrationField, type SubscriptionInfo } from "@/lib/api";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import PageHeader from "@/components/Admin/PageHeader";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/useToast";

type EventOut = {
  id: number;
  name: string;
  config?: {
    registration_fields?: RegistrationField[];
    visibility?: "private" | "unlisted" | "public";
    [key: string]: unknown;
  };
  event_description?: string;
  event_banner_url?: string | null;
  auto_email_on_cert?: boolean;
  cert_email_template_id?: number | null;
  visibility?: "private" | "unlisted" | "public";
};

type EmailTemplate = {
  id: number;
  name: string;
  subject_tr: string;
  subject_en: string;
  template_type: string;
  event_id?: number | null;
};

type FormState = {
  name: string;
  event_description: string;
  event_banner_url: string;
  visibility: "private" | "unlisted" | "public";
  registration_fields: RegistrationField[];
  auto_email_on_cert: boolean;
  cert_email_template_id: number | null;
};

const FIELD_TYPE_OPTIONS: Array<{ value: RegistrationField["type"]; tr: string; en: string }> = [
  { value: "text", tr: "Kısa metin", en: "Short text" },
  { value: "textarea", tr: "Uzun metin", en: "Long text" },
  { value: "tel", tr: "Telefon", en: "Phone" },
  { value: "number", tr: "Sayı", en: "Number" },
  { value: "date", tr: "Tarih", en: "Date" },
  { value: "select", tr: "Seçim listesi", en: "Select list" },
];

const VISIBILITY_OPTIONS = [
  { value: "private", tr: "Private", en: "Private" },
  { value: "unlisted", tr: "Liste dışı", en: "Unlisted" },
  { value: "public", tr: "Public", en: "Public" },
] as const;

function createRegistrationField(): RegistrationField {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `field_${crypto.randomUUID().slice(0, 8)}`
      : `field_${Date.now().toString(36)}`;

  return {
    id,
    label: "",
    type: "text",
    required: false,
    placeholder: "",
    helper_text: "",
    options: [],
  };
}

export default function EventSettingsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const toast = useToast();
  const { lang } = useI18n();

  const copy = lang === "tr"
    ? {
        title: "Etkinlik Ayarları",
        subtitle: "Etkinlik bilgisini, sertifika görünümünü ve otomatik e-posta akışını tek yerden yönetin.",
        loadingError: "Veriler yüklenemedi.",
        requiredName: "Etkinlik adı zorunludur.",
        saveSuccess: "Ayarlar kaydedildi.",
        saveError: "Ayarlar kaydedilemedi.",
        bannerError: "Banner yüklenemedi.",
        upgradeTitle: "Otomatik e-posta için Growth veya Enterprise gerekir",
        upgradeBody: "Sertifika verildiğinde otomatik e-posta gönderimi ve sistem şablonları yalnızca üst planlarda kullanılabilir.",
        upgradeCta: "Planları Gör",
        basicTitle: "Temel Bilgiler",
        basicBody: "Etkinlik kaydı sırasında görünen ana bilgileri burada güncelleyin.",
        visibilityTitle: "Public görünürlük",
        visibilityBody: "Bu ayar yalnızca public keşif ekranını etkiler. Mevcut kayıt linklerin ve organizer akışın bozulmaz.",
        visibilityLabel: "Görünürlük modu",
        visibilityHint: "Private etkinlikler listede görünmez. Unlisted sadece direkt link ile açılır. Public etkinlikler keşif ekranına düşer.",
        registrationTitle: "Kayıt formu alanları",
        registrationBody: "Katılımcılardan toplamak istediğiniz ek bilgileri belirleyin. Bu alanlar public kayıt sayfasında ad ve e-postanın altında görünür.",
        addField: "Alan ekle",
        emptyFields: "Henüz özel kayıt alanı eklenmedi.",
        fieldLabel: "Alan etiketi",
        fieldType: "Alan türü",
        fieldPlaceholder: "Placeholder",
        fieldHelper: "Yardım metni",
        fieldOptions: "Seçenekler",
        fieldOptionsHint: "Her satıra bir seçenek yazın.",
        requiredField: "Zorunlu alan",
        removeField: "Alanı kaldır",
        labelPlaceholder: "Örn. T.C. Kimlik Numarası",
        helperPlaceholder: "Katılımcının ne girmesi gerektiğini açıklayın",
        previewHint: "Kayıt formunda bu alanlar verdiğiniz sıraya göre gösterilir.",
        name: "Etkinlik adı",
        namePlaceholder: "Örn. Hepta Summit 2026",
        description: "Etkinlik açıklaması",
        descriptionPlaceholder: "Katılımcıların kayıt sayfasında göreceği kısa açıklama",
        bannerTitle: "Etkinlik bannerı",
        bannerBody: "Kayıt ekranı ve üst başlıklarda kullanılan görseli güncelleyin.",
        uploadBanner: "Banner Yükle",
        bannerHint: "Önerilen boyut: 1200×400 · JPG, PNG veya WebP",
        noBanner: "Henüz banner yüklenmedi",
        emailTitle: "Otomatik sertifika e-postası",
        emailBody: "Sertifika oluşturulduğunda hangi e-posta şablonunun kullanılacağını belirleyin.",
        autoEmail: "Sertifika oluşturulunca otomatik e-posta gönder",
        autoEmailHint: "Katılımcı sertifikası üretildiği anda seçili şablonla teslim e-postası gönderilir.",
        templateLabel: "E-posta şablonu",
        templatePlaceholder: "Şablon seçin",
        customTemplates: "Etkinliğe özel şablonlar",
        systemTemplates: "Sistem şablonları",
        noTemplates: "Henüz kullanılabilir e-posta şablonu yok. Önce bir şablon oluşturun.",
        manageTemplates: "E-posta şablonlarını yönet",
        manageCampaigns: "Toplu e-posta kampanyalarına git",
        openEditor: "Editörde aç",
        cancel: "Vazgeç",
        save: "Ayarları Kaydet",
        saving: "Kaydediliyor...",
        active: "Aktif",
        enterprise: "Enterprise",
        growth: "Growth",
      }
    : {
        title: "Event Settings",
        subtitle: "Manage event details, certificate appearance, and automated email delivery from one place.",
        loadingError: "Failed to load data.",
        requiredName: "Event name is required.",
        saveSuccess: "Settings saved.",
        saveError: "Failed to save settings.",
        bannerError: "Banner upload failed.",
        upgradeTitle: "Growth or Enterprise is required for automated email",
        upgradeBody: "Automatic certificate delivery emails and system templates are only available on higher plans.",
        upgradeCta: "View Plans",
        basicTitle: "Basic Information",
        basicBody: "Update the main event details shown during registration.",
        visibilityTitle: "Public visibility",
        visibilityBody: "This setting only affects the public discovery layer. Your current registration links and organizer workflow remain intact.",
        visibilityLabel: "Visibility mode",
        visibilityHint: "Private stays hidden. Unlisted opens only via direct link. Public events appear in the discovery list.",
        registrationTitle: "Registration form fields",
        registrationBody: "Define the extra information you want to collect from attendees. These fields are shown below name and email on the public registration page.",
        addField: "Add field",
        emptyFields: "No custom registration field has been added yet.",
        fieldLabel: "Field label",
        fieldType: "Field type",
        fieldPlaceholder: "Placeholder",
        fieldHelper: "Helper text",
        fieldOptions: "Options",
        fieldOptionsHint: "Write one option per line.",
        requiredField: "Required field",
        removeField: "Remove field",
        labelPlaceholder: "e.g. National ID Number",
        helperPlaceholder: "Explain what the attendee should enter",
        previewHint: "These fields appear on the public registration form in the same order.",
        name: "Event name",
        namePlaceholder: "e.g. Hepta Summit 2026",
        description: "Event description",
        descriptionPlaceholder: "Short copy attendees will see on the registration page",
        bannerTitle: "Event banner",
        bannerBody: "Update the visual used on registration and event headers.",
        uploadBanner: "Upload Banner",
        bannerHint: "Recommended size: 1200×400 · JPG, PNG or WebP",
        noBanner: "No banner uploaded yet",
        emailTitle: "Automatic certificate email",
        emailBody: "Choose which email template should be sent when a certificate is issued.",
        autoEmail: "Send an automatic email when a certificate is issued",
        autoEmailHint: "As soon as a participant certificate is generated, the selected delivery email is sent.",
        templateLabel: "Email template",
        templatePlaceholder: "Select a template",
        customTemplates: "Event templates",
        systemTemplates: "System templates",
        noTemplates: "No email template is available yet. Create one first.",
        manageTemplates: "Manage email templates",
        manageCampaigns: "Go to bulk email campaigns",
        openEditor: "Open in Editor",
        cancel: "Cancel",
        save: "Save Settings",
        saving: "Saving...",
        active: "Active",
        enterprise: "Enterprise",
        growth: "Growth",
      };

  const [event, setEvent] = useState<EventOut | null>(null);
  const [customEmailTemplates, setCustomEmailTemplates] = useState<EmailTemplate[]>([]);
  const [systemEmailTemplates, setSystemEmailTemplates] = useState<EmailTemplate[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [formData, setFormData] = useState<FormState>({
    name: "",
    event_description: "",
    event_banner_url: "",
    visibility: "private",
    registration_fields: [],
    auto_email_on_cert: false,
    cert_email_template_id: null,
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasGrowthPlan = subscription?.role === "superadmin" || (subscription?.active && ["growth", "enterprise"].includes(subscription?.plan_id || ""));
  const fieldTypeOptions = FIELD_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: lang === "tr" ? option.tr : option.en,
  }));
  const visibilityOptions = VISIBILITY_OPTIONS.map((option) => ({
    value: option.value,
    label: lang === "tr" ? option.tr : option.en,
  }));

  const availableEmailTemplates = useMemo(
    () => [...customEmailTemplates, ...systemEmailTemplates],
    [customEmailTemplates, systemEmailTemplates],
  );

  useEffect(() => {
    void loadData();
  }, [eventId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [eventRes, customRes, systemRes, subRes] = await Promise.all([
        apiFetch(`/admin/events/${eventId}`),
        apiFetch(`/admin/events/${eventId}/email-templates`),
        apiFetch("/system/email-templates"),
        getMySubscription(),
      ]);

      const eventData = (await eventRes.json()) as EventOut;
      const customData = (await customRes.json()) as EmailTemplate[];
      const systemData = (await systemRes.json()) as EmailTemplate[];

      setEvent(eventData);
      setCustomEmailTemplates(customData || []);
      setSystemEmailTemplates(systemData || []);
      setSubscription(subRes);
      setFormData({
        name: eventData.name || "",
        event_description: eventData.event_description || "",
        event_banner_url: eventData.event_banner_url || "",
        visibility: eventData.visibility || (eventData.config?.visibility as FormState["visibility"]) || "private",
        registration_fields: Array.isArray(eventData.config?.registration_fields)
          ? eventData.config.registration_fields
          : [],
        auto_email_on_cert: Boolean(eventData.auto_email_on_cert),
        cert_email_template_id: eventData.cert_email_template_id || null,
      });
    } catch (e: any) {
      setError(e?.message || copy.loadingError);
    } finally {
      setLoading(false);
    }
  }

  function handleBannerSelect(file: File) {
    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setBannerPreview(event.target?.result as string);
    reader.readAsDataURL(file);
  }

  function addRegistrationField() {
    setFormData((current) => ({
      ...current,
      registration_fields: [...current.registration_fields, createRegistrationField()],
    }));
  }

  function updateRegistrationField(fieldId: string, patch: Partial<RegistrationField>) {
    setFormData((current) => ({
      ...current,
      registration_fields: current.registration_fields.map((field) =>
        field.id === fieldId ? { ...field, ...patch } : field,
      ),
    }));
  }

  function removeRegistrationField(fieldId: string) {
    setFormData((current) => ({
      ...current,
      registration_fields: current.registration_fields.filter((field) => field.id !== fieldId),
    }));
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      setError(copy.requiredName);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        event_description: formData.event_description.trim(),
        visibility: formData.visibility,
        registration_fields: formData.registration_fields.map((field) => ({
          id: field.id,
          label: field.label.trim(),
          type: field.type,
          required: Boolean(field.required),
          placeholder: field.placeholder?.trim() || null,
          helper_text: field.helper_text?.trim() || null,
          options: field.type === "select"
            ? (field.options || []).map((option) => option.trim()).filter(Boolean)
            : [],
        })).filter((field) => field.label),
      };

      if (hasGrowthPlan) {
        payload.auto_email_on_cert = formData.auto_email_on_cert;
        payload.cert_email_template_id = formData.cert_email_template_id;
      }

      await apiFetch(`/admin/events/${eventId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (bannerFile) {
        const uploadForm = new FormData();
        uploadForm.append("file", bannerFile);
        await apiFetch(`/admin/events/${eventId}/banner-upload`, {
          method: "POST",
          body: uploadForm,
        });
        setBannerFile(null);
        setBannerPreview(null);
      }

      setSuccess(copy.saveSuccess);
      toast.success(copy.saveSuccess);
      await loadData();
    } catch (e: any) {
      const message = e?.message || copy.saveError;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <EventAdminNav eventId={eventId} eventName={event?.name} active="settings" className="mb-2 flex flex-col gap-2" />

      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        icon={<Wand2 className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/events/${eventId}/editor`} className="btn-secondary">
              {copy.openEditor}
            </Link>
            <button onClick={handleSave} disabled={saving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? copy.saving : copy.save}
            </button>
          </div>
        }
      />

      {error && (
        <div className="error-banner">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      <div className="space-y-6">
          <section className="card p-6 sm:p-7">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-brand-50 p-3 text-brand-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-surface-900">{copy.basicTitle}</h2>
                <p className="mt-1 text-sm text-surface-500">{copy.basicBody}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="label">{copy.name}</label>
                <input
                  value={formData.name}
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  className="input-field"
                  placeholder={copy.namePlaceholder}
                />
              </div>
              <div>
                <label className="label">{copy.description}</label>
                <textarea
                  value={formData.event_description}
                  onChange={(event) => setFormData((current) => ({ ...current, event_description: event.target.value }))}
                  className="input-field min-h-32"
                  placeholder={copy.descriptionPlaceholder}
                />
              </div>
            </div>
          </section>

          <section className="card p-6 sm:p-7">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-surface-900">{copy.visibilityTitle}</h2>
                <p className="mt-1 text-sm text-surface-500">{copy.visibilityBody}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="label">{copy.visibilityLabel}</label>
                <select
                  value={formData.visibility}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      visibility: event.target.value as FormState["visibility"],
                    }))
                  }
                  className="input-field"
                >
                  {visibilityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-surface-400">{copy.visibilityHint}</p>
            </div>
          </section>

          <section className="card p-6 sm:p-7">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-surface-900">{copy.bannerTitle}</h2>
                <p className="mt-1 text-sm text-surface-500">{copy.bannerBody}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="overflow-hidden rounded-3xl border border-surface-200 bg-surface-50">
                {bannerPreview || formData.event_banner_url ? (
                  <img
                    src={bannerPreview || formData.event_banner_url}
                    alt={copy.bannerTitle}
                    className="h-52 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-52 items-center justify-center text-sm text-surface-400">{copy.noBanner}</div>
                )}
              </div>
              <label className="btn-secondary inline-flex cursor-pointer items-center gap-2 w-fit">
                <Upload className="h-4 w-4" />
                {copy.uploadBanner}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    if (event.target.files?.[0]) handleBannerSelect(event.target.files[0]);
                  }}
                />
              </label>
              <p className="text-xs text-surface-400">{copy.bannerHint}</p>
            </div>
          </section>

          <section className="card p-6 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-surface-900">{copy.registrationTitle}</h2>
                  <p className="mt-1 text-sm text-surface-500">{copy.registrationBody}</p>
                </div>
              </div>
              <button type="button" onClick={addRegistrationField} className="btn-secondary inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {copy.addField}
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {formData.registration_fields.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-surface-300 bg-surface-50 px-5 py-6 text-sm text-surface-500">
                  <p className="font-medium text-surface-700">{copy.emptyFields}</p>
                  <p className="mt-1">{copy.previewHint}</p>
                </div>
              ) : (
                formData.registration_fields.map((field, index) => (
                  <div key={field.id} className="rounded-3xl border border-surface-200 bg-surface-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-surface-900">
                        #{index + 1} {field.label || copy.fieldLabel}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeRegistrationField(field.id)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        {copy.removeField}
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="label">{copy.fieldLabel}</label>
                        <input
                          value={field.label}
                          onChange={(event) => updateRegistrationField(field.id, { label: event.target.value })}
                          className="input-field"
                          placeholder={copy.labelPlaceholder}
                        />
                      </div>
                      <div>
                        <label className="label">{copy.fieldType}</label>
                        <select
                          value={field.type}
                          onChange={(event) =>
                            updateRegistrationField(field.id, {
                              type: event.target.value as RegistrationField["type"],
                              options: event.target.value === "select" ? (field.options || [""]) : [],
                            })
                          }
                          className="input-field"
                        >
                          {fieldTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">{copy.fieldPlaceholder}</label>
                        <input
                          value={field.placeholder || ""}
                          onChange={(event) => updateRegistrationField(field.id, { placeholder: event.target.value })}
                          className="input-field"
                          placeholder={copy.fieldPlaceholder}
                        />
                      </div>
                      <div>
                        <label className="label">{copy.fieldHelper}</label>
                        <input
                          value={field.helper_text || ""}
                          onChange={(event) => updateRegistrationField(field.id, { helper_text: event.target.value })}
                          className="input-field"
                          placeholder={copy.helperPlaceholder}
                        />
                      </div>
                    </div>

                    {field.type === "select" && (
                      <div className="mt-4">
                        <label className="label">{copy.fieldOptions}</label>
                        <textarea
                          value={(field.options || []).join("\n")}
                          onChange={(event) =>
                            updateRegistrationField(field.id, {
                              options: event.target.value.split("\n"),
                            })
                          }
                          className="input-field min-h-28"
                          placeholder={copy.fieldOptionsHint}
                        />
                        <p className="mt-2 text-xs text-surface-400">{copy.fieldOptionsHint}</p>
                      </div>
                    )}

                    <label className="mt-4 inline-flex items-center gap-3 rounded-2xl border border-surface-200 bg-white px-4 py-3 text-sm font-medium text-surface-700">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(event) => updateRegistrationField(field.id, { required: event.target.checked })}
                        className="h-4 w-4 accent-brand-600"
                      />
                      {copy.requiredField}
                    </label>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="card p-6 sm:p-7">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                <Mail className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-surface-900">{copy.emailTitle}</h2>
                  {hasGrowthPlan && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      {subscription?.plan_id === "enterprise" ? copy.enterprise : copy.growth}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-surface-500">{copy.emailBody}</p>
              </div>
            </div>

            {!hasGrowthPlan ? (
              <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-900">{copy.upgradeTitle}</p>
                    <p className="mt-1 text-sm leading-6 text-amber-800">{copy.upgradeBody}</p>
                    <Link href="/pricing" className="mt-3 inline-flex text-sm font-semibold text-amber-700 hover:underline">
                      {copy.upgradeCta}
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                <label className="flex items-start gap-3 rounded-3xl border border-surface-200 bg-surface-50 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={formData.auto_email_on_cert}
                    onChange={(event) => setFormData((current) => ({ ...current, auto_email_on_cert: event.target.checked }))}
                    className="mt-1 h-4 w-4 accent-brand-600"
                  />
                  <div>
                    <p className="font-semibold text-surface-900">{copy.autoEmail}</p>
                    <p className="mt-1 text-sm text-surface-500">{copy.autoEmailHint}</p>
                  </div>
                </label>

                {formData.auto_email_on_cert && (
                  <div className="grid gap-3">
                    <label className="label">{copy.templateLabel}</label>
                    <select
                      value={formData.cert_email_template_id || ""}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          cert_email_template_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                      className="input-field"
                    >
                      <option value="">{copy.templatePlaceholder}</option>
                      {customEmailTemplates.length > 0 && (
                        <optgroup label={copy.customTemplates}>
                          {customEmailTemplates.map((template) => (
                            <option key={`custom-${template.id}`} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {systemEmailTemplates.length > 0 && (
                        <optgroup label={copy.systemTemplates}>
                          {systemEmailTemplates.map((template) => (
                            <option key={`system-${template.id}`} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>

                    {availableEmailTemplates.length === 0 && (
                      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {copy.noTemplates}
                      </p>
                    )}

                    {formData.cert_email_template_id && (
                      <div className="rounded-3xl border border-surface-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.active}</p>
                        <p className="mt-2 font-semibold text-surface-900">
                          {availableEmailTemplates.find((template) => template.id === formData.cert_email_template_id)?.name}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 text-sm font-semibold">
                      <Link href={`/admin/events/${eventId}/email-templates`} className="text-brand-600 hover:text-brand-700">
                        {copy.manageTemplates}
                      </Link>
                      <Link href={`/admin/events/${eventId}/bulk-emails`} className="text-surface-600 hover:text-surface-900">
                        {copy.manageCampaigns}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
      </div>
    </div>
  );
}
