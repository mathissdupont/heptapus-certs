"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

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
  const { lang } = useI18n();
  const clearLabel = lang === "tr" ? "Seçimi Temizle" : "Clear Selection";

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 left-4 right-4 z-50 mx-auto max-w-2xl antialiased sm:left-1/2 sm:right-auto sm:w-full sm:-translate-x-1/2"
        >
          <div className="flex flex-col gap-3 rounded-2xl border border-surface-700 bg-surface-900 px-4 py-3.5 shadow-float sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="inline-flex shrink-0 items-center rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
                {selectedCount}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white/90">{description || title}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0">
              {children}
              {loading && <div className="flex items-center">{loading}</div>}
              <button
                type="button"
                onClick={onClear}
                aria-label={clearLabel}
                title={clearLabel}
                className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
