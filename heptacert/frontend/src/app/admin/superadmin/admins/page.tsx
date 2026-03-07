"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Search,
  Shield,
} from "lucide-react";
import {
  listSuperAdmins,
  createSuperAdmin,
  deleteSuperAdmin,
  updateSuperAdminRole,
  AdminOut,
} from "@/lib/api";

export default function SuperAdminAdminsPage() {
  const router = useRouter();

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
      setError(e?.message || "Yönetici oluşturulamadı");
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

  const filteredAdmins = admins.filter((admin) =>
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Yönetici Yönetimi</h1>
            <p className="text-sm text-surface-500 mt-1">Sistem yöneticilerini yönetin ve rolleri ayarlayın</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary gap-2"
          >
            <Plus className="h-5 w-5" />
            Yönetici Ekle
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-start gap-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Hata</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Email ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Admins Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {filteredAdmins.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Yönetici bulunamadı</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Rol</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Oluşturma Tarihi</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{admin.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      {editingId === admin.id ? (
                        <select
                          value={editingRole || admin.role}
                          onChange={(e) => setEditingRole(e.target.value as "superadmin" | "admin")}
                          className="px-3 py-1 rounded border border-gray-300 text-sm"
                        >
                          <option value="admin">Yönetici</option>
                          <option value="superadmin">Süper Yönetici</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            admin.role === "superadmin"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {admin.role === "superadmin" ? "Süper Yönetici" : "Yönetici"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(admin.created_at).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === admin.id ? (
                          <>
                            <button
                              onClick={() => handleUpdateRole(admin.id)}
                              disabled={updating}
                              className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-sm hover:bg-emerald-600 disabled:bg-gray-300 transition-colors"
                            >
                              {updating ? "Kaydediyor..." : "Kaydet"}
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditingRole(null);
                              }}
                              className="px-3 py-1 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
                            >
                              İptal
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(admin.id);
                                setEditingRole(admin.role as "admin" | "superadmin");
                              }}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <Edit2 className="h-4 w-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => setDeletingId(admin.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
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
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Yeni Yönetici Ekle</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Adresi
              </label>
              <input
                type="email"
                placeholder="admin@example.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol
              </label>
              <select
                value={newAdminRole}
                onChange={(e) => setNewAdminRole(e.target.value as "superadmin" | "admin")}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="admin">Yönetici</option>
                <option value="superadmin">Süper Yönetici</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewAdminEmail("");
                  setNewAdminRole("admin");
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newAdminEmail}
                className="flex-1 px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:bg-gray-300 transition-colors"
              >
                {creating ? "Ekleniyor..." : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Yöneticiyi Sil?</h2>
            <p className="text-gray-600 mb-6">
              Bu işlem geri alınamaz. Yöneticiyi silmek istediğinizden emin misiniz?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => deletingId && handleDelete(deletingId)}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:bg-gray-300 transition-colors"
              >
                {deleting ? "Siliniyor..." : "Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
