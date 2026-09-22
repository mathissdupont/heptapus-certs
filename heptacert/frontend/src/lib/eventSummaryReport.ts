import type { EventOut } from "@/lib/api";

export type EventSummaryLabels = {
  title: string;
  name: string;
  date: string;
  type: string;
  location: string;
  description: string;
  publicUrl: string;
  registrationUrl: string;
  reviewNote: string;
};

export function plainEventDescription(value: string | null | undefined): string {
  if (!value) return "";
  const document = new DOMParser().parseFromString(value, "text/html");
  document.querySelectorAll("script, style").forEach((element) => element.remove());
  document.querySelectorAll("a[href]").forEach((element) => {
    const href = element.getAttribute("href")?.trim() ?? "";
    if (/^https?:\/\//i.test(href) && element.textContent?.trim() !== href) {
      element.append(` (${href})`);
    }
  });
  document.querySelectorAll("br").forEach((element) => element.replaceWith("\n"));
  document.querySelectorAll("p, div, li").forEach((element) => element.append("\n"));
  return (document.body.textContent ?? "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildEventSummaryReport(
  event: EventOut,
  labels: EventSummaryLabels,
  origin: string,
  eventType: string,
): string {
  const lines = [labels.title, "", `${labels.name}: ${event.name}`];
  if (event.event_date) lines.push(`${labels.date}: ${event.event_date.slice(0, 10)}`);
  if (eventType) lines.push(`${labels.type}: ${eventType}`);
  if (event.event_location?.trim()) lines.push(`${labels.location}: ${event.event_location.trim()}`);
  const description = plainEventDescription(event.event_description);
  if (description) lines.push("", `${labels.description}:`, description);

  // Private event links must not be promoted as public handoff URLs.
  if (event.visibility === "public" || event.visibility === "unlisted") {
    const publicId = encodeURIComponent(event.public_id || String(event.id));
    const base = origin.replace(/\/$/, "");
    lines.push("", `${labels.publicUrl}: ${base}/events/${publicId}`);
    if (event.registration_enabled === true && event.registration_closed !== true) {
      lines.push(`${labels.registrationUrl}: ${base}/events/${publicId}/register`);
    }
  }

  lines.push("", labels.reviewNote);
  return `${lines.join("\n")}\n`;
}
