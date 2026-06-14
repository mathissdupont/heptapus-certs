"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Loader2,
  Plus, Save, Settings, Trash2, X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type Choice = {
  id?: number;
  choice_text: string;
  is_correct: boolean;
  order: number;
};

type Question = {
  id?: number;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "short_answer";
  points: number;
  order: number;
  explanation: string;
  choices: Choice[];
  collapsed: boolean;
};

type QuizSettings = {
  title: string;
  description: string;
  time_limit_minutes: string;
  attempts_allowed: string;
  passing_score: string;
  shuffle_questions: boolean;
  show_correct_answers: boolean;
};

const EMPTY_QUESTION = (order: number): Question => ({
  question_text: "",
  question_type: "multiple_choice",
  points: 1,
  order,
  explanation: "",
  choices: [
    { choice_text: "", is_correct: true, order: 0 },
    { choice_text: "", is_correct: false, order: 1 },
  ],
  collapsed: false,
});

export default function QuizBuilderPage() {
  const { id: courseId, qid } = useParams<{ id: string; qid: string }>();
  const isNew = qid === "new";

  const [settings, setSettings] = useState<QuizSettings>({
    title: "",
    description: "",
    time_limit_minutes: "",
    attempts_allowed: "1",
    passing_score: "60",
    shuffle_questions: false,
    show_correct_answers: true,
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizId, setQuizId] = useState<number | null>(isNew ? null : Number(qid));
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(isNew);

  useEffect(() => {
    if (isNew) return;
    apiFetch(`/api/admin/lms/quizzes/${qid}`)
      .then((r) => r.json())
      .then((d) => {
        setSettings({
          title: d.title || "",
          description: d.description || "",
          time_limit_minutes: d.time_limit_minutes != null ? String(d.time_limit_minutes) : "",
          attempts_allowed: String(d.attempts_allowed ?? 1),
          passing_score: String(d.passing_score ?? 60),
          shuffle_questions: d.shuffle_questions ?? false,
          show_correct_answers: d.show_correct_answers ?? true,
        });
        setQuestions(
          (d.questions || []).map((q: any) => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            points: q.points,
            order: q.order,
            explanation: q.explanation || "",
            choices: q.choices || [],
            collapsed: true,
          }))
        );
      })
      .catch(() => setError("Quiz yüklenemedi."))
      .finally(() => setLoading(false));
  }, [qid, isNew]);

  async function handleSaveQuiz() {
    if (!settings.title.trim()) { setError("Quiz başlığı gerekli."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: settings.title.trim(),
        description: settings.description.trim() || null,
        time_limit_minutes: settings.time_limit_minutes ? Number(settings.time_limit_minutes) : null,
        attempts_allowed: Number(settings.attempts_allowed) || 1,
        passing_score: Number(settings.passing_score) || 60,
        shuffle_questions: settings.shuffle_questions,
        show_correct_answers: settings.show_correct_answers,
      };
      if (!quizId) {
        const r = await apiFetch(`/api/admin/lms/courses/${courseId}/quizzes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error("Quiz oluşturulamadı.");
        const d = await r.json();
        setQuizId(d.id);
        window.history.replaceState(null, "", `/admin/lms/courses/${courseId}/quizzes/${d.id}`);
      } else {
        const r = await apiFetch(`/api/admin/lms/quizzes/${quizId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error("Güncelleme başarısız.");
      }
    } catch (e: any) {
      setError(e?.message || "Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveQuestion(idx: number) {
    if (!quizId) { setError("Önce quiz ayarlarını kaydedin."); return; }
    const q = questions[idx];
    if (!q.question_text.trim()) { setError("Soru metni gerekli."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        question_text: q.question_text,
        question_type: q.question_type,
        points: q.points,
        order: idx,
        explanation: q.explanation || null,
        choices: q.choices.map((c, i) => ({ choice_text: c.choice_text, is_correct: c.is_correct, order: i })),
      };
      let questionId = q.id;
      if (!questionId) {
        const r = await apiFetch(`/api/admin/lms/quizzes/${quizId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error("Soru eklenemedi.");
        const d = await r.json();
        questionId = d.id;
        setQuestions((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], id: d.id, choices: d.choices || q.choices, collapsed: true };
          return next;
        });
      } else {
        await apiFetch(`/api/admin/lms/questions/${questionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question_text: q.question_text,
            question_type: q.question_type,
            points: q.points,
            order: idx,
            explanation: q.explanation || null,
          }),
        });
        await apiFetch(`/api/admin/lms/questions/${questionId}/choices`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            q.choices.map((c, i) => ({ choice_text: c.choice_text, is_correct: c.is_correct, order: i }))
          ),
        });
        setQuestions((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], collapsed: true };
          return next;
        });
      }
    } catch (e: any) {
      setError(e?.message || "Soru kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuestion(idx: number) {
    const q = questions[idx];
    if (q.id) {
      await apiFetch(`/api/admin/lms/questions/${q.id}`, { method: "DELETE" });
    }
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, EMPTY_QUESTION(prev.length)]);
  }

  function updateQuestion(idx: number, patch: Partial<Question>) {
    setQuestions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function addChoice(qIdx: number) {
    setQuestions((prev) => {
      const next = [...prev];
      const q = next[qIdx];
      next[qIdx] = {
        ...q,
        choices: [...q.choices, { choice_text: "", is_correct: false, order: q.choices.length }],
      };
      return next;
    });
  }

  function updateChoice(qIdx: number, cIdx: number, patch: Partial<Choice>) {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIdx] };
      const newChoices = [...q.choices];
      newChoices[cIdx] = { ...newChoices[cIdx], ...patch };
      if (patch.is_correct && q.question_type !== "multiple_choice") {
        newChoices.forEach((c, i) => { if (i !== cIdx) newChoices[i] = { ...c, is_correct: false }; });
      }
      q.choices = newChoices;
      next[qIdx] = q;
      return next;
    });
  }

  function removeChoice(qIdx: number, cIdx: number) {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIdx] };
      q.choices = q.choices.filter((_, i) => i !== cIdx).map((c, i) => ({ ...c, order: i }));
      next[qIdx] = q;
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/admin/lms/${courseId}`} className="text-surface-500 hover:text-surface-900">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold text-surface-900">
          {isNew ? "Yeni Quiz" : settings.title || "Quiz Düzenle"}
        </h1>
        <span className="ml-auto flex gap-2">
          <button
            onClick={() => setShowSettings((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
              showSettings ? "bg-surface-900 text-white border-surface-900" : "border-surface-200 text-surface-600 hover:bg-surface-50"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            Ayarlar
          </button>
          <button
            onClick={handleSaveQuiz}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Kaydet
          </button>
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-surface-900 mb-1">Quiz Ayarları</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-surface-600 mb-1">Başlık *</label>
              <input
                type="text"
                value={settings.title}
                onChange={(e) => setSettings((s) => ({ ...s, title: e.target.value }))}
                className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-surface-600 mb-1">Açıklama</label>
              <textarea
                value={settings.description}
                onChange={(e) => setSettings((s) => ({ ...s, description: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Süre Limiti (dk)</label>
              <input
                type="number"
                min={1}
                value={settings.time_limit_minutes}
                onChange={(e) => setSettings((s) => ({ ...s, time_limit_minutes: e.target.value }))}
                placeholder="Sınırsız"
                className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Deneme Hakkı</label>
              <input
                type="number"
                min={1}
                max={10}
                value={settings.attempts_allowed}
                onChange={(e) => setSettings((s) => ({ ...s, attempts_allowed: e.target.value }))}
                className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Geçme Puanı (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.passing_score}
                onChange={(e) => setSettings((s) => ({ ...s, passing_score: e.target.value }))}
                className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs text-surface-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.shuffle_questions}
                  onChange={(e) => setSettings((s) => ({ ...s, shuffle_questions: e.target.checked }))}
                  className="rounded border-surface-300"
                />
                Soruları karıştır
              </label>
              <label className="flex items-center gap-2 text-xs text-surface-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.show_correct_answers}
                  onChange={(e) => setSettings((s) => ({ ...s, show_correct_answers: e.target.checked }))}
                  className="rounded border-surface-300"
                />
                Doğru cevapları göster
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div key={idx} className="rounded-xl border border-surface-200 bg-white shadow-sm overflow-hidden">
            {/* Question header */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-50"
              onClick={() => updateQuestion(idx, { collapsed: !q.collapsed })}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                {idx + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-surface-800 truncate">
                {q.question_text || "Yeni soru"}
              </span>
              <span className="text-xs text-surface-400">{q.points} puan</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteQuestion(idx); }}
                className="text-surface-400 hover:text-red-500 transition ml-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              {q.collapsed ? <ChevronDown className="h-4 w-4 text-surface-400" /> : <ChevronUp className="h-4 w-4 text-surface-400" />}
            </div>

            {/* Question body */}
            {!q.collapsed && (
              <div className="px-4 pb-4 pt-0 space-y-4 border-t border-surface-100">
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1 mt-3">Soru Metni *</label>
                  <textarea
                    rows={3}
                    value={q.question_text}
                    onChange={(e) => updateQuestion(idx, { question_text: e.target.value })}
                    className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                    placeholder="Soru metnini girin…"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Soru Tipi</label>
                    <select
                      value={q.question_type}
                      onChange={(e) => updateQuestion(idx, { question_type: e.target.value as Question["question_type"] })}
                      className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="multiple_choice">Çoktan Seçmeli</option>
                      <option value="true_false">Doğru / Yanlış</option>
                      <option value="short_answer">Kısa Cevap</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Puan</label>
                    <input
                      type="number"
                      min={1}
                      value={q.points}
                      onChange={(e) => updateQuestion(idx, { points: Number(e.target.value) || 1 })}
                      className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Choices */}
                {q.question_type !== "short_answer" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-surface-600">Şıklar</label>
                    {q.choices.map((c, ci) => (
                      <div key={ci} className="flex items-center gap-2">
                        <button
                          onClick={() => updateChoice(idx, ci, { is_correct: !c.is_correct })}
                          className={`shrink-0 flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
                            c.is_correct ? "border-emerald-500 bg-emerald-500" : "border-surface-300"
                          }`}
                          title="Doğru cevap olarak işaretle"
                        >
                          {c.is_correct && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </button>
                        <input
                          type="text"
                          value={c.choice_text}
                          onChange={(e) => updateChoice(idx, ci, { choice_text: e.target.value })}
                          placeholder={`Şık ${ci + 1}`}
                          className="flex-1 rounded-lg border border-surface-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {q.choices.length > 2 && (
                          <button onClick={() => removeChoice(idx, ci)} className="text-surface-400 hover:text-red-500">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {q.question_type === "multiple_choice" && (
                      <button
                        onClick={() => addChoice(idx)}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mt-1"
                      >
                        <Plus className="h-3 w-3" />
                        Şık Ekle
                      </button>
                    )}
                  </div>
                )}

                {q.question_type === "short_answer" && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                    <p className="text-xs text-amber-700">Kısa cevap soruları otomatik puanlanamaz. Öğretmen tarafından manuel değerlendirilir.</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Açıklama (isteğe bağlı)</label>
                  <input
                    type="text"
                    value={q.explanation}
                    onChange={(e) => updateQuestion(idx, { explanation: e.target.value })}
                    placeholder="Doğru cevabın açıklaması…"
                    className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => handleSaveQuestion(idx)}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition"
                  >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Soruyu Kaydet
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add question button */}
        <button
          onClick={addQuestion}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-surface-300 py-3 text-sm font-medium text-surface-500 hover:border-indigo-400 hover:text-indigo-600 transition"
        >
          <Plus className="h-4 w-4" />
          Soru Ekle
        </button>
      </div>

      {/* Link back to module assignment */}
      {quizId && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
          Quiz ID: <strong>{quizId}</strong> — Kurs modülünde bu quiz'i seçmek için modülün <strong>quiz_id</strong> alanına bu değeri girin.
        </div>
      )}
    </div>
  );
}
