"use client";

import { useEffect, useState } from "react";
import { apiFetch, clearToken } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  LogOut,
  LayoutGrid,
  ChevronRight,
  Image as ImageIcon,
  Hash,
  AlertCircle,
  Loader2,
  Shield,
  ListChecks,
  Pencil,
  Coins,
  Zap,
  FolderKanban
} from "lucide-react";

type EventOut = { id: number; name: string; template_image_url: string; config: any };
type MeOut = { id: number; email: string; role: "admin" | "superadmin"; heptacoin_balance: number };

export default function AdminEvents() {
  const [events, setEvents] = useState<EventOut[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeOut | null>(null);

  const router = useRouter();

  async function load() {
    setErr(null);
    try {
      const [eventsRes, meRes] = await Promise.all([
        apiFetch("/admin/events", { method: "GET" }),
        apiFetch("/me", { method: "GET" }),
      ]);

      const data = await eventsRes.json();
      setEvents(data);

      const meData = (await meRes.json()) as MeOut;
      setMe(meData);
    } catch (e: any) {
      const msg = e?.message || "";
      setErr(msg || "Yükleme başarısız.");
      if (msg.toLowerCase().includes("missing") || msg.toLowerCase().includes("invalid")) {
        router.push("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createEvent() {
    if (!name.trim()) return;
    setErr(null);
    try {
      const res = await apiFetch("/admin/events", {
        method: "POST",
        body: JSON.stringify({ name, template_image_url: "placeholder", config: {} }),
      });
      const created = await res.json();
      setName("");
      await load();
      router.push(`/admin/events/${created.id}/editor`);
    } catch (e: any) {
      setErr(e?.message || "Etkinlik oluşturma işlemi başarısız oldu.");
    }
  }

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVars = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  return (
    <div className="flex flex-col gap-10 pb-20 pt-6">
      
      {/* --- DASHBOARD HEADER --- */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-slate-800 bg-slate-900/40 p-1px backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-600/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/90 p-8 md:p-12 relative z-10">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
            {/* Title & User Info */}
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-900/20 border border-violet-500/30 text-violet-400 shadow-[0_0_30px_rgba(124,58,237,0.15)]">
                <LayoutGrid className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Etkinlik Paneli</h1>
                {me ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-slate-400">{me.email}</span>
                    <span className="hidden sm:inline text-slate-700">•</span>
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${me.role === 'superadmin' ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-800 text-slate-300'}`}>
                      {me.role}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[10px] font-bold text-amber-400">
                      <Coins className="h-3 w-3" /> {me.heptacoin_balance} HC
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 h-4 w-48 bg-slate-800 rounded animate-pulse" />
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {me?.role === "superadmin" && (
                <button
                  onClick={() => router.push("/admin/superadmin")}
                  className="group flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-5 py-2.5 text-xs font-bold text-violet-300 transition-all hover:bg-violet-500 hover:text-white shadow-[0_0_20px_rgba(124,58,237,0.1)] hover:shadow-[0_0_30px_rgba(124,58,237,0.3)]"
                >
                  <Shield className="h-4 w-4" />
                  Sistem Otoritesi
                </button>
              )}
              <button
                onClick={() => { clearToken(); router.push("/admin/login"); }}
                className="group flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-2.5 text-xs font-bold text-slate-300 transition-all hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
              >
                <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Güvenli Çıkış
              </button>
            </div>
          </div>

          <hr className="border-slate-800/60 mb-8" />

          {/* Create Event Form */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 group">
              <Zap className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-400 transition-colors" />
              <input
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 py-4 pl-12 pr-4 text-sm font-medium text-slate-200 outline-none transition-all focus:border-amber-500/50 focus:bg-slate-900 focus:ring-4 focus:ring-amber-500/10 placeholder:text-slate-600"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: 2026 Siber Güvenlik Zirvesi Katılım Sertifikası..."
              />
            </div>
            <button
              onClick={createEvent}
              disabled={!name.trim()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-4 text-sm font-black text-slate-950 transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:grayscale active:scale-95"
            >
              <Plus className="h-5 w-5" />
              Yeni Etkinlik
            </button>
          </div>

          <AnimatePresence>
            {err && (
              <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: "auto", marginTop: 16 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden">
                <div className="flex items-center gap-2 text-sm font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
                  <AlertCircle className="h-4 w-4" /> {err}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* --- EVENTS LIST --- */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <FolderKanban className="h-5 w-5 text-slate-500" />
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Aktif Etkinlikler</h2>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-300 ml-auto">
            {events.length} Kayıt
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-500">
            <Loader2 className="h-10 w-10 animate-spin mb-4 text-violet-500" />
            <span className="text-sm font-bold tracking-widest uppercase">Veriler Çekiliyor...</span>
          </div>
        ) : (
          <motion.div variants={containerVars} initial="hidden" animate="show" className="grid gap-4">
            {events.map((ev) => (
              <motion.div key={ev.id} variants={itemVars}>
                <div className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/30 p-6 transition-all hover:border-violet-500/30 hover:bg-slate-900/60 hover:shadow-[0_10px_40px_rgba(124,58,237,0.05)]">
                  
                  {/* Left Highlight Line */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    
                    {/* Event Info */}
                    <div className="flex items-center gap-5 min-w-0">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-500 group-hover:text-violet-400 group-hover:border-violet-500/30 transition-all">
                        <ImageIcon className="h-6 w-6" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-lg font-bold text-slate-200 truncate group-hover:text-white transition-colors">{ev.name}</div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Hash className="h-3.5 w-3.5" /> Sistem ID: {ev.id}
                          </span>
                          <span className="hidden sm:inline text-slate-700">•</span>
                          <span className="flex items-center gap-1 truncate max-w-[250px]">
                            Şablon: {ev.template_image_url !== 'placeholder' ? <span className="text-emerald-400 normal-case">Yüklendi</span> : <span className="text-rose-400 normal-case">Eksik</span>}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/admin/events/${ev.id}/editor`}
                        className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-5 py-3 text-xs font-bold text-violet-300 transition-colors hover:bg-violet-500/20 hover:border-violet-500/40"
                      >
                        <Pencil className="h-4 w-4" />
                        Görsel Editör
                      </Link>

                      <Link
                        href={`/admin/events/${ev.id}/certificates`}
                        className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20 hover:border-emerald-500/40"
                      >
                        <ListChecks className="h-4 w-4" />
                        Üretim & Liste
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {events.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-700 bg-slate-900/20 py-20 text-center">
                <FolderKanban className="h-12 w-12 text-slate-600 mb-4" />
                <h3 className="text-lg font-bold text-slate-300">Henüz Bir Etkinlik Yok</h3>
                <p className="mt-2 text-sm text-slate-500 max-w-sm">Yukarıdaki formu kullanarak ilk sertifika etkinliğinizi oluşturmaya başlayın.</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}