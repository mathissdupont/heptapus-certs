import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { FEATURE_METADATA } from "@/lib/featureMetadata";

type BackendPolicy = {
  requiredPlans: string[];
  enterpriseOnlyForStaff: boolean;
};

function readBackendPolicies(): Record<string, BackendPolicy> {
  const source = readFileSync(resolve(process.cwd(), "../backend/src/plan_policy.py"), "utf8");
  const policies: Record<string, BackendPolicy> = {};

  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*"([^"]+)": FeaturePolicy\("[^"]+", \(([^)]*)\),/);
    if (!match) continue;
    policies[match[1]] = {
      requiredPlans: [...match[2].matchAll(/"([^"]+)"/g)].map((plan) => plan[1]),
      enterpriseOnlyForStaff: /, True\),\s*$/.test(line),
    };
  }

  return policies;
}

describe("feature policy parity", () => {
  it("keeps frontend gates aligned with the backend source of truth", () => {
    const backendPolicies = readBackendPolicies();

    expect(Object.keys(FEATURE_METADATA).sort()).toEqual(Object.keys(backendPolicies).sort());
    for (const [featureKey, backend] of Object.entries(backendPolicies)) {
      const frontend = FEATURE_METADATA[featureKey as keyof typeof FEATURE_METADATA];
      expect(frontend.requiredPlans, featureKey).toEqual(backend.requiredPlans);
      expect(Boolean(frontend.enterpriseOnlyForStaff), featureKey).toBe(backend.enterpriseOnlyForStaff);
    }
  });
});
