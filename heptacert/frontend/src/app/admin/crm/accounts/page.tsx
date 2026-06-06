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
import { useI18n } from "@/lib/i18n";

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
  const copy = lang === "tr"
    ? {
        pageTitle: "Şirket Hesapları",
        pageSubtitle: "Kurumsal CRM — şirket ve ilişki yönetimi",
        newAccount: "Yeni Hesap",
        newAccountForm: "Yeni şirket hesabı",
        companyName: "Şirket Adı *",
        companyNamePlaceholder: "Acme A.Ş.",
        domain: "Domain",
        domainPlaceholder: "acme.com",
        industry: "Sektör",
        companySize: "Şirket Büyüklüğü",
        selectPlaceholder: "Seçin...",
        create: "Oluştur",
        cancel: "İptal",
        searchPlaceholder: "Şirket adı veya domain ile ara...",
        noResults: "Arama sonucu bulunamadı.",
        noAccounts: "Henüz şirket hesabı yok.",
        colCompany: "Şirket",
        colIndustry: "Sektör",
        colSize: "Büyüklük",
        colContacts: "Kişiler",
        colDeals: "Fırsatlar",
        detail: "Detay",
        toastCreated: "Hesap oluşturuldu.",
        toastCreateFailed: "Oluşturulamadı.",
        toastDeleteFailed: "Silinemedi.",
        confirmDelete: "Bu hesabı ve bağlı tüm verileri silmek istediğinizden emin misiniz?",
      }
    : {
        pageTitle: "Company Accounts",
        pageSubtitle: "Corporate CRM — company and relationship management",
        newAccount: "New Account",
        newAccountForm: "New company account",
        companyName: "Company Name *",
        companyNamePlaceholder: "Acme Inc.",
        domain: "Domain",
        domainPlaceholder: "acme.com",
        industry: "Industry",
        companySize: "Company Size",
        selectPlaceholder: "Select...",
        create: "Create",
        cancel: "Cancel",
        searchPlaceholder: "Search by company name or domain...",
        noResults: "No search results found.",
        noAccounts: "No company accounts yet.",
        colCompany: "Company",
        colIndustry: "Industry",
        colSize: "Size",
        colContacts: "Contacts",
        colDeals: "Deals",
        detail: "Detail",
        toastCreated: "Account created.",
        toastCreateFailed: "Could not create.",
        toastDeleteFailed: "Could not delete.",
        confirmDelete: "Are you sure you want to delete this account and all associated data?",
      };

  const INDUSTRY_OPTIONS = lang === "tr" ? INDUSTRY_OPTIONS_TR : INDUSTRY_OPTIONS_EN;
  const SIZE_OPTIONS = lang === "tr" ? SIZE_OPTIONS_TR : SIZE_OPTIONS_EN;

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
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm rounded-xl px-4 py-2.5 shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{copy.pageTitle}</h1>
            <p className="text-sm text-gray-500">{copy.pageSubtitle}</p>
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
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 space-y-4">
          <p className="text-sm font-medium text-indigo-800">{copy.newAccountForm}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">{copy.companyName}</label>
              <input
                autoFocus
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={copy.companyNamePlaceholder}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{copy.domain}</label>
              <input
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={copy.domainPlaceholder}
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{copy.industry}</label>
              <select
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
              >
                <option value="">{copy.selectPlaceholder}</option>
                {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{copy.companySize}</label>
              <select
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500"
            >
              {copy.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={copy.searchPlaceholder}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{search ? copy.noResults : copy.noAccounts}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">{copy.colCompany}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{copy.colIndustry}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">{copy.colSize}</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">{copy.colContacts}</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">{copy.colDeals}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {accounts.map((acct) => (
                <tr key={acct.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0">
                        {acct.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          href={`/admin/crm/accounts/${acct.id}`}
                          className="font-medium text-gray-900 hover:text-indigo-600"
                        >
                          {acct.name}
                        </Link>
                        {acct.domain && (
                          <p className="text-xs text-gray-400">{acct.domain}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-500">{acct.industry || "—"}</td>
                  <td className="px-4 py-4 text-gray-500">{acct.size_bucket || "—"}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center gap-1 text-gray-500">
                      <Users className="h-3.5 w-3.5" /> {acct.contact_count}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center gap-1 text-gray-500">
                      <Briefcase className="h-3.5 w-3.5" /> {acct.deal_count}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/crm/accounts/${acct.id}`}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        {copy.detail} <ChevronRight className="h-3 w-3" />
                      </Link>
                      <button
                        onClick={() => handleDelete(acct.id)}
                        className="rounded-lg border border-gray-200 p-1.5 text-red-400 hover:bg-red-50"
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
