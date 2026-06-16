/* =====================================================================
   Streak milestones — celebrate meaningful runs (client-side, no backend).
   We remember per-user the highest milestone celebrated in the CURRENT run
   (localStorage); the Dashboard resets that floor to 0 when a streak breaks, so
   each milestone fires once per run — and re-fires on a fresh run after a reset.
   ===================================================================== */

export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

const MILESTONE_LABEL: Record<number, string> = {
  3: "Three days in",
  7: "One week strong",
  14: "Two weeks deep",
  30: "A month of focus",
  50: "Fifty days locked in",
  100: "100 days — triple digits",
  200: "200 days unstoppable",
  365: "A full year of showing up",
};

/** The highest milestone the streak has reached, or null if none yet. */
export function milestoneReached(streak: number): number | null {
  let hit: number | null = null;
  for (const m of MILESTONES) if (streak >= m) hit = m;
  return hit;
}

export function milestoneLabel(m: number): string {
  return MILESTONE_LABEL[m] ?? `${m}-day streak`;
}

const key = (userId: string) => `lockdin:lastMilestone:${userId}`;

export function getLastCelebrated(userId: string): number {
  try {
    return parseInt(localStorage.getItem(key(userId)) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

export function setLastCelebrated(userId: string, milestone: number): void {
  try {
    localStorage.setItem(key(userId), String(milestone));
  } catch {
    /* ignore */
  }
}
