"use client";

import { motion } from "framer-motion";
import { Sparkles, Crown, Zap, Calendar, AlertCircle, CheckCircle2, ExternalLink, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getPublicMemberSubscription, getPublicMemberToken } from "@/lib/api";

type SubscriptionInfo = {
  active: boolean;
  plan_id: string | null;
  expires_at?: string | null;
};

export default function SubscriptionSettingsClient() {
  const { lang } = useI18n();
  const router = useRouter();

  const copy = {
    title: lang === "tr" ? "Abonelik Ayarları" : "Subscription Settings",
    currentPlan: lang === "tr" ? "Mevcut Plan" : "Current Plan",
    planDetails: lang === "tr" ? "Plan Detayları" : "Plan Details",
    renewalDate: lang === "tr" ? "Yenileme Tarihi" : "Renewal Date",
    changePlan: lang === "tr" ? "Planı Değiştir" : "Change Plan",
    manageBilling: lang === "tr" ? "Faturalamayı Yönet" : "Manage Billing",
    cancelPlan: lang === "tr" ? "Planı İptal Et" : "Cancel Plan",
    freePlan: lang === "tr" ? "Ücretsiz Plan" : "Free Plan",
    proPlan: lang === "tr" ? "Pro Plan" : "Pro Plan",
    enterprisePlan: lang === "tr" ? "Enterprise Plan" : "Enterprise Plan",
    active: lang === "tr" ? "Aktif" : "Active",
    inactive: lang === "tr" ? "İnaktif" : "Inactive",
    loading: lang === "tr" ? "Yükleniyor..." : "Loading...",
    notLoggedIn: lang === "tr" ? "Lütfen giriş yapın" : "Please sign in",
    loginMessage:
      lang === "tr"
        ? "Abonelik ayarlarını görmek için giriş yapmanız gerekir."
        : "You need to sign in to view your subscription settings.",
    loginButton: lang === "tr" ? "Giriş Yap" : "Sign In",
    goToPricing: lang === "tr" ? "Diğer Planlara Bak" : "View Other Plans",
    comingSoon: lang === "tr" ? "Yakında" : "Coming Soon",
    status: lang === "tr" ? "Durum" : "Status",
  };

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = getPublicMemberToken();
    if (!token) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }

    setIsLoggedIn(true);

    getPublicMemberSubscription()
      .then((data) => {
        setSubscription(data);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load subscription");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const getPlanName = (planId: string | null) => {
    switch (planId) {
      case "free":
        return copy.freePlan;
      case "pro":
        return copy.proPlan;
      case "enterprise":
        return copy.enterprisePlan;
      default:
        return copy.freePlan;
    }
  };

  const getPlanIcon = (planId: string | null) => {
    switch (planId) {
      case "pro":
        return <Sparkles className="w-8 h-8" />;
      case "enterprise":
        return <Crown className="w-8 h-8" />;
      default:
        return <Zap className="w-8 h-8" />;
    }
  };

  const getPlanColor = (planId: string | null) => {
    switch (planId) {
      case "pro":
        return "from-blue-600 to-purple-600";
      case "enterprise":
        return "from-yellow-600 to-orange-600";
      default:
        return "from-slate-600 to-slate-700";
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-white mb-4">{copy.notLoggedIn}</h1>
            <p className="text-slate-400 mb-8">{copy.loginMessage}</p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/community/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:shadow-lg transition"
              >
                {copy.loginButton} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/community/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600 transition"
              >
                {copy.goToPricing}
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated bg elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse animation-delay-2000" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 sm:px-6">
        {/* Header */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-white mb-2">{copy.title}</h1>
          <p className="text-slate-400">
            {lang === "tr"
              ? "Aboneliğinizi yönetin ve plan değişiklikleri yapın"
              : "Manage your subscription and make plan changes"}
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : error ? (
          <motion.div
            className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 flex gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-200 font-medium">
                {lang === "tr" ? "Hata oluştu" : "Error"}
              </p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </motion.div>
        ) : subscription ? (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Current Plan Card */}
            <div className={`bg-gradient-to-br ${getPlanColor(subscription.plan_id)} rounded-2xl p-8 text-white`}>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  {getPlanIcon(subscription.plan_id)}
                  <div>
                    <h2 className="text-3xl font-bold">{getPlanName(subscription.plan_id)}</h2>
                    <p className="text-white/80">
                      {subscription.active ? copy.active : copy.inactive}
                    </p>
                  </div>
                </div>
                {subscription.active && (
                  <CheckCircle2 className="w-8 h-8 text-white/80" />
                )}
              </div>

              {/* Renewal date */}
              {subscription.expires_at && (
                <div className="border-t border-white/20 pt-4 flex items-center gap-3">
                  <Calendar className="w-5 h-5" />
                  <div>
                    <p className="text-sm text-white/70">{copy.renewalDate}</p>
                    <p className="font-medium">
                      {new Date(subscription.expires_at).toLocaleDateString(
                        lang === "tr" ? "tr-TR" : "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/community/pricing"
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition border border-slate-700"
              >
                {copy.changePlan} <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 font-medium transition border border-slate-700 cursor-not-allowed opacity-60"
                disabled
                title={copy.comingSoon}
              >
                {copy.manageBilling}
              </button>
            </div>

            {/* Plan info section */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-md">
              <h3 className="text-lg font-bold text-white mb-4">{copy.planDetails}</h3>
              <div className="space-y-3">
                {subscription.plan_id === "free" && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">
                        {lang === "tr" ? "Günlük gönderi limiti" : "Daily post limit"}
                      </span>
                      <span className="text-white font-medium">5</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">
                        {lang === "tr" ? "Bağlantı limiti" : "Connection limit"}
                      </span>
                      <span className="text-white font-medium">0</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">
                        {lang === "tr" ? "Analitik" : "Analytics"}
                      </span>
                      <span className="text-slate-500">-</span>
                    </div>
                  </>
                )}
                {subscription.plan_id === "pro" && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">
                        {lang === "tr" ? "Gönderi limiti" : "Post limit"}
                      </span>
                      <span className="text-white font-medium">
                        {lang === "tr" ? "Sınırsız" : "Unlimited"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">
                        {lang === "tr" ? "Bağlantı limiti" : "Connection limit"}
                      </span>
                      <span className="text-white font-medium">50</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">
                        {lang === "tr" ? "Pro rozeti" : "Pro badge"}
                      </span>
                      <span className="text-white font-medium">✓</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">
                        {lang === "tr" ? "Temel analitik" : "Basic analytics"}
                      </span>
                      <span className="text-white font-medium">✓</span>
                    </div>
                  </>
                )}
                {subscription.plan_id === "enterprise" && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">
                        {lang === "tr" ? "Gönderi limiti" : "Post limit"}
                      </span>
                      <span className="text-white font-medium">
                        {lang === "tr" ? "Sınırsız" : "Unlimited"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">
                        {lang === "tr" ? "Bağlantı limiti" : "Connection limit"}
                      </span>
                      <span className="text-white font-medium">
                        {lang === "tr" ? "Sınırsız" : "Unlimited"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">
                        {lang === "tr" ? "Gelişmiş analitik" : "Advanced analytics"}
                      </span>
                      <span className="text-white font-medium">✓</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">API</span>
                      <span className="text-white font-medium">✓</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Support link */}
            <div className="text-center">
              <p className="text-slate-400 mb-4">
                {lang === "tr"
                  ? "Sorunuz mu var?"
                  : "Have a question?"}
              </p>
              <a
                href="mailto:support@heptacert.com"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition"
              >
                {lang === "tr" ? "Destek ekibiyle iletişime geçin" : "Contact support team"} <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
