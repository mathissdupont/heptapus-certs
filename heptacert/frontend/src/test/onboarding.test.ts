import { describe, expect, it } from "vitest";

import { buildEventSetupItems, firstPendingEventSetupItem } from "@/components/Admin/EventSetupChecklist";
import type { EventOut } from "@/lib/api";
import { deriveOrganizerOnboardingState, eventDatePatch, postAuthLandingPath, type OrganizationProfile } from "@/lib/onboarding";
import type { TranslationKey } from "@/locales/tr";

const organization = (name = ""): OrganizationProfile => ({
  id: 1,
  public_id: "org_test",
  org_name: name,
  brand_logo: null,
  brand_color: "dynamic-brand-color",
});

const event = (overrides: Partial<EventOut> = {}): EventOut => ({
  id: 42,
  name: "Launch",
  template_image_url: "placeholder",
  config: {},
  min_sessions_required: 1,
  certificate_enabled: true,
  checkin_enabled: true,
  ...overrides,
});

const translate = (key: TranslationKey, vars?: Record<string, string | number>) => {
  let value = key as string;
  for (const [name, replacement] of Object.entries(vars || {})) value = value.replace(`{${name}}`, String(replacement));
  return value;
};

describe("organizer onboarding state", () => {
  it("resumes at the first incomplete server-derived step", () => {
    const profile = deriveOrganizerOnboardingState(organization(), []);
    expect(profile.requiredStep).toBe("profile");
    expect(profile.needsOnboarding).toBe(true);

    const firstEvent = deriveOrganizerOnboardingState(organization("Heptapus"), []);
    expect(firstEvent.requiredStep).toBe("event");
    expect(firstEvent.completedSteps).toBe(1);

    const launch = deriveOrganizerOnboardingState(organization("Heptapus"), [event()], { certificates: 0 });
    expect(launch.requiredStep).toBe("launch");
    expect(launch.needsOnboarding).toBe(false);
    expect(launch.hasCertificate).toBe(false);

    const complete = deriveOrganizerOnboardingState(organization("Heptapus"), [event()], { certificates: 1 });
    expect(complete.completedSteps).toBe(3);
    expect(complete.hasCertificate).toBe(true);

  });

  it("routes only a new solo owner into the guided flow", () => {
    const incomplete = deriveOrganizerOnboardingState(organization(), []);
    expect(postAuthLandingPath([{ id: 1, owned: true, permissions: ["events:manage"] }], incomplete)).toBe("/admin/onboarding");

    expect(postAuthLandingPath([
      { id: 1, owned: true, permissions: ["events:manage"] },
      { id: 2, owned: false, permissions: ["events:manage"] },
    ], incomplete)).toBe("/admin/events");

    expect(postAuthLandingPath([{ id: 2, owned: false, permissions: ["venues:read"] }], incomplete)).toBe("/admin/venues");
  });

  it("keeps the backend-required event name when adding the optional date", () => {
    expect(eventDatePatch({ name: "Launch" }, "Fallback", "2026-10-15")).toEqual({
      name: "Launch",
      event_date: "2026-10-15",
    });
  });
});

describe("shared event setup checklist", () => {
  it("gates the next action using event and health state", () => {
    const items = buildEventSetupItems(event(), null, translate);
    expect(firstPendingEventSetupItem(items)?.key).toBe("basics");

    const completed = buildEventSetupItems(event({
      event_date: "2026-10-01",
      config: { registration_fields: [{ key: "name" }] },
    }), { attendees: 1, sessions: 1, active_certificates: 1 }, translate);
    expect(completed.every((item) => item.done)).toBe(true);
    expect(firstPendingEventSetupItem(completed)).toBeNull();

    const certificateNotRequired = buildEventSetupItems(event({
      event_date: "2026-10-01",
      certificate_enabled: false,
      checkin_enabled: false,
      config: { kvkk_consent_text: "Consent" },
    }), { attendees: 1 }, translate);
    expect(certificateNotRequired.every((item) => item.done)).toBe(true);
  });
});
