import type { Metadata } from "next";
import DevelopersClient from "./DevelopersClient";

export const metadata: Metadata = {
  title: "Developer Portal — HeptaCert API",
  description:
    "HeptaCert REST API ile etkinlik, sertifika, katılımcı ve CRM verilerinizi programatik olarak yönetin. Manage events, certificates and CRM data programmatically.",
  keywords: [
    "HeptaCert API",
    "sertifika API",
    "certificate API",
    "etkinlik yönetimi API",
    "event management API",
    "dijital sertifika entegrasyon",
    "REST API Turkey",
    "certificate management API",
  ],
  alternates: { canonical: "/developers" },
  openGraph: {
    title: "HeptaCert Developer Portal",
    description: "REST API ile sertifika ve etkinlik verilerinizi sisteminize entegre edin.",
    url: "/developers",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  name: "HeptaCert API Documentation",
  description: "HeptaCert REST API ile dijital sertifika oluşturma, etkinlik yönetimi ve CRM verilerine programatik erişim sağlayın.",
  author: { "@type": "Organization", name: "Heptapus Group" },
  publisher: { "@type": "Organization", name: "Heptapus Group", url: "https://heptapusgroup.com" },
  inLanguage: ["tr", "en"],
};

export default function DevelopersPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <DevelopersClient />
    </>
  );
}
