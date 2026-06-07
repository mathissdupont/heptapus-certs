"use client";

import { useEffect, useState } from "react";
import {
  Check, Loader2, Mail, Plus, ShieldCheck, Trash2, UserCheck, UserX, X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type StaffMember = {
  id: number;
  email: string;
  display_name: string | null;
  role: string;
  department: string | null;
  is_active: boolean;
  joined: boolean;
  invited_at: string | null;
  joined_at: string | null;
};

const ROLE_OPTIONS = [
  { value: "instructor", label: "Eğitmen" },
  { value: "teaching_assistant", label: "Asistan Eğitmen" },
  { value: "content_editor", label: "İçerik Editörü" },
  { value: "department_admin", label: "Departman Yöneticisi" },
  { value: "viewer", label: "İzleyici" },
];

const ROLE_COLORS: Record<string, string> = {
  instructor: "bg-indigo-100 text-indigo-700",
  teaching_assistant: "bg-purple-100 text-purple-700",
  content_editor: "bg-blue-100 text-blue-700",
  department_admin: "bg-amber-100 text-amber-700",
  viewer: "bg-gray-100 text-gray-600",
};

const ROLE_LABELS: Record<string, string> = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]));

const emptyInvite = { email: "", role: "instructor", display_name: "", department: "" };

export default function TeamPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState(emptyInvite);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState("");

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    const data = await apiFetch("/api/admin/org/staff").then((r) => r.json());
    setStaff(Array.isArray(data?.staff) ? data.staff : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleInvite() {
    if (!form.email) return;
    setSubmitting(true);
    try {
      await apiFetch("/api/admin/org/staff/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          role: form.role,
          display_name: form.display_name || null,
          department: form.department || null,
        }),
      });
      showToast("Davet e-postası gönderildi.");
      setForm(emptyInvite);
      setShowInvite(false);
      load();
    } catch {
      showToast("Davet gönderilemedi.", false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateRole(id: number, role: string) {
    await apiFetch(`/api/admin/org/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setEditId(null);
    load();
  }

  async function handleToggleActive(member: StaffMember) {
    await apiFetch(`/api/admin/org/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !member.is_active }),
    });
    load();
  }

  async function handleRemove(id: number) {
    if (!confirm("Bu kişiyi ekipten çıkarmak istediğinizden emin misiniz?")) return;
    await apiFetch(`/api/admin/org/staff/${id}`, { method: "DELETE" });
    load();
    showToast("Personel kaldırıldı.");
  }

  const pending = staff.filter((s) => !s.joined);
  const active = staff.filter((s) => s.joined && s.is_active);
  const inactive = staff.filter((s) => s.joined && !s.is_active);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-2.5 text-sm text-white shadow-lg ${toast.ok ? "bg-gray-900" : "bg-red-600"}`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Ekip Yönetimi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Organizasyonunuza eğitmen ve personel davet edin, rollerini yönetin.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Davet Et
        </button>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Personel Davet Et</h2>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-posta *</label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="personel@ornek.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ad Soyad (opsiyonel)</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  placeholder="Ad Soyad"
                  value={form.display_name}
                  onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Departman (opsiyonel)</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  placeholder="Bilgi İşlem, Pazarlama..."
                  value={form.department}
                  onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowInvite(false)} className="text-sm text-gray-600 px-4 py-2">
                İptal
              </button>
              <button
                onClick={handleInvite}
                disabled={submitting || !form.email}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Mail className="w-3.5 h-3.5" />
                Davet Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active */}
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Aktif Üyeler ({active.length})
              </h2>
              <div className="space-y-2">
                {active.map((s) => (
                  <StaffRow
                    key={s.id}
                    member={s}
                    editId={editId}
                    editRole={editRole}
                    setEditId={setEditId}
                    setEditRole={setEditRole}
                    onUpdateRole={handleUpdateRole}
                    onToggleActive={handleToggleActive}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Pending invites */}
          {pending.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Bekleyen Davetler ({pending.length})
              </h2>
              <div className="space-y-2">
                {pending.map((s) => (
                  <StaffRow
                    key={s.id}
                    member={s}
                    editId={editId}
                    editRole={editRole}
                    setEditId={setEditId}
                    setEditRole={setEditRole}
                    onUpdateRole={handleUpdateRole}
                    onToggleActive={handleToggleActive}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Inactive */}
          {inactive.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Pasif Üyeler ({inactive.length})
              </h2>
              <div className="space-y-2 opacity-60">
                {inactive.map((s) => (
                  <StaffRow
                    key={s.id}
                    member={s}
                    editId={editId}
                    editRole={editRole}
                    setEditId={setEditId}
                    setEditRole={setEditRole}
                    onUpdateRole={handleUpdateRole}
                    onToggleActive={handleToggleActive}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </section>
          )}

          {staff.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <ShieldCheck className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Henüz ekip üyesi yok.</p>
              <p className="text-sm text-gray-400 mt-1">Davet et butonuna tıklayarak personel ekleyin.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StaffRow({
  member,
  editId,
  editRole,
  setEditId,
  setEditRole,
  onUpdateRole,
  onToggleActive,
  onRemove,
}: {
  member: StaffMember;
  editId: number | null;
  editRole: string;
  setEditId: (id: number | null) => void;
  setEditRole: (r: string) => void;
  onUpdateRole: (id: number, role: string) => void;
  onToggleActive: (m: StaffMember) => void;
  onRemove: (id: number) => void;
}) {
  const isEditing = editId === member.id;

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-indigo-700">
          {(member.display_name || member.email)[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {member.display_name || member.email}
          </p>
          <p className="text-xs text-gray-400 truncate">{member.email}</p>
          {member.department && (
            <p className="text-xs text-gray-400">{member.department}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Status badge */}
        {!member.joined ? (
          <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">Davet Bekliyor</span>
        ) : (
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[member.role] ?? "bg-gray-100 text-gray-600"}`}>
            {ROLE_LABELS[member.role] ?? member.role}
          </span>
        )}

        {/* Edit role */}
        {isEditing ? (
          <div className="flex items-center gap-1">
            <select
              className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button
              onClick={() => onUpdateRole(member.id, editRole)}
              className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setEditId(null)}
              className="p-1 rounded text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setEditId(member.id); setEditRole(member.role); }}
            className="text-xs text-indigo-600 hover:underline"
          >
            Rolü Değiştir
          </button>
        )}

        {/* Toggle active */}
        <button
          onClick={() => onToggleActive(member)}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          title={member.is_active ? "Pasife Al" : "Aktife Al"}
        >
          {member.is_active
            ? <UserX className="w-4 h-4" />
            : <UserCheck className="w-4 h-4 text-green-600" />
          }
        </button>

        {/* Remove */}
        <button
          onClick={() => onRemove(member.id)}
          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
