"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MarketplaceEventOut, getMarketplaceEvent } from "@/lib/api";

export default function MarketplaceEventPage() {
  const params = useParams<{ event_id: string }>();
  const [event, setEvent] = useState<MarketplaceEventOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMarketplaceEvent(Number(params.event_id))
      .then(setEvent)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Yüklenemedi"))
      .finally(() => setLoading(false));
  }, [params.event_id]);

  if (loading) return <div className="p-12 text-center text-gray-400">Yükleniyor…</div>;
  if (error || !event) return (
    <div className="p-12 text-center">
      <p className="text-red-500">{error ?? "Program bulunamadı."}</p>
      <Link href="/marketplace" className="mt-4 inline-block text-indigo-600 text-sm underline">
        Marketplace'e dön
      </Link>
    </div>
  );

  const isFree = !event.marketplace_price || event.marketplace_price === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      {event.event_banner_url ? (
        <div className="w-full h-64 bg-gray-200 overflow-hidden">
          <img src={event.event_banner_url} alt={event.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
          <span className="text-7xl">🎓</span>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/marketplace" className="text-sm text-indigo-600 hover:underline mb-4 inline-block">
          ← Marketplace'e dön
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {event.marketplace_category && (
            <span className="inline-block text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full mb-3">
              {event.marketplace_category}
            </span>
          )}

          <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.name}</h1>

          {event.org_name && (
            <div className="flex items-center gap-2 mb-4">
              {event.org_logo && (
                <img src={event.org_logo} alt="" className="w-8 h-8 rounded-full object-cover" />
              )}
              <span className="text-sm text-gray-600">{event.org_name}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            {event.event_date && (
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Tarih</span>
                <p className="text-sm text-gray-700 mt-0.5">
                  {new Date(event.event_date).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
            {event.event_location && (
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Konum</span>
                <p className="text-sm text-gray-700 mt-0.5">{event.event_location}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Sertifika</span>
              <p className="text-sm mt-0.5">
                {event.certificate_enabled ? (
                  <span className="text-green-600 font-medium">✓ Var</span>
                ) : (
                  <span className="text-gray-400">Yok</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Ücret</span>
              <p className={`text-sm font-semibold mt-0.5 ${isFree ? "text-green-600" : "text-gray-900"}`}>
                {isFree ? "Ücretsiz" : `₺${event.marketplace_price?.toLocaleString("tr-TR")}`}
              </p>
            </div>
          </div>

          {event.marketplace_description && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Program Hakkında</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {event.marketplace_description}
              </p>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-gray-400 text-center">
              Bu programa katılmak için organizasyona başvurun.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
