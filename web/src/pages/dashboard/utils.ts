/* =====================================================================
   Dashboard-local helpers — time formatting, relative dates, greeting, and a
   client-side reconstruction of the score breakdown.

   Why reconstruct the breakdown? The FROZEN SessionResponse contract carries
   ai_score + ai_summary but NOT the factor breakdown (the history endpoint only
   selects ai_scores(score, summary)). To keep a "74" explainable per the brief,
   we mirror the backend's deterministic algorithm (services/ai_scorer.py
   _score_with_algorithm) here. If the API ever does attach a `breakdown`, we
   prefer that (see scoreBreakdown()).
   ===================================================================== */
import type { SessionResponse } from "@/lib/types";

/** HH:MM:SS from a second count (tabular-friendly, zero-padded). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

/** Compact human duration, e.g. "2h 14m" / "47m" / "—". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "Today" / "Yesterday" / "Mar 4" relative to now. */
export function relativeDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  if (sameDay(d, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Time-of-day subgreeting, sentence case (matches the old dashboard copy). */
export function subgreeting(date = new Date()): string {
  const hr = date.getHours();
  if (hr < 5) return "Burning the midnight oil — make it count.";
  if (hr < 12) return "Good morning — let's make today count.";
  if (hr < 17) return "Good afternoon — stay locked in.";
  if (hr < 21) return "Good evening — one more session?";
  return "Late night focus — finish strong.";
}

/** Pull a first name out of a display name / email-derived name. */
export function firstNameOf(name: string | null | undefined, fallback = "there"): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0];
}

/* ---- Score breakdown ----------------------------------------------------- */

export interface ScoreBreakdown {
  duration_points: number; // 0–40
  worklog_points: number; // 0–40
  specificity_points: number; // 0–20
}

const SPECIFICITY_KEYWORDS = [
  "chapter", "problem", "solved", "built", "wrote", "read",
  "reviewed", "practiced", "completed", "finished", "learned",
  "coded", "debugged", "implemented", "studied", "notes",
];

/** Deterministic reconstruction — identical thresholds to the backend. */
export function computeBreakdown(totalSeconds: number, workLog: string | null): ScoreBreakdown {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const log = workLog ?? "";

  let duration_points = 5;
  if (minutes >= 120) duration_points = 40;
  else if (minutes >= 60) duration_points = 30;
  else if (minutes >= 30) duration_points = 20;
  else if (minutes >= 15) duration_points = 10;

  const words = log.trim() ? log.trim().split(/\s+/).length : 0;
  let worklog_points = 5;
  if (words >= 30) worklog_points = 40;
  else if (words >= 15) worklog_points = 30;
  else if (words >= 8) worklog_points = 20;
  else if (words >= 3) worklog_points = 10;

  const lower = log.toLowerCase();
  const hits = SPECIFICITY_KEYWORDS.reduce((n, kw) => (lower.includes(kw) ? n + 1 : n), 0);
  const specificity_points = Math.min(20, hits * 5);

  return { duration_points, worklog_points, specificity_points };
}

/**
 * Prefer a server-provided breakdown if present (additive field, may be absent
 * from the frozen type), otherwise reconstruct it from the session's own data.
 */
export function scoreBreakdown(session: SessionResponse): ScoreBreakdown {
  const maybe = (session as SessionResponse & { breakdown?: Partial<ScoreBreakdown> | null })
    .breakdown;
  if (
    maybe &&
    typeof maybe.duration_points === "number" &&
    typeof maybe.worklog_points === "number" &&
    typeof maybe.specificity_points === "number"
  ) {
    return {
      duration_points: maybe.duration_points,
      worklog_points: maybe.worklog_points,
      specificity_points: maybe.specificity_points,
    };
  }
  return computeBreakdown(session.total_seconds, session.work_log);
}

/** Semantic tone for a 0–100 score (teal-forward; warning low, success high). */
export function scoreTone(score: number): "success" | "teal" | "warning" {
  if (score >= 80) return "success";
  if (score >= 50) return "teal";
  return "warning";
}

export function scoreToneClass(score: number): string {
  const t = scoreTone(score);
  return t === "success" ? "text-success" : t === "warning" ? "text-warning" : "text-teal-bright";
}

/** True if an ISO timestamp falls on the local "today". */
export function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return sameDay(d, new Date());
}
