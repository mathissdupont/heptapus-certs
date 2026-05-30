"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
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
  if (selectedCount <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-20 left-3 right-3 z-50 rounded-3xl border border-white/10 bg-gray-950 p-4 text-white shadow-2xl sm:bottom-6 sm:left-1/2 sm:right-auto sm:min-w-[560px] sm:-translate-x-1/2"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{title}</p>
          {description && <p className="mt-1 text-sm font-bold">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-2xl border border-white/10 p-2 text-gray-400 transition-colors hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{children}</div>
      {loading}
    </motion.div>
  );
}
