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
  User,
  ChevronRight,
  AlertCircle,
  Calendar,
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
    searchPlaceholder: "İsim veya e-posta ara...",
    allStatuses: "Tüm durumlar",
    tagPlaceholder: "Etiket filtresi...",
    search: "Ara",
    people: "Kişiler",
    noMatches: "Eşleşen katılımcı bulunamadı.",
    attendee: "katılımcı",
    selectPerson: "Bir katılımcı seçin",
    detailHint: "Katılımcı detayları, geçmişi ve zaman akışı burada listelenir.",
    save: "Değişiklikleri Kaydet",
    attendance: "Katılım",
    events: "Etkinlik",
    info: "CRM Profil Bilgileri",
    status: "Yaşam Döngüsü Durumu",
    tags: "Etiketler (Virgülle ayırın)",
    priority: "Müşteri Önceliği",
    leadScore: "Lead Skoru (0-100)",
    followUp: "Bir Sonraki Takip Tarihi",
    customFields: "Özel Alan Verileri (JSON)",
    duplicates: "Olası Mükerrer Kayıtlar",
    merge: "Kayıtları Birleştir",
    selected: "seçili",
    selectAll: "Tümünü Seç",
    clearSelection: "Seçimi Temizle",
    exportCsv: "CSV Dışa Aktar",
    templateId: "E-posta Şablonu",
    sendEmail: "E-posta Gönder",
    bulkEmailResult: "Gönderim Durumu",
    notes: "Dahili Operasyon Notları",
    notesPlaceholder: "Katılımcıyla ilgili satış, destek veya özel etkinlik notları...",
    updated: "Son güncelleme",
    timeline: "Sertifika & Etkinlik Zaman Tüneli",
    emptyTimeline: "Henüz bir zaman çizelgesi hareketi kaydedilmedi.",
    history: "Katıldığı Etkinliklerin Geçmişi",
    registered: "Kayıt Tarihi",
    emailVerified: "E-posta Onaylı",
    surveyDone: "Anket Tamamlandı",
    checkinExists: "Check-in Yapıldı",
    tickets: "bilet",
    certificates: "sertifika",
    loadError: "CRM listesi yüklenemedi.",
    detailError: "Katılımcı detayı yüklenemedi.",
    saveError: "CRM notları kaydedilemedi.",
  } : {
    eyebrow: "Event CRM",
    title: "Participant CRM",
    subtitle: "Manage organization-wide participant history, notes, tags, tickets, surveys, and credential timelines in one place.",
    searchPlaceholder: "Search name or email...",
    allStatuses: "All statuses",
    tagPlaceholder: "Tag filter...",
    search: "Search",
    people: "People",
    noMatches: "No matching participants found.",
    attendee: "attendee",
    selectPerson: "Select a participant",
    detailHint: "Participant details, history, and metrics will appear here.",
    save: "Save Changes",
    attendance: "Attendance",
    events: "Events",
    info: "CRM Profile Details",
    status: "Lifecycle Status",
    tags: "Tags (Comma separated)",
    priority: "Priority Level",
    leadScore: "Lead Score (0-100)",
    followUp: "Next Follow-up Date",
    customFields: "Custom Fields (JSON)",
    duplicates: "Possible Duplicates",
    merge: "Merge Records",
    selected: "selected",
    selectAll: "Select All",
    clearSelection: "Clear",
    exportCsv: "Export CSV",
    templateId: "Email Template",
    sendEmail: "Send Email",
    bulkEmailResult: "Result",
    notes: "Internal Operation Notes",
    notesPlaceholder: "Sales, support, or event notes for this participant...",
    updated: "Last updated",
    timeline: "Credential & Event Timeline",
    emptyTimeline: "No timeline records yet.",
    history: "Attended Events History",
    registered: "Registered",
    emailVerified: "Email Verified",
    surveyDone: "Survey Complete",
    checkinExists: "Checked In",
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
  }, [query, status, tag]);

  return (
    <FeatureGate requiredPlans={["enterprise"]} message={lang === "tr" ? "Event CRM Enterprise planına özeldir." : "Event CRM is available on the Enterprise plan."}>
    <div className="w-full space-y-5 antialiased text-gray-900">
      
      {/* BAŞLIK GRUBU */}
      <div className="w-full">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{copy.eyebrow}</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-950 sm:text-2xl">{copy.title}</h1>
        <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-gray-400">{copy.subtitle}</p>
      </div>

      {/* GLOBAL ERROR BANNER */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50/40 p-3.5 text-xs font-semibold text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* MÜKERRER KAYIT UYARI ALANI (Duplicates) */}
      {duplicates.length > 0 && (
        <section className="w-full rounded-2xl border border-amber-200/60 bg-amber-50/20 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-800">{copy.duplicates}</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">{duplicates.length}</span>
          </div>
          <div className="mt-3.5 grid gap-3 lg:grid-cols-2">
            {duplicates.map((candidate) => (
              <div key={candidate.name_key} className="rounded-xl border border-gray-200/80 bg-white p-3.5 shadow-sm flex flex-col justify-between sm:flex-row sm:items-center gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-950 tracking-tight">{candidate.display_name}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-gray-400 truncate">{candidate.emails.join(" → ")}</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => void mergeDuplicate(candidate)} 
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-800 shadow-sm hover:bg-gray-50 active:scale-95 transition-all shrink-0"
                >
                  {copy.merge}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* GLOBAL ARAC ÇUBUĞU (FilterActionBar Stili Üst Arama Modülü) */}
      <section className="w-full rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-[1fr_160px_160px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 stroke-[2]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void loadParticipants(null)}
              className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white pl-9 pr-3.5 text-xs font-medium outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
              placeholder={copy.searchPlaceholder}
            />
          </div>
          
          <select 
            value={status} 
            onChange={(event) => setStatus(event.target.value)} 
            className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 cursor-pointer"
          >
            <option value="">{copy.allStatuses}</option>
            {LIFECYCLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          
          <input 
            value={tag} 
            onChange={(event) => setTag(event.target.value)} 
            className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-medium outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400" 
            placeholder={copy.tagPlaceholder} 
            list="crm-tags" 
          />
          <datalist id="crm-tags">
            {knownTags.map((item) => <option key={item} value={item} />)}
          </datalist>
          
          <button 
            type="button" 
            onClick={() => void loadParticipants(null)} 
            className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-gray-950 px-4 text-xs font-semibold text-white transition hover:bg-gray-900 active:scale-95"
          >
            <Search className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>{copy.search}</span>
          </button>
        </div>
      </section>

      {/* CRM ANA ÇİFT SÜTUN DÜZENİ */}
      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)] items-start">
        
        {/* SOL TARAF: KATILIMCI SEÇİM LİSTESİ */}
        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 px-4.5 py-3.5 bg-white">
            <div className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-gray-800 stroke-[2]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">{copy.people}</h2>
            </div>
            <span className="rounded-md bg-gray-50 border border-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 tracking-tight">
              {participants.length}
            </span>
          </div>
          
          {/* Toplu E-posta ve Yönetim İstasyonu (Bulk Action Kısmı) */}
          <div className="border-b border-gray-100 bg-gray-50/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-500 pr-1">
                {selectedVisibleCount} {copy.selected}
              </span>
              <button type="button" onClick={selectVisibleParticipants} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
                {copy.selectAll}
              </button>
              <button type="button" onClick={() => setSelectedEmails([])} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-gray-500 shadow-sm hover:bg-gray-50">
                {copy.clearSelection}
              </button>
              <button 
                type="button" 
                onClick={() => void exportSelected()} 
                disabled={bulkWorking || selectedEmails.length === 0} 
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40"
              >
                <Download className="h-3 w-3" />
                <span>{copy.exportCsv}</span>
              </button>
            </div>
            
            <div className="space-y-2 pt-1">
              <EmailTemplateSelect
                value={bulkTemplateId ? Number(bulkTemplateId) : null}
                onChange={(templateId) => setBulkTemplateId(templateId ? String(templateId) : "")}
                label={copy.templateId}
                placeholder={lang === "tr" ? "Şablon seçin..." : "Choose template..."}
                emptyText={lang === "tr" ? "E-posta şablonu arayın." : "Search template."}
              />
              <button
                type="button"
                onClick={() => void sendBulkEmail()}
                disabled={bulkWorking || selectedEmails.length === 0 || !Number(bulkTemplateId)}
                className="w-full inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-xl bg-gray-950 px-3 text-xs font-semibold text-white transition hover:bg-gray-900 disabled:opacity-30"
              >
                {bulkWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>{copy.sendEmail}</span>
              </button>
            </div>
            {bulkNotice && <p className="text-[10px] font-bold text-emerald-600 mt-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">{bulkNotice}</p>}
          </div>

          {/* Katılımcı Kartları Listesi */}
          {loading ? (
            <div className="flex justify-center py-14">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400 stroke-[2.5]" />
            </div>
          ) : participants.length === 0 ? (
            <div className="px-5 py-12 text-center text-xs font-semibold text-gray-400 tracking-tight">{copy.noMatches}</div>
          ) : (
            <div className="max-h-[640px] overflow-y-auto divide-y divide-gray-100 scrollbar-none bg-white">
              {participants.map((participant) => {
                const active = participant.email === selectedEmail;
                const checked = selectedEmails.includes(participant.email);
                return (
                  <article
                    key={participant.email}
                    className={`flex items-start gap-3 px-4 py-3.5 text-left transition-colors relative ${
                      active ? "bg-gray-50" : "hover:bg-gray-50/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelectedEmail(participant.email)}
                      className="mt-1 h-3.5 w-3.5 cursor-pointer rounded-md border-gray-300 text-gray-950 focus:ring-0 focus:ring-offset-0"
                    />
                    
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmail(participant.email);
                        void loadDetail(participant.email);
                      }}
                      className="min-w-0 flex-1 text-left outline-none group"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-gray-950 group-hover:text-gray-900 tracking-tight">{participant.name}</p>
                          <p className="truncate text-[10px] font-medium text-gray-400 mt-0.5">{participant.email}</p>
                        </div>
                        <span className="shrink-0 inline-flex rounded-md border border-gray-100 bg-white px-1.5 py-0.5 text-[9px] font-bold text-gray-500 uppercase tracking-tight shadow-sm">
                          {participant.meta.lifecycle_status}
                        </span>
                      </div>
                      
                      {/* Mikro Matris Sayıcıları */}
                      <div className="mt-2.5 grid grid-cols-4 gap-1 text-center text-[9px] font-bold text-gray-400 tracking-tight">
                        <span className="truncate bg-gray-50/70 border border-gray-100/50 py-1 rounded-md">{participant.event_count} {copy.events.toLowerCase()}</span>
                        <span className="truncate bg-gray-50/70 border border-gray-100/50 py-1 rounded-md">{participant.attended_count} {copy.attendance.toLowerCase()}</span>
                        <span className="truncate bg-gray-50/70 border border-gray-100/50 py-1 rounded-md">{participant.certificate_count} sert.</span>
                        <span className="truncate bg-gray-50/70 border border-gray-100/50 py-1 rounded-md">{participant.survey_count} anket</span>
                      </div>
                      
                      {participant.meta.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {participant.meta.tags.slice(0, 3).map((item) => (
                            <span key={item} className="rounded-md bg-gray-50 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* SAĞ TARAF: DETAY / EDİTÖR VE ZAMAN TÜNELİ PANELI */}
        <section className="space-y-4">
          {detailLoading ? (
            <div className="rounded-2xl border border-gray-200 bg-white flex justify-center py-24 shadow-sm">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400 stroke-[2.5]" />
            </div>
          ) : !detail ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-20 text-center shadow-sm">
              <div className="flex h-11 w-11 mx-auto items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400 shadow-sm">
                <UsersRound className="h-4 w-4 stroke-[1.8]" />
              </div>
              <p className="mt-3.5 text-xs font-bold text-gray-950 tracking-tight">{copy.selectPerson}</p>
              <p className="mt-1 text-[11px] text-gray-400 max-w-xs mx-auto leading-relaxed">{copy.detailHint}</p>
            </div>
          ) : (
            <>
              {/* Profil Üst Başlık Kartı */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col justify-between sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-950 text-white shadow-sm">
                    <User className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h2 className="truncate text-base font-bold text-gray-950 tracking-tight">{detail.name}</h2>
                    <p className="truncate text-xs font-medium text-gray-400">{detail.email}</p>
                  </div>
                </div>
                
                <button 
                  type="button" 
                  onClick={() => void saveMeta()} 
                  disabled={saving} 
                  className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-gray-950 px-4 text-xs font-semibold text-white transition hover:bg-gray-900 disabled:opacity-40 shadow-sm shrink-0"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>{copy.save}</span>
                </button>
              </div>

              {/* Hızlı Sayaç Izgarası */}
              <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-4">
                {[
                  [copy.events, detail.summary.events || 0],
                  [copy.attendance, detail.summary.attended || 0],
                  [copy.certificates, detail.summary.certificates || 0],
                  [copy.surveyDone, detail.summary.surveys || 0],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{String(label)}</p>
                    <p className="mt-1 text-xl font-bold tracking-tight text-gray-950 tabular-nums">{String(value)}</p>
                  </div>
                ))}
              </div>

              {/* Form Ayarları ve Zaman Tüneli Yan Yana Grid Düzeni */}
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                
                {/* Sol Profil Editörü */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
                    <Tag className="h-4 w-4 text-gray-800 stroke-[2]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">{copy.info}</h3>
                  </div>
                  
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <label className="block w-full">
                      <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.status}</span>
                      <select value={lifecycleStatus} onChange={(event) => setLifecycleStatus(event.target.value)} className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-semibold outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 cursor-pointer">
                        {LIFECYCLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    
                    <label className="block w-full">
                      <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.tags}</span>
                      <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400" placeholder="vip, alumni, sponsor" />
                    </label>
                    
                    <label className="block w-full">
                      <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.priority}</span>
                      <select value={priority} onChange={(event) => setPriority(event.target.value)} className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-semibold outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 cursor-pointer">
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </label>
                    
                    <label className="block w-full">
                      <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.leadScore}</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={leadScore}
                        onChange={(event) => setLeadScore(Number(event.target.value))}
                        className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      />
                    </label>
                    
                    <label className="block w-full sm:col-span-2">
                      <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.followUp}</span>
                      <div className="relative flex items-center">
                        <input
                          type="datetime-local"
                          value={nextFollowUpAt}
                          onChange={(event) => setNextFollowUpAt(event.target.value)}
                          className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 cursor-pointer"
                        />
                      </div>
                    </label>
                    
                    <label className="block w-full sm:col-span-2">
                      <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.customFields}</span>
                      <textarea
                        value={customFieldsText}
                        onChange={(event) => setCustomFieldsText(event.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white p-3 font-mono text-[11px] font-medium outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 min-h-[84px] resize-none"
                      />
                    </label>
                  </div>
                  
                  <label className="block w-full pt-1">
                    <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.notes}</span>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs font-medium outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 min-h-[140px] resize-none placeholder:text-gray-400"
                      placeholder={copy.notesPlaceholder}
                    />
                  </label>
                  
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 pt-1 border-t border-gray-50">
                    <Calendar className="h-3 w-3" />
                    <span>{copy.updated}: {formatDate(detail.meta.updated_at)}</span>
                  </div>
                </div>

                {/* Sağ Akışkan Zaman Tüneli */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2.5">{copy.timeline}</h3>
                  <div className="mt-4 flex-1 max-h-[460px] overflow-y-auto pr-0.5 scrollbar-none relative pl-3.5 before:absolute before:bottom-1 before:left-1.5 before:top-1 before:w-[1px] before:bg-gray-100">
                    {detail.timeline.length === 0 ? (
                      <p className="text-xs font-medium text-gray-400 py-4">{copy.emptyTimeline}</p>
                    ) : (
                      <div className="space-y-4.5">
                        {detail.timeline.slice(0, 30).map((item, index) => {
                          const Icon = timelineIcon(item.type);
                          return (
                            <div key={`${item.type}-${item.at}-${index}`} className="relative group flex items-start gap-3">
                              {/* Kronolojik Düğüm Noktası */}
                              <div className="absolute -left-[18px] top-1 h-2 w-2 rounded-full bg-white ring-4 ring-white border border-gray-400 group-hover:border-gray-900 transition-colors" />
                              
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <p className="text-xs font-semibold text-gray-800 tracking-tight group-hover:text-gray-950 flex items-center gap-1">
                                  <Icon className="h-3 w-3 shrink-0 text-gray-400" />
                                  <span>{item.label}</span>
                                </p>
                                <p className="text-[10px] font-medium text-gray-400 font-mono">{formatDate(item.at)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Alt Geniş Blok: Etkinlik Katılım Geçmişi */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2.5">{copy.history}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {detail.history.map((item: any) => (
                    <article key={`${item.event_id}-${item.registered_at}`} className="rounded-xl border border-gray-100/80 bg-white p-3.5 shadow-sm hover:border-gray-200 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-gray-950 tracking-tight truncate">{item.event_name}</h4>
                          <p className="mt-0.5 text-[10px] font-medium text-gray-400">{copy.registered}: {formatDate(item.registered_at)}</p>
                        </div>
                        <span className="shrink-0 rounded-md bg-gray-50 border border-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-400">
                          #{item.event_id}
                        </span>
                      </div>
                      
                      {/* Katılım Statü Rozetleri */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {item.email_verified && <span className="rounded-md bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">{copy.emailVerified}</span>}
                        {item.survey_completed && <span className="rounded-md bg-blue-50 border border-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">{copy.surveyDone}</span>}
                        {(item.attendance_count || 0) > 0 && <span className="rounded-md bg-gray-950 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">{copy.checkinExists}</span>}
                      </div>
                      
                      {/* Alt Sayıcı Hücre Matrisi */}
                      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold text-gray-500">
                        <span className="rounded-lg bg-gray-50/70 border border-gray-100/50 px-2 py-1.5 text-gray-700 truncate">{item.tickets?.length || 0} {copy.tickets}</span>
                        <span className="rounded-lg bg-gray-50/70 border border-gray-100/50 px-2 py-1.5 text-gray-700 truncate">{item.attendance_count || 0} {copy.attendance.toLowerCase()}</span>
                        <span className="rounded-lg bg-gray-50/70 border border-gray-100/50 px-2 py-1.5 text-gray-700 truncate">{item.certificates?.length || 0} {copy.certificates}</span>
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