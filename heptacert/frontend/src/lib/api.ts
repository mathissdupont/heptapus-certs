export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8765/api";
const HAS_CONFIGURED_API_BASE = Boolean(process.env.NEXT_PUBLIC_API_BASE);

const PRIMARY_APP_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "heptacert.com",
  "www.heptacert.com",
  "cert.heptapusgroup.com",
]);

export function getApiBase(): string {
  if (typeof window === "undefined") return API_BASE;
  const host = window.location.hostname;
  if (!HAS_CONFIGURED_API_BASE || (host && !PRIMARY_APP_HOSTS.has(host))) {
    return `${window.location.origin}/api`;
  }
  return API_BASE;
}

export function getApiOrigin(): string {
  const base = getApiBase();
  return base.endsWith("/api") ? base.slice(0, -4) : base.replace(/\/api\/?$/, "");
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBase()}${normalized}`;
}

export function normalizeApiAssetUrl(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return trimmed;

  if (typeof window === "undefined") return trimmed;

  if (trimmed.startsWith("/api/")) return `${window.location.origin}${trimmed}`;
  if (trimmed.startsWith("/files/")) return `${getApiBase()}${trimmed}`;

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith("/api/files/")) {
      const host = window.location.hostname;
      if (host && !PRIMARY_APP_HOSTS.has(host)) {
        return `${window.location.origin}${parsed.pathname}${parsed.search}`;
      }
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

// Warn loudly in production if the API base URL is unset
if (
  typeof process !== "undefined" &&
  process.env.NODE_ENV === "production" &&
  !process.env.NEXT_PUBLIC_API_BASE &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  console.error(
    "[HeptaCert] NEXT_PUBLIC_API_BASE is not set. " +
    "Browser requests will use the current origin /api; server-side code keeps the local development fallback."
  );
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("heptacert_token");
}

export function setToken(token: string) {
  localStorage.setItem("heptacert_token", token);
}

export function clearToken() {
  localStorage.removeItem("heptacert_token");
}

export function getSelectedOrganizationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("heptacert_organization_id");
}

export function setSelectedOrganizationId(id: string | number | null) {
  if (typeof window === "undefined") return;
  if (id === null || id === "") {
    localStorage.removeItem("heptacert_organization_id");
    window.dispatchEvent(new CustomEvent("heptacert:organization-context-change"));
    return;
  }
  localStorage.setItem("heptacert_organization_id", String(id));
  window.dispatchEvent(new CustomEvent("heptacert:organization-context-change"));
}

export function getPublicMemberToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("heptacert_public_member_token");
}

export const PUBLIC_MEMBER_TOKEN_EVENT = "heptacert:public-member-token-change";

function emitPublicMemberTokenChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PUBLIC_MEMBER_TOKEN_EVENT));
}

export function setPublicMemberToken(token: string) {
  localStorage.setItem("heptacert_public_member_token", token);
  emitPublicMemberTokenChange();
}

export function clearPublicMemberToken() {
  localStorage.removeItem("heptacert_public_member_token");
  emitPublicMemberTokenChange();
}

export async function consumeOAuthBridgeToken(): Promise<{ mode: "admin" | "member"; access_token: string }> {
  const res = await fetch(apiUrl("/auth/oauth/bridge/exchange"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new ApiError(res.status, "OAuth oturumu alınamadı veya süresi doldu.");
  }
  return res.json();
}

export function getRoleFromToken(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload?.role ?? null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function formatApiDetail(detail: unknown): string {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item: any) => {
        if (typeof item === "string") return item;
        const location = Array.isArray(item?.loc) ? item.loc.join(".") : "";
        const message = item?.msg || item?.message || JSON.stringify(item);
        return location ? `${location}: ${message}` : String(message);
      })
      .join("\n");
  }
  if (typeof detail === "object") {
    const anyDetail = detail as any;
    if (typeof anyDetail.message === "string") return anyDetail.message;
    if (typeof anyDetail.msg === "string") return anyDetail.msg;
  }
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

async function requestApi(
  path: string,
  init: RequestInit = {},
  options: { token?: string | null; onUnauthorized?: () => void } = {}
) {
  const token = options.token ?? null;
  const headers = new Headers(init.headers);
  const method = (init.method || "GET").toUpperCase();

  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const selectedOrganizationId = getSelectedOrganizationId();
  if (token && selectedOrganizationId && !headers.has("X-Organization-Id")) {
    headers.set("X-Organization-Id", selectedOrganizationId);
  }
  if (typeof window !== "undefined" && !headers.has("X-App-Lang")) {
    headers.set("X-App-Lang", localStorage.getItem("heptacert-lang") || "tr");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let res: Response;
  try {
    res = await fetch(`${getApiBase()}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
      cache: init.cache ?? (method === "GET" ? "no-store" : undefined),
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === "AbortError") throw new ApiError(0, "İstek zaman aşımına uğradı.");
    throw new ApiError(0, err?.message || "Ağ hatası.");
  }
  clearTimeout(timeout);

  if (res.status === 401) {
    let detail = "";
    try {
      const j = await res.json();
      detail = formatApiDetail(j?.detail) || formatApiDetail(j);
    } catch {}
    if (token) {
      options.onUnauthorized?.();
      throw new ApiError(401, detail || "Oturum sona erdi.");
    }
    throw new ApiError(401, detail || "E-posta veya şifre hatalı.");
  }

  if (!res.ok) {
    let detail = `İstek başarısız (${res.status})`;
    try {
      const j = await res.json();
      detail = formatApiDetail(j?.detail) || formatApiDetail(j) || detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res;
}

export async function apiFetch<T = Response>(path: string, init: RequestInit = {}): Promise<T> {
  return requestApi(path, init, {
    token: getToken(),
    onUnauthorized: () => {
      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/admin/login";
      }
    },
  }) as Promise<T>;
}

export async function publicApiFetch<T = Response>(path: string, init: RequestInit = {}): Promise<T> {
  return requestApi(path, init) as Promise<T>;
}

export async function memberApiFetch<T = Response>(path: string, init: RequestInit = {}): Promise<T> {
  return requestApi(path, init, {
    token: getPublicMemberToken(),
    onUnauthorized: () => {
      clearPublicMemberToken();
    },
  }) as Promise<T>;
}

// -----------------------------------------------------------------------------

export interface EventOut {
  id: number;
  public_id?: string | null;
  name: string;
  template_image_url: string;
  config: Record<string, unknown>;
  event_date?: string | null;
  event_description?: string | null;
  event_location?: string | null;
  min_sessions_required: number;
  registration_closed?: boolean;
  event_banner_url?: string | null;
  auto_email_on_cert?: boolean;
  cert_email_template_id?: number | null;
  visibility?: "private" | "unlisted" | "public";
  require_email_verification?: boolean;
  registration_quota?: number | null;
  registration_quota_enabled?: boolean;
  event_type?: "certificate_event" | "seminar" | "workshop" | "conference" | "concert" | "training" | "club_event" | "online_event" | "custom";
  certificate_enabled?: boolean;
  checkin_enabled?: boolean;
  ticketing_enabled?: boolean;
  registration_enabled?: boolean;
  raffles_enabled?: boolean;
  gamification_enabled?: boolean;
  requires_approval?: boolean;
}

export interface CertificateTemplatePreset {
  id: string;
  name: string;
  template_image_url?: string | null;
  config: Record<string, unknown>;
  min_plan?: string;
  enterprise_locked?: boolean;
  version?: number;
  created_at: string;
  updated_at: string;
}

export async function listCertificateTemplatePresets(): Promise<CertificateTemplatePreset[]> {
  const res = await apiFetch("/admin/certificate-template-presets");
  return res.json();
}

export async function listBuiltinCertificateTemplatePresets(): Promise<CertificateTemplatePreset[]> {
  const res = await apiFetch("/admin/certificate-template-presets/builtin");
  return res.json();
}

export interface BadgeTemplatePreset {
  slug: string;
  type: string;
  name: string;
  description: string;
  color_hex: string;
  icon_emoji: string;
  criteria: Record<string, number | boolean>;
  notes: string;
}

export async function listBuiltinBadgeTemplates(lang = "tr"): Promise<BadgeTemplatePreset[]> {
  const res = await apiFetch(`/admin/badge-templates?lang=${lang}`);
  const data = await res.json();
  return data.templates ?? [];
}

export async function saveEventCertificateTemplatePreset(
  eventId: number,
  name: string,
  options: { enterprise_locked?: boolean; min_plan?: "growth" | "enterprise" } = {},
): Promise<CertificateTemplatePreset> {
  const res = await apiFetch(`/admin/events/${eventId}/certificate-template-presets`, {
    method: "POST",
    body: JSON.stringify({ name, ...options }),
  });
  return res.json();
}

export async function listCertificateTemplatePresetVersions(presetId: string): Promise<Array<{ version: number; created_at: string }>> {
  const res = await apiFetch(`/admin/certificate-template-presets/${presetId}/versions`);
  return res.json();
}

export async function rollbackCertificateTemplatePreset(presetId: string, version: number): Promise<CertificateTemplatePreset> {
  const res = await apiFetch(`/admin/certificate-template-presets/${presetId}/rollback/${version}`, { method: "POST" });
  return res.json();
}

export async function listCertificateTemplateSnapshots(presetId: string): Promise<Array<{ id: number; scenario: string; render_hash: string; created_at: string }>> {
  const res = await apiFetch(`/admin/certificate-template-presets/${presetId}/snapshots`);
  return res.json();
}

export async function applyCertificateTemplatePreset(eventId: number, presetId: string): Promise<EventOut> {
  const res = await apiFetch(`/admin/events/${eventId}/certificate-template-presets/${presetId}/apply`, {
    method: "POST",
  });
  return res.json();
}

export async function deleteCertificateTemplatePreset(presetId: string): Promise<void> {
  await apiFetch(`/admin/certificate-template-presets/${presetId}`, { method: "DELETE" });
}

export interface EmailTemplate {
  id: number;
  event_id?: number | null;
  created_by: number;
  name: string;
  subject_tr: string;
  subject_en: string;
  body_html: string;
  template_type: "system" | "custom" | string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export async function listEventEmailTemplates(eventId: number): Promise<EmailTemplate[]> {
  const res = await apiFetch(`/admin/events/${eventId}/email-templates`);
  return res.json();
}

export async function listSystemEmailTemplates(): Promise<EmailTemplate[]> {
  const res = await apiFetch("/system/email-templates");
  return res.json();
}

export type AutomationTrigger =
  | "attended_event"
  | "registered_no_show"
  | "certificate_issued"
  | "survey_not_completed"
  | "badge_earned";

export type AutomationActionType = "send_email" | "create_reminder" | "webhook_dispatch";

export interface AutomationAction {
  type: AutomationActionType;
  label?: string;
  email_template_id?: number | null;
  reminder_delay_hours?: number | null;
  webhook_url?: string | null;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  trigger_label: string;
  enabled: boolean;
  actions: AutomationAction[];
  created_at: string;
  updated_at: string;
}

export interface AutomationSummary {
  trigger_counts: Record<AutomationTrigger, number>;
  trigger_labels: Record<AutomationTrigger, string>;
  action_labels: Record<AutomationActionType, string>;
  rules: AutomationRule[];
}

export interface AutomationRuleInput {
  name: string;
  trigger: AutomationTrigger;
  enabled: boolean;
  actions: AutomationAction[];
}

export async function getEventAutomations(eventId: number): Promise<AutomationSummary> {
  const res = await apiFetch(`/admin/events/${eventId}/automations`);
  return res.json();
}

export async function createEventAutomation(eventId: number, rule: AutomationRuleInput): Promise<AutomationSummary> {
  const res = await apiFetch(`/admin/events/${eventId}/automations`, {
    method: "POST",
    body: JSON.stringify(rule),
  });
  return res.json();
}

export async function updateEventAutomation(eventId: number, ruleId: string, rule: AutomationRuleInput): Promise<AutomationSummary> {
  const res = await apiFetch(`/admin/events/${eventId}/automations/${ruleId}`, {
    method: "PATCH",
    body: JSON.stringify(rule),
  });
  return res.json();
}

export async function deleteEventAutomation(eventId: number, ruleId: string): Promise<AutomationSummary> {
  const res = await apiFetch(`/admin/events/${eventId}/automations/${ruleId}`, { method: "DELETE" });
  return res.json();
}

export async function dispatchEventAutomationsNow(eventId: number): Promise<{
  events: number;
  rules: number;
  targets: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const res = await apiFetch(`/admin/events/${eventId}/automations/dispatch-now`, { method: "POST" });
  return res.json();
}

export interface AutomationDispatchLog {
  rule_id: string;
  updated_at: string;
  dispatched_count: number;
  sent: number;
  failed: number;
  skipped: number;
  recent: Array<Record<string, any>>;
}

export interface AutomationDryRun {
  rule_id: string;
  trigger: string;
  target_count: number;
  sample_recipients: Array<Record<string, any>>;
  actions: AutomationAction[];
}

export async function dryRunEventAutomation(eventId: number, ruleId: string): Promise<AutomationDryRun> {
  const res = await apiFetch(`/admin/events/${eventId}/automations/${ruleId}/dry-run`);
  return res.json();
}

export async function listEventAutomationLogs(
  eventId: number,
  params: { limit?: number; offset?: number } = {},
): Promise<AutomationDispatchLog[]> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/admin/events/${eventId}/automations/logs${suffix}`);
  return res.json();
}

export type AudienceSegmentKey =
  | "attended_no_certificate"
  | "certificate_holders"
  | "survey_respondents"
  | "no_shows"
  | "repeat_attendees"
  | "registration_answer"
  | "location_filter"
  | "composition";

export interface SegmentCompositionRule {
  segment_key: AudienceSegmentKey;
  filters?: Record<string, any>;
}

export interface SegmentComposition {
  operator: "AND" | "OR";
  rules: SegmentCompositionRule[];
}

export interface AudienceSegment {
  key: AudienceSegmentKey;
  label: string;
  description: string;
  count: number;
  dynamic?: boolean;
}

export interface AudienceSegmentPreview {
  segment: AudienceSegment;
  attendees: Array<{
    id: number;
    name: string;
    email: string;
    registered_at: string;
    email_verified: boolean;
    survey_completed: boolean;
    registration_answers: Record<string, unknown>;
  }>;
}

export interface SavedAudienceSegment {
  id: number;
  name: string;
  segment_key: AudienceSegmentKey;
  filters: Record<string, any>;
  visibility: string;
  last_count: number;
  last_computed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SegmentExportJob {
  id: number;
  event_id: number;
  segment_key: AudienceSegmentKey;
  filters: Record<string, any>;
  status: string;
  row_count: number;
  file_name?: string | null;
  sync_google_sheets: boolean;
  google_spreadsheet_url?: string | null;
  google_sheet_name?: string | null;
  error_message?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  pii_mode?: "masked" | "full";
}

export async function listEventSegments(
  eventId: number,
  params: { field_id?: string; answer?: string; location?: string } = {},
): Promise<AudienceSegment[]> {
  const qs = new URLSearchParams();
  if (params.field_id) qs.set("field_id", params.field_id);
  if (params.answer) qs.set("answer", params.answer);
  if (params.location) qs.set("location", params.location);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/admin/events/${eventId}/segments${suffix}`);
  return res.json();
}

export async function listSavedEventSegments(eventId: number): Promise<SavedAudienceSegment[]> {
  const res = await apiFetch(`/admin/events/${eventId}/segments/saved/list`);
  return res.json();
}

export async function saveEventSegment(
  eventId: number,
  payload: { name: string; segment_key: AudienceSegmentKey; filters?: Record<string, any>; visibility?: string },
): Promise<SavedAudienceSegment> {
  const res = await apiFetch(`/admin/events/${eventId}/segments/saved`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteSavedEventSegment(eventId: number, segmentId: number): Promise<void> {
  await apiFetch(`/admin/events/${eventId}/segments/saved/${segmentId}`, { method: "DELETE" });
}

export async function createSegmentExportJob(
  eventId: number,
  payload: { segment_key: AudienceSegmentKey; filters?: Record<string, any>; sync_google_sheets?: boolean; pii_mode?: "masked" | "full" },
): Promise<SegmentExportJob> {
  const res = await apiFetch(`/admin/events/${eventId}/segments/export-jobs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function handoffSegmentToCrm(
  eventId: number,
  segmentKey: AudienceSegmentKey,
  payload: { add_tags?: string[]; lifecycle_status?: string | null; priority?: string | null },
  params: { field_id?: string; answer?: string; location?: string; composition?: SegmentComposition } = {},
): Promise<{ updated: number; skipped: number }> {
  const qs = new URLSearchParams();
  if (params.field_id) qs.set("field_id", params.field_id);
  if (params.answer) qs.set("answer", params.answer);
  if (params.location) qs.set("location", params.location);
  if (params.composition) qs.set("composition", JSON.stringify(params.composition));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/admin/events/${eventId}/segments/${segmentKey}/handoff/crm${suffix}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function handoffSegmentToAutomation(
  eventId: number,
  segmentKey: AudienceSegmentKey,
  payload: { name: string; email_template_id?: number | null; enabled?: boolean },
  params: { field_id?: string; answer?: string; location?: string; composition?: SegmentComposition } = {},
): Promise<{ rule_id: string; target_count: number }> {
  const qs = new URLSearchParams();
  if (params.field_id) qs.set("field_id", params.field_id);
  if (params.answer) qs.set("answer", params.answer);
  if (params.location) qs.set("location", params.location);
  if (params.composition) qs.set("composition", JSON.stringify(params.composition));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/admin/events/${eventId}/segments/${segmentKey}/handoff/automation${suffix}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function listSegmentExportJobs(eventId: number): Promise<SegmentExportJob[]> {
  const res = await apiFetch(`/admin/events/${eventId}/segments/export-jobs`);
  return res.json();
}

export function getSegmentExportJobDownloadUrl(eventId: number, jobId: number): string {
  return `${getApiBase()}/admin/events/${eventId}/segments/export-jobs/${jobId}/download`;
}

export async function previewEventSegment(
  eventId: number,
  segmentKey: AudienceSegmentKey,
  params: { field_id?: string; answer?: string; location?: string; limit?: number; offset?: number; composition?: SegmentComposition } = {},
): Promise<AudienceSegmentPreview> {
  const qs = new URLSearchParams();
  if (params.field_id) qs.set("field_id", params.field_id);
  if (params.answer) qs.set("answer", params.answer);
  if (params.location) qs.set("location", params.location);
  if ((params as any).composition) qs.set("composition", JSON.stringify((params as any).composition));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/admin/events/${eventId}/segments/${segmentKey}${suffix}`);
  return res.json();
}

export function getEventSegmentExportUrl(
  eventId: number,
  segmentKey: AudienceSegmentKey,
  params: { field_id?: string; answer?: string; location?: string; limit?: number; offset?: number; composition?: SegmentComposition; pii_mode?: "masked" | "full" } = {},
): string {
  const qs = new URLSearchParams();
  if (params.field_id) qs.set("field_id", params.field_id);
  if (params.answer) qs.set("answer", params.answer);
  if (params.location) qs.set("location", params.location);
  if ((params as any).composition) qs.set("composition", JSON.stringify((params as any).composition));
  if (params.pii_mode) qs.set("pii_mode", params.pii_mode);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return `${getApiBase()}/admin/events/${eventId}/segments/${segmentKey}/export${suffix}`;
}

export type CrmLifecycleStatus = "lead" | "active" | "vip" | "renewal" | "inactive";

export interface CrmMeta {
  notes: string;
  tags: string[];
  lifecycle_status: string;
  owner_user_id?: number | null;
  owner_email?: string | null;
  priority?: string;
  lead_score?: number;
  next_follow_up_at?: string | null;
  custom_fields?: Record<string, any>;
  updated_at?: string | null;
}

export interface CrmParticipantListItem {
  id?: number;
  email: string;
  name: string;
  event_count: number;
  certificate_count: number;
  attended_count: number;
  survey_count: number;
  latest_activity_at?: string | null;
  meta: CrmMeta;
}

export interface CrmParticipantDetail {
  email: string;
  name: string;
  meta: CrmMeta;
  summary: Record<string, number>;
  history: Array<Record<string, any>>;
  timeline: Array<{ at?: string | null; type: string; label: string }>;
}

export interface CrmSummary {
  total_participants: number;
  profiled_participants: number;
  latest_activity_at?: string | null;
  by_status: Record<string, number>;
}

export interface CrmSnapshot {
  email: string;
  name?: string | null;
  event_count: number;
  certificate_count: number;
  attended_count: number;
  survey_count: number;
  ticket_count: number;
  latest_activity_at?: string | null;
  computed_at: string;
}

export interface CrmAuditLog {
  id: number;
  email: string;
  actor_user_id?: number | null;
  actor_email?: string | null;
  action: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  created_at: string;
}

export interface CrmSavedView {
  id: number;
  name: string;
  filters: Record<string, any>;
  visibility: string;
  last_count: number;
  last_computed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmDuplicateCandidate {
  name_key: string;
  display_name: string;
  emails: string[];
  count: number;
}

export async function getCrmSummary(): Promise<CrmSummary> {
  const res = await apiFetch("/admin/crm/summary");
  return res.json();
}

export async function listCrmParticipants(
  params: { query?: string; tag?: string; status?: string; limit?: number; offset?: number } = {},
): Promise<CrmParticipantListItem[]> {
  const qs = new URLSearchParams();
  if (params.query) qs.set("query", params.query);
  if (params.tag) qs.set("tag", params.tag);
  if (params.status) qs.set("status", params.status);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/admin/crm/participants${suffix}`);
  return res.json();
}

export async function getCrmParticipant(email: string): Promise<CrmParticipantDetail> {
  const qs = new URLSearchParams({ email });
  const res = await apiFetch(`/admin/crm/participant?${qs.toString()}`);
  return res.json();
}

export async function updateCrmParticipant(payload: {
  email: string;
  notes?: string;
  tags?: string[];
  lifecycle_status?: string;
  owner_user_id?: number | null;
  priority?: string;
  lead_score?: number;
  next_follow_up_at?: string | null;
  custom_fields?: Record<string, any>;
}): Promise<CrmMeta> {
  const res = await apiFetch("/admin/crm/participant", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function refreshCrmParticipantSnapshot(email: string): Promise<CrmSnapshot> {
  const qs = new URLSearchParams({ email });
  const res = await apiFetch(`/admin/crm/participant/snapshot?${qs.toString()}`);
  return res.json();
}

export async function listCrmAuditLogs(
  params: { email?: string; limit?: number; offset?: number } = {},
): Promise<CrmAuditLog[]> {
  const qs = new URLSearchParams();
  if (params.email) qs.set("email", params.email);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/admin/crm/audit${suffix}`);
  return res.json();
}

export async function listCrmSavedViews(): Promise<CrmSavedView[]> {
  const res = await apiFetch("/admin/crm/views");
  return res.json();
}

export async function createCrmSavedView(payload: {
  name: string;
  filters: Record<string, any>;
  visibility?: string;
}): Promise<CrmSavedView> {
  const res = await apiFetch("/admin/crm/views", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateCrmSavedView(
  viewId: number,
  payload: { name: string; filters: Record<string, any>; visibility?: string },
): Promise<CrmSavedView> {
  const res = await apiFetch(`/admin/crm/views/${viewId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteCrmSavedView(viewId: number): Promise<void> {
  await apiFetch(`/admin/crm/views/${viewId}`, { method: "DELETE" });
}

export async function bulkUpdateCrmParticipants(payload: {
  emails: string[];
  add_tags?: string[];
  remove_tags?: string[];
  lifecycle_status?: string;
  owner_user_id?: number | null;
  priority?: string;
}): Promise<{ updated: number; skipped: number }> {
  const res = await apiFetch("/admin/crm/bulk-update", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function exportSelectedCrmParticipants(emails: string[]): Promise<{ blob: Blob; filename: string }> {
  const res = await apiFetch("/admin/crm/export-selected", {
    method: "POST",
    body: JSON.stringify({ emails }),
  });
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return {
    blob: await res.blob(),
    filename: match?.[1] || "crm-selected.csv",
  };
}

export async function sendCrmBulkEmail(payload: {
  emails: string[];
  email_template_id: number;
}): Promise<{ sent: number; skipped: number; failed: number }> {
  const res = await apiFetch("/admin/crm/bulk-email", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function listCrmDuplicateCandidates(params: { limit?: number } = {}): Promise<CrmDuplicateCandidate[]> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/admin/crm/duplicates${suffix}`);
  return res.json();
}

export async function mergeCrmParticipants(payload: {
  target_email: string;
  source_emails: string[];
}): Promise<{ target_email: string; merged_emails: string[]; aliases_created: number }> {
  const res = await apiFetch("/admin/crm/merge", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function tagCrmNoShows(): Promise<{ tagged: number; skipped: number }> {
  const res = await apiFetch("/admin/crm/tag-no-shows", { method: "POST" });
  return res.json();
}

export async function importCrmFromCsv(file: File): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch("/admin/crm/import-csv", { method: "POST", body: form });
  return res.json();
}

export async function filterCrmByLeadScore(params: {
  min_score?: number;
  max_score?: number;
  lifecycle_status?: string;
}): Promise<{ emails: string[]; count: number }> {
  const qs = new URLSearchParams();
  if (params.min_score !== undefined) qs.set("min_score", String(params.min_score));
  if (params.max_score !== undefined) qs.set("max_score", String(params.max_score));
  if (params.lifecycle_status) qs.set("lifecycle_status", params.lifecycle_status);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/admin/crm/filter-by-score${suffix}`);
  return res.json();
}

export interface HubSpotIntegrationStatus {
  configured: boolean;
  enabled: boolean;
  token_preview?: string | null;
}

export async function getHubSpotIntegration(): Promise<HubSpotIntegrationStatus> {
  const res = await apiFetch("/admin/crm/integrations/hubspot");
  return res.json();
}

export async function updateHubSpotIntegration(payload: { private_app_token: string; enabled: boolean }): Promise<HubSpotIntegrationStatus> {
  const res = await apiFetch("/admin/crm/integrations/hubspot", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteHubSpotIntegration(): Promise<{ ok: boolean }> {
  const res = await apiFetch("/admin/crm/integrations/hubspot", { method: "DELETE" });
  return res.json();
}

export async function testHubSpotIntegration(): Promise<{ ok: boolean }> {
  const res = await apiFetch("/admin/crm/integrations/hubspot/test", { method: "POST" });
  return res.json();
}

export async function pushCrmParticipantsToHubSpot(payload: {
  emails: string[];
  create_missing?: boolean;
}): Promise<{ pushed: number; created: number; updated: number; failed: number; errors: string[] }> {
  const res = await apiFetch("/admin/crm/integrations/hubspot/push", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export type TrainingStatus = "assigned" | "in_progress" | "completed" | "overdue" | "waived";

export interface TrainingAssignment {
  id: number;
  organization_id: number;
  title: string;
  description?: string | null;
  assignee_name: string;
  assignee_email: string;
  department_id?: number | null;
  department?: string | null;
  manager_email?: string | null;
  approval_status?: string;
  approved_by?: number | null;
  approved_at?: string | null;
  evidence_url?: string | null;
  evidence_label?: string | null;
  event_id?: number | null;
  event_name?: string | null;
  required: boolean;
  status: TrainingStatus | string;
  effective_status: TrainingStatus | string;
  due_at?: string | null;
  completed_at?: string | null;
  certificate_id?: number | null;
  certificate_uuid?: string | null;
  renewal_due_at?: string | null;
  renewal_event_id?: number | null;
  renewal_event_name?: string | null;
  notify_before_days: number;
  last_notified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingAssignmentInput {
  title: string;
  description?: string | null;
  assignee_name: string;
  assignee_email: string;
  department_id?: number | null;
  department?: string | null;
  manager_email?: string | null;
  approval_required?: boolean;
  approval_status?: string;
  evidence_url?: string | null;
  evidence_label?: string | null;
  event_id?: number | null;
  required?: boolean;
  status?: TrainingStatus | string;
  due_at?: string | null;
  completed_at?: string | null;
  certificate_id?: number | null;
  renewal_due_at?: string | null;
  renewal_event_id?: number | null;
  notify_before_days?: number;
}

export interface OrganizationDepartment {
  id: number;
  name: string;
  code?: string | null;
  manager_name?: string | null;
  manager_email?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingTemplate {
  id: number;
  name: string;
  title: string;
  description?: string | null;
  department_id?: number | null;
  department_name?: string | null;
  required: boolean;
  default_due_days: number;
  renewal_interval_days?: number | null;
  notify_before_days: number;
  approval_required: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingRecurringRule {
  id: number;
  template_id: number;
  department_id?: number | null;
  source: string;
  enabled: boolean;
  lookback_days: number;
  last_run_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingNotificationLog {
  id: number;
  assignment_id: number;
  recipient_email: string;
  status: string;
  attempts: number;
  error_message?: string | null;
  target_date?: string | null;
  sent_at?: string | null;
  created_at: string;
}

export interface TrainingReport {
  total: number;
  completed: number;
  overdue: number;
  due_soon: number;
  renewal_due_soon: number;
  by_department: Array<{
    department: string;
    total: number;
    completed: number;
    overdue: number;
    due_soon: number;
    renewal_due_soon: number;
  }>;
  by_status: Record<string, number>;
}

export interface RenewalRecommendation {
  id: number;
  name: string;
  event_date?: string | null;
  event_location?: string | null;
  reason: string;
}

export async function listTrainingAssignments(
  params: { status?: string; department?: string; query?: string; limit?: number; offset?: number } = {},
): Promise<TrainingAssignment[]> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.department) qs.set("department", params.department);
  if (params.query) qs.set("query", params.query);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/admin/training/assignments${suffix}`);
  return res.json();
}

export async function listTrainingDepartments(): Promise<OrganizationDepartment[]> {
  const res = await apiFetch("/admin/training/departments");
  return res.json();
}

export async function createTrainingDepartment(payload: {
  name: string;
  code?: string | null;
  manager_name?: string | null;
  manager_email?: string | null;
  active?: boolean;
}): Promise<OrganizationDepartment> {
  const res = await apiFetch("/admin/training/departments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function listTrainingTemplates(): Promise<TrainingTemplate[]> {
  const res = await apiFetch("/admin/training/templates");
  return res.json();
}

export async function createTrainingTemplate(payload: Partial<TrainingTemplate> & { name: string; title: string }): Promise<TrainingTemplate> {
  const res = await apiFetch("/admin/training/templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function bulkAssignTrainingFromTemplate(payload: {
  template_id: number;
  assignees: Array<{ assignee_name: string; assignee_email: string; department_id?: number | null; department?: string | null; manager_email?: string | null }>;
}): Promise<{ created: number; skipped: number }> {
  const res = await apiFetch("/admin/training/bulk-assign", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function listTrainingRecurringRules(): Promise<TrainingRecurringRule[]> {
  const res = await apiFetch("/admin/training/recurring-rules");
  return res.json();
}

export async function createTrainingRecurringRule(payload: {
  template_id: number;
  department_id?: number | null;
  source?: string;
  enabled?: boolean;
  lookback_days?: number;
}): Promise<TrainingRecurringRule> {
  const res = await apiFetch("/admin/training/recurring-rules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function runTrainingRecurringRules(): Promise<{ created: number; skipped: number }> {
  const res = await apiFetch("/admin/training/recurring-rules/run", { method: "POST" });
  return res.json();
}

export async function listTrainingNotificationLogs(): Promise<TrainingNotificationLog[]> {
  const res = await apiFetch("/admin/training/notification-logs");
  return res.json();
}

export async function createTrainingAssignment(payload: TrainingAssignmentInput): Promise<TrainingAssignment> {
  const res = await apiFetch("/admin/training/assignments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateTrainingAssignment(
  assignmentId: number,
  payload: Partial<TrainingAssignmentInput>,
): Promise<TrainingAssignment> {
  const res = await apiFetch(`/admin/training/assignments/${assignmentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteTrainingAssignment(assignmentId: number): Promise<void> {
  await apiFetch(`/admin/training/assignments/${assignmentId}`, { method: "DELETE" });
}

export async function getTrainingReport(): Promise<TrainingReport> {
  const res = await apiFetch("/admin/training/report");
  return res.json();
}

export function getTrainingReportExportUrl(format: "csv" | "pdf" = "csv"): string {
  return `${getApiBase()}/admin/training/report/export?format=${format}`;
}

export async function exportTrainingReportFile(format: "csv" | "pdf" = "csv"): Promise<Blob> {
  const res = await apiFetch(`/admin/training/report/export?format=${format}`);
  return res.blob();
}

export async function listRenewalRecommendations(department?: string): Promise<RenewalRecommendation[]> {
  const qs = new URLSearchParams();
  if (department) qs.set("department", department);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/admin/training/renewal-recommendations${suffix}`);
  return res.json();
}

export async function sendTrainingRenewalNotifications(): Promise<{ sent: number; failed: number; skipped: number }> {
  const res = await apiFetch("/admin/training/send-renewal-notifications", { method: "POST" });
  return res.json();
}

export type EventTeamRole = "manager" | "checkin" | "certificate" | "email" | "analytics" | "viewer";
export type EventTeamStatus = "pending" | "active" | "disabled";
export type EventTeamPermission =
  | "event:view"
  | "team:manage"
  | "attendees:read"
  | "attendees:write"
  | "checkin:write"
  | "certificates:write"
  | "email:write"
  | "analytics:read"
  | "settings:write";

export interface EventTeamMember {
  id: number;
  event_id: number;
  user_id?: number | null;
  email: string;
  role: EventTeamRole;
  permissions?: EventTeamPermission[] | null;
  effective_permissions: EventTeamPermission[];
  status: EventTeamStatus;
  invited_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface EventAccessOut {
  event_id: number;
  is_owner: boolean;
  role: string;
  permissions: EventTeamPermission[];
  permission_labels: Record<string, string>;
}

export interface EventTeamActivity {
  id: number;
  actor_email?: string | null;
  actor_label: string;
  action: string;
  action_label: string;
  detail: string;
  created_at: string;
}

export interface PublicMemberMe {
  id: number;
  public_id: string;
  email: string;
  contact_email?: string | null;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  headline?: string | null;
  location?: string | null;
  website_url?: string | null;
  created_at: string;
}

export interface PublicMemberProfile {
  public_id: string;
  display_name: string;
  contact_email?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  headline?: string | null;
  location?: string | null;
  website_url?: string | null;
  created_at: string;
  event_count: number;
  comment_count: number;
  certificates: PublicMemberCertificate[];
  certificates_hidden?: boolean;
}

export interface PublicMemberCertificate {
  uuid: string;
  public_id?: string | null;
  student_name: string;
  event_id: number;
  event_name: string;
  event_date?: string | null;
  status: "active" | "revoked" | "expired" | string;
  issued_at?: string | null;
  verify_url: string;
}

export interface PublicMemberEvent {
  attendee_id: number;
  event_id: number;
  event_name: string;
  event_date?: string | null;
  event_location?: string | null;
  event_banner_url?: string | null;
  registered_at: string;
  email_verified: boolean;
  sessions_attended: number;
  min_sessions_required: number;
  status_url?: string | null;
}

export interface PublicEventListItem {
  id: number;
  public_id: string;
  name: string;
  organization_public_id?: string | null;
  organization_name?: string | null;
  organization_logo?: string | null;
  event_date?: string | null;
  event_description?: string | null;
  event_location?: string | null;
  event_banner_url?: string | null;
  min_sessions_required: number;
  registration_closed: boolean;
  visibility: "private" | "unlisted" | "public";
  session_count: number;
  event_type?: "certificate_event" | "seminar" | "workshop" | "conference" | "concert" | "training" | "club_event" | "online_event" | "custom";
  certificate_enabled?: boolean;
  checkin_enabled?: boolean;
  ticketing_enabled?: boolean;
  registration_enabled?: boolean;
  raffles_enabled?: boolean;
  gamification_enabled?: boolean;
}

export interface PublicSurvey {
  is_required: boolean;
  survey_type: "builtin" | "external" | "both";
  external_url?: string | null;
  has_builtin_questions: boolean;
  builtin_questions?: Array<{
    id: string;
    type: string;
    question: string;
    required?: boolean;
    options?: string[];
  }>;
}

export interface PublicEventInfo {
  id: number;
  public_id: string;
  name: string;
  event_date: string | null;
  event_description: string | null;
  event_location: string | null;
  min_sessions_required: number;
  registration_closed?: boolean;
  event_type?: "certificate_event" | "seminar" | "workshop" | "conference" | "concert" | "training" | "club_event" | "online_event" | "custom";
  certificate_enabled?: boolean;
  checkin_enabled?: boolean;
  ticketing_enabled?: boolean;
  registration_enabled?: boolean;
  raffles_enabled?: boolean;
  gamification_enabled?: boolean;
  requires_approval?: boolean;
  event_banner_url: string | null;
  registration_fields?: RegistrationField[];
  survey?: PublicSurvey | null;
  sessions: Array<{
    id: number;
    name: string;
    session_date: string | null;
    session_start: string | null;
    session_location: string | null;
  }>;
  visibility: "private" | "unlisted" | "public";
  require_email_verification: boolean;
  kvkk_consent_required?: boolean;
  kvkk_consent_text?: string | null;
  organizer_privacy_notice_enabled?: boolean;
  organizer_privacy_notice_text?: string | null;
  show_cross_border_transfer_notice?: boolean;
  require_cross_border_transfer_consent?: boolean;
  data_controller_name?: string | null;
  data_controller_contact_email?: string | null;
  data_retention_note?: string | null;
}

export interface PublicEventDetail {
  id: number;
  public_id: string;
  name: string;
  organization_public_id?: string | null;
  organization_name?: string | null;
  organization_logo?: string | null;
  event_date?: string | null;
  event_description?: string | null;
  event_location?: string | null;
  min_sessions_required: number;
  registration_closed: boolean;
  event_banner_url?: string | null;
  registration_fields: RegistrationField[];
  survey?: Record<string, unknown> | null;
  sessions: Array<{
    id: number;
    name: string;
    session_date?: string | null;
    session_start?: string | null;
    session_location?: string | null;
  }>;
  visibility: "private" | "unlisted" | "public";
  event_type?: "certificate_event" | "seminar" | "workshop" | "conference" | "concert" | "training" | "club_event" | "online_event" | "custom";
  certificate_enabled?: boolean;
  checkin_enabled?: boolean;
  ticketing_enabled?: boolean;
  registration_enabled?: boolean;
  raffles_enabled?: boolean;
  gamification_enabled?: boolean;
  requires_approval?: boolean;
  kvkk_consent_required?: boolean;
  kvkk_consent_text?: string | null;
  organizer_privacy_notice_enabled?: boolean;
  organizer_privacy_notice_text?: string | null;
  show_cross_border_transfer_notice?: boolean;
  require_cross_border_transfer_consent?: boolean;
  data_controller_name?: string | null;
  data_controller_contact_email?: string | null;
  data_retention_note?: string | null;
  has_active_quiz?: boolean;
}

export interface RegistrationDocumentUploadOut {
  field_id?: string;
  path: string;
  name: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
}

export type EventTicketStatus = "issued" | "used" | "cancelled" | "revoked";

export interface PublicTicketInfo {
  event_id: number;
  event_public_id: string;
  event_name: string;
  attendee_name: string;
  attendee_email: string;
  status: EventTicketStatus;
  issued_at: string;
  checked_in_at?: string | null;
}

export interface EventTicketOut {
  id: number;
  event_id: number;
  attendee_id: number;
  attendee_name: string;
  attendee_email: string;
  token: string;
  qr_payload: string;
  status: EventTicketStatus;
  issued_at: string;
  checked_in_at?: string | null;
}

export interface PublicEventComment {
  id: number;
  event_id: number;
  member_public_id: string;
  member_name: string;
  member_email?: string | null;
  member_avatar_url?: string | null;
  body: string;
  status: "visible" | "hidden" | "reported";
  report_count: number;
  created_at: string;
  updated_at: string;
}

export interface PublicOrganizationListItem {
  public_id: string;
  org_name: string;
  brand_logo?: string | null;
  brand_color: string;
  bio?: string | null;
  website_url?: string | null;
  event_count: number;
  follower_count: number;
}

export interface PublicOrganizationDetail extends PublicOrganizationListItem {
  linkedin_url?: string | null;
  github_url?: string | null;
  x_url?: string | null;
  instagram_url?: string | null;
  is_following: boolean;
  events: PublicEventListItem[];
}

export interface CommunityPostComment {
  id: number;
  post_public_id: string;
  member_public_id: string;
  member_name: string;
  member_avatar_url?: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityPost {
  public_id: string;
  organization_public_id?: string | null;
  organization_name?: string | null;
  author_type: "organization" | "member" | string;
  author_public_id?: string | null;
  author_name: string;
  author_avatar_url?: string | null;
  body: string;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunityPostEditHistoryItem {
  old_body: string;
  new_body: string;
  edited_at: string;
  edited_by_member_public_id: string;
}

export interface PublicSurveyAccess {
  attendee_id: number;
  attendee_name: string;
  attendee_email: string;
  survey_token: string;
}

export type EventRouteId = string | number;

function toEventRouteId(eventId: EventRouteId) {
  return encodeURIComponent(String(eventId));
}

export type RegistrationFieldType = "text" | "textarea" | "number" | "tel" | "select" | "date" | "file";

export interface RegistrationField {
  id: string;
  label: string;
  type: RegistrationFieldType;
  required: boolean;
  required_when_field_id?: string;
  required_when_equals?: string;
  placeholder?: string | null;
  helper_text?: string | null;
  options?: Array<string | { label: string; capacity?: number | null }>;
  selection_mode?: "single" | "multiple";  // For "select" type: single choice or multiple choices
}

export interface SessionOut {
  id: number;
  event_id: number;
  name: string;
  session_date?: string | null;
  session_start?: string | null;
  session_location?: string | null;
  checkin_token: string;
  is_active: boolean;
  created_at: string;
  attendance_count: number;
}

export interface AttendeeOut {
  id: number;
  event_id: number;
  name: string;
  email: string;
  source: "import" | "self_register";
  registered_at: string;
  sessions_attended: number;
  has_certificate: boolean;
  public_member_id?: number | null;
  public_member_name?: string | null;
  public_member_email?: string | null;
  registration_answers: Record<string, unknown>;
}

export interface AttendanceMatrixRow {
  attendee_id: number;
  name: string;
  email: string;
  source: string;
  sessions_attended: number;
  meets_threshold: boolean;
  has_certificate: boolean;
  certificate_uuid: string | null;
  checkins: Record<string, string | null>;
}

export interface AttendanceMatrix {
  event_id: number;
  min_sessions_required: number;
  sessions: { id: number; name: string; session_date: string | null }[];
  rows: AttendanceMatrixRow[];
}

export interface EventOperationCheckin {
  id: number;
  attendee_id: number;
  attendee_name: string;
  attendee_email: string;
  session_id: number;
  session_name: string;
  checked_in_at: string | null;
  ip_address?: string | null;
}

export interface EventOperationSnapshot {
  event_id: number;
  event_name: string;
  generated_at: string;
  overview: {
    attendees: number;
    sessions: number;
    active_sessions: number;
    attendance_records: number;
    tickets_total: number;
    tickets_used: number;
  };
  tickets: {
    total: number;
    by_status: Record<string, number>;
  };
  sessions: Array<{
    id: number;
    name: string;
    is_active: boolean;
    session_date: string | null;
    session_start: string | null;
    attendance_count: number;
  }>;
  recent_checkins: EventOperationCheckin[];
}

export interface EventRaffleWinnerOut {
  attendee_id: number;
  attendee_name: string;
  attendee_email: string;
  sessions_attended: number;
  drawn_at: string;
}

export interface EventRaffleEligibleOut {
  attendee_id: number;
  attendee_name: string;
  attendee_email: string;
  sessions_attended: number;
}

export interface EventRaffleOut {
  id: number;
  event_id: number;
  title: string;
  prize_name: string;
  description?: string | null;
  min_sessions_required: number;
  winner_count: number;
  reserve_winner_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  drawn_at?: string | null;
  eligible_count: number;
  total_attendees: number;
  eligible_attendees: EventRaffleEligibleOut[];
  winners: EventRaffleWinnerOut[];
}

export interface AuditLogOut {
  id: number;
  user_id?: number | null;
  user_email?: string | null;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  ip_address?: string | null;
  details?: string | null;
  extra?: Record<string, any> | null;
  created_at: string;
}

// -----------------------------------------------------------------------------

export interface SubscriptionInfo {
  active: boolean;
  plan_id: string | null;
  expires_at: string | null;
  role?: string | null;
}

export async function getMySubscription(): Promise<SubscriptionInfo> {
  const res = await apiFetch("/billing/subscription");
  return res.json();
}

export async function deleteAdminAccount(data: {
  current_password: string;
}): Promise<{ detail: string }> {
  const res = await apiFetch("/me", {
    method: "DELETE",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateEventMeta(
  eventId: number,
  data: {
    name: string;
    event_date?: string | null;
    event_description?: string | null;
    event_location?: string | null;
    min_sessions_required?: number | null;
    event_banner_url?: string | null;
  }
) {
  const res = await apiFetch(`/admin/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json() as Promise<EventOut>;
}

export async function uploadEventBanner(eventId: number, file: File): Promise<{ event_banner_url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch(`/admin/events/${eventId}/banner-upload`, {
    method: "POST",
    body: form,
  });
  return res.json();
}

export async function listEventTeamMembers(eventId: number): Promise<EventTeamMember[]> {
  const res = await apiFetch(`/admin/events/${eventId}/team`);
  return res.json();
}

export async function getEventAccess(eventId: number): Promise<EventAccessOut> {
  const res = await apiFetch(`/admin/events/${eventId}/access`);
  return res.json();
}

export async function addEventTeamMember(eventId: number, data: { email: string; role: EventTeamRole; permissions?: EventTeamPermission[] | null }): Promise<EventTeamMember> {
  const res = await apiFetch(`/admin/events/${eventId}/team`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateEventTeamMember(
  eventId: number,
  memberId: number,
  data: { role?: EventTeamRole; status?: EventTeamStatus; permissions?: EventTeamPermission[] | null },
): Promise<EventTeamMember> {
  const res = await apiFetch(`/admin/events/${eventId}/team/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteEventTeamMember(eventId: number, memberId: number): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/admin/events/${eventId}/team/${memberId}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function listEventTeamActivity(eventId: number): Promise<EventTeamActivity[]> {
  const res = await apiFetch(`/admin/events/${eventId}/team/activity`);
  return res.json();
}

export async function acceptEventTeamInvite(token: string): Promise<{ ok: boolean; event_id: number; event_name: string; email: string; status: EventTeamStatus; message: string }> {
  const res = await publicApiFetch("/event-team/invitations/accept", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  return res.json();
}

// -----------------------------------------------------------------------------

export async function listSessions(eventId: number): Promise<SessionOut[]> {
  const res = await apiFetch(`/admin/events/${eventId}/sessions`);
  return res.json();
}

export async function createSession(
  eventId: number,
  data: { name: string; session_date?: string; session_start?: string; session_location?: string }
): Promise<SessionOut> {
  const res = await apiFetch(`/admin/events/${eventId}/sessions`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateSession(
  eventId: number,
  sessionId: number,
  data: { name: string; session_date?: string; session_start?: string; session_location?: string }
): Promise<SessionOut> {
  const res = await apiFetch(`/admin/events/${eventId}/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteSession(eventId: number, sessionId: number) {
  await apiFetch(`/admin/events/${eventId}/sessions/${sessionId}`, { method: "DELETE" });
}

export async function toggleSession(eventId: number, sessionId: number): Promise<SessionOut> {
  const res = await apiFetch(`/admin/events/${eventId}/sessions/${sessionId}/toggle`, {
    method: "PATCH",
  });
  return res.json();
}

export async function fetchSessionQr(eventId: number, sessionId: number): Promise<{ blob: Blob; checkinUrl: string }> {
  const res = await apiFetch(`/admin/events/${eventId}/sessions/${sessionId}/qr`);
  const blob = await res.blob();
  const checkinUrl = res.headers.get("x-checkin-url") || "";
  return { blob, checkinUrl };
}

// -----------------------------------------------------------------------------

export async function listAttendees(
  eventId: number,
  params: { page?: number; limit?: number; search?: string } = {}
): Promise<{ items: AttendeeOut[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  const res = await apiFetch(`/admin/events/${eventId}/attendees?${qs}`);
  return res.json();
}

export async function importAttendees(eventId: number, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch(`/admin/events/${eventId}/attendees/import`, {
    method: "POST",
    body: form,
  });
  return res.json() as Promise<{ added: number; skipped: number }>;
}

export async function createManualAttendee(
  eventId: number,
  data: { email: string; first_name: string; last_name: string }
): Promise<AttendeeOut> {
  const res = await apiFetch(`/admin/events/${eventId}/attendees`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteAttendee(eventId: number, attendeeId: number) {
  await apiFetch(`/admin/events/${eventId}/attendees/${attendeeId}`, { method: "DELETE" });
}

export async function getAdminAttendeeSurveyLink(
  eventId: number,
  attendeeId: number,
): Promise<{ attendee_id: number; attendee_name: string; attendee_email: string; survey_token: string; survey_url: string }> {
  const res = await apiFetch(`/admin/events/${eventId}/attendees/${attendeeId}/survey-link`);
  return res.json();
}

// -----------------------------------------------------------------------------

export async function getAttendanceMatrix(eventId: number): Promise<AttendanceMatrix> {
  const res = await apiFetch(`/admin/events/${eventId}/attendance`);
  return res.json();
}

export async function getEventOperations(eventId: number): Promise<EventOperationSnapshot> {
  const res = await apiFetch(`/admin/events/${eventId}/operations`);
  return res.json();
}

export async function undoAttendanceRecord(eventId: number, recordId: number): Promise<{ ok: boolean; message: string }> {
  const res = await apiFetch(`/admin/events/${eventId}/attendance-records/${recordId}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function listEventRaffles(eventId: number): Promise<EventRaffleOut[]> {
  const res = await apiFetch(`/admin/events/${eventId}/raffles`);
  return res.json();
}

export async function createEventRaffle(
  eventId: number,
  data: {
    title: string;
    prize_name: string;
    description?: string;
    min_sessions_required: number;
    winner_count: number;
    reserve_winner_count: number;
  }
): Promise<EventRaffleOut> {
  const res = await apiFetch(`/admin/events/${eventId}/raffles`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateEventRaffle(
  eventId: number,
  raffleId: number,
  data: {
    title?: string;
    prize_name?: string;
    description?: string;
    min_sessions_required?: number;
    winner_count?: number;
    reserve_winner_count?: number;
  }
): Promise<EventRaffleOut> {
  const res = await apiFetch(`/admin/events/${eventId}/raffles/${raffleId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteEventRaffle(eventId: number, raffleId: number) {
  await apiFetch(`/admin/events/${eventId}/raffles/${raffleId}`, { method: "DELETE" });
}

export async function drawEventRaffle(eventId: number, raffleId: number): Promise<EventRaffleOut> {
  const res = await apiFetch(`/admin/events/${eventId}/raffles/${raffleId}/draw`, { method: "POST" });
  return res.json();
}

export async function redrawEventRaffle(eventId: number, raffleId: number): Promise<EventRaffleOut> {
  const res = await apiFetch(`/admin/events/${eventId}/raffles/${raffleId}/redraw`, { method: "POST" });
  return res.json();
}

export async function resetEventRaffle(eventId: number, raffleId: number): Promise<EventRaffleOut> {
  const res = await apiFetch(`/admin/events/${eventId}/raffles/${raffleId}/reset`, { method: "POST" });
  return res.json();
}

export async function exportEventRaffle(eventId: number, raffleId: number): Promise<{ blob: Blob; filename: string }> {
  const res = await apiFetch(`/admin/events/${eventId}/raffles/${raffleId}/export`);
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  const filenameMatch = disposition.match(/filename=\"?([^"]+)\"?/i);
  return { blob, filename: filenameMatch?.[1] || `raffle_${raffleId}_results.csv` };
}

export async function listEventRaffleAuditLogs(eventId: number): Promise<AuditLogOut[]> {
  const res = await apiFetch(`/admin/events/${eventId}/raffles/audit`);
  return res.json();
}

export async function adminManualCheckin(
  eventId: number,
  sessionId: number,
  email: string
): Promise<{
  ok: boolean;
  message: string;
  duplicate?: boolean;
  record_id?: number | null;
  checked_in_at?: string | null;
  attendee_id?: number;
  attendee_name?: string;
  attendee_email?: string;
  session_id?: number;
  session_name?: string;
}> {
  const res = await apiFetch(`/admin/events/${eventId}/sessions/${sessionId}/checkin`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export interface CheckinLookupItem {
  attendee_id: number;
  name: string;
  email: string;
  ticket_status?: string | null;
  checked_in_at?: string | null;
}

export interface CheckinMetrics {
  total: number;
  successful: number;
  failed: number;
  last_hour: number;
  by_method: Array<{ method: string; count: number }>;
  by_staff: Array<{ email: string; count: number; successful: number }>;
  recent: Array<{
    id: number;
    method: string;
    source: string;
    success: boolean;
    message?: string | null;
    created_at: string;
    attendee_name?: string | null;
    attendee_email?: string | null;
    session_name?: string | null;
  }>;
  duplicate_count: number;
  invalid_count: number;
  capacity_alerts: Array<{ session_id: number; session_name: string; used: number; capacity: number; fill_rate: number }>;
  hourly: Array<{ hour: string; count: number }>;
}

export interface CheckinActivity {
  id: number;
  method: string;
  source: string;
  entry_point?: string;
  success: boolean;
  duplicate?: boolean;
  invalid_reason?: string | null;
  message?: string | null;
  created_at: string;
  attendee_name?: string | null;
  attendee_email?: string | null;
  session_name?: string | null;
  staff_email?: string | null;
}

export async function lookupCheckinAttendees(eventId: number, query: string): Promise<CheckinLookupItem[]> {
  const qs = new URLSearchParams({ query });
  const res = await apiFetch(`/admin/events/${eventId}/checkin-lookup?${qs.toString()}`);
  return res.json();
}

export async function getCheckinMetrics(
  eventId: number,
  params: { hours?: number; recent_limit?: number } = {},
): Promise<CheckinMetrics> {
  const qs = new URLSearchParams();
  if (params.hours) qs.set("hours", String(params.hours));
  if (params.recent_limit) qs.set("recent_limit", String(params.recent_limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/admin/events/${eventId}/checkin-metrics${suffix}`);
  return res.json();
}

export async function listCheckinActivity(
  eventId: number,
  params: { success?: boolean; method?: string; source?: string; entry_point?: string; staff_email?: string; limit?: number; offset?: number } = {},
): Promise<CheckinActivity[]> {
  const qs = new URLSearchParams();
  if (params.success !== undefined) qs.set("success", String(params.success));
  if (params.method) qs.set("method", params.method);
  if (params.source) qs.set("source", params.source);
  if (params.entry_point) qs.set("entry_point", params.entry_point);
  if (params.staff_email) qs.set("staff_email", params.staff_email);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/admin/events/${eventId}/checkin-activity${suffix}`);
  return res.json();
}

export async function issueCheckinNonce(eventId: number, kioskToken?: string): Promise<{ nonce: string; expires_at: string }> {
  const res = await apiFetch(`/admin/events/${eventId}/checkin-nonce`, {
    method: "POST",
    headers: kioskToken ? { "X-Kiosk-Token": kioskToken } : undefined,
  });
  return res.json();
}

export interface KioskSession {
  id: number;
  label: string;
  token?: string | null;
  session_id?: number | null;
  expires_at: string;
  revoked_at?: string | null;
  last_seen_at?: string | null;
  created_at: string;
}

export async function createKioskSession(eventId: number, payload: { label?: string; session_id?: number | null; ttl_hours?: number }): Promise<KioskSession> {
  const res = await apiFetch(`/admin/events/${eventId}/kiosk-sessions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function listKioskSessions(eventId: number): Promise<KioskSession[]> {
  const res = await apiFetch(`/admin/events/${eventId}/kiosk-sessions`);
  return res.json();
}

export async function revokeKioskSession(eventId: number, kioskId: number): Promise<KioskSession> {
  const res = await apiFetch(`/admin/events/${eventId}/kiosk-sessions/${kioskId}/revoke`, { method: "POST" });
  return res.json();
}

export function getAttendanceExportUrl(eventId: number, fmt: "xlsx" | "csv" = "xlsx"): string {
  return `${getApiBase()}/admin/events/${eventId}/attendance/export?fmt=${fmt}`;
}

export async function exportAttendanceFile(
  eventId: number,
  fmt: "xlsx" | "csv" = "xlsx",
): Promise<{ blob: Blob; filename: string }> {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${getApiBase()}/admin/events/${eventId}/attendance/export?fmt=${fmt}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = `Export failed (${res.status})`;
    try {
      const json = await res.json();
      const errorMsg = json?.detail || JSON.stringify(json);
      throw new ApiError(res.status, errorMsg);
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(res.status, detail);
    }
  }

  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  const filenameMatch = disposition.match(/filename=\"?([^"]+)\"?/i);
  return {
    blob,
    filename: filenameMatch?.[1] || `attendance_${eventId}.${fmt}`,
  };
}

export async function exportRegistrationDocumentsZip(
  eventId: number,
): Promise<{ blob: Blob; filename: string }> {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${getApiBase()}/admin/events/${eventId}/registration-documents/export`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = `Document export failed (${res.status})`;
    try {
      const json = await res.json();
      const errorMsg = json?.detail || JSON.stringify(json);
      throw new ApiError(res.status, errorMsg);
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(res.status, detail);
    }
  }

  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  const filenameMatch = disposition.match(/filename=\"?([^"]+)\"?/i);
  return {
    blob,
    filename: filenameMatch?.[1] || `registration-documents-event-${eventId}.zip`,
  };
}

export async function downloadRegistrationDocument(
  eventId: number,
  path: string,
): Promise<{ blob: Blob; filename: string }> {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const selectedOrganizationId = getSelectedOrganizationId();
  if (token && selectedOrganizationId && !headers.has("X-Organization-Id")) {
    headers.set("X-Organization-Id", selectedOrganizationId);
  }

  const res = await fetch(
    `${getApiBase()}/admin/events/${eventId}/registration-documents/file?path=${encodeURIComponent(path)}`,
    { method: "GET", headers, cache: "no-store" },
  );
  if (!res.ok) {
    throw new ApiError(res.status, `Document download failed (${res.status})`);
  }
  const disposition = res.headers.get("content-disposition") || "";
  const filenameMatch = disposition.match(/filename=\"?([^"]+)\"?/i);
  return {
    blob: await res.blob(),
    filename: filenameMatch?.[1] || path.split("/").pop() || "document",
  };
}

// -----------------------------------------------------------------------------

export async function bulkCertifyAttendees(
  eventId: number,
  hosting_term: "monthly" | "yearly" = "yearly"
): Promise<{ created: number; already_had_cert: number; below_threshold: number; total_attendees: number; spent_heptacoin: number }> {
  const res = await apiFetch(`/admin/events/${eventId}/bulk-certify`, {
    method: "POST",
    body: JSON.stringify({ hosting_term }),
  });
  return res.json();
}

export type BulkCertJobOut = {
  id: number;
  event_id: number;
  status: string;
  total_count: number;
  current_index: number;
  created_count: number;
  failed_count: number;
  already_exists_count: number;
  spent_heptacoin: number;
  error_message?: string | null;
  zip_file_path?: string | null;
};

/** Enqueues bulk certificate generation for eligible attendees. Returns a job to poll. */
export async function bulkCertifyQueue(eventId: number): Promise<BulkCertJobOut> {
  const res = await apiFetch(`/admin/events/${eventId}/bulk-certify-queue`, { method: "POST" });
  return res.json();
}

export async function getBulkGenerateJob(eventId: number, jobId: number): Promise<BulkCertJobOut> {
  const res = await apiFetch(`/admin/events/${eventId}/bulk-generate-jobs/${jobId}`);
  return res.json();
}

// -----------------------------------------------------------------------------

export async function registerPublicMember(data: {
  display_name: string;
  email: string;
  password: string;
  terms_accepted: boolean;
}) {
  const res = await publicApiFetch("/public/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function resendOrganizerVerification(email: string): Promise<{ detail: string }> {
  const res = await publicApiFetch("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function resendPublicMemberVerification(email: string): Promise<{ detail: string }> {
  const res = await publicApiFetch("/public/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function loginPublicMember(data: { email: string; password: string }): Promise<{
  access_token: string;
  token_type: string;
  member: PublicMemberMe;
}> {
  const res = await publicApiFetch("/public/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getPublicMemberMe(): Promise<PublicMemberMe> {
  const res = await memberApiFetch("/public/me");
  return res.json();
}

export async function updatePublicMemberProfile(data: {
  display_name: string;
  bio?: string | null;
  headline?: string | null;
  location?: string | null;
  website_url?: string | null;
  contact_email?: string | null;
}): Promise<PublicMemberMe> {
  const res = await memberApiFetch("/public/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function uploadPublicMemberAvatar(file: File): Promise<PublicMemberMe> {
  const form = new FormData();
  form.append("file", file);
  const res = await memberApiFetch("/public/me/avatar", {
    method: "POST",
    body: form,
  });
  return res.json();
}

export async function changePublicMemberPassword(data: {
  current_password: string;
  new_password: string;
}): Promise<{ detail: string }> {
  const res = await memberApiFetch("/public/me/password", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deletePublicMemberAccount(data: {
  current_password: string;
}): Promise<{ detail: string }> {
  const res = await memberApiFetch("/public/me", {
    method: "DELETE",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function forgotPublicMemberPassword(data: { email: string }): Promise<{ detail: string }> {
  const res = await publicApiFetch("/public/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function resetPublicMemberPassword(data: {
  token: string;
  new_password: string;
}): Promise<{ detail: string }> {
  const res = await publicApiFetch("/public/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function listMyPublicEvents(): Promise<PublicMemberEvent[]> {
  const res = await memberApiFetch("/public/my-events");
  return res.json();
}

export async function getPublicMemberProfile(memberPublicId: string): Promise<PublicMemberProfile> {
  const token = getPublicMemberToken();
  const res = token
    ? await memberApiFetch(`/public/members/${memberPublicId}`)
    : await publicApiFetch(`/public/members/${memberPublicId}`);
  return res.json();
}

export async function listPublicEvents(params: {
  scope?: "all" | "upcoming" | "past";
  limit?: number;
  offset?: number;
  search?: string;
} = {}): Promise<PublicEventListItem[]> {
  const qs = new URLSearchParams();
  if (params.scope) qs.set("scope", params.scope);
  if (typeof params.limit === "number") qs.set("limit", String(params.limit));
  if (typeof params.offset === "number") qs.set("offset", String(params.offset));
  if (params.search?.trim()) qs.set("search", params.search.trim());
  const query = qs.toString();
  const res = await publicApiFetch(`/public/events${query ? `?${query}` : ""}`);
  return res.json();
}

export async function listPublicOrganizations(): Promise<PublicOrganizationListItem[]> {
  const res = await publicApiFetch("/public/organizations");
  return res.json();
}

export async function getPublicOrganizationDetail(orgPublicId: string): Promise<PublicOrganizationDetail> {
  const token = getPublicMemberToken();
  const res = token
    ? await memberApiFetch(`/public/organizations/${orgPublicId}`)
    : await publicApiFetch(`/public/organizations/${orgPublicId}`);
  return res.json();
}

export async function followPublicOrganization(orgPublicId: string): Promise<{ ok: boolean }> {
  const res = await memberApiFetch(`/public/organizations/${orgPublicId}/follow`, { method: "POST" });
  return res.json();
}

export async function unfollowPublicOrganization(orgPublicId: string): Promise<{ ok: boolean }> {
  const res = await memberApiFetch(`/public/organizations/${orgPublicId}/follow`, { method: "DELETE" });
  return res.json();
}

export async function listPublicFeed(params: {
  limit?: number;
  offset?: number;
} = {}): Promise<CommunityPost[]> {
  const qs = new URLSearchParams();
  if (typeof params.limit === "number") qs.set("limit", String(params.limit));
  if (typeof params.offset === "number") qs.set("offset", String(params.offset));
  const query = qs.toString();
  const token = getPublicMemberToken();
  const res = token
    ? await memberApiFetch(`/public/feed${query ? `?${query}` : ""}`)
    : await publicApiFetch(`/public/feed${query ? `?${query}` : ""}`);
  return res.json();
}

export async function createPublicFeedPost(body: string): Promise<CommunityPost> {
  const res = await memberApiFetch("/public/feed", {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  return res.json();
}

export async function listOrganizationFeed(orgPublicId: string, params: {
  limit?: number;
  offset?: number;
} = {}): Promise<CommunityPost[]> {
  const qs = new URLSearchParams();
  if (typeof params.limit === "number") qs.set("limit", String(params.limit));
  if (typeof params.offset === "number") qs.set("offset", String(params.offset));
  const query = qs.toString();
  const token = getPublicMemberToken();
  const path = `/public/organizations/${orgPublicId}/feed${query ? `?${query}` : ""}`;
  const res = token ? await memberApiFetch(path) : await publicApiFetch(path);
  return res.json();
}

export async function createOrganizationFeedPost(orgPublicId: string, body: string): Promise<CommunityPost> {
  const res = await memberApiFetch(`/public/organizations/${orgPublicId}/feed`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  return res.json();
}

export async function likeCommunityPost(postPublicId: string): Promise<{ ok: boolean }> {
  const res = await memberApiFetch(`/public/posts/${postPublicId}/like`, { method: "POST" });
  return res.json();
}

export async function unlikeCommunityPost(postPublicId: string): Promise<{ ok: boolean }> {
  const res = await memberApiFetch(`/public/posts/${postPublicId}/like`, { method: "DELETE" });
  return res.json();
}

export async function updateCommunityPost(postPublicId: string, body: string): Promise<CommunityPost> {
  const res = await memberApiFetch(`/public/posts/${postPublicId}`, {
    method: "PATCH",
    body: JSON.stringify({ body }),
  });
  return res.json();
}

export async function deleteCommunityPost(postPublicId: string): Promise<{ ok: boolean }> {
  const res = await memberApiFetch(`/public/posts/${postPublicId}`, { method: "DELETE" });
  return res.json();
}

export async function listCommunityPostEditHistory(postPublicId: string): Promise<CommunityPostEditHistoryItem[]> {
  const token = getPublicMemberToken();
  const path = `/public/posts/${postPublicId}/history`;
  const res = token ? await memberApiFetch(path) : await publicApiFetch(path);
  return res.json();
}

export async function listCommunityPostComments(postPublicId: string, params: {
  limit?: number;
} = {}): Promise<CommunityPostComment[]> {
  const qs = new URLSearchParams();
  if (typeof params.limit === "number") qs.set("limit", String(params.limit));
  const query = qs.toString();
  const token = getPublicMemberToken();
  const path = `/public/posts/${postPublicId}/comments${query ? `?${query}` : ""}`;
  const res = token ? await memberApiFetch(path) : await publicApiFetch(path);
  return res.json();
}

export async function createCommunityPostComment(postPublicId: string, body: string): Promise<CommunityPostComment> {
  const res = await memberApiFetch(`/public/posts/${postPublicId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  return res.json();
}

export async function listAdminCommunityPosts(): Promise<CommunityPost[]> {
  const res = await apiFetch("/admin/community/posts");
  return res.json();
}

export async function createAdminCommunityPost(body: string): Promise<CommunityPost> {
  const res = await apiFetch("/admin/community/posts", {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  return res.json();
}

export async function deleteAdminCommunityPost(postPublicId: string): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/admin/community/posts/${postPublicId}`, { method: "DELETE" });
  return res.json();
}

export async function getPublicEventDetail(eventId: EventRouteId): Promise<PublicEventDetail> {
  const res = await publicApiFetch(`/public/events/${toEventRouteId(eventId)}`);
  return res.json();
}

export async function listPublicEventComments(eventId: EventRouteId): Promise<PublicEventComment[]> {
  const res = await publicApiFetch(`/public/events/${toEventRouteId(eventId)}/comments`);
  return res.json();
}

export async function createPublicEventComment(eventId: EventRouteId, body: string): Promise<PublicEventComment> {
  const res = await memberApiFetch(`/public/events/${toEventRouteId(eventId)}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  return res.json();
}

export async function reportPublicEventComment(
  eventId: EventRouteId,
  commentId: number,
): Promise<{ ok: boolean; status: string; report_count: number }> {
  const res = await memberApiFetch(`/public/events/${toEventRouteId(eventId)}/comments/${commentId}/report`, {
    method: "POST",
  });
  return res.json();
}

export async function listAdminEventComments(eventId: number): Promise<PublicEventComment[]> {
  const res = await apiFetch(`/admin/events/${eventId}/comments`);
  return res.json();
}

export async function updateAdminEventComment(
  eventId: number,
  commentId: number,
  status: "visible" | "hidden" | "reported",
): Promise<PublicEventComment> {
  const res = await apiFetch(`/admin/events/${eventId}/comments/${commentId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function getPublicEventInfo(eventId: EventRouteId): Promise<PublicEventInfo> {
  const res = await publicApiFetch(`/events/${toEventRouteId(eventId)}/info`);
  return res.json();
}

export async function getEventCapacities(eventId: EventRouteId): Promise<Record<string, Array<{ label: string; capacity?: number | null; remaining?: number | null }>>> {
  const res = await publicApiFetch(`/events/${toEventRouteId(eventId)}/capacities`);
  return res.json();
}

export async function publicRegisterAttendee(
  eventId: EventRouteId,
  data: {
    name: string;
    email: string;
    registration_answers?: Record<string, string | string[]>;
    kvkk_accepted?: boolean;
    organizer_notice_accepted?: boolean;
    cross_border_notice_read?: boolean;
    cross_border_transfer_consent?: boolean;
    registration_documents?: Array<RegistrationDocumentUploadOut & { field_id?: string }>;
  }
): Promise<{
  ok: boolean;
  message: string;
  already_registered?: boolean;
  email_verified?: boolean;
  verification_required?: boolean;
  attendee_id: number;
  attendee_name?: string;
  attendee_email?: string;
  survey_token?: string;
  survey_url?: string;
  status_url?: string;
  ticket?: {
    id: number;
    token: string;
    qr_payload: string;
    status: string;
    issued_at?: string | null;
    checked_in_at?: string | null;
  } | null;
}> {
  const fetcher = getPublicMemberToken() ? memberApiFetch : publicApiFetch;
  const res = await fetcher(`/events/${toEventRouteId(eventId)}/register`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export function logLegalDocumentEvent(data: {
  document: "kvkk" | "privacy" | "explicit_consent" | "organizer_notice" | "cross_border_notice";
  event_type?: "click" | "view";
  event_id?: EventRouteId;
  context?: string;
  source_path?: string;
}) {
  const payload = JSON.stringify({
    document: data.document,
    event_type: data.event_type || "click",
    event_id: data.event_id != null ? toEventRouteId(data.event_id) : undefined,
    context: data.context,
    source_path: data.source_path,
  });
  const url = `${getApiBase()}/legal/document-events`;
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon(url, blob)) return;
  }
  publicApiFetch("/legal/document-events", {
    method: "POST",
    body: payload,
  }).catch(() => undefined);
}

export async function uploadPublicRegistrationDocument(
  eventId: EventRouteId,
  file: File,
): Promise<RegistrationDocumentUploadOut> {
  const form = new FormData();
  form.append("file", file);
  const fetcher = getPublicMemberToken() ? memberApiFetch : publicApiFetch;
  const res = await fetcher(`/events/${toEventRouteId(eventId)}/registration-document`, {
    method: "POST",
    body: form,
  });
  return res.json();
}

export async function getPublicTicket(token: string): Promise<PublicTicketInfo> {
  const res = await publicApiFetch(`/tickets/${encodeURIComponent(token)}`);
  return res.json();
}

export async function listEventTickets(eventId: number): Promise<EventTicketOut[]> {
  const res = await apiFetch(`/admin/events/${eventId}/tickets`);
  return res.json();
}

export async function checkInEventTicket(eventId: number, token: string): Promise<EventTicketOut> {
  const res = await apiFetch(`/admin/events/${eventId}/tickets/check-in`, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  return res.json();
}

export async function updateEventTicketStatus(
  eventId: number,
  ticketId: number,
  status: "issued" | "cancelled" | "revoked",
): Promise<EventTicketOut> {
  const res = await apiFetch(`/admin/events/${eventId}/tickets/${ticketId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function resolvePublicSurveyToken(
  eventId: EventRouteId,
  surveyToken: string,
): Promise<PublicSurveyAccess> {
  const res = await publicApiFetch(
    `/events/${toEventRouteId(eventId)}/survey-access?token=${encodeURIComponent(surveyToken)}`,
  );
  return res.json();
}

export async function verifyPublicAttendeeEmail(
  eventId: EventRouteId,
  token: string,
): Promise<{ detail: string; attendee_id: number; event_id: number; status_url?: string | null }> {
  const res = await publicApiFetch(
    `/events/${toEventRouteId(eventId)}/verify-email?token=${encodeURIComponent(token)}`,
    { method: "GET" },
  );
  return res.json();
}

export async function resendPublicAttendeeVerification(
  eventId: EventRouteId,
  email: string,
): Promise<{ detail: string }> {
  const res = await publicApiFetch(`/events/${toEventRouteId(eventId)}/resend-verification`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function submitBuiltinSurvey(
  eventId: EventRouteId,
  attendeeId: number | null,
  answers: Record<string, unknown>,
  surveyToken?: string,
) {
  const res = await fetch(`${getApiBase()}/surveys/${toEventRouteId(eventId)}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(attendeeId ? { "attendee-id": String(attendeeId) } : {}),
    },
    body: JSON.stringify({
      attendee_id: attendeeId || undefined,
      survey_token: surveyToken || undefined,
      survey_type: "builtin",
      answers,
    }),
  });

  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail || "Anket bağlantısı doğrulanamadı");
  }
  return res.json();
}

export type PublicParticipantStatus = {
  attendee_id: number;
  attendee_name: string;
  attendee_email: string;
  event_id: number;
  event_name: string;
  event_type?: string;
  certificate_enabled?: boolean;
  checkin_enabled?: boolean;
  ticketing_enabled?: boolean;
  raffles_enabled?: boolean;
  gamification_enabled?: boolean;
  sessions_attended: number;
  total_sessions: number;
  sessions_required: number;
  survey_enabled: boolean;
  survey_required: boolean;
  survey_completed: boolean;
  can_download_cert: boolean;
  certificate_ready: boolean;
  certificate_count: number;
  latest_certificate_uuid?: string | null;
  latest_certificate_verify_url?: string | null;
  ticket?: {
    id: number;
    token: string;
    qr_payload: string;
    status: string;
    ticket_url: string;
    issued_at?: string | null;
    checked_in_at?: string | null;
  } | null;
  badge_count: number;
  badges: PublicParticipantBadge[];
  eligible_raffles: Array<{
    id: number;
    title: string;
    prize_name: string;
    status: string;
    min_sessions_required: number;
  }>;
};

export async function getPublicParticipantStatus(
  eventId: EventRouteId,
  surveyToken: string,
): Promise<PublicParticipantStatus> {
  const res = await fetch(
    `${getApiBase()}/events/${toEventRouteId(eventId)}/participant-status?token=${encodeURIComponent(surveyToken)}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    let detail = `İstek başarısız (${res.status})`;
    try {
      const j = await res.json();
      detail = j?.detail || JSON.stringify(j);
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export async function getMyPublicParticipantStatus(
  eventId: EventRouteId,
): Promise<PublicParticipantStatus> {
  const res = await memberApiFetch(`/events/${toEventRouteId(eventId)}/participant-status/me`, {
    cache: "no-store",
  });
  return res.json();
}

export type PublicParticipantBadge = {
  id: number;
  event_id: number;
  attendee_id: number;
  badge_type: string;
  badge_name?: string | null;
  badge_description?: string | null;
  badge_icon_url?: string | null;
  badge_color_hex?: string | null;
  attendee_name?: string | null;
  attendee_email?: string | null;
  criteria_met: Record<string, any>;
  awarded_by: number | null;
  awarded_at: string;
  is_automatic: boolean;
  badge_metadata?: Record<string, any> | null;
};

export async function getPublicAttendeeBadges(
  eventId: EventRouteId,
  attendeeId: number,
  email: string,
): Promise<{ total_badges: number; badges: PublicParticipantBadge[] }> {
  const res = await fetch(
    `${getApiBase()}/events/${toEventRouteId(eventId)}/attendees/${attendeeId}/badges?email=${encodeURIComponent(email)}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail || "Rozetler alınamadı");
  }
  return res.json();
}

export async function getCheckinSessionInfo(token: string) {
  const res = await fetch(`${getApiBase()}/attend/${token}`);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail || "Geçersiz QR kodu");
  }
  return res.json();
}

export async function selfCheckin(token: string, email: string) {
  const res = await fetch(`${getApiBase()}/attend/${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail || "Check-in başarısız");
  }
  return res.json() as Promise<{
    success: boolean;
    message: string;
    attendee_name: string;
    sessions_attended: number;
    sessions_required: number;
    total_sessions: number;
  }>;
}

// -----------------------------------------------------------------------------

export interface EventAnalyticsOut {
  event_id: number;
  event_name: string;
  total_attendees: number;
  certified_count: number;
  pending_count: number;
  sessions: { id: number; name: string; attendance_rate: number }[];
}

export async function getEventAnalytics(eventId: number): Promise<EventAnalyticsOut> {
  const res = await apiFetch(`/admin/events/${eventId}/analytics`);
  return res.json();
}

// -----------------------------------------------------------------------------

export interface DashboardStatsOut {
  events_with_stats?: Array<{ event_id: number; event_name: string; total_attendees: number; certified_count: number }>;
}

export async function getDashboardStats(): Promise<DashboardStatsOut> {
  const res = await apiFetch(`/admin/dashboard/stats`);
  return res.json();
}

// -----------------------------------------------------------------------------

export interface AdminOut {
  id: number;
  email: string;
  role: string;
  created_at?: string;
  heptacoin_balance: number;
}
export interface SuperAdminLandingStatsConfig {
  active_members?: string;
  hosted_events?: string;
  issued_certificates?: string;
  active_orgs?: string;
  certs_issued?: string;
  uptime_pct?: string;
  availability?: string;
  use_real_counts?: boolean;
}
export interface SuperadminAudienceItem {
  email: string;
  public_member_count: number;
  attendee_count: number;
}

export interface SuperadminAudienceResponse {
  items: SuperadminAudienceItem[];
  total: number;
  limit: number;
  offset: number;
  source: "all" | "public_members" | "attendees" | "organizers";
  unique_public_member_emails: number;
  unique_attendee_emails: number;
  unique_organizer_emails: number;
}

export interface SuperadminBulkEmailRequest {
  subject: string;
  body_html: string;
  source: "all" | "public_members" | "attendees" | "organizers";
  dry_run?: boolean;
}

export interface SuperadminBulkEmailResponse {
  dry_run: boolean;
  source: "all" | "public_members" | "attendees" | "organizers";
  targeted: number;
  sent: number;
  failed: number;
  message: string;
}

export interface SuperadminBulkEmailJob {
  id: number;
  created_by: number;
  source: "all" | "public_members" | "attendees" | "organizers";
  subject: string;
  total_targets: number;
  sent_count: number;
  failed_count: number;
  status: "pending" | "sending" | "completed" | "failed" | "cancelled";
  cancel_requested: boolean;
  error_message?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

export type SuperadminEmailActivityChannel = "event_bulk" | "superadmin_bulk" | "crm_bulk" | "automation";

export interface SuperadminEmailActivityItem {
  channel: SuperadminEmailActivityChannel;
  job_id: number;
  sender_user_id: number;
  sender_email: string;
  event_id?: number | null;
  event_name?: string | null;
  recipient_group: string;
  subject: string;
  status: string;
  total_targets: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
}

export interface SuperadminEmailActivityResponse {
  items: SuperadminEmailActivityItem[];
  total: number;
  limit: number;
  offset: number;
}

export async function listSuperAdmins(): Promise<AdminOut[]> {
  const res = await apiFetch(`/superadmin/admins`);
  return res.json();
}

export async function getSuperadminEmailAudience(params?: {
  source?: "all" | "public_members" | "attendees" | "organizers";
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<SuperadminAudienceResponse> {
  const qs = new URLSearchParams();
  if (params?.source) qs.set("source", params.source);
  if (params?.search) qs.set("search", params.search);
  if (typeof params?.limit === "number") qs.set("limit", String(params.limit));
  if (typeof params?.offset === "number") qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/superadmin/email-audience${suffix}`);
  return res.json();
}

export async function sendSuperadminBulkEmail(
  payload: SuperadminBulkEmailRequest
): Promise<SuperadminBulkEmailResponse> {
  const res = await apiFetch(`/superadmin/bulk-email`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function sendSuperadminBulkEmailTest(payload: {
  to_email: string;
  subject: string;
  body_html: string;
}): Promise<{ sent: boolean; to_email: string; message: string }> {
  const res = await apiFetch(`/superadmin/bulk-email/test`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function createSuperadminBulkEmailJob(payload: {
  subject: string;
  body_html: string;
  source: "all" | "public_members" | "attendees" | "organizers";
}): Promise<SuperadminBulkEmailJob> {
  const res = await apiFetch(`/superadmin/bulk-email/jobs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function listSuperadminBulkEmailJobs(params?: {
  limit?: number;
  offset?: number;
}): Promise<SuperadminBulkEmailJob[]> {
  const qs = new URLSearchParams();
  if (typeof params?.limit === "number") qs.set("limit", String(params.limit));
  if (typeof params?.offset === "number") qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/superadmin/bulk-email/jobs${suffix}`);
  return res.json();
}

export async function cancelSuperadminBulkEmailJob(jobId: number): Promise<SuperadminBulkEmailJob> {
  const res = await apiFetch(`/superadmin/bulk-email/jobs/${jobId}/cancel`, {
    method: "POST",
  });
  return res.json();
}

export async function retrySuperadminBulkEmailJob(jobId: number): Promise<SuperadminBulkEmailJob> {
  const res = await apiFetch(`/superadmin/bulk-email/jobs/${jobId}/retry`, {
    method: "POST",
  });
  return res.json();
}

export async function listSuperadminEmailActivity(params?: {
  channel?: "all" | SuperadminEmailActivityChannel;
  status?: string;
  sender_user_id?: number;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<SuperadminEmailActivityResponse> {
  const qs = new URLSearchParams();
  if (params?.channel) qs.set("channel", params.channel);
  if (params?.status) qs.set("status", params.status);
  if (typeof params?.sender_user_id === "number") qs.set("sender_user_id", String(params.sender_user_id));
  if (params?.search) qs.set("search", params.search);
  if (typeof params?.limit === "number") qs.set("limit", String(params.limit));
  if (typeof params?.offset === "number") qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/superadmin/email-activity${suffix}`);
  return res.json();
}

export async function createSuperAdmin(data: { email: string; role: string }): Promise<AdminOut> {
  const res = await apiFetch(`/superadmin/admins`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteSuperAdmin(adminId: number): Promise<void> {
  await apiFetch(`/superadmin/admins/${adminId}`, { method: "DELETE" });
}

export async function updateSuperAdminRole(adminId: number, role: string): Promise<AdminOut> {
  const res = await apiFetch(`/superadmin/admins/${adminId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  return res.json();
}

// Connection/Networking API Functions

export interface ConnectionMemberInfo {
  id: number;
  public_id: string;
  display_name: string;
  avatar_url?: string;
  headline?: string;
}

export interface ConnectionStats {
  follower_count: number;
  following_count: number;
  is_following: boolean;
  is_blocked: boolean;
  hide_followers?: boolean;
  hide_following?: boolean;
}

export interface ConnectionPrivacySettings {
  hide_followers: boolean;
  hide_following: boolean;
}

export async function followMember(memberId: string): Promise<{ status: string }> {
  const res = await memberApiFetch(`/public/members/${memberId}/follow`, {
    method: "POST",
  });
  return res.json();
}

export async function unfollowMember(memberId: string): Promise<{ status: string }> {
  const res = await memberApiFetch(`/public/members/${memberId}/follow`, {
    method: "DELETE",
  });
  return res.json();
}

export async function getMemberFollowers(
  memberId: string,
  limit: number = 20,
  offset: number = 0
): Promise<ConnectionMemberInfo[]> {
  const path = `/public/members/${memberId}/followers?limit=${limit}&offset=${offset}`;
  const token = getPublicMemberToken();
  const res = token ? await memberApiFetch(path) : await publicApiFetch(path);
  return res.json();
}

export async function getMemberFollowing(
  memberId: string,
  limit: number = 20,
  offset: number = 0
): Promise<ConnectionMemberInfo[]> {
  const path = `/public/members/${memberId}/following?limit=${limit}&offset=${offset}`;
  const token = getPublicMemberToken();
  const res = token ? await memberApiFetch(path) : await publicApiFetch(path);
  return res.json();
}

export async function getConnectionStats(
  memberId: string
): Promise<ConnectionStats> {
  const path = `/public/members/${memberId}/connection-stats`;
  const token = getPublicMemberToken();
  const res = token ? await memberApiFetch(path) : await publicApiFetch(path);
  return res.json();
}

export async function blockMember(
  memberId: string,
  reason?: string
): Promise<{ status: string }> {
  const res = await memberApiFetch(`/public/members/${memberId}/block`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return res.json();
}

export async function unblockMember(memberId: string): Promise<{ status: string }> {
  const res = await memberApiFetch(`/public/members/${memberId}/block`, {
    method: "DELETE",
  });
  return res.json();
}

export async function getMyConnectionPrivacy(): Promise<ConnectionPrivacySettings> {
  const res = await memberApiFetch("/public/members/me/privacy");
  return res.json();
}

export async function updateMyConnectionPrivacy(
  data: ConnectionPrivacySettings,
): Promise<ConnectionPrivacySettings> {
  const res = await memberApiFetch("/public/members/me/privacy", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export interface CertificatePrivacySettings {
  hide_certificates: boolean;
  visibility: "public" | "connections_only" | "private";
}

export async function getMyCertificatePrivacy(): Promise<CertificatePrivacySettings> {
  const res = await memberApiFetch("/public/members/me/certificate-privacy");
  return res.json();
}

export async function updateMyCertificatePrivacy(
  data: Partial<CertificatePrivacySettings>,
): Promise<CertificatePrivacySettings> {
  const res = await memberApiFetch("/public/members/me/certificate-privacy", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function trackWalletAnalytics(
  eventType: "profile_view" | "certificate_view" | "linkedin_click" | "cv_export_click",
  certificateUuid?: string,
): Promise<void> {
  const qs = new URLSearchParams({ event_type: eventType });
  if (certificateUuid) qs.set("certificate_uuid", certificateUuid);
  await memberApiFetch(`/public/members/me/wallet-analytics?${qs.toString()}`, { method: "POST" });
}

export async function getMyWalletAnalytics(): Promise<{ profile_views: number; certificate_views: number; linkedin_clicks: number; cv_export_clicks: number }> {
  const res = await memberApiFetch("/public/members/me/wallet-analytics");
  return res.json();
}

export async function getMyCertificatePrivacyAudit(): Promise<Array<{ id: number; action: string; before?: Record<string, unknown> | null; after?: Record<string, unknown> | null; created_at: string }>> {
  const res = await memberApiFetch("/public/members/me/certificate-privacy/audit");
  return res.json();
}

export async function ensureCertificateShareCache(certificateUuid: string): Promise<{ ok: boolean; cache_key?: string; image_path?: string | null; invalidated?: boolean }> {
  const res = await publicApiFetch(`/public/certificates/${certificateUuid}/share-cache`, { method: "POST" });
  return res.json();
}

export async function recordProductTelemetry(data: {
  event_name: "feature_open" | "export_started" | "automation_tested" | "segment_previewed" | "checkin_scan" | "training_report_exported";
  feature_key: string;
  resource_type?: string;
  resource_id?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<{ ok: boolean; reason?: string }> {
  const res = await apiFetch("/admin/product-telemetry", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getPlatformHealth(): Promise<{ checked_at: string; probes: Record<string, { ok: boolean; status: string; detail: string }> }> {
  const res = await apiFetch("/superadmin/platform-health");
  return res.json();
}

export async function creditSuperAdminCoins(data: { admin_user_id: number; amount: number }): Promise<{ admin_user_id: number; new_balance: number }> {
  const res = await apiFetch(`/superadmin/coins/credit`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function listAuditLogs(params?: {
  user_id?: number;
  action?: string;
  resource_type?: string;
  category?: "legal" | "security";
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: AuditLogOut[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.user_id) qs.set("user_id", String(params.user_id));
  if (params?.action) qs.set("action", params.action);
  if (params?.resource_type) qs.set("resource_type", params.resource_type);
  if (params?.category) qs.set("category", params.category);
  if (params?.from_date) qs.set("from_date", params.from_date);
  if (params?.to_date) qs.set("to_date", params.to_date);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  
  const res = await apiFetch(`/superadmin/audit-logs?${qs}`);
  const data = await res.json();
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return { items, total: typeof data?.total === "number" ? data.total : items.length };
}

export interface SecurityEventsOut {
  total_24h: number;
  by_action: Record<string, number>;
  suspicious_ips: Array<{ ip: string; count: number }>;
  items: AuditLogOut[];
}

export async function getSecurityEvents(): Promise<SecurityEventsOut> {
  const res = await apiFetch("/superadmin/security-events");
  return res.json();
}

export type QueuedDocumentExport = {
  queued: true;
  job_id: number;
  status: string;
  message: string;
};

export async function downloadAuditLogExport(format: "csv" | "pdf", category?: "legal" | "security"): Promise<void | QueuedDocumentExport> {
  if (format === "pdf") {
    const res = await apiFetch("/admin/document-export-jobs", {
      method: "POST",
      body: JSON.stringify({ export_type: "audit_logs", format, category }),
    });
    const job = await res.json();
    return {
      queued: true,
      job_id: job.id,
      status: job.status,
      message: "PDF çıktısı kuyruğa alındı. Hazır olunca e-posta ile gönderilecek.",
    };
  }
  const qs = new URLSearchParams({ format });
  if (category) qs.set("category", category);
  const res = await apiFetch(`/superadmin/audit-logs/export?${qs}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `audit-logs-${category || "all"}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadOrganizationConsentLogs(format: "csv" | "pdf"): Promise<void | QueuedDocumentExport> {
  if (format === "pdf") {
    const res = await apiFetch("/admin/document-export-jobs", {
      method: "POST",
      body: JSON.stringify({ export_type: "organization_legal_consents", format }),
    });
    const job = await res.json();
    return {
      queued: true,
      job_id: job.id,
      status: job.status,
      message: "PDF çıktısı kuyruğa alındı. Hazır olunca e-posta ile gönderilecek.",
    };
  }
  const res = await apiFetch(`/admin/organization/legal-consents/export?format=${format}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `organization-consent-logs.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Integration status types ──────────────────────────────────────────────────

export interface GoogleSheetsConnectionStatus {
  configured: boolean;
  connected: boolean;
  google_email?: string | null;
  scopes: string[];
  missing_scopes: string[];
}

export interface MicrosoftExcelConnectionStatus {
  configured: boolean;
  connected: boolean;
  microsoft_email?: string | null;
  scopes: string[];
  missing_scopes: string[];
}

export async function getGoogleSheetsConnectionStatus(): Promise<GoogleSheetsConnectionStatus> {
  const res = await apiFetch("/admin/google/sheets/status");
  return res.json();
}

export async function startGoogleSheetsOAuth(next = "/admin/integrations"): Promise<{ authorization_url: string }> {
  const params = new URLSearchParams({ next });
  if (typeof window !== "undefined") params.set("frontend_origin", window.location.origin);
  const res = await apiFetch(`/admin/google/sheets/start?${params}`);
  return res.json();
}

export async function getMicrosoftExcelConnectionStatus(): Promise<MicrosoftExcelConnectionStatus> {
  const res = await apiFetch("/admin/microsoft/excel/status");
  return res.json();
}

export async function startMicrosoftExcelOAuth(next = "/admin/integrations"): Promise<{ authorization_url: string }> {
  const params = new URLSearchParams({ next });
  if (typeof window !== "undefined") params.set("frontend_origin", window.location.origin);
  const res = await apiFetch(`/admin/microsoft/excel/start?${params}`);
  return res.json();
}

export interface GoogleCalendarReservationStatus {
  configured: boolean;
  connected: boolean;
  google_email?: string | null;
  missing_scopes: string[];
}

export async function getReservationGoogleCalendarStatus(): Promise<GoogleCalendarReservationStatus> {
  const res = await apiFetch("/admin/organization/venue-reservations/google-calendar/status");
  return res.json();
}

export async function startReservationGoogleCalendarOAuth(next = "/admin/settings?tab=venues"): Promise<{ authorization_url: string }> {
  const params = new URLSearchParams({ next });
  if (typeof window !== "undefined") params.set("frontend_origin", window.location.origin);
  const res = await apiFetch(`/admin/organization/venue-reservations/google-calendar/start?${params}`);
  return res.json();
}

export async function syncReservationGoogleCalendar(): Promise<{ ok: boolean; pulled: number; pushed: number; updated: number }> {
  const res = await apiFetch("/admin/organization/venue-reservations/google-calendar/sync", { method: "POST" });
  return res.json();
}

export interface IntegrationCatalogItem {
  key: string;
  name: string;
  category: string;
  status: "connected" | "available" | "not_configured" | "planned" | string;
  description: string;
  connect_type: string;
  priority: number;
  configured: boolean;
  connected: boolean;
  docs_url?: string | null;
  settings_href?: string | null;
  app_required: boolean;
  app_provider?: string | null;
  setup_url?: string | null;
  required_scopes: string[];
  callback_urls: string[];
  credential_fields: string[];
}

export interface IntegrationCatalogResponse {
  items: IntegrationCatalogItem[];
  supported_events: string[];
}

export interface NotificationWebhookChannel {
  url: string;
  events: string[];
  enabled: boolean;
  secret?: string | null;
}

export interface TwilioSmsConfig {
  account_sid: string;
  auth_token: string;
  from_number: string;
  to_numbers: string[];
  events: string[];
  enabled: boolean;
}

export interface NotificationIntegrationsConfig {
  slack?: NotificationWebhookChannel | null;
  teams?: NotificationWebhookChannel | null;
  custom?: NotificationWebhookChannel | null;
  sms?: TwilioSmsConfig | null;
  supported_events: string[];
}

export interface OidcSsoConfig {
  enabled: boolean;
  issuer_url: string;
  client_id: string;
  client_secret: string;
  allowed_domains: string[];
}

export interface WebinarImportConfig {
  enabled: boolean;
  provider: "zoom" | "microsoft_teams";
  account_id: string;
  client_id: string;
  client_secret: string;
}

export interface GenericProviderConfig {
  enabled: boolean;
  provider: string;
  auth_type: "api_key" | "bearer_token" | "oauth" | "basic" | "webhook" | "none";
  base_url: string;
  api_key: string;
  access_token: string;
  client_id: string;
  client_secret: string;
  account_id: string;
  list_id: string;
  folder_id: string;
  report_id: string;
  course_id: string;
  field_mapping: Record<string, string>;
  notes: string;
}

export type GenericProviderKey =
  | "salesforce"
  | "mailchimp_brevo"
  | "whatsapp_sms"
  | "drive_sharepoint_archive"
  | "power_bi_looker"
  | "lms"
  | "accounting_tr";

export interface EnterpriseIntegrationsConfig {
  oidc?: OidcSsoConfig | null;
  webinar?: WebinarImportConfig | null;
  providers?: Partial<Record<GenericProviderKey, GenericProviderConfig>>;
}

export async function getIntegrationCatalog(): Promise<IntegrationCatalogResponse> {
  const res = await apiFetch("/admin/integrations/catalog");
  return res.json();
}

export async function getNotificationIntegrations(): Promise<NotificationIntegrationsConfig> {
  const res = await apiFetch("/admin/integrations/notifications");
  return res.json();
}

export async function updateNotificationIntegrations(
  payload: Partial<Pick<NotificationIntegrationsConfig, "slack" | "teams" | "custom" | "sms">>,
): Promise<NotificationIntegrationsConfig> {
  const res = await apiFetch("/admin/integrations/notifications", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function removeNotificationChannel(channel: "slack" | "teams" | "custom" | "sms"): Promise<{ ok: boolean; removed: string }> {
  const res = await apiFetch(`/admin/integrations/notifications/${channel}`, { method: "DELETE" });
  return res.json();
}

export async function testNotificationChannel(payload: NotificationWebhookChannel): Promise<{ ok: boolean }> {
  const res = await apiFetch("/admin/integrations/notifications/test", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getEnterpriseIntegrations(): Promise<EnterpriseIntegrationsConfig> {
  const res = await apiFetch("/admin/integrations/enterprise-config");
  return res.json();
}

export async function updateEnterpriseIntegrations(payload: EnterpriseIntegrationsConfig): Promise<EnterpriseIntegrationsConfig> {
  const res = await apiFetch("/admin/integrations/enterprise-config", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function testProviderConfig(providerKey: GenericProviderKey): Promise<{ ok: boolean; http_status?: number; message?: string }> {
  const res = await apiFetch(`/admin/integrations/provider-config/${providerKey}/test`, { method: "POST" });
  return res.json();
}

export async function getSuperAdminStats(): Promise<SuperAdminLandingStatsConfig> {
  const res = await apiFetch(`/superadmin/stats`);
  return res.json();
}

export async function updateSuperAdminStats(
  data: SuperAdminLandingStatsConfig,
): Promise<SuperAdminLandingStatsConfig> {
  const res = await apiFetch(`/superadmin/stats`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

// -----------------------------------------------------------------------------
// System digest & public member email preferences

export interface PublicMemberEmailPreferencesOut {
  digest_opt_in: boolean;
}

export async function getPublicMemberEmailPreferences(): Promise<PublicMemberEmailPreferencesOut> {
  const res = await memberApiFetch(`/public/me/email-preferences`);
  return res.json();
}

export async function updatePublicMemberEmailPreferences(data: Partial<PublicMemberEmailPreferencesOut>): Promise<PublicMemberEmailPreferencesOut> {
  const res = await memberApiFetch(`/public/me/email-preferences`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export interface SystemEmailDigestConfigOut {
  id: number;
  enabled: boolean;
  frequency: "daily" | "weekly";
  send_weekday?: number | null;
  send_hour: number;
  max_events: number;
  max_posts: number;
  last_sent_at?: string | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
}

export async function getSystemDigestConfig(): Promise<SystemEmailDigestConfigOut> {
  const res = await apiFetch(`/superadmin/system-digest/config`);
  return res.json();
}

export async function updateSystemDigestConfig(data: Partial<SystemEmailDigestConfigOut>): Promise<SystemEmailDigestConfigOut> {
  const res = await apiFetch(`/superadmin/system-digest/config`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function sendSystemDigestNow(): Promise<{ message: string } & Partial<SystemEmailDigestConfigOut>> {
  const res = await apiFetch(`/superadmin/system-digest/send-now`, { method: "POST" });
  return res.json();
}

export async function sendSystemDigestTest(to_email: string): Promise<{ sent: boolean; to_email: string; message: string }> {
  const res = await apiFetch(`/superadmin/system-digest/test`, {
    method: "POST",
    body: JSON.stringify({ to_email }),
  });
  return res.json();
}

// -----------------------------------------------------------------------------

export interface TwoFAStatusOut {
  enabled?: boolean;
  configured?: boolean;
  is_enabled: boolean;
  secret?: string;
  otp_auth_url?: string;
  qr_code?: string;
  recovery_codes?: string[];
}

export async function get2FAStatus(): Promise<TwoFAStatusOut> {
  const res = await apiFetch(`/auth/2fa/status`);
  return res.json();
}

export async function setup2FA(): Promise<TwoFAStatusOut> {
  const res = await apiFetch(`/auth/2fa/setup`, { method: "POST" });
  return res.json();
}

export async function enable2FA(token: string): Promise<{ success: boolean }> {
  const res = await apiFetch(`/auth/2fa/enable`, {
    method: "POST",
    body: JSON.stringify({ code: token }),
  });
  return res.json();
}

export async function disable2FA(code: string): Promise<{ success: boolean }> {
  const res = await apiFetch(`/auth/2fa/disable`, {
    method: "PATCH",
    body: JSON.stringify({ code }),
  });
  return res.json();
}

// -----------------------------------------------------------------------------

export interface EmailJobDetailsOut {
  id: number;
  event_id: number;
  job_type: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
}

export async function getEmailJobDetails(eventId: number, jobId: number): Promise<EmailJobDetailsOut> {
  const res = await apiFetch(`/admin/events/${eventId}/bulk-email-jobs/${jobId}`);
  return res.json();
}

// -----------------------------------------------------------------------------

export async function bulkCertificateAction(
  eventId: number,
  action: "revoke" | "expire" | "delete" | "enable_auto_renew" | "disable_auto_renew",
  certificateIds: number[]
): Promise<{ ok: boolean; processed: number; action: string }> {
  const res = await apiFetch(`/admin/events/${eventId}/certificates/bulk-action`, {
    method: "POST",
    body: JSON.stringify({ action, cert_ids: certificateIds }),
  });
  return res.json();
}

// -----------------------------------------------------------------------------

export interface APIKeyOut {
  id: number;
  key: string;
  name: string;
  created_at: string;
  last_used?: string;
}

export async function listAPIKeys(): Promise<APIKeyOut[]> {
  const res = await apiFetch(`/admin/api-keys`);
  return res.json();
}

export async function createAPIKey(name: string): Promise<APIKeyOut> {
  const res = await apiFetch(`/admin/api-keys`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return res.json();
}

export async function deleteAPIKey(keyId: number): Promise<void> {
  await apiFetch(`/admin/api-keys/${keyId}`, { method: "DELETE" });
}

// -----------------------------------------------------------------------------

export interface WebhookDeliveryOut {
  id: number;
  webhook_id: number;
  event_type: string;
  status: number;
  response_body?: string;
  created_at: string;
}

export async function listWebhookDeliveries(
  webhookId: number,
  params?: { page?: number; limit?: number }
): Promise<{ items: WebhookDeliveryOut[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  
  const res = await apiFetch(`/admin/webhooks/${webhookId}/deliveries?${qs}`);
  return res.json();
}

// -----------------------------------------------------------------------------

export interface OrgDomainOut {
  organization_id: number;
  custom_domain?: string;
  domain_verified: boolean;
}

export async function getOrgDomain(): Promise<OrgDomainOut> {
  const res = await apiFetch(`/admin/organization/domain`);
  return res.json();
}

export async function updateOrgDomain(customDomain: string): Promise<OrgDomainOut> {
  const res = await apiFetch(`/admin/organization/domain`, {
    method: "PUT",
    body: JSON.stringify({ custom_domain: customDomain }),
  });
  return res.json();
}

export async function listMyJobs(limit = 60): Promise<{ jobs: any[]; active_count: number }> {
  const res = await apiFetch(`/admin/jobs?limit=${limit}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Quiz API
// ---------------------------------------------------------------------------

export async function getAdminQuiz(eventId: number | string) {
  const res = await apiFetch(`/admin/events/${eventId}/quiz`);
  return res.json();
}

export async function saveAdminQuiz(eventId: number | string, body: object) {
  const res = await apiFetch(`/admin/events/${eventId}/quiz`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function deleteAdminQuiz(eventId: number | string) {
  return apiFetch(`/admin/events/${eventId}/quiz`, { method: "DELETE" });
}

export async function getQuizResults(eventId: number | string) {
  const res = await apiFetch(`/admin/events/${eventId}/quiz/results`);
  return res.json();
}

export async function issueCertForAttempt(eventId: number | string, attemptId: number) {
  const res = await apiFetch(`/admin/events/${eventId}/quiz/attempts/${attemptId}/issue-cert`, {
    method: "POST",
  });
  return res.json();
}

export async function getPublicQuiz(eventId: number | string, memberToken?: string | null) {
  const headers: Record<string, string> = {};
  if (memberToken) headers["Authorization"] = `Bearer ${memberToken}`;
  const res = await publicApiFetch(`/public/events/${eventId}/quiz`, { headers });
  return res.json();
}

export async function startQuizAttempt(
  eventId: number | string,
  payload: { attendee_name: string; attendee_email?: string | null },
  memberToken?: string | null,
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (memberToken) headers["Authorization"] = `Bearer ${memberToken}`;
  const res = await publicApiFetch(`/public/events/${eventId}/quiz/start`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function submitQuizAttempt(
  eventId: number | string,
  payload: { attempt_id: number; answers: { question_id: number; selected_choice_id?: number | null; open_text_answer?: string | null }[] },
  memberToken?: string | null,
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (memberToken) headers["Authorization"] = `Bearer ${memberToken}`;
  const res = await publicApiFetch(`/public/events/${eventId}/quiz/submit`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ── CRM Sequences ─────────────────────────────────────────────────────────────

export type SequenceStepOut = {
  id: number;
  step_order: number;
  delay_days: number;
  email_template_id: number | null;
  subject_override: string | null;
};

export type SequenceOut = {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  steps: SequenceStepOut[];
  enrollment_count: number;
  created_at: string;
  updated_at: string;
};

export type SequenceEnrollmentOut = {
  id: number;
  email: string;
  current_step: number;
  next_send_at: string | null;
  status: string;
  enrolled_at: string;
};

export async function listSequences(): Promise<SequenceOut[]> {
  const res = await apiFetch("/admin/crm/sequences");
  return res.json();
}

export async function createSequence(body: {
  name: string;
  description?: string | null;
  active?: boolean;
  steps?: { step_order: number; delay_days: number; email_template_id?: number | null; subject_override?: string | null }[];
}): Promise<SequenceOut> {
  const res = await apiFetch("/admin/crm/sequences", { method: "POST", body: JSON.stringify(body) });
  return res.json();
}

export async function updateSequence(
  id: number,
  body: {
    name: string;
    description?: string | null;
    active?: boolean;
    steps: { step_order: number; delay_days: number; email_template_id?: number | null; subject_override?: string | null }[];
  },
): Promise<SequenceOut> {
  const res = await apiFetch(`/admin/crm/sequences/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  return res.json();
}

export async function deleteSequence(id: number): Promise<void> {
  return apiFetch(`/admin/crm/sequences/${id}`, { method: "DELETE" });
}

export async function getSequenceEnrollments(
  id: number,
  status = "active",
  limit = 200,
): Promise<SequenceEnrollmentOut[]> {
  const res = await apiFetch(`/admin/crm/sequences/${id}/enrollments?status=${status}&limit=${limit}`);
  return res.json();
}

export async function enrollInSequence(
  id: number,
  emails: string[],
): Promise<{ enrolled: number; skipped: number }> {
  const res = await apiFetch(`/admin/crm/sequences/${id}/enroll`, {
    method: "POST",
    body: JSON.stringify({ emails }),
  });
  return res.json();
}

export async function unenrollFromSequence(
  id: number,
  emails: string[],
): Promise<{ unenrolled: number }> {
  const res = await apiFetch(`/admin/crm/sequences/${id}/unenroll`, {
    method: "POST",
    body: JSON.stringify({ emails }),
  });
  return res.json();
}

// ── CRM Accounts ──────────────────────────────────────────────────────────────

export type CrmAccountOut = {
  id: number;
  organization_id: number;
  name: string;
  domain: string | null;
  industry: string | null;
  size_bucket: string | null;
  owner_user_id: number | null;
  annual_value: number | null;
  notes: string;
  tags: string[];
  status: string;
  contact_count: number;
  deal_count: number;
  created_at: string;
  updated_at: string;
};

export type CrmAccountContactOut = {
  id: number;
  account_id: number;
  participant_crm_profile_id: number;
  email: string;
  name: string | null;
  role: string | null;
  is_primary: boolean;
  created_at: string;
};

export type CrmDealOut = {
  id: number;
  account_id: number;
  organization_id: number;
  name: string;
  stage: string;
  amount: number | null;
  expected_close_date: string | null;
  owner_user_id: number | null;
  activity_count: number;
  created_at: string;
  updated_at: string;
};

export type CrmDealActivityOut = {
  id: number;
  deal_id: number;
  activity_type: string;
  content: string;
  user_id: number | null;
  activity_at: string;
  created_at: string;
};

export type PipelineOut = {
  stages: string[];
  pipeline: Record<string, {
    id: number; name: string; account_id: number; account_name: string;
    amount: number | null; expected_close_date: string | null;
    owner_user_id: number | null; updated_at: string;
  }[]>;
};

export async function listCrmAccounts(params?: {
  search?: string; status?: string; limit?: number; offset?: number;
}): Promise<CrmAccountOut[]> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.status) q.set("status", params.status);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const qs = q.toString();
  const res = await apiFetch(`/admin/crm/accounts${qs ? `?${qs}` : ""}`);
  return res.json();
}

export async function createCrmAccount(body: Partial<CrmAccountOut> & { name: string }): Promise<CrmAccountOut> {
  const res = await apiFetch("/admin/crm/accounts", { method: "POST", body: JSON.stringify(body) });
  return res.json();
}

export async function getCrmAccount(id: number): Promise<CrmAccountOut> {
  const res = await apiFetch(`/admin/crm/accounts/${id}`);
  return res.json();
}

export async function updateCrmAccount(id: number, body: Partial<CrmAccountOut> & { name: string }): Promise<CrmAccountOut> {
  const res = await apiFetch(`/admin/crm/accounts/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  return res.json();
}

export async function deleteCrmAccount(id: number): Promise<void> {
  return apiFetch(`/admin/crm/accounts/${id}`, { method: "DELETE" });
}

export async function listAccountContacts(accountId: number): Promise<CrmAccountContactOut[]> {
  const res = await apiFetch(`/admin/crm/accounts/${accountId}/contacts`);
  return res.json();
}

export async function addAccountContact(
  accountId: number,
  body: { participant_crm_profile_id: number; role?: string | null; is_primary?: boolean },
): Promise<CrmAccountContactOut> {
  const res = await apiFetch(`/admin/crm/accounts/${accountId}/contacts`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function removeAccountContact(accountId: number, contactId: number): Promise<void> {
  return apiFetch(`/admin/crm/accounts/${accountId}/contacts/${contactId}`, { method: "DELETE" });
}

export async function listAccountDeals(accountId: number): Promise<CrmDealOut[]> {
  const res = await apiFetch(`/admin/crm/accounts/${accountId}/deals`);
  return res.json();
}

export async function createAccountDeal(
  accountId: number,
  body: { name: string; stage?: string; amount?: number | null; expected_close_date?: string | null },
): Promise<CrmDealOut> {
  const res = await apiFetch(`/admin/crm/accounts/${accountId}/deals`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function updateDeal(id: number, body: {
  name: string; stage: string; amount?: number | null; expected_close_date?: string | null;
}): Promise<CrmDealOut> {
  const res = await apiFetch(`/admin/crm/deals/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  return res.json();
}

export async function deleteDeal(id: number): Promise<void> {
  return apiFetch(`/admin/crm/deals/${id}`, { method: "DELETE" });
}

export async function getPipeline(): Promise<PipelineOut> {
  const res = await apiFetch("/admin/crm/pipeline");
  return res.json();
}

export async function listDealActivities(dealId: number): Promise<CrmDealActivityOut[]> {
  const res = await apiFetch(`/admin/crm/deals/${dealId}/activities`);
  return res.json();
}

export async function addDealActivity(
  dealId: number,
  body: { activity_type: string; content: string; activity_at?: string | null },
): Promise<CrmDealActivityOut> {
  const res = await apiFetch(`/admin/crm/deals/${dealId}/activities`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function deleteDealActivity(dealId: number, activityId: number): Promise<void> {
  return apiFetch(`/admin/crm/deals/${dealId}/activities/${activityId}`, { method: "DELETE" });
}

// ── Lead Capture Forms ────────────────────────────────────────────────────────

export type FormFieldDef = {
  name: string;
  label: string;
  field_type: "text" | "email" | "tel" | "textarea" | "dropdown" | "checkbox" | "number";
  required: boolean;
  options: string[];
  placeholder?: string | null;
};

export type LeadFormOut = {
  id: number;
  organization_id: number;
  name: string;
  slug: string;
  fields_json: FormFieldDef[];
  destination: string;
  auto_tag: string | null;
  redirect_url: string | null;
  active: boolean;
  submission_count: number;
  created_at: string;
  updated_at: string;
};

export type LeadSubmissionOut = {
  id: number;
  form_id: number;
  data_json: Record<string, string>;
  source_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  submitted_at: string;
};

export async function listLeadForms(): Promise<LeadFormOut[]> {
  const res = await apiFetch("/admin/lead-forms");
  return res.json();
}

export async function createLeadForm(body: {
  name: string;
  fields: FormFieldDef[];
  destination?: string;
  auto_tag?: string | null;
  redirect_url?: string | null;
  active?: boolean;
}): Promise<LeadFormOut> {
  const res = await apiFetch("/admin/lead-forms", { method: "POST", body: JSON.stringify(body) });
  return res.json();
}

export async function getLeadForm(id: number): Promise<LeadFormOut> {
  const res = await apiFetch(`/admin/lead-forms/${id}`);
  return res.json();
}

export async function updateLeadForm(id: number, body: {
  name: string;
  fields: FormFieldDef[];
  destination?: string;
  auto_tag?: string | null;
  redirect_url?: string | null;
  active?: boolean;
}): Promise<LeadFormOut> {
  const res = await apiFetch(`/admin/lead-forms/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  return res.json();
}

export async function deleteLeadForm(id: number): Promise<void> {
  return apiFetch(`/admin/lead-forms/${id}`, { method: "DELETE" });
}

export async function getLeadFormSubmissions(id: number, limit = 200): Promise<LeadSubmissionOut[]> {
  const res = await apiFetch(`/admin/lead-forms/${id}/submissions?limit=${limit}`);
  return res.json();
}

export async function publicSubmitForm(
  slug: string,
  data: Record<string, string>,
  meta?: { source_url?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string },
): Promise<{ ok: boolean; redirect_url: string | null }> {
  const res = await apiFetch(`/public/forms/${slug}/submit`, {
    method: "POST",
    body: JSON.stringify({ data, ...meta }),
  });
  return res.json();
}

// ── Org Analytics ─────────────────────────────────────────────────────────────

export type OrgOverview = {
  period_days: number;
  events: { total: number; period: number };
  certificates: { total: number; period: number };
  members: { total: number; period: number };
  attendees: { total: number; period: number };
  crm_contacts: { total: number };
};

export type TrainingComplianceRow = {
  event_id: number;
  event_name: string;
  event_date: string | null;
  registered: number;
  certified: number;
  completion_rate: number;
};

export type TrainingCompliance = {
  overall_completion_rate: number;
  total_registered: number;
  total_certified: number;
  events: TrainingComplianceRow[];
};

export type LearningPathStat = {
  path_id: number;
  path_name: string;
  published: boolean;
  step_count: number;
  enrolled: number;
  completed: number;
  completion_rate: number;
  avg_progress: number;
};

export type CrmAnalytics = {
  total_contacts: number;
  hot_leads: number;
  lifecycle_distribution: Record<string, number>;
  pipeline_by_stage: Record<string, { count: number; value: number }>;
  total_pipeline_value: number;
  won_value: number;
  win_rate: number;
};

export type CertTimelineDay = { date: string; count: number };

export async function getOrgOverview(days = 30): Promise<OrgOverview> {
  const res = await apiFetch(`/admin/analytics/org/overview?days=${days}`);
  return res.json();
}

export async function getTrainingCompliance(): Promise<TrainingCompliance> {
  const res = await apiFetch("/admin/analytics/org/training-compliance");
  return res.json();
}

export async function getLearningPathsAnalytics(): Promise<{ paths: LearningPathStat[] }> {
  const res = await apiFetch("/admin/analytics/org/learning-paths");
  return res.json();
}

export async function getCrmAnalytics(): Promise<CrmAnalytics> {
  const res = await apiFetch("/admin/analytics/org/crm");
  return res.json();
}

export async function getCertTimeline(days = 90): Promise<{ period_days: number; timeline: CertTimelineDay[] }> {
  const res = await apiFetch(`/admin/analytics/org/cert-timeline?days=${days}`);
  return res.json();
}

// ── Scheduled Reports ─────────────────────────────────────────────────────────

export type ScheduledReportOut = {
  id: number;
  organization_id: number;
  name: string;
  report_type: string;
  report_type_label: string;
  filters_json: Record<string, unknown>;
  frequency: "daily" | "weekly" | "monthly";
  recipients: string[];
  active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
};

export async function listScheduledReports(): Promise<ScheduledReportOut[]> {
  const res = await apiFetch("/admin/reports");
  return res.json();
}

export async function createScheduledReport(body: {
  name: string;
  report_type: string;
  filters_json?: Record<string, unknown>;
  frequency?: string;
  recipients?: string[];
  active?: boolean;
}): Promise<ScheduledReportOut> {
  const res = await apiFetch("/admin/reports", { method: "POST", body: JSON.stringify(body) });
  return res.json();
}

export async function updateScheduledReport(id: number, body: {
  name: string;
  report_type: string;
  filters_json?: Record<string, unknown>;
  frequency?: string;
  recipients?: string[];
  active?: boolean;
}): Promise<ScheduledReportOut> {
  const res = await apiFetch(`/admin/reports/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  return res.json();
}

export async function deleteScheduledReport(id: number): Promise<void> {
  return apiFetch(`/admin/reports/${id}`, { method: "DELETE" });
}

export async function listReportTypes(): Promise<{ value: string; label: string }[]> {
  const res = await apiFetch("/admin/reports/types");
  return res.json();
}

// ── Marketplace ───────────────────────────────────────────────────────────────

export type MarketplaceEventOut = {
  id: number;
  public_id: string | null;
  name: string;
  event_date: string | null;
  event_location: string | null;
  event_banner_url: string | null;
  marketplace_category: string | null;
  marketplace_description: string | null;
  marketplace_price: number | null;
  org_name: string | null;
  org_logo: string | null;
  org_public_id: string | null;
  certificate_enabled: boolean;
};

export async function listMarketplaceEvents(params?: {
  category?: string;
  free_only?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<MarketplaceEventOut[]> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.free_only) qs.set("free_only", "true");
  if (params?.q) qs.set("q", params.q);
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  if (params?.offset !== undefined) qs.set("offset", String(params.offset));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/public/marketplace${query}`);
  return res.json();
}

export async function getMarketplaceEvent(eventId: number): Promise<MarketplaceEventOut> {
  const res = await apiFetch(`/public/marketplace/${eventId}`);
  return res.json();
}

export async function listMarketplaceCategories(): Promise<string[]> {
  const res = await apiFetch("/public/marketplace/categories");
  return res.json();
}

// ── API Key Management (v2 with scopes) ──────────────────────────────────────

export type ApiKeyFull = {
  id: number;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  rate_limit_per_min: number | null;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type ApiKeyCreated = ApiKeyFull & { full_key: string };
export type ApiScopeOption = { value: string; label: string };

export async function listApiKeysV2(): Promise<ApiKeyFull[]> {
  const res = await apiFetch("/admin/api-keys/v2");
  return res.json();
}

export async function listApiScopes(): Promise<ApiScopeOption[]> {
  const res = await apiFetch("/admin/api-keys/scopes");
  return res.json();
}

export async function createApiKeyV2(body: {
  name: string;
  scopes?: string[];
  expires_days?: number | null;
  rate_limit_per_min?: number | null;
}): Promise<ApiKeyCreated> {
  const res = await apiFetch("/admin/api-keys/v2", { method: "POST", body: JSON.stringify(body) });
  return res.json();
}

export async function updateApiKeyScopes(
  keyId: number,
  body: { name?: string; scopes?: string[]; is_active?: boolean }
): Promise<ApiKeyFull> {
  const res = await apiFetch(`/admin/api-keys/${keyId}/scopes`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function deleteApiKey(keyId: number): Promise<void> {
  return apiFetch(`/admin/api-keys/${keyId}`, { method: "DELETE" });
}

// ── Accreditation & CPD ───────────────────────────────────────────────────────

export type AccreditationBodyOption = {
  id: number;
  short_code: string;
  name: string;
  logo_url: string | null;
};

export type OrgAccreditationOut = {
  id: number;
  organization_id: number;
  body_id: number;
  body_name: string;
  body_code: string;
  accreditation_number: string | null;
  valid_from: string | null;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
  is_valid: boolean;
};

export type EventCpdOut = {
  id: number;
  event_id: number;
  body_id: number;
  body_name: string;
  body_code: string;
  cpd_hours: number;
  cpd_category: string | null;
  cpd_unit_type: string;
};

export type MemberCpdSummary = {
  member_id: number;
  total_cpd_hours: number;
  by_body: { body: string; total_hours: number }[];
  logs: {
    id: number;
    event_id: number;
    body_name: string;
    body_code: string;
    cpd_hours: number;
    cpd_category: string | null;
    certificate_id: number | null;
    earned_at: string | null;
  }[];
};

export async function listAccreditationBodies(): Promise<AccreditationBodyOption[]> {
  const res = await apiFetch("/admin/accreditation/bodies");
  return res.json();
}

export async function listOrgAccreditations(): Promise<OrgAccreditationOut[]> {
  const res = await apiFetch("/admin/accreditation");
  return res.json();
}

export async function createOrgAccreditation(body: {
  body_id: number;
  accreditation_number?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  notes?: string | null;
}): Promise<OrgAccreditationOut> {
  const res = await apiFetch("/admin/accreditation", { method: "POST", body: JSON.stringify(body) });
  return res.json();
}

export async function updateOrgAccreditation(id: number, body: {
  body_id: number;
  accreditation_number?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  notes?: string | null;
}): Promise<OrgAccreditationOut> {
  const res = await apiFetch(`/admin/accreditation/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  return res.json();
}

export async function deleteOrgAccreditation(id: number): Promise<void> {
  return apiFetch(`/admin/accreditation/${id}`, { method: "DELETE" });
}

export async function getEventCpd(eventId: number): Promise<EventCpdOut | null> {
  const res = await apiFetch(`/admin/events/${eventId}/cpd`);
  return res.json();
}

export async function upsertEventCpd(eventId: number, body: {
  body_id: number;
  cpd_hours: number;
  cpd_category?: string | null;
  cpd_unit_type?: string;
}): Promise<EventCpdOut> {
  const res = await apiFetch(`/admin/events/${eventId}/cpd`, { method: "PUT", body: JSON.stringify(body) });
  return res.json();
}

export async function deleteEventCpd(eventId: number): Promise<void> {
  return apiFetch(`/admin/events/${eventId}/cpd`, { method: "DELETE" });
}

export async function getMemberCpd(memberId: number): Promise<MemberCpdSummary> {
  const res = await apiFetch(`/admin/members/${memberId}/cpd`);
  return res.json();
}

export async function updateMarketplaceSettings(
  eventId: number,
  body: {
    is_marketplace_listed: boolean;
    marketplace_category?: string | null;
    marketplace_description?: string | null;
    marketplace_price?: number | null;
  }
): Promise<MarketplaceEventOut> {
  const res = await apiFetch(`/admin/events/${eventId}/marketplace`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// LMS API wrappers
// ---------------------------------------------------------------------------

export interface TrainingCourseOut {
  id: number;
  org_id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  level: string;
  language: string;
  is_published: boolean;
  is_featured: boolean;
  price: number | null;
  passing_score: number | null;
  module_count: number;
  created_at: string;
  updated_at: string;
  modules?: CourseModuleOut[];
}

export interface CourseModuleOut {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  order: number;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  duration_minutes: number | null;
  is_required: boolean;
  created_at: string;
}

export async function listLmsCourses(): Promise<TrainingCourseOut[]> {
  const res = await apiFetch("/admin/lms/courses");
  const d = await res.json();
  return d.courses ?? [];
}

export async function getLmsCourse(courseId: number): Promise<TrainingCourseOut> {
  const res = await apiFetch(`/admin/lms/courses/${courseId}`);
  return res.json();
}

export async function createLmsCourse(body: Partial<TrainingCourseOut>): Promise<TrainingCourseOut> {
  const res = await apiFetch("/admin/lms/courses", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function updateLmsCourse(
  courseId: number,
  body: Partial<TrainingCourseOut>
): Promise<TrainingCourseOut> {
  const res = await apiFetch(`/admin/lms/courses/${courseId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function deleteLmsCourse(courseId: number): Promise<void> {
  await apiFetch(`/admin/lms/courses/${courseId}`, { method: "DELETE" });
}
