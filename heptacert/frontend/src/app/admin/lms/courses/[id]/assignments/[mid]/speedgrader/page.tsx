"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight,
  ExternalLink, FileText, Loader2, MessageSquare, Star,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type Submission = {
  id: number;
  member_id: number;
  submitted_at: string;
  submission_text: string | null;
  submission_url: string | null;
  file_url: string | null;
  grade: number | null;
  feedback: string | null;
  graded_at: string | null;
};

export default function SpeedGraderPage() {
  const { id: courseId, mid: moduleId } = useParams<{ id: string; mid: string }>();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [grade, setGrade] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function loadSubmissions() {
    setLoading(true);
    const res = await apiFetch(
      `/admin/lms/courses/${courseId}/assignments/${moduleId}/submissions`
    ).then((r) => r.json());
    const subs: Submission[] = Array.isArray(res?.submissions) ? res.submissions : [];
    setSubmissions(subs);
    setLoading(false);
  }

  useEffect(() => { loadSubmissions(); }, [courseId, moduleId]);

  const current = submissions[currentIndex];

  useEffect(() => {
    if (current) {
      setGrade(current.grade != null ? String(current.grade) : "");
      setFeedback(current.feedback ?? "");
      setSaved(false);
    }
  }, [current?.id]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < submissions.length - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, submissions.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  async function saveGrade() {
    if (!current || grade === "") return;
    setSaving(true);
    await apiFetch(`/admin/lms/submissions/${current.id}/grade`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade: Number(grade), feedback: feedback || null }),
    });
    setSaving(false);
    setSaved(true);
    setSubmissions((prev) =>
      prev.map((s, i) =>
        i === currentIndex ? { ...s, grade: Number(grade), feedback: feedback || null } : s
      )
    );
    setTimeout(() => setSaved(false), 1500);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <FileText className="w-10 h-10 text-gray-300" />
        <p className="text-gray-500">Henüz gönderim yok.</p>
        <Link href={`/admin/lms/${courseId}`} className="text-sm text-blue-600 hover:underline">
          Kursa dön
        </Link>
      </div>
    );
  }

  const gradedCount = submissions.filter((s) => s.grade != null).length;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href={`/admin/lms/${courseId}`} className="p-1.5 rounded hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="font-semibold text-gray-900 text-sm">SpeedGrader</h1>
            <p className="text-xs text-gray-500">
              Kurs #{courseId} · Modül #{moduleId}
            </p>
          </div>
        </div>

        {/* Student nav */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {gradedCount}/{submissions.length} notlandırıldı
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
              title="← Önceki"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-gray-700 px-2">
              {currentIndex + 1} / {submissions.length}
            </span>
            <button
              onClick={goNext}
              disabled={currentIndex === submissions.length - 1}
              className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
              title="→ Sonraki"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Student list sidebar */}
        <div className="w-56 border-r border-gray-200 bg-white overflow-y-auto flex-shrink-0">
          {submissions.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentIndex(idx)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                idx === currentIndex ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium flex-shrink-0">
                #{s.member_id}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">Üye #{s.member_id}</p>
                <p className="text-xs text-gray-400">
                  {s.grade != null ? (
                    <span className={s.grade >= 50 ? "text-green-600" : "text-red-500"}>
                      {s.grade}/100
                    </span>
                  ) : (
                    <span className="text-gray-400">Bekliyor</span>
                  )}
                </p>
              </div>
              {s.grade != null && <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
            </button>
          ))}
        </div>

        {/* Submission content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Üye #{current.member_id}</h2>
              <span className="text-xs text-gray-400">
                {new Date(current.submitted_at).toLocaleString("tr-TR")}
              </span>
            </div>

            {current.submission_text && (
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
                {current.submission_text}
              </div>
            )}

            {current.submission_url && (
              <a
                href={current.submission_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline mt-3"
              >
                <ExternalLink className="w-4 h-4" />
                Gönderilen bağlantı
              </a>
            )}

            {current.file_url && (
              <a
                href={current.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline mt-3"
              >
                <FileText className="w-4 h-4" />
                Yüklenen dosya
              </a>
            )}

            {!current.submission_text && !current.submission_url && !current.file_url && (
              <p className="text-gray-400 text-sm italic">Gönderim içeriği yok.</p>
            )}
          </div>
        </div>

        {/* Grading panel */}
        <div className="w-72 border-l border-gray-200 bg-white flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Notlandırma</h3>
          </div>
          <div className="flex-1 p-4 space-y-4">
            {/* Grade input with star rating visual */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Not (0 – 100)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  value={grade}
                  onChange={(e) => { setGrade(e.target.value); setSaved(false); }}
                  placeholder="0 – 100"
                />
                {grade !== "" && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${Number(grade) >= 50 ? "text-green-600" : "text-red-500"}`}>
                    {Number(grade) >= 50 ? "✓" : "✗"}
                  </span>
                )}
              </div>
              {/* Visual grade bar */}
              {grade !== "" && (
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${Number(grade) >= 70 ? "bg-green-500" : Number(grade) >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${Math.min(100, Number(grade))}%` }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                Geri Bildirim
              </label>
              <textarea
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Öğrenciye geri bildirim..."
                value={feedback}
                onChange={(e) => { setFeedback(e.target.value); setSaved(false); }}
              />
            </div>

            {current.graded_at && (
              <p className="text-xs text-gray-400">
                Son notlandırma: {new Date(current.graded_at).toLocaleString("tr-TR")}
              </p>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 space-y-2">
            <button
              onClick={saveGrade}
              disabled={saving || grade === ""}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                saved
                  ? "bg-green-500 text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              } disabled:opacity-40`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <><Check className="w-4 h-4" /> Kaydedildi</>
              ) : (
                "Kaydet"
              )}
            </button>
            <p className="text-xs text-gray-400 text-center">
              ← → tuşları ile öğrenciler arasında geçiş yapın
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
