/* =====================================================================
   Leaderboard formatting helpers — duration + score, hand-rolled.
   ===================================================================== */
import type { LeaderboardPeriod } from "@/lib/types";

export const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: "daily", label: "Today" },
  { key: "weekly", label: "This week" },
  { key: "alltime", label: "All time" },
];

/** Copy fragment for the active period, used in subtitles / empty state. */
export const PERIOD_PHRASE: Record<LeaderboardPeriod, string> = {
  daily: "today",
  weekly: "this week",
  alltime: "all time",
};

/** 5400 → "1h 30m", 480 → "8m", 0 → "0m". */
export function formatFocus(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

/** Thousands-separated score for readability at the top of the board. */
export function formatScore(score: number): string {
  return Math.round(score).toLocaleString("en-US");
}
