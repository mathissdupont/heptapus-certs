"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  FileBadge2,
  Loader2,
  Mail,
  Save,
  Search,
  Tag,
  Ticket,
  UsersRound,
} from "lucide-react";
import {
  getCrmParticipant,
  listCrmParticipants,
  updateCrmParticipant,
  type CrmParticipantDetail,
  type CrmParticipantListItem,
} from "@/lib/api";

const LIFECYCLE_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "active", label: "Aktif" },
  { value: "vip", label: "VIP" },
  { value: "renewal", label: "Yenileme" },
  { value: "inactive", label: "Pasif" },
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function timelineIcon(type: string) {
  if (type === "certificate") return FileBadge2;
  if (type === "ticket" || type === "checkin") return Ticket;
  if (type === "survey" || type === "attendance") return CheckCircle2;
  if (type === "email_verified") return Mail;
  return Clock3;
}

export default function AdminCrmPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [tag, setTag] = useState("");
  const [participants, setParticipants] = useState<CrmParticipantListItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [detail, setDetail] = useState<CrmParticipantDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [lifecycleStatus, setLifecycleStatus] = useState("lead");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const knownTags = useMemo(() => {
    const values = new Set<string>();
    participants.forEach((participant) => participant.meta.tags.forEach((item) => values.add(item)));
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [participants]);

  async function loadParticipants(nextSelectedEmail?: string | null) {
    setLoading(true);
    setError(null);
    try {
      const rows = await listCrmParticipants({
        query: query || undefined,
        tag: tag || undefined,
        status: status || undefined,
        limit: 100,
      });
      setParticipants(rows);
      const email = nextSelectedEmail ?? selectedEmail ?? rows[0]?.email ?? null;
      setSelectedEmail(email);
      if (email) await loadDetail(email);
      else setDetail(null);
    } catch (ex: any) {
      setError(ex?.message || "CRM listesi yuklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(email: string) {
    setDetailLoading(true);
    setError(null);
    try {
      const next = await getCrmParticipant(email);
      setDetail(next);
      setNotes(next.meta.notes || "");
      setTagsText((next.meta.tags || []).join(", "));
      setLifecycleStatus(next.meta.lifecycle_status || "lead");
    } catch (ex: any) {
      setError(ex?.message || "Katilimci detayi yuklenemedi.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveMeta() {
    if (!detail) return;
    setSaving(true);
    setError(null);
    try {
      const tags = tagsText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const meta = await updateCrmParticipant({
        email: detail.email,
        notes,
        tags,
        lifecycle_status: lifecycleStatus,
      });
      const nextDetail = { ...detail, meta };
      setDetail(nextDetail);
      setParticipants((items) =>
        items.map((item) => (item.email === detail.email ? { ...item, meta } : item)),
      );
    } catch (ex: any) {
      setError(ex?.message || "CRM notlari kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadParticipants(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Event CRM</p>
          <h1 className="mt-2 text-2xl font-black text-surface-900">Katilimci CRM</h1>
          <p className="mt-2 max-w-2xl text-sm text-surface-500">
            Kurum genelindeki katilimci gecmisini, notlari, etiketleri, biletleri, anketleri ve sertifika zaman cizelgesini tek yerden yonetin.
          </p>
        </div>
      </div>

      {error && <div className="error-banner text-sm">{error}</div>}

      <section className="surface-panel p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void loadParticipants(null);
              }}
              className="input-field pl-9"
              placeholder="Isim veya e-posta ara"
            />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="input-field">
            <option value="">Tum durumlar</option>
            {LIFECYCLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input value={tag} onChange={(event) => setTag(event.target.value)} className="input-field" placeholder="Etiket filtresi" list="crm-tags" />
          <datalist id="crm-tags">
            {knownTags.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <button type="button" onClick={() => void loadParticipants(null)} className="btn-primary justify-center">
            <Search className="h-4 w-4" />
            Ara
          </button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-surface-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-brand-600" />
              <h2 className="text-base font-black text-surface-900">Kisiler</h2>
            </div>
            <span className="rounded-full bg-surface-100 px-3 py-1 text-xs font-bold text-surface-500">
              {participants.length}
            </span>
          </div>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
          ) : participants.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-surface-500">Eslesen katilimci bulunamadi.</div>
          ) : (
            <div className="max-h-[720px] overflow-auto">
              {participants.map((participant) => {
                const active = participant.email === selectedEmail;
                return (
                  <button
                    key={participant.email}
                    type="button"
                    onClick={() => {
                      setSelectedEmail(participant.email);
                      void loadDetail(participant.email);
                    }}
                    className={`w-full border-b border-surface-100 px-5 py-4 text-left transition ${
                      active ? "bg-brand-50" : "bg-white hover:bg-surface-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-surface-900">{participant.name}</p>
                        <p className="truncate text-xs text-surface-500">{participant.email}</p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-surface-600 shadow-sm">
                        {participant.meta.lifecycle_status}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px] font-bold text-surface-500">
                      <span>{participant.event_count} etkinlik</span>
                      <span>{participant.attended_count} katilim</span>
                      <span>{participant.certificate_count} sertifika</span>
                      <span>{participant.survey_count} anket</span>
                    </div>
                    {participant.meta.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {participant.meta.tags.slice(0, 4).map((item) => (
                          <span key={item} className="rounded-full bg-surface-100 px-2 py-0.5 text-[10px] font-bold text-surface-600">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          {detailLoading ? (
            <div className="surface-panel flex justify-center py-24">
              <Loader2 className="h-9 w-9 animate-spin text-brand-600" />
            </div>
          ) : !detail ? (
            <div className="surface-panel px-6 py-16 text-center">
              <UsersRound className="mx-auto h-12 w-12 text-surface-300" />
              <p className="mt-3 text-sm font-bold text-surface-700">Bir katilimci secin</p>
              <p className="mt-1 text-xs text-surface-500">CRM detayi burada acilir.</p>
            </div>
          ) : (
            <>
              <div className="surface-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-2xl font-black text-surface-900">{detail.name}</p>
                    <p className="mt-1 truncate text-sm text-surface-500">{detail.email}</p>
                  </div>
                  <button type="button" onClick={() => void saveMeta()} disabled={saving} className="btn-primary justify-center">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Kaydet
                  </button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  {[
                    ["Etkinlik", detail.summary.events || 0],
                    ["Katilim", detail.summary.attended || 0],
                    ["Sertifika", detail.summary.certificates || 0],
                    ["Anket", detail.summary.surveys || 0],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-surface-200 bg-white p-3">
                      <p className="text-xs font-bold text-surface-500">{label}</p>
                      <p className="mt-1 text-2xl font-black text-surface-900">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="surface-panel p-5">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-brand-600" />
                    <h2 className="text-base font-black text-surface-900">CRM Bilgileri</h2>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-bold text-surface-500">Durum</span>
                      <select value={lifecycleStatus} onChange={(event) => setLifecycleStatus(event.target.value)} className="input-field mt-1">
                        {LIFECYCLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-surface-500">Etiketler</span>
                      <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} className="input-field mt-1" placeholder="vip, sponsor, alumni" />
                    </label>
                  </div>
                  <label className="mt-4 block">
                    <span className="text-xs font-bold text-surface-500">Notlar</span>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="input-field mt-1 min-h-[180px]"
                      placeholder="Katilimciyle ilgili satis, destek veya etkinlik notlari"
                    />
                  </label>
                  <p className="mt-2 text-xs text-surface-400">Son guncelleme: {formatDate(detail.meta.updated_at)}</p>
                </div>

                <div className="surface-panel p-5">
                  <h2 className="text-base font-black text-surface-900">Zaman cizelgesi</h2>
                  <div className="mt-4 max-h-[460px] space-y-3 overflow-auto pr-1">
                    {detail.timeline.length === 0 ? (
                      <p className="text-sm text-surface-500">Henuz zaman cizelgesi kaydi yok.</p>
                    ) : (
                      detail.timeline.slice(0, 30).map((item, index) => {
                        const Icon = timelineIcon(item.type);
                        return (
                          <div key={`${item.type}-${item.at}-${index}`} className="flex gap-3">
                            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-surface-800">{item.label}</p>
                              <p className="text-xs text-surface-500">{formatDate(item.at)}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="surface-panel p-5">
                <h2 className="text-base font-black text-surface-900">Etkinlik gecmisi</h2>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {detail.history.map((item: any) => (
                    <article key={`${item.event_id}-${item.registered_at}`} className="rounded-lg border border-surface-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-surface-900">{item.event_name}</p>
                          <p className="mt-1 text-xs text-surface-500">Kayit: {formatDate(item.registered_at)}</p>
                        </div>
                        <span className="rounded-full bg-surface-100 px-2.5 py-1 text-[10px] font-bold text-surface-600">
                          #{item.event_id}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.email_verified && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">E-posta onayli</span>}
                        {item.survey_completed && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">Anket tamam</span>}
                        {(item.attendance_count || 0) > 0 && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">Check-in var</span>}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold text-surface-500">
                        <span className="rounded-md bg-surface-50 px-2 py-2">{item.tickets?.length || 0} bilet</span>
                        <span className="rounded-md bg-surface-50 px-2 py-2">{item.attendance_count || 0} katilim</span>
                        <span className="rounded-md bg-surface-50 px-2 py-2">{item.certificates?.length || 0} sertifika</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
