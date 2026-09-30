"use client";

import { FeatureGate } from "@/lib/useSubscription";

export default function ApiKeysLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGate featureKey="api">{children}</FeatureGate>;
}
