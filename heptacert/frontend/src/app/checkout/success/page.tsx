"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

function CheckoutSuccessContent() {
  const { lang } = useI18n();
  const params = useSearchParams();
  const router = useRouter();
  const orderId = params.get("order_id");
  const [secs, setSecs] = useState(10);

  const copy = useMemo(() => lang === "tr" ? {
    title: "Ödeme başarılı",
    body: "Aboneliğiniz aktive edildi. Birkaç saniye içinde yönetim paneline yönlendirileceksiniz.",
    order: "Sipariş",
    cta: "Panele git",
  } : {
    title: "Payment successful",
    body: "Your subscription is now active. You will be redirected to the admin area in a few seconds.",
    order: "Order",
    cta: "Go to dashboard",
  }, [lang]);

  useEffect(() => {
    if (secs <= 0) {
      router.push("/admin/events");
      return;
    }
    const t = setTimeout(() => setSecs((value) => value - 1), 1000);
    return () => clearTimeout(t);
  }, [router, secs]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-10 sm:px-6">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="card w-full overflow-hidden p-8 text-center sm:p-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-10 w-10 text-emerald-600" /></div>
        <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-950">{copy.title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500">{copy.body}</p>
        {orderId && <div className="mt-6 inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">{copy.order}: #{orderId}</div>}
        <p className="mt-4 text-xs text-slate-400">{secs}</p>
        <Link href="/admin/events" className="btn-primary mt-6 justify-center">{copy.cta}</Link>
        <Image src="/logo.png" alt="HeptaCert" width={160} height={44} className="mx-auto mt-8 h-10 w-auto" unoptimized />
      </motion.div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>}><CheckoutSuccessContent /></Suspense>;
}
