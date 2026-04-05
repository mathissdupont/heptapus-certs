"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Loader2, MapPin, ShieldCheck, Ticket } from "lucide-react";
import { getPublicMemberMe, listMyPublicEvents, type PublicMemberEvent } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function formatDate(value: string | null | undefined, lang: "tr" | "en") {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function MyEventsPage() {
  const { lang } = useI18n();
  const [memberName, setMemberName] = useState("");
  const [items, setItems] = useState<PublicMemberEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            eyebrow: "Uye Alani",
            title: "Katildigim Etkinlikler",
            subtitle: "Giris yaptiginiz uye hesabina bagli kayitlari burada takip edebilirsiniz.",
            empty: "Bu hesaba bagli bir etkinlik kaydi bulunamadi.",
            loginRequired: "Bu alani gormek icin uye hesabinla giris yapmalisin.",
            goLogin: "Uye Girisi",
            openEvent: "Etkinligi Ac",
            status: "Durum Sayfasi",
            verified: "Dogrulandi",
            pending: "Dogrulama Bekliyor",
            attendance: "Katilim",
            fallback: "Etkinlikler yuklenemedi.",
            sessionWord: "oturum",
          }
        : {
            eyebrow: "Member Area",
            title: "My Events",
            subtitle: "Track the registrations linked to your signed-in member account.",
            empty: "There is no event registration linked to this account yet.",
            loginRequired: "Sign in with your member account to view this area.",
            goLogin: "Member Login",
            openEvent: "Open Event",
            status: "Status Page",
            verified: "Verified",
            pending: "Pending Verification",
            attendance: "Attendance",
            fallback: "Failed to load events.",
            sessionWord: "sessions",
          },
    [lang],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([getPublicMemberMe(), listMyPublicEvents()])
      .then(([member, events]) => {
        if (!active) return;
        setMemberName(member.display_name || member.email);
        setItems(events);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || copy.fallback);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [copy.fallback]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error?.includes("401") || error === "Oturum sona erdi.") {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm text-surface-500">{copy.loginRequired}</p>
        <Link href="/login?mode=member" className="btn-primary mt-4 inline-flex">
          {copy.goLogin}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <section className="card overflow-hidden px-6 py-8 sm:px-8">
        <div className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
          {copy.eyebrow}
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">{copy.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          {copy.subtitle}
          {memberName ? ` ${memberName}` : ""}
        </p>
      </section>

      {error && !error.includes("401") ? (
        <div className="error-banner">{error}</div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">{copy.empty}</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {items.map((item) => {
            const verified = item.email_verified;
            return (
              <article key={item.attendee_id} className="card overflow-hidden p-0">
                <div className="h-44 bg-slate-100">
                  {item.event_banner_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.event_banner_url} alt={item.event_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(59,130,246,0.06))] px-6 text-center text-lg font-semibold text-slate-700">
                      {item.event_name}
                    </div>
                  )}
                </div>
                <div className="space-y-4 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-bold text-slate-950">{item.event_name}</h2>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        verified
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {verified ? copy.verified : copy.pending}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-brand-500" />
                        {formatDate(item.event_date, lang)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-brand-500" />
                        {item.event_location || "-"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:col-span-2">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-brand-500" />
                        {copy.attendance}: {item.sessions_attended}/{item.min_sessions_required} {copy.sessionWord}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link href={`/events/${item.event_id}`} className="btn-primary inline-flex">
                      {copy.openEvent}
                    </Link>
                    {item.status_url ? (
                      <a href={item.status_url} className="btn-secondary inline-flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        {copy.status}
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}