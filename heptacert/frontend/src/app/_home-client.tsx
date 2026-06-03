"use client";

import {
  ArrowRight, CalendarDays, CheckCircle2, ExternalLink,
  QrCode, Users, Mail, BarChart3, Layers, Sparkles,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion, useMotionValue, useTransform, useScroll, useSpring,
  useInView,
} from "framer-motion";
import { getApiBase, normalizeApiAssetUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

// ── Types ─────────────────────────────────────────────────────────────
type Branding = {
  public_id?: string | null;
  org_name?: string;
  brand_logo?: string | null;
  brand_color?: string | null;
  settings?: {
    hide_heptacert_home?: boolean;
    public_bio?: string;
    public_website_url?: string;
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

// ── Animated blob background ──────────────────────────────────────────
function ParallaxHero({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0.5);
  const rawY = useMotionValue(0.5);
  const smoothX = useSpring(rawX, { stiffness: 60, damping: 20 });
  const smoothY = useSpring(rawY, { stiffness: 60, damping: 20 });

  const blob1X = useTransform(smoothX, [0, 1], [-40, 40]);
  const blob1Y = useTransform(smoothY, [0, 1], [-40, 40]);
  const blob2X = useTransform(smoothX, [0, 1], [40, -40]);
  const blob2Y = useTransform(smoothY, [0, 1], [40, -40]);
  const blob3X = useTransform(smoothX, [0, 1], [-20, 20]);
  const blob3Y = useTransform(smoothY, [0, 1], [20, -20]);

  const { scrollY } = useScroll();
  const contentY = useTransform(scrollY, [0, 600], [0, -80]);
  const contentOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const blobScale = useTransform(scrollY, [0, 600], [1, 1.3]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set((e.clientX - rect.left) / rect.width);
    rawY.set((e.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    rawX.set(0.5);
    rawY.set(0.5);
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-[100svh] overflow-hidden bg-[#0A0A0B] flex items-center"
    >
      {/* Noise texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px",
        }}
      />

      {/* Animated gradient blobs */}
      <motion.div
        style={{ x: blob1X, y: blob1Y, scale: blobScale }}
        className="pointer-events-none absolute -left-32 -top-32 h-[600px] w-[600px] rounded-full opacity-20"
      >
        <div
          className="h-full w-full rounded-full"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)" }}
        />
      </motion.div>

      <motion.div
        style={{ x: blob2X, y: blob2Y, scale: blobScale }}
        className="pointer-events-none absolute -bottom-32 -right-32 h-[700px] w-[700px] rounded-full opacity-15"
      >
        <div
          className="h-full w-full rounded-full"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)" }}
        />
      </motion.div>

      <motion.div
        style={{ x: blob3X, y: blob3Y, scale: blobScale }}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full opacity-10"
      >
        <div
          className="h-full w-full rounded-full"
          style={{ background: "radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 70%)" }}
        />
      </motion.div>

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-[5] opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Content */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-20 w-full"
      >
        {children}
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2"
        >
          <div className="h-10 w-[1px] bg-gradient-to-b from-white/0 via-white/40 to-white/0" />
        </motion.div>
      </motion.div>
    </div>
  );
}

// ── Scroll reveal wrapper ─────────────────────────────────────────────
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  desc,
  delay = 0,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <div className="group rounded-2xl border border-surface-200 bg-white p-6 shadow-card transition-shadow hover:shadow-raised">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-surface-200 bg-surface-50 text-surface-600 transition-colors group-hover:border-surface-300 group-hover:bg-surface-100">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-semibold text-surface-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-surface-500">{desc}</p>
      </div>
    </Reveal>
  );
}

// ── Main component ────────────────────────────────────────────────────
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

  // ── Copy ──────────────────────────────────────────────────────────
  // NOTE: This useMemo must stay ABOVE the white-label early return below.
  // React's Rules of Hooks require every hook to run on every render in the
  // same order; placing it after a conditional `return` crashes the app when
  // isWhiteLabel flips after the branding fetch resolves.
  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            eyebrow: "Etkinlik, sertifika ve topluluk yönetimi",
            heroLine1: "Organizatörlerin",
            heroLine2: "ihtiyaç duyduğu",
            heroLine3: "her şey.",
            heroDesc: "Kayıt formlarından QR yoklamaya, doğrulanabilir sertifikadan e-posta kampanyasına — hepsi tek platformda, ekstra karmaşa olmadan.",
            primaryBtn: "Ücretsiz Başla",
            secondaryBtn: "Etkinlikleri Keşfet",
            statsUsers: "Aktif Üye",
            statsEvents: "Düzenlenen Etkinlik",
            statsCerts: "Verilen Sertifika",
            featLabel: "Platform özellikleri",
            featTitle: "Tek araç, tüm etkinlik akışı",
            featDesc: "Ayrı araçlara, kopyala-yapıştıra ve Excel labyrentine son verin.",
            features: [
              { title: "Kayıt & Form Yönetimi", desc: "Özel kayıt formları, onay akışları, belge yüklemeleri ve katılımcı listeleri." },
              { title: "QR Yoklama & Oturum", desc: "Oturum bazlı QR check-in, canlı operasyon ekranı ve kapı kontrolü." },
              { title: "Doğrulanabilir Sertifika", desc: "Katılımcılar sertifikalarını paylaşır, herkes anında doğrulayabilir." },
              { title: "E-posta Kampanyası", desc: "Toplu e-posta gönderimi, şablonlar, otomasyonlar ve açılma takibi." },
              { title: "Topluluk & Keşif", desc: "Etkinlik sayfaları, topluluk akışı ve organizasyon profilleri." },
              { title: "Analitik & Raporlama", desc: "Katılım oranları, sertifika sağlığı ve etkinlik bazında detaylı istatistikler." },
            ],
            forLabel: "Kimler için?",
            forTitle: "Her ölçekte organizatör için",
            audiences: [
              { icon: "🎓", title: "Üniversite Kulüpleri", desc: "Etkinlik kaydı, yoklama ve sertifika tek akışta." },
              { icon: "🏢", title: "Kurumsal Ekipler", desc: "Çok oturumlu etkinlikler, biletleme ve CRM." },
              { icon: "🌐", title: "Online Etkinlikler", desc: "Dijital sertifika ve anket akışı." },
              { icon: "🎪", title: "Büyük Organizasyonlar", desc: "Toplu sertifika, API entegrasyonu ve white-label." },
            ],
            ctaTitle: "Sonraki etkinliğinizi bugün başlatın",
            ctaDesc: "Kurulum dakikalar içinde. Ücretsiz başlayın.",
            ctaPrimary: "Ücretsiz Başla",
            ctaSecondary: "Fiyatlandırma",
            footerVerify: "Sertifika Doğrula",
            footerContact: "İletişim",
            footerPrivacy: "Gizlilik",
            footerTerms: "Koşullar",
            subsidiary: "Heptapus Group ürünü",
          }
        : {
            eyebrow: "Event, certificate & community management",
            heroLine1: "Everything",
            heroLine2: "event teams",
            heroLine3: "actually need.",
            heroDesc: "From registration forms to QR check-in, verifiable credentials to email campaigns — one platform, no extra chaos.",
            primaryBtn: "Start Free",
            secondaryBtn: "Explore Events",
            statsUsers: "Active Members",
            statsEvents: "Hosted Events",
            statsCerts: "Issued Certificates",
            featLabel: "Platform features",
            featTitle: "One tool, the full event workflow",
            featDesc: "Stop juggling separate tools, copy-paste routines, and spreadsheet labyrinths.",
            features: [
              { title: "Registration & Forms", desc: "Custom registration forms, approvals, document uploads and attendee lists." },
              { title: "QR Check-in & Sessions", desc: "Session-level QR attendance, live ops screen, and gate control." },
              { title: "Verifiable Certificates", desc: "Participants share credentials; anyone can verify authenticity instantly." },
              { title: "Email Campaigns", desc: "Bulk email, templates, automations, and open-rate tracking." },
              { title: "Community & Discovery", desc: "Event pages, community feed, and organization profiles." },
              { title: "Analytics & Reporting", desc: "Attendance rates, certificate health, and per-event statistics." },
            ],
            forLabel: "Who is it for?",
            forTitle: "For organizers of every scale",
            audiences: [
              { icon: "🎓", title: "University Clubs", desc: "Event registration, attendance, and certificates in one flow." },
              { icon: "🏢", title: "Corporate Teams", desc: "Multi-session events, ticketing, and CRM." },
              { icon: "🌐", title: "Online Events", desc: "Digital certificates and survey flows." },
              { icon: "🎪", title: "Large Organizations", desc: "Bulk certificates, API integration, and white-label." },
            ],
            ctaTitle: "Launch your next event today",
            ctaDesc: "Set up in minutes. Free to start.",
            ctaPrimary: "Start Free",
            ctaSecondary: "Pricing",
            footerVerify: "Verify Certificate",
            footerContact: "Contact",
            footerPrivacy: "Privacy",
            footerTerms: "Terms",
            subsidiary: "A Heptapus Group product",
          },
    [lang],
  );

  // ── White-label ──────────────────────────────────────────────────
  if (isWhiteLabel) {
    const bio = orgDetail?.bio || branding?.settings?.public_bio || (lang === "tr" ? "Etkinlikler, kayıtlar ve doğrulanabilir sertifikalar." : "Events, registrations and verifiable certificates.");
    const events = orgDetail?.events || [];
    const websiteUrl = orgDetail?.website_url || branding?.settings?.public_website_url || "";

    return (
      <div className="flex min-h-screen flex-col bg-surface-50 text-surface-900">
        <section className="border-b border-surface-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-20">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-12">
              <div className="flex-1">
                <div className="mb-6 flex items-center gap-4">
                  {branding?.brand_logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={branding.brand_logo} alt={brandName} className="h-12 w-auto object-contain" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-900 text-lg font-bold text-white">
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
                  <Link href="/verify" className="btn-primary">
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
            </div>
          </div>
        </section>

        {events.length > 0 && (
          <section className="flex-1 py-12">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
              <h2 className="mb-6 text-xl font-semibold text-surface-900">
                {lang === "tr" ? "Etkinlikler" : "Events"}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.slice(0, 6).map((event) => (
                  <Link key={event.public_id || event.id} href={`/events/${event.public_id || event.id}`} className="card-hover p-5">
                    <CalendarDays className="h-4 w-4 text-surface-400" />
                    <h3 className="mt-3 text-sm font-semibold text-surface-900">{event.name}</h3>
                    <p className="mt-1.5 text-xs text-surface-500">
                      {event.event_date ? new Date(event.event_date).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US") : (lang === "tr" ? "Tarih yakında" : "Date TBA")}
                    </p>
                    {event.event_location && <p className="mt-0.5 text-xs text-surface-400">{event.event_location}</p>}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <PublicFooter lang={lang} isWhiteLabel brandName={brandName} branding={branding} />
      </div>
    );
  }

  const statItems = [
    { label: copy.statsUsers,  value: stats?.active_members ?? "—" },
    { label: copy.statsEvents, value: stats?.hosted_events   ?? "—" },
    { label: copy.statsCerts,  value: stats?.issued_certificates ?? stats?.certs_issued ?? "—" },
  ];

  const featureIcons = [Users, QrCode, CheckCircle2, Mail, Layers, BarChart3];

  return (
    <div className="flex min-h-screen flex-col bg-surface-50 text-surface-900">
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <ParallaxHero>
        <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 lg:py-36">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-8 flex justify-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/60 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-white/40" />
              {copy.eyebrow}
            </span>
          </motion.div>

          {/* Headline — 3 animated lines */}
          <div className="overflow-hidden">
            {[copy.heroLine1, copy.heroLine2, copy.heroLine3].map((line, i) => (
              <motion.div
                key={i}
                initial={{ y: "110%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.2 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="block"
              >
                <span
                  className="block text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-[5rem]"
                  style={{ lineHeight: 1.08 }}
                >
                  {i === 2 ? (
                    <span className="bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
                      {line}
                    </span>
                  ) : (
                    line
                  )}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-white/50 sm:text-lg"
          >
            {copy.heroDesc}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/register?mode=organizer"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-surface-900 transition-opacity hover:opacity-90"
            >
              {copy.primaryBtn}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {showPlatformLinks && (
              <Link
                href="/events"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
              >
                {copy.secondaryBtn}
              </Link>
            )}
          </motion.div>
        </div>
      </ParallaxHero>

      {/* ── STATS ────────────────────────────────────────────────────── */}
      {showPlatformLinks && (
        <section className="border-b border-surface-200 bg-white">
          <div className="mx-auto grid max-w-4xl grid-cols-3 divide-x divide-surface-100 px-4 sm:px-6">
            {statItems.map((item, i) => (
              <Reveal key={item.label} delay={i * 0.08}>
                <div className="py-10 text-center">
                  <p className="text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
                    {item.value}
                  </p>
                  <p className="mt-1.5 text-sm text-surface-400">{item.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal>
            <div className="mb-12 text-center">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                {copy.featLabel}
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-surface-900 sm:text-3xl lg:text-4xl">
                {copy.featTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-surface-500">{copy.featDesc}</p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {copy.features.map((feat, i) => {
              const Icon = featureIcons[i];
              return (
                <FeatureCard
                  key={feat.title}
                  icon={Icon}
                  title={feat.title}
                  desc={feat.desc}
                  delay={i * 0.07}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FOR WHOM ─────────────────────────────────────────────────── */}
      <section className="border-t border-surface-200 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal>
            <div className="mb-12 text-center">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                {copy.forLabel}
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-surface-900 sm:text-3xl">
                {copy.forTitle}
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {copy.audiences.map((audience, i) => (
              <Reveal key={audience.title} delay={i * 0.08}>
                <div className="rounded-2xl border border-surface-100 bg-surface-50 p-6">
                  <span className="text-3xl">{audience.icon}</span>
                  <h3 className="mt-4 text-sm font-semibold text-surface-900">{audience.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-surface-500">{audience.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      {showPlatformLinks && (
        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl bg-surface-900 px-8 py-16 text-center sm:px-16">
                {/* Background decoration */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `radial-gradient(circle at 20% 50%, rgba(99,102,241,0.8) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(16,185,129,0.6) 0%, transparent 50%)`,
                  }}
                />
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
                    {copy.ctaTitle}
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-base text-white/50">{copy.ctaDesc}</p>
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href="/register?mode=organizer"
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-surface-900 transition-opacity hover:opacity-90"
                    >
                      {copy.ctaPrimary}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {copy.ctaSecondary}
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <PublicFooter lang={lang} isWhiteLabel={isWhiteLabel} brandName={brandName} branding={branding} showSubsidiary />
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────
function PublicFooter({
  lang,
  isWhiteLabel,
  brandName,
  branding,
  showSubsidiary = false,
}: {
  lang: string;
  isWhiteLabel: boolean;
  brandName: string;
  branding: Branding | null;
  showSubsidiary?: boolean;
}) {
  const footerCopy = lang === "tr"
    ? { verify: "Sertifika Doğrula", contact: "İletişim", privacy: "Gizlilik", terms: "Koşullar", pricing: "Fiyatlandırma", subsidiary: "Heptapus Group ürünü" }
    : { verify: "Verify Certificate", contact: "Contact", privacy: "Privacy", terms: "Terms", pricing: "Pricing", subsidiary: "A Heptapus Group product" };

  return (
    <footer className="mt-auto border-t border-surface-200 bg-white py-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
          {/* Logo + year */}
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

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-sm text-surface-500">
            <Link href="/verify" className="transition-colors hover:text-surface-900">{footerCopy.verify}</Link>
            <Link href="/iletisim" className="transition-colors hover:text-surface-900">{footerCopy.contact}</Link>
            <Link href="/kullanim-kosullari" className="transition-colors hover:text-surface-900">{footerCopy.terms}</Link>
            <Link href="/gizlilik" className="transition-colors hover:text-surface-900">{footerCopy.privacy}</Link>
            {!isWhiteLabel && (
              <Link href="/pricing" className="transition-colors hover:text-surface-900">{footerCopy.pricing}</Link>
            )}
          </div>
        </div>

        {/* Heptapus Group subsidiary badge */}
        {showSubsidiary && (
          <div className="mt-6 flex items-center justify-center sm:justify-end">
            <a
              href="https://heptapusgroup.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2.5 rounded-full border border-surface-200 bg-surface-900 px-4 py-2 transition-opacity hover:opacity-80"
              title="Heptapus Group"
            >
              <span className="text-[11px] font-medium text-white/50">{footerCopy.subsidiary}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://heptapusgroup.com/icons/heptapus_logo_white.png"
                alt="Heptapus Group"
                className="h-4 w-auto object-contain"
              />
            </a>
          </div>
        )}
      </div>
    </footer>
  );
}