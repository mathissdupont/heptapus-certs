"use client";

import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

import type { EventOut } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/locales/tr";

export type EventSetupOverview = {
  attendees?: number;
  sessions?: number;
  active_certificates?: number;
};

export type EventSetupItem = {
  key: string;
  label: string;
  done: boolean;
  href: string;
};

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export function buildEventSetupItems(
  event: EventOut,
  overview: EventSetupOverview | null | undefined,
  t: Translate,
): EventSetupItem[] {
  const eventId = event.id;
  const registrationFields = event.config?.registration_fields;
  const hasRegistrationFields = Array.isArray(registrationFields) && registrationFields.length > 0;
  const consentText = event.config?.kvkk_consent_text;
  const hasConsentText = typeof consentText === "string" && consentText.trim().length > 0;

  return [
    {
      key: "basics",
      label: t("event_setup_basics"),
      done: Boolean(event.name && event.event_date),
      href: `/admin/events/${eventId}/settings`,
    },
    {
      key: "registration",
      label: t("event_setup_registration"),
      done: hasRegistrationFields || hasConsentText,
      href: `/admin/events/${eventId}/settings`,
    },
    {
      key: "attendees",
      label: t("event_setup_attendees"),
      done: Boolean((overview?.attendees || 0) > 0),
      href: `/admin/events/${eventId}/attendees`,
    },
    {
      key: "sessions",
      label: t("event_setup_sessions"),
      done: event.checkin_enabled === false || Boolean((overview?.sessions || 0) > 0),
      href: `/admin/events/${eventId}/sessions`,
    },
    {
      key: "certificate",
      label: t("event_setup_certificate"),
      done: event.certificate_enabled === false || Boolean((overview?.active_certificates || 0) > 0),
      href: `/admin/events/${eventId}/editor`,
    },
  ];
}

export function firstPendingEventSetupItem(items: EventSetupItem[]) {
  return items.find((item) => !item.done) ?? null;
}

export default function EventSetupChecklist({
  event,
  overview,
  compact = false,
}: {
  event: EventOut;
  overview?: EventSetupOverview | null;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const items = buildEventSetupItems(event, overview, t);
  const doneCount = items.filter((item) => item.done).length;
  const progressPercent = Math.round((doneCount / items.length) * 100);

  return (
    <section className="w-full rounded-2xl border border-outline-subtle bg-raised p-5 shadow-soft sm:p-6" aria-labelledby={`event-setup-${event.id}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-11 font-bold uppercase tracking-widest text-content-faint">{t("event_setup_eyebrow")}</p>
          <h2 id={`event-setup-${event.id}`} className="mt-1 text-base font-semibold tracking-tight text-content-primary">
            {t("event_setup_progress", { done: doneCount, total: items.length })}
          </h2>
        </div>
        <div className="inline-flex items-center rounded-full border border-outline-subtle bg-sunken px-2.5 py-0.5 text-11 font-bold text-content-muted shadow-soft">
          {progressPercent}%
        </div>
      </div>

      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-sunken">
        <div className="h-full bg-accent-strong transition-[width] duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className={`mt-5 overflow-hidden rounded-xl border border-outline-subtle bg-canvas ${compact ? "divide-y divide-outline-subtle" : "space-y-1 p-1"}`}>
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="group flex min-h-12 items-center justify-between gap-3 bg-raised px-4 py-3 transition-colors hover:bg-sunken"
          >
            <span className="flex min-w-0 items-center gap-3 text-xs font-medium tracking-tight">
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success-content" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-content-faint" aria-hidden="true" />
              )}
              <span className={item.done ? "truncate text-content-faint line-through" : "truncate font-semibold text-content-secondary group-hover:text-content-primary"}>
                {item.label}
              </span>
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-content-faint transition-transform group-hover:translate-x-0.5 group-hover:text-content-muted" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
