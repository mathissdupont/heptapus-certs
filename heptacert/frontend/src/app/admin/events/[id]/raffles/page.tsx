"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import { useToast } from "@/hooks/useToast";
import {
  apiFetch,
  getMySubscription,
  listEventRaffles,
  createEventRaffle,
  updateEventRaffle,
  deleteEventRaffle,
  drawEventRaffle,
  redrawEventRaffle,
  resetEventRaffle,
  exportEventRaffle,
  type EventRaffleOut,
  type SubscriptionInfo,
} from "@/lib/api";
import {
  Gift,
  Loader2,
  ShieldAlert,
  Sparkles,
  Trophy,
  Ticket,
  Users,
  Target,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  PartyPopper,
  CheckCircle2,
  Medal,
  Download,
  MonitorPlay,
  ExternalLink,
} from "lucide-react";

function fmtDate(value?: string | null) {
  if (!value) return "HenÃ¼z Ã§ekilmedi";
  return new Date(value).toLocaleString("tr-TR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusMeta(status: string) {
  if (status === "drawn") {
    return {
      label: "Kazananlar Ã‡ekildi",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  return {
    label: "Taslak",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

function formatWinnerPlan(winnerCount: number, reserveWinnerCount: number) {
  if (reserveWinnerCount > 0) {
    return `${winnerCount} asil + ${reserveWinnerCount} yedek`;
  }
  return `${winnerCount} kazanan`;
}

function splitRaffleRounds(raffle: EventRaffleOut) {
  const chunkSize = Math.max(1, raffle.winner_count + raffle.reserve_winner_count);
  const rounds: Array<{
    round: number;
    primary: EventRaffleOut["winners"];
    reserve: EventRaffleOut["winners"];
  }> = [];

  for (let index = 0; index < raffle.winners.length; index += chunkSize) {
    const chunk = raffle.winners.slice(index, index + chunkSize);
    rounds.push({
      round: rounds.length + 1,
      primary: chunk.slice(0, raffle.winner_count),
      reserve: chunk.slice(raffle.winner_count),
    });
  }

  return rounds;
}

export default function EventRafflesPage() {
  const params = useParams();
  const eventId = Number(params?.id);
  const toast = useToast();

  const [eventName, setEventName] = useState("");
  const [raffles, setRaffles] = useState<EventRaffleOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [planOk, setPlanOk] = useState<boolean | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [prizeName, setPrizeName] = useState("");
  const [description, setDescription] = useState("");
  const [minSessionsRequired, setMinSessionsRequired] = useState(1);
  const [winnerCount, setWinnerCount] = useState(1);
  const [reserveWinnerCount, setReserveWinnerCount] = useState(1);
  const previewWinnerPlan = formatWinnerPlan(winnerCount, reserveWinnerCount);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [eventRes, raffleRes, subInfo] = await Promise.all([
        apiFetch(`/admin/events/${eventId}`).then((r) => r.json()),
        listEventRaffles(eventId).catch(() => []),
        getMySubscription().catch(
          () => ({ active: false, plan_id: null, expires_at: null, role: null } as SubscriptionInfo),
        ),
      ]);
      const hasPaidPlan =
        subInfo.role === "superadmin" ||
        (subInfo.active && ["pro", "growth", "enterprise"].includes(subInfo.plan_id ?? ""));

      setEventName(eventRes.name);
      setRaffles(raffleRes);
      setPlanOk(hasPaidPlan);
    } catch (e: any) {
      setError(e.message || "Ã‡ekiliÅŸler yÃ¼klenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (eventId) load();
  }, [eventId]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setPrizeName("");
    setDescription("");
    setMinSessionsRequired(1);
    setWinnerCount(1);
    setReserveWinnerCount(1);
  }

  function startEdit(raffle: EventRaffleOut) {
    setEditingId(raffle.id);
    setTitle(raffle.title);
    setPrizeName(raffle.prize_name);
    setDescription(raffle.description || "");
    setMinSessionsRequired(raffle.min_sessions_required);
    setWinnerCount(raffle.winner_count);
    setReserveWinnerCount(raffle.reserve_winner_count);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        prize_name: prizeName.trim(),
        description: description.trim() || undefined,
        min_sessions_required: Math.max(1, minSessionsRequired),
        winner_count: Math.max(1, winnerCount),
        reserve_winner_count: Math.max(0, reserveWinnerCount),
      };
      if (editingId) {
        await updateEventRaffle(eventId, editingId, payload);
        toast.success("Ã‡ekiliÅŸ gÃ¼ncellendi.");
      } else {
        await createEventRaffle(eventId, payload);
        toast.success("Yeni Ã§ekiliÅŸ eklendi.");
      }
      resetForm();
      await load();
    } catch (e: any) {
      setError(e.message || "Kaydetme baÅŸarÄ±sÄ±z.");
      toast.error(e.message || "Kaydetme baÅŸarÄ±sÄ±z.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(raffle: EventRaffleOut) {
    if (!confirm(`"${raffle.title}" Ã§ekiliÅŸini silmek istediÄŸinize emin misiniz?`)) return;
    setBusyId(raffle.id);
    try {
      await deleteEventRaffle(eventId, raffle.id);
      toast.success("Ã‡ekiliÅŸ silindi.");
      if (editingId === raffle.id) resetForm();
      await load();
    } catch (e: any) {
      setError(e.message || "Silme baÅŸarÄ±sÄ±z.");
      toast.error(e.message || "Silme baÅŸarÄ±sÄ±z.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDraw(raffle: EventRaffleOut) {
    if (!confirm(`"${raffle.title}" iÃ§in kazananlarÄ± ÅŸimdi Ã§ekmek istiyor musunuz?`)) return;
    setBusyId(raffle.id);
    try {
      await drawEventRaffle(eventId, raffle.id);
      toast.success("Kazananlar Ã§ekildi.");
      await load();
    } catch (e: any) {
      setError(e.message || "Ã‡ekiliÅŸ baÅŸlatÄ±lamadÄ±.");
      toast.error(e.message || "Ã‡ekiliÅŸ baÅŸlatÄ±lamadÄ±.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReset(raffle: EventRaffleOut) {
    if (!confirm(`"${raffle.title}" iÃ§in mevcut kazananlarÄ± temizlemek istiyor musunuz?`)) return;
    setBusyId(raffle.id);
    try {
      await resetEventRaffle(eventId, raffle.id);
      toast.success("Ã‡ekiliÅŸ sÄ±fÄ±rlandÄ±.");
      await load();
    } catch (e: any) {
      setError(e.message || "SÄ±fÄ±rlama baÅŸarÄ±sÄ±z.");
      toast.error(e.message || "SÄ±fÄ±rlama baÅŸarÄ±sÄ±z.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRedraw(raffle: EventRaffleOut) {
    if (!confirm(`"${raffle.title}" iÃ§in yeni tur Ã§ekip Ã¶nceki kazananlarÄ± hariÃ§ tutmak istiyor musunuz?`)) return;
    setBusyId(raffle.id);
    try {
      await redrawEventRaffle(eventId, raffle.id);
      toast.success("Yeni kazanan turu eklendi.");
      await load();
    } catch (e: any) {
      setError(e.message || "Tekrar Ã§ekiliÅŸ baÅŸlatÄ±lamadÄ±.");
      toast.error(e.message || "Tekrar Ã§ekiliÅŸ baÅŸlatÄ±lamadÄ±.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleExport(raffle: EventRaffleOut) {
    setBusyId(raffle.id);
    try {
      const { blob, filename } = await exportEventRaffle(eventId, raffle.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Ã‡ekiliÅŸ sonucu dÄ±ÅŸa aktarÄ±ldÄ±.");
    } catch (e: any) {
      setError(e.message || "DÄ±ÅŸa aktarma baÅŸarÄ±sÄ±z.");
      toast.error(e.message || "DÄ±ÅŸa aktarma baÅŸarÄ±sÄ±z.");
    } finally {
      setBusyId(null);
    }
  }

  const stats = useMemo(() => {
    const totalWinners = raffles.reduce((sum, raffle) => sum + raffle.winners.length, 0);
    const drawCompleted = raffles.filter((raffle) => raffle.status === "drawn").length;
    const totalEligible = raffles.reduce((sum, raffle) => sum + raffle.eligible_count, 0);
    return { totalWinners, drawCompleted, totalEligible };
  }, [raffles]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <EventAdminNav eventId={eventId} eventName={eventName} active="raffles" className="mb-6 flex flex-col gap-2" />

        {planOk === false && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center">
            <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-amber-400" />
            <h2 className="mb-2 text-lg font-bold text-gray-800">Pro veya Enterprise plan gerekli</h2>
            <p className="mx-auto mb-4 max-w-md text-sm text-gray-500">
              Ã‡oklu oturum katÄ±lÄ±mÄ±na gÃ¶re Ã§ekiliÅŸ oluÅŸturma ve kazanan seÃ§me Ã¶zellikleri Ã¼cretli planlarda kullanÄ±labilir.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
            >
              <Sparkles className="h-4 w-4" /> PlanÄ± YÃ¼kselt
            </Link>
          </div>
        )}

        {planOk !== false && (
          <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="space-y-6">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.18),_transparent_42%),linear-gradient(135deg,_#ffffff_22%,_#fff7ed_100%)] px-6 py-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                    <PartyPopper className="h-3.5 w-3.5" />
                    Etkinlik iÃ§i Ã¶dÃ¼l akÄ±ÅŸÄ±
                  </div>
                  <h1 className="mt-4 text-2xl font-black text-slate-900">
                    {editingId ? "Ã‡ekiliÅŸi DÃ¼zenle" : "Yeni Ã‡ekiliÅŸ OluÅŸtur"}
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Kurumlar aynÄ± etkinliÄŸe birden fazla Ã§ekiliÅŸ ekleyebilir. Her Ã§ekiliÅŸ kendi oturum eÅŸiÄŸi ve kazanan sayÄ±sÄ±yla yÃ¶netilir.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 p-6">
                  <div>
                    <label className="label">Ã‡ekiliÅŸ BaÅŸlÄ±ÄŸÄ±</label>
                    <input
                      className="input-field"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ã–rn. VIP KulaklÄ±k Ã‡ekiliÅŸi"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Hediye / ÃœrÃ¼n</label>
                    <input
                      className="input-field"
                      value={prizeName}
                      onChange={(e) => setPrizeName(e.target.value)}
                      placeholder="Ã–rn. 1 adet kablosuz kulaklÄ±k"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">KÄ±sa AÃ§Ä±klama</label>
                    <textarea
                      className="input-field min-h-[100px]"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ã‡ekiliÅŸ sonunda hangi Ã¼rÃ¼nÃ¼n, hangi katÄ±lÄ±m koÅŸuluyla verileceÄŸini kÄ±saca anlatÄ±n."
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="label">Minimum Oturum</label>
                      <div className="relative">
                        <Target className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          min={1}
                          max={1000}
                          className="input-field pl-10"
                          value={minSessionsRequired}
                          onChange={(e) => setMinSessionsRequired(Math.max(1, Number(e.target.value || 1)))}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Kazanan SayÄ±sÄ±</label>
                      <div className="relative">
                        <Trophy className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          min={1}
                          max={100}
                          className="input-field pl-10"
                          value={winnerCount}
                          onChange={(e) => setWinnerCount(Math.max(1, Number(e.target.value || 1)))}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Yedek Kazanan</label>
                      <div className="relative">
                        <Users className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="input-field pl-10"
                          value={reserveWinnerCount}
                          onChange={(e) => setReserveWinnerCount(Math.max(0, Number(e.target.value || 0)))}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {error && <div className="error-banner">{error}</div>}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {editingId ? "Ã‡ekiliÅŸi GÃ¼ncelle" : "Ã‡ekiliÅŸ Ekle"}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        DÃ¼zenlemeyi Ä°ptal Et
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Ã–zet</p>
                    <p className="text-xs text-slate-500">Mevcut Ã§ekiliÅŸ gÃ¶rÃ¼nÃ¼mÃ¼</p>
                  </div>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Tur PlanÃ„Â±</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/80 bg-white px-3 py-3">
                        <p className="text-2xl font-black text-slate-900">{winnerCount}</p>
                        <p className="text-xs text-slate-500">asil kazanan</p>
                      </div>
                      <div className="rounded-2xl border border-white/80 bg-white px-3 py-3">
                        <p className="text-2xl font-black text-slate-900">{reserveWinnerCount}</p>
                        <p className="text-xs text-slate-500">yedek kazanan</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">BaÅŸlÄ±k</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{title || "Ã‡ekiliÅŸ baÅŸlÄ±ÄŸÄ±nÄ±z burada gÃ¶rÃ¼nÃ¼r"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">KatÄ±lÄ±m KuralÄ±</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      En az {minSessionsRequired} oturuma katÄ±lanlar arasÄ±ndan {winnerCount} kiÅŸi seÃ§ilecek
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Hediye</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{prizeName || "Hediye / Ã¼rÃ¼n bilgisi"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                      <Ticket className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Toplam Ã‡ekiliÅŸ</p>
                      <p className="text-2xl font-black text-slate-900">{raffles.length}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Tamamlanan Draw</p>
                      <p className="text-2xl font-black text-slate-900">{stats.drawCompleted}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Toplam Uygun Aday</p>
                      <p className="text-2xl font-black text-slate-900">{stats.totalEligible}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Etkinlik Ã‡ekiliÅŸleri</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Her kart, oturum eÅŸiÄŸine gÃ¶re ayrÄ± bir Ã§ekiliÅŸi temsil eder. Toplam seÃ§ilen kazanan: {stats.totalWinners}
                    </p>
                  </div>
                </div>

                {raffles.length === 0 ? (
                  <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                    <Gift className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-4 text-lg font-semibold text-slate-800">HenÃ¼z Ã§ekiliÅŸ eklenmedi</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Ä°lk Ã§ekiliÅŸi oluÅŸturarak belirli sayÄ±da oturuma katÄ±lanlar iÃ§in Ã¶dÃ¼l akÄ±ÅŸÄ±nÄ± baÅŸlatabilirsiniz.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-5">
                    {raffles.map((raffle) => {
                      const meta = statusMeta(raffle.status);
                      const busy = busyId === raffle.id;
                      const rounds = splitRaffleRounds(raffle);
                      const drawPlan = formatWinnerPlan(raffle.winner_count, raffle.reserve_winner_count);
                      const roundCapacity = raffle.winner_count + raffle.reserve_winner_count;
                      return (
                        <div key={raffle.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                          <div className="border-b border-slate-100 bg-[linear-gradient(135deg,_#fff7ed_0%,_#ffffff_58%,_#f8fafc_100%)] px-5 py-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                  <Medal className="h-3.5 w-3.5" />
                                  {raffle.prize_name}
                                </div>
                                <h3 className="text-lg font-black text-slate-900">{raffle.title}</h3>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                  {raffle.description || "Bu Ã§ekiliÅŸ iÃ§in ek aÃ§Ä±klama girilmedi."}
                                </p>
                              </div>
                              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}>
                                {meta.label}
                              </span>
                            </div>
                          </div>

                          <div className="grid gap-5 p-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
                            <div className="space-y-4">
                              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">KatÄ±lÄ±m EÅŸiÄŸi</p>
                                  <p className="mt-2 text-lg font-black text-slate-900">{raffle.min_sessions_required}</p>
                                  <p className="text-xs text-slate-500">minimum oturum</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Kazanan SayÄ±sÄ±</p>
                                  <p className="mt-2 text-lg font-black text-slate-900">{raffle.winner_count}</p>
                                  <p className="text-xs text-slate-500">planlanan kiÅŸi</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Uygun Aday</p>
                                  <p className="mt-2 text-lg font-black text-slate-900">{raffle.eligible_count}</p>
                                  <p className="text-xs text-slate-500">toplam {raffle.total_attendees} katÄ±lÄ±mcÄ± iÃ§inden</p>
                                </div>
                              </div>

                              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">Kazananlar</p>
                                    <p className="text-xs text-slate-500">Son Ã§ekiliÅŸ zamanÄ±: {fmtDate(raffle.drawn_at)}</p>
                                  </div>
                                  {raffle.eligible_count > 0 && raffle.eligible_count < roundCapacity && (
                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                      Uygun aday sayÄ±sÄ± planlanandan az
                                    </span>
                                  )}
                                </div>

                                {raffle.winners.length === 0 ? (
                                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                                    Bu Ã§ekiliÅŸ iÃ§in henÃ¼z kazanan seÃ§ilmedi.
                                  </div>
                                ) : (
                                  <div className="mt-4 space-y-4">
                                    {rounds.map((roundData) => {
                                      const roundDrawnAt =
                                        roundData.primary[0]?.drawn_at ?? roundData.reserve[0]?.drawn_at ?? raffle.drawn_at;

                                      return (
                                        <div
                                          key={`${raffle.id}-round-${roundData.round}`}
                                          className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4"
                                        >
                                          <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                              <p className="text-sm font-semibold text-slate-900">Tur {roundData.round}</p>
                                              <p className="text-xs text-slate-500">
                                                {roundData.primary.length} asil
                                                {raffle.reserve_winner_count > 0 ? ` â€¢ ${roundData.reserve.length} yedek` : ""}
                                              </p>
                                            </div>
                                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                                              {fmtDate(roundDrawnAt)}
                                            </span>
                                          </div>

                                          <div
                                            className={`mt-4 grid gap-3 ${
                                              raffle.reserve_winner_count > 0 ? "xl:grid-cols-2" : ""
                                            }`}
                                          >
                                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                                              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                                                Asil Kazananlar
                                              </p>
                                              <div className="space-y-2">
                                                {roundData.primary.map((winner, index) => (
                                                  <div
                                                    key={`${raffle.id}-${roundData.round}-primary-${winner.attendee_id}`}
                                                    className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-white/80 px-4 py-3"
                                                  >
                                                    <div className="min-w-0">
                                                      <p className="truncate text-sm font-semibold text-emerald-900">
                                                        {index + 1}. {winner.attendee_name}
                                                      </p>
                                                      <p className="truncate text-xs text-emerald-700">{winner.attendee_email}</p>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                      <p className="text-xs font-semibold text-emerald-800">
                                                        {winner.sessions_attended} oturum
                                                      </p>
                                                      <p className="text-[11px] text-emerald-700">{fmtDate(winner.drawn_at)}</p>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>

                                            {raffle.reserve_winner_count > 0 && (
                                              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                                                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                                                  Yedek Kazananlar
                                                </p>
                                                {roundData.reserve.length === 0 ? (
                                                  <div className="rounded-2xl border border-dashed border-amber-300 bg-white/70 px-4 py-6 text-center text-sm text-amber-700">
                                                    Bu turda yedek kazanan ÃƒÂ§Ã„Â±kmadÃ„Â±.
                                                  </div>
                                                ) : (
                                                  <div className="space-y-2">
                                                    {roundData.reserve.map((winner, index) => (
                                                      <div
                                                        key={`${raffle.id}-${roundData.round}-reserve-${winner.attendee_id}`}
                                                        className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white/80 px-4 py-3"
                                                      >
                                                        <div className="min-w-0">
                                                          <p className="truncate text-sm font-semibold text-amber-900">
                                                            {index + 1}. {winner.attendee_name}
                                                          </p>
                                                          <p className="truncate text-xs text-amber-700">{winner.attendee_email}</p>
                                                        </div>
                                                        <div className="shrink-0 text-right">
                                                          <p className="text-xs font-semibold text-amber-800">
                                                            {winner.sessions_attended} oturum
                                                          </p>
                                                          <p className="text-[11px] text-amber-700">{fmtDate(winner.drawn_at)}</p>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="rounded-3xl border border-indigo-100 bg-[linear-gradient(135deg,_rgba(99,102,241,0.08),_rgba(249,115,22,0.08))] p-4">
                                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Tur Kurgusu</p>
                                <p className="mt-3 text-lg font-black text-slate-900">{drawPlan}</p>
                                <div className="mt-4 space-y-3">
                                  <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Katilim Kurali</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                      En az {raffle.min_sessions_required} oturuma katilanlar havuza girer.
                                    </p>
                                  </div>
                                  <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tekrar Cek Mantigi</p>
                                    <p className="mt-1 text-sm leading-6 text-slate-700">
                                      Tekrar cek, onceki asil ve yedekleri havuz disinda birakarak yeni bir tur ekler.
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Cekilis Aksiyonlari</p>
                                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                    {rounds.length} tur
                                  </span>
                                </div>
                                <div className="mt-4 grid gap-3">
                                  <Link
                                    href={`/admin/events/${eventId}/raffles/${raffle.id}/present`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-900 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                                  >
                                    <MonitorPlay className="h-4 w-4" />
                                    Sunum Modu
                                    <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => handleDraw(raffle)}
                                    disabled={busy || raffle.eligible_count === 0 || raffle.winners.length > 0}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                                    Kazananlari Cek
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRedraw(raffle)}
                                    disabled={busy || raffle.winners.length === 0 || raffle.eligible_count <= raffle.winners.length}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                                  >
                                    <PartyPopper className="h-4 w-4" />
                                    Tekrar Cek
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startEdit(raffle)}
                                    disabled={busy}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Duzenle
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReset(raffle)}
                                    disabled={busy || raffle.winners.length === 0}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                    Sonucu Sifirla
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleExport(raffle)}
                                    disabled={busy || raffle.winners.length === 0}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                                  >
                                    <Download className="h-4 w-4" />
                                    Sonucu Disa Aktar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(raffle)}
                                    disabled={busy}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Cekilisi Sil
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

