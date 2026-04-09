import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Lock, Sparkles } from "lucide-react";
import { getPublicMemberSubscription, getPublicMemberToken, type PublicMemberSubscriptionInfo } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

interface SubscriptionGateProps {
  requiredPlan: "member_plus" | "member_pro"; // 'member_plus' = Plus or higher, 'member_pro' = Pro only
  children: React.ReactNode;
  fallback?: 'redirect' | 'paywall'; // What to show if no subscription
}

export default function SubscriptionGate({ requiredPlan, children, fallback = 'paywall' }: SubscriptionGateProps) {
  const { lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [subscription, setSubscription] = useState<PublicMemberSubscriptionInfo | null>(null);

  const copy = {
    title: lang === "tr" ? "Premium Gerekli" : "Premium Required",
    body: lang === "tr" 
      ? "Bu özellik, Member Plus veya Premium üyelik planı gerektirir." 
      : "This feature requires a Member Plus or Premium membership plan.",
    cta: lang === "tr" ? "Üyelik Planlarını Gör" : "View Plans",
    upgrade: lang === "tr" ? "Üyeye Yükselт" : "Upgrade to Premium",
  };

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        if (!getPublicMemberToken()) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const sub = await getPublicMemberSubscription();
        setSubscription(sub);

        // Check if user has required plan
        if (!sub.active || !sub.plan_id) {
          setHasAccess(false);
        } else if (requiredPlan === "member_pro") {
          // Only member_pro passes
          setHasAccess(sub.plan_id === "member_pro");
        } else {
          // member_plus or higher
          setHasAccess(["member_plus", "member_pro"].includes(sub.plan_id));
        }
      } catch (err) {
        console.error("Error checking subscription:", err);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [requiredPlan]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // Paywall/upgrade prompt
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
      <Lock className="mx-auto h-12 w-12 text-amber-600 mb-4" />
      <h3 className="text-lg font-bold text-slate-900">{copy.title}</h3>
      <p className="mt-2 text-sm text-slate-600">{copy.body}</p>
      
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
        <Link
          href="/pricing#member-premium"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700"
        >
          <Sparkles className="h-4 w-4" />
          {copy.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {subscription && !subscription.active && (
        <p className="mt-4 text-xs text-slate-500">
          {lang === "tr" 
            ? "Aktif bir üyelik planınız yok. Sınırsız erişim için üyeliğe yükseltin." 
            : "You don't have an active plan. Upgrade to get unlimited access."}
        </p>
      )}
    </div>
  );
}
