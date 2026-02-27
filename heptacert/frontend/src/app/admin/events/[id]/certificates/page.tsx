"use client";

import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Search,
  Loader2,
  AlertCircle,
  Trash2,
  ShieldOff,
  Clock,
  CheckCircle2,
  Plus,
  ExternalLink,
  Download,
  FileText,
  Filter,
  RefreshCcw,
  Zap,
  Hash,
  LockKeyhole
} from "lucide-react";

type CertStatus = "active" | "revoked" | "expired";

type CertificateOut = {
  id: number;
  uuid: string;
  public_id?: string | null;
  student_name: string;
  event_id: number;
  status: CertStatus;
  hosting_term?: string | null;
  hosting_ends_at?: string | null;
  pdf_url?: string | null;
};

type CertificateListOut = {
  items: CertificateOut[];
  total: number;
  page: number;
  limit: number;
};

function getStatusStyle(s: CertStatus) {
  if (s === "active") return {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500 animate-pulse",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />
  };
  if (s === "expired") return {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
    icon: <Clock className="h-3.5 w-3.5" />
  };
  return {
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    dot: "bg-rose-500",
    icon: <ShieldOff className="h-3.5 w-3.5" />
  };
}

export default function CertificatesPage({ params }: { params: { id: string } }) {
  const eventId = Number(params.id);

  const [items, setItems] = useState<CertificateOut[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | CertStatus>("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // manual issue
  const [issueName, setIssueName] = useState("");
  const [issueTerm, setIssueTerm] = useState<"monthly" | "yearly">("yearly");
  const [issuing, setIssuing] = useState(false);

  const query = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    if (search.trim()) qs.set("search", search.trim());
    if (status) qs.set("status", status);
    return qs.toString();
  }, [page, limit, search, status]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/events/${eventId}/certificates?${query}`, { method: "GET" });
      const data = (await res.json()) as CertificateListOut;
      setItems(data.items);
      setTotal(data.total);
    } catch (e: any) {
      setErr(e?.message || "Sertifika listesi çekilemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function patchStatus(certId: number, next: CertStatus) {
    setErr(null);
    try {
      await apiFetch(`/admin/certificates/${certId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      await load();
    } catch (e: any) {
      setErr(e?.message || "Durum güncellenemedi.");
    }
  }

  async function softDelete(certId: number) {
    if (!confirm("Bu sertifikayı sistemden kalıcı olarak silmek istediğinize emin misiniz?")) return;
    setErr(null);
    try {
      await apiFetch(`/admin/certificates/${certId}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      setErr(e?.message || "Silme işlemi başarısız oldu.");
    }
  }

  async function issueOne() {
    if (!issueName.trim()) return setErr("Lütfen geçerli bir isim girin.");
    setErr(null);
    setIssuing(true);
    try {
      await apiFetch(`/admin/events/${eventId}/certificates`, {
        method: "POST",
        body: JSON.stringify({ student_name: issueName.trim(), hosting_term: issueTerm }),
      });
      setIssueName("");
      setPage(1);
      await load();
    } catch (e: any) {
      setErr(e?.message || "Sertifika basım işlemi başarısız oldu.");
    } finally {
      setIssuing(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const containerVars = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVars = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="flex flex-col gap-8 pb-20 pt-6">
      
      {/* --- TOP NAVIGATION --- */}
      <div className="flex items-center justify-between">
        <Link href="/admin/events" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-200 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Etkinlik Paneline Dön
        </Link>
        <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-xs font-mono text-slate-400">
          <Hash className="h-3 w-3" /> Event ID: {eventId}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        
        {/* --- LEFT COLUMN: CREATE & FILTER --- */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* 1. Manual Issue Box */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-slate-900/60 p-6 backdrop-blur-md shadow-lg relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap className="h-32 w-32 text-amber-500" />
            </div>
            
            <div className="flex items-center gap-3 text-slate-100 font-bold mb-6 relative z-10">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400"><Plus className="h-5 w-5" /></div>
              Manuel Sertifika Bas
            </div>

            <div className="grid gap-4 relative z-10">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 mb-1 block">Alıcı Adı Soyadı</label>
                <input value={issueName} onChange={(e) => setIssueName(e.target.value)} placeholder="Örn: Ahmet Yılmaz" className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-medium text-slate-200 outline-none transition-all focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10" />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 mb-1 block">Barındırma (Hosting) Süresi</label>
                <select value={issueTerm} onChange={(e) => setIssueTerm(e.target.value as any)} className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-medium text-slate-200 outline-none transition-all focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 appearance-none">
                  <option value="monthly">Aylık Hosting</option>
                  <option value="yearly">Yıllık Hosting (2 Ay Hediye)</option>
                </select>
              </div>

              <button onClick={issueOne} disabled={issuing} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3.5 text-sm font-black text-slate-900 transition-all hover:bg-amber-400 active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                {issuing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-4 w-4" />} Hemen Bas
              </button>
            </div>
          </motion.div>

          {/* 2. Filters Box */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md">
            <div className="flex items-center gap-3 text-slate-100 font-bold mb-6">
              <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400"><Filter className="h-5 w-5" /></div>
              Arama & Filtreleme
            </div>

            <div className="grid gap-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                <input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="İsim ile ara..." className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 pl-11 pr-4 py-3.5 text-sm font-medium text-slate-200 outline-none transition-all focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10" />
              </div>

              <div className="flex gap-3">
                <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as any); }} className="flex-1 rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3.5 text-sm font-medium text-slate-200 outline-none transition-all focus:border-violet-500/50 appearance-none">
                  <option value="">Tüm Durumlar</option>
                  <option value="active">🟢 Doğrulanmış (Active)</option>
                  <option value="revoked">🔴 İptal Edilmiş (Revoked)</option>
                  <option value="expired">🟡 Süresi Dolmuş (Expired)</option>
                </select>
                
                <button onClick={() => load()} className="flex shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/50 p-3.5 text-slate-300 hover:bg-slate-700 transition-colors" title="Listeyi Yenile">
                  <RefreshCcw className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Hata Mesajı */}
          <AnimatePresence>
            {err && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-bold text-rose-400">
                  <AlertCircle className="h-5 w-5 shrink-0" /> {err}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* --- RIGHT COLUMN: CERTIFICATES TABLE --- */}
        <div className="lg:col-span-8 flex flex-col h-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-800 bg-slate-900/40 flex-grow flex flex-col overflow-hidden shadow-xl backdrop-blur-sm">
            
            <div className="bg-slate-900/60 p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-400" />
                <span className="font-bold text-slate-100">Kayıt Defteri</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                <span className="rounded-full bg-slate-800 px-3 py-1">Toplam: {total}</span>
                <span className="rounded-full bg-slate-800 px-3 py-1">Sayfa {page} / {totalPages}</span>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center p-32 text-slate-500 flex-grow">
                <Loader2 className="h-10 w-10 animate-spin mb-4 text-violet-500" />
                <span className="text-xs font-bold tracking-widest uppercase">Kayıtlar Çekiliyor...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-32 text-center text-slate-500 flex-grow">
                <Search className="h-12 w-12 text-slate-700 mb-4" />
                <div className="text-base font-bold text-slate-300">Sertifika Bulunamadı</div>
                <div className="text-sm mt-1">Arama kriterlerinizi değiştirin veya yeni bir sertifika basın.</div>
              </div>
            ) : (
              <motion.div variants={containerVars} initial="hidden" animate="show" className="divide-y divide-slate-800/50 overflow-y-auto max-h-[800px] custom-scrollbar">
                {items.map((c) => {
                  const style = getStatusStyle(c.status);
                  const canDownload = c.status === "active" && !!c.pdf_url;
                  
                  return (
                    <motion.div key={c.id} variants={itemVars} className="p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6 hover:bg-slate-800/20 transition-colors">
                      
                      {/* Left: Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black tracking-wider uppercase ${style.bg} ${style.color} ${style.border}`}>
                            {style.icon} {c.status}
                          </span>
                          <span className="text-lg font-bold text-slate-200 truncate">{c.student_name}</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono text-slate-500">
                          <div className="flex items-center gap-1.5"><Hash className="h-3 w-3" /> {c.uuid.split('-')[0]}...</div>
                          {c.public_id && <div className="flex items-center gap-1.5"><LockKeyhole className="h-3 w-3" /> ID: {c.public_id}</div>}
                          {c.hosting_term && <div className="hidden sm:block px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">Plan: {c.hosting_term}</div>}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col gap-3 shrink-0">
                        {/* Primary Actions (View/DL) */}
                        <div className="flex gap-2">
                          <a href={`/verify/${c.uuid}`} target="_blank" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-[11px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" /> Doğrula
                          </a>
                          {canDownload ? (
                            <a href={c.pdf_url!} target="_blank" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                              <Download className="h-3.5 w-3.5" /> PDF İndir
                            </a>
                          ) : (
                            <div className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-[11px] font-bold text-slate-600 cursor-not-allowed">
                              <ShieldOff className="h-3.5 w-3.5" /> Kilitli
                            </div>
                          )}
                        </div>

                        {/* Admin Controls (Status Change) */}
                        <div className="flex flex-wrap gap-1.5 bg-slate-950/50 p-1.5 rounded-xl border border-slate-800/80">
                          <button onClick={() => patchStatus(c.id, "active")} disabled={c.status === 'active'} className="flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                            Active
                          </button>
                          <button onClick={() => patchStatus(c.id, "revoked")} disabled={c.status === 'revoked'} className="flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                            Revoke
                          </button>
                          <button onClick={() => patchStatus(c.id, "expired")} disabled={c.status === 'expired'} className="flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                            Expire
                          </button>
                          <div className="w-[1px] bg-slate-800 mx-0.5" />
                          <button onClick={() => softDelete(c.id)} className="rounded-lg px-2 py-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors" title="Sistemden Sil">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* Pagination Panel */}
            <div className="bg-slate-900/60 p-4 border-t border-slate-800 flex items-center justify-between mt-auto">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800/50 transition-colors">
                <ChevronLeft className="h-4 w-4" /> Önceki
              </button>
              <div className="text-xs font-bold text-slate-500">
                <span className="text-slate-300">{page}</span> / {totalPages}
              </div>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-800/50 transition-colors">
                Sonraki <ChevronLeft className="h-4 w-4 rotate-180" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}