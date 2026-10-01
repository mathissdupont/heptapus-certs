"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Loader2, AlertCircle, Plus, Copy, CheckCircle2, Eye, EyeOff, Trash2, Lock, Calendar, Terminal } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/Admin/PageHeader";
import { DataTable } from "@/components/DataTable/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";

type ApiKey = {
  id: number;
  name: string;
  key_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
  scopes: string[];
};

export default function ApiKeysPage() {
  const { lang, t } = useI18n();

  const copy = {
    pageTitle: t("admin_api_keys_page_title"),
    pageSubtitle: t("admin_api_keys_page_subtitle"),
    breadcrumbSettings: t("admin_api_keys_breadcrumb_settings"),
    breadcrumbApiKeys: t("admin_api_keys_page_title"),
    btnNewKey: t("admin_api_keys_btn_new_key"),
    infoTitle: t("admin_api_keys_info_title"),
    infoBody: t("admin_api_keys_info_body"),
    infoWarning: t("admin_api_keys_info_warning"),
    colName: t("admin_api_keys_col_name"),
    colKey: t("admin_api_keys_col_key"),
    colScopes: t("admin_api_keys_col_scopes"),
    colScopesAll: t("admin_api_keys_col_scopes_all"),
    colScopesCount: (n: number) => t("admin_api_keys_col_scopes_count", { count: n }),
    colLastUsed: t("admin_api_keys_col_last_used"),
    colExpires: t("admin_api_keys_col_expires"),
    colExpiresNever: t("admin_api_keys_col_expires_never"),
    colCreated: t("admin_api_keys_col_created"),
    btnDisable: t("admin_api_keys_btn_disable"),
    emptyTitle: t("admin_api_keys_empty_title"),
    emptySubtitle: t("admin_api_keys_empty_subtitle"),
    btnCreateFirst: t("admin_api_keys_btn_create_first"),
    searchPlaceholder: t("admin_api_keys_search_placeholder"),
    securityTitle: t("admin_api_keys_security_title"),
    securityTip1: t("admin_api_keys_security_tip1"),
    securityTip2: t("admin_api_keys_security_tip2"),
    securityTip3: t("admin_api_keys_security_tip3"),
    securityTip4: t("admin_api_keys_security_tip4"),
    securityTip5: t("admin_api_keys_security_tip5"),
    modalKeyReadyTitle: t("admin_api_keys_modal_key_ready_title"),
    modalKeyReadyWarning: t("admin_api_keys_modal_key_ready_warning"),
    modalKeyReadyImportant: t("admin_api_keys_modal_key_ready_important"),
    btnCopiedClose: t("admin_api_keys_btn_copied_close"),
    modalCreateTitle: t("admin_api_keys_modal_create_title"),
    modalCreateSubtitle: t("admin_api_keys_modal_create_subtitle"),
    labelKeyName: t("admin_api_keys_label_key_name"),
    placeholderKeyName: t("admin_api_keys_placeholder_key_name"),
    labelExpiry: t("admin_api_keys_label_expiry"),
    placeholderExpiry: t("admin_api_keys_placeholder_expiry"),
    expiryHint: t("admin_api_keys_expiry_hint"),
    btnCancel: t("admin_api_keys_btn_cancel"),
    btnGenerating: t("admin_api_keys_btn_generating"),
    btnGenerate: t("admin_api_keys_btn_generate"),
    toastKeyNameRequired: t("admin_api_keys_toast_key_name_required"),
    toastKeyCreated: t("admin_api_keys_toast_key_created"),
    toastKeyCreateFailed: t("admin_api_keys_toast_key_create_failed"),
    toastKeyDisabled: t("admin_api_keys_toast_key_disabled"),
    toastKeyDeleteFailed: t("admin_api_keys_toast_key_delete_failed"),
    toastKeyCopied: t("admin_api_keys_toast_key_copied"),
    loadError: t("admin_api_keys_load_error"),
  };

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string } | { key: "admin_api_keys_load_error" } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [expiresDays, setExpiresDays] = useState("");
  const [displayedFullKey, setDisplayedFullKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setError(null);
      const res = await apiFetch("/admin/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(Array.isArray(data) ? data : data.items || []);
      } else {
        setError({ key: "admin_api_keys_load_error" });
      }
    } catch (e: any) {
      setError(e?.message ? { message: e.message } : { key: "admin_api_keys_load_error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!keyName.trim()) {
      toast.error(copy.toastKeyNameRequired);
      return;
    }

    setCreating(true);
    try {
      const body: Record<string, unknown> = { name: keyName };
      if (expiresDays.trim()) body.expires_days = parseInt(expiresDays, 10);
      const res = await apiFetch("/admin/api-keys", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setDisplayedFullKey(data.full_key ?? data.key ?? null);
        setKeyName("");
        setExpiresDays("");
        setShowCreateModal(false);
        await fetchKeys();
        toast.success(copy.toastKeyCreated);
      } else {
        toast.error(copy.toastKeyCreateFailed);
      }
    } catch (e: any) {
      toast.error(e?.message || copy.toastKeyCreateFailed);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await apiFetch(`/admin/api-keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys(prev => prev.filter(k => k.id !== id));
        toast.success(copy.toastKeyDisabled);
      } else {
        toast.error(copy.toastKeyDeleteFailed);
      }
    } catch (e: any) {
      toast.error(e?.message || copy.toastKeyDeleteFailed);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyKey = (fullKey: string, keyId: number) => {
    navigator.clipboard.writeText(fullKey);
    setCopiedKeyId(keyId);
    toast.success(copy.toastKeyCopied);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const dateLocale = localeTag(lang);

  const columns = useMemo<ColumnDef<ApiKey>[]>(
    () => [
      {
        accessorKey: "name",
        header: copy.colName,
        cell: (info) => <span className="font-semibold text-surface-900 tracking-tight">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "key_prefix",
        header: copy.colKey,
        cell: (info) => (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-surface-50 border border-surface-100 px-2 py-0.5 rounded-lg text-surface-700 tracking-tight">
              {info.getValue() as string}
            </span>
            <Lock className="h-3 w-3 text-surface-400 stroke-[1.8]" />
          </div>
        ),
      },
      {
        accessorKey: "scopes",
        header: copy.colScopes,
        cell: (info) => {
          const scopes = (info.getValue() as string[]) ?? [];
          if (scopes.length === 0) return <span className="text-xs font-medium text-surface-400">{copy.colScopesAll}</span>;
          return (
            <div className="flex gap-1 flex-wrap">
              {scopes.length <= 2
                ? scopes.map((s) => (
                    <span key={s} className="text-11 font-semibold px-2 py-0.5 rounded-md bg-surface-100 border border-surface-200/50 text-surface-700">
                      {s}
                    </span>
                  ))
                : <span className="text-xs font-semibold text-surface-500">{copy.colScopesCount(scopes.length)}</span>}
            </div>
          );
        },
      },
      {
        accessorKey: "last_used_at",
        header: copy.colLastUsed,
        cell: (info) => {
          const date = info.getValue();
          return date ? (
            <span className="text-surface-500 font-medium text-xs">
              {new Date(date as string).toLocaleString(dateLocale, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
            </span>
          ) : (
            <span className="text-surface-300 font-medium text-xs">-</span>
          );
        },
      },
      {
        accessorKey: "expires_at",
        header: copy.colExpires,
        cell: (info) => {
          const date = info.getValue();
          return date ? (
            <span className="text-surface-500 font-medium text-xs">
              {new Date(date as string).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          ) : (
            <span className="text-surface-400 font-semibold text-11 tracking-tight bg-surface-50 px-1.5 py-0.5 rounded border border-surface-100">{copy.colExpiresNever}</span>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: copy.colCreated,
        cell: (info) => (
          <span className="text-surface-400 font-medium text-xs">
            {new Date(info.getValue() as string).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (info) => {
          const key = info.row.original;
          return (
            <button
              onClick={() => handleDeleteKey(key.id)}
              disabled={deletingId === key.id}
              className="p-1.5 rounded-lg text-surface-400 hover:bg-status-danger-bg hover:text-status-danger-content transition-all active:scale-95 disabled:opacity-40"
              title={copy.btnDisable}
            >
              {deletingId === key.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 stroke-[1.8]" />}
            </button>
          );
        },
      },
    ],
    [deletingId, lang, t]
  );

  if (loading) {
    return (
      <div className="flex w-full items-center justify-center p-24">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400 stroke-[2.5]" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 w-full space-y-5 antialiased text-surface-900">

      {/* SAYFA BAŞLIĞI */}
      <PageHeader
        title={copy.pageTitle}
        subtitle={copy.pageSubtitle}
        icon={<Lock className="h-4 w-4 stroke-[2]" />}
        breadcrumbs={[{ label: copy.breadcrumbSettings, href: "/admin/settings" }, { label: copy.breadcrumbApiKeys }]}
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-surface-900 px-4 text-xs font-semibold text-white transition hover:bg-surface-800 active:scale-95 shadow-sm"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>{copy.btnNewKey}</span>
          </button>
        }
      />

      {/* ÜST BİLGİLENDİRME KUTUSU (Apple Tarzı Soft Kart) */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-surface-200 bg-raised p-5 shadow-sm"
      >
        <div className="flex gap-3.5 items-start">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-status-info-border bg-status-info-bg text-status-info-content shadow-sm">
            <Terminal className="h-4 w-4 stroke-[2]" />
          </div>
          <div className="text-xs leading-relaxed text-surface-500 space-y-2 flex-1">
            <h4 className="font-semibold text-surface-900 text-xs tracking-tight">{copy.infoTitle}</h4>
            <p>{copy.infoBody}</p>
            <div className="overflow-x-auto rounded-xl border border-surface-100 bg-surface-50 p-3 font-mono text-11 text-surface-700 font-medium">
              curl -H "Authorization: Bearer YOUR_API_KEY" https://api.heptapusgroup.com/admin/events
            </div>
            <p className="text-11 text-status-warning-content font-semibold bg-status-warning-bg/50 border border-status-warning-border/50 rounded-lg px-2.5 py-1 w-fit">
              {copy.infoWarning}
            </p>
          </div>
        </div>
      </motion.div>

      {/* HATA BANNERI */}
      {error && (
        <div className="rounded-xl border border-status-danger-border bg-status-danger-bg/40 p-4 text-xs font-semibold text-status-danger-content flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{"key" in error ? t(error.key) : error.message}</span>
        </div>
      )}

      {/* ANA ANAHTAR TABLOSU VE BOŞ DURUM ALANI */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-200 bg-surface-50/30 p-12 text-center">
            <div className="flex h-11 w-11 mx-auto items-center justify-center rounded-full border border-surface-100 bg-raised text-surface-400 shadow-sm mb-4">
              <Lock className="h-4 w-4 stroke-[1.8]" />
            </div>
            <p className="text-xs font-semibold text-surface-900 tracking-tight mb-1">{copy.emptyTitle}</p>
            <p className="text-11 text-surface-400 max-w-xs mx-auto mb-5 leading-relaxed">{copy.emptySubtitle}</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg bg-surface-900 px-3.5 text-xs font-semibold text-white transition hover:bg-surface-800 active:scale-95 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>{copy.btnCreateFirst}</span>
            </button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={keys}
            pageSize={10}
            searchable={true}
            searchPlaceholder={copy.searchPlaceholder}
            enableExport={true}
            exportFileName="api-keys.csv"
            enableColumnVisibility={true}
          />
        )}
      </motion.div>

      {/* GÜVENLİK KILAVUZU (Apple Altyazı Bloğu) */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-surface-200 bg-raised p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-surface-900 border-b border-surface-100 pb-2.5">{copy.securityTitle}</h3>
        <ul className="space-y-2 text-xs font-medium text-surface-500 leading-relaxed">
          <li className="flex items-start gap-1.5"><span>•</span> <span>{copy.securityTip1}</span></li>
          <li className="flex items-start gap-1.5"><span>•</span> <span>{copy.securityTip2}</span></li>
          <li className="flex items-start gap-1.5"><span>•</span> <span>{copy.securityTip3}</span></li>
          <li className="flex items-start gap-1.5"><span>•</span> <span>{copy.securityTip4}</span></li>
          <li className="flex items-start gap-1.5"><span>•</span> <span>{copy.securityTip5}</span></li>
        </ul>
      </motion.div>

      {/* MODALLAR KATMANI (AnimatePresence Entegrasyonu) */}
      <AnimatePresence>
        {/* 1. GÖRÜNTÜLEME MODALI (Full Key Display) */}
        {displayedFullKey && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-surface-800/20 backdrop-blur-md"
              onClick={() => setDisplayedFullKey(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-surface-200 bg-raised/95 p-6 shadow-xl backdrop-blur-xl"
            >
              <h2 className="text-sm font-bold text-surface-900 tracking-tight mb-3">{copy.modalKeyReadyTitle}</h2>
              <div className="rounded-xl border border-status-warning-border bg-status-warning-bg/40 p-3.5 text-xs text-status-warning-content leading-relaxed mb-4">
                <strong>{copy.modalKeyReadyImportant}</strong> {copy.modalKeyReadyWarning}
              </div>

              <div className="rounded-xl border border-surface-200 bg-surface-50/50 p-3 mb-5 flex items-center justify-between gap-3 font-mono text-xs">
                <code className="text-surface-900 break-all select-all pr-1 font-semibold">{displayedFullKey}</code>
                <button
                  type="button"
                  onClick={() => handleCopyKey(displayedFullKey, 0)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-surface-200 bg-raised text-surface-400 hover:border-surface-300 hover:text-surface-900 transition-all active:scale-90 shadow-sm"
                >
                  {copiedKeyId === 0 ? <CheckCircle2 className="h-4 w-4 text-status-success-content stroke-[2.5]" /> : <Copy className="h-4 w-4 stroke-[2]" />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setDisplayedFullKey(null)}
                className="w-full inline-flex min-h-[38px] items-center justify-center rounded-lg bg-surface-900 text-xs font-semibold text-white shadow-sm transition hover:bg-surface-800 active:scale-[0.98]"
              >
                {copy.btnCopiedClose}
              </button>
            </motion.div>
          </div>
        )}

        {/* 2. ANAHTAR ÜRETİM MODALI (Create Modal) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-surface-800/20 backdrop-blur-md"
              onClick={() => { if (!creating) { setShowCreateModal(false); setKeyName(""); setExpiresDays(""); } }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-surface-200 bg-raised/95 p-6 shadow-xl backdrop-blur-xl space-y-4"
            >
              <div>
                <h2 className="text-sm font-bold text-surface-900 tracking-tight">{copy.modalCreateTitle}</h2>
                <p className="mt-1 text-11 leading-relaxed text-surface-400">{copy.modalCreateSubtitle}</p>
              </div>

              {/* İsim Alanı */}
              <div className="space-y-1.5">
                <label htmlFor="api-key-name" className="block text-11 font-bold text-surface-500">
                  {copy.labelKeyName}
                </label>
                <input
                  id="api-key-name"
                  type="text"
                  placeholder={copy.placeholderKeyName}
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 focus:ring-1 focus:ring-surface-900 placeholder:text-surface-400"
                  disabled={creating}
                />
              </div>

              {/* Geçerlilik Süresi */}
              <div className="space-y-1.5">
                <label htmlFor="api-key-expiry" className="block text-11 font-bold text-surface-500">
                  {copy.labelExpiry}
                </label>
                <input
                  id="api-key-expiry"
                  type="number"
                  placeholder={copy.placeholderExpiry}
                  value={expiresDays}
                  onChange={(e) => setExpiresDays(e.target.value)}
                  min="1"
                  className="w-full min-h-[38px] rounded-xl border border-surface-200 bg-raised px-3.5 text-xs font-semibold outline-none transition focus:border-surface-900 focus:ring-1 focus:ring-surface-900 placeholder:text-surface-400"
                  disabled={creating}
                />
                <p className="text-11 text-surface-400 leading-normal pt-0.5">{copy.expiryHint}</p>
              </div>

              {/* Buton Kontrolleri */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setKeyName(""); setExpiresDays(""); }}
                  disabled={creating}
                  className="flex-1 rounded-xl border border-surface-200 bg-raised px-4 py-2.5 text-xs font-semibold text-surface-700 shadow-sm transition hover:bg-surface-50 active:scale-[0.98] disabled:opacity-40"
                >
                  {copy.btnCancel}
                </button>
                <button
                  type="button"
                  onClick={handleCreateKey}
                  disabled={creating || !keyName.trim()}
                  className="flex-1 inline-flex items-center justify-center rounded-lg bg-surface-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-surface-800 active:scale-[0.98] disabled:opacity-30"
                >
                  {creating ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {copy.btnGenerating}
                    </span>
                  ) : copy.btnGenerate}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
