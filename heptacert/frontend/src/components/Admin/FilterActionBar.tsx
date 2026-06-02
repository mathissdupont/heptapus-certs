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
    <div 
      className={`w-full rounded-2xl border border-gray-200/80 bg-white p-3 sm:p-3.5 shadow-sm antialiased ${className}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Sol Taraf: Arama ve Filtre Slotları */}
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          {onSearchChange && (
            <div className="relative min-w-0 flex-1 sm:max-w-xs md:max-w-sm">
              {/* Sol Arama İkonu */}
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 stroke-[2]" />
              
              {/* Apple Tarzı Minimal Arama Girişi */}
              <input
                type="text"
                value={search || ""}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white pl-9 pr-3.5 text-xs font-medium text-gray-900 transition-all outline-none hover:border-gray-300 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
              />
            </div>
          )}
          
          {/* Projedeki Harici Filtre Slotları */}
          {filters && (
            <div className="flex flex-wrap items-center gap-2">
              {filters}
            </div>
          )}
          
          {/* Filtreleri Temizle Butonu (Aktif Olduğunda Çıkan Soft Rozet Buton) */}
          {onClear && hasActiveFilters && (
            <button 
              type="button" 
              onClick={onClear} 
              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-semibold text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900 active:scale-95"
            >
              <X className="h-3.5 w-3.5 stroke-[2.5]" />
              {searchPlaceholder.toLowerCase().includes("search") ? "Clear" : "Temizle"}
            </button>
          )}
        </div>
        
        {/* Sağ Taraf: Global Aksiyon Butonları Slotu (Yeni Ekle, Dışa Aktar vb.) */}
        {actions && (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end shrink-0 w-full lg:w-auto">
            {actions}
          </div>
        )}

      </div>
    </div>
  );
}