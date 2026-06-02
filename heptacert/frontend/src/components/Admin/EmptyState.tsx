"use client";

import { type ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title = "Veri bulunamadı",
  description,
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div 
      className={`w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 px-6 py-12 sm:py-16 text-center antialiased transition-all ${className}`}
    >
      {/* Apple Tarzı Minimal İkon Çerçevesi */}
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm text-gray-400">
        {icon ?? <Inbox className="h-5 w-5 stroke-[1.5]" />}
      </div>
      
      {/* Metin Alanı */}
      <h5 className="text-sm font-semibold text-gray-900 tracking-tight">
        {title}
      </h5>
      {description && (
        <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-gray-400 tracking-normal mx-auto">
          {description}
        </p>
      )}
      
      {/* Aksiyon Butonu Yuvası */}
      {action && <div className="mt-5 w-full sm:w-auto flex justify-center">{action}</div>}
    </div>
  );
}

export default EmptyState;