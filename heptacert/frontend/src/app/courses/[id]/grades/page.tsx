"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Award, BookOpen, Loader2, TrendingUp } from "lucide-react";
import { memberApiFetch } from "@/lib/api";

type GradeItem = {
  id: number;
  title: string;
  item_type: string;
  max_points: number;
  weight_pct: number;
};

type GradeSummary = {
  weighted_avg: number | null;
  letter_grade: string | null;
  passed: boolean | null;
};

type ModuleProgressItem = {
  module_id: number;
  title: string;
  completed: boolean;
  quiz_score: number | null;
};

type MyGrades = {
  course_id: number;
  course_title: string;
  progress_pct: number;
  status: string;
  grade_items: GradeItem[];
  grade_summary: GradeSummary | null;
  modules: ModuleProgressItem[];
};

const LETTER_COLORS: Record<string, string> = {
  AA: "text-green-600",
  BA: "text-green-500",
  BB: "text-blue-600",
  CB: "text-blue-500",
  CC: "text-yellow-600",
  FF: "text-red-600",
};

export default function CourseGradesPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = id;
  const [data, setData] = useState<MyGrades | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await memberApiFetch(`/api/public/courses/${courseId}/my-grades`).then((r) => r.json());
      setData(res);
      setLoading(false);
    })();
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <p className="text-gray-500">Notlarınız yüklenemedi. Bu kursa kayıtlı olduğunuzdan emin olun.</p>
        <Link href={`/courses/${courseId}`} className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          Kursa dön
        </Link>
      </div>
    );
  }

  const summary = data.grade_summary;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/courses/${courseId}`} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Notlarım
          </h1>
          <p className="text-sm text-gray-500">{data.course_title}</p>
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Genel Durum</h2>
          {summary?.passed === true && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
              <Award className="w-4 h-4" />
              Geçti
            </span>
          )}
          {summary?.passed === false && (
            <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-sm font-medium">
              Kaldı
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-blue-600">%{data.progress_pct}</p>
            <p className="text-xs text-gray-500 mt-1">İlerleme</p>
          </div>
          <div>
            <p className={`text-3xl font-bold ${summary?.letter_grade ? (LETTER_COLORS[summary.letter_grade] ?? "text-gray-700") : "text-gray-300"}`}>
              {summary?.letter_grade ?? "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Harf Notu</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-700">
              {summary?.weighted_avg != null ? summary.weighted_avg.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Ortalama</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>İlerleme</span>
            <span>%{data.progress_pct}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all"
              style={{ width: `${data.progress_pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grade items */}
      {data.grade_items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Notlandırma Kalemleri</h2>
          <div className="space-y-2">
            {data.grade_items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm font-medium text-gray-800">{item.title}</span>
                  <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                    {item.item_type}
                  </span>
                </div>
                <span className="text-xs text-gray-500">%{item.weight_pct} · {item.max_points} puan</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Module progress */}
      {data.modules.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Modül İlerlemesi</h2>
          <div className="space-y-2">
            {data.modules.map((m) => (
              <div key={m.module_id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${m.completed ? "bg-green-500" : "bg-gray-300"}`} />
                  <span className="text-sm text-gray-700">{m.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  {m.quiz_score != null && (
                    <span className="text-xs text-blue-600 font-medium">%{m.quiz_score}</span>
                  )}
                  <span className={`text-xs ${m.completed ? "text-green-600" : "text-gray-400"}`}>
                    {m.completed ? "Tamamlandı" : "Devam ediyor"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
