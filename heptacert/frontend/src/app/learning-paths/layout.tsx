import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Öğrenme Yolları — HeptaCert",
    template: "%s — HeptaCert",
  },
  description:
    "Çok adımlı kurumsal eğitim programlarını takip edin. Adım adım ilerleyin, her aşamayı tamamlayarak dijital sertifikanızı kazanın.",
  keywords: [
    "öğrenme yolu",
    "eğitim programı",
    "kurumsal eğitim",
    "dijital sertifika",
    "sertifikalı program Türkiye",
    "learning path",
  ],
  alternates: {
    canonical: "/learning-paths",
  },
  openGraph: {
    title: "Öğrenme Yolları — HeptaCert",
    description:
      "Adım adım ilerleyen kurumsal eğitim programları. Her adımı tamamla, sertifikanı al.",
    url: "/learning-paths",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function LearningPathsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
