"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import EventAdminNav from "@/components/Admin/EventAdminNav";
import PageHeader from "@/components/Admin/PageHeader";
import { useToast } from "@/hooks/useToast";
import {
  apiFetch,
  createEventRaffle,
  deleteEventRaffle,
  drawEventRaffle,
  exportEventRaffle,
  listEventRaffles,
  redrawEventRaffle,
  resetEventRaffle,
  updateEventRaffle,
  type EventRaffleOut,
} from "@/lib/api";
import { PlanGateCard, isPlanGateError } from "@/lib/useSubscription";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Gift,
  Loader2,
  Medal,
  MonitorPlay,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";

function fmtDate(value?: string | null) {
  if (!value) return "Henüz çekilmedi";
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusMeta(status: string) {
  if (status === "drawn") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-surface-200 bg-surface-50 text-surface-600";
}

function formatWinnerPlan(winnerCount: number, reserveWinnerCount: number) {
  return reserveWinnerCount > 0 ? `${winnerCount} asil + ${reserveWinnerCount} yedek` : `${winnerCount} asil`;
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

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-surface-400">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value || min))))}
        className="input-field"
      />
    </label>
  );
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
  const [planGateMessage, setPlanGateMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [prizeName, setPrizeName] = useState("");
  const [description, setDescription] = useState("");
  const [minSessionsRequired, setMinSessionsRequired] = useState(1);
  const [winnerCount, setWinnerCount] = useState(1);
  const [reserveWinnerCount, setReserveWinnerCount] = useState(1);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [eventRes, raffleRes] = await Promise.all([
        apiFetch(`/admin/events/${eventId}`).then((response) => response.json()),
        listEventRaffles(eventId),
      ]);
      setEventName(eventRes.name);
      setRaffles(raffleRes);
      setPlanOk(true);
      setPlanGateMessage(null);
    } catch (err: any) {
      if (err?.status === 403 && isPlanGateError(err?.message)) {
        setPlanOk(false);
        setPlanGateMessage(err.message);
        setError(null);
        try {
          const eventRes = await apiFetch(`/admin/events/${eventId}`).then((response) => response.json());
          setEventName(eventRes.name);
        } catch {}
      } else {
        setError(err.message || "Çekilişler yüklenemedi.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (eventId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const stats = useMemo(() => {
    return {
      total: raffles.length,
      drawn: raffles.filter((raffle) => raffle.status === "drawn").length,
      eligible: raffles.reduce((sum, raffle) => sum + raffle.eligible_count, 0),
      winners: raffles.reduce((sum, raffle) => sum + raffle.winners.length, 0),
    };
  }, [raffles]);

  const formReady = title.trim().length > 1 && prizeName.trim().length > 1;

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
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function upsertRaffle(nextRaffle: EventRaffleOut) {
    setRaffles((current) => {
      const exists = current.some((item) => item.id === nextRaffle.id);
      if (!exists) return [nextRaffle, ...current];
      return current.map((item) => (item.id === nextRaffle.id ? nextRaffle : item));
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
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
      const nextRaffle = editingId
        ? await updateEventRaffle(eventId, editingId, payload)
        : await createEventRaffle(eventId, payload);
      upsertRaffle(nextRaffle);
      toast.success(editingId ? "Çekiliş güncellendi." : "Çekiliş eklendi.");
      resetForm();
    } catch (err: any) {
      setError(err.message || "Kaydetme başarısız.");
      toast.error(err.message || "Kaydetme başarısız.");
    } finally {
      setSaving(false);
    }
  }

  async function runRaffleAction(
    raffle: EventRaffleOut,
    action: () => Promise<EventRaffleOut | void>,
    successMessage: string,
    errorMessage: string,
  ) {
    setBusyId(raffle.id);
    setError(null);
    try {
      const result = await action();
      if (result) upsertRaffle(result);
      toast.success(successMessage);
    } catch (err: any) {
      setError(err.message || errorMessage);
      toast.error(err.message || errorMessage);
    } finally {
      setBusyId(null);
    }
  }

  function handleDelete(raffle: EventRaffleOut) {
    if (!confirm(`"${raffle.title}" çekilişini silmek istediğinize emin misiniz?`)) return;
    setBusyId(raffle.id);
    deleteEventRaffle(eventId, raffle.id)
      .then(() => {
        setRaffles((current) => current.filter((item) => item.id !== raffle.id));
        if (editingId === raffle.id) resetForm();
        toast.success("Çekiliş silindi.");
      })
      .catch((err) => {
        setError(err.message || "Silme başarısız.");
        toast.error(err.message || "Silme başarısız.");
      })
      .finally(() => setBusyId(null));
  }

  function handleDraw(raffle: EventRaffleOut) {
    if (!confirm(`"${raffle.title}" için kazananları şimdi çekmek istiyor musunuz?`)) return;
    void runRaffleAction(
      raffle,
      () => drawEventRaffle(eventId, raffle.id),
      "Kazananlar çekildi.",
      "Çekiliş başlatılamadı.",
    );
  }

  function handleRedraw(raffle: EventRaffleOut) {
    if (!confirm(`"${raffle.title}" için yeni tur çekmek istiyor musunuz? Önceki kazananlar hariç tutulur.`)) return;
    void runRaffleAction(
      raffle,
      () => redrawEventRaffle(eventId, raffle.id),
      "Yeni kazanan turu eklendi.",
      "Tekrar çekiliş başlatılamadı.",
    );
  }

  function handleReset(raffle: EventRaffleOut) {
    if (!confirm(`"${raffle.title}" için mevcut kazananları temizlemek istiyor musunuz?`)) return;
    void runRaffleAction(
      raffle,
      () => resetEventRaffle(eventId, raffle.id),
      "Çekiliş sıfırlandı.",
      "Sıfırlama başarısız.",
    );
  }

  async function handleExport(raffle: EventRaffleOut) {
    setBusyId(raffle.id);
    setError(null);
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
      toast.success("Çekiliş sonucu dışa aktarıldı.");
    } catch (err: any) {
      setError(err.message || "Dışa aktarma başarısız.");
      toast.error(err.message || "Dışa aktarma başarısız.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EventAdminNav eventId={eventId} eventName={eventName} active="raffles" className="flex flex-col gap-2" />
      <PageHeader
        title="Çekilişler"
        subtitle="Uygun katılımcılar arasından asil ve yedek kazananları hızlıca yönetin."
        icon={<Gift className="h-5 w-5" />}
        iconBg="bg-surface-100 text-surface-700"
      />

      {planOk === false ? (
        <PlanGateCard
          feature="Çoklu oturum katılımına göre çekiliş oluşturma ve kazanan seçme"
          serverMessage={planGateMessage}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Toplam" value={stats.total} />
            <Stat label="Tamamlanan" value={stats.drawn} />
            <Stat label="Uygun aday" value={stats.eligible} />
            <Stat label="Seçilen kazanan" value={stats.winners} />
          </div>

          <section className="surface-panel p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-500">Kurgu</p>
                <h2 className="mt-1 text-xl font-black text-surface-950">
                  {editingId ? "Çekilişi Düzenle" : "Yeni Çekiliş"}
                </h2>
              </div>
              {editingId && (
                <button type="button" onClick={resetForm} className="btn-secondary justify-center">
                  Düzenlemeyi İptal Et
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_220px_auto] lg:items-end">
              <label className="grid gap-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-surface-400">Başlık</span>
                <input
                  className="input-field"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Örn. VIP kulaklık çekilişi"
                  required
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-surface-400">Hediye</span>
                <input
                  className="input-field"
                  value={prizeName}
                  onChange={(event) => setPrizeName(event.target.value)}
                  placeholder="Hediye / ürün"
                  required
                />
              </label>
              <NumberField label="Minimum oturum" value={minSessionsRequired} min={1} max={1000} onChange={setMinSessionsRequired} />
              <NumberField label="Asil / yedek" value={winnerCount} min={1} max={100} onChange={setWinnerCount} />
              <button type="submit" disabled={saving || !formReady} className="btn-primary justify-center">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingId ? "Güncelle" : "Ekle"}
              </button>

              <label className="grid gap-1.5 lg:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-surface-400">Açıklama</span>
                <textarea
                  className="input-field min-h-20"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="İsteğe bağlı kısa açıklama"
                />
              </label>
              <NumberField label="Yedek kazanan" value={reserveWinnerCount} min={0} max={100} onChange={setReserveWinnerCount} />
              <div className="rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-600 lg:col-span-2">
                Tur planı: <span className="font-bold text-surface-950">{formatWinnerPlan(winnerCount, reserveWinnerCount)}</span>
              </div>
            </form>

            {error && <div className="error-banner mt-4">{error}</div>}
          </section>

          <section className="surface-panel p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-500">Liste</p>
                <h2 className="mt-1 text-xl font-black text-surface-950">Etkinlik Çekilişleri</h2>
              </div>
              <p className="text-sm text-surface-500">{raffles.length} kurgu</p>
            </div>

            {raffles.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-surface-300 bg-surface-50 px-5 py-10 text-center">
                <Gift className="mx-auto h-9 w-9 text-surface-300" />
                <p className="mt-3 font-bold text-surface-900">Henüz çekiliş eklenmedi</p>
                <p className="mt-1 text-sm text-surface-500">İlk kurguyu ekleyerek uygun katılımcı havuzunu oluşturabilirsin.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {raffles.map((raffle) => (
                  <RaffleCard
                    key={raffle.id}
                    raffle={raffle}
                    eventId={eventId}
                    busy={busyId === raffle.id}
                    onDraw={handleDraw}
                    onRedraw={handleRedraw}
                    onReset={handleReset}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                    onExport={handleExport}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-panel p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-surface-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-surface-950">{value}</p>
    </div>
  );
}

function RaffleCard({
  raffle,
  eventId,
  busy,
  onDraw,
  onRedraw,
  onReset,
  onEdit,
  onDelete,
  onExport,
}: {
  raffle: EventRaffleOut;
  eventId: number;
  busy: boolean;
  onDraw: (raffle: EventRaffleOut) => void;
  onRedraw: (raffle: EventRaffleOut) => void;
  onReset: (raffle: EventRaffleOut) => void;
  onEdit: (raffle: EventRaffleOut) => void;
  onDelete: (raffle: EventRaffleOut) => void;
  onExport: (raffle: EventRaffleOut) => void;
}) {
  const rounds = splitRaffleRounds(raffle);
  const eligiblePreview = raffle.eligible_attendees.slice(0, 20);

  return (
    <article className="rounded-3xl border border-surface-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-black text-surface-950">{raffle.title}</h3>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusMeta(raffle.status)}`}>
              {raffle.status === "drawn" ? "Tamamlandı" : "Taslak"}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-surface-700">{raffle.prize_name}</p>
          {raffle.description && <p className="mt-1 text-sm text-surface-500">{raffle.description}</p>}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs sm:flex sm:text-left">
          <MiniStat label="Eşik" value={raffle.min_sessions_required} />
          <MiniStat label="Uygun" value={raffle.eligible_count} />
          <MiniStat label="Kazanan" value={raffle.winners.length} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {raffle.status === "drawn" ? (
          <button disabled={busy} onClick={() => onRedraw(raffle)} className="btn-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
            Yeni Tur
          </button>
        ) : (
          <button disabled={busy || raffle.eligible_count === 0} onClick={() => onDraw(raffle)} className="btn-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
            Kazanan Çek
          </button>
        )}
        <button disabled={busy || raffle.winners.length === 0} onClick={() => onReset(raffle)} className="btn-secondary">
          <RotateCcw className="h-4 w-4" />
          Sıfırla
        </button>
        <button disabled={busy} onClick={() => onEdit(raffle)} className="btn-secondary">
          <Pencil className="h-4 w-4" />
          Düzenle
        </button>
        <button disabled={busy || raffle.winners.length === 0} onClick={() => onExport(raffle)} className="btn-secondary">
          <Download className="h-4 w-4" />
          Dışa Aktar
        </button>
        <Link href={`/admin/events/${eventId}/raffles/${raffle.id}/present`} className="btn-secondary">
          <MonitorPlay className="h-4 w-4" />
          Sunum
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <button disabled={busy} onClick={() => onDelete(raffle)} className="btn-danger">
          <Trash2 className="h-4 w-4" />
          Sil
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <details className="rounded-2xl border border-surface-200 bg-surface-50 p-3">
          <summary className="cursor-pointer text-sm font-bold text-surface-900">
            Uygun havuz ({raffle.eligible_attendees.length})
          </summary>
          {eligiblePreview.length === 0 ? (
            <p className="mt-3 text-sm text-surface-500">Bu çekiliş için henüz uygun katılımcı yok.</p>
          ) : (
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {eligiblePreview.map((attendee) => (
                <PersonRow
                  key={`${raffle.id}-eligible-${attendee.attendee_id}`}
                  name={attendee.attendee_name}
                  email={attendee.attendee_email}
                  meta={`${attendee.sessions_attended} oturum`}
                />
              ))}
              {raffle.eligible_attendees.length > eligiblePreview.length && (
                <p className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-surface-500">
                  İlk 20 kişi gösteriliyor. Tam liste dışa aktarımda bulunur.
                </p>
              )}
            </div>
          )}
        </details>

        <details className="rounded-2xl border border-surface-200 bg-surface-50 p-3" open={raffle.winners.length > 0}>
          <summary className="cursor-pointer text-sm font-bold text-surface-900">
            Kazananlar ({raffle.winners.length}) · {fmtDate(raffle.drawn_at)}
          </summary>
          {rounds.length === 0 ? (
            <p className="mt-3 text-sm text-surface-500">Bu çekiliş için henüz kazanan seçilmedi.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {rounds.slice(0, 5).map((round) => (
                <div key={`${raffle.id}-round-${round.round}`} className="rounded-2xl bg-white p-3">
                  <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-surface-400">
                    <Medal className="h-3.5 w-3.5" />
                    Tur {round.round}
                  </p>
                  <div className="space-y-2">
                    {round.primary.map((winner) => (
                      <PersonRow
                        key={`${raffle.id}-primary-${round.round}-${winner.attendee_id}`}
                        name={winner.attendee_name}
                        email={winner.attendee_email}
                        meta={`${winner.sessions_attended} oturum · asil`}
                      />
                    ))}
                    {round.reserve.map((winner) => (
                      <PersonRow
                        key={`${raffle.id}-reserve-${round.round}-${winner.attendee_id}`}
                        name={winner.attendee_name}
                        email={winner.attendee_email}
                        meta={`${winner.sessions_attended} oturum · yedek`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              {rounds.length > 5 && (
                <p className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-surface-500">
                  İlk 5 tur gösteriliyor. Tam sonuçları dışa aktarabilirsin.
                </p>
              )}
            </div>
          )}
        </details>
      </div>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-surface-200 bg-surface-50 px-3 py-2">
      <p className="font-black text-surface-950">{value}</p>
      <p className="text-[11px] font-semibold text-surface-400">{label}</p>
    </div>
  );
}

function PersonRow({ name, email, meta }: { name: string; email: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-surface-900">{name}</p>
        <p className="truncate text-xs text-surface-500">{email}</p>
      </div>
      <span className="shrink-0 rounded-full bg-surface-100 px-2 py-1 text-[11px] font-bold text-surface-600">
        {meta}
      </span>
    </div>
  );
}
