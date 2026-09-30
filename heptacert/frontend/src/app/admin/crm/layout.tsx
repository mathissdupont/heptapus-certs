"use client";

import type { ReactNode } from "react";
import { FeatureGate } from "@/lib/useSubscription";

export default function AdminCrmLayout({ children }: { children: ReactNode }) {
  return (
    <FeatureGate featureKey="crm">
      {children}
    </FeatureGate>
  );
}
