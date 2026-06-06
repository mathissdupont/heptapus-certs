import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Eğitim Marketplace — HeptaCert",
    template: "%s — HeptaCert Marketplace",
  },
  description:
    "Türkiye'nin kurumsal eğitim marketplace'i. Sertifikalı program, profesyonel gelişim kursu ve akreditasyonlu eğitimleri keşfedin. Organizasyonlara başvurun, dijital sertifikanızı alın.",
  keywords: [
    "sertifikalı eğitim",
    "kurumsal eğitim marketplace",
    "dijital sertifika programı",
    "online kurs Türkiye",
    "akreditasyonlu eğitim",
    "mesleki gelişim kursu",
    "certificate training Turkey",
  ],
  alternates: {
    canonical: "/marketplace",
    languages: { tr: "/marketplace", en: "/marketplace" },
  },
  openGraph: {
    title: "Eğitim Marketplace — HeptaCert",
    description:
      "Sertifikalı kurumsal eğitim programlarını keşfedin. Akreditasyonlu kurslar, dijital sertifika ve profesyonel gelişim fırsatları bir arada.",
    url: "/marketplace",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
