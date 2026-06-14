"use client";

import { useEffect, useState } from "react";
import {
  Award, Check, Loader2, Pencil, Plus, Trash2, Users, X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type Badge = {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  criteria_text: string | null;
  trigger_type: string;
  trigger_ref_id: number | null;
  created_at: string;
};

const TRIGGER_LABELS: Record<string, string> = {
  course_completed: "Kurs Tamamlandı",
  journey_completed: "Öğrenme Yolu Tamamlandı",
  manual: "Manuel",
  automation: "Otomasyon",
};

const TRIGGER_COLORS: Record<string, string> = {
  course_completed: "bg-blue-50 text-blue-700",
  journey_completed: "bg-purple-50 text-purple-700",
  manual: "bg-gray-50 text-gray-700",
  automation: "bg-orange-50 text-orange-700",
};

const emptyForm = {
  name: "",
  description: "",
  image_url: "",
  criteria_text: "",
  trigger_type: "manual",
  trigger_ref_id: "",
};

export default function LmsBadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [awardBadgeId, setAwardBadgeId] = useState<number | null>(null);
  const [awardMemberId, setAwardMemberId] = useState("");
  const [awarding, setAwarding] = useState(false);

  async function load() {
    setLoading(true);
    const data = await apiFetch("/admin/lms/badges").then((r) => r.json());
    setBadges(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      image_url: form.image_url || null,
      criteria_text: form.criteria_text || null,
      trigger_type: form.trigger_type,
      trigger_ref_id: form.trigger_ref_id ? Number(form.trigger_ref_id) : null,
    };
    if (editing !== null) {
      await apiFetch(`/admin/lms/badges/${editing}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setEditing(null);
    } else {
      await apiFetch("/admin/lms/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setShowNew(false);
    }
    setForm(emptyForm);
    setSaving(false);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Bu rozeti silmek istediğinizden emin misiniz?")) return;
    await apiFetch(`/admin/lms/badges/${id}`, { method: "DELETE" });
    load();
  }

  async function awardBadge() {
    if (!awardBadgeId || !awardMemberId) return;
    setAwarding(true);
    const res = await apiFetch(
      `/admin/lms/badges/${awardBadgeId}/award?member_id=${awardMemberId}`,
      { method: "POST" }
    );
    setAwarding(false);
    if (res.ok) {
      setAwardBadgeId(null);
      setAwardMemberId("");
      alert("Rozet başarıyla verildi!");
    }
  }

  function startEdit(b: Badge) {
    setEditing(b.id);
    setShowNew(false);
    setForm({
      name: b.name,
      description: b.description ?? "",
      image_url: b.image_url ?? "",
      criteria_text: b.criteria_text ?? "",
      trigger_type: b.trigger_type,
      trigger_ref_id: b.trigger_ref_id?.toString() ?? "",
    });
  }

  function cancelForm() {
    setEditing(null);
    setShowNew(false);
    setForm(emptyForm);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500" />
            Rozetler
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Kurs ve yol tamamlamaya bağlı dijital rozetler
          </p>
        </div>
        <button
          onClick={() => { setShowNew(true); setEditing(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
        >
          <Plus className="w-4 h-4" />
          Yeni Rozet
        </button>
      </div>

      {/* Form */}
      {(showNew || editing !== null) && (
        <div className="bg-white rounded-xl border border-amber-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">
            {editing !== null ? "Rozeti Düzenle" : "Yeni Rozet"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Rozet Adı *</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Python Ustası"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tetikleyici</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.trigger_type}
                onChange={(e) => setForm((p) => ({ ...p, trigger_type: e.target.value }))}
              >
                <option value="manual">Manuel</option>
                <option value="course_completed">Kurs Tamamlandı</option>
                <option value="journey_completed">Öğrenme Yolu Tamamlandı</option>
                <option value="automation">Otomasyon</option>
              </select>
            </div>
            {form.trigger_type !== "manual" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {form.trigger_type === "course_completed" ? "Kurs ID" : "Yol ID"}
                </label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  placeholder="ID"
                  value={form.trigger_ref_id}
                  onChange={(e) => setForm((p) => ({ ...p, trigger_ref_id: e.target.value }))}
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Kazanım Kriterleri</label>
              <textarea
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="Bu rozeti kazanmak için..."
                value={form.criteria_text}
                onChange={(e) => setForm((p) => ({ ...p, criteria_text: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Görsel URL (opsiyonel)</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                placeholder="https://..."
                value={form.image_url}
                onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={cancelForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              <X className="w-4 h-4 inline mr-1" />
              İptal
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : <Check className="w-4 h-4 inline mr-1" />}
              {editing !== null ? "Güncelle" : "Oluştur"}
            </button>
          </div>
        </div>
      )}

      {/* Award modal */}
      {awardBadgeId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Rozet Ver</h3>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              placeholder="Üye ID"
              value={awardMemberId}
              onChange={(e) => setAwardMemberId(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setAwardBadgeId(null)} className="px-4 py-2 text-sm text-gray-600">
                İptal
              </button>
              <button
                onClick={awardBadge}
                disabled={awarding || !awardMemberId}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
              >
                {awarding ? "Veriliyor..." : "Ver"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      ) : badges.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Award className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Henüz rozet oluşturulmamış.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {badges.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  {b.image_url ? (
                    <img src={b.image_url} alt={b.name} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <Award className="w-7 h-7 text-amber-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{b.name}</h3>
                    <span
                      className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${TRIGGER_COLORS[b.trigger_type] ?? "bg-gray-50 text-gray-700"}`}
                    >
                      {TRIGGER_LABELS[b.trigger_type] ?? b.trigger_type}
                    </span>
                  </div>
                  {b.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{b.description}</p>
                  )}
                  {b.criteria_text && (
                    <p className="text-xs text-gray-400 mt-1 italic">{b.criteria_text}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => { setAwardBadgeId(b.id); setAwardMemberId(""); }}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100"
                    >
                      <Users className="w-3 h-3" />
                      Ver
                    </button>
                    <button
                      onClick={() => startEdit(b)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove(b.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
