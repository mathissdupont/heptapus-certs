"use client";

import { CalendarDays, ExternalLink, QrCode, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getApiBase } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { localeTag } from "@/lib/localeTag";
import { fetchCurrentBranding, type PublicBranding } from "@/lib/whiteLabel";

type OrgEvent = { id: number; public_id?: string | null; name: string; event_date?: string | null; event_location?: string | null };
type OrgDetail = {
  public_id: string;
  bio?: string | null;
  website_url?: string | null;
  events?: OrgEvent[];
};

export default function WhiteLabelHomeClient() {
  const { lang, t } = useI18n();
  const [branding, setBranding] = useState<PublicBranding | null>(null);
  const [detail, setDetail] = useState<OrgDetail | null>(null);

  useEffect(() => {
    let active = true;
    fetchCurrentBranding()
      .then((data) => {
        if (!active || !data) return;
        setBranding(data);
        if (data.brand_color) document.documentElement.style.setProperty("--site-brand-color", data.brand_color);
        if (!data.public_id) return;
        fetch(`${getApiBase()}/public/organizations/${encodeURIComponent(data.public_id)}`, { cache: "no-store" })
          .then((response) => (response.ok ? response.json() : null))
          .then((organization) => active && organization && setDetail(organization))
          .catch(() => undefined);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const brandName = branding?.org_name || "HeptaCert";
  const bio = detail?.bio || branding?.settings?.public_bio || t("home_body_whitelabel_template", { name: brandName });
  const website = detail?.website_url || branding?.settings?.public_website_url;
  const events = detail?.events || [];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-canvas">
      <section className="border-b border-outline-subtle bg-raised">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="max-w-3xl">
            <div className="mb-7 flex items-center gap-4">
              {branding?.brand_logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.brand_logo} alt={brandName} className="h-14 w-auto max-w-52 object-contain" />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-xl font-black text-accent-strong">{brandName.charAt(0).toUpperCase()}</span>
              )}
              <p className="text-11 font-extrabold uppercase tracking-[0.18em] text-accent-strong">{t("home_badge_whitelabel")}</p>
            </div>
            <h1 className="text-balance text-4xl font-black tracking-tight text-content-primary sm:text-6xl">{t("home_title_whitelabel_template", { name: brandName })}</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-content-muted">{bio}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/verify" className="btn-primary min-h-12 px-6"><QrCode className="h-4 w-4" />{t("home_primary_cta_whitelabel")}</Link>
              {branding?.public_id && <Link href={`/organizations/${branding.public_id}`} className="btn-secondary min-h-12 px-6"><Users className="h-4 w-4" />{t("org_details_cta")}</Link>}
              {website && <a href={website} target="_blank" rel="noreferrer" className="btn-secondary min-h-12 px-6"><ExternalLink className="h-4 w-4" />{t("profile_website")}</a>}
            </div>
          </div>
        </div>
      </section>
      {events.length > 0 && (
        <section className="flex-1 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <h2 className="text-2xl font-black tracking-tight text-content-primary">{t("org_detail_events_section")}</h2>
            <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {events.slice(0, 6).map((event) => (
                <Link key={event.public_id || event.id} href={`/events/${event.public_id || event.id}`} className="group rounded-2xl border border-outline-subtle bg-raised p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-accent-border hover:shadow-float">
                  <CalendarDays className="h-5 w-5 text-accent-strong" />
                  <h3 className="mt-4 font-bold text-content-primary">{event.name}</h3>
                  {event.event_date && <p className="mt-2 text-xs text-content-muted">{new Date(event.event_date).toLocaleDateString(localeTag(lang), { dateStyle: "long" })}</p>}
                  {event.event_location && <p className="mt-1 text-xs text-content-faint">{event.event_location}</p>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
