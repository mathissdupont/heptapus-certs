"use client";

import type { ReactNode } from "react";
import { FeatureGate } from "@/lib/useSubscription";

export default function AdminLeadFormsLayout({ children }: { children: ReactNode }) {
  return (
    <FeatureGate requiredPlans={["enterprise"]} message="Lead form ve CRM akışları Enterprise planına özeldir.">
      {children}
    </FeatureGate>
  );
}
