"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronUp, Globe,
  Loader2, Lock, Plus, Route, Save, Trash2, X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Step = {
  id?: number;
  course_id: number;
  order: number;
  is_required: boolean;
  // enriched client-side
  course_title?: string;
};

type JourneyDetail = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  cert_template_url?: string | null;
  steps: Step[];
};

type CourseOption = {
  id: number;
  title: string;
  category: string | null;
  level: string;
  is_published: boolean;
};

export default function JourneyBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const [journey, setJourney] = useState<JourneyDetail | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // local editable state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [certUrl, setCertUrl] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [dirty, setDirty] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [jRes, cRes] = await Promise.all([
        apiFetch(`/admin/lms/journeys/${id}`),
        apiFetch("/admin/lms/courses"),
      ]);
      const j = (await jRes.json()) as JourneyDetail;
      const c = (await cRes.json()) as { courses: CourseOption[] };
      const courseMap = Object.fromEntries((c.courses ?? []).map((x) => [x.id, x.title]));

      setJourney(j);
      setTitle(j.title);
      setDescription(j.description ?? "");
      setIsPublished(j.is_published);
      setCertUrl(j.cert_template_url ?? "");
      setSteps(
        (j.steps ?? [])
          .sort((a, b) => a.order - b.order)
          .map((s) => ({ ...s, course_title: courseMap[s.course_id] }))
      );
      setCourses(c.courses ?? []);
    } catch {
      // keep
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadAll(); }, [id]);

  function markDirty() { setDirty(true); }

  function moveStep(index: number, direction: -1 | 1) {
    const next = [...steps];
    const swap = index + direction;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    next.forEach((s, i) => { s.order = i; });
    setSteps(next);
    markDirty();
  }

  function removeStep(index: number) {
    const next = steps.filter((_, i) => i !== index);
    next.forEach((s, i) => { s.order = i; });
    setSteps(next);
    markDirty();
  }

  function toggleRequired(index: number) {
    const next = [...steps];
    next[index] = { ...next[index], is_required: !next[index].is_required };
    setSteps(next);
    markDirty();
  }

  function addCourse(course: CourseOption) {
    if (steps.some((s) => s.course_id === course.id)) return;
    const next = [...steps, {
      course_id: course.id,
      order: steps.length,
      is_required: true,
      course_title: course.title,
    }];
    setSteps(next);
    setShowAddModal(false);
    setSearchQuery("");
    markDirty();
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch(`/admin/lms/journeys/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim() || undefined,
          description: description || null,
          is_published: isPublished,
          cert_template_url: certUrl || null,
          steps: steps.map((s) => ({
            course_id: s.course_id,
            order: s.order,
            is_required: s.is_required,
          })),
        }),
      });
      setDirty(false);
    } catch {
      // keep
    } finally {
      setSaving(false);
    }
  }

  const filteredCourses = courses.filter((c) =>
    !steps.some((s) => s.course_id === c.id) &&
    (searchQuery === "" || c.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-gray-500">{isTr ? "Öğrenme yolu bulunamadı." : "Journey not found."}</p>
        <Link href="/admin/lms/journeys" className="text-sm text-indigo-600 hover:underline">
          {isTr ? "Geri dön" : "Go back"}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin/lms/journeys" className="shrink-0 text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Route className="h-6 w-6 shrink-0 text-indigo-600" />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">{journey.title}</h1>
            <p className="text-xs text-gray-400">{isTr ? "Öğrenme Yolu Düzenleyici" : "Journey Builder"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setIsPublished((p) => !p); markDirty(); }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              isPublished
                ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            {isPublished ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {isPublished ? (isTr ? "Yayında" : "Published") : (isTr ? "Taslak" : "Draft")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition-opacity"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isTr ? "Kaydet" : "Save"}
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">{isTr ? "Temel Bilgiler" : "Basic Info"}</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">{isTr ? "Başlık" : "Title"}</label>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={title}
              onChange={(e) => { setTitle(e.target.value); markDirty(); }}
              placeholder={isTr ? "Öğrenme yolu başlığı..." : "Journey title..."}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">{isTr ? "Açıklama" : "Description"}</label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              value={description}
              onChange={(e) => { setDescription(e.target.value); markDirty(); }}
              placeholder={isTr ? "Bu öğrenme yolu hakkında kısa açıklama..." : "Short description about this journey..."}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              {isTr ? "Sertifika Şablon URL (tamamlayanlara)" : "Certificate Template URL (for completers)"}
            </label>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={certUrl}
              onChange={(e) => { setCertUrl(e.target.value); markDirty(); }}
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            {isTr ? "Kurslar" : "Courses"}
            <span className="ml-2 text-xs font-normal text-gray-400">({steps.length})</span>
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <Plus className="h-3.5 w-3.5" />
            {isTr ? "Kurs Ekle" : "Add Course"}
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 text-center">
            <BookOpen className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">
              {isTr ? "Henüz kurs eklenmedi." : "No courses added yet."}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-3 w-3" />
              {isTr ? "İlk Kursu Ekle" : "Add First Course"}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div
                key={`${step.course_id}-${idx}`}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {step.course_title ?? `Course #${step.course_id}`}
                  </p>
                  <button
                    onClick={() => toggleRequired(idx)}
                    className={`text-xs mt-0.5 ${step.is_required ? "text-orange-600" : "text-gray-400"}`}
                  >
                    {step.is_required
                      ? (isTr ? "Zorunlu — tıkla: opsiyonel yap" : "Required — click: make optional")
                      : (isTr ? "Opsiyonel — tıkla: zorunlu yap" : "Optional — click: make required")}
                  </button>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <button
                    onClick={() => moveStep(idx, -1)}
                    disabled={idx === 0}
                    className="rounded p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveStep(idx, 1)}
                    disabled={idx === steps.length - 1}
                    className="rounded p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeStep(idx)}
                    className="rounded p-1 text-gray-300 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add course modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col max-h-[70vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">
                {isTr ? "Kurs Seç" : "Select Course"}
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setSearchQuery(""); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-3 border-b border-gray-100">
              <input
                autoFocus
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder={isTr ? "Kurs ara..." : "Search courses..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-1">
              {filteredCourses.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">
                  {isTr ? "Eklenebilecek kurs yok." : "No courses available to add."}
                </p>
              ) : (
                filteredCourses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => addCourse(c)}
                    className="w-full flex items-start gap-3 rounded-xl px-4 py-3 text-left hover:bg-indigo-50 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                      <BookOpen className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {c.category ?? "—"} · {c.level}
                        {!c.is_published && <span className="ml-2 text-orange-500">{isTr ? "Taslak" : "Draft"}</span>}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
