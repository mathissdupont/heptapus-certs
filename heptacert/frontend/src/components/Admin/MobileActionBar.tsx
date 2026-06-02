"use client";

import type { ReactNode } from "react";

type MobileActionBarProps = {
  children: ReactNode;
  className?: string;
};

export default function MobileActionBar({ children, className = "" }: MobileActionBarProps) {
  return (
    <div 
      className={`fixed inset-x-4 bottom-4 z-40 rounded-2xl border border-gray-200/60 bg-white/80 p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl md:hidden antialiased transition-all ${className}`}
    >
      {/* Grid yapısında içine atacağınız butonlar (örn: İptal / Kaydet) 
        parmak ergonomisine tam uyacak şekilde simetrik hizalanır.
      */}
      <div className="grid grid-cols-2 gap-2 w-full items-center">
        {children}
      </div>
    </div>
  );
}