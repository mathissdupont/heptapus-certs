"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ApiKeyFull,
  ApiKeyCreated,
  ApiScopeOption,
  listApiKeysV2,
  listApiScopes,
  createApiKeyV2,
  updateApiKeyScopes,
  deleteApiKey,
} from "@/lib/api";

type CreateForm = {
  name: string;
  scopes: string[];
  expires_days: string;
};

const EMPTY_FORM: CreateForm = { name: "", scopes: [], expires_days: "" };

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ApiSettingsPage() {
  const [keys, setKeys] = useState<ApiKeyFull[]>([]);
  const [scopes, setScopes] = useState<ApiScopeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [creating, setSaving] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editScopes, setEditScopes] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [k, s] = await Promise.all([listApiKeysV2(), listApiScopes()]);
      setKeys(k);
      setScopes(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function toggleScope(scope: string) {
    setForm((f) =>
      f.scopes.includes(scope)
        ? { ...f, scopes: f.scopes.filter((s) => s !== scope) }
        : { ...f, scopes: [...f.scopes, scope] }
    );
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const result = await createApiKeyV2({
        name: form.name.trim(),
        scopes: form.scopes,
        expires_days: form.expires_days ? Number(form.expires_days) : null,
      });
      setCreatedKey(result);
      setForm(EMPTY_FORM);
      setShowCreate(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Oluşturulamadı");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveScopes(id: number) {
    try {
      await updateApiKeyScopes(id, { scopes: editScopes });
      setEditingId(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    }
  }

  async function handleRevoke(id: number) {
    try {
      await updateApiKeyScopes(id, { is_active: false });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "İptal edilemedi");
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) return <div className="p-8 text-gray-400">Yükleniyor…</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">API Anahtarları</h1>
        <div className="flex gap-3">
          <Link
            href="/developers"
            target="_blank"
            className="px-3 py-2 text-sm border rounded hover:bg-gray-50"
          >
            Dokümantasyon ↗
          </Link>
          <button
            onClick={() => { setShowCreate(true); setCreatedKey(null); }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 font-medium"
          >
            + Yeni Anahtar
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        API anahtarları ile HeptaCert verilerinize programatik erişim sağlayın.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">kapat</button>
        </div>
      )}

      {/* Created key banner */}
      {createdKey && (
        <div className="mb-6 p-4 bg-green-50 border border-green-300 rounded-lg">
          <p className="text-sm font-semibold text-green-800 mb-1">
            Anahtar oluşturuldu — bir kez görüntüleniyor, kaydedin!
          </p>
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 text-xs bg-white border px-3 py-2 rounded font-mono break-all">
              {createdKey.full_key}
            </code>
            <button
              onClick={() => copyKey(createdKey.full_key)}
              className="px-3 py-2 text-xs bg-green-700 text-white rounded hover:bg-green-800 whitespace-nowrap"
            >
              {copied ? "Kopyalandı!" : "Kopyala"}
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Yeni API Anahtarı</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Örn: Üretim Entegrasyonu"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">İzinler</label>
                <div className="grid grid-cols-2 gap-2">
                  {scopes.map((s) => (
                    <label key={s.value} className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={form.scopes.includes(s.value)}
                        onChange={() => toggleScope(s.value)}
                        className="mt-0.5 rounded"
                      />
                      <span className="text-xs text-gray-700">
                        <span className="font-mono text-indigo-700">{s.value}</span>
                        <br />
                        <span className="text-gray-500">{s.label}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Son Kullanma (gün) — boş: sonsuz
                </label>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={form.expires_days}
                  onChange={(e) => setForm({ ...form, expires_days: e.target.value })}
                  placeholder="365"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.name.trim()}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? "Oluşturuluyor…" : "Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys list */}
      {keys.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-xl border">
          <p className="text-4xl mb-3">🔑</p>
          <p className="text-gray-500 text-sm">Henüz API anahtarı yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div key={k.id} className={`bg-white rounded-xl border p-4 ${!k.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{k.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        k.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {k.is_active ? "Aktif" : "İptal"}
                    </span>
                  </div>
                  <code className="text-xs text-gray-500 font-mono">{k.key_prefix}…</code>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {k.scopes.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">İzin yok</span>
                    ) : (
                      k.scopes.map((s) => (
                        <span key={s} className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono">
                          {s}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-400 whitespace-nowrap">
                  <p>Oluşturuldu: {formatDate(k.created_at)}</p>
                  <p>Son kul.: {formatDate(k.last_used_at)}</p>
                  <p>Geçerlilik: {k.expires_at ? formatDate(k.expires_at) : "Sonsuz"}</p>
                </div>
              </div>

              {/* Scope editor */}
              {editingId === k.id ? (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium text-gray-600 mb-2">İzinleri Düzenle</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {scopes.map((s) => (
                      <label key={s.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editScopes.includes(s.value)}
                          onChange={() =>
                            setEditScopes((prev) =>
                              prev.includes(s.value)
                                ? prev.filter((x) => x !== s.value)
                                : [...prev, s.value]
                            )
                          }
                          className="rounded"
                        />
                        <span className="text-xs font-mono text-indigo-700">{s.value}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveScopes(k.id)}
                      className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Kaydet
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t flex gap-3">
                  {k.is_active && (
                    <>
                      <button
                        onClick={() => { setEditingId(k.id); setEditScopes(k.scopes); }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        İzinleri Düzenle
                      </button>
                      <button
                        onClick={() => handleRevoke(k.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        İptal Et
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
