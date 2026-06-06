import type { MetadataRoute } from "next";

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "https://cert.heptapusgroup.com/api";
const BASE_URL =
  process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || apiBase.replace(/\/api$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/discover", "/marketplace", "/developers", "/learning-paths", "/pricing/business", "/verify", "/register", "/login", "/events", "/organizations", "/iletisim", "/gizlilik", "/kvkk", "/iade", "/mesafeli-satis", "/llms.txt"],
        disallow: ["/admin/", "/checkout/", "/attend/", "/public/forms/", "/events/*/register", "/events/*/status", "/events/*/survey", "/events/*/verify-email", "/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
