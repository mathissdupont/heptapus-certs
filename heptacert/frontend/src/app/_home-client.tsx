"use client";

import { ArrowRight, Building2, CalendarDays, CheckCircle2, QrCode, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Branding = {
  org_name?: string;
  brand_logo?: string | null;
  brand_color?: string | null;
  settings?: { hide_heptacert_home?: boolean };
};

type StatsData = {
  active_members?: string;
  hosted_events?: string;
  issued_certificates?: string;
  active_orgs?: string;
  certs_issued?: string;
  uptime_pct?: string;
  availability?: string;
};

const HOSTS = new Set(["heptacert.com", "www.heptacert.com", "cert.heptapusgroup.com", "localhost", "127.0.0.1"]);

export default function LandingPage() {
  const { lang } = useI18n();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [host, setHost] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setHost(window.location.hostname);

    fetch(`${API_BASE}/branding`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setBranding(data);
        if (data.brand_color) document.documentElement.style.setProperty("--site-brand-color", data.brand_color);
      })
      .catch(() => {});

    fetch(`${API_BASE}/stats`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {});
  }, []);

  const brandName = branding?.org_name || "HeptaCert";
  const isWhiteLabel = useMemo(
    () => !!branding?.org_name && (branding?.settings?.hide_heptacert_home || (host ? !HOSTS.has(host) : false)),
    [branding, host],
  );
  const showPlatformLinks = !isWhiteLabel;

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            heroTitle: "Etkinlik, kayıt ve sertifika süreçlerini tek yerden yönetin.",
            heroDesc:
              "HeptaCert; etkinlik kaydı, QR check-in, katılımcı takibi ve doğrulanabilir sertifika üretimini sade bir yönetim akışında birleştirir.",
            primaryBtn: "Ücretsiz Başla",
            secondaryBtn: "Etkinlikleri Gör",
            verifyBtn: "Sertifika Doğrula",
            statsUsers: "Aktif Üye",
            statsEvents: "Düzenlenen Etkinlik",
            statsCerts: "Verilen Sertifika",
            sectionTitle: "Etkinliklerinizi kolayca yönetin",
            sectionDesc: "Organizatörlerin günlük işini hızlandıran temel akışlar.",
            feature1Title: "Kayıt ve katılımcı yönetimi",
            feature1Desc: "Kayıt formları, onaylar, belge yüklemeleri ve katılımcı listeleri tek panelde.",
            feature2Title: "QR check-in",
            feature2Desc: "Oturum bazlı QR yoklama ve giriş kontrolüyle sahada hızlı operasyon.",
            feature3Title: "Doğrulanabilir sertifika",
            feature3Desc: "Katılımcılar sertifikalarını paylaşabilir, kurumlar doğruluğunu anında kontrol edebilir.",
            ctaTitle: "Organizatör paneline geçin",
            ctaDesc: "Etkinlik oluşturun, kayıt alın ve sertifikaları operasyon bitmeden hazır hale getirin.",
            pricing: "Fiyatlandırma",
            footerVerify: "Sertifika Doğrula",
            footerContact: "İletişim",
            footerPrivacy: "Gizlilik Politikası",
            footerTerms: "Kullanım Koşulları",
          }
        : {
            heroTitle: "Run event registration and certificates from one workspace.",
            heroDesc:
              "HeptaCert combines registration, QR check-in, attendee operations, and verifiable certificate delivery in a clean organizer workflow.",
            primaryBtn: "Start Free",
            secondaryBtn: "Explore Events",
            verifyBtn: "Verify Certificate",
            statsUsers: "Active Members",
            statsEvents: "Hosted Events",
            statsCerts: "Issued Certificates",
            sectionTitle: "Manage your events with ease",
            sectionDesc: "Core workflows built for everyday organizer work.",
            feature1Title: "Registration management",
            feature1Desc: "Forms, notices, documents, approvals, and attendee lists in one panel.",
            feature2Title: "QR check-in",
            feature2Desc: "Session-level attendance and entrance control for faster on-site operations.",
            feature3Title: "Verifiable certificates",
            feature3Desc: "Participants can share credentials, and anyone can verify authenticity instantly.",
            ctaTitle: "Move into the organizer panel",
            ctaDesc: "Create your event, collect registrations, and prepare certificates before the operation ends.",
            pricing: "Pricing",
            footerVerify: "Verify Certificate",
            footerContact: "Contact",
            footerPrivacy: "Privacy Policy",
            footerTerms: "Terms of Service",
          },
    [lang],
  );

  const statItems = [
    { label: copy.statsUsers, value: stats?.active_members ?? "..." },
    { label: copy.statsEvents, value: stats?.hosted_events ?? "..." },
    { label: copy.statsCerts, value: stats?.issued_certificates ?? stats?.certs_issued ?? "..." },
  ];

  const features = [
    { icon: Users, title: copy.feature1Title, desc: copy.feature1Desc },
    { icon: QrCode, title: copy.feature2Title, desc: copy.feature2Desc },
    { icon: CheckCircle2, title: copy.feature3Title, desc: copy.feature3Desc },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-950">
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
          <div>
            <div className="mb-6 flex items-center gap-3">
              {branding?.brand_logo ? (
                <img src={branding.brand_logo} alt={brandName} className="h-12 w-auto object-contain sm:h-14" />
              ) : isWhiteLabel ? (
                <span className="text-lg font-bold">{brandName}</span>
              ) : (
                <Image src="/logo.svg" alt="HeptaCert" width={240} height={64} className="h-12 w-auto sm:h-14" priority />
              )}
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">{copy.heroDesc}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register?mode=organizer" className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-zinc-800">
                {copy.primaryBtn}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {showPlatformLinks && (
                <Link href="/events" className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50">
                  <CalendarDays className="h-4 w-4" />
                  {copy.secondaryBtn}
                </Link>
              )}
              <Link href="/verify" className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50">
                <QrCode className="h-4 w-4" />
                {copy.verifyBtn}
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">HeptaCert</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">{copy.sectionTitle}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Live</span>
              </div>
              <div className="mt-5 grid gap-3">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.title} className="flex gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-800">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-950">{feature.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-zinc-500">{feature.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {showPlatformLinks && (
        <section className="border-b border-zinc-200 bg-white">
          <div className="mx-auto grid max-w-6xl divide-y divide-zinc-100 px-4 py-8 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6">
            {statItems.map((item) => (
              <div key={item.label} className="py-5 text-center sm:py-3">
                <p className="text-3xl font-black tracking-tight text-zinc-950">{item.value}</p>
                <p className="mt-1 text-sm font-medium text-zinc-500">{item.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex-1 py-14 sm:py-18">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">{copy.sectionTitle}</h2>
            <p className="mt-3 text-base leading-7 text-zinc-600">{copy.sectionDesc}</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-950">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {showPlatformLinks && (
        <section className="pb-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-zinc-950">{copy.ctaTitle}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">{copy.ctaDesc}</p>
              </div>
              <div className="mt-5 flex shrink-0 flex-wrap gap-3 sm:mt-0">
                <Link href="/register?mode=organizer" className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-zinc-800">
                  {copy.primaryBtn}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/pricing" className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50">
                  {copy.pricing}
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <footer className="mt-auto border-t border-zinc-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-4 sm:px-6 md:flex-row">
          <div className="flex items-center gap-3">
            {branding?.brand_logo ? (
              <img src={branding.brand_logo} alt={branding.org_name || "Logo"} className="h-8 w-auto sm:h-9" />
            ) : isWhiteLabel ? (
              <span className="text-base font-bold text-zinc-950">{brandName}</span>
            ) : (
              <Image src="/logo.svg" alt="HeptaCert" width={180} height={48} className="h-8 w-auto sm:h-9" />
            )}
            <span className="text-sm text-zinc-400">© {new Date().getFullYear()}</span>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-zinc-500">
            <Link href="/verify" className="transition hover:text-zinc-950">{copy.footerVerify}</Link>
            <Link href="/iletisim" className="transition hover:text-zinc-950">{copy.footerContact}</Link>
            <Link href="/kullanim-kosullari" className="transition hover:text-zinc-950">{copy.footerTerms}</Link>
            <Link href="/gizlilik" className="transition hover:text-zinc-950">{copy.footerPrivacy}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
