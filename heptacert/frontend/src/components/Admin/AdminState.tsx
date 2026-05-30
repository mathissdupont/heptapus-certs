"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

type AdminStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function AdminLoadingState({ label = "Yükleniyor..." }: { label?: string }) {
  return (
    <div className="surface-panel flex items-center gap-3 p-6 text-sm font-semibold text-surface-500">
      <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
      {label}
    </div>
  );
}

export function AdminErrorState({ title, description, action, className = "" }: AdminStateProps) {
  return (
    <div className={`rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-800 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-white/70 p-3 text-rose-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-bold">{title}</p>
          {description && <p className="mt-1 text-sm leading-6 opacity-85">{description}</p>}
          {action && <div className="mt-4">{action}</div>}
        </div>
      </div>
    </div>
  );
}

export function AdminEmptyState({ title, description, icon, action, className = "" }: AdminStateProps) {
  return (
    <div className={`card flex flex-col items-center justify-center border-dashed px-6 py-14 text-center ${className}`}>
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 text-surface-400">
        {icon ?? <Inbox className="h-7 w-7" />}
      </div>
      <p className="text-sm font-bold text-surface-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm leading-6 text-surface-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
