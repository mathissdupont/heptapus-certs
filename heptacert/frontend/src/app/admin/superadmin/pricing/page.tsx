"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Tag, Loader2, AlertCircle, Plus, X, Save } from "lucide-react";
import { useToast } from "@/hooks/useToast";

type PricingTier = {
  id: string; name_tr: string; name_en: string;
  price_monthly: number; price_annual: number; hc_quota: number;
  features_tr: string[]; features_en: string[]; is_free: boolean; is_enterprise: boolean;
};

const tierBorders = ["border-brand-200", "border-violet-200", "border-rose-200", "border-amber-200"];
const tierBadgeBg = [
  "bg-brand-50 text-brand-700",
  "bg-violet-50 text-violet-700",
  "bg-rose-50 text-rose-700",
  "bg-amber-50 text-amber-700",
];

export default function SuperadminPricingPage() {
  const toast = useToast();
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await apiFetch("/superadmin/pricing");
      setTiers(await r.json());
    } catch (e: any) { setErr(e?.message || "Fiyatlandırma yüklenemedi."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function updateTier(id: string, key: keyof PricingTier, value: any) {
    setTiers(p => p.map(t => t.id === id ? { ...t, [key]: value } : t));
  }

  function updateFeature(id: string, lang: "tr" | "en", idx: number, value: string) {
    setTiers(p => p.map(t => {
      if (t.id !== id) return t;
      const key = lang === "tr" ? "features_tr" : "features_en";
      const newF = [...(t[key] as string[])];
      newF[idx] = value;
      return { ...t, [key]: newF };
    }));
  }

  function addFeature(id: string, lang: "tr" | "en") {
    setTiers(p => p.map(t => {
      if (t.id !== id) return t;
      const key = lang === "tr" ? "features_tr" : "features_en";
      return { ...t, [key]: [...(t[key] as string[]), ""] };
    }));
  }

  function removeFeature(id: string, lang: "tr" | "en", idx: number) {
    setTiers(p => p.map(t => {
      if (t.id !== id) return t;
      const key = lang === "tr" ? "features_tr" : "features_en";
      return { ...t, [key]: (t[key] as string[]).filter((_, i) => i !== idx) };
    }));
  }

  async function save() {
    setSaving(true);
    try {
      await apiFetch("/superadmin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tiers),
      });
      toast.success("Fiyatlandırma kaydedildi.");
    } catch (e: any) { toast.error(e?.message || "Kaydedilemedi."); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-surface-900">Fiyatlandırma Planları</h2>
          <p className="text-sm text-surface-500">Plan adları, fiyatlar ve özellikleri düzenleyin.</p>
        </div>
        <button onClick={save} disabled={saving || loading} className="btn-primary gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Kaydet
        </button>
      </div>

      {err && <div className="flex items-center gap-2 text-rose-600 text-sm"><AlertCircle className="h-4 w-4" />{err}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {tiers.map((tier, idx) => (
            <motion.div key={tier.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }}
              className={`card p-5 border-2 ${tierBorders[idx % tierBorders.length]}`}>
              {/* Badge */}
              <div className="flex items-center justify-between mb-4">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${tierBadgeBg[idx % tierBadgeBg.length]}`}>{tier.id}</span>
                <div className="flex gap-2 text-xs text-surface-400">
                  {tier.is_free && <span className="text-emerald-600 font-semibold">Ücretsiz</span>}
                  {tier.is_enterprise && <span className="text-amber-600 font-semibold">Kurumsal</span>}
                </div>
              </div>

              {/* Names */}
              <div className="space-y-2 mb-3">
                <input value={tier.name_tr} onChange={e => updateTier(tier.id, "name_tr", e.target.value)} placeholder="Ad (TR)" className="input-field text-sm" />
                <input value={tier.name_en} onChange={e => updateTier(tier.id, "name_en", e.target.value)} placeholder="Name (EN)" className="input-field text-sm" />
              </div>

              {/* Prices & Quota */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <label className="label text-xs">Aylık ₺</label>
                  <input type="number" min={0} value={tier.price_monthly} onChange={e => updateTier(tier.id, "price_monthly", Number(e.target.value))} className="input-field text-sm" />
                </div>
                <div>
                  <label className="label text-xs">Yıllık ₺</label>
                  <input type="number" min={0} value={tier.price_annual} onChange={e => updateTier(tier.id, "price_annual", Number(e.target.value))} className="input-field text-sm" />
                </div>
                <div>
                  <label className="label text-xs">HC Kota</label>
                  <input type="number" min={0} value={tier.hc_quota} onChange={e => updateTier(tier.id, "hc_quota", Number(e.target.value))} className="input-field text-sm" />
                </div>
              </div>

              {/* Features TR */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="label text-xs">Özellikler (TR)</span>
                  <button onClick={() => addFeature(tier.id, "tr")} className="text-brand-500 hover:text-brand-700"><Plus className="h-3.5 w-3.5" /></button>
                </div>
                {tier.features_tr.map((f, fi) => (
                  <div key={fi} className="flex items-center gap-1 mb-1">
                    <input value={f} onChange={e => updateFeature(tier.id, "tr", fi, e.target.value)} className="input-field text-xs flex-1" />
                    <button onClick={() => removeFeature(tier.id, "tr", fi)} className="text-rose-400 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>

              {/* Features EN */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="label text-xs">Features (EN)</span>
                  <button onClick={() => addFeature(tier.id, "en")} className="text-brand-500 hover:text-brand-700"><Plus className="h-3.5 w-3.5" /></button>
                </div>
                {tier.features_en.map((f, fi) => (
                  <div key={fi} className="flex items-center gap-1 mb-1">
                    <input value={f} onChange={e => updateFeature(tier.id, "en", fi, e.target.value)} className="input-field text-xs flex-1" />
                    <button onClick={() => removeFeature(tier.id, "en", fi)} className="text-rose-400 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
