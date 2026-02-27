"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, clearToken } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ChevronLeft,
  Plus,
  Coins,
  Users,
  LogOut,
  Loader2,
  AlertCircle,
  RefreshCcw,
  Crown,
  UserCog,
  ArrowRight,
  Database
} from "lucide-react";

type AdminRow = {
  id: number;
  email: string;
  role: "admin" | "superadmin";
  heptacoin_balance: number;
};

export default function SuperAdminPage() {
  const router = useRouter();

  const [me, setMe] = useState<{ id: number; email: string; role: string; heptacoin_balance: number } | null>(null);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Create Admin State
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [creating, setCreating] = useState(false);

  // Credit Coins State
  const [creditUserId, setCreditUserId] = useState<number | "">("");
  const [creditAmount, setCreditAmount] = useState<number>(100);
  const [crediting, setCrediting] = useState(false);

  async function loadMe() {
    const res = await apiFetch("/me", { method: "GET" });
    const data = await res.json();
    setMe(data);
    return data;
  }

  async function loadAdmins() {
    const res = await apiFetch("/superadmin/admins", { method: "GET" });
    const data = await res.json();
    setAdmins(Array.isArray(data) ? data : (data?.items ?? []));
  }

  async function reload() {
    setErr(null);
    setLoading(true);
    try {
      const m = await loadMe();
      if (m?.role !== "superadmin") {
        setErr("Erişim Engellendi: Bu alan sadece Sistem Yöneticileri (SuperAdmin) içindir.");
        return;
      }
      await loadAdmins();
    } catch (e: any) {
      const msg = e?.message || "Sistem verileri yüklenemedi.";
      setErr(msg);
      if (String(msg).toLowerCase().includes("missing") || String(msg).toLowerCase().includes("invalid")) {
        router.push("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function onCreateAdmin() {
    if (!newEmail.trim()) return setErr("E-Posta adresi zorunludur.");
    if (newPass.length < 10) return setErr("Güvenlik ihlali: Şifre en az 10 karakter olmalıdır.");
    setErr(null);
    setCreating(true);
    try {
      await apiFetch("/superadmin/admins", {
        method: "POST",
        body: JSON.stringify({ email: newEmail.trim(), password: newPass }),
      });
      setNewEmail("");
      setNewPass("");
      await reload();
      alert("Yeni yetkili başarıyla oluşturuldu.");
    } catch (e: any) {
      setErr(e?.message || "Yetkili oluşturma işlemi başarısız.");
    } finally {
      setCreating(false);
    }
  }

  async function onCredit() {
    if (creditUserId === "") return setErr("Lütfen bakiye yüklenecek hesabı seçin.");
    if (!creditAmount || creditAmount <= 0) return setErr("Yüklenecek miktar 0'dan büyük olmalıdır.");
    setErr(null);
    setCrediting(true);
    try {
      await apiFetch("/superadmin/coins/credit", {
        method: "POST",
        body: JSON.stringify({ admin_user_id: Number(creditUserId), amount: Number(creditAmount) }),
      });
      await reload();
      setCreditAmount(100);
      setCreditUserId("");
      alert("Bakiye yüklemesi başarıyla tamamlandı.");
    } catch (e: any) {
      setErr(e?.message || "Bakiye yükleme işlemi başarısız.");
    } finally {
      setCrediting(false);
    }
  }

  const adminOnly = useMemo(() => admins.filter((a) => a.role === "admin"), [admins]);

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <div className="grid gap-8 pb-20">
      
      {/* --- TOP NAVIGATION --- */}
      <div className="flex items-center justify-between">
        <Link href="/admin/events" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-200 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Etkinlik Paneli
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => reload()}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Yenile
          </button>
          <button
            onClick={() => { clearToken(); router.push("/admin/login"); }}
            className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
          >
            <LogOut className="h-3.5 w-3.5" /> Güvenli Çıkış
          </button>
        </div>
      </div>

      {/* --- HEADER --- */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] border border-violet-500/30 bg-slate-900/40 p-1px backdrop-blur-xl shadow-[0_10px_40px_rgba(124,58,237,0.1)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-[80px]" />
        <div className="bg-gradient-to-r from-slate-900/80 to-slate-950/80 p-8 md:p-10 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-violet-900 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]">
              <Crown className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Sistem Otoritesi <span className="text-violet-400 text-lg align-top">•</span></h1>
              <p className="mt-1 text-sm font-medium text-slate-400">HeptaCert Ana Yönetim Konsolu</p>
            </div>
          </div>

          {me && (
            <div className="flex flex-col gap-1 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 min-w-[200px]">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Aktif Yönetici</div>
              <div className="font-mono text-sm text-slate-200 truncate">{me.email}</div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="rounded bg-violet-500/20 px-2 py-0.5 font-bold text-violet-300">{me.role}</span>
                <span className="font-mono text-amber-400 border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded">
                  HC: {me.heptacoin_balance}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Error Alert inside Header */}
        <AnimatePresence>
          {err && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="border-t border-rose-500/20 bg-rose-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" /> {err}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* --- MAIN CONTENT --- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 text-slate-500">
          <Loader2 className="h-10 w-10 animate-spin mb-4 text-violet-500" />
          <span className="text-sm font-bold tracking-widest uppercase">Sistem Ağacı Yükleniyor...</span>
        </div>
      ) : (
        <motion.div variants={containerVars} initial="hidden" animate="show" className="grid gap-8 lg:grid-cols-12">
          
          {/* LEFT: Action Panels (Create & Credit) */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            
            {/* 1. Create Admin */}
            <motion.div variants={itemVars} className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-violet-500 opacity-50" />
              <div className="flex items-center gap-3 text-slate-100 font-bold mb-6">
                <div className="p-2 rounded-xl bg-violet-500/10"><UserCog className="h-5 w-5 text-violet-400" /></div>
                Yeni Yönetici Yetkilendir
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 mb-1 block">E-Posta Adresi</label>
                  <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="isim@kurum.com" className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3.5 text-sm text-slate-200 outline-none transition-all focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 mb-1 block">Geçici Şifre (Min 10 Karakter)</label>
                  <input value={newPass} onChange={(e) => setNewPass(e.target.value)} type="password" placeholder="••••••••" className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3.5 text-sm text-slate-200 outline-none transition-all focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10" />
                </div>
                
                <button onClick={onCreateAdmin} disabled={creating} className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3.5 text-sm font-black text-slate-900 transition-all hover:bg-white active:scale-95 disabled:opacity-50">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Yetkilendir
                </button>
              </div>
            </motion.div>

            {/* 2. Credit Coins */}
            <motion.div variants={itemVars} className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 opacity-50" />
              <div className="flex items-center gap-3 text-slate-100 font-bold mb-6">
                <div className="p-2 rounded-xl bg-amber-500/10"><Coins className="h-5 w-5 text-amber-400" /></div>
                Bakiye (HeptaCoin) Tahsisi
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 mb-1 block">Alıcı Hesap (Admin)</label>
                  <select value={creditUserId} onChange={(e) => setCreditUserId(e.target.value ? Number(e.target.value) : "")} className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3.5 text-sm text-slate-200 outline-none transition-all focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 appearance-none">
                    <option value="">Lütfen seçin...</option>
                    {adminOnly.map((a) => (
                      <option key={a.id} value={a.id}>{a.email} (Bakiye: {a.heptacoin_balance})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 mb-1 block">Aktarılacak Miktar (HC)</label>
                  <input value={creditAmount} onChange={(e) => setCreditAmount(Number(e.target.value))} type="number" min={1} className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3.5 text-sm text-slate-200 outline-none transition-all focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10" />
                </div>
                
                <button onClick={onCredit} disabled={crediting} className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3.5 text-sm font-black text-slate-900 transition-all hover:bg-amber-400 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:opacity-50">
                  {crediting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Bakiye Yükle
                </button>
              </div>
            </motion.div>

          </div>

          {/* RIGHT: Admin List Table */}
          <motion.div variants={itemVars} className="lg:col-span-7 flex flex-col h-full">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 overflow-hidden flex-grow flex flex-col">
              
              <div className="bg-slate-900/60 p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-slate-400" />
                  <span className="font-bold text-slate-100">Sistem Yöneticileri Tablosu</span>
                </div>
                <div className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-400">
                  Toplam: {admins.length}
                </div>
              </div>

              {admins.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center flex-grow">
                  <Users className="h-12 w-12 text-slate-700 mb-4" />
                  <p className="text-sm font-medium text-slate-500">Sistemde henüz bir kayıt bulunmuyor.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50 overflow-y-auto max-h-[600px] custom-scrollbar">
                  {admins.map((a) => (
                    <div key={a.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-mono font-bold text-slate-400 border border-slate-700">
                          #{a.id}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-200 truncate max-w-[200px] md:max-w-[250px]">{a.email}</div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${a.role === 'superadmin' ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-800 text-slate-400'}`}>
                              {a.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 min-w-[120px]">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Mevcut Bakiye</span>
                        <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-amber-400">
                          <Coins className="h-3 w-3" /> {a.heptacoin_balance}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
          
        </motion.div>
      )}
    </div>
  );
}