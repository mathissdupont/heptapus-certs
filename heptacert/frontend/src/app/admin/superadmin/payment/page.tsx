"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, Save, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/useToast";

type PaymentConfig = {
  payment_enabled: boolean; active_payment_provider: string;
  iyzico_api_key: string; iyzico_secret_key: string; iyzico_base_url: string;
  paytr_merchant_id: string; paytr_merchant_key: string; paytr_merchant_salt: string;
  stripe_publishable_key: string; stripe_secret_key: string; stripe_webhook_secret: string;
};

const DEFAULT: PaymentConfig = {
  payment_enabled: false, active_payment_provider: "iyzico",
  iyzico_api_key: "", iyzico_secret_key: "", iyzico_base_url: "https://sandbox-api.iyzipay.com",
  paytr_merchant_id: "", paytr_merchant_key: "", paytr_merchant_salt: "",
  stripe_publishable_key: "", stripe_secret_key: "", stripe_webhook_secret: "",
};

type Provider = { id: string; label: string; color: string; fields: { key: keyof PaymentConfig; label: string; placeholder?: string }[] };

const PROVIDERS: Provider[] = [
  { id: "iyzico", label: "Iyzico", color: "bg-blue-50 border-blue-200 text-blue-700", fields: [
    { key: "iyzico_api_key", label: "API Key" },
    { key: "iyzico_secret_key", label: "Secret Key" },
    { key: "iyzico_base_url", label: "Base URL", placeholder: "https://sandbox-api.iyzipay.com" },
  ]},
  { id: "paytr", label: "PayTR", color: "bg-violet-50 border-violet-200 text-violet-700", fields: [
    { key: "paytr_merchant_id", label: "Merchant ID" },
    { key: "paytr_merchant_key", label: "Merchant Key" },
    { key: "paytr_merchant_salt", label: "Merchant Salt" },
  ]},
  { id: "stripe", label: "Stripe", color: "bg-indigo-50 border-indigo-200 text-indigo-700", fields: [
    { key: "stripe_publishable_key", label: "Publishable Key" },
    { key: "stripe_secret_key", label: "Secret Key" },
    { key: "stripe_webhook_secret", label: "Webhook Secret" },
  ]},
];

export default function SuperadminPaymentPage() {
  const toast = useToast();
  const [cfg, setCfg] = useState<PaymentConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await apiFetch("/superadmin/payment-config");
      setCfg({ ...DEFAULT, ...(await r.json()) });
    } catch (e: any) { setErr(e?.message || "Ödeme ayarları yüklenemedi."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function setField<K extends keyof PaymentConfig>(key: K, value: PaymentConfig[K]) {
    setCfg(p => ({ ...p, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await apiFetch("/superadmin/payment-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      toast.success("Ödeme ayarları kaydedildi.");
    } catch (e: any) { toast.error(e?.message || "Kaydedilemedi."); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-surface-900">Ödeme Sağlayıcı Ayarları</h2>
          <p className="text-sm text-surface-500">Ödeme sistemini yapılandırın ve aktif sağlayıcıyı seçin.</p>
        </div>
      </div>

      {err && <div className="flex items-center gap-2 text-rose-600 text-sm"><AlertCircle className="h-4 w-4" />{err}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
      ) : (
        <form onSubmit={save} className="space-y-6">
          {/* Master toggle */}
          <div className="card p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-surface-800">Ödeme Sistemi</p>
              <p className="text-sm text-surface-400">Ödeme alımını genel olarak etkinleştirir / devre dışı bırakır.</p>
            </div>
            <button type="button" onClick={() => setField("payment_enabled", !cfg.payment_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${cfg.payment_enabled ? "bg-brand-600" : "bg-surface-200"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${cfg.payment_enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Provider cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PROVIDERS.map((p, i) => {
              const isActive = cfg.active_payment_provider === p.id;
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className={`card p-5 space-y-3 border-2 transition-colors ${isActive ? p.color : "border-surface-200"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 opacity-60" />
                      <span className="font-bold text-sm">{p.label}</span>
                    </div>
                    <button type="button" onClick={() => setField("active_payment_provider", p.id)}
                      className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${isActive ? "bg-brand-600 text-white" : "bg-surface-100 text-surface-500 hover:bg-surface-200"}`}>
                      {isActive ? "Aktif" : "Seç"}
                    </button>
                  </div>
                  {p.fields.map(f => (
                    <div key={f.key as string}>
                      <label className="label text-xs">{f.label}</label>
                      <input type="password" autoComplete="new-password" value={cfg[f.key] as string}
                        onChange={e => setField(f.key, e.target.value as any)}
                        placeholder={f.placeholder || "••••••••"}
                        className="input-field text-sm font-mono" />
                    </div>
                  ))}
                </motion.div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Kaydet
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
