/* =====================================================================
   BuddyCard — your accountability companion. Real avatar frame (15 buddies ×
   10 moods) with a subtle idle float, a mood meter, and the mood label. Tap (or
   hover) the avatar and the buddy speaks a motivational line; "Manage" opens the
   profile. The buddy is the product's heart, so the motion here is gentle and alive.
   ===================================================================== */
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, ArrowUpRight } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui";
import { BuddySpeechBubble } from "@/components/BuddySpeechBubble";
import { useBuddy } from "@/lib/queries";
import { getBuddyAvatar, moodLabel } from "@/lib/buddy";
import {
  pickBuddyLine,
  speakLine,
  isBuddyMuted,
  setBuddyMuted,
} from "@/lib/buddySpeech";
import { EASE_SMOOTH } from "@/lib/motion";
import { CardHead } from "./parts";

export function BuddyCard() {
  const reduce = useReducedMotion();
  const { data: buddy, isLoading, isError } = useBuddy();

  const [line, setLine] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [muted, setMutedState] = useState(() => isBuddyMuted());

  const say = (speak: boolean) => {
    if (!buddy) return;
    const next = pickBuddyLine({
      buddyName: buddy.buddy_name,
      moodLevel: buddy.mood_level,
      currentStreak: buddy.current_streak,
      longestStreak: buddy.longest_streak,
    });
    setLine(next);
    setNonce((n) => n + 1);
    if (speak) speakLine(next);
  };
  const talk = () => say(true);
  const peek = () => {
    if (!line) say(false);
  };
  const replay = () => {
    if (line) speakLine(line);
  };
  const toggleMute = () => {
    const m = !muted;
    setMutedState(m);
    setBuddyMuted(m);
  };

  return (
    <div className="flex h-full flex-col">
      <CardHead icon={Heart} label="Your buddy">
        <Link
          to="/profile"
          aria-label="Manage your buddy"
          className="group inline-flex items-center gap-1 text-[12px] font-medium text-ink-muted transition-colors hover:text-teal-bright"
        >
          Manage
          <ArrowUpRight
            weight="bold"
            className="h-3.5 w-3.5 transition-transform duration-300 ease-out-strong group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </Link>
      </CardHead>

      {isLoading ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center px-2 py-3 text-center">
          <Skeleton circle className="h-28 w-28" />
          <Skeleton className="mt-4 h-4 w-24" />
          <Skeleton className="mt-2 h-3 w-16" />
        </div>
      ) : isError || !buddy ? (
        <Link
          to="/profile"
          className="mt-4 flex flex-1 flex-col items-center justify-center rounded-2xl px-2 py-3 text-center transition-colors hover:bg-surface-3/30"
        >
          <span className="grid h-20 w-20 place-items-center rounded-full bg-surface-3/70 text-3xl">
            🙂
          </span>
          <p className="mt-2 text-sm font-medium text-ink">Meet your buddy</p>
          <p className="text-xs text-ink-muted">Pick one to start your streak.</p>
        </Link>
      ) : (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center px-2 py-3 text-center">
          {/* talking avatar */}
          <div className="relative">
            <AnimatePresence>
              {line && (
                <div className="absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2">
                  <BuddySpeechBubble
                    text={line}
                    nonce={nonce}
                    muted={muted}
                    onReplay={replay}
                    onToggleMute={toggleMute}
                    onDismiss={() => setLine(null)}
                    tailAlign="center"
                  />
                </div>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={talk}
              onMouseEnter={peek}
              aria-label={`Talk to ${buddy.buddy_name || "your buddy"}`}
              className="group/buddy relative grid h-32 w-32 place-items-center rounded-2xl transition-transform duration-300 ease-out-strong hover:scale-[1.03] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55"
            >
              <motion.img
                src={getBuddyAvatar(buddy.buddy_type, buddy.mood_level)}
                alt={`${buddy.buddy_name}, feeling ${moodLabel(buddy.mood_level).toLowerCase()}`}
                className="relative h-32 w-32 select-none object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
                draggable={false}
                animate={reduce ? undefined : { y: [0, -8, 0] }}
                transition={
                  reduce ? undefined : { duration: 6, ease: "easeInOut", repeat: Infinity }
                }
              />
              <span className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-surface-3/85 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-ink-faint opacity-0 ring-1 ring-inset ring-hairline/10 transition-opacity duration-300 group-hover/buddy:opacity-100">
                Tap to talk
              </span>
            </button>
          </div>

          <p className="mt-3 truncate font-display text-lg tracking-tight text-ink">
            {buddy.buddy_name}
          </p>
          <p className="text-xs font-medium uppercase tracking-eyebrow text-teal-bright">
            {moodLabel(buddy.mood_level)}
          </p>

          {/* mood meter */}
          <div className="mt-4 w-full max-w-[12rem]">
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3/70">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal-deep via-teal to-teal-bright"
                initial={false}
                animate={{ width: `${(buddy.mood_level / 10) * 100}%` }}
                transition={{ duration: 0.6, ease: EASE_SMOOTH }}
              />
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[10px] tabular text-ink-faint">
              <span>mood</span>
              <span>{buddy.mood_level}/10</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
