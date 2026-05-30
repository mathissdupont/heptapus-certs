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

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-500">
            {lang === "tr" ? "Kurulum kontrolü" : "Setup checklist"}
          </p>
          <h2 className="mt-2 text-lg font-black text-surface-950">
            {doneCount}/{items.length} {lang === "tr" ? "adım tamam" : "done"}
          </h2>
        </div>
        <div className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
          %{Math.round((doneCount / items.length) * 100)}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group flex items-center justify-between gap-3 rounded-2xl border border-surface-200 bg-white px-3 py-3 transition hover:border-brand-200 hover:bg-brand-50/40"
          >
            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-surface-700">
              {item.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-surface-300" />}
              <span className="truncate">{item.label}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-surface-300 transition group-hover:text-brand-600" />
          </Link>
        ))}
      </div>
    </div>
  );
}
