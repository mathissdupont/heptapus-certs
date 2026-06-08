"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  ExternalLink,
  Loader2,
  Plug,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

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

type Event = { id: number; name: string };

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

const emptyLtiForm = {
  name: "",
  launch_url: "",
  consumer_key: "",
  shared_secret: "",
  provider: "lti_1_1",
  custom_params_text: "",
};

const emptyBridgeForm = {
  course_id: "",
  trigger_on: "attendance",
  action: "enroll_in_course",
  action_ref_id: "",
  is_active: true,
};

type Tab = "lti" | "bridges";

// ── Main component ─────────────────────────────────────────────────────────

export default function LmsIntegrationsPage() {
  const [tab, setTab] = useState<Tab>("lti");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Plug className="w-5 h-5 text-indigo-600" />
          Entegrasyonlar
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          LTI araçları ve etkinlik-LMS köprülerini buradan yönetin.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab("lti")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
            tab === "lti"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Zap className="w-4 h-4" />
          LTI Araçları
        </button>
        <button
          onClick={() => setTab("bridges")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
            tab === "bridges"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Etkinlik Köprüleri
        </button>
      </div>

      {tab === "lti" ? <LtiSection /> : <BridgesSection />}
    </div>
  );
}

// ── LTI Section ─────────────────────────────────────────────────────────────

function LtiSection() {
  const [tools, setTools] = useState<LtiTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyLtiForm);
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
      setForm(emptyLtiForm);
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
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
        >
          <Plus className="w-4 h-4" />
          Araç Ekle
        </button>
      </div>

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
          <p className="text-sm text-gray-400 mt-1">Zoom, H5P, Kahoot gibi araçları LMS modüllerinize entegre edin.</p>
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

// ── Bridges Section ────────────────────────────────────────────────────────

function BridgesSection() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [bridges, setBridges] = useState<Bridge[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingBridges, setLoadingBridges] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyBridgeForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadingEvents(true);
    apiFetch("/admin/events")
      .then((r) => r.json())
      .then((d) => {
        const list: Event[] = Array.isArray(d?.events) ? d.events : Array.isArray(d) ? d : [];
        setEvents(list);
        if (list.length > 0) setSelectedEventId(list[0].id);
      })
      .catch(() => null)
      .finally(() => setLoadingEvents(false));
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    setLoadingBridges(true);
    apiFetch("/admin/lms/bridges")
      .then((r) => r.json())
      .then((d) => {
        const all: Bridge[] = Array.isArray(d) ? d : [];
        setBridges(all.filter((b) => b.event_id === selectedEventId));
      })
      .catch(() => setBridges([]))
      .finally(() => setLoadingBridges(false));
  }, [selectedEventId]);

  async function create() {
    if (!form.course_id || !selectedEventId) return;
    setSaving(true);
    await apiFetch("/admin/lms/bridges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: selectedEventId,
        course_id: Number(form.course_id),
        trigger_on: form.trigger_on,
        action: form.action,
        action_ref_id: form.action_ref_id ? Number(form.action_ref_id) : null,
        is_active: form.is_active,
      }),
    });
    setForm(emptyBridgeForm);
    setShowNew(false);
    setSaving(false);
    // Reload bridges for current event
    apiFetch("/admin/lms/bridges")
      .then((r) => r.json())
      .then((d) => {
        const all: Bridge[] = Array.isArray(d) ? d : [];
        setBridges(all.filter((b) => b.event_id === selectedEventId));
      });
  }

  async function toggle(bridge: Bridge) {
    await apiFetch(`/admin/lms/bridges/${bridge.id}/toggle?is_active=${!bridge.is_active}`, {
      method: "PATCH",
    });
    setBridges((prev) => prev.map((b) => b.id === bridge.id ? { ...b, is_active: !b.is_active } : b));
  }

  async function remove(id: number) {
    if (!confirm("Bu köprüyü silmek istediğinizden emin misiniz?")) return;
    await apiFetch(`/admin/lms/bridges/${id}`, { method: "DELETE" });
    setBridges((prev) => prev.filter((b) => b.id !== id));
  }

  if (loadingEvents) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Henüz etkinlik yok.</p>
        <p className="text-sm text-gray-400 mt-1">Etkinlik oluşturduktan sonra LMS köprüsü kurabilirsiniz.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <label className="text-sm font-medium text-gray-700 shrink-0">Etkinlik:</label>
          <select
            value={selectedEventId ?? ""}
            onChange={(e) => setSelectedEventId(Number(e.target.value))}
            className="min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Köprü Ekle
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Tetikleyici gerçekleşince (katılım, sertifika vb.) LMS'de otomatik aksiyon alınır.
      </p>

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
            <button onClick={() => setShowNew(false)} className="text-sm text-gray-600 px-4 py-2">İptal</button>
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

      {loadingBridges ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        </div>
      ) : bridges.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Bu etkinlik için henüz LMS köprüsü yok.</p>
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
