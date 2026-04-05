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
const reveal = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };

export default function LandingPage() {
  const { lang } = useI18n();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [host, setHost] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setHost(window.location.hostname);
    fetch("/api/branding", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).then((data) => {
      if (!data) return;
      setBranding(data);
      if (data.brand_color) document.documentElement.style.setProperty("--site-brand-color", data.brand_color);
    }).catch(() => {});
    fetch("/api/stats").then((r) => (r.ok ? r.json() : null)).then((data) => data && setStats(data)).catch(() => {});
  }, []);

  const brandName = branding?.org_name || "HeptaCert";
  const brandColor = branding?.brand_color || "#7c3aed";
  const isWhiteLabel = useMemo(() => !!branding?.org_name && (branding?.settings?.hide_heptacert_home || (host ? !HOSTS.has(host) : false)), [branding, host]);
  const showStats = !isWhiteLabel;
  const showPricing = !isWhiteLabel;
  const showStart = !isWhiteLabel;
  const showECommerceLinks = !isWhiteLabel;

  const copy = useMemo(() => lang === "tr" ? {
    badge: isWhiteLabel ? "Kurumsal sertifika altyapısı" : "Modern sertifika operasyonu",
    title: isWhiteLabel ? `${brandName} için kayıt, doğrulama ve sertifika deneyimi` : "Etkinlik kaydı, doğrulama ve sertifika akışını tek panelde toplayın",
    body: isWhiteLabel ? `${brandName} için kayıt, e-posta doğrulama, check-in, sertifika üretimi ve doğrulama sürecini sadeleştirin.` : "Katılımcı kaydı, e-posta doğrulama, check-in, sertifika üretimi ve doğrulama adımlarını tek operasyonda yönetin.",
    primary: showStart ? "Ücretsiz Başla" : "Doğrulama Sayfası",
    secondary: showPricing ? "Planları Gör" : "Sertifika Doğrula",
    trust: ["E-posta doğrulama", "QR ve UUID kontrolü", "Mobil uyumlu akış"],
    statsTitle: "Canlı operasyon görünümü",
    featuresTitle: isWhiteLabel ? `${brandName} için kritik araçlar` : "Operasyon ekipleri için tek merkez",
    featuresBody: "Kayıt, check-in, sertifika, e-posta ve doğrulama araçlarını tek deneyimde birleştirin.",
    stepsTitle: "Kayıttan doğrulamaya kadar tek çizgi",
    steps: [
      { id: "01", title: "Kayıt topla", desc: "Katılımcılar formu doldurur, doğrulama gerekiyorsa aktifleşmeden önce onay verir." },
      { id: "02", title: "Katılımı izle", desc: "Check-in ve oturum takibi sertifika uygunluğunu görünür hale getirir." },
      { id: "03", title: "Sertifikayı doğrula", desc: "UUID, QR ve doğrulama sayfasıyla güveni herkes için görünür kılın." },
    ],
    ctaTitle: isWhiteLabel ? `${brandName} için daha güçlü bir deneyim kurun` : "Sertifika operasyonunu premium hissettirin",
    ctaBody: "Kullanıcıların güven duyduğu, ekibin hızlı çalıştığı ve mobilde de iyi hissettiren bir akış kurun.",
    ctaPrimary: showStart ? "Hesap Oluştur" : "Doğrulamaya Git",
    ctaSecondary: showPricing ? "Fiyatlandırma" : "İletişim",
    legal: { kvkk: "KVKK", privacy: "Gizlilik", refund: "İade ve İptal", distance: "Mesafeli Satış", contact: "İletişim", verify: "Sertifika Doğrula", login: "Admin Girişi", pricing: "Fiyatlandırma", trust: "HeptaCert altyapısıyla güvence altındadır." },
  } : {
    badge: isWhiteLabel ? "Enterprise certificate infrastructure" : "Modern certificate operations",
    title: isWhiteLabel ? `Registration, verification, and certificates for ${brandName}` : "Bring registration, verification, and certificates into one control panel",
    body: isWhiteLabel ? `Simplify registration, email verification, check-in, certificate generation, and validation for ${brandName}.` : "Manage attendee registration, email verification, check-in, certificate generation, and validation in one operational flow.",
    primary: showStart ? "Start Free" : "Open Verification",
    secondary: showPricing ? "View Pricing" : "Verify Certificate",
    trust: ["Verified email flow", "QR and UUID checks", "Mobile-ready journey"],
    statsTitle: "Live operations snapshot",
    featuresTitle: isWhiteLabel ? `Core tools for ${brandName}` : "One workspace for operations teams",
    featuresBody: "Combine registration, check-in, certificates, email delivery, and verification in one product language.",
    stepsTitle: "One line from registration to validation",
    steps: [
      { id: "01", title: "Collect registration", desc: "Attendees register and activate their record through email verification when required." },
      { id: "02", title: "Track participation", desc: "Check-in and session data make certificate eligibility visible in real time." },
      { id: "03", title: "Validate instantly", desc: "Use UUID, QR, and public verification pages to make trust visible." },
    ],
    ctaTitle: isWhiteLabel ? `Build a stronger flow for ${brandName}` : "Make certificate operations feel premium",
    ctaBody: "Create a flow that feels trustworthy to users and fast for your internal team on both desktop and mobile.",
    ctaPrimary: showStart ? "Create Account" : "Go to Verification",
    ctaSecondary: showPricing ? "Pricing" : "Contact",
    legal: { kvkk: "KVKK", privacy: "Privacy", refund: "Refund", distance: "Distance Sales", contact: "Contact", verify: "Verify Certificate", login: "Admin Login", pricing: "Pricing", trust: "Protected by HeptaCert infrastructure." },
  }, [brandName, isWhiteLabel, lang, showPricing, showStart]);

  const features: Feature[] = lang === "tr" ? [
    { icon: QrCode, title: "QR ve UUID doğrulama", desc: "Belge güvenini anında görünür kılan net doğrulama akışı.", tone: "text-sky-600 bg-sky-50" },
    { icon: Users, title: "Katılımcı yönetimi", desc: "Kayıt, check-in ve sertifika uygunluğunu tek ekranda izleyin.", tone: "text-emerald-600 bg-emerald-50" },
    { icon: MailCheck, title: "Doğrulanmış kayıt", desc: "E-posta doğrulamasıyla kötü niyetli kayıtları azaltın.", tone: "text-violet-600 bg-violet-50" },
    { icon: BarChart3, title: "Operasyon analitiği", desc: "Katılım ve sertifika performansını daha karar verilebilir hale getirin.", tone: "text-rose-600 bg-rose-50" },
  ] : [
    { icon: QrCode, title: "QR and UUID validation", desc: "A clear validation flow that makes document trust visible instantly.", tone: "text-sky-600 bg-sky-50" },
    { icon: Users, title: "Attendee operations", desc: "Track registration, check-in, and certificate readiness in one place.", tone: "text-emerald-600 bg-emerald-50" },
    { icon: MailCheck, title: "Verified registrations", desc: "Reduce bad or fake signups with email verification before activation.", tone: "text-violet-600 bg-violet-50" },
    { icon: BarChart3, title: "Operational analytics", desc: "Turn attendance and certificate activity into clearer decisions.", tone: "text-rose-600 bg-rose-50" },
  ];

  const statCards = copy.legal && [
    { key: "active_orgs" as const, label: lang === "tr" ? "Aktif kurum" : "Active orgs" },
    { key: "certs_issued" as const, label: lang === "tr" ? "Sertifika" : "Certificates" },
    { key: "uptime_pct" as const, label: "Uptime" },
    { key: "availability" as const, label: lang === "tr" ? "Durum" : "Status" },
  ];

  return (
    <div className="flex flex-col gap-24 pb-20 pt-4">
      <motion.section variants={stagger} initial="hidden" animate="show" className="pt-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-center">
          <motion.div variants={reveal} className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-surface-200 bg-white/90 px-4 py-2 text-xs font-semibold text-surface-700 shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-brand-600" /> {copy.badge}
            </div>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl lg:leading-[1.02]">{copy.title}</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">{copy.body}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={showStart ? "/register" : "/verify"} className="btn-primary px-6 py-3 text-sm sm:text-base">{copy.primary}<ArrowRight className="h-4 w-4" /></Link>
              <Link href={showPricing ? "/pricing" : "/verify"} className="btn-secondary px-6 py-3 text-sm sm:text-base">{copy.secondary}</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {copy.trust.map((item) => <span key={item} className="inline-flex items-center gap-2 rounded-full border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-soft"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{item}</span>)}
            </div>
          </motion.div>

          <motion.div variants={reveal} className="relative">
            <div className="absolute inset-x-10 top-3 h-24 rounded-full blur-3xl" style={{ background: `${brandColor}28` }} />
            <div className="card relative overflow-hidden p-5 sm:p-6" style={{ background: `linear-gradient(135deg, ${brandColor}20 0%, rgba(255,255,255,0.95) 32%, rgba(255,255,255,0.98) 100%)`, boxShadow: `0 28px 80px ${brandColor}24` }}>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{lang === "tr" ? "Ürün görünümü" : "Product snapshot"}</p>
                    <h2 className="mt-2 text-xl font-black text-slate-950">{brandName}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{lang === "tr" ? "Kayıt, check-in, sertifika ve analitik aynı deneyim dilinde birleşir." : "Registration, check-in, certificates, and analytics work in one consistent experience."}</p>
                  </div>
                  <div className="rounded-2xl border border-white/80 bg-white/85 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-soft"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />{lang === "tr" ? "Güvenli" : "Secure"}</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-3xl border border-white/80 bg-white/88 p-4 shadow-soft">
                    <div className="flex items-center justify-between">
                      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{lang === "tr" ? "Operasyon" : "Operations"}</p><p className="mt-1 text-2xl font-black text-slate-950">24</p></div>
                      <div className="rounded-2xl bg-brand-50 p-3 text-brand-600"><Layers3 className="h-5 w-5" /></div>
                    </div>
                    <div className="mt-4 space-y-3">
                      {[{ icon: MailCheck, label: lang === "tr" ? "Doğrulanan kayıt" : "Verified records", value: "148" }, { icon: CalendarCheck2, label: lang === "tr" ? "Aktif check-in" : "Live check-in", value: "6" }, { icon: FileCheck, label: lang === "tr" ? "Hazır sertifika" : "Ready certificates", value: "92" }].map((item) => (
                        <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3"><div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><item.icon className="h-4 w-4 text-brand-600" />{item.label}</div><span className="text-sm font-black text-slate-950">{item.value}</span></div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-3xl border border-white/80 bg-slate-950 p-4 text-white shadow-soft">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{lang === "tr" ? "Canlı analitik" : "Live analytics"}</p>
                      <div className="mt-4 flex items-end gap-2">{[42, 68, 54, 88, 74, 96].map((h, i) => <div key={i} className="flex-1 rounded-full" style={{ height: `${h}px`, background: `linear-gradient(180deg, ${brandColor}, rgba(255,255,255,0.28))` }} />)}</div>
                    </div>
                    <div className="rounded-3xl border border-white/80 bg-white/88 p-4 shadow-soft backdrop-blur">
                      <div className="space-y-2">
                        <div className="rounded-2xl bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700">{lang === "tr" ? "Planlı e-posta" : "Scheduled email"}</div>
                        <div className="rounded-2xl bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-700">{lang === "tr" ? "Doğrulama bekliyor" : "Waiting for verification"}</div>
                        <div className="rounded-2xl bg-sky-50 px-3 py-3 text-sm font-semibold text-sky-700">{lang === "tr" ? "Sertifika doğrula" : "Verify certificate"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {showStats && (
        <motion.section variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} className="space-y-5">
          <motion.p variants={reveal} className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{copy.statsTitle}</motion.p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statCards.map((item) => <motion.div key={item.key} variants={reveal} className="card p-5"><div className="text-3xl font-black text-slate-950">{stats ? stats[item.key] : <span className="inline-block h-8 w-20 animate-pulse rounded-lg bg-slate-100" />}</div><p className="mt-2 text-sm font-medium text-slate-500">{item.label}</p></motion.div>)}
          </div>
        </motion.section>
      )}

      <motion.section id="features" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="space-y-10 scroll-mt-24">
        <motion.div variants={reveal} className="max-w-2xl"><h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{copy.featuresTitle}</h2><p className="mt-4 text-base leading-8 text-slate-500">{copy.featuresBody}</p></motion.div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{features.map((feature) => <motion.div key={feature.title} variants={reveal} className="card p-6"><div className={`inline-flex rounded-2xl p-3 ${feature.tone}`}><feature.icon className="h-5 w-5" /></div><h3 className="mt-5 text-lg font-bold text-slate-950">{feature.title}</h3><p className="mt-2 text-sm leading-7 text-slate-500">{feature.desc}</p></motion.div>)}</div>
      </motion.section>

      <motion.section variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <motion.div variants={reveal} className="card p-6 sm:p-8">
          <h2 className="text-3xl font-black tracking-tight text-slate-950">{copy.stepsTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">{copy.steps.map((step) => <div key={step.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black tracking-[0.16em] text-brand-600 shadow-soft">{step.id}</div><h3 className="mt-4 text-lg font-bold text-slate-950">{step.title}</h3><p className="mt-2 text-sm leading-7 text-slate-500">{step.desc}</p></div>)}</div>
        </motion.div>
        <motion.div variants={reveal} className="card p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{lang === "tr" ? "Neden daha iyi çalışır" : "Why it works better"}</p>
          <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{lang === "tr" ? "Daha net, daha hızlı, daha güvenli" : "Clearer, faster, safer"}</h3>
          <div className="mt-6 space-y-3">{[
            lang === "tr" ? "Kullanıcı için daha az kafa karışıklığı" : "Less confusion for attendees",
            lang === "tr" ? "Ekip için daha az manuel takip" : "Less manual follow-up for the team",
            lang === "tr" ? "Belge güveni için daha görünür doğrulama" : "More visible validation for document trust",
          ].map((point) => <div key={point} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><p className="text-sm font-medium leading-6 text-slate-700">{point}</p></div>)}</div>
        </motion.div>
      </motion.section>

      <motion.section variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true }} className="relative overflow-hidden rounded-[32px] px-6 py-12 text-white shadow-lifted sm:px-10 sm:py-14" style={{ background: `linear-gradient(135deg, ${brandColor} 0%, #0f172a 100%)` }}>
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_56%)]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/90"><Sparkles className="h-3.5 w-3.5" />{lang === "tr" ? "Hazırsanız başlayalım" : "Ready when you are"}</div><h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{copy.ctaTitle}</h2><p className="mt-4 max-w-xl text-sm leading-7 text-white/80 sm:text-base">{copy.ctaBody}</p></div>
          <div className="flex flex-col gap-3 sm:flex-row"><Link href={showStart ? "/register" : "/verify"} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-slate-100">{copy.ctaPrimary}<ArrowRight className="h-4 w-4" /></Link><Link href={showPricing ? "/pricing" : "/iletisim"} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/15">{copy.ctaSecondary}</Link></div>
        </div>
      </motion.section>

      <footer className="border-t border-slate-200 pt-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-400">
            <Link href="/kvkk" className="transition hover:text-brand-600">{copy.legal.kvkk}</Link>
            <Link href="/gizlilik" className="transition hover:text-brand-600">{copy.legal.privacy}</Link>
            {showPricing && <Link href="/iade" className="transition hover:text-brand-600">{copy.legal.refund}</Link>}
            {showECommerceLinks && <Link href="/mesafeli-satis" className="transition hover:text-brand-600">{copy.legal.distance}</Link>}
            <Link href="/iletisim" className="transition hover:text-brand-600">{copy.legal.contact}</Link>
          </div>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">{branding?.brand_logo ? <img src={branding.brand_logo} alt={branding.org_name || "Logo"} className="h-10 w-auto" /> : isWhiteLabel ? <span className="text-xl font-bold tracking-tight text-slate-950">{brandName}</span> : <Image src="/logo.png" alt="HeptaCert" width={168} height={44} className="h-10 w-auto" /> }<span className="text-sm text-slate-400">© {new Date().getFullYear()} {brandName}</span></div>
            <div className="flex flex-wrap items-center gap-5 text-sm font-medium text-slate-500"><Link href="/verify" className="transition hover:text-brand-600">{copy.legal.verify}</Link>{showPricing && <Link href="/pricing" className="transition hover:text-brand-600">{copy.legal.pricing}</Link>}{showPricing && <Link href="/admin/login" className="transition hover:text-slate-900">{copy.legal.login}</Link>}<Link href="/iletisim" className="transition hover:text-brand-600">{copy.legal.contact}</Link></div>
          </div>
          {!isWhiteLabel && <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-6 md:flex-row"><div className="flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-brand-600" />{copy.legal.trust}</div><div className="flex items-center gap-2 text-slate-400">{[{ href: "https://www.instagram.com/heptapusgroup", Icon: Instagram, label: "Instagram" }, { href: "https://www.linkedin.com/company/heptapusgroup", Icon: Linkedin, label: "LinkedIn" }, { href: "https://github.com/heptapusgroup", Icon: Github, label: "GitHub" }, { href: "https://x.com/heptapusgroup", Icon: Twitter, label: "X" }].map(({ href, Icon, label }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="rounded-lg p-2 transition hover:bg-slate-100 hover:text-slate-700"><Icon className="h-4 w-4" /></a>)}</div></div>}
        </div>
      </footer>
    </div>
  );
}
