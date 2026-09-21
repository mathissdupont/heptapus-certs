import { apiFetch, type EventOut } from "@/lib/api";
import { landingPathForContexts, type OrgRoleContext } from "@/lib/orgRoles";

export type OnboardingStep = "profile" | "event" | "launch";

export type OrganizationProfile = {
  id: number;
  public_id: string;
  org_name: string;
  brand_logo?: string | null;
  brand_color: string;
};

export type EventHealthOverview = {
  attendees?: number;
  sessions?: number;
  certificates?: number;
  active_certificates?: number;
};

export type OrganizerOnboardingState = {
  organization: OrganizationProfile;
  events: EventOut[];
  firstEvent: EventOut | null;
  overview: EventHealthOverview | null;
  hasOrganizationProfile: boolean;
  hasEvent: boolean;
  hasCertificate: boolean;
  requiredStep: OnboardingStep;
  completedSteps: number;
  needsOnboarding: boolean;
};

export function deriveOrganizerOnboardingState(
  organization: OrganizationProfile,
  events: EventOut[],
  overview: EventHealthOverview | null = null,
): OrganizerOnboardingState {
  const firstEvent = events.length > 0 ? events[events.length - 1] : null;
  const hasOrganizationProfile = Boolean(organization.org_name?.trim());
  const hasEvent = Boolean(firstEvent);
  const hasCertificate = Boolean((overview?.certificates ?? overview?.active_certificates ?? 0) > 0);
  const requiredStep: OnboardingStep = !hasOrganizationProfile ? "profile" : !hasEvent ? "event" : "launch";

  return {
    organization,
    events,
    firstEvent,
    overview,
    hasOrganizationProfile,
    hasEvent,
    hasCertificate,
    requiredStep,
    completedSteps: Number(hasOrganizationProfile) + Number(hasEvent) + Number(hasCertificate),
    // The guided route is required only until the workspace and first event exist.
    // Certificate state still drives the final next action without trapping returning users.
    needsOnboarding: !hasOrganizationProfile || !hasEvent,
  };
}

export async function loadOrganizerOnboardingState(options: { includeHealth?: boolean } = {}) {
  const [organizationResponse, eventsResponse] = await Promise.all([
    apiFetch("/admin/organization/settings"),
    apiFetch("/admin/events"),
  ]);
  const organization = (await organizationResponse.json()) as OrganizationProfile;
  const events = (await eventsResponse.json()) as EventOut[];
  const firstEvent = events.length > 0 ? events[events.length - 1] : null;
  let overview: EventHealthOverview | null = null;

  if (options.includeHealth && firstEvent) {
    try {
      const healthResponse = await apiFetch(`/admin/events/${firstEvent.id}/health`);
      const health = (await healthResponse.json()) as { overview?: EventHealthOverview };
      overview = health.overview ?? null;
    } catch {
      // Health is supplementary. Profile/event progress can still recover itself.
    }
  }

  return deriveOrganizerOnboardingState(organization, events, overview);
}

export function postAuthLandingPath(
  contexts: OrgRoleContext[],
  state: OrganizerOnboardingState | null,
): string {
  const normalLanding = landingPathForContexts(contexts);
  const isSoloOwner = contexts.length === 1 && Boolean(contexts[0]?.owned);
  if (isSoloOwner && state?.needsOnboarding) return "/admin/onboarding";
  return normalLanding;
}

export function eventDatePatch(created: Pick<EventOut, "name">, fallbackName: string, eventDate: string) {
  return {
    // EventRenameIn requires name even when only the date changes.
    name: created.name || fallbackName.trim(),
    event_date: eventDate,
  };
}
