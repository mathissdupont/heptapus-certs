import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventDetailClient from "./EventDetailClient";

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
  "https://heptacert.com/api";

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
    process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || "https://heptacert.com";

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
      <EventDetailClient event={event} />
    </>
  );
}
