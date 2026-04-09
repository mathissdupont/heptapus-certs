import type { Metadata } from "next";
import SubscriptionSettingsClient from "./_client";

export const metadata: Metadata = {
  title: "Subscription Settings - HeptaCert",
  description: "Manage your community membership subscription and billing settings.",
  openGraph: {
    title: "Subscription Settings | HeptaCert",
    description: "Manage your community membership subscription and billing settings.",
    type: "website",
  },
};

export default function SubscriptionSettingsPage() {
  return <SubscriptionSettingsClient />;
}
