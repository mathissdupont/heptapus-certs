import type { EventRaffleOut } from "@/lib/api";

export type RaffleRound = {
  round: number;
  primary: EventRaffleOut["winners"];
  reserve: EventRaffleOut["winners"];
};

export function formatRaffleDate(value?: string | null) {
  if (!value) return "Henuz cekilmedi";
  return new Date(value).toLocaleString("tr-TR", {
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
      label: "Kazananlar cekildi",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    label: "Taslak",
    className: "border-amber-200 bg-amber-50 text-amber-700",
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
