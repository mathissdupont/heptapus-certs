"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, CreditCard, Coins, TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/Admin/PageHeader";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

type Order = {
  id: number;
  plan_id: string | null;
  amount_cents: number;
  currency: string;
  provider: string;
  status: "pending" | "paid" | "failed" | "refunded";
  created_at: string;
  paid_at: string | null;
};

type CoinTx = {
  id: number;
  amount: number;
  type: "credit" | "spend";
  timestamp: string;
  description: string | null;
};

export default function TransactionsPage() {
  const { lang } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [coins, setCoins] = useState<CoinTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const copy = {
    tr: {
      title: "Ödeme İşlemleri",
      subtitle: "Ödeme siparişleri ve HeptaCoin işlem geçmişi",
      loadError: "Veriler yüklenemedi",
      orders: "Ödeme Siparişleri",
      ordersEmpty: "Henüz ödeme siparişi yok",
      history: "HeptaCoin Geçmişi",
      historyEmpty: "Henüz coin işlemi yok",
      records: "kayıt",
      transactions: "işlem",
      breadcrumbsPayments: "Ödeme İşlemleri",
      orderFallback: (id: number) => `Sipariş #${id}`,
      credit: "Yükleme",
      spend: "Harcama",
      status: {
        pending: "Bekliyor",
        paid: "Ödendi",
        failed: "Başarısız",
        refunded: "İade Edildi",
      },
      locale: "tr-TR",
    },
    en: {
      title: "Payments",
      subtitle: "Payment orders and HeptaCoin transaction history",
      loadError: "Failed to load data",
      orders: "Payment Orders",
      ordersEmpty: "No payment orders yet",
      history: "HeptaCoin History",
      historyEmpty: "No coin transactions yet",
      records: "records",
      transactions: "transactions",
      breadcrumbsPayments: "Payments",
      orderFallback: (id: number) => `Order #${id}`,
      credit: "Credit",
      spend: "Spend",
      status: {
        pending: "Pending",
        paid: "Paid",
        failed: "Failed",
        refunded: "Refunded",
      },
      locale: "en-US",
    },
  }[lang];

  const orderStatus: Record<string, { label: string; cls: string }> = {
    pending: { label: copy.status.pending, cls: "bg-amber-100 text-amber-800" },
    paid: { label: copy.status.paid, cls: "bg-emerald-100 text-emerald-800" },
    failed: { label: copy.status.failed, cls: "bg-rose-100 text-rose-800" },
    refunded: { label: copy.status.refunded, cls: "bg-surface-100 text-surface-700" },
  };

  const coinLabel: Record<string, string> = { credit: copy.credit, spend: copy.spend };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const [ordersRes, coinsRes] = await Promise.all([
        apiFetch("/billing/orders").catch(() => null),
        apiFetch("/admin/transactions").catch(() => null),
      ]);
      if (ordersRes?.ok) setOrders(await ordersRes.json());
      if (coinsRes?.ok) setCoins(await coinsRes.json());
    } catch (e: any) {
      const msg = e?.message || copy.loadError;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        icon={<TrendingUp className="h-5 w-5" />}
        breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: copy.breadcrumbsPayments }]}
      />

      {error && (
        <div className="error-banner">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-surface-100 px-5 py-4">
          <CreditCard className="h-4 w-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-surface-900">{copy.orders}</h2>
          <span className="ml-auto text-xs text-surface-400">{orders.length} {copy.records}</span>
        </div>
        {orders.length === 0 ? (
          <div className="p-12 text-center text-sm text-surface-400">{copy.ordersEmpty}</div>
        ) : (
          <div className="divide-y divide-surface-100">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-surface-900">{o.plan_id ?? copy.orderFallback(o.id)}</p>
                  <p className="mt-0.5 text-xs text-surface-400">
                    {new Date(o.created_at).toLocaleDateString(copy.locale)} · {o.provider}
                  </p>
                </div>
                <span className="text-sm font-semibold text-surface-900">
                  {(o.amount_cents / 100).toFixed(2)} {o.currency.toUpperCase()}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatus[o.status]?.cls ?? "bg-surface-100 text-surface-700"}`}>
                  {orderStatus[o.status]?.label ?? o.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-surface-100 px-5 py-4">
          <Coins className="h-4 w-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-surface-900">{copy.history}</h2>
          <span className="ml-auto text-xs text-surface-400">{coins.length} {copy.transactions}</span>
        </div>
        {coins.length === 0 ? (
          <div className="p-12 text-center text-sm text-surface-400">{copy.historyEmpty}</div>
        ) : (
          <div className="divide-y divide-surface-100">
            {coins.map((tx) => (
              <div key={tx.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-surface-900">{tx.description || coinLabel[tx.type]}</p>
                  <p className="mt-0.5 text-xs text-surface-400">
                    {new Date(tx.timestamp).toLocaleDateString(copy.locale, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className={`text-sm font-bold ${tx.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
                  {tx.type === "credit" ? "+" : "-"}{tx.amount} HC
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
