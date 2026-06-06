"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  MarketplaceEventOut,
  listMarketplaceCategories,
  updateMarketplaceSettings,
  apiFetch,
} from "@/lib/api";
import EventAdminNav from "@/components/Admin/EventAdminNav";

const CATEGORIES = [
  "Bilgi Teknolojileri",
  "Proje Yönetimi",
  "İnsan Kaynakları",
  "Finans & Muhasebe",
  "Pazarlama",
  "Satış",
  "Üretim & Kalite",
  "Sağlık & Güvenlik",
  "Hukuk & Uyum",
  "Kişisel Gelişim",
  "Liderlik & Yönetim",
  "Diğer",
];

type EventMeta = {
  id: number;
  name: string;
  is_marketplace_listed?: boolean;
  marketplace_category?: string | null;
  marketplace_description?: string | null;
  marketplace_price?: number | null;
};

export default function EventMarketplacePage() {
  const params = useParams<{ id: string }>();
  const eventId = Number(params.id);

  const [event, setEvent] = useState<EventMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [listed, setListed] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    (apiFetch(`/admin/events/${eventId}`).then((r) => r.json()) as Promise<EventMeta>)
      .then((e) => {
        setEvent(e);
        setListed(!!e.is_marketplace_listed);
        setCategory(e.marketplace_category ?? "");
        setDescription(e.marketplace_description ?? "");
        setPrice(e.marketplace_price != null ? String(e.marketplace_price) : "");
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Yüklenemedi"))
      .finally(() => setLoading(false));
  }, [eventId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateMarketplaceSettings(eventId, {
        is_marketplace_listed: listed,
        marketplace_category: category || null,
        marketplace_description: description || null,
        marketplace_price: price ? Number(price) : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-gray-400">Yükleniyor…</div>;
  if (!event) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div>
      <EventAdminNav eventId={eventId} eventName={event.name} active="marketplace" />

      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Marketplace Ayarları</h1>
          {listed && (
            <Link
              href={`/marketplace/${eventId}`}
              target="_blank"
              className="text-indigo-600 text-sm hover:underline"
            >
              Marketplace'te Gör ↗
            </Link>
          )}
        </div>

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
          {/* Toggle */}
          <div className="flex items-center justify-between pb-4 border-b">
            <div>
              <p className="font-medium text-gray-900">Marketplace'te Listele</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Etkinliği public sertifika kataloğunda göster
              </p>
            </div>
            <button
              onClick={() => setListed(!listed)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                listed ? "bg-indigo-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  listed ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {listed && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">Seçiniz…</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marketplace Açıklaması
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Program hakkında kısa ve çekici bir açıklama yazın…"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Katılım Ücreti (₺)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ücretsiz ise boş bırakın"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Boş bırakırsanız "Ücretsiz" olarak gösterilir.</p>
              </div>
            </>
          )}

          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
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
