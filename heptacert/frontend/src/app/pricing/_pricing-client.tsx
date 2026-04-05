"use client";

import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, CheckCircle2, ShieldCheck, Star, HelpCircle, Coins, Loader2, AlertCircle, Clock, Mail, X, Phone, User, Sparkles, Globe2 } from "lucide-react";
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
        .catch(() => {/* ignore, default false */}),
    ]).finally(() => setLoading(false));
  }, []);

  const containerVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
  };

  const name = (tier: PricingTier) => lang === "tr" ? tier.name_tr : tier.name_en;
  const features = (tier: PricingTier) => lang === "tr" ? tier.features_tr : tier.features_en;
  const copy = lang === "tr"
    ? {
        heroCardTitle: paymentEnabled ? "Odeme akisi hazir" : "Ucretli planlar yakinda aciliyor",
        heroCardBody: paymentEnabled
          ? "Planinizi secip guvenli checkout akisina gecebilirsiniz."
          : "Bekleme listesine katilarak ucretli planlar acildiginda ilk haberi alabilirsiniz.",
        billingPeriod: "Fatura donemi",
        monthly: "Aylik",
        annual: "Yillik",
        overviewTitle: "Plan mantigi",
        overviewBody: "Her plan farkli etkinlik yogunlugu icin optimize edildi.",
        overviewCards: [
          {
            title: "Basit baslangic",
            body: "Ucretsiz planda temel operasyonlari hizlica ayaga kaldirabilirsiniz.",
            icon: Sparkles,
          },
          {
            title: "Buyudukce odeme",
            body: "Kapasite ve araclar ekip ihtiyaciniza gore genisler.",
            icon: Coins,
          },
          {
            title: "Kurumsal esneklik",
            body: "Daha buyuk seminar organizasyonlari icin ozel kurgu kurulabilir.",
            icon: Globe2,
          },
        ],
        paymentLive: "Canli odeme",
        waitlistOpen: "Bekleme listesi acik",
        trustTitle: "Neden daha rahat hissettiriyor?",
        trustItems: [
          "Sertifika, katilim ve e-posta akislarini ayni yerde toplar.",
          "Mobilde daha kolay okunur kart yapisi sunar.",
          "Uluslararasi seminerler icin daha guvenli bir vitrin olusturur.",
        ],
        included: "Neler dahil?",
        checkout: "Checkout'a git",
        waitlistAction: "Bekleme listesine katil",
        comingSoon: "Yayina acildiginda aktif olacak",
        annualHint: "Uzun sureli kullanim icin daha uygun",
        monthlySuffix: "/ ay",
        annualSuffix: "/ yil",
      }
    : {
        heroCardTitle: paymentEnabled ? "Checkout is live" : "Paid plans are opening soon",
        heroCardBody: paymentEnabled
          ? "Choose your plan and continue into the secure checkout flow."
          : "Join the waitlist to hear first when paid plans become available.",
        billingPeriod: "Billing period",
        monthly: "Monthly",
        annual: "Annual",
        overviewTitle: "How the plans work",
        overviewBody: "Each plan is tuned for a different event workload.",
        overviewCards: [
          {
            title: "Fast start",
            body: "The free plan is enough to launch your first operational setup quickly.",
            icon: Sparkles,
          },
          {
            title: "Pay as you grow",
            body: "Capacity and tooling expand as your team and seminar volume increase.",
            icon: Coins,
          },
          {
            title: "Enterprise flexibility",
            body: "Larger seminar programs can be handled with a tailored setup.",
            icon: Globe2,
          },
        ],
        paymentLive: "Live checkout",
        waitlistOpen: "Waitlist open",
        trustTitle: "Why it feels easier",
        trustItems: [
          "Keeps certificates, attendees and email operations in the same surface.",
          "Uses clearer cards and spacing on mobile.",
          "Presents a stronger public-facing experience for international seminars.",
        ],
        included: "Included in this plan",
        checkout: "Go to checkout",
        waitlistAction: "Join the waitlist",
        comingSoon: "Will activate when launch goes live",
        annualHint: "Better for longer-term usage",
        monthlySuffix: "/ month",
        annualSuffix: "/ year",
      };

  return (
    <div className="flex flex-col gap-12 pb-20 pt-8 sm:gap-16 sm:pt-10">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <motion.div variants={containerVars} initial="hidden" animate="visible" className="card overflow-hidden p-7 sm:p-10">
          <motion.div variants={itemVars} className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-700">
            <Coins className="h-3.5 w-3.5 text-amber-500" /> HeptaCoin (HC) {t("pricing_model")}
          </motion.div>

          <motion.h1 variants={itemVars} className="mt-6 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            {t("pricing_hero_title")} <span className="text-brand-600">{t("pricing_hero_highlight")}</span>
          </motion.h1>

          <motion.p variants={itemVars} className="mt-5 max-w-2xl text-base leading-7 text-gray-500 sm:text-lg">
            {t("pricing_hero_sub")}
          </motion.p>

          <motion.div variants={itemVars} className="mt-8 grid gap-3 sm:grid-cols-3">
            {copy.overviewCards.map(({ title, body, icon: Icon }) => (
              <div key={title} className="rounded-2xl border border-surface-200 bg-surface-50 px-4 py-4 text-sm font-medium leading-6 text-surface-700">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-soft">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="font-bold text-surface-900">{title}</p>
                <p className="mt-1 text-surface-500">{body}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.aside initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="card p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              {paymentEnabled ? copy.paymentLive : copy.waitlistOpen}
            </div>
            <div className="rounded-full border border-surface-200 bg-surface-50 px-3 py-1 text-xs font-semibold text-surface-500">
              {copy.billingPeriod}
            </div>
          </div>

          <h2 className="mt-6 text-2xl font-black tracking-tight text-surface-900">{copy.heroCardTitle}</h2>
          <p className="mt-3 text-sm leading-7 text-surface-500">{copy.heroCardBody}</p>

          <div className="mt-6 rounded-3xl border border-surface-200 bg-surface-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.billingPeriod}</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBillingPeriod("monthly")}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${billingPeriod === "monthly" ? "bg-white text-surface-900 shadow-soft" : "text-surface-500 hover:bg-white/80"}`}
              >
                {copy.monthly}
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod("annual")}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${billingPeriod === "annual" ? "bg-white text-surface-900 shadow-soft" : "text-surface-500 hover:bg-white/80"}`}
              >
                {copy.annual}
              </button>
            </div>
            <p className="mt-3 text-xs leading-6 text-surface-500">{copy.annualHint}</p>
          </div>

          <div className="mt-6 space-y-3">
            {copy.trustItems.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-surface-200 bg-white px-4 py-4 text-sm leading-6 text-surface-600">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <BadgeCheck className="h-4 w-4" />
                </div>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </motion.aside>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-surface-400">{copy.overviewTitle}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-surface-900">{copy.overviewBody}</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-surface-200 bg-white px-3 py-2 text-xs font-semibold text-surface-500 shadow-soft">
            <Clock className="h-3.5 w-3.5" />
            {paymentEnabled ? copy.paymentLive : copy.comingSoon}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-brand-400" />
          </div>
        ) : fetchErr ? (
          <div className="error-banner mx-auto flex max-w-lg items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {t("pricing_load_error")}
          </div>
        ) : (
          <motion.section
            variants={containerVars}
            initial="hidden"
            animate="visible"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {tiers.map((tier) => {
              const isPro = tier.id === "growth";
              const featureList = features(tier);
              const Icon = tier.is_enterprise ? ShieldCheck : CheckCircle2;
              const livePrice = billingPeriod === "annual" ? tier.price_annual : tier.price_monthly;
              const canCheckout = paymentEnabled && !tier.is_enterprise && !tier.is_free && typeof livePrice === "number";

              return (
                <motion.div
                  key={tier.id}
                  variants={itemVars}
                  className={`relative card flex h-full flex-col p-6 sm:p-7 ${isPro ? "border-brand-200 bg-brand-50/60 shadow-brand" : ""}`}
                >
                  {isPro && (
                    <div className="absolute -top-3 left-6 inline-flex items-center gap-2 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold text-white shadow-soft">
                      <Star className="h-3.5 w-3.5" />
                      {t("pricing_popular")}
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <h3 className={`font-black ${isPro ? "text-2xl text-surface-900" : "text-xl text-surface-800"}`}>{name(tier)}</h3>
                    <div className="rounded-full border border-surface-200 bg-white px-3 py-1 text-[11px] font-semibold text-surface-500 shadow-soft">
                      {tier.is_enterprise ? "Enterprise" : billingPeriod === "annual" ? copy.annual : copy.monthly}
                    </div>
                  </div>

                  <div className="mt-6 min-h-[64px]">
                    {tier.is_enterprise ? (
                      <span className="text-4xl font-black text-surface-900">{t("pricing_custom")}</span>
                    ) : tier.is_free ? (
                      <div className="flex items-end gap-2">
                        <span className={`font-black text-surface-900 ${isPro ? "text-5xl" : "text-4xl"}`}>₺0</span>
                        <span className="pb-1 text-sm font-medium text-surface-400">/ {t("pricing_month")}</span>
                      </div>
                    ) : canCheckout ? (
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-surface-900">
                          {new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "en-US", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(livePrice)}
                        </span>
                        <span className="pb-1 text-sm font-medium text-surface-400">
                          {billingPeriod === "annual" ? copy.annualSuffix : copy.monthlySuffix}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">
                        <Clock className="h-3.5 w-3.5" /> {copy.comingSoon}
                      </span>
                    )}
                  </div>

                  {tier.hc_quota && (
                    <p className={`mt-2 text-xs font-semibold ${isPro ? "text-brand-600" : "text-amber-600"}`}>
                      {tier.is_free ? t("pricing_pay_as_you_go") : `${t("pricing_monthly_hc")} ${tier.hc_quota.toLocaleString(lang === "tr" ? "tr-TR" : "en-US")} HC`}
                    </p>
                  )}

                  {tier.is_enterprise ? (
                    <a href="mailto:info@heptapusgroup.com" className="btn-secondary mt-8 flex w-full justify-center">
                      {t("pricing_contact")}
                    </a>
                  ) : tier.is_free ? (
                    <Link href="/register" className="btn-secondary mt-8 flex w-full justify-center">
                      {t("pricing_start_free")}
                    </Link>
                  ) : canCheckout ? (
                    <Link href={`/checkout?plan=${tier.id}&period=${billingPeriod}`} className="btn-primary mt-8 flex w-full justify-center gap-2">
                      {copy.checkout}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <button onClick={() => openWaitlist(tier)} className="btn-primary mt-8 flex w-full items-center justify-center gap-2">
                      <Mail className="h-4 w-4" /> {copy.waitlistAction}
                    </button>
                  )}

                  <div className="mt-7 border-t border-surface-100 pt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.included}</p>
                    <ul className={`mt-4 space-y-4 text-sm ${isPro ? "text-surface-700 font-medium" : "text-surface-500"}`}>
                      {featureList.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-3">
                          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isPro ? "text-brand-500" : tier.is_enterprise ? "text-surface-400" : "text-emerald-500"}`} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </motion.section>
        )}
      </section>

      {/* FAQ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="mx-auto max-w-4xl w-full"
      >
        <div className="mb-8 rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-6 text-center">
          <p className="text-sm font-semibold leading-7 text-amber-800">
            {lang === "tr"
              ? "Ucretli planlar acildiginda erken bildirim ve daha temiz bir onboarding akisi icin bekleme listesine katilabilirsiniz."
              : "Join the waitlist for early launch updates and a smoother onboarding path once paid plans go live."}
          </p>
        </div>
        <div className="mb-8 flex items-center justify-center gap-2">
          <HelpCircle className="h-5 w-5 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900">{t("pricing_faq_title")}</h2>
        </div>

        <div className="grid gap-4">
          {([
            { q: t("pricing_faq_q1"), a: t("pricing_faq_a1") },
            { q: t("pricing_faq_q2"), a: t("pricing_faq_a2") },
            { q: t("pricing_faq_q3"), a: t("pricing_faq_a3") },
          ] as { q: string; a: string }[]).map((faq, i) => (
            <div key={i} className="card p-6">
              <h4 className="text-base font-bold text-gray-800">{faq.q}</h4>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </motion.section>
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

  const modalCopy = lang === "tr"
    ? {
        title: "Bekleme listesine katil",
        subtitle: `${tierName} plan acildiginda size haber verelim.`,
        name: "Ad soyad",
        email: "E-posta",
        phone: "Telefon",
        note: "Not",
        optional: "istege bagli",
        notePlaceholder: "Kullanim amaciniz, ekip boyutunuz veya ozel ihtiyacinizi paylasabilirsiniz.",
        error: "Bir hata olustu, lutfen tekrar deneyin.",
        successTitle: "Kaydiniz alindi",
        successBody: "Plan yayina acildiginda sizinle iletisime gececegiz.",
        action: "Listeye katil",
        close: "Kapat",
      }
    : {
        title: "Join the waitlist",
        subtitle: `We will let you know when the ${tierName} plan becomes available.`,
        name: "Full name",
        email: "Email",
        phone: "Phone",
        note: "Note",
        optional: "optional",
        notePlaceholder: "Share your use case, team size or any specific need.",
        error: "Something went wrong. Please try again.",
        successTitle: "You are on the list",
        successBody: "We will contact you as soon as this plan goes live.",
        action: "Join the list",
        close: "Close",
      };

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setSending(true);
    try {
      const res = await fetch(`${API_BASE}/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email,
          phone: phone.trim() || undefined,
          plan_interest: tier.id,
          note: note.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (d.ok) setDone(true);
      else setErr(modalCopy.error);
    } catch { setErr(modalCopy.error); }
    finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-surface-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-surface-100 px-5 py-5 sm:px-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-700">
              <Mail className="h-3.5 w-3.5" />
              {tierName}
            </div>
            <h3 className="mt-3 text-xl font-bold text-surface-900">{done ? modalCopy.successTitle : modalCopy.title}</h3>
            <p className="mt-2 text-sm leading-6 text-surface-500">{done ? modalCopy.successBody : modalCopy.subtitle}</p>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-surface-200 p-2 text-surface-400 transition-colors hover:border-surface-300 hover:text-surface-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="space-y-5 px-5 py-6 sm:px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <button onClick={onClose} className="btn-primary w-full justify-center">{modalCopy.close}</button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
              <div>
                <label className="label">{modalCopy.name}</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input required className="input-field pl-10" type="text" placeholder={lang === "tr" ? "Orn. Ayse Yilmaz" : "e.g. Alex Morgan"} value={name} onChange={e => setName(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">{modalCopy.email}</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input required className="input-field pl-10" type="email" placeholder="email@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">{modalCopy.phone} <span className="text-gray-400 text-xs">({modalCopy.optional})</span></label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input className="input-field pl-10" type="tel" placeholder="+90 5xx xxx xx xx" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">{modalCopy.note} <span className="text-gray-400 text-xs">({modalCopy.optional})</span></label>
                <textarea
                  className="input-field resize-none"
                  rows={4}
                  placeholder={modalCopy.notePlaceholder}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
              {err && <div className="error-banner">{err}</div>}
            </div>
            <div className="border-t border-surface-100 px-5 py-4 sm:px-6">
              <button type="submit" disabled={sending} className="btn-primary w-full justify-center gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {modalCopy.action}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

