"use client";

import { FeatureGate } from "@/lib/useSubscription";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <FeatureGate featureKey="reports">{children}</FeatureGate>;
}
