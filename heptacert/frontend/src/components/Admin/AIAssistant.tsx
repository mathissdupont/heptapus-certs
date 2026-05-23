"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, AlertCircle, Lightbulb } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { apiFetch, getToken } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  message: string;
  timestamp: string;
}

type EventWizardStep =
  | "idle"
  | "name"
  | "date"
  | "location"
  | "description"
  | "type"
  | "features"
  | "confirm";

interface EventDraft {
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

interface SuggestedRegistrationField {
  id: string;
  label: string;
  type: "text" | "textarea" | "number" | "tel" | "select" | "date" | "file";
  required: boolean;
  placeholder?: string;
  helper_text?: string;
  options?: Array<{ label: string; capacity?: number | null }>;
  selection_mode?: "single" | "multiple";
}

const EMPTY_EVENT_DRAFT: EventDraft = {
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

const CREATE_EVENT_INTENT_PATTERNS = [
  /\b(etkinlik|event)\s*(olustur\w*|create|add|yeni)\b/i,
  /\b(yeni)\s*(etkinlik|event)\b/i,
  /\bcreate\s*(an|a)?\s*event\b/i,
  /\bnew\s*event\b/i,
];

const NEGATION_PATTERNS = /\b(no|not|dont|don't|never|hayir|yok|istemiyorum|istemem|olmasin|kapali)\b/i;

function normalizePromptText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isCreateEventIntent(value: string): boolean {
  const normalized = normalizePromptText(value);
  return CREATE_EVENT_INTENT_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isAffirmative(value: string): boolean {
  const normalized = normalizePromptText(value);
  return /\b(ev|evet|yes|yeah|ok|okay|tamam|onay|olustur|create|go|devam)\b/i.test(normalized);
}

function isNegative(value: string): boolean {
  const normalized = normalizePromptText(value);
  return /\b(hayir|no|iptal|cancel|geri|dur|stop)\b/i.test(normalized);
}

function isSkipValue(value: string): boolean {
  const normalized = normalizePromptText(value);
  return /\b(atla|skip|gec|bilmiyorum|sonra|default|varsayilan)\b/i.test(normalized);
}

function compactText(value: string): string {
  return normalizePromptText(value).replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function singularizeWord(value: string): string {
  const word = compactText(value).split(/\s+/)[0] || "";
  if (!word) return "";
  return word.replace(/(?:lar|ler|lari|leri|lari|leri)$/i, "").trim();
}

function tokenize(value: string): string[] {
  return compactText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previousRow = new Array(right.length + 1).fill(0).map((_, index) => index);
  for (let rowIndex = 1; rowIndex <= left.length; rowIndex += 1) {
    const currentRow = [rowIndex];
    for (let columnIndex = 1; columnIndex <= right.length; columnIndex += 1) {
      const insertCost = currentRow[columnIndex - 1] + 1;
      const deleteCost = previousRow[columnIndex] + 1;
      const replaceCost = previousRow[columnIndex - 1] + (left[rowIndex - 1] === right[columnIndex - 1] ? 0 : 1);
      currentRow.push(Math.min(insertCost, deleteCost, replaceCost));
    }
    for (let columnIndex = 0; columnIndex < previousRow.length; columnIndex += 1) {
      previousRow[columnIndex] = currentRow[columnIndex];
    }
  }
  return previousRow[right.length];
}

function fuzzyIncludes(text: string, keyword: string): boolean {
  const normalizedText = compactText(text);
  const normalizedKeyword = compactText(keyword);
  if (!normalizedText || !normalizedKeyword) return false;
  if (normalizedText.includes(normalizedKeyword)) return true;

  const tokens = tokenize(normalizedText);
  return tokens.some((token) => {
    if (token === normalizedKeyword) return true;
    if (token.startsWith(normalizedKeyword) || normalizedKeyword.startsWith(token)) return true;
    const maxDistance = Math.max(1, Math.floor(Math.min(token.length, normalizedKeyword.length) / 3));
    return levenshteinDistance(token, normalizedKeyword) <= maxDistance;
  });
}

function fuzzyAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => fuzzyIncludes(text, keyword));
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

function parseTurkishMonthDate(value: string): string {
  const normalized = compactText(value);
  const match = normalized.match(/\b(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/);
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

function extractDateRange(text: string): { date: string; startTime: string; endTime: string; hint: string } {
  const normalized = compactText(text);
  const date = normalizeEventDate(text) || parseTurkishMonthDate(text);
  const timeMatches = Array.from(normalized.matchAll(/\b(\d{1,2})(?::|\.|\s)(\d{2})\b/g)).map((match) => `${String(match[1]).padStart(2, "0")}:${match[2]}`);
  const rangeMatch = normalized.match(/\b(\d{1,2})(?::|\.|\s)(\d{2})\s*[-–to]{1,3}\s*(\d{1,2})(?::|\.|\s)(\d{2})\b/i);
  const startTime = rangeMatch ? `${String(rangeMatch[1]).padStart(2, "0")}:${rangeMatch[2]}` : (timeMatches[0] || "");
  const endTime = rangeMatch ? `${String(rangeMatch[3]).padStart(2, "0")}:${rangeMatch[4]}` : (timeMatches[1] || "");
  const hintParts: string[] = [];
  if (date) hintParts.push(date);
  if (startTime && endTime) hintParts.push(`${startTime}-${endTime}`);
  else if (startTime) hintParts.push(startTime);
  return { date, startTime, endTime, hint: hintParts.join(" ").trim() };
}

function extractLocation(text: string): string {
  const normalized = compactText(text);
  const locationMarkers = ["ankara", "istanbul", "izmir", "bursa", "antalya", "adana", "eskişehir", "eskisehir", "konya", "trabzon", "online", "zoom", "teams", "meet", "hybrid"];
  const directHit = locationMarkers.find((marker) => fuzzyIncludes(normalized, marker));
  if (directHit) return directHit;

  const atMatch = normalized.match(/\b(?:in|at|@)\s+([a-z0-9\s-]{2,40})/i);
  if (atMatch) {
    return atMatch[1].trim().split(/\s+/).slice(0, 4).join(" ");
  }

  return "";
}

function isLikelyEventText(value: string): boolean {
  const normalized = compactText(value);
  return fuzzyAny(normalized, ["etkinlik", "event", "oluştur", "olustur", "create", "yeni", "kayıt", "kayit", "konferans", "seminar", "workshop", "eğitim", "egitim", "webinar", "online", "konser", "kulüp", "kulup", "club"]) || /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(normalized) || /\b\d{1,2}\s+[a-zçğıöşü]+\s+\d{4}\b/.test(normalized);
}

function extractType(text: string): string {
  const normalized = compactText(text);
  if (fuzzyAny(normalized, ["workshop", "atolye"])) return "workshop";
  if (fuzzyAny(normalized, ["training", "egitim", "kurs"])) return "training";
  if (fuzzyAny(normalized, ["seminar", "panel", "soylesi", "talk"])) return "seminar";
  if (fuzzyAny(normalized, ["webinar", "online", "canli", "zoom", "teams", "virtual"])) return "online_event";
  if (fuzzyAny(normalized, ["conference", "konferans", "zirve", "summit"])) return "conference";
  if (fuzzyAny(normalized, ["concert", "konser", "müzik", "muzik", "sahne", "festival"])) return "concert";
  if (fuzzyAny(normalized, ["club", "kulup", "topluluk", "community", "sosyal"])) return "club_event";
  if (fuzzyAny(normalized, ["custom", "ozel", "özel", "special"])) return "custom";
  if (fuzzyAny(normalized, ["meetup", "topluluk", "community"])) return "club_event";
  return "certificate_event";
}

function applyEventTypePreset(draft: EventDraft, sourceText: string): EventDraft {
  const normalized = compactText(sourceText);
  const next = { ...draft };
  const mentions = (keywords: string[]) => fuzzyAny(normalized, keywords);

  if (draft.eventType === "online_event") {
    if (!mentions(["certificate", "sertifika"])) next.certificateEnabled = false;
    if (!mentions(["checkin", "check-in", "qr", "yoklama"])) next.checkinEnabled = false;
    if (!mentions(["ticket", "bilet", "odeme", "payment", "ucret"])) next.ticketingEnabled = false;
    if (!mentions(["approval", "onay", "approve"])) next.requiresApproval = false;
  }

  if (draft.eventType === "concert" || draft.eventType === "club_event") {
    if (!mentions(["certificate", "sertifika"])) next.certificateEnabled = false;
    if (!mentions(["ticket", "bilet", "odeme", "payment", "ucret"])) next.ticketingEnabled = true;
    if (!mentions(["checkin", "check-in", "qr", "yoklama"])) next.checkinEnabled = true;
  }

  if (draft.eventType === "workshop" || draft.eventType === "training") {
    if (!mentions(["certificate", "sertifika"])) next.certificateEnabled = true;
    if (!mentions(["checkin", "check-in", "qr", "yoklama"])) next.checkinEnabled = true;
    if (!mentions(["registration_closed", "kayıt kapalı", "kayit kapali"])) next.registrationEnabled = true;
  }

  if (draft.eventType === "seminar" || draft.eventType === "conference") {
    if (!mentions(["certificate", "sertifika"])) next.certificateEnabled = true;
    if (!mentions(["checkin", "check-in", "qr", "yoklama"])) next.checkinEnabled = true;
  }

  return next;
}

function buildSmartRegistrationFields(eventType: string): SuggestedRegistrationField[] {
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

function buildComplianceSuggestions(draft: EventDraft, lang: string): string[] {
  const suggestions: string[] = [];
  const privacyNeeded = draft.registrationEnabled || draft.requireEmailVerification || draft.registrationQuotaEnabled;

  if (privacyNeeded) {
    suggestions.push(
      lang === "tr"
        ? "KVKK/aydınlatma metni ekleyin"
        : "Add a KVKK/privacy notice"
    );
    suggestions.push(
      lang === "tr"
        ? "Kayıt formuna açık rıza kutusu ekleyin"
        : "Add a consent checkbox to the registration form"
    );
    suggestions.push(
      lang === "tr"
        ? "Veri işleme amacı ve saklama süresini belirtin"
        : "State the purpose of processing and retention period"
    );
  }

  if (draft.visibility === "public" || draft.visibility === "unlisted") {
    suggestions.push(
      lang === "tr"
        ? "Gizlilik politikası / şartlar bağlantısı ekleyin"
        : "Add a privacy policy / terms link"
    );
  }

  if (draft.eventType === "online_event" || draft.eventType === "conference" || draft.eventType === "workshop") {
    suggestions.push(
      lang === "tr"
        ? "İletişim ve bilgilendirme onaylarını ayrı tutun"
        : "Keep contact and information consent separate"
    );
  }

  return Array.from(new Set(suggestions));
}

function extractVisibility(text: string): EventDraft["visibility"] | "" {
  const normalized = compactText(text);
  if (fuzzyAny(normalized, ["public", "acik", "herkese acik", "gozukecek", "listelensin"])) return "public";
  if (fuzzyAny(normalized, ["private", "ozel", "gizli", "sadece ben", "hidden"])) return "private";
  if (fuzzyAny(normalized, ["unlisted", "liste disi", "linkle", "direk link", "link ile"])) return "unlisted";
  return "";
}

function extractRegistrationQuota(text: string): string {
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

function extractScheduleHint(text: string): string {
  const range = extractDateRange(text);
  return range.hint;
}

function extractRegistrationClosed(text: string): boolean | null {
  const normalized = compactText(text);
  if (fuzzyAny(normalized, ["kayıt kapalı", "kayit kapali", "registration closed", "basvuru kapali", "başvuru kapalı"])) return true;
  if (fuzzyAny(normalized, ["kayıt açık", "kayit acik", "registration open", "basvuru acik", "başvuru açık"])) return false;
  return null;
}

function extractRequireEmailVerification(text: string): boolean | null {
  const normalized = compactText(text);
  if (fuzzyAny(normalized, ["email verification", "mail dogrulama", "e-posta dogrulama", "dogrulama gerekli", "verification required"])) return true;
  if (fuzzyAny(normalized, ["email verification kapali", "dogrulama isteme", "no verification", "verification off", "dogrulama kapali"])) return false;
  return null;
}

function extractRequiresApproval(text: string): boolean | null {
  const normalized = compactText(text);
  if (fuzzyAny(normalized, ["onayli", "approval", "approve", "manuel onay", "moderation", "beklemede onay"])) return true;
  if (fuzzyAny(normalized, ["onaysiz", "approval off", "otomatik onay", "no approval"])) return false;
  return null;
}

function extractFeatureFlags(text: string, current: EventDraft): EventDraft {
  const normalized = compactText(text);
  const next = { ...current };

  const setByKeywords = (target: keyof EventDraft, keywords: string[], defaultValue: boolean) => {
    if (!fuzzyAny(normalized, keywords)) return;
    (next[target] as boolean) = !NEGATION_PATTERNS.test(normalized) ? true : false;
    if (!fuzzyAny(normalized, ["yes", "evet", "tabi", "tabii", "lazim", "gerekli", "gerek"])) {
      (next[target] as boolean) = !NEGATION_PATTERNS.test(normalized) ? true : defaultValue;
    }
  };

  setByKeywords("certificateEnabled", ["certificate", "sertifika", "sertifikali"], current.certificateEnabled);
  setByKeywords("checkinEnabled", ["checkin", "check-in", "qr", "yoklama", "giris"], current.checkinEnabled);
  setByKeywords("ticketingEnabled", ["ticket", "bilet", "odeme", "payment", "ucret"], current.ticketingEnabled);
  setByKeywords("registrationEnabled", ["registration", "register", "kayit"], current.registrationEnabled);
  setByKeywords("rafflesEnabled", ["raffle", "cekilis", "draw", "odul"], current.rafflesEnabled);
  setByKeywords("gamificationEnabled", ["gamification", "rozet", "badge", "puan", "leaderboard"], current.gamificationEnabled);

  return next;
}

function extractEventHints(text: string, current: EventDraft = EMPTY_EVENT_DRAFT): EventDraft {
  const normalized = compactText(text);
  const next = { ...current };
  const range = extractDateRange(text);
  const date = range.date;
  const location = extractLocation(text);
  const eventType = extractType(text);
  const visibility = extractVisibility(text);
  const quota = extractRegistrationQuota(text);
  const registrationClosed = extractRegistrationClosed(text);
  const requireEmailVerification = extractRequireEmailVerification(text);
  const requiresApproval = extractRequiresApproval(text);
  const scheduleHint = extractScheduleHint(text);

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
  if (registrationClosed !== null) next.registrationClosed = registrationClosed;
  if (requireEmailVerification !== null) next.requireEmailVerification = requireEmailVerification;
  if (requiresApproval !== null) next.requiresApproval = requiresApproval;
  const withTypePresets = applyEventTypePreset(next, normalized);
  const withFeatures = extractFeatureFlags(normalized, withTypePresets);
  if (withFeatures.registrationFields.length === 0) {
    withFeatures.registrationFields = buildSmartRegistrationFields(withFeatures.eventType);
  }
  return withFeatures;
}

function shouldTreatTextAsWizardSeed(text: string): boolean {
  const normalized = compactText(text);
  return fuzzyAny(normalized, ["event", "etkinlik", "olustur", "oluştur", "create", "yeni", "kur", "planla", "hazirla", "setup", "register", "kayıt", "kayit", "konferans", "workshop", "webinar", "seminar", "eğitim", "egitim"])
    || /\b\d{1,2}\s+[a-zçğıöşü]+\s+\d{4}\b/i.test(normalized)
    || /\b\d{4}-\d{2}-\d{2}\b/i.test(normalized)
    || fuzzyAny(normalized, ["ankara", "istanbul", "izmir", "online", "zoom", "teams", "kontenjan", "kota", "gizli", "public", "private", "unlisted", "sertifika", "checkin", "bilet"]);
}

function nextWizardStepFromDraft(draft: EventDraft): EventWizardStep {
  if (!draft.name.trim()) return "name";
  if (!draft.eventDate.trim()) return "date";
  if (!draft.eventLocation.trim()) return "location";
  if (!draft.eventDescription.trim()) return "description";
  if (!draft.eventType.trim()) return "type";
  return "features";
}

function getMissingWizardFields(draft: EventDraft): EventWizardStep[] {
  const missing: EventWizardStep[] = [];
  if (!draft.name.trim()) missing.push("name");
  if (!draft.eventDate.trim()) missing.push("date");
  if (!draft.eventLocation.trim()) missing.push("location");
  if (!draft.eventDescription.trim()) missing.push("description");
  if (!draft.eventType.trim()) missing.push("type");
  if (!draft.visibility.trim()) missing.push("features");
  return missing;
}

function formatInferredDraftSummary(draft: EventDraft, lang: string): string {
  const inferred: string[] = [];
  if (draft.name.trim()) inferred.push(lang === "tr" ? `Ad: ${draft.name}` : `Name: ${draft.name}`);
  if (draft.eventDate.trim()) inferred.push(lang === "tr" ? `Tarih: ${draft.eventDate}` : `Date: ${draft.eventDate}`);
  if (draft.eventStartTime.trim() || draft.eventEndTime.trim()) {
    inferred.push(lang === "tr" ? `Saat: ${draft.eventStartTime || "?"}${draft.eventEndTime ? `-${draft.eventEndTime}` : ""}` : `Time: ${draft.eventStartTime || "?"}${draft.eventEndTime ? `-${draft.eventEndTime}` : ""}`);
  }
  if (draft.eventLocation.trim()) inferred.push(lang === "tr" ? `Konum: ${draft.eventLocation}` : `Location: ${draft.eventLocation}`);
  if (draft.eventType.trim()) inferred.push(lang === "tr" ? `Tip: ${draft.eventType}` : `Type: ${draft.eventType}`);
  if (draft.visibility.trim()) inferred.push(lang === "tr" ? `Görünürlük: ${draft.visibility}` : `Visibility: ${draft.visibility}`);
  if (draft.registrationQuotaEnabled && draft.registrationQuota.trim()) {
    inferred.push(lang === "tr" ? `Kontenjan: ${draft.registrationQuota}` : `Quota: ${draft.registrationQuota}`);
  }
  if (draft.registrationClosed) inferred.push(lang === "tr" ? "Kayıt kapalı" : "Registration closed");
  if (!draft.requireEmailVerification) inferred.push(lang === "tr" ? "E-posta doğrulama kapalı" : "Email verification off");
  if (draft.requiresApproval) inferred.push(lang === "tr" ? "Onay gerekiyor" : "Approval required");
  if (draft.registrationFields.length > 0) inferred.push(lang === "tr" ? `Önerilen form alanları: ${draft.registrationFields.length}` : `Suggested form fields: ${draft.registrationFields.length}`);
  return inferred.length > 0
    ? inferred.join(", ")
    : lang === "tr"
      ? "Henüz net bir alan yakalayamadım."
      : "I haven't inferred any clear fields yet.";
}

function formatMissingFieldsList(missing: EventWizardStep[], lang: string): string {
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
  const readable = missing.map((step) => labels[step]).filter(Boolean);
  if (!readable.length) {
    return lang === "tr" ? "Eksik alan kalmadı." : "No fields are missing.";
  }
  return lang === "tr"
    ? `Eksik kalanlar: ${readable.join(", ")}.`
    : `Still missing: ${readable.join(", ")}.`;
}

function formatSuggestedFormFields(fields: SuggestedRegistrationField[], lang: string): string {
  if (!fields.length) {
    return lang === "tr" ? "Önerilen kayıt formu alanı yok." : "No suggested registration fields.";
  }
  const names = fields.slice(0, 4).map((field) => field.label);
  const suffix = fields.length > 4 ? (lang === "tr" ? ` ve ${fields.length - 4} alan daha` : ` and ${fields.length - 4} more`) : "";
  return lang === "tr"
    ? `Önerilen kayıt formu alanları: ${names.join(", ")}${suffix}.`
    : `Suggested registration fields: ${names.join(", ")}${suffix}.`;
}

function formatComplianceSuggestions(draft: EventDraft, lang: string): string {
  const suggestions = buildComplianceSuggestions(draft, lang);
  if (!suggestions.length) {
    return lang === "tr" ? "KVKK için ek öneri yok." : "No extra compliance suggestions.";
  }
  return lang === "tr"
    ? `KVKK / gizlilik önerileri: ${suggestions.join(", ")}.`
    : `Compliance suggestions: ${suggestions.join(", ")}.`;
}

function buildWizardProgressMessage(draft: EventDraft, lang: string): string {
  const missing = getMissingWizardFields(draft);
  const inferredSummary = formatInferredDraftSummary(draft, lang);
  const missingSummary = formatMissingFieldsList(missing, lang);
  const formSummary = formatSuggestedFormFields(draft.registrationFields, lang);
  const complianceSummary = formatComplianceSuggestions(draft, lang);

  const header = lang === "tr"
    ? `Şunları anladım: ${inferredSummary}`
    : `I understood: ${inferredSummary}`;

  const footer = missing.length === 0
    ? (lang === "tr"
      ? "Taslak tamamlandı. Onaylarsanız oluşturacağım."
      : "The draft is complete. I will create it once you confirm.")
    : missingSummary;

  return `${header}\n${formSummary}\n${complianceSummary}\n${footer}`;
}

function summarizeMissingFields(step: EventWizardStep, lang: string): string {
  switch (step) {
    case "name":
      return lang === "tr" ? "Etkinlik adı eksik." : "Event name is missing.";
    case "date":
      return lang === "tr" ? "Tarih eksik." : "Date is missing.";
    case "location":
      return lang === "tr" ? "Konum eksik." : "Location is missing.";
    case "description":
      return lang === "tr" ? "Açıklama eksik." : "Description is missing.";
    case "type":
      return lang === "tr" ? "Etkinlik tipi eksik." : "Event type is missing.";
    default:
      return lang === "tr" ? "Özellikler gözden geçirilmeli." : "Features should be reviewed.";
  }
}

function deriveEventName(text: string): string {
  const normalized = compactText(text);
  const cleaned = normalized
    .replace(/\b(etkinlik|event|create|olustur\w*|yeni|new|setup|planla|hazirla|kur)\b/g, " ")
    .replace(/\b(certificate|sertifika|checkin|check-in|qr|ticket|bilet|payment|odeme|registration|register|kayit|quota|kota|kontenjan|limit|capacity|workshop|atolye|training|egitim|webinar|conference|konferans|zirve|summit|community|topluluk|raffle|cekilis|draw|gamification|rozet|badge|puan|leaderboard|seminar|panel|soylesi|talk|concert|konser|festival|online|zoom|teams|virtual|private|public|unlisted|acik|gizli|ozel|özel)\b/g, " ")
    .replace(/\b(ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik)\b/g, " ")
    .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, " ")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .replace(/\b\d{1,6}\s*(?:kisi|kişi|katilimci|katılımcı|kontenjan|kota|limit)\b/g, " ")
    .replace(/\b(?:in|at|@)\s+[a-z0-9\s-]{2,40}\b/g, " ")
    .replace(/\b[a-z0-9\s-]{2,40}\s+(?:sehrinde|şehrinde|ilinde|ilcesinde|ilçesinde|city|şehirde)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length < 3) {
    return "";
  }

  if (/^(etkinlik|event|new event|yeni etkinlik)$/i.test(cleaned)) {
    return "";
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function seedEventDraftFromText(text: string, fallback: EventDraft = EMPTY_EVENT_DRAFT): EventDraft {
  const hinted = extractEventHints(text, fallback);
  const derivedName = deriveEventName(text);
  return {
    ...hinted,
    name: hinted.name.trim() || derivedName,
  };
}

async function seedEventDraftFromCurrentEvent(eventId: number): Promise<EventDraft | null> {
  try {
    const response = await apiFetch(`/admin/events/${eventId}`);
    const event = await response.json();
    const config = event?.config && typeof event.config === "object" ? event.config : {};
    const registrationFields = Array.isArray((config as any).registration_fields) ? (config as any).registration_fields : [];
    const derivedName = `${String(event?.name || "Etkinlik").trim()} Kopyası`;
    return {
      ...createInitialDraft(),
      name: derivedName,
      eventDate: String(event?.event_date || ""),
      eventStartTime: "",
      eventEndTime: "",
      eventLocation: String(event?.event_location || ""),
      eventDescription: String(event?.event_description || ""),
      eventType: String(event?.event_type || "certificate_event"),
      visibility: (config as any).visibility || "unlisted",
      registrationClosed: Boolean(event?.registration_closed ?? (config as any).registration_closed ?? false),
      requireEmailVerification: Boolean(event?.require_email_verification ?? (config as any).require_email_verification ?? true),
      registrationQuotaEnabled: Boolean(event?.registration_quota_enabled ?? (config as any).registration_quota_enabled ?? ((event?.registration_quota ?? (config as any).registration_quota) != null)),
      registrationQuota: String(event?.registration_quota ?? (config as any).registration_quota ?? ""),
      requiresApproval: Boolean(event?.requires_approval ?? false),
      scheduleHint: "",
      registrationFields,
      certificateEnabled: Boolean(event?.certificate_enabled ?? true),
      checkinEnabled: Boolean(event?.checkin_enabled ?? true),
      ticketingEnabled: Boolean(event?.ticketing_enabled ?? false),
      registrationEnabled: Boolean(event?.registration_enabled ?? true),
      rafflesEnabled: Boolean(event?.raffles_enabled ?? false),
      gamificationEnabled: Boolean(event?.gamification_enabled ?? false),
      organizerPrivacyNoticeEnabled: Boolean((config as any).organizer_privacy_notice_enabled ?? event?.organizer_privacy_notice_enabled ?? false),
      organizerPrivacyNoticeText: String((config as any).organizer_privacy_notice_text ?? event?.organizer_privacy_notice_text ?? ""),
      showCrossBorderTransferNotice: Boolean((config as any).show_cross_border_transfer_notice ?? event?.show_cross_border_transfer_notice ?? true),
      requireCrossBorderTransferConsent: Boolean((config as any).require_cross_border_transfer_consent ?? event?.require_cross_border_transfer_consent ?? true),
      dataControllerName: String((config as any).data_controller_name ?? event?.data_controller_name ?? ""),
      dataControllerContactEmail: String((config as any).data_controller_contact_email ?? event?.data_controller_contact_email ?? ""),
      dataRetentionNote: String((config as any).data_retention_note ?? event?.data_retention_note ?? ""),
      kvkkConsentRequired: Boolean((config as any).kvkk_consent_required ?? event?.kvkk_consent_required ?? false),
      kvkkConsentText: String((config as any).kvkk_consent_text ?? event?.kvkk_consent_text ?? ""),
    };
  } catch {
    return null;
  }
}

function normalizeEventDate(value: string): string {
  const input = value.trim();
  if (!input || isSkipValue(input)) return "";

  const isoMatch = input.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const dottedMatch = input.match(/\b(\d{2})[./-](\d{2})[./-](\d{4})\b/);
  if (dottedMatch) {
    return `${dottedMatch[3]}-${dottedMatch[2]}-${dottedMatch[1]}`;
  }

  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return input;
}

function normalizeEventType(value: string): string {
  const text = normalizePromptText(value);
  if (/\b(workshop|atolye)\b/i.test(text)) return "workshop";
  if (/\b(training|egitim)\b/i.test(text)) return "training";
  if (/\b(webinar|online|canli|zoom|teams|virtual)\b/i.test(text)) return "online_event";
  if (/\b(conference|konferans|zirve|summit)\b/i.test(text)) return "conference";
  if (/\b(community|topluluk|meetup)\b/i.test(text)) return "club_event";
  if (/\b(seminar|panel|soylesi|talk)\b/i.test(text)) return "seminar";
  if (/\b(concert|konser|festival|sahne|muzik)\b/i.test(text)) return "concert";
  if (/\b(ozel|özel|custom|special)\b/i.test(text)) return "custom";
  return "certificate_event";
}

function normalizeFeatureFlags(value: string, fallback: EventDraft = EMPTY_EVENT_DRAFT): EventDraft {
  const text = normalizePromptText(value);
  if (isSkipValue(text)) {
    return { ...fallback };
  }

  const matches = (keywords: string[]): boolean => keywords.some((keyword) => text.includes(keyword));
  const enabled = (keywords: string[], defaultValue: boolean): boolean => {
    if (matches(keywords)) {
      return !NEGATION_PATTERNS.test(text);
    }
    return defaultValue;
  };

  return {
    ...fallback,
    certificateEnabled: enabled(["certificate", "sertifika"], fallback.certificateEnabled),
    checkinEnabled: enabled(["checkin", "check-in", "qr", "giris"], fallback.checkinEnabled),
    ticketingEnabled: enabled(["ticket", "bilet", "payment", "odeme"], fallback.ticketingEnabled),
    registrationEnabled: enabled(["registration", "register", "kayit"], fallback.registrationEnabled),
    rafflesEnabled: enabled(["raffle", "cekilis", "draw"], fallback.rafflesEnabled),
    gamificationEnabled: enabled(["gamification", "rozet", "badge", "puan", "leaderboard"], fallback.gamificationEnabled),
  };
}

function buildFeatureSummary(draft: EventDraft, lang: string): string {
  const features = [
    ["certificateEnabled", lang === "tr" ? "Sertifika" : "Certificate"],
    ["checkinEnabled", lang === "tr" ? "Check-in" : "Check-in"],
    ["registrationEnabled", lang === "tr" ? "Kayıt" : "Registration"],
    ["ticketingEnabled", lang === "tr" ? "Biletleme" : "Ticketing"],
    ["rafflesEnabled", lang === "tr" ? "Çekiliş" : "Raffle"],
    ["gamificationEnabled", lang === "tr" ? "Oyunlaştırma" : "Gamification"],
  ]
    .filter(([key]) => draft[key as keyof EventDraft])
    .map(([, label]) => label);

  return features.length > 0
    ? features.join(", ")
    : lang === "tr"
      ? "Varsayılan özellikler"
      : "Default features";
}

function createInitialDraft(): EventDraft {
  return { ...EMPTY_EVENT_DRAFT };
}

function formatDraftSummary(draft: EventDraft, lang: string): string {
  const lines = [lang === "tr" ? `Ad: ${draft.name}` : `Name: ${draft.name}`];
  if (draft.eventDate) lines.push(lang === "tr" ? `Tarih: ${draft.eventDate}` : `Date: ${draft.eventDate}`);
  if (draft.eventLocation) lines.push(lang === "tr" ? `Konum: ${draft.eventLocation}` : `Location: ${draft.eventLocation}`);
  if (draft.eventDescription) lines.push(lang === "tr" ? `Açıklama: ${draft.eventDescription}` : `Description: ${draft.eventDescription}`);
  lines.push(lang === "tr" ? `Tip: ${draft.eventType}` : `Type: ${draft.eventType}`);
  lines.push(lang === "tr" ? `Görünürlük: ${draft.visibility}` : `Visibility: ${draft.visibility}`);
  if (draft.registrationQuotaEnabled && draft.registrationQuota) {
    lines.push(lang === "tr" ? `Kontenjan: ${draft.registrationQuota}` : `Quota: ${draft.registrationQuota}`);
  }
  lines.push(lang === "tr" ? `Kayıt kapalı: ${draft.registrationClosed ? "Evet" : "Hayır"}` : `Registration closed: ${draft.registrationClosed ? "Yes" : "No"}`);
  lines.push(lang === "tr" ? `E-posta doğrulama: ${draft.requireEmailVerification ? "Zorunlu" : "Kapalı"}` : `Email verification: ${draft.requireEmailVerification ? "Required" : "Off"}`);
  lines.push(lang === "tr" ? `Onay gereksinimi: ${draft.requiresApproval ? "Evet" : "Hayır"}` : `Requires approval: ${draft.requiresApproval ? "Yes" : "No"}`);
  lines.push(lang === "tr" ? `Özellikler: ${buildFeatureSummary(draft, lang)}` : `Features: ${buildFeatureSummary(draft, lang)}`);
  return lines.join("\n");
}

function getEventPromptForStep(step: EventWizardStep, draft: EventDraft, lang: string): string {
  switch (step) {
    case "name":
      return lang === "tr"
        ? "Etkinliğin adını yazın."
        : "Write the event name.";
    case "date":
      return lang === "tr"
        ? "Tarihi YYYY-MM-DD formatında yazın ya da atlamak için 'atla' yazın."
        : "Write the date in YYYY-MM-DD format, or type 'skip' to leave it blank.";
    case "location":
      return lang === "tr"
        ? "Etkinlik nerede yapılacak? İsterseniz 'atla' yazabilirsiniz."
        : "Where will the event take place? You can type 'skip' if you want.";
    case "description":
      return lang === "tr"
        ? "Kısa bir açıklama yazın. İsterseniz 'atla' yazabilirsiniz."
        : "Write a short description. You can type 'skip' if you want.";
    case "type":
      return lang === "tr"
        ? "Etkinlik tipi ne olsun? Konferans, workshop, eğitim, webinar veya başka bir şey yazabilirsiniz."
        : "What type should it be? You can write conference, workshop, training, webinar, or something else.";
    case "features":
      return lang === "tr"
        ? "Hangi özellikler açık olsun? Sertifika, check-in, kayıt, biletleme, çekiliş, oyunlaştırma yazabilirsiniz. İsterseniz 'varsayılan' yazın."
        : "Which features should be enabled? You can mention certificate, check-in, registration, ticketing, raffle, or gamification. Type 'default' if you want the usual setup.";
    case "confirm":
      return lang === "tr"
        ? `Taslak hazır. Onaylıyor musunuz?\n\n${formatDraftSummary(draft, lang)}\n\nEvet için 'evet', vazgeçmek için 'hayır' yazın.`
        : `Draft ready. Do you approve it?\n\n${formatDraftSummary(draft, lang)}\n\nType 'yes' to create it, or 'no' to cancel.`;
    default:
      return "";
  }
}

// FAQ Bilgi Tabanı
const FAQ_DATABASE = {
  tr: [
    { keywords: ["form", "alan", "registration", "field", "kayıt"], answer: "Form alanlarını eklemek için Etkinlik Ayarları > Kayıt Formu bölümüne gidin. '+Alan Ekle' butonunu tıklayarak yeni alanlar oluşturabilirsiniz. Her alan için türünü (metin, e-posta, tarih vb.), etiketini ve yardımcı metni belirleyebilirsiniz. Alan tipleri: Kısa Metin, E-posta, Telefon, Sayı, Tarih, Çoktan Seçmeli, Dosya Yükleme gibi seçenekler bulunmaktadır." },
    { keywords: ["sertifika", "certificate", "template", "şablon"], answer: "Sertifika şablonlarını Editor sayfasında özelleştirebilirsiniz. Şablonlara arka plan, logoları, metinleri ve tarzları ekleyebilirsiniz. Önizleme alanında değişiklikleri hemen görebilirsiniz. Sertifika yayınlanmadan önce test katılımcılarla kontrol edebilirsiniz." },
    { keywords: ["attendee", "katılımcı", "participant", "member", "üye"], answer: "Katılımcılar bölümünde etkinliğinize kayıtlı tüm üyeleri görebilirsiniz. Katılımcı durumunu (kayıtlı, geldimi, gelmedi) değiştirebilir, sertifika verişini yönetebilir veya toplu işlemler yapabilirsiniz. Ayrıca katılımcı bilgilerini dışa aktarabilirsiniz." },
    { keywords: ["email", "posta", "notification", "bildirim", "smtp"], answer: "E-posta ayarlarını Etkinlik Ayarları > E-posta bölümünde yapılandırabılırsinız. Otomatik sertifika e-postalarını özelleştirebilir, SMTP ayarlarını belirleyebilirsiniz. E-posta şablonlarını kişiselleştirebilir ve zamanlama seçeneklerini ayarlayabilirsiniz." },
    { keywords: ["raffle", "çekiliş", "draw", "prize", "ödül"], answer: "Çekiliş oluşturmak için Çekiliş sayfasına gidin. Ödüller ekleyin, katılımcı kurallarını belirleyin (kayıt yapanlar, sertifika alanlar, vb.) ve otomatik olarak kazananları seçtirebilirsiniz. Çekiliş tarihi ve saatini önceden planlayabilirsiniz." },
    { keywords: ["survey", "anket", "question", "soru"], answer: "Anketleri Etkinlik Ayarları > Anket bölümünde oluşturabilirsiniz. Soruları ekleyin, türlerini seçin (metin, çoktan seçme, çoklu seçim, vb.) ve katılımcılar tarafından cevaplanmasını sağlayabilirsiniz. Anket sonuçlarını detaylı olarak analiz edebilirsiniz." },
    { keywords: ["session", "oturum", "schedule", "timetable", "program"], answer: "Oturumları Oturumlar sayfasından ekleyebilirsiniz. Her oturumun tarihini, saatini, başlığını ve konuşmacısını belirleyebilirsiniz. Check-in sistemi otomatik olarak oturumlara göre çalışır. Katılımcılar etkinlik sayfasından oturumlara kaydolabilir." },
    { keywords: ["analytics", "istatistik", "report", "data", "grafik"], answer: "Analytics bölümünde etkinliğinizin kapsamlı istatistiklerini görebilirsiniz. Kayıt sayıları, katılımcı dağılımı, sertifika durumu, cinsiyete göre dağılım ve daha fazlasını analiz edebilirsiniz. Raporları Excel olarak dışa aktarabilirsiniz." },
    { keywords: ["domain", "custom", "özel", "alan adı", "url"], answer: "Etkinliğinize özel bir domain atamak için Etkinlik Ayarları > Domain bölümüne gidin. Kendi alan adınızı bağlayabilir veya HeptaCert tarafından sağlanan alt domain'i kullanabilirsiniz. Domain değişikliği DNS ayarlarından sonra yayına alınabilir." },
    { keywords: ["kvkk", "gizlilik metni", "aydınlatma metni", "açık rıza", "veri işleme", "privacy policy"], answer: "KVKK için Etkinlik Ayarları > Kayıt Formu bölümünde aydınlatma metni, açık rıza kutusu ve gizlilik bağlantısı eklemenizi öneririz. Toplanan verilerin amacı, saklama süresi ve veri sorumlusu bilgisini net yazın. Gerekirse yasal metni destek ekibiyle birlikte özelleştirin." },
    { keywords: ["checkin", "check-in", "giriş", "kontrol"], answer: "Check-in sistemi etkinlik günü katılımcı kaydını hızlandırır. QR kod veya kontrol listesi kullanarak katılımcıları işaretleyebilirsiniz. Check-in panelinden katılımcı durumunu gerçek zamanlı takip edebilirsiniz." },
    { keywords: ["gamification", "badge", "rozet", "puan", "leaderboard"], answer: "Oyunlaştırma özelliğini etkinleştirerek katılımcıları rozetler, puanlar ve liderlik tablosuyla motive edebilirsiniz. Farklı aktivitelere (oturum katılımı, anket cevaplama, vb.) puan atayabilirsiniz." },
    { keywords: ["branding", "tema", "renk", "logo", "görünüm"], answer: "Etkinlik Ayarları > Branding bölümünde kurumsal kimliğinizi ayarlayabilirsiniz. Logo, tema renkleri ve yazı tiplerini özelleştirebilirsiniz. Mobil ve masaüstü uyumluluğunu otomatik olarak sağlanır." },
    { keywords: ["payment", "ödeme", "ticket", "bilet", "fiyat"], answer: "Etkinliğiniz için ödeme sistemi kurmak için Etkinlik Ayarları > Ödeme bölümüne gidin. Bilet fiyatlandırması, erken kuş indirimi ve grup indirimlerini ayarlayabilirsiniz. Stripe ve diğer ödeme yöntemiyle entegredir." },
    { keywords: ["yorum", "comment", "moderasyon", "moderation"], answer: "Etkinlik sayfasına gelen yorumları yönetmek için Ayarlar > Yorumlar sekmesine gidin. Yorumları onaylayabilir, gizleyebilir veya raporlanmış olanları inceleyebilirsiniz. Her yorum için üye bilgisini ve tarihini görebilirsiniz." },
    { keywords: ["görünürlük", "visibility", "private", "public", "gizli"], answer: "Etkinliğin görünürlüğünü Ayarlar > Genel bölümünde değiştirebilirsiniz. Özel: Listede görünmez. Liste dışı: Sadece doğrudan bağlantı. Herkese açık: Keşif ekranında görünür. Mevcut kayıt linkleriniz etkilenmez." },
    { keywords: ["banner", "görsel", "image", "kapak", "cover"], answer: "Etkinlik bannerını Ayarlar > Banner sekmesinden yükleyebilirsiniz. Önerilen boyut: 1200×400 piksel. JPG, PNG veya WebP formatları desteklenmektedir. Banner, kayıt sayfasında ve etkinlik başlığında görüntülenir." },
    { keywords: ["toplu", "bulk", "export", "dışa", "aktarma"], answer: "Katılımcı listesini, sertifikaları ve anket sonuçlarını Excel formatında dışa aktarabilirsiniz. Katılımcılar bölümünden 'Dışa Aktar' butonunu kullanabilirsiniz. Toplu e-posta göndermek için E-posta bölümüne gidin." },
    { keywords: ["qr", "kod", "kodu", "tarama", "scan"], answer: "Check-in sırasında QR kod taratarak katılımcıları hızlıca işaretleyebilirsiniz. Her katılımcının benzersiz QR kodu vardır. Check-in sayfasında mobil cihazınızı kamera olarak kullanabilir veya kodu manuel olarak girebilirsiniz." },
    { keywords: ["hata", "error", "sorun", "problem", "bug"], answer: "Bir sorunla karşılaştıysanız, tarayıcı konsolunu (F12) açarak hata mesajlarını görebilirsiniz. Sayfayı yenileyin ve işlemi tekrarlayın. Sorun devam ederse, AI Asistan'dan 'Destek Talebi Aç' butonuyla destek ekibimize ulaşabilirsiniz." },
    { keywords: ["oturum", "session", "login", "logout", "giriş"], answer: "Oturum açmak için e-posta ve şifrenizi girebilir veya magic link kullanabilirsiniz. İki faktörlü kimlik doğrulama aktif ise, doğrulama kodunuzu girmeniz gerekir. Oturum otomatik olarak belirli süre sonra kapanabilir - sayfayı yenileyerek tekrar giriş yapabilirsiniz." },
    { keywords: ["sertifika", "certificate", "verme", "issue", "teslim"], answer: "Katılımcılara sertifika vermek için Sertifikalar bölümüne gidin. Katılımcıları seçin ve 'Sertifika Ver' butonunu tıklayın. Toplu olarak birden fazla katılımcıya sertifika verebilirsiniz. Otomatik e-posta göndermesini Ayarlar > E-posta'da ayarlayabilirsiniz." },
    { keywords: ["analiz", "analysis", "istatistik", "statistics", "dashboard"], answer: "İleri Analitik sayfasında etkinliğinizin detaylı verilerini görebilirsiniz. Kayıt trendi, cinsiyet dağılımı, zaman dilimine göre katılımcılar ve daha fazla grafikleri görüntüleyebilirsiniz. Raporları tarih aralığına göre filtreleyebilirsiniz." },
    { keywords: ["destek", "support", "yardım", "help", "asistan"], answer: "Sorularınız için bu AI Asistan'ı kullanabilirsiniz. Eğer cevap bulamazsanız 'Destek Talebi Aç' butonuyla destek ekibimize doğrudan yazabilirsiniz. Talebiniz oluşturulduktan sonra ekip sizi en kısa sürede çözüme ulaştıracaktır." },
    { keywords: ["webhook", "webhook setup", "integration", "api"], answer: "Webhook'ları Admin Ayarları > Webhook'lar bölümünde yönetebilirsiniz. Etkinlik tamamlandığında veya katılımcı kaydı yapıldığında otomatik olarak harici sistemlere veri gönderebilirsiniz. Webhook'ların test etmek için 'Test' butonunu kullanabilirsiniz." },
    { keywords: ["api", "api key", "geliştirici", "developer"], answer: "API anahtarlarını Admin > API Anahtarları'ndan oluşturabilirsiniz. Programlı olarak etkinlik verilerine erişmek için kullanabilirsiniz. Her API anahtarı için izinleri belirleyebilir ve manuel olarak iptal edebilirsiniz. API dokümantasyonu belgelerimizde mevcuttur." },
    { keywords: ["csv", "import", "içe aktarma", "yükleme"], answer: "Katılımcıları toplu olarak CSV dosyasından içe aktarabilirsiniz. Katılımcılar bölümünde 'CSV İçe Aktar' butonunu kullanın. CSV dosyası e-posta, ad, telefon gibi alanları içermelidir. Satırda hata varsa düzeltip tekrar yüklemeyi deneyin." },
    { keywords: ["sosyal", "social", "twitter", "facebook", "linkedin"], answer: "Etkinliğinizi sosyal medyada paylaşmak için Ayarlar > Sosyal Medya bölümüne gidin. Sosyal medya hesaplarınızı bağlayabilir ve otomatik paylaşım ayarlarını yapabilirsiniz. Paylaşım sırasında özel mesaj ve hashtag ekleyebilirsiniz." },
    { keywords: ["profil", "member profile", "üye profili", "hesap"], answer: "Üye profil sayfasında kişi bilgileri, rozetler, katıldığı etkinlikler ve indirilen sertifikalar gösterilir. Profili özelleştirmek için Profilim bölümüne gidin. Şifre, iki faktörlü kimlik doğrulama ve e-posta tercihlerini buradan yönetebilirsiniz." },
    { keywords: ["organizasyon", "organization", "şirket", "kurumsal"], answer: "Organizasyon ayarlarını Organizasyon Ayarları bölümünde yapılandırabilirsiniz. Logo, işletme adı, vergi numarası ve iletişim bilgilerini buradan güncelleyebilirsiniz. Organizasyonunuza kullanıcı ekleyebilir ve rolleri belirleyebilirsiniz." },
    { keywords: ["izin", "permission", "role", "yetki", "admin"], answer: "Kullanıcıların rollerini Organizasyon > Kullanıcılar'da belirleyebilirsiniz. Admin, Editor, Viewer gibi roller vardır. Her rol farklı izinlere sahiptir. Etkinlik düzeyinde de ayrıca izin ayarlaması yapabilirsiniz." },
    { keywords: ["mobilyapp", "mobile", "telefon", "uygulama"], answer: "HeptaCert mobil uygulaması iOS ve Android'de kullanılabilir. Check-in, katılımcı yönetimi ve hızlı raporlama için mobil uygulamayı kullanabilirsiniz. Masaüstü sürümüyle tüm verileriniz senkronize olur." },
    { keywords: ["cache", "hız", "performance", "optimize"], answer: "Uygulamanın performansını optimize etmek için tarayıcı cache'ini temizleyebilirsiniz. Ekran sayfada saygın olan veriler otomatik olarak cache'lenir. Çok yavaş hissediyorsanız, tarayıcı ayarlarından cache ve cookie'leri temizleyin." },
    { keywords: ["sso", "single sign-on", "oauth", "login"], answer: "Kurumsal SSO (Single Sign-On) desteğimiz bulunmaktadır. SAML veya OAuth 2.0 ile entegrasyon yapabilirsiniz. Bu özellik kurumsal planlarla sunulmaktadır. Detaylı bilgi için destek talebinde bulunabilirsiniz." },
    { keywords: ["white label", "beyaz etiket", "kendi markanız"], answer: "White Label (beyaz etiket) özelliğiyle tüm uygulamayı kendi markanız altında sunabilirsiniz. Domain, renk, logo ve e-posta tasarımını özelleştirebilirsiniz. Bu özellik Premium + planla mevcut olacaktır." },
    { keywords: ["gdpr", "privacy", "gizlilik", "privacy policy"], answer: "Uygulamada GDPR uyumluluğu sağlanmıştır. Katılımcıların verilerini silebilir ve ihraç edebilirsiniz. Gizlilik politikasını ve hizmet şartlarını özelleştirebilirsiniz. Detaylı bilgi için yasal dokümantasyona bakabilirsiniz." },
    { keywords: ["backup", "yedek", "veri tabanı", "recovery"], answer: "Verileriniz günlük olarak otomatik yedeklenir. İhtiyaç durumunda veri recovery talebinde bulunabilirsiniz. Eski sürümlere geri dönmek için destek ekibine başvurabilirsiniz." },
    { keywords: ["sms", "kısa mesaj", "telefon", "sms bildirimi"], answer: "SMS bildirimleri seçim etkinlikler için etkinleştirilebilir. Katılımcılara SMS ile check-in ve sertifika bildirimlerini gönderebilirsiniz. SMS kredi satın almak için faturalandırma bölümüne gidin." },
    { keywords: ["timezone", "saat dilimi", "zaman", "bölge"], answer: "Etkinlik saat dilimini Ayarlar > Genel bölümünde belirleyebilirsiniz. Tüm zamanlar seçilen saat dilimine göre gösterilir. Katılımcılar kendi saat dilimlerinde bildirimleri alırlar." },
    { keywords: ["calendar", "takvim", "google calendar", "sync"], answer: "Google Calendar ile sinkronizasyon yapabilirsiniz. Etkinlik ve oturumlar otomatik olarak takvime eklenir. Katılımcılarınız sertifikalar için geri sayım bildirimleri alabilir." },
    { keywords: ["slack", "discord", "telegram", "notification"], answer: "Slack, Discord ve Telegram'a bildirimler gönderebilirsiniz. Webhook ayarlarından notification kanalını seçebilirsiniz. Yeni kayıt, sertifika verme vs. olaylar otomatik olarak bildirilir." },
    { keywords: ["rate limit", "hız sınırı", "api limit"], answer: "API requests için hız sınırları uygulanmaktadır. Free plan: 100 req/min, Pro: 1000 req/min, Enterprise: özel limit. Rate limit'e ulaştıysanız, bir dakika bekleyin veya plannızı yükseltin." },
    { keywords: ["custom field", "özel alan", "alan ekleme"], answer: "Kayıt formunda istediğiniz kadar özel alan ekleyebilirsiniz. Alan türü, doğrulama kuralı ve bağımlılık ayarlarını belirleyebilirsiniz. Özel alanlar katılımcı profil sayfasında da görüntülenir." },
    { keywords: ["audience", "segment", "hedef", "segmentasyon"], answer: "Katılımcıları farklı özelliklere göre segmente edebilirsiniz. Segments'e göre farklı e-posta ve bildirim gönderebilirsiniz. Check-in ve sertifika verme işlemlerini segment bazında yapabilirsiniz." },
    { keywords: ["filter", "ara", "arama", "filtreleme"], answer: "Katılımcı listesinde ad, e-posta, telefon ve özel alan değerlerine göre arama yapabilirsiniz. Duruma göre filtreleme (kayıtlı, geldimi, gelmedi) da yapabilirsiniz. Filtreler kaydedilir ve sonraki oturumlarda erişilir." },
    { keywords: ["duplicate", "kopya", "etkinlik kopyası", "klonlama"], answer: "Etkinlik kopyalamak için etkinlik listesinde sağ tıklayıp 'Kopyala' seçeneğini kullanın. Tüm ayarları, form alanlarını ve şablonları kopyalayabilirsiniz. Katılımcılar kopyalanmaz, sadece ayarlar aktarılır." },
    { keywords: ["notification", "bildirim", "uyarı", "alert"], answer: "Bildirim tercihlerini Profil > Bildirimler'de ayarlayabilirsiniz. E-posta, push ve SMS bildirimlerini açıp kapatabilirsiniz. Hangi olaylar için bildirim almak istediğinizi seçebilirsiniz." },
    { keywords: ["language", "dil", "çoklu dil", "localization"], answer: "Uygulamaya kayıtlı katılımcılar tercih ettikleri dilde bildirimleri alırlar. Türkçe ve İngilizce'nin yanı sıra diğer dillerle genişlemeyi planlıyoruz. Admin paneli şu anda Türkçe ve İngilizce'de mevcuttur." },
    { keywords: ["2fa", "iki faktör", "authenticator", "google authenticator"], answer: "İki faktörlü kimlik doğrulamayı Profil > Güvenlik'te etkinleştirebilirsiniz. Google Authenticator veya SMS ile doğrulama yapabilirsiniz. Yedek kodları güvenli bir yerde saklayın, oturum açamayabilirsiniz." },
    { keywords: ["veri silme", "veri dışa aktarma", "export data", "gdpr"], answer: "Kişisel verilerinizi istediğiniz zaman dışa aktarabilir veya silebilirsiniz. Dışa aktarma işlemi ZIP dosyasıyla yapılır. Silme işlemini 30 gün sonra geri alamazsınız, lütfen emin olun." },
    { keywords: ["sertifika linksi", "sertifika url", "sertifika paylaş"], answer: "Sertifika URL'sini paylaşarak başkalarını gösterebilirsiniz. Sertifika linkinden doğrulama kodu ile gerçekliği kontrol edilebilir. Sertifika paylaşımını Ayarlar'da açıp kapatabilirsiniz." },
    { keywords: ["template library", "şablon kütüphanesi", "tasarım"], answer: "Hazır sertifika şablonları kütüphanesinden seçip kullanabilirsiniz. Her şablon tamamen özelleştirilebilir durumdadır. Sık kullanılan şablonları favoriler'e ekleyebilirsiniz." },
    { keywords: ["css", "özel css", "custom css", "styling"], answer: "Gelişmiş CSS özelleştirmesi için özel CSS bölümünü kullanabilirsiniz. Etkinlik sayfasının görünümünü tamamen değiştirebilirsiniz. CSS bilgisi gereklidir, hatalı CSS sayfayı bozabilir." },
    { keywords: ["dark mode", "karanlık mod", "tema"], answer: "Admin paneli temayı sistem ayarlarınızdan seçer. Karanlık mod desteklenmekte olup otomatik aktif olur. Sayfanın belirli kısımlarında açık tema kullanılabilir." },
    { keywords: ["responsive", "mobil uyumlu", "ekran boyutu"], answer: "Tüm sayfalar mobil uyumlu olarak tasarlanmıştır. Telefon, tablet ve bilgisayarlarda düzgün göründüğü kontrol edilmiştir. Açılış hızını optimize etmek için modern teknolojiler kullanılmaktadır." }
  ],
  en: [
    { keywords: ["form", "field", "registration", "input"], answer: "To add form fields, go to Event Settings > Registration Form. Click '+Add Field' to create new fields. You can set the field type (text, email, date, etc.), label, and helper text. Available types: Short Text, Email, Phone, Number, Date, Multiple Choice, File Upload and more." },
    { keywords: ["certificate", "template", "cert"], answer: "Customize certificate templates in the Editor page. Add backgrounds, logos, text, and styling. See changes in real-time in the preview area. Test certificates with sample attendees before publishing." },
    { keywords: ["attendee", "participant", "member", "user"], answer: "View all registered members in the Attendees section. Change status (registered, attended, no-show), manage certificates, or perform bulk operations. Export attendee data to Excel format." },
    { keywords: ["email", "mail", "notification", "smtp"], answer: "Configure email settings in Event Settings > Email. Customize automatic certificate emails and SMTP configuration. Personalize email templates and adjust scheduling options." },
    { keywords: ["raffle", "draw", "prize", "winner"], answer: "Create raffles in the Raffles page. Add prizes, set participant rules, and automatically select winners. Schedule raffle draws in advance." },
    { keywords: ["survey", "questionnaire", "question", "poll"], answer: "Create surveys in Event Settings > Survey. Add questions, choose types (text, multiple choice, etc.), and analyze results. Survey data is securely stored." },
    { keywords: ["session", "schedule", "timetable", "timing"], answer: "Add sessions from the Sessions page. Set date, time, title, and speaker. Check-in works based on sessions. Participants can register for sessions." },
    { keywords: ["analytics", "statistics", "report", "data", "metrics"], answer: "View comprehensive statistics in the Analytics section. Analyze registration trends, demographics, certificate status, and more. Export reports to Excel." },
    { keywords: ["domain", "custom", "url"], answer: "Assign a custom domain in Event Settings > Domain. Connect your own domain or use HeptaCert subdomain. Changes take effect after DNS settings." },
    { keywords: ["checkin", "check-in", "attendance"], answer: "The check-in system speeds up participant registration. Check in using QR codes or a checklist. Track participant status in real-time." },
    { keywords: ["gamification", "badge", "points", "leaderboard"], answer: "Enable gamification to motivate participants with badges and points. Assign points to different activities." },
    { keywords: ["branding", "theme", "color", "logo"], answer: "Customize brand identity in Event Settings > Branding. Personalize logo, colors, and typography. Mobile and desktop compatibility ensured." },
    { keywords: ["payment", "ticket", "pricing"], answer: "Set up payments in Event Settings > Payment. Configure pricing, early bird discounts, and group discounts. Integrated with Stripe and other methods." },
    { keywords: ["comment", "moderasyon", "moderation"], answer: "Manage comments in Settings > Comments. Approve, hide, or review reported comments. View member info and timestamps for each comment." },
    { keywords: ["visibility", "private", "public"], answer: "Control event visibility in Settings > General. Private: Not listed. Unlisted: Direct link only. Public: Listed in discover. Current links still work." },
    { keywords: ["banner", "image", "cover"], answer: "Upload banner in Settings > Banner. Recommended: 1200×400 pixels. JPG, PNG, WebP supported. Banner shows on registration and event pages." },
    { keywords: ["bulk", "export", "data"], answer: "Export attendees, certificates, and survey results to Excel. Use 'Export' button in Attendees section. Bulk email from Email section." },
    { keywords: ["qr", "code", "scan"], answer: "Scan QR codes during check-in to mark attendees. Each has a unique code. Use camera or enter manually on check-in page." },
    { keywords: ["error", "problem", "issue", "troubleshooting"], answer: "Open browser console (F12) to see error messages. Refresh page and retry. If problem persists, create support ticket for help." },
    { keywords: ["login", "logout", "authentication"], answer: "Sign in with email/password or magic link. If 2FA enabled, enter verification code. Session may auto-expire - refresh to sign in again." },
    { keywords: ["certificate", "issuance", "certificate award"], answer: "Issue certificates in Certificates section. Select attendees and click 'Award'. Bulk award multiple attendees. Configure auto-email in Email settings." },
    { keywords: ["advanced analytics", "detailed", "insights"], answer: "View detailed analytics on Advanced Analytics page. See registration trends, demographics, and custom metrics. Filter by date range and export." },
    { keywords: ["support", "help", "questions"], answer: "Use this AI Assistant for questions. If not answered, create support ticket. Our team responds as soon as possible." },
    { keywords: ["webhook", "integration", "api"], answer: "Manage webhooks in Admin > Webhooks. Send data to external systems on events. Test webhooks in the interface." },
    { keywords: ["api key", "developer", "access"], answer: "Create API keys in Admin > API Keys. Use to access event data programmatically. Set permissions per key. Revoke anytime. See documentation for details." },
    { keywords: ["csv", "import", "bulk import"], answer: "Import attendees from CSV in Attendees section. Click 'CSV Import'. File should contain email, name, phone, etc. Fix errors and retry if needed." },
    { keywords: ["social", "twitter", "facebook", "sharing"], answer: "Share events on social media in Settings > Social Media. Connect accounts and set auto-sharing. Add custom messages and hashtags." },
    { keywords: ["profile", "account", "personal"], answer: "View profile with badges, events, and certificates. Customize in My Profile. Manage password, 2FA, and notification preferences." },
    { keywords: ["organization", "company", "account"], answer: "Configure organization in Organization Settings. Update logo, name, tax ID, and contact info. Add users and set roles." },
    { keywords: ["permission", "role", "admin"], answer: "Set user roles in Organization > Users. Roles: Admin, Editor, Viewer with different permissions. Also set event-level permissions." },
    { keywords: ["mobile", "app", "smartphone"], answer: "HeptaCert mobile app available on iOS and Android. Use for check-in, attendee management, and quick reports. Syncs with desktop." },
    { keywords: ["performance", "speed", "optimization"], answer: "Clear browser cache for optimal performance. Data automatically cached. If slow, clear cache and cookies." },
    { keywords: ["sso", "oauth", "enterprise"], answer: "Enterprise SSO support available via SAML or OAuth 2.0. Available in enterprise plans. Contact support for setup." },
    { keywords: ["white label", "branding", "customization"], answer: "White label feature allows your branding throughout. Customize domain, colors, logo, email design. Available in Premium+ plans." },
    { keywords: ["gdpr", "privacy", "data"], answer: "GDPR compliant. Delete or export participant data anytime. Customize privacy and terms. See legal docs for details." },
    { keywords: ["backup", "disaster", "recovery"], answer: "Data automatically backed up daily. Request recovery if needed. Can restore to previous versions. Contact support." },
    { keywords: ["sms", "text", "notification"], answer: "Enable SMS notifications for select events. Send check-in and certificate notifications. Buy SMS credits in billing." },
    { keywords: ["timezone", "time", "schedule"], answer: "Set event timezone in Settings > General. All times shown in this timezone. Participants get notifications in their timezone." },
    { keywords: ["calendar", "sync", "google"], answer: "Sync with Google Calendar. Events and sessions auto-added. Participants get countdown reminders for certificates." },
    { keywords: ["slack", "discord", "chat"], answer: "Send notifications to Slack, Discord, Telegram via webhooks. Choose notification channel. Auto-notify on registrations, certificates, etc." },
    { keywords: ["rate limit", "api", "usage"], answer: "API rate limits: Free 100/min, Pro 1000/min, Enterprise custom. Hit limit? Wait a minute or upgrade plan." },
    { keywords: ["custom field", "field"], answer: "Add unlimited custom fields to registration. Set type, validation, and dependencies. Fields appear on participant profile." },
    { keywords: ["audience", "segment", "group"], answer: "Segment attendees by properties. Send emails/notifications by segment. Perform check-in and certificates per segment." },
    { keywords: ["filter", "search", "find"], answer: "Search attendees by name, email, phone, custom fields. Filter by status (registered, attended, no-show). Saved filters." },
    { keywords: ["duplicate", "clone", "copy"], answer: "Copy event via right-click menu. All settings and fields copied. Attendees not copied, only structure." },
    { keywords: ["notification", "alert", "setting"], answer: "Configure notifications in Profile > Notifications. Enable/disable email, push, SMS. Choose which events trigger notifications." },
    { keywords: ["language", "localization", "translation"], answer: "Interface available in Turkish and English. Admin panel in both languages. Participants get notifications in preferred language." },
    { keywords: ["2fa", "authenticator", "security"], answer: "Enable 2FA in Profile > Security. Use Google Authenticator or SMS. Save backup codes in safe place." },
    { keywords: ["data delete", "export", "download"], answer: "Export or delete personal data anytime. Export as ZIP file. Deletion permanent after 30 days, non-reversible." },
    { keywords: ["certificate link", "share"], answer: "Share certificate URL with others. Can verify authenticity with verification code. Control sharing in Settings." },
    { keywords: ["template", "design", "library"], answer: "Choose from certificate template library. Each fully customizable. Save favorites for quick access." },
    { keywords: ["custom css", "styling"], answer: "Use custom CSS for advanced styling. Fully customize event pages. Requires CSS knowledge - errors can break layout." },
    { keywords: ["dark mode", "theme"], answer: "Admin follows system theme. Dark mode auto-enabled if set. Certain page areas use light theme." },
    { keywords: ["responsive", "mobile", "tablet"], answer: "All pages mobile responsive. Works perfectly on phones, tablets, and desktops. Optimized for speed on all devices." }
  ]
};

export default function AIAssistant() {
  const { lang } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      message: lang === "tr" ? "Merhaba! Size etkinlik oluşturma ve yönetiminde yardımcı olmak için buradayım. Ne sorunuz var?" : "Hello! I'm here to help you with event creation and management. What questions do you have?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent)?.detail;
        const text = detail == null ? "" : String(detail);
        if (!text) return;
        setInput((prev) => (prev && prev.trim() ? `${prev} ${text}` : text));
        // focus input
        setTimeout(() => inputRef.current?.focus(), 50);
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener("ai-assistant-insert", handler as EventListener);
    const clearHandler = (e: Event) => {
      try {
        // Reset messages to initial assistant greeting and clear wizard
        setMessages([
          {
            role: "assistant",
            message: lang === "tr" ? "Merhaba! Size etkinlik oluşturma ve yönetiminde yardımcı olmak için buradayım. Ne sorunuz var?" : "Hello! I'm here to help you with event creation and management. What questions do you have?",
            timestamp: new Date().toISOString(),
          },
        ]);
        resetEventWizard();
        setInput("");
      } catch {
        // ignore
      }
    };
    window.addEventListener("ai-assistant-clear", clearHandler as EventListener);
    return () => window.removeEventListener("ai-assistant-insert", handler as EventListener);
  }, []);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [eventWizardStep, setEventWizardStep] = useState<EventWizardStep>("idle");
  const [eventDraft, setEventDraft] = useState<EventDraft>(createInitialDraft());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const pushAssistantMessage = (message: string) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        message,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const resetEventWizard = () => {
    setEventWizardStep("idle");
    setEventDraft(createInitialDraft());
  };

  const startEventWizard = async (seedText = "") => {
    setShowSupportForm(false);
    const normalizedSeed = compactText(seedText);
    let nextDraft = seedText ? seedEventDraftFromText(seedText) : createInitialDraft();

    if (seedText && fuzzyAny(normalizedSeed, ["copy", "clone", "duplicate", "kopyala", "kopya", "çoğalt", "cogalt", "aynısı", "ayni si", "bu etkinlik"])) {
      const currentEventId = getCurrentEventId();
      if (currentEventId) {
        const cloned = await seedEventDraftFromCurrentEvent(currentEventId);
        if (cloned) {
          nextDraft = cloned;
          nextDraft.name = `${nextDraft.name || "Etkinlik"} - Kopya`;
        }
      }
    }

    setEventDraft(nextDraft);
    const nextStep = nextWizardStepFromDraft(nextDraft);
    setEventWizardStep(nextStep);
    if (seedText) {
      pushAssistantMessage(buildWizardProgressMessage(nextDraft, lang));
    }
    if (nextStep === "confirm") {
      pushAssistantMessage(getEventPromptForStep("confirm", nextDraft, lang));
      return;
    }
    pushAssistantMessage(getEventPromptForStep(nextStep, nextDraft, lang));
  };

  const submitEventDraft = async (draft: EventDraft) => {
    let createDraft = { ...draft };
    const scheduleHint = draft.scheduleHint.trim() || [draft.eventDate, draft.eventStartTime, draft.eventEndTime].filter(Boolean).join(" ").trim();

    if (!createDraft.name || !createDraft.name.trim()) {
      const lastUser = messages.slice().reverse().find((m) => m.role === "user")?.message || "";
      const derived = deriveEventName(lastUser) || `Yeni Etkinlik ${new Date().toISOString().slice(0, 10)}`;
      pushAssistantMessage(
        lang === "tr"
          ? `Uyarı: Etkinlik adı eksik olduğu için "${derived}" olarak kullanılacak. İsterseniz iptal edip yeni bir ad girin.`
          : `Warning: event name missing, using "${derived}" as fallback. Cancel if you want to set a different name.`
      );
      createDraft = { ...createDraft, name: derived };
    }
    const registrationFields = draft.registrationFields.length > 0 ? draft.registrationFields : buildSmartRegistrationFields(draft.eventType);
    const createResponse = await apiFetch("/admin/events", {
      method: "POST",
      body: JSON.stringify({
        name: createDraft.name,
        template_image_url: "placeholder",
        config: {
          visibility: draft.visibility,
          ai_assistant_schedule_hint: scheduleHint || undefined,
          registration_fields: registrationFields,
          organizer_privacy_notice_enabled: draft.organizerPrivacyNoticeEnabled,
          organizer_privacy_notice_text: draft.organizerPrivacyNoticeText || undefined,
          show_cross_border_transfer_notice: draft.showCrossBorderTransferNotice,
          require_cross_border_transfer_consent: draft.requireCrossBorderTransferConsent,
          data_controller_name: draft.dataControllerName || undefined,
          data_controller_contact_email: draft.dataControllerContactEmail || undefined,
          data_retention_note: draft.dataRetentionNote || undefined,
          kvkk_consent_required: draft.kvkkConsentRequired,
          kvkk_consent_text: draft.kvkkConsentText || undefined,
          ai_assistant_populated_kvkk: true,
        },
        event_type: createDraft.eventType,
        certificate_enabled: createDraft.certificateEnabled,
        checkin_enabled: createDraft.checkinEnabled,
        ticketing_enabled: createDraft.ticketingEnabled,
        registration_enabled: createDraft.registrationEnabled,
        raffles_enabled: createDraft.rafflesEnabled,
        gamification_enabled: createDraft.gamificationEnabled,
        requires_approval: createDraft.requiresApproval,
      }),
    });

    const created = await createResponse.json();

    const patchPayload: Record<string, any> = {
      event_date: draft.eventDate || null,
      event_location: draft.eventLocation || null,
      event_description: draft.eventDescription || null,
      visibility: draft.visibility,
      require_email_verification: draft.requireEmailVerification,
      registration_closed: draft.registrationClosed,
      registration_quota_enabled: draft.registrationQuotaEnabled,
      registration_quota: draft.registrationQuotaEnabled && draft.registrationQuota.trim() ? Number(draft.registrationQuota) : null,
      requires_approval: draft.requiresApproval,
      event_banner_url: null,
    };

    if (draft.eventType && draft.eventType !== "certificate_event") {
      patchPayload.event_type = draft.eventType;
    }

    if (patchPayload.event_date || patchPayload.event_location || patchPayload.event_description || patchPayload.event_type) {
      await apiFetch(`/admin/events/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify(patchPayload),
      });
    }

    await apiFetch(`/admin/events/${created.id}/config`, {
      method: "PUT",
      body: JSON.stringify({
        visibility: draft.visibility,
        ai_assistant_schedule_hint: scheduleHint || undefined,
        registration_fields: registrationFields,
        registration_quota_enabled: draft.registrationQuotaEnabled,
        registration_quota: draft.registrationQuotaEnabled && draft.registrationQuota.trim() ? Number(draft.registrationQuota) : undefined,
        registration_closed: draft.registrationClosed,
        require_email_verification: draft.requireEmailVerification,
        requires_approval: draft.requiresApproval,
        organizer_privacy_notice_enabled: draft.organizerPrivacyNoticeEnabled,
        organizer_privacy_notice_text: draft.organizerPrivacyNoticeText || undefined,
        show_cross_border_transfer_notice: draft.showCrossBorderTransferNotice,
        require_cross_border_transfer_consent: draft.requireCrossBorderTransferConsent,
        data_controller_name: draft.dataControllerName || undefined,
        data_controller_contact_email: draft.dataControllerContactEmail || undefined,
        data_retention_note: draft.dataRetentionNote || undefined,
        kvkk_consent_required: draft.kvkkConsentRequired,
        kvkk_consent_text: draft.kvkkConsentText || undefined,
        ai_assistant_populated_kvkk: true,
      }),
    });

    return created;
  };

  const handleEventWizardInput = async (currentInput: string) => {
    const value = currentInput.trim();
    const hintedDraft = seedEventDraftFromText(currentInput, eventDraft);

    if (eventWizardStep === "name" && hintedDraft.name.trim()) {
      const nextStep = nextWizardStepFromDraft(hintedDraft);
      setEventDraft(hintedDraft);
      setEventWizardStep(nextStep);
      pushAssistantMessage(buildWizardProgressMessage(hintedDraft, lang));
      if (nextStep === "confirm") {
        pushAssistantMessage(getEventPromptForStep("confirm", hintedDraft, lang));
      } else {
        pushAssistantMessage(getEventPromptForStep(nextStep, hintedDraft, lang));
      }
      return true;
    }

    if (eventWizardStep === "idle") {
      return false;
    }

    if (isNegative(value) && eventWizardStep === "confirm") {
      pushAssistantMessage(lang === "tr" ? "Tamam, etkinlik oluşturmayı iptal ettim. İsterseniz yeniden başlayabiliriz." : "Okay, I canceled the event creation. We can start again anytime.");
      resetEventWizard();
      return true;
    }

    if (eventWizardStep === "confirm") {
      if (!isAffirmative(value)) {
        pushAssistantMessage(lang === "tr" ? "Onay için 'evet' yazın, iptal etmek için 'hayır' yazın." : "Type 'yes' to create it, or 'no' to cancel.");
        return true;
      }

      setLoading(true);
      try {
        const created = await submitEventDraft(eventDraft);
        pushAssistantMessage(
          lang === "tr"
            ? `✅ Etkinlik oluşturuldu: ${created.name} (ID: ${created.id}). İsterseniz şimdi detaylarını geliştirebiliriz.`
            : `✅ Event created: ${created.name} (ID: ${created.id}). We can refine the details next if you want.`
        );
        resetEventWizard();
      } catch (error: any) {
        pushAssistantMessage(error?.message || (lang === "tr" ? "Etkinlik oluşturulamadı. Lütfen tekrar deneyin." : "I couldn't create the event. Please try again."));
      } finally {
        setLoading(false);
      }
      return true;
    }

    if (!value) {
      pushAssistantMessage(getEventPromptForStep(eventWizardStep, eventDraft, lang));
      return true;
    }

    if (eventWizardStep === "name") {
      const nextDraft = { ...hintedDraft, name: hintedDraft.name.trim() || value };
      setEventDraft(nextDraft);
      const nextStep = nextWizardStepFromDraft(nextDraft);
      setEventWizardStep(nextStep);
      pushAssistantMessage(buildWizardProgressMessage(nextDraft, lang));
      pushAssistantMessage(getEventPromptForStep(nextStep, nextDraft, lang));
      return true;
    }

    if (eventWizardStep === "date") {
      const normalizedDate = normalizeEventDate(value);
      const altDate = parseTurkishMonthDate(value);
      const finalDate = normalizedDate || altDate;
      if (finalDate && !/^\d{4}-\d{2}-\d{2}$/.test(finalDate)) {
        pushAssistantMessage(lang === "tr" ? "Tarihi anlayamadım. Lütfen YYYY-MM-DD formatında yazın ya da 'atla' yazın." : "I couldn't parse the date. Please use YYYY-MM-DD or type 'skip'.");
        return true;
      }

      const nextDraft = { ...hintedDraft, eventDate: finalDate };
      setEventDraft(nextDraft);
      const nextStep = nextWizardStepFromDraft(nextDraft);
      setEventWizardStep(nextStep);
      pushAssistantMessage(buildWizardProgressMessage(nextDraft, lang));
      pushAssistantMessage(getEventPromptForStep(nextStep, nextDraft, lang));
      return true;
    }

    if (eventWizardStep === "location") {
      const nextDraft = { ...hintedDraft, eventLocation: isSkipValue(value) ? "" : (extractLocation(value) || value) };
      setEventDraft(nextDraft);
      const nextStep = nextWizardStepFromDraft(nextDraft);
      setEventWizardStep(nextStep);
      pushAssistantMessage(buildWizardProgressMessage(nextDraft, lang));
      pushAssistantMessage(getEventPromptForStep(nextStep, nextDraft, lang));
      return true;
    }

    if (eventWizardStep === "description") {
      const nextDraft = { ...hintedDraft, eventDescription: isSkipValue(value) ? "" : value };
      setEventDraft(nextDraft);
      const nextStep = nextWizardStepFromDraft(nextDraft);
      setEventWizardStep(nextStep);
      pushAssistantMessage(buildWizardProgressMessage(nextDraft, lang));
      pushAssistantMessage(getEventPromptForStep(nextStep, nextDraft, lang));
      return true;
    }

    if (eventWizardStep === "type") {
      const nextDraft = { ...hintedDraft, eventType: extractType(value) || normalizeEventType(value) };
      setEventDraft(nextDraft);
      const nextStep = nextWizardStepFromDraft(nextDraft);
      setEventWizardStep(nextStep);
      pushAssistantMessage(buildWizardProgressMessage(nextDraft, lang));
      pushAssistantMessage(getEventPromptForStep(nextStep, nextDraft, lang));
      return true;
    }

    if (eventWizardStep === "features") {
      const nextDraft = extractFeatureFlags(value, hintedDraft);
      setEventDraft(nextDraft);
      setEventWizardStep("confirm");
      pushAssistantMessage(buildWizardProgressMessage(nextDraft, lang));
      pushAssistantMessage(getEventPromptForStep("confirm", nextDraft, lang));
      return true;
    }

    return false;
  };

  const findAnswer = (userMessage: string): string | null => {
    const faqDb = FAQ_DATABASE[lang as keyof typeof FAQ_DATABASE];
    const lowerMsg = userMessage.toLowerCase();

    for (const faq of faqDb) {
      if (faq.keywords.some(keyword => lowerMsg.includes(keyword))) {
        return faq.answer;
      }
    }
    return null;
  };

  const getCurrentEventId = (): number | null => {
    if (typeof window === "undefined") return null;
    const match = window.location.pathname.match(/\/admin\/events\/(\d+)/);
    return match ? Number(match[1]) : null;
  };

  const formatAiAnswer = (answer: string, suggestions?: Record<string, any>): string => {
    if (!suggestions || Object.keys(suggestions).length === 0) return answer;
    const parts = [answer];
    const eventUpdate = suggestions.event_update || {};
    const fields = Array.isArray(suggestions.registration_fields) ? suggestions.registration_fields : [];
    const sessions = Array.isArray(suggestions.sessions) ? suggestions.sessions : [];
    const compliance = Array.isArray(suggestions.compliance) ? suggestions.compliance : [];

    if (Object.keys(eventUpdate).length > 0) {
      parts.push(
        lang === "tr"
          ? `\n\nEtkinlik ayari taslagi: ${Object.entries(eventUpdate).map(([key, value]) => `${key}: ${value}`).join(", ")}`
          : `\n\nEvent settings draft: ${Object.entries(eventUpdate).map(([key, value]) => `${key}: ${value}`).join(", ")}`
      );
    }
    if (fields.length > 0) {
      parts.push(
        lang === "tr"
          ? `\n\nKayit formu onerisi: ${fields.map((field: any) => field.label || field.key).join(", ")}`
          : `\n\nRegistration fields: ${fields.map((field: any) => field.label || field.key).join(", ")}`
      );
    }
    if (sessions.length > 0) {
      parts.push(
        lang === "tr"
          ? `\n\nOturum taslagi: ${sessions.map((session: any) => session.title || session.name).join(", ")}`
          : `\n\nSession draft: ${sessions.map((session: any) => session.title || session.name).join(", ")}`
      );
    }
    if (compliance.length > 0) {
      parts.push(
        lang === "tr"
          ? `\n\nKVKK / uyumluluk onerileri: ${compliance.map((item: any) => item.label || item.text || item).join(", ")}`
          : `\n\nCompliance suggestions: ${compliance.map((item: any) => item.label || item.text || item).join(", ")}`
      );
    }
    return parts.join("");
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const currentInput = input;

    if (loading) return;

    // Add user message
    const userMsg: Message = {
      role: "user",
      message: currentInput,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    if (eventWizardStep !== "idle") {
      const handled = await handleEventWizardInput(currentInput);
      if (handled) return;
    }

    if (isCreateEventIntent(currentInput)) {
      void startEventWizard(currentInput);
      return;
    }

    if (eventWizardStep === "idle" && shouldTreatTextAsWizardSeed(currentInput)) {
      void startEventWizard(currentInput);
      return;
    }

    // Find answer
    const answer = findAnswer(currentInput);
    if (!answer) {
      setLoading(true);
      try {
        const response = await apiFetch("/admin/ai/event-assistant", {
          method: "POST",
          body: JSON.stringify({
            message: currentInput,
            language: lang,
            event_id: getCurrentEventId(),
            history: messages.slice(-6),
          }),
        });
        const data = await response.json();
        const assistantMsg: Message = {
          role: "assistant",
          message: formatAiAnswer(
            data?.answer || (lang === "tr" ? "Bir taslak uretemedim, biraz daha detay verebilir misiniz?" : "I could not draft that yet. Can you add a bit more detail?"),
            data?.suggestions
          ),
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMsg]);
      } catch (error: any) {
        const assistantMsg: Message = {
          role: "assistant",
          message: error?.message || (lang === "tr" ? "AI asistana ulasilamadi. Lutfen tekrar deneyin." : "The AI assistant is unavailable. Please try again."),
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMsg]);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // Add assistant response
    const assistantMsg: Message = {
      role: "assistant",
      message: answer || (lang === "tr" ? "Maalesef bu soruya yanıt bulamadım. Lütfen 'Destek Talebi Aç' butonunu kullanarak detaylı açıklamayı yapınız." : "Sorry, I couldn't find an answer to this question. Please use 'Create Support Ticket' button for more details."),
      timestamp: new Date().toISOString()
    };
    
    setTimeout(() => {
      setMessages(prev => [...prev, assistantMsg]);
    }, 300);
  };

  const handleCreateSupport = async () => {
    if (!supportSubject.trim() || !supportMessage.trim()) return;

    setLoading(true);
    try {
      const token = getToken();
      
      if (!token) {
        const assistantMsg: Message = {
          role: "assistant",
          message: lang === "tr" ? "❌ Oturum hatası. Lütfen sayfayı yenileyin ve tekrar deneyin." : "❌ Session error. Please refresh and try again.",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMsg]);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin/support-tickets", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: supportSubject,
          message: supportMessage
        })
      });

      if (response.ok) {
        // Success
        const assistantMsg: Message = {
          role: "assistant",
          message: lang === "tr" ? "✅ Destek talebiniz başarıyla oluşturuldu! Destek Ekibimiz en kısa sürede size ulaşacak. Email adresinizdeki güncellemeleri takip edin." : "✅ Your support ticket created! Our team will reach out soon. Check your email for updates.",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMsg]);
        setSupportSubject("");
        setSupportMessage("");
        setShowSupportForm(false);
      } else {
        try {
          const error = await response.json();
          const errorDetail = error?.detail || error?.message || (lang === "tr" ? "Destek talebini oluşturmada hata oluştu" : "Failed to create support ticket");
          const assistantMsg: Message = {
            role: "assistant",
            message: lang === "tr" ? `❌ Hata: ${errorDetail}` : `❌ Error: ${errorDetail}`,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, assistantMsg]);
        } catch {
          const assistantMsg: Message = {
            role: "assistant",
            message: lang === "tr" ? "❌ Hata: Destek talebini oluşturmada hata oluştu" : "❌ Error: Failed to create support ticket",
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, assistantMsg]);
        }
      }
    } catch (error: any) {
      const errorMsg = error?.message || (lang === "tr" ? "Bağlantı hatası" : "Connection error");
      const assistantMsg: Message = {
        role: "assistant",
        message: lang === "tr" ? `❌ ${errorMsg}. Lütfen daha sonra tekrar deneyin.` : `❌ ${errorMsg}. Please try again later.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-brand transition hover:bg-brand-700"
          title={lang === "tr" ? "AI Asistan" : "AI Assistant"}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-6 right-4 z-50 flex h-[min(600px,calc(100vh-3rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-surface-200 bg-white shadow-modal sm:right-6 sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between bg-brand-600 px-6 py-4 text-white">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              <h3 className="font-semibold">
                {lang === "tr" ? "HeptaCert AI Asistan" : "HeptaCert AI Assistant"}
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-brand-700 p-1 rounded-lg transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="scrollbar-polished flex-1 space-y-4 overflow-y-auto bg-surface-50 p-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-4 py-2.5 rounded-lg text-sm ${
                    msg.role === "user"
                      ? "bg-brand-600 text-white rounded-br-none"
                      : "bg-white text-surface-900 border border-surface-200 rounded-bl-none"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {eventWizardStep !== "idle" && (
            <div className="border-t border-surface-200 bg-brand-50 px-4 py-3 text-sm text-surface-700">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-700">
                    {lang === "tr" ? "Etkinlik oluşturma modu aktif" : "Event creation mode is active"}
                  </p>
                  <p className="mt-1 text-surface-600">
                    {lang === "tr"
                      ? "Soruları sırayla cevaplayın; son adımda siz onay verince etkinlik oluşturulacak."
                      : "Answer the prompts in order; the event will be created only after your final approval."}
                  </p>
                </div>
                <button
                  onClick={() => {
                    resetEventWizard();
                    pushAssistantMessage(lang === "tr" ? "Tamam, etkinlik taslağını iptal ettim." : "Okay, I canceled the event draft.");
                  }}
                  className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
                  disabled={loading}
                >
                  {lang === "tr" ? "İptal Et" : "Cancel"}
                </button>
              </div>
            </div>
          )}

          {/* Support Form */}
          {showSupportForm && (
            <div className="border-t border-surface-200 p-4 space-y-3 bg-amber-50">
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-600" />
                <p className="font-medium">
                  {lang === "tr"
                    ? "Sorununuzu detaylı açıklayın. Destek Ekibimiz kısa sürede yanıtlayacak."
                    : "Describe your issue in detail. Our support team will respond shortly."}
                </p>
              </div>
              
              <input
                type="text"
                placeholder={lang === "tr" ? "Konu..." : "Subject..."}
                value={supportSubject}
                onChange={(e) => setSupportSubject(e.target.value)}
                className="input-field py-2"
                disabled={loading}
              />
              
              <textarea
                placeholder={lang === "tr" ? "Mesajınız..." : "Your message..."}
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                rows={3}
                className="input-field resize-none py-2"
                disabled={loading}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setShowSupportForm(false)}
                  className="btn-secondary min-h-0 flex-1 px-3 py-2.5 text-sm"
                  disabled={loading}
                >
                  {lang === "tr" ? "İptal" : "Cancel"}
                </button>
                <button
                  onClick={handleCreateSupport}
                  className="btn-primary min-h-0 flex-1 px-3 py-2.5 text-sm"
                  disabled={loading || !supportSubject.trim() || !supportMessage.trim()}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
                      {lang === "tr" ? "Gönderiliyor..." : "Sending..."}
                    </span>
                  ) : (lang === "tr" ? "Talep Oluştur" : "Create Ticket")}
                </button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-surface-200 p-4 space-y-2">
            {!showSupportForm ? (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={lang === "tr" ? "Sorunuzu sorun..." : "Ask your question..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !loading && handleSendMessage()}
                    ref={inputRef}
                    className="input-field flex-1 py-2"
                    disabled={loading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || loading}
                    className="rounded-lg bg-brand-600 p-2 text-white transition hover:bg-brand-700 disabled:opacity-50"
                  >
                    {loading ? <div className="h-4 w-4 rounded-full bg-white animate-pulse" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => {
                      if (eventWizardStep !== "idle") {
                        resetEventWizard();
                        pushAssistantMessage(lang === "tr" ? "Etkinlik taslağını iptal ettim." : "I canceled the event draft.");
                        return;
                      }
                      void startEventWizard(input);
                    }}
                    className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-800 shadow-sm transition hover:bg-brand-100"
                    disabled={loading}
                  >
                    {eventWizardStep !== "idle"
                      ? (lang === "tr" ? "Etkinlik Taslağını İptal Et" : "Cancel Event Draft")
                      : (lang === "tr" ? "Yeni Etkinlik Oluştur" : "Create New Event")}
                  </button>
                  <button
                    onClick={() => setShowSupportForm(true)}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100"
                    disabled={loading}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {lang === "tr" ? "Destek Talebi Oluştur" : "Create Support Ticket"}
                    </span>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
