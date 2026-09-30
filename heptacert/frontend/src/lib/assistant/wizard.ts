
import { translate } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import { compactText } from "./text";
import type { EventDraft, EventWizardStep } from "./eventDraft";

export function isWizardActive(step: EventWizardStep): boolean {
  return step !== "idle";
}

export function getWizardQuestion(step: EventWizardStep, draft: EventDraft, lang: Lang = "tr"): string {
  switch (step) {
    case "name": return translate(lang, "migrated_lib_assistant_wizard_what_s_the_event_name_2cc508a6");
    case "date": return translate(lang, "migrated_lib_assistant_wizard_what_s_the_event_date_yyyy_mm_dd_cad5334f");
    case "location": return translate(lang, "migrated_lib_assistant_wizard_where_will_the_event_take_place_city_onlin_c668a440");
    case "description": return translate(lang, "migrated_lib_assistant_wizard_please_provide_a_short_description_b4d22945");
    case "type": return translate(lang, "migrated_lib_assistant_wizard_what_s_the_event_type_workshop_webinar_con_f60f0f0b");
    case "features": return translate(lang, "migrated_lib_assistant_wizard_which_features_do_you_want_certificate_tic_3e14e120");
    case "confirm": return translate(lang, "migrated_lib_assistant_wizard_do_you_confirm_the_draft_yes_no_7efdb92f");
    default: return translate(lang, "migrated_lib_assistant_wizard_what_would_you_like_to_do_7578dbd3");
  }
}

export function buildReviewMessage(draft: EventDraft, lang: Lang = "tr"): string {
  const lines: string[] = [];
  lines.push(translate(lang, "migrated_lib_assistant_wizard_name_value0_0345992a", { value0: draft.name }));
  if (draft.eventDate) lines.push(translate(lang, "migrated_lib_assistant_wizard_date_value0_8829679b", { value0: draft.eventDate }));
  if (draft.eventLocation) lines.push(translate(lang, "migrated_lib_assistant_wizard_location_value0_f50cef70", { value0: draft.eventLocation }));
  if (draft.eventDescription) lines.push(translate(lang, "migrated_lib_assistant_wizard_description_value0_87af3c02", { value0: draft.eventDescription }));
  lines.push(translate(lang, "migrated_lib_assistant_wizard_type_value0_a1869200", { value0: draft.eventType }));
  const features = [
    draft.certificateEnabled ? translate(lang, "admin_feature_certificate") : null,
    draft.ticketingEnabled ? translate(lang, "admin_feature_ticketing") : null,
  ].filter((value): value is string => Boolean(value));
  lines.push(translate(lang, "admin_assistant_features", { features: features.join(", ") }));
  lines.push(translate(lang, "migrated_lib_assistant_wizard_type_confirm_to_create_or_cancel_to_abort_4591d0c4"));
  return lines.join("\n");
}

export default { isWizardActive, getWizardQuestion, buildReviewMessage };
