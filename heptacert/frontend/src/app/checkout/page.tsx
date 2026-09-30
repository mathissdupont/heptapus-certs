"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch, API_BASE } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function CheckoutContent() {
  const { lang } = useI18n();
  const params = useSearchParams();
  const planId = params.get("plan") || "";
  const period = (params.get("period") as "monthly" | "annual") || "monthly";

  const [status, setStatus] = useState<{ enabled: boolean; provider: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);

  const copy = useMemo(() => lang === "tr" ? {
    title: "Ödeme ve aktivasyon",
    body: "Planınızı güvenli şekilde etkinleştirmek için ödeme sağlayıcısına yönlendirileceksiniz.",
    secure: "Güvenli ödeme",
    launchTitle: "Yakında burada",
    launchBody: "Ücretli plan ve ödeme altyapısı tam yayına açıldığında bu akış doğrudan kullanılabilir olacak. Şimdilik ücretsiz planla devam edebilirsiniz.",
    startFree: "Ücretsiz başla",
    backPricing: "Planlara dön",
    provider: "Sağlayıcı",
    prepare: "İşlem hazırlanıyor...",
    payNow: "Ödemeye geç",
    summaryTitle: "Bu akışta ne olur?",
    summaryPoints: ["Plan seçiminiz hazırlanır", "Güvenli ödeme sağlayıcısına geçilir", "Başarılı ödeme sonrası paneliniz aktive edilir"],
    embeddedTitle: "Ödeme adımı",
    embeddedBody: "Aşağıdaki güvenli ödeme alanını tamamladıktan sonra akışınız otomatik olarak ilerler.",
    cancel: "İptal et, planlara dön",
    periodLabel: period === "annual" ? "Yıllık" : "Aylık",
    selectedPlan: "Seçilen plan",
  } : {
    title: "Checkout and activation",
    body: "You will be redirected to the payment provider to activate your selected plan securely.",
    secure: "Secure payment",
    launchTitle: "Coming soon",
    launchBody: "When paid plans and the payment stack are fully enabled, this flow will go live here. For now, you can continue with the free plan.",
    startFree: "Start free",
    backPricing: "Back to pricing",
    provider: "Provider",
    prepare: "Preparing checkout...",
    payNow: "Continue to payment",
    summaryTitle: "What happens next?",
    summaryPoints: ["Your plan selection is prepared", "You are transferred to the secure payment provider", "Your workspace is activated after successful payment"],
    embeddedTitle: "Payment step",
    embeddedBody: "Complete the secure payment area below and the flow will continue automatically.",
    cancel: "Cancel and go back to pricing",
    periodLabel: period === "annual" ? "Annual" : "Monthly",
    selectedPlan: "Selected plan",
  }, [lang, period]);

  useEffect(() => {
    fetch(`${API_BASE}/billing/status`).then((r) => r.json()).then(setStatus).catch(() => setErr(lang === "tr" ? "Ödeme sistemi durumu alınamadı." : "Unable to load payment system status."));
  }, [lang]);

  async function startPayment() {
    setLoading(true);
    setErr(null);
    try {
      const res = await apiFetch("/billing/create-payment", {
        method: "POST",
        body: JSON.stringify({ plan_id: planId, billing_period: period }),
      });
      const data = await res.json();
      if (data.checkout_url) window.location.href = data.checkout_url;
      else if (data.checkout_html) setCheckoutHtml(data.checkout_html);
      else setErr(data.detail || (lang === "tr" ? "Ödeme başlatılamadı." : "Unable to start checkout."));
    } catch (e: any) {
      setErr(e?.message || (lang === "tr" ? "Bağlantı hatası." : "Connection error."));
    } finally {
      setLoading(false);
    }
  }

  if (status === null) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>;
  }

  if (!status.enabled) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-10 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="card w-full overflow-hidden p-8 text-center sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-status-warning-bg"><CreditCard className="h-10 w-10 text-status-warning-content" /></div>
          <h1 className="mt-6 text-3xl font-black tracking-tight text-content-primary">{copy.launchTitle}</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-content-muted">{copy.launchBody}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/register" className="btn-primary justify-center">{copy.startFree}</Link>
            <Link href="/pricing" className="btn-secondary justify-center">{copy.backPricing}</Link>
          </div>
          <Image src="/logo.png" alt="HeptaCert" width={160} height={44} className="mx-auto mt-8 h-10 w-auto" unoptimized />
        </motion.div>
      </div>
    );
  }

  if (checkoutHtml) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6">
        <div className="grid w-full gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          <div className="card p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-status-success-border bg-status-success-bg px-3 py-1.5 text-xs font-semibold text-status-success-content"><ShieldCheck className="h-3.5 w-3.5" />{copy.secure}</div>
            <h1 className="mt-5 text-2xl font-black text-content-primary">{copy.embeddedTitle}</h1>
            <p className="mt-3 text-sm leading-7 text-content-muted">{copy.embeddedBody}</p>
            <div className="mt-6 rounded-2xl border border-outline-subtle bg-canvas p-4 text-sm text-content-secondary">
              <div className="font-semibold text-content-primary">{copy.selectedPlan}</div>
              <div className="mt-2">{planId || "-"} • {copy.periodLabel}</div>
              <div className="mt-2">{copy.provider}: <span className="font-semibold capitalize">{status.provider}</span></div>
            </div>
            <Link href="/pricing" className="mt-6 inline-flex text-sm font-medium text-content-muted transition hover:text-content-secondary">{copy.cancel}</Link>
          </div>
          <div className="overflow-hidden rounded-[28px] border border-outline-subtle bg-raised shadow-lifted">
            <iframe srcDoc={checkoutHtml} sandbox="allow-scripts allow-forms allow-popups allow-top-navigation" className="w-full border-0" style={{ height: "720px", minHeight: "720px" }} title="Payment Checkout" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="card p-8 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-status-success-border bg-status-success-bg px-3 py-1.5 text-xs font-semibold text-status-success-content"><ShieldCheck className="h-3.5 w-3.5" />{copy.secure}</div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-content-primary">{copy.title}</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-content-muted">{copy.body}</p>
          <div className="mt-8 space-y-3">{copy.summaryPoints.map((item) => <div key={item} className="flex items-start gap-3 rounded-2xl border border-outline-subtle bg-canvas px-4 py-4"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-success-content" /><p className="text-sm font-medium leading-6 text-content-secondary">{item}</p></div>)}</div>
        </motion.section>

        <motion.aside initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card p-6 sm:p-7">
          <div className="mb-4 flex items-center justify-between gap-3"><Image src="/logo.png" alt="HeptaCert" width={150} height={40} className="h-9 w-auto" unoptimized /><span className="rounded-full bg-sunken px-3 py-1 text-xs font-semibold text-content-secondary">{copy.periodLabel}</span></div>
          <h2 className="text-lg font-black text-content-primary">{copy.selectedPlan}</h2>
          <p className="mt-2 text-sm font-semibold text-brand-600">{planId || "-"}</p>
          <div className="mt-5 rounded-2xl border border-outline-subtle bg-canvas p-4 text-sm text-content-secondary">{copy.provider}: <span className="font-semibold capitalize">{status.provider}</span></div>
          {err && <div className="mt-4 flex items-center gap-2 rounded-2xl border border-status-danger-border bg-status-danger-bg px-4 py-3 text-sm text-status-danger-content"><AlertCircle className="h-4 w-4 shrink-0" />{err}</div>}
          <button onClick={startPayment} disabled={loading} className="btn-primary mt-6 w-full justify-center">{loading ? <><Loader2 className="h-4 w-4 animate-spin" />{copy.prepare}</> : <><ArrowRight className="h-4 w-4" />{copy.payNow}</>}</button>
          <Link href="/pricing" className="mt-4 block text-center text-xs text-content-muted transition hover:text-content-secondary">{copy.cancel}</Link>
        </motion.aside>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>}><CheckoutContent /></Suspense>;
}
