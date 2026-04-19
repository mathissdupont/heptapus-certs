export function normalizeExternalUrl(raw: string | null | undefined): string | null {
  const value = (raw || "").trim();
  if (!value) return null;

  const lower = value.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:") || lower.startsWith("file:")) {
    return null;
  }

  if (value.startsWith("//")) return `https:${value}`;
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)) return value;

  return `https://${value}`;
}
