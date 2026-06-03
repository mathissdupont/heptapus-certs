"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  listAttendees, importAttendees, createManualAttendee, deleteAttendee, getAdminAttendeeSurveyLink,
  getAttendanceMatrix, bulkCertifyQueue, getBulkGenerateJob,
  exportAttendanceFile, exportRegistrationDocumentsZip, downloadRegistrationDocument, apiFetch, consumeOAuthBridgeToken, setToken,
  type AttendeeOut, type AttendanceMatrix, type RegistrationField
} from "@/lib/api";
import Link from "next/link";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import ConfirmModal from "@/components/Admin/ConfirmModal";
import FilterActionBar from "@/components/Admin/FilterActionBar";
import { EmptyState as AdminEmptyState } from "@/components/Admin/AdminState";
import { PlanGateCard, isPlanGateError } from "@/lib/useSubscription";
import {
  Users, Upload, Search, Trash2, Loader2, Download,
  Award, BarChart3, CheckSquare, XSquare, RefreshCw, AlertCircle,
  UserCheck, CheckCircle2, UserPlus,
  Link2, ClipboardList, FileSpreadsheet,
  ExternalLink, Unplug,
} from "lucide-react";
import PageHeader from "@/components/Admin/PageHeader";
import AddAttendeeModal from "@/components/Admin/AddAttendeeModal";
import ImportAttendeeModal from "@/components/Admin/ImportAttendeeModal";
import { AnimatePresence, motion } from "framer-motion";

type Tab = "list" | "matrix" | "answers";

type EventSheetsStatus = {
  google_configured: boolean;
  google_connected: boolean;
  google_email?: string | null;
  spreadsheet_id?: string | null;
  spreadsheet_url?: string | null;
  sheet_name?: string | null;
  enabled: boolean;
  last_synced_at?: string | null;
  missing_scopes?: string[];
};

type EventMicrosoftExcelStatus = {
  ms365_configured: boolean;
  ms365_connected: boolean;
  microsoft_email?: string | null;
  workbook_id?: string | null;
  workbook_url?: string | null;
  workbook_name?: string | null;
  sheet_name?: string | null;
  enabled: boolean;
  last_synced_at?: string | null;
  missing_scopes?: string[];
};

export default function AdminAttendeesPage() {
  const params = useParams();
  const eventId = Number(params?.id);

  const [tab, setTab] = useState<Tab>("list");
  const [eventName, setEventName] = useState("");
  const [minSessions, setMinSessions] = useState(1);
  const [registrationFields, setRegistrationFields] = useState<RegistrationField[]>([]);

  // List tab
  const [attendees, setAttendees] = useState<AttendeeOut[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [addingManual, setAddingManual] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualFirstName, setManualFirstName] = useState("");
  const [manualLastName, setManualLastName] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportingDocuments, setExportingDocuments] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);
  const [manualResult, setManualResult] = useState<string | null>(null);
  const [copyingSurveyId, setCopyingSurveyId] = useState<number | null>(null);
  const [copiedSurveyId, setCopiedSurveyId] = useState<number | null>(null);
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeOut | null>(null);

  // Matrix tab
  const [matrix, setMatrix] = useState<AttendanceMatrix | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [matrixError, setMatrixError] = useState<string | null>(null);

  // Question answers tab
  const [answerAttendees, setAnswerAttendees] = useState<AttendeeOut[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [answersError, setAnswersError] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  // Bulk certify
  const [certifying, setCertifying] = useState(false);
  const [certResult, setCertResult] = useState<string | null>(null);

  // Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Plan gate
  const [planOk, setPlanOk] = useState<boolean | null>(null);
  const [planGateMessage, setPlanGateMessage] = useState<string | null>(null);
  const [authBridgeReady, setAuthBridgeReady] = useState(false);

  // Google Sheets
  const [sheetsStatus, setSheetsStatus] = useState<EventSheetsStatus | null>(null);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsAction, setSheetsAction] = useState<"auth" | "connect" | "sync" | "disconnect" | null>(null);
  const [excelStatus, setExcelStatus] = useState<EventMicrosoftExcelStatus | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelAction, setExcelAction] = useState<"auth" | "connect" | "sync" | "disconnect" | null>(null);

  // Confirm modals
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [showCertifyConfirm, setShowCertifyConfirm] = useState(false);

  const limit = 50;

  async function loadEventMeta() {
    const r = await apiFetch(`/admin/events/${eventId}`).then((r) => r.json());
    setEventName(r.name);
    setMinSessions(r.min_sessions_required ?? 1);
    const fields = Array.isArray(r.config?.registration_fields) ? r.config.registration_fields : [];
    setRegistrationFields(fields);
    setSelectedQuestionId((current) => current || fields[0]?.id || null);
  }

  async function loadSheetsStatus() {
    if (!eventId) return;
    setSheetsLoading(true);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/sheets`);
      setSheetsStatus(await res.json());
    } catch {
      setSheetsStatus(null);
    } finally {
      setSheetsLoading(false);
    }
  }

  async function loadMicrosoftExcelStatus() {
    if (!eventId) return;
    setExcelLoading(true);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/microsoft-excel`);
      setExcelStatus(await res.json());
    } catch {
      setExcelStatus(null);
    } finally {
      setExcelLoading(false);
    }
  }

  async function loadAttendees(p = 1, s = search) {
    setLoadingList(true);
    setListError(null);
    try {
      const data = await listAttendees(eventId, { page: p, limit, search: s });
      setAttendees(data.items);
      setTotal(data.total);
      setPage(p);
      setPlanOk(true);
      setPlanGateMessage(null);
    } catch (e: any) {
      if (e?.status === 403 && isPlanGateError(e?.message)) {
        setPlanOk(false);
        setPlanGateMessage(e.message);
        setListError(null);
      } else {
        setListError(e.message);
      }
    } finally {
      setLoadingList(false);
    }
  }

  async function loadMatrix() {
    setLoadingMatrix(true);
    setMatrixError(null);
    try {
      const m = await getAttendanceMatrix(eventId);
      setMatrix(m);
    } catch (e: any) {
      setMatrixError(e.message);
    } finally {
      setLoadingMatrix(false);
    }
  }

  async function loadQuestionAnswers() {
    setLoadingAnswers(true);
    setAnswersError(null);
    try {
      const data = await listAttendees(eventId, { page: 1, limit: 500 });
      setAnswerAttendees(data.items);
    } catch (e: any) {
      setAnswersError(e.message);
    } finally {
      setLoadingAnswers(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const hasBridge = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("oauth_bridge") === "1";
    const finish = () => {
      if (!cancelled) setAuthBridgeReady(true);
    };
    if (!hasBridge) {
      finish();
      return () => { cancelled = true; };
    }
    void consumeOAuthBridgeToken()
      .then(({ access_token, mode }) => {
        if (cancelled || mode !== "admin") return;
        setToken(access_token);
        const url = new URL(window.location.href);
        url.searchParams.delete("oauth_bridge");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      })
      .finally(finish);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!eventId || !authBridgeReady) return;
    loadEventMeta();
    loadAttendees(1, "");
    loadSheetsStatus();
    loadMicrosoftExcelStatus();
  }, [eventId, authBridgeReady]);

  useEffect(() => {
    if (tab === "matrix" && !matrix) loadMatrix();
    if (tab === "answers" && answerAttendees.length === 0) loadQuestionAnswers();
  }, [tab]);

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadAttendees(1, search);
  }

  async function handleDelete(id: number) {
    setPendingDeleteId(id);
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    setDeletingId(id);
    try {
      await deleteAttendee(eventId, id);
      await loadAttendees(page);
    } catch (e: any) {
      setListError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importAttendees(eventId, importFile);
      setImportResult(result);
      setImportFile(null);
      await loadAttendees(1, "");
    } catch (e: any) {
      setListError(e.message);
    } finally {
      setImporting(false);
    }
  }

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    setListError(null);
    setManualResult(null);

    const email = manualEmail.trim();
    const firstName = manualFirstName.trim();
    const lastName = manualLastName.trim();

    if (!email || !firstName || !lastName) {
      setListError("E-posta, ad ve soyad alanları zorunlu.");
      return;
    }

    setAddingManual(true);
    try {
      await createManualAttendee(eventId, {
        email,
        first_name: firstName,
        last_name: lastName,
      });
      setManualEmail("");
      setManualFirstName("");
      setManualLastName("");
      setManualResult("Katılımcı başarıyla eklendi.");
      await loadAttendees(1, "");
    } catch (e: any) {
      setListError(e.message || "Manuel katılımcı eklenemedi.");
    } finally {
      setAddingManual(false);
    }
  }

  async function handleCopySurveyLink(attendeeId: number) {
    setCopyingSurveyId(attendeeId);
    setListError(null);
    try {
      const linkData = await getAdminAttendeeSurveyLink(eventId, attendeeId);
      await navigator.clipboard.writeText(linkData.survey_url);
      setCopiedSurveyId(attendeeId);
      window.setTimeout(() => {
        setCopiedSurveyId((current) => (current === attendeeId ? null : current));
      }, 2200);
    } catch (e: any) {
      setListError(e.message || "Anket linki kopyalanamadı.");
    } finally {
      setCopyingSurveyId(null);
    }
  }

  async function handleExportAttendance(fmt: "xlsx" | "csv" = "xlsx") {
    setExporting(true);
    setListError(null);
    try {
      const { blob, filename } = await exportAttendanceFile(eventId, fmt);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setListError(e.message || "Katılımcılar dışa aktarılamadı.");
    } finally {
      setExporting(false);
    }
  }

  async function handleExportRegistrationDocuments() {
    setExportingDocuments(true);
    setListError(null);
    try {
      const { blob, filename } = await exportRegistrationDocumentsZip(eventId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setListError(e.message || "Belgeler toplu indirilemedi.");
    } finally {
      setExportingDocuments(false);
    }
  }

  async function handleConnectGoogleSheetsAuth() {
    setSheetsAction("auth");
    setListError(null);
    try {
      const frontendOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const params = new URLSearchParams({
        next: `/admin/events/${eventId}/attendees`,
        frontend_origin: frontendOrigin,
        event_id: String(eventId),
      });
      const res = await apiFetch(`/admin/google/sheets/start?${params.toString()}`);
      const data = await res.json();
      if (!data?.authorization_url) throw new Error("Google yetkilendirme adresi alınamadı.");
      window.location.href = data.authorization_url;
    } catch (e: any) {
      setListError(e?.message || "Google Sheets bağlantısı başlatılamadı.");
    } finally {
      setSheetsAction(null);
    }
  }

  async function handleDownloadRegistrationDocument(path: string, fallbackName: string) {
    setListError(null);
    try {
      const { blob, filename } = await downloadRegistrationDocument(eventId, path);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename || fallbackName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setListError(e.message || "Belge indirilemedi.");
    }
  }

  async function handleCreateGoogleSheet() {
    setSheetsAction("connect");
    setListError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/sheets/connect`, { method: "POST" });
      setSheetsStatus(await res.json());
    } catch (e: any) {
      setListError(e?.message || "Google Sheet oluşturulamadı.");
    } finally {
      setSheetsAction(null);
    }
  }

  async function handleSyncGoogleSheet() {
    setSheetsAction("sync");
    setListError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/sheets/sync`, { method: "POST" });
      setSheetsStatus(await res.json());
    } catch (e: any) {
      setListError(e?.message || "Google Sheet güncellenemedi.");
    } finally {
      setSheetsAction(null);
    }
  }

  async function handleDisconnectGoogleSheet() {
    setSheetsAction("disconnect");
    setListError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/sheets`, { method: "DELETE" });
      setSheetsStatus(await res.json());
    } catch (e: any) {
      setListError(e?.message || "Google Sheets bağlantısı kapatılamadı.");
    } finally {
      setSheetsAction(null);
    }
  }

  async function handleConnectMicrosoftExcelAuth() {
    setExcelAction("auth");
    setListError(null);
    try {
      const frontendOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const params = new URLSearchParams({
        next: `/admin/events/${eventId}/attendees`,
        frontend_origin: frontendOrigin,
        event_id: String(eventId),
      });
      const res = await apiFetch(`/admin/microsoft/excel/start?${params.toString()}`);
      const data = await res.json();
      if (!data?.authorization_url) throw new Error("Microsoft yetkilendirme adresi alınamadı.");
      window.location.href = data.authorization_url;
    } catch (e: any) {
      setListError(e?.message || "Microsoft Excel bağlantısı başlatılamadı.");
    } finally {
      setExcelAction(null);
    }
  }

  async function handleCreateMicrosoftExcel() {
    setExcelAction("connect");
    setListError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/microsoft-excel/connect`, { method: "POST" });
      setExcelStatus(await res.json());
    } catch (e: any) {
      setListError(e?.message || "Microsoft Excel dosyası oluşturulamadı.");
    } finally {
      setExcelAction(null);
    }
  }

  async function handleSyncMicrosoftExcel() {
    setExcelAction("sync");
    setListError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/microsoft-excel/sync`, { method: "POST" });
      setExcelStatus(await res.json());
    } catch (e: any) {
      setListError(e?.message || "Microsoft Excel dosyası güncellenemedi.");
    } finally {
      setExcelAction(null);
    }
  }

  async function handleDisconnectMicrosoftExcel() {
    setExcelAction("disconnect");
    setListError(null);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/microsoft-excel`, { method: "DELETE" });
      setExcelStatus(await res.json());
    } catch (e: any) {
      setListError(e?.message || "Microsoft Excel bağlantısı kapatılamadı.");
    } finally {
      setExcelAction(null);
    }
  }

  async function executeBulkCertify() {
    setShowCertifyConfirm(false);
    setCertifying(true);
    setCertResult(null);
    try {
      const job = await bulkCertifyQueue(eventId);
      const jobId = job.id;
      const startedAt = Date.now();
      const MAX_WAIT_MS = 30 * 60 * 1000;

      while (true) {
        if (Date.now() - startedAt > MAX_WAIT_MS) {
          setCertResult(`⚠️ İşlem arka planda devam ediyor (Job #${jobId}). Sertifikalar sayfasından takip edebilirsiniz.`);
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
        const status = await getBulkGenerateJob(eventId, jobId);
        const total = status.total_count || 0;
        const current = status.current_index || 0;
        const created = status.created_count || 0;
        setCertResult(`⏳ İşleniyor: ${current}/${total} • Oluşan: ${created}`);

        if (status.status === "completed") {
          setCertResult(`✅ ${created} sertifika üretildi · ${status.already_exists_count} zaten vardı · ${status.spent_heptacoin} HC harcandı`);
          if (tab === "matrix") await loadMatrix();
          break;
        }
        if (status.status === "failed") {
          setCertResult(`❌ ${status.error_message || "Toplu sertifika üretimi başarısız."}`);
          break;
        }
        if (status.status === "cancelled") {
          setCertResult(`❌ İşlem iptal edildi.`);
          break;
        }
      }
    } catch (e: any) {
      setCertResult(`❌ ${e.message}`);
    } finally {
      setCertifying(false);
    }
  }

  function handleBulkCertify() {
    setShowCertifyConfirm(true);
  }

  const totalPages = Math.ceil(total / limit);
  const eligibleCount = matrix ? matrix.rows.filter((r) => r.meets_threshold && !r.has_certificate).length : 0;
  const hasFileRegistrationField = registrationFields.some((field) => field.type === "file");
  
  const getRegistrationPreview = useCallback((attendee: AttendeeOut) => {
    const fieldPreview = registrationFields
      .map((field) => {
        const value = attendee.registration_answers?.[field.id];
        if (!value) return null;
        return { label: field.label, value: String(value) };
      })
      .filter((item): item is { label: string; value: string } => Boolean(item));

    const extraPreview: Array<{ label: string; value: string }> = [];
    const docsRaw = attendee.registration_answers?.["__documents"];
    if (Array.isArray(docsRaw) && docsRaw.length > 0) {
      extraPreview.push({ label: "Belge", value: `${docsRaw.length} dosya` });
    }
    const kvkkRaw = attendee.registration_answers?.["__kvkk"];
    if (kvkkRaw && typeof kvkkRaw === "object") {
      const accepted = (kvkkRaw as Record<string, unknown>).accepted;
      if (accepted === true) {
        extraPreview.push({ label: "KVKK", value: "Onaylandı" });
      }
    }

    return [...fieldPreview, ...extraPreview].slice(0, 3);
  }, [registrationFields]);

  const formatAnswerValue = useCallback((value: unknown) => {
    if (value == null || value === "") return "Yanıt yok";
    if (Array.isArray(value)) return value.length ? value.map((item) => String(item)).join(", ") : "Yanıt yok";
    if (typeof value === "boolean") return value ? "Evet" : "Hayır";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }, []);

  const answerQuestionStats = useMemo(
    () =>
      registrationFields.map((field) => {
        const answeredCount = answerAttendees.filter((attendee) => {
          const value = attendee.registration_answers?.[field.id];
          return Array.isArray(value) ? value.length > 0 : value != null && value !== "";
        }).length;
        return { field, answeredCount };
      }),
    [answerAttendees, registrationFields]
  );

  const selectedQuestion = registrationFields.find((field) => field.id === selectedQuestionId) || registrationFields[0] || null;
  
  const selectedQuestionAnswers = selectedQuestion
    ? answerAttendees.map((attendee) => ({
        attendee,
        value: attendee.registration_answers?.[selectedQuestion.id],
      }))
    : [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 pb-16 px-4 sm:px-6 antialiased text-surface-900 w-full">
      
      {/* 1. ÜST NAVİGASYON */}
      <EventAdminNav eventId={eventId} eventName={eventName} active="attendees" className="mb-2" />

      {/* PLAN GATE KORUMASI */}
      {planOk === false && (
        <PlanGateCard
          feature="Katılımcı yönetimi, yoklama matrisi ve toplu sertifika üretimi"
          serverMessage={planGateMessage}
        />
      )}

      {planOk !== false && (
        <>
          {/* Page header */}
          <PageHeader
            title="Katılımcılar"
            subtitle={`${eventName} · Minimum ${minSessions} oturum`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setAddModalOpen(true)} className="btn-secondary text-xs">
                  <UserPlus className="h-3.5 w-3.5" /> Katılımcı Ekle
                </button>
                <button type="button" onClick={() => setImportModalOpen(true)} className="btn-secondary text-xs">
                  <Upload className="h-3.5 w-3.5" /> İçe Aktar
                </button>
                <button type="button" onClick={() => void handleExportAttendance("xlsx")} disabled={exporting} className="btn-secondary text-xs disabled:opacity-40">
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Excel İndir
                </button>
                {hasFileRegistrationField && (
                  <button type="button" onClick={() => void handleExportRegistrationDocuments()} disabled={exportingDocuments} className="btn-secondary text-xs disabled:opacity-40">
                    {exportingDocuments ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Belgeler (ZIP)
                  </button>
                )}
                <button type="button" onClick={handleBulkCertify} disabled={certifying} className="btn-primary text-xs disabled:opacity-40">
                  {certifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Award className="h-3.5 w-3.5" />}
                  Sertifika Üret
                </button>
              </div>
            }
          />

          {/* ASENKRON İŞ BİLDİRİM ŞERİDİ */}
          {certResult && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-3 text-xs font-semibold text-blue-700 animate-in fade-in duration-200">
              {certResult}
            </div>
          )}

          {/* Cloud integrations */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-card flex flex-col justify-between sm:flex-row sm:items-center gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-card">
                  <FileSpreadsheet className="h-4 w-4 stroke-[2]" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h2 className="text-xs font-bold text-surface-900 tracking-tight">Google Sheets Canlı Otomasyonu</h2>
                  <p className="text-[11px] leading-relaxed text-surface-400 max-w-md">Kayıtlar anlık olarak Google E-Tablo dosyanıza satır bazında senkronize edilir.</p>
                  
                  <div className="pt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold text-surface-400">
                    {sheetsLoading ? (
                      <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Denetleniyor</span>
                    ) : sheetsStatus?.google_email ? (
                      <span className="rounded-md bg-emerald-50 border border-emerald-100/50 px-1.5 py-0.5 text-emerald-700">{sheetsStatus.google_email}</span>
                    ) : (
                      <span className="text-surface-300">Google bağlantısı pasif</span>
                    )}
                    {sheetsStatus?.last_synced_at && (
                      <span>Son eşitleme: {new Date(sheetsStatus.last_synced_at).toLocaleDateString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Google Buton Kontrolleri */}
              <div className="shrink-0 flex items-center justify-end w-full sm:w-auto">
                {!sheetsStatus?.google_configured ? (
                  <div className="rounded-lg border border-amber-100 bg-amber-50/50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700">OAuth parametreleri eksik.</div>
                ) : !sheetsStatus?.google_connected ? (
                  <button
                    type="button"
                    onClick={handleConnectGoogleSheetsAuth}
                    disabled={Boolean(sheetsAction)}
                    className="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-card transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {sheetsAction === "auth" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 stroke-[2]" />}
                    <span>Google Bağlantısı Kur</span>
                  </button>
                ) : sheetsStatus.enabled && sheetsStatus.spreadsheet_url ? (
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <a href={sheetsStatus.spreadsheet_url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-surface-200 bg-white px-2.5 text-[11px] font-semibold text-surface-700 shadow-card hover:bg-surface-50">
                      <ExternalLink className="h-3 w-3" /> Tabloyu Aç
                    </a>
                    <button type="button" onClick={handleSyncGoogleSheet} disabled={Boolean(sheetsAction)} className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-surface-200 bg-white px-2.5 text-[11px] font-semibold text-surface-700 shadow-card hover:bg-surface-50 disabled:opacity-40">
                      {sheetsAction === "sync" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Senkronla
                    </button>
                    <button type="button" onClick={handleDisconnectGoogleSheet} disabled={Boolean(sheetsAction)} className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-red-100 bg-white px-2.5 text-[11px] font-semibold text-red-600 shadow-card hover:bg-red-50 disabled:opacity-40">
                      <Unplug className="h-3 w-3" /> Bağlantıyı Kes
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={handleCreateGoogleSheet} disabled={Boolean(sheetsAction)} className="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-card transition hover:bg-emerald-700 disabled:opacity-50">
                    <FileSpreadsheet className="h-3.5 w-3.5 stroke-[2]" /> E-Tablo Oluştur
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-card flex flex-col justify-between sm:flex-row sm:items-center gap-4 opacity-80">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600 shadow-card">
                  <FileSpreadsheet className="h-4 w-4 stroke-[2]" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h2 className="text-xs font-bold text-surface-900 tracking-tight">Microsoft 365 Excel Otomasyonu</h2>
                  <p className="text-[11px] leading-relaxed text-surface-400 max-w-md">OneDrive üzerindeki kurumsal çalışma kitabına bilet ve bülten verilerini kurgular.</p>
                  <div className="pt-1 flex items-center gap-1.5 text-[10px] font-bold text-sky-600 bg-sky-50/40 border border-sky-100/30 rounded px-1.5 py-0.5 w-fit">
                    <span>İnşa Aşamasında (Yakında)</span>
                  </div>
                </div>
              </div>
              <button type="button" disabled className="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg border border-surface-100 bg-surface-50 px-3 text-xs font-semibold text-surface-400 cursor-not-allowed">
                <span>Pasif</span>
              </button>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="overflow-x-auto scrollbar-none">
            <div className="flex min-w-max gap-1 rounded-xl border border-surface-200 bg-surface-50 p-1 lg:min-w-0">
              {[
                { id: "list" as const, label: "Katılımcı Listesi", icon: Users },
                { id: "matrix" as const, label: "Yoklama Matrisi", icon: BarChart3 },
                { id: "answers" as const, label: "Soru Bazlı Cevaplar", icon: ClipboardList },
              ].map((item) => {
                const isAct = tab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      isAct ? "bg-white text-surface-900 shadow-card border border-surface-200" : "text-surface-500 hover:text-surface-900 hover:bg-white/60"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${isAct ? "text-surface-700" : "text-surface-400"}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. AKTİF SEKME İÇERİK SLOTLARI KATMANI */}

          {/* SEKME A: KATILIMCI LİSTELEME VE YÜKLEME SEKMESİ */}
          {tab === "list" && (
            <div className="space-y-4 w-full">
              {/* Search */}
              <form onSubmit={handleSearchSubmit}>
                <FilterActionBar
                  search={search}
                  onSearchChange={setSearch}
                  searchPlaceholder="Ad, soyad veya e-posta sorgula..."
                  hasActiveFilters={Boolean(search.trim())}
                  onClear={() => setSearch("")}
                  actions={<button type="submit" className="inline-flex min-h-[38px] items-center justify-center rounded-xl bg-surface-900 px-5 text-xs font-semibold text-white hover:bg-surface-800 transition-all shadow-card">Sorgula</button>}
                />
              </form>

              {listError && <div className="rounded-xl border border-red-100 bg-red-50/40 p-3 text-xs font-semibold text-red-600">{listError}</div>}

              {/* Liste Sonuç Ana Veri Tablosu */}
              {loadingList ? (
                <div className="flex justify-center py-14"><Loader2 className="w-6 h-6 animate-spin text-surface-400 stroke-[2.5]" /></div>
              ) : attendees.length === 0 ? (
                <AdminEmptyState
                  icon={<Users className="h-5 w-5 stroke-[1.8]" />}
                  title="Kayıtlı katılımcı bulunamadı"
                  description={search.trim() ? "Arama kriterlerinize uygun katılımcı eşleşmesi sağlanamadı." : "Etkinliğe henüz bir kayıt gelmedi. Manuel ekleme veya Excel yükleme ile başlayabilirsiniz."}
                  className="border-surface-200 bg-white py-12"
                />
              ) : (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-surface-400 tracking-wide uppercase px-0.5">{total} Toplam Katılımcı Kaydı</span>
                  <div className="w-full overflow-hidden rounded-xl border border-surface-200 bg-white shadow-card">
                    <div className="overflow-x-auto scrollbar-none">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-surface-100 bg-surface-50">
                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-surface-400 select-none">Ad Soyad</th>
                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-surface-400 select-none hidden sm:table-cell">E-posta</th>
                            <th className="text-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-surface-400 select-none">Oturum</th>
                            <th className="text-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-surface-400 select-none">Sertifika</th>
                            <th className="text-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-surface-400 select-none hidden lg:table-cell">Anket</th>
                            <th className="px-5 py-3" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                          {attendees.map((a) => (
                            <tr key={a.id} className="transition-colors hover:bg-surface-50/60">
                              <td className="px-5 py-3 text-xs font-bold text-surface-900 tracking-tight">
                                <button type="button" onClick={() => setSelectedAttendee(a)} className="text-left font-bold text-surface-900 hover:text-surface-900 transition-colors">
                                  {a.name}
                                </button>
                                <span className={`ml-2 text-[9px] font-bold border rounded px-1.5 py-0.5 uppercase tracking-tight ${a.source === "self_register" ? "border-blue-100 bg-blue-50/50 text-blue-600" : "border-surface-100 bg-surface-50 text-surface-400"}`}>
                                  {a.source === "self_register" ? "Kendi" : "İmport"}
                                </span>
                                {a.public_member_name && (
                                  <span className="ml-2 inline-flex items-center rounded bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 font-mono">
                                    ÜYE: {a.public_member_name}
                                  </span>
                                )}
                                {getRegistrationPreview(a).length > 0 && (
                                  <div className="mt-1.5 space-y-0.5">
                                    {getRegistrationPreview(a).map((item) => (
                                      <p key={`${a.id}-${item.label}`} className="max-w-xs truncate text-[10px] font-medium text-surface-400">
                                        <span className="font-semibold text-surface-300">{item.label}:</span> {item.value}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="px-5 py-3 text-xs font-medium text-surface-400 font-mono hidden sm:table-cell tracking-tight">{a.email}</td>
                              <td className="px-5 py-3 text-center text-xs font-medium">
                                <span className={a.sessions_attended >= minSessions ? "text-emerald-500 font-bold" : "text-surface-400"}>{a.sessions_attended}</span>
                                <span className="text-surface-300">/{minSessions}</span>
                              </td>
                              <td className="px-5 py-3 text-center">
                                {a.has_certificate ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto stroke-[2.5]" /> : <span className="text-surface-200 text-xs">—</span>}
                              </td>
                              <td className="px-5 py-3 text-center hidden lg:table-cell">
                                <button
                                  type="button"
                                  onClick={() => void handleCopySurveyLink(a.id)}
                                  disabled={copyingSurveyId === a.id}
                                  className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg border border-surface-200 bg-white px-2.5 text-[11px] font-bold text-surface-700 shadow-card transition hover:bg-surface-50 disabled:opacity-50"
                                >
                                  {copyingSurveyId === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : copiedSurveyId === a.id ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Link2 className="w-3 h-3 text-surface-400" />}
                                  <span>{copiedSurveyId === a.id ? "Kopyalandı" : "Anket Linki"}</span>
                                </button>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button type="button" onClick={() => void handleCopySurveyLink(a.id)} disabled={copyingSurveyId === a.id} className="inline-flex items-center gap-1 rounded-lg border border-surface-200 bg-white px-2 py-1 text-[11px] font-semibold text-surface-500 hover:bg-surface-50 lg:hidden">
                                    <span>{copiedSurveyId === a.id ? "Kopyalandı" : "Anket"}</span>
                                  </button>
                                  <button type="button" onClick={() => handleDelete(a.id)} disabled={deletingId === a.id} className="p-1.5 rounded-lg text-surface-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90">
                                    {deletingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 stroke-[1.8]" />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Satır Sayfalama Düzeni */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-center gap-3 text-xs text-surface-400 font-semibold tracking-tight">
                      <button onClick={() => loadAttendees(page - 1)} disabled={page === 1} className="flex h-7 px-2.5 items-center justify-center rounded-lg border border-surface-100 bg-white text-surface-400 transition-all hover:text-surface-900 disabled:opacity-30 shadow-card">← Önceki</button>
                      <span>{page} / {totalPages}</span>
                      <button onClick={() => loadAttendees(page + 1)} disabled={page === totalPages} className="flex h-7 px-2.5 items-center justify-center rounded-lg border border-surface-100 bg-white text-surface-400 transition-all hover:text-surface-900 disabled:opacity-30 shadow-card">Sonraki →</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SEKME B: SORU BAZLI DETAYLI CEVAP ANALİZ SEKMESİ */}
          {tab === "answers" && (
            <div className="grid gap-4 lg:grid-cols-[300px_1fr] items-start w-full">
              {/* Sol Taraf: Soru Seçim Paneli */}
              <div className="rounded-xl border border-surface-200 bg-white p-4 shadow-card space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-surface-100 pb-2.5">
                  <div className="min-w-0">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-surface-900 flex items-center gap-1.5">
                      <ClipboardList className="h-4 w-4 text-surface-700 stroke-[2]" /> Form Soruları
                    </h2>
                    <p className="mt-1 text-[11px] leading-relaxed text-surface-400">Sorgulamak istediğiniz kayıt form sorusunu işaretleyerek cevap matrisine odaklanın.</p>
                  </div>
                  <button type="button" onClick={() => void loadQuestionAnswers()} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-surface-100 bg-surface-50 text-surface-400 hover:text-surface-900 transition-all shadow-card">
                    <RefreshCw className="h-3 w-3 stroke-[2]" />
                  </button>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-3 text-[11px] font-medium text-emerald-800 leading-normal">
                  E-Tablo canlı senkronizasyonu sayfa başındaki araç kutularından tetiklenir.
                </div>

                {registrationFields.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-surface-200 px-4 py-8 text-center text-xs font-semibold text-surface-400">Bu etkinlik formunda özel soru tanımlı değil.</div>
                ) : (
                  <div className="space-y-1 max-h-[380px] overflow-y-auto scrollbar-none">
                    {answerQuestionStats.map(({ field, answeredCount }) => (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => setSelectedQuestionId(field.id)}
                        className={`w-full rounded-xl border p-3 text-left transition-all ${
                          selectedQuestion?.id === field.id
                            ? "border-surface-800 bg-surface-900 text-white shadow-card"
                            : "border-transparent bg-white text-surface-700 hover:bg-surface-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <p className="text-xs font-bold truncate tracking-tight">{field.label}</p>
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold font-mono ${selectedQuestion?.id === field.id ? "bg-white/20 text-white" : "bg-surface-50 border border-surface-100 text-surface-400"}`}>
                            {answeredCount}/{answerAttendees.length}
                          </span>
                        </div>
                        <p className={`text-[10px] font-medium mt-1 ${selectedQuestion?.id === field.id ? "text-white/60" : "text-surface-400"}`}>
                          {field.type === "textarea" ? "Uzun metin" : field.type === "select" ? "Çoktan seçmeli" : field.type === "file" ? "Dosya yükleme" : "Kısa cevap"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sağ Taraf: Katılımcı Cevap Satırları Akışı */}
              <div className="rounded-xl border border-surface-200 bg-white shadow-card">
                <div className="border-b border-surface-100 px-5 py-4 bg-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">Seçili Form Sorusu</p>
                  <h3 className="mt-1 text-sm font-bold tracking-tight text-surface-900">{selectedQuestion?.label || "Soru seçin"}</h3>
                  <p className="text-[11px] font-medium text-surface-400">{answerAttendees.length} katılımcı içindeki dağılım matrisi.</p>
                </div>

                {answersError && <div className="m-4 rounded-xl border border-red-100 bg-red-50/40 p-3 text-xs font-semibold text-red-600">{answersError}</div>}

                {loadingAnswers ? (
                  <div className="flex items-center justify-center py-14"><Loader2 className="h-6 h-6 animate-spin text-surface-400 stroke-[2.5]" /></div>
                ) : !selectedQuestion ? (
                  <div className="py-14 text-center text-xs font-semibold text-surface-400 tracking-tight">İncelenecek form sorusu bulunamadı.</div>
                ) : selectedQuestionAnswers.length === 0 ? (
                  <div className="py-14 text-center text-xs font-semibold text-surface-400 tracking-tight">Katılımcılardan gelen ham cevap bulunmuyor.</div>
                ) : (
                  <div className="divide-y divide-surface-100 bg-white">
                    {selectedQuestionAnswers.map(({ attendee, value }) => {
                      const hasAnswer = Array.isArray(value) ? value.length > 0 : value != null && value !== "";
                      return (
                        <div key={`${selectedQuestion.id}-${attendee.id}`} className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr] transition-colors hover:bg-surface-50/30">
                          <div className="min-w-0">
                            <button type="button" onClick={() => setSelectedAttendee(attendee)} className="text-left text-xs font-bold text-surface-900 hover:text-surface-900 truncate tracking-tight block">
                              {attendee.name}
                            </button>
                            <p className="mt-0.5 truncate text-[10px] font-medium text-surface-400 font-mono">{attendee.email}</p>
                          </div>
                          <div className={`rounded-xl border border-surface-100/70 px-4 py-2.5 text-xs font-medium leading-relaxed ${hasAnswer ? "bg-surface-50/50 text-surface-700" : "bg-surface-50/20 text-surface-300 italic"}`}>
                            {selectedQuestion.type === "file" ? (
                              <span>{hasAnswer ? "📁 Dosya eki katılımcı profil kartından görüntülenebilir." : "Yanıt yok"}</span>
                            ) : (
                              <span className="whitespace-pre-wrap">{formatAnswerValue(value)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEKME C: MATRİSEL DETAYLI YOKLAMA SEKMESİ */}
          {tab === "matrix" && (
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between gap-3 px-0.5">
                <p className="text-xs font-medium text-surface-400">Tüm oturumlar bazında anlık check-in durum dökümü.</p>
                <button onClick={loadMatrix} className="inline-flex items-center gap-1 text-[11px] font-bold text-surface-400 hover:text-surface-900 transition-colors">
                  <RefreshCw className="w-3 h-3 stroke-[2.5]" /> <span>Yenile</span>
                </button>
              </div>

              {matrixError && <div className="rounded-xl border border-red-100 bg-red-50/40 p-3 text-xs font-semibold text-red-600">{matrixError}</div>}

              {loadingMatrix ? (
                <div className="flex justify-center py-14"><Loader2 className="w-6 h-6 animate-spin text-surface-400 stroke-[2.5]" /></div>
              ) : matrix && (
                <>
                  {/* Mikro Sayaç Matris Hücreleri */}
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <div className="bg-white rounded-xl border border-surface-200 p-3 text-center shadow-card">
                      <p className="text-xl font-bold tracking-tight text-surface-900 tabular-nums">{matrix.rows.length}</p>
                      <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">Toplam Havuz</p>
                    </div>
                    <div className="bg-white rounded-xl border border-emerald-200/60 bg-emerald-50/10 p-3 text-center shadow-card">
                      <p className="text-xl font-bold tracking-tight text-emerald-600 tabular-nums">{matrix.rows.filter((r) => r.meets_threshold).length}</p>
                      <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">Eşiği Başarıyla Geçen</p>
                    </div>
                    <div className="bg-white rounded-xl border border-surface-800 bg-white p-3 text-center shadow-card">
                      <p className="text-xl font-bold tracking-tight text-surface-900 tabular-nums">{matrix.rows.filter((r) => r.has_certificate).length}</p>
                      <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">Sertifikalandırılan</p>
                    </div>
                  </div>

                  {/* Koşullu Hızlı Sertifika Bildirim Kapsülü */}
                  {eligibleCount > 0 && (
                    <div className="flex flex-col gap-3 rounded-xl border border-amber-200/70 bg-amber-50/20 px-4 py-3 text-xs text-amber-800 sm:flex-row sm:items-center sm:justify-between animate-in fade-in duration-150">
                      <span className="font-semibold">⚡ {eligibleCount} katılımcı baraj eşiğini geçti ama henüz sertifikası basılmadı.</span>
                      <button
                        type="button"
                        onClick={handleBulkCertify}
                        disabled={certifying}
                        className="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 text-xs font-bold text-white shadow-card hover:bg-amber-700 disabled:opacity-50 transition-all active:scale-95"
                      >
                        {certifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Award className="w-3 h-3 stroke-[2.5]" />}
                        <span>Kuyruğu İşle ve Üret</span>
                      </button>
                    </div>
                  )}

                  {matrix.rows.length === 0 ? (
                    <div className="text-center py-12 text-surface-400">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-30 stroke-[1.8]" />
                      <p className="text-xs font-semibold">Matris için katılımcı bulunamadı</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-card">
                      <div className="overflow-x-auto scrollbar-none">
                        <table className="text-left border-collapse w-full">
                          <thead>
                            <tr className="border-b border-surface-100 bg-surface-50">
                              <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-surface-400 select-none whitespace-nowrap">Ad Soyad</th>
                              {matrix.sessions.map((s) => (
                                <th key={s.id} className="text-center px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-surface-400 select-none whitespace-nowrap max-w-[96px]" title={s.session_date || ""}>
                                  {s.name.length > 10 ? s.name.slice(0, 10) + "…" : s.name}
                                </th>
                              ))}
                              <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-surface-400 select-none">Toplam Skal</th>
                              <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-surface-400 select-none">Durum</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-100 bg-white">
                            {matrix.rows.map((row) => (
                              <tr key={row.attendee_id} className={`transition-colors hover:bg-surface-50/20 ${row.meets_threshold ? "bg-emerald-50/10" : ""}`}>
                                <td className="px-4 py-3 text-xs font-bold text-surface-900 tracking-tight whitespace-nowrap">{row.name}</td>
                                {matrix.sessions.map((s) => (
                                  <td key={s.id} className="text-center px-2 py-3">
                                    {row.checkins[String(s.id)] ? (
                                      <CheckSquare className="w-4 h-4 text-emerald-500 mx-auto stroke-[2.2]" />
                                    ) : (
                                      <XSquare className="w-4 h-4 text-surface-100 mx-auto stroke-[1.8]" />
                                    )}
                                  </td>
                                ))}
                                <td className="text-center px-4 py-3 text-xs font-bold text-surface-700 font-mono tabular-nums">
                                  {row.sessions_attended}/{matrix.sessions.length}
                                </td>
                                <td className="text-center px-4 py-3 whitespace-nowrap">
                                  {row.has_certificate ? (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-surface-900 bg-surface-900 px-2 py-0.5 text-[10px] font-bold text-white shadow-card">
                                      <Award className="w-3 h-3" /> Sertifikalı
                                    </span>
                                  ) : row.meets_threshold ? (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shadow-card">
                                      ✓ Hak Kazandı
                                    </span>
                                  ) : (
                                    <span className="text-surface-300 text-xs font-medium">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <AddAttendeeModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdded={() => loadAttendees(1, "")}
        eventId={eventId}
      />
      <ImportAttendeeModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImported={() => loadAttendees(1, "")}
        eventId={eventId}
      />
      <ConfirmModal open={pendingDeleteId !== null} title="Katılımcıyı sil" description="Bu katılımcı kaydını HeptaCert veritabanından kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz." danger loading={deletingId !== null} onConfirm={confirmDelete} onCancel={() => setPendingDeleteId(null)} />
      <ConfirmModal open={showCertifyConfirm} title="Toplu Sertifika Basım Onayı" description="Yoklama baraj barajını başarıyla aşan tüm katılımcılar için sertifika basım iş kuyruğu (Bulk Queue) tetiklenecektir. Heptacoin harcamasını onaylıyor musunuz?" onConfirm={executeBulkCertify} onCancel={() => setShowCertifyConfirm(false)} />

      {/* 6. ANİMASYONLU SAĞ KATILIMCI PROFiL KARTI ÇEKMECESi (Drawer Layer) */}
      <AnimatePresence>
        {selectedAttendee && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Arka Plan Cam Katmanı */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-surface-800/10 backdrop-blur-sm" onClick={() => setSelectedAttendee(null)} />
            
            {/* Çekmece Gövdesi */}
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 220 }} className="relative h-full w-full max-w-sm overflow-y-auto border-l border-surface-200 bg-white/95 backdrop-blur-xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between scrollbar-none">
              <div className="space-y-5">
                {/* Üst Bilgi Başlığı */}
                <div className="flex items-start justify-between gap-3 border-b border-surface-100 pb-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400">Katılımcı Profil Kartı</p>
                    <h3 className="text-base font-bold text-surface-900 tracking-tight truncate">{selectedAttendee.name}</h3>
                    <p className="text-xs text-surface-400 font-mono truncate">{selectedAttendee.email}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedAttendee(null)} className="rounded-lg p-1 text-surface-400 hover:bg-surface-50 hover:text-surface-900 transition-colors">
                    <XSquare className="h-4 w-4 stroke-[2]" />
                  </button>
                </div>

                {/* Hızlı Bilgi Matris Hücreleri */}
                <div className="grid grid-cols-2 gap-2.5 text-xs font-semibold">
                  <div className="rounded-xl border border-surface-100 bg-surface-50/50 p-3">
                    <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">Kayıt Modeli</p>
                    <p className="mt-1 text-xs font-bold text-surface-900">{selectedAttendee.source === "self_register" ? "Kendi formu" : "Excel aktarım"}</p>
                  </div>
                  <div className="rounded-xl border border-surface-100 bg-surface-50/50 p-3">
                    <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">Katıldığı Oturum</p>
                    <p className="mt-1 text-sm font-bold text-surface-900 font-mono tabular-nums">{selectedAttendee.sessions_attended}</p>
                  </div>
                  <div className="rounded-xl border border-surface-100 bg-surface-50/50 p-3">
                    <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">Sertifika Durumu</p>
                    <p className={`mt-1 text-xs font-bold ${selectedAttendee.has_certificate ? "text-indigo-600" : "text-surface-400"}`}>{selectedAttendee.has_certificate ? "Üretildi" : "Üretilmedi"}</p>
                  </div>
                  <div className="rounded-xl border border-surface-100 bg-surface-50/50 p-3">
                    <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">Kayıt Zamanı</p>
                    <p className="mt-1 text-[10px] font-mono font-bold text-surface-500 leading-none">{new Date(selectedAttendee.registered_at).toLocaleDateString("tr-TR")}</p>
                  </div>
                </div>

                {/* Bağlı Üye Statüsü */}
                {selectedAttendee.public_member_name && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3.5 space-y-1 text-xs font-medium">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Entegre Kurum Üye Bağlantısı</p>
                    <p className="text-surface-900 font-bold tracking-tight">{selectedAttendee.public_member_name}</p>
                    <p className="text-[11px] text-surface-400 font-mono truncate">{selectedAttendee.public_member_email}</p>
                  </div>
                )}

                {/* Form Özel Cevap Listesi (Dynamic Fields) */}
                {registrationFields.length > 0 && (
                  <div className="rounded-xl border border-surface-100 bg-white p-3.5 space-y-3 shadow-inner">
                    <p className="text-xs font-bold text-surface-900 tracking-tight">Kayıt Formu Soru Yanıtları</p>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-none">
                      {registrationFields.map((field) => {
                        const value = selectedAttendee.registration_answers?.[field.id];
                        const docsRaw = selectedAttendee.registration_answers?.["__documents"];
                        const docsForField = Array.isArray(docsRaw)
                          ? docsRaw
                              .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
                              .filter((item) => String(item.field_id || "") === field.id)
                          : [];
                        const renderedValue = value == null ? "—" : String(value);
                        return (
                          <div key={field.id} className="rounded-xl border border-surface-50 bg-surface-50/30 px-3 py-2 text-xs font-medium">
                            <p className="text-[10px] font-bold text-surface-400 truncate">{field.label}</p>
                            {field.type === "file" ? (
                              docsForField.length === 0 ? (
                                <p className="mt-1 text-surface-300 italic">—</p>
                              ) : (
                                <div className="mt-1 space-y-1">
                                  {docsForField.map((doc, index) => {
                                    const docName = String(doc.name || `Ek Belge ${index + 1}`);
                                    const docPath = String(doc.path || "");
                                    return docPath ? (
                                      <button key={index} type="button" onClick={() => void handleDownloadRegistrationDocument(docPath, docName)} className="block max-w-full truncate text-left font-semibold text-surface-900 underline underline-offset-2 hover:text-surface-900">
                                        📁 {docName}
                                      </button>
                                    ) : <p key={index} className="text-surface-900 font-semibold truncate">{docName}</p>;
                                  })}
                                </div>
                              )
                            ) : <p className="mt-0.5 text-surface-700 font-semibold break-all whitespace-pre-wrap">{renderedValue}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Hızlı Profil Aksiyon Butonları */}
              <div className="space-y-2 pt-4 border-t border-surface-100">
                <button type="button" onClick={() => void handleCopySurveyLink(selectedAttendee.id)} className="w-full inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-surface-200 bg-white text-xs font-semibold text-surface-700 shadow-card transition hover:bg-surface-50">
                  <Link2 className="h-3.5 w-3.5 text-surface-400 stroke-[2]" /> <span>Kişisel Anket Linki</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAttendee(null);
                    void handleDelete(selectedAttendee.id);
                  }}
                  className="w-full inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5 stroke-[1.8]" /> <span>Katılımcı Kaydını Sil</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}