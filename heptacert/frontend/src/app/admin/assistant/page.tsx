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
          status: "Online",
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
      className="flex h-[100dvh] w-full overflow-hidden bg-[#f7f7f8] text-[#171717] antialiased"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="shrink-0 border-b border-[#e5e5e5] bg-white/90 px-3 py-3 backdrop-blur sm:px-5 lg:px-6">
          <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#e5e5e5] bg-[#fafafa] text-[#171717] shadow-sm">
                <MessageCircle className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="mb-0.5 hidden items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8a8a] sm:flex">
                  <Sparkles className="h-3 w-3" />
                  <span>{copy.eyebrow}</span>
                </div>

                <h1 className="truncate text-sm font-semibold tracking-tight text-[#171717] sm:text-base">
                  {copy.title}
                </h1>

                <p className="truncate text-[11px] text-[#737373] sm:text-xs">
                  {copy.subtitle}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-full border border-[#e5e5e5] bg-[#fafafa] px-2.5 py-1.5 shadow-sm sm:px-3">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>

              <span className="hidden text-xs font-medium text-[#737373] xs:inline sm:inline">
                {copy.status}
              </span>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,#ffffff_0%,#f7f7f8_42%,#f2f2f3_100%)] p-2 sm:p-4 lg:p-6">
          <div className="mx-auto flex h-full w-full max-w-[1280px] min-h-0 overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-sm sm:rounded-3xl">
            <AIAssistant pageMode />
          </div>
        </main>
      </div>
    </div>
  );
}