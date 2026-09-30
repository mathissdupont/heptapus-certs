"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useState } from "react";
import { Loader2, AlertCircle, CreditCard, Coins, TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/Admin/PageHeader";
import { motion } from "framer-motion";
import { useI18n, translate } from "@/lib/i18n";

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

  const copy = { title: translate(lang, "migrated_app_admin_payments_transactions_payments_7ddaa5a7"), subtitle: translate(lang, "migrated_app_admin_payments_transactions_payment_orders_and_heptacoin_transaction_h_0d80c287"), loadError: translate(lang, "migrated_app_admin_payments_transactions_failed_to_load_data_0b64ae88"), orders: translate(lang, "migrated_app_admin_payments_transactions_payment_orders_f29f5ec9"), ordersEmpty: translate(lang, "migrated_app_admin_payments_transactions_no_payment_orders_yet_2ba81831"), history: translate(lang, "migrated_app_admin_payments_transactions_heptacoin_history_50257783"), historyEmpty: translate(lang, "migrated_app_admin_payments_transactions_no_coin_transactions_yet_120f4feb"), records: translate(lang, "migrated_app_admin_payments_transactions_records_e92ac540"), transactions: translate(lang, "migrated_app_admin_payments_transactions_transactions_89eefc14"), breadcrumbsPayments: translate(lang, "migrated_app_admin_payments_transactions_payments_0e52ea21"), orderFallback: (id: number) => translate(lang, "migrated_app_admin_payments_transactions_order_value0_c521284b", { value0: id }), credit: translate(lang, "migrated_app_admin_payments_transactions_credit_7042928d"), spend: translate(lang, "migrated_app_admin_payments_transactions_spend_805d9b14"), status: { pending: translate(lang, "migrated_app_admin_payments_transactions_pending_2dff3de0"), paid: translate(lang, "migrated_app_admin_payments_transactions_paid_1d23ad3c"), failed: translate(lang, "migrated_app_admin_payments_transactions_failed_f406e015"), refunded: translate(lang, "migrated_app_admin_payments_transactions_refunded_f2a11272") } };

  const orderStatus: Record<string, { label: string; cls: string }> = {
    pending: { label: copy.status.pending, cls: "bg-status-warning-bg text-status-warning-content" },
    paid: { label: copy.status.paid, cls: "bg-status-success-bg text-status-success-content" },
    failed: { label: copy.status.failed, cls: "bg-status-danger-bg text-status-danger-content" },
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
                    {new Date(o.created_at).toLocaleDateString(localeTag(lang))} · {o.provider}
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
                    {new Date(tx.timestamp).toLocaleDateString(localeTag(lang), {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className={`text-sm font-bold ${tx.type === "credit" ? "text-status-success-content" : "text-status-danger-content"}`}>
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
