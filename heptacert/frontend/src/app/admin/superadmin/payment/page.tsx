"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CreditCard,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/Admin/PageHeader";
import { useToast } from "@/hooks/useToast";
import { useI18n } from "@/lib/i18n";

type PaymentConfig = {
  enabled: boolean;
  active_provider: string;
  iyzico_api_key: string;
  iyzico_secret_key: string;
  iyzico_base_url: string;
  paytr_merchant_id: string;
  paytr_merchant_key: string;
  paytr_merchant_salt: string;
  stripe_publishable_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
};

type ProviderFieldKey =
  | "iyzico_api_key"
  | "iyzico_secret_key"
  | "iyzico_base_url"
  | "paytr_merchant_id"
  | "paytr_merchant_key"
  | "paytr_merchant_salt"
  | "stripe_publishable_key"
  | "stripe_secret_key"
  | "stripe_webhook_secret";

type ProviderField = {
  key: ProviderFieldKey;
  label: string;
  placeholder?: string;
};

type ProviderDefinition = {
  id: string;
  tone: string;
  fields: ProviderField[];
};

const DEFAULT_CONFIG: PaymentConfig = {
  enabled: false,
  active_provider: "iyzico",
  iyzico_api_key: "",
  iyzico_secret_key: "",
  iyzico_base_url: "https://sandbox-api.iyzipay.com",
  paytr_merchant_id: "",
  paytr_merchant_key: "",
  paytr_merchant_salt: "",
  stripe_publishable_key: "",
  stripe_secret_key: "",
  stripe_webhook_secret: "",
};

const PROVIDERS: ProviderDefinition[] = [
  {
    id: "iyzico",
    tone: "bg-sky-50 border-sky-200 text-sky-700",
    fields: [
      { key: "iyzico_api_key", label: "API Key" },
      { key: "iyzico_secret_key", label: "Secret Key" },
      { key: "iyzico_base_url", label: "Base URL", placeholder: "https://sandbox-api.iyzipay.com" },
    ],
  },
  {
    id: "paytr",
    tone: "bg-violet-50 border-violet-200 text-violet-700",
    fields: [
      { key: "paytr_merchant_id", label: "Merchant ID" },
      { key: "paytr_merchant_key", label: "Merchant Key" },
      { key: "paytr_merchant_salt", label: "Merchant Salt" },
    ],
  },
  {
    id: "stripe",
    tone: "bg-emerald-50 border-emerald-200 text-emerald-700",
    fields: [
      { key: "stripe_publishable_key", label: "Publishable Key" },
      { key: "stripe_secret_key", label: "Secret Key" },
      { key: "stripe_webhook_secret", label: "Webhook Secret" },
    ],
  },
] as const;

export default function SuperadminPaymentPage() {
  const toast = useToast();
  const { lang } = useI18n();
  const [config, setConfig] = useState<PaymentConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = lang === "tr"
    ? {
        title: "Ödeme Ayarları",
        subtitle: "Platform genelinde ödeme kabulünü, aktif sağlayıcıyı ve gizli anahtarları merkezi olarak yönetin",
        refresh: "Yenile",
        save: "Kaydet",
        loadFailed: "Ödeme ayarları yüklenemedi",
        saveFailed: "Ödeme ayarları kaydedilemedi",
        saveSuccess: "Ödeme ayarları kaydedildi",
        systemStatus: "Ödeme sistemi",
        enabled: "Açık",
        disabled: "Kapalı",
        activeProvider: "Aktif sağlayıcı",
        configuredFields: "Dolu alan",
        providers: "Sağlayıcılar",
        helper: "Kart altyapısını değiştirirken tüm gizli alanları tekrar doğrulayın. Bu ekran yalnızca platform düzeyinde çalışır.",
        chooseProvider: "Aktif sağlayıcıyı seçin ve gerekli gizli anahtarları yönetin.",
      }
    : {
        title: "Payment Settings",
        subtitle: "Control global payment availability, the active provider, and secret keys from one place",
        refresh: "Refresh",
        save: "Save",
        loadFailed: "Failed to load payment settings",
        saveFailed: "Failed to save payment settings",
        saveSuccess: "Payment settings saved",
        systemStatus: "Payments",
        enabled: "Enabled",
        disabled: "Disabled",
        activeProvider: "Active provider",
        configuredFields: "Filled fields",
        providers: "Providers",
        helper: "Re-check all secrets when switching the card processor. This screen controls the platform-wide payment setup.",
        chooseProvider: "Choose the active provider and manage the required secrets.",
      };

  const load = async (mode: "load" | "refresh" = "load") => {
    try {
      if (mode === "load") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const response = await apiFetch("/superadmin/payment-config");
      const data = await response.json();
      setConfig({ ...DEFAULT_CONFIG, ...data });
    } catch (e: any) {
      setError(e?.message || copy.loadFailed);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const configuredCount = useMemo(
    () => Object.entries(config).filter(([key, value]) => key !== "enabled" && key !== "active_provider" && String(value || "").trim()).length,
    [config]
  );

  const setField = <K extends keyof PaymentConfig>(key: K, value: PaymentConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      await apiFetch("/superadmin/payment-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      toast.success(copy.saveSuccess);
    } catch (e: any) {
      const message = e?.message || copy.saveFailed;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
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
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        icon={<CreditCard className="h-5 w-5" />}
        actions={
          <>
            <button onClick={() => load("refresh")} disabled={refreshing} className="btn-secondary gap-2 text-xs">
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {copy.refresh}
            </button>
            <button onClick={save} disabled={saving} className="btn-primary gap-2 text-xs">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {copy.save}
            </button>
          </>
        }
      />

      {error && (
        <div className="error-banner flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-surface-400">{copy.systemStatus}</p>
          <p className="mt-3 text-2xl font-black text-surface-900">{config.enabled ? copy.enabled : copy.disabled}</p>
          <p className="mt-1 text-sm text-surface-500">{copy.helper}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-surface-400">{copy.activeProvider}</p>
          <p className="mt-3 text-2xl font-black capitalize text-surface-900">{config.active_provider}</p>
          <p className="mt-1 text-sm text-surface-500">{copy.providers}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-surface-400">{copy.configuredFields}</p>
          <p className="mt-3 text-2xl font-black text-surface-900">{configuredCount}</p>
          <p className="mt-1 text-sm text-surface-500">secure values</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-surface-400">{copy.providers}</p>
          <p className="mt-3 text-2xl font-black text-surface-900">{PROVIDERS.length}</p>
          <p className="mt-1 text-sm text-surface-500">Iyzico, PayTR, Stripe</p>
        </div>
      </div>

      <div className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-surface-900">{copy.systemStatus}</h2>
          <p className="text-sm text-surface-500">{copy.chooseProvider}</p>
        </div>
        <button
          type="button"
          onClick={() => setField("enabled", !config.enabled)}
          className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${config.enabled ? "bg-brand-600" : "bg-surface-200"}`}
          aria-pressed={config.enabled}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${config.enabled ? "translate-x-8" : "translate-x-1"}`} />
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {PROVIDERS.map((provider) => {
          const isActive = config.active_provider === provider.id;
          return (
            <section key={provider.id} className={`card border-2 p-5 ${isActive ? provider.tone : "border-surface-200"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold capitalize text-surface-900">{provider.id}</h2>
                  <p className="mt-1 text-sm text-surface-500">{copy.providers}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setField("active_provider", provider.id)}
                  className={isActive ? "btn-primary text-xs" : "btn-secondary text-xs"}
                >
                  {isActive ? copy.enabled : copy.activeProvider}
                </button>
              </div>

              <div className="mt-5 grid gap-3">
                {provider.fields.map((field) => (
                  <label key={field.key} className="space-y-2">
                    <span className="label text-xs">{field.label}</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className="input-field font-mono text-sm"
                      placeholder={field.placeholder || "••••••••••"}
                      value={config[field.key]}
                      onChange={(event) => setField(field.key, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="rounded-[28px] border border-surface-200 bg-surface-50 p-5 text-sm text-surface-600">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <p>{copy.helper}</p>
        </div>
      </div>
    </div>
  );
}

