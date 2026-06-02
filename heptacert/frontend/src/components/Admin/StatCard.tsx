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
  iconBg = "bg-gray-50 text-gray-700 border border-gray-100/50",
  trend,
  footer,
  delay = 0,
  className = "",
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`w-full group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:border-gray-300 hover:bg-gray-50/30 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Üst Küçük Başlık */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 truncate">
            {label}
          </p>
          
          {/* Büyük Sayısal Değer */}
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-gray-950 tabular-nums">
            {typeof value === "number" ? value.toLocaleString("tr-TR") : value}
          </p>
          
          {/* Apple Tarzı Minimalist Trend Satırı */}
          {trend && (
            <p className="mt-2 inline-flex items-center text-[11px] font-semibold tracking-tight">
              <span className={trend.value >= 0 ? "text-emerald-600" : "text-red-500"}>
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              {trend.label && (
                <span className="text-gray-400 font-medium pl-1 truncate">
                  {trend.label}
                </span>
              )}
            </p>
          )}
        </div>
        
        {/* Sağ İkon Yuvası */}
        {icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-105 ${iconBg}`}>
            <div className="h-4 w-4 [&>svg]:h-4 [&>svg]:w-4">
              {icon}
            </div>
          </div>
        )}
      </div>
      
      {/* İsteğe Bağlı Alt Kart Bilgisi */}
      {footer && <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">{footer}</div>}
    </motion.div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────
export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-full rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2.5">
              <div className="h-3 w-20 rounded bg-gray-100" />
              <div className="h-6 w-16 rounded bg-gray-100" />
            </div>
            <div className="h-9 w-9 rounded-xl bg-gray-100" />
          </div>
        </div>
      ))}
    </>
  );
}