"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  BookOpen, ChevronRight, Loader2, Plus, ToggleLeft, ToggleRight, Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type Bridge = {
  id: number;
  event_id: number;
  course_id: number | null;
  trigger_on: string;
  action: string;
  action_ref_id: number | null;
  is_active: boolean;
  created_at: string;
};

const TRIGGER_LABELS: Record<string, string> = {
  attendance: "Katılım kaydedildi",
  cert_issued: "Sertifika verildi",
  quiz_pass: "Sınavdan geçti",
};

const ACTION_LABELS: Record<string, string> = {
  enroll_in_course: "Kursa kayıt et",
  unlock_module: "Modülü aç",
  award_badge: "Rozet ver",
};

const emptyForm = {
  course_id: "",
  trigger_on: "attendance",
  action: "enroll_in_course",
  action_ref_id: "",
  is_active: true,
};

export default function LmsBridgePage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [bridges, setBridges] = useState<Bridge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const data = await apiFetch("/api/admin/lms/bridges").then((r) => r.json());
    const evBridges = Array.isArray(data)
      ? data.filter((b: Bridge) => b.event_id === Number(eventId))
      : [];
    setBridges(evBridges);
    setLoading(false);
  }

  useEffect(() => { load(); }, [eventId]);

  async function create() {
    if (!form.course_id) return;
    setSaving(true);
    await apiFetch("/api/admin/lms/bridges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: Number(eventId),
        course_id: Number(form.course_id),
        trigger_on: form.trigger_on,
        action: form.action,
        action_ref_id: form.action_ref_id ? Number(form.action_ref_id) : null,
        is_active: form.is_active,
      }),
    });
    setForm(emptyForm);
    setShowNew(false);
    setSaving(false);
    load();
  }

  async function toggle(bridge: Bridge) {
    await apiFetch(`/api/admin/lms/bridges/${bridge.id}/toggle?is_active=${!bridge.is_active}`, {
      method: "PATCH",
    });
    load();
  }

  async function remove(id: number) {
    if (!confirm("Bu köprüyü silmek istediğinizden emin misiniz?")) return;
    await apiFetch(`/api/admin/lms/bridges/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            LMS Köprüsü
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Bu etkinliği LMS kurslarına bağlayın. Tetikleyici gerçekleşince otomatik aksiyon alınır.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Köprü Ekle
        </button>
      </div>

      {showNew && (
        <div className="bg-white rounded-xl border border-indigo-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Yeni Köprü</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kurs ID *</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Kurs ID"
                value={form.course_id}
                onChange={(e) => setForm((p) => ({ ...p, course_id: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tetikleyici</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.trigger_on}
                onChange={(e) => setForm((p) => ({ ...p, trigger_on: e.target.value }))}
              >
                <option value="attendance">Katılım kaydedildi</option>
                <option value="cert_issued">Sertifika verildi</option>
                <option value="quiz_pass">Sınavdan geçti</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Aksiyon</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.action}
                onChange={(e) => setForm((p) => ({ ...p, action: e.target.value }))}
              >
                <option value="enroll_in_course">Kursa kayıt et</option>
                <option value="unlock_module">Modülü aç</option>
                <option value="award_badge">Rozet ver</option>
              </select>
            </div>
            {form.action !== "enroll_in_course" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {form.action === "unlock_module" ? "Modül ID" : "Rozet ID"}
                </label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  placeholder="ID"
                  value={form.action_ref_id}
                  onChange={(e) => setForm((p) => ({ ...p, action_ref_id: e.target.value }))}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowNew(false)} className="text-sm text-gray-600 px-4 py-2">
              İptal
            </button>
            <button
              onClick={create}
              disabled={saving || !form.course_id}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Oluşturuluyor..." : "Oluştur"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        </div>
      ) : bridges.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Henüz LMS köprüsü yok.</p>
          <p className="text-sm text-gray-400 mt-1">
            Etkinlik katılımını otomatik olarak LMS kurs kaydına bağlayın.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bridges.map((b) => (
            <div
              key={b.id}
              className={`bg-white rounded-xl border p-4 flex items-center justify-between gap-4 ${b.is_active ? "border-gray-200" : "border-gray-100 opacity-60"}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">{TRIGGER_LABELS[b.trigger_on] ?? b.trigger_on}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-900">{ACTION_LABELS[b.action] ?? b.action}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Kurs #{b.course_id}
                    {b.action_ref_id != null && ` · Ref #${b.action_ref_id}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggle(b)} className="text-gray-400 hover:text-indigo-600">
                  {b.is_active
                    ? <ToggleRight className="w-6 h-6 text-indigo-600" />
                    : <ToggleLeft className="w-6 h-6" />
                  }
                </button>
                <button onClick={() => remove(b.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
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
