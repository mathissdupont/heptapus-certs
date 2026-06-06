"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, Lock, Loader2, BookOpen, ChevronRight, Award, ArrowLeft,
} from "lucide-react";
import { apiFetch, getPublicMemberToken } from "@/lib/api";

type StepDetail = {
  step_id: number;
  event_id: number;
  event_name: string;
  event_date: string | null;
  order: number;
  required: boolean;
  unlocked: boolean;
  completed: boolean;
  has_certificate: boolean;
  has_quiz_pass: boolean;
};

type PathProgress = {
  path_id: number;
  path_name: string;
  enrolled: boolean;
  enrollment_id: number | null;
  progress_pct: number;
  completed_at: string | null;
  steps: StepDetail[];
};

export default function LearningPathProgressPage() {
  const params = useParams();
  const router = useRouter();
  const pathId = params.id as string;
  const token = getPublicMemberToken();

  const [data, setData] = useState<PathProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    const headers = { Authorization: `Bearer ${token}` };
    apiFetch(`/public/learning-paths/${pathId}/progress`, { headers })
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pathId, token]);

  async function handleEnroll() {
    if (!token) { router.push("/login"); return; }
    setEnrolling(true);
    try {
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      await apiFetch(`/public/learning-paths/${pathId}/enroll`, { method: "POST", headers });
      const _progressRes = await apiFetch(`/public/learning-paths/${pathId}/progress`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await _progressRes.json();
      setData(d);
      showToast("Kayıt olundu!");
    } catch (e: any) {
      showToast(e?.message ?? "Kayıt başarısız.");
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <Lock className="h-10 w-10 text-gray-300" />
        <div>
          <p className="font-medium text-gray-800">Bu sayfayı görmek için giriş yapın</p>
          <p className="text-sm text-gray-500 mt-1">Öğrenme yoluna kaydolmak ve ilerlemenizi takip etmek için üye girişi gereklidir.</p>
        </div>
        <Link href="/login" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
          Giriş Yap
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-400 text-sm">
        Öğrenme yolu bulunamadı.
      </div>
    );
  }

  const isDone = data.completed_at != null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm rounded-xl px-4 py-2.5 shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/learning-paths" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 truncate">{data.path_name}</h1>
            {isDone && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
          </div>
          {isDone && (
            <p className="text-xs text-green-600 mt-0.5 font-medium">
              Tamamlandı — {new Date(data.completed_at!).toLocaleDateString("tr-TR")}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {data.enrolled && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-2">
          <div className="flex justify-between text-sm font-medium text-gray-700">
            <span>Genel İlerleme</span>
            <span>%{data.progress_pct}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isDone ? "bg-green-500" : "bg-indigo-500"}`}
              style={{ width: `${data.progress_pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Enroll CTA */}
      {!data.enrolled && (
        <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50 p-6 text-center space-y-3">
          <BookOpen className="h-8 w-8 text-indigo-400 mx-auto" />
          <p className="text-sm font-medium text-indigo-800">Bu öğrenme yoluna kayıt olun</p>
          <p className="text-xs text-indigo-600">İlerlemenizi takip edin ve tamamladığınızda sertifikalarınızı kazanın.</p>
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {enrolling ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Kayıt Ol"}
          </button>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Adımlar</h2>
        {data.steps.map((step, idx) => {
          const locked = !step.unlocked;
          return (
            <div
              key={step.step_id}
              className={`rounded-2xl border p-5 transition ${
                step.completed
                  ? "border-green-100 bg-green-50"
                  : locked
                  ? "border-gray-100 bg-gray-50 opacity-60"
                  : "border-gray-100 bg-white shadow-sm"
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Step indicator */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step.completed
                      ? "bg-green-500 text-white"
                      : locked
                      ? "bg-gray-200 text-gray-400"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {step.completed ? <CheckCircle2 className="h-4 w-4" /> : locked ? <Lock className="h-3.5 w-3.5" /> : idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{step.event_name}</div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    {step.event_date && (
                      <span>{new Date(step.event_date).toLocaleDateString("tr-TR")}</span>
                    )}
                    {!step.required && (
                      <span className="text-amber-500">İsteğe bağlı</span>
                    )}
                    {step.has_certificate && (
                      <span className="flex items-center gap-1 text-green-600">
                        <Award className="h-3 w-3" /> Sertifika var
                      </span>
                    )}
                  </div>
                </div>

                {/* Action */}
                {!locked && !step.completed && (
                  <Link
                    href={`/events/${step.event_id}`}
                    className="flex-shrink-0 flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    Git <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isDone && (
        <div className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 border border-green-100 p-6 text-center space-y-2">
          <Award className="h-10 w-10 text-green-500 mx-auto" />
          <p className="font-bold text-green-800 text-lg">Tebrikler!</p>
          <p className="text-sm text-green-700">Bu öğrenme yolunu başarıyla tamamladınız.</p>
          <Link
            href="/profile"
            className="inline-block mt-2 rounded-xl bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Profilimi Görüntüle
          </Link>
        </div>
      )}
    </div>
  );
}
