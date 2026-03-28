"use client";

import { motion } from "framer-motion";
import {
  Zap,
  ArrowRight,
  Search,
  FileCheck,
  QrCode,
  Users,
  BarChart3,
  Lock,
  ExternalLink,
  Instagram,
  Linkedin,
  Github,
  Twitter,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { API_BASE } from "@/lib/api";

type Branding = {
  org_name?: string;
  brand_logo?: string | null;
  brand_color?: string | null;
  settings?: {
    hide_heptacert_home?: boolean;
  };
};


type StatsData = {
  active_orgs: string;
  certs_issued: string;
  uptime_pct: string;
  availability: string;
};

// branding state is managed inside the component (client hooks must be inside)

const in_view = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};



export default function LandingPage() {
  const t = useT();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);

  useEffect(() => {
    fetch("/api/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setBranding(data);
        if (data.brand_color) {
          document.documentElement.style.setProperty("--site-brand-color", data.brand_color);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/stats`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setStats(d))
      .catch((e) => {
        console.error("Failed to load stats:", e);
      });
  }, []);

  const features = [
    { icon: QrCode,    titleKey: "feat_qr_title",       descKey: "feat_qr_desc",       color: "brand-text brand-bg-50" },
    { icon: FileCheck, titleKey: "feat_excel_title",     descKey: "feat_excel_desc",    color: "text-emerald-600 bg-emerald-50" },
    { icon: Search,    titleKey: "feat_records_title",   descKey: "feat_records_desc",  color: "text-violet-600 bg-violet-50" },
    { icon: Users,     titleKey: "feat_events_title",    descKey: "feat_events_desc",   color: "text-amber-600 bg-amber-50" },
    { icon: Lock,      titleKey: "feat_security_title",  descKey: "feat_security_desc", color: "text-rose-600 bg-rose-50" },
    { icon: BarChart3, titleKey: "feat_hc_title",        descKey: "feat_hc_desc",       color: "text-sky-600 bg-sky-50" },
  ] as const;

  const statCards = [
    { key: "active_orgs",  labelKey: "stats_orgs" },
    { key: "certs_issued", labelKey: "stats_certs" },
    { key: "uptime_pct",   labelKey: "stats_uptime" },
    { key: "availability", labelKey: "stats_availability" },
  ] as const;

  const steps = [
    { step: "1", titleKey: "step1_title", descKey: "step1_desc" },
    { step: "2", titleKey: "step2_title", descKey: "step2_desc" },
    { step: "3", titleKey: "step3_title", descKey: "step3_desc" },
  ] as const;

  return (
    <div className="flex flex-col gap-28 pb-20 pt-4">

      {/* ── HERO ── */}
      <motion.section variants={stagger} initial="hidden" animate="show" className="text-center pt-10">

        <motion.h1 variants={in_view} className="mx-auto max-w-3xl text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl leading-tight">
          {t("home_hero_title_1").replace("HeptaCert", branding?.org_name || "HeptaCert")}{" "}
          <span className="brand-gradient-text">{t("home_hero_title_2")}</span>{" "}
          {t("home_hero_title_3")}
        </motion.h1>

        <motion.p variants={in_view} className="mx-auto mt-6 max-w-xl text-lg text-gray-600 leading-relaxed">
          {t("home_hero_subtitle")}
        </motion.p>

        <motion.div variants={in_view} className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/register" className="btn-primary text-base px-7 py-3.5 group">
            {t("home_cta_register")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/verify" className="btn-secondary text-base px-7 py-3.5">
            {t("home_cta_verify")}
          </Link>
        </motion.div>

        <motion.div variants={in_view} className="mt-6 text-sm text-gray-400">
          {t("home_hero_sub")}
        </motion.div>
      </motion.section>

      {/* ── STATS ── */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {statCards.map((s) => (
          <motion.div key={s.key} variants={in_view} className="card p-6 text-center">
            <div className="text-3xl font-extrabold text-gray-900">
              {stats ? stats[s.key] : <span className="inline-block h-8 w-20 animate-pulse rounded-lg bg-gray-100" />}
            </div>
            <div className="mt-1 text-sm text-gray-500">{t(s.labelKey)}</div>
          </motion.div>
        ))}
      </motion.section>

      {/* ── FEATURES ── */}
      <section id="features" className="scroll-mt-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-bold text-gray-900">{t("home_features_title")}</h2>
          <p className="mt-3 text-gray-500 max-w-xl mx-auto">{t("home_features_sub")}</p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((f) => (
            <motion.div key={f.titleKey} variants={in_view} className="card p-6 group hover:shadow-lifted transition-shadow">
              <div className={`inline-flex items-center justify-center rounded-xl p-3 ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">{t(f.titleKey)}</h3>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{t(f.descKey)}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl border border-gray-100 bg-white p-10 md:p-14 shadow-card"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">{t("home_how_title")}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((item) => (
            <div key={item.step} className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full text-white font-bold text-lg shadow-brand mb-4" style={{ backgroundColor: 'var(--site-brand-color)' }}>
                {item.step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t(item.titleKey)}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{t(item.descKey)}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── CTA ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl p-12 text-center text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--site-brand-color), rgba(124,58,237,0.85))' }}
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,#fff_0%,transparent_60%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold mb-6">
            <Zap className="h-4 w-4" /> {t("home_cta_section_badge")}
          </div>
          <h2 className="text-3xl font-bold mb-4">{t("home_cta_section_title")}</h2>
          <p className="max-w-md mx-auto mb-8 text-base" style={{ color: 'rgba(255,255,255,0.95)' }}>{t("home_cta_section_sub")}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold shadow-lifted transition-colors" style={{ color: 'var(--site-brand-color)' }}>
              {t("home_cta_section_btn1")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors">
              {t("home_cta_section_btn2")}
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ── HEPTAPUS GROUP ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="rounded-3xl border border-gray-100 bg-white p-10 shadow-card"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 p-1.5 shadow-lg">
                <img src="https://heptapusgroup.com/icons/heptapus_logo_white.png" alt="Heptapus Group" className="h-8 w-8 object-contain" />
              </div>
              <span className="text-lg font-black text-gray-900">Heptapus Group</span>
            </div>
            <p className="text-sm text-gray-500 max-w-md">{t("heptapus_tagline")}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs font-medium text-gray-400 mt-1">
              <a href="https://heptapusgroup.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 transition-colors">{t("heptapus_privacy")}</a>
              <a href="https://heptapusgroup.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 transition-colors">{t("heptapus_terms")}</a>
              <a href="mailto:contact@heptapusgroup.com" className="hover:text-brand-600 transition-colors">{t("heptapus_contact_label")}: contact@heptapusgroup.com</a>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end gap-4 shrink-0">
            <a
              href="https://heptapusgroup.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-all shadow-soft"
            >
              {t("heptapus_visit")} <ExternalLink className="h-4 w-4" />
            </a>
            <div className="flex items-center gap-3">
              {[
                { href: "https://www.instagram.com/heptapusgroup", Icon: Instagram, label: "Instagram" },
                { href: "https://www.linkedin.com/company/heptapusgroup", Icon: Linkedin, label: "LinkedIn" },
                { href: "https://github.com/heptapusgroup", Icon: Github, label: "GitHub" },
                { href: "https://x.com/heptapusgroup", Icon: Twitter, label: "X" },
              ].map(({ href, Icon, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="rounded-lg p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── FOOTER ── */}
      <footer className="flex flex-col gap-8 border-t border-gray-100 pt-10 pb-6">
        {/* Legal links row */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center text-xs text-gray-400">
          <Link href="/kvkk" className="hover:text-brand-600 transition-colors">KVKK Aydınlatma Metni</Link>
          <Link href="/gizlilik" className="hover:text-brand-600 transition-colors">Gizlilik Politikası</Link>
          <Link href="/iade" className="hover:text-brand-600 transition-colors">İade ve İptal Politikası</Link>
          <Link href="/mesafeli-satis" className="hover:text-brand-600 transition-colors">Mesafeli Satış Sözleşmesi</Link>
          <Link href="/iletisim" className="hover:text-brand-600 transition-colors">İletişim</Link>
        </div>
        {/* Bottom row */}
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            {branding?.brand_logo ? (
              <img
                src={branding.brand_logo}
                alt={branding.org_name || "Logo"}
                className="h-10 w-auto"
              />
            ) : (
              <Image src="/logo.png" alt="HeptaCert" width={160} height={44} className="h-10 w-auto" />
            )}
            <span className="text-sm text-gray-400 font-normal">© {new Date().getFullYear()} {branding?.org_name || "Heptapus Group"}</span>
          </div>
          <div className="flex gap-6 text-sm font-medium text-gray-500">
            <Link href="/verify" className="hover:text-brand-600 transition-colors">{t("footer_verify")}</Link>
            <Link href="/pricing" className="hover:text-brand-600 transition-colors">{t("footer_pricing")}</Link>
            <Link href="/iletisim" className="hover:text-brand-600 transition-colors">İletişim</Link>
            <Link href="/admin/login" className="hover:text-gray-900 transition-colors">{t("footer_login")}</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}