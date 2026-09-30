"use client";

import { FeatureGate } from "@/lib/useSubscription";

export default function PresentationsLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGate featureKey="presentations">{children}</FeatureGate>;
}
