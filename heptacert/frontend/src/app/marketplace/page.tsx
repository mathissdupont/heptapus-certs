"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { MarketplaceEventOut, listMarketplaceEvents, listMarketplaceCategories } from "@/lib/api";

function EventCard({ event }: { event: MarketplaceEventOut }) {
  const isFree = !event.marketplace_price || event.marketplace_price === 0;

  return (
    <Link
      href={`/marketplace/${event.id}`}
      className="group block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      {event.event_banner_url ? (
        <img
          src={event.event_banner_url}
          alt={event.name}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
          <span className="text-5xl">🎓</span>
        </div>
      )}
      <div className="p-4">
        {event.marketplace_category && (
          <span className="inline-block text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full mb-2">
            {event.marketplace_category}
          </span>
        )}
        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 line-clamp-2 mb-1">
          {event.name}
        </h3>
        {event.marketplace_description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{event.marketplace_description}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {event.org_logo && (
              <img src={event.org_logo} alt="" className="w-5 h-5 rounded-full object-cover" />
            )}
            {event.org_name && <span>{event.org_name}</span>}
          </div>
          <span
            className={`text-sm font-semibold ${isFree ? "text-green-600" : "text-gray-900"}`}
          >
            {isFree ? "Ücretsiz" : `₺${event.marketplace_price?.toLocaleString("tr-TR")}`}
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
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-3">Sertifika Marketplace</h1>
          <p className="text-indigo-200 text-lg mb-8">
            Profesyonel gelişiminiz için binlerce sertifika programı
          </p>
          <div className="relative max-w-lg mx-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Program ara…"
              className="w-full px-5 py-3 rounded-full text-gray-900 text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <span className="absolute right-4 top-3 text-gray-400 text-lg">🔍</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8 items-center">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory("")}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                !selectedCategory
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
              }`}
            >
              Tümü
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? "" : cat)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(e) => setFreeOnly(e.target.checked)}
              className="rounded"
            />
            Sadece Ücretsiz
          </label>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Yükleniyor…</div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">📭</p>
            <p className="text-gray-500">Bu kriterlere uygun program bulunamadı.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
