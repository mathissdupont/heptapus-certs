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

function formatDate(iso: string | null, lang: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(iso: string, lang: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(lang === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ValidityBadge({ isValid, validUntil, lang }: { isValid: boolean; validUntil: string | null; lang: string }) {
  const labels =
    lang === "tr"
      ? { indefinite: "Süresiz", valid: "Geçerli", expired: "Süresi doldu" }
      : { indefinite: "Indefinite", valid: "Valid", expired: "Expired" };

  if (!validUntil) return <span className="badge-neutral">{labels.indefinite}</span>;
  return <span className={isValid ? "badge-active" : "badge-expired"}>{isValid ? labels.valid : labels.expired}</span>;
}

export default function AccreditationPage() {
  const { lang } = useI18n();
  const isTr = lang === "tr";
  const [activeTab, setActiveTab] = useState<Tab>("accreditations");

  const copy = isTr
    ? {
        tabAccreditations: "Akreditasyonlar",
        tabCpd: "CPD Özeti",
        pageTitle: "Akreditasyon",
        pageSubtitle: "Kurum akreditasyonlarını ve CPD kayıtlarını tek panelden yönetin.",
        newRecord: "Yeni kayıt",
        closeError: "kapat",
        formTitleEdit: "Kaydı düzenle",
        formTitleCreate: "Yeni akreditasyon kaydı",
        labelOrg: "Kuruluş",
        selectPlaceholder: "Seçiniz...",
        labelAccredNumber: "Akreditasyon numarası",
        labelValidFrom: "Geçerlilik başlangıcı",
        labelValidUntil: "Geçerlilik bitişi",
        labelNotes: "Notlar",
        cancel: "İptal",
        save: "Kaydet",
        saving: "Kaydediliyor...",
        deleteTitle: "Kaydı sil",
        deleteConfirm: "Bu akreditasyon kaydını silmek istediğinizden emin misiniz?",
        delete: "Sil",
        emptyState: "Henüz akreditasyon kaydı yok.",
        emptyStateAction: "İlk kaydı oluştur",
        recordNo: "Kayıt no:",
        start: "Başlangıç:",
        end: "Bitiş:",
        edit: "Düzenle",
        loading: "Yükleniyor...",
        errorLoad: "Yüklenemedi",
        errorSave: "Kaydedilemedi",
        errorDelete: "Silinemedi",
        cpdTitle: "CPD Özeti",
        cpdSubtitle: "Sertifika verilen üyelerin biriktirdiği CPD saatleri.",
        cpdBodyCard_hours: "toplam saat",
        cpdBodyCard_members: "üye",
        cpdBodyCard_logs: "kayıt",
        cpdRecentTitle: "Son CPD kayıtları",
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
        pageSubtitle: "Manage organization accreditations and CPD records from one place.",
        newRecord: "New record",
        closeError: "close",
        formTitleEdit: "Edit record",
        formTitleCreate: "New accreditation record",
        labelOrg: "Organization",
        selectPlaceholder: "Select...",
        labelAccredNumber: "Accreditation number",
        labelValidFrom: "Valid from",
        labelValidUntil: "Valid until",
        labelNotes: "Notes",
        cancel: "Cancel",
        save: "Save",
        saving: "Saving...",
        deleteTitle: "Delete record",
        deleteConfirm: "Are you sure you want to delete this accreditation record?",
        delete: "Delete",
        emptyState: "No accreditation records yet.",
        emptyStateAction: "Create the first record",
        recordNo: "Record no:",
        start: "Start:",
        end: "End:",
        edit: "Edit",
        loading: "Loading...",
        errorLoad: "Could not load",
        errorSave: "Could not save",
        errorDelete: "Could not delete",
        cpdTitle: "CPD Summary",
        cpdSubtitle: "CPD hours accumulated by members who received certificates.",
        cpdBodyCard_hours: "total hours",
        cpdBodyCard_members: "members",
        cpdBodyCard_logs: "entries",
        cpdRecentTitle: "Recent CPD entries",
        cpdNoData: "No CPD entries yet. Add a CPD configuration to an event and issue certificates.",
        cpdMember: "Member",
        cpdEvent: "Event",
        cpdBody: "Body",
        cpdHours: "Hours",
        cpdDate: "Date",
      };

  const [accreditations, setAccreditations] = useState<OrgAccreditationOut[]>([]);
  const [bodies, setBodies] = useState<AccreditationBodyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
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
      setCpdSummary(await getOrgCpdSummary());
    } catch (e: unknown) {
      setCpdError(e instanceof Error ? e.message : copy.errorLoad);
    } finally {
      setCpdLoading(false);
    }
  }

  useEffect(() => {
    void loadAccreditations();
  }, []);

  useEffect(() => {
    if (activeTab === "cpd" && !cpdSummary && !cpdLoading) void loadCpd();
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
      if (editingId !== null) await updateOrgAccreditation(editingId, payload);
      else await createOrgAccreditation(payload);
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
    <div className="page-content mx-auto max-w-5xl px-4 py-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">{copy.pageTitle}</h1>
          <p className="page-subtitle">{copy.pageSubtitle}</p>
        </div>
        {activeTab === "accreditations" && (
          <button type="button" onClick={openCreate} className="btn-primary">
            {copy.newRecord}
          </button>
        )}
      </div>

      <div className="tab-group w-fit">
        {(["accreditations", "cpd"] as Tab[]).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={activeTab === tab ? "tab-btn-active" : "tab-btn"}>
            {tab === "accreditations" ? copy.tabAccreditations : copy.tabCpd}
          </button>
        ))}
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="font-semibold underline">
            {copy.closeError}
          </button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-lg p-6 shadow-modal">
            <h2 className="card-title text-base">{editingId !== null ? copy.formTitleEdit : copy.formTitleCreate}</h2>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="label">{copy.labelOrg}</span>
                <select value={form.body_id} onChange={(e) => setForm({ ...form, body_id: e.target.value })} className="input">
                  <option value="">{copy.selectPlaceholder}</option>
                  {bodies.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.short_code} - {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">{copy.labelAccredNumber}</span>
                <input className="input" type="text" value={form.accreditation_number} onChange={(e) => setForm({ ...form, accreditation_number: e.target.value })} placeholder="ORN-2024-001" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="label">{copy.labelValidFrom}</span>
                  <input className="input" type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
                </label>
                <label className="block">
                  <span className="label">{copy.labelValidUntil}</span>
                  <input className="input" type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
                </label>
              </div>
              <label className="block">
                <span className="label">{copy.labelNotes}</span>
                <textarea className="input min-h-20" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{copy.cancel}</button>
              <button type="button" onClick={handleSave} disabled={saving || !form.body_id} className="btn-primary">{saving ? copy.saving : copy.save}</button>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-sm p-6 shadow-modal">
            <h3 className="card-title text-base">{copy.deleteTitle}</h3>
            <p className="body-sm mt-3">{copy.deleteConfirm}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteId(null)} className="btn-secondary">{copy.cancel}</button>
              <button type="button" onClick={() => void handleDelete(deleteId)} className="btn-danger">{copy.delete}</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "accreditations" && (
        <section className="section">
          {loading ? (
            <div className="card p-8 text-sm text-surface-400">{copy.loading}</div>
          ) : accreditations.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon">CPD</div>
              <p className="empty-state-title">{copy.emptyState}</p>
              <button type="button" onClick={openCreate} className="btn-secondary">{copy.emptyStateAction}</button>
            </div>
          ) : (
            <div className="grid gap-4">
              {accreditations.map((a) => (
                <div key={a.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-brand-700">{a.body_code}</span>
                        <span className="font-semibold text-surface-900">{a.body_name}</span>
                        <ValidityBadge isValid={a.is_valid} validUntil={a.valid_until} lang={lang} />
                      </div>
                      {a.accreditation_number && <p className="body-sm mt-2">{copy.recordNo} {a.accreditation_number}</p>}
                      <div className="mt-1 flex flex-wrap gap-4 text-xs text-surface-400">
                        <span>{copy.start} {formatDate(a.valid_from, lang)}</span>
                        <span>{copy.end} {formatDate(a.valid_until, lang)}</span>
                      </div>
                      {a.notes && <p className="mt-2 text-xs italic text-surface-500">{a.notes}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEdit(a)} className="btn-ghost text-xs">{copy.edit}</button>
                      <button type="button" onClick={() => setDeleteId(a.id)} className="btn-ghost text-xs text-red-600 hover:bg-red-50">{copy.delete}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "cpd" && (
        <section className="section">
          <div>
            <h2 className="card-title">{copy.cpdTitle}</h2>
            <p className="card-meta">{copy.cpdSubtitle}</p>
          </div>
          {cpdLoading && <div className="card p-8 text-sm text-surface-400">{copy.loading}</div>}
          {cpdError && <div className="error-banner">{cpdError}</div>}
          {!cpdLoading && cpdSummary && (
            <>
              {cpdSummary.total_logs === 0 ? (
                <div className="card empty-state">
                  <div className="empty-state-icon">CPD</div>
                  <p className="empty-state-body">{copy.cpdNoData}</p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      { value: cpdSummary.total_hours, label: copy.cpdBodyCard_hours },
                      { value: cpdSummary.total_members, label: copy.cpdBodyCard_members },
                      { value: cpdSummary.total_logs, label: copy.cpdBodyCard_logs },
                    ].map(({ value, label }) => (
                      <div key={label} className="card p-5">
                        <p className="text-2xl font-bold text-surface-900">{value}</p>
                        <p className="card-meta">{label}</p>
                      </div>
                    ))}
                  </div>

                  {cpdSummary.by_body.length > 0 && (
                    <div className="grid gap-3">
                      {cpdSummary.by_body.map((b) => (
                        <div key={b.body_id} className="card flex items-center justify-between gap-4 p-5">
                          <div className="flex items-center gap-2.5">
                            <span className="badge-neutral font-mono">{b.body_code}</span>
                            <span className="font-semibold text-surface-900">{b.body_name}</span>
                          </div>
                          <div className="flex gap-6">
                            <div className="text-right">
                              <p className="text-sm font-bold text-surface-900">{b.total_hours}</p>
                              <p className="text-xs text-surface-400">{copy.cpdBodyCard_hours}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-surface-900">{b.member_count}</p>
                              <p className="text-xs text-surface-400">{copy.cpdBodyCard_members}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {cpdSummary.recent_logs.length > 0 && (
                    <div className="table-shell">
                      <div className="border-b border-surface-200 px-5 py-3.5">
                        <h3 className="card-title">{copy.cpdRecentTitle}</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr>
                              <th className="table-th">{copy.cpdMember}</th>
                              <th className="table-th">{copy.cpdEvent}</th>
                              <th className="table-th">{copy.cpdBody}</th>
                              <th className="table-th text-right">{copy.cpdHours}</th>
                              <th className="table-th text-right">{copy.cpdDate}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cpdSummary.recent_logs.map((log) => (
                              <tr key={log.id} className="table-tr-hover">
                                <td className="table-td font-semibold">{log.member_name ?? "-"}</td>
                                <td className="table-td max-w-[220px] truncate">{log.event_name}</td>
                                <td className="table-td"><span className="badge-neutral font-mono">{log.body_code}</span></td>
                                <td className="table-td text-right font-semibold">{log.cpd_hours}</td>
                                <td className="table-td text-right text-xs">{formatDateTime(log.earned_at, lang)}</td>
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
        </section>
      )}
    </div>
  );
}
