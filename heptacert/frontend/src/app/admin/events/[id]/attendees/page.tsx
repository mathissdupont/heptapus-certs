"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  listAttendees, importAttendees, deleteAttendee, getAdminAttendeeSurveyLink,
  getAttendanceMatrix, bulkCertifyQueue, getBulkGenerateJob,
  exportAttendanceFile, apiFetch, getMySubscription,
  type AttendeeOut, type AttendanceMatrix, type RegistrationField, type SubscriptionInfo
} from "@/lib/api";
import Link from "next/link";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import ConfirmModal from "@/components/Admin/ConfirmModal";
import {
  Users, Upload, Search, Trash2, Loader2, ChevronLeft, Download,
  Award, BarChart3, CheckSquare, XSquare, RefreshCw, AlertCircle,
  UserCheck, UserX, CheckCircle2, QrCode, LockKeyhole, Hash,
  ShieldAlert, Sparkles, Copy, Link2
} from "lucide-react";

type Tab = "list" | "matrix";

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
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);
  const [copyingSurveyId, setCopyingSurveyId] = useState<number | null>(null);
  const [copiedSurveyId, setCopiedSurveyId] = useState<number | null>(null);
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeOut | null>(null);

  // Matrix tab
  const [matrix, setMatrix] = useState<AttendanceMatrix | null>(null);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [matrixError, setMatrixError] = useState<string | null>(null);

  // Bulk certify
  const [certifying, setCertifying] = useState(false);
  const [certResult, setCertResult] = useState<string | null>(null);

  // Plan gate
  const [planOk, setPlanOk] = useState<boolean | null>(null);

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
    setRegistrationFields(Array.isArray(r.config?.registration_fields) ? r.config.registration_fields : []);
    const hasPaidPlan = subInfo.role === "superadmin" || (subInfo.active && ["pro", "growth", "enterprise"].includes(subInfo.plan_id ?? ""));
    setPlanOk(hasPaidPlan);
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

  useEffect(() => {
    if (!eventId) return;
    loadEventMeta();
    loadAttendees(1, "");
  }, [eventId]);

  useEffect(() => {
    if (tab === "matrix" && !matrix) loadMatrix();
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
  const getRegistrationPreview = useCallback((attendee: AttendeeOut) => {
    if (!registrationFields.length) return [];
    return registrationFields
      .map((field) => {
        const value = attendee.registration_answers?.[field.id];
        if (!value) return null;
        return { label: field.label, value };
      })
      .filter((item): item is { label: string; value: string } => Boolean(item))
      .slice(0, 2);
  }, [registrationFields]);

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

        {/* Tabs */}
        <div className="mb-5 w-full overflow-x-auto"><div className="flex w-max min-w-full gap-1 rounded-xl bg-gray-100 p-1 sm:min-w-0 sm:w-fit">
          <button
            onClick={() => setTab("list")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "list" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Liste</span>
          </button>
          <button
            onClick={() => setTab("matrix")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "matrix" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Yoklama Matrisi</span>
          </button>
        </div>
        </div>

        {tab === "list" && (
          <>
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
                    return (
                      <div key={field.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{field.label}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{value || "—"}</p>
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

