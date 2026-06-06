"use client";

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

const DEAL_STAGES = [
  { value: "lead", label: "Lead", color: "bg-gray-100 text-gray-700" },
  { value: "qualified", label: "Nitelikli", color: "bg-blue-100 text-blue-700" },
  { value: "proposal", label: "Teklif", color: "bg-amber-100 text-amber-700" },
  { value: "negotiation", label: "Müzakere", color: "bg-orange-100 text-orange-700" },
  { value: "won", label: "Kazanıldı", color: "bg-green-100 text-green-700" },
  { value: "lost", label: "Kaybedildi", color: "bg-red-100 text-red-700" },
];

const ACTIVITY_TYPES = [
  { value: "note", label: "Not", icon: FileText },
  { value: "call", label: "Arama", icon: Phone },
  { value: "email", label: "E-posta", icon: Mail },
  { value: "meeting", label: "Toplantı", icon: Calendar },
  { value: "task", label: "Görev", icon: CheckCircle2 },
];

const INDUSTRY_OPTIONS = [
  "Teknoloji", "Finans", "Sağlık", "Eğitim", "Üretim",
  "Perakende", "İnşaat", "Lojistik", "Danışmanlık", "Diğer",
];

const SIZE_OPTIONS = [
  { value: "1-10", label: "1–10 kişi" },
  { value: "11-50", label: "11–50 kişi" },
  { value: "51-200", label: "51–200 kişi" },
  { value: "201-1000", label: "201–1000 kişi" },
  { value: "1000+", label: "1000+ kişi" },
];

type Tab = "info" | "contacts" | "deals";

export default function CrmAccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = Number(params.id);

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
      showToast("success", "Kaydedildi.");
    } catch {
      showToast("error", "Kayıt başarısız.");
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
    if (!profile.id) { showToast("error", "Bu kişinin CRM profili henüz oluşturulmamış."); return; }
    setAddingContact(true);
    try {
      const newContact = await addAccountContact(accountId, { participant_crm_profile_id: profile.id });
      setContacts((prev) => [...prev, newContact]);
      setContactSearch("");
      setContactResults([]);
      setShowContactSearch(false);
      showToast("success", "Kişi eklendi.");
    } catch {
      showToast("error", "Kişi eklenemedi.");
    } finally {
      setAddingContact(false);
    }
  }

  async function handleRemoveContact(contactId: number) {
    try {
      await removeAccountContact(accountId, contactId);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch {
      showToast("error", "Kaldırılamadı.");
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
      showToast("success", "Fırsat oluşturuldu.");
    } catch {
      showToast("error", "Oluşturulamadı.");
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
      showToast("error", "Güncellenemedi.");
    }
  }

  async function handleDeleteDeal(id: number) {
    if (!confirm("Bu fırsatı silmek istediğinizden emin misiniz?")) return;
    try {
      await deleteDeal(id);
      setDeals((prev) => prev.filter((d) => d.id !== id));
      if (selectedDeal?.id === id) setSelectedDeal(null);
    } catch {
      showToast("error", "Silinemedi.");
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
      showToast("error", "Eklenemedi.");
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
      showToast("error", "Silinemedi.");
    }
  }

  const stageInfo = (stage: string) => DEAL_STAGES.find((s) => s.value === stage) ?? DEAL_STAGES[0];
  const actTypeInfo = (type: string) => ACTIVITY_TYPES.find((a) => a.value === type) ?? ACTIVITY_TYPES[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
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
        <Link href="/admin/crm/accounts" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700">
          {account?.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 truncate">{account?.name}</h1>
          {account?.domain && <p className="text-xs text-gray-400">{account.domain}</p>}
        </div>
        <span className={`text-xs rounded-full px-2.5 py-1 font-medium ${
          status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        }`}>
          {status === "active" ? "Aktif" : "Pasif"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(["info", "contacts", "deals"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "info" && <Building2 className="h-4 w-4" />}
            {t === "contacts" && <Users className="h-4 w-4" />}
            {t === "deals" && <Briefcase className="h-4 w-4" />}
            {t === "info" ? "Bilgiler" : t === "contacts" ? "Kişiler" : "Fırsatlar"}
          </button>
        ))}
      </div>

      {/* ── Info Tab ── */}
      {tab === "info" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Şirket Adı *</label>
              <input
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Domain</label>
              <input
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="acme.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sektör</label>
              <select
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                <option value="">Seçin...</option>
                {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Büyüklük</label>
              <select
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              >
                <option value="">Seçin...</option>
                {SIZE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Yıllık Değer (₺)</label>
              <input
                type="number"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
                value={annualValue}
                onChange={(e) => setAnnualValue(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Durum</label>
              <select
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
                <option value="churned">Kaybedildi</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Notlar</label>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              Kaydet
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
              <Plus className="h-3.5 w-3.5" /> Kişi Ekle
            </button>
          </div>

          {showContactSearch && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 space-y-2">
              <p className="text-xs font-medium text-indigo-800">CRM'de kayıtlı kişiyi ara</p>
              <div className="relative">
                <input
                  autoFocus
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="İsim veya e-posta..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                />
                {contactResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden">
                    {contactResults.map((p) => (
                      <button
                        key={p.id ?? p.email}
                        onClick={() => handleAddContact(p)}
                        disabled={addingContact || !p.id || contacts.some((c) => c.participant_crm_profile_id === p.id)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 flex items-center justify-between gap-2 disabled:opacity-40"
                      >
                        <span>
                          <span className="font-medium text-gray-800">{p.name || p.email}</span>
                          {p.name && <span className="ml-2 text-xs text-gray-400">{p.email}</span>}
                        </span>
                        {!p.id && <span className="text-xs text-gray-400">Profil yok</span>}
                        {p.id && contacts.some((c) => c.participant_crm_profile_id === p.id) && (
                          <span className="text-xs text-gray-400">Zaten ekli</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {contactSearch.trim() && contactResults.length === 0 && (
                  <p className="mt-1 text-xs text-gray-400">Sonuç bulunamadı. Önce CRM'e kişi ekleyin.</p>
                )}
              </div>
            </div>
          )}

          {contactsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Bu hesaba bağlı kişi yok.</p>
              <p className="text-xs mt-1">Yukarıdan CRM'deki kişiyi arayıp ekleyebilirsiniz.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">E-posta</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">İsim</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Rol</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Birincil</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {contacts.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2 text-gray-800 font-medium">
                          <Mail className="h-3.5 w-3.5 text-gray-400" /> {c.email}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{c.role || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {c.is_primary && <Star className="h-4 w-4 text-amber-400 mx-auto" />}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemoveContact(c.id)}
                          className="rounded-lg border border-gray-200 p-1.5 text-red-400 hover:bg-red-50"
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
              <Plus className="h-4 w-4" /> Yeni Fırsat
            </button>
          </div>

          {showDealForm && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <input
                  autoFocus
                  className="col-span-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Fırsat adı *"
                  value={newDealName}
                  onChange={(e) => setNewDealName(e.target.value)}
                />
                <select
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newDealStage}
                  onChange={(e) => setNewDealStage(e.target.value)}
                >
                  {DEAL_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <input
                  type="number"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Tutar (₺)"
                  value={newDealAmount}
                  onChange={(e) => setNewDealAmount(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    disabled={creatingDeal || !newDealName.trim()}
                    onClick={handleCreateDeal}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-indigo-700"
                  >
                    {creatingDeal ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ekle"}
                  </button>
                  <button onClick={() => setShowDealForm(false)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
                    İptal
                  </button>
                </div>
              </div>
            </div>
          )}

          {dealsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : (
            <div className="space-y-3">
              {deals.length === 0 && !showDealForm && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-40" /> Henüz fırsat yok.
                </div>
              )}
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className={`rounded-2xl border p-4 cursor-pointer transition ${
                    selectedDeal?.id === deal.id
                      ? "border-indigo-200 bg-indigo-50"
                      : "border-gray-100 bg-white hover:border-gray-200"
                  }`}
                  onClick={() => selectedDeal?.id === deal.id ? setSelectedDeal(null) : loadActivities(deal)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">{deal.name}</span>
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${stageInfo(deal.stage).color}`}>
                          {stageInfo(deal.stage).label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        {deal.amount != null && (
                          <span>₺{deal.amount.toLocaleString("tr-TR")}</span>
                        )}
                        <span>{deal.activity_count} aktivite</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={deal.stage}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleMoveDeal(deal, e.target.value)}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none"
                      >
                        {DEAL_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteDeal(deal.id); }}
                        className="p-1.5 rounded-lg border border-gray-200 text-red-400 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Activities panel */}
                  {selectedDeal?.id === deal.id && (
                    <div className="mt-4 pt-4 border-t border-indigo-100 space-y-3" onClick={(e) => e.stopPropagation()}>
                      {/* Add activity */}
                      <div className="flex gap-2">
                        <select
                          value={activityType}
                          onChange={(e) => setActivityType(e.target.value)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs focus:outline-none"
                        >
                          {ACTIVITY_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                        <input
                          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          placeholder="Aktivite notu..."
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
                        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-gray-400" /></div>
                      ) : activities.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-3">Henüz aktivite yok.</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {activities.map((act) => {
                            const TypeIcon = actTypeInfo(act.activity_type).icon;
                            return (
                              <div key={act.id} className="flex items-start gap-2.5 rounded-lg bg-white px-3 py-2.5 border border-gray-100">
                                <TypeIcon className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-800">{act.content}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {new Date(act.activity_at).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleDeleteActivity(act.id)}
                                  className="p-1 text-gray-300 hover:text-red-400 flex-shrink-0"
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
