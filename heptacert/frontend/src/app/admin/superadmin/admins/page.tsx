"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Search,
  Shield,
  Coins,
} from "lucide-react";
import {
  listSuperAdmins,
  createSuperAdmin,
  deleteSuperAdmin,
  updateSuperAdminRole,
  creditSuperAdminCoins,
  AdminOut,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import PageHeader from "@/components/Admin/PageHeader";
import ConfirmModal from "@/components/Admin/ConfirmModal";
import { useToast } from "@/hooks/useToast";

export default function SuperAdminAdminsPage() {
  const toast = useToast();
  const { lang } = useI18n();
  const copy = useMemo(
    () =>
      lang === "tr"
        ? {
            loadFailed: "Yöneticiler yüklenemedi",
            emailRequired: "Email gerekli",
            createFailed: "Yönetici oluşturulamadı",
            roleFailed: "Rol güncellenemedi",
            deleteFailed: "Yönetici silinemedi",
            chooseAdmin: "HeptaCoin yüklenecek yönetici seçin",
            validAmount: "Geçerli bir HeptaCoin miktarı girin",
            creditSuccess: "hesabına {amount} HC tanımlandı.",
            creditFailed: "HeptaCoin yüklenemedi",
            title: "Yönetici Yönetimi",
            subtitle: "Sistem yöneticilerini yönetin, rolleri ayarlayın ve bakiye tanımlayın",
            addAdmin: "Yönetici Ekle",
            coinTitle: "HeptaCoin Tanımla",
            coinSubtitle: "Admin hesaplarına bakiye yükleyin ve anında kullanıma açın.",
            selectAdmin: "Yönetici seçin",
            amount: "Miktar",
            loadBalance: "Bakiye Yükle",
            searchEmail: "Email ile ara...",
            noAdmin: "Yönetici bulunamadı",
            email: "Email",
            role: "Rol",
            balance: "Bakiye",
            createdAt: "Oluşturma",
            actions: "İşlemler",
            admin: "Yönetici",
            superadmin: "Süper Yönetici",
            saving: "Kaydediyor...",
            save: "Kaydet",
            cancel: "İptal",
            newAdmin: "Yeni Yönetici Ekle",
            emailAddress: "Email Adresi",
            add: "Ekle",
            adding: "Ekleniyor...",
            deleteTitle: "Yöneticiyi sil",
            deleteDesc: "Bu işlem geri alınamaz. Yöneticiyi silmek istediğinizden emin misiniz?",
          }
        : {
            loadFailed: "Failed to load admins",
            emailRequired: "Email is required",
            createFailed: "Failed to create admin",
            roleFailed: "Failed to update role",
            deleteFailed: "Failed to delete admin",
            chooseAdmin: "Select an admin account to credit",
            validAmount: "Enter a valid HeptaCoin amount",
            creditSuccess: "account was credited with {amount} HC.",
            creditFailed: "Failed to credit HeptaCoin",
            title: "Admin Management",
            subtitle: "Manage platform admins, update their roles, and assign balances",
            addAdmin: "Add Admin",
            coinTitle: "Assign HeptaCoin",
            coinSubtitle: "Credit admin accounts and make the balance available immediately.",
            selectAdmin: "Select admin",
            amount: "Amount",
            loadBalance: "Load Balance",
            searchEmail: "Search by email...",
            noAdmin: "No admin found",
            email: "Email",
            role: "Role",
            balance: "Balance",
            createdAt: "Created",
            actions: "Actions",
            admin: "Admin",
            superadmin: "Super Admin",
            saving: "Saving...",
            save: "Save",
            cancel: "Cancel",
            newAdmin: "Add New Admin",
            emailAddress: "Email Address",
            add: "Add",
            adding: "Adding...",
            deleteTitle: "Delete admin",
            deleteDesc: "This action cannot be undone. Are you sure you want to delete this admin?",
          },
    [lang]
  );

  const [admins, setAdmins] = useState<AdminOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<"superadmin" | "admin">("admin");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingRole, setEditingRole] = useState<"superadmin" | "admin" | null>(null);
  const [updating, setUpdating] = useState(false);
  const [creditAdminId, setCreditAdminId] = useState<number | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(100);
  const [crediting, setCrediting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setError(null);
      const data = await listSuperAdmins();
      setAdmins(data);
    } catch (e: any) {
      console.error("Failed to load admins:", e);
      setError(e?.message || copy.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newAdminEmail.trim()) {
      setError(copy.emailRequired);
      return;
    }

    try {
      setCreating(true);
      setError(null);
      await createSuperAdmin({ email: newAdminEmail, role: newAdminRole });
      await fetchAdmins();
      setShowCreateModal(false);
      setNewAdminEmail("");
      setNewAdminRole("admin");
    } catch (e: any) {
      console.error("Failed to create admin:", e);
      setError(e?.message || copy.createFailed);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRole = async (adminId: number) => {
    if (!editingRole) return;

    try {
      setUpdating(true);
      setError(null);
      await updateSuperAdminRole(adminId, editingRole);
      await fetchAdmins();
      setEditingId(null);
      setEditingRole(null);
    } catch (e: any) {
      console.error("Failed to update admin role:", e);
      setError(e?.message || copy.roleFailed);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (adminId: number) => {
    try {
      setDeleting(true);
      setError(null);
      await deleteSuperAdmin(adminId);
      await fetchAdmins();
      setDeletingId(null);
    } catch (e: any) {
      console.error("Failed to delete admin:", e);
      setError(e?.message || copy.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  const handleCredit = async () => {
    if (!creditAdminId) {
      setError(copy.chooseAdmin);
      return;
    }
    if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
      setError(copy.validAmount);
      return;
    }

    try {
      setCrediting(true);
      setError(null);
      const creditedAdmin = admins.find((admin) => admin.id === creditAdminId);
      await creditSuperAdminCoins({ admin_user_id: creditAdminId, amount: creditAmount });
      await fetchAdmins();
      toast.success(`${creditedAdmin?.email ?? copy.admin} ${copy.creditSuccess.replace("{amount}", String(creditAmount))}`);
      setCreditAmount(100);
    } catch (e: any) {
      console.error("Failed to credit coins:", e);
      setError(e?.message || copy.creditFailed);
    } finally {
      setCrediting(false);
    }
  };

  const filteredAdmins = admins.filter((admin) => admin.email.toLowerCase().includes(searchTerm.toLowerCase()));
  const adminRecipients = admins;

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
        icon={<Shield className="h-5 w-5" />}
        actions={
          <button onClick={() => setShowCreateModal(true)} className="btn-primary gap-2 text-xs">
            <Plus className="h-4 w-4" /> {copy.addAdmin}
          </button>
        }
      />

      {error && (
        <div className="error-banner flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-surface-900">{copy.coinTitle}</h2>
            <p className="text-sm text-surface-500">{copy.coinSubtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
          <select value={creditAdminId ?? ""} onChange={(e) => setCreditAdminId(e.target.value ? Number(e.target.value) : null)} className="input-field">
            <option value="">{copy.selectAdmin}</option>
            {adminRecipients.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.email} ({admin.heptacoin_balance} HC)
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={1000000}
            value={creditAmount}
            onChange={(e) => setCreditAmount(Number(e.target.value))}
            className="input-field"
            placeholder={copy.amount}
          />
          <button onClick={handleCredit} disabled={crediting || !creditAdminId || adminRecipients.length === 0} className="btn-primary gap-2 whitespace-nowrap">
            {crediting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
            {copy.loadBalance}
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
        <input type="text" placeholder={copy.searchEmail} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field pl-10" />
      </div>

      <div className="card overflow-hidden">
        {filteredAdmins.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="mx-auto mb-3 h-10 w-10 text-surface-200" />
            <p className="text-sm font-medium text-surface-400">{copy.noAdmin}</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-surface-100 md:hidden">
              {filteredAdmins.map((admin) => (
                <div key={admin.id} className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-surface-900">{admin.email}</p>
                      <p className="mt-1 text-xs text-surface-500">
                        {copy.createdAt}: {admin.created_at ? new Date(admin.created_at).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US") : "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">{copy.balance}</p>
                      <p className="text-sm font-bold text-amber-600">{admin.heptacoin_balance} HC</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {editingId === admin.id ? (
                      <select value={editingRole || admin.role} onChange={(e) => setEditingRole(e.target.value as "superadmin" | "admin")} className="input-field py-2 text-xs">
                        <option value="admin">{copy.admin}</option>
                        <option value="superadmin">{copy.superadmin}</option>
                      </select>
                    ) : (
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${admin.role === "superadmin" ? "bg-violet-100 text-violet-800" : "bg-blue-100 text-blue-800"}`}>
                        {admin.role === "superadmin" ? copy.superadmin : copy.admin}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {editingId === admin.id ? (
                      <>
                        <button onClick={() => handleUpdateRole(admin.id)} disabled={updating} className="btn-primary flex-1 text-xs">
                          {updating ? copy.saving : copy.save}
                        </button>
                        <button onClick={() => { setEditingId(null); setEditingRole(null); }} className="btn-secondary flex-1 text-xs">
                          {copy.cancel}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingId(admin.id); setEditingRole(admin.role as "admin" | "superadmin"); }} className="btn-secondary flex-1 text-xs">
                          <Edit2 className="h-4 w-4" />
                          {copy.role}
                        </button>
                        <button onClick={() => setDeletingId(admin.id)} className="btn-danger flex-1 text-xs">
                          <Trash2 className="h-4 w-4" />
                          {copy.deleteTitle}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead className="border-b border-surface-200 bg-surface-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">{copy.email}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">{copy.role}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">{copy.balance}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">{copy.createdAt}</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-500">{copy.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="transition-colors hover:bg-surface-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-surface-800">{admin.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        {editingId === admin.id ? (
                          <select value={editingRole || admin.role} onChange={(e) => setEditingRole(e.target.value as "superadmin" | "admin")} className="input-field py-1.5 text-xs">
                            <option value="admin">{copy.admin}</option>
                            <option value="superadmin">{copy.superadmin}</option>
                          </select>
                        ) : (
                          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${admin.role === "superadmin" ? "bg-violet-100 text-violet-800" : "bg-blue-100 text-blue-800"}`}>
                            {admin.role === "superadmin" ? copy.superadmin : copy.admin}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-amber-600">{admin.heptacoin_balance} HC</td>
                      <td className="px-6 py-4 text-sm text-surface-500">{admin.created_at ? new Date(admin.created_at).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US") : "-"}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingId === admin.id ? (
                            <>
                              <button onClick={() => handleUpdateRole(admin.id)} disabled={updating} className="btn-primary px-3 py-1.5 text-xs">
                                {updating ? copy.saving : copy.save}
                              </button>
                              <button onClick={() => { setEditingId(null); setEditingRole(null); }} className="btn-secondary px-3 py-1.5 text-xs">
                                {copy.cancel}
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setEditingId(admin.id); setEditingRole(admin.role as "admin" | "superadmin"); }} className="rounded-lg p-2 transition-colors hover:bg-surface-100">
                                <Edit2 className="h-4 w-4 text-surface-500" />
                              </button>
                              <button onClick={() => setDeletingId(admin.id)} className="rounded-lg p-2 transition-colors hover:bg-rose-50">
                                <Trash2 className="h-4 w-4 text-rose-500" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-surface-900">{copy.newAdmin}</h2>
            <div className="mb-6 space-y-4">
              <div>
                <label className="label">{copy.emailAddress}</label>
                <input type="email" placeholder="admin@example.com" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="label">{copy.role}</label>
                <select value={newAdminRole} onChange={(e) => setNewAdminRole(e.target.value as "superadmin" | "admin")} className="input-field appearance-none">
                  <option value="admin">{copy.admin}</option>
                  <option value="superadmin">{copy.superadmin}</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={() => { setShowCreateModal(false); setNewAdminEmail(""); setNewAdminRole("admin"); }} className="btn-secondary flex-1">
                {copy.cancel}
              </button>
              <button onClick={handleCreate} disabled={creating || !newAdminEmail} className="btn-primary flex-1">
                {creating ? copy.adding : copy.add}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deletingId !== null}
        title={copy.deleteTitle}
        description={copy.deleteDesc}
        danger
        loading={deleting}
        onConfirm={() => deletingId && handleDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
