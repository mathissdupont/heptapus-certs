"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ShieldCheck, AlertCircle, CreditCard, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { apiFetch, API_BASE } from "@/lib/api";

function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const planId = params.get("plan") || "";
  const period = (params.get("period") as "monthly" | "annual") || "monthly";

  const [status, setStatus] = useState<{ enabled: boolean; provider: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/billing/status`)
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setErr("Ödeme sistemi durumu alınamadı."));
  }, []);

  async function startPayment() {
    setLoading(true);
    setErr(null);
    try {
      const res = await apiFetch("/billing/create-payment", {
        method: "POST",
        body: JSON.stringify({ plan_id: planId, billing_period: period }),
      });
      const data = await res.json();

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (data.checkout_html) {
        setCheckoutHtml(data.checkout_html);
      } else {
        setErr(data.detail || "Ödeme başlatılamadı.");
      }
    } catch (e: any) {
      setErr(e?.message || "Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  }

  if (status === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!status.enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card max-w-md w-full p-10 text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <CreditCard className="h-10 w-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Yakında!</h1>
          <p className="text-gray-500 text-sm mb-8">
            Ödeme sistemi şu anda aktif değil. Vergi levhası sürecimiz tamamlandığında bu özellik devreye alınacak.
            Şimdilik ücretsiz planı deneyebilirsiniz.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/register" className="btn-primary w-full justify-center">Ücretsiz Başla</Link>
            <Link href="/pricing" className="btn-secondary w-full justify-center">Planlara Dön</Link>
          </div>
          <div className="mt-6">
            <Image src="/logo.png" alt="HeptaCert" width={160} height={44} className="mx-auto h-10 w-auto" unoptimized />
          </div>
        </motion.div>
      </div>
    );
  }

  // iyzico/PayTR iFrame injection
  if (checkoutHtml) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-start bg-slate-50 pt-10 px-4">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/logo.png" alt="HeptaCert" width={160} height={44} unoptimized className="h-10 w-auto" />
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Güvenli Ödeme
          </div>
        </div>
        <iframe
          srcDoc={checkoutHtml}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
          className="w-full max-w-lg bg-white rounded-2xl shadow-lifted overflow-hidden border-0"
          style={{ height: '600px', minHeight: '600px' }}
          title="Payment Checkout"
        />
        <Link href="/pricing" className="mt-6 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Planlara geri dön
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-brand-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card max-w-md w-full p-10"
      >
        <div className="mb-6 flex items-center justify-between">
          <Image src="/logo.png" alt="HeptaCert" width={160} height={44} unoptimized className="h-10 w-auto" />
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Güvenli SSL
          </div>
        </div>

        <h1 className="text-xl font-black text-gray-900 mb-1">Ödeme</h1>
        <p className="text-sm text-gray-500 mb-6">
          Plan: <strong>{planId}</strong> · {period === "annual" ? "Yıllık" : "Aylık"}
        </p>

        {err && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {err}
          </div>
        )}

        <div className="mb-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-500">
          Sağlayıcı: <strong className="capitalize">{status.provider}</strong>
        </div>

        <button
          onClick={startPayment}
          disabled={loading}
          className="btn-primary w-full justify-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {loading ? "İşlem hazırlanıyor..." : "Ödemeye Geç"}
        </button>

        <Link href="/pricing" className="mt-4 block text-center text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← İptal et, planlara dön
        </Link>
      </motion.div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
