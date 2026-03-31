"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, clearToken, getMySubscription, type SubscriptionInfo } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, LayoutGrid, Image as ImageIcon, Hash,
  AlertCircle, Loader2, Shield, ListChecks, Pencil, Coins,
  Zap, FolderKanban, Trash2, Check, X, Settings, Link2, ClipboardCheck,
  Search, Sparkles, CalendarRange,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/Admin/PageHeader";
import ConfirmModal from "@/components/Admin/ConfirmModal";
import EmptyState from "@/components/Admin/EmptyState";
import { StatCard } from "@/components/Admin/StatCard";

type EventOut = { id: number; name: string; template_image_url: string; config: any };
type MeOut = { id: number; email: string; role: "admin" | "superadmin"; heptacoin_balance: number };
type EventStat = { event_id: number; active: number; total: number };

export default function AdminEvents() {
  const toast = useToast();
  const [events, setEvents] = useState<EventOut[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeOut | null>(null);

  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [certStats, setCertStats] = useState<Record<number, EventStat>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [hasPaidPlan, setHasPaidPlan] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

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
      apiFetch("/admin/dashboard/stats")
        .then((r) => r.json())
        .then((d: { events_with_stats?: EventStat[] }) => {
          const map: Record<number, EventStat> = {};
          (d.events_with_stats || []).forEach((s) => { map[s.event_id] = s; });
          setCertStats(map);
        })
        .catch(() => {});
      getMySubscription()
        .then((sub) => {
          if (sub.role === "superadmin" || (sub.active && ["pro", "growth", "enterprise"].includes(sub.plan_id ?? ""))) {
            setHasPaidPlan(true);
          }
        })
        .catch(() => {});
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
    setCreating(true);
    try {
      const res = await apiFetch("/admin/events", {
        method: "POST",
        body: JSON.stringify({ name, template_image_url: "placeholder", config: {} }),
      });
      const created = await res.json();
      setName("");
      toast.success(`"${created.name}" etkinliği oluşturuldu.`);
      await load();
      router.push(`/admin/events/${created.id}/editor`);
    } catch (e: any) {
      setErr(e?.message || "Etkinlik oluşturma işlemi başarısız oldu.");
    } finally {
      setCreating(false);
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
      toast.success("Etkinlik yeniden adlandırıldı.");
      setRenamingId(null);
      await load();
    } catch (e: any) {
      setErr(e?.message || "Yeniden adlandırma başarısız.");
    }
  }

  async function deleteEvent() {
    if (!deleteTargetId) return;
    setDeleting(true);
    setErr(null);
    try {
      await apiFetch(`/admin/events/${deleteTargetId}`, { method: "DELETE" });
      toast.success("Etkinlik silindi.");
      setDeleteTargetId(null);
      await load();
    } catch (e: any) {
      setErr(e?.message || "Silme işlemi başarısız.");
    } finally {
      setDeleting(false);
    }
  }

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const itemVars = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
  };
  const totalCertificates = Object.values(certStats).reduce((sum, stat) => sum + (stat?.total || 0), 0);
  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((event) =>
      [event.name, event.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [events, search]);

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader
        title="Etkinlikler"
        subtitle="Etkinlikler, oturumlar ve sertifikalar"
        icon={<LayoutGrid className="h-5 w-5" />}
        actions={
          me ? (
            <div className="flex items-center gap-2 flex-wrap">
              {me.heptacoin_balance > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-700">
                  <Coins className="h-3.5 w-3.5" /> {me.heptacoin_balance} HC
                </span>
              )}
              {me.role === "superadmin" && (
                <button onClick={() => router.push("/admin/superadmin")} className="btn-secondary gap-2 text-xs">
                  <Shield className="h-3.5 w-3.5" /> Superadmin
                </button>
              )}
            </div>
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Toplam Etkinlik" value={events.length} icon={<CalendarRange className="h-5 w-5 text-brand-600" />} />
        <StatCard label="Toplam Sertifika" value={totalCertificates} icon={<ListChecks className="h-5 w-5 text-emerald-600" />} iconBg="bg-emerald-50 text-emerald-600" />
        <StatCard label="Plan Durumu" value={hasPaidPlan ? "Premium" : "Baslangic"} icon={<Sparkles className="h-5 w-5 text-amber-600" />} iconBg="bg-amber-50 text-amber-600" />
        <StatCard label="Bakiye" value={`${me?.heptacoin_balance ?? 0} HC`} icon={<Coins className="h-5 w-5 text-sky-600" />} iconBg="bg-sky-50 text-sky-600" />
      </div>

      {/* Create Event */}
      <div className="card overflow-hidden p-5">
        <div className="grid gap-4 lg:grid-cols-[1.25fr,0.95fr]">
          <div className="rounded-[24px] border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white p-3 text-brand-600 shadow-soft">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-surface-900">Yeni etkinlik akisi</h2>
                <p className="mt-1 text-sm leading-6 text-surface-500">
                  Etkinligi olusturduktan sonra editor, oturumlar, sertifikalar ve cekilis gibi alt modullere direkt gecebilirsin.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Zap className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  className="input-field pl-10"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createEvent()}
                  placeholder="Yeni etkinlik adi..."
                />
              </div>
              <button onClick={createEvent} disabled={!name.trim() || creating} className="btn-primary gap-2 px-6">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Yeni Etkinlik
              </button>
            </div>
          </div>
          <div className="rounded-[24px] border border-surface-200 bg-surface-50/80 p-5">
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-surface-400">
              Etkinliklerde Ara
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                className="input-field pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ad veya ID ile ara"
              />
            </div>
            <p className="mt-3 text-sm text-surface-500">
              {filteredEvents.length === events.length
                ? `${events.length} etkinlik goruntuleniyor.`
                : `${filteredEvents.length} etkinlik filtreye uyuyor.`}
            </p>
          </div>
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

      {/* Events List */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <FolderKanban className="h-4 w-4 text-surface-400" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-surface-400">Aktif Etkinlikler</h2>
          <span className="rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-bold text-surface-500 ml-auto">
            {events.length} Etkinlik
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-surface-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 rounded bg-surface-100" />
                    <div className="h-3 w-32 rounded bg-surface-100" />
                  </div>
                  <div className="h-8 w-64 rounded-xl bg-surface-100 hidden sm:block" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <motion.div variants={containerVars} initial="hidden" animate="show" className="grid gap-3">
            {events.length === 0 ? (
              <EmptyState
                title="Henüz Etkinlik Yok"
                description="Yukarıdaki formu kullanarak ilk sertifika etkinliğinizi oluşturun."
                icon={<FolderKanban className="h-8 w-8" />}
              />
            ) : filteredEvents.length === 0 ? (
              <EmptyState
                title="Aramaya uyan etkinlik bulunamadi"
                description="Arama terimini temizleyerek tum etkinlikleri yeniden listeleyebilirsin."
                icon={<Search className="h-8 w-8" />}
                action={
                  <button onClick={() => setSearch("")} className="btn-secondary">
                    Filtreyi Temizle
                  </button>
                }
              />
            ) : (
              filteredEvents.map((ev) => (
                <motion.div key={ev.id} variants={itemVars}>
                  <div className="group card p-5 hover:shadow-lifted transition-all duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-50 border border-surface-200 text-surface-400 group-hover:text-brand-600 group-hover:bg-brand-50 group-hover:border-brand-100 transition-all">
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
                            <button onClick={() => saveRename(ev.id)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                              <Check className="h-4 w-4" />
                            </button>
                            <button onClick={() => setRenamingId(null)} className="p-1.5 rounded-lg bg-surface-100 text-surface-500 hover:bg-surface-200 transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <div className="font-semibold text-surface-800 truncate">{ev.name}</div>
                            <div className="mt-0.5 flex items-center gap-3 text-[11px] text-surface-400 font-medium">
                              <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> ID {ev.id}</span>
                              <span>·</span>
                              <span>Şablon: {ev.template_image_url !== "placeholder" ? <span className="text-emerald-600">Yüklendi</span> : <span className="text-rose-500">Eksik</span>}</span>
                              {certStats[ev.id] && (
                                <>
                                  <span>·</span>
                                  <span className="text-surface-500">{certStats[ev.id].total} sertifika</span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {renamingId !== ev.id && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => { setRenamingId(ev.id); setRenameValue(ev.name); }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-600 hover:border-brand-200 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Yeniden Adlandır
                          </button>
                          <Link href={`/admin/events/${ev.id}/editor`} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors">
                            <Pencil className="h-3.5 w-3.5" /> Editör
                          </Link>
                          <Link href={`/admin/events/${ev.id}/certificates`} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                            <ListChecks className="h-3.5 w-3.5" /> Sertifikalar
                            {certStats[ev.id] && (
                              <span className="ml-0.5 rounded-full bg-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                {certStats[ev.id].total}
                              </span>
                            )}
                          </Link>
                          <Link href={`/admin/events/${ev.id}/sessions`} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${hasPaidPlan ? "border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : "border-surface-200 bg-surface-50 text-surface-400 cursor-not-allowed"}`} title={hasPaidPlan ? undefined : "Pro veya Enterprise plan gerekli"}>
                            <Hash className="h-3.5 w-3.5" /> Oturumlar
                          </Link>
                          {hasPaidPlan && (
                            <button onClick={() => copyRegisterLink(ev.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors">
                              {copiedId === ev.id ? <><ClipboardCheck className="h-3.5 w-3.5" /> Kopyalandı!</> : <><Link2 className="h-3.5 w-3.5" /> Kayıt Linki</>}
                            </button>
                          )}
                          <button onClick={() => setDeleteTargetId(ev.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" /> Sil
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </div>

      <ConfirmModal
        open={deleteTargetId !== null}
        title="Etkinliği sil"
        description={`"${events.find(e => e.id === deleteTargetId)?.name ?? ""}" etkinliğini ve tüm sertifikalarını kalıcı olarak silmek istediğinizden emin misiniz?`}
        danger
        loading={deleting}
        onConfirm={deleteEvent}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
