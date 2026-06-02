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
  iconBg?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  breadcrumbs,
  iconBg = "bg-gray-50 text-gray-800 border border-gray-100 shadow-sm",
}: PageHeaderProps) {
  return (
    <div className="mb-6 w-full min-w-0 antialiased">
      {/* Apple Tarzı Akıcı ve Minimal Breadcrumb (Navigasyon İzi) */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2.5 flex min-w-0 flex-wrap items-center gap-1 text-[11px] font-medium text-gray-400">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-gray-300 stroke-[2.5]" />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="max-w-[180px] truncate transition-colors hover:text-gray-900"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="max-w-[180px] truncate text-gray-600 font-semibold">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Başlık Gövde Paneli - Süzülen Temiz Yüzey */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="relative flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          
          {/* Sol Alan: İkon ve Başlık Grubu */}
          <div className="flex min-w-0 items-center gap-4">
            {icon && (
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all ${iconBg}`}
              >
                <div className="h-4 w-4 [&>svg]:h-4 [&>svg]:w-4">
                  {icon}
                </div>
              </div>
            )}
            <div className="min-w-0 space-y-0.5">
              <h1 className="text-base font-bold tracking-tight text-gray-950 truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="max-w-2xl break-words text-xs leading-relaxed tracking-normal text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Sağ Alan: Global Sayfa Aksiyon Butonları (Slot) */}
          {actions && (
            <div className="flex min-w-0 w-full flex-wrap items-center gap-2 lg:w-auto lg:shrink-0 [&_*]:min-w-0">
              {actions}
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}

export default PageHeader;
