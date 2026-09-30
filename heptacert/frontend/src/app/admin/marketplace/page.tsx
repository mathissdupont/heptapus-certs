"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  MarketplaceEventOut,
  listMarketplaceEvents,
  listMarketplaceCategories,
  updateMarketplaceSettings,
} from "@/lib/api";
import { useI18n, translate } from "@/lib/i18n";

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
    { pageTitle: translate(lang, "migrated_app_admin_marketplace_marketplace_management_9c6c8a17"), pageSubtitle: translate(lang, "migrated_app_admin_marketplace_list_your_events_in_the_public_marketplace_47172080"), viewMarketplace: translate(lang, "migrated_app_admin_marketplace_view_marketplace_eb7e8ed8"), closeError: translate(lang, "migrated_app_admin_marketplace_close_72014111"), modalTitle: translate(lang, "migrated_app_admin_marketplace_marketplace_settings_28f6d514"), labelCategory: translate(lang, "migrated_app_admin_marketplace_category_c36371b5"), selectPlaceholder: translate(lang, "migrated_app_admin_marketplace_select_76dcd196"), labelDescription: translate(lang, "migrated_app_admin_marketplace_description_a5d6599c"), descriptionPlaceholder: translate(lang, "migrated_app_admin_marketplace_brief_description_about_the_program_49dec452"), labelPrice: translate(lang, "migrated_app_admin_marketplace_price_leave_blank_for_free_37b0c508"), cancel: translate(lang, "migrated_app_admin_marketplace_cancel_8f8ee946"), save: translate(lang, "migrated_app_admin_marketplace_save_77c769e1"), saving: translate(lang, "migrated_app_admin_marketplace_saving_3b6cff28"), emptyStateMain: translate(lang, "migrated_app_admin_marketplace_no_programs_listed_in_the_marketplace_080f37bf"), emptyStateHint: translate(lang, "migrated_app_admin_marketplace_enable_the_list_in_marketplace_option_from_a49ac64d"), colEvent: translate(lang, "migrated_app_admin_marketplace_event_077e5872"), colCategory: translate(lang, "migrated_app_admin_marketplace_category_d7bae814"), colPrice: translate(lang, "migrated_app_admin_marketplace_price_b55bd4ea"), colDate: translate(lang, "migrated_app_admin_marketplace_date_c300dc6d"), free: translate(lang, "migrated_app_admin_marketplace_free_c65b9bb3"), preview: translate(lang, "migrated_app_admin_marketplace_preview_96809a67"), edit: translate(lang, "migrated_app_admin_marketplace_edit_c184931e"), unlist: translate(lang, "migrated_app_admin_marketplace_remove_from_list_2af3ce15"), tipTitle: translate(lang, "migrated_app_admin_marketplace_tip_c857ecdc"), tipBody: translate(lang, "migrated_app_admin_marketplace_to_add_your_events_to_the_marketplace_use__b7d1fb28"), loading: translate(lang, "migrated_app_admin_marketplace_loading_a45fe888"), errorLoad: translate(lang, "migrated_app_admin_marketplace_could_not_load_ca67db9a"), errorSave: translate(lang, "migrated_app_admin_marketplace_could_not_save_243f2993"), errorUnlist: translate(lang, "migrated_app_admin_marketplace_update_failed_8ca7146a") };

  const categories = [translate(lang, "migrated_app_admin_marketplace_information_technology_fff94527"), translate(lang, "migrated_app_admin_marketplace_project_management_ed572d00"), translate(lang, "migrated_app_admin_marketplace_human_resources_161c479f"), translate(lang, "migrated_app_admin_marketplace_finance_accounting_30ac3456"), translate(lang, "migrated_app_admin_marketplace_marketing_6b40f571"), translate(lang, "migrated_app_admin_marketplace_sales_ed5e6ac9"), translate(lang, "migrated_app_admin_marketplace_production_quality_68d9bd77"), translate(lang, "migrated_app_admin_marketplace_health_safety_97910209"), translate(lang, "migrated_app_admin_marketplace_legal_compliance_ebe4a494"), translate(lang, "migrated_app_admin_marketplace_personal_development_7fbfb3a0"), translate(lang, "migrated_app_admin_marketplace_leadership_management_675a99f9"), translate(lang, "migrated_app_admin_marketplace_other_07e4eb7c")];

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

  if (loading) return <div className="p-8 text-content-muted">{copy.loading}</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{copy.pageTitle}</h1>
          <p className="text-sm text-content-muted mt-1">
            {copy.pageSubtitle}
          </p>
        </div>
        <Link
          href="/marketplace"
          target="_blank"
          className="px-4 py-2 text-sm border rounded hover:bg-canvas text-content-secondary"
        >
          {copy.viewMarketplace}
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-status-danger-bg border border-status-danger-border text-status-danger-content rounded text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">{copy.closeError}</button>
        </div>
      )}

      {/* Edit modal */}
      {editState && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-raised rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">{copy.modalTitle}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">{copy.labelCategory}</label>
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
                <label className="block text-sm font-medium text-content-secondary mb-1">{copy.labelDescription}</label>
                <textarea
                  value={editState.description}
                  onChange={(e) => setEditState({ ...editState, description: e.target.value })}
                  rows={4}
                  placeholder={copy.descriptionPlaceholder}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">
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
                className="px-4 py-2 text-sm border rounded hover:bg-canvas"
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
        <div className="text-center py-16 bg-raised rounded-xl border">
          <p className="text-4xl mb-3">🛍️</p>
          <p className="text-content-muted text-sm mb-2">{copy.emptyStateMain}</p>
          <p className="text-content-muted text-xs">
            {copy.emptyStateHint}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-raised">
          <table className="w-full text-sm">
            <thead className="bg-canvas">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-content-secondary">{copy.colEvent}</th>
                <th className="text-left px-4 py-3 font-medium text-content-secondary">{copy.colCategory}</th>
                <th className="text-left px-4 py-3 font-medium text-content-secondary">{copy.colPrice}</th>
                <th className="text-left px-4 py-3 font-medium text-content-secondary">{copy.colDate}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {listed.map((ev) => (
                <tr key={ev.id} className="hover:bg-canvas">
                  <td className="px-4 py-3 font-medium">{ev.name}</td>
                  <td className="px-4 py-3 text-content-muted">{ev.marketplace_category ?? "—"}</td>
                  <td className="px-4 py-3">
                    {!ev.marketplace_price || ev.marketplace_price === 0 ? (
                      <span className="text-status-success-content font-medium">{copy.free}</span>
                    ) : (
                      <span>₺{ev.marketplace_price.toLocaleString(localeTag(lang))}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-content-muted">
                    {ev.event_date
                      ? new Date(ev.event_date).toLocaleDateString(localeTag(lang))
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/marketplace/${ev.id}`}
                      target="_blank"
                      className="text-status-info-content hover:underline text-xs mr-3"
                    >
                      {copy.preview}
                    </Link>
                    <button
                      onClick={() => openEdit(ev)}
                      className="text-status-info-content hover:underline text-xs mr-3"
                    >
                      {copy.edit}
                    </button>
                    <button
                      onClick={() => handleUnlist(ev.id)}
                      className="text-status-danger-content hover:underline text-xs"
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

      <div className="mt-6 p-4 bg-status-info-bg border border-status-info-border rounded-lg text-sm text-status-info-content">
        <strong>{copy.tipTitle}</strong> {copy.tipBody}
      </div>
    </div>
  );
}
