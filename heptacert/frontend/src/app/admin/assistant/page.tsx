"use client";

import { useEffect } from "react";
import { MessageCircle, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import AIAssistant from "@/components/Admin/AIAssistant";

export default function AdminAssistantPage() {
  const { lang } = useI18n();

  const copy =
    lang === "tr"
      ? {
          title: "HeptaCert AI Asistan",
          subtitle: "Sistem ve etkinlik yönetim merkezi",
          status: "Aktif",
          eyebrow: "Akıllı Yönetim Paneli",
        }
      : {
          title: "HeptaCert AI Assistant",
          subtitle: "System and event management center",
          status: "Online",
          eyebrow: "Smart Management Panel",
        };

  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
    } catch {
      // no-op
    }
  }, []);

  return (
    <div
      data-theme="light"
      className="flex h-[100dvh] w-full overflow-hidden bg-gray-50/50 text-gray-900 antialiased"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        
        {/* 1. ÜST BİLGİ ALANI (Header) - Apple Geçirgenliği */}
        <header className="shrink-0 border-b border-gray-200/80 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3.5">
              {/* İkon Yuvası */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50/50 text-gray-900 shadow-sm">
                <MessageCircle className="h-4 w-4 stroke-[2]" />
              </div>

              {/* Metin Grubu */}
              <div className="min-w-0 space-y-0.5">
                <div className="hidden items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 sm:flex">
                  <Sparkles className="h-3 w-3 stroke-[2.5]" />
                  <span>{copy.eyebrow}</span>
                </div>

                <h1 className="truncate text-xs font-bold tracking-tight text-gray-950 sm:text-sm">
                  {copy.title}
                </h1>

                <p className="truncate text-[11px] font-medium text-gray-400">
                  {copy.subtitle}
                </p>
              </div>
            </div>

            {/* Çevrimiçi / Canlı Durum Rozeti */}
            <div className="flex shrink-0 items-center gap-2 rounded-full border border-gray-100 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-500 shadow-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="hidden xs:inline sm:inline">
                {copy.status}
              </span>
            </div>
          </div>
        </header>

        {/* 2. ANA ASİSTAN İSTASYONU (Main) - Temiz Akış */}
        <main className="min-h-0 flex-1 overflow-hidden bg-gray-50/30 p-3 sm:p-5 lg:p-6">
          <div className="mx-auto flex h-full w-full max-w-[1280px] min-h-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
            <AIAssistant pageMode />
          </div>
        </main>
        
      </div>
    </div>
  );
}