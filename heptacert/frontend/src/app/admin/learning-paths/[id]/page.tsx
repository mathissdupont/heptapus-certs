"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Save, Loader2, Plus, Trash2, GripVertical, CheckCircle2,
  AlertCircle, ChevronDown, ChevronUp, ArrowLeft, Eye, EyeOff,
  BarChart3, Users,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type StepForm = {
  id?: number;
  event_id: number;
  event_name: string;
  order: number;
  required: boolean;
  min_score_override: string;
};

type PathDetail = {
  id: number;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  published: boolean;
  step_count: number;
  steps: {
    id: number; event_id: number; event_name?: string;
    order: number; required: boolean; min_score_override: number | null;
  }[];
};

type EnrollmentSummary = {
  summary: { total: number; completed: number; completion_rate: number };
};

type EventOption = { id: number; name: string };

export default function LearningPathBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const pathId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"builder" | "enrollments">("builder");
  const [path, setPath] = useState<PathDetail | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(false);
  const [steps, setSteps] = useState<StepForm[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentSummary | null>(null);
  const [eventSearch, setEventSearch] = useState("");
  const [eventOptions, setEventOptions] = useState<EventOption[]>([]);
  const [allEvents, setAllEvents] = useState<EventOption[]>([]);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // Load path
  useEffect(() => {
    apiFetch(`/admin/learning-paths/${pathId}`)
      .then((r) => r.json())
      .then((d: PathDetail) => {
        setPath(d);
        setName(d.name);
        setDescription(d.description ?? "");
        setPublished(d.published);
        setSteps(
          d.steps.map((s) => ({
            id: s.id,
            event_id: s.event_id,
            event_name: s.event_name ?? `Event #${s.event_id}`,
            order: s.order,
            required: s.required,
            min_score_override: s.min_score_override != null ? String(s.min_score_override) : "",
          }))
        );
      })
      .catch(() => router.push("/admin/learning-paths"))
      .finally(() => setLoading(false));
  }, [pathId]);

  // Load enrollments
  useEffect(() => {
    if (tab !== "enrollments") return;
    apiFetch(`/admin/learning-paths/${pathId}/enrollments`)
      .then((r) => r.json())
      .then((d) => setEnrollments(d))
      .catch(() => {});
  }, [tab, pathId]);

  // Fetch all events once for local search
  useEffect(() => {
    apiFetch("/admin/events")
      .then((r) => r.json())
      .then((d: any) => {
        const list: any[] = Array.isArray(d) ? d : (d.events ?? []);
        setAllEvents(list.map((e: any) => ({ id: e.id, name: e.name })));
      })
      .catch(() => {});
  }, []);

  // Filter locally as user types
  useEffect(() => {
    if (!eventSearch.trim()) { setEventOptions([]); return; }
    const q = eventSearch.toLowerCase();
    setEventOptions(allEvents.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 10));
  }, [eventSearch, allEvents]);

  // Save meta
  async function handleSaveMeta() {
    setSaving(true);
    try {
      await apiFetch(`/admin/learning-paths/${pathId}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description: description || null, published }),
      });
      showToast("success", "Kaydedildi.");
    } catch {
      showToast("error", "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  }

  // Save steps
  async function handleSaveSteps() {
    setSaving(true);
    try {
      await apiFetch(`/admin/learning-paths/${pathId}/steps`, {
        method: "PUT",
        body: JSON.stringify(
          steps.map((s, i) => ({
            event_id: s.event_id,
            order: i,
            required: s.required,
            min_score_override: s.min_score_override ? Number(s.min_score_override) : null,
          }))
        ),
      });
      showToast("success", "Adımlar kaydedildi.");
    } catch {
      showToast("error", "Adımlar kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  function addStep(ev: EventOption) {
    if (steps.some((s) => s.event_id === ev.id)) return;
    setSteps((s) => [
      ...s,
      { event_id: ev.id, event_name: ev.name, order: s.length, required: true, min_score_override: "" },
    ]);
    setEventSearch("");
    setEventOptions([]);
  }

  function removeStep(idx: number) {
    setSteps((s) => s.filter((_, i) => i !== idx));
  }

  function moveStep(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= steps.length) return;
    setSteps((s) => {
      const arr = [...s];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg text-white ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/learning-paths" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 flex-1 truncate">{name}</h1>
        <span className={`text-xs rounded-full px-2.5 py-1 font-medium ${published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {published ? "Yayında" : "Taslak"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(["builder", "enrollments"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "builder" ? "Düzenle" : "Kayıtlar"}
          </button>
        ))}
      </div>

      {/* ── Builder ── */}
      {tab === "builder" && (
        <div className="space-y-5">
          {/* Meta card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-medium text-gray-700">Genel Bilgiler</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Başlık</label>
                <input
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Açıklama</label>
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                />
                Yayınla (üyeler görebilsin)
              </label>
            </div>
            <button
              onClick={handleSaveMeta}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </button>
          </div>

          {/* Steps card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700">Adımlar ({steps.length})</h2>
              <button
                onClick={handleSaveSteps}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Adımları Kaydet
              </button>
            </div>

            {steps.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                Henüz adım yok. Aşağıdan etkinlik arayıp ekleyin.
              </p>
            )}

            <div className="space-y-2">
              {steps.map((s, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
                  <span className="text-xs font-bold text-gray-400 w-4">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.event_name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={s.required}
                          onChange={(e) =>
                            setSteps((arr) =>
                              arr.map((x, i) => (i === idx ? { ...x, required: e.target.checked } : x))
                            )
                          }
                        />
                        Zorunlu
                      </label>
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-gray-400">Min. puan:</label>
                        <input
                          type="number"
                          className="w-14 rounded border border-gray-200 px-1.5 py-0.5 text-xs focus:outline-none"
                          placeholder="Auto"
                          value={s.min_score_override}
                          onChange={(e) =>
                            setSteps((arr) =>
                              arr.map((x, i) => (i === idx ? { ...x, min_score_override: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => moveStep(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveStep(idx, 1)}
                      disabled={idx === steps.length - 1}
                      className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button onClick={() => removeStep(idx)} className="p-1 text-red-300 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Event search */}
            <div className="relative">
              <input
                className="w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white"
                placeholder="+ Etkinlik adı yazarak ekle..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
              />
              {eventOptions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden">
                  {eventOptions.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => addStep(ev)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      {ev.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Enrollments ── */}
      {tab === "enrollments" && (
        <div className="space-y-4">
          {!enrollments ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Toplam Kayıt", value: enrollments.summary.total },
                  { label: "Tamamlayan", value: enrollments.summary.completed },
                  { label: "Tamamlama Oranı", value: `%${enrollments.summary.completion_rate}` },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-center">
                    <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
              {enrollments.summary.total === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Henüz kayıt yok.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
