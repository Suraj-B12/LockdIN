/* =====================================================================
   Buddy speech — your companion talks to you.

   A curated, on-brand corpus of short first-person lines (the buddy speaking
   TO you), picked by the buddy's current MOOD, your STREAK state, and the TIME
   of day, with no-immediate-repeat shuffling so it always feels alive. Plus a
   best-effort Web Speech (`speechSynthesis`) reader so the lines can be *heard*
   — free, on-device, no backend, works offline.

   Tone law (matches the product): warm, a little playful, never cheesy, never
   guilt/fear. The buddy mirrors YOUR consistency and cheers you on.
   ===================================================================== */
import { useSyncExternalStore } from "react";

export interface BuddyState {
  buddyName?: string;
  moodLevel: number; // 1..10
  currentStreak: number;
  longestStreak: number;
  /** 0..23 local hour; defaults to now. */
  hour?: number;
}

/* {streak} → current streak, {best} → longest, {name} → buddy name. */
type Pool = string[];

const GREETINGS: Pool = [
  "There you are. Ready to lock in?",
  "Hey, you. Let's make this one count.",
  "Back again — I like your style.",
  "Good to see you. Shall we begin?",
  "You showed up. That's already the hard part.",
  "Let's turn minutes into momentum.",
  "I've been waiting for you. Let's go.",
  "One focused session, just you and me.",
];

const MOOD_HIGH: Pool = [
  // mood 8-10
  "Look at us go — I'm genuinely proud of you.",
  "You're on fire. Let's keep this flame alive.",
  "This is the best I've felt in ages. More?",
  "We're unstoppable right now. Don't stop.",
  "I'm beaming. You earned every bit of this.",
  "Whatever you're doing, keep doing exactly that.",
];

const MOOD_MID: Pool = [
  // mood 4-7
  "Steady wins it. One good session and I'm glowing.",
  "We've got this. Pick one thing and start.",
  "Small and consistent beats big and rare. Let's go.",
  "I'm feeling good — let's make me feel great.",
  "Nice and easy. Just press start.",
  "Momentum's a choice. Choose it with me?",
];

const MOOD_LOW: Pool = [
  // mood 1-3
  "I missed you. Let's start fresh — just one session.",
  "No guilt, only forward. Begin again with me?",
  "Rough patch? They pass. One session and we turn it around.",
  "I'm a little down, but you always bring me back. Ready?",
  "Let's not chase yesterday. Let's just start today.",
  "You came back. That matters more than any streak.",
];

const STREAK_ZERO: Pool = [
  "Every streak starts at one. Let's get ours today.",
  "Clean slate. Day one is always the best day to begin.",
  "No streak yet — perfect. Nothing to lose, everything to build.",
  "Let's light the first spark. One session does it.",
];

const STREAK_BUILDING: Pool = [
  // 1-6 days
  "{streak} days in. The habit is forming — feed it.",
  "We're {streak} deep. Don't break the chain now.",
  "{streak} and counting. Today keeps it alive.",
  "Look — {streak} days already. Let's stack another.",
];

const STREAK_STRONG: Pool = [
  // 7+ days
  "{streak} days. You're not the person who started this. Keep going.",
  "{streak} straight days of showing up. That's who you are now.",
  "{streak} days strong — this is rare air. Protect it.",
  "We built {streak} days together. Let's make it {streak} plus one.",
];

const AT_RECORD: Pool = [
  "A new record — {streak} days! I knew you had it in you.",
  "{streak} days: your best run ever. Soak it in, then continue.",
  "We've never been here before. {streak} days. History.",
];

const TIME_MORNING: Pool = [
  "Morning. Let's win the first hour and the day follows.",
  "Fresh start, fresh focus. Begin before the noise does.",
  "Early bird, deep work. Let's set the tone.",
];

const TIME_EVENING: Pool = [
  "One focused push before the day's done?",
  "Evening's quiet — perfect for real work. Join me?",
  "Finish strong. A short session still counts.",
];

const TIME_LATENIGHT: Pool = [
  "Burning the midnight oil? I'm right here with you.",
  "Late one tonight. Let's make it count, then rest.",
  "The world's asleep — your focus has the floor.",
];

/** Remember the last few lines per device so we never repeat back-to-back. */
const recent: string[] = [];
const RECENT_MAX = 12;

function fill(line: string, s: BuddyState): string {
  return line
    .split("{streak}").join(String(s.currentStreak))
    .split("{best}").join(String(s.longestStreak))
    .split("{name}").join(s.buddyName?.trim() || "Buddy");
}

/** Weighted pool selection: build a candidate list from the buddy's state. */
function candidatePools(s: BuddyState): Pool[] {
  const hour = s.hour ?? new Date().getHours();
  const pools: Pool[] = [GREETINGS];

  if (s.moodLevel >= 8) pools.push(MOOD_HIGH, MOOD_HIGH);
  else if (s.moodLevel >= 4) pools.push(MOOD_MID);
  else pools.push(MOOD_LOW, MOOD_LOW);

  if (s.currentStreak <= 0) pools.push(STREAK_ZERO);
  else if (s.currentStreak < 7) pools.push(STREAK_BUILDING);
  else pools.push(STREAK_STRONG);

  // A genuine personal best earns its own celebratory pool (weighted heavier).
  if (s.currentStreak > 0 && s.currentStreak >= s.longestStreak) {
    pools.push(AT_RECORD, AT_RECORD);
  }

  if (hour >= 5 && hour < 11) pools.push(TIME_MORNING);
  else if (hour >= 18 && hour < 23) pools.push(TIME_EVENING);
  else if (hour >= 23 || hour < 5) pools.push(TIME_LATENIGHT);

  return pools;
}

/**
 * Pick a buddy line for the given state, avoiding the most recent ones so it
 * never repeats back-to-back. Always returns *something* (best-effort).
 */
export function pickBuddyLine(state: BuddyState): string {
  const flat = candidatePools(state).flat();
  const filled = flat.map((l) => fill(l, state));
  const fresh = filled.filter((l) => !recent.includes(l));
  const pickFrom = fresh.length ? fresh : filled;
  const line = pickFrom[Math.floor(Math.random() * pickFrom.length)] ?? "Let's lock in.";

  recent.push(line);
  while (recent.length > RECENT_MAX) recent.shift();
  return line;
}

/* ---------------------------------------------------------------------------
   Speech (Web Speech API) — "nice to hear", best-effort, never throws.
   Users pick a VOICE and a STYLE (rate/pitch personality) in Manage; both
   persist in localStorage. Mute is a reactive store so every card + the
   settings panel stay in sync without a refetch.
   ------------------------------------------------------------------------- */

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** True only on devices with a real hover pointer (desktop), so touch taps —
 *  which synthesize a mouseenter before click — don't double-trigger a line. */
export function canHoverPointer(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia?.("(hover: hover)").matches === true;
  } catch {
    return false;
  }
}

export function cancelSpeech(): void {
  try {
    if (speechSupported()) window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

/* ---- Style presets (rate/pitch personalities) ---- */
export interface BuddyStyle {
  id: string;
  label: string;
  rate: number;
  pitch: number;
  hint: string;
}

export const BUDDY_STYLES: BuddyStyle[] = [
  // Pitches kept close to natural (1.0) — high pitch on synthetic voices reads
  // as "chipmunk". Style is conveyed more by rate than by extreme pitch.
  { id: "warm", label: "Warm", rate: 1.0, pitch: 1.03, hint: "Friendly and steady" },
  { id: "cheerful", label: "Cheerful", rate: 1.07, pitch: 1.15, hint: "Bright and upbeat" },
  { id: "calm", label: "Calm", rate: 0.9, pitch: 0.98, hint: "Soft and soothing" },
  { id: "energetic", label: "Energetic", rate: 1.2, pitch: 1.12, hint: "Fast and hyped" },
  { id: "deep", label: "Deep", rate: 0.95, pitch: 0.82, hint: "Low and grounded" },
];
const DEFAULT_STYLE = "warm";

const STYLE_KEY = "lockdin:buddyStyle";
const VOICE_KEY = "lockdin:buddyVoiceURI";
const MUTE_KEY = "lockdin:buddyMuted";

export function getBuddyStyleId(): string {
  try {
    return localStorage.getItem(STYLE_KEY) || DEFAULT_STYLE;
  } catch {
    return DEFAULT_STYLE;
  }
}
export function setBuddyStyleId(id: string): void {
  try {
    localStorage.setItem(STYLE_KEY, id);
  } catch {
    /* ignore */
  }
}
function currentStyle(): BuddyStyle {
  return BUDDY_STYLES.find((s) => s.id === getBuddyStyleId()) ?? BUDDY_STYLES[0];
}

export function getBuddyVoiceURI(): string | null {
  try {
    return localStorage.getItem(VOICE_KEY);
  } catch {
    return null;
  }
}
export function setBuddyVoiceURI(uri: string | null): void {
  try {
    if (uri) localStorage.setItem(VOICE_KEY, uri);
    else localStorage.removeItem(VOICE_KEY);
  } catch {
    /* ignore */
  }
}

/** Available voices, English first, for the picker. Empty until voices load.
 *  CACHED: useSyncExternalStore requires a stable reference between changes, so
 *  we recompute only on voiceschanged (see below), not on every read. */
const EMPTY_VOICES: SpeechSynthesisVoice[] = [];
let voicesCache: SpeechSynthesisVoice[] | null = null;

function computeVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return EMPTY_VOICES;
  const all = window.speechSynthesis.getVoices() || [];
  if (!all.length) return EMPTY_VOICES;
  const en = all.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  const rest = all.filter((v) => !v.lang?.toLowerCase().startsWith("en"));
  return [...en, ...rest];
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (voicesCache === null) voicesCache = computeVoices();
  return voicesCache;
}

/** Rank a voice for default selection — prefer modern "natural/neural" voices,
 *  penalise the robotic legacy SAPI ones (e.g. "Microsoft David Desktop") that
 *  make the buddy sound bad. Higher is better. */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const n = (v.name || "").toLowerCase();
  let s = 0;
  if (!v.lang?.toLowerCase().startsWith("en")) s -= 100; // English first
  if (/natural|neural|wavenet|studio/.test(n)) s += 60; // best modern engines
  if (/online/.test(n)) s += 30; // cloud voices generally cleaner
  if (/google/.test(n)) s += 40; // Chrome's Google voices are solid
  if (/aria|jenny|libby|sonia|emma|ava|serena|samantha|allison/.test(n)) s += 25; // good named voices
  if (/desktop|david|zira|mark|hazel|\beSpeak\b/i.test(n)) s -= 40; // robotic legacy
  if (v.localService === false) s += 8; // online ≈ nicer (but still works offline-pick)
  return s;
}

/** Resolve the SpeechSynthesisVoice to use: the user's pick, else the best-ranked. */
function resolveVoice(): SpeechSynthesisVoice | null {
  if (!speechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const uri = getBuddyVoiceURI();
  if (uri) {
    const chosen = voices.find((v) => v.voiceURI === uri);
    if (chosen) return chosen;
  }

  // Pick the highest-scoring voice (stable: ties keep getVoices() order).
  let best = voices[0];
  let bestScore = scoreVoice(best);
  for (const v of voices) {
    const sc = scoreVoice(v);
    if (sc > bestScore) {
      best = v;
      bestScore = sc;
    }
  }
  return best;
}

/* ---- Mute (reactive store so cards + settings stay in sync) ---- */
const muteListeners = new Set<() => void>();

export function isBuddyMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setBuddyMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (muted) cancelSpeech();
  muteListeners.forEach((l) => l());
}

function subscribeMuted(cb: () => void): () => void {
  muteListeners.add(cb);
  return () => muteListeners.delete(cb);
}

/** Reactive mute flag — re-renders all consumers when it changes anywhere. */
export function useBuddyMuted(): boolean {
  return useSyncExternalStore(subscribeMuted, isBuddyMuted, () => false);
}

/**
 * Speak a line aloud (best-effort). No-ops when unsupported or muted (unless
 * `force`, used by the Manage preview). Cancels any in-flight utterance first.
 */
export function speakLine(text: string, opts?: { force?: boolean }): void {
  try {
    if (!speechSupported() || !text) return;
    if (!opts?.force && isBuddyMuted()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = resolveVoice();
    if (v) u.voice = v;
    const style = currentStyle();
    u.rate = style.rate;
    u.pitch = style.pitch;
    u.volume = 1;
    synth.speak(u);
  } catch {
    /* speech is a delight layer, never a hard dependency */
  }
}

/* Voices populate asynchronously — notify any voice-picker listeners on load. */
const voiceListeners = new Set<() => void>();
export function subscribeVoices(cb: () => void): () => void {
  voiceListeners.add(cb);
  return () => voiceListeners.delete(cb);
}
if (speechSupported()) {
  try {
    window.speechSynthesis.onvoiceschanged = () => {
      voicesCache = computeVoices(); // refresh the cached (stable-ref) list
      voiceListeners.forEach((l) => l());
    };
  } catch {
    /* ignore */
  }
}
