"use client";

import type { ReactNode } from "react";

type MobileActionBarProps = {
  children: ReactNode;
  className?: string;
};

export default function MobileActionBar({ children, className = "" }: MobileActionBarProps) {
  return (
    <div className={`fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-surface-200 bg-white/95 p-2 shadow-xl backdrop-blur md:hidden ${className}`}>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}
