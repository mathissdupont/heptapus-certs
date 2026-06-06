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

      <div className="min-h-screen bg-gray-50">
        {event.event_banner_url ? (
          <div className="w-full h-64 bg-gray-200 overflow-hidden">
            <img
              src={event.event_banner_url}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
            <span className="text-7xl">🎓</span>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link
            href="/marketplace"
            className="text-sm text-indigo-600 hover:underline mb-4 inline-block"
          >
            ← Marketplace&apos;e dön
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
                  <img
                    src={event.org_logo}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
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
                <p
                  className={`text-sm font-semibold mt-0.5 ${
                    isFree ? "text-green-600" : "text-gray-900"
                  }`}
                >
                  {isFree
                    ? "Ücretsiz"
                    : `₺${event.marketplace_price?.toLocaleString("tr-TR")}`}
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
    </>
  );
}
