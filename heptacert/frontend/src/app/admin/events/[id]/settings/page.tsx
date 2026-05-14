"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Save,
  Sparkles,
  Upload,
  Wand2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type,
  AlignLeft,
  Phone,
  Hash,
  Calendar,
  ExternalLink,
  FileSpreadsheet,
  List,
  FileUp,
  Eye,
  Info,
  Lightbulb,
  Settings,
  ShieldAlert,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { apiFetch, getMySubscription, listAdminEventComments, setToken, updateAdminEventComment, type RegistrationField, type SubscriptionInfo, type PublicEventComment } from "@/lib/api";
import EventAdminNav, { refreshEventAdminMeta } from "@/components/Admin/EventAdminNav";
import PageHeader from "@/components/Admin/PageHeader";
import RichTextEditor from "@/components/RichTextEditor";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/useToast";

type EventOut = {
  id: number;
  name: string;
  config?: {
    registration_fields?: RegistrationField[];
    registration_closed?: boolean;
    registration_quota?: number;
    registration_quota_enabled?: boolean;
    visibility?: "private" | "unlisted" | "public";
    [key: string]: unknown;
  };
  event_date?: string | null;
  event_description?: string;
  event_location?: string | null;
  event_banner_url?: string | null;
  registration_closed?: boolean;
  auto_email_on_cert?: boolean;
  cert_email_template_id?: number | null;
  visibility?: "private" | "unlisted" | "public";
  require_email_verification?: boolean;
  registration_quota?: number | null;
  registration_quota_enabled?: boolean;
  event_type?: EventType;
  certificate_enabled?: boolean;
  checkin_enabled?: boolean;
  ticketing_enabled?: boolean;
  registration_enabled?: boolean;
  raffles_enabled?: boolean;
  gamification_enabled?: boolean;
  requires_approval?: boolean;
};

type EmailTemplate = {
  id: number;
  name: string;
  subject_tr: string;
  subject_en: string;
  template_type: string;
  event_id?: number | null;
};

type EventSheetsStatus = {
  google_configured: boolean;
  google_connected: boolean;
  google_email?: string | null;
  spreadsheet_id?: string | null;
  spreadsheet_url?: string | null;
  sheet_name?: string | null;
  enabled: boolean;
  last_synced_at?: string | null;
  missing_scopes?: string[];
};

type FormState = {
  name: string;
  event_date: string;
  event_description: string;
  event_location: string;
  event_banner_url: string;
  registration_closed: boolean;
  visibility: "private" | "unlisted" | "public";
  registration_fields: RegistrationField[];
  require_email_verification: boolean;
  registration_quota_enabled: boolean;
  registration_quota: string;
  auto_email_on_cert: boolean;
  cert_email_template_id: number | null;
  event_type: EventType;
  certificate_enabled: boolean;
  checkin_enabled: boolean;
  ticketing_enabled: boolean;
  registration_enabled: boolean;
  raffles_enabled: boolean;
  gamification_enabled: boolean;
  requires_approval: boolean;
  organizer_privacy_notice_enabled: boolean;
  organizer_privacy_notice_text: string;
  show_cross_border_transfer_notice: boolean;
  require_cross_border_transfer_consent: boolean;
  data_controller_name: string;
  data_controller_contact_email: string;
  data_retention_note: string;
};

type EventType =
  | "certificate_event"
  | "seminar"
  | "workshop"
  | "conference"
  | "concert"
  | "training"
  | "club_event"
  | "online_event"
  | "custom";

const FIELD_TYPE_OPTIONS: Array<{ value: RegistrationField["type"]; tr: string; en: string; desc_tr?: string; desc_en?: string; icon?: any }> = [
  { value: "text", tr: "Kısa Metin", en: "Short Text", desc_tr: "Tek satır (isim, e-posta, vb.)", desc_en: "Single line (name, email, etc.)", icon: Type },
  { value: "textarea", tr: "Uzun Metin", en: "Long Text", desc_tr: "Çok satırlı alan", desc_en: "Multi-line text area", icon: AlignLeft },
  { value: "tel", tr: "Telefon", en: "Phone", desc_tr: "Telefon numarası", desc_en: "Phone number", icon: Phone },
  { value: "number", tr: "Sayı", en: "Number", desc_tr: "Sayısal değer", desc_en: "Numeric value", icon: Hash },
  { value: "date", tr: "Tarih", en: "Date", desc_tr: "Tarih seçici", desc_en: "Date picker", icon: Calendar },
  { value: "select", tr: "Çoktan Seçmeli", en: "Multiple Choice", desc_tr: "Açılır menü - tek veya birden fazla seçenek", desc_en: "Dropdown - single or multiple options", icon: List },
  { value: "file", tr: "Dosya Yükleme", en: "File Upload", desc_tr: "Katılımcılar dosya yükle", desc_en: "Participants upload files", icon: FileUp },
];

const VISIBILITY_OPTIONS = [
  { value: "private", tr: "Özel", en: "Private" },
  { value: "unlisted", tr: "Liste dışı", en: "Unlisted" },
  { value: "public", tr: "Herkese açık", en: "Public" },
] as const;

const EVENT_TYPE_OPTIONS: Array<{ value: EventType; tr: string; en: string }> = [
  { value: "certificate_event", tr: "Sertifika etkinliği", en: "Certificate event" },
  { value: "seminar", tr: "Seminer", en: "Seminar" },
  { value: "workshop", tr: "Workshop", en: "Workshop" },
  { value: "conference", tr: "Konferans", en: "Conference" },
  { value: "concert", tr: "Konser", en: "Concert" },
  { value: "training", tr: "Eğitim", en: "Training" },
  { value: "club_event", tr: "Kulüp etkinliği", en: "Club event" },
  { value: "online_event", tr: "Online etkinlik", en: "Online event" },
  { value: "custom", tr: "Özel", en: "Custom" },
];

function defaultsForEventType(eventType: EventType) {
  if (eventType === "concert" || eventType === "club_event") {
    return {
      certificate_enabled: false,
      checkin_enabled: true,
      ticketing_enabled: true,
      registration_enabled: true,
      raffles_enabled: false,
      gamification_enabled: false,
    };
  }
  if (eventType === "online_event") {
    return {
      certificate_enabled: false,
      checkin_enabled: false,
      ticketing_enabled: false,
      registration_enabled: true,
      raffles_enabled: false,
      gamification_enabled: false,
    };
  }
  if (eventType === "custom") {
    return {
      certificate_enabled: false,
      checkin_enabled: true,
      ticketing_enabled: false,
      registration_enabled: true,
      raffles_enabled: false,
      gamification_enabled: false,
    };
  }
  return {
    certificate_enabled: true,
    checkin_enabled: true,
    ticketing_enabled: false,
    registration_enabled: true,
    raffles_enabled: false,
    gamification_enabled: false,
  };
}

const SETTINGS_TABS = [
  { id: "general", label_tr: "Genel", label_en: "General", icon: FileText },
  { id: "registration", label_tr: "Kayıt Formu", label_en: "Registration Form", icon: ClipboardList },
  { id: "banner", label_tr: "Banner", label_en: "Banner", icon: ImageIcon },
  { id: "email", label_tr: "E-posta", label_en: "Email", icon: Mail },
  { id: "comments", label_tr: "Yorumlar", label_en: "Comments", icon: MessageSquare },
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
    selection_mode: "single",
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
        visibilityTitle: "Açık görünürlük",
        visibilityBody: "Bu ayar yalnızca açık etkinlik keşif ekranını etkiler. Mevcut kayıt bağlantıların ve organizatör akışın bozulmaz.",
        visibilityLabel: "Görünürlük modu",
        visibilityHint: "Özel etkinlikler listede görünmez. Liste dışı etkinlikler sadece doğrudan bağlantıyla açılır. Herkese açık etkinlikler keşif ekranında görünür.",
        registrationTitle: "Kayıt formu alanları",
        registrationBody: "Katılımcılardan toplamak istediğiniz ek bilgileri belirleyin. Bu alanlar açık kayıt sayfasında ad ve e-postanın altında görünür.",
        verificationTitle: "E-posta doğrulaması",
        verificationBody: "İstersen bu etkinlik için kayıt sonrası e-posta doğrulamasını zorunlu tutabilir, istemiyorsan tamamen kapatabilirsin.",
        registrationStatusTitle: "Kayıt durumu",
        registrationStatusBody: "Etkinlik bittiğinde veya kapasite dolduğunda kayıt sayfasını sistem üzerinden kapatabilirsiniz.",
        registrationToggle: "Yeni kayıtları kapat",
        registrationHint: "Kapalıysa yeni kişiler artık kaydolamaz; sadece siz kendiniz kişi ekleyebilirsiniz.",
        registrationQuotaLabel: "Kayıt kotası",
        registrationQuotaToggle: "Kayıt kotasını sınırla",
        registrationQuotaHint: "Belirli sayıda kişi kaydolduktan sonra otomatik kayıt sayfası kapatılır. Örn: 500 kişi dolduktan sonra kapatsın.",
        registrationQuotaPlaceholder: "Örn. 300",
        verificationToggle: "Katılımcılar kayıt olduktan sonra e-posta doğrulaması zorunlu olsun",
        verificationHint: "Kapalıysa: Katılımcı kayıt olur olmaz direkt aktif sayılır ve QR check-in akışında kullanılabilir. Açık ise: Check-in veya sertifika almadan önce e-postasını doğrulaması gerekir.",
        addField: "Alan ekle",
        emptyFields: "Henüz özel kayıt alanı eklenmedi.",
        fieldLabel: "Alan etiketi",
        fieldType: "Alan türü",
        fieldPlaceholder: "Placeholder",
        fieldHelper: "Yardım metni",
        fieldOptions: "Seçenekler",
        fieldOptionsHint: "Her satıra bir seçenek yazın.",
        requiredField: "Zorunlu alan",
        conditionalRequirement: "Koşullu zorunluluk",
        conditionalDependsOn: "Bağlı alan",
        conditionalValue: "Koşul değeri",
        conditionalValuePlaceholder: "Seçenek seçin",
        conditionalHint: "Bu alan, seçilen alandaki değer bu metinle aynıysa zorunlu olur.",
        removeField: "Alanı kaldır",
        labelPlaceholder: "Örn. T.C. Kimlik Numarası",
        helperPlaceholder: "Katılımcının ne girmesi gerektiğini açıklayın",
        previewHint: "Kayıt formunda bu alanlar verdiğiniz sıraya göre gösterilir.",
        name: "Etkinlik adı",
        namePlaceholder: "Örn. Hepta Summit 2026",
        date: "Etkinlik tarihi",
        datePlaceholder: "Etkinlik tarihini seçin",
        location: "Etkinlik konumu",
        locationPlaceholder: "Örn. İzmir Atatürk Kültür Merkezi",
        description: "Etkinlik açıklaması",
        descriptionPlaceholder: "Satır atlayabilir, kalın/italik yapabilir, font ve boyut değiştirebilirsin.",
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
        commentsTitle: "Yorum Moderasyonu",
        commentsSubtitle: "Açık etkinlik sayfasındaki yorumları tek yerden görün, raporlananları inceleyin ve görünürlüğü yönetin.",
        commentsEmpty: "Bu etkinlik için henüz yorum yok.",
        commentsReported: "Rapor",
        commentsHide: "Gizle",
        commentsPublish: "Yayına Al",
        commentsMember: "Üye",
        commentsUpdated: "Güncellendi",
        commentsFallback: "Yorumlar yüklenemedi.",
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
        verificationTitle: "Email verification",
        verificationBody: "You can require post-registration email verification for this event, or turn it off entirely when it adds unnecessary friction.",
        registrationStatusTitle: "Registration status",
        registrationStatusBody: "Close the registration flow from the system when the event is over or you no longer want new signups.",
        registrationToggle: "Close new registrations",
        registrationHint: "When enabled, the public registration endpoint rejects new attendees.",
        registrationQuotaLabel: "Registration quota",
        registrationQuotaToggle: "Enable registration quota",
        registrationQuotaHint: "Leave empty for unlimited. Registration auto-closes when quota is reached.",
        registrationQuotaPlaceholder: "e.g. 300",
        verificationToggle: "Require email verification after registration",
        verificationHint: "When off, attendees become active immediately and check-in or raffle flows do not wait for email confirmation.",
        addField: "Add field",
        emptyFields: "No custom registration field has been added yet.",
        fieldLabel: "Field label",
        fieldType: "Field type",
        fieldPlaceholder: "Placeholder",
        fieldHelper: "Helper text",
        fieldOptions: "Options",
        fieldOptionsHint: "Write one option per line.",
        requiredField: "Required field",
        conditionalRequirement: "Conditional requirement",
        conditionalDependsOn: "Depends on field",
        conditionalValue: "Condition value",
        conditionalValuePlaceholder: "Select an option",
        conditionalHint: "This field becomes required when the selected field exactly matches this value.",
        removeField: "Remove field",
        labelPlaceholder: "e.g. National ID Number",
        helperPlaceholder: "Explain what the attendee should enter",
        previewHint: "These fields appear on the public registration form in the same order.",
        name: "Event name",
        namePlaceholder: "e.g. Hepta Summit 2026",
        date: "Event date",
        datePlaceholder: "Select the event date",
        location: "Event location",
        locationPlaceholder: "e.g. Izmir Ataturk Cultural Center",
        description: "Event description",
        descriptionPlaceholder: "Use line breaks, bold text, font choices, and size changes as needed.",
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
        commentsTitle: "Comment Moderation",
        commentsSubtitle: "Review public event comments, inspect reports, and control visibility from one place.",
        commentsEmpty: "There are no comments for this event yet.",
        commentsReported: "Reports",
        commentsHide: "Hide",
        commentsPublish: "Publish",
        commentsMember: "Member",
        commentsUpdated: "Updated",
        commentsFallback: "Failed to load comments.",
      };

  const [event, setEvent] = useState<EventOut | null>(null);
  const [customEmailTemplates, setCustomEmailTemplates] = useState<EmailTemplate[]>([]);
  const [systemEmailTemplates, setSystemEmailTemplates] = useState<EmailTemplate[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [formData, setFormData] = useState<FormState>({
    name: "",
    event_date: "",
    event_description: "",
    event_location: "",
    event_banner_url: "",
    registration_closed: false,
    visibility: "private",
    registration_fields: [],
    require_email_verification: true,
    registration_quota_enabled: false,
    registration_quota: "",
    auto_email_on_cert: false,
    cert_email_template_id: null,
    event_type: "certificate_event",
    certificate_enabled: true,
    checkin_enabled: true,
    ticketing_enabled: false,
    registration_enabled: true,
    raffles_enabled: false,
    gamification_enabled: false,
    requires_approval: false,
    organizer_privacy_notice_enabled: false,
    organizer_privacy_notice_text: "",
    show_cross_border_transfer_notice: true,
    require_cross_border_transfer_consent: true,
    data_controller_name: "",
    data_controller_contact_email: "",
    data_retention_note: "",
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "registration" | "banner" | "email" | "comments">("general");
  const [comments, setComments] = useState<PublicEventComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsSavingId, setCommentsSavingId] = useState<number | null>(null);
  const [sheetsStatus, setSheetsStatus] = useState<EventSheetsStatus | null>(null);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsAction, setSheetsAction] = useState<"auth" | "connect" | "sync" | "disconnect" | null>(null);
  const [authBridgeReady, setAuthBridgeReady] = useState(false);

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
    const bridgeToken =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("admin_token")
        : null;
    if (bridgeToken) {
      setToken(bridgeToken);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("admin_token");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
    }
    setAuthBridgeReady(true);
  }, []);

  useEffect(() => {
    if (!authBridgeReady) return;
    void loadData();
  }, [eventId, authBridgeReady]);

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
      void loadSheetsStatus();
      setFormData({
        name: eventData.name || "",
        event_date: eventData.event_date || "",
        event_description: eventData.event_description || "",
        event_location: eventData.event_location || "",
        event_banner_url: eventData.event_banner_url || "",
        registration_closed: Boolean(eventData.registration_closed ?? eventData.config?.registration_closed),
        registration_quota_enabled: Boolean(
          eventData.registration_quota_enabled
            ?? eventData.config?.registration_quota_enabled
            ?? ((eventData.registration_quota ?? eventData.config?.registration_quota) != null)
        ),
        registration_quota:
          (eventData.registration_quota ?? eventData.config?.registration_quota) != null
            ? String(eventData.registration_quota ?? eventData.config?.registration_quota)
            : "",
        visibility: eventData.visibility || (eventData.config?.visibility as FormState["visibility"]) || "private",
        registration_fields: Array.isArray(eventData.config?.registration_fields)
          ? eventData.config.registration_fields.map((field) => ({
              ...field,
              selection_mode:
                field.type === "select"
                  ? (field.selection_mode === "multiple" ? "multiple" : "single")
                  : undefined,
              options: Array.isArray(field.options)
                ? field.options.map((opt: any) =>
                    typeof opt === "string" ? { label: opt, capacity: null } : { label: opt.label || String(opt), capacity: opt.capacity ?? null }
                  )
                : [],
            }))
          : [],
        require_email_verification: eventData.require_email_verification ?? true,
        auto_email_on_cert: Boolean(eventData.auto_email_on_cert),
        cert_email_template_id: eventData.cert_email_template_id || null,
        event_type: eventData.event_type || "certificate_event",
        certificate_enabled: eventData.certificate_enabled ?? true,
        checkin_enabled: eventData.checkin_enabled ?? true,
        ticketing_enabled: eventData.ticketing_enabled ?? false,
        registration_enabled: eventData.registration_enabled ?? true,
        raffles_enabled: eventData.raffles_enabled ?? false,
        gamification_enabled: eventData.gamification_enabled ?? false,
        requires_approval: eventData.requires_approval ?? false,
        organizer_privacy_notice_enabled: Boolean(eventData.config?.organizer_privacy_notice_enabled),
        organizer_privacy_notice_text: String(eventData.config?.organizer_privacy_notice_text || ""),
        show_cross_border_transfer_notice: true,
        require_cross_border_transfer_consent: true,
        data_controller_name: String(eventData.config?.data_controller_name || ""),
        data_controller_contact_email: String(eventData.config?.data_controller_contact_email || ""),
        data_retention_note: String(eventData.config?.data_retention_note || ""),
      });
    } catch (e: any) {
      setError(e?.message || copy.loadingError);
    } finally {
      setLoading(false);
    }
  }

  async function loadSheetsStatus() {
    if (!eventId) return;
    setSheetsLoading(true);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/sheets`);
      setSheetsStatus(await res.json());
    } catch {
      setSheetsStatus(null);
    } finally {
      setSheetsLoading(false);
    }
  }

  async function handleConnectGoogleSheetsAuth() {
    setSheetsAction("auth");
    setError(null);
    try {
      const frontendOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const params = new URLSearchParams({
        next: `/admin/events/${eventId}/settings`,
        frontend_origin: frontendOrigin,
        event_id: String(eventId),
      });
      const res = await apiFetch(`/admin/google/sheets/start?${params.toString()}`);
      const data = await res.json();
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error(lang === "tr" ? "Google yetkilendirme adresi alınamadı." : "Could not get Google authorization URL.");
      }
    } catch (err: any) {
      const message = err?.message || (lang === "tr" ? "Google Sheets bağlantısı başlatılamadı." : "Google Sheets connection could not be started.");
      setError(message);
      toast.error(message);
    } finally {
      setSheetsAction(null);
    }
  }

  async function handleCreateGoogleSheet() {
    setSheetsAction("connect");
    setError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/sheets/connect`, { method: "POST" });
      setSheetsStatus(await res.json());
      toast.success(lang === "tr" ? "Google Sheet oluşturuldu ve kayıtlar aktarıldı." : "Google Sheet created and registrations synced.");
    } catch (err: any) {
      const message = err?.message || (lang === "tr" ? "Google Sheet oluşturulamadı." : "Google Sheet could not be created.");
      setError(message);
      toast.error(message);
    } finally {
      setSheetsAction(null);
    }
  }

  async function handleSyncGoogleSheet() {
    setSheetsAction("sync");
    setError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/sheets/sync`, { method: "POST" });
      setSheetsStatus(await res.json());
      toast.success(lang === "tr" ? "Google Sheet güncellendi." : "Google Sheet synced.");
    } catch (err: any) {
      const message = err?.message || (lang === "tr" ? "Google Sheet güncellenemedi." : "Google Sheet could not be synced.");
      setError(message);
      toast.error(message);
    } finally {
      setSheetsAction(null);
    }
  }

  async function handleDisconnectGoogleSheet() {
    setSheetsAction("disconnect");
    setError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/sheets`, { method: "DELETE" });
      setSheetsStatus(await res.json());
      toast.success(lang === "tr" ? "Google Sheet bağlantısı kapatıldı." : "Google Sheet connection disabled.");
    } catch (err: any) {
      const message = err?.message || (lang === "tr" ? "Bağlantı kapatılamadı." : "Connection could not be disabled.");
      setError(message);
      toast.error(message);
    } finally {
      setSheetsAction(null);
    }
  }

  useEffect(() => {
    if (activeTab !== "comments") return;

    let active = true;
    setCommentsLoading(true);
    setError(null);

    listAdminEventComments(Number(eventId))
      .then((commentData) => {
        if (!active) return;
        setComments(commentData);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || copy.commentsFallback);
      })
      .finally(() => {
        if (active) setCommentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTab, eventId, copy.commentsFallback]);

  function handleBannerSelect(file: File) {
    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setBannerPreview(event.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCommentStatusChange(commentId: number, status: "visible" | "hidden" | "reported") {
    setCommentsSavingId(commentId);
    setError(null);
    try {
      const updated = await updateAdminEventComment(Number(eventId), commentId, status);
      setComments((current) => current.map((comment) => (comment.id === commentId ? updated : comment)));
    } catch (err: any) {
      setError(err?.message || copy.commentsFallback);
    } finally {
      setCommentsSavingId(null);
    }
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

  function moveRegistrationField(fieldId: string, direction: "up" | "down") {
    setFormData((current) => {
      const fields = [...current.registration_fields];
      const index = fields.findIndex((f) => f.id === fieldId);
      if (index === -1) return current;
      if (direction === "up" && index > 0) {
        [fields[index], fields[index - 1]] = [fields[index - 1], fields[index]];
      } else if (direction === "down" && index < fields.length - 1) {
        [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
      }
      return { ...current, registration_fields: fields };
    });
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
        event_date: formData.event_date || null,
        event_description: formData.event_description.trim(),
        event_location: formData.event_location.trim(),
        registration_closed: formData.registration_closed,
        visibility: formData.visibility,
        registration_fields: formData.registration_fields.map((field) => ({
          id: field.id,
          label: field.label.trim(),
          type: field.type,
          required: Boolean(field.required),
          required_when_field_id: field.required_when_field_id?.trim() || null,
          required_when_equals: field.required_when_equals?.trim() || null,
          placeholder: field.placeholder?.trim() || null,
          helper_text: field.helper_text?.trim() || null,
          selection_mode:
            field.type === "select"
              ? (field.selection_mode === "multiple" ? "multiple" : "single")
              : null,
          options: field.type === "select"
            ? (field.options || []).map((option: any) =>
                typeof option === "string" ? { label: option.trim() } : { label: (option.label || "").trim(), capacity: option.capacity ?? null }
              ).filter((o: any) => o.label)
            : [],
        })).filter((field) => field.label),
        require_email_verification: formData.require_email_verification,
        registration_quota_enabled: formData.registration_quota_enabled,
        registration_quota: formData.registration_quota_enabled && formData.registration_quota.trim()
          ? Number(formData.registration_quota)
          : null,
        event_type: formData.event_type,
        certificate_enabled: formData.certificate_enabled,
        checkin_enabled: formData.checkin_enabled,
        ticketing_enabled: formData.ticketing_enabled,
        registration_enabled: formData.registration_enabled,
        raffles_enabled: formData.raffles_enabled,
        gamification_enabled: formData.gamification_enabled,
        requires_approval: formData.requires_approval,
        organizer_privacy_notice_enabled: formData.organizer_privacy_notice_enabled,
        organizer_privacy_notice_text: formData.organizer_privacy_notice_text.trim() || null,
        show_cross_border_transfer_notice: true,
        require_cross_border_transfer_consent: true,
        data_controller_name: formData.data_controller_name.trim() || null,
        data_controller_contact_email: formData.data_controller_contact_email.trim() || null,
        data_retention_note: formData.data_retention_note.trim() || null,
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
      refreshEventAdminMeta(eventId);
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
        <div className="success-banner items-center">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Sticky Tab Bar */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-surface-200 bg-white/90 px-4 py-2 backdrop-blur">
        <div className="scrollbar-polished flex gap-1 overflow-x-auto rounded-lg border border-surface-200 bg-surface-50 p-1">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const label = lang === "tr" ? tab.label_tr : tab.label_en;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "border-brand-200 bg-white text-brand-700 shadow-soft"
                    : "border-transparent text-surface-600 hover:bg-white hover:text-surface-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-6">
        {/* ===== GENERAL TAB ===== */}
        {activeTab === "general" && (
          <>
            {/* Temel Bilgiler */}
            <section className="card p-6 sm:p-7">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-brand-50 p-3 text-brand-600">
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
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label">{copy.date}</label>
                    <input
                      type="date"
                      value={formData.event_date}
                      onChange={(event) => setFormData((current) => ({ ...current, event_date: event.target.value }))}
                      className="input-field"
                      placeholder={copy.datePlaceholder}
                    />
                  </div>
                  <div>
                    <label className="label">{copy.location}</label>
                    <input
                      value={formData.event_location}
                      onChange={(event) => setFormData((current) => ({ ...current, event_location: event.target.value }))}
                      className="input-field"
                      placeholder={copy.locationPlaceholder}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">{copy.description}</label>
                  <RichTextEditor
                    value={formData.event_description}
                    onChange={(value) => setFormData((current) => ({ ...current, event_description: value }))}
                    placeholder={copy.descriptionPlaceholder}
                  />
                </div>
              </div>
            </section>

            {/* Event Type & Features */}
            <section className="card p-6 sm:p-7">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-violet-50 p-3 text-violet-600">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-surface-900">
                    {lang === "tr" ? "Etkinlik tipi ve özellikler" : "Event type and features"}
                  </h2>
                  <p className="mt-1 text-sm text-surface-500">
                    {lang === "tr"
                      ? "Sertifika, check-in, biletleme, çekiliş, oyunlaştırma ve herkese açık kayıt davranışını etkinlik bazında seçin."
                      : "Choose certificate, check-in, ticketing, raffle, gamification, and public registration behavior per event."}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="label">{lang === "tr" ? "Etkinlik tipi" : "Event type"}</label>
                  <select
                    value={formData.event_type}
                    onChange={(event) =>
                      setFormData((current) => {
                        const nextEventType = event.target.value as EventType;
                        return {
                          ...current,
                          event_type: nextEventType,
                          ...defaultsForEventType(nextEventType),
                        };
                      })
                    }
                    className="input-field"
                  >
                    {EVENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {lang === "tr" ? option.tr : option.en}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    {
                      key: "certificate_enabled",
                      label: lang === "tr" ? "Sertifika modu aktif" : "Certificate mode enabled",
                      hint: lang === "tr"
                        ? "Kapalıysa: Katılımcılar sertifika alamaz, yönetici de sertifika üretemez ve gösteremez."
                        : "When off: Participants cannot receive certificates, and admins cannot issue or manage them.",
                    },
                    {
                      key: "checkin_enabled",
                      label: lang === "tr" ? "QR check-in aktif" : "QR check-in enabled",
                      hint: lang === "tr"
                        ? "Kapalıysa: QR taraması ve kapıda giriş kontrolü devre dışı kalır. Katılımcıları kaydedemezsiniz."
                        : "When off: QR scanning and entry check-in are disabled. You cannot record who attended.",
                    },
                    {
                      key: "ticketing_enabled",
                      label: lang === "tr" ? "Bilet / giriş kartı modu aktif" : "Ticket/pass mode enabled",
                      hint: lang === "tr"
                        ? "Açık ise kayıt olan katılımcılar için QR tabanlı dijital bilet oluşturulur."
                        : "When on, registered attendees receive a QR-based digital ticket.",
                    },
                    {
                      key: "raffles_enabled",
                      label: lang === "tr" ? "Çekiliş modu aktif" : "Raffle mode enabled",
                      hint: lang === "tr"
                        ? "Açık ise çekiliş ekranı görünür. Check-in/oturum kapalıysa çekiliş ekranı gizlenir."
                        : "When on, raffle screens are visible. They stay hidden if check-in/sessions are off.",
                    },
                    {
                      key: "gamification_enabled",
                      label: lang === "tr" ? "Oyunlaştırma modu aktif" : "Gamification mode enabled",
                      hint: lang === "tr"
                        ? "Açık ise rozet ve oyunlaştırma ekranı görünür. Check-in/oturum kapalıysa gizlenir."
                        : "When on, badge and gamification screens are visible. They stay hidden if check-in/sessions are off.",
                    },
                    {
                      key: "registration_enabled",
                      label: lang === "tr" ? "Herkese açık kayıt aktif" : "Public registration enabled",
                      hint: lang === "tr"
                        ? "Kapalıysa: Dış kişiler (linkten bulan insanlar) kayıt olamaz. Sadece siz kendiniz veya toplu yükleme ile kişi ekleyebilirsiniz."
                        : "When off: People cannot self-register from the link. You must manually add or bulk-import attendees.",
                    },
                    {
                      key: "requires_approval",
                      label: lang === "tr" ? "Kayıtlar onay gerektirsin" : "Registrations require approval",
                      hint: lang === "tr"
                        ? "Açık ise: Katılımcı kaydı siz onaylayıncaya kadar bekleme durumunda kalır. Kapalı ise: Katılımcı kayıt olunca otomatik aktif olur."
                        : "When on: Registrations are inactive until you manually approve them.",
                    },
                  ].map((feature) => (
                    <label key={feature.key} className="flex items-start gap-3 rounded-lg border border-surface-200 bg-surface-50 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={Boolean(formData[feature.key as keyof FormState])}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            [feature.key]: event.target.checked,
                          }))
                        }
                        className="mt-1 h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                      />
                      <div>
                        <p className="text-sm font-semibold text-surface-900">{feature.label}</p>
                        <p className="mt-1 text-xs text-surface-500">{feature.hint}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </section>

            {/* Visibility */}
            <section className="card p-6 sm:p-7">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600">
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

            {/* Registration Status */}
            <section className="card p-6 sm:p-7">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-rose-50 p-3 text-rose-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-surface-900">{copy.registrationStatusTitle}</h2>
                  <p className="mt-1 text-sm text-surface-500">{copy.registrationStatusBody}</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <label className="flex items-start gap-3 rounded-lg border border-surface-200 bg-surface-50 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={formData.registration_closed}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        registration_closed: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-surface-900">{copy.registrationToggle}</p>
                    <p className="mt-1 text-xs text-surface-500">{copy.registrationHint}</p>
                  </div>
                </label>
                <div>
                  <label className="mb-3 flex items-start gap-3 rounded-lg border border-surface-200 bg-surface-50 px-4 py-4">
                    <input
                      type="checkbox"
                      checked={formData.registration_quota_enabled}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          registration_quota_enabled: event.target.checked,
                        }))
                      }
                      className="mt-1 h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div>
                      <p className="text-sm font-semibold text-surface-900">{copy.registrationQuotaToggle}</p>
                      <p className="mt-1 text-xs text-surface-500">{copy.registrationQuotaHint}</p>
                    </div>
                  </label>
                  <label className="label">{copy.registrationQuotaLabel}</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={formData.registration_quota}
                    disabled={!formData.registration_quota_enabled}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        registration_quota: event.target.value,
                      }))
                    }
                    className="input-field"
                    placeholder={copy.registrationQuotaPlaceholder}
                  />
                  {!formData.registration_quota_enabled && (
                    <p className="mt-1 text-xs text-surface-500">
                      {lang === "tr" ? "Kota kapalıyken kayıt sınırsız devam eder." : "When quota is off, registration remains unlimited."}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Email Verification */}
            <section className="card p-6 sm:p-7">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-amber-50 p-3 text-amber-600">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-surface-900">{copy.verificationTitle}</h2>
                  <p className="mt-1 text-sm text-surface-500">{copy.verificationBody}</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <label className="flex items-start gap-3 rounded-lg border border-surface-200 bg-surface-50 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={formData.require_email_verification}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        require_email_verification: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-surface-900">{copy.verificationToggle}</p>
                    <p className="mt-1 text-xs text-surface-500">{copy.verificationHint}</p>
                  </div>
                </label>
              </div>
            </section>

            <section className="card p-6 sm:p-7">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-sky-50 p-3 text-sky-600">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-surface-900">{lang === "tr" ? "KVKK ve Veri İşleme" : "Privacy and Data Processing"}</h2>
                  <p className="mt-1 text-sm text-surface-500">
                    {lang === "tr"
                      ? "Etkinliğe özel aydınlatma metni, organizatör sorumluluğu ve yurt dışı altyapı bilgilendirmesini burada tanımlayabilirsiniz."
                      : "Define the event-specific notice, organizer responsibility wording, and cross-border transfer information here."}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <label className="flex items-start gap-3 rounded-lg border border-surface-200 bg-surface-50 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={formData.organizer_privacy_notice_enabled}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        organizer_privacy_notice_enabled: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-surface-900">
                      {lang === "tr" ? "Organizatör aydınlatma metni aktif" : "Organizer notice enabled"}
                    </p>
                    <p className="mt-1 text-xs text-surface-500">
                      {lang === "tr"
                        ? "Açık olursa kayıt formunda organizatöre ait ayrı bir KVKK metni gösterilir ve onay istenir."
                        : "When enabled, a separate organizer-specific notice is shown in registration and requires acknowledgement."}
                    </p>
                  </div>
                </label>

                <div>
                  <label className="label">{lang === "tr" ? "Organizatör KVKK metni" : "Organizer privacy notice"}</label>
                  <RichTextEditor
                    value={formData.organizer_privacy_notice_text}
                    onChange={(value) => setFormData((current) => ({ ...current, organizer_privacy_notice_text: value }))}
                    placeholder={lang === "tr"
                      ? "Etkinliğe özel aydınlatma metnini burada yazın."
                      : "Write the event-specific privacy notice here."}
                  />
                  <p className="mt-1 text-xs text-surface-500">
                    {lang === "tr"
                      ? "Örnek: TC kimlik no, pasaport no, doğum tarihi gibi alanların neden toplandığı ve saklama süresi burada açıklanabilir."
                      : "Example: explain why fields like national ID, passport number, or date of birth are collected and how long they are kept."}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label">{lang === "tr" ? "Veri sorumlusu adı" : "Data controller name"}</label>
                    <input
                      value={formData.data_controller_name}
                      onChange={(event) => setFormData((current) => ({ ...current, data_controller_name: event.target.value }))}
                      className="input-field"
                      placeholder={lang === "tr" ? "Örn. ABC Derneği" : "e.g. ABC Association"}
                    />
                  </div>
                  <div>
                    <label className="label">{lang === "tr" ? "İletişim e-postası" : "Contact email"}</label>
                    <input
                      type="email"
                      value={formData.data_controller_contact_email}
                      onChange={(event) => setFormData((current) => ({ ...current, data_controller_contact_email: event.target.value }))}
                      className="input-field"
                      placeholder={lang === "tr" ? "kvkk@ornek.org" : "privacy@example.org"}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{lang === "tr" ? "Saklama notu" : "Retention note"}</label>
                  <textarea
                    value={formData.data_retention_note}
                    onChange={(event) => setFormData((current) => ({ ...current, data_retention_note: event.target.value }))}
                    className="input-field min-h-28"
                    placeholder={lang === "tr" ? "Örn. Etkinlik bitiminden sonra 90 gün saklanır." : "e.g. Kept for 90 days after the event ends."}
                  />
                  <p className="mt-1 text-xs text-surface-500">
                    {lang === "tr"
                      ? "Bu not sadece organizatörün etkinlik içi saklama politikasını açıklamak içindir."
                      : "This note is for explaining the organizer's event-specific retention policy."}
                  </p>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
                  <p className="text-sm font-semibold text-amber-900">
                    {lang === "tr" ? "Yurt dışı aktarım onayı sistem tarafından zorunlu tutulur" : "Cross-border transfer consent is required by the system"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    {lang === "tr"
                      ? "HeptaCert altyapısı yurt dışındaki barındırma, yedekleme, güvenlik ve teknik destek sağlayıcılarını kullanabildiği için bu bilgilendirme ve açık rıza kayıt akışına otomatik eklenir."
                      : "Because HeptaCert may use overseas providers for hosting, backup, security, and technical support, this notice and explicit consent are added to the registration flow automatically."}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ===== REGISTRATION TAB ===== */}
        {activeTab === "registration" && (
          <section className="card p-6 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-violet-50 p-3 text-violet-600">
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

            <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4 flex gap-3">
              <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">{lang === "tr" ? "Form oluşturma ipuçları:" : "Form building tips:"}</p>
                <ul className="text-xs space-y-1 text-blue-800">
                  <li>• {lang === "tr" ? "Alanları sürükleyerek sırasını değiştirebilirsiniz" : "Reorder fields using the up/down buttons"}</li>
                  <li>• {lang === "tr" ? "Koşullu zorunlu alanlar ekleyebilirsiniz" : "Add conditional requirements for smart forms"}</li>
                  <li>• {lang === "tr" ? "Her alan için yardımcı metin ekleyebilirsiniz" : "Add helper text to guide users"}</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-surface-200 bg-white p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-surface-900">
                      {lang === "tr" ? "Google Sheets otomasyonu" : "Google Sheets automation"}
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-surface-600">
                      {lang === "tr"
                        ? "Bu etkinlikteki kayıtlar Google E-Tablolar'a otomatik akar. Mevcut kayıtları tek seferde senkronlayabilir, yeni kayıtları da tabloya anlık ekletebilirsiniz."
                        : "Registrations for this event can flow into Google Sheets automatically. Existing attendees can be synced once, and new registrations are appended as they arrive."}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-surface-500">
                      {sheetsLoading ? (
                        <span className="inline-flex items-center gap-1">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {lang === "tr" ? "Durum kontrol ediliyor" : "Checking status"}
                        </span>
                      ) : sheetsStatus?.google_email ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                          {sheetsStatus.google_email}
                        </span>
                      ) : (
                        <span>{lang === "tr" ? "Google hesabı bağlı değil" : "No Google account connected"}</span>
                      )}
                      {sheetsStatus?.last_synced_at && (
                        <span>
                          {lang === "tr" ? "Son senkron: " : "Last sync: "}
                          {new Date(sheetsStatus.last_synced_at).toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}
                        </span>
                      )}
                      {Boolean(sheetsStatus?.missing_scopes?.length) && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                          {lang === "tr" ? "Sheets izni eksik" : "Sheets permission missing"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {!sheetsStatus?.google_configured ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                      {lang === "tr"
                        ? "Google OAuth ayarları .env içinde eksik."
                        : "Google OAuth settings are missing in .env."}
                    </div>
                  ) : !sheetsStatus?.google_connected ? (
                    <button
                      type="button"
                      onClick={handleConnectGoogleSheetsAuth}
                      disabled={Boolean(sheetsAction)}
                      className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                    >
                      {sheetsAction === "auth" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                      {sheetsStatus?.google_email
                        ? (lang === "tr" ? "Sheets iznini tamamla" : "Complete Sheets permission")
                        : (lang === "tr" ? "Google izni ver" : "Connect Google")}
                    </button>
                  ) : sheetsStatus.enabled && sheetsStatus.spreadsheet_url ? (
                    <>
                      <a
                        href={sheetsStatus.spreadsheet_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary inline-flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {lang === "tr" ? "Sheet'i aç" : "Open Sheet"}
                      </a>
                      <button
                        type="button"
                        onClick={handleSyncGoogleSheet}
                        disabled={Boolean(sheetsAction)}
                        className="btn-secondary inline-flex items-center gap-2 disabled:opacity-60"
                      >
                        {sheetsAction === "sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        {lang === "tr" ? "Senkronla" : "Sync"}
                      </button>
                      <button
                        type="button"
                        onClick={handleDisconnectGoogleSheet}
                        disabled={Boolean(sheetsAction)}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                      >
                        {sheetsAction === "disconnect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                        {lang === "tr" ? "Kapat" : "Disable"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCreateGoogleSheet}
                      disabled={Boolean(sheetsAction)}
                      className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                    >
                      {sheetsAction === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                      {lang === "tr" ? "Sheet oluştur ve bağla" : "Create and connect Sheet"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {formData.registration_fields.length === 0 ? (
                <div className="rounded-lg border border-dashed border-surface-300 bg-surface-50 px-5 py-6 text-sm text-surface-500">
                  <p className="font-medium text-surface-700">{copy.emptyFields}</p>
                  <p className="mt-1">{copy.previewHint}</p>
                </div>
              ) : (
                formData.registration_fields.map((field, index) => {
                  const conditionalSourceFields = formData.registration_fields.filter(
                    (candidate) => candidate.id !== field.id && candidate.type === "select",
                  );
                  const selectedConditionalSource = conditionalSourceFields.find(
                    (candidate) => candidate.id === field.required_when_field_id,
                  );
                  const conditionalValueOptions = (selectedConditionalSource?.options || [])
                    .map((option: any) => (typeof option === "string" ? option : option.label || String(option)))
                    .map((s: string) => s.trim())
                    .filter(Boolean);

                  return (
                    <div key={field.id} className="rounded-lg border border-surface-200 bg-white p-5 hover:shadow-md transition">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 pb-4 border-b border-surface-100">
                        <div className="flex items-start gap-3">
                          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700 flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-surface-900 truncate">
                              {field.label || `[${copy.fieldLabel}]`}
                            </p>
                            <p className="mt-1 text-xs text-surface-500">
                              {fieldTypeOptions.find(o => o.value === field.type)?.label}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => moveRegistrationField(field.id, "up")}
                            disabled={index === 0}
                            className="rounded-lg border border-surface-200 bg-white p-2 text-surface-600 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            title={lang === "tr" ? "Yukarı taşı" : "Move up"}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveRegistrationField(field.id, "down")}
                            disabled={index === formData.registration_fields.length - 1}
                            className="rounded-lg border border-surface-200 bg-white p-2 text-surface-600 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            title={lang === "tr" ? "Aşağı taşı" : "Move down"}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRegistrationField(field.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {copy.removeField}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <label className="label text-xs font-semibold text-surface-700">{copy.fieldLabel}</label>
                            <input
                              value={field.label}
                              onChange={(event) => updateRegistrationField(field.id, { label: event.target.value })}
                              className="input-field text-sm"
                              placeholder={copy.labelPlaceholder}
                              required
                            />
                          </div>
                          <div>
                            <label className="label text-xs font-semibold text-surface-700">{copy.fieldType}</label>
                            <select
                              value={field.type}
                              onChange={(event) =>
                                updateRegistrationField(field.id, {
                                  type: event.target.value as RegistrationField["type"],
                                  options: event.target.value === "select" ? (field.options || [""]) : [],
                                })
                              }
                              className="input-field text-sm"
                            >
                              {fieldTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-2 lg:col-span-2">
                            <label className="label text-xs font-semibold text-surface-700">{copy.fieldPlaceholder}</label>
                            <input
                              value={field.placeholder || ""}
                              onChange={(event) => updateRegistrationField(field.id, { placeholder: event.target.value })}
                              className="input-field text-sm"
                              placeholder={copy.fieldPlaceholder}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="label text-xs font-semibold text-surface-700">{copy.fieldHelper}</label>
                          <RichTextEditor
                            value={field.helper_text || ""}
                            onChange={(value) => updateRegistrationField(field.id, { helper_text: value })}
                            placeholder={copy.helperPlaceholder}
                          />
                        </div>

                        {field.type === "select" && (
                          <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                            <div>
                              <label className="label text-xs font-semibold text-surface-700 mb-2">{lang === "tr" ? "Seçim Türü" : "Selection Type"}</label>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateRegistrationField(field.id, { selection_mode: "single" })}
                                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                                    (field.selection_mode || "single") === "single"
                                      ? "bg-blue-600 text-white"
                                      : "bg-white border border-surface-300 text-surface-700 hover:bg-surface-100"
                                  }`}
                                >
                                  {lang === "tr" ? "Tek Seçim" : "Single Choice"}
                                </button>
                                <button
                                  onClick={() => updateRegistrationField(field.id, { selection_mode: "multiple" })}
                                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                                    field.selection_mode === "multiple"
                                      ? "bg-blue-600 text-white"
                                      : "bg-white border border-surface-300 text-surface-700 hover:bg-surface-100"
                                  }`}
                                >
                                  {lang === "tr" ? "Birden Fazla Seçim" : "Multiple Choices"}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="label text-xs font-semibold text-surface-700 mb-2">{copy.fieldOptions}</label>
                              <div className="space-y-2">
                                {(field.options || []).length > 0 && (
                                  <div className="flex flex-wrap gap-2 rounded-lg bg-surface-50 p-3">
                                    {(field.options || []).map((option: any, idx) => (
                                      <div key={idx} className="inline-flex items-center gap-2 rounded-full bg-white border border-surface-300 px-3 py-1.5 text-sm font-medium text-surface-700">
                                        <span>{typeof option === "string" ? option : option.label}</span>
                                        <span className="text-xs text-surface-400">{typeof option === "object" && option.capacity != null ? `· ${option.capacity} kişi` : ""}</span>
                                        <button
                                          onClick={() =>
                                            updateRegistrationField(field.id, {
                                              options: (field.options || []).filter((_, i) => i !== idx),
                                            })
                                          }
                                          className="text-surface-400 hover:text-rose-600 transition font-bold text-lg leading-none"
                                        >
                                          ×
                                        </button>
                                        <input
                                          type="number"
                                          min={1}
                                          step={1}
                                          placeholder="Kota"
                                          value={typeof option === "object" && option.capacity != null ? String(option.capacity) : ""}
                                          onChange={(e) => {
                                            const val = e.target.value.trim();
                                            updateRegistrationField(field.id, {
                                              options: (field.options || []).map((o: any, i: number) =>
                                                i === idx
                                                  ? { label: typeof o === "string" ? o : o.label, capacity: val ? Number(val) : null }
                                                  : o,
                                              ),
                                            });
                                          }}
                                          className="ml-2 w-20 input-field text-xs"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                <div className="flex gap-2 items-start">
                                  <input
                                    type="text"
                                    id={`option-input-${field.id}`}
                                    placeholder={lang === "tr" ? "Yeni seçenek..." : "New option..."}
                                    className="input-field flex-1 text-sm"
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            const input = e.currentTarget;
                                            const value = input.value.trim();
                                            const exists = (field.options || []).some((o: any) => (typeof o === "string" ? o === value : o.label === value));
                                            if (value && !exists) {
                                              updateRegistrationField(field.id, {
                                                options: [...(field.options || []), { label: value, capacity: null }],
                                              });
                                              input.value = "";
                                            }
                                          }
                                        }}
                                  />
                                  <button
                                    onClick={() => {
                                      const input = document.getElementById(`option-input-${field.id}`) as HTMLInputElement;
                                      if (input) {
                                        const value = input.value.trim();
                                        const exists = (field.options || []).some((o: any) => (typeof o === "string" ? o === value : o.label === value));
                                        if (value && !exists) {
                                          updateRegistrationField(field.id, {
                                            options: [...(field.options || []), { label: value, capacity: null }],
                                          });
                                          input.value = "";
                                        }
                                      }
                                    }}
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                                  >
                                    {lang === "tr" ? "Ekle" : "Add"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-4 pt-2">
                          <label className="inline-flex items-center gap-3 rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-sm font-medium text-surface-700 cursor-pointer hover:bg-surface-50 transition">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(event) => updateRegistrationField(field.id, { required: event.target.checked })}
                              className="h-4 w-4 accent-brand-600 cursor-pointer"
                            />
                            {copy.requiredField}
                          </label>
                        </div>

                        <details className="rounded-lg border border-surface-200 bg-surface-50 group">
                            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 font-semibold text-surface-900 text-sm">
                              <span className="flex items-center gap-2">
                                <Settings className="h-4 w-4 text-surface-600" />
                                {copy.conditionalRequirement}
                              </span>
                              <span className="text-xs text-surface-500 group-open:hidden">{lang === "tr" ? "İsteğe bağlı" : "Optional"}</span>
                            </summary>
                            <div className="border-t border-surface-200 px-4 py-3 space-y-3 text-sm">
                              <p className="text-xs text-surface-500">{copy.conditionalHint}</p>
                              <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                  <label className="label text-xs font-semibold text-surface-700">{copy.conditionalDependsOn}</label>
                                  <select
                                    value={field.required_when_field_id || ""}
                                    onChange={(event) => {
                                      const nextFieldId = event.target.value;
                                      updateRegistrationField(field.id, {
                                        required_when_field_id: nextFieldId || undefined,
                                        required_when_equals: nextFieldId
                                          ? (field.required_when_equals || "")
                                          : undefined,
                                      });
                                    }}
                                    className="input-field text-sm"
                                  >
                                    <option value="">{lang === "tr" ? "Yok" : "None"}</option>
                                    {conditionalSourceFields.map((candidate) => (
                                      <option key={candidate.id} value={candidate.id}>
                                        {candidate.label || candidate.id}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="label text-xs font-semibold text-surface-700">{copy.conditionalValue}</label>
                                  <select
                                    value={field.required_when_equals || ""}
                                    onChange={(event) =>
                                      updateRegistrationField(field.id, {
                                        required_when_equals: event.target.value,
                                      })
                                    }
                                    disabled={!field.required_when_field_id || !conditionalValueOptions.length}
                                    className="input-field text-sm"
                                  >
                                    <option value="">{copy.conditionalValuePlaceholder}</option>
                                    {conditionalValueOptions.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                        </details>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sticky footer bar for adding fields (visible when scrolled down) */}
            {formData.registration_fields.length > 0 && (
              <div className="sticky bottom-0 left-0 right-0 z-10 border-t border-surface-200 bg-white px-5 py-3 shadow-md flex items-center justify-between gap-3 sm:gap-4">
                <p className="text-xs sm:text-sm text-surface-600 font-medium">{formData.registration_fields.length} {lang === "tr" ? "alan eklendi" : "fields added"}</p>
                <button type="button" onClick={addRegistrationField} className="btn-secondary inline-flex items-center gap-2 whitespace-nowrap">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">{copy.addField}</span>
                  <span className="inline sm:hidden">{lang === "tr" ? "Ekle" : "Add"}</span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* ===== BANNER TAB ===== */}
        {activeTab === "banner" && (
          <section className="card p-6 sm:p-7">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-sky-50 p-3 text-sky-600">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-surface-900">{copy.bannerTitle}</h2>
                <p className="mt-1 text-sm text-surface-500">{copy.bannerBody}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="overflow-hidden rounded-lg border border-surface-200 bg-surface-50">
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
        )}

        {/* ===== EMAIL TAB ===== */}
        {activeTab === "email" && (
          <section className="card p-6 sm:p-7">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600">
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
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
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
                <label className="flex items-start gap-3 rounded-lg border border-surface-200 bg-surface-50 px-4 py-4">
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
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {copy.noTemplates}
                      </p>
                    )}

                    {formData.cert_email_template_id && (
                      <div className="rounded-lg border border-surface-200 bg-white p-4">
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
        )}

        {/* ===== COMMENTS TAB ===== */}
        {activeTab === "comments" && (
          <section className="card p-6 sm:p-7">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-surface-900">{copy.commentsTitle}</h2>
                <p className="mt-1 text-sm text-surface-500">{copy.commentsSubtitle}</p>
              </div>
            </div>

            {error && (
              <div className="mt-6 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 flex-none text-rose-600" />
                <p>{error}</p>
              </div>
            )}

            {commentsLoading ? (
              <div className="mt-10 flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
              </div>
            ) : comments.length === 0 ? (
              <div className="mt-6 rounded-lg border border-surface-200 bg-surface-50 py-12 text-center text-sm text-surface-500">
                {copy.commentsEmpty}
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {comments.map((comment) => {
                  const statusStyle =
                    comment.status === "visible"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : comment.status === "reported"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-slate-100 text-slate-700";

                  return (
                    <article key={comment.id} className="rounded-lg border border-surface-200 bg-white p-5 sm:p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-surface-900">{comment.member_name}</span>
                            <span className="text-xs text-surface-400">{comment.member_email}</span>
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle}`}>
                              {comment.status}
                            </span>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-surface-700">{comment.body}</p>
                          <div className="mt-4 flex flex-wrap gap-4 text-xs text-surface-400">
                            <span>{copy.commentsMember}: {comment.member_public_id}</span>
                            <span>{copy.commentsReported}: {comment.report_count}</span>
                            <span>{copy.commentsUpdated}: {new Date(comment.updated_at).toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                          <button
                            type="button"
                            onClick={() => void handleCommentStatusChange(comment.id, "visible")}
                            disabled={commentsSavingId === comment.id || comment.status === "visible"}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 lg:w-full"
                          >
                            {commentsSavingId === comment.id && <Loader2 className="h-4 w-4 animate-spin" />}
                            {copy.commentsPublish}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleCommentStatusChange(comment.id, "hidden")}
                            disabled={commentsSavingId === comment.id || comment.status === "hidden"}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 lg:w-full"
                          >
                            {commentsSavingId === comment.id && <Loader2 className="h-4 w-4 animate-spin" />}
                            {copy.commentsHide}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Floating Action Buttons - Bottom Center */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-3 items-center">
          {/* Add Field Button - Only on registration tab */}
          {activeTab === "registration" && (
            <button
              onClick={addRegistrationField}
              className="group relative flex items-center gap-2 rounded-full bg-violet-600 text-white px-6 py-3 font-semibold shadow-lg transition hover:bg-violet-700 hover:shadow-xl"
              title={copy.addField}
            >
              <Plus className="h-5 w-5" />
              <span>{copy.addField}</span>
            </button>
          )}

          {/* Save Button - Always visible */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="group relative flex items-center gap-2 rounded-full bg-brand-600 text-white px-6 py-3 font-semibold shadow-lg transition hover:bg-brand-700 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
            title={copy.save}
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            <span>{saving ? copy.saving : copy.save}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
