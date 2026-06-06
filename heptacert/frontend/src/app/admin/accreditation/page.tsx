"use client";

import { useEffect, useState } from "react";
import {
  AccreditationBodyOption,
  OrgAccreditationOut,
  listAccreditationBodies,
  listOrgAccreditations,
  createOrgAccreditation,
  updateOrgAccreditation,
  deleteOrgAccreditation,
} from "@/lib/api";

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

function ValidityBadge({ isValid, validUntil }: { isValid: boolean; validUntil: string | null }) {
  if (!validUntil) return <span className="text-xs text-gray-400">Süresiz</span>;
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        isValid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
      }`}
    >
      {isValid ? "Geçerli" : "Süresi Doldu"}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export default function AccreditationPage() {
  const [accreditations, setAccreditations] = useState<OrgAccreditationOut[]>([]);
  const [bodies, setBodies] = useState<AccreditationBodyOption[]>([]);
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
      const [a, b] = await Promise.all([listOrgAccreditations(), listAccreditationBodies()]);
      setAccreditations(a);
      setBodies(b);
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
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteOrgAccreditation(id);
      setDeleteId(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Silinemedi");
    }
  }

  if (loading) return <div className="p-8 text-gray-400">Yükleniyor…</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Akreditasyon Kayıtları</h1>
          <p className="text-sm text-gray-500 mt-1">
            MYK, SMMM ve diğer akreditasyon kuruluşlarındaki kayıtlarınızı yönetin.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 font-medium"
        >
          + Yeni Kayıt
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">kapat</button>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId !== null ? "Kaydı Düzenle" : "Yeni Akreditasyon Kaydı"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kuruluş</label>
                <select
                  value={form.body_id}
                  onChange={(e) => setForm({ ...form, body_id: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">Seçiniz…</option>
                  {bodies.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.short_code} — {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Akreditasyon Numarası</label>
                <input
                  type="text"
                  value={form.accreditation_number}
                  onChange={(e) => setForm({ ...form, accreditation_number: e.target.value })}
                  placeholder="ÖRN-2024-001"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Geçerlilik Başlangıcı</label>
                  <input
                    type="date"
                    value={form.valid_from}
                    onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Geçerlilik Bitişi</label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.body_id}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
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
            <h3 className="text-base font-semibold mb-3">Kaydı Sil</h3>
            <p className="text-sm text-gray-600 mb-5">Bu akreditasyon kaydını silmek istediğinizden emin misiniz?</p>
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

      {/* List */}
      {accreditations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <p className="text-4xl mb-3">🏅</p>
          <p className="text-gray-500 text-sm">Henüz akreditasyon kaydı yok.</p>
          <button onClick={openCreate} className="mt-3 text-indigo-600 text-sm underline">
            İlk kaydı oluştur
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {accreditations.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-indigo-700">{a.body_code}</span>
                    <span className="font-medium text-gray-900">{a.body_name}</span>
                    <ValidityBadge isValid={a.is_valid} validUntil={a.valid_until} />
                  </div>
                  {a.accreditation_number && (
                    <p className="text-sm text-gray-600">Kayıt No: {a.accreditation_number}</p>
                  )}
                  <div className="flex gap-4 text-xs text-gray-400 mt-1">
                    <span>Başlangıç: {formatDate(a.valid_from)}</span>
                    <span>Bitiş: {formatDate(a.valid_until)}</span>
                  </div>
                  {a.notes && <p className="text-xs text-gray-500 mt-2 italic">{a.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(a)}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => setDeleteId(a.id)}
                    className="text-red-500 hover:underline text-xs"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
