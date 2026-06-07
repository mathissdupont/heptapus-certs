"use client";

import { useEffect, useState } from "react";
import {
  Award, BookOpen, CheckCircle, Loader2, RefreshCw, TrendingUp, Users,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type Analytics = {
  total_courses: number;
  published_courses: number;
  total_enrollments: number;
  completed_enrollments: number;
  completion_rate_pct: number;
  certs_issued: number;
  total_badges_awarded: number;
  top_courses: Array<{
    course_id: number;
    title: string;
    enrollments: number;
    completed: number;
  }>;
};

function StatCard({
  label, value, sub, icon, color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-opacity-10 ${color.replace("text-", "bg-")} bg-opacity-10`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function LmsAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await apiFetch("/api/admin/lms/analytics").then((r) => r.json());
    setData(res);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) return null;

  const maxEnrollments = Math.max(...data.top_courses.map((c) => c.enrollments), 1);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            LMS Analitik
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Öğrenme platformu performans özeti
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Toplam Kurs"
          value={data.total_courses}
          sub={`${data.published_courses} yayında`}
          icon={<BookOpen className="w-5 h-5 text-blue-600" />}
          color="text-blue-600"
        />
        <StatCard
          label="Toplam Kayıt"
          value={data.total_enrollments}
          icon={<Users className="w-5 h-5 text-indigo-600" />}
          color="text-indigo-600"
        />
        <StatCard
          label="Tamamlama"
          value={`%${data.completion_rate_pct}`}
          sub={`${data.completed_enrollments} tamamlandı`}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          color="text-green-600"
        />
        <StatCard
          label="Rozet & Sertifika"
          value={data.certs_issued + data.total_badges_awarded}
          sub={`${data.certs_issued} sertifika · ${data.total_badges_awarded} rozet`}
          icon={<Award className="w-5 h-5 text-amber-500" />}
          color="text-amber-500"
        />
      </div>

      {/* Completion funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Tamamlama Hunisi</h2>
        <p className="text-sm text-gray-500 mb-6">
          {data.total_enrollments} kayıt → {data.completed_enrollments} tamamlama (%{data.completion_rate_pct})
        </p>
        <div className="flex items-end gap-4 h-32">
          {[
            { label: "Kayıtlı", value: data.total_enrollments, color: "bg-blue-200" },
            { label: "Tamamlayan", value: data.completed_enrollments, color: "bg-green-400" },
            { label: "Sertifika Alan", value: data.certs_issued, color: "bg-amber-400" },
          ].map((bar) => {
            const pct = data.total_enrollments > 0 ? (bar.value / data.total_enrollments) * 100 : 0;
            return (
              <div key={bar.label} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-gray-700">{bar.value}</span>
                <div className="w-full flex flex-col justify-end" style={{ height: "80px" }}>
                  <div
                    className={`w-full rounded-t-lg ${bar.color}`}
                    style={{ height: `${Math.max(pct, 4)}%`, minHeight: 4 }}
                  />
                </div>
                <span className="text-xs text-gray-500 text-center">{bar.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top courses */}
      {data.top_courses.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">En Aktif Kurslar</h2>
          <div className="space-y-4">
            {data.top_courses.map((course) => {
              const rate = course.enrollments > 0
                ? Math.round((course.completed / course.enrollments) * 100)
                : 0;
              const barWidth = (course.enrollments / maxEnrollments) * 100;
              return (
                <div key={course.course_id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[60%]">
                      {course.title}
                    </span>
                    <div className="text-xs text-gray-500 flex items-center gap-3">
                      <span>{course.enrollments} kayıt</span>
                      <span className="text-green-600 font-medium">%{rate} tamamlama</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
