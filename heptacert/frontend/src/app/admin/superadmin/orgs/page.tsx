"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Globe,
  ImageIcon,
  Loader2,
  PencilLine,
  Plus,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/Admin/PageHeader";
import ConfirmModal from "@/components/Admin/ConfirmModal";
import EmptyState from "@/components/Admin/EmptyState";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/useToast";

type OrgRow = {
  id: number;
  user_id: number;
  org_name: string;
  custom_domain: string | null;
  brand_logo: string | null;
  brand_color: string;
  created_at: string;
  domain_status: string | null;
  domain_token: string | null;
  verification_host: string | null;
  dns_target: string | null;
  caddy_authorized: boolean;
};

const EMPTY_FORM = {
  user_id: "",
  org_name: "",
  custom_domain: "",
  brand_logo: "",
  brand_color: "#0f766e",
};

export default function SuperadminOrgsPage() {
  const toast = useToast();
  const { lang } = useI18n();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [domainActionId, setDomainActionId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const copy = lang === "tr"
    ? {
        title: "Kurumlar",
        subtitle: "White-label kurum yapılarını, özel domainleri ve marka görünümünü yönetin",
        add: "Yeni kurum",
        edit: "Kurumu düzenle",
        create: "Kurum oluştur",
        createSuccess: "Kurum oluşturuldu",
        updateSuccess: "Kurum güncellendi",
        deleteSuccess: "Kurum silindi",
        loadFailed: "Kurumlar yüklenemedi",
        saveFailed: "Kurum kaydedilemedi",
        deleteFailed: "Kurum silinemedi",
        domainApproveSuccess: "Domain onaylandı ve Caddy için aktif edildi",
        domainRevokeSuccess: "Domain yayından kaldırıldı",
        domainActionFailed: "Domain işlemi tamamlanamadı",
        total: "Toplam kurum",
        domains: "Özel domain",
        branded: "Logo tanımlı",
        latest: "Son eklenen",
        orgName: "Kurum adı",
        adminUserId: "Admin kullanıcı ID",
        customDomain: "Özel domain",
        logoUrl: "Logo URL",
        brandColor: "Marka rengi",
        cancel: "İptal",
        save: "Kaydet",
        emptyTitle: "Henüz kurum tanımlanmamış",
        emptyBody: "Yeni bir kurum ekleyerek özel domain ve marka ayarlarını merkezi olarak yönetebilirsiniz.",
        deleteTitle: "Kurumu sil",
        deleteDescription: "Bu işlem geri alınamaz. Kurum kaydını kalıcı olarak silmek istediğinizden emin misiniz?",
        noDomain: "Domain yok",
        noLogo: "Logo yok",
        domainStatus: "Domain durumu",
        approveDomain: "Domaini onayla",
        revokeDomain: "Yayından kaldır",
        caddyReady: "Caddy hazır",
        caddyWaiting: "Caddy bekliyor",
        dnsTarget: "DNS hedefi",
        verificationRecord: "Doğrulama kaydı",
        locale: "tr-TR",
      }
    : {
        title: "Organizations",
        subtitle: "Manage white-label organizations, custom domains, and brand appearance",
        add: "New organization",
        edit: "Edit organization",
        create: "Create organization",
        createSuccess: "Organization created",
        updateSuccess: "Organization updated",
        deleteSuccess: "Organization deleted",
        loadFailed: "Failed to load organizations",
        saveFailed: "Failed to save organization",
        deleteFailed: "Failed to delete organization",
        domainApproveSuccess: "Domain approved and enabled for Caddy",
        domainRevokeSuccess: "Domain unpublished",
        domainActionFailed: "Domain action failed",
        total: "Organizations",
        domains: "Custom domains",
        branded: "With logo",
        latest: "Latest added",
        orgName: "Organization name",
        adminUserId: "Admin user ID",
        customDomain: "Custom domain",
        logoUrl: "Logo URL",
        brandColor: "Brand color",
        cancel: "Cancel",
        save: "Save",
        emptyTitle: "No organizations yet",
        emptyBody: "Create an organization to centrally manage custom domains and brand settings.",
        deleteTitle: "Delete organization",
        deleteDescription: "This action cannot be undone. Are you sure you want to permanently delete this organization?",
        noDomain: "No domain",
        noLogo: "No logo",
        domainStatus: "Domain status",
        approveDomain: "Approve domain",
        revokeDomain: "Unpublish",
        caddyReady: "Caddy ready",
        caddyWaiting: "Waiting for Caddy",
        dnsTarget: "DNS target",
        verificationRecord: "Verification record",
        locale: "en-US",
      };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(false);
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch("/superadmin/organizations");
      const data = await response.json();
      setOrgs(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []);
    } catch (e: any) {
      setError(e?.message || copy.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const stats = useMemo(() => {
    const withDomain = orgs.filter((org) => !!org.custom_domain).length;
    const withLogo = orgs.filter((org) => !!org.brand_logo).length;
    const latest = orgs[0];
    return [
      { label: copy.total, value: orgs.length, detail: lang === "tr" ? "aktif yapı" : "active records" },
      { label: copy.domains, value: withDomain, detail: lang === "tr" ? "bağlı domain" : "connected domains" },
      { label: copy.branded, value: withLogo, detail: lang === "tr" ? "logo tanımlı" : "with uploaded logo" },
      { label: copy.latest, value: latest ? latest.org_name : "-", detail: latest ? new Date(latest.created_at).toLocaleDateString(copy.locale) : "-" },
    ];
  }, [copy.branded, copy.domains, copy.latest, copy.locale, copy.total, lang, orgs]);

  const startCreate = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
  };

  const startEdit = (org: OrgRow) => {
    setEditId(org.id);
    setForm({
      user_id: String(org.user_id),
      org_name: org.org_name,
      custom_domain: org.custom_domain ?? "",
      brand_logo: org.brand_logo ?? "",
      brand_color: org.brand_color || "#0f766e",
    });
    setShowForm(true);
  };

  const saveOrg = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const payload = {
        user_id: form.user_id ? Number(form.user_id) : undefined,
        org_name: form.org_name,
        custom_domain: form.custom_domain || null,
        brand_logo: form.brand_logo || null,
        brand_color: form.brand_color,
      };
      if (editId) {
        await apiFetch(`/superadmin/organizations/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success(copy.updateSuccess);
      } else {
        await apiFetch("/superadmin/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success(copy.createSuccess);
      }
      resetForm();
      await load();
    } catch (e: any) {
      const message = e?.message || copy.saveFailed;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const deleteOrg = async () => {
    if (!deletingId) return;
    try {
      setDeleting(true);
      await apiFetch(`/superadmin/organizations/${deletingId}`, { method: "DELETE" });
      toast.success(copy.deleteSuccess);
      setDeletingId(null);
      await load();
    } catch (e: any) {
      const message = e?.message || copy.deleteFailed;
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const runDomainAction = async (org: OrgRow, action: "approve" | "revoke") => {
    try {
      setDomainActionId(org.id);
      setError(null);
      const response = await apiFetch(`/superadmin/organizations/${org.id}/domain/${action}`, { method: "POST" });
      const updated = await response.json();
      setOrgs((current) => current.map((item) => (item.id === org.id ? { ...item, ...updated } : item)));
      toast.success(action === "approve" ? copy.domainApproveSuccess : copy.domainRevokeSuccess);
      await load();
    } catch (e: any) {
      const message = e?.message || copy.domainActionFailed;
      setError(message);
      toast.error(message);
    } finally {
      setDomainActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        icon={<Building2 className="h-5 w-5" />}
        actions={
          <button onClick={startCreate} className="btn-primary gap-2 text-xs">
            <Plus className="h-4 w-4" />
            {copy.add}
          </button>
        }
      />

      {error && (
        <div className="error-banner flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-surface-400">{stat.label}</p>
            <p className="mt-3 text-2xl font-black text-surface-900">{stat.value}</p>
            <p className="mt-1 text-sm text-surface-500">{stat.detail}</p>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            onSubmit={saveOrg}
            className="card grid gap-4 p-5 sm:grid-cols-2"
          >
            <div className="sm:col-span-2 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-surface-900">{editId ? copy.edit : copy.create}</h2>
                <p className="text-sm text-surface-500">{copy.subtitle}</p>
              </div>
              <button type="button" onClick={resetForm} className="btn-secondary text-xs">
                {copy.cancel}
              </button>
            </div>

            <label className="space-y-2">
              <span className="label">{copy.adminUserId}</span>
              <input
                type="number"
                min={1}
                required
                value={form.user_id}
                onChange={(event) => setForm((current) => ({ ...current, user_id: event.target.value }))}
                className="input-field"
              />
            </label>

            <label className="space-y-2">
              <span className="label">{copy.orgName}</span>
              <input
                required
                value={form.org_name}
                onChange={(event) => setForm((current) => ({ ...current, org_name: event.target.value }))}
                className="input-field"
              />
            </label>

            <label className="space-y-2">
              <span className="label">{copy.customDomain}</span>
              <input
                value={form.custom_domain}
                onChange={(event) => setForm((current) => ({ ...current, custom_domain: event.target.value }))}
                className="input-field"
                placeholder="certs.example.com"
              />
            </label>

            <label className="space-y-2">
              <span className="label">{copy.logoUrl}</span>
              <input
                value={form.brand_logo}
                onChange={(event) => setForm((current) => ({ ...current, brand_logo: event.target.value }))}
                className="input-field"
                placeholder="https://..."
              />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="label">{copy.brandColor}</span>
              <div className="flex gap-3">
                <input
                  value={form.brand_color}
                  onChange={(event) => setForm((current) => ({ ...current, brand_color: event.target.value }))}
                  className="input-field flex-1"
                />
                <input
                  type="color"
                  value={form.brand_color}
                  onChange={(event) => setForm((current) => ({ ...current, brand_color: event.target.value }))}
                  className="h-11 w-14 rounded-2xl border border-surface-200 bg-white"
                />
              </div>
            </label>

            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <button type="submit" disabled={saving} className="btn-primary gap-2 text-sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {copy.save}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary text-sm">
                {copy.cancel}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {orgs.length === 0 ? (
        <EmptyState icon={<Building2 className="h-7 w-7" />} title={copy.emptyTitle} description={copy.emptyBody} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {orgs.map((org) => (
            <article key={org.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 h-12 w-12 rounded-2xl border border-surface-200" style={{ backgroundColor: org.brand_color }} />
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-surface-900">{org.org_name}</h2>
                    <p className="mt-1 text-sm text-surface-500">Admin ID #{org.user_id}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => startEdit(org)} className="btn-secondary h-10 w-10 px-0" aria-label={copy.edit}>
                    <PencilLine className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeletingId(org.id)} className="h-10 w-10 rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100" aria-label={copy.deleteTitle}>
                    <Trash2 className="mx-auto h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-surface-400">
                    <Globe className="h-3.5 w-3.5" /> {copy.customDomain}
                  </div>
                  <p className="mt-2 break-all text-sm font-medium text-surface-800">{org.custom_domain || copy.noDomain}</p>
                  {org.custom_domain && (
                    <div className="mt-3 space-y-2 text-xs text-surface-500">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-surface-600">{copy.domainStatus}:</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${
                            org.domain_status === "active"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : org.domain_status === "revoked"
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {org.domain_status === "active" ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {org.domain_status || "pending"}
                        </span>
                      </div>
                      {org.dns_target && (
                        <p className="break-all">
                          <span className="font-semibold text-surface-600">{copy.dnsTarget}:</span> {org.dns_target}
                        </p>
                      )}
                      {org.verification_host && (
                        <p className="break-all">
                          <span className="font-semibold text-surface-600">{copy.verificationRecord}:</span> {org.verification_host}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-surface-400">
                    <ImageIcon className="h-3.5 w-3.5" /> {copy.logoUrl}
                  </div>
                  <p className="mt-2 break-all text-sm font-medium text-surface-800">{org.brand_logo || copy.noLogo}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-surface-400">
                <span>{new Date(org.created_at).toLocaleDateString(copy.locale)}</span>
                <span>{org.brand_color}</span>
              </div>
              {org.custom_domain && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-surface-200 bg-white p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-surface-500">
                    {org.caddy_authorized ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-amber-600" />
                    )}
                    {org.caddy_authorized ? copy.caddyReady : copy.caddyWaiting}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {org.domain_status !== "active" && (
                      <button
                        type="button"
                        onClick={() => runDomainAction(org, "approve")}
                        disabled={domainActionId === org.id}
                        className="btn-primary gap-2 text-xs"
                      >
                        {domainActionId === org.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {copy.approveDomain}
                      </button>
                    )}
                    {org.domain_status === "active" && (
                      <button
                        type="button"
                        onClick={() => runDomainAction(org, "revoke")}
                        disabled={domainActionId === org.id}
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                      >
                        {domainActionId === org.id ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : copy.revokeDomain}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <ConfirmModal
        open={deletingId !== null}
        title={copy.deleteTitle}
        description={copy.deleteDescription}
        danger
        loading={deleting}
        onConfirm={deleteOrg}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
