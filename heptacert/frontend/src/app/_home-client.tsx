"use client";

import { ArrowRight, CalendarDays, CheckCircle2, ExternalLink, QrCode, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getApiBase, normalizeApiAssetUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Branding = {
  public_id?: string | null;
  org_name?: string;
  brand_logo?: string | null;
  brand_color?: string | null;
  custom_domain?: string | null;
  settings?: {
    hide_heptacert_home?: boolean;
    public_bio?: string;
    public_website_url?: string;
    public_linkedin_url?: string;
    public_github_url?: string;
    public_x_url?: string;
    public_instagram_url?: string;
  };
};

type OrgEvent = {
  id: number;
  public_id?: string | null;
  name: string;
  event_date?: string | null;
  event_location?: string | null;
};

type OrgDetail = {
  public_id: string;
  org_name: string;
  brand_logo?: string | null;
  brand_color: string;
  bio?: string | null;
  website_url?: string | null;
  event_count: number;
  follower_count: number;
  events: OrgEvent[];
};

type StatsData = {
  active_members?: string;
  hosted_events?: string;
  issued_certificates?: string;
  certs_issued?: string;
};

const HOSTS = new Set(["heptacert.com", "www.heptacert.com", "cert.heptapusgroup.com", "localhost", "127.0.0.1"]);

export default function LandingPage() {
  const { lang } = useI18n();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [orgDetail, setOrgDetail] = useState<OrgDetail | null>(null);
  const [host, setHost] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setHost(window.location.hostname);

    const apiBase = getApiBase();

    fetch(`${apiBase}/branding`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setBranding({ ...data, brand_logo: normalizeApiAssetUrl(data.brand_logo) });
        if (data.brand_color) document.documentElement.style.setProperty("--site-brand-color", data.brand_color);
        if (data.public_id) {
          fetch(`${apiBase}/public/organizations/${encodeURIComponent(data.public_id)}`, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((org) => org && setOrgDetail({ ...org, brand_logo: normalizeApiAssetUrl(org.brand_logo) }))
            .catch(() => {});
        }
      })
      .catch(() => {});

    fetch(`${apiBase}/stats`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setStats(data); })
      .catch(() => {});
  }, []);

  const brandName = branding?.org_name || "HeptaCert";
  const isWhiteLabel = useMemo(
    () => !!branding?.org_name && (branding?.settings?.hide_heptacert_home || (host ? !HOSTS.has(host) : false)),
    [branding, host],
  );
  const showPlatformLinks = !isWhiteLabel;
  const brandColor = branding?.brand_color || orgDetail?.brand_color || "#111827";

  // ── White-label landing ──────────────────────────────────────────────
  if (isWhiteLabel) {
    const bio = orgDetail?.bio || branding?.settings?.public_bio || "Etkinlikler, kayıtlar ve doğrulanabilir sertifikalar için kurumsal alan.";
    const events = orgDetail?.events || [];
    const websiteUrl = orgDetail?.website_url || branding?.settings?.public_website_url || "";

    return (
      <div className="flex min-h-screen flex-col bg-surface-50 text-surface-900">
        {/* White-label hero */}
        <section className="border-b border-surface-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-20">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-12">
              <div className="flex-1">
                <div className="mb-6 flex items-center gap-4">
                  {branding?.brand_logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={branding.brand_logo} alt={brandName} className="h-12 w-auto object-contain" />
                  ) : (
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white"
                      style={{ backgroundColor: brandColor }}
                    >
                      {brandName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                      {lang === "tr" ? "Kurumsal etkinlik alanı" : "Organization workspace"}
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight text-surface-900 sm:text-3xl">{brandName}</h1>
                  </div>
                </div>
                <p className="max-w-xl text-base leading-relaxed text-surface-600">{bio}</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/verify"
                    className="btn-primary"
                  >
                    <QrCode className="h-4 w-4" />
                    {lang === "tr" ? "Sertifika Doğrula" : "Verify Certificate"}
                  </Link>
                  {orgDetail?.public_id && (
                    <Link href={`/organizations/${orgDetail.public_id}`} className="btn-secondary">
                      <Users className="h-4 w-4" />
                      {lang === "tr" ? "Kurum Sayfası" : "Organization Page"}
                    </Link>
                  )}
                  {websiteUrl && (
                    <a href={websiteUrl} target="_blank" rel="noreferrer" className="btn-secondary">
                      <ExternalLink className="h-4 w-4" />
                      {lang === "tr" ? "Web Sitesi" : "Website"}
                    </a>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-surface-200 bg-surface-50 p-5 md:w-72">
                <p className="text-sm font-medium text-surface-900">
                  {lang === "tr" ? "Bu alan kuruma özeldir." : "This domain belongs to the organization."}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-surface-500">
                  {lang === "tr"
                    ? "Doğrulama ve etkinlik akışları kurum markasıyla çalışır."
                    : "Verification and event flows run under the organization's brand."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* White-label events */}
        <section className="flex-1 py-12">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-surface-900">
                  {lang === "tr" ? "Etkinlikler" : "Events"}
                </h2>
                <p className="mt-0.5 text-sm text-surface-500">
                  {lang === "tr" ? "Kurumun herkese açık etkinlikleri." : "Public events from this organization."}
                </p>
              </div>
              <span className="rounded-full border border-surface-200 bg-white px-3 py-1 text-xs font-medium text-surface-500">
                {orgDetail?.event_count ?? events.length} {lang === "tr" ? "etkinlik" : "events"}
              </span>
            </div>
            {events.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.slice(0, 6).map((event) => (
                  <Link
                    key={event.public_id || event.id}
                    href={`/events/${event.public_id || event.id}`}
                    className="card-hover p-5"
                  >
                    <CalendarDays className="h-4 w-4 text-surface-400" />
                    <h3 className="mt-3 text-sm font-semibold text-surface-900">{event.name}</h3>
                    <p className="mt-1.5 text-xs text-surface-500">
                      {event.event_date
                        ? new Date(event.event_date).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US")
                        : (lang === "tr" ? "Tarih yakında" : "Date TBA")}
                    </p>
                    {event.event_location && (
                      <p className="mt-0.5 text-xs text-surface-400">{event.event_location}</p>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-surface-200 bg-white p-10 text-center text-sm text-surface-400">
                {lang === "tr"
                  ? "Henüz herkese açık etkinlik yayınlanmadı."
                  : "No public events have been published yet."}
              </div>
            )}
          </div>
        </section>

        <PublicFooter lang={lang} copy={{ footerVerify: lang === "tr" ? "Sertifika Doğrula" : "Verify Certificate", footerContact: lang === "tr" ? "İletişim" : "Contact", footerPrivacy: lang === "tr" ? "Gizlilik" : "Privacy", footerTerms: lang === "tr" ? "Koşullar" : "Terms" }} branding={branding} isWhiteLabel={true} brandName={brandName} />
      </div>
    );
  }

  // ── Copy ─────────────────────────────────────────────────────────────
  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            badge: "Etkinlik ve Sertifika Platformu",
            heroTitle: "Etkinlik kayıtları ve sertifika süreçleri, tek platformda.",
            heroDesc: "HeptaCert; etkinlik kaydı, QR check-in ve doğrulanabilir sertifika üretimini sade bir akışta birleştirir.",
            primaryBtn: "Ücretsiz Başla",
            secondaryBtn: "Etkinlikleri Gör",
            verifyBtn: "Sertifika Doğrula",
            statsUsers: "Aktif Üye",
            statsEvents: "Düzenlenen Etkinlik",
            statsCerts: "Verilen Sertifika",
            featuresLabel: "Nasıl çalışır",
            featuresTitle: "Organizatörler için tasarlandı",
            featuresDesc: "Kayıttan sertifika teslimine kadar tüm akışlar tek panelde.",
            feature1Title: "Kayıt ve Katılımcı Yönetimi",
            feature1Desc: "Kayıt formları, onaylar, belge yüklemeleri ve katılımcı listeleri tek panelde.",
            feature2Title: "QR Check-in",
            feature2Desc: "Oturum bazlı QR yoklama ve giriş kontrolüyle sahada hızlı operasyon.",
            feature3Title: "Doğrulanabilir Sertifika",
            feature3Desc: "Katılımcılar sertifikalarını paylaşabilir, kurumlar doğruluğunu anında kontrol edebilir.",
            ctaTitle: "Etkinliğinizi bugün başlatın",
            ctaDesc: "Dakikalar içinde kurulum yapın. Ücretsiz başlayın.",
            ctaPrimary: "Ücretsiz Başla",
            ctaSecondary: "Fiyatlandırma",
            footerVerify: "Sertifika Doğrula",
            footerContact: "İletişim",
            footerPrivacy: "Gizlilik",
            footerTerms: "Koşullar",
          }
        : {
            badge: "Event & Certificate Platform",
            heroTitle: "Event registration and certificates, in one workspace.",
            heroDesc: "HeptaCert combines registration, QR check-in, and verifiable certificate delivery in a clean organizer workflow.",
            primaryBtn: "Start Free",
            secondaryBtn: "Explore Events",
            verifyBtn: "Verify Certificate",
            statsUsers: "Active Members",
            statsEvents: "Hosted Events",
            statsCerts: "Issued Certificates",
            featuresLabel: "How it works",
            featuresTitle: "Built for organizers",
            featuresDesc: "From registration to certificate delivery — everything in one panel.",
            feature1Title: "Registration Management",
            feature1Desc: "Forms, approvals, document uploads, and attendee lists in one panel.",
            feature2Title: "QR Check-in",
            feature2Desc: "Session-level attendance and entrance control for faster on-site operations.",
            feature3Title: "Verifiable Certificates",
            feature3Desc: "Participants share credentials, anyone can verify authenticity instantly.",
            ctaTitle: "Launch your next event today",
            ctaDesc: "Set up in minutes. Free to start.",
            ctaPrimary: "Start Free",
            ctaSecondary: "Pricing",
            footerVerify: "Verify Certificate",
            footerContact: "Contact",
            footerPrivacy: "Privacy",
            footerTerms: "Terms",
          },
    [lang],
  );

  const statItems = [
    { label: copy.statsUsers,  value: stats?.active_members ?? "—" },
    { label: copy.statsEvents, value: stats?.hosted_events   ?? "—" },
    { label: copy.statsCerts,  value: stats?.issued_certificates ?? stats?.certs_issued ?? "—" },
  ];

  const features = [
    { icon: Users,         title: copy.feature1Title, desc: copy.feature1Desc },
    { icon: QrCode,        title: copy.feature2Title, desc: copy.feature2Desc },
    { icon: CheckCircle2,  title: copy.feature3Title, desc: copy.feature3Desc },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-surface-50 text-surface-900">
      {/* Hero */}
      <section className="border-b border-surface-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:py-28">
          {/* Badge */}
          <div className="mb-7 flex justify-center">
            <span className="inline-flex items-center rounded-full border border-surface-200 bg-surface-50 px-4 py-1.5 text-xs font-medium text-surface-600">
              {copy.badge}
            </span>
          </div>

          {/* Title */}
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-surface-900 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.15]">
            {copy.heroTitle}
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-surface-500">
            {copy.heroDesc}
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register?mode=organizer" className="btn-primary text-sm">
              {copy.primaryBtn}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {showPlatformLinks && (
              <Link href="/events" className="btn-secondary text-sm">
                <CalendarDays className="h-4 w-4" />
                {copy.secondaryBtn}
              </Link>
            )}
            <Link href="/verify" className="btn-ghost text-sm">
              {copy.verifyBtn}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      {showPlatformLinks && (
        <section className="border-b border-surface-200 bg-white">
          <div className="mx-auto grid max-w-4xl grid-cols-3 divide-x divide-surface-100 px-4 sm:px-6">
            {statItems.map((item) => (
              <div key={item.label} className="py-8 text-center">
                <p className="text-3xl font-bold tracking-tight text-surface-900">{item.value}</p>
                <p className="mt-1.5 text-sm text-surface-500">{item.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-surface-400">
              {copy.featuresLabel}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-surface-900 sm:text-3xl">
              {copy.featuresTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-surface-500">{copy.featuresDesc}</p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="card p-6">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-surface-200 bg-surface-50 text-surface-600">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-surface-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-surface-500">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA section */}
      {showPlatformLinks && (
        <section className="px-4 pb-16 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-2xl bg-surface-900 px-8 py-12 text-center sm:px-12">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {copy.ctaTitle}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-base text-white/60">{copy.ctaDesc}</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/register?mode=organizer"
                  className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-medium text-surface-900 transition-opacity hover:opacity-90"
                >
                  {copy.ctaPrimary}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-md border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  {copy.ctaSecondary}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <PublicFooter lang={lang} copy={copy} branding={branding} isWhiteLabel={isWhiteLabel} brandName={brandName} />
    </div>
  );
}

function PublicFooter({
  lang,
  copy,
  branding,
  isWhiteLabel,
  brandName,
}: {
  lang: string;
  copy: { footerVerify: string; footerContact: string; footerPrivacy: string; footerTerms: string };
  branding: Branding | null;
  isWhiteLabel: boolean;
  brandName: string;
}) {
  return (
    <footer className="mt-auto border-t border-surface-200 bg-white py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <div className="flex items-center gap-3">
          {branding?.brand_logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.brand_logo} alt={branding.org_name || "Logo"} className="h-7 w-auto" />
          ) : isWhiteLabel ? (
            <span className="text-sm font-semibold text-surface-900">{brandName}</span>
          ) : (
            <Image src="/logo.svg" alt="HeptaCert" width={120} height={32} className="h-7 w-auto" />
          )}
          <span className="text-xs text-surface-400">© {new Date().getFullYear()}</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-sm text-surface-500">
          <Link href="/verify"              className="transition-colors hover:text-surface-900">{copy.footerVerify}</Link>
          <Link href="/iletisim"            className="transition-colors hover:text-surface-900">{copy.footerContact}</Link>
          <Link href="/kullanim-kosullari"  className="transition-colors hover:text-surface-900">{copy.footerTerms}</Link>
          <Link href="/gizlilik"            className="transition-colors hover:text-surface-900">{copy.footerPrivacy}</Link>
          {!isWhiteLabel && (
            <Link href="/pricing" className="transition-colors hover:text-surface-900">
              {lang === "tr" ? "Fiyatlandırma" : "Pricing"}
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
