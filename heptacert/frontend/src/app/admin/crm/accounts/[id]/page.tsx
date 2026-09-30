"use client";

import { localeTag } from "@/lib/localeTag";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, Users, Briefcase, Save, Loader2,
  Plus, Trash2, CheckCircle2, AlertCircle, Phone, Mail,
  MessageSquare, Calendar, FileText, Star,
} from "lucide-react";
import {
  getCrmAccount, updateCrmAccount, listAccountContacts, removeAccountContact,
  addAccountContact, listCrmParticipants,
  listAccountDeals, createAccountDeal, updateDeal, deleteDeal,
  listDealActivities, addDealActivity, deleteDealActivity,
  type CrmAccountOut, type CrmAccountContactOut,
  type CrmDealOut, type CrmDealActivityOut, type CrmParticipantListItem,
} from "@/lib/api";
import { useI18n, translate } from "@/lib/i18n";

const DEAL_STAGES = [
  { value: "lead", label: "Lead", color: "bg-sunken text-content-secondary" },
  { value: "qualified", label: "Nitelikli", color: "bg-status-info-bg text-status-info-content" },
  { value: "proposal", label: "Teklif", color: "bg-status-warning-bg text-status-warning-content" },
  { value: "negotiation", label: "Müzakere", color: "bg-status-warning-bg text-status-warning-content" },
  { value: "won", label: "Kazanıldı", color: "bg-status-success-bg text-status-success-content" },
  { value: "lost", label: "Kaybedildi", color: "bg-status-danger-bg text-status-danger-content" },
];

const DEAL_STAGES_EN = [
  { value: "lead", label: "Lead", color: "bg-sunken text-content-secondary" },
  { value: "qualified", label: "Qualified", color: "bg-status-info-bg text-status-info-content" },
  { value: "proposal", label: "Proposal", color: "bg-status-warning-bg text-status-warning-content" },
  { value: "negotiation", label: "Negotiation", color: "bg-status-warning-bg text-status-warning-content" },
  { value: "won", label: "Won", color: "bg-status-success-bg text-status-success-content" },
  { value: "lost", label: "Lost", color: "bg-status-danger-bg text-status-danger-content" },
];

const ACTIVITY_TYPES = [
  { value: "note", label: "Not", icon: FileText },
  { value: "call", label: "Arama", icon: Phone },
  { value: "email", label: "E-posta", icon: Mail },
  { value: "meeting", label: "Toplantı", icon: Calendar },
  { value: "task", label: "Görev", icon: CheckCircle2 },
];

const ACTIVITY_TYPES_EN = [
  { value: "note", label: "Note", icon: FileText },
  { value: "call", label: "Call", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Meeting", icon: Calendar },
  { value: "task", label: "Task", icon: CheckCircle2 },
];

const INDUSTRY_OPTIONS_TR = [
 "Teknoloji", "Finans", "Sağlık", "Eğitim", "Üretim",
 "Perakende", "İnşaat", "Lojistik", "Danışmanlık", "Diğer",
];

const INDUSTRY_OPTIONS_EN = [
 "Technology", "Finance", "Healthcare", "Education", "Manufacturing",
 "Retail", "Construction", "Logistics", "Consulting", "Other",
];

const SIZE_OPTIONS = [
  { value: "1-10", labelKey: "admin_crm_size_1_10" },
  { value: "11-50", labelKey: "admin_crm_size_11_50" },
  { value: "51-200", labelKey: "admin_crm_size_51_200" },
  { value: "201-1000", labelKey: "admin_crm_size_201_1000" },
  { value: "1000+", labelKey: "admin_crm_size_1000_plus" },
] as const;

type Tab = "info" | "contacts" | "deals";

export default function CrmAccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = Number(params.id);
  const { lang } = useI18n();

  const copy = { active: translate(lang, "migrated_app_admin_crm_accounts_id_active_a7211af8"), inactive: translate(lang, "migrated_app_admin_crm_accounts_id_inactive_28c73985"), tabInfo: translate(lang, "migrated_app_admin_crm_accounts_id_details_a740043c"), tabContacts: translate(lang, "migrated_app_admin_crm_accounts_id_contacts_bd52c8ca"), tabDeals: translate(lang, "migrated_app_admin_crm_accounts_id_deals_e1452d85"), companyName: translate(lang, "migrated_app_admin_crm_accounts_id_company_name_efffb9f3"), domain: translate(lang, "migrated_app_admin_crm_accounts_id_domain_a4034bc4"), sector: translate(lang, "migrated_app_admin_crm_accounts_id_industry_977efa30"), size: translate(lang, "migrated_app_admin_crm_accounts_id_size_4cd1f547"), annualValue: translate(lang, "migrated_app_admin_crm_accounts_id_annual_value_1ffbffc2"), statusLabel: translate(lang, "migrated_app_admin_crm_accounts_id_status_c2e60cf8"), notes: translate(lang, "migrated_app_admin_crm_accounts_id_notes_b9cb44d2"), selectPlaceholder: translate(lang, "migrated_app_admin_crm_accounts_id_select_9a1be0dc"), save: translate(lang, "migrated_app_admin_crm_accounts_id_save_4838dfa5"), addContact: translate(lang, "migrated_app_admin_crm_accounts_id_add_contact_f0967341"), searchContactLabel: translate(lang, "migrated_app_admin_crm_accounts_id_search_registered_crm_contact_495f3756"), searchContactPlaceholder: translate(lang, "migrated_app_admin_crm_accounts_id_name_or_email_9b23fc6e"), noProfile: translate(lang, "migrated_app_admin_crm_accounts_id_no_profile_78ef4051"), alreadyAdded: translate(lang, "migrated_app_admin_crm_accounts_id_already_added_9fe6e86f"), noContactsSearchResult: translate(lang, "migrated_app_admin_crm_accounts_id_no_results_please_add_a_contact_to_crm_fir_816861b3"), noContacts: translate(lang, "migrated_app_admin_crm_accounts_id_no_contacts_linked_to_this_account_dc29a0eb"), noContactsHint: translate(lang, "migrated_app_admin_crm_accounts_id_search_and_add_a_crm_contact_using_the_but_f0bd9ca0"), colEmail: translate(lang, "migrated_app_admin_crm_accounts_id_email_0b2c608d"), colName: translate(lang, "migrated_app_admin_crm_accounts_id_name_6a9b7a9b"), colRole: translate(lang, "migrated_app_admin_crm_accounts_id_role_79579dcc"), colPrimary: translate(lang, "migrated_app_admin_crm_accounts_id_primary_0847380d"), newDeal: translate(lang, "migrated_app_admin_crm_accounts_id_new_deal_422f47c5"), dealNamePlaceholder: translate(lang, "migrated_app_admin_crm_accounts_id_deal_name_93f14db9"), amountPlaceholder: translate(lang, "migrated_app_admin_crm_accounts_id_amount_dc94fdb5"), add: translate(lang, "migrated_app_admin_crm_accounts_id_add_4aa8168e"), cancel: translate(lang, "migrated_app_admin_crm_accounts_id_cancel_68aa0a98"), noDeals: translate(lang, "migrated_app_admin_crm_accounts_id_no_deals_yet_45ffc01c"), activityCount: translate(lang, "migrated_app_admin_crm_accounts_id_activities_51cfcc51"), activityPlaceholder: translate(lang, "migrated_app_admin_crm_accounts_id_activity_note_31c82ee8"), noActivities: translate(lang, "migrated_app_admin_crm_accounts_id_no_activities_yet_931b7369"), toastSaved: translate(lang, "migrated_app_admin_crm_accounts_id_saved_96d3e008"), toastSaveFailed: translate(lang, "migrated_app_admin_crm_accounts_id_save_failed_7062c5a8"), toastContactAdded: translate(lang, "migrated_app_admin_crm_accounts_id_contact_added_58019623"), toastContactFailed: translate(lang, "migrated_app_admin_crm_accounts_id_failed_to_add_contact_e5da7b13"), toastContactRemoveFailed: translate(lang, "migrated_app_admin_crm_accounts_id_failed_to_remove_a18fec0c"), toastContactNoProfile: translate(lang, "migrated_app_admin_crm_accounts_id_this_person_does_not_have_a_crm_profile_ye_e93686c1"), toastDealCreated: translate(lang, "migrated_app_admin_crm_accounts_id_deal_created_514a98f7"), toastDealCreateFailed: translate(lang, "migrated_app_admin_crm_accounts_id_failed_to_create_100fd03e"), toastDealUpdateFailed: translate(lang, "migrated_app_admin_crm_accounts_id_failed_to_update_0433b5f9"), toastDealDeleteFailed: translate(lang, "migrated_app_admin_crm_accounts_id_failed_to_delete_8ff96a90"), toastActivityFailed: translate(lang, "migrated_app_admin_crm_accounts_id_failed_to_add_d9f6d38d"), toastActivityDeleteFailed: translate(lang, "migrated_app_admin_crm_accounts_id_failed_to_delete_1e8cd953"), confirmDeleteDeal: translate(lang, "migrated_app_admin_crm_accounts_id_are_you_sure_you_want_to_delete_this_deal_c4bdfca8"), statusActive: translate(lang, "migrated_app_admin_crm_accounts_id_active_a19cb337"), statusInactive: translate(lang, "migrated_app_admin_crm_accounts_id_inactive_9190056e"), statusChurned: translate(lang, "migrated_app_admin_crm_accounts_id_churned_5f091131") };

  const dealStages = [{ value: "lead", label: "Lead", color: "bg-sunken text-content-secondary" }, { value: "qualified", label: translate(lang, "migrated_app_admin_crm_accounts_id_qualified_b956c449"), color: "bg-status-info-bg text-status-info-content" }, { value: "proposal", label: translate(lang, "migrated_app_admin_crm_accounts_id_proposal_2c3d076f"), color: "bg-status-warning-bg text-status-warning-content" }, { value: "negotiation", label: translate(lang, "migrated_app_admin_crm_accounts_id_negotiation_79255c9d"), color: "bg-status-warning-bg text-status-warning-content" }, { value: "won", label: translate(lang, "migrated_app_admin_crm_accounts_id_won_2fb4ec87"), color: "bg-status-success-bg text-status-success-content" }, { value: "lost", label: translate(lang, "migrated_app_admin_crm_accounts_id_lost_d1a9bc93"), color: "bg-status-danger-bg text-status-danger-content" }];
  const activityTypes = [{ value: "note", label: translate(lang, "migrated_app_admin_crm_accounts_id_note_0e7d3bcd"), icon: FileText }, { value: "call", label: translate(lang, "migrated_app_admin_crm_accounts_id_call_347ede80"), icon: Phone }, { value: "email", label: translate(lang, "migrated_app_admin_crm_accounts_id_email_793e185f"), icon: Mail }, { value: "meeting", label: translate(lang, "migrated_app_admin_crm_accounts_id_meeting_7bc7e9ae"), icon: Calendar }, { value: "task", label: translate(lang, "migrated_app_admin_crm_accounts_id_task_40b676e2"), icon: CheckCircle2 }];
  const industryOptions = [translate(lang, "migrated_app_admin_crm_accounts_id_technology_c5745f4f"), translate(lang, "migrated_app_admin_crm_accounts_id_finance_95d29865"), translate(lang, "migrated_app_admin_crm_accounts_id_healthcare_bc1d626a"), translate(lang, "migrated_app_admin_crm_accounts_id_education_471cae36"), translate(lang, "migrated_app_admin_crm_accounts_id_manufacturing_242546ad"), translate(lang, "migrated_app_admin_crm_accounts_id_retail_8cbac2d3"), translate(lang, "migrated_app_admin_crm_accounts_id_construction_57ed906a"), translate(lang, "migrated_app_admin_crm_accounts_id_logistics_877a1f7e"), translate(lang, "migrated_app_admin_crm_accounts_id_consulting_2c5e0206"), translate(lang, "migrated_app_admin_crm_accounts_id_other_e7474836")];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("info");
  const [account, setAccount] = useState<CrmAccountOut | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Info form
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [notes, setNotes] = useState("");
  const [annualValue, setAnnualValue] = useState("");
  const [status, setStatus] = useState("active");

  // Contacts
  const [contacts, setContacts] = useState<CrmAccountContactOut[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState<CrmParticipantListItem[]>([]);
  const [addingContact, setAddingContact] = useState(false);
  const [showContactSearch, setShowContactSearch] = useState(false);

  // Deals
  const [deals, setDeals] = useState<CrmDealOut[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<CrmDealOut | null>(null);
  const [activities, setActivities] = useState<CrmDealActivityOut[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // New deal form
  const [showDealForm, setShowDealForm] = useState(false);
  const [newDealName, setNewDealName] = useState("");
  const [newDealStage, setNewDealStage] = useState("lead");
  const [newDealAmount, setNewDealAmount] = useState("");
  const [creatingDeal, setCreatingDeal] = useState(false);

  // New activity form
  const [activityType, setActivityType] = useState("note");
  const [activityContent, setActivityContent] = useState("");
  const [addingActivity, setAddingActivity] = useState(false);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    getCrmAccount(accountId)
      .then((a) => {
        setAccount(a);
        setName(a.name); setDomain(a.domain ?? ""); setIndustry(a.industry ?? "");
        setSize(a.size_bucket ?? ""); setNotes(a.notes ?? "");
        setAnnualValue(a.annual_value != null ? String(a.annual_value) : "");
        setStatus(a.status);
      })
      .catch(() => router.push("/admin/crm/accounts"))
      .finally(() => setLoading(false));
  }, [accountId]);

  useEffect(() => {
    if (tab === "contacts") {
      setContactsLoading(true);
      listAccountContacts(accountId)
        .then(setContacts)
        .catch(() => {})
        .finally(() => setContactsLoading(false));
    }
    if (tab === "deals") {
      setDealsLoading(true);
      listAccountDeals(accountId)
        .then(setDeals)
        .catch(() => {})
        .finally(() => setDealsLoading(false));
    }
  }, [tab, accountId]);

  async function loadActivities(deal: CrmDealOut) {
    setSelectedDeal(deal);
    setActivitiesLoading(true);
    try {
      const acts = await listDealActivities(deal.id);
      setActivities(acts);
    } catch {
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }

  async function handleSaveInfo() {
    setSaving(true);
    try {
      const updated = await updateCrmAccount(accountId, {
        name: name.trim(),
        domain: domain.trim() || null,
        industry: industry || null,
        size_bucket: size || null,
        notes,
        annual_value: annualValue ? Number(annualValue) : null,
        status,
        tags: account?.tags || [],
      } as any);
      setAccount(updated);
      showToast("success", copy.toastSaved);
    } catch {
      showToast("error", copy.toastSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!contactSearch.trim()) { setContactResults([]); return; }
    const t = setTimeout(() => {
      listCrmParticipants({ query: contactSearch, limit: 8 })
        .then(setContactResults)
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [contactSearch]);

  async function handleAddContact(profile: CrmParticipantListItem) {
    if (!profile.id) { showToast("error", copy.toastContactNoProfile); return; }
    setAddingContact(true);
    try {
      const newContact = await addAccountContact(accountId, { participant_crm_profile_id: profile.id });
      setContacts((prev) => [...prev, newContact]);
      setContactSearch("");
      setContactResults([]);
      setShowContactSearch(false);
      showToast("success", copy.toastContactAdded);
    } catch {
      showToast("error", copy.toastContactFailed);
    } finally {
      setAddingContact(false);
    }
  }

  async function handleRemoveContact(contactId: number) {
    try {
      await removeAccountContact(accountId, contactId);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch {
      showToast("error", copy.toastContactRemoveFailed);
    }
  }

  async function handleCreateDeal() {
    if (!newDealName.trim()) return;
    setCreatingDeal(true);
    try {
      const deal = await createAccountDeal(accountId, {
        name: newDealName.trim(),
        stage: newDealStage,
        amount: newDealAmount ? Number(newDealAmount) : null,
      });
      setDeals((prev) => [deal, ...prev]);
      setNewDealName(""); setNewDealStage("lead"); setNewDealAmount("");
      setShowDealForm(false);
      showToast("success", copy.toastDealCreated);
    } catch {
      showToast("error", copy.toastDealCreateFailed);
    } finally {
      setCreatingDeal(false);
    }
  }

  async function handleMoveDeal(deal: CrmDealOut, stage: string) {
    try {
      const updated = await updateDeal(deal.id, { name: deal.name, stage, amount: deal.amount });
      setDeals((prev) => prev.map((d) => (d.id === deal.id ? updated : d)));
      if (selectedDeal?.id === deal.id) setSelectedDeal(updated);
    } catch {
      showToast("error", copy.toastDealUpdateFailed);
    }
  }

  async function handleDeleteDeal(id: number) {
    if (!confirm(copy.confirmDeleteDeal)) return;
    try {
      await deleteDeal(id);
      setDeals((prev) => prev.filter((d) => d.id !== id));
      if (selectedDeal?.id === id) setSelectedDeal(null);
    } catch {
      showToast("error", copy.toastDealDeleteFailed);
    }
  }

  async function handleAddActivity() {
    if (!activityContent.trim() || !selectedDeal) return;
    setAddingActivity(true);
    try {
      const act = await addDealActivity(selectedDeal.id, { activity_type: activityType, content: activityContent.trim() });
      setActivities((prev) => [act, ...prev]);
      setActivityContent("");
    } catch {
      showToast("error", copy.toastActivityFailed);
    } finally {
      setAddingActivity(false);
    }
  }

  async function handleDeleteActivity(actId: number) {
    if (!selectedDeal) return;
    try {
      await deleteDealActivity(selectedDeal.id, actId);
      setActivities((prev) => prev.filter((a) => a.id !== actId));
    } catch {
      showToast("error", copy.toastActivityDeleteFailed);
    }
  }

  const stageInfo = (stage: string) => dealStages.find((s) => s.value === stage) ?? dealStages[0];
  const actTypeInfo = (type: string) => activityTypes.find((a) => a.value === type) ?? activityTypes[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg text-white ${
          toast.type === "success" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/crm/accounts" className="text-content-muted hover:text-content-secondary">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-status-info-bg flex items-center justify-center text-sm font-bold text-status-info-content">
          {account?.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-content-primary truncate">{account?.name}</h1>
          {account?.domain && <p className="text-xs text-content-muted">{account.domain}</p>}
        </div>
        <span className={`text-xs rounded-full px-2.5 py-1 font-medium ${
          status === "active" ? "bg-status-success-bg text-status-success-content" : "bg-sunken text-content-muted"
        }`}>
          {status === "active" ? copy.active : copy.inactive}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-sunken p-1 w-fit">
        {(["info", "contacts", "deals"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t ? "bg-raised shadow text-content-primary" : "text-content-muted hover:text-content-secondary"
            }`}
          >
            {t === "info" && <Building2 className="h-4 w-4" />}
            {t === "contacts" && <Users className="h-4 w-4" />}
            {t === "deals" && <Briefcase className="h-4 w-4" />}
            {t === "info" ? copy.tabInfo : t === "contacts" ? copy.tabContacts : copy.tabDeals}
          </button>
        ))}
      </div>

      {/* ── Info Tab ── */}
      {tab === "info" && (
        <div className="rounded-2xl border border-outline-subtle bg-raised p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-content-muted mb-1">{copy.companyName}</label>
              <input
                className="w-full rounded-xl border border-outline-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">{copy.domain}</label>
              <input
                className="w-full rounded-xl border border-outline-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                placeholder="acme.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">{copy.sector}</label>
              <select
                className="w-full rounded-xl border border-outline-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                <option value="">{copy.selectPlaceholder}</option>
                {industryOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">{copy.size}</label>
              <select
                className="w-full rounded-xl border border-outline-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              >
                <option value="">{copy.selectPlaceholder}</option>
                {SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{translate(lang, o.labelKey)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">{copy.annualValue}</label>
              <input
                type="number"
                className="w-full rounded-xl border border-outline-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                placeholder="0"
                value={annualValue}
                onChange={(e) => setAnnualValue(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-muted mb-1">{copy.statusLabel}</label>
              <select
                className="w-full rounded-xl border border-outline-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">{copy.statusActive}</option>
                <option value="inactive">{copy.statusInactive}</option>
                <option value="churned">{copy.statusChurned}</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-content-muted mb-1">{copy.notes}</label>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-outline-subtle px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveInfo}
              disabled={saving || !name.trim()}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {copy.save}
            </button>
          </div>
        </div>
      )}

      {/* ── Contacts Tab ── */}
      {tab === "contacts" && (
        <div className="space-y-4">
          {/* Add contact */}
          <div className="flex justify-end">
            <button
              onClick={() => { setShowContactSearch(!showContactSearch); setContactSearch(""); setContactResults([]); }}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" /> {copy.addContact}
            </button>
          </div>

          {showContactSearch && (
            <div className="rounded-2xl border border-status-info-border bg-status-info-bg p-4 space-y-2">
              <p className="text-xs font-medium text-status-info-content">{copy.searchContactLabel}</p>
              <div className="relative">
                <input
                  autoFocus
                  className="w-full rounded-xl border border-outline-subtle bg-raised px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                  placeholder={copy.searchContactPlaceholder}
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                />
                {contactResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-outline-subtle bg-raised shadow-lg overflow-hidden">
                    {contactResults.map((p) => (
                      <button
                        key={p.id ?? p.email}
                        onClick={() => handleAddContact(p)}
                        disabled={addingContact || !p.id || contacts.some((c) => c.participant_crm_profile_id === p.id)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-status-info-bg flex items-center justify-between gap-2 disabled:opacity-40"
                      >
                        <span>
                          <span className="font-medium text-content-primary">{p.name || p.email}</span>
                          {p.name && <span className="ml-2 text-xs text-content-muted">{p.email}</span>}
                        </span>
                        {!p.id && <span className="text-xs text-content-muted">{copy.noProfile}</span>}
                        {p.id && contacts.some((c) => c.participant_crm_profile_id === p.id) && (
                          <span className="text-xs text-content-muted">{copy.alreadyAdded}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {contactSearch.trim() && contactResults.length === 0 && (
                  <p className="mt-1 text-xs text-content-muted">{copy.noContactsSearchResult}</p>
                )}
              </div>
            </div>
          )}

          {contactsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-14 text-content-muted">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{copy.noContacts}</p>
              <p className="text-xs mt-1">{copy.noContactsHint}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-outline-subtle bg-raised shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-canvas border-b border-outline-subtle">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-content-muted">{copy.colEmail}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-content-muted">{copy.colName}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-content-muted">{copy.colRole}</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-content-muted">{copy.colPrimary}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-subtle">
                  {contacts.map((c) => (
                    <tr key={c.id} className="hover:bg-canvas">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2 text-content-primary font-medium">
                          <Mail className="h-3.5 w-3.5 text-content-muted" /> {c.email}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-content-secondary">{c.name || "—"}</td>
                      <td className="px-4 py-3 text-content-muted">{c.role || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {c.is_primary && <Star className="h-4 w-4 text-status-warning-content mx-auto" />}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemoveContact(c.id)}
                          className="rounded-lg border border-outline-subtle p-1.5 text-status-danger-content hover:bg-status-danger-bg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Deals Tab ── */}
      {tab === "deals" && (
        <div className="space-y-4">
          {/* New deal button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowDealForm((v) => !v)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> {copy.newDeal}
            </button>
          </div>

          {showDealForm && (
            <div className="rounded-2xl border border-status-info-border bg-status-info-bg p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <input
                  autoFocus
                  className="col-span-3 rounded-xl border border-outline-subtle bg-raised px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                  placeholder={copy.dealNamePlaceholder}
                  value={newDealName}
                  onChange={(e) => setNewDealName(e.target.value)}
                />
                <select
                  className="rounded-xl border border-outline-subtle bg-raised px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                  value={newDealStage}
                  onChange={(e) => setNewDealStage(e.target.value)}
                >
                  {dealStages.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <input
                  type="number"
                  className="rounded-xl border border-outline-subtle bg-raised px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-info-border"
                  placeholder={copy.amountPlaceholder}
                  value={newDealAmount}
                  onChange={(e) => setNewDealAmount(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    disabled={creatingDeal || !newDealName.trim()}
                    onClick={handleCreateDeal}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-indigo-700"
                  >
                    {creatingDeal ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.add}
                  </button>
                  <button onClick={() => setShowDealForm(false)} className="rounded-xl border border-outline-subtle bg-raised px-3 py-2 text-sm text-content-muted">
                    {copy.cancel}
                  </button>
                </div>
              </div>
            </div>
          )}

          {dealsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-content-muted" /></div>
          ) : (
            <div className="space-y-3">
              {deals.length === 0 && !showDealForm && (
                <div className="text-center py-12 text-content-muted text-sm">
                  <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-40" /> {copy.noDeals}
                </div>
              )}
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className={`rounded-2xl border p-4 cursor-pointer transition ${
                    selectedDeal?.id === deal.id
                      ? "border-status-info-border bg-status-info-bg"
                      : "border-outline-subtle bg-raised hover:border-outline-subtle"
                  }`}
                  onClick={() => selectedDeal?.id === deal.id ? setSelectedDeal(null) : loadActivities(deal)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-content-primary truncate">{deal.name}</span>
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${stageInfo(deal.stage).color}`}>
                          {stageInfo(deal.stage).label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-content-muted">
                        {deal.amount != null && (
                          <span>₺{deal.amount.toLocaleString(localeTag(lang))}</span>
                        )}
                        <span>{deal.activity_count} {copy.activityCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={deal.stage}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleMoveDeal(deal, e.target.value)}
                        className="rounded-lg border border-outline-subtle bg-raised px-2 py-1 text-xs focus:outline-none"
                      >
                        {dealStages.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteDeal(deal.id); }}
                        className="p-1.5 rounded-lg border border-outline-subtle text-status-danger-content hover:bg-status-danger-bg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Activities panel */}
                  {selectedDeal?.id === deal.id && (
                    <div className="mt-4 pt-4 border-t border-status-info-border space-y-3" onClick={(e) => e.stopPropagation()}>
                      {/* Add activity */}
                      <div className="flex gap-2">
                        <select
                          value={activityType}
                          onChange={(e) => setActivityType(e.target.value)}
                          className="rounded-lg border border-outline-subtle bg-raised px-2 py-1.5 text-xs focus:outline-none"
                        >
                          {activityTypes.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                        <input
                          className="flex-1 rounded-lg border border-outline-subtle bg-raised px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-status-info-border"
                          placeholder={copy.activityPlaceholder}
                          value={activityContent}
                          onChange={(e) => setActivityContent(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddActivity()}
                        />
                        <button
                          onClick={handleAddActivity}
                          disabled={addingActivity || !activityContent.trim()}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 hover:bg-indigo-700"
                        >
                          {addingActivity ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        </button>
                      </div>

                      {/* Activity list */}
                      {activitiesLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-content-muted" /></div>
                      ) : activities.length === 0 ? (
                        <p className="text-xs text-content-muted text-center py-3">{copy.noActivities}</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {activities.map((act) => {
                            const TypeIcon = actTypeInfo(act.activity_type).icon;
                            return (
                              <div key={act.id} className="flex items-start gap-2.5 rounded-lg bg-raised px-3 py-2.5 border border-outline-subtle">
                                <TypeIcon className="h-3.5 w-3.5 text-content-muted mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-content-primary">{act.content}</p>
                                  <p className="text-xs text-content-muted mt-0.5">
                                    {new Date(act.activity_at).toLocaleString(localeTag(lang), { dateStyle: "short", timeStyle: "short" })}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleDeleteActivity(act.id)}
                                  className="p-1 text-content-muted hover:text-status-danger-content flex-shrink-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
