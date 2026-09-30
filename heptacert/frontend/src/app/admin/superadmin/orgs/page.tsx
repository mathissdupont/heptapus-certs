"use client";

import { localeTag } from "@/lib/localeTag";
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
import { useI18n, translate } from "@/lib/i18n";
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

  const copy = { title: translate(lang, "migrated_app_admin_superadmin_orgs_organizations_77e91321"), subtitle: translate(lang, "migrated_app_admin_superadmin_orgs_manage_white_label_organizations_custom_do_8f464383"), add: translate(lang, "migrated_app_admin_superadmin_orgs_new_organization_3078082a"), edit: translate(lang, "migrated_app_admin_superadmin_orgs_edit_organization_00946dd2"), create: translate(lang, "migrated_app_admin_superadmin_orgs_create_organization_41be2641"), createSuccess: translate(lang, "migrated_app_admin_superadmin_orgs_organization_created_11f8dc7f"), updateSuccess: translate(lang, "migrated_app_admin_superadmin_orgs_organization_updated_489a5911"), deleteSuccess: translate(lang, "migrated_app_admin_superadmin_orgs_organization_deleted_775a459a"), loadFailed: translate(lang, "migrated_app_admin_superadmin_orgs_failed_to_load_organizations_e62cf1f2"), saveFailed: translate(lang, "migrated_app_admin_superadmin_orgs_failed_to_save_organization_e9d265da"), deleteFailed: translate(lang, "migrated_app_admin_superadmin_orgs_failed_to_delete_organization_60adb51d"), domainApproveSuccess: translate(lang, "migrated_app_admin_superadmin_orgs_domain_approved_and_enabled_for_caddy_8aeb8ecc"), domainRevokeSuccess: translate(lang, "migrated_app_admin_superadmin_orgs_domain_unpublished_3ee2ab42"), domainActionFailed: translate(lang, "migrated_app_admin_superadmin_orgs_domain_action_failed_c41324c7"), total: translate(lang, "migrated_app_admin_superadmin_orgs_organizations_6fecf032"), domains: translate(lang, "migrated_app_admin_superadmin_orgs_custom_domains_a386fc0f"), branded: translate(lang, "migrated_app_admin_superadmin_orgs_with_logo_f1f442e9"), latest: translate(lang, "migrated_app_admin_superadmin_orgs_latest_added_88fed689"), orgName: translate(lang, "migrated_app_admin_superadmin_orgs_organization_name_8939c3ac"), adminUserId: translate(lang, "migrated_app_admin_superadmin_orgs_admin_user_id_8473b4d2"), customDomain: translate(lang, "migrated_app_admin_superadmin_orgs_custom_domain_f04cc8b7"), logoUrl: translate(lang, "migrated_app_admin_superadmin_orgs_logo_url_d2cdb4a8"), brandColor: translate(lang, "migrated_app_admin_superadmin_orgs_brand_color_70aa4a11"), cancel: translate(lang, "migrated_app_admin_superadmin_orgs_cancel_57ff9be2"), save: translate(lang, "migrated_app_admin_superadmin_orgs_save_12b6843f"), emptyTitle: translate(lang, "migrated_app_admin_superadmin_orgs_no_organizations_yet_0411c59b"), emptyBody: translate(lang, "migrated_app_admin_superadmin_orgs_create_an_organization_to_centrally_manage_8f8ab06b"), deleteTitle: translate(lang, "migrated_app_admin_superadmin_orgs_delete_organization_18a80ed2"), deleteDescription: translate(lang, "migrated_app_admin_superadmin_orgs_this_action_cannot_be_undone_are_you_sure__a612c8a3"), noDomain: translate(lang, "migrated_app_admin_superadmin_orgs_no_domain_e27d56de"), noLogo: translate(lang, "migrated_app_admin_superadmin_orgs_no_logo_257b77e9"), domainStatus: translate(lang, "migrated_app_admin_superadmin_orgs_domain_status_54192b55"), approveDomain: translate(lang, "migrated_app_admin_superadmin_orgs_approve_domain_0fbfee0f"), revokeDomain: translate(lang, "migrated_app_admin_superadmin_orgs_unpublish_270edf28"), caddyReady: translate(lang, "migrated_app_admin_superadmin_orgs_caddy_ready_80ec4e18"), caddyWaiting: translate(lang, "migrated_app_admin_superadmin_orgs_waiting_for_caddy_daf68293"), dnsTarget: translate(lang, "migrated_app_admin_superadmin_orgs_dns_target_35d72403"), verificationRecord: translate(lang, "migrated_app_admin_superadmin_orgs_verification_record_61fa77e8") };

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
      { label: copy.total, value: orgs.length, detail: translate(lang, "migrated_app_admin_superadmin_orgs_active_records_89f77d48") },
      { label: copy.domains, value: withDomain, detail: translate(lang, "migrated_app_admin_superadmin_orgs_connected_domains_c362df31") },
      { label: copy.branded, value: withLogo, detail: translate(lang, "migrated_app_admin_superadmin_orgs_with_uploaded_logo_487b9064") },
      { label: copy.latest, value: latest ? latest.org_name : "-", detail: latest ? new Date(latest.created_at).toLocaleDateString(localeTag(lang)) : "-" },
    ];
  }, [copy.branded, copy.domains, copy.latest, copy.total, lang, orgs]);

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
                  className="h-11 w-14 rounded-2xl border border-surface-200 bg-raised"
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
                  <button onClick={() => setDeletingId(org.id)} className="h-10 w-10 rounded-2xl border border-status-danger-border bg-status-danger-bg text-status-danger-content transition hover:bg-status-danger-bg" aria-label={copy.deleteTitle}>
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
                              ? "border-status-success-border bg-status-success-bg text-status-success-content"
                              : org.domain_status === "revoked"
                                ? "border-status-danger-border bg-status-danger-bg text-status-danger-content"
                                : "border-status-warning-border bg-status-warning-bg text-status-warning-content"
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
                <span>{new Date(org.created_at).toLocaleDateString(localeTag(lang))}</span>
                <span>{org.brand_color}</span>
              </div>
              {org.custom_domain && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-surface-200 bg-raised p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-surface-500">
                    {org.caddy_authorized ? (
                      <CheckCircle2 className="h-4 w-4 text-status-success-content" />
                    ) : (
                      <XCircle className="h-4 w-4 text-status-warning-content" />
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
                        className="rounded-2xl border border-status-danger-border bg-status-danger-bg px-3 py-2 text-xs font-semibold text-status-danger-content transition hover:bg-status-danger-bg disabled:opacity-60"
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
