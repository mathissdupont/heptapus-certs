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

// ── Light creative hero background ─────────────────────────────────────
function ParallaxHero({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0.5);
  const rawY = useMotionValue(0.5);
  const smoothX = useSpring(rawX, { stiffness: 55, damping: 22 });
  const smoothY = useSpring(rawY, { stiffness: 55, damping: 22 });

  const orb1X = useTransform(smoothX, [0, 1], [-28, 28]);
  const orb1Y = useTransform(smoothY, [0, 1], [-22, 22]);
  const orb2X = useTransform(smoothX, [0, 1], [24, -24]);
  const orb2Y = useTransform(smoothY, [0, 1], [18, -18]);
  const cardX = useTransform(smoothX, [0, 1], [-10, 10]);
  const cardY = useTransform(smoothY, [0, 1], [-8, 8]);

  const { scrollY } = useScroll();
  const contentY = useTransform(scrollY, [0, 620], [0, -56]);
  const contentOpacity = useTransform(scrollY, [0, 520], [1, 0]);

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
      className="relative min-h-[100svh] overflow-hidden bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_58%,#EEF6FF_100%)]"
    >
      {/* Fine paper texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(15,23,42,0.05) 1px, transparent 0)`,
          backgroundSize: "22px 22px",
        }}
      />

      {/* Soft daylight orbs — no dark mode, no AI purple */}
      <motion.div
        style={{ x: orb1X, y: orb1Y }}
        className="pointer-events-none absolute -left-24 top-16 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.18)_0%,rgba(59,130,246,0.08)_38%,transparent_70%)]"
      />
      <motion.div
        style={{ x: orb2X, y: orb2Y }}
        className="pointer-events-none absolute -right-28 top-28 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.14)_0%,rgba(125,211,252,0.08)_42%,transparent_72%)]"
      />
      <div className="pointer-events-none absolute bottom-[-180px] left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(226,232,240,0.95)_0%,transparent_70%)]" />

      {/* Architectural lines */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px] opacity-[0.42]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(rgba(148,163,184,0.14) 1px, transparent 1px)",
          backgroundSize: "96px 96px",
          maskImage: "linear-gradient(to bottom, black, transparent)",
        }}
      />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 flex min-h-[100svh] items-center"
      >
        {children}
      </motion.div>

      <motion.div
        style={{ x: cardX, y: cardY }}
        className="pointer-events-none absolute right-[8%] top-[18%] hidden h-16 w-16 rounded-2xl border border-slate-200/80 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur md:block"
      />
      <motion.div
        style={{ x: orb2X, y: orb1Y }}
        className="pointer-events-none absolute left-[8%] bottom-[18%] hidden h-10 w-10 rounded-full border border-blue-100 bg-white/70 shadow-[0_18px_60px_rgba(59,130,246,0.12)] backdrop-blur md:block"
      />

      {/* Light scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-7 left-1/2 z-20 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="h-10 w-[1px] bg-gradient-to-b from-transparent via-slate-300 to-transparent"
        />
      </motion.div>
    </div>
  );
}

function HeroPreview({ lang }: { lang: string }) {
  const rows =
    lang === "tr"
      ? ["Kayıt formu yayınlandı", "QR check-in hazır", "Sertifikalar doğrulanabilir"]
      : ["Registration form published", "QR check-in ready", "Certificates verifiable"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.75, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-[440px]"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-[2rem] border border-slate-200 bg-white/85 p-4 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl"
      >
        <div className="rounded-[1.45rem] border border-slate-100 bg-slate-50/80 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="h-2.5 w-20 rounded-full bg-slate-200" />
              <div className="mt-2 h-2 w-32 rounded-full bg-slate-100" />
            </div>
            <div className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-700">
              Live
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {["148", "92%", "320"].map((value, i) => (
              <motion.div
                key={value}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.08 }}
                className="rounded-2xl border border-slate-100 bg-white p-3"
              >
                <p className="text-lg font-semibold text-slate-950">{value}</p>
                <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                  <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${55 + i * 14}%` }} />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            {rows.map((row, i) => (
              <motion.div
                key={row}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + i * 0.1 }}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2.5"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-slate-700">{row}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 12, 0], rotate: [0, -1.5, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-8 -left-8 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_18px_60px_rgba(15,23,42,0.10)] sm:block"
      >
        <div className="flex items-center gap-3">
          <QrCode className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-xs font-semibold text-slate-900">QR Check-in</p>
            <p className="text-[11px] text-slate-500">{lang === "tr" ? "Oturum bazlı" : "Session-based"}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, -12, 0], rotate: [0, 1.5, 0] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-7 -top-7 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_18px_60px_rgba(15,23,42,0.10)] sm:block"
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-xs font-semibold text-slate-900">{lang === "tr" ? "Doğrulandı" : "Verified"}</p>
            <p className="text-[11px] text-slate-500">heptacert.com/verify</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
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
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-surface-200 bg-white text-lg font-bold text-surface-900 shadow-sm">
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
        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div className="text-center lg:text-left">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mb-7 flex justify-center lg:justify-start"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
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
                  transition={{ duration: 0.72, delay: 0.18 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="block"
                >
                  <span
                    className="block text-5xl font-bold tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl xl:text-[5rem]"
                    style={{ lineHeight: 1.04 }}
                  >
                    {i === 2 ? (
                      <span className="bg-gradient-to-r from-slate-950 via-blue-700 to-slate-500 bg-clip-text text-transparent">
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
              transition={{ duration: 0.6, delay: 0.64 }}
              className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg lg:mx-0"
            >
              {copy.heroDesc}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.78 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
            >
              <Link
                href="/register?mode=organizer"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(37,99,235,0.22)] transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_18px_50px_rgba(37,99,235,0.28)]"
              >
                {copy.primaryBtn}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {showPlatformLinks && (
                <Link
                  href="/events"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-6 py-3 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:text-slate-950"
                >
                  {copy.secondaryBtn}
                </Link>
              )}
            </motion.div>
          </div>

          <HeroPreview lang={lang} />
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
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-8 py-16 text-center shadow-[0_28px_90px_rgba(15,23,42,0.08)] sm:px-16">
                {/* Light creative background decoration */}
                <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-100/70 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-sky-100/80 blur-3xl" />
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.32]"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(rgba(148,163,184,0.14) 1px, transparent 1px)",
                    backgroundSize: "72px 72px",
                    maskImage: "radial-gradient(circle at center, black, transparent 72%)",
                  }}
                />
                <div className="relative z-10">
                  <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
                    {copy.ctaTitle}
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-base text-slate-600">{copy.ctaDesc}</p>
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href="/register?mode=organizer"
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(37,99,235,0.22)] transition-all hover:-translate-y-0.5 hover:bg-blue-700"
                    >
                      {copy.ctaPrimary}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950"
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
              className="inline-flex items-center gap-2.5 rounded-full border border-surface-200 bg-white px-4 py-2 shadow-sm transition-colors hover:border-surface-300"
              title="Heptapus Group"
            >
              <span className="text-[11px] font-medium text-surface-500">{footerCopy.subsidiary}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://heptapusgroup.com/icons/heptapus_logo.png"
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