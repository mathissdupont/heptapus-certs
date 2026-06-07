"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Target, Pencil, Check, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Outcome = {
  id: number;
  title: string;
  description: string | null;
  mastery_points: number;
  display_name: string | null;
  created_at: string;
};

export default function LmsOutcomesPage() {
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", description: "", mastery_points: 70, display_name: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const data = await apiFetch("/api/admin/lms/outcomes").then((r) => r.json());
    setOutcomes(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || null,
      mastery_points: Number(form.mastery_points),
      display_name: form.display_name || null,
    };
    if (editing !== null) {
      await apiFetch(`/api/admin/lms/outcomes/${editing}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setEditing(null);
    } else {
      await apiFetch("/api/admin/lms/outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setShowNew(false);
    }
    setForm({ title: "", description: "", mastery_points: 70, display_name: "" });
    setSaving(false);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Bu kazanımı silmek istediğinizden emin misiniz?")) return;
    await apiFetch(`/api/admin/lms/outcomes/${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(o: Outcome) {
    setEditing(o.id);
    setShowNew(false);
    setForm({
      title: o.title,
      description: o.description ?? "",
      mastery_points: o.mastery_points,
      display_name: o.display_name ?? "",
    });
  }

  function cancelEdit() {
    setEditing(null);
    setShowNew(false);
    setForm({ title: "", description: "", mastery_points: 70, display_name: "" });
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-purple-600" />
            Öğrenme Kazanımları
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Kurs modüllerine bağlanacak ölçülebilir öğrenme hedefleri
          </p>
        </div>
        <button
          onClick={() => { setShowNew(true); setEditing(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" />
          Yeni Kazanım
        </button>
      </div>

      {/* New / Edit form */}
      {(showNew || editing !== null) && (
        <div className="bg-white rounded-xl border border-purple-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">
            {editing !== null ? "Kazanımı Düzenle" : "Yeni Kazanım"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Başlık *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Örn: SQL sorgularını yazabilir"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kısa Ad (opsiyonel)</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="SQL.1"
                value={form.display_name}
                onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Ustalık Eşiği (%)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.mastery_points}
                onChange={(e) => setForm((p) => ({ ...p, mastery_points: Number(e.target.value) }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Açıklama</label>
              <textarea
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="Öğrenci bu kazanıma ulaştığında..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={cancelEdit} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              <X className="w-4 h-4 inline mr-1" />
              İptal
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : <Check className="w-4 h-4 inline mr-1" />}
              {editing !== null ? "Güncelle" : "Oluştur"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </div>
      ) : outcomes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Henüz kazanım eklenmemiş.</p>
          <p className="text-sm text-gray-400 mt-1">Kurs modüllerine bağlanacak öğrenme hedefleri oluşturun.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {outcomes.map((o) => (
            <div key={o.id} className="flex items-start justify-between p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Target className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{o.title}</span>
                    {o.display_name && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">
                        {o.display_name}
                      </span>
                    )}
                  </div>
                  {o.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{o.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Ustalık eşiği: %{o.mastery_points}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => startEdit(o)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => remove(o.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                >
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
