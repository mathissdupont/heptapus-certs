"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ShieldCheck, Coins, Loader2, AlertCircle, Clock, Mail, X, Phone, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n, useT } from "@/lib/i18n";
import { API_BASE } from "@/lib/api";

type PricingTier = {
  id: string;
  name_tr: string;
  name_en: string;
  price_monthly: number | null;
  price_annual: number | null;
  hc_quota: number | null;
  features_tr: string[];
  features_en: string[];
  is_free: boolean;
  is_enterprise: boolean;
};

type WaitlistModalProps = {
  tier: PricingTier;
  lang: string;
  onClose: () => void;
};

type PricingClientProps = {
  mode?: "all" | "business";
};

export default function PricingPage({ mode: _mode = "all" }: PricingClientProps) {
  const { lang } = useI18n();
  const t = useT();

  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState(false);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [wlTier, setWlTier] = useState<PricingTier | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/pricing/config`)
        .then((r) => r.json())
        .then((d: { tiers: PricingTier[] }) => { if (d.tiers?.length) setTiers(d.tiers); })
        .catch(() => setFetchErr(true)),
      fetch(`${API_BASE}/billing/status`)
        .then((r) => r.json())
        .then((d: { enabled: boolean }) => setPaymentEnabled(!!d.enabled))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const name = (tier: PricingTier) => (lang === "tr" ? tier.name_tr : tier.name_en);
  const features = (tier: PricingTier) => (lang === "tr" ? tier.features_tr : tier.features_en);

  const copy =
    lang === "tr"
      ? {
          badge: paymentEnabled ? "Ödeme Sistemi Aktif" : "Ücretli Planlar Yakında",
          title: "Şeffaf ve basit fiyatlandırma",
          subtitle: "Operasyonunuz büyüdükçe ölçeklenen esnek planlar. Sürpriz ücret yok.",
          monthly: "Aylık",
          annual: "Yıllık",
          saveLabel: "2 ay bedava",
          included: "Plana dahil:",
          checkout: "Başla",
          waitlistAction: "Bekleme Listesine Katıl",
          monthlySuffix: "/ ay",
          annualSuffix: "/ yıl",
          faqTitle: "Sıkça Sorulan Sorular",
          enterpriseContact: "Satış Ekibiyle Görüş",
          startFree: "Ücretsiz Başla",
        }
      : {
          badge: paymentEnabled ? "Checkout is Live" : "Paid Plans Coming Soon",
          title: "Simple, transparent pricing",
          subtitle: "Flexible plans that scale as your operations grow. No hidden fees.",
          monthly: "Monthly",
          annual: "Annually",
          saveLabel: "2 months free",
          included: "What's included:",
          checkout: "Get Started",
          waitlistAction: "Join the Waitlist",
          monthlySuffix: "/ mo",
          annualSuffix: "/ yr",
          faqTitle: "Frequently Asked Questions",
          enterpriseContact: "Contact Sales",
          startFree: "Start for Free",
        };

  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-50 pb-24">
      {/* Header */}
      <section className="border-b border-surface-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          {/* Status badge */}
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-200 bg-surface-50 px-3.5 py-1.5 text-xs font-medium text-surface-600">
              {paymentEnabled ? (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Clock className="h-3.5 w-3.5 text-amber-500" />
              )}
              {copy.badge}
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl lg:text-5xl">
            {copy.title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-surface-500">
            {copy.subtitle}
          </p>
        </div>
      </section>

      {/* Billing toggle */}
      <div className="flex justify-center py-8">
        <div className="flex items-center gap-1 rounded-xl border border-surface-200 bg-white p-1 shadow-soft">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              billingPeriod === "monthly"
                ? "bg-surface-900 text-white"
                : "text-surface-500 hover:text-surface-900"
            }`}
          >
            {copy.monthly}
          </button>
          <div className="relative">
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
                billingPeriod === "annual"
                  ? "bg-surface-900 text-white"
                  : "text-surface-500 hover:text-surface-900"
              }`}
            >
              {copy.annual}
            </button>
            <span className="absolute -right-2 -top-3 rounded-full border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              {copy.saveLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Pricing cards */}
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-surface-300" />
          </div>
        ) : fetchErr ? (
          <div className="error-banner mx-auto max-w-md justify-center">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {t("pricing_load_error")}
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start"
          >
            {tiers.map((tier) => {
              const isPro = tier.id === "growth" || tier.id === "pro";
              const featureList = features(tier);
              const livePrice =
                billingPeriod === "annual" ? tier.price_annual : tier.price_monthly;
              const canCheckout =
                paymentEnabled && !tier.is_enterprise && !tier.is_free && typeof livePrice === "number";

              return (
                <motion.div
                  key={tier.id}
                  variants={fadeUp}
                  className={`relative flex h-full flex-col rounded-xl p-6 transition-shadow ${
                    isPro
                      ? "border-2 border-surface-900 bg-white shadow-raised"
                      : "border border-surface-200 bg-white shadow-card hover:shadow-raised"
                  }`}
                >
                  {isPro && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-surface-900 bg-surface-900 px-3.5 py-1 text-[10px] font-semibold tracking-wide text-white">
                      {t("pricing_popular") || (lang === "tr" ? "En Popüler" : "Most Popular")}
                    </div>
                  )}

                  {/* Tier name + price */}
                  <div className="mb-5">
                    <h3 className="text-base font-semibold text-surface-900">{name(tier)}</h3>
                    <div className="mt-3 flex items-baseline gap-1.5">
                      {tier.is_enterprise ? (
                        <span className="text-2xl font-bold text-surface-900">
                          {t("pricing_custom")}
                        </span>
                      ) : tier.is_free ? (
                        <>
                          <span className="text-3xl font-bold text-surface-900">₺0</span>
                          <span className="text-sm text-surface-400">{copy.monthlySuffix}</span>
                        </>
                      ) : (canCheckout || !paymentEnabled) && typeof livePrice === "number" ? (
                        <>
                          <span className="text-3xl font-bold text-surface-900">
                            {new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "en-US", {
                              style: "currency",
                              currency: "TRY",
                              maximumFractionDigits: 0,
                            }).format(livePrice)}
                          </span>
                          <span className="text-sm text-surface-400">
                            {billingPeriod === "annual" ? copy.annualSuffix : copy.monthlySuffix}
                          </span>
                        </>
                      ) : null}
                    </div>

                    {tier.hc_quota ? (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        <Coins className="h-3.5 w-3.5" />
                        {tier.is_free
                          ? t("pricing_pay_as_you_go")
                          : `${tier.hc_quota.toLocaleString(lang === "tr" ? "tr-TR" : "en-US")} HC`}
                      </div>
                    ) : null}
                  </div>

                  {/* CTA button */}
                  <div className="mb-6">
                    {tier.is_enterprise ? (
                      <a
                        href="mailto:info@heptapusgroup.com"
                        className="btn-secondary flex w-full justify-center text-sm"
                      >
                        {copy.enterpriseContact}
                      </a>
                    ) : tier.is_free ? (
                      <Link
                        href="/register"
                        className="btn-secondary flex w-full justify-center text-sm"
                      >
                        {copy.startFree}
                      </Link>
                    ) : canCheckout ? (
                      <Link
                        href={`/checkout?plan=${tier.id}&period=${billingPeriod}`}
                        className={`flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                          isPro
                            ? "bg-surface-900 text-white hover:bg-surface-800"
                            : "bg-surface-100 text-surface-900 hover:bg-surface-200"
                        }`}
                      >
                        {copy.checkout}
                      </Link>
                    ) : (
                      <button
                        onClick={() => setWlTier(tier)}
                        className={`flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                          isPro
                            ? "bg-surface-900 text-white hover:bg-surface-800"
                            : "bg-surface-100 text-surface-900 hover:bg-surface-200"
                        }`}
                      >
                        <Mail className="h-3.5 w-3.5" /> {copy.waitlistAction}
                      </button>
                    )}
                  </div>

                  {/* Feature list */}
                  <div className="border-t border-surface-100 pt-5">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                      {copy.included}
                    </p>
                    <ul className="space-y-2.5 text-sm text-surface-600">
                      {featureList.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2.5">
                          <CheckCircle2
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              isPro ? "text-surface-900" : "text-surface-400"
                            }`}
                          />
                          <span className="leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </section>

      {/* FAQ */}
      <section className="mx-auto mt-16 w-full max-w-2xl px-4 sm:px-6">
        <h2 className="mb-6 text-center text-xl font-bold text-surface-900">{copy.faqTitle}</h2>
        <div className="divide-y divide-surface-100 rounded-xl border border-surface-200 bg-white shadow-card">
          {([
            { q: t("pricing_faq_q1"), a: t("pricing_faq_a1") },
            { q: t("pricing_faq_q2"), a: t("pricing_faq_a2") },
            { q: t("pricing_faq_q3"), a: t("pricing_faq_a3") },
          ] as { q: string; a: string }[]).map((faq, i) => (
            <div key={i} className="px-6 py-5">
              <h4 className="text-sm font-semibold text-surface-900">{faq.q}</h4>
              <p className="mt-2 text-sm leading-relaxed text-surface-500">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {wlTier && <WaitlistModal tier={wlTier} lang={lang} onClose={() => setWlTier(null)} />}
    </div>
  );
}

function WaitlistModal({ tier, lang, onClose }: WaitlistModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const tierName = lang === "tr" ? tier.name_tr : tier.name_en;

  const mc =
    lang === "tr"
      ? {
          title: "Bekleme Listesine Katıl",
          subtitle: `${tierName} planı erişime açıldığında ilk sizin haberiniz olsun.`,
          name: "Ad Soyad",
          email: "E-posta Adresi",
          phone: "Telefon",
          note: "Ek Bilgi",
          optional: "isteğe bağlı",
          notePlaceholder: "Operasyon büyüklüğünüz veya özel ihtiyaçlarınız...",
          error: "Bir hata oluştu, lütfen tekrar deneyin.",
          successTitle: "Talebiniz Alındı",
          successBody: "Plan yayına açıldığında e-posta üzerinden sizinle iletişime geçeceğiz.",
          action: "Listeye Katıl",
          close: "Kapat",
        }
      : {
          title: "Join the Waitlist",
          subtitle: `Be the first to know when the ${tierName} plan is available.`,
          name: "Full Name",
          email: "Email Address",
          phone: "Phone Number",
          note: "Additional Notes",
          optional: "optional",
          notePlaceholder: "Tell us about your operation size or specific needs...",
          error: "Something went wrong. Please try again.",
          successTitle: "You're on the list",
          successBody: "We will contact you via email as soon as this plan goes live.",
          action: "Join the List",
          close: "Close",
        };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone.trim() || undefined,
          plan_interest: tier.id,
          note: note.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (d.ok) setDone(true);
      else setErr(mc.error);
    } catch {
      setErr(mc.error);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full overflow-hidden rounded-t-2xl border border-surface-200 bg-white shadow-modal sm:max-w-md sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-surface-150 bg-surface-50 px-2.5 py-1 text-xs font-medium text-surface-600">
              {tierName}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label={lang === "tr" ? "Kapat" : "Close"}
            className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center px-8 py-12 text-center">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900">{mc.successTitle}</h3>
            <p className="mt-2 text-sm text-surface-500">{mc.successBody}</p>
            <button onClick={onClose} className="btn-primary mt-8 w-full justify-center">
              {mc.close}
            </button>
          </div>
        ) : (
          <div className="px-5 py-5">
            <h3 className="text-base font-semibold text-surface-900">{mc.title}</h3>
            <p className="mt-1 text-sm text-surface-500">{mc.subtitle}</p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="label">{mc.name}</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                  <input
                    required
                    type="text"
                    className="input-field pl-9"
                    placeholder={lang === "tr" ? "Örn. Ayşe Yılmaz" : "e.g. Alex Morgan"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">{mc.email}</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                  <input
                    required
                    type="email"
                    className="input-field pl-9"
                    placeholder="mail@sirket.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">
                  {mc.phone}{" "}
                  <span className="font-normal text-surface-400">({mc.optional})</span>
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                  <input
                    type="tel"
                    className="input-field pl-9"
                    placeholder="+90 5xx xxx xx xx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label">
                  {mc.note}{" "}
                  <span className="font-normal text-surface-400">({mc.optional})</span>
                </label>
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  placeholder={mc.notePlaceholder}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {err && (
                <div className="error-banner text-xs">
                  <span>{err}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                className="btn-primary w-full justify-center"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {mc.action}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
