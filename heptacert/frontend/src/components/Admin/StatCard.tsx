"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  iconBg?: string;
  trend?: { value: number; label?: string };
  footer?: ReactNode;
  delay?: number;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  iconBg = "bg-brand-50 text-brand-500",
  trend,
  footer,
  delay = 0,
  className = "",
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: "easeOut" }}
      className={`card group relative overflow-hidden p-5 ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-400/70 via-brand-500/80 to-emerald-400/70 opacity-80" />
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-brand-50/60 blur-2xl transition-transform duration-300 group-hover:scale-110" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-surface-400 truncate">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-surface-900 tabular-nums">
            {typeof value === "number" ? value.toLocaleString("tr-TR") : value}
          </p>
          {trend && (
            <p
              className={`mt-1.5 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${trend.value >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}%{trend.label ? ` ${trend.label}` : ""}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-soft ${iconBg}`}
          >
            {icon}
          </div>
        )}
      </div>
      {footer && <div className="mt-3 border-t border-surface-100 pt-3">{footer}</div>}
    </motion.div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────
export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5 animate-pulse">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-surface-100" />
              <div className="h-7 w-16 rounded bg-surface-100" />
            </div>
            <div className="h-10 w-10 rounded-xl bg-surface-100" />
          </div>
        </div>
      ))}
    </>
  );
}
