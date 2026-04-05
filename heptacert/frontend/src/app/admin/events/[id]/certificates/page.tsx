"use client";

import { apiFetch, API_BASE, getToken } from "@/lib/api";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Search,
  Loader2,
  AlertCircle,
  Trash2,
  ShieldOff,
  Clock,
  CheckCircle2,
  Plus,
  ExternalLink,
  Download,
  FileText,
  Filter,
  RefreshCcw,
  Zap,
  Hash,
  LockKeyhole,
  FileDown,
  CheckSquare,
  Square,
  X,
  QrCode,
  Users,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/useToast";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import ConfirmModal from "@/components/Admin/ConfirmModal";
import PageHeader from "@/components/Admin/PageHeader";

type CertStatus = "active" | "revoked" | "expired";

type CertificateOut = {
  id: number;
  uuid: string;
  public_id?: string | null;
  student_name: string;
  event_id: number;
  status: CertStatus;
  hosting_term?: string | null;
  hosting_ends_at?: string | null;
  pdf_url?: string | null;
};

type CertificateListOut = {
  items: CertificateOut[];
  total: number;
  page: number;
  limit: number;
};

function getStatusStyle(s: CertStatus) {
  if (s === "active") return {
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  };
  if (s === "expired") return {
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: <Clock className="h-3.5 w-3.5" />,
  };
  return {
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    icon: <ShieldOff className="h-3.5 w-3.5" />,
  };
}

export default function CertificatesPage({ params }: { params: { id: string } }) {
  const eventId = Number(params.id);
  const t = useT();
  const { lang } = useI18n();

  const [items, setItems] = useState<CertificateOut[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | CertStatus>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [issueName, setIssueName] = useState("");
  const [issueTerm, setIssueTerm] = useState<"monthly" | "yearly">("yearly");
  const [issuing, setIssuing] = useState(false);
  const [eventName, setEventName] = useState<string>("");

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<"revoke" | "expire" | "delete" | null>(null);

  // Single delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const allSelected = items.length > 0 && items.every((c) => selectedIds.has(c.id));
  const toast = useToast();
  const copy = lang === "tr"
    ? {
        pageTitle: "Sertifikalar",
        pageSubtitle: "Basim, filtreleme, durum guncelleme ve disa aktarim artik tek akista.",
        exportCsv: "CSV indir",
        exportExcel: "Excel indir",
        visibleResults: "Gorunen sonuc",
        selected: "Secili",
        currentPage: "Sayfa",
        issueTitle: "Hizli manuel basim",
        issueBody: "Tek bir isimle hizlica sertifika uretin; telefon ekraninda bile kolayca tamamlanir.",
        recipientPlaceholder: "Orn. Ayse Yilmaz",
        issueAction: "Sertifika olustur",
        filterTitle: "Ara ve filtrele",
        filterBody: "Listeyi isim veya durum ile daraltin, sonra toplu islem uygulayin.",
        refresh: "Yenile",
        selectionTitle: "Toplu islem hazir",
        clearSelection: "Temizle",
        selectedCount: (count: number) => `${count} sertifika secildi`,
        locked: "PDF yok",
        currentView: "Mevcut gorunum",
        verifyAction: "Dogrula",
        downloadAction: "Indir",
        activeAction: "Aktif",
        revokeAction: "Iptal",
        expireAction: "Sure Bitir",
        deleteAction: "Sil",
        deleteSingleTitle: "Sertifikayi sil",
        deleteSingleBody: "Bu sertifikayi sistemden kalici olarak silmek istediginize emin misiniz?",
        bulkDeleteTitle: "Toplu sil",
        bulkRevokeTitle: "Toplu iptal",
        bulkExpireTitle: "Toplu sure bitir",
        bulkDeleteBody: (count: number) => `Secili ${count} sertifikayi kalici olarak silmek istediginize emin misiniz?`,
        bulkRevokeBody: (count: number) => `Secili ${count} sertifikayi iptal etmek istediginize emin misiniz?`,
        bulkExpireBody: (count: number) => `Secili ${count} sertifikayi suresi dolmus olarak isaretlemek istediginize emin misiniz?`,
      }
    : {
        pageTitle: "Certificates",
        pageSubtitle: "Issuing, filtering, status updates and export now live in one cleaner flow.",
        exportCsv: "Export CSV",
        exportExcel: "Export Excel",
        visibleResults: "Visible results",
        selected: "Selected",
        currentPage: "Page",
        issueTitle: "Quick manual issue",
        issueBody: "Create a certificate from a single attendee name, even from a phone without fighting the layout.",
        recipientPlaceholder: "e.g. Alex Morgan",
        issueAction: "Create certificate",
        filterTitle: "Search and filter",
        filterBody: "Narrow the list by name or status, then apply bulk actions with less friction.",
        refresh: "Refresh",
        selectionTitle: "Bulk action ready",
        clearSelection: "Clear",
        selectedCount: (count: number) => `${count} certificates selected`,
        locked: "No PDF",
        currentView: "Current view",
        verifyAction: "Verify",
        downloadAction: "Download",
        activeAction: "Active",
        revokeAction: "Revoke",
        expireAction: "Expire",
        deleteAction: "Delete",
        deleteSingleTitle: "Delete certificate",
        deleteSingleBody: "Are you sure you want to permanently delete this certificate?",
        bulkDeleteTitle: "Bulk delete",
        bulkRevokeTitle: "Bulk revoke",
        bulkExpireTitle: "Bulk expire",
        bulkDeleteBody: (count: number) => `Are you sure you want to permanently delete ${count} selected certificates?`,
        bulkRevokeBody: (count: number) => `Are you sure you want to revoke ${count} selected certificates?`,
        bulkExpireBody: (count: number) => `Are you sure you want to mark ${count} selected certificates as expired?`,
      };

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    if (search.trim()) qs.set("search", search.trim());
    if (status) qs.set("status", status);
    return qs.toString();
  }, [page, limit, search, status]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const [certRes, eventRes] = await Promise.all([
        apiFetch(`/admin/events/${eventId}/certificates?${query}`, { method: "GET" }),
        !eventName ? apiFetch(`/admin/events/${eventId}`, { method: "GET" }) : Promise.resolve(null),
      ]);
      const data = (await certRes.json()) as CertificateListOut;
      setItems(data.items);
      setTotal(data.total);
      setSelectedIds(new Set());
      if (eventRes) {
        const ev = await eventRes.json();
        if (ev?.name) setEventName(ev.name);
      }
    } catch (e: any) {
      setErr(e?.message || "Sertifika listesi cekilemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function patchStatus(certId: number, next: CertStatus) {
    setErr(null);
    try {
      await apiFetch(`/admin/certificates/${certId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      toast.success("Durum güncellendi.");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Durum güncellenemedi.");
      setErr(e?.message || "Durum guncellenemedi.");
    }
  }

  async function confirmSoftDelete() {
    if (!deleteTargetId) return;
    setDeleteLoading(true);
    setErr(null);
    try {
      await apiFetch(`/admin/certificates/${deleteTargetId}`, { method: "DELETE" });
      toast.success("Sertifika silindi.");
      setDeleteTargetId(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Silme işlemi başarısız.");
      setErr(e?.message || "Silme islemi basarisiz.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function issueOne() {
    if (!issueName.trim()) return setErr("Lütfen geçerli bir isim girin.");
    setErr(null);
    setIssuing(true);
    try {
      await apiFetch(`/admin/events/${eventId}/certificates`, {
        method: "POST",
        body: JSON.stringify({ student_name: issueName.trim(), hosting_term: issueTerm }),
      });
      toast.success(`"${issueName.trim()}" için sertifika oluşturuldu.`);
      setIssueName("");
      setPage(1);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Sertifika basım işlemi başarısız.");
      setErr(e?.message || "Sertifika basim islemi basarisiz.");
    } finally {
      setIssuing(false);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((c) => c.id)));
    }
  }

  async function executeBulkAction() {
    if (!bulkTarget || selectedIds.size === 0) return;
    setBulkLoading(true);
    setErr(null);
    try {
      await apiFetch(`/admin/events/${eventId}/certificates/bulk-action`, {
        method: "POST",
        body: JSON.stringify({ cert_ids: [...selectedIds], action: bulkTarget }),
      });
      toast.success(`${selectedIds.size} sertifika başarıyla işlendi.`);
      setBulkTarget(null);
      setSelectedIds(new Set());
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Toplu işlem başarısız.");
      setErr(e?.message || "Toplu işlem başarısız.");
    } finally {
      setBulkLoading(false);
    }
  }

  function exportCerts(format: "csv" | "xlsx") {
    const token = getToken();
    const url = `${API_BASE}/admin/events/${eventId}/certificates/export?format=${format}`;
    // Use a temporary link with authorization header via fetch + blob
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `certificates-event-${eventId}.${format}`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => setErr("Export başarısız."));
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const containerVars = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const rowVars = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } };
  const visibleStats = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { active: 0, revoked: 0, expired: 0 },
    );
  }, [items]);

  return (
    <div className="flex flex-col gap-6 pb-24 pt-6">
      <EventAdminNav eventId={eventId} active="certificates" eventName={eventName || `Etkinlik #${eventId}`} className="flex flex-col gap-3" />
      <PageHeader
        title={copy.pageTitle}
        subtitle={copy.pageSubtitle}
        icon={<FileText className="h-5 w-5" />}
        actions={
          <>
            <button onClick={() => exportCerts("csv")} className="btn-secondary">
              <FileDown className="h-4 w-4" />
              {copy.exportCsv}
            </button>
            <button onClick={() => exportCerts("xlsx")} className="btn-primary">
              <FileDown className="h-4 w-4" />
              {copy.exportExcel}
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">{t("certs_total")}</p>
          <p className="mt-2 text-3xl font-black text-surface-900">{total}</p>
          <p className="mt-1 text-xs text-surface-500">{copy.visibleResults}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.currentView}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{t("certs_status_active")} {visibleStats.active}</span>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">{t("certs_status_revoked")} {visibleStats.revoked}</span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{t("certs_status_expired")} {visibleStats.expired}</span>
          </div>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.selected}</p>
          <p className="mt-2 text-3xl font-black text-surface-900">{selectedIds.size}</p>
          <p className="mt-1 text-xs text-surface-500">{copy.selectionTitle}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">{copy.currentPage}</p>
          <p className="mt-2 text-3xl font-black text-surface-900">{page}/{totalPages}</p>
          <p className="mt-1 text-xs font-mono text-surface-500">#{eventId}</p>
        </div>
      </div>

      {/* Bulk action floating bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-3 right-3 z-50 rounded-3xl bg-gray-950 p-4 text-white shadow-2xl sm:bottom-6 sm:left-1/2 sm:right-auto sm:min-w-[560px] sm:-translate-x-1/2"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.selectionTitle}</p>
                <p className="mt-1 text-sm font-bold">{copy.selectedCount(selectedIds.size)}</p>
              </div>
              <button onClick={() => setSelectedIds(new Set())} className="rounded-2xl border border-white/10 p-2 text-gray-400 transition-colors hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button onClick={() => setBulkTarget("revoke")} disabled={bulkLoading} className="flex items-center justify-center gap-1.5 rounded-2xl bg-rose-600 px-3 py-2.5 text-xs font-bold transition-colors hover:bg-rose-700 disabled:opacity-50">
                <ShieldOff className="h-3.5 w-3.5" /> {copy.revokeAction}
              </button>
              <button onClick={() => setBulkTarget("expire")} disabled={bulkLoading} className="flex items-center justify-center gap-1.5 rounded-2xl bg-amber-600 px-3 py-2.5 text-xs font-bold transition-colors hover:bg-amber-700 disabled:opacity-50">
                <Clock className="h-3.5 w-3.5" /> {copy.expireAction}
              </button>
              <button onClick={() => setBulkTarget("delete")} disabled={bulkLoading} className="flex items-center justify-center gap-1.5 rounded-2xl bg-red-700 px-3 py-2.5 text-xs font-bold transition-colors hover:bg-red-800 disabled:opacity-50">
                <Trash2 className="h-3.5 w-3.5" /> {copy.deleteAction}
              </button>
            </div>
            {bulkLoading && <Loader2 className="mt-3 h-4 w-4 animate-spin" />}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_400px]">

        {/* LEFT */}
        <div className="flex flex-col gap-5 xl:order-2">

          {/* Issue card */}
          <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} className="order-2 card relative overflow-hidden p-6 xl:order-1">
            <div className="absolute top-0 left-0 w-1 h-full rounded-l-3xl bg-amber-400" />
            <div className="mb-3 flex items-center gap-3 text-gray-800 font-bold">
              <div className="p-2 rounded-xl bg-amber-50"><Plus className="h-4 w-4 text-amber-500" /></div>
              {copy.issueTitle}
            </div>
            <p className="mb-5 text-sm leading-6 text-surface-500">{copy.issueBody}</p>
            <div className="grid gap-3">
              <div>
                <label className="label">{t("certs_recipient")}</label>
                <input value={issueName} onChange={(e) => setIssueName(e.target.value)} placeholder={copy.recipientPlaceholder} className="input-field" />
              </div>
              <div>
                <label className="label">{t("certs_hosting_term")}</label>
                <select value={issueTerm} onChange={(e) => setIssueTerm(e.target.value as any)} className="input-field appearance-none">
                  <option value="monthly">{t("certs_term_monthly")}</option>
                  <option value="yearly">{t("certs_term_yearly")} (2 Ay)</option>
                </select>
              </div>
              <button onClick={issueOne} disabled={issuing} className="btn-primary mt-1 w-full justify-center">
                {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {copy.issueAction}
              </button>
            </div>
          </motion.div>

          {/* Filter card */}
          <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="order-1 card p-6 xl:order-2">
            <div className="mb-3 flex items-center gap-3 text-gray-800 font-bold">
              <div className="p-2 rounded-xl bg-brand-50"><Filter className="h-4 w-4 text-brand-600" /></div>
              {copy.filterTitle}
            </div>
            <p className="mb-4 text-sm leading-6 text-surface-500">{copy.filterBody}</p>
            <div className="grid gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder={t("certs_search_placeholder")} className="input-field pl-9" />
              </div>
              <div className="flex gap-2">
                <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as any); }} className="input-field flex-1 appearance-none">
                  <option value="">{t("certs_status_all")}</option>
                  <option value="active">{t("certs_status_active")}</option>
                  <option value="revoked">{t("certs_status_revoked")}</option>
                  <option value="expired">{t("certs_status_expired")}</option>
                </select>
                <button onClick={() => load()} className="btn-secondary justify-center">
                  <RefreshCcw className="h-4 w-4" />
                  <span className="hidden sm:inline">{copy.refresh}</span>
                </button>
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {err && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="error-banner flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {err}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT - Table */}
        <div className="flex flex-col xl:order-1">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden flex flex-col flex-grow">

            <div className="bg-surface-50 border-b border-surface-100 px-5 py-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-surface-700 font-bold">
                <button onClick={toggleSelectAll} className="text-surface-400 hover:text-brand-600 transition-colors" title={lang === "tr" ? "Tumunu sec" : "Select all"}>
                  {allSelected ? <CheckSquare className="h-4 w-4 text-brand-600" /> : <Square className="h-4 w-4" />}
                </button>
                <FileText className="h-4 w-4 text-gray-400" />
                {t("certs_title")}
              </div>
              <div className="flex gap-2 text-xs font-bold text-gray-500">
                {selectedIds.size > 0 && (
                  <span className="rounded-full bg-brand-100 border border-brand-200 px-3 py-0.5 text-brand-700">{selectedIds.size} {copy.selected.toLowerCase()}</span>
                )}
                <span className="rounded-full bg-surface-100 border border-surface-200 px-3 py-0.5">{t("certs_total")} {total}</span>
                <span className="rounded-full bg-surface-100 border border-surface-200 px-3 py-0.5">{page}/{totalPages}</span>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center p-24 flex-grow">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500 mb-3" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-24 text-center flex-grow">
                <Search className="h-10 w-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-500">{t("certs_empty")}</p>
              </div>
            ) : (
              <motion.div variants={containerVars} initial="hidden" animate="show" className="grid gap-3 p-4 sm:p-5">
                {items.map((c) => {
                  const s = getStatusStyle(c.status);
                  const canDownload = c.status === "active" && !!c.pdf_url;
                  const isSelected = selectedIds.has(c.id);
                  return (
                    <motion.div key={c.id} variants={rowVars} className={`rounded-3xl border p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition-colors ${isSelected ? "border-brand-200 bg-brand-50/60" : "border-surface-200 bg-white hover:border-surface-300"}`}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button onClick={() => toggleSelect(c.id)} className="mt-0.5 shrink-0 text-gray-300 hover:text-brand-600 transition-colors">
                          {isSelected ? <CheckSquare className="h-4 w-4 text-brand-600" /> : <Square className="h-4 w-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${s.bg} ${s.color} ${s.border}`}>
                              {s.icon} {c.status}
                            </span>
                            <span className="text-base font-semibold text-gray-800 truncate">{c.student_name}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-2 text-[10px] font-mono text-gray-400">
                            <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{c.uuid.split("-")[0]}...</span>
                            {c.public_id && <span className="flex items-center gap-1"><LockKeyhole className="h-3 w-3" />{c.public_id}</span>}
                            {c.hosting_term && <span className="rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1">{c.hosting_term}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex w-full flex-col gap-2 shrink-0 xl:w-[360px]">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <a href={`/verify/${c.uuid}`} target="_blank" className="btn-secondary justify-center text-xs">
                            <ExternalLink className="h-3.5 w-3.5" /> {copy.verifyAction}
                          </a>
                          {canDownload ? (
                            <a href={c.pdf_url!} target="_blank" className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-500 hover:text-white">
                              <Download className="h-3.5 w-3.5" /> {copy.downloadAction}
                            </a>
                          ) : (
                            <div className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3 text-xs font-bold text-gray-300 cursor-not-allowed">
                              <ShieldOff className="h-3.5 w-3.5" /> {copy.locked}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-4 gap-1 rounded-2xl border border-surface-200 bg-surface-50 p-1">
                          <button onClick={() => patchStatus(c.id, "active")} disabled={c.status === "active"} className="rounded-xl px-2 py-2 text-[10px] font-bold text-surface-400 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-25 transition-colors">{copy.activeAction}</button>
                          <button onClick={() => patchStatus(c.id, "revoked")} disabled={c.status === "revoked"} className="rounded-xl px-2 py-2 text-[10px] font-bold text-surface-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-25 transition-colors">{copy.revokeAction}</button>
                          <button onClick={() => patchStatus(c.id, "expired")} disabled={c.status === "expired"} className="rounded-xl px-2 py-2 text-[10px] font-bold text-surface-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-25 transition-colors">{copy.expireAction}</button>
                          <button onClick={() => setDeleteTargetId(c.id)} className="rounded-xl px-2 py-2 text-surface-300 hover:text-rose-500 hover:bg-rose-50 transition-colors" title={lang === "tr" ? "Sil" : "Delete"}>
                            <Trash2 className="mx-auto h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            <div className="bg-surface-50 border-t border-surface-100 px-4 py-3 flex items-center justify-between mt-auto">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary gap-2 text-xs disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" /> {t("certs_prev")}
              </button>
              <span className="text-xs font-bold text-surface-400"><span className="text-surface-700">{page}</span>/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary gap-2 text-xs disabled:opacity-30">
                {t("certs_next")} <ChevronLeft className="h-4 w-4 rotate-180" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
      <ConfirmModal
        open={deleteTargetId !== null}
        title={copy.deleteSingleTitle}
        description={copy.deleteSingleBody}
        danger
        loading={deleteLoading}
        onConfirm={confirmSoftDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
      <ConfirmModal
        open={bulkTarget !== null}
        title={bulkTarget === "delete" ? copy.bulkDeleteTitle : bulkTarget === "revoke" ? copy.bulkRevokeTitle : copy.bulkExpireTitle}
        description={bulkTarget === "delete" ? copy.bulkDeleteBody(selectedIds.size) : bulkTarget === "revoke" ? copy.bulkRevokeBody(selectedIds.size) : copy.bulkExpireBody(selectedIds.size)}
        danger={bulkTarget === "delete"}
        loading={bulkLoading}
        onConfirm={executeBulkAction}
        onCancel={() => setBulkTarget(null)}
      />
    </div>
  );
}
