"use client";

import type { ReactNode } from "react";
import { Search, X } from "lucide-react";

type FilterActionBarProps = {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  onClear?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
};

export default function FilterActionBar({
  search,
  onSearchChange,
  searchPlaceholder = "Ara...",
  filters,
  actions,
  onClear,
  hasActiveFilters,
  className = "",
}: FilterActionBarProps) {
  return (
    <div className={`card p-3 sm:p-4 ${className}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {onSearchChange && (
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                value={search || ""}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="input-field pl-10"
              />
            </label>
          )}
          {filters}
          {onClear && hasActiveFilters && (
            <button type="button" onClick={onClear} className="btn-secondary justify-center text-xs">
              <X className="h-4 w-4" />
              Temizle
            </button>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2 lg:justify-end">{actions}</div>}
      </div>
    </div>
  );
}
