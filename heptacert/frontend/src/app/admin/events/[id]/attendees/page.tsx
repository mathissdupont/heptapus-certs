"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  listAttendees, importAttendees, createManualAttendee, deleteAttendee, getAdminAttendeeSurveyLink,
  getAttendanceMatrix, bulkCertifyQueue, getBulkGenerateJob,
  exportAttendanceFile, exportRegistrationDocumentsZip, apiFetch, getMySubscription, setToken,
  type AttendeeOut, type AttendanceMatrix, type RegistrationField, type SubscriptionInfo
} from "@/lib/api";
import Link from "next/link";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import ConfirmModal from "@/components/Admin/ConfirmModal";
import {
  Users, Upload, Search, Trash2, Loader2, ChevronLeft, Download,
  Award, BarChart3, CheckSquare, XSquare, RefreshCw, AlertCircle,
  UserCheck, UserX, CheckCircle2, QrCode, LockKeyhole, Hash, UserPlus,
  ShieldAlert, Sparkles, Copy, Link2, ClipboardList, FileSpreadsheet,
  ExternalLink, Unplug
} from "lucide-react";

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

export default function AdminAttendeesPage() {
  const params = useParams();
  const router = useRouter();
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

  // Plan gate
  const [planOk, setPlanOk] = useState<boolean | null>(null);
  const [authBridgeReady, setAuthBridgeReady] = useState(false);

  // Google Sheets
  const [sheetsStatus, setSheetsStatus] = useState<EventSheetsStatus | null>(null);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsAction, setSheetsAction] = useState<"auth" | "connect" | "sync" | "disconnect" | null>(null);

  // Confirm modals
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [showCertifyConfirm, setShowCertifyConfirm] = useState(false);

  const limit = 50;

  async function loadEventMeta() {
    const [r, subInfo] = await Promise.all([
      apiFetch(`/admin/events/${eventId}`).then((r) => r.json()),
      getMySubscription().catch(() => ({ active: false, plan_id: null, expires_at: null, role: null } as SubscriptionInfo)),
    ]);
    setEventName(r.name);
    setMinSessions(r.min_sessions_required ?? 1);
    const fields = Array.isArray(r.config?.registration_fields) ? r.config.registration_fields : [];
    setRegistrationFields(fields);
    setSelectedQuestionId((current) => current || fields[0]?.id || null);
    const hasPaidPlan = subInfo.role === "superadmin" || (subInfo.active && ["pro", "growth", "enterprise"].includes(subInfo.plan_id ?? ""));
    setPlanOk(hasPaidPlan);
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

  async function loadAttendees(p = 1, s = search) {
    setLoadingList(true);
    setListError(null);
    try {
      const data = await listAttendees(eventId, { page: p, limit, search: s });
      setAttendees(data.items);
      setTotal(data.total);
      setPage(p);
    } catch (e: any) {
      setListError(e.message);
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
    const bridgeToken =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("admin_token")
        : null;
    if (bridgeToken) {
      setToken(bridgeToken);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("admin_token");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      }
    }
    setAuthBridgeReady(true);
  }, []);

  useEffect(() => {
    if (!eventId || !authBridgeReady) return;
    loadEventMeta();
    loadAttendees(1, "");
    loadSheetsStatus();
  }, [eventId, authBridgeReady]);

  useEffect(() => {
    if (tab === "matrix" && !matrix) loadMatrix();
    if (tab === "answers" && answerAttendees.length === 0) loadQuestionAnswers();
  }, [tab]);

  useEffect(() => {
    if (planOk === false) {
      router.replace("/pricing?source=admin-premium");
    }
  }, [planOk, router]);

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

  function handleBulkCertify() {
    setShowCertifyConfirm(true);
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
    <div className="flex flex-col gap-6 pb-20">
        <EventAdminNav eventId={eventId} eventName={eventName} active="attendees" className="mb-6 flex flex-col gap-2" />

        {/* Plan gate */}
        {planOk === false && (
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-8 text-center mb-6">
            <ShieldAlert className="w-12 h-12 text-violet-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-800 mb-2">Pro veya Enterprise Plan Gerekli</h2>
            <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
              Katılımcı yönetimi, yoklama matrisi ve toplu sertifika üretimi özellikleri sadece Pro ve Enterprise planlarında kullanılabilir.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-violet-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-violet-700 transition text-sm"
            >
              <Sparkles className="w-4 h-4" /> Planı Yükselt
            </Link>
          </div>
        )}

        {planOk !== false && (
          <>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Katılımcı Yönetimi</h1>
            <p className="text-sm text-gray-500 mt-0.5">{eventName} - Min. {minSessions} oturum</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => void handleExportAttendance("xlsx")}
                disabled={exporting}
                className="inline-flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Excel İndir
              </button>
              {hasFileRegistrationField && (
                <button
                  type="button"
                  onClick={() => void handleExportRegistrationDocuments()}
                  disabled={exportingDocuments}
                  className="inline-flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition"
                >
                  {exportingDocuments ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Belgeleri İndir (ZIP)
                </button>
              )}
            <Link
              href={`/admin/events/${eventId}/checkin`}
              className="inline-flex items-center justify-center gap-2 border border-indigo-300 bg-indigo-50 text-indigo-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-100 transition"
            >
              <UserCheck className="w-4 h-4" /> Manuel Check-in
            </Link>
            <button
              onClick={handleBulkCertify}
              disabled={certifying}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 transition text-sm"
            >
              {certifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
              Sertifika Üret
            </button>
          </div>
        </div>

        {certResult && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-800 mb-4">{certResult}</div>
        )}

        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Google Sheets otomasyonu</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                  Bu etkinliğin katılımcıları Google E-Tablolar'a canlı aktarılır. Mevcut kayıtları buradan senkronlayabilir,
                  yeni kayıtların otomatik satır olarak eklenmesini sağlayabilirsiniz.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  {sheetsLoading ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Durum kontrol ediliyor
                    </span>
                  ) : sheetsStatus?.google_email ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                      {sheetsStatus.google_email}
                    </span>
                  ) : (
                    <span>Google hesabı bağlı değil</span>
                  )}
                  {sheetsStatus?.last_synced_at && (
                    <span>Son senkron: {new Date(sheetsStatus.last_synced_at).toLocaleString("tr-TR")}</span>
                  )}
                  {Boolean(sheetsStatus?.missing_scopes?.length) && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                      Sheets izni eksik
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              {!sheetsStatus?.google_configured ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  Google OAuth ayarları .env içinde eksik.
                </div>
              ) : !sheetsStatus?.google_connected ? (
                <button
                  type="button"
                  onClick={handleConnectGoogleSheetsAuth}
                  disabled={Boolean(sheetsAction)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {sheetsAction === "auth" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  {sheetsStatus?.google_email ? "Sheets iznini tamamla" : "Google izni ver"}
                </button>
              ) : sheetsStatus.enabled && sheetsStatus.spreadsheet_url ? (
                <>
                  <a
                    href={sheetsStatus.spreadsheet_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    <ExternalLink className="h-4 w-4" /> Sheet'i aç
                  </a>
                  <button
                    type="button"
                    onClick={handleSyncGoogleSheet}
                    disabled={Boolean(sheetsAction)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                  >
                    {sheetsAction === "sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Senkronla
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectGoogleSheet}
                    disabled={Boolean(sheetsAction)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    {sheetsAction === "disconnect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                    Kapat
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateGoogleSheet}
                  disabled={Boolean(sheetsAction)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {sheetsAction === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  Sheet oluştur ve bağla
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-5 w-full overflow-x-auto"><div className="flex w-max min-w-full gap-1 rounded-xl bg-gray-100 p-1 sm:min-w-0 sm:w-fit">
          <button
            onClick={() => setTab("list")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "list" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Katılımcı Listesi</span>
          </button>
          <button
            onClick={() => setTab("matrix")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "matrix" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Yoklama Matrisi</span>
          </button>
          <button
            onClick={() => setTab("answers")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "answers" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            <span className="flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Soru Bazlı Cevaplar</span>
          </button>
        </div>
        </div>

        {tab === "list" && (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-500" /> Manuel Katılımcı Ekle
              </h2>
              <form onSubmit={handleManualAdd} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="ornek@mail.com"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  value={manualFirstName}
                  onChange={(e) => setManualFirstName(e.target.value)}
                  placeholder="Ad"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  value={manualLastName}
                  onChange={(e) => setManualLastName(e.target.value)}
                  placeholder="Soyad"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={addingManual}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {addingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Ekle
                </button>
              </form>
              {manualResult && <p className="mt-2 text-xs text-emerald-700">✅ {manualResult}</p>}
            </div>

            {/* Import */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-500" /> Excel/CSV İçe Aktar
              </h2>
              <div className="flex gap-2 flex-wrap">
                <label className="flex-1 min-w-0">
                  <span className="sr-only">Dosya seç</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-medium hover:file:bg-indigo-100 cursor-pointer"
                  />
                </label>
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-1.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition shrink-0"
                >
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Yükle
                </button>
              </div>
              {importResult && (
                <p className="text-xs text-green-700 mt-2">
                  ✅ {importResult.added} katılımcı eklendi, {importResult.skipped} atlandı.
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">Dosyada <code>name</code>/<code>ad</code> ve <code>email</code>/<code>e-posta</code> sütunları olmalı.</p>
            </div>

            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ad veya e-posta ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition sm:min-w-[96px]">
                Ara
              </button>
            </form>

            {listError && (
              <div className="error-banner mb-3">{listError}</div>
            )}

            {loadingList ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
              </div>
            ) : attendees.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Katılımcı bulunamadı</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-2">{total} katılımcı</p>
                <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ad Soyad</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">E-posta</th>
                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Oturum</th>
                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sertifika</th>
                        <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Anket</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {attendees.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 font-medium text-gray-800">
                            <button
                              type="button"
                              onClick={() => setSelectedAttendee(a)}
                              className="text-left transition hover:text-indigo-600"
                            >
                              {a.name}
                            </button>
                            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${a.source === "self_register" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                              {a.source === "self_register" ? "kendi" : "import"}
                            </span>
                            {a.public_member_name && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                uye: {a.public_member_name}
                              </span>
                            )}
                            {getRegistrationPreview(a).length > 0 && (
                              <div className="mt-2 space-y-1">
                                {getRegistrationPreview(a).map((item) => (
                                  <p key={`${a.id}-${item.label}`} className="max-w-xs truncate text-xs font-medium text-gray-500">
                                    <span className="text-gray-400">{item.label}:</span> {item.value}
                                  </p>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{a.email}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-semibold ${a.sessions_attended >= minSessions ? "text-green-600" : "text-gray-500"}`}>
                              {a.sessions_attended}
                            </span>
                            <span className="text-gray-300">/{minSessions}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {a.has_certificate ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center hidden lg:table-cell">
                            <button
                              onClick={() => void handleCopySurveyLink(a.id)}
                              disabled={copyingSurveyId === a.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
                              title="Katılımcıya özel anket linkini kopyala"
                            >
                              {copyingSurveyId === a.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : copiedSurveyId === a.id ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <Link2 className="w-3.5 h-3.5" />
                              )}
                              {copiedSurveyId === a.id ? "Kopyalandı" : "Anket Linki"}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => void handleCopySurveyLink(a.id)}
                                disabled={copyingSurveyId === a.id}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 lg:hidden"
                                title="Katılımcıya özel anket linkini kopyala"
                              >
                                {copyingSurveyId === a.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : copiedSurveyId === a.id ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                                {copiedSurveyId === a.id ? "Kopyalandı" : "Anket"}
                              </button>
                              <button
                                onClick={() => handleDelete(a.id)}
                                disabled={deletingId === a.id}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                              >
                                {deletingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => loadAttendees(page - 1)}
                      disabled={page === 1}
                      className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-40 transition"
                    >
                      ← Önceki
                    </button>
                    <span className="px-3 py-1.5 text-sm text-gray-500">{page}/{totalPages}</span>
                    <button
                      onClick={() => loadAttendees(page + 1)}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50 disabled:opacity-40 transition"
                    >
                      Sonraki →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === "answers" && (
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    <ClipboardList className="h-4 w-4 text-indigo-600" />
                    Form Soruları
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Google Forms mantığında, önce soruyu seçip sonra katılımcı cevaplarını inceleyin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadQuestionAnswers()}
                  className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-gray-50 hover:text-indigo-600"
                  title="Cevapları yenile"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800">
                <div className="flex items-start gap-2">
                  <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Canlı E-Tablo bağlantısı bu sayfanın üstündeki Google Sheets otomasyonu alanından yönetilir.
                  </p>
                </div>
              </div>

              {registrationFields.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                  Bu etkinlikte özel kayıt sorusu yok.
                </div>
              ) : (
                <div className="space-y-2">
                  {answerQuestionStats.map(({ field, answeredCount }) => (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => setSelectedQuestionId(field.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        selectedQuestion?.id === field.id
                          ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold">{field.label}</p>
                        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-gray-500">
                          {answeredCount}/{answerAttendees.length}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {field.type === "textarea" ? "Uzun metin" : field.type === "select" ? "Seçenekli soru" : field.type === "file" ? "Dosya yükleme" : "Kısa cevap"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Seçili soru</p>
                <h3 className="mt-1 text-lg font-black text-gray-900">{selectedQuestion?.label || "Soru seçin"}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {answerAttendees.length} katılımcı içinde cevap dağılımı gösteriliyor.
                </p>
              </div>

              {answersError && (
                <div className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{answersError}</div>
              )}

              {loadingAnswers ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                </div>
              ) : !selectedQuestion ? (
                <div className="px-5 py-16 text-center text-sm text-gray-400">İncelenecek soru bulunamadı.</div>
              ) : selectedQuestionAnswers.length === 0 ? (
                <div className="px-5 py-16 text-center text-sm text-gray-400">Henüz katılımcı cevabı yok.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {selectedQuestionAnswers.map(({ attendee, value }) => {
                    const hasAnswer = Array.isArray(value) ? value.length > 0 : value != null && value !== "";
                    return (
                      <div key={`${selectedQuestion.id}-${attendee.id}`} className="grid gap-3 px-5 py-4 md:grid-cols-[240px_1fr]">
                        <div>
                          <button
                            type="button"
                            onClick={() => setSelectedAttendee(attendee)}
                            className="text-left text-sm font-bold text-gray-900 transition hover:text-indigo-600"
                          >
                            {attendee.name}
                          </button>
                          <p className="mt-1 break-all text-xs text-gray-500">{attendee.email}</p>
                        </div>
                        <div className={`rounded-xl px-4 py-3 text-sm leading-6 ${hasAnswer ? "bg-gray-50 text-gray-800" : "bg-gray-50 text-gray-400"}`}>
                          {selectedQuestion.type === "file" ? (
                            <span>{hasAnswer ? "Dosya cevabı katılımcı kartında görüntülenebilir." : "Yanıt yok"}</span>
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

        {tab === "matrix" && (
          <>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">Her katılımcının oturum bazlı durumu</p>
              <button onClick={loadMatrix} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition">
                <RefreshCw className="w-3.5 h-3.5" /> Yenile
              </button>
            </div>

            {matrixError && (
              <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 mb-3">{matrixError}</div>
            )}

            {loadingMatrix ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
              </div>
            ) : matrix && (
              <>
                {/* Summary */}
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="bg-white rounded-xl border p-3 text-center shadow-sm">
                    <p className="text-2xl font-bold text-gray-800">{matrix.rows.length}</p>
                    <p className="text-xs text-gray-500">Toplam</p>
                  </div>
                  <div className="bg-white rounded-xl border border-green-200 p-3 text-center shadow-sm">
                    <p className="text-2xl font-bold text-green-600">{matrix.rows.filter((r) => r.meets_threshold).length}</p>
                    <p className="text-xs text-gray-500">Eşiği Geçen</p>
                  </div>
                  <div className="bg-white rounded-xl border border-indigo-200 p-3 text-center shadow-sm">
                    <p className="text-2xl font-bold text-indigo-600">{matrix.rows.filter((r) => r.has_certificate).length}</p>
                    <p className="text-xs text-gray-500">Sertifika Aldı</p>
                  </div>
                </div>

                {eligibleCount > 0 && (
                  <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
                    <span>⚡ {eligibleCount} katılımcı eşiği geçti ama henüz sertifika almadı.</span>
                    <button
                      onClick={handleBulkCertify}
                      disabled={certifying}
                      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                    >
                      {certifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Award className="w-3 h-3" />}
                      Üret
                    </button>
                  </div>
                )}

                {matrix.rows.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>Henüz katılımcı yok</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto shadow-sm">
                    <table className="text-xs w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left px-3 py-2.5 font-semibold text-gray-500 whitespace-nowrap">Ad Soyad</th>
                          {matrix.sessions.map((s) => (
                            <th key={s.id} className="text-center px-2 py-2.5 font-semibold text-gray-500 whitespace-nowrap max-w-[80px]" title={s.session_date || ""}>
                              {s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name}
                            </th>
                          ))}
                          <th className="text-center px-3 py-2.5 font-semibold text-gray-500">Toplam</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-gray-500">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {matrix.rows.map((row) => (
                          <tr key={row.attendee_id} className={`transition ${row.meets_threshold ? "bg-green-50/30" : ""}`}>
                            <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">{row.name}</td>
                            {matrix.sessions.map((s) => (
                              <td key={s.id} className="text-center px-2 py-2.5">
                                {row.checkins[String(s.id)] ? (
                                  <CheckSquare className="w-4 h-4 text-green-500 mx-auto" />
                                ) : (
                                  <XSquare className="w-4 h-4 text-gray-200 mx-auto" />
                                )}
                              </td>
                            ))}
                            <td className="text-center px-3 py-2.5 font-bold text-gray-700">
                              {row.sessions_attended}/{matrix.sessions.length}
                            </td>
                            <td className="text-center px-3 py-2.5">
                              {row.has_certificate ? (
                                <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                  <Award className="w-3 h-3" /> Sertifika
                                </span>
                              ) : row.meets_threshold ? (
                                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                  ✓ Uygun
                                </span>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
          </>
        )}
          <ConfirmModal
            open={pendingDeleteId !== null}
            title="Katılımcıyı sil"
            description="Bu katılımcıyı silmek istediğinize emin misiniz?"
            danger
            loading={deletingId !== null}
            onConfirm={confirmDelete}
            onCancel={() => setPendingDeleteId(null)}
          />
      <ConfirmModal
        open={showCertifyConfirm}
            title="Toplu sertifika üret"
            description="Eşiği geçen tüm katılımcılara sertifika üretilecek. Onaylıyor musunuz?"
            onConfirm={executeBulkCertify}
            onCancel={() => setShowCertifyConfirm(false)}
      />

      {selectedAttendee && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[1px]">
          <div className="h-full w-full max-w-full overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl sm:max-w-md sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Katılımcı Kartı</p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">{selectedAttendee.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{selectedAttendee.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAttendee(null)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              >
                <XSquare className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kayıt Tipi</p>
                <p className="mt-2 text-lg font-black text-slate-900">
                  {selectedAttendee.source === "self_register" ? "Kendi kaydı" : "İçe aktarıldı"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Oturum</p>
                <p className="mt-2 text-lg font-black text-slate-900">{selectedAttendee.sessions_attended}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sertifika</p>
                <p className="mt-2 text-lg font-black text-slate-900">
                  {selectedAttendee.has_certificate ? "Var" : "Yok"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kayıt Tarihi</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {new Date(selectedAttendee.registered_at).toLocaleString("tr-TR")}
                </p>
              </div>
            </div>

            {selectedAttendee.public_member_name && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Bağlı Üye Hesabı</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedAttendee.public_member_name}</p>
                <p className="mt-1 text-xs text-slate-500">{selectedAttendee.public_member_email}</p>
              </div>
            )}

            {registrationFields.length > 0 && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Özel kayıt alanları</p>
                <div className="mt-4 grid gap-3">
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
                      <div key={field.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{field.label}</p>
                        {field.type === "file" ? (
                          docsForField.length === 0 ? (
                            <p className="mt-2 text-sm font-semibold text-slate-900">—</p>
                          ) : (
                            <div className="mt-2 space-y-1.5">
                              {docsForField.map((doc, index) => {
                                const docName = String(doc.name || `Dosya ${index + 1}`);
                                const docPath = String(doc.path || "");
                                if (!docPath) {
                                  return (
                                    <p key={`${field.id}-doc-${index}`} className="text-sm font-semibold text-slate-900">
                                      {docName}
                                    </p>
                                  );
                                }
                                return (
                                  <a
                                    key={`${field.id}-doc-${index}`}
                                    href={`/api/files/${encodeURI(docPath)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block truncate text-sm font-semibold text-indigo-700 underline-offset-2 hover:underline"
                                    title={docName}
                                  >
                                    {docName}
                                  </a>
                                );
                              })}
                            </div>
                          )
                        ) : (
                          <p className="mt-2 text-sm font-semibold text-slate-900">{renderedValue}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Hızlı aksiyonlar</p>
              <div className="mt-4 grid gap-3">
                <button
                  type="button"
                  onClick={() => void handleCopySurveyLink(selectedAttendee.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                  <Link2 className="h-4 w-4" />
                  Kişisel anket linkini kopyala
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAttendee(null);
                    void handleDelete(selectedAttendee.id);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Katılımcıyı sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

