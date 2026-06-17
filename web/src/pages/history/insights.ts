/* =====================================================================
   Pattern-coach insights — deterministic, client-side analysis of a user's
   finished sessions. No backend, no LLM: just honest, encouraging patterns
   ("you're sharpest in the evening", "Tuesdays are your strongest day").
   ===================================================================== */
import type { SessionResponse } from "@/lib/types";

export type InsightKind = "peak-time" | "best-day" | "sweet-length" | "avg-score" | "deep-total";

export interface PatternInsight {
  kind: InsightKind;
  headline: string;
  value: string;
}

/** Minimum finished sessions before patterns are meaningful. */
export const INSIGHTS_MIN = 4;

const WINDOWS: { label: string; from: number; to: number }[] = [
  { label: "the early morning", from: 5, to: 9 },
  { label: "the morning", from: 9, to: 12 },
  { label: "midday", from: 12, to: 14 },
  { label: "the afternoon", from: 14, to: 17 },
  { label: "the evening", from: 17, to: 21 },
  { label: "the late night", from: 21, to: 29 }, // wraps past midnight (21–05)
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function hourOf(s: SessionResponse): number | null {
  const d = new Date(s.finished_at || s.started_at);
  return Number.isNaN(d.getTime()) ? null : d.getHours();
}

function windowFor(hour: number): string {
  const h = hour < 5 ? hour + 24 : hour; // fold late night into 21–29
  const w = WINDOWS.find((x) => h >= x.from && h < x.to);
  return w?.label ?? "your focus window";
}

function fmtHours(seconds: number): string {
  const h = seconds / 3600;
  if (h >= 10) return `${Math.round(h)}h`;
  if (h >= 1) return `${h.toFixed(1).replace(/\.0$/, "")}h`;
  return `${Math.round(seconds / 60)}m`;
}

export function computeInsights(sessions: SessionResponse[]): {
  ready: boolean;
  count: number;
  insights: PatternInsight[];
} {
  const finished = sessions.filter((s) => s.status === "finished");
  const count = finished.length;
  if (count < INSIGHTS_MIN) return { ready: false, count, insights: [] };

  const insights: PatternInsight[] = [];

  // 1. Peak focus window — by total focused time per window.
  const windowSecs = new Map<string, number>();
  for (const s of finished) {
    const h = hourOf(s);
    if (h == null) continue;
    const w = windowFor(h);
    windowSecs.set(w, (windowSecs.get(w) ?? 0) + (s.total_seconds || 0));
  }
  const topWindow = [...windowSecs.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topWindow && topWindow[1] > 0) {
    insights.push({
      kind: "peak-time",
      headline: `You're sharpest in ${topWindow[0]}`,
      value: `${fmtHours(topWindow[1])} logged then`,
    });
  }

  // 2. Strongest weekday — by total focused time.
  const daySecs = new Array(7).fill(0);
  for (const s of finished) {
    const d = new Date(s.finished_at || s.started_at);
    if (!Number.isNaN(d.getTime())) daySecs[d.getDay()] += s.total_seconds || 0;
  }
  const topDayIdx = daySecs.indexOf(Math.max(...daySecs));
  if (daySecs[topDayIdx] > 0) {
    insights.push({
      kind: "best-day",
      headline: `${WEEKDAYS[topDayIdx]}s are your strongest day`,
      value: `${fmtHours(daySecs[topDayIdx])} total`,
    });
  }

  // 3. Sweet-spot session length — avg length of the top-scoring third.
  const scored = finished.filter((s) => typeof s.ai_score === "number");
  const lengthPool = scored.length >= 3 ? scored : finished;
  const byScore = [...lengthPool].sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0));
  const topThird = byScore.slice(0, Math.max(1, Math.ceil(byScore.length / 3)));
  const avgLenMin =
    topThird.reduce((acc, s) => acc + (s.total_seconds || 0), 0) / topThird.length / 60;
  if (avgLenMin >= 1) {
    insights.push({
      kind: "sweet-length",
      headline: "Your best sessions run about",
      value: `${Math.round(avgLenMin)} min`,
    });
  }

  // 4. Average AI score (only if we have a few).
  if (scored.length >= 3) {
    const avg = Math.round(scored.reduce((acc, s) => acc + (s.ai_score ?? 0), 0) / scored.length);
    insights.push({
      kind: "avg-score",
      headline: "Your average focus score",
      value: `${avg}/100`,
    });
  }

  // 5. Lifetime deep work.
  const totalSecs = finished.reduce((acc, s) => acc + (s.total_seconds || 0), 0);
  insights.push({
    kind: "deep-total",
    headline: "Deep work, all-time",
    value: fmtHours(totalSecs),
  });

  return { ready: true, count, insights };
}
