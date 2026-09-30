"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2, Plus, Search, Loader2, Trash2, ChevronRight,
  Users, Briefcase,
} from "lucide-react";
import {
  listCrmAccounts, createCrmAccount, deleteCrmAccount,
  type CrmAccountOut,
} from "@/lib/api";
import { useI18n, translate } from "@/lib/i18n";

const INDUSTRY_OPTIONS_TR = [
 "Teknoloji", "Finans", "Sağlık", "Eğitim", "Üretim",
 "Perakende", "İnşaat", "Lojistik", "Danışmanlık", "Diğer",
];

const INDUSTRY_OPTIONS_EN = [
 "Technology", "Finance", "Healthcare", "Education", "Manufacturing",
 "Retail", "Construction", "Logistics", "Consulting", "Other",
];

const SIZE_OPTIONS_TR = [
  { value: "1-10", label: "1–10 kişi" },
  { value: "11-50", label: "11–50 kişi" },
  { value: "51-200", label: "51–200 kişi" },
  { value: "201-1000", label: "201–1000 kişi" },
  { value: "1000+", label: "1000+ kişi" },
];

const SIZE_OPTIONS_EN = [
  { value: "1-10", label: "1–10 people" },
  { value: "11-50", label: "11–50 people" },
  { value: "51-200", label: "51–200 people" },
  { value: "201-1000", label: "201–1000 people" },
  { value: "1000+", label: "1000+ people" },
];

export default function CrmAccountsPage() {
  const { lang } = useI18n();
  const copy = { pageTitle: translate(lang, "migrated_app_admin_crm_accounts_company_accounts_bab850e4"), pageSubtitle: translate(lang, "migrated_app_admin_crm_accounts_corporate_crm_company_and_relationship_man_3e6679fb"), newAccount: translate(lang, "migrated_app_admin_crm_accounts_new_account_b457665c"), newAccountForm: translate(lang, "migrated_app_admin_crm_accounts_new_company_account_361bd4a1"), companyName: translate(lang, "migrated_app_admin_crm_accounts_company_name_b004e14d"), companyNamePlaceholder: translate(lang, "migrated_app_admin_crm_accounts_acme_inc_2338358a"), domain: translate(lang, "migrated_app_admin_crm_accounts_domain_41892a43"), domainPlaceholder: translate(lang, "migrated_app_admin_crm_accounts_acme_com_81a9879a"), industry: translate(lang, "migrated_app_admin_crm_accounts_industry_27742a6d"), companySize: translate(lang, "migrated_app_admin_crm_accounts_company_size_b68ab341"), selectPlaceholder: translate(lang, "migrated_app_admin_crm_accounts_select_b4165849"), create: translate(lang, "migrated_app_admin_crm_accounts_create_5a6ebdb4"), cancel: translate(lang, "migrated_app_admin_crm_accounts_cancel_0975dc56"), searchPlaceholder: translate(lang, "migrated_app_admin_crm_accounts_search_by_company_name_or_domain_0a5c49a0"), noResults: translate(lang, "migrated_app_admin_crm_accounts_no_search_results_found_ae870c21"), noAccounts: translate(lang, "migrated_app_admin_crm_accounts_no_company_accounts_yet_d2898aed"), colCompany: translate(lang, "migrated_app_admin_crm_accounts_company_dc854996"), colIndustry: translate(lang, "migrated_app_admin_crm_accounts_industry_faae7e6b"), colSize: translate(lang, "migrated_app_admin_crm_accounts_size_bb5a98f5"), colContacts: translate(lang, "migrated_app_admin_crm_accounts_contacts_b2c6df59"), colDeals: translate(lang, "migrated_app_admin_crm_accounts_deals_972eb1f6"), detail: translate(lang, "migrated_app_admin_crm_accounts_detail_2270229b"), toastCreated: translate(lang, "migrated_app_admin_crm_accounts_account_created_25af29c8"), toastCreateFailed: translate(lang, "migrated_app_admin_crm_accounts_could_not_create_746e6dd5"), toastDeleteFailed: translate(lang, "migrated_app_admin_crm_accounts_could_not_delete_59a93b67"), confirmDelete: translate(lang, "migrated_app_admin_crm_accounts_are_you_sure_you_want_to_delete_this_accou_a7ceaa61") };

  const INDUSTRY_OPTIONS = [translate(lang, "migrated_app_admin_crm_accounts_technology_1faf0ac7"), translate(lang, "migrated_app_admin_crm_accounts_finance_475d5db9"), translate(lang, "migrated_app_admin_crm_accounts_healthcare_1e2320eb"), translate(lang, "migrated_app_admin_crm_accounts_education_8cc2a7e9"), translate(lang, "migrated_app_admin_crm_accounts_manufacturing_2c93039f"), translate(lang, "migrated_app_admin_crm_accounts_retail_0a7ec018"), translate(lang, "migrated_app_admin_crm_accounts_construction_a4f34b58"), translate(lang, "migrated_app_admin_crm_accounts_logistics_fee6a3bb"), translate(lang, "migrated_app_admin_crm_accounts_consulting_d1446f58"), translate(lang, "migrated_app_admin_crm_accounts_other_6f912e58")];
  const SIZE_OPTIONS = [{ value: "1-10", label: translate(lang, "migrated_app_admin_crm_accounts_1_10_people_c2da0069") }, { value: "11-50", label: translate(lang, "migrated_app_admin_crm_accounts_11_50_people_b8f9adfe") }, { value: "51-200", label: translate(lang, "migrated_app_admin_crm_accounts_51_200_people_14cbb5ae") }, { value: "201-1000", label: translate(lang, "migrated_app_admin_crm_accounts_201_1000_people_549b7076") }, { value: "1000+", label: translate(lang, "migrated_app_admin_crm_accounts_1000_people_e2561f65") }];

  const [accounts, setAccounts] = useState<CrmAccountOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [newSize, setNewSize] = useState("");

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function loadAccounts(q?: string) {
    setLoading(true);
    listCrmAccounts({ search: q || undefined, limit: 200 })
      .then(setAccounts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => loadAccounts(val), 350);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createCrmAccount({
        name: newName.trim(),
        domain: newDomain.trim() || undefined,
        industry: newIndustry || undefined,
        size_bucket: newSize || undefined,
      });
      setAccounts((prev) => [created, ...prev]);
      setShowForm(false);
      setNewName(""); setNewDomain(""); setNewIndustry(""); setNewSize("");
      showMsg(copy.toastCreated);
    } catch {
      showMsg(copy.toastCreateFailed);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(copy.confirmDelete)) return;
    try {
      await deleteCrmAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      showMsg(copy.toastDeleteFailed);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-inverse-surface text-white text-sm rounded-xl px-4 py-2.5 shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-status-info-content" />
          <div>
            <h1 className="text-xl font-semibold text-content-primary">{copy.pageTitle}</h1>
            <p className="text-sm text-content-muted">{copy.pageSubtitle}</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> {copy.newAccount}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-status-info-border bg-status-info-bg p-5 space-y-4">
          <p className="text-sm font-medium text-status-info-content">{copy.newAccountForm}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-content-muted mb-1">{copy.companyName}</label>
              <input
                autoFocus
                className="w-full rounded-xl border border-outline-subtle bg-raised px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                placeholder={copy.companyNamePlaceholder}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">{copy.domain}</label>
              <input
                className="w-full rounded-xl border border-outline-subtle bg-raised px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                placeholder={copy.domainPlaceholder}
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">{copy.industry}</label>
              <select
                className="w-full rounded-xl border border-outline-subtle bg-raised px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
              >
                <option value="">{copy.selectPlaceholder}</option>
                {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">{copy.companySize}</label>
              <select
                className="w-full rounded-xl border border-outline-subtle bg-raised px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
              >
                <option value="">{copy.selectPlaceholder}</option>
                {SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              disabled={creating || !newName.trim()}
              onClick={handleCreate}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-indigo-700"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.create}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewName(""); setNewDomain(""); setNewIndustry(""); setNewSize(""); }}
              className="rounded-xl border border-outline-subtle bg-raised px-3 py-2 text-sm text-content-muted"
            >
              {copy.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-content-muted pointer-events-none" />
        <input
          className="w-full rounded-xl border border-outline-subtle bg-raised pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
          placeholder={copy.searchPlaceholder}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-20 text-content-muted">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{search ? copy.noResults : copy.noAccounts}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-outline-subtle bg-raised shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-canvas border-b border-outline-subtle">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-content-muted">{copy.colCompany}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-content-muted">{copy.colIndustry}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-content-muted">{copy.colSize}</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-content-muted">{copy.colContacts}</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-content-muted">{copy.colDeals}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-subtle">
              {accounts.map((acct) => (
                <tr key={acct.id} className="hover:bg-canvas">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-status-info-bg flex items-center justify-center text-xs font-bold text-status-info-content flex-shrink-0">
                        {acct.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          href={`/admin/crm/accounts/${acct.id}`}
                          className="font-medium text-content-primary hover:text-status-info-content"
                        >
                          {acct.name}
                        </Link>
                        {acct.domain && (
                          <p className="text-xs text-content-muted">{acct.domain}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-content-muted">{acct.industry || "—"}</td>
                  <td className="px-4 py-4 text-content-muted">{acct.size_bucket || "—"}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center gap-1 text-content-muted">
                      <Users className="h-3.5 w-3.5" /> {acct.contact_count}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center gap-1 text-content-muted">
                      <Briefcase className="h-3.5 w-3.5" /> {acct.deal_count}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/crm/accounts/${acct.id}`}
                        className="flex items-center gap-1 rounded-lg border border-outline-subtle px-2.5 py-1.5 text-xs text-content-secondary hover:bg-canvas"
                      >
                        {copy.detail} <ChevronRight className="h-3 w-3" />
                      </Link>
                      <button
                        onClick={() => handleDelete(acct.id)}
                        className="rounded-lg border border-outline-subtle p-1.5 text-status-danger-content hover:bg-status-danger-bg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
