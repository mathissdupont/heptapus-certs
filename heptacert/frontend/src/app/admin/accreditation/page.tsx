"use client";

import { useEffect, useState } from "react";
import {
  AccreditationBodyOption,
  OrgAccreditationOut,
  CpdSummaryOut,
  listAccreditationBodies,
  listOrgAccreditations,
  createOrgAccreditation,
  updateOrgAccreditation,
  deleteOrgAccreditation,
  getOrgCpdSummary,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Tab = "accreditations" | "cpd";

type FormState = {
  body_id: string;
  accreditation_number: string;
  valid_from: string;
  valid_until: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  body_id: "",
  accreditation_number: "",
  valid_from: "",
  valid_until: "",
  notes: "",
};

function ValidityBadge({ isValid, validUntil, lang }: { isValid: boolean; validUntil: string | null; lang: string }) {
  const labels =
    lang === "tr"
      ? { indefinite: "Süresiz", valid: "Geçerli", expired: "Süresi Doldu" }
      : { indefinite: "Indefinite", valid: "Valid", expired: "Expired" };

  if (!validUntil) return <span className="text-xs text-gray-400">{labels.indefinite}</span>;
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        isValid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
      }`}
    >
      {isValid ? labels.valid : labels.expired}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateTime(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AccreditationPage() {
  const { lang } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>("accreditations");

  const copy =
    lang === "tr"
      ? {
          tabAccreditations: "Akreditasyonlar",
          tabCpd: "CPD Özeti",
          pageTitle: "Akreditasyon",
          newRecord: "+ Yeni Kayıt",
          closeError: "kapat",
          formTitleEdit: "Kaydı Düzenle",
          formTitleCreate: "Yeni Akreditasyon Kaydı",
          labelOrg: "Kuruluş",
          selectPlaceholder: "Seçiniz…",
          labelAccredNumber: "Akreditasyon Numarası",
          labelValidFrom: "Geçerlilik Başlangıcı",
          labelValidUntil: "Geçerlilik Bitişi",
          labelNotes: "Notlar",
          cancel: "İptal",
          save: "Kaydet",
          saving: "Kaydediliyor…",
          deleteTitle: "Kaydı Sil",
          deleteConfirm: "Bu akreditasyon kaydını silmek istediğinizden emin misiniz?",
          delete: "Sil",
          emptyState: "Henüz akreditasyon kaydı yok.",
          emptyStateAction: "İlk kaydı oluştur",
          recordNo: "Kayıt No:",
          start: "Başlangıç:",
          end: "Bitiş:",
          edit: "Düzenle",
          loading: "Yükleniyor…",
          errorLoad: "Yüklenemedi",
          errorSave: "Kaydedilemedi",
          errorDelete: "Silinemedi",
          cpdTitle: "CPD Özeti",
          cpdSubtitle: "Sertifika verilen üyelerin biriktirdiği CPD saatleri.",
          cpdBodyCard_hours: "toplam saat",
          cpdBodyCard_members: "üye",
          cpdBodyCard_logs: "kayıt",
          cpdRecentTitle: "Son CPD Kayıtları",
          cpdNoData: "Henüz CPD kaydı yok. Bir etkinliğe CPD konfigürasyonu ekleyin ve sertifika verin.",
          cpdMember: "Üye",
          cpdEvent: "Etkinlik",
          cpdBody: "Kurum",
          cpdHours: "Saat",
          cpdDate: "Tarih",
        }
      : {
          tabAccreditations: "Accreditations",
          tabCpd: "CPD Summary",
          pageTitle: "Accreditation",
          newRecord: "+ New Record",
          closeError: "close",
          formTitleEdit: "Edit Record",
          formTitleCreate: "New Accreditation Record",
          labelOrg: "Organization",
          selectPlaceholder: "Select…",
          labelAccredNumber: "Accreditation Number",
          labelValidFrom: "Valid From",
          labelValidUntil: "Valid Until",
          labelNotes: "Notes",
          cancel: "Cancel",
          save: "Save",
          saving: "Saving…",
          deleteTitle: "Delete Record",
          deleteConfirm: "Are you sure you want to delete this accreditation record?",
          delete: "Delete",
          emptyState: "No accreditation records yet.",
          emptyStateAction: "Create the first record",
          recordNo: "Record No:",
          start: "Start:",
          end: "End:",
          edit: "Edit",
          loading: "Loading…",
          errorLoad: "Could not load",
          errorSave: "Could not save",
          errorDelete: "Could not delete",
          cpdTitle: "CPD Summary",
          cpdSubtitle: "CPD hours accumulated by members who received certificates.",
          cpdBodyCard_hours: "total hours",
          cpdBodyCard_members: "members",
          cpdBodyCard_logs: "entries",
          cpdRecentTitle: "Recent CPD Entries",
          cpdNoData: "No CPD entries yet. Add a CPD configuration to an event and issue certificates.",
          cpdMember: "Member",
          cpdEvent: "Event",
          cpdBody: "Body",
          cpdHours: "Hours",
          cpdDate: "Date",
        };

  // Accreditations tab state
  const [accreditations, setAccreditations] = useState<OrgAccreditationOut[]>([]);
  const [bodies, setBodies] = useState<AccreditationBodyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // CPD tab state
  const [cpdSummary, setCpdSummary] = useState<CpdSummaryOut | null>(null);
  const [cpdLoading, setCpdLoading] = useState(false);
  const [cpdError, setCpdError] = useState<string | null>(null);

  async function loadAccreditations() {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([listOrgAccreditations(), listAccreditationBodies()]);
      setAccreditations(a);
      setBodies(b);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy.errorLoad);
    } finally {
      setLoading(false);
    }
  }

  async function loadCpd() {
    setCpdLoading(true);
    setCpdError(null);
    try {
      const data = await getOrgCpdSummary();
      setCpdSummary(data);
    } catch (e: unknown) {
      setCpdError(e instanceof Error ? e.message : copy.errorLoad);
    } finally {
      setCpdLoading(false);
    }
  }

  useEffect(() => { loadAccreditations(); }, []);

  useEffect(() => {
    if (activeTab === "cpd" && !cpdSummary && !cpdLoading) {
      loadCpd();
    }
  }, [activeTab]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(a: OrgAccreditationOut) {
    setEditingId(a.id);
    setForm({
      body_id: String(a.body_id),
      accreditation_number: a.accreditation_number ?? "",
      valid_from: a.valid_from ? a.valid_from.slice(0, 10) : "",
      valid_until: a.valid_until ? a.valid_until.slice(0, 10) : "",
      notes: a.notes ?? "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.body_id) return;
    setSaving(true);
    try {
      const payload = {
        body_id: Number(form.body_id),
        accreditation_number: form.accreditation_number || null,
        valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        notes: form.notes || null,
      };
      if (editingId !== null) {
        await updateOrgAccreditation(editingId, payload);
      } else {
        await createOrgAccreditation(payload);
      }
      setShowForm(false);
      await loadAccreditations();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy.errorSave);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteOrgAccreditation(id);
      setDeleteId(null);
      await loadAccreditations();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy.errorDelete);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{copy.pageTitle}</h1>
        {activeTab === "accreditations" && (
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 font-medium"
          >
            {copy.newRecord}
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-100 mb-6">
        {(["accreditations", "cpd"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "accreditations" ? copy.tabAccreditations : copy.tabCpd}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">{copy.closeError}</button>
        </div>
      )}

      {/* ── Accreditations Tab ── */}
      {activeTab === "accreditations" && (
        <>
          {/* Form modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
                <h2 className="text-lg font-semibold mb-4">
                  {editingId !== null ? copy.formTitleEdit : copy.formTitleCreate}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{copy.labelOrg}</label>
                    <select
                      value={form.body_id}
                      onChange={(e) => setForm({ ...form, body_id: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">{copy.selectPlaceholder}</option>
                      {bodies.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.short_code} — {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{copy.labelAccredNumber}</label>
                    <input
                      type="text"
                      value={form.accreditation_number}
                      onChange={(e) => setForm({ ...form, accreditation_number: e.target.value })}
                      placeholder="ÖRN-2024-001"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{copy.labelValidFrom}</label>
                      <input
                        type="date"
                        value={form.valid_from}
                        onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{copy.labelValidUntil}</label>
                      <input
                        type="date"
                        value={form.valid_until}
                        onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{copy.labelNotes}</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">
                    {copy.cancel}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !form.body_id}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? copy.saving : copy.save}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete confirm */}
          {deleteId !== null && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
                <h3 className="text-base font-semibold mb-3">{copy.deleteTitle}</h3>
                <p className="text-sm text-gray-600 mb-5">{copy.deleteConfirm}</p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setDeleteId(null)} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">
                    {copy.cancel}
                  </button>
                  <button
                    onClick={() => handleDelete(deleteId)}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    {copy.delete}
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-gray-400">{copy.loading}</div>
          ) : accreditations.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-4xl mb-3">🏅</p>
              <p className="text-gray-500 text-sm">{copy.emptyState}</p>
              <button onClick={openCreate} className="mt-3 text-indigo-600 text-sm underline">
                {copy.emptyStateAction}
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {accreditations.map((a) => (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-bold text-indigo-700">{a.body_code}</span>
                        <span className="font-medium text-gray-900">{a.body_name}</span>
                        <ValidityBadge isValid={a.is_valid} validUntil={a.valid_until} lang={lang} />
                      </div>
                      {a.accreditation_number && (
                        <p className="text-sm text-gray-600">{copy.recordNo} {a.accreditation_number}</p>
                      )}
                      <div className="flex gap-4 text-xs text-gray-400 mt-1">
                        <span>{copy.start} {formatDate(a.valid_from)}</span>
                        <span>{copy.end} {formatDate(a.valid_until)}</span>
                      </div>
                      {a.notes && <p className="text-xs text-gray-500 mt-2 italic">{a.notes}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(a)} className="text-blue-600 hover:underline text-xs">
                        {copy.edit}
                      </button>
                      <button onClick={() => setDeleteId(a.id)} className="text-red-500 hover:underline text-xs">
                        {copy.delete}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── CPD Tab ── */}
      {activeTab === "cpd" && (
        <div>
          {cpdLoading && <div className="p-8 text-gray-400">{copy.loading}</div>}
          {cpdError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {cpdError}
            </div>
          )}
          {!cpdLoading && cpdSummary && (
            <>
              {cpdSummary.total_logs === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-gray-500 text-sm max-w-sm mx-auto">{copy.cpdNoData}</p>
                </div>
              ) : (
                <>
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { value: cpdSummary.total_hours, label: copy.cpdBodyCard_hours },
                      { value: cpdSummary.total_members, label: copy.cpdBodyCard_members },
                      { value: cpdSummary.total_logs, label: copy.cpdBodyCard_logs },
                    ].map(({ value, label }) => (
                      <div key={label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <p className="text-2xl font-bold text-gray-900">{value}</p>
                        <p className="text-xs font-medium text-gray-500 mt-1">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* By body cards */}
                  {cpdSummary.by_body.length > 0 && (
                    <div className="grid gap-3 mb-6">
                      {cpdSummary.by_body.map((b) => (
                        <div key={b.body_id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex items-center justify-center rounded-xl bg-indigo-50 px-2.5 py-1 font-mono text-xs font-bold text-indigo-600">{b.body_code}</span>
                            <span className="font-medium text-gray-900">{b.body_name}</span>
                          </div>
                          <div className="flex gap-6">
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">{b.total_hours}</p>
                              <p className="text-xs text-gray-400">{copy.cpdBodyCard_hours}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">{b.member_count}</p>
                              <p className="text-xs text-gray-400">{copy.cpdBodyCard_members}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recent logs table */}
                  {cpdSummary.recent_logs.length > 0 && (
                    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900">{copy.cpdRecentTitle}</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">{copy.cpdMember}</th>
                              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">{copy.cpdEvent}</th>
                              <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">{copy.cpdBody}</th>
                              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">{copy.cpdHours}</th>
                              <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">{copy.cpdDate}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {cpdSummary.recent_logs.map((log) => (
                              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-5 py-3 font-medium text-gray-900">{log.member_name ?? "—"}</td>
                                <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">{log.event_name}</td>
                                <td className="px-5 py-3">
                                  <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-600">{log.body_code}</span>
                                </td>
                                <td className="px-5 py-3 text-right font-semibold text-gray-900">{log.cpd_hours}</td>
                                <td className="px-5 py-3 text-right text-xs text-gray-400">{formatDateTime(log.earned_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
