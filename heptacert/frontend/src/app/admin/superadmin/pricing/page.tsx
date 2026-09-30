"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Coins,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Tag,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/Admin/PageHeader";
import { useToast } from "@/hooks/useToast";
import { useI18n, translate } from "@/lib/i18n";

type PricingTier = {
  id: string;
  name_tr: string;
  name_en: string;
  price_monthly: number;
  price_annual: number;
  hc_quota: number;
  features_tr: string[];
  features_en: string[];
  is_free: boolean;
  is_enterprise: boolean;
};

const TONES = [
 "border-brand-200 bg-brand-50/40",
 "border-status-info-border bg-status-info-bg/40",
 "border-status-danger-border bg-status-danger-bg/40",
 "border-status-warning-border bg-status-warning-bg/40",
];

export default function SuperadminPricingPage() {
  const toast = useToast();
  const { lang } = useI18n();
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = { title: translate(lang, "migrated_app_admin_superadmin_pricing_pricing_8f5db473"), subtitle: translate(lang, "migrated_app_admin_superadmin_pricing_edit_plan_names_pricing_heptacoin_quotas_a_a2643e72"), save: translate(lang, "migrated_app_admin_superadmin_pricing_save_626b546d"), refresh: translate(lang, "migrated_app_admin_superadmin_pricing_refresh_552a84f8"), loadFailed: translate(lang, "migrated_app_admin_superadmin_pricing_failed_to_load_pricing_f8fea556"), saveFailed: translate(lang, "migrated_app_admin_superadmin_pricing_failed_to_save_pricing_060daf74"), saveSuccess: translate(lang, "migrated_app_admin_superadmin_pricing_pricing_saved_bc878993"), monthly: translate(lang, "migrated_app_admin_superadmin_pricing_monthly_493941c2"), annual: translate(lang, "migrated_app_admin_superadmin_pricing_annual_81e5375d"), quota: translate(lang, "migrated_app_admin_superadmin_pricing_hc_quota_4849991b"), trFeatures: translate(lang, "migrated_app_admin_superadmin_pricing_features_tr_a7e2b558"), enFeatures: translate(lang, "migrated_app_admin_superadmin_pricing_features_en_c630cbec") };

  const load = async (mode: "load" | "refresh" = "load") => {
    try {
      if (mode === "load") setLoading(true);
      if (mode === "refresh") setRefreshing(true);
      setError(null);
      const response = await apiFetch("/superadmin/pricing");
      const data = await response.json();
      setTiers(Array.isArray(data) ? data : data.tiers ?? []);
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

  const stats = useMemo(() => {
    const freeCount = tiers.filter((tier) => tier.is_free).length;
    const enterpriseCount = tiers.filter((tier) => tier.is_enterprise).length;
    const totalQuota = tiers.reduce((sum, tier) => sum + (tier.hc_quota || 0), 0);
    return [
      { label: "Plans", value: tiers.length, detail: translate(lang, "migrated_app_admin_superadmin_pricing_tiers_0fa1a87c") },
      { label: "Free", value: freeCount, detail: translate(lang, "migrated_app_admin_superadmin_pricing_free_tiers_63d795ab") },
      { label: "Enterprise", value: enterpriseCount, detail: translate(lang, "migrated_app_admin_superadmin_pricing_enterprise_tiers_ba6967f3") },
      { label: copy.quota, value: totalQuota, detail: "HC" },
    ];
  }, [copy.quota, lang, tiers]);

  const updateTier = <K extends keyof PricingTier>(id: string, key: K, value: PricingTier[K]) => {
    setTiers((current) => current.map((tier) => (tier.id === id ? { ...tier, [key]: value } : tier)));
  };

  const updateFeature = (id: string, field: "features_tr" | "features_en", index: number, value: string) => {
    setTiers((current) =>
      current.map((tier) => {
        if (tier.id !== id) return tier;
        const next = [...tier[field]];
        next[index] = value;
        return { ...tier, [field]: next };
      })
    );
  };

  const addFeature = (id: string, field: "features_tr" | "features_en") => {
    setTiers((current) => current.map((tier) => (tier.id === id ? { ...tier, [field]: [...tier[field], ""] } : tier)));
  };

  const removeFeature = (id: string, field: "features_tr" | "features_en", index: number) => {
    setTiers((current) =>
      current.map((tier) =>
        tier.id === id ? { ...tier, [field]: tier[field].filter((_, currentIndex) => currentIndex !== index) } : tier
      )
    );
  };

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      await apiFetch("/superadmin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiers }),
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
        icon={<Tag className="h-5 w-5" />}
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
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-surface-400">{stat.label}</p>
            <p className="mt-3 text-2xl font-black text-surface-900">{stat.value}</p>
            <p className="mt-1 text-sm text-surface-500">{stat.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
        {tiers.map((tier, index) => (
          <section key={tier.id} className={`card border-2 p-5 ${TONES[index % TONES.length]}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-raised px-3 py-1 text-xs font-semibold uppercase text-surface-600 shadow-soft">{tier.id}</span>
                <h2 className="mt-3 text-lg font-semibold text-surface-900">{tier.name_en || tier.name_tr}</h2>
              </div>
              <div className="text-right text-xs text-surface-500">
                {tier.is_free && <p>Free</p>}
                {tier.is_enterprise && <p>Enterprise</p>}
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <input value={tier.name_tr} onChange={(event) => updateTier(tier.id, "name_tr", event.target.value)} className="input-field" placeholder="Ad (TR)" />
              <input value={tier.name_en} onChange={(event) => updateTier(tier.id, "name_en", event.target.value)} className="input-field" placeholder="Name (EN)" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <label className="space-y-2">
                <span className="label text-xs">{copy.monthly}</span>
                <input type="number" min={0} value={tier.price_monthly} onChange={(event) => updateTier(tier.id, "price_monthly", Number(event.target.value))} className="input-field" />
              </label>
              <label className="space-y-2">
                <span className="label text-xs">{copy.annual}</span>
                <input type="number" min={0} value={tier.price_annual} onChange={(event) => updateTier(tier.id, "price_annual", Number(event.target.value))} className="input-field" />
              </label>
              <label className="space-y-2">
                <span className="label text-xs">{copy.quota}</span>
                <div className="relative">
                  <Coins className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                  <input type="number" min={0} value={tier.hc_quota} onChange={(event) => updateTier(tier.id, "hc_quota", Number(event.target.value))} className="input-field pl-10" />
                </div>
              </label>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="label text-xs">{copy.trFeatures}</span>
                  <button type="button" onClick={() => addFeature(tier.id, "features_tr")} className="btn-secondary h-8 w-8 px-0">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {tier.features_tr.map((feature, featureIndex) => (
                    <div key={`${tier.id}-tr-${featureIndex}`} className="flex items-center gap-2">
                      <input value={feature} onChange={(event) => updateFeature(tier.id, "features_tr", featureIndex, event.target.value)} className="input-field flex-1 text-sm" />
                      <button type="button" onClick={() => removeFeature(tier.id, "features_tr", featureIndex)} className="btn-secondary h-10 w-10 px-0">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="label text-xs">{copy.enFeatures}</span>
                  <button type="button" onClick={() => addFeature(tier.id, "features_en")} className="btn-secondary h-8 w-8 px-0">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {tier.features_en.map((feature, featureIndex) => (
                    <div key={`${tier.id}-en-${featureIndex}`} className="flex items-center gap-2">
                      <input value={feature} onChange={(event) => updateFeature(tier.id, "features_en", featureIndex, event.target.value)} className="input-field flex-1 text-sm" />
                      <button type="button" onClick={() => removeFeature(tier.id, "features_en", featureIndex)} className="btn-secondary h-10 w-10 px-0">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
