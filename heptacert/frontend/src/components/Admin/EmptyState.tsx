"use client";

import { type ReactNode } from "react";
import { Inbox } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className = "" }: EmptyStateProps) {
  const { lang } = useI18n();
  const resolvedTitle = title ?? (lang === "tr" ? "Veri bulunamadı" : "No data found");
  return (
    <div className={`flex w-full flex-col items-center justify-center px-6 py-14 text-center antialiased sm:py-16 ${className}`}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-surface-200 bg-surface-50 text-surface-400">
        {icon ?? <Inbox className="h-5 w-5 stroke-[1.5]" />}
      </div>
      <h5 className="text-sm font-medium text-surface-900">{resolvedTitle}</h5>
      {description && <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-surface-500">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export default EmptyState;
