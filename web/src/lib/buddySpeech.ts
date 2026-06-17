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
import linesData from "./buddyLines.json";

export interface BuddyState {
  buddyName?: string;
  moodLevel: number; // 1..10
  currentStreak: number;
  longestStreak: number;
  /** 0..23 local hour; defaults to now. */
  hour?: number;
}

/** A single buddy line: a stable id (-> pre-generated audio file) + its text. */
export interface BuddyLine {
  id: string;
  text: string;
}

interface RawLine {
  id: string;
  tags: string[];
  text: string;
}

const ALL_LINES: RawLine[] = (linesData.lines as RawLine[]) ?? [];

function byTag(tag: string): RawLine[] {
  return ALL_LINES.filter((l) => l.tags.includes(tag));
}

/** Remember the last few line ids per device so we never repeat back-to-back. */
const recent: string[] = [];
const RECENT_MAX = 12;

/** Weighted tag selection from the buddy's state (mood / streak / time). */
function candidatePool(s: BuddyState): RawLine[] {
  const hour = s.hour ?? new Date().getHours();
  const tags: string[] = ["greeting"];

  if (s.moodLevel >= 8) tags.push("mood-high", "mood-high");
  else if (s.moodLevel >= 4) tags.push("mood-mid");
  else tags.push("mood-low", "mood-low");

  if (s.currentStreak <= 0) tags.push("streak-zero");
  else if (s.currentStreak < 7) tags.push("streak-building");
  else tags.push("streak-strong");

  // A genuine personal best earns its own celebratory pool (weighted heavier).
  if (s.currentStreak > 0 && s.currentStreak >= s.longestStreak) {
    tags.push("record", "record");
  }

  if (hour >= 5 && hour < 11) tags.push("morning");
  else if (hour >= 18 && hour < 23) tags.push("evening");
  else if (hour >= 23 || hour < 5) tags.push("latenight");

  return tags.flatMap(byTag);
}

/**
 * Pick a buddy line for the given state, avoiding the most recent ids so it
 * never repeats back-to-back. Always returns *something* (best-effort).
 */
export function pickBuddyLine(state: BuddyState): BuddyLine {
  const pool = candidatePool(state);
  const fresh = pool.filter((l) => !recent.includes(l.id));
  const pickFrom = fresh.length ? fresh : pool;
  const chosen =
    pickFrom[Math.floor(Math.random() * pickFrom.length)] ??
    ALL_LINES[0] ?? { id: "fallback", text: "Let's lock in." };

  recent.push(chosen.id);
  while (recent.length > RECENT_MAX) recent.shift();
  return { id: chosen.id, text: chosen.text };
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

/* ---------------------------------------------------------------------------
   Premium pre-generated audio (with Web-Speech fallback).
   Each line has a stable id → /audio/buddy/<pack>/<id>.<ext>. If the file is
   missing (not generated/deployed yet) or playback fails, we fall back to the
   on-device Web Speech voice — so the buddy always talks, and silently upgrades
   to premium the moment the audio is deployed.
   ------------------------------------------------------------------------- */
const AUDIO_PACK: string = (linesData as { pack?: string }).pack || "default";
const AUDIO_EXT = "wav"; // Gemini TTS output; matches the generation script

export function audioUrlFor(id: string): string {
  return `/audio/buddy/${AUDIO_PACK}/${id}.${AUDIO_EXT}`;
}

let currentAudio: HTMLAudioElement | null = null;
// Remember ids whose audio is missing so we stop hitting the network for them.
const missingAudio = new Set<string>();

function stopAudio(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
    } catch {
      /* ignore */
    }
    currentAudio = null;
  }
}

/**
 * Speak a buddy line: prefer the pre-generated PREMIUM audio; if it's missing or
 * fails, fall back to the on-device Web Speech voice. Best-effort, respects mute.
 * Call from a user gesture (tap) so autoplay is allowed.
 */
export function playBuddyLine(line: BuddyLine, opts?: { force?: boolean }): void {
  try {
    if (!line || !line.text) return;
    if (!opts?.force && isBuddyMuted()) return;

    // Stop anything already playing/speaking so taps don't pile up.
    cancelSpeech();
    stopAudio();

    if (typeof Audio === "undefined" || missingAudio.has(line.id)) {
      speakLine(line.text, opts);
      return;
    }

    const audio = new Audio(audioUrlFor(line.id));
    currentAudio = audio;
    const fallback = () => {
      missingAudio.add(line.id); // don't retry this file this session
      if (currentAudio === audio) currentAudio = null;
      speakLine(line.text, opts);
    };
    audio.addEventListener("error", fallback, { once: true });
    audio.addEventListener("ended", () => {
      if (currentAudio === audio) currentAudio = null;
    });
    const p = audio.play();
    if (p && typeof p.catch === "function") p.catch(fallback);
  } catch {
    try {
      speakLine(line.text, opts);
    } catch {
      /* delight layer — never throw */
    }
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
