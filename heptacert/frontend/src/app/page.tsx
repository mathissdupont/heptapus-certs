import type { Metadata } from "next";
import HomeClient from "./_home-client";

export const metadata: Metadata = {
  title: "HeptaCert — Dijital Sertifika Platformu",
  description:
    "Etkinlikleriniz için dijital sertifika oluşturun, yönetin ve QR koduyla doğrulayın. HeptaCert ile belgelerinizi güvende tutun.",
  openGraph: {
    title: "HeptaCert — Dijital Sertifika Platformu",
    description:
      "Etkinlikleriniz için dijital sertifika oluşturun, yönetin ve QR koduyla doğrulayın.",
    type: "website",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
