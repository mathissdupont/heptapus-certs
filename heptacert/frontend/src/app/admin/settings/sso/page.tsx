"use client";

import { useEffect, useState } from "react";
import {
  Check, KeyRound, Loader2, Plus, ShieldCheck, Trash2, ToggleLeft, ToggleRight, X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/Admin/PageHeader";

type SsoConfig = {
  id: number;
  provider: string;
  client_id: string | null;
  has_secret: boolean;
  tenant_id: string | null;
  is_active: boolean;
  extra_config: Record<string, string> | null;
  updated_at: string | null;
};

const PROVIDER_INFO: Record<string, { label: string; color: string; icon: string }> = {
  google: { label: "Google", color: "bg-red-50 border-red-200 text-red-700", icon: "G" },
  microsoft: { label: "Microsoft / Azure AD", color: "bg-blue-50 border-blue-200 text-blue-700", icon: "M" },
  generic_oidc: { label: "Generic OIDC", color: "bg-surface-100 border-surface-200 text-surface-600", icon: "⚙" },
};

const emptyForm = {
  provider: "google",
  client_id: "",
  client_secret: "",
  tenant_id: "",
};

export default function SsoSettingsPage() {
  const [configs, setConfigs] = useState<SsoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: "", ok: true });

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: "", ok: true }), 3500);
  }

  async function load() {
    setLoading(true);
    const data = await apiFetch("/admin/sso").then((r) => r.json());
    setConfigs(Array.isArray(data?.configs) ? data.configs : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createConfig() {
    if (!form.client_id || !form.client_secret) return;
    setSaving(true);
    try {
      await apiFetch("/admin/sso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: form.provider,
          client_id: form.client_id,
          client_secret: form.client_secret,
          tenant_id: form.tenant_id || null,
        }),
      });
      showToast("SSO yapılandırması oluşturuldu.");
      setForm(emptyForm);
      setShowNew(false);
      load();
    } catch {
      showToast("Oluşturulamadı.", false);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(config: SsoConfig) {
    await apiFetch(`/admin/sso/${config.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !config.is_active }),
    });
    load();
    showToast(config.is_active ? "SSO devre dışı bırakıldı." : "SSO etkinleştirildi.");
  }

  async function deleteConfig(id: number) {
    if (!confirm("Bu SSO yapılandırmasını silmek istediğinizden emin misiniz?")) return;
    await apiFetch(`/admin/sso/${id}`, { method: "DELETE" });
    load();
    showToast("SSO yapılandırması silindi.");
  }

  const existingProviders = configs.map((c) => c.provider);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {toast.msg && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${toast.ok ? "bg-surface-900" : "bg-rose-600"}`}
        >
          {toast.msg}
        </div>
      )}

      <PageHeader
        title="SSO / OAuth2 Ayarları"
        subtitle="Google, Microsoft veya özel OIDC sağlayıcısı ile tek oturum açma."
        icon={<ShieldCheck className="h-6 w-6" />}
        actions={
          <button
            onClick={() => setShowNew(true)}
            disabled={existingProviders.length >= 3}
            className="inline-flex items-center gap-2 rounded-xl bg-surface-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-surface-800 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            SSO Ekle
          </button>
        }
      />

      {/* How it works */}
      <div className="space-y-1 rounded-2xl border border-surface-200 bg-surface-50 p-4 text-xs text-surface-600">
        <p className="font-semibold text-surface-800">Nasıl çalışır?</p>
        <ol className="list-inside list-decimal space-y-1">
          <li>OAuth2 sağlayıcınızda (Google Cloud / Azure AD) bir uygulama oluşturun.</li>
          <li>Redirect URI olarak <code className="rounded bg-surface-100 px-1 font-mono">/auth/sso/callback/{"{"}provider{"}"}</code> ekleyin.</li>
          <li>Client ID ve Secret&apos;ı buraya girin, SSO&apos;yu etkinleştirin.</li>
          <li>Üyeler <code className="rounded bg-surface-100 px-1 font-mono">/auth/sso/{"{"}provider{"}"}/login</code> adresiyle giriş yapar.</li>
        </ol>
      </div>

      {/* New config form */}
      {showNew && (
        <div className="space-y-4 rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-surface-900">Yeni SSO Sağlayıcısı</h2>
            <button onClick={() => setShowNew(false)} className="text-surface-400 transition-colors hover:text-surface-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-surface-700">Sağlayıcı</label>
              <select
                className="min-h-[38px] w-full appearance-none rounded-xl border border-surface-200 bg-white px-3 text-xs font-semibold outline-none transition focus:border-surface-900"
                value={form.provider}
                onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}
              >
                {Object.entries(PROVIDER_INFO)
                  .filter(([k]) => !existingProviders.includes(k))
                  .map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-surface-700">Client ID *</label>
              <input
                className="min-h-[38px] w-full rounded-xl border border-surface-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 placeholder:text-surface-400"
                placeholder="OAuth2 Client ID"
                value={form.client_id}
                onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-surface-700">Client Secret *</label>
              <input
                type="password"
                className="min-h-[38px] w-full rounded-xl border border-surface-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 placeholder:text-surface-400"
                placeholder="OAuth2 Client Secret"
                value={form.client_secret}
                onChange={(e) => setForm((p) => ({ ...p, client_secret: e.target.value }))}
              />
            </div>
            {form.provider === "microsoft" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-surface-700">Azure Tenant ID</label>
                <input
                  className="min-h-[38px] w-full rounded-xl border border-surface-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 placeholder:text-surface-400"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={form.tenant_id}
                  onChange={(e) => setForm((p) => ({ ...p, tenant_id: e.target.value }))}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-xs font-semibold text-surface-500 transition-colors hover:text-surface-900">İptal</button>
            <button
              onClick={createConfig}
              disabled={saving || !form.client_id || !form.client_secret}
              className="rounded-xl bg-surface-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-surface-800 disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
        </div>
      ) : configs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-200 bg-white py-16 text-center">
          <KeyRound className="mx-auto mb-3 h-8 w-8 text-surface-300" />
          <p className="text-sm font-semibold text-surface-500">Henüz SSO yapılandırması yok.</p>
          <p className="mt-1 text-xs text-surface-400">
            Google veya Microsoft ile tek tıkla giriş ekleyin.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((c) => {
            const info = PROVIDER_INFO[c.provider] ?? { label: c.provider, color: "bg-surface-100 border-surface-200 text-surface-600", icon: "?" };
            return (
              <div
                key={c.id}
                className={`flex items-center justify-between gap-3 rounded-2xl border border-surface-200 bg-white p-4 shadow-sm ${c.is_active ? "" : "opacity-60"}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${info.color}`}>
                    {info.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-surface-900">{info.label}</p>
                      {c.is_active && (
                        <span className="flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-11 font-semibold text-emerald-700">
                          <Check className="h-2.5 w-2.5" /> Aktif
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-11 text-surface-400">
                      {c.client_id ? `Client ID: ${c.client_id.slice(0, 20)}...` : "Client ID girilmedi"}
                      {c.has_secret && " · Secret ✓"}
                      {c.tenant_id && ` · Tenant: ${c.tenant_id.slice(0, 8)}...`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button onClick={() => toggleActive(c)} className="text-surface-400 transition-colors hover:text-surface-900" aria-label="Toggle SSO">
                    {c.is_active
                      ? <ToggleRight className="h-6 w-6 text-surface-900" />
                      : <ToggleLeft className="h-6 w-6" />
                    }
                  </button>
                  <button onClick={() => deleteConfig(c.id)} className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-rose-50 hover:text-rose-500" aria-label="Sil">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
