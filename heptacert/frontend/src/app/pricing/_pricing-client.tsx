"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ShieldCheck, Star, HelpCircle, Coins, Loader2, AlertCircle, Clock, Mail, X, Phone, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n, useT } from "@/lib/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8765/api";

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

export default function PricingPage() {
  const { lang } = useI18n();
  const t = useT();

  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState(false);
  const [paymentEnabled, setPaymentEnabled] = useState(false);

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

  return (
    <div className="flex flex-col gap-20 pb-20 pt-10">

      {/* HEADER */}
      <motion.section variants={containerVars} initial="hidden" animate="visible" className="text-center px-4">
        <motion.div variants={itemVars} className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-700">
          <Coins className="h-3.5 w-3.5 text-amber-500" /> HeptaCoin (HC) {t("pricing_model")}
        </motion.div>

        <motion.h1 variants={itemVars} className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
          {t("pricing_hero_title")} <span className="text-brand-600">{t("pricing_hero_highlight")}</span>
        </motion.h1>

        <motion.p variants={itemVars} className="mx-auto mt-5 max-w-xl text-lg text-gray-500">
          {t("pricing_hero_sub")}
        </motion.p>

        {/* Toggle removed — prices are hidden until paid plans launch */}
      </motion.section>

      {/* PRICING CARDS */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-brand-400" />
        </div>
      ) : fetchErr ? (
        <div className="error-banner mx-auto max-w-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {t("pricing_load_error")}
        </div>
      ) : (
        <motion.section
          variants={containerVars} initial="hidden" animate="visible"
          className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4 items-center max-w-7xl mx-auto w-full px-4"
        >
          {tiers.map((tier) => {
            const isPro = tier.id === "growth";
            const featureList = features(tier);
            const Icon = tier.is_enterprise ? ShieldCheck : CheckCircle2;

            return (
              <motion.div key={tier.id} variants={itemVars}
                className={`relative card p-8 ${isPro ? "border-brand-200 bg-brand-50 shadow-brand md:scale-105 z-10" : ""}`}>

                {isPro && (
                  <div className="absolute -top-4 left-0 right-0 mx-auto w-fit rounded-full bg-brand-600 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-md">
                    {t("pricing_popular")}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h3 className={`font-black ${isPro ? "text-2xl text-gray-900" : "text-xl text-gray-800"}`}>{name(tier)}</h3>
                  {isPro && <Star className="h-6 w-6 text-amber-500 fill-amber-400/30" />}
                </div>

                <div className="mt-6 flex items-baseline gap-1">
                  {tier.is_enterprise ? (
                    <span className="text-4xl font-black text-gray-900">{t("pricing_custom")}</span>
                  ) : tier.is_free ? (
                    <>
                      <span className={`font-black text-gray-900 ${isPro ? "text-5xl" : "text-4xl"}`}>₺0</span>
                      <span className="text-sm font-medium text-gray-400">/ {t("pricing_month")}</span>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">
                      <Clock className="h-3.5 w-3.5" /> Yakında Satışta
                    </span>
                  )}
                </div>

                {tier.hc_quota && (
                  <p className={`mt-2 text-xs font-semibold ${isPro ? "text-brand-600" : "text-amber-600"}`}>
                    {tier.is_free ? t("pricing_pay_as_you_go") : `${t("pricing_monthly_hc")} ${tier.hc_quota.toLocaleString("tr-TR")} HC`}
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
                ) : (
                  <button
                    onClick={() => openWaitlist(tier)}
                    className="btn-primary mt-8 flex w-full justify-center items-center gap-2"
                  >
                    <Mail className="h-4 w-4" /> Bekleme Listesine Katıl
                  </button>
                )}

                <ul className={`mt-8 space-y-4 text-sm ${isPro ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                  {featureList.map((f, fi) => (
                    <li key={fi} className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 shrink-0 ${isPro ? "text-brand-500" : tier.is_enterprise ? "text-gray-400" : "text-emerald-500"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </motion.section>
      )}

      {/* FAQ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="mx-auto max-w-3xl w-full px-4"
      >
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-6 mb-8 text-center">
          <p className="text-sm font-semibold text-amber-800">🚀 Ücretli planlar yakında devreye giriyor! Bekleme listesine katılarak erken bildirim al ve özel lansman avantajlarından yararlan.</p>
        </div>
        <div className="flex items-center justify-center gap-2 mb-8">
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
      {/* Waitlist Modal */}
      {wlTier && <WaitlistModal tier={wlTier} lang={lang} onClose={() => setWlTier(null)} />}    </div>
  );
}

// ─── Waitlist Modal ────────────────────────────────────────────────────────────────
type WaitlistModalProps = {
  tier: PricingTier;
  lang: string;
  onClose: () => void;
};

function WaitlistModal({ tier, lang, onClose }: WaitlistModalProps) {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8765/api";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      else setErr("Bir hata oluştu, lütfen tekrar deneyin.");
    } catch { setErr("Bir hata oluştu, lütfen tekrar deneyin."); }
    finally { setSending(false); }
  }

  const tierName = lang === "tr" ? tier.name_tr : tier.name_en;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-8 z-10">
        <button onClick={onClose} className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
          <X className="h-5 w-5" />
        </button>

        {done ? (
          <div className="text-center py-6 space-y-4">
            <div className="flex h-16 w-16 items-center justify-center mx-auto rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Kayıt Oldu!</h3>
            <p className="text-sm text-gray-500">Şirket tesciliniz tamamlandığında sizinle iletişime geçeceğiz. Teşekkürler!</p>
            <button onClick={onClose} className="btn-primary w-full mt-2">Tamam</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Bekleme Listesine Katıl</h3>
                <p className="text-xs text-gray-400">{tierName} plan — Ücretli planlar açılınca sizi bilgilendirelim</p>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Ad Soyad *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input required className="input-field pl-10" type="text" placeholder="Örn. Ahmet Yılmaz" value={name} onChange={e => setName(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">E-posta *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input required className="input-field pl-10" type="email" placeholder="email@sirket.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Telefon <span className="text-gray-400 text-xs">(isteğe bağlı)</span></label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input className="input-field pl-10" type="tel" placeholder="+90 5xx xxx xx xx" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Not <span className="text-gray-400 text-xs">(isteğe bağlı)</span></label>
                <textarea
                  className="input-field resize-none"
                  rows={2}
                  placeholder="Kullanım amacınız veya sorularınız..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
              {err && <div className="error-banner">{err}</div>}
              <button type="submit" disabled={sending} className="btn-primary w-full gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Listeye Katıl
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

