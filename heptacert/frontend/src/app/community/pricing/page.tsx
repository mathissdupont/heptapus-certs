import type { Metadata } from "next";
import CommunityPricingClient from "./_client";

export const metadata: Metadata = {
  title: "Community Pricing - HeptaCert",
  description:
    "Join our community with flexible tiers. Free access to discover events, or upgrade to Pro for unlimited posting and connections.",
  openGraph: {
    title: "Community Pricing | HeptaCert",
    description:
      "Join our community with flexible tiers. Free access to discover events, or upgrade to Pro for unlimited posting and connections.",
    type: "website",
  },
};

export default function CommunityPricingPage() {
  return <CommunityPricingClient />;
}
