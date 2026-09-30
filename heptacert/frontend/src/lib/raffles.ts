import { localeTag } from "@/lib/localeTag";
import type { EventRaffleOut } from "@/lib/api";

export type RaffleRound = {
  round: number;
  primary: EventRaffleOut["winners"];
  reserve: EventRaffleOut["winners"];
};

export function formatRaffleDate(value?: string | null, lang?: string | null) {
  if (!value) return "Henüz çekilmedi";
  return new Date(value).toLocaleString(localeTag(lang), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getRaffleStatusMeta(status: string) {
  if (status === "drawn") {
    return {
      label: "Kazananlar çekildi",
      className: "border-status-success-border bg-status-success-bg text-status-success-content",
    };
  }

  return {
    label: "Taslak",
    className: "border-status-warning-border bg-status-warning-bg text-status-warning-content",
  };
}

export function formatWinnerPlan(winnerCount: number, reserveWinnerCount: number) {
  if (reserveWinnerCount > 0) {
    return `${winnerCount} asil + ${reserveWinnerCount} yedek`;
  }
  return `${winnerCount} kazanan`;
}

export function splitRaffleRounds(raffle: EventRaffleOut): RaffleRound[] {
  const chunkSize = Math.max(1, raffle.winner_count + raffle.reserve_winner_count);
  const rounds: RaffleRound[] = [];

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
