"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, MapPin, Users } from "lucide-react";
import { getPublicEventDetail, type PublicEventDetail } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function formatDate(value: string | null | undefined, lang: "tr" | "en") {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function PublicEventDetailPage() {
  const params = useParams();
  const eventId = Number(params.id);
  const { lang } = useI18n();
  const [event, setEvent] = useState<PublicEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            back: "Etkinlik listesine dön",
            loading: "Etkinlik detayları yükleniyor...",
            error: "Etkinlik detayları yüklenemedi.",
            register: "Etkinliğe Kayıt Ol",
            sessions: "Oturumlar",
            customFields: "Kayıt formunda istenecek bilgiler",
            minSessions: "Sertifika için minimum oturum",
            unlisted: "Liste dışı paylaşım",
            noSessions: "Henüz oturum eklenmedi.",
          }
        : {
            back: "Back to events",
            loading: "Loading event details...",
            error: "Failed to load event details.",
            register: "Register for Event",
            sessions: "Sessions",
            customFields: "Additional registration fields",
            minSessions: "Minimum sessions for certificate",
            unlisted: "Unlisted share",
            noSessions: "No session has been added yet.",
          },
    [lang]
  );

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    getPublicEventDetail(eventId)
      .then((data) => setEvent(data))
      .catch((err: any) => setError(err?.message || copy.error))
      .finally(() => setLoading(false));
  }, [copy.error, eventId]);

  if (loading) {
    return <div className="card p-10 text-center text-sm text-slate-500">{copy.loading}</div>;
  }

  if (error || !event) {
    return (
      <div className="space-y-4">
        <Link href="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          {copy.back}
        </Link>
        <div className="error-banner">{error || copy.error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <Link href="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        {copy.back}
      </Link>

      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.08)]">
        <div className="h-56 bg-slate-100">
          {event.event_banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.event_banner_url} alt={event.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,rgba(56,189,248,0.18),rgba(59,130,246,0.08))] text-3xl font-black text-slate-800">
              {event.name}
            </div>
          )}
        </div>
        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {event.visibility === "unlisted" && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {copy.unlisted}
                  </span>
                )}
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {copy.minSessions}: {event.min_sessions_required}
                </span>
              </div>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">{event.name}</h1>
              {event.event_description && (
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{event.event_description}</p>
              )}
            </div>
            <Link href={`/events/${event.id}/register`} className="btn-primary inline-flex justify-center">
              {copy.register}
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-center gap-2 text-slate-900">
                <CalendarDays className="h-4 w-4 text-brand-500" />
                {formatDate(event.event_date, lang)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-center gap-2 text-slate-900">
                <MapPin className="h-4 w-4 text-brand-500" />
                {event.event_location || "-"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-center gap-2 text-slate-900">
                <Users className="h-4 w-4 text-brand-500" />
                {event.sessions.length} {copy.sessions.toLowerCase()}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-6">
          <h2 className="text-2xl font-bold text-slate-950">{copy.sessions}</h2>
          <div className="mt-5 space-y-4">
            {event.sessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                {copy.noSessions}
              </div>
            ) : (
              event.sessions.map((session, index) => (
                <div key={session.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {lang === "tr" ? `Oturum ${index + 1}` : `Session ${index + 1}`}
                  </div>
                  <div className="mt-2 text-lg font-bold text-slate-900">{session.name}</div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-brand-500" />
                      {formatDate(session.session_date, lang)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-brand-500" />
                      {session.session_start || "-"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-brand-500" />
                      {session.session_location || "-"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-2xl font-bold text-slate-950">{copy.customFields}</h2>
          <div className="mt-5 space-y-3">
            {event.registration_fields.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                {lang === "tr"
                  ? "Bu etkinlikte standart ad ve e-posta alanları kullanılıyor."
                  : "This event currently uses the standard name and email fields only."}
              </div>
            ) : (
              event.registration_fields.map((field) => (
                <div key={field.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-slate-900">{field.label}</div>
                    {field.required && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {lang === "tr" ? "Zorunlu" : "Required"}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    {field.helper_text || (lang === "tr" ? "Kayıt sırasında doldurulacak ek alan." : "Additional field collected during registration.")}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
