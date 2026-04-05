"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

function CheckoutCancelContent() {
  const { lang } = useI18n();
  const params = useSearchParams();
  const orderId = params.get("order_id");
  const copy = useMemo(() => lang === "tr" ? {
    title: "Ödeme tamamlanmadı",
    body: "İşlem yarıda kaldı veya iptal edildi. İstediğiniz zaman yeniden deneyebilirsiniz.",
    order: "Sipariş",
    backPricing: "Planlara dön",
    home: "Ana sayfa",
  } : {
    title: "Payment not completed",
    body: "The transaction was cancelled or left unfinished. You can try again whenever you want.",
    order: "Order",
    backPricing: "Back to pricing",
    home: "Homepage",
  }, [lang]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-10 sm:px-6">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="card w-full overflow-hidden p-8 text-center sm:p-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-100"><XCircle className="h-10 w-10 text-rose-500" /></div>
        <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-950">{copy.title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500">{copy.body}</p>
        {orderId && <div className="mt-6 inline-flex rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">{copy.order}: #{orderId}</div>}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/pricing" className="btn-primary justify-center">{copy.backPricing}</Link>
          <Link href="/" className="btn-secondary justify-center">{copy.home}</Link>
        </div>
        <Image src="/logo.png" alt="HeptaCert" width={160} height={44} className="mx-auto mt-8 h-10 w-auto" unoptimized />
      </motion.div>
    </div>
  );
}

export default function CheckoutCancelPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>}><CheckoutCancelContent /></Suspense>;
}
