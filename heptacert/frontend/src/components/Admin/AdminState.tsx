"use client";

import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type StateDisplayProps = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function LoadingState({ description }: { description?: string }) {
  const { lang } = useI18n();
  const label = description ?? (lang === "tr" ? "Yükleniyor..." : "Loading...");
  return (
    <div className="flex w-full min-h-[140px] items-center justify-center gap-3 rounded-xl border border-surface-150 bg-surface-50 p-6">
      <Loader2 className="h-4 w-4 animate-spin text-surface-400" />
      <span className="text-sm font-medium text-surface-500">{label}</span>
    </div>
  );
}

export function ErrorState({ title, description, action, className = "" }: StateDisplayProps) {
  const { lang } = useI18n();
  const resolvedTitle = title ?? (lang === "tr" ? "Bir hata oluştu" : "An error occurred");
  return (
    <div className={`w-full rounded-xl border border-red-100 bg-red-50/40 p-5 ${className}`}>
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left sm:gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500">
          <AlertCircle className="h-4 w-4 stroke-[2]" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h5 className="text-sm font-semibold text-surface-900">{resolvedTitle}</h5>
          {description && <p className="max-w-xl text-sm leading-relaxed text-surface-500">{description}</p>}
          {action && <div className="pt-2">{action}</div>}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ title, description, icon, action, className = "" }: StateDisplayProps) {
  const { lang } = useI18n();
  const resolvedTitle = title ?? (lang === "tr" ? "Kayıt bulunamadı" : "No records found");
  return (
    <div className={`flex w-full flex-col items-center justify-center px-6 py-14 text-center sm:py-16 ${className}`}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-surface-200 bg-surface-50 text-surface-400">
        {icon ?? <Inbox className="h-5 w-5 stroke-[1.5]" />}
      </div>
      <h5 className="text-sm font-medium text-surface-900">{resolvedTitle}</h5>
      {description && <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-surface-500">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
