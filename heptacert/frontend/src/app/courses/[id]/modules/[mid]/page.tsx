"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Award, BookOpen, CheckCircle2,
  Download, ExternalLink, FileText, Loader2, Play,
} from "lucide-react";
import { memberApiFetch, publicApiFetch, getPublicMemberToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import ReactMarkdown from "react-markdown";

type ModuleDetail = {
  id: number;
  title: string;
  description: string | null;
  order: number;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  quiz_id: number | null;
  duration_minutes: number | null;
  is_required: boolean;
};

type QuizChoice = { id: number; choice_text: string; order: number; is_correct?: boolean };
type QuizQuestion = {
  id: number;
  question_text: string;
  question_type: string;
  points: number;
  order: number;
  choices: QuizChoice[];
  explanation?: string;
  your_selected_choice_ids?: number[] | null;
  your_text_answer?: string | null;
};
type QuizData = {
  id: number;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  attempts_allowed: number;
  passing_score: number;
  question_count: number;
  questions?: QuizQuestion[];
};
type AttemptResult = {
  attempt_id: number;
  score: number;
  passed: boolean;
  passing_score: number;
  submitted_at: string;
  questions: QuizQuestion[];
};

type CourseData = {
  id: number;
  title: string;
  modules: ModuleDetail[];
  enrollment: {
    id: number;
    progress_pct: number;
    completed_at: string | null;
    completed_module_ids: number[];
    cert_pdf_url?: string | null;
  } | null;
};

function VideoEmbed({ url }: { url: string }) {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

  if (ytMatch) {
    return (
      <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ paddingTop: "56.25%" }}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${ytMatch[1]}?rel=0`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (vimeoMatch) {
    return (
      <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ paddingTop: "56.25%" }}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  // Direct video file
  return (
    <div className="rounded-2xl overflow-hidden bg-black">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video src={url} controls className="w-full max-h-[480px]" />
    </div>
  );
}

export default function ModuleViewerPage() {
  const { id: courseId, mid: moduleId } = useParams<{ id: string; mid: string }>();
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const token = getPublicMemberToken();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  // Quiz state
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [quizAttemptId, setQuizAttemptId] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, { choice_ids?: number[]; text?: string }>>({});
  const [quizCurrentQ, setQuizCurrentQ] = useState(0);
  const [quizResult, setQuizResult] = useState<AttemptResult | null>(null);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizPhase, setQuizPhase] = useState<"info" | "taking" | "result">("info");

  async function loadCourse() {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await publicApiFetch(`/public/courses/${courseId}`, { headers });
      const d = (await res.json()) as CourseData;
      setCourse(d);
    } catch {
      // not found
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadCourse(); }, [courseId, token]);

  const currentModule = course?.modules.find((m) => String(m.id) === moduleId);

  useEffect(() => {
    if (currentModule?.content_type === "quiz" && currentModule.quiz_id) {
      loadQuiz(currentModule.quiz_id);
    }
  }, [currentModule?.id]);

  async function loadQuiz(quizId: number) {
    try {
      const r = await memberApiFetch(`/public/quizzes/${quizId}`);
      if (!r.ok) return;
      const d = await r.json();
      setQuizData(d);
    } catch {}
  }

  async function startQuiz(quizId: number) {
    setQuizError(null);
    setQuizSubmitting(true);
    try {
      const r = await memberApiFetch(`/public/quizzes/${quizId}/start`, { method: "POST" });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.detail || "Başlatma başarısız.");
      }
      const d = await r.json();
      setQuizAttemptId(d.attempt_id);
      setQuizAnswers({});
      setQuizCurrentQ(0);
      setQuizPhase("taking");
    } catch (e: any) {
      setQuizError(e?.message || "Sınav başlatılamadı.");
    } finally {
      setQuizSubmitting(false);
    }
  }

  async function submitQuiz() {
    if (!quizAttemptId || !quizData?.questions) return;
    setQuizSubmitting(true);
    setQuizError(null);
    try {
      const answers = quizData.questions.map((q) => {
        const ans = quizAnswers[q.id];
        return {
          question_id: q.id,
          selected_choice_ids: ans?.choice_ids ?? null,
          text_answer: ans?.text ?? null,
        };
      });
      const r = await memberApiFetch(`/public/quiz-attempts/${quizAttemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!r.ok) throw new Error("Gönderim başarısız.");
      const resultR = await memberApiFetch(`/public/quiz-attempts/${quizAttemptId}/result`);
      const result = await resultR.json();
      setQuizResult(result);
      setQuizPhase("result");
    } catch (e: any) {
      setQuizError(e?.message || "Sınav gönderilemedi.");
    } finally {
      setQuizSubmitting(false);
    }
  }

  const module = course?.modules.find((m) => String(m.id) === moduleId);
  const modules = course?.modules ?? [];
  const currentIdx = modules.findIndex((m) => String(m.id) === moduleId);
  const prevModule = currentIdx > 0 ? modules[currentIdx - 1] : null;
  const nextModule = currentIdx < modules.length - 1 ? modules[currentIdx + 1] : null;

  const enr = course?.enrollment;
  const isCompleted = enr?.completed_module_ids.includes(Number(moduleId)) ?? false;

  async function handleComplete() {
    if (!token || !enr || isCompleted) return;
    setCompleting(true);
    try {
      const res = await memberApiFetch(
        `/public/courses/${courseId}/modules/${moduleId}/complete`,
        { method: "POST" }
      );
      const d = await res.json();
      setCourse((prev) => {
        if (!prev || !prev.enrollment) return prev;
        const completedIds = new Set(prev.enrollment.completed_module_ids);
        completedIds.add(Number(moduleId));
        return {
          ...prev,
          enrollment: {
            ...prev.enrollment,
            progress_pct: d.progress_pct,
            completed_at: d.completed ? new Date().toISOString() : prev.enrollment.completed_at,
            completed_module_ids: Array.from(completedIds),
          },
        };
      });
      setJustCompleted(true);
    } catch {
      // ignore
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!course || !module) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-gray-400">
        <p className="text-sm">{isTr ? "Modül bulunamadı." : "Module not found."}</p>
        <Link href={`/courses/${courseId}`} className="text-sm text-indigo-600 hover:underline">
          {isTr ? "Kursa geri dön" : "Back to course"}
        </Link>
      </div>
    );
  }

  const courseCompleted = enr?.completed_at != null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/courses/${courseId}`} className="inline-flex items-center gap-1 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          {course.title}
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate">{module.title}</span>
      </div>

      {/* Module header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-indigo-600 bg-indigo-50 rounded-full px-2.5 py-0.5">
            {isTr ? {
              video: "Video",
              article: "Makale",
              quiz: "Sınav",
              file: "Dosya",
              assignment: "Ödev",
            }[module.content_type] ?? module.content_type
            : module.content_type.charAt(0).toUpperCase() + module.content_type.slice(1)}
          </span>
          {isCompleted && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 rounded-full px-2.5 py-0.5">
              <CheckCircle2 className="h-3 w-3" />
              {isTr ? "Tamamlandı" : "Completed"}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-gray-900">{module.title}</h1>
        {module.description && <p className="text-sm text-gray-500">{module.description}</p>}
      </div>

      {/* Content area */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {module.content_type === "video" && module.content_url ? (
          <div className="p-4">
            <VideoEmbed url={module.content_url} />
          </div>
        ) : module.content_type === "article" ? (
          <div className="p-6">
            {module.content_text ? (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                <ReactMarkdown>{module.content_text}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <FileText className="h-10 w-10 mb-3" />
                <p className="text-sm">{isTr ? "İçerik henüz eklenmemiş." : "No content yet."}</p>
              </div>
            )}
          </div>
        ) : module.content_type === "file" && module.content_url ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
              <Download className="h-7 w-7 text-gray-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">{module.title}</p>
              <p className="text-xs text-gray-400 mt-1">{isTr ? "Dosyayı indirmek için tıklayın" : "Click to download the file"}</p>
            </div>
            <a
              href={module.content_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Download className="h-4 w-4" />
              {isTr ? "İndir" : "Download"}
            </a>
          </div>
        ) : module.content_type === "quiz" ? (
          <div className="p-6">
            {!module.quiz_id ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <BookOpen className="h-10 w-10 mb-3" />
                <p className="text-sm">Sınav henüz hazırlanmadı.</p>
              </div>
            ) : quizPhase === "info" ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50">
                    <BookOpen className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{quizData?.title || module.title}</h3>
                    {quizData?.description && <p className="text-xs text-gray-500 mt-0.5">{quizData.description}</p>}
                  </div>
                </div>
                {quizData && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
                      <p className="text-xl font-bold text-gray-900">{quizData.question_count}</p>
                      <p className="text-xs text-gray-500">Soru</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
                      <p className="text-xl font-bold text-gray-900">
                        {quizData.time_limit_minutes ? `${quizData.time_limit_minutes} dk` : "∞"}
                      </p>
                      <p className="text-xs text-gray-500">Süre</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
                      <p className="text-xl font-bold text-gray-900">%{quizData.passing_score}</p>
                      <p className="text-xs text-gray-500">Geçme Puanı</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
                      <p className="text-xl font-bold text-gray-900">{quizData.attempts_allowed}</p>
                      <p className="text-xs text-gray-500">Deneme Hakkı</p>
                    </div>
                  </div>
                )}
                {quizError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{quizError}</p>}
                <button
                  onClick={() => startQuiz(module.quiz_id!)}
                  disabled={quizSubmitting || !quizData}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60 transition"
                >
                  {quizSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {quizSubmitting ? "Başlatılıyor…" : "Sınava Başla"}
                </button>
              </div>
            ) : quizPhase === "taking" && quizData?.questions ? (
              <div className="space-y-6">
                {/* Progress */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Soru {quizCurrentQ + 1} / {quizData.questions.length}</span>
                  <div className="h-1.5 w-32 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${((quizCurrentQ + 1) / quizData.questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Current question */}
                {(() => {
                  const q = quizData.questions[quizCurrentQ];
                  const ans = quizAnswers[q.id];
                  return (
                    <div className="space-y-4">
                      <p className="text-sm font-semibold text-gray-900 leading-relaxed">{q.question_text}</p>
                      {q.question_type === "short_answer" ? (
                        <textarea
                          value={ans?.text || ""}
                          onChange={(e) => setQuizAnswers((prev) => ({
                            ...prev,
                            [q.id]: { text: e.target.value },
                          }))}
                          rows={4}
                          placeholder="Cevabınızı yazın…"
                          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                        />
                      ) : (
                        <div className="space-y-2">
                          {q.choices.map((c) => {
                            const selected = ans?.choice_ids?.includes(c.id) ?? false;
                            return (
                              <button
                                key={c.id}
                                onClick={() => setQuizAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: { choice_ids: [c.id] },
                                }))}
                                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                                  selected
                                    ? "border-amber-400 bg-amber-50 font-medium text-amber-900"
                                    : "border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50/50"
                                }`}
                              >
                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                  selected ? "border-amber-500 bg-amber-500" : "border-gray-300"
                                }`}>
                                  {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                                </span>
                                {c.choice_text}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {quizError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{quizError}</p>}

                {/* Navigation */}
                <div className="flex gap-2">
                  {quizCurrentQ > 0 && (
                    <button
                      onClick={() => setQuizCurrentQ((q) => q - 1)}
                      className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                    >
                      Önceki
                    </button>
                  )}
                  {quizCurrentQ < quizData.questions.length - 1 ? (
                    <button
                      onClick={() => setQuizCurrentQ((q) => q + 1)}
                      className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition"
                    >
                      Sonraki
                    </button>
                  ) : (
                    <button
                      onClick={submitQuiz}
                      disabled={quizSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition"
                    >
                      {quizSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {quizSubmitting ? "Gönderiliyor…" : "Sınavı Bitir"}
                    </button>
                  )}
                </div>
              </div>
            ) : quizPhase === "result" && quizResult ? (
              <div className="space-y-6">
                {/* Score card */}
                <div className={`rounded-2xl p-6 text-center ${quizResult.passed ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                  <div className={`text-4xl font-bold mb-1 ${quizResult.passed ? "text-emerald-700" : "text-red-600"}`}>
                    %{quizResult.score.toFixed(0)}
                  </div>
                  <p className={`text-sm font-semibold ${quizResult.passed ? "text-emerald-700" : "text-red-600"}`}>
                    {quizResult.passed ? "Geçtiniz!" : "Kaldınız"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Geçme puanı: %{quizResult.passing_score}</p>
                </div>

                {/* Review */}
                <div className="space-y-4">
                  {quizResult.questions.map((q, qi) => {
                    const correct = q.choices?.find((c) => c.is_correct);
                    const userSelected = q.your_selected_choice_ids ?? [];
                    const isCorrect = correct && userSelected.includes(correct.id);
                    return (
                      <div key={q.id} className={`rounded-xl border p-4 ${isCorrect === false ? "border-red-200 bg-red-50" : isCorrect ? "border-emerald-200 bg-emerald-50" : "border-gray-200"}`}>
                        <p className="text-xs font-semibold text-gray-800 mb-2">{qi + 1}. {q.question_text}</p>
                        {q.question_type === "short_answer" ? (
                          <p className="text-xs text-gray-600">Cevabınız: {q.your_text_answer || "—"}</p>
                        ) : (
                          <div className="space-y-1">
                            {q.choices?.map((c) => {
                              const isSelected = userSelected.includes(c.id);
                              return (
                                <div
                                  key={c.id}
                                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
                                    c.is_correct ? "bg-emerald-100 text-emerald-800 font-medium" :
                                    isSelected ? "bg-red-100 text-red-700" : "text-gray-600"
                                  }`}
                                >
                                  <span>{isSelected ? "▶" : "○"}</span>
                                  {c.choice_text}
                                  {c.is_correct && <span className="ml-auto text-emerald-600">✓ Doğru</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {q.explanation && (
                          <p className="text-xs text-gray-500 mt-2 italic">{q.explanation}</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => { setQuizPhase("info"); setQuizResult(null); setQuizAttemptId(null); }}
                  className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Bilgi Ekranına Dön
                </button>
              </div>
            ) : (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        ) : module.content_type === "assignment" ? (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{isTr ? "Ödev" : "Assignment"}</p>
                {module.content_text && (
                  <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{module.content_text}</p>
                )}
              </div>
            </div>
            {module.content_url && (
              <a
                href={module.content_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                {isTr ? "Ödev Linkini Aç" : "Open Assignment Link"}
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Play className="h-10 w-10 mb-3" />
            <p className="text-sm">{isTr ? "İçerik mevcut değil." : "No content available."}</p>
          </div>
        )}
      </div>

      {/* Completion banner */}
      {justCompleted && courseCompleted && enr?.cert_pdf_url && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center space-y-3">
          <Award className="h-10 w-10 text-green-500 mx-auto" />
          <p className="font-semibold text-green-800">
            {isTr ? "Tebrikler! Kursu tamamladınız 🎉" : "Congratulations! You completed the course 🎉"}
          </p>
          <a
            href={enr.cert_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            {isTr ? "Sertifikamı İndir" : "Download My Certificate"}
          </a>
        </div>
      )}

      {/* Actions */}
      {enr && (
        <div className="flex items-center justify-between gap-4">
          {prevModule ? (
            <Link
              href={`/courses/${courseId}/modules/${prevModule.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {isTr ? "Önceki" : "Previous"}
            </Link>
          ) : <div />}

          <div className="flex items-center gap-2">
            {!isCompleted && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {completing
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <CheckCircle2 className="h-4 w-4" />
                }
                {completing ? (isTr ? "Kaydediliyor..." : "Saving...") : (isTr ? "Tamamladım" : "Mark Complete")}
              </button>
            )}
            {nextModule ? (
              <Link
                href={`/courses/${courseId}/modules/${nextModule.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
              >
                {isTr ? "Sonraki" : "Next"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href={`/courses/${courseId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                {isTr ? "Kursa Dön" : "Back to Course"}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Module list sidebar (progress) */}
      <details className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <summary className="cursor-pointer px-5 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 list-none flex items-center justify-between">
          <span>{isTr ? "Tüm Modüller" : "All Modules"}</span>
          <span className="text-xs font-normal text-gray-400">
            {enr ? `${enr.progress_pct}%` : ""}
          </span>
        </summary>
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {modules.map((m, idx) => {
            const done = enr?.completed_module_ids.includes(m.id) ?? false;
            const active = String(m.id) === moduleId;
            return (
              <Link
                key={m.id}
                href={enr ? `/courses/${courseId}/modules/${m.id}` : `#`}
                className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                  active ? "bg-indigo-50" : "hover:bg-gray-50"
                } ${!enr ? "pointer-events-none opacity-50" : ""}`}
              >
                <span className={`shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                  done ? "bg-green-100 text-green-700" : active ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {done ? "✓" : idx + 1}
                </span>
                <span className={`truncate ${done ? "text-gray-400 line-through" : active ? "text-indigo-700 font-medium" : "text-gray-700"}`}>
                  {m.title}
                </span>
              </Link>
            );
          })}
        </div>
      </details>
    </div>
  );
}
