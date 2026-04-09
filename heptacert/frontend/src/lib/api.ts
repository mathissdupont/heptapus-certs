export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8765/api";

// Warn loudly in production if the API base URL is unset
if (
  typeof process !== "undefined" &&
  process.env.NODE_ENV === "production" &&
  !process.env.NEXT_PUBLIC_API_BASE
) {
  console.error(
    "[HeptaCert] NEXT_PUBLIC_API_BASE is not set! " +
    "Falling back to http://localhost:8765/api which will fail in production. " +
    "Set NEXT_PUBLIC_API_BASE in your environment or .env.production file."
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
      cache: init.cache ?? (method === "GET" ? "no-store" : undefined),
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === "AbortError") throw new ApiError(0, "Istek zaman asimina ugradi.");
    throw new ApiError(0, err?.message || "Ag hatasi.");
  }
  clearTimeout(timeout);

  if (res.status === 401) {
    options.onUnauthorized?.();
    throw new ApiError(401, "Oturum sona erdi.");
  }

  if (!res.ok) {
    let detail = `Istek basarisiz (${res.status})`;
    try {
      const j = await res.json();
      detail = j?.detail || JSON.stringify(j);
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  return requestApi(path, init, {
    token: getToken(),
    onUnauthorized: () => {
      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/admin/login";
      }
    },
  });
}

export async function publicApiFetch(path: string, init: RequestInit = {}) {
  return requestApi(path, init);
}

export async function memberApiFetch(path: string, init: RequestInit = {}) {
  return requestApi(path, init, {
    token: getPublicMemberToken(),
    onUnauthorized: () => {
      clearPublicMemberToken();
    },
  });
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
}

export interface PublicMemberMe {
  id: number;
  public_id: string;
  email: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  headline?: string | null;
  location?: string | null;
  website_url?: string | null;
  created_at: string;
}

export interface PublicMemberSubscriptionInfo {
  active: boolean;
  plan_id: string | null;
  expires_at?: string | null;
}

export interface PublicMemberProfile {
  public_id: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  headline?: string | null;
  location?: string | null;
  website_url?: string | null;
  created_at: string;
  event_count: number;
  comment_count: number;
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

export type RegistrationFieldType = "text" | "textarea" | "number" | "tel" | "select" | "date";

export interface RegistrationField {
  id: string;
  label: string;
  type: RegistrationFieldType;
  required: boolean;
  placeholder?: string | null;
  helper_text?: string | null;
  options?: string[];
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
  registration_answers: Record<string, string>;
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

export function getSessionQrUrl(eventId: number, sessionId: number): string {
  const token = getToken();
  return `${API_BASE}/admin/events/${eventId}/sessions/${sessionId}/qr?token=${token}`;
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
): Promise<{ ok: boolean; message: string }> {
  const res = await apiFetch(`/admin/events/${eventId}/sessions/${sessionId}/checkin`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export function getAttendanceExportUrl(eventId: number, fmt: "xlsx" | "csv" = "xlsx"): string {
  return `${API_BASE}/admin/events/${eventId}/attendance/export?fmt=${fmt}`;
}

export async function exportAttendanceFile(
  eventId: number,
  fmt: "xlsx" | "csv" = "xlsx",
): Promise<{ blob: Blob; filename: string }> {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}/admin/events/${eventId}/attendance/export?fmt=${fmt}`, {
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
}) {
  const res = await publicApiFetch("/public/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
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

export async function getPublicMemberSubscription(): Promise<PublicMemberSubscriptionInfo> {
  const res = await memberApiFetch("/public/billing/subscription");
  return res.json();
}

export async function upgradePublicMemberTier(planId: string): Promise<{
  status: string;
  message: string;
  plan_id: string;
  expires_at?: string | null;
}> {
  const res = await memberApiFetch("/public/billing/upgrade", {
    method: "POST",
    body: JSON.stringify({ plan_id: planId }),
  });
  return res.json();
}

export async function updatePublicMemberProfile(data: {
  display_name: string;
  bio?: string | null;
  headline?: string | null;
  location?: string | null;
  website_url?: string | null;
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
  const res = await publicApiFetch(`/public/members/${memberPublicId}`);
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

export async function publicRegisterAttendee(
  eventId: EventRouteId,
  data: { name: string; email: string; registration_answers?: Record<string, string> }
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
}> {
  const fetcher = getPublicMemberToken() ? memberApiFetch : publicApiFetch;
  const res = await fetcher(`/events/${toEventRouteId(eventId)}/register`, {
    method: "POST",
    body: JSON.stringify(data),
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

export async function submitBuiltinSurvey(
  eventId: EventRouteId,
  attendeeId: number | null,
  answers: Record<string, unknown>,
  surveyToken?: string,
) {
  const res = await fetch(`${API_BASE}/surveys/${toEventRouteId(eventId)}/submit`, {
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
    throw new Error(j?.detail || "Anket baglantisi dogrulanamadi");
  }
  return res.json();
}

export type PublicParticipantStatus = {
  attendee_id: number;
  attendee_name: string;
  attendee_email: string;
  event_id: number;
  event_name: string;
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
    `${API_BASE}/events/${toEventRouteId(eventId)}/participant-status?token=${encodeURIComponent(surveyToken)}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    let detail = `Istek basarisiz (${res.status})`;
    try {
      const j = await res.json();
      detail = j?.detail || JSON.stringify(j);
    } catch {}
    throw new ApiError(res.status, detail);
  }
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
    `${API_BASE}/events/${toEventRouteId(eventId)}/attendees/${attendeeId}/badges?email=${encodeURIComponent(email)}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail || "Rozetler alınamadı");
  }
  return res.json();
}

export async function getCheckinSessionInfo(token: string) {
  const res = await fetch(`${API_BASE}/attend/${token}`);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail || "Geçersiz QR kodu");
  }
  return res.json();
}

export async function selfCheckin(token: string, email: string) {
  const res = await fetch(`${API_BASE}/attend/${token}`, {
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
export interface SuperAdminStatsOut {
  total_users: number;
  active_users: number;
  total_events: number;
  completed_events: number;
  total_attendees: number;
  total_certificates: number;
  issued_certificates: number;
  total_emails: number;
  delivered_emails: number;
  total_admins: number;
  total_organizations: number;
}
export async function listSuperAdmins(): Promise<AdminOut[]> {
  const res = await apiFetch(`/superadmin/admins`);
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
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: AuditLogOut[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.user_id) qs.set("user_id", String(params.user_id));
  if (params?.action) qs.set("action", params.action);
  if (params?.from_date) qs.set("from_date", params.from_date);
  if (params?.to_date) qs.set("to_date", params.to_date);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  
  const res = await apiFetch(`/superadmin/audit-logs?${qs}`);
  const items = await res.json();
  return { items, total: items.length };
}

export async function getSuperAdminStats(): Promise<SuperAdminStatsOut> {
  const res = await apiFetch(`/superadmin/stats`);
  return res.json();
}

// -----------------------------------------------------------------------------

export interface TwoFAStatusOut {
  is_enabled: boolean;
  secret?: string;
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
    body: JSON.stringify({ token }),
  });
  return res.json();
}

export async function disable2FA(password: string): Promise<{ success: boolean }> {
  const res = await apiFetch(`/auth/2fa/disable`, {
    method: "POST",
    body: JSON.stringify({ password }),
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
  action: "revoke" | "expire" | "delete",
  certificateIds: number[]
): Promise<{ success: boolean; count: number }> {
  const res = await apiFetch(`/admin/events/${eventId}/certificates/bulk-action`, {
    method: "POST",
    body: JSON.stringify({ action, certificate_ids: certificateIds }),
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
