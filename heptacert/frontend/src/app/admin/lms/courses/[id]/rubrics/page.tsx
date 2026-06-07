"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ChevronDown, ChevronUp, Loader2, Plus, Trash2, X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type Rating = { id?: number; description: string; points: number };
type Criterion = {
  id?: number;
  title: string;
  description: string;
  points: number;
  order: number;
  ratings: Rating[];
};
type Rubric = {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  criteria: Criterion[];
};

const DEFAULT_RATINGS: Rating[] = [
  { description: "Mükemmel", points: 10 },
  { description: "İyi", points: 7 },
  { description: "Orta", points: 4 },
  { description: "Yetersiz", points: 0 },
];

function emptyRubricForm() {
  return { title: "", description: "" };
}

function emptyCriterionForm(): Criterion {
  return {
    title: "",
    description: "",
    points: 10,
    order: 0,
    ratings: DEFAULT_RATINGS.map((r) => ({ ...r })),
  };
}

export default function RubricsPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRubric, setShowNewRubric] = useState(false);
  const [rubricForm, setRubricForm] = useState(emptyRubricForm());
  const [savingRubric, setSavingRubric] = useState(false);

  // Which rubric is expanded
  const [expanded, setExpanded] = useState<number | null>(null);
  // Adding criterion to a rubric
  const [addingCrit, setAddingCrit] = useState<number | null>(null);
  const [critForm, setCritForm] = useState<Criterion>(emptyCriterionForm());
  const [savingCrit, setSavingCrit] = useState(false);

  async function load() {
    setLoading(true);
    const data = await apiFetch(`/api/admin/lms/courses/${courseId}/rubrics`).then((r) => r.json());
    setRubrics(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [courseId]);

  async function createRubric() {
    if (!rubricForm.title.trim()) return;
    setSavingRubric(true);
    try {
      const res = await apiFetch(`/api/admin/lms/courses/${courseId}/rubrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: rubricForm.title, description: rubricForm.description || null }),
      });
      const newR = await res.json();
      setRubrics((prev) => [...prev, { ...newR, criteria: [] }]);
      setRubricForm(emptyRubricForm());
      setShowNewRubric(false);
      setExpanded(newR.id);
    } finally {
      setSavingRubric(false);
    }
  }

  async function deleteRubric(id: number) {
    if (!confirm("Bu değerlendirme ölçütünü silmek istediğinizden emin misiniz?")) return;
    await apiFetch(`/api/admin/lms/courses/${courseId}/rubrics/${id}`, { method: "DELETE" });
    setRubrics((prev) => prev.filter((r) => r.id !== id));
    if (expanded === id) setExpanded(null);
  }

  function startAddCrit(rubricId: number, currentCount: number) {
    setAddingCrit(rubricId);
    setCritForm({ ...emptyCriterionForm(), order: currentCount });
  }

  async function saveCriterion(rubricId: number) {
    if (!critForm.title.trim()) return;
    setSavingCrit(true);
    try {
      await apiFetch(`/api/admin/lms/courses/${courseId}/rubrics/${rubricId}/criteria`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: critForm.title,
          description: critForm.description || null,
          points: critForm.points,
          order: critForm.order,
          ratings: critForm.ratings,
        }),
      });
      setAddingCrit(null);
      setCritForm(emptyCriterionForm());
      load();
    } finally {
      setSavingCrit(false);
    }
  }

  async function deleteCriterion(rubricId: number, critId: number) {
    await apiFetch(`/api/admin/lms/courses/${courseId}/rubrics/${rubricId}/criteria/${critId}`, {
      method: "DELETE",
    });
    setRubrics((prev) =>
      prev.map((r) =>
        r.id === rubricId
          ? { ...r, criteria: r.criteria.filter((c) => c.id !== critId) }
          : r
      )
    );
  }

  function updateRating(rIdx: number, field: keyof Rating, value: string | number) {
    setCritForm((prev) => {
      const ratings = prev.ratings.map((r, i) =>
        i === rIdx ? { ...r, [field]: field === "points" ? Number(value) : value } : r
      );
      return { ...prev, ratings };
    });
  }

  function addRating() {
    setCritForm((prev) => ({
      ...prev,
      ratings: [...prev.ratings, { description: "", points: 0 }],
    }));
  }

  function removeRating(idx: number) {
    setCritForm((prev) => ({
      ...prev,
      ratings: prev.ratings.filter((_, i) => i !== idx),
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/lms/${courseId}`} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Değerlendirme Ölçütleri</h1>
            <p className="text-sm text-gray-500">Kurs #{courseId} — Rubric yönetimi</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewRubric(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Yeni Rubric
        </button>
      </div>

      {/* New rubric form */}
      {showNewRubric && (
        <div className="bg-white rounded-xl border border-indigo-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Yeni Değerlendirme Ölçütü</h2>
            <button onClick={() => setShowNewRubric(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Rubric başlığı (örn: Proje Değerlendirme)"
              value={rubricForm.title}
              onChange={(e) => setRubricForm((p) => ({ ...p, title: e.target.value }))}
            />
            <textarea
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              placeholder="Açıklama (opsiyonel)"
              value={rubricForm.description}
              onChange={(e) => setRubricForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowNewRubric(false)} className="text-sm text-gray-600 px-4 py-2">İptal</button>
            <button
              onClick={createRubric}
              disabled={savingRubric || !rubricForm.title.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingRubric ? "Oluşturuluyor..." : "Oluştur"}
            </button>
          </div>
        </div>
      )}

      {rubrics.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">Henüz değerlendirme ölçütü yok.</p>
          <p className="text-sm text-gray-400 mt-1">Ödev notlandırma için rubric oluşturun.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rubrics.map((rubric) => (
            <div key={rubric.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Rubric header */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{rubric.title}</h3>
                  {rubric.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{rubric.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {rubric.criteria.length} kriter
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <button
                    onClick={() => setExpanded(expanded === rubric.id ? null : rubric.id)}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                  >
                    {expanded === rubric.id
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />
                    }
                  </button>
                  <button
                    onClick={() => deleteRubric(rubric.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded criteria */}
              {expanded === rubric.id && (
                <div className="border-t border-gray-100">
                  {rubric.criteria.length === 0 ? (
                    <div className="px-5 py-4 text-center text-sm text-gray-400">
                      Henüz kriter yok. Aşağıdan ekleyin.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {rubric.criteria
                        .slice()
                        .sort((a, b) => a.order - b.order)
                        .map((crit) => (
                          <div key={crit.id} className="px-5 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-800">{crit.title}</span>
                                  <span className="text-xs text-indigo-600 font-semibold">{crit.points} puan</span>
                                </div>
                                {crit.description && (
                                  <p className="text-xs text-gray-500 mt-0.5">{crit.description}</p>
                                )}
                                {crit.ratings.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {crit.ratings.map((rt, ri) => (
                                      <span
                                        key={ri}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600"
                                      >
                                        {rt.description}
                                        <span className="font-semibold text-indigo-600">{rt.points}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => crit.id && deleteCriterion(rubric.id, crit.id)}
                                className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 flex-shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Add criterion form */}
                  {addingCrit === rubric.id ? (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50">
                      <h4 className="text-sm font-semibold text-gray-700">Kriter Ekle</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Başlık *</label>
                          <input
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Örn: İçerik kalitesi"
                            value={critForm.title}
                            onChange={(e) => setCritForm((p) => ({ ...p, title: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Toplam Puan</label>
                          <input
                            type="number"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                            value={critForm.points}
                            onChange={(e) => setCritForm((p) => ({ ...p, points: Number(e.target.value) }))}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Açıklama</label>
                        <input
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                          placeholder="Bu kriterin değerlendirme açıklaması..."
                          value={critForm.description}
                          onChange={(e) => setCritForm((p) => ({ ...p, description: e.target.value }))}
                        />
                      </div>

                      {/* Ratings */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium text-gray-600">Derecelendirme Seçenekleri</label>
                          <button
                            onClick={addRating}
                            className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Ekle
                          </button>
                        </div>
                        <div className="space-y-2">
                          {critForm.ratings.map((rt, ri) => (
                            <div key={ri} className="flex items-center gap-2">
                              <input
                                className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                                placeholder="Açıklama (Mükemmel, İyi...)"
                                value={rt.description}
                                onChange={(e) => updateRating(ri, "description", e.target.value)}
                              />
                              <input
                                type="number"
                                className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none"
                                value={rt.points}
                                onChange={(e) => updateRating(ri, "points", e.target.value)}
                              />
                              <button
                                onClick={() => removeRating(ri)}
                                className="text-gray-300 hover:text-red-500"
                                disabled={critForm.ratings.length <= 1}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => { setAddingCrit(null); setCritForm(emptyCriterionForm()); }}
                          className="text-sm text-gray-600 px-4 py-2"
                        >
                          İptal
                        </button>
                        <button
                          onClick={() => saveCriterion(rubric.id)}
                          disabled={savingCrit || !critForm.title.trim()}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {savingCrit ? "Kaydediliyor..." : "Kriteri Kaydet"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-5 py-3 border-t border-gray-100">
                      <button
                        onClick={() => startAddCrit(rubric.id, rubric.criteria.length)}
                        className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Kriter Ekle
                      </button>
                    </div>
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
