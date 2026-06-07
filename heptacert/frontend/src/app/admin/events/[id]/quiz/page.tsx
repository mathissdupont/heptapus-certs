"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Plus, Trash2, Save, Loader2, CheckCircle2, AlertCircle,
  GripVertical, FileQuestion, BarChart3, ChevronDown, ChevronUp,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

const emptyQuestion = (order: number): QuestionForm => ({
  question_text: "",
  question_type: "mcq",
  order,
  points: 1,
  choices: [
    { choice_text: "", is_correct: false, order: 0 },
    { choice_text: "", is_correct: false, order: 1 },
  ],
  collapsed: false,
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuizBuilderPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasQuiz, setHasQuiz] = useState(false);
  const [tab, setTab] = useState<"builder" | "results">("builder");

  const [form, setForm] = useState<QuizForm>({
    title: "Sınav",
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

  // ── Load existing quiz ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const _qr = await apiFetch(`/admin/events/${eventId}/quiz`);
        const data = await _qr.json();
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
        if (e?.status !== 404) showToast("error", "Sınav yüklenemedi.");
        setHasQuiz(false);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [eventId]);

  // ── Load results ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "results") return;
    apiFetch(`/admin/events/${eventId}/quiz/results`)
      .then((r) => r.json())
      .then((d) => setResults(d))
      .catch(() => {});
  }, [tab, eventId]);

  // ── Save quiz ─────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    try {
      const body = {
        title: form.title.trim() || "Sınav",
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
      showToast("success", "Sınav kaydedildi.");
    } catch (err: any) {
      showToast("error", err?.message ? `Kayıt başarısız: ${err.message}` : "Kayıt başarısız.");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete quiz ───────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirm("Sınavı ve tüm sonuçları silmek istediğinizden emin misiniz?")) return;
    try {
      await apiFetch(`/admin/events/${eventId}/quiz`, { method: "DELETE" });
      setHasQuiz(false);
      setForm({ ...form, questions: [] });
      showToast("success", "Sınav silindi.");
    } catch {
      showToast("error", "Silme başarısız.");
    }
  }

  // ── Issue cert for attempt ────────────────────────────────────────────────
  async function handleIssueCert(attemptId: number) {
    setIssuingCert(attemptId);
    try {
      await apiFetch(`/admin/events/${eventId}/quiz/attempts/${attemptId}/issue-cert`, { method: "POST" });
      showToast("success", "Sertifika oluşturuluyor.");
      // Refresh results
      const _rr = await apiFetch(`/admin/events/${eventId}/quiz/results`);
      const d = await _rr.json();
      setResults(d);
    } catch {
      showToast("error", "Sertifika verilemedi.");
    } finally {
      setIssuingCert(null);
    }
  }

  // ── Question helpers ──────────────────────────────────────────────────────
  function addQuestion() {
    setForm((f) => ({ ...f, questions: [...f.questions, emptyQuestion(f.questions.length)] }));
  }

  function removeQuestion(idx: number) {
    setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));
  }

  function updateQuestion(idx: number, patch: Partial<QuestionForm>) {
    setForm((f) => {
      const qs = [...f.questions];
      qs[idx] = { ...qs[idx], ...patch };
      if (patch.question_type === "true_false") {
        qs[idx].choices = [
          { choice_text: "Doğru", is_correct: true, order: 0 },
          { choice_text: "Yanlış", is_correct: false, order: 1 },
        ];
      }
      return { ...f, questions: qs };
    });
  }

  function addChoice(qIdx: number) {
    setForm((f) => {
      const qs = [...f.questions];
      qs[qIdx].choices = [
        ...qs[qIdx].choices,
        { choice_text: "", is_correct: false, order: qs[qIdx].choices.length },
      ];
      return { ...f, questions: qs };
    });
  }

  function updateChoice(qIdx: number, cIdx: number, patch: Partial<ChoiceForm>) {
    setForm((f) => {
      const qs = [...f.questions];
      const choices = [...qs[qIdx].choices];
      choices[cIdx] = { ...choices[cIdx], ...patch };
      qs[qIdx] = { ...qs[qIdx], choices };
      return { ...f, questions: qs };
    });
  }

  function removeChoice(qIdx: number, cIdx: number) {
    setForm((f) => {
      const qs = [...f.questions];
      qs[qIdx].choices = qs[qIdx].choices.filter((_, i) => i !== cIdx);
      return { ...f, questions: qs };
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg text-white ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileQuestion className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Sınav Yönetimi</h1>
            <p className="text-sm text-gray-500">Sertifika için sınav oluştur ve sonuçları takip et</p>
          </div>
        </div>
        <div className="flex gap-2">
          {hasQuiz && (
            <button
              onClick={handleDelete}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(["builder", "results"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "builder" ? "Sınav Oluştur" : "Sonuçlar"}
          </button>
        ))}
      </div>

      {/* ── Builder Tab ── */}
      {tab === "builder" && (
        <div className="space-y-6">
          {/* Settings card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-medium text-gray-800">Sınav Ayarları</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Başlık</label>
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Geçme Puanı (%)</label>
                <input
                  type="number" min={1} max={100}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.passing_score}
                  onChange={(e) => setForm((f) => ({ ...f, passing_score: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Maks. Deneme</label>
                <input
                  type="number" min={1} max={10}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.max_attempts}
                  onChange={(e) => setForm((f) => ({ ...f, max_attempts: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Süre Limiti (dk, boş = sınırsız)</label>
                <input
                  type="number" min={1}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.time_limit_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, time_limit_minutes: e.target.value }))}
                  placeholder="Sınırsız"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Açıklama</label>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={form.required_for_cert}
                  onChange={(e) => setForm((f) => ({ ...f, required_for_cert: e.target.checked }))}
                />
                Sertifika için sınav zorunlu
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                Sınav aktif
              </label>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-3">
            {form.questions.map((q, qi) => (
              <div key={qi} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                {/* Question header */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => updateQuestion(qi, { collapsed: !q.collapsed })}
                >
                  <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-400 w-5">{qi + 1}.</span>
                  <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                    {q.question_text || "Soru giriniz..."}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">
                    {q.question_type === "mcq" ? "Çoktan Seçmeli" : q.question_type === "true_false" ? "D/Y" : "Açık Uçlu"}
                  </span>
                  <span className="text-xs text-indigo-600 font-medium">{q.points}p</span>
                  {q.collapsed ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeQuestion(qi); }}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {!q.collapsed && (
                  <div className="px-5 pb-5 space-y-4 border-t border-gray-50">
                    {/* Question fields */}
                    <div className="pt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Soru Metni</label>
                        <textarea
                          rows={2}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={q.question_text}
                          onChange={(e) => updateQuestion(qi, { question_text: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Tip</label>
                          <select
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                            value={q.question_type}
                            onChange={(e) => updateQuestion(qi, { question_type: e.target.value as any })}
                          >
                            <option value="mcq">Çoktan Seçmeli</option>
                            <option value="true_false">Doğru / Yanlış</option>
                            <option value="open_text">Açık Uçlu</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Puan</label>
                          <input
                            type="number" min={1} max={10}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                            value={q.points}
                            onChange={(e) => updateQuestion(qi, { points: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Choices */}
                    {q.question_type !== "open_text" && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-600">Seçenekler</p>
                        {q.choices.map((c, ci) => (
                          <div key={ci} className="flex items-center gap-2">
                            <input
                              type={q.question_type === "mcq" ? "checkbox" : "radio"}
                              name={`correct-${qi}`}
                              checked={c.is_correct}
                              onChange={() => {
                                const choices = q.choices.map((ch, i) => ({
                                  ...ch,
                                  is_correct: q.question_type === "true_false" ? i === ci : i === ci ? !ch.is_correct : ch.is_correct,
                                }));
                                updateQuestion(qi, { choices });
                              }}
                              className="flex-shrink-0"
                              disabled={q.question_type === "true_false"}
                            />
                            <input
                              className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder={`Seçenek ${ci + 1}`}
                              value={c.choice_text}
                              readOnly={q.question_type === "true_false"}
                              onChange={(e) => updateChoice(qi, ci, { choice_text: e.target.value })}
                            />
                            {q.question_type === "mcq" && q.choices.length > 2 && (
                              <button onClick={() => removeChoice(qi, ci)} className="text-gray-300 hover:text-red-500">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                        {q.question_type === "mcq" && q.choices.length < 6 && (
                          <button
                            onClick={() => addChoice(qi)}
                            className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Seçenek ekle
                          </button>
                        )}
                      </div>
                    )}
                    {q.question_type === "open_text" && (
                      <p className="text-xs text-gray-400 italic">Açık uçlu sorular manuel değerlendirme gerektirir.</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={addQuestion}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-4 text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-600 transition"
            >
              <Plus className="h-4 w-4" /> Soru Ekle
            </button>
          </div>
        </div>
      )}

      {/* ── Results Tab ── */}
      {tab === "results" && (
        <div className="space-y-4">
          {!results ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : !results.summary ? (
            <div className="text-center py-16 text-sm text-gray-500">Henüz sınav girişimi bulunmuyor.</div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Toplam Deneme", value: results.summary.total },
                  { label: "Geçen", value: results.summary.passed },
                  { label: "Geçme Oranı", value: `%${results.summary.pass_rate}` },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-center">
                    <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Attempts table */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Katılımcı</th>
                      <th className="px-4 py-3 text-left">Puan</th>
                      <th className="px-4 py-3 text-left">Durum</th>
                      <th className="px-4 py-3 text-left">Deneme</th>
                      <th className="px-4 py-3 text-left">Sertifika</th>
                      <th className="px-4 py-3 text-left">Tarih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {results.attempts.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-10 text-gray-400">Henüz deneme yok.</td></tr>
                    )}
                    {results.attempts.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{a.attendee_name}</div>
                          {a.attendee_email && <div className="text-xs text-gray-400">{a.attendee_email}</div>}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-700">%{a.score}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                            {a.passed ? "Geçti" : "Kaldı"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{a.attempt_number}. deneme</td>
                        <td className="px-4 py-3">
                          {a.cert_issued ? (
                            <span className="text-xs text-green-600 font-medium">Verildi</span>
                          ) : a.passed ? (
                            <button
                              disabled={issuingCert === a.id}
                              onClick={() => handleIssueCert(a.id)}
                              className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
                            >
                              {issuingCert === a.id ? "Oluşturuluyor..." : "Sertifika Ver"}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {a.completed_at ? new Date(a.completed_at).toLocaleDateString("tr-TR") : "Devam ediyor"}
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
