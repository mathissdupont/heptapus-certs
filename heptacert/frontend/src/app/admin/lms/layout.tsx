"use client";

import type { ReactNode } from "react";
import { FeatureGate } from "@/lib/useSubscription";

export default function AdminLmsLayout({ children }: { children: ReactNode }) {
  return (
    <FeatureGate requiredPlans={["enterprise"]} message="LMS Enterprise planına özeldir.">
      {children}
    </FeatureGate>
  );
}
