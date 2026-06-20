"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  GripVertical,
  FileQuestion,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type ChoiceForm = { id?: number; choice_text: string; is_correct: boolean; order: number };
type QuestionForm = {
  id?: number;
  question_text: string;
  question_type: "mcq" | "true_false" | "open_text";
  order: number;
  points: number;
  choices: ChoiceForm[];
  collapsed: boolean;
};
type QuizForm = {
  title: string;
  description: string;
  passing_score: number;
  max_attempts: number;
  time_limit_minutes: string;
  required_for_cert: boolean;
  is_active: boolean;
  questions: QuestionForm[];
};
type AttemptRow = {
  id: number;
  attendee_name: string;
  attendee_email: string | null;
  score: number;
  passed: boolean;
  attempt_number: number;
  cert_issued: boolean;
  completed_at: string | null;
};
type ResultsSummary = { total: number; passed: number; pass_rate: number };

function getCopy(isTr: boolean) {
  return isTr
    ? {
        defaultTitle: "Sınav",
        loadFailed: "Sınav yüklenemedi.",
        saved: "Sınav kaydedildi.",
        saveFailed: "Kayıt başarısız.",
        deleteConfirm: "Sınavı ve tüm sonuçları silmek istediğinizden emin misiniz?",
        deleted: "Sınav silindi.",
        deleteFailed: "Silme başarısız.",
        certCreating: "Sertifika oluşturuluyor.",
        certFailed: "Sertifika verilemedi.",
        trueText: "Doğru",
        falseText: "Yanlış",
        title: "Sınav yönetimi",
        subtitle: "Sertifika için sınav oluşturun ve sonuçları takip edin.",
        save: "Kaydet",
        saving: "Kaydediliyor...",
        builder: "Sınav oluştur",
        results: "Sonuçlar",
        settings: "Sınav ayarları",
        quizTitle: "Başlık",
        passingScore: "Geçme puanı (%)",
        maxAttempts: "Maks. deneme",
        timeLimit: "Süre limiti (dk, boş = sınırsız)",
        unlimited: "Sınırsız",
        description: "Açıklama",
        requiredForCert: "Sertifika için sınav zorunlu",
        active: "Sınav aktif",
        questionPlaceholder: "Soru giriniz...",
        mcq: "Çoktan seçmeli",
        trueFalse: "Doğru / Yanlış",
        trueFalseShort: "D/Y",
        openText: "Açık uçlu",
        pointsShort: "p",
        questionText: "Soru metni",
        type: "Tip",
        points: "Puan",
        choices: "Seçenekler",
        choicePlaceholder: (n: number) => `Seçenek ${n}`,
        addChoice: "Seçenek ekle",
        openTextHint: "Açık uçlu sorular manuel değerlendirme gerektirir.",
        addQuestion: "Soru ekle",
        noAttempts: "Henüz sınav girişimi bulunmuyor.",
        totalAttempts: "Toplam deneme",
        passed: "Geçen",
        passRate: "Geçme oranı",
        attendee: "Katılımcı",
        score: "Puan",
        status: "Durum",
        attempt: "Deneme",
        certificate: "Sertifika",
        date: "Tarih",
        failed: "Kaldı",
        attemptSuffix: "deneme",
        certIssued: "Verildi",
        issueCert: "Sertifika ver",
        inProgress: "Devam ediyor",
      }
    : {
        defaultTitle: "Quiz",
        loadFailed: "Could not load quiz.",
        saved: "Quiz saved.",
        saveFailed: "Save failed.",
        deleteConfirm: "Are you sure you want to delete the quiz and all results?",
        deleted: "Quiz deleted.",
        deleteFailed: "Delete failed.",
        certCreating: "Certificate is being created.",
        certFailed: "Could not issue certificate.",
        trueText: "True",
        falseText: "False",
        title: "Quiz management",
        subtitle: "Create a certificate quiz and track results.",
        save: "Save",
        saving: "Saving...",
        builder: "Build quiz",
        results: "Results",
        settings: "Quiz settings",
        quizTitle: "Title",
        passingScore: "Passing score (%)",
        maxAttempts: "Max attempts",
        timeLimit: "Time limit (min, blank = unlimited)",
        unlimited: "Unlimited",
        description: "Description",
        requiredForCert: "Quiz is required for certificate",
        active: "Quiz is active",
        questionPlaceholder: "Enter a question...",
        mcq: "Multiple choice",
        trueFalse: "True / False",
        trueFalseShort: "T/F",
        openText: "Open text",
        pointsShort: "pts",
        questionText: "Question text",
        type: "Type",
        points: "Points",
        choices: "Choices",
        choicePlaceholder: (n: number) => `Choice ${n}`,
        addChoice: "Add choice",
        openTextHint: "Open-ended questions require manual review.",
        addQuestion: "Add question",
        noAttempts: "No quiz attempts yet.",
        totalAttempts: "Total attempts",
        passed: "Passed",
        passRate: "Pass rate",
        attendee: "Attendee",
        score: "Score",
        status: "Status",
        attempt: "Attempt",
        certificate: "Certificate",
        date: "Date",
        failed: "Failed",
        attemptSuffix: "attempt",
        certIssued: "Issued",
        issueCert: "Issue certificate",
        inProgress: "In progress",
      };
}

function emptyQuestion(order: number): QuestionForm {
  return {
    question_text: "",
    question_type: "mcq",
    order,
    points: 1,
    choices: [
      { choice_text: "", is_correct: false, order: 0 },
      { choice_text: "", is_correct: false, order: 1 },
    ],
    collapsed: false,
  };
}

export default function QuizBuilderPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const copy = getCopy(isTr);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasQuiz, setHasQuiz] = useState(false);
  const [tab, setTab] = useState<"builder" | "results">("builder");
  const [form, setForm] = useState<QuizForm>({
    title: copy.defaultTitle,
    description: "",
    passing_score: 70,
    max_attempts: 3,
    time_limit_minutes: "",
    required_for_cert: true,
    is_active: true,
    questions: [],
  });
  const [results, setResults] = useState<{ attempts: AttemptRow[]; summary: ResultsSummary } | null>(null);
  const [issuingCert, setIssuingCert] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    async function load() {
      try {
        const response = await apiFetch(`/admin/events/${eventId}/quiz`);
        const data = await response.json();
        setHasQuiz(true);
        setForm({
          title: data.title,
          description: data.description ?? "",
          passing_score: data.passing_score,
          max_attempts: data.max_attempts,
          time_limit_minutes: data.time_limit_minutes ? String(data.time_limit_minutes) : "",
          required_for_cert: data.required_for_cert,
          is_active: data.is_active,
          questions: (data.questions ?? []).map((q: any) => ({
            id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            order: q.order,
            points: q.points,
            choices: q.choices ?? [],
            collapsed: true,
          })),
        });
      } catch (e: any) {
        if (e?.status !== 404) showToast("error", copy.loadFailed);
        setHasQuiz(false);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [eventId]);

  useEffect(() => {
    if (tab !== "results") return;
    apiFetch(`/admin/events/${eventId}/quiz/results`)
      .then((r) => r.json())
      .then((d) => setResults(d))
      .catch(() => {});
  }, [tab, eventId]);

  async function handleSave() {
    setSaving(true);
    try {
      const body = {
        title: form.title.trim() || copy.defaultTitle,
        description: form.description || null,
        passing_score: form.passing_score >= 1 ? form.passing_score : 70,
        max_attempts: form.max_attempts >= 1 ? form.max_attempts : 3,
        time_limit_minutes: form.time_limit_minutes ? Number(form.time_limit_minutes) : null,
        required_for_cert: form.required_for_cert,
        is_active: form.is_active,
        questions: form.questions
          .filter((q) => q.question_text.trim())
          .map((q, qi) => ({
            question_text: q.question_text.trim(),
            question_type: q.question_type,
            order: qi,
            points: q.points,
            choices: q.choices
              .filter((c) => c.choice_text.trim())
              .map((c, ci) => ({
                choice_text: c.choice_text.trim(),
                is_correct: c.is_correct,
                order: ci,
              })),
          })),
      };
      await apiFetch(`/admin/events/${eventId}/quiz`, { method: "POST", body: JSON.stringify(body) });
      setHasQuiz(true);
      showToast("success", copy.saved);
    } catch (err: any) {
      showToast("error", err?.message ? `${copy.saveFailed}: ${err.message}` : copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(copy.deleteConfirm)) return;
    try {
      await apiFetch(`/admin/events/${eventId}/quiz`, { method: "DELETE" });
      setHasQuiz(false);
      setForm({ ...form, questions: [] });
      showToast("success", copy.deleted);
    } catch {
      showToast("error", copy.deleteFailed);
    }
  }

  async function handleIssueCert(attemptId: number) {
    setIssuingCert(attemptId);
    try {
      await apiFetch(`/admin/events/${eventId}/quiz/attempts/${attemptId}/issue-cert`, { method: "POST" });
      showToast("success", copy.certCreating);
      const response = await apiFetch(`/admin/events/${eventId}/quiz/results`);
      setResults(await response.json());
    } catch {
      showToast("error", copy.certFailed);
    } finally {
      setIssuingCert(null);
    }
  }

  function addQuestion() {
    setForm((f) => ({ ...f, questions: [...f.questions, emptyQuestion(f.questions.length)] }));
  }

  function removeQuestion(idx: number) {
    setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));
  }

  function updateQuestion(idx: number, patch: Partial<QuestionForm>) {
    setForm((f) => {
      const questions = [...f.questions];
      questions[idx] = { ...questions[idx], ...patch };
      if (patch.question_type === "true_false") {
        questions[idx].choices = [
          { choice_text: copy.trueText, is_correct: true, order: 0 },
          { choice_text: copy.falseText, is_correct: false, order: 1 },
        ];
      }
      return { ...f, questions };
    });
  }

  function addChoice(qIdx: number) {
    setForm((f) => {
      const questions = [...f.questions];
      questions[qIdx].choices = [
        ...questions[qIdx].choices,
        { choice_text: "", is_correct: false, order: questions[qIdx].choices.length },
      ];
      return { ...f, questions };
    });
  }

  function updateChoice(qIdx: number, cIdx: number, patch: Partial<ChoiceForm>) {
    setForm((f) => {
      const questions = [...f.questions];
      const choices = [...questions[qIdx].choices];
      choices[cIdx] = { ...choices[cIdx], ...patch };
      questions[qIdx] = { ...questions[qIdx], choices };
      return { ...f, questions };
    });
  }

  function removeChoice(qIdx: number, cIdx: number) {
    setForm((f) => {
      const questions = [...f.questions];
      questions[qIdx].choices = questions[qIdx].choices.filter((_, i) => i !== cIdx);
      return { ...f, questions };
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
      </div>
    );
  }

  return (
    <div className="page-content">
      {toast && (
        <div className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-50 p-2 text-brand-700">
            <FileQuestion className="h-5 w-5" />
          </div>
          <div>
            <h1 className="page-title">{copy.title}</h1>
            <p className="page-subtitle">{copy.subtitle}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasQuiz && (
            <button type="button" onClick={handleDelete} className="btn-danger px-3" title={copy.deleteConfirm}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? copy.saving : copy.save}
          </button>
        </div>
      </div>

      <div className="tab-group w-fit">
        {(["builder", "results"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={tab === item ? "tab-btn-active" : "tab-btn"}>
            {item === "builder" ? copy.builder : copy.results}
          </button>
        ))}
      </div>

      {tab === "builder" && (
        <div className="space-y-6">
          <div className="card space-y-4 p-6">
            <h2 className="card-title">{copy.settings}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">{copy.quizTitle}</span>
                <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </label>
              <label className="block">
                <span className="label">{copy.passingScore}</span>
                <input type="number" min={1} max={100} className="input" value={form.passing_score} onChange={(e) => setForm((f) => ({ ...f, passing_score: Number(e.target.value) }))} />
              </label>
              <label className="block">
                <span className="label">{copy.maxAttempts}</span>
                <input type="number" min={1} max={10} className="input" value={form.max_attempts} onChange={(e) => setForm((f) => ({ ...f, max_attempts: Number(e.target.value) }))} />
              </label>
              <label className="block">
                <span className="label">{copy.timeLimit}</span>
                <input type="number" min={1} className="input" value={form.time_limit_minutes} onChange={(e) => setForm((f) => ({ ...f, time_limit_minutes: e.target.value }))} placeholder={copy.unlimited} />
              </label>
            </div>
            <label className="block">
              <span className="label">{copy.description}</span>
              <textarea rows={2} className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </label>
            <div className="flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-surface-700">
                <input type="checkbox" className="rounded" checked={form.required_for_cert} onChange={(e) => setForm((f) => ({ ...f, required_for_cert: e.target.checked }))} />
                {copy.requiredForCert}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-surface-700">
                <input type="checkbox" className="rounded" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                {copy.active}
              </label>
            </div>
          </div>

          <div className="space-y-3">
            {form.questions.map((question, questionIndex) => (
              <div key={questionIndex} className="card overflow-hidden">
                <div className="flex cursor-pointer items-center gap-3 px-5 py-4 hover:bg-surface-50" onClick={() => updateQuestion(questionIndex, { collapsed: !question.collapsed })}>
                  <GripVertical className="h-4 w-4 shrink-0 text-surface-300" />
                  <span className="w-5 text-xs font-medium text-surface-400">{questionIndex + 1}.</span>
                  <span className="flex-1 truncate text-sm font-semibold text-surface-800">{question.question_text || copy.questionPlaceholder}</span>
                  <span className="badge-neutral">{question.question_type === "mcq" ? copy.mcq : question.question_type === "true_false" ? copy.trueFalseShort : copy.openText}</span>
                  <span className="text-xs font-semibold text-brand-700">{question.points}{copy.pointsShort}</span>
                  {question.collapsed ? <ChevronDown className="h-4 w-4 text-surface-400" /> : <ChevronUp className="h-4 w-4 text-surface-400" />}
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeQuestion(questionIndex); }} className="text-red-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {!question.collapsed && (
                  <div className="space-y-4 border-t border-surface-100 px-5 pb-5">
                    <div className="grid gap-3 pt-4 sm:grid-cols-3">
                      <label className="block sm:col-span-2">
                        <span className="label">{copy.questionText}</span>
                        <textarea rows={2} className="input" value={question.question_text} onChange={(e) => updateQuestion(questionIndex, { question_text: e.target.value })} />
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="label">{copy.type}</span>
                          <select className="input" value={question.question_type} onChange={(e) => updateQuestion(questionIndex, { question_type: e.target.value as QuestionForm["question_type"] })}>
                            <option value="mcq">{copy.mcq}</option>
                            <option value="true_false">{copy.trueFalse}</option>
                            <option value="open_text">{copy.openText}</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="label">{copy.points}</span>
                          <input type="number" min={1} max={10} className="input" value={question.points} onChange={(e) => updateQuestion(questionIndex, { points: Number(e.target.value) })} />
                        </label>
                      </div>
                    </div>

                    {question.question_type !== "open_text" && (
                      <div className="space-y-2">
                        <p className="label">{copy.choices}</p>
                        {question.choices.map((choice, choiceIndex) => (
                          <div key={choiceIndex} className="flex items-center gap-2">
                            <input
                              type={question.question_type === "mcq" ? "checkbox" : "radio"}
                              name={`correct-${questionIndex}`}
                              checked={choice.is_correct}
                              onChange={() => {
                                const choices = question.choices.map((item, index) => ({
                                  ...item,
                                  is_correct: question.question_type === "true_false" ? index === choiceIndex : index === choiceIndex ? !item.is_correct : item.is_correct,
                                }));
                                updateQuestion(questionIndex, { choices });
                              }}
                              className="shrink-0"
                              disabled={question.question_type === "true_false"}
                            />
                            <input
                              className="input flex-1 py-1.5"
                              placeholder={copy.choicePlaceholder(choiceIndex + 1)}
                              value={choice.choice_text}
                              readOnly={question.question_type === "true_false"}
                              onChange={(e) => updateChoice(questionIndex, choiceIndex, { choice_text: e.target.value })}
                            />
                            {question.question_type === "mcq" && question.choices.length > 2 && (
                              <button type="button" onClick={() => removeChoice(questionIndex, choiceIndex)} className="text-surface-300 hover:text-red-500">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        {question.question_type === "mcq" && question.choices.length < 6 && (
                          <button type="button" onClick={() => addChoice(questionIndex)} className="btn-ghost text-xs">
                            <Plus className="h-3 w-3" /> {copy.addChoice}
                          </button>
                        )}
                      </div>
                    )}
                    {question.question_type === "open_text" && <p className="helper-text italic">{copy.openTextHint}</p>}
                  </div>
                )}
              </div>
            ))}

            <button type="button" onClick={addQuestion} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-surface-200 py-4 text-sm font-medium text-surface-500 transition hover:border-surface-300 hover:bg-white hover:text-surface-900">
              <Plus className="h-4 w-4" /> {copy.addQuestion}
            </button>
          </div>
        </div>
      )}

      {tab === "results" && (
        <div className="space-y-4">
          {!results ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-surface-400" /></div>
          ) : !results.summary ? (
            <div className="empty-state"><p className="empty-state-title">{copy.noAttempts}</p></div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: copy.totalAttempts, value: results.summary.total },
                  { label: copy.passed, value: results.summary.passed },
                  { label: copy.passRate, value: `%${results.summary.pass_rate}` },
                ].map((item) => (
                  <div key={item.label} className="card p-5 text-center">
                    <div className="text-2xl font-bold text-surface-900">{item.value}</div>
                    <div className="card-meta">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="table-shell">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-th">{copy.attendee}</th>
                      <th className="table-th">{copy.score}</th>
                      <th className="table-th">{copy.status}</th>
                      <th className="table-th">{copy.attempt}</th>
                      <th className="table-th">{copy.certificate}</th>
                      <th className="table-th">{copy.date}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.attempts.length === 0 && (
                      <tr><td colSpan={6} className="table-td py-10 text-center text-surface-400">{copy.noAttempts}</td></tr>
                    )}
                    {results.attempts.map((attempt) => (
                      <tr key={attempt.id} className="table-tr-hover">
                        <td className="table-td">
                          <div className="font-semibold text-surface-800">{attempt.attendee_name}</div>
                          {attempt.attendee_email && <div className="text-xs text-surface-400">{attempt.attendee_email}</div>}
                        </td>
                        <td className="table-td font-mono">%{attempt.score}</td>
                        <td className="table-td">
                          <span className={attempt.passed ? "badge-active" : "badge-expired"}>{attempt.passed ? copy.passed : copy.failed}</span>
                        </td>
                        <td className="table-td">{attempt.attempt_number}. {copy.attemptSuffix}</td>
                        <td className="table-td">
                          {attempt.cert_issued ? (
                            <span className="text-xs font-semibold text-emerald-600">{copy.certIssued}</span>
                          ) : attempt.passed ? (
                            <button type="button" disabled={issuingCert === attempt.id} onClick={() => void handleIssueCert(attempt.id)} className="btn-ghost text-xs text-brand-700">
                              {issuingCert === attempt.id ? copy.certCreating : copy.issueCert}
                            </button>
                          ) : (
                            <span className="text-xs text-surface-400">-</span>
                          )}
                        </td>
                        <td className="table-td text-xs">
                          {attempt.completed_at ? new Date(attempt.completed_at).toLocaleDateString(isTr ? "tr-TR" : "en-US") : copy.inProgress}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
