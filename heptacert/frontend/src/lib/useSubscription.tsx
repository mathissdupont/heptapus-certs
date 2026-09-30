"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "./api";
import { FEATURE_METADATA, getFeatureMetadata, type FeatureKey } from "./featureMetadata";
import { translate, useI18n, type Lang } from "./i18n";

export interface SubscriptionInfo {
  active: boolean;
  plan_id: string | null;
  expires_at?: string | null;
  role?: string | null;
}

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  growth: "Growth",
  enterprise: "Enterprise",
};

const PLAN_ORDER: Record<string, number> = {
  starter: 0,
  free: 0,
  pro: 1,
  growth: 2,
  enterprise: 3,
};

const PLAN_GATE_MATCHERS = [
 "plan",
 "abonelik",
 "subscription",
 "enterprise",
 "growth",
 "pro",
 "premium",
 "ucretli",
 "ücretli",
];

export function planLabel(plan: string) {
  return PLAN_LABELS[plan] || plan;
}

export function planListLabel(plans: string[]) {
  return plans.map(planLabel).join(" / ");
}

function normalizePlan(plan?: string | null) {
  return String(plan || "starter").trim().toLowerCase() || "starter";
}

export function planAllows(planId: string | null | undefined, requiredPlans: string[] = []) {
  if (!requiredPlans.length) return true;
  const plan = normalizePlan(planId);
  const required = requiredPlans.map(normalizePlan);
  if (required.includes(plan)) return true;
  const minimumRank = Math.min(...required.map((item) => PLAN_ORDER[item] ?? 99));
  return (PLAN_ORDER[plan] ?? -1) >= minimumRank;
}

export function isPlanGateError(message?: string | null) {
  const value = (message || "").toLocaleLowerCase("tr-TR");
  return PLAN_GATE_MATCHERS.some((part) => value.includes(part));
}

export function planGateCopy({
  lang = "tr",
  feature,
  requiredPlans = ["pro", "growth", "enterprise"],
  serverMessage,
}: {
  lang?: Lang;
  feature?: string;
  requiredPlans?: string[];
  serverMessage?: string | null;
}) {
  const required = planListLabel(requiredPlans);
  const normalizedMessage = (serverMessage || "").toLocaleLowerCase("tr-TR");
  const enterpriseForTeam = ["çalışan", "calisan", "ekip", "staff", "team member", "employee"].some((marker) =>
    normalizedMessage.includes(marker),
  );
  if (enterpriseForTeam) {
    return {
      title: translate(lang, "plan_gate_enterprise_title"),
      body: translate(lang, "plan_gate_team_body"),
      detail: serverMessage || undefined,
      cta: translate(lang, "plan_gate_cta"),
    };
  }
  return {
    title: translate(lang, "plan_gate_title", { plans: required }),
    body: translate(lang, "plan_gate_body", {
      feature: feature || translate(lang, "plan_gate_feature_generic"),
    }),
    detail: serverMessage || undefined,
    cta: translate(lang, "plan_gate_cta"),
  };
}

export function PlanGateCard({
  featureKey,
  feature,
  requiredPlans,
  serverMessage,
  compact = false,
}: {
  featureKey?: FeatureKey;
  feature?: string;
  requiredPlans?: string[];
  serverMessage?: string | null;
  compact?: boolean;
}) {
  const { lang, t } = useI18n();
  const effectiveRequiredPlans = requiredPlans
    ?? (featureKey ? getFeatureMetadata(featureKey).requiredPlans : ["pro", "growth", "enterprise"]);
  const copy = planGateCopy({ lang, feature, requiredPlans: effectiveRequiredPlans, serverMessage });
  return (
    <div className={`rounded-[28px] border border-surface-200 bg-raised shadow-sm ${compact ? "p-5" : "p-7 sm:p-8"}`}>
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-surface-200 bg-surface-50 text-surface-700">
          <span className="text-lg font-black">↑</span>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-surface-400">{t("plan_gate_lock_label")}</p>
        <h2 className="mt-2 text-xl font-black text-surface-950">{copy.title}</h2>
        <p className="mt-3 text-sm leading-6 text-surface-600">{copy.body}</p>
        {copy.detail && (
          <p className="mt-3 rounded-2xl bg-surface-50 px-4 py-3 text-xs font-semibold leading-5 text-surface-600">
            {copy.detail}
          </p>
        )}
        <a href="/pricing" className="btn-primary mt-5">
          {copy.cta}
        </a>
      </div>
    </div>
  );
}

export function useSubscription() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      setLoading(true);
      setError(null);
      apiFetch("/billing/subscription")
        .then((r) => r.json())
        .then((s: SubscriptionInfo) => {
          if (!mounted) return;
          setSubscription(s);
        })
        .catch((e) => {
          if (!mounted) return;
          setSubscription(null);
          setError(e?.message || "subscription_fetch_failed");
        })
        .finally(() => {
          if (!mounted) return;
          setLoading(false);
        });
    };
    const handleOrganizationChange = () => load();
    void load();
    window.addEventListener("heptacert:organization-context-change", handleOrganizationChange);
    return () => {
      mounted = false;
      window.removeEventListener("heptacert:organization-context-change", handleOrganizationChange);
    };
  }, []);

  function hasPlan(allowed: string[] = []) {
    if (!subscription) return false;
    if (subscription.role === "superadmin") return true;
    if (!subscription.active || !subscription.plan_id) return false;
    return planAllows(subscription.plan_id, allowed);
  }

  function hasFeature(featureKey: FeatureKey) {
    return hasPlan(getFeatureMetadata(featureKey).requiredPlans);
  }

  return { loading, subscription, error, hasPlan, hasFeature } as const;
}

export function FeatureGate({
  featureKey,
  feature,
  requiredPlans,
  children,
  message,
  redirectTo = false,
}: {
  featureKey?: FeatureKey;
  feature?: string;
  requiredPlans?: string[];
  children: React.ReactNode;
  message?: React.ReactNode;
  redirectTo?: string | false;
}) {
  const { t } = useI18n();
  const { loading, error, hasPlan } = useSubscription();
  const router = useRouter();
  const effectiveRequiredPlans = requiredPlans
    ?? (featureKey ? getFeatureMetadata(featureKey).requiredPlans : FEATURE_METADATA.automation.requiredPlans);
  const allowed = hasPlan(effectiveRequiredPlans);

  useEffect(() => {
    if (!loading && !error && !allowed && redirectTo) {
      router.replace(redirectTo);
    }
  }, [allowed, error, loading, redirectTo, router]);

  if (loading) return <div className="p-8 text-center text-sm text-surface-500">{t("plan_gate_loading")}</div>;
  if (error) {
    return (
      <div className="rounded-[28px] border border-status-warning-border bg-status-warning-bg p-6 text-center text-sm font-semibold text-status-warning-content" role="alert">
        {t("plan_gate_error")}
      </div>
    );
  }
  if (!allowed) {
    return (
      <PlanGateCard
        feature={feature}
        requiredPlans={effectiveRequiredPlans}
        serverMessage={typeof message === "string" ? message : undefined}
      />
    );
  }
  return <>{children}</>;
}
