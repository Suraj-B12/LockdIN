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
   ------------------------------------------------------------------------- */

const MUTE_KEY = "lockdin:buddyMuted";

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
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Prefer a pleasant local English voice; cache the choice. */
let chosenVoice: SpeechSynthesisVoice | null = null;
function pickVoice(): SpeechSynthesisVoice | null {
  if (!speechSupported()) return null;
  if (chosenVoice) return chosenVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const prefer = [
    "Google UK English Female",
    "Samantha",
    "Karen",
    "Google US English",
    "Microsoft Aria Online (Natural) - English (United States)",
  ];
  chosenVoice =
    prefer.map((n) => voices.find((v) => v.name === n)).find(Boolean) ??
    voices.find((v) => v.lang?.startsWith("en") && /female|aria|samantha|karen/i.test(v.name)) ??
    voices.find((v) => v.lang?.startsWith("en")) ??
    voices[0];
  return chosenVoice;
}

export function cancelSpeech(): void {
  try {
    if (speechSupported()) window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

/**
 * Speak a line aloud (best-effort). No-ops when unsupported or muted. Cancels
 * any in-flight utterance first so taps don't pile up.
 */
export function speakLine(text: string): void {
  try {
    if (!speechSupported() || isBuddyMuted() || !text) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = 1.02;
    u.pitch = 1.12; // a touch bright/friendly
    u.volume = 1;
    synth.speak(u);
  } catch {
    /* speech is a delight layer, never a hard dependency */
  }
}

// Voices populate asynchronously in most browsers — warm the cache when ready.
if (speechSupported()) {
  try {
    window.speechSynthesis.onvoiceschanged = () => {
      chosenVoice = null;
      pickVoice();
    };
  } catch {
    /* ignore */
  }
}
