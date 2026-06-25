export type FeatureKey =
  | "checkin"
  | "ticketing"
  | "bulk_certificates"
  | "custom_registration"
  | "automation"
  | "email"
  | "segmentation"
  | "advanced_analytics"
  | "webhooks"
  | "domains"
  | "branding"
  | "api"
  | "certificate_templates"
  | "presentations"
  | "raffles"
  | "accreditation"
  | "crm"
  | "lead_forms"
  | "integrations"
  | "lms"
  | "training"
  | "team"
  | "reports"
  | "sso"
  | "kiosk"
  | "health";

type FeatureMetadata = {
  requiredPlans: string[];
  title: { tr: string; en: string };
  enterpriseOnlyForStaff?: boolean;
};

export const FEATURE_METADATA: Record<FeatureKey, FeatureMetadata> = {
  checkin: { requiredPlans: ["pro", "growth", "enterprise"], title: { tr: "Check-in", en: "Check-in" } },
  ticketing: { requiredPlans: ["pro", "growth", "enterprise"], title: { tr: "Biletleme", en: "Ticketing" } },
  bulk_certificates: { requiredPlans: ["pro", "growth", "enterprise"], title: { tr: "Toplu sertifika", en: "Bulk certificates" } },
  custom_registration: { requiredPlans: ["pro", "growth", "enterprise"], title: { tr: "Ozel kayit formlari", en: "Custom registration" } },
  automation: { requiredPlans: ["growth", "enterprise"], title: { tr: "Otomasyon", en: "Automation" } },
  email: { requiredPlans: ["growth", "enterprise"], title: { tr: "Toplu e-posta", en: "Bulk email" } },
  segmentation: { requiredPlans: ["growth", "enterprise"], title: { tr: "Katilimci segmentasyonu", en: "Audience segmentation" } },
  advanced_analytics: { requiredPlans: ["growth", "enterprise"], title: { tr: "Gelismis analitik", en: "Advanced analytics" } },
  webhooks: { requiredPlans: ["growth", "enterprise"], title: { tr: "Webhook API", en: "Webhook API" } },
  domains: { requiredPlans: ["growth", "enterprise"], title: { tr: "Ozel alan adi", en: "Custom domains" } },
  branding: { requiredPlans: ["growth", "enterprise"], title: { tr: "Marka yonetimi", en: "Branding" } },
  api: { requiredPlans: ["growth", "enterprise"], title: { tr: "API erisimi", en: "API access" } },
  certificate_templates: { requiredPlans: ["growth", "enterprise"], title: { tr: "Sertifika sablonlari", en: "Certificate templates" } },
  presentations: { requiredPlans: ["growth", "enterprise"], title: { tr: "Sunumlar", en: "Presentations" } },
  raffles: { requiredPlans: ["growth", "enterprise"], title: { tr: "Cekilisler", en: "Raffles" } },
  accreditation: { requiredPlans: ["enterprise"], title: { tr: "Akreditasyon", en: "Accreditation" }, enterpriseOnlyForStaff: true },
  crm: { requiredPlans: ["enterprise"], title: { tr: "Event CRM", en: "Event CRM" }, enterpriseOnlyForStaff: true },
  lead_forms: { requiredPlans: ["enterprise"], title: { tr: "Lead formlari", en: "Lead forms" }, enterpriseOnlyForStaff: true },
  integrations: { requiredPlans: ["enterprise"], title: { tr: "Kurumsal entegrasyonlar", en: "Enterprise integrations" }, enterpriseOnlyForStaff: true },
  lms: { requiredPlans: ["enterprise"], title: { tr: "LMS", en: "LMS" }, enterpriseOnlyForStaff: true },
  training: { requiredPlans: ["enterprise"], title: { tr: "Kurum ici egitim", en: "Training compliance" }, enterpriseOnlyForStaff: true },
  team: { requiredPlans: ["enterprise"], title: { tr: "Organizasyon ekibi", en: "Organization team" }, enterpriseOnlyForStaff: true },
  reports: { requiredPlans: ["enterprise"], title: { tr: "Planli raporlar", en: "Scheduled reports" }, enterpriseOnlyForStaff: true },
  sso: { requiredPlans: ["enterprise"], title: { tr: "SSO", en: "SSO" }, enterpriseOnlyForStaff: true },
  kiosk: { requiredPlans: ["enterprise"], title: { tr: "Kiosk modu", en: "Kiosk mode" }, enterpriseOnlyForStaff: true },
  health: { requiredPlans: ["enterprise"], title: { tr: "Platform sagligi", en: "Platform health" }, enterpriseOnlyForStaff: true },
};

export function getFeatureMetadata(key: FeatureKey) {
  return FEATURE_METADATA[key];
}
