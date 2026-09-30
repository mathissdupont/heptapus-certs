import type { Translator } from "@/lib/i18n";
import type { TranslationKey } from "@/locales/tr";
// Organizasyon üyelik rolleri için okunabilir etiketler ve yetki yardımcıları.
// Backend ham rol anahtarlarını (`venue_manager` vb.) döndürür; arayüzde bunları
// olduğu gibi göstermek yerine bu modül üzerinden insancıl etikete çeviririz.

export type OrgRoleContext = {
  id?: number;
  owned?: boolean;
  role?: string;
  permissions?: string[];
};

const ORG_ROLE_LABELS: Record<string, TranslationKey> = {
  owner: "org_role_owner",
  manager: "org_role_manager",
  venue_manager: "org_role_venue_manager",
  event_manager: "org_role_event_manager",
  profile_manager: "org_role_profile_manager",
  viewer: "org_role_viewer",
};

/** Ham rol anahtarını okunabilir etikete çevirir. Bilinmeyen roller için
 *  snake_case → "Title Case" güvenli geri dönüşü uygular. */
export function orgRoleLabel(role: string | undefined | null, t: Translator): string {
  if (!role) return t("org_role_member");
  const key = ORG_ROLE_LABELS[role];
  if (key) return t(key);
  return role
    .split(/[_\s]+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/** Bu organizasyon bağlamında kullanıcının etkinlik yönetme yetkisi var mı?
 *  Kendi kurumu (owned) her zaman yönetebilir; üyelikler `events:manage`
 *  iznine bağlıdır. */
export function canManageEvents(ctx: OrgRoleContext): boolean {
  return Boolean(ctx.owned) || (ctx.permissions ?? []).includes("events:manage");
}

/** Kullanıcının yetkilerine göre giriş sonrası ineceği en uygun sayfa.
 *  Etkinlik yetkisi olan (owner/manager/event_manager) → Etkinlikler;
 *  sadece salon/rezervasyon rolleri → kendi ana sayfaları; aksi halde
 *  Dashboard. Böylece sınırlı roller "yetki yok" ekranına düşmez. */
export function landingPathForContexts(contexts: OrgRoleContext[]): string {
  if (contexts.some(canManageEvents)) return "/admin/events";
  const hasPermission = (perm: string) => contexts.some((ctx) => (ctx.permissions ?? []).includes(perm));
  if (hasPermission("reservations:read")) return "/admin/reservations";
  if (hasPermission("venues:read")) return "/admin/venues";
  return "/admin/dashboard";
}
