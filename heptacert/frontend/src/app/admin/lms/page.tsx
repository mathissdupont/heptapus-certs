"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, ChevronRight, Globe, Loader2, Lock,
  Plus, Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type CourseOut = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  course_code: string | null;
  department: string | null;
  term: string | null;
  section: string | null;
  credits: number | null;
  capacity: number | null;
  enrollment_policy: string;
  starts_at: string | null;
  ends_at: string | null;
  level: string;
  language: string;
  is_published: boolean;
  is_featured: boolean;
  price: number | null;
  module_count: number;
  created_at: string;
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Başlangıç",
  intermediate: "Orta",
  advanced: "İleri",
};

export default function LmsCoursesPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const isTr = lang === "tr";

  const copy = isTr
    ? {
        pageTitle: "HeptaLMS — Kurslar",
        pageSubtitle: "Etkinliklerden bağımsız eğitim içerikleri oluşturun",
        newCourse: "Yeni Kurs",
        empty: "Henüz kurs yok.",
        emptyHint: "Üniversiteler, liseler ve kurumlar için bağımsız eğitim kursları oluşturun.",
        published: "Yayında",
        draft: "Taslak",
        featured: "Öne Çıkan",
        free: "Ücretsiz",
        modules: (n: number) => `${n} modül`,
        deleteConfirm: "Bu kursu ve tüm modüllerini silmek istediğinizden emin misiniz?",
        createTitle: "Yeni Kurs Başlığı",
        create: "Oluştur",
        cancel: "İptal",
      }
    : {
        pageTitle: "HeptaLMS — Courses",
        pageSubtitle: "Create training content independent of events",
        newCourse: "New Course",
        empty: "No courses yet.",
        emptyHint: "Create independent training courses for universities, schools, and organizations.",
        published: "Published",
        draft: "Draft",
        featured: "Featured",
        free: "Free",
        modules: (n: number) => `${n} modules`,
        deleteConfirm: "Are you sure you want to delete this course and all its modules?",
        createTitle: "New Course Title",
        create: "Create",
        cancel: "Cancel",
      };

  const [courses, setCourses] = useState<CourseOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newTerm, setNewTerm] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newCredits, setNewCredits] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch("/admin/lms/courses");
      const data = (await res.json()) as { courses: CourseOut[] };
      setCourses(data.courses ?? []);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch("/admin/lms/courses", {
        method: "POST",
        body: JSON.stringify({
          title: newTitle.trim(),
          course_code: newCode.trim() || null,
          department: newDepartment.trim() || null,
          term: newTerm.trim() || null,
          section: newSection.trim() || null,
          credits: newCredits ? Number(newCredits) : null,
          capacity: newCapacity ? Number(newCapacity) : null,
        }),
      });
      const created = (await res.json()) as CourseOut;
      router.push(`/admin/lms/${created.id}`);
    } catch {
      setCreating(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(copy.deleteConfirm)) return;
    await apiFetch(`/admin/lms/courses/${id}`, { method: "DELETE" });
    setCourses((c) => c.filter((x) => x.id !== id));
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{copy.pageTitle}</h1>
            <p className="text-sm text-gray-500">{copy.pageSubtitle}</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          {copy.newCourse}
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900">{copy.createTitle}</h2>
            <input
              autoFocus
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder={isTr ? "Kurs başlığı..." : "Course title..."}
            />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder={isTr ? "Ders kodu" : "Course code"}
              />
              <input
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder={isTr ? "Bolum" : "Department"}
              />
              <input
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder={isTr ? "Donem" : "Term"}
              />
              <input
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                placeholder={isTr ? "Sube" : "Section"}
              />
              <input
                type="number"
                min={0}
                step={0.5}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newCredits}
                onChange={(e) => setNewCredits(e.target.value)}
                placeholder={isTr ? "Kredi" : "Credits"}
              />
              <input
                type="number"
                min={1}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                placeholder={isTr ? "Kontenjan" : "Capacity"}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewTitle("");
                  setNewCode("");
                  setNewDepartment("");
                  setNewTerm("");
                  setNewSection("");
                  setNewCredits("");
                  setNewCapacity("");
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                {copy.cancel}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newTitle.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.create}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center">
          <BookOpen className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">{copy.empty}</p>
          <p className="mt-1 text-xs text-gray-400 max-w-sm">{copy.emptyHint}</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" />
            {copy.newCourse}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="group relative rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition overflow-hidden"
            >
              {/* Thumbnail or gradient */}
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="h-36 w-full object-cover"
                />
              ) : (
                <div className="h-36 w-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                  <BookOpen className="h-10 w-10 text-indigo-200" />
                </div>
              )}

              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{course.title}</h3>
                  <div className="flex shrink-0 gap-1">
                    {course.is_published
                      ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-10 font-bold text-green-700 flex items-center gap-1"><Globe className="h-2.5 w-2.5" />{copy.published}</span>
                      : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-10 font-bold text-gray-500 flex items-center gap-1"><Lock className="h-2.5 w-2.5" />{copy.draft}</span>
                    }
                  </div>
                </div>

                {(course.course_code || course.department || course.term || course.section) && (
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-gray-500">
                    {course.course_code && <span className="rounded-md bg-gray-100 px-2 py-0.5 font-semibold text-gray-700">{course.course_code}</span>}
                    {course.department && <span className="rounded-md bg-gray-50 px-2 py-0.5">{course.department}</span>}
                    {course.term && <span className="rounded-md bg-gray-50 px-2 py-0.5">{course.term}</span>}
                    {course.section && <span className="rounded-md bg-gray-50 px-2 py-0.5">{course.section}</span>}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{copy.modules(course.module_count)}</span>
                  <span className="capitalize">{LEVEL_LABELS[course.level] ?? course.level}</span>
                  {course.credits != null && <span>{course.credits} kredi</span>}
                  {course.capacity != null && <span>{course.capacity} kontenjan</span>}
                  {course.price != null && course.price > 0
                    ? <span>₺{course.price}</span>
                    : <span>{copy.free}</span>
                  }
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Link
                    href={`/admin/lms/${course.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Düzenle <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => handleDelete(course.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
