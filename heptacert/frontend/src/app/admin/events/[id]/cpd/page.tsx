"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AccreditationBodyOption,
  EventCpdOut,
  listAccreditationBodies,
  getEventCpd,
  upsertEventCpd,
  deleteEventCpd,
  apiFetch,
} from "@/lib/api";
import EventAdminNav from "@/components/Admin/EventAdminNav";

const CPD_CATEGORIES = [
  "Teknik Beceriler",
  "Yönetim & Liderlik",
  "İş Dünyası Becerileri",
  "Etik & Uyum",
  "Mesleki Gelişim",
  "Diğer",
];

export default function EventCpdPage() {
  const params = useParams<{ id: string }>();
  const eventId = Number(params.id);

  const [eventName, setEventName] = useState("");
  const [cpd, setCpd] = useState<EventCpdOut | null>(null);
  const [bodies, setBodies] = useState<AccreditationBodyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bodyId, setBodyId] = useState("");
  const [cpdHours, setCpdHours] = useState("");
  const [cpdCategory, setCpdCategory] = useState("");
  const [cpdUnitType, setCpdUnitType] = useState("hours");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch(`/admin/events/${eventId}`) as unknown as Promise<{ id: number; name: string }>,
      listAccreditationBodies(),
      getEventCpd(eventId),
    ]).then(([ev, bs, c]) => {
      setEventName(ev.name);
      setBodies(bs);
      if (c) {
        setCpd(c);
        setEnabled(true);
        setBodyId(String(c.body_id));
        setCpdHours(String(c.cpd_hours));
        setCpdCategory(c.cpd_category ?? "");
        setCpdUnitType(c.cpd_unit_type);
      }
    })
    .catch((e: unknown) => setError(e instanceof Error ? e.message : "Yüklenemedi"))
    .finally(() => setLoading(false));
  }, [eventId]);

  async function handleSave() {
    if (!enabled) {
      // disable = delete
      setSaving(true);
      try {
        await deleteEventCpd(eventId);
        setCpd(null);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Kaydedilemedi");
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!bodyId || !cpdHours) return;
    setSaving(true);
    try {
      const result = await upsertEventCpd(eventId, {
        body_id: Number(bodyId),
        cpd_hours: Number(cpdHours),
        cpd_category: cpdCategory || null,
        cpd_unit_type: cpdUnitType,
      });
      setCpd(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-gray-400">Yükleniyor…</div>;

  return (
    <div>
      <EventAdminNav eventId={eventId} eventName={eventName} active="settings" />

      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-bold mb-1">CPD Ayarları</h1>
        <p className="text-sm text-gray-500 mb-6">
          Bu etkinliği tamamlayan üyeler için sürekli mesleki gelişim (CPD) saati tanımlayın.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {saved && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm">
            Kaydedildi.
          </div>
        )}

        <div className="bg-white rounded-xl border p-6 space-y-5">
          {/* Enable toggle */}
          <div className="flex items-center justify-between pb-4 border-b">
            <div>
              <p className="font-medium text-gray-900">CPD Sertifikasyonunu Etkinleştir</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Katılımcılar bu etkinlik için CPD saati kazanır
              </p>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                enabled ? "bg-indigo-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  enabled ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Akreditasyon Kuruluşu</label>
                <select
                  value={bodyId}
                  onChange={(e) => setBodyId(e.target.value)}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPD Saati</label>
                  <input
                    type="number"
                    min="0.5"
                    max="1000"
                    step="0.5"
                    value={cpdHours}
                    onChange={(e) => setCpdHours(e.target.value)}
                    placeholder="3.0"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birim</label>
                  <select
                    value={cpdUnitType}
                    onChange={(e) => setCpdUnitType(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="hours">Saat</option>
                    <option value="credits">Kredi</option>
                    <option value="points">Puan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPD Kategorisi</label>
                <select
                  value={cpdCategory}
                  onChange={(e) => setCpdCategory(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">Seçiniz…</option>
                  {CPD_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {cpd && (
                <div className="p-3 bg-indigo-50 rounded-lg text-xs text-indigo-700">
                  Mevcut kayıt: <strong>{cpd.body_code}</strong> — {cpd.cpd_hours} {cpd.cpd_unit_type}
                  {cpd.cpd_category ? ` (${cpd.cpd_category})` : ""}
                </div>
              )}
            </>
          )}

          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving || (enabled && (!bodyId || !cpdHours))}
              className="w-full py-2 bg-indigo-600 text-white rounded font-medium text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
