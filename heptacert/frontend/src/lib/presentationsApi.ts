import { apiFetch } from "@/lib/api";

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
  created_by: number;
  title: string;
  description: string | null;
  language: string;
  theme: Record<string, string>;
  slides: PresentationSlide[];
  source: string;
  status: string;
  last_export_filename: string | null;
  created_at: string;
  updated_at: string;
  export_url: string | null;
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
