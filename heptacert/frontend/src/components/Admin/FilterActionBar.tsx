"use client";

import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type FilterActionBarProps = {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  clearLabel?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  onClear?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
};

export default function FilterActionBar({
  search,
  onSearchChange,
  searchPlaceholder,
  clearLabel,
  filters,
  actions,
  onClear,
  hasActiveFilters,
  className = "",
}: FilterActionBarProps) {
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const placeholder = searchPlaceholder ?? (isTr ? "Ara..." : "Search...");
  const clearText    = clearLabel        ?? (isTr ? "Temizle" : "Clear");

  return (
    <div className={`flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between ${className}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        {onSearchChange && (
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              value={search || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder}
              className="input pl-9"
            />
          </div>
        )}

        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}

        {onClear && hasActiveFilters && (
          <button type="button" onClick={onClear} className="btn-ghost inline-flex text-xs">
            <X className="h-3.5 w-3.5" />
            {clearText}
          </button>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
