/* =====================================================================
   History date math — hand-rolled, no date-fns.
   The heatmap is a 7-row (Mon→Sun) × 12-column grid covering the last
   84 days (12 weeks). Everything keys off a LOCAL YYYY-MM-DD string so a
   session that finished at 11pm lands on the right calendar day in the
   user's timezone (toISOString would shift it to UTC).
   ===================================================================== */
import type { SessionResponse } from "@/lib/types";

export const WEEKS = 12;
export const DAYS = WEEKS * 7; // 84

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const WEEKDAYS_FULL = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

/** Local YYYY-MM-DD for a Date (NOT toISOString — that would use UTC). */
export function localKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday-indexed weekday: Mon=0 … Sun=6. */
export function mondayIndex(d: Date): number {
  const dow = d.getDay(); // Sun=0 … Sat=6
  return dow === 0 ? 6 : dow - 1;
}

/** A single heatmap day. */
export interface HeatDay {
  key: string; // local YYYY-MM-DD
  date: Date; // midnight local
  seconds: number; // total focus seconds that day
  sessions: number; // sessions that day
  level: 0 | 1 | 2 | 3 | 4; // teal intensity bucket
  inFuture: boolean; // padding cells past today (e.g. rest of this week)
  isToday: boolean;
}

/** One grid column = one calendar week (Mon→Sun, 7 entries). */
export interface HeatWeek {
  /** The month label to show above this column, or null. */
  monthLabel: string | null;
  days: HeatDay[]; // length 7, row 0 = Monday
}

export interface HeatmapModel {
  weeks: HeatWeek[]; // length 12, left→right oldest→newest
  maxSeconds: number; // peak day in the window (for the legend scale)
}

/**
 * Aggregate sessions into a date→{seconds,count} map keyed by LOCAL day.
 * A session counts on the day it finished (falling back to start) so the
 * heatmap mirrors when the work actually happened.
 */
export function aggregateByDay(
  sessions: SessionResponse[]
): Map<string, { seconds: number; sessions: number }> {
  const map = new Map<string, { seconds: number; sessions: number }>();
  for (const s of sessions) {
    const stamp = s.finished_at ?? s.started_at;
    if (!stamp) continue;
    const key = localKey(new Date(stamp));
    const prev = map.get(key) ?? { seconds: 0, sessions: 0 };
    prev.seconds += s.total_seconds || 0;
    prev.sessions += 1;
    map.set(key, prev);
  }
  return map;
}

/** Bucket a day's seconds into 0–4 against the window peak. */
function levelFor(seconds: number, max: number): HeatDay["level"] {
  if (seconds <= 0) return 0;
  const r = seconds / max;
  if (r <= 0.25) return 1;
  if (r <= 0.5) return 2;
  if (r <= 0.75) return 3;
  return 4;
}

/**
 * Build the 12×7 grid going backwards from today.
 * The newest column is the current week; its Monday is found by stepping back
 * `mondayIndex(today)` days. The oldest column starts (WEEKS-1) weeks before
 * that Monday. Days after today (the tail of the current week) render as faint
 * future padding so the grid stays a clean rectangle.
 */
export function buildHeatmap(
  byDay: Map<string, { seconds: number; sessions: number }>
): HeatmapModel {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = localKey(today);

  // Monday of the current (newest) week.
  const currentMonday = new Date(today);
  currentMonday.setDate(currentMonday.getDate() - mondayIndex(today));

  // Monday of the oldest column.
  const start = new Date(currentMonday);
  start.setDate(start.getDate() - (WEEKS - 1) * 7);

  // Window peak drives the intensity scale (skip future padding).
  let maxSeconds = 1;
  {
    const probe = new Date(start);
    for (let i = 0; i < DAYS; i++) {
      const key = localKey(probe);
      if (probe <= today) {
        const sec = byDay.get(key)?.seconds ?? 0;
        if (sec > maxSeconds) maxSeconds = sec;
      }
      probe.setDate(probe.getDate() + 1);
    }
  }

  const weeks: HeatWeek[] = [];
  const cursor = new Date(start);
  let lastMonth = -1;

  for (let w = 0; w < WEEKS; w++) {
    const days: HeatDay[] = [];
    // Month label: show when this column's Monday opens a new month.
    const colMonth = cursor.getMonth();
    let monthLabel: string | null = null;
    if (colMonth !== lastMonth) {
      monthLabel = MONTHS[colMonth];
      lastMonth = colMonth;
    }

    for (let r = 0; r < 7; r++) {
      const date = new Date(cursor);
      const key = localKey(date);
      const inFuture = date > today;
      const entry = byDay.get(key);
      const seconds = inFuture ? 0 : entry?.seconds ?? 0;
      const sessions = inFuture ? 0 : entry?.sessions ?? 0;
      days.push({
        key,
        date,
        seconds,
        sessions,
        level: inFuture ? 0 : levelFor(seconds, maxSeconds),
        inFuture,
        isToday: key === todayKey,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    weeks.push({ monthLabel, days });
  }

  return { weeks, maxSeconds };
}

/* ---- Aggregate stats over the full fetched history (not just the window) ---- */
export interface HistoryStats {
  totalSessions: number;
  totalSeconds: number;
  activeDays: number;
  bestDayLabel: string; // e.g. "Mar 14" or "—"
  bestDaySeconds: number;
}

export function computeStats(
  sessions: SessionResponse[],
  byDay: Map<string, { seconds: number; sessions: number }>
): HistoryStats {
  let totalSeconds = 0;
  for (const s of sessions) totalSeconds += s.total_seconds || 0;

  let bestKey = "";
  let bestDaySeconds = 0;
  for (const [key, v] of byDay) {
    if (v.seconds > bestDaySeconds) {
      bestDaySeconds = v.seconds;
      bestKey = key;
    }
  }

  return {
    totalSessions: sessions.length,
    totalSeconds,
    activeDays: byDay.size,
    bestDayLabel: bestKey ? shortDate(parseKey(bestKey)) : "—",
    bestDaySeconds,
  };
}

/* ---- Formatters (hand-rolled, locale-independent) ---- */

/** "YYYY-MM-DD" → Date at local noon (stable, avoids DST edges). */
export function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** 5400 → "1h 30m", 480 → "8m", 0 → "0m". */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** 5400 → "1.5" (hours, one decimal, trailing zero trimmed). */
export function hoursDecimal(totalSec: number): string {
  const hrs = totalSec / 3600;
  if (hrs === 0) return "0";
  const rounded = Math.round(hrs * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** "Mar 14" (no year). */
export function shortDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Saturday, Mar 14, 2026" for tooltips. */
export function fullDate(d: Date): string {
  return `${WEEKDAYS_FULL[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Relative day label for a session timestamp: "Today" / "Yesterday" /
 * "Mar 14" / "Mar 14, 2025" (year only when not the current year).
 */
export function relativeDay(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return sameYear
    ? shortDate(d)
    : `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "2:05 PM" — 12-hour clock, hand-rolled. */
export function clockTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}
