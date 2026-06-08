export type FeatureKey =
  | "checkin"
  | "ticketing"
  | "automation"
  | "segmentation"
  | "crm"
  | "lms"
  | "training"
  | "certificate_templates"
  | "kiosk"
  | "health";

export const FEATURE_METADATA: Record<FeatureKey, { requiredPlans: string[]; title: { tr: string; en: string }; enterpriseOnlyForStaff?: boolean }> = {
  checkin: { requiredPlans: ["pro", "growth", "enterprise"], title: { tr: "Check-in", en: "Check-in" } },
  ticketing: { requiredPlans: ["pro", "growth", "enterprise"], title: { tr: "Biletleme", en: "Ticketing" } },
  automation: { requiredPlans: ["growth", "enterprise"], title: { tr: "Otomasyon", en: "Automation" } },
  segmentation: { requiredPlans: ["growth", "enterprise"], title: { tr: "Katılımcı segmentasyonu", en: "Audience segmentation" } },
  crm: { requiredPlans: ["enterprise"], title: { tr: "Event CRM", en: "Event CRM" }, enterpriseOnlyForStaff: true },
  lms: { requiredPlans: ["enterprise"], title: { tr: "LMS", en: "LMS" }, enterpriseOnlyForStaff: true },
  training: { requiredPlans: ["enterprise"], title: { tr: "Kurum içi eğitim", en: "Training compliance" }, enterpriseOnlyForStaff: true },
  certificate_templates: { requiredPlans: ["growth", "enterprise"], title: { tr: "Sertifika şablonları", en: "Certificate templates" } },
  kiosk: { requiredPlans: ["enterprise"], title: { tr: "Kiosk modu", en: "Kiosk mode" }, enterpriseOnlyForStaff: true },
  health: { requiredPlans: ["enterprise"], title: { tr: "Platform sağlığı", en: "Platform health" }, enterpriseOnlyForStaff: true },
};

export function getFeatureMetadata(key: FeatureKey) {
  return FEATURE_METADATA[key];
}
