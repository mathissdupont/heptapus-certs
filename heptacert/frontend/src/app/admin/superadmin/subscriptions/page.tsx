"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Loader2, AlertCircle, Trash2, Gift } from "lucide-react";
import EmptyState from "@/components/Admin/EmptyState";
import ConfirmModal from "@/components/Admin/ConfirmModal";
import { useToast } from "@/hooks/useToast";

type SubscriptionRow = {
  id: number; user_id: number; user_email: string; plan_id: string;
  order_id?: string; started_at: string; expires_at?: string; is_active: boolean;
};

const PLAN_OPTIONS = ["starter", "pro", "growth", "enterprise"];

const planBadge: Record<string, string> = {
  starter: "bg-surface-100 text-surface-600",
  pro: "bg-violet-100 text-violet-700",
  growth: "bg-rose-100 text-rose-700",
  enterprise: "bg-amber-100 text-amber-700",
};

export default function SuperadminSubscriptionsPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [grantEmail, setGrantEmail] = useState("");
  const [grantPlan, setGrantPlan] = useState("starter");
  const [grantDays, setGrantDays] = useState(30);
  const [granting, setGranting] = useState(false);

  const [revokeId, setRevokeId] = useState<number | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await apiFetch("/superadmin/subscriptions");
      const d = await r.json();
      setRows(Array.isArray(d) ? d : (d.subscriptions ?? []));
    } catch (e: any) { setErr(e?.message || "Abonelikler yüklenemedi."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    if (!grantEmail.trim()) return;
    setGranting(true);
    try {
      await apiFetch("/superadmin/subscriptions/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: grantEmail, plan_id: grantPlan, days: grantDays }),
      });
      showToast("Abonelik verildi.", "success");
      setGrantEmail(""); setGrantPlan("starter"); setGrantDays(30);
      load();
    } catch (e: any) { showToast(e?.message || "Abonelik verilemedi.", "error"); }
    finally { setGranting(false); }
  }

  async function handleRevoke() {
    if (!revokeId) return;
    setRevoking(true);
    try {
      await apiFetch(`/superadmin/subscriptions/${revokeId}`, { method: "DELETE" });
      showToast("Abonelik iptal edildi.", "success");
      setRevokeId(null); load();
    } catch (e: any) { showToast(e?.message || "Abonelik iptal edilemedi.", "error"); }
    finally { setRevoking(false); }
  }

  return (
    <div className="space-y-6">
      {/* Grant Form */}
      <div className="card p-6">
        <h2 className="font-semibold text-surface-800 mb-4 flex items-center gap-2"><Gift className="h-4 w-4 text-violet-500" /> Abonelik Ver</h2>
        <form onSubmit={handleGrant} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input type="email" required value={grantEmail} onChange={e => setGrantEmail(e.target.value)} placeholder="kullanici@email.com" className="input-field sm:col-span-2" />
          <select value={grantPlan} onChange={e => setGrantPlan(e.target.value)} className="input-field capitalize">
            {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <input type="number" min={1} max={3650} value={grantDays} onChange={e => setGrantDays(Number(e.target.value))} className="input-field w-24" />
            <span className="text-sm text-surface-500 whitespace-nowrap">gün</span>
            <button type="submit" disabled={granting} className="btn-primary whitespace-nowrap">
              {granting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ver"}
            </button>
          </div>
        </form>
      </div>

      {err && <div className="flex items-center gap-2 text-rose-600 text-sm"><AlertCircle className="h-4 w-4" />{err}</div>}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
      ) : rows.length === 0 ? (
        <EmptyState title="Abonelik yok" description="Henüz aktif abonelik bulunmuyor." icon={<CreditCard className="h-8 w-8" />} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 text-surface-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Kullanıcı</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Başlangıç</th>
                <th className="px-4 py-3 text-left">Bitiş</th>
                <th className="px-4 py-3 text-left">Durum</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              <AnimatePresence>
                {rows.map((row, i) => (
                  <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-surface-50">
                    <td className="px-4 py-3 font-medium text-surface-800">{row.user_email}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${planBadge[row.plan_id] || planBadge.starter}`}>{row.plan_id}</span></td>
                    <td className="px-4 py-3 text-surface-500">{new Date(row.started_at).toLocaleDateString("tr-TR")}</td>
                    <td className="px-4 py-3 text-surface-500">{row.expires_at ? new Date(row.expires_at).toLocaleDateString("tr-TR") : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.is_active ? "badge-active" : "badge-revoked"}`}>
                        {row.is_active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setRevokeId(row.id)} className="text-rose-400 hover:text-rose-600 transition-colors" title="İptal et">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={revokeId !== null}
        title="Aboneliği iptal et"
        description="Bu aboneliği silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        danger loading={revoking}
        onConfirm={handleRevoke}
        onCancel={() => setRevokeId(null)}
      />
    </div>
  );
}
