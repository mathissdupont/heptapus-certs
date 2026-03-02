import type { Metadata } from "next";
import PricingClient from "./_pricing-client";

export const metadata: Metadata = {
  title: "Fiyatlandırma",
  description:
    "HeptaCert fiyatlandırma planlarını inceleyin. Ücretsiz başlayın, ihtiyacınız kadar HeptaCoin kullanın.",
  openGraph: {
    title: "Fiyatlandırma | HeptaCert",
    description:
      "HeptaCert fiyatlandırma planlarını inceleyin. Ücretsiz başlayın, ihtiyacınız kadar HeptaCoin kullanın.",
    type: "website",
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
