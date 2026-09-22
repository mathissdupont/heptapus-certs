"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, FileText, Loader2 } from "lucide-react";
import { apiFetch, type EventOut } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { buildEventSummaryReport, type EventSummaryLabels } from "@/lib/eventSummaryReport";

const EVENT_TYPE_KEYS = {
  certificate_event: "onboarding_event_type_certificate",
  seminar: "onboarding_event_type_seminar",
  workshop: "onboarding_event_type_workshop",
  conference: "onboarding_event_type_conference",
  concert: "onboarding_event_type_concert",
  training: "onboarding_event_type_training",
  club_event: "onboarding_event_type_club",
  online_event: "onboarding_event_type_online",
  custom: "onboarding_event_type_custom",
} as const;

export default function EventSummaryExport() {
  const { t } = useI18n();
  const [events, setEvents] = useState<EventOut[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [event, setEvent] = useState<EventOut | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [organizationRevision, setOrganizationRevision] = useState(0);

  useEffect(() => {
    const onOrganizationChange = () => {
      setSelectedId("");
      setEvent(null);
      setEvents([]);
      setOrganizationRevision((revision) => revision + 1);
    };
    window.addEventListener("heptacert:organization-context-change", onOrganizationChange);
    return () => window.removeEventListener("heptacert:organization-context-change", onOrganizationChange);
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingList(true);
    setError("");
    apiFetch("/admin/events")
      .then((response) => response.json() as Promise<EventOut[]>)
      .then((items) => {
        if (active) setEvents(Array.isArray(items) ? items.filter((item) => Number.isSafeInteger(item?.id) && item.id > 0) : []);
      })
      .catch(() => { if (active) setError(t("report_export_load_error")); })
      .finally(() => { if (active) setLoadingList(false); });
    return () => { active = false; };
  }, [organizationRevision, t]);

  useEffect(() => {
    if (!selectedId || !events.some((item) => String(item.id) === selectedId)) {
      setEvent(null);
      return;
    }
    let active = true;
    setEvent(null);
    setLoadingEvent(true);
    setError("");
    setCopied(false);
    apiFetch(`/admin/events/${selectedId}`)
      .then((response) => response.json() as Promise<EventOut>)
      .then((item) => {
        if (active && String(item.id) === selectedId) setEvent(item);
        else if (active) setError(t("report_export_load_error"));
      })
      .catch(() => { if (active) setError(t("report_export_load_error")); })
      .finally(() => { if (active) setLoadingEvent(false); });
    return () => { active = false; };
  }, [events, selectedId, t]);

  const labels: EventSummaryLabels = useMemo(() => ({
    title: t("report_export_document_title"),
    name: t("onboarding_event_name"),
    date: t("onboarding_event_date"),
    type: t("onboarding_event_type"),
    location: t("report_export_location"),
    description: t("report_export_description"),
    publicUrl: t("report_export_public_url"),
    registrationUrl: t("report_export_registration_url"),
    reviewNote: t("report_export_review_note"),
  }), [t]);

  const report = event && typeof window !== "undefined"
    ? buildEventSummaryReport(
        event,
        labels,
        window.location.origin,
        event.event_type ? t(EVENT_TYPE_KEYS[event.event_type]) : "",
      )
    : "";

  async function copyReport() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
    } catch {
      setError(t("report_export_copy_error"));
    }
  }

  function downloadReport() {
    if (!event || !report) return;
    const blob = new Blob(["\uFEFF", report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeId = String(event.public_id || event.id).replace(/[^a-zA-Z0-9_-]/g, "_");
    link.href = url;
    link.download = `event-report-${safeId}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <section className="mb-8 rounded-2xl border border-outline-subtle bg-raised p-5 shadow-sm" aria-labelledby="event-report-title">
      <div className="flex items-start gap-3">
        <FileText className="mt-1 h-5 w-5 shrink-0 text-content-muted" aria-hidden="true" />
        <div>
          <h2 id="event-report-title" className="text-lg font-semibold text-content-primary">{t("report_export_title")}</h2>
          <p className="mt-1 text-sm text-content-muted">{t("report_export_subtitle")}</p>
        </div>
      </div>

      <label htmlFor="report-event-select" className="mt-5 block text-sm font-medium text-content-primary">{t("report_export_select")}</label>
      <select
        id="report-event-select"
        className="input mt-2 w-full max-w-xl"
        value={selectedId}
        onChange={(change) => {
          setError("");
          setSelectedId(change.target.value);
        }}
        disabled={loadingList || events.length === 0}
      >
        <option value="">{t("report_export_select_placeholder")}</option>
        {events.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>

      {loadingList || loadingEvent ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-content-muted"><Loader2 className="h-4 w-4 animate-spin" />{t("report_export_loading")}</p>
      ) : events.length === 0 && !error ? (
        <p className="mt-4 text-sm text-content-muted">{t("report_export_empty")}</p>
      ) : null}
      {error && <p role="alert" className="mt-4 text-sm text-status-danger-content">{error}</p>}

      {event && report && !loadingEvent && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-content-primary">{t("report_export_preview")}</h3>
          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-outline-subtle bg-sunken p-4 text-sm text-content-primary">{report}</pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => void copyReport()}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {t(copied ? "report_export_copied" : "report_export_copy")}
            </button>
            <button type="button" className="btn-primary" onClick={downloadReport}>
              <Download className="h-4 w-4" />{t("report_export_download")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
