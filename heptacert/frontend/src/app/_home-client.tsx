"use client";

import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CalendarCheck2, CheckCircle2, ExternalLink, FileCheck, Github, Instagram, Layers3, Linkedin, Lock, MailCheck, QrCode, ShieldCheck, Sparkles, Twitter, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";

type Branding = { org_name?: string; brand_logo?: string | null; brand_color?: string | null; settings?: { hide_heptacert_home?: boolean } };
type StatsData = { active_orgs: string; certs_issued: string; uptime_pct: string; availability: string };
type Feature = { icon: LucideIcon; title: string; desc: string; tone: string };

const HOSTS = new Set(["heptacert.com", "www.heptacert.com", "cert.heptapusgroup.com", "localhost", "127.0.0.1"]);
const reveal = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

export default function LandingPage() {
  const { lang } = useI18n();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [host, setHost] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setHost(window.location.hostname);
    fetch("/api/branding", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setBranding(data);
        if (data.brand_color) document.documentElement.style.setProperty("--site-brand-color", data.brand_color);
      })
      .catch(() => { });
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setStats(data))
      .catch(() => { });
  }, []);

  const brandName = branding?.org_name || "HeptaCert";
  const brandColor = branding?.brand_color || "#0f172a"; // Default koyu lacivert, daha kurumsal
  const isWhiteLabel = useMemo(() => !!branding?.org_name && (branding?.settings?.hide_heptacert_home || (host ? !HOSTS.has(host) : false)), [branding, host]);
  const showStats = !isWhiteLabel;
  const showPricing = !isWhiteLabel;
  const showStart = !isWhiteLabel;
  const showECommerceLinks = !isWhiteLabel;

  const copy = useMemo(() => lang === "tr" ? {
    badge: isWhiteLabel ? "Kurumsal Sertifika Altyapısı" : "Modern Sertifika Operasyonu",
    title: isWhiteLabel ? `${brandName} İçin Kayıt ve Sertifika Deneyimi` : "Kayıt, Doğrulama ve Sertifika Akışını Tek Panelde Toplayın",
    body: isWhiteLabel ? `${brandName} operasyonları için katılımcı kaydı, e-posta doğrulama, check-in ve sertifika sürecini sadeleştirin.` : "Katılımcı kaydı, e-posta doğrulama, check-in, sertifika üretimi ve doğrulama adımlarını parçalanmış araçlar yerine tek bir profesyonel operasyonda yönetin.",
    primary: showStart ? "Ücretsiz Başla" : "Doğrulama Sayfası",
    secondary: showPricing ? "Planları İncele" : "Sertifika Doğrula",
    trust: ["Otomatik E-posta Doğrulama", "Dinamik QR & UUID Kontrolü", "Kusursuz Mobil Deneyim"],
    statsTitle: "Canlı Operasyon Durumu",
    featuresTitle: isWhiteLabel ? `${brandName} İçin Kritik Araçlar` : "Operasyon Ekipleri İçin Tek Merkez",
    featuresBody: "Farklı platformlar arasında kaybolmayın. Kayıt, check-in, sertifika ve doğrulama süreçleri artık aynı dili konuşuyor.",
    stepsTitle: "Kayıttan Doğrulamaya Kesintisiz Akış",
    steps: [
      { id: "01", title: "Kayıt Topla", desc: "Katılımcılar temiz bir arayüzle formu doldurur, e-posta doğrulamasından geçerek sistemde aktifleşir." },
      { id: "02", title: "Katılımı İzle", desc: "Etkinlik anında check-in ve oturum takibi yaparak sertifika hak edişlerini gerçek zamanlı görüntüleyin." },
      { id: "03", title: "Anında Doğrula", desc: "Üretilen sertifikaları UUID, benzersiz QR kodlar ve herkese açık doğrulama sayfalarıyla şeffaflaştırın." },
    ],
    ctaTitle: isWhiteLabel ? `${brandName} için daha güçlü bir deneyim kurun` : "Operasyonlarınıza Premium Bir His Katın",
    ctaBody: "Kullanıcıların güven duyduğu, ekibinizin hızlı çalıştığı ve mobilde de mükemmel hissettiren bir sertifika akışı kurun.",
    ctaPrimary: showStart ? "Hemen Hesap Oluştur" : "Doğrulamaya Git",
    ctaSecondary: showPricing ? "Fiyatlandırma Detayları" : "Bizimle İletişime Geçin",
    legal: { kvkk: "KVKK", privacy: "Gizlilik", refund: "İade ve İptal", distance: "Mesafeli Satış", contact: "İletişim", verify: "Sertifika Doğrula", login: "Sistem Girişi", pricing: "Fiyatlandırma", trust: "HeptaCert altyapısıyla uçtan uca güvence altındadır." },
  } : {
    // English translations remain mostly same, just casing tweaks for cleaner UI
    badge: isWhiteLabel ? "Enterprise Certificate Infrastructure" : "Modern Certificate Operations",
    title: isWhiteLabel ? `Registration & Verification for ${brandName}` : "Unify Registration, Verification, and Certificates",
    body: isWhiteLabel ? `Simplify registration, email verification, check-in, certificate generation, and validation for ${brandName}.` : "Manage attendee registration, email verification, check-in, certificate generation, and validation in one unified, professional operational flow.",
    primary: showStart ? "Start for Free" : "Open Verification",
    secondary: showPricing ? "View Pricing" : "Verify Certificate",
    trust: ["Automated Email Flow", "Dynamic QR & UUID", "Seamless Mobile Journey"],
    statsTitle: "Live Operations Snapshot",
    featuresTitle: isWhiteLabel ? `Core Tools for ${brandName}` : "One Workspace for Operations",
    featuresBody: "Stop jumping between tools. Combine registration, check-in, certificates, and email delivery into one cohesive product.",
    stepsTitle: "A Seamless Line from Registration to Trust",
    steps: [
      { id: "01", title: "Collect Registrations", desc: "Attendees register through a clean interface and activate their record via automated email verification." },
      { id: "02", title: "Track Participation", desc: "Monitor check-ins and session data in real-time to make certificate eligibility instantly visible." },
      { id: "03", title: "Validate Instantly", desc: "Make trust transparent using unique UUIDs, dynamic QR codes, and public verification pages." },
    ],
    ctaTitle: isWhiteLabel ? `Build a stronger flow for ${brandName}` : "Make Certificate Operations Feel Premium",
    ctaBody: "Create a workflow that feels entirely trustworthy to your users and exceptionally fast for your internal team.",
    ctaPrimary: showStart ? "Create Your Account" : "Go to Verification",
    ctaSecondary: showPricing ? "See Pricing" : "Contact Us",
    legal: { kvkk: "KVKK", privacy: "Privacy", refund: "Refund", distance: "Distance Sales", contact: "Contact", verify: "Verify Certificate", login: "System Login", pricing: "Pricing", trust: "Secured end-to-end by HeptaCert infrastructure." },
  }, [brandName, isWhiteLabel, lang, showPricing, showStart]);

  const features: Feature[] = lang === "tr" ? [
    { icon: QrCode, title: "Anlık Doğrulama", desc: "Sertifikaların orijinalliğini saniyeler içinde kanıtlayan gelişmiş QR ve UUID akışı.", tone: "text-slate-900" },
    { icon: Users, title: "Katılımcı Yönetimi", desc: "Kayıt, check-in ve sertifika durumlarını tek bir merkezi ekrandan zahmetsizce izleyin.", tone: "text-slate-900" },
    { icon: MailCheck, title: "Temiz Veri Havuzu", desc: "Zorunlu e-posta doğrulaması ile sahte kayıtları engelleyin, veritabanınızı temiz tutun.", tone: "text-slate-900" },
    { icon: BarChart3, title: "Detaylı Analitik", desc: "Etkinlik katılım oranlarını ve sertifika üretim istatistiklerini raporlayın.", tone: "text-slate-900" },
  ] : [
    { icon: QrCode, title: "Instant Validation", desc: "Advanced QR and UUID flows that prove certificate authenticity in seconds.", tone: "text-slate-900" },
    { icon: Users, title: "Attendee Management", desc: "Effortlessly track registration, check-ins, and certificate status from a central hub.", tone: "text-slate-900" },
    { icon: MailCheck, title: "Clean Data Pool", desc: "Prevent fake signups with mandatory email verification to keep your database clean.", tone: "text-slate-900" },
    { icon: BarChart3, title: "Detailed Analytics", desc: "Report on event attendance rates and certificate generation statistics.", tone: "text-slate-900" },
  ];

  const statCards = copy.legal && [
    { key: "active_orgs" as const, label: lang === "tr" ? "Aktif Kurum" : "Active Organizations" },
    { key: "certs_issued" as const, label: lang === "tr" ? "Üretilen Sertifika" : "Certificates Issued" },
    { key: "uptime_pct" as const, label: "Sistem Uptime" },
    { key: "availability" as const, label: lang === "tr" ? "Sistem Durumu" : "System Status" },
  ];

  return (
    <div className="flex flex-col gap-24 pb-24 pt-8 bg-slate-50 min-h-screen selection:bg-slate-200">

      {/* HERO SECTION */}
      <motion.section variants={stagger} initial="hidden" animate="show" className="mx-auto w-full max-w-7xl px-6 lg:px-8">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <motion.div variants={reveal} className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
            </div>
            <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl lg:leading-[1.1]">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
              {copy.body}
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href={showStart ? "/register" : "/verify"}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-8 text-sm font-semibold text-white transition-all hover:opacity-90 shadow-sm"
                style={{ backgroundColor: brandColor }}
              >
                {copy.primary} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={showPricing ? "/pricing" : "/verify"}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-semibold text-slate-700 border border-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900"
              >
                {copy.secondary}
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
              {copy.trust.map((item) => (
                <span key={item} className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-slate-400" />
                  {item}
                </span>
              ))}
            </div>
          </motion.div>

          {/* SADELEŞTİRİLMİŞ SAĞ PANEL (Dashboard Görünümü) */}
          <motion.div variants={reveal} className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{brandName} <span className="text-slate-400 font-normal">Panel</span></h2>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                  Live
                </div>
              </div>

              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-500">{lang === "tr" ? "Bekleyen Doğrulama" : "Pending Verifications"}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">24</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-500">{lang === "tr" ? "Üretilen Sertifika" : "Generated Certs"}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">148</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{lang === "tr" ? "Son Aktiviteler" : "Recent Activity"}</p>
                  <div className="space-y-3">
                    {[
                      { text: lang === "tr" ? "Yeni kayıt alındı" : "New registration received", time: "2 dk önce" },
                      { text: lang === "tr" ? "Sertifika başarıyla üretildi" : "Certificate successfully generated", time: "15 dk önce" },
                      { text: lang === "tr" ? "Toplu e-posta gönderimi tamamlandı" : "Bulk email delivery completed", time: "1 saat önce" }
                    ].map((log, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-300"></div>
                          {log.text}
                        </div>
                        <span className="text-xs text-slate-400">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* STATS SECTION */}
      {showStats && (
        <motion.section variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} className="mx-auto w-full max-w-7xl px-6 lg:px-8">
          <div className="border-y border-slate-200 py-10">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-slate-400 mb-8">{copy.statsTitle}</p>
            <div className="grid grid-cols-2 gap-8 lg:grid-cols-4 divide-x divide-slate-100">
              {statCards.map((item, i) => (
                <motion.div key={item.key} variants={reveal} className={`flex flex-col items-center justify-center ${i !== 0 ? 'pl-8' : ''}`}>
                  <div className="text-4xl font-extrabold text-slate-900">
                    {stats ? stats[item.key] : <span className="inline-block h-10 w-24 animate-pulse rounded bg-slate-200" />}
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-500">{item.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* FEATURES SECTION (Minimalist) */}
      <motion.section id="features" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="mx-auto w-full max-w-7xl px-6 lg:px-8 space-y-12 scroll-mt-24">
        <motion.div variants={reveal} className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{copy.featuresTitle}</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">{copy.featuresBody}</p>
        </motion.div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <motion.div key={feature.title} variants={reveal} className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-md">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-700 group-hover:bg-slate-100 transition-colors">
                <feature.icon className="h-6 w-6" style={{ color: brandColor }} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* STEPS SECTION */}
      <motion.section variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="mx-auto w-full max-w-7xl px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_400px] lg:items-start">
          <motion.div variants={reveal}>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{copy.stepsTitle}</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {copy.steps.map((step) => (
                <div key={step.id} className="relative">
                  <div className="mb-4 text-sm font-bold text-slate-400">{step.id}.</div>
                  <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={reveal} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-xl font-bold tracking-tight text-slate-900">{lang === "tr" ? "Neden Daha İyi?" : "Why It's Better"}</h3>
            <div className="mt-6 space-y-4">
              {[
                lang === "tr" ? "Katılımcı için sıfır kafa karışıklığı" : "Zero attendee confusion",
                lang === "tr" ? "Ekip için minimum operasyon yükü" : "Minimal operational load",
                lang === "tr" ? "Sorgulanabilir, şeffaf belge güveni" : "Transparent document trust",
              ].map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" style={{ color: brandColor }} />
                  <p className="text-sm font-medium text-slate-700">{point}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* CTA SECTION (Temiz & Premium Koyu Tema) */}
      <motion.section variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true }} className="mx-auto w-full max-w-7xl px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] bg-slate-900 px-8 py-16 text-center sm:px-16 sm:py-20 lg:py-24" style={{ backgroundColor: brandColor !== "#0f172a" ? brandColor : undefined }}>
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{copy.ctaTitle}</h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-300">{copy.ctaBody}</p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href={showStart ? "/register" : "/verify"} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-8 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50">
              {copy.ctaPrimary} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={showPricing ? "/pricing" : "/iletisim"} className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-700 bg-transparent px-8 text-sm font-bold text-white transition-colors hover:bg-slate-800">
              {copy.ctaSecondary}
            </Link>
          </div>
        </div>
      </motion.section>

      {/* FOOTER */}
      <footer className="mx-auto mt-12 w-full max-w-7xl px-6 lg:px-8 border-t border-slate-200 pt-12 pb-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            {branding?.brand_logo ? (
              <img src={branding.brand_logo} alt={branding.org_name || "Logo"} className="h-8 w-auto" />
            ) : isWhiteLabel ? (
              <span className="text-xl font-bold tracking-tight text-slate-900">{brandName}</span>
            ) : (
              <Image src="/logo.png" alt="HeptaCert" width={140} height={36} className="h-8 w-auto" />
            )}
            <span className="text-sm font-medium text-slate-400">© {new Date().getFullYear()}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-slate-500">
            <Link href="/verify" className="hover:text-slate-900 transition-colors">{copy.legal.verify}</Link>
            {showPricing && <Link href="/pricing" className="hover:text-slate-900 transition-colors">{copy.legal.pricing}</Link>}
            <Link href="/iletisim" className="hover:text-slate-900 transition-colors">{copy.legal.contact}</Link>
            <Link href="/kvkk" className="hover:text-slate-900 transition-colors">{copy.legal.kvkk}</Link>
            <Link href="/gizlilik" className="hover:text-slate-900 transition-colors">{copy.legal.privacy}</Link>
          </div>
        </div>

        {!isWhiteLabel && (
          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-8 sm:flex-row">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <ShieldCheck className="h-4 w-4" style={{ color: brandColor }} />
              {copy.legal.trust}
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              {[
                { href: "https://www.instagram.com/heptapusgroup", Icon: Instagram, label: "Instagram" },
                { href: "https://www.linkedin.com/company/heptapusgroup", Icon: Linkedin, label: "LinkedIn" },
                { href: "https://github.com/heptapusgroup", Icon: Github, label: "GitHub" },
                { href: "https://x.com/heptapusgroup", Icon: Twitter, label: "X" }
              ].map(({ href, Icon, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="transition-colors hover:text-slate-900">
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}