"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Search, Building2, ArrowRight, ShieldCheck, Ticket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { listPublicEvents, type PublicEventListItem } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { stripRichTextToPlainText } from "@/lib/richText";
import { fetchCurrentBranding, isWhiteLabelBranding } from "@/lib/whiteLabel";

function formatDate(value: string | null | undefined, lang: "tr" | "en") {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

const EVENT_TYPE_LABELS: Record<string, { tr: string; en: string }> = {
  certificate_event: { tr: "Sertifika",  en: "Certificate" },
  seminar:           { tr: "Seminer",    en: "Seminar"      },
  workshop:          { tr: "Atölye",     en: "Workshop"     },
  conference:        { tr: "Konferans",  en: "Conference"   },
  concert:           { tr: "Konser",     en: "Concert"      },
  training:          { tr: "Eğitim",     en: "Training"     },
  club_event:        { tr: "Kulüp",      en: "Club"         },
  online_event:      { tr: "Online",     en: "Online"       },
  custom:            { tr: "Özel",       en: "Custom"       },
};

function eventTypeLabel(item: PublicEventListItem, lang: "tr" | "en") {
  const key = item.event_type || "certificate_event";
  return EVENT_TYPE_LABELS[key]?.[lang] || key;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const cardAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

export default function PublicEventsPage() {
  const { lang } = useI18n();
  const router = useRouter();
  const [upcomingItems, setUpcomingItems] = useState<PublicEventListItem[]>([]);
  const [pastItems, setPastItems] = useState<PublicEventListItem[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [whiteLabelChecked, setWhiteLabelChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            title: "Etkinlikler",
            subtitle: "Topluluklar tarafından paylaşılan herkese açık etkinlikleri keşfedin.",
            searchPlaceholder: "Etkinlik, kurum veya konum ara...",
            error: "Etkinlikler yüklenirken bir sorun oluştu.",
            empty: "Aramanıza uygun etkinlik bulunamadı.",
            details: "Detaylar",
            communities: "Topluluklar",
            allTypes: "Tüm Türler",
            upcoming: "Yaklaşan Etkinlikler",
            past: "Geçmiş Etkinlikler",
            sessions: "oturum",
            certificate: "Sertifika",
            ticketed: "Biletli",
            raffle: "Çekiliş",
          }
        : {
            title: "Events",
            subtitle: "Discover public events shared by communities.",
            searchPlaceholder: "Search events, organization, or location...",
            error: "Failed to load events.",
            empty: "No events match your search.",
            details: "Details",
            communities: "Communities",
            allTypes: "All Types",
            upcoming: "Upcoming Events",
            past: "Past Events",
            sessions: "sessions",
            certificate: "Certificate",
            ticketed: "Ticketed",
            raffle: "Raffle",
          },
    [lang],
  );

  const typeOptions = useMemo(() => {
    const seen = new Set<string>();
    [...upcomingItems, ...pastItems].forEach((item) =>
      seen.add(item.event_type || "certificate_event"),
    );
    return Array.from(seen).sort();
  }, [pastItems, upcomingItems]);

  const visibleUpcoming = useMemo(
    () =>
      typeFilter === "all"
        ? upcomingItems
        : upcomingItems.filter((item) => (item.event_type || "certificate_event") === typeFilter),
    [typeFilter, upcomingItems],
  );
  const visiblePast = useMemo(
    () =>
      typeFilter === "all"
        ? pastItems
        : pastItems.filter((item) => (item.event_type || "certificate_event") === typeFilter),
    [pastItems, typeFilter],
  );

  useEffect(() => {
    if (typeFilter !== "all" && typeOptions.length > 0 && !typeOptions.includes(typeFilter)) {
      setTypeFilter("all");
    }
  }, [typeFilter, typeOptions]);

  useEffect(() => {
    let active = true;
    fetchCurrentBranding()
      .then((branding) => {
        if (!active) return;
        if (isWhiteLabelBranding(branding, typeof window !== "undefined" ? window.location.hostname : "")) {
          router.replace("/");
          return;
        }
        setWhiteLabelChecked(true);
      })
      .catch(() => {
        if (active) setWhiteLabelChecked(true);
      });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!whiteLabelChecked) return;
    setLoading(true);
    const handle = window.setTimeout(() => {
      const q = search.trim();
      Promise.all([
        listPublicEvents({ scope: "upcoming", limit: 24, search: q || undefined }),
        listPublicEvents({ scope: "past",     limit: 24, search: q || undefined }),
      ])
        .then(([upcoming, past]) => {
          setUpcomingItems(upcoming);
          setPastItems(past);
          setError(null);
        })
        .catch((err: unknown) => {
          setError((err as { message?: string })?.message || copy.error);
          setUpcomingItems([]);
          setPastItems([]);
        })
        .finally(() => setLoading(false));
    }, search.trim() ? 250 : 0);

    return () => window.clearTimeout(handle);
  }, [copy.error, search, whiteLabelChecked]);

  return (
    <div className="flex min-h-screen flex-col bg-surface-50 pb-24">
      {/* Header */}
      <section className="border-b border-surface-200 bg-white px-4 pb-8 pt-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold tracking-tight text-surface-900 sm:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-1.5 text-base text-surface-500">{copy.subtitle}</p>

          {/* Search + filter toolbar */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={copy.searchPlaceholder}
                className="input-field pl-9"
              />
            </div>

            {typeOptions.length > 1 && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input-field sm:w-48"
              >
                <option value="all">{copy.allTypes}</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {EVENT_TYPE_LABELS[type]?.[lang] || type}
                  </option>
                ))}
              </select>
            )}

            <Link href="/organizations" className="btn-ghost shrink-0 text-sm">
              <Building2 className="h-4 w-4" />
              {copy.communities}
            </Link>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-surface-100 bg-white shadow-card animate-pulse">
                <div className="aspect-video bg-surface-100" />
                <div className="space-y-2.5 p-4">
                  <div className="h-3 w-16 rounded bg-surface-100" />
                  <div className="h-4 w-3/4 rounded bg-surface-100" />
                  <div className="h-3 w-1/2 rounded bg-surface-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="error-banner mx-auto max-w-md justify-center">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : visibleUpcoming.length === 0 && visiblePast.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-surface-200 bg-surface-50">
              <Search className="h-5 w-5 text-surface-400" />
            </div>
            <p className="text-sm font-medium text-surface-700">{copy.empty}</p>
          </div>
        ) : (
          <div className="space-y-10">
            <EventSection
              title={copy.upcoming}
              count={visibleUpcoming.length}
              items={visibleUpcoming}
              lang={lang}
              copy={copy}
            />
            {visiblePast.length > 0 && (
              <EventSection
                title={copy.past}
                count={visiblePast.length}
                items={visiblePast}
                lang={lang}
                copy={copy}
                muted
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function EventSection({
  title,
  count,
  items,
  lang,
  copy,
  muted = false,
}: {
  title: string;
  count: number;
  items: PublicEventListItem[];
  lang: "tr" | "en";
  copy: Record<string, string>;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className={`text-lg font-semibold ${muted ? "text-surface-500" : "text-surface-900"}`}>
          {title}
        </h2>
        <span className="text-sm text-surface-400">{count}</span>
      </div>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <AnimatePresence>
          {items.map((item) => (
            <EventCard key={item.id} item={item} lang={lang} copy={copy} muted={muted} />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function EventCard({
  item,
  lang,
  copy,
  muted,
}: {
  item: PublicEventListItem;
  lang: "tr" | "en";
  copy: Record<string, string>;
  muted: boolean;
}) {
  const typeLabel = eventTypeLabel(item, lang);
  const dateStr = formatDate(item.event_date, lang);
  const description = stripRichTextToPlainText(item.event_description);

  return (
    <motion.article
      variants={cardAnim}
      layout
      exit={{ opacity: 0 }}
      className={`group overflow-hidden rounded-xl border bg-white shadow-card transition-shadow hover:shadow-raised ${
        muted ? "border-surface-150 opacity-80" : "border-surface-200"
      }`}
    >
      <Link href={`/events/${item.public_id}`} className="flex h-full flex-col">
        {/* Banner */}
        <div className="relative aspect-video w-full overflow-hidden bg-surface-100">
          {item.event_banner_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.event_banner_url}
              alt={item.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-surface-800 p-6 text-center">
              <span className="line-clamp-2 text-base font-semibold text-white/70">
                {item.name}
              </span>
            </div>
          )}
          {/* Type badge */}
          <div className="absolute left-3 top-3 rounded-md border border-white/20 bg-black/50 px-2 py-0.5 text-11 font-medium uppercase tracking-wide text-white backdrop-blur-sm">
            {typeLabel}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          {/* Title */}
          <h3 className="line-clamp-2 text-sm font-semibold text-surface-900 group-hover:text-surface-700 transition-colors">
            {item.name}
          </h3>

          {/* Org name */}
          {item.organization_name && (
            <p className="mt-1 truncate text-xs text-surface-500">{item.organization_name}</p>
          )}

          {/* Description */}
          {description && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-surface-400">
              {description}
            </p>
          )}

          {/* Date + location */}
          <div className="mt-3 space-y-1">
            {dateStr && (
              <div className="flex items-center gap-1.5 text-xs text-surface-400">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                {dateStr}
              </div>
            )}
            {item.event_location && (
              <div className="flex items-center gap-1.5 text-xs text-surface-400">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{item.event_location}</span>
              </div>
            )}
          </div>

          {/* Feature tags + CTA */}
          <div className="mt-auto flex items-center justify-between pt-3 border-t border-surface-100 mt-3">
            <div className="flex flex-wrap gap-1.5">
              {item.certificate_enabled && !item.ticketing_enabled && (
                <span className="badge-neutral text-11">
                  <ShieldCheck className="h-3 w-3" /> {copy.certificate}
                </span>
              )}
              {item.ticketing_enabled && (
                <span className="badge-neutral text-11">
                  <Ticket className="h-3 w-3" /> {copy.ticketed}
                </span>
              )}
              {item.raffles_enabled && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-11 font-medium text-amber-700">
                  {copy.raffle}
                </span>
              )}
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-surface-500 group-hover:text-surface-900 transition-colors">
              {copy.details} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
