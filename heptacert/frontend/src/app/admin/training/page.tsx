"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
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
  deleteTrainingAssignment,
  getTrainingReport,
  listRenewalRecommendations,
  listTrainingAssignments,
  sendTrainingRenewalNotifications,
  updateTrainingAssignment,
  type RenewalRecommendation,
  type TrainingAssignment,
  type TrainingReport,
} from "@/lib/api";

const STATUS_OPTIONS = [
  { value: "assigned", label: "Atandi" },
  { value: "in_progress", label: "Devam ediyor" },
  { value: "completed", label: "Tamamlandi" },
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
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [report, setReport] = useState<TrainingReport | null>(null);
  const [recommendations, setRecommendations] = useState<RenewalRecommendation[]>([]);
  const [selected, setSelected] = useState<TrainingAssignment | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const departments = useMemo(() => {
    const values = new Set<string>();
    assignments.forEach((item) => {
      if (item.department) values.add(item.department);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [assignments]);

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
      setAssignments(rows);
      setReport(nextReport);
      setRecommendations(nextRecommendations);
      if (selected) {
        const updated = rows.find((item) => item.id === selected.id) || null;
        setSelected(updated);
        fillForm(updated);
      }
    } catch (ex: any) {
      setError(ex?.message || "Egitim verileri yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function saveAssignment() {
    if (!form.title || !form.assignee_name || !form.assignee_email) {
      setError("Baslik, kisi ve e-posta gerekli.");
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
        department: form.department || null,
        due_at: fromDateTimeInput(form.due_at),
        renewal_due_at: fromDateTimeInput(form.renewal_due_at),
        notify_before_days: Number(form.notify_before_days) || 30,
        description: form.description || null,
      };
      const saved = selected
        ? await updateTrainingAssignment(selected.id, payload)
        : await createTrainingAssignment({ ...payload, status: "assigned", required: true });
      setSelected(saved);
      fillForm(saved);
      setNotice("Egitim atamasi kaydedildi.");
      await loadAll();
    } catch (ex: any) {
      setError(ex?.message || "Egitim atamasi kaydedilemedi.");
    } finally {
      setSaving(false);
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
      setError(ex?.message || "Durum guncellenemedi.");
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
      setError(ex?.message || "Atama silinemedi.");
    }
  }

  async function sendNotifications() {
    setNotice(null);
    setError(null);
    try {
      const result = await sendTrainingRenewalNotifications();
      setNotice(`Bildirim sonucu: ${result.sent} gonderildi, ${result.skipped} atlandi, ${result.failed} hata.`);
      await loadAll();
    } catch (ex: any) {
      setError(ex?.message || "Bildirimler gonderilemedi.");
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Training compliance</p>
          <h1 className="mt-2 text-2xl font-black text-surface-900">Egitim ve Yenileme Takibi</h1>
          <p className="mt-2 max-w-2xl text-sm text-surface-500">
            Zorunlu egitim atamalari, departman raporlari, tamamlanma durumu ve sertifika yenileme tarihlerini takip edin.
          </p>
        </div>
        <button type="button" onClick={() => void sendNotifications()} className="btn-secondary justify-center">
          <Bell className="h-4 w-4" />
          Bildirimleri calistir
        </button>
      </div>

      {error && <div className="error-banner text-sm">{error}</div>}
      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{notice}</div>}

      <section className="grid gap-3 md:grid-cols-5">
        {[
          ["Toplam", report?.total || 0],
          ["Tamamlanan", report?.completed || 0],
          ["Geciken", report?.overdue || 0],
          ["14 gun", report?.due_soon || 0],
          ["Yenileme", report?.renewal_due_soon || 0],
        ].map(([label, value]) => (
          <div key={label} className="surface-panel p-4">
            <p className="text-xs font-bold text-surface-500">{label}</p>
            <p className="mt-1 text-2xl font-black text-surface-900">{value}</p>
          </div>
        ))}
      </section>

      <section className="surface-panel p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input-field pl-9"
              placeholder="Baslik, kisi veya e-posta ara"
            />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="input-field">
            <option value="">Tum durumlar</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input value={department} onChange={(event) => setDepartment(event.target.value)} list="training-departments" className="input-field" placeholder="Departman" />
          <datalist id="training-departments">
            {departments.map((item) => <option key={item} value={item} />)}
          </datalist>
          <button type="button" onClick={() => void loadAll()} className="btn-primary justify-center">
            <RefreshCcw className="h-4 w-4" />
            Yenile
          </button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-surface-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-brand-600" />
              <h2 className="text-base font-black text-surface-900">Atamalar</h2>
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
              Yeni
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
          ) : assignments.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-surface-500">Henuz egitim atamasi yok.</div>
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
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusBadge(item.effective_status)}`}>
                      {item.effective_status}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-surface-500 md:grid-cols-4">
                    <span>Departman: {item.department || "Genel"}</span>
                    <span>Son tarih: {formatDate(item.due_at)}</span>
                    <span>Yenileme: {formatDate(item.renewal_due_at)}</span>
                    <span>Sertifika: {item.certificate_uuid || "-"}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => void setAssignmentStatus(item, "in_progress")} className="btn-secondary px-3 py-2 text-xs">Devam</button>
                    <button type="button" onClick={() => void setAssignmentStatus(item, "completed")} className="btn-secondary px-3 py-2 text-xs">
                      <CheckCircle2 className="h-4 w-4" />
                      Tamamla
                    </button>
                    <button type="button" onClick={() => void setAssignmentStatus(item, "waived")} className="btn-secondary px-3 py-2 text-xs">Muaf</button>
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
            <h2 className="text-base font-black text-surface-900">{selected ? "Atamayi duzenle" : "Yeni atama"}</h2>
            <div className="mt-4 space-y-3">
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="input-field" placeholder="Egitim basligi" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={form.assignee_name} onChange={(event) => setForm({ ...form, assignee_name: event.target.value })} className="input-field" placeholder="Katilimci adi" />
                <input value={form.assignee_email} onChange={(event) => setForm({ ...form, assignee_email: event.target.value })} className="input-field" placeholder="E-posta" />
              </div>
              <input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} className="input-field" placeholder="Departman" />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold text-surface-500">Son tarih</span>
                  <input type="datetime-local" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} className="input-field mt-1" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-surface-500">Yenileme tarihi</span>
                  <input type="datetime-local" value={form.renewal_due_at} onChange={(event) => setForm({ ...form, renewal_due_at: event.target.value })} className="input-field mt-1" />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-surface-500">Bildirim gunu</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={form.notify_before_days}
                  onChange={(event) => setForm({ ...form, notify_before_days: Number(event.target.value) })}
                  className="input-field mt-1"
                />
              </label>
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="input-field min-h-[120px]" placeholder="Aciklama" />
              <button type="button" onClick={() => void saveAssignment()} disabled={saving} className="btn-primary w-full justify-center">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Kaydet
              </button>
            </div>
          </section>

          <section className="surface-panel p-5">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-brand-600" />
              <h2 className="text-base font-black text-surface-900">Yenileme onerileri</h2>
            </div>
            <div className="mt-4 space-y-3">
              {recommendations.length === 0 ? (
                <p className="text-sm text-surface-500">Uygun etkinlik onerisi bulunamadi.</p>
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
            <h2 className="text-base font-black text-surface-900">Departman raporu</h2>
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
  );
}
