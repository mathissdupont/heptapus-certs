"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Eye, ListFilter, Loader2, Plus, Save, Search, Trash2, Users } from "lucide-react";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import {
  getEventSegmentExportUrl,
  createSegmentExportJob,
  deleteSavedEventSegment,
  getSegmentExportJobDownloadUrl,
  listEventSegments,
  listSavedEventSegments,
  listSegmentExportJobs,
  previewEventSegment,
  saveEventSegment,
  type AudienceSegment,
  type AudienceSegmentKey,
  type AudienceSegmentPreview,
  type SegmentComposition,
  type SegmentExportJob,
  type SavedAudienceSegment,
  getToken,
} from "@/lib/api";
import { FeatureGate } from "@/lib/useSubscription";
import { useI18n } from "@/lib/i18n";

const STANDARD_KEYS: AudienceSegmentKey[] = [
  "attended_no_certificate",
  "certificate_holders",
  "survey_respondents",
  "no_shows",
  "repeat_attendees",
];

export default function EventSegmentsPage() {
  const params = useParams<{ id: string }>();
  const eventId = Number(params.id);
  const { lang } = useI18n();
  const copy = lang === "tr" ? {
    gate: "Katılımcı segmentasyonu Growth ve Enterprise planlarında kullanılabilir.",
    title: "Katılımcı Segmentleri",
    subtitle: "Katılım, sertifika, anket, tekrar katılım ve kayıt cevabı filtreleriyle hedef kitleleri hızlıca ayırın.",
    loadError: "Segmentler yüklenemedi.",
    previewError: "Segment önizlemesi yüklenemedi.",
    exportError: "Segment export alınamadı.",
    dynamicFilter: "Dinamik filtre",
    fieldPlaceholder: "Kayıt alanı ID, örn. department",
    answerPlaceholder: "Cevap içerir, örn. Pazarlama",
    locationPlaceholder: "Lokasyon/şehir, örn. İstanbul",
    apply: "Uygula",
    preview: "Önizle",
    previewTitle: "Önizleme",
    people: "kişi",
    chooseSegment: "Bir segment seçin",
    previewHint: "İlk 50 katılımcı burada listelenir.",
    emailVerified: "E-posta onaylı",
    surveyDone: "Anket tamam",
    savedSegments: "Kaydedilen segmentler",
    saveSegment: "Segmenti kaydet",
    segmentName: "Segment adı",
    builder: "Kural grubu",
    addRule: "Kural ekle",
    runBuilder: "Grubu önizle",
    exportJobs: "Export işleri",
    queuedExport: "Export kuyruğa alındı.",
    syncSheets: "Google Sheets sync",
    backgroundExport: "Arka planda export",
  } : {
    gate: "Audience segmentation is available on Growth and Enterprise plans.",
    title: "Participant Segments",
    subtitle: "Quickly split audiences by attendance, certificates, surveys, repeat attendance, and registration answers.",
    loadError: "Could not load segments.",
    previewError: "Could not load segment preview.",
    exportError: "Could not export segment.",
    dynamicFilter: "Dynamic filter",
    fieldPlaceholder: "Registration field ID, e.g. department",
    answerPlaceholder: "Answer contains, e.g. Marketing",
    locationPlaceholder: "Location/city, e.g. Istanbul",
    apply: "Apply",
    preview: "Preview",
    previewTitle: "Preview",
    people: "people",
    chooseSegment: "Choose a segment",
    previewHint: "The first 50 participants appear here.",
    emailVerified: "Email verified",
    surveyDone: "Survey complete",
    savedSegments: "Saved segments",
    saveSegment: "Save segment",
    segmentName: "Segment name",
    builder: "Rule group",
    addRule: "Add rule",
    runBuilder: "Preview group",
    exportJobs: "Export jobs",
    queuedExport: "Export queued.",
    syncSheets: "Google Sheets sync",
    backgroundExport: "Background export",
  };
  const [segments, setSegments] = useState<AudienceSegment[]>([]);
  const [savedSegments, setSavedSegments] = useState<SavedAudienceSegment[]>([]);
  const [exportJobs, setExportJobs] = useState<SegmentExportJob[]>([]);
  const [preview, setPreview] = useState<AudienceSegmentPreview | null>(null);
  const [selectedKey, setSelectedKey] = useState<AudienceSegmentKey>("attended_no_certificate");
  const [segmentName, setSegmentName] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [answer, setAnswer] = useState("");
  const [location, setLocation] = useState("");
  const [compositionOperator, setCompositionOperator] = useState<"AND" | "OR">("AND");
  const [compositionRules, setCompositionRules] = useState<Array<{ segment_key: AudienceSegmentKey; field_id: string; answer: string; location: string }>>([
    { segment_key: "attended_no_certificate", field_id: "", answer: "", location: "" },
    { segment_key: "survey_respondents", field_id: "", answer: "", location: "" },
  ]);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [savingSegment, setSavingSegment] = useState(false);
  const [syncGoogleSheets, setSyncGoogleSheets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSegments() {
    setLoading(true);
    setError(null);
    try {
      const filters = { field_id: fieldId || undefined, answer: answer || undefined, location: location || undefined };
      const [nextSegments, nextSaved, nextJobs] = await Promise.all([
        listEventSegments(eventId, filters),
        listSavedEventSegments(eventId),
        listSegmentExportJobs(eventId),
      ]);
      setSegments(nextSegments);
      setSavedSegments(nextSaved);
      setExportJobs(nextJobs);
    } catch (ex: any) {
      setError(ex?.message || copy.loadError);
    } finally {
      setLoading(false);
    }
  }

  async function loadPreview(key: AudienceSegmentKey) {
    setSelectedKey(key);
    setPreviewLoading(true);
    setError(null);
    try {
      setPreview(await previewEventSegment(eventId, key, {
        field_id: fieldId || undefined,
        answer: answer || undefined,
        location: location || undefined,
        limit: 50,
      }));
    } catch (ex: any) {
      setError(ex?.message || copy.previewError);
    } finally {
      setPreviewLoading(false);
    }
  }

  function compositionPayload(): SegmentComposition {
    return {
      operator: compositionOperator,
      rules: compositionRules.map(rule => ({
        segment_key: rule.segment_key,
        filters: {
          field_id: rule.field_id || undefined,
          answer: rule.answer || undefined,
          location: rule.location || undefined,
        },
      })),
    };
  }

  async function loadCompositionPreview() {
    setSelectedKey("composition");
    setPreviewLoading(true);
    setError(null);
    try {
      setPreview(await previewEventSegment(eventId, "composition", {
        composition: compositionPayload(),
        limit: 50,
      }));
    } catch (ex: any) {
      setError(ex?.message || copy.previewError);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function saveCurrentSegment() {
    setSavingSegment(true);
    setError(null);
    try {
      const selected = segments.find(segment => segment.key === selectedKey);
      const name = segmentName.trim() || selected?.label || selectedKey;
      await saveEventSegment(eventId, {
        name,
        segment_key: selectedKey,
        filters: selectedKey === "composition"
          ? { composition: compositionPayload() }
          : { field_id: fieldId || undefined, answer: answer || undefined, location: location || undefined },
        visibility: "event",
      });
      setSegmentName("");
      setSavedSegments(await listSavedEventSegments(eventId));
    } catch (ex: any) {
      setError(ex?.message || copy.loadError);
    } finally {
      setSavingSegment(false);
    }
  }

  async function removeSavedSegment(segmentId: number) {
    await deleteSavedEventSegment(eventId, segmentId);
    setSavedSegments(items => items.filter(item => item.id !== segmentId));
  }

  async function openSavedSegment(segment: SavedAudienceSegment) {
    const nextField = String(segment.filters?.field_id || "");
    const nextAnswer = String(segment.filters?.answer || "");
    const nextLocation = String(segment.filters?.location || "");
    setSelectedKey(segment.segment_key);
    setFieldId(nextField);
    setAnswer(nextAnswer);
    setLocation(nextLocation);
    const savedComposition = segment.filters?.composition as SegmentComposition | undefined;
    if (segment.segment_key === "composition" && savedComposition) {
      setCompositionOperator(savedComposition.operator === "OR" ? "OR" : "AND");
      setCompositionRules(
        savedComposition.rules.map(rule => ({
          segment_key: rule.segment_key,
          field_id: String(rule.filters?.field_id || ""),
          answer: String(rule.filters?.answer || ""),
          location: String(rule.filters?.location || ""),
        })),
      );
    }
    setPreviewLoading(true);
    setError(null);
    try {
      setPreview(await previewEventSegment(eventId, segment.segment_key, {
        field_id: nextField || undefined,
        answer: nextAnswer || undefined,
        location: nextLocation || undefined,
        composition: savedComposition,
        limit: 50,
      }));
    } catch (ex: any) {
      setError(ex?.message || copy.previewError);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function exportSegment(key: AudienceSegmentKey) {
    const url = getEventSegmentExportUrl(eventId, key, {
      field_id: fieldId || undefined,
      answer: answer || undefined,
      location: location || undefined,
      composition: key === "composition" ? compositionPayload() : undefined,
    });
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) {
      setError(copy.exportError);
      return;
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `event-${eventId}-${key}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  async function queueSegmentExport(key: AudienceSegmentKey) {
    setError(null);
    const filters = key === "composition"
      ? { composition: compositionPayload() }
      : { field_id: fieldId || undefined, answer: answer || undefined, location: location || undefined };
    try {
      await createSegmentExportJob(eventId, {
        segment_key: key,
        filters,
        sync_google_sheets: syncGoogleSheets,
      });
      setExportJobs(await listSegmentExportJobs(eventId));
    } catch (ex: any) {
      setError(ex?.message || copy.exportError);
    }
  }

  useEffect(() => {
    void loadSegments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const standardSegments = segments.filter(segment => STANDARD_KEYS.includes(segment.key));
  const dynamicSegments = segments.filter(segment => segment.dynamic);

  return (
    <FeatureGate requiredPlans={["growth", "enterprise"]} message={copy.gate}>
    <div className="space-y-6">
      <EventAdminNav eventId={eventId} active="segments" className="mb-2 flex flex-col gap-2" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Audience segmentation</p>
          <h1 className="mt-2 text-2xl font-black text-surface-900">{copy.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-surface-500">
            {copy.subtitle}
          </p>
        </div>
      </div>

      {error && <div className="error-banner text-sm">{error}</div>}

      <section className="surface-panel p-5">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-brand-600" />
          <h2 className="text-base font-black text-surface-900">{copy.dynamicFilter}</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input value={fieldId} onChange={event => setFieldId(event.target.value)} className="input-field" placeholder={copy.fieldPlaceholder} />
          <input value={answer} onChange={event => setAnswer(event.target.value)} className="input-field" placeholder={copy.answerPlaceholder} />
          <input value={location} onChange={event => setLocation(event.target.value)} className="input-field" placeholder={copy.locationPlaceholder} />
          <button type="button" onClick={() => void loadSegments()} className="btn-primary justify-center">
            <ListFilter className="h-4 w-4" />
            {copy.apply}
          </button>
        </div>
      </section>

      <section className="surface-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-brand-600" />
            <h2 className="text-base font-black text-surface-900">{copy.builder}</h2>
          </div>
          <select
            value={compositionOperator}
            onChange={event => setCompositionOperator(event.target.value as "AND" | "OR")}
            className="input-field h-10 w-28 text-sm"
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
        </div>
        <div className="mt-4 space-y-2">
          {compositionRules.map((rule, index) => (
            <div key={index} className="grid gap-2 rounded-lg border border-surface-200 bg-white p-3 md:grid-cols-[180px_1fr_1fr_1fr_auto]">
              <select
                value={rule.segment_key}
                onChange={event => setCompositionRules(items => items.map((item, i) => i === index ? { ...item, segment_key: event.target.value as AudienceSegmentKey } : item))}
                className="input-field text-sm"
              >
                {STANDARD_KEYS.map(key => <option key={key} value={key}>{key}</option>)}
                <option value="registration_answer">registration_answer</option>
                <option value="location_filter">location_filter</option>
              </select>
              <input
                value={rule.field_id}
                onChange={event => setCompositionRules(items => items.map((item, i) => i === index ? { ...item, field_id: event.target.value } : item))}
                className="input-field text-sm"
                placeholder={copy.fieldPlaceholder}
              />
              <input
                value={rule.answer}
                onChange={event => setCompositionRules(items => items.map((item, i) => i === index ? { ...item, answer: event.target.value } : item))}
                className="input-field text-sm"
                placeholder={copy.answerPlaceholder}
              />
              <input
                value={rule.location}
                onChange={event => setCompositionRules(items => items.map((item, i) => i === index ? { ...item, location: event.target.value } : item))}
                className="input-field text-sm"
                placeholder={copy.locationPlaceholder}
              />
              <button
                type="button"
                onClick={() => setCompositionRules(items => items.filter((_, i) => i !== index))}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-100 bg-white text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCompositionRules(items => [...items, { segment_key: "no_shows", field_id: "", answer: "", location: "" }])}
            className="btn-secondary justify-center"
          >
            <Plus className="h-4 w-4" />
            {copy.addRule}
          </button>
          <button type="button" onClick={() => void loadCompositionPreview()} className="btn-primary justify-center">
            <Eye className="h-4 w-4" />
            {copy.runBuilder}
          </button>
          <button type="button" onClick={() => void queueSegmentExport("composition")} className="btn-secondary justify-center">
            <Download className="h-4 w-4" />
            {copy.backgroundExport}
          </button>
        </div>
      </section>

      <section className="surface-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-black text-surface-900">{copy.savedSegments}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={segmentName}
              onChange={event => setSegmentName(event.target.value)}
              className="input-field h-10 w-48 text-sm"
              placeholder={copy.segmentName}
            />
            <button type="button" onClick={() => void saveCurrentSegment()} disabled={savingSegment} className="btn-primary justify-center">
              {savingSegment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {copy.saveSegment}
            </button>
          </div>
        </div>
        <label className="mt-4 flex items-center justify-between rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
          <span className="text-xs font-bold text-surface-700">{copy.syncSheets}</span>
          <input
            type="checkbox"
            checked={syncGoogleSheets}
            onChange={event => setSyncGoogleSheets(event.target.checked)}
            className="h-4 w-4 accent-brand-600"
          />
        </label>
        {savedSegments.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {savedSegments.map(segment => (
              <button
                key={segment.id}
                type="button"
                onClick={() => void openSavedSegment(segment)}
                className="inline-flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs font-bold text-surface-700"
              >
                <span>{segment.name} · {segment.last_count}</span>
                <Trash2
                  className="h-3.5 w-3.5 text-red-500"
                  onClick={(event) => {
                    event.stopPropagation();
                    void removeSavedSegment(segment.id);
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {exportJobs.length > 0 && (
        <section className="surface-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-black text-surface-900">{copy.exportJobs}</h2>
            <button type="button" onClick={() => void listSegmentExportJobs(eventId).then(setExportJobs)} className="btn-secondary px-3 py-2 text-xs">
              {copy.apply}
            </button>
          </div>
          <div className="mt-4 grid gap-2 lg:grid-cols-2">
            {exportJobs.map(job => (
              <div key={job.id} className="rounded-lg border border-surface-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-surface-900">#{job.id} · {job.segment_key}</p>
                    <p className="mt-1 text-xs text-surface-500">{job.status} · {job.row_count} rows</p>
                    {job.error_message && <p className="mt-1 text-xs text-red-600">{job.error_message}</p>}
                    {job.google_spreadsheet_url && (
                      <a href={job.google_spreadsheet_url} target="_blank" rel="noreferrer" className="mt-1 block text-xs font-bold text-brand-700">
                        Google Sheet
                      </a>
                    )}
                  </div>
                  {job.status === "completed" && (
                    <a
                      href={getSegmentExportJobDownloadUrl(eventId, job.id)}
                      className="btn-secondary px-3 py-2 text-xs"
                      target="_blank"
                      rel="noreferrer"
                    >
                      CSV
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="grid gap-3 md:grid-cols-2">
            {[...standardSegments, ...dynamicSegments].map((segment) => (
              <article key={`${segment.key}-${segment.label}`} className={`rounded-lg border bg-white p-4 transition ${selectedKey === segment.key ? "border-brand-300 shadow-soft" : "border-surface-200"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-surface-900">{segment.label}</p>
                    <p className="mt-1 text-xs leading-5 text-surface-500">{segment.description}</p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-black text-brand-700">{segment.count}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => void loadPreview(segment.key)} className="btn-secondary flex-1 justify-center px-3 py-2 text-xs">
                    <Eye className="h-4 w-4" />
                    {copy.preview}
                  </button>
                  <button type="button" onClick={() => void exportSegment(segment.key)} className="btn-secondary justify-center px-3 py-2 text-xs">
                    <Download className="h-4 w-4" />
                    CSV
                  </button>
                  <button type="button" onClick={() => void queueSegmentExport(segment.key)} className="btn-secondary justify-center px-3 py-2 text-xs">
                    {copy.backgroundExport}
                  </button>
                </div>
              </article>
            ))}
          </section>

          <aside className="surface-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-black text-surface-900">{copy.previewTitle}</h2>
              {preview && <span className="rounded-full bg-surface-100 px-3 py-1 text-xs font-bold text-surface-500">{preview.segment.count} {copy.people}</span>}
            </div>
            {previewLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-brand-600" /></div>
            ) : !preview ? (
              <div className="py-12 text-center">
                <Users className="mx-auto h-10 w-10 text-surface-300" />
                <p className="mt-3 text-sm font-bold text-surface-700">{copy.chooseSegment}</p>
                <p className="mt-1 text-xs text-surface-500">{copy.previewHint}</p>
              </div>
            ) : (
              <div className="mt-4 max-h-[560px] space-y-2 overflow-auto pr-1">
                {preview.attendees.map((attendee) => (
                  <div key={attendee.id} className="rounded-lg border border-surface-200 bg-white px-3 py-2">
                    <p className="truncate text-sm font-bold text-surface-900">{attendee.name}</p>
                    <p className="truncate text-xs text-surface-500">{attendee.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {attendee.email_verified && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{copy.emailVerified}</span>}
                      {attendee.survey_completed && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{copy.surveyDone}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
    </FeatureGate>
  );
}
