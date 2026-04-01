"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { apiFetch, drawEventRaffle, type EventRaffleOut } from "@/lib/api";
import { formatRaffleDate, formatWinnerPlan, splitRaffleRounds } from "@/lib/raffles";
import {
  ArrowLeft,
  Expand,
  Gift,
  Loader2,
  Medal,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
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

type EligibleSpotlight = EventRaffleOut["eligible_attendees"][number];

function buildRevealItems(raffle: EventRaffleOut | null): RevealItem[] {
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
}

function NameMarquee({
  items,
  reverse = false,
}: {
  items: RevealItem[];
  reverse?: boolean;
}) {
  const repeated = useMemo(() => [...items, ...items, ...items], [items]);

  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-full border border-white/10 bg-white/5 py-2 backdrop-blur">
      <motion.div
        className="flex w-max items-center gap-3 px-3"
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ repeat: Infinity, duration: 24, ease: "linear" }}
      >
        {repeated.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${
              item.kind === "asil"
                ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                : "border-amber-300/20 bg-amber-300/10 text-amber-100"
            }`}
          >
            <span className="text-xs uppercase tracking-[0.14em] opacity-70">
              {item.kind === "asil" ? "Asil" : "Yedek"}
            </span>
            <span>{item.winner.attendee_name}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function CelebrationBurst({ visible, color }: { visible: boolean; color: string }) {
  const particles = Array.from({ length: 18 }, (_, index) => ({
    id: index,
    left: 8 + ((index * 11) % 84),
    top: 12 + ((index * 7) % 68),
    delay: (index % 6) * 0.05,
    rotate: index % 2 === 0 ? -24 : 24,
  }));

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {particles.map((particle) => (
            <motion.span
              key={particle.id}
              initial={{ opacity: 0, y: 0, scale: 0.4, rotate: 0 }}
              animate={{
                opacity: [0, 1, 0.9, 0],
                y: [0, -36, 24],
                x: [0, particle.id % 2 === 0 ? -18 : 18, 0],
                scale: [0.4, 1, 0.8],
                rotate: [0, particle.rotate, particle.rotate * 2],
              }}
              transition={{ duration: 1.6, delay: particle.delay, ease: "easeOut" }}
              className="absolute h-3 w-3 rounded-full"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                background: color,
                boxShadow: `0 0 24px ${color}`,
              }}
            />
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

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
  const [sequenceItems, setSequenceItems] = useState<RevealItem[]>([]);
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const timersRef = useRef<number[]>([]);

  const visibleItems = sequenceItems.slice(0, revealedCount);
  const latestWinner = visibleItems[visibleItems.length - 1] ?? null;
  const brandColor = branding?.brand_color || "#2563eb";
  const brandName = branding?.org_name || "HeptaCert";
  const eligibleAttendees = raffle?.eligible_attendees || [];
  const celebrationColor = latestWinner?.kind === "asil" ? "#34d399" : "#fbbf24";
  const spotlightCandidate: EligibleSpotlight | null =
    eligibleAttendees.length > 0 ? eligibleAttendees[spotlightIndex % eligibleAttendees.length] : null;

  useEffect(() => {
    fetch("/api/branding", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setBranding(data);
      })
      .catch(() => {});
  }, []);

  async function loadPresentation() {
    setLoading(true);
    setError(null);
    try {
      const [eventRes, raffles] = await Promise.all([
        apiFetch(`/admin/events/${eventId}`).then((r) => r.json()),
        apiFetch(`/admin/events/${eventId}/raffles?ts=${Date.now()}`).then(
          (r) => r.json() as Promise<EventRaffleOut[]>,
        ),
      ]);

      const found = raffles.find((item) => item.id === raffleId) || null;
      setEventName(eventRes.name || "");
      setRaffle(found);
      setSequenceItems(buildRevealItems(found));
      setRevealedCount(0);
      setSpotlightIndex(0);
      setPhase("idle");
    } catch (e: any) {
      setError(e.message || "Sunum bilgileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (eventId && raffleId) {
      void loadPresentation();
    }
  }, [eventId, raffleId]);

  useEffect(() => {
    if (!eventId || !raffleId) return;

    const handleFocus = () => {
      void loadPresentation();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadPresentation();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
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
    const nextItems = buildRevealItems(nextRaffle);

    setRaffle(nextRaffle);
    setSequenceItems(nextItems);
    setRevealedCount(0);
    setSpotlightIndex(0);
    if (nextItems.length === 0) {
      setPhase("complete");
      return;
    }

    setPhase("scanning");

    const eligiblePool = nextRaffle.eligible_attendees || [];
    if (eligiblePool.length > 0) {
      const cycleTimer = window.setInterval(() => {
        setSpotlightIndex((current) => (current + 1) % eligiblePool.length);
      }, 140);
      timersRef.current.push(cycleTimer as unknown as number);
    }

    const startTimer = window.setTimeout(() => {
      setPhase("revealing");
      clearTimers();
      setRevealedCount(1);

      if (nextItems.length === 1) {
        const doneTimer = window.setTimeout(() => setPhase("complete"), 1200);
        timersRef.current.push(doneTimer);
        return;
      }

      nextItems.slice(1).forEach((_, index) => {
        const timer = window.setTimeout(() => {
          setRevealedCount((current) => Math.min(nextItems.length, current + 1));
          if (index === nextItems.length - 2) {
            const doneTimer = window.setTimeout(() => setPhase("complete"), 1200);
            timersRef.current.push(doneTimer);
          }
        }, (index + 1) * 1600);
        timersRef.current.push(timer);
      });
    }, 2200);

    timersRef.current.push(startTimer);
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
      setError(e.message || "Çekiliş başlatılamadı.");
      setPhase("idle");
    } finally {
      setDrawing(false);
    }
  }

  function handleReplay() {
    if (!raffle || raffle.winners.length === 0) return;
    void enterFullscreen();
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
          <p className="text-2xl font-black">Sunum açılamadı</p>
          <p className="mt-3 text-sm text-white/70">{error}</p>
          <Link
            href={`/admin/events/${eventId}/raffles`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Çekiliş yönetimine dön
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
            Yönetim ekranına dön
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadPresentation}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur"
            >
              <RotateCcw className="h-4 w-4" />
              Veriyi yenile
            </button>
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
              Çekiliş Sunumu
            </div>

            <div className="mt-6 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/45">
                {eventName || brandName}
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
                {raffle?.title}
              </h1>
              <p className="mt-4 text-lg leading-8 text-white/72 md:text-xl">
                {raffle?.description || "Çekiliş sonucu sahnede animasyonlu olarak açıklanır."}
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Ödül</p>
                <p className="mt-3 text-xl font-black text-white">{raffle?.prize_name}</p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Tur Planı</p>
                <p className="mt-3 text-xl font-black text-white">
                  {raffle ? formatWinnerPlan(raffle.winner_count, raffle.reserve_winner_count) : "-"}
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Uygun Havuz</p>
                <p className="mt-3 text-xl font-black text-white">{raffle?.eligible_count ?? 0} kişi</p>
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
                {raffle?.winners.length ? "Sunumu başlat" : "Çekilişi başlat"}
              </button>
              {raffle?.winners.length ? (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-200">
                  <Trophy className="h-4 w-4" />
                  Son çekiliş: {formatRaffleDate(raffle.drawn_at)}
                </div>
              ) : null}
            </div>

            {sequenceItems.length > 0 ? (
              <div className="mt-6 space-y-3">
                <NameMarquee items={sequenceItems} />
                <NameMarquee items={sequenceItems} reverse />
              </div>
            ) : null}

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
                    {phase === "scanning"
                      ? "İsimler hazırlanıyor"
                      : phase === "complete"
                        ? "Kazananlar açıklandı"
                        : phase === "revealing"
                          ? "Kazanan sahnede"
                          : "Sunum hazır"}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/75">
                  <Users className="h-3.5 w-3.5" />
                  {revealedCount}/{sequenceItems.length || raffle?.winner_count || 0}
                </div>
              </div>

              <div className="mt-6 rounded-[30px] border border-white/10 bg-slate-950/55 p-6">
                {phase === "idle" ? (
                  <div className="flex min-h-[360px] flex-col justify-center">
                    <div className="text-center">
                      <Gift className="mx-auto h-12 w-12 text-white/35" />
                      <p className="mt-5 text-3xl font-black text-white">Sunum başlamaya hazır</p>
                      <p className="mt-3 max-w-xl text-base leading-7 text-white/60">
                        Aşağıda çekiliş havuzundaki uygun adayları görebilirsiniz. Başlattığınızda sistem bu havuz içinden seçim yapar.
                      </p>
                    </div>

                    <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Uygun Aday Havuzu</p>
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
                          {eligibleAttendees.length} kişi
                        </span>
                      </div>

                      {eligibleAttendees.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/35 px-4 py-8 text-center text-sm text-white/50">
                          Bu çekiliş için uygun aday bulunmuyor.
                        </div>
                      ) : (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {eligibleAttendees.slice(0, 10).map((attendee, index) => (
                            <div
                              key={`eligible-${attendee.attendee_id}`}
                              className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3"
                            >
                              <p className="text-sm font-semibold text-white">
                                {index + 1}. {attendee.attendee_name}
                              </p>
                              <p className="mt-1 text-xs text-white/55">
                                {attendee.sessions_attended} oturum katılımı
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
                    <p className="mt-6 text-3xl font-black text-white">İsimler sahneye hazırlanıyor</p>
                    <p className="mt-3 max-w-lg text-center text-base leading-7 text-white/60">
                      Oturum eşiği kontrol ediliyor, uygun katılımcılar sıralanıyor ve sahne akışı hazırlanıyor.
                    </p>
                    {spotlightCandidate ? (
                      <motion.div
                        key={`spotlight-${spotlightCandidate.attendee_id}-${spotlightIndex}`}
                        initial={{ opacity: 0.45, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.12 }}
                        className="mt-8 rounded-[28px] border border-white/15 bg-white/10 px-6 py-5 text-center backdrop-blur"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Havuzdan seçiliyor</p>
                        <p className="mt-3 text-3xl font-black text-white">{spotlightCandidate.attendee_name}</p>
                        <p className="mt-2 text-sm text-white/60">
                          {spotlightCandidate.sessions_attended} oturum katılımı
                        </p>
                      </motion.div>
                    ) : null}
                    {eligibleAttendees.length > 0 ? (
                      <div className="mt-8 grid w-full max-w-3xl gap-3 md:grid-cols-3">
                        {eligibleAttendees.slice(0, 6).map((attendee) => (
                          <div
                            key={`pool-${attendee.attendee_id}`}
                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                              spotlightCandidate?.attendee_id === attendee.attendee_id
                                ? "border-white/30 bg-white/15"
                                : "border-white/10 bg-white/5"
                            }`}
                          >
                            <p className="text-sm font-semibold text-white">{attendee.attendee_name}</p>
                            <p className="mt-1 text-xs text-white/55">{attendee.sessions_attended} oturum</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="relative min-h-[360px]">
                    <CelebrationBurst visible={!!latestWinner} color={celebrationColor} />
                    <AnimatePresence mode="popLayout">
                      {latestWinner ? (
                        <motion.div
                          key={latestWinner.id}
                          initial={{ opacity: 0, y: 24, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -16, scale: 0.98 }}
                          transition={{ duration: 0.45, ease: "easeOut" }}
                          className={`relative rounded-[30px] border p-6 ${
                            latestWinner.kind === "asil"
                              ? "border-emerald-300/30 bg-emerald-300/10"
                              : "border-amber-300/30 bg-amber-300/10"
                          }`}
                        >
                          <motion.div
                            initial={{ opacity: 0.4, scale: 0.9 }}
                            animate={{ opacity: [0.25, 0.7, 0.25], scale: [0.92, 1.03, 0.97] }}
                            transition={{ duration: 1.2, repeat: 1, ease: "easeInOut" }}
                            className="absolute inset-0 rounded-[30px]"
                            style={{
                              background:
                                latestWinner.kind === "asil"
                                  ? "radial-gradient(circle at center, rgba(52,211,153,0.20) 0%, transparent 65%)"
                                  : "radial-gradient(circle at center, rgba(251,191,36,0.20) 0%, transparent 65%)",
                            }}
                          />
                          <div className="relative flex flex-wrap items-center justify-between gap-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                              <Medal className="h-3.5 w-3.5" />
                              Tur {latestWinner.round} • {latestWinner.kind === "asil" ? "Asil kazanan" : "Yedek kazanan"}
                            </div>
                            <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
                              {latestWinner.winner.sessions_attended} oturum
                            </div>
                          </div>
                          <p className="relative mt-5 text-4xl font-black tracking-tight text-white md:text-5xl">
                            {latestWinner.winner.attendee_name}
                          </p>
                          <p className="relative mt-3 text-lg text-white/72">
                            {latestWinner.winner.sessions_attended} oturum katılımı
                          </p>
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
                              Tur {item.round} • {item.kind === "asil" ? "asil" : "yedek"}
                            </p>
                            <p className="text-xs font-semibold text-white/55">#{item.index + 1}</p>
                          </div>
                          <p className="mt-2 text-lg font-bold text-white">{item.winner.attendee_name}</p>
                          <p className="mt-1 text-sm text-white/65">{item.winner.sessions_attended} oturum katılımı</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                <span>
                  Kural: En az {raffle?.min_sessions_required ?? 0} oturuma katılanlar arasından {" "}
                  {raffle ? formatWinnerPlan(raffle.winner_count, raffle.reserve_winner_count) : "-"} seçilir.
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
