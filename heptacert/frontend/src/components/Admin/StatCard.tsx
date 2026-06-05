"use client";

import type { ReactNode } from "react";
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
  iconBg = "bg-surface-50 text-surface-600 border border-surface-150",
  trend,
  footer,
  delay = 0,
  className = "",
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative w-full overflow-hidden rounded-xl border border-surface-200 bg-white p-5 shadow-card transition-colors duration-200 hover:border-surface-300 hover:bg-surface-50/40 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-11 font-semibold uppercase tracking-wider text-surface-400 truncate">
            {label}
          </p>

          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-surface-900 tabular-nums">
            {typeof value === "number" ? value.toLocaleString("tr-TR") : value}
          </p>

          {trend && (
            <p className="mt-2 inline-flex items-center gap-1 text-11 font-medium">
              <span className={trend.value >= 0 ? "text-emerald-600" : "text-red-500"}>
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              {trend.label && (
                <span className="text-surface-400 truncate">{trend.label}</span>
              )}
            </p>
          )}
        </div>

        {icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 ${iconBg}`}
          >
            <div className="h-4 w-4 [&>svg]:h-4 [&>svg]:w-4">{icon}</div>
          </div>
        )}
      </div>

      {footer && (
        <div className="mt-4 border-t border-surface-100 pt-3 text-xs text-surface-500">
          {footer}
        </div>
      )}
    </motion.div>
  );
}

export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-full rounded-xl border border-surface-100 bg-white p-5 shadow-card animate-pulse"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2.5">
              <div className="h-2.5 w-20 rounded bg-surface-100" />
              <div className="h-6 w-16 rounded bg-surface-100" />
            </div>
            <div className="h-9 w-9 rounded-lg bg-surface-100" />
          </div>
        </div>
      ))}
    </>
  );
}
