"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, FileQuestion, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "linear-gradient(180deg, #fafaf9 0%, #f7f6f4 48%, #f4f3f1 100%)" }}>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center mb-6"
        >
          <div className="w-20 h-20 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center">
            <FileQuestion className="w-9 h-9 text-gray-400" />
          </div>
        </motion.div>

        {/* 404 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-sm font-semibold tracking-widest text-indigo-500 uppercase mb-2"
        >
          404
        </motion.p>

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Sayfa bulunamadı
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Aradığın sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.
          URL'yi kontrol edip tekrar deneyin.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Home className="w-4 h-4" />
            Ana sayfaya dön
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Search className="w-4 h-4" />
            Etkinlikleri keşfet
          </Link>
        </div>

        {/* Quick links */}
        <div className="flex items-center justify-center gap-1 text-xs text-gray-400 flex-wrap">
          <Link href="/login" className="hover:text-gray-600 px-2 py-1 transition-colors">
            Giriş yap
          </Link>
          <span>·</span>
          <Link href="/register" className="hover:text-gray-600 px-2 py-1 transition-colors">
            Kayıt ol
          </Link>
          <span>·</span>
          <Link href="/pricing" className="hover:text-gray-600 px-2 py-1 transition-colors">
            Fiyatlar
          </Link>
          <span>·</span>
          <a href="https://docs.heptacert.com" className="hover:text-gray-600 px-2 py-1 transition-colors">
            Docs
          </a>
        </div>
      </motion.div>

      {/* Bottom logo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="absolute bottom-8 text-xs text-gray-300 font-medium tracking-wide"
      >
        HeptaCert
      </motion.div>
    </div>
  );
}
