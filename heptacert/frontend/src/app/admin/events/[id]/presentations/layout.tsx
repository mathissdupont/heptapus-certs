"use client";

import { FeatureGate } from "@/lib/useSubscription";

export default function EventPresentationsLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGate featureKey="presentations">{children}</FeatureGate>;
}
