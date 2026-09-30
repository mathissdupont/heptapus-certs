"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Save, Loader2, Plus, Trash2, ArrowLeft, CheckCircle2, AlertCircle,
  ChevronUp, ChevronDown, Mail, Users, Clock, ToggleLeft, ToggleRight,
  UserMinus, UserPlus,
} from "lucide-react";
import {
  updateSequence, getSequenceEnrollments, enrollInSequence, unenrollFromSequence,
  listSequences,
  type SequenceOut, type SequenceEnrollmentOut,
} from "@/lib/api";
import EmailTemplateSelect from "@/components/Admin/EmailTemplateSelect";
import { useI18n } from "@/lib/i18n";

type StepForm = {
  step_order: number;
  delay_days: number;
  email_template_id: number | null;
  subject_override: string;
};

type Tab = "builder" | "enrollments";
type EnrollStatus = "active" | "completed" | "unenrolled";

export default function SequenceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seqId = Number(params.id);
  const { lang } = useI18n();
  const copy = lang === "tr"
    ? {
        active: "Aktif",
        inactive: "Pasif",
        tabBuilder: "Yapılandır",
        tabEnrollments: "Kayıtlar",
        generalInfo: "Genel Bilgiler",
        labelName: "İsim",
        labelDescription: "Açıklama",
        activeToggleLabel: "Aktif (e-postalar planlanmış zamanda gönderilsin)",
        emailSteps: "E-posta Adımları",
        noStepsYet: "Henüz adım yok. Aşağıdan ekleyin.",
        stepLabel: "Adım",
        delayAfterEnroll: "Kayıt sonrası",
        delayAfterPrev: "Önceki adımdan",
        delayWait: "bekle:",
        delayDays: "gün",
        emailTemplate: "E-posta Şablonu",
        templatePlaceholder: "Şablon seçin...",
        templateEmptyText: "Sistem şablonları listeleniyor",
        subjectOverrideLabel: "Konu Geçersiz Kıl (opsiyonel)",
        subjectOverridePlaceholder: "Boş bırakırsanız şablonun konusu kullanılır",
        addStep: "Adım Ekle",
        save: "Kaydet",
        enrollSectionTitle: "E-posta Ekle",
        enrollHint: "Virgül, noktalı virgül veya yeni satır ile birden fazla e-posta girebilirsiniz.",
        enrollPlaceholder: "ornek@sirket.com, diger@sirket.com",
        enrollButton: "Kayıt Et",
        enrollInactiveWarning: "Kayıt eklemek için sequence aktif olmalı.",
        filterActive: "Aktif",
        filterCompleted: "Tamamlandı",
        filterUnenrolled: "Çıktı",
        emptyEnrollments: "Bu durumda kayıt yok.",
        colEmail: "E-posta",
        colStep: "Adım",
        colNextSend: "Sonraki Gönderim",
        unenrollButton: "Çıkar",
        toastSaved: "Kaydedildi.",
        toastSaveError: "Kayıt başarısız.",
        toastUnenrolled: "Kayıt çıkarıldı.",
        toastUnenrollError: "İşlem başarısız.",
        toastEnrollError: "Kayıt başarısız.",
        enrolledMsg: (enrolled: number, skipped: number) =>
 `${enrolled} kayıt eklendi, ${skipped} atlandı.`,
      }
    : {
        active: "Active",
        inactive: "Inactive",
        tabBuilder: "Configure",
        tabEnrollments: "Enrollments",
        generalInfo: "General Info",
        labelName: "Name",
        labelDescription: "Description",
        activeToggleLabel: "Active (emails will be sent at scheduled time)",
        emailSteps: "Email Steps",
        noStepsYet: "No steps yet. Add one below.",
        stepLabel: "Step",
        delayAfterEnroll: "After enrollment",
        delayAfterPrev: "After previous step",
        delayWait: "wait:",
        delayDays: "days",
        emailTemplate: "Email Template",
        templatePlaceholder: "Select template...",
        templateEmptyText: "Loading system templates",
        subjectOverrideLabel: "Subject Override (optional)",
        subjectOverridePlaceholder: "If left blank, the template subject is used",
        addStep: "Add Step",
        save: "Save",
        enrollSectionTitle: "Add Emails",
        enrollHint: "You can enter multiple emails separated by comma, semicolon, or newline.",
        enrollPlaceholder: "example@company.com, other@company.com",
        enrollButton: "Enroll",
        enrollInactiveWarning: "Sequence must be active to add enrollments.",
        filterActive: "Active",
        filterCompleted: "Completed",
        filterUnenrolled: "Unenrolled",
        emptyEnrollments: "No enrollments in this state.",
        colEmail: "Email",
        colStep: "Step",
        colNextSend: "Next Send",
        unenrollButton: "Remove",
        toastSaved: "Saved.",
        toastSaveError: "Save failed.",
        toastUnenrolled: "Enrollment removed.",
        toastUnenrollError: "Operation failed.",
        toastEnrollError: "Enrollment failed.",
        enrolledMsg: (enrolled: number, skipped: number) =>
 `${enrolled} enrolled, ${skipped} skipped.`,
      };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("builder");
  const [seq, setSeq] = useState<SequenceOut | null>(null);

  // Builder form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(false);
  const [steps, setSteps] = useState<StepForm[]>([]);

  // Enrollments state
  const [enrollFilter, setEnrollFilter] = useState<EnrollStatus>("active");
  const [enrollments, setEnrollments] = useState<SequenceEnrollmentOut[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollInput, setEnrollInput] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // Load sequence from list endpoint (no single-get endpoint exists)
  useEffect(() => {
    listSequences()
      .then((list) => {
        const found = list.find((s) => s.id === seqId);
        if (!found) { router.push("/admin/crm/sequences"); return; }
        setSeq(found);
        setName(found.name);
        setDescription(found.description ?? "");
        setActive(found.active);
        setSteps(
          [...found.steps]
            .sort((a, b) => a.step_order - b.step_order)
            .map((s) => ({
              step_order: s.step_order,
              delay_days: s.delay_days,
              email_template_id: s.email_template_id,
              subject_override: s.subject_override ?? "",
            }))
        );
      })
      .catch(() => router.push("/admin/crm/sequences"))
      .finally(() => setLoading(false));
  }, [seqId]);

  // Load enrollments when tab changes
  useEffect(() => {
    if (tab !== "enrollments") return;
    setEnrollLoading(true);
    getSequenceEnrollments(seqId, enrollFilter)
      .then(setEnrollments)
      .catch(() => {})
      .finally(() => setEnrollLoading(false));
  }, [tab, enrollFilter, seqId]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateSequence(seqId, {
        name: name.trim(),
        description: description.trim() || null,
        active,
        steps: steps.map((s, i) => ({
          step_order: i,
          delay_days: s.delay_days,
          email_template_id: s.email_template_id || null,
          subject_override: s.subject_override.trim() || null,
        })),
      });
      setSeq(updated);
      showToast("success", copy.toastSaved);
    } catch {
      showToast("error", copy.toastSaveError);
    } finally {
      setSaving(false);
    }
  }

  function addStep() {
    setSteps((s) => [
      ...s,
      { step_order: s.length, delay_days: 3, email_template_id: null, subject_override: "" },
    ]);
  }

  function removeStep(idx: number) {
    setSteps((s) => s.filter((_, i) => i !== idx));
  }

  function moveStep(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= steps.length) return;
    setSteps((s) => {
      const arr = [...s];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  }

  function updateStepField<K extends keyof StepForm>(idx: number, key: K, val: StepForm[K]) {
    setSteps((s) => s.map((x, i) => (i === idx ? { ...x, [key]: val } : x)));
  }

  async function handleEnroll() {
    const emails = enrollInput
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (!emails.length) return;
    setEnrolling(true);
    try {
      const result = await enrollInSequence(seqId, emails);
      showToast("success", copy.enrolledMsg(result.enrolled, result.skipped));
      setEnrollInput("");
      if (enrollFilter === "active") {
        const fresh = await getSequenceEnrollments(seqId, "active");
        setEnrollments(fresh);
      }
    } catch {
      showToast("error", copy.toastEnrollError);
    } finally {
      setEnrolling(false);
    }
  }

  async function handleUnenroll(email: string) {
    try {
      await unenrollFromSequence(seqId, [email]);
      setEnrollments((prev) => prev.filter((e) => e.email !== email));
      showToast("success", copy.toastUnenrolled);
    } catch {
      showToast("error", copy.toastUnenrollError);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg text-white ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/crm/sequences" className="text-content-muted hover:text-content-secondary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold text-content-primary flex-1 truncate">{seq?.name}</h1>
        <span
          className={`text-xs rounded-full px-2.5 py-1 font-medium flex-shrink-0 ${
            active ? "bg-status-success-bg text-status-success-content" : "bg-sunken text-content-muted"
          }`}
        >
          {active ? copy.active : copy.inactive}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-sunken p-1 w-fit">
        {(["builder", "enrollments"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t ? "bg-raised shadow text-content-primary" : "text-content-muted hover:text-content-secondary"
            }`}
          >
            {t === "builder" ? copy.tabBuilder : copy.tabEnrollments}
          </button>
        ))}
      </div>

      {/* ── Builder Tab ── */}
      {tab === "builder" && (
        <div className="space-y-5">
          {/* Meta card */}
          <div className="rounded-2xl border border-outline-subtle bg-raised p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-medium text-content-secondary">{copy.generalInfo}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-content-muted mb-1">{copy.labelName}</label>
                <input
                  className="w-full rounded-xl border border-outline-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-content-muted mb-1">{copy.labelDescription}</label>
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-outline-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-content-secondary cursor-pointer">
                <button
                  type="button"
                  onClick={() => setActive((v) => !v)}
                  className="flex-shrink-0"
                >
                  {active
                    ? <ToggleRight className="h-5 w-5 text-status-success-content" />
                    : <ToggleLeft className="h-5 w-5 text-content-muted" />
                  }
                </button>
                {copy.activeToggleLabel}
              </label>
            </div>
          </div>

          {/* Steps card */}
          <div className="rounded-2xl border border-outline-subtle bg-raised p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-content-secondary">{copy.emailSteps} ({steps.length})</h2>
            </div>

            {steps.length === 0 && (
              <p className="text-sm text-content-muted text-center py-4">
                {copy.noStepsYet}
              </p>
            )}

            <div className="space-y-4">
              {steps.map((step, idx) => (
                <div key={idx} className="rounded-xl border border-outline-subtle bg-canvas p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-content-muted">{copy.stepLabel} {idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveStep(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 text-content-muted hover:text-content-secondary disabled:opacity-30"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => moveStep(idx, 1)}
                        disabled={idx === steps.length - 1}
                        className="p-1 text-content-muted hover:text-content-secondary disabled:opacity-30"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeStep(idx)}
                        className="p-1 text-status-danger-content hover:text-status-danger-content"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Delay */}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-content-muted flex-shrink-0" />
                    <label className="text-xs text-content-muted flex-shrink-0">
                      {idx === 0 ? copy.delayAfterEnroll : copy.delayAfterPrev} {copy.delayWait}
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="w-16 rounded-lg border border-outline-subtle bg-raised px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-status-info-border"
                      value={step.delay_days}
                      onChange={(e) => updateStepField(idx, "delay_days", Number(e.target.value))}
                    />
                    <span className="text-xs text-content-muted">{copy.delayDays}</span>
                  </div>

                  {/* Template */}
                  <EmailTemplateSelect
                    value={step.email_template_id}
                    onChange={(v) => updateStepField(idx, "email_template_id", v)}
                    label={copy.emailTemplate}
                    placeholder={copy.templatePlaceholder}
                    emptyText={copy.templateEmptyText}
                  />

                  {/* Subject override */}
                  <div>
                    <label className="block text-xs font-medium text-content-muted mb-1">
                      {copy.subjectOverrideLabel}
                    </label>
                    <input
                      className="w-full rounded-lg border border-outline-subtle bg-raised px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                      placeholder={copy.subjectOverridePlaceholder}
                      value={step.subject_override}
                      onChange={(e) => updateStepField(idx, "subject_override", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addStep}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-outline-strong bg-canvas px-4 py-3 text-sm text-content-muted hover:border-status-info-border hover:text-status-info-content hover:bg-status-info-bg transition"
            >
              <Plus className="h-4 w-4" /> {copy.addStep}
            </button>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {copy.save}
            </button>
          </div>
        </div>
      )}

      {/* ── Enrollments Tab ── */}
      {tab === "enrollments" && (
        <div className="space-y-5">
          {/* Enroll form */}
          <div className="rounded-2xl border border-outline-subtle bg-raised p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-medium text-content-secondary flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-status-info-content" /> {copy.enrollSectionTitle}
            </h2>
            <p className="text-xs text-content-muted">{copy.enrollHint}</p>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-outline-subtle px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-status-info-border"
              placeholder={copy.enrollPlaceholder}
              value={enrollInput}
              onChange={(e) => setEnrollInput(e.target.value)}
            />
            <button
              onClick={handleEnroll}
              disabled={enrolling || !enrollInput.trim() || !active}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {copy.enrollButton}
            </button>
            {!active && (
              <p className="text-xs text-status-warning-content">{copy.enrollInactiveWarning}</p>
            )}
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            {(["active", "completed", "unenrolled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setEnrollFilter(s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  enrollFilter === s
                    ? "bg-indigo-600 text-white"
                    : "border border-outline-subtle text-content-muted hover:bg-canvas"
                }`}
              >
                {s === "active" ? copy.filterActive : s === "completed" ? copy.filterCompleted : copy.filterUnenrolled}
              </button>
            ))}
          </div>

          {/* Enrollment list */}
          {enrollLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
            </div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-12 text-content-muted text-sm">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {copy.emptyEnrollments}
            </div>
          ) : (
            <div className="rounded-2xl border border-outline-subtle bg-raised shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-canvas border-b border-outline-subtle">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-content-muted">{copy.colEmail}</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-content-muted">{copy.colStep}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-content-muted">{copy.colNextSend}</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-content-muted"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-subtle">
                  {enrollments.map((e) => (
                    <tr key={e.id} className="hover:bg-canvas">
                      <td className="px-4 py-3 font-medium text-content-primary flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-content-muted flex-shrink-0" />
                        {e.email}
                      </td>
                      <td className="px-4 py-3 text-center text-content-muted">{e.current_step}</td>
                      <td className="px-4 py-3 text-content-muted">
                        {e.next_send_at
                          ? new Date(e.next_send_at).toLocaleString(localeTag(lang), {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {e.status === "active" && (
                          <button
                            onClick={() => handleUnenroll(e.email)}
                            className="inline-flex items-center gap-1 rounded-lg border border-outline-subtle px-2 py-1 text-xs text-status-danger-content hover:bg-status-danger-bg"
                          >
                            <UserMinus className="h-3 w-3" /> {copy.unenrollButton}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
