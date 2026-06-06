"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  MarketplaceEventOut,
  listMarketplaceEvents,
  listMarketplaceCategories,
  updateMarketplaceSettings,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const CATEGORIES_TR = [
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

const CATEGORIES_EN = [
  "Information Technology",
  "Project Management",
  "Human Resources",
  "Finance & Accounting",
  "Marketing",
  "Sales",
  "Production & Quality",
  "Health & Safety",
  "Legal & Compliance",
  "Personal Development",
  "Leadership & Management",
  "Other",
];

type EditState = {
  eventId: number;
  category: string;
  description: string;
  price: string;
};

export default function AdminMarketplacePage() {
  const { lang } = useI18n();
  const copy =
    lang === "tr"
      ? {
          pageTitle: "Marketplace Yönetimi",
          pageSubtitle: "Etkinliklerinizi public marketplace kataloğunda listeleyin.",
          viewMarketplace: "Marketplace'i Gör ↗",
          closeError: "kapat",
          modalTitle: "Marketplace Ayarları",
          labelCategory: "Kategori",
          selectPlaceholder: "Seçiniz…",
          labelDescription: "Açıklama",
          descriptionPlaceholder: "Program hakkında kısa açıklama…",
          labelPrice: "Ücret (₺) — boş bırakın: Ücretsiz",
          cancel: "İptal",
          save: "Kaydet",
          saving: "Kaydediliyor…",
          emptyStateMain: "Marketplace'te listelenmiş program yok.",
          emptyStateHint: "Etkinlik detay sayfasından \"Marketplace'te Listele\" seçeneğini aktif edin.",
          colEvent: "Etkinlik",
          colCategory: "Kategori",
          colPrice: "Ücret",
          colDate: "Tarih",
          free: "Ücretsiz",
          preview: "Önizle",
          edit: "Düzenle",
          unlist: "Listeden Kaldır",
          tipTitle: "İpucu:",
          tipBody: "Etkinliklerinizi marketplace'e eklemek için etkinlik düzenleme sayfasındaki \"Marketplace\" sekmesini kullanın.",
          loading: "Yükleniyor…",
          errorLoad: "Yüklenemedi",
          errorSave: "Kaydedilemedi",
          errorUnlist: "Güncelleme başarısız",
        }
      : {
          pageTitle: "Marketplace Management",
          pageSubtitle: "List your events in the public marketplace catalog.",
          viewMarketplace: "View Marketplace ↗",
          closeError: "close",
          modalTitle: "Marketplace Settings",
          labelCategory: "Category",
          selectPlaceholder: "Select…",
          labelDescription: "Description",
          descriptionPlaceholder: "Brief description about the program…",
          labelPrice: "Price (₺) — leave blank for: Free",
          cancel: "Cancel",
          save: "Save",
          saving: "Saving…",
          emptyStateMain: "No programs listed in the marketplace.",
          emptyStateHint: "Enable the \"List in Marketplace\" option from the event detail page.",
          colEvent: "Event",
          colCategory: "Category",
          colPrice: "Price",
          colDate: "Date",
          free: "Free",
          preview: "Preview",
          edit: "Edit",
          unlist: "Remove from List",
          tipTitle: "Tip:",
          tipBody: "To add your events to the marketplace, use the \"Marketplace\" tab on the event editing page.",
          loading: "Loading…",
          errorLoad: "Could not load",
          errorSave: "Could not save",
          errorUnlist: "Update failed",
        };

  const categories = lang === "tr" ? CATEGORIES_TR : CATEGORIES_EN;

  const [listed, setListed] = useState<MarketplaceEventOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMarketplaceEvents();
      setListed(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy.errorLoad);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openEdit(ev: MarketplaceEventOut) {
    setEditState({
      eventId: ev.id,
      category: ev.marketplace_category ?? "",
      description: ev.marketplace_description ?? "",
      price: ev.marketplace_price != null ? String(ev.marketplace_price) : "",
    });
  }

  async function handleUnlist(eventId: number) {
    try {
      await updateMarketplaceSettings(eventId, { is_marketplace_listed: false });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy.errorUnlist);
    }
  }

  async function handleSaveEdit() {
    if (!editState) return;
    setSaving(true);
    try {
      await updateMarketplaceSettings(editState.eventId, {
        is_marketplace_listed: true,
        marketplace_category: editState.category || null,
        marketplace_description: editState.description || null,
        marketplace_price: editState.price ? Number(editState.price) : null,
      });
      setEditState(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy.errorSave);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-gray-400">{copy.loading}</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{copy.pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {copy.pageSubtitle}
          </p>
        </div>
        <Link
          href="/marketplace"
          target="_blank"
          className="px-4 py-2 text-sm border rounded hover:bg-gray-50 text-gray-700"
        >
          {copy.viewMarketplace}
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">{copy.closeError}</button>
        </div>
      )}

      {/* Edit modal */}
      {editState && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">{copy.modalTitle}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{copy.labelCategory}</label>
                <select
                  value={editState.category}
                  onChange={(e) => setEditState({ ...editState, category: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">{copy.selectPlaceholder}</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{copy.labelDescription}</label>
                <textarea
                  value={editState.description}
                  onChange={(e) => setEditState({ ...editState, description: e.target.value })}
                  rows={4}
                  placeholder={copy.descriptionPlaceholder}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {copy.labelPrice}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editState.price}
                  onChange={(e) => setEditState({ ...editState, price: e.target.value })}
                  placeholder="0"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditState(null)}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
              >
                {copy.cancel}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? copy.saving : copy.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {listed.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <p className="text-4xl mb-3">🛍️</p>
          <p className="text-gray-500 text-sm mb-2">{copy.emptyStateMain}</p>
          <p className="text-gray-400 text-xs">
            {copy.emptyStateHint}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">{copy.colEvent}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">{copy.colCategory}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">{copy.colPrice}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">{copy.colDate}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {listed.map((ev) => (
                <tr key={ev.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{ev.name}</td>
                  <td className="px-4 py-3 text-gray-500">{ev.marketplace_category ?? "—"}</td>
                  <td className="px-4 py-3">
                    {!ev.marketplace_price || ev.marketplace_price === 0 ? (
                      <span className="text-green-600 font-medium">{copy.free}</span>
                    ) : (
                      <span>₺{ev.marketplace_price.toLocaleString("tr-TR")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {ev.event_date
                      ? new Date(ev.event_date).toLocaleDateString("tr-TR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/marketplace/${ev.id}`}
                      target="_blank"
                      className="text-indigo-500 hover:underline text-xs mr-3"
                    >
                      {copy.preview}
                    </Link>
                    <button
                      onClick={() => openEdit(ev)}
                      className="text-blue-600 hover:underline text-xs mr-3"
                    >
                      {copy.edit}
                    </button>
                    <button
                      onClick={() => handleUnlist(ev.id)}
                      className="text-red-500 hover:underline text-xs"
                    >
                      {copy.unlist}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
        <strong>{copy.tipTitle}</strong> {copy.tipBody}
      </div>
    </div>
  );
}
