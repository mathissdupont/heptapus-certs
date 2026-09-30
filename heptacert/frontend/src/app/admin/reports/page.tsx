"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useState } from "react";
import {
  ScheduledReportOut,
  listScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  listReportTypes,
} from "@/lib/api";
import { useI18n, translate } from "@/lib/i18n";
import EventSummaryExport from "@/components/Admin/EventSummaryExport";

const FREQUENCIES_TR = [
  { value: "daily", label: "Günlük" },
  { value: "weekly", label: "Haftalık" },
  { value: "monthly", label: "Aylık" },
];

const FREQUENCIES_EN = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

type FormState = {
  name: string;
  report_type: string;
  frequency: string;
  recipients: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  report_type: "",
  frequency: "weekly",
  recipients: "",
  active: true,
};

function formatDate(iso: string | null, lang?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(localeTag(lang), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ScheduledReportsPage() {
  const { lang } = useI18n();
  const copy = { pageTitle: translate(lang, "migrated_app_admin_reports_scheduled_reports_925b4af2"), btnNewReport: translate(lang, "migrated_app_admin_reports_new_report_3940b681"), errorClose: translate(lang, "migrated_app_admin_reports_close_daec5c26"), formTitleCreate: translate(lang, "migrated_app_admin_reports_new_report_f1e6a37c"), formTitleEdit: translate(lang, "migrated_app_admin_reports_edit_report_26e2bf50"), labelReportName: translate(lang, "migrated_app_admin_reports_report_name_cfebd950"), placeholderReportName: translate(lang, "migrated_app_admin_reports_weekly_training_summary_9e9e7294"), labelReportType: translate(lang, "migrated_app_admin_reports_report_type_f33a0599"), selectPlaceholder: translate(lang, "migrated_app_admin_reports_select_d8acf8e6"), labelFrequency: translate(lang, "migrated_app_admin_reports_frequency_f11d28b7"), labelRecipients: translate(lang, "migrated_app_admin_reports_recipients_separate_by_comma_or_new_line_37e681c5"), placeholderRecipients: translate(lang, "migrated_app_admin_reports_example_company_com_other_company_com_8642e0b4"), labelActive: translate(lang, "migrated_app_admin_reports_active_0de533ab"), btnCancel: translate(lang, "migrated_app_admin_reports_cancel_9a2d50ff"), btnSave: translate(lang, "migrated_app_admin_reports_save_19e2e23a"), btnSaving: translate(lang, "migrated_app_admin_reports_saving_fb0c4c65"), deleteTitle: translate(lang, "migrated_app_admin_reports_delete_report_0203b1d9"), deleteConfirm: translate(lang, "migrated_app_admin_reports_are_you_sure_you_want_to_delete_this_sched_b1238e0b"), btnDelete: translate(lang, "migrated_app_admin_reports_delete_5a3d04f9"), emptyTitle: translate(lang, "migrated_app_admin_reports_no_scheduled_reports_yet_e833ac78"), emptyAction: translate(lang, "migrated_app_admin_reports_create_the_first_report_3a537756"), tableColName: translate(lang, "migrated_app_admin_reports_name_aa8977cc"), tableColType: translate(lang, "migrated_app_admin_reports_type_e5cffeef"), tableColFrequency: translate(lang, "migrated_app_admin_reports_frequency_9e021b94"), tableColRecipients: translate(lang, "migrated_app_admin_reports_recipients_c9ff72c8"), tableColLastRun: translate(lang, "migrated_app_admin_reports_last_run_cd5aec28"), tableColNextRun: translate(lang, "migrated_app_admin_reports_next_run_3257bf22"), tableColStatus: translate(lang, "migrated_app_admin_reports_status_370efdb2"), statusActive: translate(lang, "migrated_app_admin_reports_active_5f815b90"), statusInactive: translate(lang, "migrated_app_admin_reports_inactive_75ffe200"), btnEdit: translate(lang, "migrated_app_admin_reports_edit_30c96173"), btnDeleteRow: translate(lang, "migrated_app_admin_reports_delete_4b255114"), loading: translate(lang, "migrated_app_admin_reports_loading_adce8153"), errLoad: translate(lang, "migrated_app_admin_reports_failed_to_load_ab757800"), errSave: translate(lang, "migrated_app_admin_reports_failed_to_save_985c4a26"), errDelete: translate(lang, "migrated_app_admin_reports_failed_to_delete_80b14006"), frequencies: [{ value: "daily", label: translate(lang, "migrated_app_admin_reports_daily_d0b58bad") }, { value: "weekly", label: translate(lang, "migrated_app_admin_reports_weekly_6bcc73e9") }, { value: "monthly", label: translate(lang, "migrated_app_admin_reports_monthly_d3a8e818") }] };

  const [reports, setReports] = useState<ScheduledReportOut[]>([]);
  const [types, setTypes] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [r, t] = await Promise.all([listScheduledReports(), listReportTypes()]);
      setReports(r);
      setTypes(t);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy.errLoad);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(r: ScheduledReportOut) {
    setEditingId(r.id);
    setForm({
      name: r.name,
      report_type: r.report_type,
      frequency: r.frequency,
      recipients: r.recipients.join(", "),
      active: r.active,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.report_type) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        report_type: form.report_type,
        frequency: form.frequency,
        recipients: form.recipients
          .split(/[\n,;]+/)
          .map((e) => e.trim())
          .filter((e) => e.includes("@")),
        active: form.active,
      };
      if (editingId !== null) {
        await updateScheduledReport(editingId, payload);
      } else {
        await createScheduledReport(payload);
      }
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy.errSave);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteScheduledReport(id);
      setDeleteId(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy.errDelete);
    }
  }

  if (loading) return <div className="p-8 text-content-muted">{copy.loading}</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <EventSummaryExport />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{copy.pageTitle}</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
        >
          {copy.btnNewReport}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-status-danger-bg border border-status-danger-border text-status-danger-content rounded text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">{copy.errorClose}</button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-raised rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId !== null ? copy.formTitleEdit : copy.formTitleCreate}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">{copy.labelReportName}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={copy.placeholderReportName}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">{copy.labelReportType}</label>
                <select
                  value={form.report_type}
                  onChange={(e) => setForm({ ...form, report_type: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">{copy.selectPlaceholder}</option>
                  {types.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">{copy.labelFrequency}</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  {copy.frequencies.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">
                  {copy.labelRecipients}
                </label>
                <textarea
                  value={form.recipients}
                  onChange={(e) => setForm({ ...form, recipients: e.target.value })}
                  placeholder={copy.placeholderRecipients}
                  rows={3}
                  className="w-full border rounded px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active-toggle"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="active-toggle" className="text-sm text-content-secondary">{copy.labelActive}</label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-canvas"
              >
                {copy.btnCancel}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.report_type}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? copy.btnSaving : copy.btnSave}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-raised rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold mb-3">{copy.deleteTitle}</h3>
            <p className="text-sm text-content-secondary mb-5">{copy.deleteConfirm}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="px-3 py-1.5 text-sm border rounded hover:bg-canvas">
                {copy.btnCancel}
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                {copy.btnDelete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {reports.length === 0 ? (
        <div className="text-center py-16 text-content-muted">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm">{copy.emptyTitle}</p>
          <button onClick={openCreate} className="mt-3 text-status-info-content text-sm underline">
            {copy.emptyAction}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-canvas">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-content-secondary">{copy.tableColName}</th>
                <th className="text-left px-4 py-3 font-medium text-content-secondary">{copy.tableColType}</th>
                <th className="text-left px-4 py-3 font-medium text-content-secondary">{copy.tableColFrequency}</th>
                <th className="text-left px-4 py-3 font-medium text-content-secondary">{copy.tableColRecipients}</th>
                <th className="text-left px-4 py-3 font-medium text-content-secondary">{copy.tableColLastRun}</th>
                <th className="text-left px-4 py-3 font-medium text-content-secondary">{copy.tableColNextRun}</th>
                <th className="text-left px-4 py-3 font-medium text-content-secondary">{copy.tableColStatus}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-canvas">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-content-secondary">{r.report_type_label}</td>
                  <td className="px-4 py-3 capitalize">
                    {copy.frequencies.find((f) => f.value === r.frequency)?.label ?? r.frequency}
                  </td>
                  <td className="px-4 py-3 text-content-secondary">
                    {r.recipients.length === 0 ? (
                      <span className="text-content-muted italic">—</span>
                    ) : (
                      <span title={r.recipients.join("\n")}>
                        {r.recipients[0]}
                        {r.recipients.length > 1 && (
                          <span className="ml-1 text-xs text-content-muted">+{r.recipients.length - 1}</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-content-secondary whitespace-nowrap">{formatDate(r.last_run_at, lang)}</td>
                  <td className="px-4 py-3 text-content-secondary whitespace-nowrap">{formatDate(r.next_run_at, lang)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.active
                          ? "bg-status-success-bg text-status-success-content"
                          : "bg-sunken text-content-secondary"
                      }`}
                    >
                      {r.active ? copy.statusActive : copy.statusInactive}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(r)}
                      className="text-status-info-content hover:underline text-xs mr-3"
                    >
                      {copy.btnEdit}
                    </button>
                    <button
                      onClick={() => setDeleteId(r.id)}
                      className="text-status-danger-content hover:underline text-xs"
                    >
                      {copy.btnDeleteRow}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
