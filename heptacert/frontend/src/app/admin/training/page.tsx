"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  Building2,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import {
  createTrainingAssignment,
  createTrainingDepartment,
  createTrainingRecurringRule,
  createTrainingTemplate,
  deleteTrainingAssignment,
  exportTrainingReportFile,
  getTrainingReport,
  listTrainingDepartments,
  listTrainingNotificationLogs,
  listTrainingRecurringRules,
  listTrainingTemplates,
  listRenewalRecommendations,
  listTrainingAssignments,
  runTrainingRecurringRules,
  sendTrainingRenewalNotifications,
  updateTrainingAssignment,
  type OrganizationDepartment,
  type RenewalRecommendation,
  type TrainingAssignment,
  type TrainingNotificationLog,
  type TrainingRecurringRule,
  type TrainingReport,
  type TrainingTemplate,
} from "@/lib/api";
import { FeatureGate } from "@/lib/useSubscription";
import { useI18n } from "@/lib/i18n";

const STATUS_OPTIONS = [
  { value: "assigned", label: "Atandı" },
  { value: "in_progress", label: "Devam ediyor" },
  { value: "completed", label: "Tamamlandı" },
  { value: "waived", label: "Muaf" },
];

const emptyForm = {
  title: "",
  assignee_name: "",
  assignee_email: "",
  department: "",
  due_at: "",
  renewal_due_at: "",
  notify_before_days: 30,
  description: "",
  evidence_url: "",
  evidence_label: "",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function toDateTimeInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function fromDateTimeInput(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function statusBadge(status: string) {
  if (status === "completed") return "bg-emerald-50 text-emerald-700";
  if (status === "overdue") return "bg-red-50 text-red-700";
  if (status === "in_progress") return "bg-blue-50 text-blue-700";
  if (status === "waived") return "bg-surface-100 text-surface-600";
  return "bg-amber-50 text-amber-700";
}

export default function AdminTrainingPage() {
  const { lang } = useI18n();
  const copy = lang === "tr" ? {
    title: "Eğitim ve Yenileme Takibi",
    subtitle: "Zorunlu eğitim atamaları, departman raporları, tamamlanma durumu ve sertifika yenileme tarihlerini takip edin.",
    runNotifications: "Bildirimleri çalıştır",
    loadError: "Eğitim verileri yüklenemedi.",
    requiredError: "Başlık, kişi ve e-posta gerekli.",
    saved: "Eğitim ataması kaydedildi.",
    saveError: "Eğitim ataması kaydedilemedi.",
    statusError: "Durum güncellenemedi.",
    deleteError: "Atama silinemedi.",
    notificationResult: (sent: number, skipped: number, failed: number) => `Bildirim sonucu: ${sent} gönderildi, ${skipped} atlandı, ${failed} hata.`,
    notificationError: "Bildirimler gönderilemedi.",
    total: "Toplam",
    completed: "Tamamlanan",
    overdue: "Geciken",
    dueSoon: "14 gün",
    renewal: "Yenileme",
    searchPlaceholder: "Başlık, kişi veya e-posta ara",
    allStatuses: "Tüm durumlar",
    department: "Departman",
    refresh: "Yenile",
    assignments: "Atamalar",
    new: "Yeni",
    empty: "Henüz eğitim ataması yok.",
    general: "Genel",
    dueDate: "Son tarih",
    certificate: "Sertifika",
    continue: "Devam",
    complete: "Tamamla",
    waived: "Muaf",
    editAssignment: "Atamayı düzenle",
    newAssignment: "Yeni atama",
    trainingTitle: "Eğitim başlığı",
    attendeeName: "Katılımcı adı",
    renewalDate: "Yenileme tarihi",
    notifyDays: "Bildirim günü",
    description: "Açıklama",
    save: "Kaydet",
    recommendations: "Yenileme önerileri",
    noRecommendations: "Uygun etkinlik önerisi bulunamadı.",
    departmentReport: "Departman raporu",
    gate: "Eğitim ve yenileme takibi Enterprise planına özeldir.",
  } : {
    title: "Training and Renewal Tracking",
    subtitle: "Track required training assignments, department reports, completion status, and certificate renewal dates.",
    runNotifications: "Run notifications",
    loadError: "Could not load training data.",
    requiredError: "Title, person, and email are required.",
    saved: "Training assignment saved.",
    saveError: "Could not save training assignment.",
    statusError: "Could not update status.",
    deleteError: "Could not delete assignment.",
    notificationResult: (sent: number, skipped: number, failed: number) => `Notification result: ${sent} sent, ${skipped} skipped, ${failed} failed.`,
    notificationError: "Could not send notifications.",
    total: "Total",
    completed: "Completed",
    overdue: "Overdue",
    dueSoon: "14 days",
    renewal: "Renewal",
    searchPlaceholder: "Search title, person, or email",
    allStatuses: "All statuses",
    department: "Department",
    refresh: "Refresh",
    assignments: "Assignments",
    new: "New",
    empty: "No training assignments yet.",
    general: "General",
    dueDate: "Due date",
    certificate: "Certificate",
    continue: "Continue",
    complete: "Complete",
    waived: "Waive",
    editAssignment: "Edit assignment",
    newAssignment: "New assignment",
    trainingTitle: "Training title",
    attendeeName: "Participant name",
    renewalDate: "Renewal date",
    notifyDays: "Notification days",
    description: "Description",
    save: "Save",
    recommendations: "Renewal recommendations",
    noRecommendations: "No suitable event recommendations found.",
    departmentReport: "Department report",
    gate: "Training and renewal tracking is available on the Enterprise plan.",
  };
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [orgDepartments, setOrgDepartments] = useState<OrganizationDepartment[]>([]);
  const [templates, setTemplates] = useState<TrainingTemplate[]>([]);
  const [recurringRules, setRecurringRules] = useState<TrainingRecurringRule[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<TrainingNotificationLog[]>([]);
  const [report, setReport] = useState<TrainingReport | null>(null);
  const [recommendations, setRecommendations] = useState<RenewalRecommendation[]>([]);
  const [selected, setSelected] = useState<TrainingAssignment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newManagerEmail, setNewManagerEmail] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const departments = useMemo(() => {
    const values = new Set<string>();
    orgDepartments.forEach((item) => values.add(item.name));
    assignments.forEach((item) => {
      if (item.department) values.add(item.department);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [assignments, orgDepartments]);

  function fillForm(item: TrainingAssignment | null) {
    if (!item) {
      setForm(emptyForm);
      return;
    }
    setForm({
      title: item.title,
      assignee_name: item.assignee_name,
      assignee_email: item.assignee_email,
      department: item.department || "",
      due_at: toDateTimeInput(item.due_at),
      renewal_due_at: toDateTimeInput(item.renewal_due_at),
      notify_before_days: item.notify_before_days || 30,
      description: item.description || "",
      evidence_url: item.evidence_url || "",
      evidence_label: item.evidence_label || "",
    });
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [rows, nextReport, nextRecommendations] = await Promise.all([
        listTrainingAssignments({ query: query || undefined, status: status || undefined, department: department || undefined }),
        getTrainingReport(),
        listRenewalRecommendations(department || undefined),
      ]);
      const [nextDepartments, nextTemplates, nextRules, nextLogs] = await Promise.all([
        listTrainingDepartments(),
        listTrainingTemplates(),
        listTrainingRecurringRules(),
        listTrainingNotificationLogs(),
      ]);
      setAssignments(rows);
      setOrgDepartments(nextDepartments);
      setTemplates(nextTemplates);
      setRecurringRules(nextRules);
      setNotificationLogs(nextLogs);
      setReport(nextReport);
      setRecommendations(nextRecommendations);
      if (selected) {
        const updated = rows.find((item) => item.id === selected.id) || null;
        setSelected(updated);
        fillForm(updated);
      }
    } catch (ex: any) {
      setError(ex?.message || copy.loadError);
    } finally {
      setLoading(false);
    }
  }

  async function saveAssignment() {
    if (!form.title || !form.assignee_name || !form.assignee_email) {
      setError(copy.requiredError);
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        title: form.title,
        assignee_name: form.assignee_name,
        assignee_email: form.assignee_email,
        department_id: orgDepartments.find((item) => item.name === form.department)?.id || null,
        department: form.department || null,
        manager_email: orgDepartments.find((item) => item.name === form.department)?.manager_email || null,
        due_at: fromDateTimeInput(form.due_at),
        renewal_due_at: fromDateTimeInput(form.renewal_due_at),
        notify_before_days: Number(form.notify_before_days) || 30,
        description: form.description || null,
        evidence_url: form.evidence_url || null,
        evidence_label: form.evidence_label || null,
      };
      const saved = selected
        ? await updateTrainingAssignment(selected.id, payload)
        : await createTrainingAssignment({ ...payload, status: "assigned", required: true });
      setSelected(saved);
      fillForm(saved);
      setNotice(copy.saved);
      await loadAll();
    } catch (ex: any) {
      setError(ex?.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function addDepartment() {
    if (!newDepartment.trim()) return;
    setError(null);
    try {
      await createTrainingDepartment({
        name: newDepartment.trim(),
        manager_email: newManagerEmail.trim() || null,
        active: true,
      });
      setNewDepartment("");
      setNewManagerEmail("");
      await loadAll();
    } catch (ex: any) {
      setError(ex?.message || copy.saveError);
    }
  }

  async function saveTemplateAndRecurring() {
    if (!templateName.trim() || !form.title.trim()) {
      setError(copy.requiredError);
      return;
    }
    setError(null);
    try {
      const dept = orgDepartments.find((item) => item.name === form.department);
      const template = await createTrainingTemplate({
        name: templateName.trim(),
        title: form.title.trim(),
        description: form.description || null,
        department_id: dept?.id || null,
        default_due_days: 30,
        renewal_interval_days: 365,
        notify_before_days: Number(form.notify_before_days) || 30,
        approval_required: Boolean(dept?.manager_email),
        active: true,
      });
      await createTrainingRecurringRule({
        template_id: template.id,
        department_id: dept?.id || null,
        source: "event_participants",
        enabled: true,
        lookback_days: 30,
      });
      setTemplateName("");
      setNotice("Şablon ve recurring kural oluşturuldu.");
      await loadAll();
    } catch (ex: any) {
      setError(ex?.message || copy.saveError);
    }
  }

  async function runRecurring() {
    setError(null);
    try {
      const result = await runTrainingRecurringRules();
      setNotice(`Recurring atama sonucu: ${result.created} oluşturuldu, ${result.skipped} atlandı.`);
      await loadAll();
    } catch (ex: any) {
      setError(ex?.message || copy.saveError);
    }
  }

  async function downloadComplianceReport(format: "csv" | "pdf") {
    setError(null);
    try {
      const blob = await exportTrainingReportFile(format);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `training-compliance-report.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (ex: any) {
      setError(ex?.message || copy.loadError);
    }
  }

  async function setAssignmentStatus(item: TrainingAssignment, nextStatus: string) {
    setError(null);
    try {
      const updated = await updateTrainingAssignment(item.id, {
        status: nextStatus,
        completed_at: nextStatus === "completed" ? new Date().toISOString() : item.completed_at,
      });
      setAssignments((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
      if (selected?.id === updated.id) {
        setSelected(updated);
        fillForm(updated);
      }
      await loadAll();
    } catch (ex: any) {
      setError(ex?.message || copy.statusError);
    }
  }

  async function removeAssignment(item: TrainingAssignment) {
    setError(null);
    try {
      await deleteTrainingAssignment(item.id);
      if (selected?.id === item.id) {
        setSelected(null);
        fillForm(null);
      }
      await loadAll();
    } catch (ex: any) {
      setError(ex?.message || copy.deleteError);
    }
  }

  async function sendNotifications() {
    setNotice(null);
    setError(null);
    try {
      const result = await sendTrainingRenewalNotifications();
      setNotice(copy.notificationResult(result.sent, result.skipped, result.failed));
      await loadAll();
    } catch (ex: any) {
      setError(ex?.message || copy.notificationError);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FeatureGate requiredPlans={["enterprise"]} message={copy.gate}>
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Training compliance</p>
          <h1 className="mt-2 text-2xl font-black text-surface-900">{copy.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-surface-500">
            {copy.subtitle}
          </p>
        </div>
        <button type="button" onClick={() => void sendNotifications()} className="btn-secondary justify-center">
          <Bell className="h-4 w-4" />
          {copy.runNotifications}
        </button>
        <button type="button" onClick={() => void downloadComplianceReport("csv")} className="btn-secondary justify-center">
          CSV rapor
        </button>
        <button type="button" onClick={() => void downloadComplianceReport("pdf")} className="btn-secondary justify-center">
          PDF rapor
        </button>
      </div>

      {error && <div className="error-banner text-sm">{error}</div>}
      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{notice}</div>}

      <section className="grid gap-3 md:grid-cols-5">
        {[
          [copy.total, report?.total || 0],
          [copy.completed, report?.completed || 0],
          [copy.overdue, report?.overdue || 0],
          [copy.dueSoon, report?.due_soon || 0],
          [copy.renewal, report?.renewal_due_soon || 0],
        ].map(([label, value]) => (
          <div key={label} className="surface-panel p-4">
            <p className="text-xs font-bold text-surface-500">{label}</p>
            <p className="mt-1 text-2xl font-black text-surface-900">{value}</p>
          </div>
        ))}
      </section>

      <section className="surface-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-surface-900">Departmanlar ve otomatik atama</h2>
              <p className="mt-1 max-w-2xl text-sm text-surface-500">
                Departman yöneticisi, eğitim şablonu ve recurring kuralı aynı yerden yönetilir.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-surface-500">
                <span>{orgDepartments.length} departman</span>
                <span>{templates.length} şablon</span>
                <span>{recurringRules.length} recurring kural</span>
                <span>{notificationLogs.length} bildirim logu</span>
              </div>
            </div>
          </div>
          <button type="button" onClick={() => void runRecurring()} className="btn-secondary justify-center">
            <RefreshCcw className="h-4 w-4" />
            Recurring atamaları çalıştır
          </button>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <input value={newDepartment} onChange={(event) => setNewDepartment(event.target.value)} className="input-field" placeholder="Departman adı" />
          <input value={newManagerEmail} onChange={(event) => setNewManagerEmail(event.target.value)} className="input-field" placeholder="Manager e-posta" />
          <button type="button" onClick={() => void addDepartment()} className="btn-primary justify-center">
            <Plus className="h-4 w-4" />
            Departman ekle
          </button>
        </div>
        {orgDepartments.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {orgDepartments.map((item) => (
              <span key={item.id} className="rounded-full border border-surface-200 bg-white px-3 py-1 text-xs font-bold text-surface-700">
                {item.name}{item.manager_email ? ` · ${item.manager_email}` : ""}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="surface-panel p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input-field pl-9"
              placeholder={copy.searchPlaceholder}
            />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="input-field">
            <option value="">{copy.allStatuses}</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input value={department} onChange={(event) => setDepartment(event.target.value)} list="training-departments" className="input-field" placeholder={copy.department} />
          <datalist id="training-departments">
            {departments.map((item) => <option key={item} value={item} />)}
          </datalist>
          <button type="button" onClick={() => void loadAll()} className="btn-primary justify-center">
            <RefreshCcw className="h-4 w-4" />
            {copy.refresh}
          </button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-surface-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-brand-600" />
              <h2 className="text-base font-black text-surface-900">{copy.assignments}</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                fillForm(null);
              }}
              className="btn-secondary px-3 py-2 text-xs"
            >
              <Plus className="h-4 w-4" />
              {copy.new}
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
          ) : assignments.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-surface-500">{copy.empty}</div>
          ) : (
            <div className="divide-y divide-surface-100">
              {assignments.map((item) => (
                <article key={item.id} className={`bg-white px-5 py-4 ${selected?.id === item.id ? "bg-brand-50/60" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(item);
                        fillForm(item);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate font-black text-surface-900">{item.title}</p>
                      <p className="mt-1 truncate text-sm text-surface-500">{item.assignee_name} - {item.assignee_email}</p>
                    </button>
                    <span className={`rounded-full px-2.5 py-1 text-11 font-bold ${statusBadge(item.effective_status)}`}>
                      {item.effective_status}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-surface-500 md:grid-cols-4">
                    <span>{copy.department}: {item.department || copy.general}</span>
                    <span>{copy.dueDate}: {formatDate(item.due_at)}</span>
                    <span>{copy.renewal}: {formatDate(item.renewal_due_at)}</span>
                    <span>{copy.certificate}: {item.certificate_uuid || "-"}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void setAssignmentStatus(item, "in_progress")} className="btn-secondary px-3 py-2 text-xs">{copy.continue}</button>
                    <button type="button" onClick={() => void setAssignmentStatus(item, "completed")} className="btn-secondary px-3 py-2 text-xs">
                      <CheckCircle2 className="h-4 w-4" />
                      {copy.complete}
                    </button>
                    <button type="button" onClick={() => void setAssignmentStatus(item, "waived")} className="btn-secondary px-3 py-2 text-xs">{copy.waived}</button>
                    <button type="button" onClick={() => void removeAssignment(item)} className="btn-secondary px-3 py-2 text-xs text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="surface-panel p-5">
            <h2 className="text-base font-black text-surface-900">{selected ? copy.editAssignment : copy.newAssignment}</h2>
            <div className="mt-4 space-y-3">
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="input-field" placeholder={copy.trainingTitle} />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={form.assignee_name} onChange={(event) => setForm({ ...form, assignee_name: event.target.value })} className="input-field" placeholder={copy.attendeeName} />
                <input value={form.assignee_email} onChange={(event) => setForm({ ...form, assignee_email: event.target.value })} className="input-field" placeholder="E-posta" />
              </div>
              <input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} list="training-departments" className="input-field" placeholder={copy.department} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold text-surface-500">{copy.dueDate}</span>
                  <input type="datetime-local" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} className="input-field mt-1" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-surface-500">{copy.renewalDate}</span>
                  <input type="datetime-local" value={form.renewal_due_at} onChange={(event) => setForm({ ...form, renewal_due_at: event.target.value })} className="input-field mt-1" />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-surface-500">{copy.notifyDays}</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={form.notify_before_days}
                  onChange={(event) => setForm({ ...form, notify_before_days: Number(event.target.value) })}
                  className="input-field mt-1"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={form.evidence_url || ""}
                  onChange={(event) => setForm({ ...form, evidence_url: event.target.value })}
                  className="input-field"
                  placeholder="Kanıt linki"
                />
                <input
                  value={form.evidence_label || ""}
                  onChange={(event) => setForm({ ...form, evidence_label: event.target.value })}
                  className="input-field"
                  placeholder="Kanıt etiketi"
                />
              </div>
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="input-field min-h-[120px]" placeholder={copy.description} />
              <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
                <p className="text-xs font-bold text-surface-600">Bu formdan şablon oluştur</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} className="input-field" placeholder="Şablon adı" />
                  <button type="button" onClick={() => void saveTemplateAndRecurring()} className="btn-secondary justify-center">
                    <Save className="h-4 w-4" />
                    Şablon + recurring
                  </button>
                </div>
              </div>
              <button type="button" onClick={() => void saveAssignment()} disabled={saving} className="btn-primary w-full justify-center">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {copy.save}
              </button>
            </div>
          </section>

          <section className="surface-panel p-5">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-brand-600" />
              <h2 className="text-base font-black text-surface-900">{copy.recommendations}</h2>
            </div>
            <div className="mt-4 space-y-3">
              {recommendations.length === 0 ? (
                <p className="text-sm text-surface-500">{copy.noRecommendations}</p>
              ) : (
                recommendations.map((event) => (
                  <div key={event.id} className="rounded-lg border border-surface-200 bg-white p-3">
                    <p className="font-bold text-surface-900">{event.name}</p>
                    <p className="mt-1 text-xs text-surface-500">{formatDate(event.event_date)} {event.event_location ? `- ${event.event_location}` : ""}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="surface-panel p-5">
            <h2 className="text-base font-black text-surface-900">{copy.departmentReport}</h2>
            <div className="mt-4 space-y-2">
              {(report?.by_department || []).map((row) => (
                <div key={row.department} className="rounded-lg border border-surface-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-surface-900">{row.department}</p>
                    <span className="text-xs font-bold text-surface-500">{row.completed}/{row.total}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-surface-100">
                    <div className="h-2 rounded-full bg-brand-600" style={{ width: `${row.total ? Math.round((row.completed / row.total) * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
    </FeatureGate>
  );
}
