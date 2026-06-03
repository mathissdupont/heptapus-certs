"use client";

import {
  ArrowRight, CalendarDays, CheckCircle2, ExternalLink,
  QrCode, Users, Mail, BarChart3, Layers,
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
import { isWhiteLabelBranding, type PublicBranding } from "@/lib/whiteLabel";

// ── Types ─────────────────────────────────────────────────────────────
type Branding = PublicBranding & {
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

// ── Premium Light Minimalist Hero ───────────────────────────────────────
function ParallaxHero({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0.5);
  const rawY = useMotionValue(0.5);
  const smoothX = useSpring(rawX, { stiffness: 40, damping: 30 });
  const smoothY = useSpring(rawY, { stiffness: 40, damping: 30 });

  const { scrollY } = useScroll();
  const contentY = useTransform(scrollY, [0, 800], [0, -80]);
  const contentOpacity = useTransform(scrollY, [0, 600], [1, 0]);

  const hep1X = useTransform(smoothX, [0, 1], [-30, 30]);
  const hep1Y = useTransform(smoothY, [0, 1], [-20, 20]);

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

  // 7-sided polygon path for branding consistency
  const heptagonPath = "polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%)";

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-[100svh] overflow-hidden bg-[#fafafa] selection:bg-slate-200 selection:text-slate-900"
    >
      {/* Absolute light noise texture */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />

      {/* Subtle geometric grid */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.4]"
        style={{
          backgroundImage: `linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 10%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 10%, transparent 80%)",
        }}
      />

      {/* Rotating Heptagonal ambient light (Light mode subtle accent) */}
      <motion.div
        style={{ x: hep1X, y: hep1Y }}
        animate={{ rotate: 360 }}
        transition={{ duration: 160, repeat: Infinity, ease: "linear" }}
        className="pointer-events-none absolute left-[15%] top-[10%] z-0 h-[600px] w-[600px] opacity-[0.04] blur-3xl"
      >
        <div 
          className="h-full w-full bg-slate-900" 
          style={{ clipPath: heptagonPath }} 
        />
      </motion.div>

      {/* Architectural bottom glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-full -translate-x-1/2 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,1)_0%,transparent_80%)] z-0" />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 flex min-h-[100svh] items-center pt-20 pb-12"
      >
        {children}
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
      initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-[440px] perspective-1000"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-3xl border border-slate-200/80 bg-white/60 p-4 shadow-[0_20px_80px_-20px_rgba(15,23,42,0.08)] backdrop-blur-2xl"
      >
        <div className="rounded-[1.25rem] border border-slate-100 bg-white/90 p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="h-2 w-16 rounded-full bg-slate-200" />
              <div className="mt-2.5 h-1.5 w-24 rounded-full bg-slate-100" />
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium tracking-wide text-slate-600">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              </span>
              Live
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {["148", "92%", "320"].map((value, i) => (
              <motion.div
                key={value}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <p className="text-lg font-semibold tracking-tight text-slate-900">{value}</p>
                <div className="mt-2.5 h-1 rounded-full bg-slate-200">
                  <div className="h-1 rounded-full bg-slate-400" style={{ width: `${55 + i * 14}%` }} />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 space-y-2.5">
            {rows.map((row, i) => (
              <motion.div
                key={row}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-3 shadow-sm"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-medium text-slate-600">{row}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Abstract geometric accents instead of soft floating cards */}
      <motion.div
        animate={{ y: [0, 8, 0], rotate: [0, -2, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-6 -left-6 hidden rounded-xl border border-slate-200 bg-white/90 px-4 py-3 shadow-xl backdrop-blur-xl sm:block"
      >
        <div className="flex items-center gap-3">
          <QrCode className="h-4 w-4 text-slate-600" />
          <div>
            <p className="text-xs font-semibold tracking-tight text-slate-900">QR Check-in</p>
            <p className="mt-0.5 text-[10px] text-slate-500">{lang === "tr" ? "Oturum bazlı" : "Session-based"}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Smooth Reveal Wrapper ─────────────────────────────────────────────
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
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
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
      <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
        <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors group-hover:bg-slate-100 group-hover:text-slate-900">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
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
            featDesc: "Ayrı araçlara, kopyala-yapıştıra ve Excel labirentine son verin.",
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
            ctaPrimary: "Hemen Başla",
            ctaSecondary: "Fiyatlandırma",
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
          },
    [lang],
  );

  // ── White-label ──────────────────────────────────────────────────
  if (isWhiteLabel) {
    const bio = orgDetail?.bio || branding?.settings?.public_bio || (lang === "tr" ? "Etkinlikler, kayıtlar ve doğrulanabilir sertifikalar." : "Events, registrations and verifiable certificates.");
    const events = orgDetail?.events || [];
    const websiteUrl = orgDetail?.website_url || branding?.settings?.public_website_url || "";

    return (
      <div className="flex min-h-screen flex-col bg-[#fafafa] text-slate-900">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:py-20">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-12">
              <div className="flex-1">
                <div className="mb-6 flex items-center gap-4">
                  {branding?.brand_logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={branding.brand_logo} alt={brandName} className="h-12 w-auto object-contain" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-lg font-bold text-slate-900 shadow-sm">
                      {brandName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      {lang === "tr" ? "Kurumsal etkinlik alanı" : "Organization workspace"}
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{brandName}</h1>
                  </div>
                </div>
                <p className="max-w-xl text-sm leading-relaxed text-slate-600">{bio}</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/verify" className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800">
                    <QrCode className="h-4 w-4" />
                    {lang === "tr" ? "Sertifika Doğrula" : "Verify Certificate"}
                  </Link>
                  {orgDetail?.public_id && (
                    <Link href={`/organizations/${orgDetail.public_id}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900">
                      <Users className="h-4 w-4" />
                      {lang === "tr" ? "Kurum Sayfası" : "Organization Page"}
                    </Link>
                  )}
                  {websiteUrl && (
                    <a href={websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900">
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
          <section className="flex-1 py-16">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
              <h2 className="mb-6 text-lg font-semibold tracking-tight text-slate-900">
                {lang === "tr" ? "Etkinlikler" : "Events"}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.slice(0, 6).map((event) => (
                  <Link key={event.public_id || event.id} href={`/events/${event.public_id || event.id}`} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
                    <CalendarDays className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-600" />
                    <h3 className="mt-4 text-sm font-semibold tracking-tight text-slate-900">{event.name}</h3>
                    <p className="mt-1.5 text-xs text-slate-500">
                      {event.event_date ? new Date(event.event_date).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US") : (lang === "tr" ? "Tarih yakında" : "Date TBA")}
                    </p>
                    {event.event_location && <p className="mt-1 text-xs text-slate-400">{event.event_location}</p>}
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
    { label: copy.statsEvents, value: stats?.hosted_events  ?? "—" },
    { label: copy.statsCerts,  value: stats?.issued_certificates ?? stats?.certs_issued ?? "—" },
  ];

  const featureIcons = [Users, QrCode, CheckCircle2, Mail, Layers, BarChart3];

  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa] text-slate-900">
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <ParallaxHero>
        <div className="mx-auto grid w-full max-w-6xl items-center gap-16 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mb-8 flex justify-center lg:justify-start"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-600 shadow-sm backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                {copy.eyebrow}
              </span>
            </motion.div>

            <div className="overflow-hidden">
              {[copy.heroLine1, copy.heroLine2, copy.heroLine3].map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="block"
                >
                  <span
                    className="block text-5xl font-bold tracking-[-0.04em] text-slate-900 sm:text-6xl lg:text-7xl"
                    style={{ lineHeight: 1.1 }}
                  >
                    {i === 2 ? (
                      <span className="text-slate-500">
                        {line}
                      </span>
                    ) : (
                      line
                    )}
                  </span>
                </motion.div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mx-auto mt-8 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-base lg:mx-0"
            >
              {copy.heroDesc}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
            >
              <Link
                href="/register?mode=organizer"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02] hover:bg-slate-800 active:scale-[0.98]"
              >
                {copy.primaryBtn}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {showPlatformLinks && (
                <Link
                  href="/events"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
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
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-5xl grid-cols-3 divide-x divide-slate-100 px-4 sm:px-6">
            {statItems.map((item, i) => (
              <Reveal key={item.label} delay={i * 0.1}>
                <div className="py-12 text-center">
                  <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    {item.value}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-widest text-slate-500">{item.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="bg-[#fafafa] py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal>
            <div className="mb-16 text-center">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {copy.featLabel}
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {copy.featTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm text-slate-600">{copy.featDesc}</p>
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
                  delay={i * 0.05}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      {showPlatformLinks && (
        <section className="border-t border-slate-200 bg-white px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 px-8 py-20 text-center shadow-sm sm:px-16">
                {/* Clean geometric overlay */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.4]"
                  style={{
                    backgroundImage: `linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)`,
                    backgroundSize: "48px 48px",
                    maskImage: "radial-gradient(ellipse at center, black, transparent 70%)",
                  }}
                />
                <div className="relative z-10">
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    {copy.ctaTitle}
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-sm text-slate-600">{copy.ctaDesc}</p>
                  <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                    <Link
                      href="/register?mode=organizer"
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform hover:scale-[1.02] hover:bg-slate-800 active:scale-[0.98]"
                    >
                      {copy.ctaPrimary}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
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
    <footer className="mt-auto border-t border-slate-200 bg-white py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            {branding?.brand_logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.brand_logo} alt={branding.org_name || "Logo"} className="h-6 w-auto" />
            ) : isWhiteLabel ? (
              <span className="text-sm font-semibold text-slate-900">{brandName}</span>
            ) : (
              <Image src="/logo.svg" alt="HeptaCert" width={120} height={32} className="h-6 w-auto" />
            )}
            <span className="text-xs text-slate-400">© {new Date().getFullYear()}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
            <Link href="/verify" className="transition-colors hover:text-slate-900">{footerCopy.verify}</Link>
            <Link href="/iletisim" className="transition-colors hover:text-slate-900">{footerCopy.contact}</Link>
            <Link href="/kullanim-kosullari" className="transition-colors hover:text-slate-900">{footerCopy.terms}</Link>
            <Link href="/gizlilik" className="transition-colors hover:text-slate-900">{footerCopy.privacy}</Link>
            {!isWhiteLabel && (
              <Link href="/pricing" className="transition-colors hover:text-slate-900">{footerCopy.pricing}</Link>
            )}
          </div>
        </div>

        {showSubsidiary && (
          <div className="mt-10 flex items-center justify-center sm:justify-end">
            <a
              href="https://heptapusgroup.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 transition-colors hover:bg-slate-100"
              title="Heptapus Group"
            >
              <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">{footerCopy.subsidiary}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://heptapusgroup.com/icons/heptapus_logo_white.png"
                alt="Heptapus Group"
                className="h-3.5 w-auto object-contain"
              />
            </a>
          </div>
        )}
      </div>
    </footer>
  );
}