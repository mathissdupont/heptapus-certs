"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Clock,
  FileText, Loader2, Lock, Play, Star, Video,
} from "lucide-react";
import { publicApiFetch, memberApiFetch, getPublicMemberToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Module = {
  id: number;
  title: string;
  description: string | null;
  order: number;
  content_type: string;
  duration_minutes: number | null;
  is_required: boolean;
};

type Enrollment = {
  id: number;
  progress_pct: number;
  completed_at: string | null;
  completed_module_ids: number[];
};

type Course = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  level: string;
  price: number | null;
  module_count: number;
  is_featured: boolean;
  modules: Module[];
  enrollment: Enrollment | null;
};

const CONTENT_ICONS: Record<string, React.ElementType> = {
  video: Play,
  article: FileText,
  quiz: Star,
  file: FileText,
  assignment: FileText,
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const courseId = params.id as string;
  const token = getPublicMemberToken();

  const copy = isTr
    ? {
        notFound: "Kurs bulunamadı.",
        backToCourses: "Kurslara Dön",
        enroll: "Kursa Kayıt Ol",
        enrolled: "Kayıtlısınız",
        continueLabel: "Devam Et",
        completed: "Tamamlandı!",
        completedDesc: "Bu kursu başarıyla tamamladınız.",
        loginToEnroll: "Kayıt olmak için giriş yapın",
        free: "Ücretsiz",
        progress: "İlerleme",
        modules: "Modüller",
        optional: "İsteğe bağlı",
        enrolling: "Kayıt oluyor...",
        enrollFailed: "Kayıt başarısız.",
      }
    : {
        notFound: "Course not found.",
        backToCourses: "Back to Courses",
        enroll: "Enroll in Course",
        enrolled: "Enrolled",
        continueLabel: "Continue",
        completed: "Completed!",
        completedDesc: "You have successfully completed this course.",
        loginToEnroll: "Log in to enroll",
        free: "Free",
        progress: "Progress",
        modules: "Modules",
        optional: "Optional",
        enrolling: "Enrolling...",
        enrollFailed: "Enrollment failed.",
      };

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [completingModule, setCompletingModule] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function loadCourse() {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await publicApiFetch(`/public/courses/${courseId}`, { headers });
      const d = await res.json();
      setCourse(d);
    } catch {
      // not found
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadCourse(); }, [courseId, token]);

  async function handleEnroll() {
    if (!token) { router.push("/login"); return; }
    setEnrolling(true);
    try {
      await memberApiFetch(`/public/courses/${courseId}/enroll`, { method: "POST" });
      await loadCourse();
    } catch (e: any) {
      showToast(e?.message ?? copy.enrollFailed);
    } finally {
      setEnrolling(false);
    }
  }

  async function handleCompleteModule(moduleId: number) {
    if (!token || !course?.enrollment) return;
    setCompletingModule(moduleId);
    try {
      const res = await memberApiFetch(
        `/public/courses/${courseId}/modules/${moduleId}/complete`,
        { method: "POST" }
      );
      const d = await res.json();
      setCourse((prev) => {
        if (!prev || !prev.enrollment) return prev;
        const completedIds = new Set(prev.enrollment.completed_module_ids);
        completedIds.add(moduleId);
        return {
          ...prev,
          enrollment: {
            ...prev.enrollment,
            progress_pct: d.progress_pct,
            completed_at: d.completed ? new Date().toISOString() : null,
            completed_module_ids: Array.from(completedIds),
          },
        };
      });
    } catch {
      // ignore
    } finally {
      setCompletingModule(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-gray-400">
        <p>{copy.notFound}</p>
        <Link href="/courses" className="text-indigo-600 text-sm hover:underline">{copy.backToCourses}</Link>
      </div>
    );
  }

  const enr = course.enrollment;
  const isDone = enr?.completed_at != null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Back */}
      <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        {copy.backToCourses}
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="h-48 w-full object-cover" />
        ) : (
          <div className="h-48 w-full bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center">
            <BookOpen className="h-14 w-14 text-indigo-200" />
          </div>
        )}
        <div className="p-6 space-y-4">
          <h1 className="text-xl font-bold text-gray-900">{course.title}</h1>
          {course.description && <p className="text-sm text-gray-600">{course.description}</p>}

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="capitalize">{course.level}</span>
            <span>{course.module_count} modül</span>
            <span className="font-semibold text-indigo-700">
              {course.price ? `₺${course.price}` : copy.free}
            </span>
          </div>

          {/* Enrollment CTA */}
          {isDone ? (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-green-700">{copy.completed}</p>
              <p className="text-sm text-green-600 mt-1">{copy.completedDesc}</p>
            </div>
          ) : enr ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{copy.progress}</span>
                <span className="font-semibold text-indigo-700">{enr.progress_pct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${enr.progress_pct}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {enrolling ? copy.enrolling : (token ? copy.enroll : copy.loginToEnroll)}
            </button>
          )}
        </div>
      </div>

      {/* Quick nav links for enrolled members */}
      {enr && (
        <div className="grid grid-cols-3 gap-2">
          <Link
            href={`/courses/${courseId}/discussions`}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 bg-white p-3 text-center hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <span className="text-xl">💬</span>
            <span className="text-xs font-medium text-gray-700">Tartışmalar</span>
          </Link>
          <Link
            href={`/courses/${courseId}/grades`}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 bg-white p-3 text-center hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <span className="text-xl">📊</span>
            <span className="text-xs font-medium text-gray-700">Notlarım</span>
          </Link>
          <Link
            href={`/courses/${courseId}/calendar`}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 bg-white p-3 text-center hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <span className="text-xl">📅</span>
            <span className="text-xs font-medium text-gray-700">Takvim</span>
          </Link>
        </div>
      )}

      {/* Modules list */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">{copy.modules}</h2>
        {course.modules.map((module, idx) => {
          const Icon = CONTENT_ICONS[module.content_type] ?? BookOpen;
          const isCompleted = enr?.completed_module_ids.includes(module.id) ?? false;
          return (
            <div
              key={module.id}
              className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 ${isCompleted ? "border-green-100" : "border-gray-100"}`}
            >
              <div className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-lg ${isCompleted ? "bg-green-100" : "bg-gray-100"}`}>
                {isCompleted
                  ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                  : <Icon className="h-4 w-4 text-gray-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isCompleted ? "text-green-700 line-through decoration-green-300" : "text-gray-800"}`}>
                  {idx + 1}. {module.title}
                </p>
                {module.duration_minutes && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />{module.duration_minutes} dk
                  </p>
                )}
              </div>
              {!module.is_required && (
                <span className="shrink-0 text-xs text-amber-500">{copy.optional}</span>
              )}
              {enr && (
                <Link
                  href={`/courses/${courseId}/modules/${module.id}`}
                  className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
              {enr && !isCompleted && (
                <button
                  onClick={() => handleCompleteModule(module.id)}
                  disabled={completingModule === module.id}
                  className="shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                >
                  {completingModule === module.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : "Tamamla"
                  }
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
