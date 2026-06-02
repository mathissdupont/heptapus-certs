"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import type { EventOut } from "@/lib/api";

type EventSetupChecklistProps = {
  event: EventOut;
  overview?: {
    attendees?: number;
    sessions?: number;
    active_certificates?: number;
  } | null;
  lang?: "tr" | "en";
};

export default function EventSetupChecklist({ event, overview, lang = "tr" }: EventSetupChecklistProps) {
  const eventId = event.id;
  const registrationFields = event.config?.registration_fields;
  const hasRegistrationFields = Array.isArray(registrationFields) && registrationFields.length > 0;
  const hasKvkkText = typeof event.config?.kvkk_consent_text === "string" && event.config.kvkk_consent_text.trim().length > 0;
  
  const items = [
    {
      label: lang === "tr" ? "Temel bilgileri tamamla" : "Complete basics",
      done: Boolean(event.name && event.event_date),
      href: `/admin/events/${eventId}/settings`,
    },
    {
      label: lang === "tr" ? "Kayıt formu ve KVKK metnini kontrol et" : "Review form and privacy notice",
      done: hasRegistrationFields || hasKvkkText,
      href: `/admin/events/${eventId}/settings`,
    },
    {
      label: lang === "tr" ? "Katılımcı akışını başlat" : "Start attendee flow",
      done: Boolean((overview?.attendees || 0) > 0),
      href: `/admin/events/${eventId}/attendees`,
    },
    {
      label: lang === "tr" ? "Oturum / check-in planını hazırla" : "Prepare sessions / check-in",
      done: event.checkin_enabled === false || Boolean((overview?.sessions || 0) > 0),
      href: `/admin/events/${eventId}/sessions`,
    },
    {
      label: lang === "tr" ? "Sertifika tasarımını doğrula" : "Validate certificate design",
      done: event.certificate_enabled === false || Boolean((overview?.active_certificates || 0) > 0),
      href: `/admin/events/${eventId}/editor`,
    },
  ];
  
  const doneCount = items.filter((item) => item.done).length;
  const progressPercent = Math.round((doneCount / items.length) * 100);

  return (
    <div className="w-full rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-sm antialiased">
      {/* Üst Başlık Bölümü */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {lang === "tr" ? "Kurulum Kontrolü" : "Setup Checklist"}
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-gray-950">
            {doneCount}/{items.length} {lang === "tr" ? "Adım Tamamlandı" : "Steps Completed"}
          </h2>
        </div>
        
        {/* Apple Tarzı Soft Yüzde Rozeti */}
        <div className="inline-flex items-center rounded-full bg-gray-50 border border-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-600 shadow-sm">
          %{progressPercent}
        </div>
      </div>

      {/* İlerleme Çubuğu (Progress Bar) - UX Geliştirmesi */}
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-gray-100">
        <div 
          className="h-full bg-gray-900 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Liste Alanı - Tek Bir Kart İçinde Bölücülerle Akış */}
      <div className="mt-5 overflow-hidden rounded-xl border border-gray-100 bg-gray-50/30 divide-y divide-gray-100">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group flex items-center justify-between gap-3 px-4 py-3.5 bg-white transition-all hover:bg-gray-50/50 active:bg-gray-50"
          >
            {/* Sol Durum ve Metin */}
            <span className="flex min-w-0 items-center gap-3 text-xs font-medium tracking-tight">
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 stroke-[2.5]" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-gray-300 stroke-[2]" />
              )}
              <span className={`truncate ${item.done ? "text-gray-400 line-through decoration-gray-200" : "text-gray-700 font-semibold group-hover:text-gray-950"}`}>
                {item.label}
              </span>
            </span>
            
            {/* Sağ Ok İşareti */}
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-300 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-gray-600" />
          </Link>
        ))}
      </div>
    </div>
  );
}