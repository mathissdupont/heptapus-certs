"use client";

import { useEffect, useState } from "react";
import {
  ExternalLink, Loader2, Plus, ToggleLeft, ToggleRight, Trash2, X, Zap,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type LtiTool = {
  id: number;
  name: string;
  launch_url: string;
  consumer_key: string | null;
  provider: string;
  is_active: boolean;
  has_secret: boolean;
  custom_params: Record<string, string> | null;
  created_at: string;
};

const emptyForm = {
  name: "",
  launch_url: "",
  consumer_key: "",
  shared_secret: "",
  provider: "lti_1_1",
  custom_params_text: "",
};

export default function LtiToolsPage() {
  const [tools, setTools] = useState<LtiTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function load() {
    setLoading(true);
    const data = await apiFetch("/admin/lms/lti-tools").then((r) => r.json());
    setTools(Array.isArray(data?.tools) ? data.tools : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function parseCustomParams(text: string): Record<string, string> | null {
    if (!text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      const result: Record<string, string> = {};
      text.split("\n").forEach((line) => {
        const [k, ...v] = line.split("=");
        if (k?.trim()) result[k.trim()] = v.join("=").trim();
      });
      return Object.keys(result).length ? result : null;
    }
  }

  async function createTool() {
    if (!form.name || !form.launch_url) return;
    setSaving(true);
    try {
      await apiFetch("/admin/lms/lti-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          launch_url: form.launch_url,
          consumer_key: form.consumer_key || null,
          shared_secret: form.shared_secret || null,
          provider: form.provider,
          custom_params: parseCustomParams(form.custom_params_text),
        }),
      });
      showToast("LTI aracı oluşturuldu.");
      setForm(emptyForm);
      setShowNew(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(tool: LtiTool) {
    await apiFetch(`/admin/lms/lti-tools/${tool.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !tool.is_active }),
    });
    load();
  }

  async function deleteTool(id: number) {
    if (!confirm("Bu LTI aracını silmek istediğinizden emin misiniz?")) return;
    await apiFetch(`/admin/lms/lti-tools/${id}`, { method: "DELETE" });
    load();
    showToast("Araç silindi.");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            LTI Araçları
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Zoom, H5P, Kahoot gibi harici araçları LMS modüllerinize entegre edin (LTI 1.1).
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
        >
          <Plus className="w-4 h-4" />
          Araç Ekle
        </button>
      </div>

      {/* New tool form */}
      {showNew && (
        <div className="bg-white rounded-xl border border-amber-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Yeni LTI Aracı</h2>
            <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Araç Adı *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Zoom, H5P, Kahoot..."
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Versiyon</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.provider}
                onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))}
              >
                <option value="lti_1_1">LTI 1.1</option>
                <option value="lti_1_3">LTI 1.3</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Launch URL *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="https://tool.example.com/lti/launch"
                value={form.launch_url}
                onChange={(e) => setForm((p) => ({ ...p, launch_url: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Consumer Key</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="Araç sağlayıcısından alın"
                value={form.consumer_key}
                onChange={(e) => setForm((p) => ({ ...p, consumer_key: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Shared Secret</label>
              <input
                type="password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="Gizli anahtar"
                value={form.shared_secret}
                onChange={(e) => setForm((p) => ({ ...p, shared_secret: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Özel Parametreler (key=value her satırda veya JSON)
              </label>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none resize-none"
                placeholder={"course_id=123\nlocale=tr"}
                value={form.custom_params_text}
                onChange={(e) => setForm((p) => ({ ...p, custom_params_text: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowNew(false)} className="text-sm text-gray-600 px-4 py-2">İptal</button>
            <button
              onClick={createTool}
              disabled={saving || !form.name || !form.launch_url}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
            >
              {saving ? "Oluşturuluyor..." : "Oluştur"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
        </div>
      ) : tools.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Zap className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Henüz LTI aracı yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tools.map((t) => (
            <div
              key={t.id}
              className={`bg-white rounded-xl border p-4 flex items-center justify-between gap-3 ${t.is_active ? "border-gray-200" : "border-gray-100 opacity-60"}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{t.name}</p>
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t.provider}</span>
                    {t.has_secret && (
                      <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">✓ Secret</span>
                    )}
                  </div>
                  <a
                    href={t.launch_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1 mt-0.5 truncate max-w-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    {t.launch_url}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleActive(t)} className="text-gray-400 hover:text-amber-500">
                  {t.is_active
                    ? <ToggleRight className="w-6 h-6 text-amber-500" />
                    : <ToggleLeft className="w-6 h-6" />
                  }
                </button>
                <button onClick={() => deleteTool(t.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
