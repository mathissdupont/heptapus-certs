"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function BulkActionBar({
  selectedCount,
  title,
  description,
  onClear,
  children,
  loading,
}: {
  selectedCount: number;
  title: string;
  description?: string;
  onClear: () => void;
  children: ReactNode;
  loading?: ReactNode;
}) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.98 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="fixed bottom-6 left-4 right-4 z-50 rounded-2xl border border-gray-200/80 bg-white/85 p-4 text-gray-900 shadow-[0_16px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:left-1/2 sm:right-auto sm:w-full sm:max-w-2xl sm:-translate-x-1/2"
        >
          {/* Üst Bilgi Alanı */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center rounded-md bg-gray-900 px-2 py-0.5 text-[11px] font-medium text-white tracking-tight">
                {selectedCount} Seçildi
              </span>
              <div className="mt-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {title}
                </h4>
                {description && (
                  <p className="text-xs font-medium text-gray-600 truncate">
                    {description}
                  </p>
                )}
              </div>
            </div>

            {/* Seçimi Temizle Butonu (Apple Tarzı Minimal Daire) */}
            <button
              type="button"
              onClick={onClear}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 transition-all hover:border-gray-200 hover:text-gray-900 active:scale-90 shadow-sm"
              title="Seçimi Temizle"
            >
              <X className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Aksiyon Butonları Alanı */}
          <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
              {children}
            </div>
            {loading && (
              <div className="flex items-center justify-center sm:justify-start shrink-0">
                {loading}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}