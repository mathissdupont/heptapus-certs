"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ShieldCheck, Star, HelpCircle, Coins, Loader2, AlertCircle, Clock, Mail, X, Phone, User, Sparkles, Globe2 } from "lucide-react";
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

export default function PricingPage() {
  const { lang } = useI18n();
  const t = useT();

  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState(false);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");

  // Waitlist modal state
  const [wlTier, setWlTier] = useState<PricingTier | null>(null);

  function openWaitlist(tier: PricingTier) {
    setWlTier(tier);
  }

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/pricing/config`)
        .then(r => r.json())
        .then((d: { tiers: PricingTier[] }) => { if (d.tiers?.length) setTiers(d.tiers); })
        .catch(() => setFetchErr(true)),
      fetch(`${API_BASE}/billing/status`)
        .then(r => r.json())
        .then((d: { enabled: boolean }) => setPaymentEnabled(!!d.enabled))
        .catch(() => {/* ignore, default false */ }),
    ]).finally(() => setLoading(false));
  }, []);

  const containerVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVars = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  const name = (tier: PricingTier) => lang === "tr" ? tier.name_tr : tier.name_en;
  const features = (tier: PricingTier) => lang === "tr" ? tier.features_tr : tier.features_en;

  const copy = lang === "tr" ? {
    badge: paymentEnabled ? "Ödeme Sistemi Aktif" : "Ücretli Planlar Yakında",
    title: "İhtiyacınıza uygun, şeffaf fiyatlandırma",
    subtitle: "Operasyonunuz büyüdükçe ölçeklenen esnek planlar. Sürpriz ücret yok.",
    monthly: "Aylık",
    annual: "Yıllık",
    saveLabel: "2 ay bedava",
    included: "Plana dahil olanlar:",
    checkout: "Hemen Başla",
    waitlistAction: "Bekleme Listesine Katıl",
    comingSoon: "Yakında Aktif",
    annualHint: "Uzun süreli kullanım için daha uygun",
    monthlySuffix: "/ ay",
    annualSuffix: "/ yıl",
    faqTitle: "Sıkça Sorulan Sorular",
    enterpriseContact: "Satış Ekibiyle Görüşün",
    startFree: "Ücretsiz Başla",
    memberTitle: "Uyelik Premium",
    memberSubtitle: "Normal kullanicilar icin tasarlanmis sosyal ve profil odakli premium paketler.",
    memberCta: "Uyelik hesabimdan incele"
  } : {
    badge: paymentEnabled ? "Checkout is Live" : "Paid Plans Coming Soon",
    title: "Simple, transparent pricing",
    subtitle: "Flexible plans that scale as your operations grow. No hidden fees.",
    monthly: "Monthly",
    annual: "Annually",
    saveLabel: "2 months free",
    included: "What's included:",
    checkout: "Get Started",
    waitlistAction: "Join the Waitlist",
    comingSoon: "Coming Soon",
    annualHint: "Better for long-term usage",
    monthlySuffix: "/ mo",
    annualSuffix: "/ yr",
    faqTitle: "Frequently Asked Questions",
    enterpriseContact: "Contact Sales",
    startFree: "Start for Free",
    memberTitle: "Member Premium",
    memberSubtitle: "Premium plans designed for regular users with a stronger focus on profile and social features.",
    memberCta: "Manage from my membership"
  };

  return (
    <div className="flex flex-col gap-16 pb-24 pt-12 bg-slate-50 min-h-screen">

      {/* HERO & HEADER */}
      <section className="mx-auto w-full max-w-4xl px-6 text-center lg:px-8">
        <motion.div variants={containerVars} initial="hidden" animate="visible" className="flex flex-col items-center">
          <motion.div variants={itemVars} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
            {paymentEnabled ? <ShieldCheck className="h-4 w-4 text-emerald-500" /> : <Clock className="h-4 w-4 text-amber-500" />}
            {copy.badge}
          </motion.div>

          <motion.h1 variants={itemVars} className="mt-8 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            {copy.title}
          </motion.h1>

          <motion.p variants={itemVars} className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            {copy.subtitle}
          </motion.p>
        </motion.div>
      </section>

      <section id="member-premium" className="mx-auto w-full max-w-6xl px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
            <Globe2 className="h-4 w-4" />
            {copy.memberTitle}
          </div>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900">{copy.memberTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600">{copy.memberSubtitle}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              id: "member_plus",
              title: "Member Plus",
              tone: "border-sky-200 bg-sky-50/70",
              features: lang === "tr"
                ? ["Geliştirilmiş profil görünümü", "Topluluk ve feed tarafında premium üye katmanı", "Sosyal özeliklerde premium hazırlanmış"]
                : ["Enhanced profile visibility", "Premium member tier across communities and feed", "Premium-ready tier for social features"],
            },
            {
              id: "member_pro",
              title: "Member Pro",
              tone: "border-emerald-200 bg-emerald-50/70",
              features: lang === "tr"
                ? ["Plus özeliklerinin tamamı", "Topluluklarda daha güçlü görünürlük", "Yeni sosyal özellikler için öncelikli premium katman"]
                : ["Everything in Plus", "Stronger visibility across communities", "Priority premium tier for upcoming social features"],
            },
          ].map((plan) => (
            <div key={plan.id} className={`rounded-[2rem] border p-8 shadow-sm ${plan.tone}`}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{plan.id.replace("_", " ")}</p>
              <h3 className="mt-3 text-2xl font-extrabold text-slate-900">{plan.title}</h3>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-900" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/profile"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                {copy.memberCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="mx-auto w-full max-w-7xl px-6 lg:px-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-slate-300" />
          </div>
        ) : fetchErr ? (
          <div className="mx-auto flex max-w-lg items-center justify-center gap-2 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600">
            <AlertCircle className="h-5 w-5" /> {t("pricing_load_error")}
          </div>
        ) : (
          <>
            {/* BILLING TOGGLE (Merkeze, kartların tam üstüne alındı - Doğru UX) */}
            <div className="mb-10 flex justify-center">
              <div className="relative flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  className={`relative w-32 rounded-full py-2.5 text-sm font-semibold transition-all ${billingPeriod === "monthly" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                  {copy.monthly}
                </button>
                <button
                  onClick={() => setBillingPeriod("annual")}
                  className={`relative w-32 rounded-full py-2.5 text-sm font-semibold transition-all ${billingPeriod === "annual" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                  {copy.annual}
                  {/* Minik indirim rozeti */}
                  <span className="absolute -right-3 -top-3 rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 shadow-sm">
                    {copy.saveLabel}
                  </span>
                </button>
              </div>
            </div>

            {/* PRICING CARDS */}
            <motion.div variants={containerVars} initial="hidden" animate="visible" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start">
              {tiers.map((tier) => {
                const isPro = tier.id === "growth" || tier.id === "pro"; // Hangi ID ana plan ise onu vurgula
                const featureList = features(tier);
                const Icon = tier.is_enterprise ? ShieldCheck : CheckCircle2;
                const livePrice = billingPeriod === "annual" ? tier.price_annual : tier.price_monthly;
                const canCheckout = paymentEnabled && !tier.is_enterprise && !tier.is_free && typeof livePrice === "number";

                return (
                  <motion.div
                    key={tier.id}
                    variants={itemVars}
                    className={`relative flex h-full flex-col rounded-[2rem] p-8 transition-all duration-200 ${isPro
                        ? "border-2 border-slate-900 bg-white shadow-xl scale-[1.02] z-10"
                        : "border border-slate-200 bg-white shadow-sm hover:shadow-md"
                      }`}
                  >
                    {isPro && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-1 text-xs font-bold tracking-wide text-white shadow-sm">
                        {t("pricing_popular") || "En Popüler"}
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-slate-900">{name(tier)}</h3>
                      <div className="mt-4 flex items-baseline gap-2">
                        {tier.is_enterprise ? (
                          <span className="text-3xl font-extrabold tracking-tight text-slate-900">{t("pricing_custom")}</span>
                        ) : tier.is_free ? (
                          <>
                            <span className="text-4xl font-extrabold tracking-tight text-slate-900">₺0</span>
                            <span className="text-sm font-medium text-slate-500">{copy.monthlySuffix}</span>
                          </>
                        ) : canCheckout || !paymentEnabled ? (
                          <>
                            <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                              {new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "en-US", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(livePrice || 0)}
                            </span>
                            <span className="text-sm font-medium text-slate-500">
                              {billingPeriod === "annual" ? copy.annualSuffix : copy.monthlySuffix}
                            </span>
                          </>
                        ) : null}
                      </div>

                      {tier.hc_quota && (
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          <Coins className="h-3.5 w-3.5" />
                          {tier.is_free ? t("pricing_pay_as_you_go") : `${tier.hc_quota.toLocaleString(lang === "tr" ? "tr-TR" : "en-US")} HC`}
                        </div>
                      )}
                    </div>

                    {/* ACTION BUTTON */}
                    <div className="mt-auto mb-8">
                      {tier.is_enterprise ? (
                        <a href="mailto:info@heptapusgroup.com" className="flex w-full items-center justify-center rounded-xl border-2 border-slate-200 bg-transparent px-4 py-3.5 text-sm font-bold text-slate-900 transition-colors hover:border-slate-300 hover:bg-slate-50">
                          {copy.enterpriseContact}
                        </a>
                      ) : tier.is_free ? (
                        <Link href="/register" className="flex w-full items-center justify-center rounded-xl border-2 border-slate-200 bg-transparent px-4 py-3.5 text-sm font-bold text-slate-900 transition-colors hover:border-slate-300 hover:bg-slate-50">
                          {copy.startFree}
                        </Link>
                      ) : canCheckout ? (
                        <Link href={`/checkout?plan=${tier.id}&period=${billingPeriod}`} className={`flex w-full items-center justify-center rounded-xl px-4 py-3.5 text-sm font-bold transition-all ${isPro ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-900 hover:bg-slate-200"}`}>
                          {copy.checkout}
                        </Link>
                      ) : (
                        <button onClick={() => openWaitlist(tier)} className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition-all ${isPro ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-900 hover:bg-slate-200"}`}>
                          <Mail className="h-4 w-4" /> {copy.waitlistAction}
                        </button>
                      )}
                    </div>

                    {/* FEATURES LIST */}
                    <div className="border-t border-slate-100 pt-6">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">{copy.included}</p>
                      <ul className="space-y-3.5 text-sm text-slate-600">
                        {featureList.map((f, fi) => (
                          <li key={fi} className="flex items-start gap-3">
                            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isPro ? "text-slate-900" : "text-slate-400"}`} />
                            <span className="leading-snug">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </>
        )}
      </section>

      {/* FAQ SECTION */}
      <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mx-auto mt-12 w-full max-w-3xl px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{copy.faqTitle}</h2>
        </div>

        <div className="grid gap-4">
          {([
            { q: t("pricing_faq_q1"), a: t("pricing_faq_a1") },
            { q: t("pricing_faq_q2"), a: t("pricing_faq_a2") },
            { q: t("pricing_faq_q3"), a: t("pricing_faq_a3") },
          ] as { q: string; a: string }[]).map((faq, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:shadow-md">
              <h4 className="text-base font-bold text-slate-900">{faq.q}</h4>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* MODAL */}
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

  const modalCopy = lang === "tr" ? {
    title: "Bekleme Listesine Katıl",
    subtitle: `${tierName} planı erişime açıldığında ilk sizin haberiniz olsun.`,
    name: "Ad Soyad",
    email: "E-posta Adresi",
    phone: "Telefon Numarası",
    note: "Eklemek İstedikleriniz",
    optional: "isteğe bağlı",
    notePlaceholder: "Operasyon büyüklüğünüz veya özel ihtiyaçlarınız...",
    error: "Bir hata oluştu, lütfen tekrar deneyin.",
    successTitle: "Talebiniz Alındı",
    successBody: "Plan yayına açıldığında e-posta üzerinden sizinle iletişime geçeceğiz.",
    action: "Listeye Katıl",
    close: "Kapat",
  } : {
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
    e.preventDefault(); setErr(null); setSending(true);
    try {
      const res = await fetch(`${API_BASE}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone: phone.trim() || undefined, plan_interest: tier.id, note: note.trim() || undefined }),
      });
      const d = await res.json();
      if (d.ok) setDone(true);
      else setErr(modalCopy.error);
    } catch { setErr(modalCopy.error); }
    finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            <Mail className="h-3.5 w-3.5" /> {tierName}
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center px-8 py-12 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{modalCopy.successTitle}</h3>
            <p className="mt-2 text-sm text-slate-500">{modalCopy.successBody}</p>
            <button onClick={onClose} className="mt-8 w-full rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white hover:bg-slate-800">
              {modalCopy.close}
            </button>
          </div>
        ) : (
          <div className="px-6 py-6">
            <div className="mb-6">
              <h3 className="text-2xl font-extrabold text-slate-900">{modalCopy.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{modalCopy.subtitle}</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{modalCopy.name}</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input required className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900" type="text" placeholder={lang === "tr" ? "Örn. Ayşe Yılmaz" : "e.g. Alex Morgan"} value={name} onChange={e => setName(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{modalCopy.email}</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input required className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900" type="email" placeholder="mail@sirket.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{modalCopy.phone} <span className="font-normal text-slate-400 lowercase">({modalCopy.optional})</span></label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900" type="tel" placeholder="+90 5xx xxx xx xx" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{modalCopy.note} <span className="font-normal text-slate-400 lowercase">({modalCopy.optional})</span></label>
                <textarea className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-900" rows={3} placeholder={modalCopy.notePlaceholder} value={note} onChange={e => setNote(e.target.value)} />
              </div>

              {err && <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600">{err}</div>}

              <button type="submit" disabled={sending} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-70">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {modalCopy.action}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
