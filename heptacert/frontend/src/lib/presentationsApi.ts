import { apiFetch, apiUrl, getApiOrigin, getToken, publicApiFetch } from "@/lib/api";

export type PresentationSlide = {
  title: string;
  layout?: "title" | "bullets" | string;
  subtitle?: string | null;
  body?: string | null;
  bullets?: string[];
  notes?: string | null;
  background?: string | null;
};

export type PresentationDeck = {
  id: number;
  organization_id: number;
  event_id?: number | null;
  created_by: number | null;
  title: string;
  description: string | null;
  language: string;
  theme: Record<string, string>;
  slides: PresentationSlide[];
  source: string;
  status: string;
  file_filename?: string | null;
  file_content_type?: string | null;
  file_size?: number | null;
  converted_file_filename?: string | null;
  conversion_status?: "not_required" | "queued" | "processing" | "ready" | "failed" | string;
  conversion_error?: string | null;
  conversion_attempts?: number;
  last_export_filename: string | null;
  created_at: string;
  updated_at: string;
  export_url: string | null;
  file_url?: string | null;
  converted_file_url?: string | null;
  presenter_url: string | null;
  presenter_control_url?: string | null;
  audience_url?: string | null;
  audience_enabled?: boolean;
  allow_download?: boolean;
  watermark_enabled?: boolean;
  audience_expires_at?: string | null;
};

export type PublicPresentationDeck = {
  id: number;
  title: string;
  description: string | null;
  language: string;
  theme: Record<string, string>;
  slides: PresentationSlide[];
  file_url?: string | null;
  converted_file_url?: string | null;
  allow_download?: boolean;
  watermark_enabled?: boolean;
  audience_enabled?: boolean;
};

export type GeneratePresentationPayload = {
  topic: string;
  audience: string;
  slide_count: number;
  language: string;
  style: string;
  extra_notes?: string;
};

export type PresentationSessionState = {
  slide_index: number;
  pointer_active?: boolean;
  pointer_x?: number | null;
  pointer_y?: number | null;
  updated_at: string;
};

export type PresentationSpeakerNote = {
  slide_index: number;
  note: string;
  updated_at?: string | null;
};

export type PresentationSecuritySettings = {
  audience_enabled: boolean;
  allow_download: boolean;
  watermark_enabled: boolean;
  audience_expires_at?: string | null;
  audience_url?: string | null;
  presenter_control_url?: string | null;
};

export function presentationControlTokenFromUrl(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/\/presenter\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function presentationControlWsUrl(token: string): string {
  const origin = getApiOrigin();
  const wsOrigin = origin.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
  return `${wsOrigin}/api/public/presentations/control/${encodeURIComponent(token)}/ws`;
}

export async function listPresentations(): Promise<PresentationDeck[]> {
  const res = await apiFetch("/admin/presentations");
  return res.json();
}

export async function listEventPresentations(eventId: number): Promise<PresentationDeck[]> {
  const res = await apiFetch(`/admin/presentations/events/${eventId}`);
  return res.json();
}

export async function uploadEventPresentation(
  eventId: number,
  payload: { title: string; description?: string; language: string; file: File }
): Promise<PresentationDeck> {
  const form = new FormData();
  form.append("title", payload.title);
  form.append("language", payload.language);
  if (payload.description) form.append("description", payload.description);
  form.append("file", payload.file);
  const res = await apiFetch(`/admin/presentations/events/${eventId}/upload`, {
    method: "POST",
    body: form,
  });
  return res.json();
}

function securePresentationUrl(path?: string | null): string | null {
  if (!path) return null;
  return apiUrl(path.replace(/^\/api/, ""));
}

export function presentationFileUrl(deck: PresentationDeck): string | null {
  return securePresentationUrl(deck.file_url);
}

export function presentationConvertedFileUrl(deck: PresentationDeck): string | null {
  return securePresentationUrl(deck.converted_file_url);
}

export function presentationAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function downloadPresentationFile(deck: PresentationDeck, variant: "original" | "converted" = "original"): Promise<void> {
  const path = variant === "converted" ? deck.converted_file_url : deck.file_url;
  const url = securePresentationUrl(path);
  if (!url) throw new Error("Presentation file is not available");
  const res = await fetch(url, {
    headers: presentationAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Presentation file could not be downloaded");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download =
    variant === "converted"
      ? deck.converted_file_filename || `${deck.title || "presentation"}.pdf`
      : deck.file_filename || `${deck.title || "presentation"}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function generatePresentation(payload: GeneratePresentationPayload): Promise<PresentationDeck> {
  const res = await apiFetch("/admin/presentations/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updatePresentation(id: number, payload: Partial<PresentationDeck>): Promise<PresentationDeck> {
  const res = await apiFetch(`/admin/presentations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getPresentationSecurity(id: number): Promise<PresentationSecuritySettings> {
  const res = await apiFetch(`/admin/presentations/${id}/security`);
  return res.json();
}

export async function updatePresentationSecurity(
  id: number,
  payload: Partial<PresentationSecuritySettings> & { regenerate_audience_token?: boolean; regenerate_control_token?: boolean }
): Promise<PresentationSecuritySettings> {
  const res = await apiFetch(`/admin/presentations/${id}/security`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getPresentationSession(id: number): Promise<PresentationSessionState> {
  const res = await apiFetch(`/admin/presentations/${id}/session`);
  return res.json();
}

export async function updatePresentationSession(id: number, slideIndex: number): Promise<PresentationSessionState> {
  const res = await apiFetch(`/admin/presentations/${id}/session`, {
    method: "PATCH",
    body: JSON.stringify({ slide_index: slideIndex }),
  });
  return res.json();
}

export async function updatePresentationPointer(
  id: number,
  pointer: { active: boolean; x?: number; y?: number }
): Promise<PresentationSessionState> {
  const res = await apiFetch(`/admin/presentations/${id}/session`, {
    method: "PATCH",
    body: JSON.stringify({
      pointer_active: pointer.active,
      pointer_x: pointer.active ? pointer.x : null,
      pointer_y: pointer.active ? pointer.y : null,
    }),
  });
  return res.json();
}

export async function getPresentationSpeakerNote(id: number, slideIndex: number): Promise<PresentationSpeakerNote> {
  const res = await apiFetch(`/admin/presentations/${id}/notes/${slideIndex}`);
  return res.json();
}

export async function updatePresentationSpeakerNote(id: number, slideIndex: number, note: string): Promise<PresentationSpeakerNote> {
  const res = await apiFetch(`/admin/presentations/${id}/notes/${slideIndex}`, {
    method: "PUT",
    body: JSON.stringify({ note }),
  });
  return res.json();
}

export async function exportPresentation(id: number): Promise<PresentationDeck> {
  const res = await apiFetch(`/admin/presentations/${id}/export`, { method: "POST" });
  return res.json();
}

export async function regeneratePresenterToken(id: number): Promise<PresentationDeck> {
  const res = await apiFetch(`/admin/presentations/${id}/presenter-token`, { method: "POST" });
  return res.json();
}

export async function deletePresentation(id: number): Promise<void> {
  await apiFetch(`/admin/presentations/${id}`, { method: "DELETE" });
}

export async function getPublicAudiencePresentation(token: string): Promise<PublicPresentationDeck> {
  const res = await publicApiFetch(`/public/presentations/audience/${encodeURIComponent(token)}`);
  return res.json();
}

export async function getPublicAudienceSession(token: string): Promise<PresentationSessionState> {
  const res = await publicApiFetch(`/public/presentations/audience/${encodeURIComponent(token)}/session`);
  return res.json();
}

export async function getPublicControlPresentation(token: string): Promise<PublicPresentationDeck> {
  const res = await publicApiFetch(`/public/presentations/control/${encodeURIComponent(token)}`);
  return res.json();
}

export async function getPublicControlSession(token: string): Promise<PresentationSessionState> {
  const res = await publicApiFetch(`/public/presentations/control/${encodeURIComponent(token)}/session`);
  return res.json();
}

export async function updatePublicControlSession(
  token: string,
  payload: { slide_index?: number; pointer_active?: boolean; pointer_x?: number | null; pointer_y?: number | null }
): Promise<PresentationSessionState> {
  const res = await publicApiFetch(`/public/presentations/control/${encodeURIComponent(token)}/session`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.json();
}
