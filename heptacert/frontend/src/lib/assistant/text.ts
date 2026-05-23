export function normalizePromptText(value: string): string {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function compactText(value: string): string {
  return normalizePromptText(value).replace(/[^a-z0-9ğüşöçıİİçöğ\s-]/gi, " ").replace(/\s+/g, " ").trim();
}

export function tokenize(value: string): string[] {
  return compactText(value).split(/\s+/).filter(Boolean);
}

export function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: an + 1 }, () => new Array(bn + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[i][0] = i;
  for (let j = 0; j <= bn; j++) matrix[0][j] = j;
  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[an][bn];
}

export function fuzzyIncludes(text: string, target: string, maxDistance = 1): boolean {
  if (!text || !target) return false;
  const t = compactText(text);
  const tokens = tokenize(t);
  for (const token of tokens) {
    if (token === target) return true;
    const d = levenshteinDistance(token, target);
    if (d <= maxDistance) return true;
  }
  return false;
}

export function fuzzyAny(text: string, keywords: string[]): boolean {
  for (const k of keywords) if (fuzzyIncludes(text, k)) return true;
  return false;
}

export function isAffirmative(text: string): boolean {
  const t = compactText(text);
  return /\b(ev(et)?|tamam|olustur|create|yes|yep|ok|onayla|onay)\b/.test(t);
}

export function isNegative(text: string): boolean {
  const t = compactText(text);
  return /\b(hayir|iptal|vazgeç|vazgec|no|not|cancel|dur|stop|hayır)\b/.test(t);
}

export function isSkipValue(text: string): boolean {
  const t = compactText(text);
  return /\b(atla|skip|none|yok|boş|bos)\b/.test(t);
}

export default {
  normalizePromptText,
  compactText,
  tokenize,
  levenshteinDistance,
  fuzzyIncludes,
  fuzzyAny,
  isAffirmative,
  isNegative,
  isSkipValue,
};
