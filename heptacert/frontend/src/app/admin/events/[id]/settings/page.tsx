"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
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
  Building2,
  X,
} from "lucide-react";
import { 
  apiFetch, 
  API_BASE, 
  getToken, 
  consumeOAuthBridgeToken, 
  getMySubscription, 
  setToken, 
  updateAdminEventComment, 
  listAdminEventComments,
  type RegistrationField, 
  type SubscriptionInfo, 
  type PublicEventComment 
} from "@/lib/api";
import EventAdminNav, { refreshEventAdminMeta } from "@/components/Admin/EventAdminNav";
import PageHeader from "@/components/Admin/PageHeader";
import DateField from "@/components/Admin/DateField";
import DateTimeField from "@/components/Admin/DateTimeField";
import RichTextEditor from "@/components/RichTextEditor";
import { useI18n } from "@/lib/i18n";
import { PlanGateCard } from "@/lib/useSubscription";
import { useToast } from "@/hooks/useToast";
import useKeyboardShortcut from "@/hooks/useKeyboardShortcut";
import useUnsavedChanges from "@/hooks/useUnsavedChanges";

type EventOut = {
  id: number;
  name: string;
  config?: {
    registration_fields?: RegistrationField[];
    registration_closed?: boolean;
    registration_quota?: number;
    registration_quota_enabled?: boolean;
    visibility?: "private" | "unlisted" | "public";
    organizer_privacy_notice_enabled?: boolean;
    organizer_privacy_notice_text?: string;
    data_controller_name?: string;
    data_controller_contact_email?: string;
    data_retention_note?: string;
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
  organization_venue_id?: number | null;
  venue_reservation_id?: number | null;
  venue_reservation_start_at?: string | null;
  venue_reservation_end_at?: string | null;
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

type EventMicrosoftExcelStatus = {
  ms365_configured: boolean;
  ms365_connected: boolean;
  microsoft_email?: string | null;
  workbook_url?: string | null;
  workbook_name?: string | null;
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
  organization_venue_id: string;
  auto_reserve_venue: boolean;
  venue_reservation_start_at: string;
  venue_reservation_end_at: string;
};

type OrganizationVenue = {
  id: number;
  name: string;
  capacity?: number | null;
  location?: string | null;
  is_active: boolean;
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

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

export default function EventSettingsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const toast = useToast();
  const { lang } = useI18n();

  const copy = lang === "tr"
    ? {
        title: "Etkinlik Ayarları",
        subtitle: "Etkinlik bilgisini, sertifika görünümünü och otomatik e-posta akışını tek yerden yönetin.",
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
        registrationTitleMeta: "Kayıt formu",
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
        fieldPlaceholder: "Placeholder / Örnek metin",
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
        registrationTitleMeta: "Registration form",
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
        fieldPlaceholder: "Placeholder text",
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
  const [venues, setVenues] = useState<OrganizationVenue[]>([]);
  
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
    organization_venue_id: "",
    auto_reserve_venue: false,
    venue_reservation_start_at: "",
    venue_reservation_end_at: "",
  });
  
  const [savedFormSnapshot, setSavedFormSnapshot] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<"general" | "registration" | "banner" | "email" | "comments" >("general");
  const [comments, setComments] = useState<PublicEventComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsSavingId, setCommentsSavingId] = useState<number | null>(null);
  const [sheetsStatus, setSheetsStatus] = useState<EventSheetsStatus | null>(null);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsAction, setSheetsAction] = useState<"auth" | "connect" | "sync" | "disconnect" | null>(null);
  const [excelStatus, setExcelStatus] = useState<EventMicrosoftExcelStatus | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelAction, setExcelAction] = useState<"auth" | "connect" | "sync" | "disconnect" | null>(null);
  const [authBridgeReady, setAuthBridgeReady] = useState(false);

  const isDirty = savedFormSnapshot !== "" && JSON.stringify(formData) !== savedFormSnapshot;
  
  useUnsavedChanges(isDirty && !saving, lang === "tr" ? "Kaydedilmemiş etkinlik ayarları var." : "You have unsaved event settings.");
  useKeyboardShortcut("s", () => void handleSave(), { meta: true, enabled: !saving });

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
    let cancelled = false;
    const hasBridge = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("oauth_bridge") === "1";
    const finish = () => {
      if (!cancelled) setAuthBridgeReady(true);
    };
    if (!hasBridge) {
      finish();
      return () => { cancelled = true; };
    }
    void consumeOAuthBridgeToken()
      .then(({ access_token, mode }) => {
        if (cancelled || mode !== "admin") return;
        setToken(access_token);
        const url = new URL(window.location.href);
        url.searchParams.delete("oauth_bridge");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      })
      .finally(finish);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!authBridgeReady) return;
    void loadData();
  }, [eventId, authBridgeReady]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [eventRes, customRes, systemRes, subRes, venuesRes] = await Promise.all([
        apiFetch(`/admin/events/${eventId}`),
        apiFetch(`/admin/events/${eventId}/email-templates`),
        apiFetch("/system/email-templates"),
        getMySubscription(),
        apiFetch("/admin/organization/venues").catch(() => null),
      ]);

      const eventData = (await eventRes.json()) as EventOut;
      const customData = (await customRes.json()) as EmailTemplate[];
      const systemData = (await systemRes.json()) as EmailTemplate[];

      setEvent(eventData);
      setCustomEmailTemplates(customData || []);
      setSystemEmailTemplates(systemData || []);
      setSubscription(subRes);
      if (venuesRes) {
        const venueItems = (await venuesRes.json()) as OrganizationVenue[];
        setVenues((venueItems || []).filter((venue) => venue.is_active));
      } else {
        setVenues([]);
      }
      void loadSheetsStatus();
      void loadMicrosoftExcelStatus();

      const nextFormData: FormState = {
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
        organization_venue_id: eventData.organization_venue_id ? String(eventData.organization_venue_id) : "",
        auto_reserve_venue: Boolean(eventData.venue_reservation_id || eventData.organization_venue_id),
        venue_reservation_start_at: toDateTimeLocal(eventData.venue_reservation_start_at),
        venue_reservation_end_at: toDateTimeLocal(eventData.venue_reservation_end_at),
      };
      setFormData(nextFormData);
      setSavedFormSnapshot(JSON.stringify(nextFormData));
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

  async function loadMicrosoftExcelStatus() {
    if (!eventId) return;
    setExcelLoading(true);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/microsoft-excel`);
      setExcelStatus(await res.json());
    } catch {
      setExcelStatus(null);
    } finally {
      setExcelLoading(false);
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

  async function handleConnectMicrosoftExcelAuth() {
    setExcelAction("auth");
    setError(null);
    try {
      const frontendOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const params = new URLSearchParams({
        next: `/admin/events/${eventId}/settings`,
        frontend_origin: frontendOrigin,
        event_id: String(eventId),
      });
      const res = await apiFetch(`/admin/microsoft/excel/start?${params.toString()}`);
      const data = await res.json();
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error(lang === "tr" ? "Microsoft yetkilendirme adresi alınamadı." : "Could not get Microsoft authorization URL.");
      }
    } catch (err: any) {
      const message = err?.message || (lang === "tr" ? "Microsoft Excel bağlantısı başlatılamadı." : "Microsoft Excel connection could not be started.");
      setError(message);
      toast.error(message);
    } finally {
      setExcelAction(null);
    }
  }

  async function handleCreateMicrosoftExcel() {
    setExcelAction("connect");
    setError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/microsoft-excel/connect`, { method: "POST" });
      setExcelStatus(await res.json());
      toast.success(lang === "tr" ? "Microsoft Excel dosyası oluşturuldu ve kayıtlar aktarıldı." : "Microsoft Excel workbook created and registrations synced.");
    } catch (err: any) {
      const message = err?.message || (lang === "tr" ? "Microsoft Excel dosyası oluşturulamadı." : "Microsoft Excel workbook could not be created.");
      setError(message);
      toast.error(message);
    } finally {
      setExcelAction(null);
    }
  }

  async function handleSyncMicrosoftExcel() {
    setExcelAction("sync");
    setError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/microsoft-excel/sync`, { method: "POST" });
      setExcelStatus(await res.json());
      toast.success(lang === "tr" ? "Microsoft Excel dosyası güncellendi." : "Microsoft Excel workbook synced.");
    } catch (err: any) {
      const message = err?.message || (lang === "tr" ? "Microsoft Excel dosyası güncellenemedi." : "Microsoft Excel workbook could not be synced.");
      setError(message);
      toast.error(message);
    } finally {
      setExcelAction(null);
    }
  }

  async function handleDisconnectMicrosoftExcel() {
    setExcelAction("disconnect");
    setError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/microsoft-excel`, { method: "DELETE" });
      setExcelStatus(await res.json());
      toast.success(lang === "tr" ? "Microsoft Excel bağlantısı kapatıldı." : "Microsoft Excel connection disabled.");
    } catch (err: any) {
      const message = err?.message || (lang === "tr" ? "Bağlantı kapatılamadı." : "Connection could not be disabled.");
      setError(message);
      toast.error(message);
    } finally {
      setExcelAction(null);
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
        organization_venue_id: formData.organization_venue_id ? Number(formData.organization_venue_id) : null,
        auto_reserve_venue: Boolean(formData.auto_reserve_venue && formData.organization_venue_id),
        venue_reservation_start_at: formData.venue_reservation_start_at ? new Date(formData.venue_reservation_start_at).toISOString() : null,
        venue_reservation_end_at: formData.venue_reservation_end_at ? new Date(formData.venue_reservation_end_at).toISOString() : null,
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
      <div className="flex w-full min-h-[340px] items-center justify-center antialiased">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400 stroke-[2.5]" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-5 antialiased text-gray-900 pb-16">
      
      {/* ÜST ETKİNLİK NAVİGASYONU */}
      <EventAdminNav eventId={Number(eventId)} eventName={event?.name} active="settings" />

      {/* SAYFA BAŞLIĞI */}
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        icon={<Settings className="h-4 w-4 stroke-[2]" />}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/admin/events/${eventId}/editor`} className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50">
              {copy.openEditor}
            </Link>
            <button 
              onClick={handleSave} 
              disabled={saving} 
              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-gray-950 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-900 active:scale-95 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 stroke-[2.5]" />}
              <span>{saving ? copy.saving : copy.save}</span>
            </button>
          </div>
        }
      />

      {/* AI ASSISTANT PREFILL BANNERI */}
      {(event?.config as any)?.ai_assistant_populated_kvkk && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/20 p-4 flex items-start gap-3 animate-in fade-in duration-200">
          <ShieldAlert className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="space-y-2 flex-1 text-xs">
            <h4 className="font-bold text-amber-900 tracking-tight">Otomatik Eklenmiş KVKK / Gizlilik Öğeleri</h4>
            <p className="text-amber-800 leading-relaxed font-medium">AI Asistanı bu etkinlik için KVKK/gizlilik öğelerini otomatik ekledi. Lütfen gözden geçirip doğrulayın.</p>
            <button
              type="button"
              onClick={() => {
                if (!event) return;
                const cfg = (event.config as any) || {};
                setFormData((current) => ({
                  ...current,
                  organizer_privacy_notice_enabled: Boolean(cfg.organizer_privacy_notice_enabled ?? current.organizer_privacy_notice_enabled ?? false),
                  organizer_privacy_notice_text: String(cfg.organizer_privacy_notice_text ?? current.organizer_privacy_notice_text ?? ""),
                  show_cross_border_transfer_notice: Boolean(cfg.show_cross_border_transfer_notice ?? current.show_cross_border_transfer_notice ?? true),
                  require_cross_border_transfer_consent: Boolean(cfg.require_cross_border_transfer_consent ?? current.require_cross_border_transfer_consent ?? true),
                  data_controller_name: String(cfg.data_controller_name ?? current.data_controller_name ?? ""),
                  data_controller_contact_email: String(cfg.data_controller_contact_email ?? current.data_controller_contact_email ?? ""),
                  data_retention_note: String(cfg.data_retention_note ?? current.data_retention_note ?? ""),
                }));
                refreshEventAdminMeta(eventId);
                void loadData();
              }}
              className="inline-flex min-h-[30px] items-center justify-center rounded-lg bg-amber-600 px-3 font-bold text-white shadow-sm transition hover:bg-amber-700 active:scale-95"
            >
              Prefill Verileri İncele
            </button>
          </div>
        </div>
      )}

      {/* DURUM BİLGİLENDİRME ŞERİTLERİ */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50/40 p-4 text-xs font-semibold text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {window.navigator.onLine && success && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 text-xs font-semibold text-emerald-600 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* APPLE SEGMENTED CONTROL TASARIMINDA SABİTLENMİŞ SEKME ÇUBUĞU */}
      <div className="overflow-x-auto scrollbar-none">
        <div className="flex min-w-max gap-1 border border-gray-200/80 bg-gray-50/60 p-1 rounded-xl lg:min-w-0">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const label = lang === "tr" ? tab.label_tr : tab.label_en;
            const isAct = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold tracking-tight transition-all ${
                  isAct
                    ? "bg-white text-gray-950 shadow-sm border border-gray-200/60"
                    : "border border-transparent text-gray-500 hover:text-gray-900 hover:bg-white/40"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isAct ? "text-gray-950 stroke-[2]" : "text-gray-400 stroke-[1.8]"}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DEĞİŞİKLİK VE KAYDETME YÜZEY UYARI ÇUBUĞU */}
      {isDirty && !saving && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-3 text-center text-[11px] font-bold text-amber-700 tracking-tight animate-in fade-in duration-150">
          ⚠️ {lang === "tr" ? "Kaydedilmemiş değişiklikleriniz bulunuyor. Değişiklikleri doğrulamak için Ctrl/⌘ + S kısayolunu kullanabilirsiniz." : "You have unsaved changes. Use Ctrl/⌘ + S to sync and verify configurations."}
        </div>
      )}

      {/* 5. AKTİF SEKME AYAR KAPSÜLLERİ GÖVDESİ */}
      <div className="space-y-4">
        
        {/* TAB 1: GENEL AYARLAR VE SALON REZERVASYON Katmanı */}
        {activeTab === "general" && (
          <div className="space-y-4 w-full">
            {/* Blok A: Temel Bilgiler Formu */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                <FileText className="h-4 w-4 text-gray-800 stroke-[1.8]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-950">{copy.basicTitle}</h2>
              </div>
              
              <div className="grid gap-4">
                <label className="block w-full">
                  <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.name}</span>
                  <input value={formData.name} onChange={(e) => setFormData((curr) => ({ ...curr, name: e.target.value }))} className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900" placeholder={copy.namePlaceholder} />
                </label>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <DateField label={copy.date} value={formData.event_date} onChange={(val) => setFormData((curr) => ({ ...curr, event_date: val }))} placeholder={copy.datePlaceholder} locale={lang === "tr" ? "tr-TR" : "en-US"} />
                  <label className="block w-full">
                    <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.location}</span>
                    <input value={formData.event_location} onChange={(e) => setFormData((curr) => ({ ...curr, event_location: e.target.value }))} className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900" placeholder={copy.locationPlaceholder} />
                  </label>
                </div>

                <label className="block w-full">
                  <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.description}</span>
                  <RichTextEditor value={formData.event_description} onChange={(val) => setFormData((curr) => ({ ...curr, event_description: val }))} placeholder={copy.descriptionPlaceholder} />
                </label>
              </div>
            </section>

            {/* Blok B: Salon Rezervasyon Otomasyonu */}
            {venues.length > 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                  <Building2 className="h-4 w-4 text-gray-800 stroke-[1.8]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-950">{lang === "tr" ? "Salon ve Rezervasyon Otomasyonu" : "Venue and Reservation"}</h2>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block w-full">
                    <span className="block text-[11px] font-bold text-gray-500 mb-1">{lang === "tr" ? "Yerleşke / Salon" : "Venue"}</span>
                    <div className="relative inline-flex items-center w-full">
                      <select
                        value={formData.organization_venue_id}
                        onChange={(e) => setFormData((curr) => ({ ...curr, organization_venue_id: e.target.value, auto_reserve_venue: e.target.value ? curr.auto_reserve_venue : false }))}
                        className="w-full min-h-[38px] appearance-none rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value="">{lang === "tr" ? "Salon Seçilmedi" : "No venue selected"}</option>
                        {venues.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}{v.capacity ? ` (${v.capacity} kişi)` : ""}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-gray-400" />
                    </div>
                  </label>

                  <DateTimeField value={formData.venue_reservation_start_at} onChange={(val) => setFormData((curr) => ({ ...curr, venue_reservation_start_at: val }))} label={lang === "tr" ? "Rezervasyon Başlangıcı" : "Reservation Start"} disabled={!formData.organization_venue_id} locale={lang === "tr" ? "tr-TR" : "en-US"} />
                  <DateTimeField value={formData.venue_reservation_end_at} onChange={(val) => setFormData((curr) => ({ ...curr, venue_reservation_end_at: val }))} label={lang === "tr" ? "Rezervasyon Bitişi" : "Reservation End"} disabled={!formData.organization_venue_id} locale={lang === "tr" ? "tr-TR" : "en-US"} />
                </div>

                <label className="flex items-center gap-2.5 select-none pt-1">
                  <input type="checkbox" checked={formData.auto_reserve_venue} disabled={!formData.organization_venue_id} onChange={(e) => setFormData((curr) => ({ ...curr, auto_reserve_venue: e.target.checked }))} className="h-4 w-4 rounded-md border-gray-300 text-gray-950 focus:ring-0 cursor-pointer disabled:opacity-40" />
                  <span className="text-xs font-semibold text-gray-700 tracking-tight">{lang === "tr" ? "Salon takvimi uygunsa rezervasyon kaydını akıllı eşitleme ile otomatik doğrula" : "Auto-reserve venue based on current availability nodes"}</span>
                </label>
              </section>
            )}

            {/* Blok C: Etkinlik Özellik Matrisi ve Switch Kapakları */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                <Settings className="h-4 w-4 text-gray-800 stroke-[1.8]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-950">{lang === "tr" ? "Modül Aktivasyon Mimari Filtresi" : "Feature Configuration Matrix"}</h2>
              </div>
              
              <div className="space-y-3.5">
                <label className="block w-full sm:max-w-xs">
                  <span className="block text-[11px] font-bold text-gray-500 mb-1">{lang === "tr" ? "Ana Şablon Tipi" : "Base Event Type"}</span>
                  <div className="relative inline-flex items-center w-full">
                    <select
                      value={formData.event_type}
                      onChange={(e) => setFormData((curr) => ({ ...curr, event_type: e.target.value as EventType, ...defaultsForEventType(e.target.value as EventType) }))}
                      className="w-full min-h-[38px] appearance-none rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold outline-none cursor-pointer"
                    >
                      {EVENT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{lang === "tr" ? option.tr : option.en}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-gray-400" />
                  </div>
                </label>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-1">
                  {[
                    { key: "certificate_enabled", label: lang === "tr" ? "Akıllı Sertifika Modülü" : "Certificate engine active", hint: lang === "tr" ? "Kapatıldığında katılımcılara dijital sertifika üretimi ve sorgulama cüzdanları pasif konuma geçer." : "Deactivates credential ledger features." },
                    { key: "checkin_enabled", label: lang === "tr" ? "Saha QR Yoklama (Check-in)" : "QR check-in engine active", hint: lang === "tr" ? "Kapatıldığında kapı sevk trafiği, mobil tarayıcılar og oturum yoklama matrisleri kilitlenir." : "Deactivates onsite gate sync matrices." },
                    { key: "ticketing_enabled", label: lang === "tr" ? "Dijital Giriş Bilet Düzeni" : "Pass card ticketing system", hint: lang === "tr" ? "Etkinleştirildiğinde her yeni kayıt için cüzdan uyumlu benzersiz QR giriş kartı sevk edilir." : "Generates wallet-bound pass codes." },
                    { key: "raffles_enabled", label: lang === "tr" ? "Canlı Çekiliş Motoru" : "Raffle execution hub", hint: lang === "tr" ? "Check-in katılım şartlarına entegre pürüzsüz sahne sunum çekiliş modülünü açar." : "Enables attendee-bound randomizer luck algorithms." },
                    { key: "gamification_enabled", label: lang === "tr" ? "Oyunlaştırma & Dijital Rozet" : "Engagement badge logic", hint: lang === "tr" ? "Katılımcıların görev tamamlamalarına göre kazanacağı başarı rozet şeritlerini aktif eder." : "Activates behavioral achievement badges." },
                    { key: "registration_enabled", label: lang === "tr" ? "Herkese Açık Kayıt Formu" : "Self registration landing", hint: lang === "tr" ? "Kapatıldığında dışarıdan formu bulanlar kaydolamaz, sadece siz manuel alıcı ekleyebilirsiniz." : "Restricts entry to internal import pipelines." },
                    { key: "requires_approval", label: lang === "tr" ? "Yönetici Kayıt Onay Havuzu" : "Admin approval lifecycle", hint: lang === "tr" ? "Etkinleştirildiğinde yeni kayıtlar siz panelden onay verene kadar bekleme (lead) listesinde tutulur." : "Holds incoming entries in staging queues." },
                  ].map((feature) => (
                    <label key={feature.key} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/40 p-4 select-none cursor-pointer hover:bg-gray-50 transition-colors">
                      <input type="checkbox" checked={Boolean(formData[feature.key as keyof FormState])} onChange={(e) => setFormData((curr) => ({ ...curr, [feature.key]: e.target.checked }))} className="mt-0.5 h-4 w-4 rounded-md border-gray-300 text-gray-950 focus:ring-0 cursor-pointer" />
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-gray-950 tracking-tight">{feature.label}</p>
                        <p className="text-[10px] leading-normal text-gray-400 font-medium">{feature.hint}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </section>

            {/* Blok D: Görünürlük Ayarı */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                <Sparkles className="h-4 w-4 text-gray-800 stroke-[1.8]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-950">{copy.visibilityTitle}</h2>
              </div>
              <p className="text-[11px] leading-relaxed text-gray-400 font-medium">{copy.visibilityBody}</p>
              
              <div className="space-y-3.5 max-w-sm">
                <label className="block w-full">
                  <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.visibilityLabel}</span>
                  <div className="relative inline-flex items-center w-full">
                    <select value={formData.visibility} onChange={(e) => setFormData((curr) => ({ ...curr, visibility: e.target.value as FormState["visibility"] }))} className="w-full min-h-[38px] appearance-none rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold outline-none cursor-pointer focus:border-gray-900">
                      {visibilityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-gray-400" />
                  </div>
                </label>
                <p className="text-[10px] leading-relaxed text-gray-400 font-medium">{copy.visibilityHint}</p>
              </div>
            </section>

            {/* Blok E: Kota ve Kayıt Durumu Sınırları */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                <AlertCircle className="h-4 w-4 text-gray-800 stroke-[1.8]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-950">{copy.registrationStatusTitle}</h2>
              </div>
              <p className="text-[11px] leading-relaxed text-gray-400 font-medium">{copy.registrationStatusBody}</p>

              <div className="space-y-3.5">
                <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
                  <input type="checkbox" checked={formData.registration_closed} onChange={(e) => setFormData((curr) => ({ ...curr, registration_closed: e.target.checked }))} className="h-4 w-4 rounded-md border-gray-300 text-gray-950 focus:ring-0 cursor-pointer" />
                  <span className="text-xs font-semibold text-gray-800 tracking-tight">{copy.registrationToggle}</span>
                </label>
                <p className="text-[10px] leading-none text-gray-400 font-medium pl-6">{copy.registrationHint}</p>

                <div className="border-t border-gray-50 pt-3 max-w-sm space-y-2.5">
                  <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
                    <input type="checkbox" checked={formData.registration_quota_enabled} onChange={(e) => setFormData((curr) => ({ ...curr, registration_quota_enabled: e.target.checked }))} className="h-4 w-4 rounded-md border-gray-300 text-gray-950 focus:ring-0 cursor-pointer" />
                    <span className="text-xs font-semibold text-gray-800 tracking-tight">{copy.registrationQuotaToggle}</span>
                  </label>
                  <p className="text-[10px] leading-normal text-gray-400 font-medium pl-6">{copy.registrationQuotaHint}</p>
                  
                  <div className="pl-6 pt-1">
                    <input type="number" min={1} step={1} value={formData.registration_quota} disabled={!formData.registration_quota_enabled} onChange={(e) => setFormData((curr) => ({ ...curr, registration_quota: e.target.value }))} className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold font-mono outline-none transition focus:border-gray-900 placeholder:text-gray-400" placeholder={copy.registrationQuotaPlaceholder} />
                    {!formData.registration_quota_enabled && <p className="mt-1 text-[10px] font-semibold text-gray-400">Kota eşiği kapatıldığında kayıt tavanı sınırsız kalır.</p>}
                  </div>
                </div>
              </div>
            </section>

            {/* Blok F: KVKK, Aydınlatma Sorumluluk Grubu */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                <ShieldAlert className="h-4 w-4 text-gray-800 stroke-[1.8]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-950">{lang === "tr" ? "Hukuki KVKK ve Veri İşleme Mevzuatı" : "Privacy and Data Processing"}</h2>
              </div>
              <p className="text-[11px] leading-relaxed text-gray-400 font-medium">{lang === "tr" ? "Katılımcı açık rıza aydınlatma politikalarını ve yasal saklama sürelerini kurumsal kimliğinize göre özelleştirin." : "Map regulatory notice nodes."}</p>

              <div className="space-y-4">
                <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
                  <input type="checkbox" checked={formData.organizer_privacy_notice_enabled} onChange={(e) => setFormData((curr) => ({ ...curr, organizer_privacy_notice_enabled: e.target.checked }))} className="h-4 w-4 rounded-md border-gray-300 text-gray-950 focus:ring-0 cursor-pointer" />
                  <span className="text-xs font-semibold text-gray-800 tracking-tight">{lang === "tr" ? "Organizatöre ait özel aydınlatma metnini formda zorunlu tut" : "Organizer notice required"}</span>
                </label>

                <div className="space-y-1">
                  <span className="block text-[11px] font-bold text-gray-500 mb-1">{lang === "tr" ? "Kurumsal Aydınlatma Metni İçeriği" : "Organizer Privacy Notice"}</span>
                  <RichTextEditor value={formData.organizer_privacy_notice_text} onChange={(val) => setFormData((curr) => ({ ...curr, organizer_privacy_notice_text: val }))} placeholder="Mevzuat uyumluluk metnini yazın..." />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block w-full">
                    <span className="block text-[11px] font-bold text-gray-500 mb-1">Veri Sorumlusu Kurum Unvanı</span>
                    <input value={formData.data_controller_name} onChange={(e) => setFormData((curr) => ({ ...curr, data_controller_name: e.target.value }))} className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900" placeholder="Örn: Heptapus Teknoloji Grubu" />
                  </label>
                  <label className="block w-full">
                    <span className="block text-[11px] font-bold text-gray-500 mb-1">Mevzuat Veri Sorumlusu E-postası</span>
                    <input type="email" value={formData.data_controller_contact_email} onChange={(e) => setFormData((curr) => ({ ...curr, data_controller_contact_email: e.target.value }))} className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900" placeholder="kvkk@heptapusgroup.com" />
                  </label>
                </div>

                <label className="block w-full">
                  <span className="block text-[11px] font-bold text-gray-500 mb-1">Veri İmha ve Saklama Politikası Notu</span>
                  <textarea value={formData.data_retention_note} onChange={(e) => setFormData((curr) => ({ ...curr, data_retention_note: e.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs font-medium outline-none transition focus:border-gray-900 min-h-24 resize-none placeholder:text-gray-400" placeholder="Örn: Veriler kanuni süre uyarınca etkinlik tamamlandıktan 180 gün sonra imha edilir." />
                </label>

                {/* Sabit Yasal Uyarı Paneli */}
                <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-3.5 flex items-start gap-3">
                  <Info className="h-4 w-4 shrink-0 text-amber-500 mt-0.5 stroke-[2]" />
                  <div className="space-y-1 text-[11px] leading-relaxed text-amber-800 font-medium">
                    <p className="font-bold">{lang === "tr" ? "Yurt Dışı Veri Aktarımı Açık Rıza Beyanı" : "Cross-Border Data Transfer Node"}</p>
                    <p>{lang === "tr" ? "HeptaCert çekirdek altyapısı egemen, self-hosted ve kriptografik güvenli sunucularda çalışsa da küresel CDN ağları, barındırma katmanları ve yedekleme modülleri sınır ötesi veri transferi doğurabileceğinden, bu açık rıza onay mekanizması kayıt akışına sistem tarafından otomatik eklenir." : "System forces cross-border acknowledgement automatically."}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: KAYIT FORMU ÖZEL ALAN YAPILANDIRMASI */}
        {activeTab === "registration" && (
          <div className="space-y-4 w-full">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-2.5">
                <div className="space-y-0.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-950">{copy.registrationTitleMeta}</h2>
                  <p className="text-[11px] font-medium text-gray-400">Ad ve e-postaya ek olarak toplanacak form girdileri</p>
                </div>
                <button type="button" onClick={addRegistrationField} className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-xl bg-gray-950 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-900 active:scale-95">
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" /> <span>{copy.addField}</span>
                </button>
              </div>

              {/* Boş Durum Sinyali */}
              {formData.registration_fields.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-xs font-semibold text-gray-400 tracking-tight">{copy.emptyFields}</div>
              ) : (
                /* Özel Alan Kartları Döngüsü */
                <div className="space-y-3.5">
                  {formData.registration_fields.map((field, index) => {
                    const conditionalSourceFields = formData.registration_fields.filter((c) => c.id !== field.id && c.type === "select");
                    const selectedConditionalSource = conditionalSourceFields.find((c) => c.id === field.required_when_field_id);
                    const conditionalValueOptions = (selectedConditionalSource?.options || []).map((o: any) => typeof o === "string" ? o : o.label || String(o)).map((s: string) => s.trim()).filter(Boolean);

                    return (
                      <div key={field.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 relative transition-all hover:border-gray-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-50 pb-3">
                          <div className="flex items-center gap-2.5 text-xs font-bold text-gray-950 tracking-tight">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gray-950 font-mono text-[10px] text-white shadow-sm">{index + 1}</span>
                            <span className="truncate max-w-[240px]">{field.label || "İsimsiz Alan Çeperi"}</span>
                          </div>
                          
                          {/* Alan Hiyerarşi Değiştirme Butonları */}
                          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                            <button type="button" onClick={() => moveRegistrationField(field.id, "up")} disabled={index === 0} className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-400 hover:text-gray-900 disabled:opacity-20 shadow-sm"><ChevronUp className="h-4 w-4 stroke-[2]" /></button>
                            <button type="button" onClick={() => moveRegistrationField(field.id, "down")} disabled={index === formData.registration_fields.length - 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-400 hover:text-gray-900 disabled:opacity-20 shadow-sm"><ChevronDown className="h-4 w-4 stroke-[2]" /></button>
                            <button type="button" onClick={() => removeRegistrationField(field.id)} className="inline-flex min-h-[28px] items-center justify-center gap-1 rounded-lg border border-red-100 bg-white px-2 text-[11px] font-bold text-red-600 shadow-sm hover:bg-red-50"><Trash2 className="h-3 w-3 stroke-[1.8]" /> <span>Kaldır</span></button>
                          </div>
                        </div>

                        {/* Kart İçi Form Girdileri */}
                        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 font-semibold text-gray-600">
                          <label className="block w-full">
                            <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.fieldLabel}</span>
                            <input value={field.label} onChange={(e) => updateRegistrationField(field.id, { label: e.target.value })} className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900" placeholder="Örn: Şirket / Kurum Unvanı" />
                          </label>

                          <label className="block w-full">
                            <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.fieldType}</span>
                            <div className="relative inline-flex items-center w-full">
                              <select value={field.type} onChange={(e) => updateRegistrationField(field.id, { type: e.target.value as any, options: e.target.value === "select" ? (field.options || [""]) : [] })} className="w-full min-h-[38px] appearance-none rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none cursor-pointer">
                                {fieldTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-gray-400" />
                            </div>
                          </label>

                          <label className="block w-full sm:col-span-2">
                            <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.fieldPlaceholder}</span>
                            <input value={field.placeholder || ""} onChange={(e) => updateRegistrationField(field.id, { placeholder: e.target.value })} className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900" placeholder="Kutunun içinde silik görünecek açıklama..." />
                          </label>
                        </div>

                        <label className="block w-full">
                          <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.fieldHelper}</span>
                          <RichTextEditor value={field.helper_text || ""} onChange={(val) => updateRegistrationField(field.id, { helper_text: val })} placeholder="Katılımcıyı yönlendirecek kılavuz alt metni kurgulayın..." />
                        </label>

                        {/* SEÇENEKLER ALANI */}
                        {field.type === "select" && (
                          <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-4 space-y-4">
                            <div className="space-y-1.5">
                              <span className="block text-[11px] font-bold text-gray-500">Çoklu Seçim Tolerans Ayarı</span>
                              <div className="flex gap-2 font-bold text-xs">
                                <button type="button" onClick={() => updateRegistrationField(field.id, { selection_mode: "single" })} className={`inline-flex h-8 px-4 items-center justify-center rounded-xl border transition-all ${(!field.selection_mode || field.selection_mode === "single") ? "border-gray-950 bg-gray-950 text-white shadow-sm" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-950"}`}>Tekil Radyo Seçimi</button>
                                <button type="button" onClick={() => updateRegistrationField(field.id, { selection_mode: "multiple" })} className={`inline-flex h-8 px-4 items-center justify-center rounded-xl border transition-all ${(field.selection_mode === "multiple") ? "border-gray-950 bg-gray-950 text-white shadow-sm" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-950"}`}>Çoklu Onay Kutusu (Checkbox)</button>
                              </div>
                            </div>

                            <div className="space-y-2.5">
                              <span className="block text-[11px] font-bold text-gray-500">{copy.fieldOptions}</span>
                              {Array.isArray(field.options) && field.options.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 rounded-xl border border-gray-100 bg-white p-3 shadow-inner">
                                  {field.options.map((opt: any, idx) => (
                                    <div key={idx} className="inline-flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/50 pl-2.5 pr-1.5 py-1 text-xs font-semibold text-gray-800">
                                      <span>{typeof opt === "string" ? opt : opt.label}</span>
                                      {typeof opt === "object" && opt.capacity != null && <span className="font-mono text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded">Maks {opt.capacity}</span>}
                                      <input
                                        type="number"
                                        placeholder="Kota"
                                        value={typeof opt === "object" && opt.capacity != null ? String(opt.capacity) : ""}
                                        onChange={(e) => {
                                          const v = e.target.value.trim();
                                          updateRegistrationField(field.id, {
                                            options: (field.options || []).map((o: any, i: number) => i === idx ? { label: typeof o === "string" ? o : o.label, capacity: v ? Number(v) : null } : o)
                                          });
                                        }}
                                        className="w-12 border border-gray-200 rounded px-1 text-center font-mono text-[10px] bg-white h-5 outline-none"
                                      />
                                      <span onClick={() => updateRegistrationField(field.id, { options: (field.options || []).filter((_, i) => i !== idx) })} className="p-0.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"><X className="h-3 w-3 stroke-[2.5]" /></span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-2 max-w-sm">
                                <input id={`option-input-${field.id}`} placeholder="Yeni seçenek metnini yazın..." onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const inp = e.currentTarget; const val = inp.value.trim(); if (val) { updateRegistrationField(field.id, { options: [...(field.options || []), { label: val, capacity: null }] }); inp.value = ""; } } }} className="w-full min-h-[34px] rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold outline-none transition focus:border-gray-900" />
                                <button type="button" onClick={() => { const inp = document.getElementById(`option-input-${field.id}`) as HTMLInputElement; if (inp) { const val = inp.value.trim(); if (val) { updateRegistrationField(field.id, { options: [...(field.options || []), { label: val, capacity: null }] }); inp.value = ""; } } }} className="inline-flex min-h-[34px] items-center justify-center rounded-xl bg-gray-950 px-3.5 text-xs font-bold text-white shadow-sm hover:bg-gray-900">Ekle</button>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-4 pt-1">
                          <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
                            <input type="checkbox" checked={field.required} onChange={(e) => updateRegistrationField(field.id, { required: e.target.checked })} className="h-4 w-4 rounded-md border-gray-300 text-gray-950 focus:ring-0 cursor-pointer" />
                            <span className="text-xs font-semibold text-gray-800 tracking-tight">{copy.requiredField}</span>
                          </label>
                        </div>

                        {/* KOŞULLU ZORUNLULUK SİHİRBAZI */}
                        <details className="rounded-xl border border-gray-200 bg-gray-50/30 group overflow-hidden">
                          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 font-bold text-gray-900 text-xs select-none bg-gray-50/50 [&::-webkit-details-marker]:hidden">
                            <span className="flex items-center gap-1.5"><Settings className="h-3.5 w-3.5 text-gray-500" /> <span>{copy.conditionalRequirement}</span></span>
                            <ChevronDown className="h-3.5 w-3.5 text-gray-400 transition-transform duration-200 group-open:rotate-180" />
                          </summary>
                          <div className="border-t border-gray-100 p-4 space-y-3 font-semibold text-gray-600 text-xs">
                            <p className="text-gray-400 font-medium leading-relaxed mb-1">{copy.conditionalHint}</p>
                            <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
                              <label className="block w-full">
                                <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.conditionalDependsOn}</span>
                                <div className="relative inline-flex items-center w-full">
                                  <select value={field.required_when_field_id || ""} onChange={(e) => { const nextId = e.target.value; updateRegistrationField(field.id, { required_when_field_id: nextId || undefined, required_when_equals: nextId ? (field.required_when_equals || "") : undefined }); }} className="w-full min-h-[36px] appearance-none rounded-xl border border-gray-200 bg-white px-3 font-semibold outline-none cursor-pointer">
                                    <option value="">{lang === "tr" ? "Bağlantı Yok" : "None"}</option>
                                    {conditionalSourceFields.map((c) => <option key={c.id} value={c.id}>{c.label || c.id}</option>)}
                                  </select>
                                  <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-gray-400" />
                                </div>
                              </label>
                              
                              <label className="block w-full">
                                <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.conditionalValue}</span>
                                <div className="relative inline-flex items-center w-full">
                                  <select value={field.required_when_equals || ""} onChange={(e) => updateRegistrationField(field.id, { required_when_equals: e.target.value })} disabled={!field.required_when_field_id || !conditionalValueOptions.length} className="w-full min-h-[36px] appearance-none rounded-xl border border-gray-200 bg-white px-3 font-semibold outline-none cursor-pointer disabled:opacity-40">
                                    <option value="">{copy.conditionalValuePlaceholder}</option>
                                    {conditionalValueOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                  <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-gray-400" />
                                </div>
                              </label>
                            </div>
                          </div>
                        </details>

                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 3: AFİŞ / BANNER YÜKLEME PANELİ */}
        {activeTab === "banner" && (
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3 border-b border-gray-100 pb-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-500 shadow-sm">
                <ImageIcon className="h-4 w-4 stroke-[1.8]" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold tracking-tight text-gray-950">{copy.bannerTitle}</h2>
                <p className="text-xs text-gray-400 font-medium">{copy.bannerBody}</p>
              </div>
            </div>

            <div className="space-y-3.5 max-w-2xl">
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-inner relative group">
                {bannerPreview || formData.event_banner_url ? (
                  <img src={bannerPreview || formData.event_banner_url} alt={copy.bannerTitle} className="h-48 w-full object-cover mix-blend-multiply sm:h-56" />
                ) : (
                  <div className="flex h-48 sm:h-56 items-center justify-center text-xs font-semibold text-gray-400">{copy.noBanner}</div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <label className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 cursor-pointer select-none">
                  <Upload className="h-3.5 w-3.5 text-gray-500 stroke-[2]" />
                  <span>{copy.uploadBanner}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleBannerSelect(e.target.files[0])} />
                </label>
                <p className="text-[10px] font-medium text-gray-400">{copy.bannerHint}</p>
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: OTOMATİK SERTİFİKA TESLİMAT BÜLTEN KANALI */}
        {activeTab === "email" && (
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3 border-b border-gray-100 pb-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-500 shadow-sm">
                <Mail className="h-4 w-4 stroke-[1.8]" />
              </div>
              <div className="min-w-0 space-y-0.5 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold tracking-tight text-gray-950">{copy.emailTitle}</h2>
                  {hasGrowthPlan && <span className="inline-flex rounded-md bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 text-[9px] font-bold uppercase text-emerald-700 shadow-sm">{subscription?.plan_id === "enterprise" ? copy.enterprise : copy.growth}</span>}
                </div>
                <p className="text-xs text-gray-400 font-medium">{copy.emailBody}</p>
              </div>
            </div>

            {!hasGrowthPlan ? (
              <div className="pt-2"><PlanGateCard feature={copy.autoEmail} requiredPlans={["growth", "enterprise"]} compact /></div>
            ) : (
              <div className="space-y-4.5">
                <label className="inline-flex cursor-pointer items-center gap-2.5 select-none py-1">
                  <input type="checkbox" checked={formData.auto_email_on_cert} onChange={(e) => setFormData((curr) => ({ ...curr, auto_email_on_cert: e.target.checked }))} className="h-4 w-4 rounded-md border-gray-300 text-gray-950 focus:ring-0 cursor-pointer" />
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-gray-900 tracking-tight block">{copy.autoEmail}</span>
                    <span className="text-[10px] text-gray-400 font-medium block">{copy.autoEmailHint}</span>
                  </div>
                </label>

                {formData.auto_email_on_cert && (
                  <div className="space-y-3 max-w-sm pt-1 animate-in fade-in duration-150">
                    <label className="block w-full">
                      <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.templateLabel}</span>
                      <div className="relative inline-flex items-center w-full">
                        <select value={formData.cert_email_template_id || ""} onChange={(e) => setFormData((curr) => ({ ...curr, cert_email_template_id: e.target.value ? Number(e.target.value) : null }))} className="w-full min-h-[38px] appearance-none rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold outline-none cursor-pointer">
                          <option value="">{copy.templatePlaceholder}</option>
                          {customEmailTemplates.length > 0 && <optgroup label={copy.customTemplates}>{customEmailTemplates.map((t) => <option key={`custom-${t.id}`} value={t.id}>{t.name}</option>)}</optgroup>}
                          {systemEmailTemplates.length > 0 && <optgroup label={copy.systemTemplates}>{systemEmailTemplates.map((t) => <option key={`system-${t.id}`} value={t.id}>{t.name}</option>)}</optgroup>}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-gray-400" />
                      </div>
                    </label>

                    {availableEmailTemplates.length === 0 && <div className="rounded-xl border border-amber-100 bg-amber-50/20 p-3.5 text-xs font-semibold text-amber-700">{copy.noTemplates}</div>}
                    
                    {formData.cert_email_template_id && (
                      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-xs flex items-center justify-between gap-3">
                        <div className="min-w-0"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{copy.active}</p><p className="font-bold text-gray-900 mt-0.5 truncate">{availableEmailTemplates.find((t) => t.id === formData.cert_email_template_id)?.name}</p></div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold pt-1.5 border-t border-gray-50">
                  <Link href={`/admin/events/${eventId}/email-templates`} className="text-gray-950 hover:text-gray-900 underline underline-offset-2">{copy.manageTemplates}</Link>
                  <Link href={`/admin/events/${eventId}/bulk-emails`} className="text-gray-400 hover:text-gray-900 transition-colors font-medium">{copy.manageCampaigns}</Link>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 5: ETKİNLİK YORUM MODERASYON PANELİ */}
        {activeTab === "comments" && (
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3 border-b border-gray-100 pb-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-500 shadow-sm">
                <MessageSquare className="h-4 w-4 stroke-[1.8]" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold tracking-tight text-gray-950">{copy.commentsTitle}</h2>
                <p className="text-xs text-gray-400 font-medium">{copy.commentsSubtitle}</p>
              </div>
            </div>

            {commentsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400 stroke-[2.5]" /></div>
            ) : comments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-xs font-semibold text-gray-400 tracking-tight">{copy.commentsEmpty}</div>
            ) : (
              <div className="space-y-3.5 max-h-[560px] overflow-y-auto scrollbar-none pr-0.5 bg-white">
                {comments.map((comment) => {
                  const commentSel = comment.status === "visible" ? "border-emerald-100 bg-emerald-50/10 text-emerald-700" : comment.status === "reported" ? "border-amber-100 bg-amber-50/10 text-amber-700" : "border-gray-100 bg-gray-50/40 text-gray-400";
                  return (
                    <article key={comment.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col justify-between lg:flex-row lg:items-center gap-4 transition-colors hover:border-gray-200">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-gray-950 tracking-tight">{comment.member_name}</span>
                          <span className="text-[10px] font-medium text-gray-400 font-mono">{comment.member_email}</span>
                          <span className={`rounded-md border px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-tight shadow-sm ${commentSel}`}>{comment.status}</span>
                        </div>
                        <p className="text-xs leading-relaxed text-gray-700 font-medium whitespace-pre-wrap">{comment.body}</p>
                        <div className="pt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          <span>{copy.commentsMember}: {comment.member_public_id}</span>
                          <span className={comment.report_count > 0 ? "text-red-500" : ""}>{copy.commentsReported}: {comment.report_count}</span>
                          <span className="font-mono text-gray-300 font-medium lowercase">{new Date(comment.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end lg:self-auto w-full lg:w-auto">
                        <button type="button" onClick={() => void handleCommentStatusChange(comment.id, "visible")} disabled={commentsSavingId === comment.id || comment.status === "visible"} className="flex-1 lg:flex-initial inline-flex h-7 items-center justify-center rounded-lg border border-emerald-100 bg-white px-2.5 text-[10px] font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 disabled:opacity-20">
                          {commentsSavingId === comment.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />} <span>{copy.commentsPublish}</span>
                        </button>
                        <button type="button" onClick={() => void handleCommentStatusChange(comment.id, "hidden")} disabled={commentsSavingId === comment.id || comment.status === "hidden"} className="flex-1 lg:flex-initial inline-flex h-7 items-center justify-center rounded-lg border border-red-100 bg-white px-2.5 text-[10px] font-bold text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-20">
                          {commentsSavingId === comment.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />} <span>{copy.commentsHide}</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

      </div>

      {/* SÜZÜLEN ALT ANA AKSİYON OPERASYON KONSOLU */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2.5 items-center w-full max-w-xs px-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-full bg-gray-950 px-6 font-bold text-white shadow-xl transition hover:bg-gray-900 active:scale-98 disabled:opacity-50"
          title={`${copy.save} (Ctrl/⌘ + S)`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 stroke-[2.5]" />}
          <span className="text-xs">{saving ? copy.saving : copy.save}</span>
        </button>
      </div>

    </div>
  );
}