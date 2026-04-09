"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, Crown, Zap, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n, useT } from "@/lib/i18n";
import { API_BASE, getPublicMemberSubscription, getPublicMemberToken, upgradePublicMemberTier } from "@/lib/api";

type CommunityTier = {
  id: string;
  name_tr: string;
  name_en: string;
  price_monthly: number | null;
  price_annual: number | null;
  features_tr: string[];
  features_en: string[];
  is_free: boolean;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function CommunityPricingClient() {
  const { lang } = useI18n();
  const t = useT();
  const router = useRouter();

  const copy = {
    heading: lang === "tr" ? "Topluluk Üyelik Planları" : "Community Membership Plans",
    subheading:
      lang === "tr"
        ? "Sosyal ağınızı kurun, bağlantılarınızı genişletin ve etkinlikler keşfedin"
        : "Build your network, expand your connections, and discover events",
    perMonth: lang === "tr" ? "/ay" : "/month",
    perYear: lang === "tr" ? "/yıl" : "/year",
    tryFree: lang === "tr" ? "Ücretsiz Başla" : "Start Free",
    upgrade: lang === "tr" ? "Pro'ya Yükselt" : "Upgrade to Pro",
    upgradeEnterprise: lang === "tr" ? "İletişime Geç" : "Contact Us",
    currentPlan: lang === "tr" ? "Mevcut Plan" : "Current Plan",
    loginRequired:
      lang === "tr"
        ? "Üyelik planlarını görmek için giriş yapın"
        : "Sign in to view membership plans",
    features: {
      posts:
        lang === "tr"
          ? "Tabloda sınırlı gönderi yayınla"
          : "Limited posts per day to global feed",
      unlimited_posts:
        lang === "tr"
          ? "Sınırsız gönderi yayınla"
          : "Unlimited posts to global feed",
      connections:
        lang === "tr"
          ? "Hiç bağlantı yapma"
          : "No connections available",
      pro_connections:
        lang === "tr"
          ? "50'ye kadar bağlantı ekle"
          : "Add up to 50 connections",
      unlimited_connections:
        lang === "tr"
          ? "Sınırsız bağlantı"
          : "Unlimited connections",
      profile:
        lang === "tr"
          ? "Temel profil"
          : "Basic profile",
      badge:
        lang === "tr"
          ? "Pro rozeti görüntüle"
          : "Show Pro badge on profile",
      priority:
        lang === "tr"
          ? "Öncelikli destek"
          : "Priority support",
      analytics:
        lang === "tr"
          ? "Temel analitik pano"
          : "Basic analytics dashboard",
      api: lang === "tr" ? "API erişimi" : "API access",
    },
  };

  const [tiers, setTiers] = useState<CommunityTier[]>([]);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = getPublicMemberToken();
    setIsLoggedIn(!!token);

    // Fetch tiers from pricing config
    fetch(`${API_BASE}/pricing/config`)
      .then((r) => r.json())
      .then((data: { tiers: any[] }) => {
        if (data.tiers?.length) {
          // Filter for community tiers (free, pro, enterprise)
          const communityTiers = data.tiers
            .filter((t: any) => ["free", "pro", "enterprise"].includes(t.id))
            .map((t: any) => ({
              id: t.id,
              name_tr: t.name_tr,
              name_en: t.name_en,
              price_monthly: t.price_monthly,
              price_annual: t.price_annual,
              features_tr: t.features_tr || [],
              features_en: t.features_en || [],
              is_free: t.is_free || false,
            }));

          setTiers(communityTiers);
        }
      })
      .catch(() => {
        // Set default tiers if fetch fails
        setTiers(getDefaultTiers());
      })
      .finally(() => setLoading(false));

    // Load current plan if logged in
    if (token) {
      getPublicMemberSubscription()
        .then((sub) => {
          if (sub.active && sub.plan_id) {
            setCurrentTier(sub.plan_id);
          } else {
            setCurrentTier("free");
          }
        })
        .catch(() => setCurrentTier("free"));
    }
  }, []);

  const handleUpgrade = async (tierId: string) => {
    if (!isLoggedIn) {
      router.push("/community/login");
      return;
    }

    if (tierId === "free") {
      // Free tier doesn't require upgrade
      return;
    }

    // For now, upgrade directly (in production, redirect to payment)
    setUpgrading(true);
    try {
      await upgradePublicMemberTier(tierId);
      // Reload subscription
      const sub = await getPublicMemberSubscription();
      if (sub.active && sub.plan_id) {
        setCurrentTier(sub.plan_id);
      }
      // Show success message and navigate
      router.push("/community/settings/subscription");
    } catch (err) {
      console.error("Upgrade failed:", err);
      // Show error toast
    } finally {
      setUpgrading(false);
    }
  };

  const getTierIcon = (tierId: string) => {
    switch (tierId) {
      case "free":
        return <Zap className="w-6 h-6" />;
      case "pro":
        return <Sparkles className="w-6 h-6" />;
      case "enterprise":
        return <Crown className="w-6 h-6" />;
      default:
        return null;
    }
  };

  const isPro = currentTier === "pro";
  const isEnterprise = currentTier === "enterprise";
  const isFree = currentTier === "free" || !currentTier;

  if (!isLoggedIn) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-white mb-2">{copy.loginRequired}</h2>
          <p className="text-slate-400 mb-6">
            {lang === "tr"
              ? "Topluluk üyeliğine katılmak için hesap oluşturun veya giriş yapın"
              : "Create an account or sign in to join our community"}
          </p>
          <Link href="/community/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:shadow-lg transition">
            {lang === "tr" ? "Giriş Yap" : "Sign In"} <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Animated bg elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse animation-delay-2000" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-16 sm:px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">{copy.heading}</h1>
          <p className="text-xl text-slate-300">{copy.subheading}</p>
        </motion.div>

        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Tiers Grid */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {tiers.map((tier) => {
                const isCurrentTier =
                  (tier.id === "free" && isFree) ||
                  (tier.id === "pro" && isPro) ||
                  (tier.id === "enterprise" && isEnterprise);

                return (
                  <motion.div
                    key={tier.id}
                    className={`relative rounded-2xl backdrop-blur-md border transition-all duration-300 ${
                      isCurrentTier
                        ? "border-blue-500/50 bg-gradient-to-br from-blue-500/10 to-purple-500/10 ring-2 ring-blue-500/30 scale-105"
                        : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50 hover:bg-slate-800/50"
                    }`}
                    variants={itemVariants}
                  >
                    {isCurrentTier && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold">
                          {copy.currentPlan}
                        </span>
                      </div>
                    )}

                    <div className="p-8">
                      {/* Icon and name */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            {getTierIcon(tier.id)}
                            <h3 className="text-2xl font-bold text-white">
                              {lang === "tr" ? tier.name_tr : tier.name_en}
                            </h3>
                          </div>
                        </div>
                      </div>

                      {/* Pricing */}
                      {!tier.is_free && tier.price_monthly ? (
                        <div className="mb-6">
                          <div className="text-4xl font-bold text-white">
                            ${tier.price_monthly}
                            <span className="text-sm text-slate-400 font-normal">{copy.perMonth}</span>
                          </div>
                          {tier.price_annual && (
                            <p className="text-xs text-slate-400 mt-2">
                              {lang === "tr" ? "veya" : "or"} ${tier.price_annual}
                              {copy.perYear}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="mb-6">
                          <div className="text-4xl font-bold text-white">
                            {lang === "tr" ? "Ücretsiz" : "Free"}
                          </div>
                        </div>
                      )}

                      {/* Features */}
                      <div className="space-y-3 mb-8">
                        {(lang === "tr" ? tier.features_tr : tier.features_en).map(
                          (feature: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-3">
                              <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                                isCurrentTier ? "text-blue-400" : "text-slate-500"
                              }`} />
                              <span className="text-slate-300 text-sm">{feature}</span>
                            </div>
                          )
                        )}
                      </div>

                      {/* CTA Button */}
                      <button
                        onClick={() => handleUpgrade(tier.id)}
                        disabled={isCurrentTier || upgrading}
                        className={`w-full py-3 rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                          isCurrentTier
                            ? "bg-slate-700 text-slate-400 cursor-default"
                            : tier.id === "free"
                              ? "bg-slate-700 hover:bg-slate-600 text-white"
                              : tier.id === "pro"
                                ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/50 text-white"
                                : "bg-slate-700 hover:bg-slate-600 text-white"
                        }`}
                      >
                        {upgrading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isCurrentTier
                          ? copy.currentPlan
                          : tier.id === "free"
                            ? copy.tryFree
                            : tier.id === "pro"
                              ? copy.upgrade
                              : copy.upgradeEnterprise}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* FAQ / Info section */}
            <motion.div
              className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h2 className="text-xl font-bold text-white mb-6">
                {lang === "tr" ? "Sıkça Sorulan Sorular" : "Frequently Asked Questions"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="font-semibold text-white mb-2">
                    {lang === "tr" ? "Ücretsiz planı kullanarak başlayabilir miyim?" : "Can I start with the free plan?"}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {lang === "tr"
                      ? "Evet! Ücretsiz plana kaydolun, profilinizi oluşturun ve topluluğla bağlantı kurmaya başlayın."
                      : "Yes! Sign up with the free plan, create your profile, and start connecting with the community."}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-white mb-2">
                    {lang === "tr" ? "Plandan istediğim zaman değiştirebilir miyim?" : "Can I change plans anytime?"}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {lang === "tr"
                      ? "Evet, planınızı herhangi bir zamanda yükseltebilir veya indirebilirsiniz."
                      : "Yes, you can upgrade or downgrade your plan at any time."}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Navbar link to settings */}
            <motion.div
              className="mt-12 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Link
                href="/community/settings/subscription"
                className="text-slate-400 hover:text-white transition text-sm"
              >
                {lang === "tr" ? "Abonelik ayarlarını görmek için tıklayın" : "Click to view subscription settings"}
              </Link>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

function getDefaultTiers(): CommunityTier[] {
  return [
    {
      id: "free",
      name_tr: "Ücretsiz",
      name_en: "Free",
      price_monthly: null,
      price_annual: null,
      features_tr: [
        "Temel profil oluşturun",
        "Etkinlik keşfedin ve yorumlar yapın",
        "Günde 5 gönderi yayınlayın",
        "Bağlantı kuramaz",
      ],
      features_en: [
        "Create basic profile",
        "Discover events and comment",
        "Post 5 times per day to feed",
        "No connections available",
      ],
      is_free: true,
    },
    {
      id: "pro",
      name_tr: "Pro",
      name_en: "Pro",
      price_monthly: 4,
      price_annual: 40,
      features_tr: [
        "Sınırsız gönderi yayınlayın",
        "50'ye kadar bağlantı ekleyin",
        "Pro rozeti gösterin",
        "Temel analitik pano",
        "Öncelikli destek",
      ],
      features_en: [
        "Unlimited posts",
        "Add up to 50 connections",
        "Show Pro badge",
        "Basic analytics dashboard",
        "Priority support",
      ],
      is_free: false,
    },
    {
      id: "enterprise",
      name_tr: "Enterprise",
      name_en: "Enterprise",
      price_monthly: null,
      price_annual: null,
      features_tr: [
        "Sınırsız gönderi",
        "Sınırsız bağlantı",
        "Gelişmiş analitik",
        "API erişimi",
        "Özel marka seçenekleri",
        "24/7 destek",
      ],
      features_en: [
        "Unlimited posts",
        "Unlimited connections",
        "Advanced analytics",
        "API access",
        "Custom branding",
        "24/7 support",
      ],
      is_free: false,
    },
  ];
}
