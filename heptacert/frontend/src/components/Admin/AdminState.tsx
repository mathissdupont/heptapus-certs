"use client";

import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";

// Ortak esnek prop yapısı
type StateDisplayProps = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/**
 * Loading State: Apple tarzı pürüzsüz, merkezlenmiş ve minimal yükleniyor animasyonu.
 * Mobil ekranlarda dikeyde çok yer kaplamaz, esnektir.
 */
export function LoadingState({ description = "Yükleniyor..." }: { description?: string }) {
  return (
    <div className="flex w-full min-h-[140px] items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white/50 p-6 backdrop-blur-sm">
      <Loader2 className="h-4 w-4 animate-spin text-gray-400 stroke-[2.5]" />
      <span className="text-sm font-medium text-gray-500 tracking-tight">{description}</span>
    </div>
  );
}

/**
 * Error State: Göz tırmalayan parlak kırmızılar yerine, soft gri-kırmızı tonları
 * ve incecik bir sınır çizgisiyle Apple kalitesinde hata gösterimi.
 */
export function ErrorState({ title = "Bir hata oluştu", description, action, className = "" }: StateDisplayProps) {
  return (
    <div className={`w-full rounded-2xl border border-red-100 bg-red-50/30 p-6 sm:p-8 transition-all ${className}`}>
      <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertCircle className="h-5 w-5 stroke-[2]" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <h5 className="text-sm font-semibold text-gray-900 tracking-tight">{title}</h5>
          {description && (
            <p className="text-sm leading-relaxed text-gray-500 tracking-normal max-w-xl">
              {description}
            </p>
          )}
          {action && <div className="pt-2">{action}</div>}
        </div>
      </div>
    </div>
  );
}

/**
 * Empty State: İçerik bulunamadığında gösterilen, simetrik, ikon odaklı,
 * mobil cihazlarda padding dengesini otomatik ayarlayan tertemiz alan.
 */
export function EmptyState({ title = "Kayıt bulunamadı", description, icon, action, className = "" }: StateDisplayProps) {
  return (
    <div className={`w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/30 px-6 py-12 sm:py-16 text-center transition-all ${className}`}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm text-gray-400">
        {icon ?? <Inbox className="h-5 w-5 stroke-[1.5]" />}
      </div>
      <h5 className="text-sm font-semibold text-gray-900 tracking-tight">{title}</h5>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-gray-400 tracking-normal">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}