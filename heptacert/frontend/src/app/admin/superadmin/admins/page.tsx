"use client";

import { useEffect, useState } from "react";
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
import PageHeader from "@/components/Admin/PageHeader";
import ConfirmModal from "@/components/Admin/ConfirmModal";
import { useToast } from "@/hooks/useToast";

export default function SuperAdminAdminsPage() {
  const toast = useToast();

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
      setError(e?.message || "Yöneticiler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newAdminEmail.trim()) {
      setError("Email gerekli");
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
      setError(e?.message || "Yönetici oluþturulamadý");
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
      setError(e?.message || "Rol güncellenemedi");
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
      setError(e?.message || "Yönetici silinemedi");
    } finally {
      setDeleting(false);
    }
  };

  const handleCredit = async () => {
    if (!creditAdminId) {
      setError("HeptaCoin yüklenecek yönetici seçin");
      return;
    }
    if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
      setError("Geçerli bir HeptaCoin miktarý girin");
      return;
    }

    try {
      setCrediting(true);
      setError(null);
      const creditedAdmin = admins.find((admin) => admin.id === creditAdminId);
      await creditSuperAdminCoins({ admin_user_id: creditAdminId, amount: creditAmount });
      await fetchAdmins();
      toast.success(`${creditedAdmin?.email ?? "Yönetici"} hesabýna ${creditAmount} HC tanýmlandý.`);
      setCreditAmount(100);
    } catch (e: any) {
      console.error("Failed to credit coins:", e);
      setError(e?.message || "HeptaCoin yüklenemedi");
    } finally {
      setCrediting(false);
    }
  };

  const filteredAdmins = admins.filter((admin) =>
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const adminRecipients = admins.filter((admin) => admin.role === "admin");

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
        title="Yönetici Yönetimi"
        subtitle="Sistem yöneticilerini yönetin, rolleri ayarlayýn ve bakiye tanýmlayýn"
        icon={<Shield className="h-5 w-5" />}
        actions={
          <button onClick={() => setShowCreateModal(true)} className="btn-primary gap-2 text-xs">
            <Plus className="h-4 w-4" /> Yönetici Ekle
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
            <h2 className="text-base font-semibold text-surface-900">HeptaCoin Tanýmla</h2>
            <p className="text-sm text-surface-500">Admin hesaplarýna bakiye yükleyin ve anýnda kullanýma açýn.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
          <select
            value={creditAdminId ?? ""}
            onChange={(e) => setCreditAdminId(e.target.value ? Number(e.target.value) : null)}
            className="input-field"
          >
            <option value="">Yönetici seçin</option>
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
            placeholder="Miktar"
          />
          <button
            onClick={handleCredit}
            disabled={crediting || !creditAdminId || adminRecipients.length === 0}
            className="btn-primary gap-2 whitespace-nowrap"
          >
            {crediting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
            Bakiye Yükle
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
        <input
          type="text"
          placeholder="Email ile ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      <div className="card overflow-hidden">
        {filteredAdmins.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="mx-auto mb-3 h-10 w-10 text-surface-200" />
            <p className="text-sm font-medium text-surface-400">Yönetici bulunamadý</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-surface-200 bg-surface-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Bakiye</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Oluþturma</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-500">Ýþlemler</th>
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
                      <select
                        value={editingRole || admin.role}
                        onChange={(e) => setEditingRole(e.target.value as "superadmin" | "admin")}
                        className="input-field py-1.5 text-xs"
                      >
                        <option value="admin">Yönetici</option>
                        <option value="superadmin">Süper Yönetici</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
                          admin.role === "superadmin" ? "bg-violet-100 text-violet-800" : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {admin.role === "superadmin" ? "Süper Yönetici" : "Yönetici"}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-amber-600">{admin.heptacoin_balance} HC</td>
                  <td className="px-6 py-4 text-sm text-surface-500">
                    {admin.created_at ? new Date(admin.created_at).toLocaleDateString("tr-TR") : "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === admin.id ? (
                        <>
                          <button onClick={() => handleUpdateRole(admin.id)} disabled={updating} className="btn-primary px-3 py-1.5 text-xs">
                            {updating ? "Kaydediyor..." : "Kaydet"}
                          </button>
                          <button onClick={() => { setEditingId(null); setEditingRole(null); }} className="btn-secondary px-3 py-1.5 text-xs">
                            Ýptal
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
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-surface-900">Yeni Yönetici Ekle</h2>
            <div className="mb-6 space-y-4">
              <div>
                <label className="label">Email Adresi</label>
                <input
                  type="email"
                  placeholder="admin@example.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Rol</label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as "superadmin" | "admin")}
                  className="input-field appearance-none"
                >
                  <option value="admin">Yönetici</option>
                  <option value="superadmin">Süper Yönetici</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowCreateModal(false); setNewAdminEmail(""); setNewAdminRole("admin"); }} className="btn-secondary flex-1">
                Ýptal
              </button>
              <button onClick={handleCreate} disabled={creating || !newAdminEmail} className="btn-primary flex-1">
                {creating ? "Ekleniyor..." : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deletingId !== null}
        title="Yöneticiyi sil"
        description="Bu iþlem geri alýnamaz. Yöneticiyi silmek istediðinizden emin misiniz?"
        danger
        loading={deleting}
        onConfirm={() => deletingId && handleDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
