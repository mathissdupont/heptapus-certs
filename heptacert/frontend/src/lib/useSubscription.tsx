"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "./api";

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

export function isPlanGateError(message?: string | null) {
  const value = (message || "").toLocaleLowerCase("tr-TR");
  return PLAN_GATE_MATCHERS.some((part) => value.includes(part));
}

export function planGateCopy({
  feature = "Bu özellik",
  requiredPlans = ["pro", "growth", "enterprise"],
  serverMessage,
}: {
  feature?: string;
  requiredPlans?: string[];
  serverMessage?: string | null;
}) {
  const required = planListLabel(requiredPlans);
  const enterpriseForTeam = (serverMessage || "").toLocaleLowerCase("tr-TR").includes("enterprise");
  if (enterpriseForTeam) {
    return {
      title: "Enterprise plan gerekli",
      body:
        "Bu alan çalışanlar ve ekip üyeleri için yalnızca etkinlik sahibi kurum Enterprise plandaysa açılır. Kurum sahibi planı yükselttiğinde yetkili kullanıcılar bu ekranı kullanabilir.",
      detail: serverMessage || undefined,
      cta: "Planları Gör",
    };
  }
  return {
    title: `${required} plan gerekli`,
    body: `${feature} ücretli planlarda kullanılabilir. Plan yükseltildiğinde bu ekran otomatik olarak açılır.`,
    detail: serverMessage || undefined,
    cta: "Planları Gör",
  };
}

export function PlanGateCard({
  feature,
  requiredPlans = ["pro", "growth", "enterprise"],
  serverMessage,
  compact = false,
}: {
  feature?: string;
  requiredPlans?: string[];
  serverMessage?: string | null;
  compact?: boolean;
}) {
  const copy = planGateCopy({ feature, requiredPlans, serverMessage });
  return (
    <div className={`rounded-[28px] border border-surface-200 bg-white shadow-sm ${compact ? "p-5" : "p-7 sm:p-8"}`}>
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-surface-200 bg-surface-50 text-surface-700">
          <span className="text-lg font-black">↑</span>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-surface-400">Plan kilidi</p>
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
    apiFetch("/billing/subscription")
      .then((r) => r.json())
      .then((s: SubscriptionInfo) => {
        if (!mounted) return;
        setSubscription(s);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || "Abonelik bilgisi yüklenemedi.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function hasPlan(allowed: string[] = []) {
    if (!subscription) return false;
    if (subscription.role === "superadmin") return true;
    if (!subscription.active || !subscription.plan_id) return false;
    return allowed.includes(subscription.plan_id);
  }

  return { loading, subscription, error, hasPlan } as const;
}

export function FeatureGate({
  requiredPlans = ["growth", "enterprise"],
  children,
  message,
  redirectTo = false,
}: {
  requiredPlans?: string[];
  children: React.ReactNode;
  message?: React.ReactNode;
  redirectTo?: string | false;
}) {
  const { loading, hasPlan } = useSubscription();
  const router = useRouter();
  const allowed = hasPlan(requiredPlans);

  useEffect(() => {
    if (!loading && !allowed && redirectTo) {
      router.replace(redirectTo);
    }
  }, [allowed, loading, redirectTo, router]);

  if (loading) return <div className="p-8 text-center text-sm text-surface-500">Yükleniyor...</div>;
  if (!allowed) {
    return (
      <PlanGateCard
        requiredPlans={requiredPlans}
        serverMessage={typeof message === "string" ? message : undefined}
      />
    );
  }
  return <>{children}</>;
}
