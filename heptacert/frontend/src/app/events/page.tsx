"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import { listPublicEvents, type PublicEventListItem } from "@/lib/api";
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

export default function PublicEventsPage() {
  const { lang } = useI18n();
  const [items, setItems] = useState<PublicEventListItem[]>([]);
  const [filtered, setFiltered] = useState<PublicEventListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            eyebrow: "Public Etkinlikler",
            title: "Keşfedilebilir etkinlikler",
            subtitle: "Organizatörlerin public olarak paylaştığı etkinlikleri burada keşfedebilir, detayları görüntüleyip kayıt akışına geçebilirsin.",
            searchPlaceholder: "Etkinlik adı veya konum ara",
            loading: "Etkinlikler yükleniyor...",
            error: "Etkinlikler yüklenemedi.",
            empty: "Henüz listelenen public etkinlik yok.",
            sessions: "oturum",
            minSessions: "Sertifika eşiği",
            details: "Detaya Git",
          }
        : {
            eyebrow: "Public Events",
            title: "Discover shared events",
            subtitle: "Browse the events that organizers decided to share publicly, review the details, and jump into registration.",
            searchPlaceholder: "Search by event name or location",
            loading: "Loading events...",
            error: "Failed to load events.",
            empty: "There are no public events listed yet.",
            sessions: "sessions",
            minSessions: "Certificate threshold",
            details: "View Details",
          },
    [lang]
  );

  useEffect(() => {
    setLoading(true);
    listPublicEvents()
      .then((data) => {
        setItems(data);
        setFiltered(data);
      })
      .catch((err: any) => {
        setError(err?.message || copy.error);
      })
      .finally(() => setLoading(false));
  }, [copy.error]);

  useEffect(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      setFiltered(items);
      return;
    }
    setFiltered(
      items.filter((item) =>
        [item.name, item.event_location, item.event_description].some((value) =>
          String(value || "").toLowerCase().includes(term),
        ),
      ),
    );
  }, [items, search]);

  return (
    <div className="space-y-8 pb-12">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),_transparent_30%),white] px-6 py-10 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:px-10">
        <div className="max-w-3xl">
          <div className="inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
            {copy.eyebrow}
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{copy.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{copy.subtitle}</p>
        </div>
        <div className="mt-8 max-w-xl">
          <label className="relative block">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-white px-12 py-3.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            />
          </label>
        </div>
      </section>

      {loading ? (
        <div className="card p-10 text-center text-sm text-slate-500">{copy.loading}</div>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">{copy.empty}</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map((item) => (
            <article key={item.id} className="card overflow-hidden p-0">
              <div className="h-44 bg-slate-100">
                {item.event_banner_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.event_banner_url} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(59,130,246,0.06))] text-lg font-semibold text-slate-600">
                    {item.name}
                  </div>
                )}
              </div>
              <div className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950">{item.name}</h2>
                    {item.event_description && (
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.event_description}</p>
                    )}
                  </div>
                  <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                    {item.session_count} {copy.sessions}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2 text-slate-900">
                      <CalendarDays className="h-4 w-4 text-brand-500" />
                      {formatDate(item.event_date, lang)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2 text-slate-900">
                      <MapPin className="h-4 w-4 text-brand-500" />
                      {item.event_location || "-"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:col-span-2">
                    <div className="flex items-center gap-2 text-slate-900">
                      <Users className="h-4 w-4 text-brand-500" />
                      {copy.minSessions}: {item.min_sessions_required}
                    </div>
                  </div>
                </div>

                <Link href={`/events/${item.id}`} className="btn-primary inline-flex justify-center">
                  {copy.details}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
