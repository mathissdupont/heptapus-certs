"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";

import { apiFetch, API_BASE, getToken } from "@/lib/api";
import { useT, useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/useToast";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import ConfirmModal from "@/components/Admin/ConfirmModal";
import PageHeader from "@/components/Admin/PageHeader";
import BulkActionBar from "@/components/Admin/BulkActionBar";

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
  hosting_cost_units?: number;
  total_cost_units?: number;
  monthly_cost_units?: number;
  yearly_cost_units?: number;
  auto_renew_enabled?: boolean;
  pdf_url?: string | null;
};

type CertificateListOut = {
  items: CertificateOut[];
  total: number;
  page: number;
  limit: number;
};

type CertificateCostEstimate = {
  count: number;
  asset_size_bytes: number;
  issue_units_per_certificate: number;
  monthly_hosting_units_per_certificate: number;
  yearly_hosting_units_per_certificate: number;
  monthly_total_units: number;
  yearly_total_units: number;
  monthly_renewal_units: number;
  yearly_renewal_units: number;
};

function getStatusStyle(s: CertStatus) {
  if (s === "active") return {
    color: "text-emerald-700",
    bg: "bg-emerald-50/60",
    border: "border-emerald-100",
    icon: <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />,
  };
  if (s === "expired") return {
    color: "text-amber-700",
    bg: "bg-amber-50/60",
    border: "border-amber-100",
    icon: <Clock className="h-3.5 w-3.5 stroke-[2]" />,
  };
  return {
    color: "text-red-600",
    bg: "bg-red-50/60",
    border: "border-red-100",
    icon: <ShieldOff className="h-3.5 w-3.5 stroke-[1.8]" />,
  };
}

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

  const [issueName, setIssueName] = useState("");
  const [issueTerm, setIssueTerm] = useState<"monthly" | "yearly">("yearly");
  const [issuing, setIssuing] = useState(false);
  const [eventName, setEventName] = useState<string>("");
  const [templateReady, setTemplateReady] = useState<boolean | null>(null);
  const [simCount, setSimCount] = useState(100);
  const [simSizeMb, setSimSizeMb] = useState(2);
  const [costEstimate, setCostEstimate] = useState<CertificateCostEstimate | null>(null);
  const [costLoading, setCostLoading] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<"revoke" | "expire" | "delete" | "enable_auto_renew" | "disable_auto_renew" | null>(null);

  // Single delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const allSelected = items.length > 0 && items.every((c) => selectedIds.has(c.id));

  const copy = lang === "tr"
    ? {
        pageTitle: "Sertifikalar",
        pageSubtitle: "Basım, filtreleme, durum güncelleme ve dışa aktarım artık tek akışta.",
        exportCsv: "CSV İndir",
        exportExcel: "Excel İndir",
        visibleResults: "Görünen sonuç",
        selected: "Seçili",
        currentPage: "Sayfa",
        issueTitle: "Hızlı manuel basım",
        issueBody: "Tek bir isimle hızlıca sertifika üretin; telefon ekranında bile kolayca tamamlanır.",
        recipientPlaceholder: "Örn. Ayşe Yılmaz",
        issueAction: "Sertifika oluştur",
        templateNotReadyTitle: "Sertifika şablonu hazır değil",
        templateNotReadyBody: "Basım yapmadan önce sertifika görselini ve alan konumlarını editörde tamamlayın.",
        openEditor: "Editörü aç",
        estimatedCost: "Tahmini maliyet",
        issueCost: "Basım",
        hostingCost: "Barındırma",
        autoRenewOff: "Oto-yenile kapalı",
        autoRenewOn: "Oto-yenile açık",
        autoRenewEnable: "Oto-yenile aç",
        autoRenewDisable: "Oto-yenile kapat",
        remaining: "Kalan süre",
        expiredNow: "Süresi doldu",
        days: "gün",
        costUnknown: "Dosya boyutuna göre hesaplanır",
        costSimulator: "Maliyet simülatörü",
        costSimulatorBody: "Basım + barındırma maliyetini aylık ve yıllık bazda gerçek formülle hesapla.",
        certCount: "Sertifika adedi",
        avgSize: "Ortalama PDF boyutu (MB)",
        firstMonthTotal: "İlk ay toplam",
        firstYearTotal: "İlk yıl toplam",
        monthlyRenewal: "Aylık yenileme",
        yearlyRenewal: "Yıllık yenileme",
        monthlyCost: "Aylık",
        yearlyCost: "Yıllık",
        filterTitle: "Ara ve filtrele",
        filterBody: "Listeyi isim veya durum ile daraltın, sonra toplu işlem uygulayın.",
        refresh: "Yenile",
        selectionTitle: "Toplu işlem hazır",
        clearSelection: "Temizle",
        selectedCount: (count: number) => `${count} sertifika seçildi`,
        locked: "PDF yok",
        currentView: "Mevcut görünüm",
        verifyAction: "Doğrula",
        downloadAction: "İndir",
        activeAction: "Aktif",
        revokeAction: "İptal",
        expireAction: "Süre Bitir",
        deleteAction: "Sil",
        deleteSingleTitle: "Sertifikayı sil",
        deleteSingleBody: "Bu sertifikayı sistemden kalıcı olarak silmek istediğinize emin misiniz?",
        bulkDeleteTitle: "Toplu sil",
        bulkRevokeTitle: "Toplu iptal",
        bulkExpireTitle: "Toplu süre bitir",
        bulkEnableRenewTitle: "Toplu oto-yenileme aç",
        bulkDisableRenewTitle: "Toplu oto-yenileme kapat",
        bulkDeleteBody: (count: number) => `Seçili ${count} sertifikayı kalıcı olarak silmek istediğinize emin misiniz?`,
        bulkRevokeBody: (count: number) => `Seçili ${count} sertifikayı iptal etmek istediğinize emin misiniz?`,
        bulkExpireBody: (count: number) => `Seçili ${count} sertifikayı süresi dolmuş olarak işaretlemek istediğinize emin misiniz?`,
        bulkEnableRenewBody: (count: number) => `Seçili ${count} sertifika için oto-yenilemeyi açmak istediğinize emin misiniz?`,
        bulkDisableRenewBody: (count: number) => `Seçili ${count} sertifika için oto-yenilemeyi kapatmak istediğinize emin misiniz?`,
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
        templateNotReadyTitle: "Certificate template is not ready",
        templateNotReadyBody: "Upload the certificate image and complete field positioning in the editor before issuing.",
        openEditor: "Open editor",
        estimatedCost: "Estimated cost",
        issueCost: "Issue",
        hostingCost: "Hosting",
        autoRenewOff: "Auto-renew off",
        autoRenewOn: "Auto-renew on",
        autoRenewEnable: "Turn on auto-renew",
        autoRenewDisable: "Turn off auto-renew",
        remaining: "Time left",
        expiredNow: "Expired",
        days: "days",
        costUnknown: "Calculated from file size",
        costSimulator: "Cost simulator",
        costSimulatorBody: "Calculate issue + hosting cost monthly and yearly with the exact backend formula.",
        certCount: "Certificate count",
        avgSize: "Average PDF size (MB)",
        firstMonthTotal: "First month total",
        firstYearTotal: "First year total",
        monthlyRenewal: "Monthly renewal",
        yearlyRenewal: "Yearly renewal",
        monthlyCost: "Monthly",
        yearlyCost: "Yearly",
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
        bulkEnableRenewTitle: "Enable auto-renew in bulk",
        bulkDisableRenewTitle: "Disable auto-renew in bulk",
        bulkDeleteBody: (count: number) => `Are you sure you want to permanently delete ${count} selected certificates?`,
        bulkRevokeBody: (count: number) => `Are you sure you want to revoke ${count} selected certificates?`,
        bulkExpireBody: (count: number) => `Are you sure you want to mark ${count} selected certificates as expired?`,
        bulkEnableRenewBody: (count: number) => `Are you sure you want to enable auto-renew for ${count} selected certificates?`,
        bulkDisableRenewBody: (count: number) => `Are you sure you want to disable auto-renew for ${count} selected certificates?`,
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
        const hasTemplateImage = Boolean(ev?.template_image_url && ev.template_image_url !== "placeholder");
        const hasConfig = Boolean(ev?.config && typeof ev.config === "object" && Object.keys(ev.config).length > 0);
        setTemplateReady(hasTemplateImage && hasConfig);
      }
    } catch (e: any) {
      setErr(e?.message || "Sertifika listesi çekilemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [query]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setCostLoading(true);
      try {
        const sizeBytes = Math.max(0, Math.round(simSizeMb * 1024 * 1024));
        const res = await apiFetch(`/admin/events/${eventId}/certificates/cost-estimate?count=${simCount}&asset_size_bytes=${sizeBytes}`);
        const data = (await res.json()) as CertificateCostEstimate;
        if (active) setCostEstimate(data);
      } catch {
        if (active) setCostEstimate(null);
      } finally {
        if (active) setCostLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [eventId, simCount, simSizeMb]);

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
      setErr(e?.message || "Durum güncellenemedi.");
    }
  }

  async function patchAutoRenew(certId: number, enabled: boolean) {
    setErr(null);
    try {
      await apiFetch(`/admin/certificates/${certId}`, {
        method: "PATCH",
        body: JSON.stringify({ auto_renew_enabled: enabled }),
      });
      toast.success(enabled ? copy.autoRenewOn : copy.autoRenewOff);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Oto-yenileme güncellenemedi.");
      setErr(e?.message || "Oto-yenileme güncellenemedi.");
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
      setErr(e?.message || "Silme işlemi başarısız.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function issueOne() {
    if (!issueName.trim()) return setErr("Lütfen geçerli bir isim girin.");
    if (templateReady === false) return setErr(copy.templateNotReadyBody);
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
      setErr(e?.message || "Sertifika basım işlemi başarısız.");
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

  const issueEstimate = useMemo(() => {
    const sample = issueTerm === "monthly" ? items[0]?.monthly_cost_units : items[0]?.yearly_cost_units;
    if (typeof sample !== "number") return null;
    return {
      issue: 10,
      hosting: sample,
      total: 10 + sample,
    };
  }, [items, issueTerm]);

  function formatHc(units?: number | null) {
    if (typeof units !== "number") return "-";
    return `${(units / 10).toLocaleString(lang === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: 1 })} HC`;
  }

  function formatRemaining(cert: CertificateOut) {
    if (cert.status === "expired" || cert.days_remaining === 0) return copy.expiredNow;
    if (typeof cert.days_remaining === "number") return `${cert.days_remaining} ${copy.days}`;
    if (cert.hosting_ends_at) return new Date(cert.hosting_ends_at).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US");
    return "-";
  }

  return (
    <div className="flex w-full flex-col gap-5 pb-16 pt-4 antialiased text-gray-900">
      <EventAdminNav eventId={eventId} active="certificates" eventName={eventName || `Etkinlik #${eventId}`} />
      
      <PageHeader
        title={copy.pageTitle}
        subtitle={copy.pageSubtitle}
        icon={<FileText className="h-4 w-4 stroke-[2]" />}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => exportCerts("csv")} className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95">
              <FileDown className="h-4 w-4 text-gray-400" />
              <span>{copy.exportCsv}</span>
            </button>
            <button onClick={() => exportCerts("xlsx")} className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-gray-950 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-900 active:scale-95">
              <FileDown className="h-4 w-4 text-white/60" />
              <span>{copy.exportExcel}</span>
            </button>
          </div>
        }
      />

      {/* 4'LÜ ÜST ÖZET METRİK ROZETLERİ */}
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t("certs_total")}</p>
          <p className="text-2xl font-bold tracking-tight text-gray-950 font-mono tabular-nums">{total}</p>
          <p className="text-[11px] font-medium text-gray-400">{copy.visibleResults}</p>
        </div>
        
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{copy.currentView}</p>
          <div className="pt-1 flex flex-wrap gap-1 text-[9px] font-bold">
            <span className="rounded bg-emerald-50 border border-emerald-100/40 px-1.5 py-0.5 text-emerald-700">AKTİF: {visibleStats.active}</span>
            <span className="rounded bg-red-50 border border-red-100/40 px-1.5 py-0.5 text-red-600">İPTAL: {visibleStats.revoked}</span>
            <span className="rounded bg-amber-50 border border-amber-100/40 px-1.5 py-0.5 text-amber-700">SÜRE: {visibleStats.expired}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{copy.selected}</p>
          <p className="text-2xl font-bold tracking-tight text-gray-950 font-mono tabular-nums">{selectedIds.size}</p>
          <p className="text-[11px] font-medium text-gray-400">{copy.selectionTitle}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{copy.currentPage}</p>
          <p className="text-2xl font-bold tracking-tight text-gray-950 font-mono tabular-nums">{page} / {totalPages}</p>
          <p className="text-[11px] font-semibold text-gray-300 font-mono">#EV-{eventId}</p>
        </div>
      </div>

      {/* TOPLU EYLEM YÜZEY PANELİ (Bulk Action Floating Bar UX) */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <BulkActionBar
            selectedCount={selectedIds.size}
            title={copy.selectionTitle}
            description={copy.selectedCount(selectedIds.size)}
            onClear={() => setSelectedIds(new Set())}
            loading={bulkLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : null}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <button onClick={() => setBulkTarget("enable_auto_renew")} disabled={bulkLoading} className="inline-flex min-h-[32px] items-center justify-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 text-[11px] font-bold text-white transition hover:bg-white/20">
                <RefreshCcw className="h-3 w-3" /> <span>{copy.autoRenewEnable}</span>
              </button>
              <button onClick={() => setBulkTarget("disable_auto_renew")} disabled={bulkLoading} className="inline-flex min-h-[32px] items-center justify-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 text-[11px] font-bold text-white transition hover:bg-white/20">
                <RefreshCcw className="h-3 w-3" /> <span>{copy.autoRenewDisable}</span>
              </button>
              <button onClick={() => setBulkTarget("revoke")} disabled={bulkLoading} className="inline-flex min-h-[32px] items-center justify-center gap-1 rounded-lg bg-red-600 px-2.5 text-[11px] font-bold text-white transition hover:bg-red-700">
                <ShieldOff className="h-3 w-3" /> <span>{copy.revokeAction}</span>
              </button>
              <button onClick={() => setBulkTarget("expire")} disabled={bulkLoading} className="inline-flex min-h-[32px] items-center justify-center gap-1 rounded-lg bg-amber-600 px-2.5 text-[11px] font-bold text-white transition hover:bg-amber-700">
                <Clock className="h-3 w-3" /> <span>{copy.expireAction}</span>
              </button>
              <button onClick={() => setBulkTarget("delete")} disabled={bulkLoading} className="inline-flex min-h-[32px] items-center justify-center gap-1 rounded-lg bg-red-700 px-2.5 text-[11px] font-bold text-white transition hover:bg-red-800">
                <Trash2 className="h-3 w-3" /> <span>{copy.deleteAction}</span>
              </button>
            </div>
          </BulkActionBar>
        )}
      </AnimatePresence>

      {/* ÇİFT SÜTUN SİMETRİK RAPOR VE LİSTE GRUBU */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px] items-start">
        
        {/* SAĞ SÜTUN: MANUEL BASIM, SİMÜLATÖR VE FİLTRE DOCK GRUBU */}
        <div className="flex flex-col gap-4 xl:order-2">
          
          {/* A. MALİYET SİMÜLATÖRÜ */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm">
                <Hash className="h-3.5 w-3.5 stroke-[2]" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-950">{copy.costSimulator}</h2>
              {costLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
            </div>
            <p className="text-[11px] leading-relaxed text-gray-400 font-medium">{copy.costSimulatorBody}</p>
            
            <div className="space-y-3.5">
              <label className="block w-full">
                <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.certCount}</span>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={simCount}
                  onChange={(e) => setSimCount(Math.max(1, Math.min(100000, Number(e.target.value) || 1)))}
                  className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 font-mono"
                />
              </label>

              <label className="block w-full">
                <span className="block text-[11px] font-bold text-gray-500 mb-1">{copy.avgSize}</span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={simSizeMb}
                  onChange={(e) => setSimSizeMb(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 font-mono"
                />
              </label>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold tracking-tight">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-2.5">
                  <p className="text-gray-400 truncate">{copy.firstMonthTotal}</p>
                  <p className="text-sm font-bold text-emerald-600 font-mono mt-0.5">{formatHc(costEstimate?.monthly_total_units)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50/20 p-2.5">
                  <p className="text-gray-400 truncate">{copy.firstYearTotal}</p>
                  <p className="text-sm font-bold text-gray-900 font-mono mt-0.5">{formatHc(costEstimate?.yearly_total_units)}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-2.5">
                  <p className="text-gray-400 truncate">{copy.monthlyRenewal}</p>
                  <p className="text-xs font-bold text-gray-500 font-mono mt-0.5">{formatHc(costEstimate?.monthly_renewal_units)}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-2.5">
                  <p className="text-gray-400 truncate">{copy.yearlyRenewal}</p>
                  <p className="text-xs font-bold text-gray-500 font-mono mt-0.5">{formatHc(costEstimate?.yearly_renewal_units)}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* B. MANUEL TEKİL BASIM KARTI */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 relative overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-500 shadow-sm">
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-950">{copy.issueTitle}</h2>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-400 font-medium">{copy.issueBody}</p>

            <div className="space-y-3.5">
              {templateReady === false && (
                <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-3.5 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 stroke-[2] mt-0.5" />
                  <div className="space-y-1.5 flex-1 text-[11px] font-medium leading-relaxed">
                    <p className="font-bold text-amber-900">{copy.templateNotReadyTitle}</p>
                    <p className="text-amber-800">{copy.templateNotReadyBody}</p>
                    <Link href={`/admin/events/${eventId}/editor`} className="inline-flex min-h-[28px] items-center justify-center gap-1 rounded-lg bg-amber-600 px-2.5 font-bold text-white shadow-sm transition hover:bg-amber-700 pt-0.5">
                      <ExternalLink className="h-3 w-3 stroke-[2]" /> <span>{copy.openEditor}</span>
                    </Link>
                  </div>
                </div>
              )}

              <label className="block w-full">
                <span className="block text-[11px] font-bold text-gray-500 mb-1">{t("certs_recipient")}</span>
                <input value={issueName} onChange={(e) => setIssueName(e.target.value)} placeholder={copy.recipientPlaceholder} className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 placeholder:text-gray-400" />
              </label>

              <label className="block w-full">
                <span className="block text-[11px] font-bold text-gray-500 mb-1">{t("certs_hosting_term")}</span>
                <div className="relative inline-flex items-center w-full">
                  <select value={issueTerm} onChange={(e) => setIssueTerm(e.target.value as any)} className="w-full min-h-[38px] appearance-none rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 cursor-pointer">
                    <option value="monthly">{t("certs_term_monthly")}</option>
                    <option value="yearly">{t("certs_term_yearly")} (12 Ay)</option>
                  </select>
                  <ChevronLeft className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-gray-400 rotate-270" />
                </div>
              </label>

              <div className="rounded-xl border border-amber-100 bg-amber-50/20 p-3 flex flex-col gap-1 text-[11px] font-bold text-amber-900 leading-normal">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-medium">{copy.estimatedCost}</span>
                  <span className="font-mono">{issueEstimate ? formatHc(issueEstimate.total) : copy.costUnknown}</span>
                </div>
                {issueEstimate && (
                  <div className="flex flex-wrap gap-x-3 text-[10px] text-amber-700/80 font-semibold">
                    <span>{copy.issueCost}: {formatHc(issueEstimate.issue)}</span>
                    <span>{copy.hostingCost}: {formatHc(issueEstimate.hosting)}</span>
                  </div>
                )}
              </div>

              <button onClick={issueOne} disabled={issuing || templateReady === false} className="w-full inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-gray-950 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-900 active:scale-[0.98] disabled:opacity-40">
                {issuing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 stroke-[2]" />}
                <span>{copy.issueAction}</span>
              </button>
            </div>
          </motion.div>

          {/* C. CANLI FİLTRE VE ARAMA DOCK'I */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-gray-500 shadow-sm">
                <Filter className="h-3.5 w-3.5 stroke-[1.8]" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-950">{copy.filterTitle}</h2>
            </div>
            
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 stroke-[2]" />
                <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder={t("certs_search_placeholder")} className="w-full min-h-[38px] rounded-xl border border-gray-200 bg-white pl-9 pr-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 placeholder:text-gray-400" />
              </div>
              
              <div className="flex gap-2">
                <div className="relative inline-flex items-center flex-1 w-full">
                  <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as any); }} className="w-full min-h-[38px] appearance-none rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold outline-none transition focus:border-gray-900 cursor-pointer">
                    <option value="">{t("certs_status_all")}</option>
                    <option value="active">{t("certs_status_active")}</option>
                    <option value="revoked">{t("certs_status_revoked")}</option>
                    <option value="expired">{t("certs_status_expired")}</option>
                  </select>
                  <ChevronLeft className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-gray-400 rotate-270" />
                </div>
                
                <button onClick={() => void load()} className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition active:scale-95">
                  <RefreshCcw className="h-3.5 w-3.5 stroke-[2]" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* DİNAMİK LOKAL HATA SİNYALİ */}
          <AnimatePresence>
            {err && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="rounded-xl border border-red-100 bg-red-50/40 p-3.5 text-xs font-semibold text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">{err}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SOL SÜTUN: SERTİFİKA VERİ MATRİS TABLOSU BARINDIRICI */}
        <div className="flex flex-col xl:order-1">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col flex-grow">
            
            {/* Tablo Üst Kontrol Başlığı */}
            <div className="border-b border-gray-100 px-4.5 py-3.5 flex items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-2.5 font-bold text-gray-900 text-xs">
                <button type="button" onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-950 transition-colors">
                  {allSelected ? <CheckSquare className="h-4 w-4 text-gray-950 stroke-[2.2]" /> : <Square className="h-4 w-4 stroke-[1.8]" />}
                </button>
                <FileText className="h-4 w-4 text-gray-400 stroke-[1.8]" />
                <span className="uppercase tracking-wider font-bold text-gray-900">{t("certs_title")}</span>
              </div>
              
              <div className="flex gap-1.5 text-[10px] font-bold text-gray-400">
                {selectedIds.size > 0 && (
                  <span className="rounded-md border border-gray-950 bg-gray-950 px-2 py-0.5 text-white tracking-tight shadow-sm animate-in fade-in duration-100">{selectedIds.size} {copy.selected.toLowerCase()}</span>
                )}
                <span className="rounded-md border border-gray-100 bg-gray-50 px-2 py-0.5">{t("certs_total")}: {total}</span>
              </div>
            </div>

            {/* Gövde Veri Akış Slotları */}
            {loading ? (
              <div className="flex flex-col items-center justify-center p-24 flex-grow">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400 stroke-[2.5]" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 text-center flex-grow space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-gray-50 text-gray-400 shadow-sm">
                  <Search className="h-4 w-4 stroke-[1.8]" />
                </div>
                <p className="text-xs font-semibold text-gray-400 tracking-tight">{t("certs_empty")}</p>
              </div>
            ) : (
              <motion.div variants={containerVars} initial="hidden" animate="show" className="divide-y divide-gray-100 bg-white">
                {items.map((c) => {
                  const s = getStatusStyle(c.status);
                  const canDownload = c.status === "active" && !!c.pdf_url;
                  const isSelected = selectedIds.has(c.id);
                  return (
                    <motion.div 
                      key={c.id} 
                      variants={rowVars} 
                      className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 transition-colors relative ${
                        isSelected ? "bg-gray-50/50" : "hover:bg-gray-50/20"
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button type="button" onClick={() => toggleSelect(c.id)} className="mt-0.5 shrink-0 text-gray-300 hover:text-gray-950 transition-colors">
                          {isSelected ? <CheckSquare className="h-4 w-4 text-gray-950 stroke-[2.2]" /> : <Square className="h-4 w-4 stroke-[1.5]" />}
                        </button>
                        
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight shadow-sm ${s.bg} ${s.color} ${s.border}`}>
                              {s.icon} <span>{c.status}</span>
                            </span>
                            <h3 className="text-xs font-bold text-gray-950 tracking-tight truncate">{c.student_name}</h3>
                          </div>
                          
                          {/* Teknik Bilgi Hap Kümesi */}
                          <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold text-gray-400 font-mono leading-none">
                            <span className="flex items-center gap-0.5 bg-gray-50 border border-gray-100/60 rounded px-1.5 py-0.5"><Hash className="h-2.5 w-2.5" />{c.uuid.split("-")[0]}</span>
                            {c.public_id && <span className="flex items-center gap-0.5 bg-gray-50 border border-gray-100/60 rounded px-1.5 py-0.5"><LockKeyhole className="h-2.5 w-2.5" />{c.public_id}</span>}
                            {c.hosting_term && <span className="bg-gray-50 border border-gray-100/60 rounded px-1.5 py-0.5 uppercase">{c.hosting_term}</span>}
                            <span className="bg-gray-50 border border-gray-100/60 rounded px-1.5 py-0.5">{copy.remaining}: {formatRemaining(c)}</span>
                            <span className="bg-gray-50 border border-gray-100/60 rounded px-1.5 py-0.5">{formatHc(c.total_cost_units)}</span>
                            <span className={`border rounded px-1.5 py-0.5 ${c.auto_renew_enabled ? "border-emerald-100 bg-emerald-50/40 text-emerald-700" : "border-gray-100 bg-gray-50 text-gray-400"}`}>
                              {c.auto_renew_enabled ? copy.autoRenewOn : copy.autoRenewOff}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Kart İçi Eylem Konsolu (Action Bar Grid) */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 lg:w-[320px] self-end lg:self-auto w-full sm:w-auto">
                        <div className="grid grid-cols-2 gap-1.5 flex-1">
                          <a href={`/verify/${c.uuid}`} target="_blank" rel="noreferrer" className="inline-flex min-h-[32px] items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white text-[11px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50">
                            <ExternalLink className="h-3 w-3 text-gray-400 stroke-[2]" /> <span>{copy.verifyAction}</span>
                          </a>
                          {canDownload ? (
                            <a href={c.pdf_url!} target="_blank" rel="noreferrer" className="inline-flex min-h-[32px] items-center justify-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 text-[11px] font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50/80">
                              <Download className="h-3 w-3 stroke-[2.5]" /> <span>{copy.downloadAction}</span>
                            </a>
                          ) : (
                            <div className="inline-flex min-h-[32px] items-center justify-center gap-1 rounded-lg border border-gray-100 bg-gray-50/50 px-2.5 text-[11px] font-semibold text-gray-300 cursor-not-allowed select-none">
                              <ShieldOff className="h-3 w-3 stroke-[1.8]" /> <span>{copy.locked}</span>
                            </div>
                          )}
                        </div>

                        {/* Oto Yenileme Tetikleyicisi */}
                        <button
                          type="button"
                          onClick={() => patchAutoRenew(c.id, !c.auto_renew_enabled)}
                          className={`inline-flex min-h-[32px] items-center justify-center gap-1 rounded-lg border text-[11px] font-semibold transition-all ${
                            c.auto_renew_enabled
                              ? "border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-50/80"
                              : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-950"
                          }`}
                        >
                          <RefreshCcw className="h-3 w-3 stroke-[2]" />
                          <span>{c.auto_renew_enabled ? copy.autoRenewDisable.split(" ")[0] : copy.autoRenewEnable.split(" ")[0]}</span>
                        </button>

                        {/* Alt Durum Değiştirme Matrisi (4'lü Bölme) */}
                        <div className="grid grid-cols-4 gap-0.5 rounded-lg border border-gray-100 bg-gray-50 p-0.5">
                          <button type="button" onClick={() => patchStatus(c.id, "active")} disabled={c.status === "active"} className="rounded px-1 py-1 text-[9px] font-bold text-gray-400 hover:text-emerald-700 hover:bg-white disabled:opacity-20 transition-colors" title="Aktif">{copy.activeAction.slice(0,3)}</button>
                          <button type="button" onClick={() => patchStatus(c.id, "revoked")} disabled={c.status === "revoked"} className="rounded px-1 py-1 text-[9px] font-bold text-gray-400 hover:text-red-500 hover:bg-white disabled:opacity-20 transition-colors" title="İptal">{copy.revokeAction.slice(0,3)}</button>
                          <button type="button" onClick={() => patchStatus(c.id, "expired")} disabled={c.status === "expired"} className="rounded px-1 py-1 text-[9px] font-bold text-gray-400 hover:text-amber-600 hover:bg-white disabled:opacity-20 transition-colors" title="Süre Bitir">{copy.expireAction.slice(0,3)}</button>
                          <button type="button" onClick={() => setDeleteTargetId(c.id)} className="rounded px-1 py-1 text-gray-300 hover:text-red-600 hover:bg-white transition-colors" title="Kalıcı Sil">
                            <Trash2 className="mx-auto h-3 w-3 stroke-[1.8]" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* Alt Sayfalama Kontrol Paneli */}
            <div className="border-t border-gray-100 px-4 py-3.5 flex items-center justify-between mt-auto bg-white text-xs font-semibold text-gray-400 tracking-tight">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="flex h-7 px-2.5 items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-400 transition-all hover:text-gray-900 disabled:opacity-30 shadow-sm">
                ← {t("certs_prev")}
              </button>
              <span className="font-mono text-gray-400 font-bold"><span className="text-gray-900">{page}</span> / {totalPages}</span>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="flex h-7 px-2.5 items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-400 transition-all hover:text-gray-900 disabled:opacity-30 shadow-sm">
                {t("certs_next")} →
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* GLOBAL ONAY MODALLARI SELLERİ */}
      <ConfirmModal open={deleteTargetId !== null} title={copy.deleteSingleTitle} description={copy.deleteSingleBody} danger loading={deleteLoading} onConfirm={confirmSoftDelete} onCancel={() => setDeleteTargetId(null)} />
      <ConfirmModal open={bulkTarget !== null} title={bulkTarget === "delete" ? copy.bulkDeleteTitle : bulkTarget === "revoke" ? copy.bulkRevokeTitle : bulkTarget === "expire" ? copy.bulkExpireTitle : bulkTarget === "enable_auto_renew" ? copy.bulkEnableRenewTitle : copy.bulkDisableRenewTitle} description={bulkTarget === "delete" ? copy.bulkDeleteBody(selectedIds.size) : bulkTarget === "revoke" ? copy.bulkRevokeBody(selectedIds.size) : bulkTarget === "expire" ? copy.bulkExpireBody(selectedIds.size) : bulkTarget === "enable_auto_renew" ? copy.bulkEnableRenewBody(selectedIds.size) : copy.bulkDisableRenewBody(selectedIds.size)} danger={bulkTarget === "delete"} loading={bulkLoading} onConfirm={executeBulkAction} onCancel={() => setBulkTarget(null)} />
    </div>
  );
}