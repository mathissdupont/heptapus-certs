import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || "https://heptacert.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/verify", "/register", "/iletisim", "/gizlilik", "/kvkk", "/iade", "/mesafeli-satis"],
        disallow: ["/admin/", "/checkout/", "/attend/", "/events/", "/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
