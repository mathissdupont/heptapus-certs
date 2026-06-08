"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  PlayCircle,
  Search,
  Star,
} from "lucide-react";
import { memberApiFetch } from "@/lib/api";

type Enrollment = {
  id: number;
  status: string;
  progress_pct: number;
  completed_at: string | null;
  enrolled_at: string | null;
  final_grade: number | null;
  cert_pdf_url: string | null;
};

type Course = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  level: string;
  module_count: number;
  enrollment: Enrollment;
};

export default function PortalCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    memberApiFetch("/public/my-courses")
      .then((r) => r.json())
      .then((d) => setCourses(d.courses || []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const filtered = courses.filter((c) => {
    if (filter === "active" && c.enrollment.completed_at) return false;
    if (filter === "completed" && !c.enrollment.completed_at) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Kurslarım</h1>
        <p className="mt-1 text-sm text-slate-500">Kayıtlı olduğunuz tüm kurslar</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kurs ara..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {(["all", "active", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                filter === f ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f === "all" ? "Tümü" : f === "active" ? "Devam Eden" : "Tamamlanan"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">Sonuç bulunamadı.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  const enr = course.enrollment;
  const pct = enr.progress_pct;
  const done = !!enr.completed_at;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {course.thumbnail_url ? (
        <img src={course.thumbnail_url} alt={course.title} className="h-28 w-full object-cover" />
      ) : (
        <div className="h-28 w-full bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center">
          <BookOpen className="h-8 w-8 text-indigo-200" />
        </div>
      )}
      <div className="flex-1 p-4 space-y-3 flex flex-col">
        <div className="flex-1">
          {course.category && (
            <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 mb-1">
              {course.category}
            </span>
          )}
          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">{course.title}</h3>
          <p className="mt-1 text-xs text-slate-400">{course.module_count} modül · {course.level}</p>
        </div>

        {!done ? (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">İlerleme</span>
              <span className="font-semibold text-indigo-700">{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {enr.final_grade != null ? `${enr.final_grade}/100` : "Tamamlandı"}
          </div>
        )}

        <div className="flex gap-2">
          <Link
            href={`/courses/${course.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            {pct > 0 && !done ? "Devam Et" : done ? "İncele" : "Başla"}
          </Link>
          <Link
            href={`/courses/${course.id}/grades`}
            className="flex items-center justify-center rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-500 hover:bg-slate-50 transition"
            title="Notlarım"
          >
            <Star className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={`/courses/${course.id}/calendar`}
            className="flex items-center justify-center rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-500 hover:bg-slate-50 transition"
            title="Takvim"
          >
            <Clock className="h-3.5 w-3.5" />
          </Link>
        </div>

        {enr.cert_pdf_url && (
          <a
            href={enr.cert_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Sertifika
          </a>
        )}
      </div>
    </div>
  );
}
