"use client";

import type { ReactNode } from "react";
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
    <div className={`flex flex-col items-center justify-center py-14 text-center ${className}`}>
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 text-surface-400">
        {icon ?? <Inbox className="h-7 w-7" />}
      </div>
      <p className="text-sm font-semibold text-surface-700">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-surface-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
