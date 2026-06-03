"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Loader2, Zap } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useI18n } from "@/lib/i18n";
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

const EVENT_TYPE_OPTIONS: Array<{ value: EventType; label: { tr: string; en: string } }> = [
  { value: "certificate_event", label: { tr: "Sertifikalı Etkinlik", en: "Certificate Event" } },
  { value: "seminar", label: { tr: "Seminer", en: "Seminar" } },
  { value: "workshop", label: { tr: "Workshop", en: "Workshop" } },
  { value: "conference", label: { tr: "Konferans", en: "Conference" } },
  { value: "concert", label: { tr: "Konser", en: "Concert" } },
  { value: "training", label: { tr: "Eğitim", en: "Training" } },
  { value: "club_event", label: { tr: "Kulüp Etkinliği", en: "Club Event" } },
  { value: "online_event", label: { tr: "Online Etkinlik", en: "Online Event" } },
  { value: "custom", label: { tr: "Özel Etkinlik", en: "Custom Event" } },
];

function defaultsForEventType(eventType: EventType) {
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

  const copy = {
    tr: {
      title: "Yeni Etkinlik",
      nameLabel: "Etkinlik Adı",
      namePlaceholder: "Örn: DevFest Ankara 2025",
      typeLabel: "Etkinlik Türü",
      featuresLabel: "Modüller",
      certificate: "Sertifika",
      checkin: "Check-in / Oturum",
      ticket: "Bilet / Giriş Kartı",
      registration: "Herkese Açık Kayıt",
      raffle: "Çekiliş",
      gamification: "Oyunlaştırma",
      venueLabel: "Salon",
      venueNone: "Salon seçme",
      venueCapacity: "kişi",
      startLabel: "Başlangıç",
      endLabel: "Bitiş",
      autoReserve: "Salon uygunsa otomatik rezervasyon oluştur",
      startRequired: "Salon rezervasyonu için başlangıç ve bitiş zamanı gerekir.",
      create: "Etkinlik Oluştur",
      creating: "Oluşturuluyor...",
      nameRequired: "Etkinlik adı zorunludur.",
      created: (n: string) => `"${n}" oluşturuldu.`,
      createFailed: "Etkinlik oluşturulamadı.",
    },
    en: {
      title: "New Event",
      nameLabel: "Event Name",
      namePlaceholder: "e.g. DevFest Ankara 2025",
      typeLabel: "Event Type",
      featuresLabel: "Modules",
      certificate: "Certificate",
      checkin: "Check-in / Sessions",
      ticket: "Ticket / Pass",
      registration: "Public Registration",
      raffle: "Raffle",
      gamification: "Gamification",
      venueLabel: "Venue",
      venueNone: "No venue",
      venueCapacity: "people",
      startLabel: "Start",
      endLabel: "End",
      autoReserve: "Automatically reserve this venue if available",
      startRequired: "Start and end time are required for venue reservations.",
      create: "Create Event",
      creating: "Creating...",
      nameRequired: "Event name is required.",
      created: (n: string) => `"${n}" created.`,
      createFailed: "Failed to create event.",
    },
  }[lang];

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
            className="relative ml-auto flex h-full w-full flex-col bg-white shadow-modal sm:w-[480px]"
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
                aria-label={lang === "tr" ? "Kapat" : "Close"}
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
                      {opt.label[lang]}
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
                          : "border-surface-200 bg-white text-surface-500 hover:border-surface-300 hover:text-surface-700"
                      }`}
                    >
                      <span className="min-w-0 truncate">{f.label}</span>
                      <span
                        className={`ml-2 h-2 w-2 shrink-0 rounded-full ${
                          f.value ? "bg-white/70" : "bg-surface-200"
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
                          locale={lang === "tr" ? "tr-TR" : "en-US"}
                        />
                        <DateTimeField
                          value={reservationEndAt}
                          onChange={setReservationEndAt}
                          label={copy.endLabel}
                          locale={lang === "tr" ? "tr-TR" : "en-US"}
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
