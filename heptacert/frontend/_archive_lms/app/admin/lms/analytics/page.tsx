"use client";

import { useEffect, useState } from "react";
import {
  Award, BarChart3, BookOpen, CheckCircle, ChevronDown, Loader2,
  RefreshCw, Target, TrendingUp, Users,
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

type FunnelModule = {
  module_id: number;
  title: string;
  order: number;
  enrolled: number;
  started: number;
  completed: number;
  drop_off: number;
  completion_rate_pct: number;
  started_rate_pct: number;
};

type Funnel = {
  course_id: number;
  title: string;
  total_enrolled: number;
  funnel: FunnelModule[];
};

type Outcome = {
  id: number;
  title: string;
  mastery_points: number;
  total_attempts: number;
  mastered: number;
  mastery_rate_pct: number;
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
        <div className={`p-3 rounded-xl bg-opacity-10 ${color.replace("text-", "bg-")}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

type Tab = "overview" | "funnel" | "outcomes";

export default function LmsAnalyticsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Funnel tab state
  const [courses, setCourses] = useState<Array<{ id: number; title: string }>>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [funnelLoading, setFunnelLoading] = useState(false);

  // Outcomes tab state
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [outcomesLoading, setOutcomesLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await apiFetch("/admin/lms/analytics").then((r) => r.json());
    setData(res);
    setCourses(
      (res?.top_courses ?? []).map((c: any) => ({ id: c.course_id, title: c.title }))
    );
    setLoading(false);
  }

  async function loadFunnel(courseId: string) {
    if (!courseId) return;
    setFunnelLoading(true);
    const res = await apiFetch(`/admin/lms/courses/${courseId}/analytics/funnel`).then((r) => r.json());
    setFunnel(res);
    setFunnelLoading(false);
  }

  async function loadOutcomes() {
    setOutcomesLoading(true);
    const res = await apiFetch("/admin/lms/analytics/outcomes").then((r) => r.json());
    setOutcomes(Array.isArray(res?.outcomes) ? res.outcomes : []);
    setOutcomesLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (tab === "outcomes" && outcomes.length === 0) loadOutcomes();
  }, [tab]);

  const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
    { key: "overview", label: "Genel Bakış", icon: <TrendingUp className="w-4 h-4" /> },
    { key: "funnel", label: "Modül Hunisi", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "outcomes", label: "Kazanım Hakimiyeti", icon: <Target className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            LMS Analitik
          </h1>
          <p className="text-sm text-gray-500 mt-1">Öğrenme platformu performans özeti</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : !data ? null : (
            <>
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
                      const maxEnrollments = Math.max(...data.top_courses.map((c) => c.enrollments), 1);
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
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${barWidth}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Modül Hunisi ── */}
      {tab === "funnel" && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Kurs Seç</h2>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <select
                  className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                >
                  <option value="">— Kurs seçin —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.title}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <button
                onClick={() => loadFunnel(selectedCourseId)}
                disabled={!selectedCourseId || funnelLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {funnelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yükle"}
              </button>
            </div>
          </div>

          {funnelLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          )}

          {funnel && !funnelLoading && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{funnel.title}</h2>
                <p className="text-sm text-gray-500">{funnel.total_enrolled} toplam kayıtlı üye</p>
              </div>

              {funnel.funnel.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Bu kursta modül yok.</p>
              ) : (
                <div className="space-y-4">
                  {funnel.funnel.map((m) => (
                    <div key={m.module_id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-800 truncate max-w-[50%]">
                          {m.order + 1}. {m.title}
                        </span>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="text-blue-600">Başlayan: {m.started_rate_pct}%</span>
                          <span className="text-green-600">Tamamlayan: {m.completion_rate_pct}%</span>
                          {m.drop_off > 0 && (
                            <span className="text-red-500">Terk: {m.drop_off}</span>
                          )}
                        </div>
                      </div>
                      {/* Stacked bar: completed (green) | started-not-completed (yellow) | not-started (gray) */}
                      <div className="w-full h-5 bg-gray-100 rounded-lg overflow-hidden flex">
                        <div
                          className="h-full bg-green-400 flex items-center justify-center"
                          style={{ width: `${m.completion_rate_pct}%` }}
                          title={`Tamamlandı: ${m.completed}`}
                        >
                          {m.completion_rate_pct >= 10 && (
                            <span className="text-xs text-white font-medium">{m.completed}</span>
                          )}
                        </div>
                        <div
                          className="h-full bg-amber-300"
                          style={{ width: `${Math.max(m.started_rate_pct - m.completion_rate_pct, 0)}%` }}
                          title={`Devam ediyor: ${m.started - m.completed}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-5 text-xs text-gray-500 pt-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-green-400 inline-block" />
                  Tamamlandı
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-amber-300 inline-block" />
                  Devam ediyor
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-gray-100 inline-block" />
                  Başlamadı
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Kazanım Hakimiyeti ── */}
      {tab === "outcomes" && (
        <div className="space-y-5">
          {outcomesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : outcomes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <Target className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Henüz kazanım verisi yok.</p>
              <p className="text-gray-400 text-xs mt-1">
                Kazanımlar ve hakimiyet ölçümleri burada listelenir.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-900">
                Kazanım Hakimiyet Dağılımı
              </h2>
              <div className="space-y-4">
                {outcomes.map((o) => (
                  <div key={o.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-800 truncate max-w-[55%]">{o.title}</span>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{o.total_attempts} deneme</span>
                        <span className={`font-semibold ${o.mastery_rate_pct >= 70 ? "text-green-600" : o.mastery_rate_pct >= 40 ? "text-amber-500" : "text-red-500"}`}>
                          %{o.mastery_rate_pct} hakimiyet
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          o.mastery_rate_pct >= 70 ? "bg-green-400" : o.mastery_rate_pct >= 40 ? "bg-amber-400" : "bg-red-400"
                        }`}
                        style={{ width: `${o.mastery_rate_pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400">{o.mastered} / {o.total_attempts} kazanıma ulaştı · Hakimiyet eşiği: {o.mastery_points} puan</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
