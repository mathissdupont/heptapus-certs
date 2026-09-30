"use client";

import { FeatureGate } from "@/lib/useSubscription";

export default function AccreditationLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGate featureKey="accreditation">{children}</FeatureGate>;
}
