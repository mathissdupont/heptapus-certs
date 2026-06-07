"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle2, XCircle, AlertCircle, Loader2, Clock, ChevronRight, Award,
} from "lucide-react";
import { publicApiFetch, getPublicMemberToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Choice = { id: number; choice_text: string; order: number };
type Question = {
  id: number;
  question_text: string;
  question_type: "mcq" | "true_false" | "open_text";
  order: number;
  points: number;
  choices: Choice[];
};
type QuizMeta = {
  id: number;
  event_id: number;
  title: string;
  description: string | null;
  passing_score: number;
  max_attempts: number;
  time_limit_minutes: number | null;
  required_for_cert: boolean;
  questions: Question[];
  my_last_attempt: {
    id: number; score: number; passed: boolean; attempt_number: number; completed_at: string | null;
  } | null;
  my_attempt_count: number;
};
type AnswerMap = Record<number, { selected_choice_id?: number; open_text_answer?: string }>;
type SubmitResult = {
  attempt_id: number;
  score: number;
  passed: boolean;
  passing_score: number;
  cert_will_be_issued: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PublicQuizPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const token = getPublicMemberToken();
  const { lang } = useI18n();

  const copy = lang === "tr"
    ? {
        noQuiz: "Bu etkinlik için aktif sınav bulunamadı.",
        back: "Geri dön",
        maxAttempts: "Maksimum deneme hakkı doldu",
        maxAttemptsDesc: "Daha fazla deneme hakkınız kalmadı.",
        questions: "Soru",
        passingScore: "Geçme puanı",
        timeLimit: "Süre",
        unlimited: "Sınırsız",
        remainingAttempts: "Kalan hak",
        lastAttempt: (score: number) => `Son denemede %${score} aldınız.`,
        passed: "Geçtiniz!",
        retryHint: "Tekrar deneyebilirsiniz.",
        certNote: "Sınavı geçmeniz halinde sertifikanız otomatik oluşturulacaktır.",
        startBtn: "Sınava Başla",
        nameLabel: "Adınız",
        namePlaceholder: "Ad Soyad",
        emailLabel: "E-posta (isteğe bağlı)",
        emailPlaceholder: "ornek@email.com",
        startAnon: "Başla",
        prev: "← Önceki",
        next: "Sonraki",
        submit: "Teslim Et",
        unanswered: (n: number) => `${n} soru cevaplanmamış. Yine de teslim et?`,
        submitFail: "Gönderim başarısız.",
        startFail: "Sınav başlatılamadı.",
        congrats: "Tebrikler!",
        completedDesc: "Sınavı başarıyla tamamladınız.",
        failTitle: "Geçemediniz",
        failDesc: (min: number) => `En az %${min} gerekiyor. Tekrar deneyebilirsiniz.`,
        certIssuing: "Sertifikanız oluşturuluyor! Kısa süre içinde profilinizde görünecek.",
        backToEvent: "Etkinliğe Dön",
        tryAgain: "Tekrar Dene",
        minutes: "dk",
      }
    : {
        noQuiz: "No active exam found for this event.",
        back: "Go back",
        maxAttempts: "Maximum attempts reached",
        maxAttemptsDesc: "You have no more attempts remaining.",
        questions: "Questions",
        passingScore: "Passing score",
        timeLimit: "Time limit",
        unlimited: "Unlimited",
        remainingAttempts: "Remaining",
        lastAttempt: (score: number) => `You scored ${score}% on your last attempt.`,
        passed: "You passed!",
        retryHint: "You may try again.",
        certNote: "If you pass, your certificate will be automatically generated.",
        startBtn: "Start Exam",
        nameLabel: "Your name",
        namePlaceholder: "Full Name",
        emailLabel: "Email (optional)",
        emailPlaceholder: "example@email.com",
        startAnon: "Start",
        prev: "← Previous",
        next: "Next",
        submit: "Submit",
        unanswered: (n: number) => `${n} question(s) unanswered. Submit anyway?`,
        submitFail: "Submission failed.",
        startFail: "Failed to start exam.",
        congrats: "Congratulations!",
        completedDesc: "You have successfully completed the exam.",
        failTitle: "Not passed",
        failDesc: (min: number) => `At least ${min}% is required. You may try again.`,
        certIssuing: "Your certificate is being generated and will appear in your profile shortly.",
        backToEvent: "Back to Event",
        tryAgain: "Try Again",
        minutes: "min",
      };

  const [phase, setPhase] = useState<"loading" | "intro" | "anon-form" | "taking" | "result" | "blocked" | "error">("loading");
  const [quiz, setQuiz] = useState<QuizMeta | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [anonName, setAnonName] = useState("");
  const [anonEmail, setAnonEmail] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load quiz ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const _quizRes = await publicApiFetch(`/public/events/${eventId}/quiz`, { headers });
        const data = await _quizRes.json();
        setQuiz(data);
        if (data.my_attempt_count >= data.max_attempts && !data.my_last_attempt?.passed) {
          setPhase("blocked");
        } else {
          setPhase("intro");
        }
      } catch {
        setPhase("error");
      }
    }
    void load();
  }, [eventId, token]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "taking" || !quiz?.time_limit_minutes) return;
    setTimeLeft(quiz.time_limit_minutes * 60);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 1) {
          clearInterval(timerRef.current!);
          void handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  // ── Start attempt ─────────────────────────────────────────────────────────
  async function handleStart(name: string, email: string | null) {
    if (!quiz) return;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const memberName = token
        ? (localStorage.getItem("heptacert_display_name") ?? "Katılımcı")
        : name;
      const memberEmail = token ? null : (email || null);

      const _startRes = await publicApiFetch(`/public/events/${eventId}/quiz/start`, {
        method: "POST",
        headers,
        body: JSON.stringify({ attendee_name: memberName, attendee_email: memberEmail }),
      });
      const res = await _startRes.json();
      setAttemptId(res.attempt_id);
      setAnswers({});
      setCurrentQ(0);
      setPhase("taking");
    } catch {
      alert(copy.startFail);
    }
  }

  function handleStartClick() {
    if (token) {
      void handleStart("", null);
    } else {
      setPhase("anon-form");
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(autoSubmit = false) {
    if (!quiz || !attemptId || submitting) return;
    if (!autoSubmit) {
      const unanswered = quiz.questions.filter(
        (q) => q.question_type !== "open_text" && !answers[q.id]?.selected_choice_id
      ).length;
      if (unanswered > 0 && !confirm(copy.unanswered(unanswered))) return;
    }
    setSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const payload = {
        attempt_id: attemptId,
        answers: quiz.questions.map((q) => ({
          question_id: q.id,
          selected_choice_id: answers[q.id]?.selected_choice_id ?? null,
          open_text_answer: answers[q.id]?.open_text_answer ?? null,
        })),
      };
      const _submitRes = await publicApiFetch(`/public/events/${eventId}/quiz/submit`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const res = await _submitRes.json();
      setResult(res);
      // Update quiz attempt count locally so result page shows correct remaining count
      setQuiz((q) => q ? { ...q, my_attempt_count: q.my_attempt_count + 1 } : q);
      setPhase("result");
    } catch {
      alert(copy.submitFail);
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  // ── Renders ───────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">{copy.noQuiz}</p>
          <button onClick={() => router.back()} className="mt-4 text-sm text-indigo-600 hover:underline">{copy.back}</button>
        </div>
      </div>
    );
  }

  if (phase === "blocked") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <XCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-800 font-semibold mb-1">{copy.maxAttempts}</p>
          <p className="text-sm text-gray-500">{copy.maxAttemptsDesc}</p>
          <button onClick={() => router.back()} className="mt-4 text-sm text-indigo-600 hover:underline">{copy.back}</button>
        </div>
      </div>
    );
  }

  if (phase === "anon-form" && quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-gray-50">
        <div className="bg-white rounded-3xl shadow-lg p-8 max-w-sm w-full space-y-5">
          <h2 className="text-xl font-bold text-gray-900 text-center">{quiz.title}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{copy.nameLabel}</label>
              <input
                type="text"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={copy.namePlaceholder}
                value={anonName}
                onChange={(e) => setAnonName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{copy.emailLabel}</label>
              <input
                type="email"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={copy.emailPlaceholder}
                value={anonEmail}
                onChange={(e) => setAnonEmail(e.target.value)}
              />
            </div>
          </div>
          <button
            disabled={!anonName.trim()}
            onClick={() => void handleStart(anonName.trim(), anonEmail.trim() || null)}
            className="w-full rounded-2xl bg-indigo-600 py-3 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-40"
          >
            {copy.startAnon}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "intro" && quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-gray-50">
        <div className="bg-white rounded-3xl shadow-lg p-8 max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="text-4xl">📝</div>
            <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
            {quiz.description && <p className="text-sm text-gray-500">{quiz.description}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
              <div className="font-semibold text-gray-900">{quiz.questions.length}</div>
              <div className="text-gray-500 text-xs mt-0.5">{copy.questions}</div>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
              <div className="font-semibold text-gray-900">%{quiz.passing_score}</div>
              <div className="text-gray-500 text-xs mt-0.5">{copy.passingScore}</div>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
              <div className="font-semibold text-gray-900">
                {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} ${copy.minutes}` : copy.unlimited}
              </div>
              <div className="text-gray-500 text-xs mt-0.5">{copy.timeLimit}</div>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
              <div className="font-semibold text-gray-900">
                {quiz.max_attempts - quiz.my_attempt_count}/{quiz.max_attempts}
              </div>
              <div className="text-gray-500 text-xs mt-0.5">{copy.remainingAttempts}</div>
            </div>
          </div>
          {quiz.my_last_attempt && (
            <div className={`rounded-xl px-4 py-3 text-sm text-center ${quiz.my_last_attempt.passed ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
              {copy.lastAttempt(quiz.my_last_attempt.score)}{" "}
              {quiz.my_last_attempt.passed ? `✅ ${copy.passed}` : copy.retryHint}
            </div>
          )}
          {quiz.required_for_cert && (
            <p className="text-xs text-center text-gray-400">{copy.certNote}</p>
          )}
          <button
            onClick={handleStartClick}
            className="w-full rounded-2xl bg-indigo-600 py-3 text-white font-semibold hover:bg-indigo-700 transition"
          >
            {copy.startBtn}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "taking" && quiz) {
    const q = quiz.questions[currentQ];
    const progress = ((currentQ + 1) / quiz.questions.length) * 100;
    const isLast = currentQ === quiz.questions.length - 1;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-4">
          <div className="flex-1">
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
            {currentQ + 1} / {quiz.questions.length}
          </span>
          {timeLeft !== null && (
            <div className={`flex items-center gap-1 text-sm font-mono font-medium ${timeLeft < 60 ? "text-red-600" : "text-gray-600"}`}>
              <Clock className="h-3.5 w-3.5" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {/* Question */}
        <div className="flex-1 flex items-start justify-center p-6">
          <div className="bg-white rounded-3xl shadow-sm p-8 max-w-xl w-full space-y-6">
            <div className="flex items-start gap-3">
              <span className="text-xs font-bold text-indigo-400 bg-indigo-50 rounded-lg px-2 py-1 flex-shrink-0">
                {currentQ + 1}
              </span>
              <p className="text-gray-900 font-medium leading-relaxed">{q.question_text}</p>
            </div>

            {/* MCQ / true_false */}
            {q.question_type !== "open_text" && (
              <div className="space-y-2">
                {q.choices.map((c) => {
                  const selected = answers[q.id]?.selected_choice_id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() =>
                        setAnswers((a) => ({ ...a, [q.id]: { selected_choice_id: c.id } }))
                      }
                      className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition ${
                        selected
                          ? "border-indigo-500 bg-indigo-50 text-indigo-800 font-medium"
                          : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                      }`}
                    >
                      {c.choice_text}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Open text */}
            {q.question_type === "open_text" && (
              <textarea
                rows={4}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={lang === "tr" ? "Cevabınızı buraya yazın..." : "Type your answer here..."}
                value={answers[q.id]?.open_text_answer ?? ""}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [q.id]: { open_text_answer: e.target.value } }))
                }
              />
            )}

            {/* Navigation */}
            <div className="flex gap-3">
              {currentQ > 0 && (
                <button
                  onClick={() => setCurrentQ((n) => n - 1)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  {copy.prev}
                </button>
              )}
              {!isLast ? (
                <button
                  onClick={() => setCurrentQ((n) => n + 1)}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 flex items-center justify-center gap-1"
                >
                  {copy.next} <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => handleSubmit()}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {copy.submit}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result" && result && quiz) {
    const passed = result.passed;
    const attemptsLeft = quiz.max_attempts - quiz.my_attempt_count;
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-gray-50">
        <div className="bg-white rounded-3xl shadow-lg p-10 max-w-sm w-full text-center space-y-5">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${passed ? "bg-green-100" : "bg-red-100"}`}>
            {passed ? (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            ) : (
              <XCircle className="h-8 w-8 text-red-500" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{passed ? copy.congrats : copy.failTitle}</h2>
            <p className="text-gray-500 text-sm mt-1">
              {passed ? copy.completedDesc : copy.failDesc(result.passing_score)}
            </p>
          </div>
          <div className={`text-5xl font-bold ${passed ? "text-green-600" : "text-red-500"}`}>
            %{result.score}
          </div>
          {passed && result.cert_will_be_issued && (
            <div className="rounded-xl bg-green-50 px-4 py-3 flex items-center gap-2 text-sm text-green-700">
              <Award className="h-4 w-4 flex-shrink-0" />
              {copy.certIssuing}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push(`/events/${eventId}`)}
              className="w-full rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              {copy.backToEvent}
            </button>
            {!passed && attemptsLeft > 0 && (
              <button
                onClick={() => { setPhase("intro"); setResult(null); }}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {copy.tryAgain}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
