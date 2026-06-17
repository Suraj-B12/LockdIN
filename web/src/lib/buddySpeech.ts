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
import voicesData from "./buddyVoices.json";

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

/* ---- Premium voices + tones (single source of truth: buddyVoices.json) ---- */
export interface BuddyVoice {
  id: string;
  label: string;
  sub: string;
  gemini: string;
  desc: string;
  /** Base pitch for the on-device fallback voice (steers gender/timbre feel). */
  fbPitch?: number;
}
export interface BuddyTone {
  id: string;
  label: string;
  prompt: string;
  rate: number;
  pitch: number;
}

export const BUDDY_VOICES: BuddyVoice[] = (voicesData.voices as BuddyVoice[]) ?? [];
export const BUDDY_TONES: BuddyTone[] = (voicesData.tones as BuddyTone[]) ?? [];
const AUDIO_EXT: string = (voicesData as { ext?: string }).ext || "mp3";
const DEFAULT_VOICE: string =
  (voicesData as { defaultVoice?: string }).defaultVoice || BUDDY_VOICES[0]?.id || "f-warm";
const DEFAULT_TONE: string =
  (voicesData as { defaultTone?: string }).defaultTone || BUDDY_TONES[0]?.id || "cheerful";

const VOICE_KEY = "lockdin:buddyVoice";
const TONE_KEY = "lockdin:buddyTone";
const MUTE_KEY = "lockdin:buddyMuted";

export function getBuddyVoice(): string {
  try {
    return localStorage.getItem(VOICE_KEY) || DEFAULT_VOICE;
  } catch {
    return DEFAULT_VOICE;
  }
}
export function setBuddyVoice(id: string): void {
  try {
    localStorage.setItem(VOICE_KEY, id);
  } catch {
    /* ignore */
  }
}
export function getBuddyTone(): string {
  try {
    return localStorage.getItem(TONE_KEY) || DEFAULT_TONE;
  } catch {
    return DEFAULT_TONE;
  }
}
export function setBuddyTone(id: string): void {
  try {
    localStorage.setItem(TONE_KEY, id);
  } catch {
    /* ignore */
  }
}
function currentTone(): BuddyTone | undefined {
  return BUDDY_TONES.find((t) => t.id === getBuddyTone()) ?? BUDDY_TONES[0];
}
function currentVoice(): BuddyVoice | undefined {
  return BUDDY_VOICES.find((v) => v.id === getBuddyVoice()) ?? BUDDY_VOICES[0];
}

type Gender = "male" | "female" | "unknown";

/** Best-effort gender of the SELECTED premium voice (from its `sub`). */
function selectedGender(): Gender {
  const sub = (currentVoice()?.sub || "").toLowerCase();
  if (sub.startsWith("m")) return "male";
  if (sub.startsWith("f")) return "female";
  return "unknown";
}

/** Heuristically classify a device voice by name. "female" is checked first
 *  (it contains the substring "male"). Unknown when no token matches. */
function voiceGender(v: SpeechSynthesisVoice): Gender {
  const n = (v.name || "").toLowerCase();
  const female =
    /female|zira|aria|jenny|michelle|hazel|susan|heera|samantha|karen|moira|tessa|fiona|veena|victoria|allison|\bava\b|serena|sonia|libby|emma|catherine|linda|amber|clara|nora|\bsara\b|paloma|elsa|joanna|salli|kendra|kimberly|\bivy\b|\bzoe\b|neerja/;
  const male =
    /\bmale\b|david|\bmark\b|\bguy\b|george|james|\bryan\b|\bsean\b|richard|\bpaul\b|\beric\b|daniel|oliver|thomas|\bfred\b|gordon|\blee\b|william|\balex\b|aaron|brian|\bliam\b|matthew|justin|kevin|arthur|rishi|prabhat/;
  if (female.test(n)) return "female";
  if (male.test(n)) return "male";
  return "unknown";
}

/* ---- Web Speech fallback voice (used when premium audio is unavailable) ---- */

/** Rank a device voice — prefer modern natural/neural voices, penalise robotic
 *  legacy SAPI ones ("Microsoft David/Zira Desktop"). Higher is better. */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const n = (v.name || "").toLowerCase();
  let s = 0;
  if (!v.lang?.toLowerCase().startsWith("en")) s -= 100;
  if (/natural|neural|wavenet|studio/.test(n)) s += 60;
  if (/online/.test(n)) s += 30;
  if (/google/.test(n)) s += 40;
  if (/aria|jenny|libby|sonia|emma|ava|serena|samantha|allison/.test(n)) s += 25;
  if (/desktop|david|zira|mark|hazel|eSpeak/i.test(n)) s -= 40;
  if (v.localService === false) s += 8;
  return s;
}

/** Pick the best device voice that MATCHES the selected voice's gender — so a
 *  Male premium voice falls back to a male device voice (not a female default). */
function resolveVoice(): SpeechSynthesisVoice | null {
  if (!speechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const want = selectedGender();
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const v of voices) {
    let sc = scoreVoice(v);
    if (want !== "unknown") {
      const g = voiceGender(v);
      if (g === want) sc += 120; // strongly prefer a matching-gender voice
      else if (g !== "unknown") sc -= 120; // strongly avoid the opposite gender
    }
    if (sc > bestScore) {
      best = v;
      bestScore = sc;
    }
  }
  return best ?? voices[0];
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
 * Speak a line via Web Speech (the on-device FALLBACK voice). No-ops when
 * unsupported or muted (unless `force`). Uses the selected tone's rate/pitch.
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
    const tone = currentTone();
    const voice = currentVoice();
    // Voice sets the base pitch (timbre/gender feel); tone nudges it + sets the
    // delivery speed. Clamp to a natural range so it never goes chipmunk/robotic.
    const basePitch = voice?.fbPitch ?? 1;
    const pitch = basePitch + ((tone?.pitch ?? 1) - 1);
    u.rate = tone?.rate ?? 1;
    u.pitch = Math.max(0.5, Math.min(1.6, pitch));
    u.volume = 1;
    synth.speak(u);
  } catch {
    /* speech is a delight layer, never a hard dependency */
  }
}

/* ---------------------------------------------------------------------------
   Premium pre-generated audio (with Web-Speech fallback).
   Path: /audio/buddy/<voice>/<tone>/<lineId>.<ext> — the selected voice + tone.
   If the file is missing (not generated/deployed yet) or playback fails, we fall
   back to the on-device Web Speech voice (with the tone's rate/pitch) — so the
   buddy always talks, and silently upgrades to premium once the audio is deployed.
   ------------------------------------------------------------------------- */
export function audioUrlFor(id: string): string {
  return `/audio/buddy/${getBuddyVoice()}/${getBuddyTone()}/${id}.${AUDIO_EXT}`;
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

    // Key the missing-set by full URL: the same line id maps to different files
    // per voice/tone, so a miss for one pack must not blacklist the others.
    const url = audioUrlFor(line.id);
    if (typeof Audio === "undefined" || missingAudio.has(url)) {
      speakLine(line.text, opts);
      return;
    }

    const audio = new Audio(url);
    currentAudio = audio;
    const fallback = () => {
      missingAudio.add(url); // don't retry this file this session
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
