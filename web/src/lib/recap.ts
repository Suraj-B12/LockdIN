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
