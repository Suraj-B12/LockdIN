/* =====================================================================
   Buddy avatars + mood maps.
   15 buddies × 10 mood frames live at /avatars/Avatar {n}/{01..10}.png
   (normalized from the source Avatars/ tree — clean, zero-padded filenames).

   Mood labels / emoji mirror the backend exactly:
     - services/scheduler.py  (_MOOD_LABELS, _MOOD_EMOJI)
     - services/streak_calculator.py (get_mood_level: streak → 1..10)
   ===================================================================== */

export const BUDDY_COUNT = 15;
export const MOOD_MIN = 1;
export const MOOD_MAX = 10;

/** Mood level (1–10) → human-readable label. Mirrors scheduler._MOOD_LABELS. */
export const MOOD_LABELS: Record<number, string> = {
  1: "Devastated",
  2: "Sad",
  3: "Down",
  4: "Neutral",
  5: "Okay",
  6: "Content",
  7: "Happy",
  8: "Excited",
  9: "Thrilled",
  10: "Ecstatic",
};

/** Mood level (1–10) → emoji. Mirrors scheduler._MOOD_EMOJI. */
export const MOOD_EMOJI: Record<number, string> = {
  1: "😢",
  2: "😟",
  3: "😔",
  4: "😐",
  5: "🙂",
  6: "😊",
  7: "😄",
  8: "😁",
  9: "🤩",
  10: "🥳",
};

function clampMood(mood: number): number {
  if (!Number.isFinite(mood)) return MOOD_MIN;
  return Math.min(MOOD_MAX, Math.max(MOOD_MIN, Math.round(mood)));
}

/**
 * Normalize an arbitrary buddy_type into a buddy index 1..15.
 * Accepts: "Avatar 7", "avatar7", "7", 7, "buddy-3". Falls back to 1.
 */
export function buddyIndex(buddyType: string | number | null | undefined): number {
  if (typeof buddyType === "number" && Number.isFinite(buddyType)) {
    return clampIndex(buddyType);
  }
  if (typeof buddyType === "string") {
    const m = buddyType.match(/\d+/);
    if (m) return clampIndex(parseInt(m[0], 10));
  }
  return 1;
}

function clampIndex(n: number): number {
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(BUDDY_COUNT, Math.max(1, Math.round(n)));
}

/**
 * Resolve the avatar image path for a given buddy + mood.
 * @param buddyType  e.g. "Avatar 7" | 7 | "7"
 * @param moodLevel  1..10 (clamped)
 */
export function getBuddyAvatar(
  buddyType: string | number | null | undefined,
  moodLevel: number
): string {
  const idx = buddyIndex(buddyType);
  const mood = clampMood(moodLevel);
  const frame = String(mood).padStart(2, "0");
  return `/avatars/Avatar ${idx}/${frame}.png`;
}

/** The "happiest" frame for a buddy — used in pickers / previews. */
export function getBuddyHeadshot(buddyType: string | number | null | undefined): string {
  return getBuddyAvatar(buddyType, MOOD_MAX);
}

export function moodLabel(moodLevel: number): string {
  return MOOD_LABELS[clampMood(moodLevel)] ?? "Neutral";
}

export function moodEmoji(moodLevel: number): string {
  return MOOD_EMOJI[clampMood(moodLevel)] ?? "🙂";
}

/** Canonical buddy_type string for a given index (what we PUT to the API). */
export function buddyTypeFor(index: number): string {
  return `Avatar ${clampIndex(index)}`;
}

/** All buddy indices, for rendering pickers. */
export const ALL_BUDDIES: number[] = Array.from({ length: BUDDY_COUNT }, (_, i) => i + 1);
