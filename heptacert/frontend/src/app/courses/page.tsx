"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, Loader2, Lock, Star } from "lucide-react";
import { publicApiFetch, memberApiFetch, getPublicMemberToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type CourseCard = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  level: string;
  price: number | null;
  module_count: number;
  is_featured: boolean;
  is_enrolled: boolean;
};

const LEVEL_LABELS: Record<string, { tr: string; en: string }> = {
  beginner: { tr: "Başlangıç", en: "Beginner" },
  intermediate: { tr: "Orta", en: "Intermediate" },
  advanced: { tr: "İleri", en: "Advanced" },
};

export default function CoursesPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const token = getPublicMemberToken();

  const copy = isTr
    ? {
        pageTitle: "Kurs Kataloğu",
        pageSubtitle: "Sertifika kazandıran eğitim kursları",
        empty: "Henüz yayınlanan kurs yok.",
        free: "Ücretsiz",
        enrolled: "Kayıtlısınız",
        modules: (n: number) => `${n} modül`,
        enroll: "Kursa Başla",
        viewCourse: "Kursu Görüntüle",
        featured: "Öne Çıkan",
      }
    : {
        pageTitle: "Course Catalog",
        pageSubtitle: "Certification training courses",
        empty: "No published courses yet.",
        free: "Free",
        enrolled: "Enrolled",
        modules: (n: number) => `${n} modules`,
        enroll: "Start Course",
        viewCourse: "View Course",
        featured: "Featured",
      };

  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await publicApiFetch("/public/courses", { headers });
        const data = (await res.json()) as { courses: CourseCard[] };
        if (!cancelled) setCourses(data.courses ?? []);
      } catch {
        // keep empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{copy.pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{copy.pageSubtitle}</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>{copy.empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="group rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition overflow-hidden"
            >
              {/* Thumbnail */}
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="h-40 w-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-indigo-200" />
                </div>
              )}

              <div className="p-4 space-y-2">
                {course.is_featured && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <Star className="h-3 w-3" />
                    {copy.featured}
                  </div>
                )}

                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 line-clamp-2">
                  {course.title}
                </h3>

                {course.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{course.description}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {copy.modules(course.module_count)}
                  </span>
                  <span className="capitalize">
                    {LEVEL_LABELS[course.level]?.[isTr ? "tr" : "en"] ?? course.level}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-semibold text-indigo-700">
                    {course.price != null && course.price > 0
                      ? `₺${course.price}`
                      : copy.free}
                  </span>
                  {course.is_enrolled && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {copy.enrolled}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
