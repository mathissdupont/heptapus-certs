"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Breadcrumb = { label: string; href?: string };

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  /** @deprecated Icon background is no longer used in the flat header design */
  iconBg?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <div className="mb-6 w-full min-w-0">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 flex min-w-0 flex-wrap items-center gap-1 text-[11px] font-medium text-surface-400">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-surface-300 stroke-[2.5]" />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="max-w-[200px] truncate transition-colors hover:text-surface-900"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="max-w-[200px] truncate text-surface-600 font-semibold">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-surface-50 text-surface-600 [&>svg]:h-4 [&>svg]:w-4">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-surface-900">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 max-w-2xl break-words text-sm leading-relaxed text-surface-500">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex min-w-0 w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 [&_*]:min-w-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
