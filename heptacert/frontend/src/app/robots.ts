import type { MetadataRoute } from "next";

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "https://cert.heptapusgroup.com/api";
const BASE_URL =
  process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || apiBase.replace(/\/api$/, "");

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
