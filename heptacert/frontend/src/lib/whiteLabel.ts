import { getApiBase, normalizeApiAssetUrl } from "@/lib/api";

export type PublicBranding = {
  public_id?: string | null;
  org_name?: string | null;
  brand_logo?: string | null;
  brand_color?: string | null;
  custom_domain?: string | null;
  settings?: {
    hide_heptacert_home?: boolean;
    public_bio?: string;
    public_website_url?: string;
  } | null;
};

export const PRIMARY_APP_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "heptacert.com",
  "www.heptacert.com",
  "heptacert.com",
]);

export function isWhiteLabelBranding(branding: PublicBranding | null | undefined, host?: string | null) {
  const normalizedHost = (host || "").trim().toLowerCase();
  return Boolean(
    branding?.org_name &&
      (branding.settings?.hide_heptacert_home || (normalizedHost ? !PRIMARY_APP_HOSTS.has(normalizedHost) : false)),
  );
}

export async function fetchCurrentBranding(): Promise<PublicBranding | null> {
  const response = await fetch(`${getApiBase()}/branding`, { credentials: "include", cache: "no-store" });
  if (!response.ok) return null;
  const data = (await response.json()) as PublicBranding;
  return { ...data, brand_logo: normalizeApiAssetUrl(data.brand_logo) };
}
