"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ShieldCheck, Zap } from "lucide-react";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark scroll-smooth">
      <body className="bg-[#030712] text-slate-200 antialiased selection:bg-violet-500/30">
        
        {/* Teknolojik Grid ve Işıma Arka Planı */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
          <div className="absolute top-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-amber-600/10 blur-[120px]" />
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 min-h-screen flex flex-col">
          
          {/* Floating Navbar */}
          <motion.header 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="sticky top-6 z-50 mb-12 flex justify-center"
          >
            <div className="flex w-full items-center justify-between rounded-full border border-slate-800/80 bg-slate-900/60 px-6 py-3 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-amber-500 text-white shadow-inner group-hover:animate-spin-slow">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="text-lg font-black tracking-tighter">
                  <span className="text-slate-100">Hepta</span>
                  <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">Cert</span>
                </div>
              </Link>

              {/* Ortadaki Linkler */}
              <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
                <Link href="/#features" className="hover:text-violet-300 transition-colors">Özellikler</Link>
                <Link href="/pricing" className="hover:text-amber-300 transition-colors flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-500" /> Abonelik
                </Link>
                <Link href="/verify" className="hover:text-slate-200 transition-colors">Sorgula</Link>
              </nav>

              {/* Sağ Aksiyon */}
              <div className="flex items-center gap-3">
                <Link href="/admin/login" className="hidden sm:block text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-violet-400 transition-colors">
                  Giriş
                </Link>
                <Link href="/admin/login" className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-950 transition-transform hover:scale-105 active:scale-95">
                  Panele Git
                </Link>
              </div>
            </div>
          </motion.header>

          {/* İçerik Alanı */}
          <motion.main 
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex-grow w-full max-w-4xl mx-auto"
          >
            {children}
          </motion.main>
        </div>
      </body>
    </html>
  );
}