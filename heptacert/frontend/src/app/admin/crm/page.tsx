"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Download,
  FileBadge2,
  Loader2,
  Mail,
  Save,
  Search,
  Send,
  Tag,
  Ticket,
  UsersRound,
} from "lucide-react";
import {
  exportSelectedCrmParticipants,
  getCrmParticipant,
  listCrmDuplicateCandidates,
  listCrmParticipants,
  mergeCrmParticipants,
  sendCrmBulkEmail,
  updateCrmParticipant,
  type CrmDuplicateCandidate,
  type CrmParticipantDetail,
  type CrmParticipantListItem,
} from "@/lib/api";
import EmailTemplateSelect from "@/components/Admin/EmailTemplateSelect";
import { FeatureGate } from "@/lib/useSubscription";
import { useI18n } from "@/lib/i18n";

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

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function AdminCrmPage() {
  const { lang } = useI18n();
  const copy = lang === "tr" ? {
    eyebrow: "Event CRM",
    title: "Katılımcı CRM",
    subtitle: "Kurum genelindeki katılımcı geçmişini, notları, etiketleri, biletleri, anketleri ve sertifika zaman çizelgesini tek yerden yönetin.",
    searchPlaceholder: "İsim veya e-posta ara",
    allStatuses: "Tüm durumlar",
    tagPlaceholder: "Etiket filtresi",
    search: "Ara",
    people: "Kişiler",
    noMatches: "Eşleşen katılımcı bulunamadı.",
    attendee: "katılımcı",
    selectPerson: "Bir katılımcı seçin",
    detailHint: "CRM detayı burada açılır.",
    save: "Kaydet",
    attendance: "Katılım",
    events: "Etkinlik",
    info: "CRM Bilgileri",
    status: "Durum",
    tags: "Etiketler",
    priority: "Öncelik",
    leadScore: "Lead skoru",
    followUp: "Takip tarihi",
    customFields: "Özel alanlar",
    duplicates: "Olası tekrarlar",
    merge: "Birleştir",
    selected: "seçili",
    selectAll: "Görünenleri seç",
    clearSelection: "Seçimi temizle",
    exportCsv: "CSV indir",
    templateId: "\u015eablon",
    sendEmail: "Mail gönder",
    bulkEmailResult: "Mail sonucu",
    notes: "Notlar",
    notesPlaceholder: "Katılımcıyla ilgili satış, destek veya etkinlik notları",
    updated: "Son güncelleme",
    timeline: "Zaman çizelgesi",
    emptyTimeline: "Henüz zaman çizelgesi kaydı yok.",
    history: "Etkinlik geçmişi",
    registered: "Kayıt",
    emailVerified: "E-posta onaylı",
    surveyDone: "Anket tamam",
    checkinExists: "Check-in var",
    tickets: "bilet",
    certificates: "sertifika",
    loadError: "CRM listesi yüklenemedi.",
    detailError: "Katılımcı detayı yüklenemedi.",
    saveError: "CRM notları kaydedilemedi.",
  } : {
    eyebrow: "Event CRM",
    title: "Participant CRM",
    subtitle: "Manage organization-wide participant history, notes, tags, tickets, surveys, and credential timelines in one place.",
    searchPlaceholder: "Search name or email",
    allStatuses: "All statuses",
    tagPlaceholder: "Tag filter",
    search: "Search",
    people: "People",
    noMatches: "No matching participants found.",
    attendee: "attendee",
    selectPerson: "Select a participant",
    detailHint: "CRM details open here.",
    save: "Save",
    attendance: "Attendance",
    events: "Events",
    info: "CRM Details",
    status: "Status",
    tags: "Tags",
    priority: "Priority",
    leadScore: "Lead score",
    followUp: "Follow-up date",
    customFields: "Custom fields",
    duplicates: "Possible duplicates",
    merge: "Merge",
    selected: "selected",
    selectAll: "Select visible",
    clearSelection: "Clear selection",
    exportCsv: "Export CSV",
    templateId: "Template",
    sendEmail: "Send email",
    bulkEmailResult: "Email result",
    notes: "Notes",
    notesPlaceholder: "Sales, support, or event notes for this participant",
    updated: "Last updated",
    timeline: "Timeline",
    emptyTimeline: "No timeline records yet.",
    history: "Event history",
    registered: "Registered",
    emailVerified: "Email verified",
    surveyDone: "Survey complete",
    checkinExists: "Checked in",
    tickets: "tickets",
    certificates: "certificates",
    loadError: "Could not load CRM list.",
    detailError: "Could not load participant details.",
    saveError: "Could not save CRM notes.",
  };
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [tag, setTag] = useState("");
  const [participants, setParticipants] = useState<CrmParticipantListItem[]>([]);
  const [duplicates, setDuplicates] = useState<CrmDuplicateCandidate[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [detail, setDetail] = useState<CrmParticipantDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [lifecycleStatus, setLifecycleStatus] = useState("lead");
  const [priority, setPriority] = useState("normal");
  const [leadScore, setLeadScore] = useState(0);
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [customFieldsText, setCustomFieldsText] = useState("{}");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkTemplateId, setBulkTemplateId] = useState("");
  const [bulkWorking, setBulkWorking] = useState(false);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchDebounceReady = useRef(false);

  const knownTags = useMemo(() => {
    const values = new Set<string>();
    participants.forEach((participant) => participant.meta.tags.forEach((item) => values.add(item)));
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [participants]);
  const visibleEmails = useMemo(() => participants.map((participant) => participant.email), [participants]);
  const selectedVisibleCount = selectedEmails.filter((email) => visibleEmails.includes(email)).length;

  function toggleSelectedEmail(email: string) {
    setSelectedEmails((items) =>
      items.includes(email) ? items.filter((item) => item !== email) : [...items, email],
    );
  }

  function selectVisibleParticipants() {
    setSelectedEmails((items) => Array.from(new Set([...items, ...visibleEmails])));
  }

  async function exportSelected() {
    if (selectedEmails.length === 0) return;
    setBulkWorking(true);
    setBulkNotice(null);
    setError(null);
    try {
      const { blob, filename } = await exportSelectedCrmParticipants(selectedEmails);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (ex: any) {
      setError(ex?.message || "CRM export failed.");
    } finally {
      setBulkWorking(false);
    }
  }

  async function sendBulkEmail() {
    const templateId = Number(bulkTemplateId);
    if (!templateId || selectedEmails.length === 0) return;
    setBulkWorking(true);
    setBulkNotice(null);
    setError(null);
    try {
      const result = await sendCrmBulkEmail({ emails: selectedEmails, email_template_id: templateId });
      setBulkNotice(`${copy.bulkEmailResult}: ${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed.`);
    } catch (ex: any) {
      setError(ex?.message || "CRM bulk email failed.");
    } finally {
      setBulkWorking(false);
    }
  }

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
      setSelectedEmails((items) => items.filter((email) => rows.some((row) => row.email === email)));
      listCrmDuplicateCandidates({ limit: 5 }).then(setDuplicates).catch(() => undefined);
      const email = nextSelectedEmail ?? selectedEmail;
      const stillVisible = email ? rows.some((row) => row.email === email) : false;
      setSelectedEmail(stillVisible ? email : null);
      if (stillVisible && email) void loadDetail(email);
      else setDetail(null);
    } catch (ex: any) {
      setError(ex?.message || copy.loadError);
    } finally {
      setLoading(false);
    }
  }

  async function mergeDuplicate(candidate: CrmDuplicateCandidate) {
    const [target, ...sources] = candidate.emails;
    if (!target || sources.length === 0) return;
    setError(null);
    try {
      await mergeCrmParticipants({ target_email: target, source_emails: sources });
      await loadParticipants(target);
    } catch (ex: any) {
      setError(ex?.message || "CRM merge failed.");
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
      setPriority(next.meta.priority || "normal");
      setLeadScore(next.meta.lead_score || 0);
      setNextFollowUpAt(toDateTimeLocal(next.meta.next_follow_up_at));
      setCustomFieldsText(JSON.stringify(next.meta.custom_fields || {}, null, 2));
    } catch (ex: any) {
      setError(ex?.message || copy.detailError);
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
      let customFields: Record<string, any> = {};
      try {
        customFields = customFieldsText.trim() ? JSON.parse(customFieldsText) : {};
      } catch {
        setError(lang === "tr" ? "Özel alanlar geçerli JSON olmalı." : "Custom fields must be valid JSON.");
        setSaving(false);
        return;
      }
      const meta = await updateCrmParticipant({
        email: detail.email,
        notes,
        tags,
        lifecycle_status: lifecycleStatus,
        priority,
        lead_score: leadScore,
        next_follow_up_at: fromDateTimeLocal(nextFollowUpAt),
        custom_fields: customFields,
      });
      const nextDetail = { ...detail, meta };
      setDetail(nextDetail);
      setParticipants((items) =>
        items.map((item) => (item.email === detail.email ? { ...item, meta } : item)),
      );
    } catch (ex: any) {
      setError(ex?.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadParticipants(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!searchDebounceReady.current) {
      searchDebounceReady.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      void loadParticipants(null);
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status, tag]);

  return (
    <FeatureGate requiredPlans={["enterprise"]} message={lang === "tr" ? "Event CRM Enterprise planına özeldir." : "Event CRM is available on the Enterprise plan."}>
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{copy.eyebrow}</p>
          <h1 className="mt-2 text-2xl font-black text-surface-900">{copy.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-surface-500">
            {copy.subtitle}
          </p>
        </div>
      </div>

      {error && <div className="error-banner text-sm">{error}</div>}

      {duplicates.length > 0 && (
        <section className="surface-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black text-surface-900">{copy.duplicates}</h2>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{duplicates.length}</span>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {duplicates.map((candidate) => (
              <div key={candidate.name_key} className="rounded-lg border border-surface-200 bg-white p-3">
                <p className="font-bold text-surface-900">{candidate.display_name}</p>
                <p className="mt-1 text-xs text-surface-500">{candidate.emails.join(" -> ")}</p>
                <button type="button" onClick={() => void mergeDuplicate(candidate)} className="btn-secondary mt-3 px-3 py-2 text-xs">
                  {copy.merge}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

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
              placeholder={copy.searchPlaceholder}
            />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="input-field">
            <option value="">{copy.allStatuses}</option>
            {LIFECYCLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input value={tag} onChange={(event) => setTag(event.target.value)} className="input-field" placeholder={copy.tagPlaceholder} list="crm-tags" />
          <datalist id="crm-tags">
            {knownTags.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <button type="button" onClick={() => void loadParticipants(null)} className="btn-primary justify-center">
            <Search className="h-4 w-4" />
            {copy.search}
          </button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-surface-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-brand-600" />
              <h2 className="text-base font-black text-surface-900">{copy.people}</h2>
            </div>
            <span className="rounded-full bg-surface-100 px-3 py-1 text-xs font-bold text-surface-500">
              {participants.length}
            </span>
          </div>
          <div className="border-b border-surface-200 bg-surface-50 px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-surface-600">
                {selectedVisibleCount} {copy.selected}
              </span>
              <button type="button" onClick={selectVisibleParticipants} className="btn-secondary px-3 py-2 text-xs">
                {copy.selectAll}
              </button>
              <button type="button" onClick={() => setSelectedEmails([])} className="btn-secondary px-3 py-2 text-xs">
                {copy.clearSelection}
              </button>
              <button type="button" onClick={() => void exportSelected()} disabled={bulkWorking || selectedEmails.length === 0} className="btn-secondary px-3 py-2 text-xs">
                <Download className="h-3.5 w-3.5" />
                {copy.exportCsv}
              </button>
              <div className="min-w-[260px] flex-1">
                <EmailTemplateSelect
                  value={bulkTemplateId ? Number(bulkTemplateId) : null}
                  onChange={(templateId) => setBulkTemplateId(templateId ? String(templateId) : "")}
                  label={copy.templateId}
                  placeholder={lang === "tr" ? "Şablon seç" : "Choose template"}
                  emptyText={lang === "tr" ? "CRM maili için bir sistem şablonu seçin." : "Choose a system template for CRM email."}
                />
              </div>
              <button
                type="button"
                onClick={() => void sendBulkEmail()}
                disabled={bulkWorking || selectedEmails.length === 0 || !Number(bulkTemplateId)}
                className="btn-primary px-3 py-2 text-xs"
              >
                {bulkWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {copy.sendEmail}
              </button>
            </div>
            {bulkNotice && <p className="mt-2 text-xs font-bold text-emerald-700">{bulkNotice}</p>}
          </div>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
          ) : participants.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-surface-500">{copy.noMatches}</div>
          ) : (
            <div className="max-h-[720px] overflow-auto">
              {participants.map((participant) => {
                const active = participant.email === selectedEmail;
                const checked = selectedEmails.includes(participant.email);
                return (
                  <article
                    key={participant.email}
                    className={`w-full border-b border-surface-100 px-5 py-4 text-left transition ${
                      active ? "bg-brand-50" : "bg-white hover:bg-surface-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelectedEmail(participant.email)}
                        className="mt-1 h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                        aria-label={participant.email}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmail(participant.email);
                          void loadDetail(participant.email);
                        }}
                        className="min-w-0 flex-1 text-left"
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
                          <span>{participant.attended_count} {copy.attendance.toLowerCase()}</span>
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
                    </div>
                  </article>
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
              <p className="mt-3 text-sm font-bold text-surface-700">{copy.selectPerson}</p>
              <p className="mt-1 text-xs text-surface-500">{copy.detailHint}</p>
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
                    {copy.save}
                  </button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  {[
                    [copy.events, detail.summary.events || 0],
                    [copy.attendance, detail.summary.attended || 0],
                    [copy.certificates, detail.summary.certificates || 0],
                    [copy.surveyDone, detail.summary.surveys || 0],
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
                    <h2 className="text-base font-black text-surface-900">{copy.info}</h2>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-bold text-surface-500">{copy.status}</span>
                      <select value={lifecycleStatus} onChange={(event) => setLifecycleStatus(event.target.value)} className="input-field mt-1">
                        {LIFECYCLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-surface-500">{copy.tags}</span>
                      <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} className="input-field mt-1" placeholder="vip, sponsor, alumni" />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-surface-500">{copy.priority}</span>
                      <select value={priority} onChange={(event) => setPriority(event.target.value)} className="input-field mt-1">
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-surface-500">{copy.leadScore}</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={leadScore}
                        onChange={(event) => setLeadScore(Number(event.target.value))}
                        className="input-field mt-1"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-surface-500">{copy.followUp}</span>
                      <input
                        type="datetime-local"
                        value={nextFollowUpAt}
                        onChange={(event) => setNextFollowUpAt(event.target.value)}
                        className="input-field mt-1"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-surface-500">{copy.customFields}</span>
                      <textarea
                        value={customFieldsText}
                        onChange={(event) => setCustomFieldsText(event.target.value)}
                        className="input-field mt-1 min-h-[96px] font-mono text-xs"
                      />
                    </label>
                  </div>
                  <label className="mt-4 block">
                    <span className="text-xs font-bold text-surface-500">{copy.notes}</span>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="input-field mt-1 min-h-[180px]"
                      placeholder={copy.notesPlaceholder}
                    />
                  </label>
                  <p className="mt-2 text-xs text-surface-400">{copy.updated}: {formatDate(detail.meta.updated_at)}</p>
                </div>

                <div className="surface-panel p-5">
                  <h2 className="text-base font-black text-surface-900">{copy.timeline}</h2>
                  <div className="mt-4 max-h-[460px] space-y-3 overflow-auto pr-1">
                    {detail.timeline.length === 0 ? (
                      <p className="text-sm text-surface-500">{copy.emptyTimeline}</p>
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
                <h2 className="text-base font-black text-surface-900">{copy.history}</h2>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {detail.history.map((item: any) => (
                    <article key={`${item.event_id}-${item.registered_at}`} className="rounded-lg border border-surface-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-surface-900">{item.event_name}</p>
                          <p className="mt-1 text-xs text-surface-500">{copy.registered}: {formatDate(item.registered_at)}</p>
                        </div>
                        <span className="rounded-full bg-surface-100 px-2.5 py-1 text-[10px] font-bold text-surface-600">
                          #{item.event_id}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.email_verified && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{copy.emailVerified}</span>}
                        {item.survey_completed && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{copy.surveyDone}</span>}
                        {(item.attendance_count || 0) > 0 && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">{copy.checkinExists}</span>}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold text-surface-500">
                        <span className="rounded-md bg-surface-50 px-2 py-2">{item.tickets?.length || 0} {copy.tickets}</span>
                        <span className="rounded-md bg-surface-50 px-2 py-2">{item.attendance_count || 0} {copy.attendance.toLowerCase()}</span>
                        <span className="rounded-md bg-surface-50 px-2 py-2">{item.certificates?.length || 0} {copy.certificates}</span>
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
    </FeatureGate>
  );
}
