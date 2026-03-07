"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Loader2, AlertCircle, Mail, Phone, Download } from "lucide-react";
import EmptyState from "@/components/Admin/EmptyState";

type WaitlistRow = {
  id: number; name: string; email: string; phone?: string;
  plan_interest?: string; note?: string; created_at: string;
};

function planBadge(plan?: string) {
  if (!plan) return "badge-neutral";
  const map: Record<string, string> = { starter: "badge-neutral", pro: "bg-violet-100 text-violet-700", growth: "bg-rose-100 text-rose-700", enterprise: "bg-amber-100 text-amber-700" };
  return map[plan] || "badge-neutral";
}

export default function SuperadminWaitlistPage() {
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await apiFetch("/superadmin/waitlist");
      const d = await r.json();
      setRows(d.entries ?? d); setTotal(d.total ?? (d.entries?.length ?? 0));
    } catch (e: any) { setErr(e?.message || "Bekleme listesi yüklenemedi."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    const cols = ["id", "name", "email", "phone", "plan_interest", "note", "created_at"];
    const lines = [cols.join(","), ...rows.map(r => cols.map(c => JSON.stringify((r as any)[c] ?? "")).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `waitlist_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-surface-900">Bekleme Listesi</h2>
          <p className="text-sm text-surface-500">Toplam {total} kayıt</p>
        </div>
        <button onClick={exportCsv} disabled={rows.length === 0} className="btn-secondary gap-2">
          <Download className="h-4 w-4" /> CSV İndir
        </button>
      </div>

      {err && <div className="flex items-center gap-2 text-rose-600 text-sm"><AlertCircle className="h-4 w-4" />{err}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>
      ) : rows.length === 0 ? (
        <EmptyState title="Bekleme listesi boş" description="Henüz kayıt yok." icon={<ClipboardList className="h-8 w-8" />} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 text-surface-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Ad Soyad</th>
                <th className="px-4 py-3 text-left">İletişim</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Not</th>
                <th className="px-4 py-3 text-left">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              <AnimatePresence>
                {rows.map((row, i) => (
                  <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }} className="hover:bg-surface-50">
                    <td className="px-4 py-3 font-medium text-surface-800">{row.name}</td>
                    <td className="px-4 py-3 text-surface-600">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-surface-400" />{row.email}</span>
                        {row.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-surface-400" />{row.phone}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {row.plan_interest ? <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${planBadge(row.plan_interest)}`}>{row.plan_interest}</span> : <span className="text-surface-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-surface-500 max-w-xs truncate">{row.note || <span className="text-surface-300">—</span>}</td>
                    <td className="px-4 py-3 text-surface-400 whitespace-nowrap">{new Date(row.created_at).toLocaleDateString("tr-TR")}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
