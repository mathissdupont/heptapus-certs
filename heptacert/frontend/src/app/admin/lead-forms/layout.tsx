"use client";

import type { ReactNode } from "react";
import { FeatureGate } from "@/lib/useSubscription";

export default function AdminLeadFormsLayout({ children }: { children: ReactNode }) {
  return (
    <FeatureGate featureKey="lead_forms">
      {children}
    </FeatureGate>
  );
}
