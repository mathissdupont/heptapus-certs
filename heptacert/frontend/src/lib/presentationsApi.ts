import { apiFetch, apiUrl, getToken } from "@/lib/api";

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
};

export type PublicPresentationDeck = {
  title: string;
  description: string | null;
  language: string;
  theme: Record<string, string>;
  slides: PresentationSlide[];
};

export type GeneratePresentationPayload = {
  topic: string;
  audience: string;
  slide_count: number;
  language: string;
  style: string;
  extra_notes?: string;
};

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
  const url = apiUrl(path.replace(/^\/api/, ""));
  const token = getToken();
  return token ? `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : url;
}

export function presentationFileUrl(deck: PresentationDeck): string | null {
  return securePresentationUrl(deck.file_url);
}

export function presentationConvertedFileUrl(deck: PresentationDeck): string | null {
  return securePresentationUrl(deck.converted_file_url);
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
