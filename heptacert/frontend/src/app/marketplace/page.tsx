"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, Search, Loader2 } from "lucide-react";
import { MarketplaceEventOut, listMarketplaceEvents, listMarketplaceCategories } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type CardCopy = {
  free: string;
};

function EventCard({ event, cardCopy }: { event: MarketplaceEventOut; cardCopy: CardCopy }) {
  const isFree = !event.marketplace_price || event.marketplace_price === 0;

  return (
    <Link
      href={`/marketplace/${event.id}`}
      className="group block bg-white rounded-xl border border-surface-200 overflow-hidden hover:shadow-md transition-all duration-200"
    >
      {event.event_banner_url ? (
        <div className="overflow-hidden">
          <img
            src={event.event_banner_url}
            alt={event.name}
            className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="w-full h-40 bg-surface-100 flex items-center justify-center">
          <span className="text-4xl opacity-40">🎓</span>
        </div>
      )}
      <div className="p-4">
        {event.marketplace_category && (
          <span className="inline-block text-xs bg-surface-100 text-surface-600 px-2 py-0.5 rounded-md mb-2 font-medium">
            {event.marketplace_category}
          </span>
        )}
        <h3 className="font-semibold text-surface-900 group-hover:text-surface-700 line-clamp-2 mb-1 text-sm leading-snug">
          {event.name}
        </h3>
        {event.marketplace_description && (
          <p className="text-xs text-surface-500 line-clamp-2 mb-3 leading-relaxed">
            {event.marketplace_description}
          </p>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-surface-100">
          <div className="flex items-center gap-1.5 text-xs text-surface-400 min-w-0">
            {event.org_logo && (
              <img src={event.org_logo} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
            )}
            {event.org_name && <span className="truncate">{event.org_name}</span>}
          </div>
          <span className={`text-sm font-semibold flex-shrink-0 ml-2 ${isFree ? "text-green-600" : "text-surface-900"}`}>
            {isFree ? cardCopy.free : `₺${event.marketplace_price?.toLocaleString("tr-TR")}`}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function MarketplacePage() {
  const [events, setEvents] = useState<MarketplaceEventOut[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);

  const { lang } = useI18n();

  const copy =
    lang === "tr"
      ? {
          pageTitle: "Eğitim Marketplace",
          pageSubtitle: "Sertifikalı program ve profesyonel gelişim kurslarını keşfedin",
          searchPlaceholder: "Program veya organizasyon ara…",
          allFilter: "Tümü",
          freeOnlyLabel: "Sadece Ücretsiz",
          noResults: "Bu kriterlere uygun program bulunamadı.",
          free: "Ücretsiz",
        }
      : {
          pageTitle: "Training Marketplace",
          pageSubtitle: "Discover certified programs and professional development courses",
          searchPlaceholder: "Search programs or organizations…",
          allFilter: "All",
          freeOnlyLabel: "Free Only",
          noResults: "No programs found matching these criteria.",
          free: "Free",
        };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMarketplaceEvents({
        q: search || undefined,
        category: selectedCategory || undefined,
        free_only: freeOnly || undefined,
      });
      setEvents(data);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, freeOnly]);

  useEffect(() => {
    listMarketplaceCategories().then(setCategories);
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <div className="bg-white border-b border-surface-200 px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-surface-900 mb-1">{copy.pageTitle}</h1>
          <p className="text-surface-500 text-sm mb-4">
            {copy.pageSubtitle}
          </p>
          {/* Category tabs: Events / Courses */}
          <div className="flex gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-900 text-white text-sm font-medium">
              <CalendarDays className="w-4 h-4" />
              {lang === "tr" ? "Etkinlikler" : "Events"}
            </span>
            <Link
              href="/marketplace/courses"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-surface-200 text-surface-600 text-sm font-medium hover:bg-surface-100 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              {lang === "tr" ? "Kurslar" : "Courses"}
            </Link>
          </div>
          {/* Search */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-900 placeholder:text-surface-400 bg-white focus:outline-none focus:ring-2 focus:ring-surface-900 focus:border-transparent transition"
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6 items-center">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                !selectedCategory
                  ? "bg-surface-900 text-white border-surface-900"
                  : "bg-white text-surface-600 border-surface-200 hover:border-surface-400 hover:text-surface-900"
              }`}
            >
              {copy.allFilter}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? "" : cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedCategory === cat
                    ? "bg-surface-900 text-white border-surface-900"
                    : "bg-white text-surface-600 border-surface-200 hover:border-surface-400 hover:text-surface-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-2 text-xs text-surface-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(e) => setFreeOnly(e.target.checked)}
              className="rounded border-surface-300"
            />
            {copy.freeOnlyLabel}
          </label>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-4xl mb-3 opacity-30">📭</p>
            <p className="text-surface-500 text-sm">{copy.noResults}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {events.map((e) => (
              <EventCard key={e.id} event={e} cardCopy={{ free: copy.free }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
