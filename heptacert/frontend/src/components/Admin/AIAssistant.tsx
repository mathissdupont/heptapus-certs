"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, AlertCircle, Lightbulb, User, Sparkles, Command } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/api";
import { detectIntent, shouldStartCreateEventWizard } from "@/lib/assistant/intent";
import { findFaqAnswer } from "@/lib/assistant/faq";
import { getWizardQuestion, buildReviewMessage } from "@/lib/assistant/wizard";
import type { EventDraft, EventWizardStep } from "@/lib/assistant/eventDraft";
import {
  createInitialDraft,
  seedEventDraftFromText,
  buildWizardProgressMessage,
  nextWizardStepFromDraft,
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

interface Message {
  role: "user" | "assistant";
  message: string;
  timestamp: string;
}

interface AssistantResponse {
  answer?: string;
  suggestions?: Record<string, unknown>;
}

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

  const getCurrentEventId = (): number | null => {
    if (typeof window === "undefined") return null;
    const match = window.location.pathname.match(/\/admin\/events\/(\d+)/);
    return match ? Number(match[1]) : null;
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
      if (!d.eventDate || !d.eventDate.trim()) errs.push(lang === "tr" ? "Etkinlik tarihi gerekli" : "Event date is required");
      if (d.eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(d.eventDate)) errs.push(lang === "tr" ? "Tarih YYYY-MM-DD formatında olmalı" : "Date must be YYYY-MM-DD");
      if (d.registrationQuotaEnabled && d.registrationQuota && isNaN(Number(d.registrationQuota))) errs.push(lang === "tr" ? "Kontenjan sayısal olmalı" : "Quota must be numeric");
      if (d.dataControllerContactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.dataControllerContactEmail)) errs.push(lang === "tr" ? "Geçersiz e-posta adresi" : "Invalid data controller email");
      return errs;
    };

    const validationErrors = localValidate(createDraft);
    if (validationErrors.length > 0) {
      pushAssistantMessage((lang === "tr" ? "Doğrulama hataları: " : "Validation errors: ") + validationErrors.join("; "));
      if (!createDraft.eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(createDraft.eventDate)) {
        setEventWizardStep("date");
        pushAssistantMessage(lang === "tr" ? "Etkinlik tarihini YYYY-MM-DD formatında yazar mısınız? Örnek: 2026-06-25" : "Please enter the event date in YYYY-MM-DD format. Example: 2026-06-25");
      }
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
      pushAssistantMessage(getEventPromptForStep(nextStep, hintedDraft, lang));
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
        pushAssistantMessage(lang === "tr" ? `✅ Etkinlik oluşturuldu: ${created.name} (ID: ${created.id}).` : `✅ Event created: ${created.name} (ID: ${created.id}).`);
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

  const formatAiAnswer = (answer: string, suggestions?: Record<string, any>): string => {
    if (!suggestions || Object.keys(suggestions).length === 0) return answer;
    const parts = [answer];
    const eventUpdate = suggestions.event_update || {};
    const fields = Array.isArray(suggestions.registration_fields) ? suggestions.registration_fields : [];
    const sessions = Array.isArray(suggestions.sessions) ? suggestions.sessions : [];
    const compliance = Array.isArray(suggestions.compliance) ? suggestions.compliance : [];

    if (Object.keys(eventUpdate).length > 0) {
      parts.push((lang === "tr" ? "\n\nEtkinlik ayarı taslağı: " : "\n\nEvent settings draft: ") + Object.entries(eventUpdate).map(([key, value]) => `${key}: ${formatDisplayValue(value)}`).join(", "));
    }
    if (fields.length > 0) {
      parts.push((lang === "tr" ? "\n\nKayıt formu önerisi: " : "\n\nRegistration fields: ") + fields.map((field: any) => formatDisplayValue(field.label || field.key || field)).join(", "));
    }
    if (sessions.length > 0) {
      parts.push((lang === "tr" ? "\n\nOturum taslağı: " : "\n\nSession draft: ") + sessions.map((session: any) => formatDisplayValue(session.title || session.name || session)).join(", "));
    }
    if (compliance.length > 0) {
      parts.push((lang === "tr" ? "\n\nKVKK / uyumluluk önerileri: " : "\n\nCompliance suggestions: ") + compliance.map((item: any) => formatDisplayValue(item)).join(", "));
    }
    return parts.join("");
  };

  const requestAiAnswer = async (currentInput: string) => {
    if (currentInput.trim().length < 2) {
      pushAssistantMessage(lang === "tr" ? "Biraz daha ayrıntı yazar mısınız?" : "Could you add a little more detail?");
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch("/admin/ai/event-assistant", {
        method: "POST",
        body: JSON.stringify({
          message: currentInput.trim(),
          language: lang,
          event_id: getCurrentEventId(),
          history: messages.slice(-8).map(({ role, message }) => ({ role, message })),
        }),
      });
      const result = (await response.json()) as AssistantResponse;
      const answer = typeof result.answer === "string" ? result.answer.trim() : "";
      if (!answer) throw new Error(lang === "tr" ? "Asistan boş yanıt döndürdü." : "The assistant returned an empty response.");
      pushAssistantMessage(formatAiAnswer(answer, result.suggestions));
    } catch (error: any) {
      pushAssistantMessage(lang === "tr" ? `Şu anda yanıtı hazırlayamadım: ${error?.message || "Bağlantı hatası"}.` : `I could not prepare a response right now: ${error?.message || "Connection error"}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    const currentInput = input;
    setMessages((prev) => [...prev, { role: "user", message: currentInput, timestamp: new Date().toISOString() }]);
    setInput("");

    const intent = detectIntent(currentInput, eventWizardStep !== "idle");
    if (intent.intent === "support_ticket") {
      setShowSupportForm(true);
      pushAssistantMessage(lang === "tr" ? "Destek talebi formunu açtım." : "I opened the support ticket form.");
      return;
    }
    if (eventWizardStep !== "idle") {
      const handled = await handleEventWizardInput(currentInput);
      if (handled) return;
    }
    if (intent.intent === "create_event" && intent.confidence >= 0.8 && shouldStartCreateEventWizard(currentInput)) {
      void startEventWizard(currentInput);
      return;
    }
    if (intent.intent === "faq") {
      const answer = findFaqAnswer(currentInput, lang);
      if (answer) {
        pushAssistantMessage(answer);
        return;
      }
    }
    await requestAiAnswer(currentInput);
  };

  const handleCreateSupport = async () => {
    const subject = supportSubject.trim();
    const message = supportMessage.trim();
    if (subject.length < 5 || message.length < 10) {
      pushAssistantMessage(lang === "tr" ? "Konu en az 5, açıklama en az 10 karakter olmalıdır." : "Subject at least 5, message at least 10 chars.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/admin/support-tickets", {
        method: "POST",
        body: JSON.stringify({ subject, message }),
      });
      pushAssistantMessage(lang === "tr" ? "Destek talebiniz başarıyla oluşturuldu." : "Your support ticket was created successfully.");
      setSupportSubject("");
      setSupportMessage("");
      setShowSupportForm(false);
    } catch (error: any) {
      pushAssistantMessage(lang === "tr" ? `Hata: ${error?.message}` : `Error: ${error?.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Ortak İçerik Alanı (Mesaj Listesi)
  const renderMessageList = (isWidget = false) => (
    <div className={`flex-1 space-y-3 overflow-y-auto bg-surface-50/40 p-4 ${isWidget ? "max-h-full" : ""}`}>
      {messages.map((msg, idx) => (
        <div key={idx} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={`flex max-w-[85%] gap-2 sm:gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {!isWidget && (
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs font-medium shadow-sm ${msg.role === "user" ? "border-gray-900 bg-surface-800 text-white" : "border-surface-100 bg-white text-surface-900"}`}>
                {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5 text-surface-500" />}
              </div>
            )}
            <div
              onClick={() => msg.role === "user" && startEditingUserMessage(idx)}
              className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm border transition-all duration-150 ${
                msg.role === "user"
                  ? "cursor-pointer rounded-tr-sm bg-surface-900 border-gray-900 text-white hover:bg-surface-800"
                  : "rounded-tl-sm border-surface-100 bg-white text-surface-800"
              }`}
              style={{ whiteSpace: "pre-wrap" }}
            >
              {msg.message}
            </div>
          </div>
        </div>
      ))}
      {loading && (
        <div className="flex w-full justify-start">
          <div className="flex items-center gap-2.5 rounded-2xl border border-surface-100 bg-white px-4 py-2.5 text-xs text-surface-500 shadow-sm">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
            <span>{lang === "tr" ? "Hepta AI yanıt hazırlıyor..." : "Hepta AI is responding..."}</span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  // Ortak Destek Formu Bileşeni (UX iyileştirmesi)
  const renderSupportForm = (isSmall = false) => (
    <div className={`shrink-0 space-y-3 border-t border-surface-100 bg-white p-4 shadow-sm`}>
      <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/40 p-3 text-xs text-amber-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="leading-relaxed">
          {lang === "tr" ? "Sorunu detaylandırıp gönderdiğinizde teknik ekibimiz anında inceleme başlatacaktır." : "Once submitted, our team will look into your request instantly."}
        </p>
      </div>
      <input
        type="text"
        placeholder={lang === "tr" ? "Talep Konusu..." : "Ticket Subject..."}
        value={supportSubject}
        onChange={(e) => setSupportSubject(e.target.value)}
        className="w-full rounded-xl border border-surface-200 px-3.5 py-2 text-xs outline-none transition focus:border-surface-900 focus:ring-1 focus:ring-surface-900"
      />
      <textarea
        placeholder={lang === "tr" ? "Açıklamanız veya hata kaydı detayları..." : "Your detailed explanation..."}
        value={supportMessage}
        onChange={(e) => setSupportMessage(e.target.value)}
        rows={isSmall ? 2 : 3}
        className="w-full resize-none rounded-xl border border-surface-200 px-3.5 py-2 text-xs outline-none transition focus:border-surface-900 focus:ring-1 focus:ring-surface-900"
      />
      <div className="flex justify-end gap-2">
        <button onClick={() => setShowSupportForm(false)} className="rounded-xl border border-surface-200 bg-white px-3.5 py-2 text-xs font-medium text-surface-700 transition hover:bg-surface-50">
          {lang === "tr" ? "Vazgeç" : "Cancel"}
        </button>
        <button
          onClick={handleCreateSupport}
          disabled={!supportSubject.trim() || !supportMessage.trim() || loading}
          className="rounded-xl bg-surface-900 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-surface-800 disabled:opacity-30"
        >
          {lang === "tr" ? "Talebi Gönder" : "Send Ticket"}
        </button>
      </div>
    </div>
  );

  // Ortak İnput ve Alt Buton Grubu
  const renderInputArea = (isSmall = false) => (
    <div className="shrink-0 border-t border-surface-100 bg-white p-3 sm:p-4">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder={lang === "tr" ? "Sorunuzu sorun veya 'etkinlik oluştur' yazın..." : "Ask a question or type 'create event'..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          className="min-w-0 flex-1 rounded-xl border border-surface-200 px-4 py-2.5 text-xs outline-none transition focus:border-surface-900 focus:ring-1 focus:ring-surface-900"
          disabled={loading}
        />
        <button
          onClick={handleSendMessage}
          disabled={!input.trim() || loading}
          className="inline-flex h-[38px] w-10 shrink-0 items-center justify-center rounded-xl bg-surface-900 text-white shadow-sm transition hover:bg-surface-800 disabled:opacity-30"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => (eventWizardStep !== "idle" ? resetEventWizard() : void startEventWizard(input))}
          className="flex-1 rounded-xl border border-surface-200 bg-surface-50/50 py-2 text-11 font-medium text-surface-800 shadow-sm transition hover:bg-surface-100"
        >
          {eventWizardStep !== "idle" ? (lang === "tr" ? "Taslağı İptal Et" : "Cancel Draft") : (lang === "tr" ? "✨ Etkinlik Sihirbazı" : "✨ Event Wizard")}
        </button>
        <button
          onClick={() => setShowSupportForm(true)}
          className="flex-1 rounded-xl border border-surface-200 bg-surface-50/50 py-2 text-11 font-medium text-surface-500 shadow-sm transition hover:bg-surface-100"
        >
          {lang === "tr" ? "🛠️ Destek Talebi Aç" : "🛠️ Open Ticket"}
        </button>
      </div>
    </div>
  );

  // ----------------------------------------------------
  // RENDER: PAGE MODE (Tam Ekran Modu)
  // ----------------------------------------------------
  if (pageMode) {
    return (
      <div className="flex h-[calc(100dvh-7rem)] w-full flex-col gap-4 overflow-hidden bg-surface-50/60 antialiased lg:h-[calc(100vh-10rem)] lg:flex-row lg:gap-5">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-surface-200/80 bg-white shadow-sm">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-surface-100 bg-white px-5 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-900 text-white shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-surface-900 tracking-tight">HeptaCert Asistan</h3>
                <p className="text-11 text-surface-400 truncate">Etkinlik, kayıt, sertifika ve destek otomasyonu</p>
              </div>
            </div>
            {eventWizardStep !== "idle" && (
              <span className="rounded-full border border-surface-200 bg-surface-50 px-2.5 py-0.5 text-11 font-medium text-surface-600 animate-pulse">Sihirbaz Aktif</span>
            )}
          </div>

          {/* Messages Main */}
          {renderMessageList(false)}

          {/* Wizard Bilgi Çubuğu */}
          {eventWizardStep !== "idle" && (
            <div className="flex shrink-0 flex-col gap-2 border-t border-l-2 border-l-gray-950 border-t-gray-100 bg-surface-50/50 px-5 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-surface-500">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-900" />
                <span><strong>Sihirbaz:</strong> {summarizeMissingFields(eventWizardStep, lang)}</span>
              </div>
              <button onClick={resetEventWizard} className="text-red-500 font-medium text-xs hover:underline self-end sm:self-auto">Sihirbazı Kapat</button>
            </div>
          )}

          {/* Action Area */}
          {showSupportForm ? renderSupportForm(false) : renderInputArea(false)}
        </div>

        {/* Yan Panel (Quick Prompts) */}
        <aside className="flex max-h-60 w-full shrink-0 flex-col justify-between overflow-y-auto rounded-2xl border border-surface-200/80 bg-white p-5 shadow-sm lg:max-h-none lg:w-72">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-surface-900">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <h4 className="text-xs font-semibold tracking-tight">Hızlı Şablonlar</h4>
            </div>
            <div className="space-y-2">
              {[
                { label: "Webinar Önerisi", text: "Yeni webinar, 2026-06-30, online" },
                { label: "Workshop Önerisi", text: "Workshop: Hands-on, 1 gün, İstanbul" },
                { label: "KVKK Önerisi", text: "Kayıt formu için KVKK metni önerisi" }
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => window.dispatchEvent(new CustomEvent("ai-assistant-insert", { detail: item.text }))}
                  className="w-full text-left rounded-xl border border-surface-100 bg-surface-50/50 px-3 py-2 text-xs text-surface-700 transition hover:bg-surface-100/70"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-surface-100 pt-4 mt-4 lg:mt-0">
            <div className="flex items-center gap-1.5 text-11 font-semibold text-surface-900">
              <Command className="h-3.5 w-3.5 text-surface-400" />
              <span>Komut Paleti</span>
            </div>
            <p className="mt-1 text-11 leading-normal text-surface-400">CMD+K kombinasyonu ile yönetim aksiyonlarını tetikleyebilirsiniz.</p>
          </div>
        </aside>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: FLOATING WIDGET MODE (Yüzen Pencere)
  // ----------------------------------------------------
  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-surface-900 text-white shadow-md transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-x-2 bottom-2 z-50 flex h-[calc(100dvh-1.5rem)] max-h-[580px] flex-col overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-xl antialiased sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[500px] sm:w-86">
          {/* Header */}
          <div className="flex h-13 shrink-0 items-center justify-between border-b border-surface-100 bg-white px-4">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-900 text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-xs font-semibold text-surface-900 tracking-tight">HeptaCert Asistan</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="rounded-lg p-1 text-surface-400 hover:bg-surface-50 hover:text-surface-900">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Body */}
          {renderMessageList(true)}

          {/* Wizard Alert */}
          {eventWizardStep !== "idle" && (
            <div className="shrink-0 border-t border-l-2 border-l-gray-950 border-t-gray-100 bg-surface-50/50 px-4 py-2 text-11 text-surface-500 flex justify-between items-center">
              <span className="truncate"><strong>Sihirbaz:</strong> {summarizeMissingFields(eventWizardStep, lang)}</span>
              <button onClick={resetEventWizard} className="text-red-500 font-medium">İptal</button>
            </div>
          )}

          {/* Form / Input Area */}
          {showSupportForm ? renderSupportForm(true) : renderInputArea(true)}
        </div>
      )}
    </>
  );
}

function getEventPromptForStep(step: EventWizardStep, draft: EventDraft, lang: string): string {
  if (step === "confirm") return buildReviewMessage(draft, lang);
  return getWizardQuestion(step, draft, lang);
}

function formatDisplayValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(formatDisplayValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return formatDisplayValue(record.label ?? record.text ?? record.message ?? record.name) || JSON.stringify(value);
  }
  return String(value);
}