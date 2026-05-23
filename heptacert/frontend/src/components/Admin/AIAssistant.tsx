"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, AlertCircle, Lightbulb, User, Sparkles, Command } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { apiFetch, getToken } from "@/lib/api";
import { detectIntent, shouldStartCreateEventWizard } from "@/lib/assistant/intent";
import { findFaqAnswer } from "@/lib/assistant/faq";
import { getWizardQuestion, buildReviewMessage } from "@/lib/assistant/wizard";

interface Message {
  role: "user" | "assistant";
  message: string;
  timestamp: string;
}
import {
  EventDraft,
  EventWizardStep,
  EMPTY_EVENT_DRAFT,
  createInitialDraft,
  seedEventDraftFromText,
  validateDraft,
  formatDraftSummary,
  buildWizardProgressMessage,
  nextWizardStepFromDraft,
  getMissingWizardFields,
  buildSmartRegistrationFields,
  deriveEventName,
  normalizeEventDate,
  parseTurkishMonthDate,
  extractLocation,
  extractType,
  normalizeEventType,
  extractFeatureFlags,
} from "@/lib/assistant/eventDraft";
import { compactText, fuzzyAny, isAffirmative, isNegative, isSkipValue } from "@/lib/assistant/text";

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

// Helper parsing and formatting logic moved to src/lib/assistant/eventDraft.ts

// Use centralized wizard helpers from lib/assistant/eventDraft.ts

function summarizeMissingFields(step: EventWizardStep, lang: string): string {
  switch (step) {
    case "name": return lang === "tr" ? "Etkinlik adı eksik." : "Event name is missing.";
    case "date": return lang === "tr" ? "Tarih eksik." : "Date is missing.";
    case "location": return lang === "tr" ? "Konum eksik." : "Location is missing.";
    case "description": return lang === "tr" ? "Açıklama eksik." : "Description is missing.";
    case "type": return lang === "tr" ? "Etkinlik tipi eksik." : "Event type is missing.";
    default: return lang === "tr" ? "Özellikler gözden geçirilmeli." : "Features should be reviewed.";
  }
}

// deriveEventName is implemented in lib/assistant/eventDraft.ts

// seedEventDraftFromText provided by lib/assistant/eventDraft.ts

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

// normalizeEventDate moved to lib/assistant/eventDraft.ts

// normalizeEventType moved to lib/assistant/eventDraft.ts

// feature parsing moved to lib/assistant/eventDraft.ts

// buildFeatureSummary kept local

// createInitialDraft provided by lib/assistant/eventDraft.ts

// formatDraftSummary provided by lib/assistant/eventDraft.ts


export default function AIAssistant({ pageMode }: { pageMode?: boolean } = {}) {
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
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
  }, [messages, loading, showSupportForm]);

  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent)?.detail;
        const text = detail == null ? "" : String(detail);
        if (!text) return;
        setInput((prev) => (prev && prev.trim() ? `${prev} ${text}` : text));
        setTimeout(() => inputRef.current?.focus(), 50);
      } catch (err) {}
    };
    window.addEventListener("ai-assistant-insert", handler as EventListener);
    
    const clearHandler = (e: Event) => {
      try {
        setMessages([
          {
            role: "assistant",
            message: lang === "tr" ? "Merhaba! Size etkinlik oluşturma ve yönetiminde yardımcı olmak için buradayım. Ne sorunuz var?" : "Hello! I'm here to help you with event creation and management. What questions do you have?",
            timestamp: new Date().toISOString(),
          },
        ]);
        resetEventWizard();
        setInput("");
      } catch {}
    };
    window.addEventListener("ai-assistant-clear", clearHandler as EventListener);
    
    return () => {
      window.removeEventListener("ai-assistant-insert", handler as EventListener);
      window.removeEventListener("ai-assistant-clear", clearHandler as EventListener);
    };
  }, [lang]);

  const startEditingUserMessage = (idx: number) => {
    const msg = messages[idx];
    if (!msg || msg.role !== "user") return;
    setInput(msg.message);
    setEditingIndex(idx);
    setMessages((prev) => prev.filter((_, i) => i !== idx));
    setTimeout(() => inputRef.current?.focus(), 50);
  };

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

    const localValidate = (d: EventDraft): string[] => {
      const errs: string[] = [];
      if (!d.name || !d.name.trim()) errs.push(lang === "tr" ? "Etkinlik adı gerekli" : "Event name is required");
      if (d.registrationQuotaEnabled && d.registrationQuota && isNaN(Number(d.registrationQuota))) errs.push(lang === "tr" ? "Kontenjan sayısal olmalı" : "Quota must be numeric");
      if (d.dataControllerContactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.dataControllerContactEmail)) errs.push(lang === "tr" ? "Geçersiz e-posta adresi" : "Invalid data controller email");
      if (d.eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(d.eventDate)) errs.push(lang === "tr" ? "Tarih YYYY-MM-DD formatında olmalı" : "Date must be YYYY-MM-DD");
      return errs;
    };
    const validationErrors = localValidate(createDraft);
    if (validationErrors.length > 0) {
      pushAssistantMessage((lang === "tr" ? "Doğrulama hataları: " : "Validation errors: ") + validationErrors.join("; "));
      return null;
    }
    
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

    const createJson = await createResponse.json();
    if (!createResponse.ok) {
      const errDetail = createJson?.detail || createJson?.message || JSON.stringify(createJson);
      if (/body\.name|name.*required|name.*field required/i.test(String(errDetail))) {
        pushAssistantMessage(lang === "tr" ? "Hata: Etkinlik adı zorunlu. Lütfen bir ad girin ve tekrar deneyin." : "Error: Event name is required. Please provide a name and try again.");
        return null;
      }
      pushAssistantMessage(lang === "tr" ? `Etkinlik oluşturulamadı: ${String(errDetail)}` : `Failed to create event: ${String(errDetail)}`);
      return null;
    }
    const created = createJson;

    const patchPayload: Record<string, any> = {
      name: createDraft.name,
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

    if (eventWizardStep === "idle") return false;

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
        if (!created) {
          pushAssistantMessage(lang === "tr" ? "Etkinlik oluşturulamadı. Lütfen eksik alanları düzeltip tekrar deneyin." : "Event creation failed. Please fix the missing fields and try again.");
          setLoading(false);
          return true;
        }

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
    if (!input.trim() || loading) return;
    const currentInput = input;

    const userMsg: Message = { role: "user", message: currentInput, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // If wizard already active, let existing wizard handler process the input
    if (eventWizardStep !== "idle") {
      const handled = await handleEventWizardInput(currentInput);
      if (handled) return;
    }

    // Detect intent using deterministic rules
    const intent = detectIntent(currentInput, eventWizardStep !== "idle");

    // Start strict create-event flow only when both event+action words are present
    if (intent.intent === "create_event" && intent.confidence >= 0.8 && shouldStartCreateEventWizard(currentInput)) {
      void startEventWizard(currentInput);
      return;
    }

    // FAQ handling
    if (intent.intent === "faq") {
      const answer = findFaqAnswer(currentInput, lang);
      if (answer) {
        pushAssistantMessage(answer);
      } else {
        pushAssistantMessage(
          lang === "tr"
            ? "Bunu tam anlayamadım. Etkinlik oluşturmak mı yoksa ayarlar hakkında bilgi almak mı istiyorsunuz?"
            : "I could not understand that clearly. Do you want to create an event or ask about settings?"
        );
      }
      return;
    }

    // Unknown / helpful suggestions
    pushAssistantMessage(
      lang === "tr"
        ? "Şunu yapabilirim: yeni etkinlik oluşturma, kayıt formu/sertifika/check-in ayarlarını açıklama, KVKK önerileri sunma. Ne yapmak istiyorsunuz?"
        : "I can: create a new event (guided), explain registration/certificate/check-in settings, or suggest privacy (KVKK) texts. Which would you like?"
    );
    return;
    
    return;
  };

  const handleCreateSupport = async () => {
    if (!supportSubject.trim() || !supportMessage.trim()) return;

    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        pushAssistantMessage(lang === "tr" ? "❌ Oturum hatası. Lütfen sayfayı yenileyin ve tekrar deneyin." : "❌ Session error. Please refresh and try again.");
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
        pushAssistantMessage(lang === "tr" ? "✅ Destek talebiniz başarıyla oluşturuldu! Destek Ekibimiz en kısa sürede size ulaşacak. Email adresinizdeki güncellemeleri takip edin." : "✅ Your support ticket created! Our team will reach out soon. Check your email for updates.");
        setSupportSubject("");
        setSupportMessage("");
        setShowSupportForm(false);
      } else {
        try {
          const error = await response.json();
          const errorDetail = error?.detail || error?.message || (lang === "tr" ? "Destek talebini oluşturmada hata oluştu" : "Failed to create support ticket");
          pushAssistantMessage(lang === "tr" ? `❌ Hata: ${errorDetail}` : `❌ Error: ${errorDetail}`);
        } catch {
          pushAssistantMessage(lang === "tr" ? "❌ Hata: Destek talebini oluşturmada hata oluştu" : "❌ Error: Failed to create support ticket");
        }
      }
    } catch (error: any) {
      const errorMsg = error?.message || (lang === "tr" ? "Bağlantı hatası" : "Connection error");
      pushAssistantMessage(lang === "tr" ? `❌ ${errorMsg}. Lütfen daha sonra tekrar deneyin.` : `❌ ${errorMsg}. Please try again later.`);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // RENDER: PAGE MODE (Tam Ekran Dahsboard Düzeni)
  // ----------------------------------------------------
  if (pageMode) {
    return (
      <div data-theme="light" className="flex w-full h-[calc(100vh-10rem)] gap-6 bg-[#fafafa] antialiased">
        {/* Ana Sohbet Konteyneri */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-sm">
          
          {/* Mesaj Alanı */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#fcfcfc]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex gap-3 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  
                  {/* Avatar */}
                  <div className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg border text-xs font-medium shadow-sm
                    ${msg.role === "user" ? "bg-[#171717] text-white border-[#171717]" : "bg-white text-[#171717] border-[#e5e5e5]"}`}
                  >
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-[#737373]" />}
                  </div>

                  {/* Mesaj Balonu */}
                  <div 
                    onClick={() => msg.role === "user" && startEditingUserMessage(idx)}
                    style={{ whiteSpace: "pre-wrap" }}
                    className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-all duration-150
                      ${msg.role === "user" 
                        ? "bg-[#171717] text-white font-normal hover:bg-[#262626] cursor-pointer" 
                        : "bg-white text-[#171717] border border-[#e5e5e5]"}`}
                  >
                    {msg.message}
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex w-full justify-start">
                <div className="flex items-center gap-3 bg-white border border-[#e5e5e5] rounded-xl px-4 py-3 shadow-sm text-xs text-[#737373]">
                  <div className="h-4 w-4 border-2 border-t-transparent border-[#171717] rounded-full animate-spin" />
                  <span>Hepta AI işlem yapıyor...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sihirbaz Bilgi Çubuğu (Wizard Aktifken) */}
          {eventWizardStep !== "idle" && (
            <div className="flex items-center justify-between border-t border-[#e5e5e5] bg-[#fbfbfb] px-6 py-3 text-xs border-l-2 border-l-[#171717]">
              <div className="flex items-center gap-2 text-[#737373]">
                <AlertCircle className="h-4 w-4 text-[#171717]" />
                <span>
                  <strong>Etkinlik Sihirbazı Aktif:</strong> {summarizeMissingFields(eventWizardStep, lang)} Son onay adımına kadar formu doldurun.
                </span>
              </div>
              <button 
                onClick={() => { resetEventWizard(); pushAssistantMessage(lang === "tr" ? "Etkinlik sihirbazı iptal edildi." : "Event wizard canceled."); }} 
                className="text-xs font-semibold text-red-500 hover:underline"
              >
                {lang === "tr" ? "Sihirbazı Kapat" : "Close Wizard"}
              </button>
            </div>
          )}

          {/* Destek Formu */}
          {showSupportForm && (
            <div className="border-t border-[#e5e5e5] p-5 space-y-3 bg-[#fafafa]">
              <div className="flex items-start gap-2.5 rounded-lg border border-[#e5e5e5] bg-white p-4 text-xs text-[#737373] shadow-sm">
                <AlertCircle className="h-4 w-4 text-[#171717] shrink-0 mt-0.5" />
                <p>{lang === "tr" ? "Sorunu detaylandırıp gönderdiğinizde teknik ekibimiz sistem üzerinden çözüme başlayacaktır." : "Once submitted, our team will look into your request instantly."}</p>
              </div>
              <input
                type="text"
                placeholder={lang === "tr" ? "Talep Konusu..." : "Ticket Subject..."}
                value={supportSubject}
                onChange={(e) => setSupportSubject(e.target.value)}
                className="w-full rounded-lg border border-[#e5e5e5] px-4 py-2 text-sm outline-none focus:border-[#171717] transition shadow-inner"
              />
              <textarea
                placeholder={lang === "tr" ? "Açıklamanız veya hata kaydı detayları..." : "Your detailed explanation..."}
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[#e5e5e5] px-4 py-2 text-sm outline-none focus:border-[#171717] transition shadow-inner resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowSupportForm(false)} className="rounded-lg border border-[#e5e5e5] bg-white px-4 py-2 text-xs font-medium text-[#171717] hover:bg-[#fafafa] transition">
                  {lang === "tr" ? "Vazgeç" : "Cancel"}
                </button>
                <button onClick={handleCreateSupport} disabled={!supportSubject.trim() || !supportMessage.trim() || loading} className="rounded-lg bg-[#171717] px-4 py-2 text-xs font-medium text-white hover:bg-[#262626] transition disabled:opacity-40">
                  {lang === "tr" ? "Talebi Gönder" : "Send Ticket"}
                </button>
              </div>
            </div>
          )}

          {/* Alt Kontrol ve Input Alanı */}
          {!showSupportForm && (
            <div className="border-t border-[#e5e5e5] p-4 bg-white flex flex-col gap-3">
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={lang === "tr" ? "Sorunuzu sorun veya 'yeni etkinlik planla' yazın..." : "Ask a question or type 'create an event'..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 rounded-lg border border-[#e5e5e5] px-4 py-2.5 text-sm outline-none focus:border-[#171717] transition shadow-inner"
                  disabled={loading}
                />
                <button 
                  onClick={handleSendMessage} 
                  disabled={!input.trim() || loading}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#171717] px-4 text-sm font-medium text-white hover:bg-[#262626] transition disabled:opacity-30 shadow-sm"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { if (eventWizardStep !== "idle") { resetEventWizard(); pushAssistantMessage(lang === "tr" ? "Taslak iptal edildi." : "Draft canceled."); } else { void startEventWizard(input); } }}
                  className="rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-3 py-1.5 text-xs font-medium text-[#171717] hover:bg-[#f4f4f5] transition shadow-sm"
                >
                  {eventWizardStep !== "idle" ? (lang === "tr" ? "Taslağı İptal Et" : "Cancel Draft") : (lang === "tr" ? "✨ Yeni Etkinlik Sihirbazı" : "✨ New Event Wizard")}
                </button>
                <button
                  onClick={() => setShowSupportForm(true)}
                  className="rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-3 py-1.5 text-xs font-medium text-[#737373] hover:bg-[#f4f4f5] transition shadow-sm"
                >
                  {lang === "tr" ? "🛠️ Destek Talebi Aç" : "🛠️ Open Support Ticket"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sağ Panel: Yardımcı Bilgiler ve Hazır Tetikleyiciler */}
        <aside className="w-80 shrink-0 flex flex-col gap-4 rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-sm overflow-y-auto">
          <div>
            <div className="flex items-center gap-2 text-[#171717] mb-2">
              <Lightbulb className="h-4 w-4" />
              <h4 className="text-sm font-semibold tracking-tight">{lang === "tr" ? "Hızlı Yönlendirmeler" : "Quick Prompts"}</h4>
            </div>
            <p className="text-xs text-[#737373] mb-4 leading-relaxed">
              Sistemi hızlı yönetmek için aşağıdaki akıllı şablon girdilerini asistan satırına gönderebilirsiniz.
            </p>
            <div className="space-y-2">
              <button onClick={() => { window.dispatchEvent(new CustomEvent('ai-assistant-insert', { detail: 'Yeni webinar, 2026-06-30, online' })); }} className="w-full text-left rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-xs text-[#171717] hover:bg-[#f4f4f5] transition font-medium">
                {lang === "tr" ? "Webinar Önerisi" : "Webinar Prompt"}
              </button>
              <button onClick={() => { window.dispatchEvent(new CustomEvent('ai-assistant-insert', { detail: 'Workshop: Hands-on, 1 gün, İstanbul' })); }} className="w-full text-left rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-xs text-[#171717] hover:bg-[#f4f4f5] transition font-medium">
                {lang === "tr" ? "Workshop Önerisi" : "Workshop Prompt"}
              </button>
              <button onClick={() => { window.dispatchEvent(new CustomEvent('ai-assistant-insert', { detail: 'Kayıt formu için KVKK metni önerisi' })); }} className="w-full text-left rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-xs text-[#171717] hover:bg-[#f4f4f5] transition font-medium">
                {lang === "tr" ? "KVKK Önerisi" : "KVKK Prompt"}
              </button>
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-[#e5e5e5]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#171717]">
              <Command className="h-3.5 w-3.5" />
              <h5>{lang === "tr" ? "Komut Paleti" : "Command Palette"}</h5>
            </div>
            <p className="text-[11px] text-[#737373] mt-1 leading-normal">
              {lang === "tr" ? "Sistem genelinde CMD/CTRL+K tuş kombinasyonuyla hızlı yönetim aksiyonlarını çağırabilirsiniz." : "Open everywhere with CMD/CTRL+K shortcut keys."}
            </p>
          </div>
        </aside>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: FLOATING WIDGET MODE (Kayan Pencere Düzeni)
  // ----------------------------------------------------
  return (
    <>
      {/* Kayan Tetikleyici Buton */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#171717] text-white shadow-lg transition-transform duration-200 hover:scale-105"
          title={lang === "tr" ? "AI Asistan" : "AI Assistant"}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Sohbet Penceresi */}
      {isOpen && (
        <div data-theme="light" className="fixed bottom-6 right-4 z-50 flex h-[min(600px,calc(100vh-3rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-xl sm:right-6 sm:w-96 antialiased">
          
          {/* Başlık Çubuğu */}
          <div className="flex h-14 items-center justify-between border-b border-[#e5e5e5] bg-white px-5">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-[#171717]" />
              <h3 className="text-sm font-semibold text-[#171717]">
                {lang === "tr" ? "HeptaCert AI Asistan" : "HeptaCert AI Assistant"}
              </h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-[#737373] hover:text-[#171717] transition p-1 rounded-lg">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mesaj Akışı */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-[#fafafa] p-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div 
                  onClick={() => msg.role === "user" && startEditingUserMessage(idx)}
                  style={{ whiteSpace: "pre-wrap" }}
                  className={`max-w-[85%] px-3.5 py-2 rounded-xl text-xs leading-relaxed shadow-sm transition-all duration-150
                    ${msg.role === "user"
                      ? "bg-[#171717] text-white rounded-tr-none hover:bg-[#262626] cursor-pointer"
                      : "bg-white text-[#171717] border border-[#e5e5e5] rounded-tl-none"}`}
                >
                  {msg.message}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 bg-white border border-[#e5e5e5] rounded-xl px-3 py-2 shadow-sm text-[11px] text-[#737373]">
                  <div className="h-3 w-3 border-2 border-t-transparent border-[#171717] rounded-full animate-spin" />
                  <span>Düşünüyor...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sihirbaz Bildirim Katmanı */}
          {eventWizardStep !== "idle" && (
            <div className="border-t border-[#e5e5e5] bg-[#fbfbfb] px-4 py-2.5 text-[11px] text-[#737373] border-l-2 border-l-[#171717]">
              <div className="flex items-center justify-between gap-2">
                <span><strong>Sihirbaz Modu:</strong> {summarizeMissingFields(eventWizardStep, lang)}</span>
                <button onClick={resetEventWizard} className="font-semibold text-red-500 hover:underline shrink-0">
                  {lang === "tr" ? "İptal" : "Cancel"}
                </button>
              </div>
            </div>
          )}

          {/* Destek Formu Katmanı */}
          {showSupportForm && (
            <div className="border-t border-[#e5e5e5] p-4 space-y-2 bg-[#fcfcfc]">
              <input
                type="text"
                placeholder={lang === "tr" ? "Konu..." : "Subject..."}
                value={supportSubject}
                onChange={(e) => setSupportSubject(e.target.value)}
                className="w-full rounded-lg border border-[#e5e5e5] px-3 py-1.5 text-xs outline-none focus:border-[#171717] shadow-inner"
              />
              <textarea
                placeholder={lang === "tr" ? "Mesajınız..." : "Message..."}
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-[#e5e5e5] px-3 py-1.5 text-xs outline-none focus:border-[#171717] shadow-inner resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowSupportForm(false)} className="rounded-md border border-[#e5e5e5] bg-white px-3 py-1 text-[11px] text-[#171717] hover:bg-[#fafafa]">
                  {lang === "tr" ? "Kapat" : "Close"}
                </button>
                <button onClick={handleCreateSupport} disabled={!supportSubject.trim() || !supportMessage.trim() || loading} className="rounded-md bg-[#171717] px-3 py-1 text-[11px] text-white hover:bg-[#262626] disabled:opacity-40">
                  {lang === "tr" ? "Gönder" : "Send"}
                </button>
              </div>
            </div>
          )}

          {/* Girdi Giriş Paneli */}
          {!showSupportForm && (
            <div className="border-t border-[#e5e5e5] p-3 bg-white flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={lang === "tr" ? "Sorunuzu yazın..." : "Type question..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 rounded-lg border border-[#e5e5e5] px-3 py-1.5 text-xs outline-none focus:border-[#171717] shadow-inner"
                  disabled={loading}
                />
                <button 
                  onClick={handleSendMessage} 
                  disabled={!input.trim() || loading}
                  className="rounded-lg bg-[#171717] p-2 text-white hover:bg-[#262626] disabled:opacity-40 shadow-sm transition"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => { if (eventWizardStep !== "idle") { resetEventWizard(); } else { void startEventWizard(input); } }}
                  className="flex-1 rounded-md border border-[#e5e5e5] bg-[#fafafa] py-1 text-[10px] font-semibold text-[#171717] hover:bg-[#f4f4f5] transition shadow-sm"
                >
                  {eventWizardStep !== "idle" ? (lang === "tr" ? "İptal Et" : "Cancel") : (lang === "tr" ? "Etkinlik Sihirbazı" : "Event Wizard")}
                </button>
                <button
                  onClick={() => setShowSupportForm(true)}
                  className="flex-1 rounded-md border border-[#e5e5e5] bg-[#fafafa] py-1 text-[10px] font-semibold text-[#737373] hover:bg-[#f4f4f5] transition shadow-sm"
                >
                  {lang === "tr" ? "Destek Talebi" : "Support Ticket"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function getEventPromptForStep(step: EventWizardStep, draft: EventDraft, lang: string): string {
  if (step === "confirm") return buildReviewMessage(draft, lang);
  return getWizardQuestion(step, draft, lang);
}