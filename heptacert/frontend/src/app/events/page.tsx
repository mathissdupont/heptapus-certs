"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Search, Users, ArrowRight, ShieldCheck, Layers, Building2, MessageSquareMore } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { listPublicEvents, type PublicEventListItem } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { stripRichTextToPlainText } from "@/lib/richText";

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

const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const cardVariant = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };

export default function PublicEventsPage() {
  const { lang } = useI18n();
  const [upcomingItems, setUpcomingItems] = useState<PublicEventListItem[]>([]);
  const [pastItems, setPastItems] = useState<PublicEventListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(() => lang === "tr" ? {
    eyebrow: "Keşfet",
    title: "Yaklaşan Etkinlikler",
    subtitle: "Topluluk tarafından herkese açık olarak paylaşılan profesyonel seminer, eğitim ve organizasyonları keşfedin.",
    searchPlaceholder: "Etkinlik adı, kurum veya konum ara...",
    loading: "Etkinlikler yükleniyor...",
    error: "Etkinlikler yüklenirken bir sorun oluştu.",
    empty: "Aramanıza uygun açık etkinlik bulunamadı.",
    sessions: "Oturum",
    minSessions: "Sertifika Eşiği",
    details: "Detayları İncele",
    communities: "Toplulukları Keşfet",
    feed: "Community Feed",
  } : {
    eyebrow: "Discover",
    title: "Upcoming Events",
    subtitle: "Explore professional seminars, workshops, and organizations shared publicly by the community.",
    searchPlaceholder: "Search by event name, organization, or location...",
    loading: "Loading events...",
    error: "Failed to load events.",
    empty: "No public events found matching your search.",
    sessions: "Sessions",
    minSessions: "Cert. Threshold",
    details: "View Details",
    communities: "Explore Communities",
    feed: "Community Feed",
  }, [lang]);

  useEffect(() => {
    setLoading(true);
    const handle = window.setTimeout(() => {
      const normalizedSearch = search.trim();
      Promise.all([
        listPublicEvents({ scope: "upcoming", limit: 24, search: normalizedSearch || undefined }),
        listPublicEvents({ scope: "past", limit: 24, search: normalizedSearch || undefined }),
      ])
        .then(([upcomingData, pastData]) => {
          setUpcomingItems(upcomingData);
          setPastItems(pastData);
          setError(null);
        })
        .catch((err: any) => {
          setError(err?.message || copy.error);
          setUpcomingItems([]);
          setPastItems([]);
        })
        .finally(() => setLoading(false));
    }, search.trim() ? 250 : 0);

    return () => window.clearTimeout(handle);
  }, [copy.error, search]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 selection:bg-slate-200 pb-24">

      {/* HERO SECTION (Clean & Typographic) */}
      <section className="relative px-6 pt-16 pb-12 sm:px-10 lg:pt-24 lg:pb-16 text-center">
        <div className="mx-auto max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-500 shadow-sm">
            <Search className="h-3.5 w-3.5" />
            {copy.eyebrow}
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            {copy.title}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            {copy.subtitle}
          </motion.p>
        </div>

        {/* SEARCH BAR (Elevated & Prominent) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mx-auto mt-10 max-w-2xl relative z-10">
          <div className="relative flex items-center shadow-xl shadow-slate-200/50 rounded-2xl bg-white focus-within:ring-2 focus-within:ring-slate-900 transition-all">
            <Search className="absolute left-5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-2xl border-none bg-transparent py-4 pl-14 pr-6 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-5 text-xs font-bold text-slate-400 hover:text-slate-700 uppercase tracking-wide">
                Temizle
              </button>
            )}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/organizations" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:text-slate-950">
            <Building2 className="h-4 w-4" />
            {copy.communities}
          </Link>
          <Link href="/feed" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:text-slate-950">
            <MessageSquareMore className="h-4 w-4" />
            {copy.feed}
          </Link>
        </motion.div>
      </section>

      {/* EVENTS GRID */}
      <section className="mx-auto w-full max-w-7xl px-6 lg:px-8">
        {loading ? (
          /* SKELETON LOADER */
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="h-48 w-full animate-pulse bg-slate-200"></div>
                <div className="flex flex-1 flex-col p-6 space-y-4">
                  <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-full animate-pulse rounded bg-slate-200"></div>
                    <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200"></div>
                  </div>
                  <div className="mt-auto pt-6 border-t border-slate-100 flex gap-4">
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-200"></div>
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* ERROR STATE */
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 px-6 py-12 text-center">
            <ShieldCheck className="mb-4 h-10 w-10 text-rose-500" />
            <p className="text-sm font-bold text-rose-800">{error}</p>
          </div>
        ) : upcomingItems.length === 0 && pastItems.length === 0 ? (
          /* EMPTY STATE */
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-16 text-center">
            <Search className="mb-4 h-10 w-10 text-slate-300" />
            <p className="text-base font-bold text-slate-900">{copy.empty}</p>
            <p className="mt-2 text-sm text-slate-500">Arama terimini değiştirerek tekrar deneyebilirsiniz.</p>
          </div>
        ) : (
          <div className="space-y-10">
            <div>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900">{lang === "tr" ? "Yaklaşan Etkinlikler" : "Upcoming Events"}</h2>
                <span className="text-sm text-slate-500">{upcomingItems.length}</span>
              </div>
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {upcomingItems.map((item) => (
                    <motion.article
                      key={item.id}
                      layout
                      variants={cardVariant}
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group flex flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-xl"
                    >
                      <Link href={`/events/${item.public_id}`} className="flex flex-col h-full">
                        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                          {item.event_banner_url ? (
                            <img src={item.event_banner_url} alt={item.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-center">
                              <span className="text-xl font-bold text-white/80 line-clamp-2">{item.name}</span>
                            </div>
                          )}
                          <div className="absolute right-4 top-4 rounded-full bg-white/90 backdrop-blur-md px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-900 shadow-sm">
                            {item.session_count} {copy.sessions}
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col p-6 sm:p-8">
                          <h2 className="text-xl font-bold text-slate-900 line-clamp-2 group-hover:text-brand-600 transition-colors">{item.name}</h2>
                          {item.organization_public_id && item.organization_name ? <div className="mt-3"><span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">{item.organization_name}</span></div> : null}
                          {stripRichTextToPlainText(item.event_description) && <p className="mt-3 text-sm leading-relaxed text-slate-500 line-clamp-2">{stripRichTextToPlainText(item.event_description)}</p>}
                          <div className="mt-6 flex flex-col gap-3">
                            <div className="flex items-center gap-3 text-sm font-medium text-slate-600"><CalendarDays className="h-4 w-4 text-slate-400" /><span className="line-clamp-1">{formatDate(item.event_date, lang)}</span></div>
                            <div className="flex items-center gap-3 text-sm font-medium text-slate-600"><MapPin className="h-4 w-4 text-slate-400" /><span className="line-clamp-1">{item.event_location || "-"}</span></div>
                            <div className="flex items-center gap-3 text-sm font-medium text-slate-600"><Layers className="h-4 w-4 text-slate-400" /><span>{copy.minSessions}: <strong className="text-slate-900">{item.min_sessions_required}</strong></span></div>
                          </div>
                          <div className="mt-auto pt-6"><div className="flex items-center justify-between border-t border-slate-100 pt-5 text-sm font-bold text-slate-900">{copy.details}<ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-brand-600" /></div></div>
                        </div>
                      </Link>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>

            {pastItems.length > 0 ? (
              <div>
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-2xl font-black text-slate-900">{lang === "tr" ? "Geçmiş Etkinlikler" : "Past Events"}</h2>
                  <span className="text-sm text-slate-500">{pastItems.length}</span>
                </div>
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence>
                    {pastItems.map((item) => (
                      <motion.article
                        key={`past-${item.id}`}
                        layout
                        variants={cardVariant}
                        initial="hidden"
                        animate="show"
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group flex flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-xl"
                      >
                        <Link href={`/events/${item.public_id}`} className="flex flex-col h-full">
                          <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                            {item.event_banner_url ? (
                              <img src={item.event_banner_url} alt={item.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            ) : (
                              <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-center">
                                <span className="text-xl font-bold text-white/80 line-clamp-2">{item.name}</span>
                              </div>
                            )}
                            <div className="absolute right-4 top-4 rounded-full bg-white/90 backdrop-blur-md px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-900 shadow-sm">
                              {item.session_count} {copy.sessions}
                            </div>
                          </div>
                          <div className="flex flex-1 flex-col p-6 sm:p-8">
                            <h2 className="text-xl font-bold text-slate-900 line-clamp-2 group-hover:text-brand-600 transition-colors">{item.name}</h2>
                            {item.organization_public_id && item.organization_name ? <div className="mt-3"><span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">{item.organization_name}</span></div> : null}
                            {stripRichTextToPlainText(item.event_description) && <p className="mt-3 text-sm leading-relaxed text-slate-500 line-clamp-2">{stripRichTextToPlainText(item.event_description)}</p>}
                            <div className="mt-6 flex flex-col gap-3">
                              <div className="flex items-center gap-3 text-sm font-medium text-slate-600"><CalendarDays className="h-4 w-4 text-slate-400" /><span className="line-clamp-1">{formatDate(item.event_date, lang)}</span></div>
                              <div className="flex items-center gap-3 text-sm font-medium text-slate-600"><MapPin className="h-4 w-4 text-slate-400" /><span className="line-clamp-1">{item.event_location || "-"}</span></div>
                              <div className="flex items-center gap-3 text-sm font-medium text-slate-600"><Layers className="h-4 w-4 text-slate-400" /><span>{copy.minSessions}: <strong className="text-slate-900">{item.min_sessions_required}</strong></span></div>
                            </div>
                            <div className="mt-auto pt-6"><div className="flex items-center justify-between border-t border-slate-100 pt-5 text-sm font-bold text-slate-900">{copy.details}<ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-brand-600" /></div></div>
                          </div>
                        </Link>
                      </motion.article>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
