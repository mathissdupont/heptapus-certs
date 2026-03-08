"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Loader2, Save, Trash2, Building2, Database,
} from "lucide-react";
import ConfirmModal from "@/components/Admin/ConfirmModal";

type OrgRow = {
  id: number; user_id: number; org_name: string;
  custom_domain: string | null; brand_logo: string | null;
  brand_color: string; created_at: string;
};

export default function SuperadminOrgsPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ user_id: "", org_name: "", custom_domain: "", brand_logo: "", brand_color: "#6366f1" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await apiFetch("/superadmin/organizations"); setOrgs(await r.json()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  function startEdit(org: OrgRow) {
    setEditId(org.id);
    setForm({ user_id: String(org.user_id), org_name: org.org_name, custom_domain: org.custom_domain || "", brand_logo: org.brand_logo || "", brand_color: org.brand_color });
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setSaving(true);
    try {
      const body = { user_id: form.user_id ? parseInt(form.user_id) : undefined, org_name: form.org_name, custom_domain: form.custom_domain || null, brand_logo: form.brand_logo || null, brand_color: form.brand_color };
      if (editId) {
        await apiFetch(`/superadmin/organizations/${editId}`, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await apiFetch("/superadmin/organizations", { method: "POST", body: JSON.stringify(body) });
      }
      setShowForm(false); setEditId(null);
      setForm({ user_id: "", org_name: "", custom_domain: "", brand_logo: "", brand_color: "#6366f1" });
      load();
    } catch (e: any) { setErr(e?.message || "Kaydedilemedi."); }
    finally { setSaving(false); }
  }

  async function deleteOrg(id: number) {
    setDeleting(true);
    try {
      await apiFetch(`/superadmin/organizations/${id}`, { method: "DELETE" });
      load();
    } finally {
      setDeleting(false);
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-surface-900">Kurumlar (White-Label)</h2>
          <p className="text-sm text-surface-500">Admin kullanıcılara özel marka ve domain atayın.</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ user_id: "", org_name: "", custom_domain: "", brand_logo: "", brand_color: "#6366f1" }); }}
          className="btn-primary gap-2"
        >
          <Plus className="h-4 w-4" /> Yeni Kurum
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <form onSubmit={save} className="card p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Admin User ID</label><input className="input-field" type="number" value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} placeholder="Zorunlu" required /></div>
                <div><label className="label">Kurum Adı</label><input className="input-field" value={form.org_name} onChange={e => setForm(f => ({ ...f, org_name: e.target.value }))} placeholder="Acme University" required /></div>
                <div><label className="label">Özel Domain</label><input className="input-field" value={form.custom_domain} onChange={e => setForm(f => ({ ...f, custom_domain: e.target.value }))} placeholder="certs.acme.edu" /></div>
                <div><label className="label">Marka Logo URL</label><input className="input-field" value={form.brand_logo} onChange={e => setForm(f => ({ ...f, brand_logo: e.target.value }))} placeholder="https://..." /></div>
                <div>
                  <label className="label">Marka Rengi</label>
                  <div className="flex gap-2">
                    <input className="input-field flex-1" value={form.brand_color} onChange={e => setForm(f => ({ ...f, brand_color: e.target.value }))} placeholder="#6366f1" />
                    <input type="color" value={form.brand_color} onChange={e => setForm(f => ({ ...f, brand_color: e.target.value }))} className="h-10 w-10 rounded-lg border border-surface-200 cursor-pointer" />
                  </div>
                </div>
              </div>
              {err && <div className="error-banner">{err}</div>}
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="btn-primary gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editId ? "Güncelle" : "Oluştur"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">İptal</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-surface-400" /></div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-12 text-surface-400">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Henüz kurum yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map(org => (
            <div key={org.id} className="card p-4 flex items-center gap-4">
              <div style={{ backgroundColor: org.brand_color }} className="h-8 w-8 rounded-lg flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-surface-900">{org.org_name}</p>
                <div className="flex gap-3 text-xs text-surface-400 mt-0.5">
                  <span>User ID: {org.user_id}</span>
                  {org.custom_domain && <span>Domain: {org.custom_domain}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(org)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-700"><Database className="h-4 w-4" /></button>
                <button onClick={() => setDeletingId(org.id)} className="p-2 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={deletingId !== null}
        title="Kurumu sil"
        description="Bu işlem geri alınamaz. Kurumu ve tüm ilgili verilerini kalıcı olarak siler."
        danger
        loading={deleting}
        onConfirm={() => deletingId && deleteOrg(deletingId)}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
