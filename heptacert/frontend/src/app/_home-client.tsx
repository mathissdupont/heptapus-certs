"use client";

import { motion } from "framer-motion";
import { ArrowRight, Compass, Users, CheckCircle2, QrCode, Search, Building2, CalendarDays, MessageSquare, Zap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";

type Branding = { org_name?: string; brand_logo?: string | null; brand_color?: string | null; settings?: { hide_heptacert_home?: boolean } };
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

// Animasyonlar
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } };
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
  const brandColor = branding?.brand_color || "#0f172a"; 
  const isWhiteLabel = useMemo(() => !!branding?.org_name && (branding?.settings?.hide_heptacert_home || (host ? !HOSTS.has(host) : false)), [branding, host]);
  const showECommerceLinks = !isWhiteLabel;

  const copy = useMemo(() => lang === "tr" ? {
    heroBadge: "Yeni Nesil Topluluk Ekosistemi",
    heroTitle: "Etkinlikleri Keşfet, Topluluğa Katıl, Sertifikanı Al",
    heroDesc: "Binlerce kişinin buluştuğu etkinliklere katılın, tartışmalara dahil olun ve katılımınızı doğrulanabilir sertifikalarla kanıtlayın.",
    searchPlaceholder: "Etkinlik, topluluk veya konu ara...",
    primaryBtn: "Etkinlikleri Keşfet",
    secondaryBtn: "Topluluklara Göz At",
    
    feature1Title: "Topluluklarla Bağlantıda Kal",
    feature1Desc: "Üniversite kulüpleri, yazılım toplulukları ve bağımsız grupların açtığı tartışmalara katılın, fikirlerinizi paylaşın.",
    
    feature2Title: "Etkinlik Yönetimi & Check-in",
    feature2Desc: "Tek tıkla etkinliklere kayıt olun. Kapıda QR kodunuzu okutarak saniyeler içinde içeri girin ve yoklamanızı verin.",
    
    feature3Title: "Doğrulanabilir Sertifikalar",
    feature3Desc: "Etkinlik sonu hak ettiğiniz sertifikanız anında profilinize düşer. LinkedIn'e tek tıkla ekleyin, orijinalliğini herkes kanıtlasın.",
    
    statsUsers: "Aktif Üye",
    statsEvents: "Düzenlenen Etkinlik",
    statsCerts: "Verilen Sertifika",
    
    discoverTitle: "Platformda Neler Oluyor?",
    discoverDesc: "Güncel etkinliklere ve aktif topluluklara göz atın.",
    
    ctaTitle: "Kendi Topluluğunu Büyüt",
    ctaDesc: "Etkinlik düzenlemek, katılımcıları yönetmek ve saniyeler içinde yüzlerce sertifika üretmek için organizatör hesabını hemen aç.",
    ctaBtn: "Organizatör Olarak Başla",
    
    footerVerify: "Sertifika Doğrula",
    footerContact: "İletişim",
    footerPrivacy: "Gizlilik Politikası",
    footerTerms: "Kullanım Koşulları"
  } : {
    heroBadge: "Next-Gen Community Ecosystem",
    heroTitle: "Discover Events, Join Communities, Earn Certificates",
    heroDesc: "Join events where thousands meet, participate in discussions, and prove your attendance with verifiable, blockchain-backed certificates.",
    searchPlaceholder: "Search events, communities or topics...",
    primaryBtn: "Explore Events",
    secondaryBtn: "Browse Communities",
    
    feature1Title: "Stay Connected with Communities",
    feature1Desc: "Join discussions opened by university clubs, tech communities, and independent groups. Share your ideas.",
    
    feature2Title: "Event Management & Check-in",
    feature2Desc: "Register for events with one click. Scan your QR code at the door to get in and complete your check-in in seconds.",
    
    feature3Title: "Verifiable Certificates",
    feature3Desc: "The certificate you earned drops into your profile instantly. Add it to LinkedIn with one click, let anyone prove its authenticity.",
    
    statsUsers: "Active Members",
    statsEvents: "Hosted Events",
    statsCerts: "Issued Certificates",
    
    discoverTitle: "What's happening on the platform?",
    discoverDesc: "Check out the latest events and active communities.",
    
    ctaTitle: "Grow Your Own Community",
    ctaDesc: "Create your organizer account now to host events, manage attendees, and issue hundreds of certificates in seconds.",
    ctaBtn: "Start as an Organizer",
    
    footerVerify: "Verify Certificate",
    footerContact: "Contact",
    footerPrivacy: "Privacy Policy",
    footerTerms: "Terms of Service"
  }, [lang]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFB] dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100">
      
      {/* HERO SECTION - Sosyal Platform Tarzı */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 dark:bg-blue-500/5 blur-3xl" />
          <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-3xl" />
        </div>

        <motion.div variants={stagger} initial="hidden" animate="show" className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wide mb-8">
            <Zap className="h-3.5 w-3.5" />
            {copy.heroBadge}
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
            {copy.heroTitle}
          </motion.h1>

          <motion.p variants={fadeUp} className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            {copy.heroDesc}
          </motion.p>

          {/* Arama ve Navigasyon Çubuğu */}
          <motion.div variants={fadeUp} className="max-w-2xl mx-auto mb-10">
            <div className="relative group flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <Search className="h-5 w-5 text-gray-400 ml-3" />
              <input 
                type="text" 
                placeholder={copy.searchPlaceholder}
                className="w-full bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500 px-4 py-2 outline-none"
              />
              <Link href="/events" className="hidden sm:flex items-center justify-center px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-800 dark:hover:bg-gray-100 transition-colors shadow-sm whitespace-nowrap">
                {copy.primaryBtn}
              </Link>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
            <Link href="/events" className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <CalendarDays className="h-4 w-4 text-blue-500" />
              Etkinlikler
            </Link>
            <Link href="/organizations" className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Building2 className="h-4 w-4 text-purple-500" />
              {copy.secondaryBtn}
            </Link>
            <Link href="/verify" className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <QrCode className="h-4 w-4 text-emerald-500" />
              {copy.footerVerify}
            </Link>
          </motion.div>

        </motion.div>
      </section>

      {/* STATS SECTION */}
      {showECommerceLinks && (
        <section className="py-10 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-gray-800">
              <div className="flex flex-col py-4 sm:py-0">
                <span className="text-3xl font-black text-gray-900 dark:text-white">{stats?.active_members || "0"}</span>
                <span className="text-sm font-medium text-gray-500 mt-1">{copy.statsUsers}</span>
              </div>
              <div className="flex flex-col py-4 sm:py-0">
                <span className="text-3xl font-black text-gray-900 dark:text-white">{stats?.hosted_events || "0"}</span>
                <span className="text-sm font-medium text-gray-500 mt-1">{copy.statsEvents}</span>
              </div>
              <div className="flex flex-col py-4 sm:py-0">
                <span className="text-3xl font-black text-gray-900 dark:text-white">{stats?.issued_certificates || stats?.certs_issued || "0"}</span>
                <span className="text-sm font-medium text-gray-500 mt-1">{copy.statsCerts}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS / FEATURES (Sosyal Odaklı) */}
      <section className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{copy.discoverTitle}</h2>
            <p className="text-gray-600 dark:text-gray-400">{copy.discoverDesc}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-6">
                <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{copy.feature1Title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {copy.feature1Desc}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mb-6">
                <Compass className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{copy.feature2Title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {copy.feature2Desc}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
                <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{copy.feature3Title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {copy.feature3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION (Organizatörler İçin) */}
      {showECommerceLinks && (
        <section className="pb-20 md:pb-28">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="relative rounded-[2.5rem] bg-slate-900 overflow-hidden px-6 py-16 sm:px-12 sm:py-20 text-center shadow-xl">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
              <div className="relative z-10">
                <Users className="h-12 w-12 text-blue-400 mx-auto mb-6 opacity-80" />
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">{copy.ctaTitle}</h2>
                <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10">
                  {copy.ctaDesc}
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link href="/register?mode=organizer" className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-slate-900 font-bold rounded-xl hover:bg-gray-100 transition-colors">
                    {copy.ctaBtn} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <Link href="/pricing" className="inline-flex items-center justify-center px-8 py-3.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 border border-slate-700 transition-colors">
                    Planları İncele
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="mt-auto border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            {branding?.brand_logo ? (
              <img src={branding.brand_logo} alt={branding.org_name || "Logo"} className="h-7 w-auto" />
            ) : isWhiteLabel ? (
              <span className="text-lg font-bold text-gray-900 dark:text-white">{brandName}</span>
            ) : (
              <Image src="/logo.png" alt="HeptaCert" width={120} height={30} className="h-7 w-auto" />
            )}
            <span className="text-sm text-gray-400">© {new Date().getFullYear()}</span>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <Link href="/verify" className="hover:text-gray-900 dark:hover:text-white transition-colors">{copy.footerVerify}</Link>
            <Link href="/iletisim" className="hover:text-gray-900 dark:hover:text-white transition-colors">{copy.footerContact}</Link>
            <Link href="/kullanim-kosullari" className="hover:text-gray-900 dark:hover:text-white transition-colors">{copy.footerTerms}</Link>
            <Link href="/gizlilik" className="hover:text-gray-900 dark:hover:text-white transition-colors">{copy.footerPrivacy}</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}