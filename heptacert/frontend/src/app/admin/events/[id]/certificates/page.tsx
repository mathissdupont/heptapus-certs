"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Loader2, AlertCircle, Trash2, ShieldOff, Clock,
  CheckCircle2, ExternalLink, Download, RefreshCcw, FileDown,
  CheckSquare, Square, MoreHorizontal, Zap,
} from "lucide-react";
import { apiFetch, API_BASE, getToken } from "@/lib/api";
import { useT, useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/useToast";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import ConfirmModal from "@/components/Admin/ConfirmModal";
import PageHeader from "@/components/Admin/PageHeader";
import BulkActionBar from "@/components/Admin/BulkActionBar";
import IssueCertificateModal from "@/components/Admin/IssueCertificateModal";

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
  days_remaining?: number | null;
  asset_size_bytes?: number;
  issue_cost_units?: number;
  total_cost_units?: number;
  monthly_cost_units?: number;
  yearly_cost_units?: number;
  auto_renew_enabled?: boolean;
  pdf_url?: string | null;
};

type CertificateListOut = { items: CertificateOut[]; total: number; page: number; limit: number };

const STATUS_CONFIG: Record<CertStatus, { dot: string; text: string; label: { tr: string; en: string } }> = {
  active:  { dot: "bg-emerald-500", text: "text-emerald-700", label: { tr: "Aktif",          en: "Active"  } },
  revoked: { dot: "bg-red-400",     text: "text-red-600",     label: { tr: "İptal Edildi",    en: "Revoked" } },
  expired: { dot: "bg-amber-400",   text: "text-amber-700",   label: { tr: "Süresi Dolmuş",   en: "Expired" } },
};

export default function CertificatesPage() {
  const params = useParams<{ id: string }>();
  const eventId = Number(params.id);
  const t = useT();
  const { lang } = useI18n();
  const toast = useToast();

  const [items, setItems] = useState<CertificateOut[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | CertStatus>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [templateReady, setTemplateReady] = useState<boolean | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<"revoke" | "expire" | "delete" | "enable_auto_renew" | "disable_auto_renew" | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [rowMenuId, setRowMenuId] = useState<number | null>(null);
  const rowMenuRef = useRef<HTMLDivElement | null>(null);
  const [issueModalOpen, setIssueModalOpen] = useState(false);

  const allSelected = items.length > 0 && items.every((c) => selectedIds.has(c.id));

  const copy = useMemo(() => lang === "tr"
    ? {
        pageTitle: "Sertifikalar",
        pageSubtitle: "Sertifika yönetimi, filtreleme ve dışa aktarım",
        exportCsv: "CSV İndir", exportExcel: "Excel İndir",
        issueCert: "Sertifika Oluştur",
        statusAll: "Tüm Durumlar", statusActive: "Aktif", statusRevoked: "İptal", statusExpired: "Süresi Dolmuş",
        searchPlaceholder: "İsme göre ara...",
        refresh: "Yenile",
        total: "Toplam", selected: "Seçili", page: "Sayfa",
        autoRenewOn: "Oto-yenile açık", autoRenewOff: "Oto-yenile kapalı",
        autoRenewEnable: "Oto-yenileyi Aç", autoRenewDisable: "Oto-yenileyi Kapat",
        verify: "Doğrula", download: "PDF İndir",
        setActive: "Aktif Yap", revoke: "İptal Et", expire: "Süreyi Bitir",
        delete: "Sil",
        locked: "PDF yok",
        days: "gün", remaining: "kalan",
        deleteSingleTitle: "Sertifikayı sil",
        deleteSingleBody: "Bu sertifikayı kalıcı olarak silmek istediğinize emin misiniz?",
        bulkDeleteTitle: "Toplu sil", bulkRevokeTitle: "Toplu iptal",
        bulkExpireTitle: "Toplu süre bitir", bulkEnableRenewTitle: "Toplu oto-yenileme aç",
        bulkDisableRenewTitle: "Toplu oto-yenileme kapat",
        bulkBody: (n: number, a: string) => `Seçili ${n} sertifika için "${a}" işlemini onaylıyor musunuz?`,
        empty: "Sertifika bulunamadı",
        selectedCount: (n: number) => `${n} sertifika seçili`,
        selectionTitle: "Toplu işlem hazır",
      }
    : {
        pageTitle: "Certificates",
        pageSubtitle: "Certificate management, filtering and export",
        exportCsv: "Export CSV", exportExcel: "Export Excel",
        issueCert: "Issue Certificate",
        statusAll: "All Statuses", statusActive: "Active", statusRevoked: "Revoked", statusExpired: "Expired",
        searchPlaceholder: "Search by name...",
        refresh: "Refresh",
        total: "Total", selected: "Selected", page: "Page",
        autoRenewOn: "Auto-renew on", autoRenewOff: "Auto-renew off",
        autoRenewEnable: "Enable Auto-Renew", autoRenewDisable: "Disable Auto-Renew",
        verify: "Verify", download: "Download PDF",
        setActive: "Set Active", revoke: "Revoke", expire: "Mark Expired",
        delete: "Delete",
        locked: "No PDF",
        days: "days", remaining: "remaining",
        deleteSingleTitle: "Delete certificate",
        deleteSingleBody: "Are you sure you want to permanently delete this certificate?",
        bulkDeleteTitle: "Bulk delete", bulkRevokeTitle: "Bulk revoke",
        bulkExpireTitle: "Bulk expire", bulkEnableRenewTitle: "Enable auto-renew in bulk",
        bulkDisableRenewTitle: "Disable auto-renew in bulk",
        bulkBody: (n: number, a: string) => `Confirm "${a}" for ${n} selected certificates?`,
        empty: "No certificates found",
        selectedCount: (n: number) => `${n} certificates selected`,
        selectionTitle: "Bulk action ready",
      }, [lang]);

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    if (search.trim()) qs.set("search", search.trim());
    if (status) qs.set("status", status);
    return qs.toString();
  }, [page, search, status]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const [certRes, eventRes] = await Promise.all([
        apiFetch(`/admin/events/${eventId}/certificates?${query}`),
        !eventName ? apiFetch(`/admin/events/${eventId}`) : Promise.resolve(null),
      ]);
      const data = (await certRes.json()) as CertificateListOut;
      setItems(data.items);
      setTotal(data.total);
      setSelectedIds(new Set());
      if (eventRes) {
        const ev = await eventRes.json();
        if (ev?.name) setEventName(ev.name);
        setTemplateReady(Boolean(ev?.template_image_url && ev.template_image_url !== "placeholder" && ev?.config && Object.keys(ev.config).length > 0));
      }
    } catch (e: unknown) {
      setErr((e as { message?: string })?.message || "Sertifika listesi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close row menu on outside click
  useEffect(() => {
    if (!rowMenuId) return;
    function handler(e: MouseEvent) {
      if (rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) setRowMenuId(null);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [rowMenuId]);

  async function patchStatus(certId: number, next: CertStatus) {
    try {
      await apiFetch(`/admin/certificates/${certId}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      toast.success(lang === "tr" ? "Durum güncellendi." : "Status updated.");
      await load();
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message || "Update failed.");
    }
  }

  async function patchAutoRenew(certId: number, enabled: boolean) {
    try {
      await apiFetch(`/admin/certificates/${certId}`, { method: "PATCH", body: JSON.stringify({ auto_renew_enabled: enabled }) });
      toast.success(enabled ? copy.autoRenewOn : copy.autoRenewOff);
      await load();
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message || "Update failed.");
    }
  }

  async function confirmSoftDelete() {
    if (!deleteTargetId) return;
    setDeleteLoading(true);
    try {
      await apiFetch(`/admin/certificates/${deleteTargetId}`, { method: "DELETE" });
      toast.success(lang === "tr" ? "Sertifika silindi." : "Certificate deleted.");
      setDeleteTargetId(null);
      await load();
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message || "Delete failed.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function executeBulkAction() {
    if (!bulkTarget || selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      await apiFetch(`/admin/events/${eventId}/certificates/bulk-action`, {
        method: "POST",
        body: JSON.stringify({ cert_ids: [...selectedIds], action: bulkTarget }),
      });
      toast.success(`${selectedIds.size} ${lang === "tr" ? "sertifika işlendi." : "certificates processed."}`);
      setBulkTarget(null);
      setSelectedIds(new Set());
      await load();
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message || "Bulk action failed.");
    } finally {
      setBulkLoading(false);
    }
  }

  function exportCerts(format: "csv" | "xlsx") {
    const token = getToken();
    fetch(`${API_BASE}/admin/events/${eventId}/certificates/export?format=${format}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `certificates-event-${eventId}.${format}`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => setErr("Export failed."));
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function formatRemaining(c: CertificateOut) {
    if (c.status === "expired" || c.days_remaining === 0) return lang === "tr" ? "Süresi doldu" : "Expired";
    if (typeof c.days_remaining === "number") return `${c.days_remaining} ${copy.days}`;
    if (c.hosting_ends_at) return new Date(c.hosting_ends_at).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US");
    return "—";
  }

  function formatHc(units?: number | null) {
    if (typeof units !== "number") return "—";
    return `${(units / 10).toLocaleString(lang === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: 1 })} HC`;
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const sampleCert = items[0];

  const bulkActionTitle: Record<string, string> = {
    delete: copy.bulkDeleteTitle, revoke: copy.bulkRevokeTitle,
    expire: copy.bulkExpireTitle, enable_auto_renew: copy.bulkEnableRenewTitle,
    disable_auto_renew: copy.bulkDisableRenewTitle,
  };

  return (
    <div className="flex w-full flex-col gap-5 pb-16 antialiased">
      <EventAdminNav eventId={eventId} active="certificates" eventName={eventName || `Event #${eventId}`} />

      <PageHeader
        title={copy.pageTitle}
        subtitle={copy.pageSubtitle}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => exportCerts("csv")} className="btn-secondary text-xs">
              <FileDown className="h-3.5 w-3.5" /> {copy.exportCsv}
            </button>
            <button onClick={() => exportCerts("xlsx")} className="btn-secondary text-xs">
              <FileDown className="h-3.5 w-3.5" /> {copy.exportExcel}
            </button>
            <button onClick={() => setIssueModalOpen(true)} className="btn-primary text-xs">
              <Zap className="h-3.5 w-3.5" /> {copy.issueCert}
            </button>
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input className="input-field pl-9" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder={copy.searchPlaceholder} />
        </div>
        <select className="input-field sm:w-44" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as "" | CertStatus); }}>
          <option value="">{copy.statusAll}</option>
          <option value="active">{copy.statusActive}</option>
          <option value="revoked">{copy.statusRevoked}</option>
          <option value="expired">{copy.statusExpired}</option>
        </select>
        <button onClick={() => load()} aria-label={copy.refresh} className="btn-ghost shrink-0" title={copy.refresh}>
          <RefreshCcw className="h-4 w-4" />
        </button>
        <span className="shrink-0 text-sm text-surface-400">{copy.total}: {total}</span>
      </div>

      {/* Error */}
      <AnimatePresence>
        {err && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="error-banner"><AlertCircle className="h-4 w-4 shrink-0" /> {err}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Certificate list */}
      <div className="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-card">
        {/* Table header */}
        <div className="flex items-center gap-3 border-b border-surface-100 bg-surface-50 px-5 py-3">
          <button onClick={() => allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(items.map((c) => c.id)))} aria-label={allSelected ? (lang === "tr" ? "Tümünü kaldır" : "Deselect all") : (lang === "tr" ? "Tümünü seç" : "Select all")} className="text-surface-400 hover:text-surface-900 transition-colors">
            {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          </button>
          <span className="text-11 font-semibold uppercase tracking-wider text-surface-500">{t("certs_title")}</span>
          {selectedIds.size > 0 && (
            <span className="ml-auto rounded-full bg-surface-900 px-2.5 py-0.5 text-11 font-medium text-white">
              {copy.selectedCount(selectedIds.size)}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-surface-150 bg-surface-50">
              <Search className="h-5 w-5 text-surface-400" />
            </div>
            <p className="text-sm font-medium text-surface-500">{copy.empty}</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {items.map((c) => {
              const sc = STATUS_CONFIG[c.status];
              const canDownload = c.status === "active" && !!c.pdf_url;
              const isSelected = selectedIds.has(c.id);
              const menuOpen = rowMenuId === c.id;

              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${isSelected ? "bg-surface-50" : "hover:bg-surface-50/60"}`}
                >
                  {/* Checkbox */}
                  <button onClick={() => toggleSelect(c.id)} aria-label={isSelected ? (lang === "tr" ? "Seçimi kaldır" : "Deselect") : (lang === "tr" ? "Seç" : "Select")} aria-pressed={isSelected} className="shrink-0 text-surface-300 hover:text-surface-700 transition-colors">
                    {isSelected ? <CheckSquare className="h-4 w-4 text-surface-900" /> : <Square className="h-4 w-4" />}
                  </button>

                  {/* Status dot */}
                  <span className={`h-2 w-2 shrink-0 rounded-full ${sc.dot}`} />

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-surface-900">{c.student_name}</p>
                      <span className={`text-xs font-medium ${sc.text}`}>{sc.label[lang]}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-surface-400">
                      <span className="font-mono">{c.uuid.split("-")[0]}</span>
                      {c.hosting_term && <span className="uppercase">{c.hosting_term}</span>}
                      <span>{copy.remaining}: {formatRemaining(c)}</span>
                      <span>{formatHc(c.total_cost_units)}</span>
                      <span className={c.auto_renew_enabled ? "text-emerald-600" : ""}>
                        {c.auto_renew_enabled ? copy.autoRenewOn : copy.autoRenewOff}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    <a href={`/verify/${c.uuid}`} target="_blank" rel="noreferrer" aria-label={copy.verify} className="btn-ghost px-2 py-1.5 text-xs" title={copy.verify}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {canDownload ? (
                      <a href={c.pdf_url!} target="_blank" rel="noreferrer" aria-label={copy.download} className="btn-ghost px-2 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50" title={copy.download}>
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="px-2 py-1.5 text-surface-200" title={copy.locked} aria-label={copy.locked}>
                        <Download className="h-3.5 w-3.5" />
                      </span>
                    )}

                    {/* Row context menu */}
                    <div className="relative" ref={menuOpen ? rowMenuRef : null}>
                      <button onClick={() => setRowMenuId(menuOpen ? null : c.id)} aria-label={lang === "tr" ? "İşlemler" : "Actions"} aria-expanded={menuOpen} className="btn-ghost px-2 py-1.5">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                      <AnimatePresence>
                        {menuOpen && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.1 }}
                            className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-surface-200 bg-white py-1 shadow-float">
                            <button onClick={() => { patchAutoRenew(c.id, !c.auto_renew_enabled); setRowMenuId(null); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-surface-600 hover:bg-surface-50 hover:text-surface-900 transition-colors">
                              <RefreshCcw className="h-3.5 w-3.5 text-surface-400" />
                              {c.auto_renew_enabled ? copy.autoRenewDisable : copy.autoRenewEnable}
                            </button>
                            {c.status !== "active" && (
                              <button onClick={() => { patchStatus(c.id, "active"); setRowMenuId(null); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors">
                                <CheckCircle2 className="h-3.5 w-3.5" /> {copy.setActive}
                              </button>
                            )}
                            {c.status !== "revoked" && (
                              <button onClick={() => { patchStatus(c.id, "revoked"); setRowMenuId(null); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                <ShieldOff className="h-3.5 w-3.5" /> {copy.revoke}
                              </button>
                            )}
                            {c.status !== "expired" && (
                              <button onClick={() => { patchStatus(c.id, "expired"); setRowMenuId(null); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition-colors">
                                <Clock className="h-3.5 w-3.5" /> {copy.expire}
                              </button>
                            )}
                            <div className="my-1 border-t border-surface-100" />
                            <button onClick={() => { setDeleteTargetId(c.id); setRowMenuId(null); }} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" /> {copy.delete}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-surface-100 px-5 py-3 text-sm text-surface-500">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30">← {t("certs_prev")}</button>
            <span className="font-mono text-xs text-surface-400"><span className="text-surface-900">{page}</span> / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30">{t("certs_next")} →</button>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <BulkActionBar selectedCount={selectedIds.size} title={copy.selectionTitle} description={copy.selectedCount(selectedIds.size)} onClear={() => setSelectedIds(new Set())} loading={bulkLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : null}>
            <div className="flex flex-wrap items-center gap-1.5">
              {(["enable_auto_renew", "disable_auto_renew", "revoke", "expire", "delete"] as const).map((action) => (
                <button key={action} onClick={() => setBulkTarget(action)} disabled={bulkLoading}
                  className={`inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-white/20 px-2.5 text-11 font-medium text-white transition hover:bg-white/20 ${action === "delete" || action === "revoke" ? "bg-red-700/80" : "bg-white/10"}`}>
                  {bulkActionTitle[action]}
                </button>
              ))}
            </div>
          </BulkActionBar>
        )}
      </AnimatePresence>

      {/* Modals */}
      <IssueCertificateModal
        open={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        onIssued={() => { setPage(1); load(); }}
        eventId={eventId}
        templateReady={templateReady}
        sampleMonthlyCost={sampleCert?.monthly_cost_units}
        sampleYearlyCost={sampleCert?.yearly_cost_units}
      />

      <ConfirmModal open={deleteTargetId !== null} title={copy.deleteSingleTitle} description={copy.deleteSingleBody} danger loading={deleteLoading} onConfirm={confirmSoftDelete} onCancel={() => setDeleteTargetId(null)} />

      <ConfirmModal
        open={bulkTarget !== null}
        title={bulkTarget ? bulkActionTitle[bulkTarget] : ""}
        description={bulkTarget ? copy.bulkBody(selectedIds.size, bulkActionTitle[bulkTarget]) : ""}
        danger={bulkTarget === "delete"}
        loading={bulkLoading}
        onConfirm={executeBulkAction}
        onCancel={() => setBulkTarget(null)}
      />
    </div>
  );
}
