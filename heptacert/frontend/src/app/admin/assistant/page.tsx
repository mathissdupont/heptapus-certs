"use client";

import { useEffect } from "react";
import PageHeader from "@/components/Admin/PageHeader";
import { MessageCircle, Command } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import AIAssistant from "@/components/Admin/AIAssistant";

export default function AdminAssistantPage() {
  const { lang } = useI18n();
  const copy = lang === "tr" ? { title: "Asistan", subtitle: "Gelişmiş sohbet ve etkinlik sihirbazı" } : { title: "Assistant", subtitle: "Advanced chat and event wizard" };

  useEffect(() => {
    // ensure any global theme flag favors light mode inside assistant page
    try { document.documentElement.setAttribute("data-theme", "light"); } catch {}
  }, []);

  return (
    <div data-theme="light" className="flex flex-col gap-6 pb-20">
      <PageHeader title={copy.title} subtitle={copy.subtitle} icon={<MessageCircle className="h-5 w-5" />} />
      <div className="mx-auto w-full max-w-[1400px]">
        <AIAssistant pageMode />
      </div>
    </div>
  );
}
