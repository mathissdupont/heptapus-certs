"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  PlayCircle,
  Star,
  TrendingUp,
} from "lucide-react";
import { memberApiFetch, publicApiFetch } from "@/lib/api";

type OrgBranding = {
  org_id: number;
  org_name: string;
  brand_color: string;
  brand_logo: string | null;
  lms_portal_title: string;
  lms_support_email: string;
  lms_welcome_text: string;
};

type Enrollment = {
  id: number;
  status: string;
  progress_pct: number;
  completed_at: string | null;
  enrolled_at: string | null;
  completed_module_ids: number[];
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
  starts_at: string | null;
  ends_at: string | null;
  enrollment: Enrollment;
};

type Stats = {
  total: number;
  in_progress: number;
  completed: number;
};

export default function PortalDashboard() {
  const searchParams = useSearchParams();
  const orgParam = searchParams.get("org");

  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, in_progress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState<OrgBranding | null>(null);

  useEffect(() => {
    memberApiFetch("/public/my-courses")
      .then((r) => r.json())
      .then((d) => {
        setCourses(d.courses || []);
        setStats(d.stats || { total: 0, in_progress: 0, completed: 0 });
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!orgParam) return;
    publicApiFetch(`/public/orgs/${orgParam}/lms-branding`)
      .then((r) => (r as Response).json())
      .then((d: OrgBranding) => setBranding(d))
      .catch(() => null);
  }, [orgParam]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const activeCourses = courses.filter((c) => !c.enrollment.completed_at);
  const completedCourses = courses.filter((c) => c.enrollment.completed_at);

  const brandColor = branding?.brand_color || "#6366f1";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">

      {/* Welcome banner */}
      {branding && (
        <div
          className="rounded-2xl px-6 py-5 text-white flex items-center gap-4"
          style={{ backgroundColor: brandColor }}
        >
          {branding.brand_logo ? (
            <img src={branding.brand_logo} className="h-12 w-12 rounded-xl object-cover bg-white/20 shrink-0" alt="" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-base leading-tight">
              {branding.lms_portal_title || branding.org_name}
            </p>
            {branding.lms_welcome_text && (
              <p className="mt-0.5 text-sm opacity-90 line-clamp-2">{branding.lms_welcome_text}</p>
            )}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Toplam Kurs"
          value={stats.total}
          icon={BookOpen}
          color="indigo"
        />
        <StatCard
          label="Devam Eden"
          value={stats.in_progress}
          icon={TrendingUp}
          color="amber"
        />
        <StatCard
          label="Tamamlanan"
          value={stats.completed}
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* Active courses */}
      {activeCourses.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Devam Eden Kurslar</h2>
            <Link href="/portal/courses" className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              Tümü <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {courses.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-slate-300 mb-4" />
          <p className="text-sm font-semibold text-slate-600">Henüz bir kursa kayıtlı değilsiniz</p>
          <p className="mt-1 text-xs text-slate-400">Kurs kaydınız için kurumunuzla iletişime geçin.</p>
        </div>
      )}

      {/* Completed courses */}
      {completedCourses.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-4">Tamamlanan Kurslar</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {completedCourses.map((course) => (
              <CourseCard key={course.id} course={course} completed />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: "indigo" | "amber" | "emerald";
}) {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${colorMap[color]} mb-3`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function CourseCard({ course, completed = false }: { course: Course; completed?: boolean }) {
  const enr = course.enrollment;
  const pct = enr.progress_pct;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {course.thumbnail_url ? (
        <img src={course.thumbnail_url} alt={course.title} className="h-32 w-full object-cover" />
      ) : (
        <div className="h-32 w-full bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center">
          <BookOpen className="h-10 w-10 text-indigo-200" />
        </div>
      )}
      <div className="p-4 space-y-3">
        <div>
          {course.category && (
            <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 mb-1.5">
              {course.category}
            </span>
          )}
          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">{course.title}</h3>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {course.module_count} modül
          </span>
          <span className="capitalize">{course.level}</span>
        </div>

        {!completed ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">İlerleme</span>
              <span className="font-semibold text-indigo-700">{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {enr.final_grade != null ? `Tamamlandı · ${enr.final_grade}/100` : "Tamamlandı"}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Link
            href={`/courses/${course.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            {pct > 0 ? "Devam Et" : "Başla"}
          </Link>
          <Link
            href={`/courses/${course.id}/grades`}
            className="flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            title="Notlarım"
          >
            <Star className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={`/courses/${course.id}/calendar`}
            className="flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
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
            Sertifikayı İndir
          </a>
        )}
      </div>
    </div>
  );
}
