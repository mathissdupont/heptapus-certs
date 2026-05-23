import { compactText } from "./text";
import type { EventDraft, EventWizardStep } from "./eventDraft";

export function isWizardActive(step: EventWizardStep): boolean {
  return step !== "idle";
}

export function getWizardQuestion(step: EventWizardStep, draft: EventDraft, lang = "tr"): string {
  switch (step) {
    case "name": return lang === "tr" ? "Etkinlik adı nedir?" : "What's the event name?";
    case "date": return lang === "tr" ? "Etkinlik tarihi nedir? (YYYY-MM-DD)" : "What's the event date? (YYYY-MM-DD)";
    case "location": return lang === "tr" ? "Etkinlik nerede gerçekleşecek? (şehir/çevrimiçi)" : "Where will the event take place? (city/online)";
    case "description": return lang === "tr" ? "Kısa bir açıklama yazar mısınız?" : "Please provide a short description.";
    case "type": return lang === "tr" ? "Etkinlik tipi nedir? (workshop, webinar, konferans...)" : "What's the event type? (workshop, webinar, conference...)";
    case "features": return lang === "tr" ? "Hangi özellikleri istersiniz? (sertifika, bilet, check-in, çekiliş)" : "Which features do you want? (certificate, ticketing, check-in, raffle)";
    case "confirm": return lang === "tr" ? "Taslağı onaylıyor musunuz? (evet / hayır)" : "Do you confirm the draft? (yes / no)";
    default: return lang === "tr" ? "Ne yapmak istersiniz?" : "What would you like to do?";
  }
}

export function buildReviewMessage(draft: EventDraft, lang = "tr"): string {
  const lines: string[] = [];
  lines.push(lang === "tr" ? `Ad: ${draft.name}` : `Name: ${draft.name}`);
  if (draft.eventDate) lines.push(lang === "tr" ? `Tarih: ${draft.eventDate}` : `Date: ${draft.eventDate}`);
  if (draft.eventLocation) lines.push(lang === "tr" ? `Konum: ${draft.eventLocation}` : `Location: ${draft.eventLocation}`);
  if (draft.eventDescription) lines.push(lang === "tr" ? `Açıklama: ${draft.eventDescription}` : `Description: ${draft.eventDescription}`);
  lines.push(lang === "tr" ? `Tip: ${draft.eventType}` : `Type: ${draft.eventType}`);
  lines.push(lang === "tr" ? `Özellikler: ${draft.certificateEnabled ? "Sertifika " : ""}${draft.ticketingEnabled ? "Biletleme " : ""}` : `Features: ${draft.certificateEnabled ? "Certificate " : ""}${draft.ticketingEnabled ? "Ticketing " : ""}`);
  lines.push(lang === "tr" ? "Onaylamak için 'evet' yazın veya iptal için 'hayır' yazın." : "Type 'confirm' to create or 'cancel' to abort.");
  return lines.join("\n");
}

export default { isWizardActive, getWizardQuestion, buildReviewMessage };
