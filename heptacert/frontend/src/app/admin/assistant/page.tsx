"use client";

import { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import AIAssistant from "@/components/Admin/AIAssistant";

export default function AdminAssistantPage() {
  const { lang } = useI18n();
  const copy = lang === "tr" 
    ? { title: "HeptaCertAI Asistan", subtitle: "Sistem ve etkinlik yönetim merkezi" } 
    : { title: "HeptaCert AI Assistant", subtitle: "System and event management center" };

  useEffect(() => {
    // Global temanın light mode kalmasını garanti altına alıyoruz
    try { 
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
    } catch {}
  }, []);

  return (
    <div 
      data-theme="light" 
      className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#fafafa] text-[#171717] antialiased"
    >
      {/* Ana İçerik Alanı: Esnek ve Tam Ekran Sohbet Düzeni */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* Üst Bar / Minimal Header */}
        <header className="flex h-16 items-center justify-between border-b border-[#e5e5e5] bg-white px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4f4f5] text-[#171717]">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">{copy.title}</h1>
              <p className="text-xs text-[#737373]">{copy.subtitle}</p>
            </div>
          </div>
          
          {/* İhtiyaca göre sağ tarafa bir durum badge'i veya ekstra buton koyabilirsin */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-[#737373]">Online</span>
          </div>
        </header>

        {/* Sohbet Alanı Konteyneri */}
        <main className="flex-1 overflow-y-auto p-6 flex justify-center items-stretch bg-[#fafafa]">
          <div className="w-full max-w-[1200px] bg-white rounded-xl border border-[#e5e5e5] shadow-sm overflow-hidden flex flex-col">
            <AIAssistant pageMode />
          </div>
        </main>
        
      </div>
    </div>
  );
}