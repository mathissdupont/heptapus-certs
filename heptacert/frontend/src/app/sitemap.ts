import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "https://heptacert.com/api";
const BASE_URL =
  process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || apiBase.replace(/\/api$/, "");

type MarketplaceItem = { id: number };

async function getMarketplaceEventIds(): Promise<number[]> {
  try {
    const res = await fetch(`${apiBase}/public/marketplace?limit=200`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as MarketplaceItem[];
    return data.map((e) => e.id);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const marketplaceIds = await getMarketplaceEventIds();
  const landingLanguages = Object.fromEntries(
    routing.locales.map((locale) => [locale, `${BASE_URL}/${locale}`]),
  );
  const localizedLandingRoutes: MetadataRoute.Sitemap = routing.locales.map((locale) => ({
    url: `${BASE_URL}/${locale}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: locale === routing.defaultLocale ? 1 : 0.9,
    alternates: { languages: { ...landingLanguages, "x-default": `${BASE_URL}/${routing.defaultLocale}` } },
  }));

  const localizedDirectoryRoutes: MetadataRoute.Sitemap = ([
    { path: "events", priority: 0.8 },
    { path: "organizations", priority: 0.75 },
    { path: "discover", priority: 0.9 },
  ] as const).flatMap(({ path, priority }) => {
    const languages = Object.fromEntries(
      routing.locales.map((locale) => [locale, `${BASE_URL}/${locale}/${path}`]),
    );
    return routing.locales.map((locale) => ({
      url: `${BASE_URL}/${locale}/${path}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority,
      alternates: { languages: { ...languages, "x-default": `${BASE_URL}/${routing.defaultLocale}/${path}` } },
    }));
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/marketplace`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/developers`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/learning-paths`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.65,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/pricing/business`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/verify`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/register?mode=organizer`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/iletisim`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/gizlilik`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/kvkk`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/iade`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/mesafeli-satis`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const dynamicRoutes: MetadataRoute.Sitemap = marketplaceIds.map((id) => ({
    url: `${BASE_URL}/marketplace/${id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...localizedLandingRoutes, ...localizedDirectoryRoutes, ...staticRoutes, ...dynamicRoutes];
}
