"use client";

import { useEffect, useState } from "react";
import {
  ScheduledReportOut,
  listScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  listReportTypes,
} from "@/lib/api";

const FREQUENCIES = [
  { value: "daily", label: "Günlük" },
  { value: "weekly", label: "Haftalık" },
  { value: "monthly", label: "Aylık" },
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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ScheduledReportsPage() {
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
      setError(e instanceof Error ? e.message : "Yüklenemedi");
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
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
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
      setError(e instanceof Error ? e.message : "Silinemedi");
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Yükleniyor…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Zamanlanmış Raporlar</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
        >
          + Yeni Rapor
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">kapat</button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId !== null ? "Raporu Düzenle" : "Yeni Rapor"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rapor Adı</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Haftalık Eğitim Özeti"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rapor Tipi</label>
                <select
                  value={form.report_type}
                  onChange={(e) => setForm({ ...form, report_type: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">Seçiniz…</option>
                  {types.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sıklık</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alıcılar (virgül veya yeni satırla ayırın)
                </label>
                <textarea
                  value={form.recipients}
                  onChange={(e) => setForm({ ...form, recipients: e.target.value })}
                  placeholder="ornek@sirket.com, diger@sirket.com"
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
                <label htmlFor="active-toggle" className="text-sm text-gray-700">Aktif</label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.report_type}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold mb-3">Raporu Sil</h3>
            <p className="text-sm text-gray-600 mb-5">Bu zamanlanmış raporu silmek istediğinizden emin misiniz?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteId(null)} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
                İptal
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {reports.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm">Henüz zamanlanmış rapor yok.</p>
          <button onClick={openCreate} className="mt-3 text-blue-600 text-sm underline">
            İlk raporu oluştur
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Ad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Tip</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Sıklık</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Alıcılar</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Son Çalışma</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Sonraki Çalışma</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">Durum</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.report_type_label}</td>
                  <td className="px-4 py-3 capitalize">
                    {FREQUENCIES.find((f) => f.value === r.frequency)?.label ?? r.frequency}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.recipients.length === 0 ? (
                      <span className="text-gray-400 italic">—</span>
                    ) : (
                      <span title={r.recipients.join("\n")}>
                        {r.recipients[0]}
                        {r.recipients.length > 1 && (
                          <span className="ml-1 text-xs text-gray-400">+{r.recipients.length - 1}</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(r.last_run_at)}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(r.next_run_at)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {r.active ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(r)}
                      className="text-blue-600 hover:underline text-xs mr-3"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => setDeleteId(r.id)}
                      className="text-red-500 hover:underline text-xs"
                    >
                      Sil
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
