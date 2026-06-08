"use client";

import type { ReactNode } from "react";
import { FeatureGate } from "@/lib/useSubscription";

export default function AdminCrmLayout({ children }: { children: ReactNode }) {
  return (
    <FeatureGate requiredPlans={["enterprise"]} message="CRM Enterprise planına özeldir.">
      {children}
    </FeatureGate>
  );
}
