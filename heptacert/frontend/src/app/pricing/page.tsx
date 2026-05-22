import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Fiyatlandırma",
  description: "HeptaCert işletme ve organizasyon planlarını inceleyin.",
  openGraph: {
    title: "Fiyatlandırma | HeptaCert",
    description: "HeptaCert işletme ve organizasyon planlarını inceleyin.",
    type: "website",
  },
};

export default function PricingPage() {
  redirect("/pricing/business");
}
