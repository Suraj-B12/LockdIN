/* =====================================================================
   Friend-recap "last seen" bookkeeping — drives the "while you were gone"
   inbox. We remember, per user, when they last caught up, and only auto-open
   the recap once per browser session so reopening a tab doesn't nag.
   localStorage/sessionStorage only — no backend, free, survives reloads.
   ===================================================================== */

const seenKey = (userId: string) => `lockdin:recapSeen:${userId}`;
const SESSION_KEY = "lockdin:recapShownThisSession";

/** ISO timestamp the user last caught up on friend activity, or null. */
export function getRecapLastSeen(userId: string): string | null {
  try {
    return localStorage.getItem(seenKey(userId));
  } catch {
    return null;
  }
}

export function setRecapLastSeen(userId: string, iso: string): void {
  try {
    localStorage.setItem(seenKey(userId), iso);
  } catch {
    /* ignore */
  }
}

/** Whether the recap has already auto-opened in this browser session. */
export function recapShownThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markRecapShownThisSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Default look-back when the user has no recorded last-seen (first visit). */
export function defaultSince(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

/** Minimum time away before the recap auto-opens on return (12 hours). */
export const RECAP_AWAY_MS = 12 * 60 * 60 * 1000;

/** True once the user has been away at least RECAP_AWAY_MS since last catch-up.
 *  Returns false when there's no baseline yet (a first visit establishes one). */
export function awayLongEnough(userId: string): boolean {
  const last = getRecapLastSeen(userId);
  if (!last) return false;
  const t = Date.parse(last);
  if (Number.isNaN(t)) return false;
  return Date.now() - t >= RECAP_AWAY_MS;
}

/* ---- Reaction-celebration dedupe: remember the newest received reaction we've
   already confetti'd, so the same one doesn't re-celebrate every recap. ---- */
const reactionCelKey = (userId: string) => `lockdin:reactionCelebrated:${userId}`;

export function getReactionCelebrated(userId: string): string | null {
  try {
    return localStorage.getItem(reactionCelKey(userId));
  } catch {
    return null;
  }
}

export function setReactionCelebrated(userId: string, iso: string): void {
  try {
    localStorage.setItem(reactionCelKey(userId), iso);
  } catch {
    /* ignore */
  }
}
