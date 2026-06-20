"use client";

import Link from "next/link";
import { CalendarDays, Presentation } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function AdminPresentationsPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const copy = {
    eyebrow: "HeptaDeck",
    title: isTr ? "Sunumlar etkinlik bazlı yönetilir" : "Presentations are managed per event",
    subtitle: isTr
      ? "PDF veya PowerPoint dosyalarını ilgili etkinliğin Sunumlar sekmesinden yükleyip sahne modunda sunabilirsiniz."
      : "Upload PDF or PowerPoint files from the Presentations tab inside each event, then present them in stage mode.",
    goEvents: isTr ? "Etkinliklere git" : "Go to events",
    note: isTr
      ? "Bu merkez sayfa, ileride tüm etkinlik sunumlarını tek yerden aramak için kullanılabilir. Şimdilik doğru bağlam etkinlik içidir."
      : "This hub can later list presentations across all events. For now, the right context is inside each event.",
  };

  return (
    <div className="page-content mx-auto max-w-3xl px-4 py-10">
      <div className="card p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-brand-50 p-3 text-brand-700">
            <Presentation className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="section-label">{copy.eyebrow}</p>
            <h1 className="page-title mt-2">{copy.title}</h1>
            <p className="page-subtitle">{copy.subtitle}</p>
            <p className="body-sm mt-4">{copy.note}</p>
            <Link href="/admin/events" className="btn-primary mt-6">
              <CalendarDays className="h-4 w-4" />
              {copy.goEvents}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
