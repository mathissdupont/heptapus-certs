"use client";

import { useEffect, useState } from "react";
import { apiFetch, clearToken, getMySubscription, type SubscriptionInfo } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, LogOut, LayoutGrid, Image as ImageIcon, Hash,
  AlertCircle, Loader2, Shield, ListChecks, Pencil, Coins,
  Zap, FolderKanban, Trash2, Check, X, Settings, Link2, ClipboardCheck,
} from "lucide-react";

type EventOut = { id: number; name: string; template_image_url: string; config: any };
type MeOut = { id: number; email: string; role: "admin" | "superadmin"; heptacoin_balance: number };
type EventStat = { event_id: number; active: number; total: number };

export default function AdminEvents() {
  const [events, setEvents] = useState<EventOut[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeOut | null>(null);

  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [certStats, setCertStats] = useState<Record<number, EventStat>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [hasPaidPlan, setHasPaidPlan] = useState(false);

  function copyRegisterLink(id: number) {
    const url = `${window.location.origin}/events/${id}/register`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  const router = useRouter();

  async function load() {
    setErr(null);
    try {
      const [eventsRes, meRes] = await Promise.all([
        apiFetch("/admin/events", { method: "GET" }),
        apiFetch("/me", { method: "GET" }),
      ]);
      setEvents(await eventsRes.json());
      const meData = (await meRes.json()) as MeOut;
      setMe(meData);
      // Load cert stats (non-blocking)
      apiFetch("/admin/dashboard/stats")
        .then((r) => r.json())
        .then((d: { events_with_stats?: EventStat[] }) => {
          const map: Record<number, EventStat> = {};
          (d.events_with_stats || []).forEach((s) => { map[s.event_id] = s; });
          setCertStats(map);
        })
        .catch((e) => {
          console.error("Failed to load cert stats:", e);
        });
      // Load subscription (non-blocking)
      getMySubscription()
        .then((sub) => {
          if (sub.role === "superadmin" || (sub.active && ["pro", "growth", "enterprise"].includes(sub.plan_id ?? ""))) {
            setHasPaidPlan(true);
          }
        })
        .catch((e) => {
          console.error("Failed to load subscription:", e);
        });
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

  async function saveRename(id: number) {
    if (!renameValue.trim()) return;
    setErr(null);
    try {
      await apiFetch(`/admin/events/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      setRenamingId(null);
      await load();
    } catch (e: any) {
      setErr(e?.message || "Yeniden adlandırma başarısız.");
    }
  }

  async function deleteEvent(id: number) {
    setErr(null);
    try {
      await apiFetch(`/admin/events/${id}`, { method: "DELETE" });
      setDeletingId(null);
      await load();
    } catch (e: any) {
      setErr(e?.message || "Silme işlemi başarısız.");
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
    <div className="flex flex-col gap-8 pb-20 pt-6">

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-0 overflow-hidden"
      >
        <div className="bg-gradient-to-r from-brand-600 to-indigo-700 px-8 py-1.5" />
        <div className="p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-100">
                <LayoutGrid className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Yönetim Paneli</h1>
                <p className="text-sm text-gray-500 mt-0.5">Etkinlikler, oturumlar ve sertifikalar</p>
                {me ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-gray-500">{me.email}</span>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${me.role === "superadmin" ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>
                      {me.role}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      <Coins className="h-3 w-3" /> {me.heptacoin_balance} HC
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 h-4 w-48 bg-gray-100 rounded animate-pulse" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/admin/settings" className="btn-ghost gap-2 text-xs px-4 py-2">
                <Settings className="h-4 w-4" /> Ayarlar
              </Link>
              {me?.role === "superadmin" && (
                <button
                  onClick={() => router.push("/admin/superadmin")}
                  className="btn-secondary gap-2 text-xs px-4 py-2"
                >
                  <Shield className="h-4 w-4" /> Sistem Otoritesi
                </button>
              )}
              <button
                onClick={() => { clearToken(); router.push("/admin/login"); }}
                className="btn-ghost gap-2 text-xs px-4 py-2 text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> Çıkış
              </button>
            </div>
          </div>

          <hr className="border-gray-100 mb-6" />

          {/* Create Event */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Zap className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="input-field pl-10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createEvent()}
                placeholder="Yeni etkinlik adı..."
              />
            </div>
            <button onClick={createEvent} disabled={!name.trim()} className="btn-primary gap-2 px-6">
              <Plus className="h-4 w-4" /> Yeni Etkinlik
            </button>
          </div>

          <AnimatePresence>
            {err && (
              <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: "auto", marginTop: 12 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden">
                <div className="error-banner flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> {err}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* EVENTS LIST */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <FolderKanban className="h-4 w-4 text-gray-400" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Aktif Etkinlikler</h2>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-500 ml-auto">
            {events.length} Etkinlik
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mb-3 text-brand-500" />
            <span className="text-sm font-medium">Yükleniyor...</span>
          </div>
        ) : (
          <motion.div variants={containerVars} initial="hidden" animate="show" className="grid gap-3">
            {events.map((ev) => (
              <motion.div key={ev.id} variants={itemVars}>
                <div className="group card p-5 hover:shadow-card transition-all duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                    {/* Event Info / Rename */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 border border-gray-200 text-gray-400 group-hover:text-brand-600 group-hover:bg-brand-50 group-hover:border-brand-100 transition-all">
                        <ImageIcon className="h-5 w-5" />
                      </div>

                      {renamingId === ev.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            className="input-field py-1.5 text-sm flex-1"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRename(ev.id);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            autoFocus
                          />
                          <button onClick={() => saveRename(ev.id)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => setRenamingId(null)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-800 truncate">{ev.name}</div>
                          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-gray-400 font-medium">
                            <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> ID {ev.id}</span>
                            <span>·</span>
                            <span>Şablon: {ev.template_image_url !== "placeholder" ? <span className="text-emerald-600">Yüklendi</span> : <span className="text-rose-500">Eksik</span>}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {renamingId !== ev.id && (
                      <div className="flex flex-wrap items-center gap-2">
                        {deletingId === ev.id ? (
                          <>
                            <span className="text-xs text-gray-500 font-medium">Silmek istediğinize emin misiniz?</span>
                            <button onClick={() => deleteEvent(ev.id)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> Evet, Sil
                            </button>
                            <button onClick={() => setDeletingId(null)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-bold hover:bg-gray-200 flex items-center gap-1">
                              <X className="h-3.5 w-3.5" /> İptal
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setRenamingId(ev.id); setRenameValue(ev.name); }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 hover:border-brand-200 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Yeniden Adlandır
                            </button>
                            <Link
                              href={`/admin/events/${ev.id}/editor`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Editör
                            </Link>
                            <Link
                              href={`/admin/events/${ev.id}/certificates`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                            >
                              <ListChecks className="h-3.5 w-3.5" /> Sertifikalar
                              {certStats[ev.id] && (
                                <span className="ml-1 rounded-full bg-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                  {certStats[ev.id].total}
                                </span>
                              )}
                            </Link>
                            <Link
                              href={`/admin/events/${ev.id}/sessions`}
                              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${hasPaidPlan ? "border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"}`}
                              title={hasPaidPlan ? undefined : "Pro veya Enterprise plan gerekli"}
                            >
                              <Hash className="h-3.5 w-3.5" /> Oturumlar
                            </Link>
                            <Link
                              href={`/admin/events/${ev.id}/attendees`}
                              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${hasPaidPlan ? "border-violet-100 bg-violet-50 text-violet-700 hover:bg-violet-100" : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"}`}
                              title={hasPaidPlan ? undefined : "Pro veya Enterprise plan gerekli"}
                            >
                              <FolderKanban className="h-3.5 w-3.5" /> Katılım
                            </Link>
                            {hasPaidPlan && (
                            <button
                              onClick={() => copyRegisterLink(ev.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-100 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors"
                            >
                              {copiedId === ev.id
                                ? <><ClipboardCheck className="h-3.5 w-3.5" /> Kopyalandı!</>
                                : <><Link2 className="h-3.5 w-3.5" /> Kayıt Linki</>
                              }
                            </button>
                            )}
                            <button
                              onClick={() => setDeletingId(ev.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Sil
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {events.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-20 text-center">
                <FolderKanban className="h-10 w-10 text-gray-300 mb-4" />
                <h3 className="text-base font-semibold text-gray-600">Henüz Bir Etkinlik Yok</h3>
                <p className="mt-1 text-sm text-gray-400 max-w-xs">Yukarıdaki formu kullanarak ilk sertifika etkinliğinizi oluşturun.</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
