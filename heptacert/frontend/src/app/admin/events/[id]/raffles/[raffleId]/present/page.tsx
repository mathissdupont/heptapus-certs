"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  apiFetch,
  drawEventRaffle,
  listEventRaffles,
  type EventRaffleOut,
} from "@/lib/api";
import {
  formatRaffleDate,
  formatWinnerPlan,
  splitRaffleRounds,
} from "@/lib/raffles";
import {
  ArrowLeft,
  Expand,
  Gift,
  Loader2,
  Medal,
  Play,
  Sparkles,
  Trophy,
  Users,
  RotateCcw,
} from "lucide-react";

type BrandingData = {
  org_name?: string;
  brand_logo?: string | null;
  brand_color?: string | null;
};

type RevealItem = {
  id: string;
  round: number;
  kind: "asil" | "yedek";
  index: number;
  winner: EventRaffleOut["winners"][number];
};

export default function RafflePresentationPage() {
  const params = useParams();
  const eventId = Number(params?.id);
  const raffleId = Number(params?.raffleId);

  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [raffle, setRaffle] = useState<EventRaffleOut | null>(null);
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [phase, setPhase] = useState<"idle" | "scanning" | "revealing" | "complete">("idle");
  const [revealedCount, setRevealedCount] = useState(0);

  const timersRef = useRef<number[]>([]);

  const revealItems = useMemo<RevealItem[]>(() => {
    if (!raffle) return [];

    return splitRaffleRounds(raffle).flatMap((round) => [
      ...round.primary.map((winner, index) => ({
        id: `round-${round.round}-asil-${winner.attendee_id}`,
        round: round.round,
        kind: "asil" as const,
        index,
        winner,
      })),
      ...round.reserve.map((winner, index) => ({
        id: `round-${round.round}-yedek-${winner.attendee_id}`,
        round: round.round,
        kind: "yedek" as const,
        index,
        winner,
      })),
    ]);
  }, [raffle]);

  const visibleItems = revealItems.slice(0, revealedCount);
  const latestWinner = visibleItems[visibleItems.length - 1] ?? null;
  const brandColor = branding?.brand_color || "#2563eb";
  const brandName = branding?.org_name || "HeptaCert";

  useEffect(() => {
    fetch("/api/branding", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setBranding(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [eventRes, raffles] = await Promise.all([
          apiFetch(`/admin/events/${eventId}`).then((r) => r.json()),
          listEventRaffles(eventId),
        ]);

        if (!mounted) return;

        setEventName(eventRes.name || "");
        setRaffle(raffles.find((item) => item.id === raffleId) || null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e.message || "Sunum bilgileri yuklenemedi.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (eventId && raffleId) load();

    return () => {
      mounted = false;
    };
  }, [eventId, raffleId]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {}
  }

  function clearTimers() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }

  function runRevealSequence(nextRaffle: EventRaffleOut) {
    clearTimers();
    setRaffle(nextRaffle);
    setRevealedCount(0);
    setPhase("scanning");

    const startTimer = window.setTimeout(() => {
      setPhase("revealing");

      revealItemsFrom(nextRaffle).forEach((_, index) => {
        const timer = window.setTimeout(() => {
          setRevealedCount(index + 1);
          if (index === revealItemsFrom(nextRaffle).length - 1) {
            setPhase("complete");
          }
        }, index * 1400);
        timersRef.current.push(timer);
      });
    }, 2200);

    timersRef.current.push(startTimer);
  }

  function revealItemsFrom(nextRaffle: EventRaffleOut) {
    return splitRaffleRounds(nextRaffle).flatMap((round) => [
      ...round.primary.map((winner, index) => ({
        id: `round-${round.round}-asil-${winner.attendee_id}`,
        round: round.round,
        kind: "asil" as const,
        index,
        winner,
      })),
      ...round.reserve.map((winner, index) => ({
        id: `round-${round.round}-yedek-${winner.attendee_id}`,
        round: round.round,
        kind: "yedek" as const,
        index,
        winner,
      })),
    ]);
  }

  async function handleStart() {
    if (!raffle) return;
    setError(null);
    await enterFullscreen();

    if (raffle.winners.length > 0) {
      runRevealSequence(raffle);
      return;
    }

    setDrawing(true);
    try {
      const drawn = await drawEventRaffle(eventId, raffle.id);
      runRevealSequence(drawn);
    } catch (e: any) {
      setError(e.message || "Cekilis baslatilamadi.");
      setPhase("idle");
    } finally {
      setDrawing(false);
    }
  }

  function handleReplay() {
    if (!raffle || raffle.winners.length === 0) return;
    enterFullscreen();
    runRevealSequence(raffle);
  }

  const backgroundStyle = {
    background: `
      radial-gradient(circle at 20% 20%, ${brandColor}24 0%, transparent 24%),
      radial-gradient(circle at 80% 0%, rgba(249,115,22,0.18) 0%, transparent 22%),
      linear-gradient(180deg, #08111f 0%, #040816 45%, #020617 100%)
    `,
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (error && !raffle) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 p-6 text-center text-white">
        <div className="max-w-lg rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-2xl font-black">Sunum acilamadi</p>
          <p className="mt-3 text-sm text-white/70">{error}</p>
          <Link
            href={`/admin/events/${eventId}/raffles`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Raffle yonetimine don
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-auto bg-slate-950 text-white" style={backgroundStyle}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.24)_58%,rgba(2,6,23,0.74)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-6 py-6 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/admin/events/${eventId}/raffles`}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur"
          >
            <ArrowLeft className="h-4 w-4" />
            Yonetim ekranina don
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={enterFullscreen}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur"
            >
              <Expand className="h-4 w-4" />
              Tam ekran
            </button>
            {raffle?.winners.length ? (
              <button
                type="button"
                onClick={handleReplay}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur"
              >
                <RotateCcw className="h-4 w-4" />
                Sunumu tekrar oynat
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-8 grid flex-1 gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/70 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Cekilis Sunumu
            </div>

            <div className="mt-6 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/45">
                {eventName || brandName}
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
                {raffle?.title}
              </h1>
              <p className="mt-4 text-lg leading-8 text-white/72 md:text-xl">
                {raffle?.description || "Cekilis sonucu sahnede animasyonlu olarak aciklanir."}
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Odul</p>
                <p className="mt-3 text-xl font-black text-white">{raffle?.prize_name}</p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Tur Plani</p>
                <p className="mt-3 text-xl font-black text-white">
                  {raffle ? formatWinnerPlan(raffle.winner_count, raffle.reserve_winner_count) : "-"}
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Uygun Havuz</p>
                <p className="mt-3 text-xl font-black text-white">{raffle?.eligible_count ?? 0} kisi</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleStart}
                disabled={drawing || !!(raffle && raffle.winners.length === 0 && raffle.eligible_count === 0)}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-slate-900 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {drawing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {raffle?.winners.length ? "Sunumu baslat" : "Cekilisi baslat"}
              </button>
              {raffle?.winners.length ? (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-200">
                  <Trophy className="h-4 w-4" />
                  Son cekilis: {formatRaffleDate(raffle.drawn_at)}
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-100">
                {error}
              </div>
            ) : null}
          </div>

          <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/8 p-6 backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]" />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Sahne</p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {phase === "scanning" ? "Adaylar taraniyor" : phase === "complete" ? "Kazananlar aciklandi" : "Sunum hazir"}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/75">
                  <Users className="h-3.5 w-3.5" />
                  {revealedCount}/{revealItems.length || raffle?.winner_count || 0}
                </div>
              </div>

              <div className="mt-6 rounded-[30px] border border-white/10 bg-slate-950/55 p-6">
                {phase === "idle" ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                    <Gift className="h-12 w-12 text-white/35" />
                    <p className="mt-5 text-3xl font-black text-white">Sunum baslamaya hazir</p>
                    <p className="mt-3 max-w-xl text-base leading-7 text-white/60">
                      Tam ekran acip cekilisi baslattiginizda sistem kazananlari sirayla sahneye cikarir.
                    </p>
                  </div>
                ) : phase === "scanning" ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
                      className="flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-white/10"
                    >
                      <Sparkles className="h-10 w-10 text-white/80" />
                    </motion.div>
                    <p className="mt-6 text-3xl font-black text-white">Aday havuzu taraniyor</p>
                    <p className="mt-3 max-w-lg text-center text-base leading-7 text-white/60">
                      Oturum esigi kontrol ediliyor, uygun katilimcilar siralanıyor ve sahne reveal akisi hazirlaniyor.
                    </p>
                  </div>
                ) : (
                  <div className="min-h-[360px]">
                    <AnimatePresence mode="popLayout">
                      {latestWinner ? (
                        <motion.div
                          key={latestWinner.id}
                          initial={{ opacity: 0, y: 24, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -16, scale: 0.98 }}
                          transition={{ duration: 0.45, ease: "easeOut" }}
                          className={`rounded-[30px] border p-6 ${
                            latestWinner.kind === "asil"
                              ? "border-emerald-300/30 bg-emerald-300/10"
                              : "border-amber-300/30 bg-amber-300/10"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                              <Medal className="h-3.5 w-3.5" />
                              Tur {latestWinner.round} • {latestWinner.kind === "asil" ? "Asil kazanan" : "Yedek kazanan"}
                            </div>
                            <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
                              {latestWinner.winner.sessions_attended} oturum
                            </div>
                          </div>
                          <p className="mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
                            {latestWinner.winner.attendee_name}
                          </p>
                          <p className="mt-3 text-lg text-white/72">{latestWinner.winner.attendee_email}</p>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {visibleItems.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 16, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className={`rounded-3xl border px-4 py-4 ${
                            item.kind === "asil"
                              ? "border-emerald-300/20 bg-emerald-300/8"
                              : "border-amber-300/20 bg-amber-300/8"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                              Tur {item.round} • {item.kind}
                            </p>
                            <p className="text-xs font-semibold text-white/55">#{item.index + 1}</p>
                          </div>
                          <p className="mt-2 text-lg font-bold text-white">{item.winner.attendee_name}</p>
                          <p className="mt-1 text-sm text-white/65">{item.winner.attendee_email}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                <span>
                  Kural: En az {raffle?.min_sessions_required ?? 0} oturuma katilanlar arasindan{" "}
                  {raffle ? formatWinnerPlan(raffle.winner_count, raffle.reserve_winner_count) : "-"} secilir.
                </span>
                <span>{eventName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
