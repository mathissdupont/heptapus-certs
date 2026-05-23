import { detectIntent, shouldStartCreateEventWizard } from "../intent";
import { findFaqAnswer } from "../faq";
import { parseFeature, extractFeatureFlags, seedEventDraftFromText, EMPTY_EVENT_DRAFT } from "../eventDraft";

function runScenario(label: string, input: string) {
  const wizard = shouldStartCreateEventWizard(input);
  const intent = detectIntent(input, false);
  const draft = seedEventDraftFromText(input, EMPTY_EVENT_DRAFT);
  const certificate = parseFeature(input, ["sertifika", "certificate"]);
  const ticketing = parseFeature(input, ["bilet", "ticket"]);
  const features = extractFeatureFlags(input, { ...EMPTY_EVENT_DRAFT });
  const faq = findFaqAnswer(input, "tr");

  console.log(label, { wizard, intent: intent.intent, draft, certificate, ticketing, faq, features });
  return { wizard, intent, draft, certificate, ticketing, faq, features };
}

function assertScenario(condition: unknown, message: string) {
  console.assert(Boolean(condition), message);
}

export function runAssistantHeuristicDebug(): void {
  const a = runScenario("A", "sertifika nasıl verilir?");
  assertScenario(a.intent.intent === "faq", "A: expected faq intent");
  assertScenario(a.wizard === false, "A: wizard should not start");
  assertScenario(Boolean(a.faq), "A: FAQ answer should exist");

  const b = runScenario("B", "kayıt formuna alan nasıl eklerim?");
  assertScenario(b.intent.intent === "faq", "B: expected faq intent");
  assertScenario(b.wizard === false, "B: wizard should not start");

  const c = runScenario("C", "İzmir’de 25 Haziran 2026’da AI workshop oluştur, sertifika olsun ama bilet olmasın");
  assertScenario(c.intent.intent === "create_event", "C: expected create_event intent");
  assertScenario(c.wizard === true, "C: wizard should start");
  assertScenario(c.draft.eventDate === "2026-06-25", "C: eventDate should be 2026-06-25");
  assertScenario(/izmir/i.test(c.draft.eventLocation), "C: eventLocation should include izmir");
  assertScenario(c.draft.eventType === "workshop", "C: eventType should be workshop");
  assertScenario(c.features.certificateEnabled === true, "C: certificateEnabled should be true");
  assertScenario(c.features.ticketingEnabled === false, "C: ticketingEnabled should be false");

  const d = runScenario("D", "online event oluştur");
  assertScenario(d.intent.intent === "create_event", "D: expected create_event intent");
  assertScenario(d.wizard === true, "D: wizard should start");
  assertScenario(d.draft.eventType === "online_event", "D: eventType should be online_event");

  const e = detectIntent("iptal", true);
  console.assert(e.intent === "cancel", "E: expected cancel intent during wizard");

  const f = detectIntent("onayla", true);
  console.assert(f.intent === "confirm_create", "F: expected confirm_create intent during confirm step");
}

if (process.env.NODE_ENV !== "production") {
  runAssistantHeuristicDebug();
}
