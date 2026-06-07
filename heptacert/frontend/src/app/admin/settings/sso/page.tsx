"use client";

import { useEffect, useState } from "react";
import {
  Check, KeyRound, Loader2, Plus, ShieldCheck, Trash2, ToggleLeft, ToggleRight, X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

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
  generic_oidc: { label: "Generic OIDC", color: "bg-purple-50 border-purple-200 text-purple-700", icon: "⚙" },
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
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {toast.msg && (
        <div
          className={`fixed top-4 right-4 z-50 text-sm text-white px-4 py-2.5 rounded-xl shadow-lg ${toast.ok ? "bg-gray-900" : "bg-red-600"}`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            SSO / OAuth2 Ayarları
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Google, Microsoft veya özel OIDC sağlayıcısı ile tek oturum açma.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          disabled={existingProviders.length >= 3}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          SSO Ekle
        </button>
      </div>

      {/* How it works */}
      <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4 text-sm text-indigo-800 space-y-1">
        <p className="font-semibold">Nasıl çalışır?</p>
        <ol className="list-decimal list-inside space-y-1 text-indigo-700">
          <li>OAuth2 sağlayıcınızda (Google Cloud / Azure AD) bir uygulama oluşturun.</li>
          <li>Redirect URI olarak <code className="bg-indigo-100 px-1 rounded">/auth/sso/callback/{"{"}provider{"}"}</code> ekleyin.</li>
          <li>Client ID ve Secret'ı buraya girin, SSO'yu etkinleştirin.</li>
          <li>Üyeler <code className="bg-indigo-100 px-1 rounded">/auth/sso/{"{"}provider{"}"}/login</code> adresiyle giriş yapar.</li>
        </ol>
      </div>

      {/* New config form */}
      {showNew && (
        <div className="bg-white rounded-xl border border-indigo-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Yeni SSO Sağlayıcısı</h2>
            <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sağlayıcı</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Client ID *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="OAuth2 Client ID"
                value={form.client_id}
                onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Client Secret *</label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="OAuth2 Client Secret"
                value={form.client_secret}
                onChange={(e) => setForm((p) => ({ ...p, client_secret: e.target.value }))}
              />
            </div>
            {form.provider === "microsoft" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Azure Tenant ID</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={form.tenant_id}
                  onChange={(e) => setForm((p) => ({ ...p, tenant_id: e.target.value }))}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowNew(false)} className="text-sm text-gray-600 px-4 py-2">İptal</button>
            <button
              onClick={createConfig}
              disabled={saving || !form.client_id || !form.client_secret}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <KeyRound className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Henüz SSO yapılandırması yok.</p>
          <p className="text-sm text-gray-400 mt-1">
            Google veya Microsoft ile tek tıkla giriş ekleyin.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((c) => {
            const info = PROVIDER_INFO[c.provider] ?? { label: c.provider, color: "bg-gray-100 border-gray-200 text-gray-700", icon: "?" };
            return (
              <div
                key={c.id}
                className={`bg-white rounded-xl border p-4 flex items-center justify-between gap-3 ${c.is_active ? "" : "opacity-60"}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 text-sm font-bold ${info.color}`}>
                    {info.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{info.label}</p>
                      {c.is_active && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {c.client_id ? `Client ID: ${c.client_id.slice(0, 20)}...` : "Client ID girilmedi"}
                      {c.has_secret && " · Secret ✓"}
                      {c.tenant_id && ` · Tenant: ${c.tenant_id.slice(0, 8)}...`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(c)} className="text-gray-400 hover:text-indigo-600">
                    {c.is_active
                      ? <ToggleRight className="w-6 h-6 text-indigo-600" />
                      : <ToggleLeft className="w-6 h-6" />
                    }
                  </button>
                  <button onClick={() => deleteConfig(c.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
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
