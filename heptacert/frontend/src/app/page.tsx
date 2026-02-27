"use client";

import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Search,
  FileCheck,
  Fingerprint,
  Cpu
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const containerVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="flex flex-col gap-32 pb-20 pt-10">
      
      {/* --- HERO SECTION --- */}
      <motion.section variants={containerVars} initial="hidden" animate="visible" className="relative text-center">
        <motion.div variants={itemVars} className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-slate-900/50 px-4 py-2 text-xs font-semibold text-violet-300 backdrop-blur-md shadow-[0_0_20px_rgba(124,58,237,0.1)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
          </span>
          Heptapus Güvencesiyle Web3 Altyapısı
        </motion.div>

        <motion.h1 variants={itemVars} className="mx-auto max-w-3xl text-5xl font-black tracking-tight text-slate-100 sm:text-7xl leading-[1.1]">
          Sertifikalarınızı <br />
          <span className="relative inline-block mt-2">
            <span className="absolute -inset-1 block rounded-lg bg-gradient-to-r from-violet-600/20 to-amber-500/20 blur-xl" />
            <span className="relative bg-gradient-to-r from-violet-400 via-white to-amber-300 bg-clip-text text-transparent">
              Kırılamaz
            </span>
          </span> Kılın
        </motion.h1>

        <motion.p variants={itemVars} className="mx-auto mt-8 max-w-xl text-lg text-slate-400 font-medium leading-relaxed">
          Kurumunuzun itibarını koruyun. Sahte belgeleri tarihe gömen, anında doğrulanabilir ve tamamen şifrelenmiş akıllı sertifika platformu.
        </motion.p>

        <motion.div variants={itemVars} className="mt-12 flex flex-wrap justify-center gap-5">
          <Link href="/pricing" className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-8 py-4 font-bold text-white shadow-[0_0_40px_rgba(124,58,237,0.3)] transition-all hover:shadow-[0_0_60px_rgba(124,58,237,0.5)] hover:scale-105 active:scale-95">
            Planları İncele <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/verify" className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/50 px-8 py-4 font-bold text-slate-300 transition-all hover:bg-slate-800 hover:text-white backdrop-blur-md">
            Sertifika Doğrula
          </Link>
        </motion.div>
      </motion.section>

      {/* --- PREMIUM BENTO GRID (FEATURES) --- */}
      <section id="features" className="scroll-mt-32">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-black text-slate-100">Neden HeptaCert?</h2>
          <p className="mt-3 text-slate-400">Sıradan PDF'lerden çok daha fazlası.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[250px]">
          {/* Box 1 - Geniş Kutu */}
          <div className="md:col-span-2 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-8 relative overflow-hidden group hover:border-violet-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Fingerprint className="h-40 w-40 text-violet-400" />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="inline-flex rounded-2xl bg-violet-500/10 p-3 text-violet-400 w-fit">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-100 mb-2">Askeri Düzeyde Güvenlik</h3>
                <p className="text-slate-400 max-w-sm">Her sertifika benzersiz bir UUID ve kriptografik özet (hash) ile mühürlenir. Geriye dönük manipülasyon imkansızdır.</p>
              </div>
            </div>
          </div>

          {/* Box 2 - Dar Kutu */}
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-8 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
            <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl group-hover:bg-amber-500/20 transition-colors" />
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="inline-flex rounded-2xl bg-amber-500/10 p-3 text-amber-400 w-fit">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100 mb-2">Saniyeler İçinde Doğrulama</h3>
                <p className="text-sm text-slate-400">Karekod okutarak veya ID girerek gerçek zamanlı sorgulama.</p>
              </div>
            </div>
          </div>

          {/* Box 3 - Dar Kutu */}
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-8 group hover:border-emerald-500/30 transition-colors">
            <div className="flex flex-col justify-between h-full">
              <div className="inline-flex rounded-2xl bg-emerald-500/10 p-3 text-emerald-400 w-fit">
                <FileCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100 mb-2">Excel ile Toplu Üretim</h3>
                <p className="text-sm text-slate-400">Binlerce katılımcıyı tek bir Excel dosyasıyla sisteme aktarın.</p>
              </div>
            </div>
          </div>

          {/* Box 4 - Geniş Kutu */}
          <div className="md:col-span-2 rounded-3xl border border-slate-800 bg-gradient-to-br from-violet-900/20 to-slate-950/80 p-8 relative overflow-hidden flex items-end">
            <div className="absolute top-8 right-8 flex gap-2">
              <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-700 shadow-xl flex items-center justify-center animate-bounce" style={{ animationDelay: "0ms" }}><Cpu className="h-5 w-5 text-slate-400" /></div>
              <div className="h-12 w-12 rounded-xl bg-violet-600 shadow-xl flex items-center justify-center animate-bounce" style={{ animationDelay: "150ms" }}><Zap className="h-5 w-5 text-white" /></div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-bold text-violet-300 mb-4">
                Powered by HeptaCoin (HC)
              </div>
              <h3 className="text-2xl font-bold text-slate-100 mb-2">Akıllı Kredi Sistemi</h3>
              <p className="text-slate-400 max-w-md">Kullandıkça ödeyin veya aylık paketlerle maliyetlerinizi düşürün. Ürettiğiniz her sertifika için şeffaf fiyatlandırma.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-slate-800/50 pt-10 md:flex-row pb-10">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-amber-500 text-white">
            <ShieldCheck className="h-3 w-3" />
          </div>
          <div className="text-sm font-semibold text-slate-300">
            Heptapus Group <span className="text-slate-600 font-normal">© {new Date().getFullYear()}</span>
          </div>
        </div>
        <div className="flex gap-8 text-sm font-medium text-slate-500">
          <Link href="/verify" className="hover:text-violet-400 transition-colors">Doğrulama Merkezi</Link>
          <Link href="/pricing" className="hover:text-amber-400 transition-colors">Paketler</Link>
          <Link href="/admin/login" className="hover:text-white transition-colors">Sistem Girişi</Link>
        </div>
      </footer>
    </div>
  );
}