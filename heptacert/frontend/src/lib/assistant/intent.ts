import { compactText, fuzzyAny, isAffirmative, isNegative } from "./text";

export type Intent = "create_event" | "faq" | "edit_draft" | "confirm_create" | "cancel" | "unknown";

export type IntentResult = { intent: Intent; confidence: number };

const EVENT_WORDS = ["etkinlik", "event", "workshop", "seminar", "konferans", "webinar", "konser", "eğitim", "egitim"];
const CREATE_WORDS = ["oluştur", "olustur", "create", "yeni", "kur", "hazırla", "hazirla", "planla", "prepare"];
const FAQ_WORDS = ["nasıl", "nasil", "nereden", "ne işe", "ne ise", "help", "yardım", "yardim", "where", "how"];

export function shouldStartCreateEventWizard(text: string): boolean {
  const t = compactText(text);
  const hasEventWord = fuzzyAny(t, EVENT_WORDS);
  const hasCreateWord = fuzzyAny(t, CREATE_WORDS);
  return !!(hasEventWord && hasCreateWord);
}

export function detectIntent(text: string, wizardActive: boolean): IntentResult {
  const t = compactText(text);
  if (wizardActive) {
    if (isAffirmative(t)) return { intent: "confirm_create", confidence: 0.98 };
    if (isNegative(t)) return { intent: "cancel", confidence: 0.99 };
    return { intent: "edit_draft", confidence: 0.7 };
  }

  // not in wizard
  if (shouldStartCreateEventWizard(t)) return { intent: "create_event", confidence: 0.9 };
  if (fuzzyAny(t, FAQ_WORDS)) return { intent: "faq", confidence: 0.85 };
  return { intent: "unknown", confidence: 0.4 };
}

export default { detectIntent, shouldStartCreateEventWizard };
