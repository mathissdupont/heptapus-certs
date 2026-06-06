import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

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

const apiBase =
  process.env.NEXT_SERVER_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://cert.heptapusgroup.com/api";

async function fetchEvent(eventId: string): Promise<MarketplaceEvent | null> {
  try {
    const res = await fetch(`${apiBase}/public/marketplace/${eventId}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ event_id: string }>;
}): Promise<Metadata> {
  const { event_id } = await params;
  const event = await fetchEvent(event_id);

  if (!event) {
    return { title: "Program Bulunamadı", robots: { index: false } };
  }

  const title = `${event.name} — HeptaCert Marketplace`;
  const description =
    event.marketplace_description ??
    `${event.org_name ? event.org_name + " tarafından sunulan " : ""}${event.name} programı. ${event.certificate_enabled ? "Sertifikalı program." : ""}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `/marketplace/${event_id}`,
      images: event.event_banner_url ? [{ url: event.event_banner_url }] : undefined,
    },
    alternates: { canonical: `/marketplace/${event_id}` },
    robots: { index: true, follow: true },
  };
}

export default async function MarketplaceEventPage({
  params,
}: {
  params: Promise<{ event_id: string }>;
}) {
  const { event_id } = await params;
  const event = await fetchEvent(event_id);

  if (!event) notFound();

  const isFree = !event.marketplace_price || event.marketplace_price === 0;
  const baseUrl =
    process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || "https://cert.heptapusgroup.com";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: event.name,
    description: event.marketplace_description ?? event.name,
    provider: event.org_name
      ? { "@type": "Organization", name: event.org_name }
      : undefined,
    url: `${baseUrl}/marketplace/${event_id}`,
    image: event.event_banner_url ?? undefined,
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: event.event_location ? "onsite" : "online",
      location: event.event_location ?? undefined,
      startDate: event.event_date ?? undefined,
    },
    offers: {
      "@type": "Offer",
      price: isFree ? "0" : String(event.marketplace_price),
      priceCurrency: "TRY",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

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
            ← Marketplace&apos;e dön
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
                  <span className="text-xs text-surface-400 uppercase tracking-wide font-medium">Tarih</span>
                  <p className="text-sm text-surface-800 mt-1">
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
                  <span className="text-xs text-surface-400 uppercase tracking-wide font-medium">Konum</span>
                  <p className="text-sm text-surface-800 mt-1">{event.event_location}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-surface-400 uppercase tracking-wide font-medium">Sertifika</span>
                <p className="text-sm mt-1">
                  {event.certificate_enabled ? (
                    <span className="text-green-600 font-medium">✓ Var</span>
                  ) : (
                    <span className="text-surface-400">Yok</span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-xs text-surface-400 uppercase tracking-wide font-medium">Ücret</span>
                <p className={`text-sm font-semibold mt-1 ${isFree ? "text-green-600" : "text-surface-900"}`}>
                  {isFree ? "Ücretsiz" : `₺${event.marketplace_price?.toLocaleString("tr-TR")}`}
                </p>
              </div>
            </div>

            {event.marketplace_description && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-surface-700 mb-2">Program Hakkında</h2>
                <p className="text-sm text-surface-600 leading-relaxed whitespace-pre-line">
                  {event.marketplace_description}
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-surface-100">
              <p className="text-xs text-surface-400 text-center">
                Bu programa katılmak için organizasyona başvurun.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
