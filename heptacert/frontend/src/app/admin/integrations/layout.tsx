"use client";

import { FeatureGate } from "@/lib/useSubscription";

export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGate featureKey="integrations">{children}</FeatureGate>;
}
