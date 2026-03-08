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

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers, signal: controller.signal });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === "AbortError") throw new ApiError(0, "İstek zaman aşımına uğradı.");
    throw new ApiError(0, err?.message || "Ağ hatası.");
  }
  clearTimeout(timeout);

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/admin/login";
    }
    throw new ApiError(401, "Oturum sona erdi.");
  }

  if (!res.ok) {
    let detail = `İstek başarısız (${res.status})`;
    try {
      const j = await res.json();
      detail = j?.detail || JSON.stringify(j);
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EventOut {
  id: number;
  name: string;
  template_image_url: string;
  config: Record<string, unknown>;
  event_date?: string | null;
  event_description?: string | null;
  event_location?: string | null;
  min_sessions_required: number;
  event_banner_url?: string | null;
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

// ── Event (extended) ──────────────────────────────────────────────────────────

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

// ── Sessions ──────────────────────────────────────────────────────────────────

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

// ── Attendees ─────────────────────────────────────────────────────────────────

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

// ── Attendance ────────────────────────────────────────────────────────────────

export async function getAttendanceMatrix(eventId: number): Promise<AttendanceMatrix> {
  const res = await apiFetch(`/admin/events/${eventId}/attendance`);
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

// ── Bulk certify ──────────────────────────────────────────────────────────────

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

// ── Public: event info ────────────────────────────────────────────────────────

export async function getPublicEventInfo(eventId: number) {
  const res = await fetch(`${API_BASE}/events/${eventId}/info`);
  if (!res.ok) throw new Error("Event not found");
  return res.json();
}

export async function publicRegisterAttendee(
  eventId: number,
  data: { name: string; email: string }
): Promise<{ ok: boolean; message: string; attendee_id: number }> {
  const res = await fetch(`${API_BASE}/events/${eventId}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail || "Kayıt başarısız");
  }
  return res.json();
}

export async function submitBuiltinSurvey(
  eventId: number,
  attendeeId: number,
  answers: Record<string, unknown>,
) {
  const res = await fetch(`${API_BASE}/surveys/${eventId}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "attendee-id": String(attendeeId),
    },
    body: JSON.stringify({
      attendee_id: attendeeId,
      survey_type: "builtin",
      answers,
    }),
  });

  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.detail || "Anket gönderilemedi");
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

// ── Event Analytics ───────────────────────────────────────────────────────────

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

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export interface DashboardStatsOut {
  events_with_stats?: Array<{ event_id: number; event_name: string; total_attendees: number; certified_count: number }>;
}

export async function getDashboardStats(): Promise<DashboardStatsOut> {
  const res = await apiFetch(`/admin/dashboard/stats`);
  return res.json();
}

// ── SuperAdmin Endpoints ──────────────────────────────────────────────────────

export interface AdminOut {
  id: number;
  email: string;
  role: string;
  created_at: string;
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

export interface AuditLogOut {
  id: number;
  user_id?: number;
  user_email?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
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

// ── 2FA Management ────────────────────────────────────────────────────────────

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

// ── Email Job Details ─────────────────────────────────────────────────────────

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

// ── Bulk Certificate Actions ──────────────────────────────────────────────────

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

// ── API Keys ──────────────────────────────────────────────────────────────────

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

// ── Webhook Deliveries ────────────────────────────────────────────────────────

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

// ── Organization Domain ───────────────────────────────────────────────────────

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