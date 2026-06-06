"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

type MarketplaceEvent = {
  id: number;
  name: string;
  event_date: string | null;
  event_location: string | null;
  event_banner_url: string | null;
  certificate_enabled: boolean;
  org_name: string | null;
  org_logo: string | null;
  marketplace_category: string | null;
  marketplace_description: string | null;
  marketplace_price: number | null;
};

export default function EventDetailClient({ event }: { event: MarketplaceEvent }) {
  const { lang } = useI18n();

  const copy =
    lang === "tr"
      ? {
          backLink: "← Marketplace'e dön",
          date: "Tarih",
          location: "Konum",
          certificate: "Sertifika",
          certYes: "✓ Var",
          certNo: "Yok",
          price: "Ücret",
          free: "Ücretsiz",
          aboutProgram: "Program Hakkında",
          contactNote: "Bu programa katılmak için organizasyona başvurun.",
        }
      : {
          backLink: "← Back to Marketplace",
          date: "Date",
          location: "Location",
          certificate: "Certificate",
          certYes: "✓ Available",
          certNo: "None",
          price: "Price",
          free: "Free",
          aboutProgram: "About This Program",
          contactNote: "Contact the organizer to join this program.",
        };

  const isFree = !event.marketplace_price || event.marketplace_price === 0;
  const locale = lang === "tr" ? "tr-TR" : "en-GB";

  return (
    <div className="min-h-screen bg-surface-50">
      {event.event_banner_url ? (
        <div className="w-full h-56 bg-surface-200 overflow-hidden">
          <img
            src={event.event_banner_url}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-40 bg-surface-100 flex items-center justify-center border-b border-surface-200">
          <span className="text-5xl opacity-30">🎓</span>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/marketplace"
          className="text-sm text-surface-500 hover:text-surface-900 mb-4 inline-flex items-center gap-1 transition-colors"
        >
          {copy.backLink}
        </Link>

        <div className="bg-white rounded-xl border border-surface-200 p-6 mt-3">
          {event.marketplace_category && (
            <span className="inline-block text-xs bg-surface-100 text-surface-600 px-2 py-0.5 rounded-md mb-3 font-medium">
              {event.marketplace_category}
            </span>
          )}

          <h1 className="text-2xl font-bold text-surface-900 mb-2">{event.name}</h1>

          {event.org_name && (
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-surface-100">
              {event.org_logo && (
                <img
                  src={event.org_logo}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover"
                />
              )}
              <span className="text-sm text-surface-600">{event.org_name}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            {event.event_date && (
              <div>
                <span className="text-xs text-surface-400 uppercase tracking-wide font-medium">{copy.date}</span>
                <p className="text-sm text-surface-800 mt-1">
                  {new Date(event.event_date).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
            {event.event_location && (
              <div>
                <span className="text-xs text-surface-400 uppercase tracking-wide font-medium">{copy.location}</span>
                <p className="text-sm text-surface-800 mt-1">{event.event_location}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-surface-400 uppercase tracking-wide font-medium">{copy.certificate}</span>
              <p className="text-sm mt-1">
                {event.certificate_enabled ? (
                  <span className="text-green-600 font-medium">{copy.certYes}</span>
                ) : (
                  <span className="text-surface-400">{copy.certNo}</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-xs text-surface-400 uppercase tracking-wide font-medium">{copy.price}</span>
              <p className={`text-sm font-semibold mt-1 ${isFree ? "text-green-600" : "text-surface-900"}`}>
                {isFree ? copy.free : `₺${event.marketplace_price?.toLocaleString("tr-TR")}`}
              </p>
            </div>
          </div>

          {event.marketplace_description && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-surface-700 mb-2">{copy.aboutProgram}</h2>
              <p className="text-sm text-surface-600 leading-relaxed whitespace-pre-line">
                {event.marketplace_description}
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-surface-100">
            <p className="text-xs text-surface-400 text-center">
              {copy.contactNote}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
