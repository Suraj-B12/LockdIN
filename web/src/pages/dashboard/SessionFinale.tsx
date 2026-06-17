/* =====================================================================
   SessionFinale — the ceremonial close to a focus session. A full-screen overlay
   that runs a short CHOREOGRAPHY rather than firing everything at once:

     1. score counts up on an S-curve (slow → fast → slow)
     2. on settle, the streak chip ticks in with a spring pop
     3. the buddy reacts (peak-end), then confetti + haptic land

   "Surprise garnish": standout scores (≥90) occasionally get gold, fuller
   confetti + a special line, so the reward stays variable. NOT motion-gated for
   confetti/haptics (the test device runs Reduce Motion); the count-up itself
   honors Reduce Motion via CountUp (snaps to the final number).
   ===================================================================== */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkle, Flame, Check } from "@phosphor-icons/react";
import { CountUp } from "@/components/CountUp";
import { useBuddy } from "@/lib/queries";
import { fireConfetti, playChime, buzz } from "@/lib/celebrate";
import { SPRING_SNAPPY } from "@/lib/motion";
import { scoreToneClass } from "./utils";

export interface SessionFinaleProps {
  score: number | null;
  streak: number;
  durationLabel: string;
  /** Called at the buddy-reaction beat (peak-end). */
  onSpeak?: () => void;
  onClose: () => void;
}

/** A little flourish line for standout scores (the "surprise garnish"). */
const GARNISH_LINES = [
  "On fire — that's elite focus.",
  "Personal-best energy. 🔥",
  "Locked in like a pro.",
  "That's a top-tier session.",
];

export function SessionFinale({ score, streak, durationLabel, onSpeak, onClose }: SessionFinaleProps) {
  const hasScore = typeof score === "number";
  // `streak` is captured at finish (pre-increment). The buddy query is invalidated
  // by the finish mutation, so once it refetches it carries the authoritative,
  // post-finish value — prefer the larger so the chip ticks up, never flickers down.
  const { data: liveBuddy } = useBuddy();
  const displayStreak = Math.max(streak, liveBuddy?.current_streak ?? 0);
  // Decide the garnish ONCE per finale (stable across re-renders): a standout
  // score sometimes earns gold, fuller confetti + a special line.
  const garnish = useMemo(
    () => hasScore && (score as number) >= 90 && Math.random() < 0.6,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const garnishLine = useMemo(
    () => GARNISH_LINES[Math.floor(Math.random() * GARNISH_LINES.length)],
    []
  );

  // count → reveal. With no score we skip straight to the reveal beat.
  const [revealed, setRevealed] = useState(!hasScore);
  const firedRef = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // The reveal beat: confetti + chime + buddy + haptic, exactly once.
  useEffect(() => {
    if (!revealed || firedRef.current) return;
    firedRef.current = true;
    fireConfetti(garnish ? { gold: true, big: true } : undefined);
    playChime();
    buzz(garnish ? [30, 50, 30, 50, 80] : [28, 40, 28, 40, 60]);
    onSpeak?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  // If there's no number to count, advance to the reveal after a short beat.
  useEffect(() => {
    if (hasScore) return;
    const t = window.setTimeout(() => setRevealed(true), 250);
    return () => window.clearTimeout(t);
  }, [hasScore]);

  // Auto-dismiss a few seconds after the reveal; allow manual close anytime.
  useEffect(() => {
    if (!revealed) return;
    closeRef.current?.focus();
    const t = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(t);
  }, [revealed, onClose]);

  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-overlay grid place-items-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-modal="true"
      aria-label="Session complete"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 340, damping: 26 }}
        className={
          "relative w-full max-w-sm overflow-hidden rounded-squircle bg-surface-2 p-7 text-center shadow-card-hover ring-1 ring-inset " +
          (garnish ? "ring-[#FDB931]/30" : "ring-teal/20")
        }
      >
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-eyebrow ring-1 ring-inset " +
            (garnish
              ? "bg-[#FDB931]/10 text-[#FDB931] ring-[#FDB931]/20"
              : "bg-teal/10 text-teal-bright ring-teal/15")
          }
        >
          <Sparkle weight="fill" className="h-3.5 w-3.5" />
          {garnish ? "Standout session" : "Session complete"}
        </span>

        {/* Score count-up (or a clean check when there's no number yet) */}
        {hasScore ? (
          <div className="mt-6 flex items-baseline justify-center gap-2">
            <CountUp
              value={score as number}
              durationMs={1150}
              onDone={() => setRevealed(true)}
              className={`font-mono text-7xl font-bold tabular leading-none ${scoreToneClass(score as number)}`}
            />
            <span className="font-mono text-base tabular text-ink-faint">/100</span>
          </div>
        ) : (
          <div className="mx-auto mt-6 grid h-20 w-20 place-items-center rounded-full bg-teal/10 text-teal-bright ring-1 ring-inset ring-teal/20">
            <Check weight="bold" className="h-9 w-9" />
          </div>
        )}

        <p className="mt-3 text-sm text-ink-muted">
          {durationLabel} of focus{hasScore ? " · your score will sharpen in a moment" : " logged"}.
        </p>

        {/* Streak tick — pops in only after the reveal beat. */}
        {revealed && displayStreak > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={SPRING_SNAPPY}
            className="mx-auto mt-5 inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-sm font-semibold text-warning ring-1 ring-inset ring-warning/20"
          >
            <Flame weight="fill" className="h-4 w-4" />
            {displayStreak}-day streak
          </motion.div>
        )}

        {revealed && garnish && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            className="mt-4 text-balance font-display text-lg tracking-tight text-ink"
          >
            {garnishLine}
          </motion.p>
        )}

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-teal py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55"
        >
          Keep going
        </button>
      </motion.div>
    </motion.div>
  );
}
