"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Loader2, Zap } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useI18n, translate, type TranslationKey } from "@/lib/i18n";
import DateTimeField from "./DateTimeField";

type EventType =
  | "certificate_event"
  | "seminar"
  | "workshop"
  | "conference"
  | "concert"
  | "training"
  | "club_event"
  | "online_event"
  | "custom";

type OrganizationVenue = {
  id: number;
  name: string;
  capacity?: number | null;
  location?: string | null;
  is_active: boolean;
};

interface CreateEventDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreated: (eventId: number) => void;
  venues?: OrganizationVenue[];
}

const EVENT_TYPE_OPTIONS: Array<{ value: EventType; labelKey: TranslationKey }> = [
  { value: "certificate_event", labelKey: "admin_settings_event_certificate" },
  { value: "seminar", labelKey: "admin_settings_event_seminar" },
  { value: "workshop", labelKey: "admin_settings_event_workshop" },
  { value: "conference", labelKey: "admin_settings_event_conference" },
  { value: "concert", labelKey: "admin_settings_event_concert" },
  { value: "training", labelKey: "admin_settings_event_training" },
  { value: "club_event", labelKey: "admin_settings_event_club" },
  { value: "online_event", labelKey: "admin_settings_event_online" },
  { value: "custom", labelKey: "admin_settings_event_custom" },
];

type FeatureDefaults = {
  certificateEnabled: boolean;
  checkinEnabled: boolean;
  ticketingEnabled: boolean;
  registrationEnabled: boolean;
  rafflesEnabled: boolean;
  gamificationEnabled: boolean;
};

// Fallback only — used until the backend preset map (single source of truth, ADR-0018)
// is fetched, or if that fetch fails. Kept minimal; do not extend per-type logic here.
function fallbackDefaultsForEventType(eventType: EventType): FeatureDefaults {
  if (eventType === "concert" || eventType === "club_event") {
    return { certificateEnabled: false, checkinEnabled: true, ticketingEnabled: true, registrationEnabled: true, rafflesEnabled: false, gamificationEnabled: false };
  }
  if (eventType === "online_event") {
    return { certificateEnabled: false, checkinEnabled: false, ticketingEnabled: false, registrationEnabled: true, rafflesEnabled: false, gamificationEnabled: false };
  }
  if (eventType === "custom") {
    return { certificateEnabled: false, checkinEnabled: true, ticketingEnabled: false, registrationEnabled: true, rafflesEnabled: false, gamificationEnabled: false };
  }
  return { certificateEnabled: true, checkinEnabled: true, ticketingEnabled: false, registrationEnabled: true, rafflesEnabled: false, gamificationEnabled: false };
}

export default function CreateEventDrawer({ open, onClose, onCreated, venues = [] }: CreateEventDrawerProps) {
  const { lang } = useI18n();
  const toast = useToast();

  const [name, setName] = useState("");
  const [eventType, setEventType] = useState<EventType>("certificate_event");
  const [certificateEnabled, setCertificateEnabled] = useState(true);
  const [checkinEnabled, setCheckinEnabled] = useState(true);
  const [ticketingEnabled, setTicketingEnabled] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [rafflesEnabled, setRafflesEnabled] = useState(false);
  const [gamificationEnabled, setGamificationEnabled] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [reserveVenue, setReserveVenue] = useState(false);
  const [reservationStartAt, setReservationStartAt] = useState("");
  const [reservationEndAt, setReservationEndAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Backend-resolved feature presets per event type (single source of truth, ADR-0018).
  const [presetMap, setPresetMap] = useState<Record<string, Record<string, boolean>> | null>(null);

  useEffect(() => {
    if (!open || presetMap) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/admin/event-feature-presets");
        const data = await res.json();
        if (!cancelled && data?.presets) setPresetMap(data.presets);
      } catch {
        // Non-fatal: fall back to local defaults if the preset endpoint is unavailable.
      }
    })();
    return () => { cancelled = true; };
  }, [open, presetMap]);

  function defaultsForEventType(nextType: EventType): FeatureDefaults {
    const p = presetMap?.[nextType];
    if (p) {
      return {
        certificateEnabled: !!p.certificate_enabled,
        checkinEnabled: !!p.checkin_enabled,
        ticketingEnabled: !!p.ticketing_enabled,
        registrationEnabled: !!p.registration_enabled,
        rafflesEnabled: !!p.raffles_enabled,
        gamificationEnabled: !!p.gamification_enabled,
      };
    }
    return fallbackDefaultsForEventType(nextType);
  }

  const copy = { title: translate(lang, "migrated_components_admin_createeventdrawer_new_event_67e8cbaa"), nameLabel: translate(lang, "migrated_components_admin_createeventdrawer_event_name_987d7f35"), namePlaceholder: translate(lang, "migrated_components_admin_createeventdrawer_e_g_devfest_ankara_2025_fc2e9cbd"), typeLabel: translate(lang, "migrated_components_admin_createeventdrawer_event_type_887d2dc5"), featuresLabel: translate(lang, "migrated_components_admin_createeventdrawer_modules_2922db72"), certificate: translate(lang, "migrated_components_admin_createeventdrawer_certificate_ffe0c28e"), checkin: translate(lang, "migrated_components_admin_createeventdrawer_check_in_sessions_bd68e1df"), ticket: translate(lang, "migrated_components_admin_createeventdrawer_ticket_pass_9244df21"), registration: translate(lang, "migrated_components_admin_createeventdrawer_public_registration_2c9c590b"), raffle: translate(lang, "migrated_components_admin_createeventdrawer_raffle_49eb9ed5"), gamification: translate(lang, "migrated_components_admin_createeventdrawer_gamification_f85f3e54"), venueLabel: translate(lang, "migrated_components_admin_createeventdrawer_venue_b6e56f9d"), venueNone: translate(lang, "migrated_components_admin_createeventdrawer_no_venue_b2a6be7d"), venueCapacity: translate(lang, "migrated_components_admin_createeventdrawer_people_858f2e38"), startLabel: translate(lang, "migrated_components_admin_createeventdrawer_start_ea717a1b"), endLabel: translate(lang, "migrated_components_admin_createeventdrawer_end_49e8fda4"), autoReserve: translate(lang, "migrated_components_admin_createeventdrawer_automatically_reserve_this_venue_if_availa_e59f20f9"), startRequired: translate(lang, "migrated_components_admin_createeventdrawer_start_and_end_time_are_required_for_venue__336259e5"), create: translate(lang, "migrated_components_admin_createeventdrawer_create_event_c6bdfba9"), creating: translate(lang, "migrated_components_admin_createeventdrawer_creating_36083f9e"), nameRequired: translate(lang, "migrated_components_admin_createeventdrawer_event_name_is_required_cb7a58df"), created: (n: string) => translate(lang, "migrated_components_admin_createeventdrawer_value0_created_4385674d", { value0: n }), createFailed: translate(lang, "migrated_components_admin_createeventdrawer_failed_to_create_event_91ffc764") };

  function applyTypeDefaults(nextType: EventType) {
    const d = defaultsForEventType(nextType);
    setEventType(nextType);
    setCertificateEnabled(d.certificateEnabled);
    setCheckinEnabled(d.checkinEnabled);
    setTicketingEnabled(d.ticketingEnabled);
    setRegistrationEnabled(d.registrationEnabled);
    setRafflesEnabled(d.rafflesEnabled);
    setGamificationEnabled(d.gamificationEnabled);
  }

  async function handleCreate() {
    if (!name.trim()) { setErr(copy.nameRequired); return; }
    if (reserveVenue && selectedVenueId && (!reservationStartAt || !reservationEndAt)) {
      setErr(copy.startRequired); return;
    }
    setErr(null);
    setCreating(true);
    try {
      const res = await apiFetch("/admin/events", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          template_image_url: "placeholder",
          config: { visibility: "unlisted" },
          event_type: eventType,
          certificate_enabled: certificateEnabled,
          checkin_enabled: checkinEnabled,
          ticketing_enabled: ticketingEnabled,
          registration_enabled: registrationEnabled,
          raffles_enabled: rafflesEnabled,
          gamification_enabled: gamificationEnabled,
          organization_venue_id: selectedVenueId ? Number(selectedVenueId) : null,
          auto_reserve_venue: Boolean(reserveVenue && selectedVenueId),
          venue_reservation_start_at: reservationStartAt ? new Date(reservationStartAt).toISOString() : null,
          venue_reservation_end_at: reservationEndAt ? new Date(reservationEndAt).toISOString() : null,
        }),
      });
      const created = await res.json();
      toast.success(copy.created(created.name));
      // Reset form
      setName("");
      setEventType("certificate_event");
      const d = defaultsForEventType("certificate_event");
      setCertificateEnabled(d.certificateEnabled);
      setCheckinEnabled(d.checkinEnabled);
      setTicketingEnabled(d.ticketingEnabled);
      setRegistrationEnabled(d.registrationEnabled);
      setRafflesEnabled(d.rafflesEnabled);
      setGamificationEnabled(d.gamificationEnabled);
      setSelectedVenueId("");
      setReserveVenue(false);
      setReservationStartAt("");
      setReservationEndAt("");
      onCreated(created.id);
    } catch (e: unknown) {
      setErr((e as { message?: string })?.message || copy.createFailed);
    } finally {
      setCreating(false);
    }
  }

  const features: Array<{ label: string; value: boolean; toggle: () => void }> = [
    { label: copy.certificate, value: certificateEnabled, toggle: () => setCertificateEnabled((v) => !v) },
    { label: copy.checkin, value: checkinEnabled, toggle: () => setCheckinEnabled((v) => !v) },
    { label: copy.ticket, value: ticketingEnabled, toggle: () => setTicketingEnabled((v) => !v) },
    { label: copy.registration, value: registrationEnabled, toggle: () => setRegistrationEnabled((v) => !v) },
    { label: copy.raffle, value: rafflesEnabled, toggle: () => setRafflesEnabled((v) => !v) },
    { label: copy.gamification, value: gamificationEnabled, toggle: () => setGamificationEnabled((v) => !v) },
  ];

  const activeVenues = venues.filter((v) => v.is_active);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="relative ml-auto flex h-full w-full flex-col bg-raised shadow-modal sm:w-[480px]"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-surface-200 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-200 bg-surface-50">
                  <Zap className="h-3.5 w-3.5 text-surface-600" />
                </div>
                <h2 className="text-sm font-semibold text-surface-900">{copy.title}</h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700"
                aria-label={translate(lang, "migrated_components_admin_createeventdrawer_close_90ec6671")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto scrollbar-polished px-5 py-5 space-y-5">
              {/* Event name */}
              <div className="space-y-1.5">
                <label className="label">{copy.nameLabel}</label>
                <input
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder={copy.namePlaceholder}
                  autoFocus
                />
              </div>

              {/* Event type */}
              <div className="space-y-1.5">
                <label className="label">{copy.typeLabel}</label>
                <select
                  value={eventType}
                  onChange={(e) => applyTypeDefaults(e.target.value as EventType)}
                  className="input-field"
                >
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {translate(lang, opt.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Feature toggles */}
              <div className="space-y-2">
                <p className="label">{copy.featuresLabel}</p>
                <div className="grid grid-cols-2 gap-2">
                  {features.map((f) => (
                    <button
                      key={f.label}
                      type="button"
                      onClick={f.toggle}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                        f.value
                          ? "border-surface-300 bg-surface-900 text-white"
                          : "border-surface-200 bg-raised text-surface-500 hover:border-surface-300 hover:text-surface-700"
                      }`}
                    >
                      <span className="min-w-0 truncate">{f.label}</span>
                      <span
                        className={`ml-2 h-2 w-2 shrink-0 rounded-full ${
                          f.value ? "bg-raised/70" : "bg-surface-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Venue section */}
              {activeVenues.length > 0 && (
                <div className="space-y-3 rounded-xl border border-surface-200 bg-surface-50 p-4">
                  <div className="space-y-1.5">
                    <label className="label">{copy.venueLabel}</label>
                    <select
                      value={selectedVenueId}
                      onChange={(e) => setSelectedVenueId(e.target.value)}
                      className="input-field"
                    >
                      <option value="">{copy.venueNone}</option>
                      {activeVenues.map((venue) => (
                        <option key={venue.id} value={venue.id}>
                          {venue.name}
                          {venue.capacity ? ` · ${venue.capacity} ${copy.venueCapacity}` : ""}
                          {venue.location ? ` · ${venue.location}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedVenueId && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <DateTimeField
                          value={reservationStartAt}
                          onChange={setReservationStartAt}
                          label={copy.startLabel}
                          locale={localeTag(lang)}
                        />
                        <DateTimeField
                          value={reservationEndAt}
                          onChange={setReservationEndAt}
                          label={copy.endLabel}
                          locale={localeTag(lang)}
                        />
                      </div>
                      <label className="flex items-start gap-2.5 text-sm text-surface-700">
                        <input
                          type="checkbox"
                          checked={reserveVenue}
                          onChange={(e) => setReserveVenue(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded accent-surface-900"
                        />
                        <span>{copy.autoReserve}</span>
                      </label>
                    </>
                  )}
                </div>
              )}

              {/* Error */}
              {err && (
                <div className="error-banner text-xs">
                  <span>{err}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-surface-200 px-5 py-4">
              <button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
                className="btn-primary w-full justify-center"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {creating ? copy.creating : copy.create}
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
