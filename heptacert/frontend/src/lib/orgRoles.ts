// Organizasyon üyelik rolleri için okunabilir etiketler ve yetki yardımcıları.
// Backend ham rol anahtarlarını (`venue_manager` vb.) döndürür; arayüzde bunları
// olduğu gibi göstermek yerine bu modül üzerinden insancıl etikete çeviririz.

export type OrgLang = "tr" | "en";

export type OrgRoleContext = {
  owned?: boolean;
  role?: string;
  permissions?: string[];
};

const ORG_ROLE_LABELS: Record<string, { tr: string; en: string }> = {
  owner: { tr: "Sahibi", en: "Owner" },
  manager: { tr: "Yönetici", en: "Manager" },
  venue_manager: { tr: "Salon & Rezervasyon", en: "Venue & Reservations" },
  event_manager: { tr: "Etkinlik Yöneticisi", en: "Event Manager" },
  profile_manager: { tr: "Kurum Profili", en: "Org Profile" },
  viewer: { tr: "Görüntüleyici", en: "Viewer" },
};

/** Ham rol anahtarını okunabilir etikete çevirir. Bilinmeyen roller için
 *  snake_case → "Title Case" güvenli geri dönüşü uygular. */
export function orgRoleLabel(role: string | undefined | null, lang: OrgLang): string {
  if (!role) return lang === "tr" ? "Üye" : "Member";
  const entry = ORG_ROLE_LABELS[role];
  if (entry) return entry[lang];
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
