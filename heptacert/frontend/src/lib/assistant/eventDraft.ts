import {
  compactText,
  tokenize,
  fuzzyAny,
  fuzzyIncludes,
  isAffirmative,
  isNegative,
  isSkipValue,
} from "./text";

export type EventWizardStep = "idle" | "name" | "date" | "location" | "description" | "type" | "features" | "confirm";

export interface SuggestedRegistrationField {
  id: string;
  label: string;
  type: "text" | "textarea" | "number" | "tel" | "select" | "date" | "file";
  required: boolean;
  placeholder?: string;
  helper_text?: string;
  options?: Array<{ label: string; capacity?: number | null }>;
  selection_mode?: "single" | "multiple";
}

export interface EventDraft {
  name: string;
  eventDate: string;
  eventStartTime: string;
  eventEndTime: string;
  eventLocation: string;
  eventDescription: string;
  eventType: string;
  visibility: "private" | "unlisted" | "public";
  registrationClosed: boolean;
  requireEmailVerification: boolean;
  registrationQuotaEnabled: boolean;
  registrationQuota: string;
  requiresApproval: boolean;
  scheduleHint: string;
  registrationFields: SuggestedRegistrationField[];
  certificateEnabled: boolean;
  checkinEnabled: boolean;
  ticketingEnabled: boolean;
  registrationEnabled: boolean;
  rafflesEnabled: boolean;
  gamificationEnabled: boolean;
  organizerPrivacyNoticeEnabled: boolean;
  organizerPrivacyNoticeText: string;
  showCrossBorderTransferNotice: boolean;
  requireCrossBorderTransferConsent: boolean;
  dataControllerName: string;
  dataControllerContactEmail: string;
  dataRetentionNote: string;
  kvkkConsentRequired: boolean;
  kvkkConsentText: string;
}

export const EMPTY_EVENT_DRAFT: EventDraft = {
  name: "",
  eventDate: "",
  eventStartTime: "",
  eventEndTime: "",
  eventLocation: "",
  eventDescription: "",
  eventType: "certificate_event",
  visibility: "unlisted",
  registrationClosed: false,
  requireEmailVerification: true,
  registrationQuotaEnabled: false,
  registrationQuota: "",
  requiresApproval: false,
  scheduleHint: "",
  registrationFields: [],
  certificateEnabled: true,
  checkinEnabled: true,
  ticketingEnabled: false,
  registrationEnabled: true,
  rafflesEnabled: false,
  gamificationEnabled: false,
  organizerPrivacyNoticeEnabled: false,
  organizerPrivacyNoticeText: "",
  showCrossBorderTransferNotice: true,
  requireCrossBorderTransferConsent: true,
  dataControllerName: "",
  dataControllerContactEmail: "",
  dataRetentionNote: "",
  kvkkConsentRequired: false,
  kvkkConsentText: "",
};

export function createInitialDraft(): EventDraft {
  return { ...EMPTY_EVENT_DRAFT };
}

// normalize date: accept YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY, or parseable strings
export function normalizeEventDate(value: string): string {
  const input = String(value || "").trim();
  if (!input || isSkipValue(input)) return "";
  const isoMatch = input.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const dottedMatch = input.match(/\b(\d{2})[./-](\d{2})[./-](\d{4})\b/);
  if (dottedMatch) return `${dottedMatch[3]}-${dottedMatch[2]}-${dottedMatch[1]}`;
  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return input;
}

const TURKISH_MONTHS: Array<[string, number]> = [
  ["ocak", 0],
  ["subat", 1],
  ["mart", 2],
  ["nisan", 3],
  ["mayis", 4],
  ["haziran", 5],
  ["temmuz", 6],
  ["agustos", 7],
  ["eylul", 8],
  ["ekim", 9],
  ["kasim", 10],
  ["aralik", 11],
];

export function parseTurkishMonthDate(value: string): string {
  const normalized = compactText(value);
  const match = normalized.match(/\b(\d{1,2})\s+([a-zçğıöşü]+)\s+(\d{4})\b/);
  if (!match) return "";
  const day = Number(match[1]);
  const year = Number(match[3]);
  const month = TURKISH_MONTHS.find(([name]) => fuzzyIncludes(match[2], name))?.[1];
  if (month === undefined || !Number.isFinite(day) || !Number.isFinite(year)) return "";
  const candidate = new Date(Date.UTC(year, month, day));
  if (candidate.getUTCDate() !== day || candidate.getUTCMonth() !== month || candidate.getUTCFullYear() !== year) {
    return "";
  }
  return candidate.toISOString().slice(0, 10);
}

export function extractDateRange(text: string): { date: string; startTime: string; endTime: string; hint: string } {
  const normalized = compactText(text);
  const date = normalizeEventDate(text) || parseTurkishMonthDate(text);
  const timeMatches = Array.from(normalized.matchAll(/\b(\d{1,2})(?::|\.|\s)(\d{2})\b/g)).map((m) => `${String(m[1]).padStart(2, "0")}:${m[2]}`);
  const rangeMatch = normalized.match(/\b(\d{1,2})(?::|\.|\s)(\d{2})\s*[-–to]{1,3}\s*(\d{1,2})(?::|\.|\s)(\d{2})\b/i);
  const startTime = rangeMatch ? `${String(rangeMatch[1]).padStart(2, "0")}:${rangeMatch[2]}` : (timeMatches[0] || "");
  const endTime = rangeMatch ? `${String(rangeMatch[3]).padStart(2, "0")}:${rangeMatch[4]}` : (timeMatches[1] || "");
  const hintParts: string[] = [];
  if (date) hintParts.push(date);
  if (startTime && endTime) hintParts.push(`${startTime}-${endTime}`);
  else if (startTime) hintParts.push(startTime);
  return { date, startTime, endTime, hint: hintParts.join(" ").trim() };
}

export function extractLocation(text: string): string {
  const normalized = compactText(text);
  const locationMarkers = ["ankara", "istanbul", "izmir", "bursa", "antalya", "adana", "eskisehir", "konya", "trabzon", "online", "zoom", "teams", "meet", "hybrid"];
  const directHit = locationMarkers.find((marker) => fuzzyIncludes(normalized, marker));
  if (directHit) return directHit;
  const atMatch = normalized.match(/\b(?:in|at|@)\s+([a-z0-9\s-]{2,40})/i);
  if (atMatch) return atMatch[1].trim().split(/\s+/).slice(0, 4).join(" ");
  return "";
}

export function normalizeEventType(value: string): string {
  const text = compactText(value);
  if (/\b(workshop|atolye)\b/i.test(text)) return "workshop";
  if (/\b(training|egitim|kurs)\b/i.test(text)) return "training";
  if (/\b(webinar|online|canli|zoom|teams|virtual)\b/i.test(text)) return "online_event";
  if (/\b(conference|konferans|zirve|summit)\b/i.test(text)) return "conference";
  if (/\b(community|topluluk|meetup)\b/i.test(text)) return "club_event";
  if (/\b(seminar|panel|soylesi|talk)\b/i.test(text)) return "seminar";
  if (/\b(concert|konser|festival|sahne|muzik)\b/i.test(text)) return "concert";
  if (/\b(ozel|özel|custom|special)\b/i.test(text)) return "custom";
  return "certificate_event";
}

export function extractType(text: string): string {
  const normalized = compactText(text);
  if (fuzzyAny(normalized, ["workshop", "atolye"])) return "workshop";
  if (fuzzyAny(normalized, ["training", "egitim", "kurs"])) return "training";
  if (fuzzyAny(normalized, ["seminar", "panel", "soylesi", "talk"])) return "seminar";
  if (fuzzyAny(normalized, ["webinar", "online", "canli", "zoom", "teams", "virtual"])) return "online_event";
  if (fuzzyAny(normalized, ["conference", "konferans", "zirve", "summit"])) return "conference";
  if (fuzzyAny(normalized, ["concert", "konser", "muzik", "sahne", "festival"])) return "concert";
  if (fuzzyAny(normalized, ["club", "kulup", "topluluk", "community"])) return "club_event";
  if (fuzzyAny(normalized, ["custom", "ozel", "özel", "special"])) return "custom";
  return "certificate_event";
}

export function extractVisibility(text: string): EventDraft["visibility"] | "" {
  const normalized = compactText(text);
  if (fuzzyAny(normalized, ["public", "acik", "herkese acik", "gozukecek", "listelensin"])) return "public";
  if (fuzzyAny(normalized, ["private", "ozel", "gizli", "sadece ben", "hidden"])) return "private";
  if (fuzzyAny(normalized, ["unlisted", "liste disi", "linkle", "direk link", "link ile"])) return "unlisted";
  return "";
}

export function extractRegistrationQuota(text: string): string {
  const normalized = compactText(text);
  const patterns = [
    /\b(?:kota|kontenjan|limit|kapasite|capacity)\D{0,10}(\d{1,6})\b/i,
    /\b(\d{1,6})\D{0,10}(?:kisi|kişi|katilimci|katılımcı|kontenjan|kota|limit)\b/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

export function buildSmartRegistrationFields(eventType: string): SuggestedRegistrationField[] {
  const presets: Record<string, SuggestedRegistrationField[]> = {
    workshop: [
      { id: "company", label: "Şirket / Kurum", type: "text", required: false, placeholder: "Kurum adını yazın" },
      { id: "role", label: "Unvan", type: "text", required: false, placeholder: "Örn. Yazılım geliştirici" },
      { id: "experience", label: "Deneyim Seviyesi", type: "select", required: false, options: [{ label: "Başlangıç" }, { label: "Orta" }, { label: "İleri" }], selection_mode: "single" },
      { id: "device", label: "Cihaz İhtiyacı", type: "select", required: false, options: [{ label: "Laptop" }, { label: "Tablet" }, { label: "Yok" }], selection_mode: "single" },
    ],
    training: [
      { id: "company", label: "Şirket / Kurum", type: "text", required: false },
      { id: "department", label: "Departman", type: "text", required: false },
      { id: "experience", label: "Seviye", type: "select", required: false, options: [{ label: "Yeni başlayan" }, { label: "Orta" }, { label: "İleri" }], selection_mode: "single" },
      { id: "needs", label: "Beklenti / İhtiyaç", type: "textarea", required: false },
    ],
    seminar: [
      { id: "company", label: "Şirket / Kurum", type: "text", required: false },
      { id: "title", label: "Görev / Unvan", type: "text", required: false },
      { id: "interest", label: "İlgi Alanı", type: "text", required: false },
    ],
    conference: [
      { id: "company", label: "Şirket / Kurum", type: "text", required: false },
      { id: "title", label: "Unvan", type: "text", required: false },
      { id: "topic", label: "En İlgi Çeken Oturum", type: "text", required: false },
      { id: "linkedin", label: "LinkedIn Profil URL", type: "text", required: false },
    ],
    online_event: [
      { id: "timezone", label: "Saat Dilimi", type: "text", required: false, placeholder: "Örn. Europe/Istanbul" },
      { id: "platform", label: "Platform Tercihi", type: "select", required: false, options: [{ label: "Zoom" }, { label: "Teams" }, { label: "Meet" }, { label: "Diğer" }], selection_mode: "single" },
      { id: "device", label: "Katılacağınız Cihaz", type: "select", required: false, options: [{ label: "Masaüstü" }, { label: "Mobil" }, { label: "Tablet" }], selection_mode: "single" },
    ],
    concert: [
      { id: "ticket_type", label: "Bilet Türü", type: "select", required: false, options: [{ label: "Standart" }, { label: "VIP" }, { label: "Öğrenci" }], selection_mode: "single" },
      { id: "company", label: "Şirket / Kurum", type: "text", required: false },
      { id: "note", label: "Özel İstek", type: "textarea", required: false },
    ],
    club_event: [
      { id: "member_type", label: "Üyelik Tipi", type: "select", required: false, options: [{ label: "Üye" }, { label: "Misafir" }, { label: "Konuk" }], selection_mode: "single" },
      { id: "company", label: "Şirket / Kurum", type: "text", required: false },
      { id: "note", label: "Not", type: "textarea", required: false },
    ],
    custom: [
      { id: "company", label: "Şirket / Kurum", type: "text", required: false },
      { id: "purpose", label: "Etkinlik Amacı", type: "textarea", required: false },
    ],
    certificate_event: [
      { id: "company", label: "Şirket / Kurum", type: "text", required: false },
      { id: "title", label: "Görev / Unvan", type: "text", required: false },
    ],
  };
  const normalizedKey = (eventType || "certificate_event").trim();
  return presets[normalizedKey] ?? presets.certificate_event;
}

export function buildComplianceSuggestions(draft: EventDraft, lang = "tr"): string[] {
  const suggestions: string[] = [];
  const privacyNeeded = draft.registrationEnabled || draft.requireEmailVerification || draft.registrationQuotaEnabled;
  if (privacyNeeded) {
    suggestions.push(lang === "tr" ? "KVKK/aydınlatma metni ekleyin" : "Add a KVKK/privacy notice");
    suggestions.push(lang === "tr" ? "Kayıt formuna açık rıza kutusu ekleyin" : "Add a consent checkbox to the registration form");
    suggestions.push(lang === "tr" ? "Veri işleme amacı ve saklama süresini belirtin" : "State the purpose of processing and retention period");
  }
  if (draft.visibility === "public" || draft.visibility === "unlisted") {
    suggestions.push(lang === "tr" ? "Gizlilik politikası / şartlar bağlantısı ekleyin" : "Add a privacy policy / terms link");
  }
  if (draft.eventType === "online_event" || draft.eventType === "conference" || draft.eventType === "workshop") {
    suggestions.push(lang === "tr" ? "İletişim ve bilgilendirme onaylarını ayrı tutun" : "Keep contact and information consent separate");
  }
  return Array.from(new Set(suggestions));
}

export function validateDraft(draft: EventDraft, lang = "tr"): string[] {
  const errs: string[] = [];
  if (!draft.name || !draft.name.trim()) errs.push(lang === "tr" ? "Etkinlik adı gerekli" : "Event name is required");
  if (draft.registrationQuotaEnabled && draft.registrationQuota && isNaN(Number(draft.registrationQuota))) errs.push(lang === "tr" ? "Kontenjan sayısal olmalı" : "Quota must be numeric");
  if (draft.dataControllerContactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.dataControllerContactEmail)) errs.push(lang === "tr" ? "Geçersiz e-posta adresi" : "Invalid data controller email");
  if (draft.eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(draft.eventDate)) errs.push(lang === "tr" ? "Tarih YYYY-MM-DD formatında olmalı" : "Date must be YYYY-MM-DD");
  return errs;
}

export function formatDraftSummary(draft: EventDraft, lang = "tr"): string {
  const lines: string[] = [lang === "tr" ? `Ad: ${draft.name}` : `Name: ${draft.name}`];
  if (draft.eventDate) lines.push(lang === "tr" ? `Tarih: ${draft.eventDate}` : `Date: ${draft.eventDate}`);
  if (draft.eventLocation) lines.push(lang === "tr" ? `Konum: ${draft.eventLocation}` : `Location: ${draft.eventLocation}`);
  if (draft.eventDescription) lines.push(lang === "tr" ? `Açıklama: ${draft.eventDescription}` : `Description: ${draft.eventDescription}`);
  lines.push(lang === "tr" ? `Tip: ${draft.eventType}` : `Type: ${draft.eventType}`);
  lines.push(lang === "tr" ? `Görünürlük: ${draft.visibility}` : `Visibility: ${draft.visibility}`);
  if (draft.registrationQuotaEnabled && draft.registrationQuota) lines.push(lang === "tr" ? `Kontenjan: ${draft.registrationQuota}` : `Quota: ${draft.registrationQuota}`);
  lines.push(lang === "tr" ? `Kayıt kapalı: ${draft.registrationClosed ? "Evet" : "Hayır"}` : `Registration closed: ${draft.registrationClosed ? "Yes" : "No"}`);
  lines.push(lang === "tr" ? `E-posta doğrulama: ${draft.requireEmailVerification ? "Zorunlu" : "Kapalı"}` : `Email verification: ${draft.requireEmailVerification ? "Required" : "Off"}`);
  lines.push(lang === "tr" ? `Özellikler: ${[draft.certificateEnabled ? "Sertifika" : null, draft.checkinEnabled ? "Check-in" : null, draft.ticketingEnabled ? "Biletleme" : null].filter(Boolean).join(", ")}` : `Features: ${[draft.certificateEnabled ? "Certificate" : null, draft.checkinEnabled ? "Check-in" : null, draft.ticketingEnabled ? "Ticketing" : null].filter(Boolean).join(", ")}`);
  return lines.join("\n");
}

export function formatInferredDraftSummary(draft: EventDraft, lang = "tr"): string {
  const inferred: string[] = [];
  if (draft.name.trim()) inferred.push(lang === "tr" ? `Ad: ${draft.name}` : `Name: ${draft.name}`);
  if (draft.eventDate.trim()) inferred.push(lang === "tr" ? `Tarih: ${draft.eventDate}` : `Date: ${draft.eventDate}`);
  if (draft.eventStartTime.trim() || draft.eventEndTime.trim()) {
    inferred.push(lang === "tr" ? `Saat: ${draft.eventStartTime || "?"}${draft.eventEndTime ? `-${draft.eventEndTime}` : ""}` : `Time: ${draft.eventStartTime || "?"}${draft.eventEndTime ? `-${draft.eventEndTime}` : ""}`);
  }
  if (draft.eventLocation.trim()) inferred.push(lang === "tr" ? `Konum: ${draft.eventLocation}` : `Location: ${draft.eventLocation}`);
  if (draft.eventType.trim()) inferred.push(lang === "tr" ? `Tip: ${draft.eventType}` : `Type: ${draft.eventType}`);
  if (draft.visibility.trim()) inferred.push(lang === "tr" ? `Görünürlük: ${draft.visibility}` : `Visibility: ${draft.visibility}`);
  if (draft.registrationQuotaEnabled && draft.registrationQuota.trim()) inferred.push(lang === "tr" ? `Kontenjan: ${draft.registrationQuota}` : `Quota: ${draft.registrationQuota}`);
  if (draft.registrationClosed) inferred.push(lang === "tr" ? "Kayıt kapalı" : "Registration closed");
  if (!draft.requireEmailVerification) inferred.push(lang === "tr" ? "E-posta doğrulama kapalı" : "Email verification off");
  if (draft.requiresApproval) inferred.push(lang === "tr" ? "Onay gerekiyor" : "Approval required");
  if (draft.registrationFields.length > 0) inferred.push(lang === "tr" ? `Önerilen form alanları: ${draft.registrationFields.length}` : `Suggested form fields: ${draft.registrationFields.length}`);
  return inferred.length > 0 ? inferred.join(", ") : (lang === "tr" ? "Henüz net bir alan yakalayamadım." : "I haven't inferred any clear fields yet.");
}

export function formatMissingFieldsList(missing: EventWizardStep[], lang = "tr"): string {
  const labels: Record<EventWizardStep, string> = {
    idle: "",
    name: lang === "tr" ? "ad" : "name",
    date: lang === "tr" ? "tarih" : "date",
    location: lang === "tr" ? "konum" : "location",
    description: lang === "tr" ? "açıklama" : "description",
    type: lang === "tr" ? "etkinlik tipi" : "event type",
    features: lang === "tr" ? "özellikler" : "features",
    confirm: lang === "tr" ? "onay" : "confirmation",
  };
  const readable = missing.map((s) => labels[s]).filter(Boolean);
  if (!readable.length) return lang === "tr" ? "Eksik alan kalmadı." : "No fields are missing.";
  return lang === "tr" ? `Eksik kalanlar: ${readable.join(", ")}.` : `Still missing: ${readable.join(", ")}.`;
}

export function formatSuggestedFormFields(fields: SuggestedRegistrationField[], lang = "tr"): string {
  if (!fields.length) return lang === "tr" ? "Önerilen kayıt formu alanı yok." : "No suggested registration fields.";
  const names = fields.slice(0, 4).map((f) => f.label);
  const suffix = fields.length > 4 ? (lang === "tr" ? ` ve ${fields.length - 4} alan daha` : ` and ${fields.length - 4} more`) : "";
  return lang === "tr" ? `Önerilen kayıt formu alanları: ${names.join(", ")}${suffix}.` : `Suggested registration fields: ${names.join(", ")}${suffix}.`;
}

export function formatComplianceSuggestions(draft: EventDraft, lang = "tr"): string {
  const suggestions = buildComplianceSuggestions(draft, lang);
  if (!suggestions.length) return lang === "tr" ? "KVKK için ek öneri yok." : "No extra compliance suggestions.";
  return lang === "tr" ? `KVKK / gizlilik önerileri: ${suggestions.join(", ")}.` : `Compliance suggestions: ${suggestions.join(", ")}.`;
}

export function buildWizardProgressMessage(draft: EventDraft, lang = "tr"): string {
  const missing = getMissingWizardFields(draft);
  const inferredSummary = formatInferredDraftSummary(draft, lang);
  const missingSummary = formatMissingFieldsList(missing, lang);
  const formSummary = formatSuggestedFormFields(draft.registrationFields, lang);
  const complianceSummary = formatComplianceSuggestions(draft, lang);
  const header = lang === "tr" ? `Şunları anladım: ${inferredSummary}` : `I understood: ${inferredSummary}`;
  const footer = missing.length === 0 ? (lang === "tr" ? "Taslak tamamlandı. Onaylarsanız oluşturacağım." : "The draft is complete. I will create it once you confirm.") : missingSummary;
  return `${header}\n${formSummary}\n${complianceSummary}\n${footer}`;
}

export function getMissingWizardFields(draft: EventDraft): EventWizardStep[] {
  const missing: EventWizardStep[] = [];
  if (!draft.name.trim()) missing.push("name");
  if (!draft.eventDate.trim()) missing.push("date");
  if (!draft.eventLocation.trim()) missing.push("location");
  if (!draft.eventDescription.trim()) missing.push("description");
  if (!draft.eventType.trim()) missing.push("type");
  if (!draft.visibility.trim()) missing.push("features");
  return missing;
}

export function nextWizardStepFromDraft(draft: EventDraft): EventWizardStep {
  if (!draft.name.trim()) return "name";
  if (!draft.eventDate.trim()) return "date";
  if (!draft.eventLocation.trim()) return "location";
  if (!draft.eventDescription.trim()) return "description";
  if (!draft.eventType.trim()) return "type";
  return "features";
}

// parseFeature: check occurrences of keywords and look for nearby negation/affirmation tokens
export function parseFeature(text: string, keywords: string[]): boolean | null {
  const t = compactText(text);
  if (!fuzzyAny(t, keywords)) return null;
  const tokens = tokenize(t);
  const negationTokens = ["hayir", "hayır", "yok", "olmamak", "olmasin", "olmasın", "iptal", "no", "not", "dont", "don't", "kapali", "kapalı", "kapat", "off"];
  const affirmativeTokens = ["evet", "olsun", "var", "yes", "enable", "aktif", "açık", "acik", "onayla", "onay"];

  // find indexes of any keyword matches
  for (let i = 0; i < tokens.length; i++) {
    for (const kw of keywords) {
      if (tokens[i] === kw || fuzzyIncludes(tokens[i], kw)) {
        // look backwards up to 3 tokens and forward up to 2 tokens for signals
        const windowStart = Math.max(0, i - 3);
        const windowEnd = Math.min(tokens.length - 1, i + 2);
        let foundNeg = false;
        let foundAff = false;
        for (let j = windowStart; j <= windowEnd; j++) {
          const tok = tokens[j];
          if (negationTokens.includes(tok)) foundNeg = true;
          if (affirmativeTokens.includes(tok)) foundAff = true;
        }
        if (foundNeg && !foundAff) return false;
        if (foundAff && !foundNeg) return true;
        // if both found, decide by closest distance
        if (foundNeg && foundAff) {
          // compute nearest distance to i
          let negDist = Infinity;
          let affDist = Infinity;
          for (let j = windowStart; j <= windowEnd; j++) {
            const tok = tokens[j];
            if (negationTokens.includes(tok)) negDist = Math.min(negDist, Math.abs(i - j));
            if (affirmativeTokens.includes(tok)) affDist = Math.min(affDist, Math.abs(i - j));
          }
          return affDist <= negDist;
        }
        // no clear modifiers: assume affirmative when keyword present as standalone
        return true;
      }
    }
  }
  return null;
}

export function extractFeatureFlags(text: string, current: EventDraft): EventDraft {
  const next: EventDraft = { ...current };
  const normalized = compactText(text);
  // mapping per requirements
type BooleanFeatureKey =
  | "certificateEnabled"
  | "checkinEnabled"
  | "ticketingEnabled"
  | "registrationEnabled"
  | "rafflesEnabled"
  | "gamificationEnabled";

const featureMap: Array<[BooleanFeatureKey, string[]]> = [
  ["certificateEnabled", ["sertifika", "certificate"]],
  ["checkinEnabled", ["checkin", "check-in", "qr", "yoklama", "giris", "giriş"]],
  ["ticketingEnabled", ["bilet", "ticket", "ödeme", "odeme", "payment", "ücret", "ucret"]],
  ["registrationEnabled", ["kayıt", "kayit", "registration", "register"]],
  ["rafflesEnabled", ["çekiliş", "cekilis", "raffle", "draw", "ödül", "odul"]],
  ["gamificationEnabled", ["oyunlaştırma", "oyunlastirma", "gamification", "rozet", "badge", "puan", "leaderboard"]],
];

for (const [key, keywords] of featureMap) {
  const result = parseFeature(normalized, keywords);

  if (result !== null) {
    next[key] = result;
  }
}

  // ensure registration fields preset
  if (next.registrationFields.length === 0) {
    next.registrationFields = buildSmartRegistrationFields(next.eventType);
  }

  return next;
}

export function extractEventHints(text: string, current: EventDraft = EMPTY_EVENT_DRAFT): EventDraft {
  const next = { ...current };
  const normalized = compactText(text);
  const range = extractDateRange(text);
  const date = range.date;
  const location = extractLocation(text);
  const eventType = extractType(text);
  const visibility = extractVisibility(text);
  const quota = extractRegistrationQuota(text);
  const scheduleHint = range.hint;

  if (date) next.eventDate = date;
  if (range.startTime) next.eventStartTime = range.startTime;
  if (range.endTime) next.eventEndTime = range.endTime;
  if (location) next.eventLocation = location;
  if (eventType) next.eventType = eventType;
  if (visibility) next.visibility = visibility;
  if (quota) {
    next.registrationQuota = quota;
    next.registrationQuotaEnabled = true;
  }
  if (scheduleHint) next.scheduleHint = scheduleHint;

  const withFeatures = extractFeatureFlags(normalized, next);
  if (withFeatures.registrationFields.length === 0) withFeatures.registrationFields = buildSmartRegistrationFields(withFeatures.eventType);
  return withFeatures;
}

export function deriveEventName(text: string): string {
  const normalized = compactText(text);
  const cleaned = normalized
    .replace(/\b(etkinlik|event|create|olustur\w*|yeni|new|setup|planla|hazirla|kur)\b/g, " ")
    .replace(/\b(certificate|sertifika|checkin|check-in|qr|ticket|bilet|payment|odeme|registration|register|kayit|quota|kota|kontenjan|limit|capacity|workshop|atolye|training|egitim|webinar|conference|konferans|zirve|summit|community|topluluk|raffle|cekilis|draw|gamification|rozet|badge|puan|leaderboard|seminar|panel|soylesi|talk|concert|konser|festival|online|zoom|teams|virtual|private|public|unlisted|acik|gizli|ozel|özel)\b/g, " ")
    .replace(/\b(ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik)\b/g, " ")
    .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, " ")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .replace(/\b\d{1,6}\s*(?:kisi|kişi|katilimci|katılımcı|kontenjan|kota|limit)\b/g, " ")
    .replace(/\b(?:in|at|@)\s+[a-z0-9\s-]{2,40}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length < 3) return "";
  if (/^(etkinlik|event|new event|yeni etkinlik)$/i.test(cleaned)) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function seedEventDraftFromText(text: string, fallback: EventDraft = EMPTY_EVENT_DRAFT): EventDraft {
  const hinted = extractEventHints(text, fallback);
  const derivedName = deriveEventName(text);
  return { ...hinted, name: hinted.name.trim() || derivedName };
}
