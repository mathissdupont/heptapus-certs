"use client";

import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Star, 
  HelpCircle,
  ArrowRight,
  Hexagon
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);

  const containerVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="flex flex-col gap-20 pb-20 pt-10">
      
      {/* --- HEADER --- */}
      <motion.section variants={containerVars} initial="hidden" animate="visible" className="text-center">
        <motion.div variants={itemVars} className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-xs font-semibold text-amber-300">
          <Hexagon className="h-4 w-4 text-amber-500" />
          HeptaCoin (HC) Ekonomi Modeli
        </motion.div>
        
        <motion.h1 variants={itemVars} className="text-4xl font-black tracking-tight text-slate-100 sm:text-6xl">
          İhtiyacınıza Uygun <span className="bg-gradient-to-r from-violet-400 to-amber-300 bg-clip-text text-transparent">Akıllı Paketler</span>
        </motion.h1>
        
        <motion.p variants={itemVars} className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          İster tek seferlik etkinlikler düzenleyin, ister on binlerce sertifika üretin. Sürpriz maliyetler olmadan, sadece kullandığınız kadar ödeyin.
        </motion.p>

        {/* Aylık / Yıllık Toggle */}
        <motion.div variants={itemVars} className="mt-10 flex items-center justify-center gap-3">
          <span className={`text-sm font-semibold ${!isAnnual ? 'text-white' : 'text-slate-500'}`}>Aylık</span>
          <button 
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative inline-flex h-7 w-14 items-center rounded-full bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <span className={`${isAnnual ? 'translate-x-8 bg-violet-500' : 'translate-x-1 bg-slate-400'} inline-block h-5 w-5 transform rounded-full transition-transform`} />
          </button>
          <span className={`text-sm font-semibold ${isAnnual ? 'text-white' : 'text-slate-500'}`}>
            Yıllık <span className="ml-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">%20 İndirimli</span>
          </span>
        </motion.div>
      </motion.section>

      {/* --- PRICING CARDS --- */}
      <motion.section 
        variants={containerVars} initial="hidden" animate="visible"
        className="grid gap-8 md:grid-cols-3 items-center max-w-6xl mx-auto w-full px-4 sm:px-0"
      >
        {/* TIER 1: Starter */}
        <motion.div variants={itemVars} className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 backdrop-blur-sm">
          <h3 className="text-xl font-bold text-slate-200">Başlangıç</h3>
          <p className="mt-2 text-sm text-slate-500 min-h-[40px]">Küçük çaplı etkinlikler ve bireysel eğitmenler için.</p>
          <div className="mt-6 flex items-baseline gap-1">
            <span className="text-4xl font-black text-white">{isAnnual ? '₺0' : '₺0'}</span>
            <span className="text-sm font-medium text-slate-500">/ ay</span>
          </div>
          <p className="mt-2 text-xs font-semibold text-amber-400">Kullandıkça Öde (1 HC = 1₺)</p>
          
          <Link href="/admin/login" className="mt-8 flex w-full justify-center rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm font-bold text-slate-300 transition-all hover:bg-slate-800">
            Ücretsiz Başla
          </Link>

          <ul className="mt-8 space-y-4 text-sm text-slate-400">
            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 100 HC Hediye Bakiye</li>
            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Standart Şablonlar</li>
            <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Manuel Sertifika Üretimi</li>
            <li className="flex items-center gap-3 text-slate-600"><CheckCircle2 className="h-4 w-4 opacity-30" /> Toplu Excel Üretimi</li>
            <li className="flex items-center gap-3 text-slate-600"><CheckCircle2 className="h-4 w-4 opacity-30" /> API Erişimi</li>
          </ul>
        </motion.div>

        {/* TIER 2: Professional (Highlight) */}
        <motion.div variants={itemVars} className="relative rounded-3xl border border-violet-500/50 bg-gradient-to-b from-violet-900/20 to-slate-900/80 p-8 shadow-[0_0_40px_rgba(124,58,237,0.15)] backdrop-blur-md md:scale-105 z-10">
          <div className="absolute -top-4 left-0 right-0 mx-auto w-fit rounded-full bg-gradient-to-r from-violet-500 to-amber-500 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
            En Çok Tercih Edilen
          </div>
          
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-white">Profesyonel</h3>
            <Star className="h-6 w-6 text-amber-400 fill-amber-400/20" />
          </div>
          <p className="mt-2 text-sm text-slate-400 min-h-[40px]">Kurumlar, akademiler ve sürekli sertifika üretenler için.</p>
          
          <div className="mt-6 flex items-baseline gap-1">
            <span className="text-5xl font-black text-white">{isAnnual ? '₺499' : '₺599'}</span>
            <span className="text-sm font-medium text-slate-500">/ ay</span>
          </div>
          <p className="mt-2 text-xs font-semibold text-violet-400">Her ay 2.000 HC Bakiye Dahil!</p>
          
          <Link href="/admin/login" className="mt-8 flex w-full justify-center items-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-violet-500 hover:scale-[1.02] shadow-[0_0_20px_rgba(124,58,237,0.4)]">
            <Zap className="h-4 w-4" /> Hemen Abone Ol
          </Link>

          <ul className="mt-8 space-y-4 text-sm text-slate-300 font-medium">
            <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-violet-400" /> Ayda 2.000 Ücretsiz Sertifika</li>
            <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-violet-400" /> Sınırsız Özel Şablon</li>
            <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-violet-400" /> Excel ile Toplu Üretim</li>
            <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-violet-400" /> Kendi Logonuzla Doğrulama</li>
            <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-violet-400" /> Öncelikli 7/24 Destek</li>
          </ul>
        </motion.div>

        {/* TIER 3: Enterprise */}
        <motion.div variants={itemVars} className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 backdrop-blur-sm">
          <h3 className="text-xl font-bold text-slate-200">Kurumsal</h3>
          <p className="mt-2 text-sm text-slate-500 min-h-[40px]">Üniversiteler ve dev organizasyonlar için sınırsız güç.</p>
          <div className="mt-6 flex items-baseline gap-1">
            <span className="text-4xl font-black text-white">Özel</span>
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">İhtiyacınıza göre fiyatlandırma</p>
          
          <button className="mt-8 flex w-full justify-center rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm font-bold text-slate-300 transition-all hover:bg-slate-800">
            Bize Ulaşın
          </button>

          <ul className="mt-8 space-y-4 text-sm text-slate-400">
            <li className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-slate-300" /> Sınırsız HC ve Sertifika</li>
            <li className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-slate-300" /> API ve Webhook Erişimi</li>
            <li className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-slate-300" /> Kendi Domaininiz (cname)</li>
            <li className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-slate-300" /> Özel SSO (SAML/OAuth) Girişi</li>
            <li className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-slate-300" /> Atanmış Müşteri Temsilcisi</li>
          </ul>
        </motion.div>
      </motion.section>

      {/* --- FAQ SECTION --- */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="mx-auto max-w-3xl w-full px-4 sm:px-0 mt-10"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <HelpCircle className="h-5 w-5 text-slate-500" />
          <h2 className="text-2xl font-bold text-slate-100">Sıkça Sorulan Sorular</h2>
        </div>
        
        <div className="grid gap-4">
          {[
            { q: "HeptaCoin (HC) nedir?", a: "HeptaCoin, sistemimizde sertifika üretmek için kullanılan dijital kredidir. 1 Sertifika üretimi standart olarak 1 HC tüketir." },
            { q: "Aylık paketimdeki HC'ler sonraki aya devreder mi?", a: "Evet! Profesyonel planda kullanmadığınız HeptaCoin'ler silinmez, hesabınızda birikmeye devam eder." },
            { q: "Sertifikaların doğrulanabilirliği ne kadar sürer?", a: "Sertifikalarınız oluşturulduğu saniyeden itibaren Heptapus Group sunucularında ömür boyu doğrulanabilir olarak kalır. Aboneliğinizi iptal etseniz bile mevcut sertifikalarınızın doğrulama sayfaları asla kapanmaz." }
          ].map((faq, i) => (
            <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6">
              <h4 className="text-base font-bold text-slate-200">{faq.q}</h4>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </motion.section>

    </div>
  );
}