"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Eye, ListFilter, Loader2, Search, Users } from "lucide-react";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import {
  getEventSegmentExportUrl,
  listEventSegments,
  previewEventSegment,
  type AudienceSegment,
  type AudienceSegmentKey,
  type AudienceSegmentPreview,
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
  };
  const [segments, setSegments] = useState<AudienceSegment[]>([]);
  const [preview, setPreview] = useState<AudienceSegmentPreview | null>(null);
  const [selectedKey, setSelectedKey] = useState<AudienceSegmentKey>("attended_no_certificate");
  const [fieldId, setFieldId] = useState("");
  const [answer, setAnswer] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSegments() {
    setLoading(true);
    setError(null);
    try {
      setSegments(await listEventSegments(eventId, { field_id: fieldId || undefined, answer: answer || undefined, location: location || undefined }));
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

  async function exportSegment(key: AudienceSegmentKey) {
    const url = getEventSegmentExportUrl(eventId, key, {
      field_id: fieldId || undefined,
      answer: answer || undefined,
      location: location || undefined,
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
