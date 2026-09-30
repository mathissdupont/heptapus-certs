"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Building2, Plus, RefreshCcw, Pencil, Trash2, MapPin, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/Admin/PageHeader";
import EmptyState from "@/components/Admin/EmptyState";
import { useI18n, translate } from "@/lib/i18n";

type OrganizationVenue = {
  id: number;
  name: string;
  capacity: number;
  location: string | null;
  notes: string | null;
  is_active: boolean;
};

const EMPTY_VENUE = { name: "", capacity: 1, location: "", notes: "", is_active: true };

export default function AdminVenues() {
  const { lang } = useI18n();
  const toast = useToast();

  const [venues, setVenues] = useState<OrganizationVenue[]>([]);
  const [form, setForm] = useState(EMPTY_VENUE);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const copy = { title: translate(lang, "migrated_app_admin_venues_venues_f4d6651b"), subtitle: translate(lang, "migrated_app_admin_venues_manage_your_organization_s_event_spaces_an_4ba0a1d1"), newVenue: translate(lang, "migrated_app_admin_venues_new_venue_0ddd41d0"), editVenue: translate(lang, "migrated_app_admin_venues_edit_venue_5a4dc93c"), areaInfo: translate(lang, "migrated_app_admin_venues_event_space_and_capacity_details_477fff79"), name: translate(lang, "migrated_app_admin_venues_venue_name_13d4b206"), capacity: translate(lang, "migrated_app_admin_venues_capacity_f6f0c467"), location: translate(lang, "migrated_app_admin_venues_location_5307b6df"), note: translate(lang, "migrated_app_admin_venues_note_edaf5609"), active: translate(lang, "migrated_app_admin_venues_available_0ec82a45"), add: translate(lang, "migrated_app_admin_venues_add_venue_8fe8626e"), update: translate(lang, "migrated_app_admin_venues_update_373520d1"), cancel: translate(lang, "migrated_app_admin_venues_cancel_e9bfabd3"), saving: translate(lang, "migrated_app_admin_venues_saving_c5c8dbbf"), saved: translate(lang, "migrated_app_admin_venues_venue_saved_72a8caff"), saveFailed: translate(lang, "migrated_app_admin_venues_could_not_save_venue_f38d18bc"), deleted: translate(lang, "migrated_app_admin_venues_venue_deleted_9899f948"), deleteFailed: translate(lang, "migrated_app_admin_venues_could_not_delete_venue_fe4ef279"), loadFailed: translate(lang, "migrated_app_admin_venues_could_not_load_venues_86e4ebfd"), registered: translate(lang, "migrated_app_admin_venues_registered_venues_8af6fb9a"), areas: translate(lang, "migrated_app_admin_venues_your_organization_s_event_spaces_231d974d"), emptyTitle: translate(lang, "migrated_app_admin_venues_no_venues_yet_e2293bfe"), emptyBody: translate(lang, "migrated_app_admin_venues_add_your_first_venue_using_the_form_on_the_549cbb0a"), confirmDelete: (name: string) => translate(lang, "migrated_app_admin_venues_are_you_sure_you_want_to_delete_value0_7debb710", { value0: name }), namePh: translate(lang, "migrated_app_admin_venues_conference_hall_a_1673c220"), locationPh: translate(lang, "migrated_app_admin_venues_2nd_floor_01a1e409"), notePh: translate(lang, "migrated_app_admin_venues_stage_accessibility_technical_equipment_2b3d0226"), people: translate(lang, "migrated_app_admin_venues_people_a71d34bb"), inactive: translate(lang, "migrated_app_admin_venues_inactive_92d2c462") };

  async function loadVenues() {
    setLoading(true);
    try {
      const response = await apiFetch("/admin/organization/venues");
      setVenues((await response.json()) as OrganizationVenue[]);
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadVenues();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() {
    setForm(EMPTY_VENUE);
    setEditingId(null);
  }

  async function submitVenue(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const path = editingId ? `/admin/organization/venues/${editingId}` : "/admin/organization/venues";
      await apiFetch(path, { method: editingId ? "PATCH" : "POST", body: JSON.stringify(form) });
      toast.success(copy.saved);
      resetForm();
      await loadVenues();
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(venue: OrganizationVenue) {
    setEditingId(venue.id);
    setForm({
      name: venue.name,
      capacity: venue.capacity,
      location: venue.location || "",
      notes: venue.notes || "",
      is_active: venue.is_active,
    });
  }

  async function removeVenue(venue: OrganizationVenue) {
    if (!window.confirm(copy.confirmDelete(venue.name))) return;
    try {
      await apiFetch(`/admin/organization/venues/${venue.id}`, { method: "DELETE" });
      toast.success(copy.deleted);
      if (editingId === venue.id) resetForm();
      await loadVenues();
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message || copy.deleteFailed);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Form */}
        <form onSubmit={submitVenue} className="surface-panel h-fit p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-status-info-bg p-3 text-status-info-content"><Building2 className="h-5 w-5" /></div>
            <div>
              <h2 className="font-semibold text-surface-900">{editingId ? copy.editVenue : copy.newVenue}</h2>
              <p className="text-sm text-surface-500">{copy.areaInfo}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-700">{copy.name}</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} maxLength={150} className="input-field" placeholder={copy.namePh} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-700">{copy.capacity}</label>
              <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} required min={1} max={1000000} className="input-field" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-700">{copy.location}</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={300} className="input-field" placeholder={copy.locationPh} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-700">{copy.note}</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={1000} rows={3} className="input-field" placeholder={copy.notePh} />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-surface-700">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-surface-300" /> {copy.active}
            </label>
            <div className="flex gap-2 pt-1">
              <button disabled={saving} className="btn-primary flex-1 justify-center">{saving ? copy.saving : editingId ? copy.update : copy.add}</button>
              {editingId && <button type="button" onClick={resetForm} className="btn-secondary">{copy.cancel}</button>}
            </div>
          </div>
        </form>

        {/* List */}
        <section className="surface-panel p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">{copy.registered}</h2>
              <p className="text-sm text-surface-500">{copy.areas}</p>
            </div>
            <button type="button" onClick={() => void loadVenues()} className="btn-ghost p-2" aria-label="reload"><RefreshCcw className="h-4 w-4" /></button>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-surface-400" /></div>
          ) : venues.length === 0 ? (
            <EmptyState title={copy.emptyTitle} description={copy.emptyBody} icon={<Building2 className="h-6 w-6" />} />
          ) : (
            <div className="space-y-2">
              {venues.map((venue) => (
                <div key={venue.id} className="flex flex-col gap-3 rounded-xl border border-surface-200 p-4 transition-colors hover:bg-surface-50 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-surface-900">{venue.name}</p>
                      {!venue.is_active && <span className="badge-neutral text-11">{copy.inactive}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-surface-500">
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {venue.capacity} {copy.people}</span>
                      {venue.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {venue.location}</span>}
                    </div>
                    {venue.notes && <p className="mt-1 line-clamp-2 text-xs text-surface-400">{venue.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => startEdit(venue)} className="btn-ghost px-2.5 py-1.5 text-xs"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => removeVenue(venue)} className="btn-ghost px-2.5 py-1.5 text-xs text-status-danger-content hover:bg-status-danger-bg hover:text-status-danger-content"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
