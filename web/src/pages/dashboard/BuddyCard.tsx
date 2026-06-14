/* =====================================================================
   BuddyCard — your accountability companion. Real avatar frame (15 buddies ×
   10 moods) with a subtle idle float, a mood meter, and the mood label. The
   whole card links to /profile (where the buddy is managed). The buddy is the
   product's heart, so the motion here is gentle and alive.
   ===================================================================== */
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, ArrowUpRight } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui";
import { useBuddy } from "@/lib/queries";
import { getBuddyAvatar, moodLabel } from "@/lib/buddy";
import { EASE_SMOOTH } from "@/lib/motion";
import { CardHead } from "./parts";

export function BuddyCard() {
  const reduce = useReducedMotion();
  const { data: buddy, isLoading, isError } = useBuddy();

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

      <Link
        to="/profile"
        className="group mt-4 flex flex-1 flex-col items-center justify-center rounded-2xl px-2 py-3 text-center transition-colors hover:bg-surface-3/30"
      >
        {isLoading ? (
          <>
            <Skeleton circle className="h-28 w-28" />
            <Skeleton className="mt-4 h-4 w-24" />
            <Skeleton className="mt-2 h-3 w-16" />
          </>
        ) : isError || !buddy ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-surface-3/70 text-3xl">
              🙂
            </span>
            <p className="mt-2 text-sm font-medium text-ink">Meet your buddy</p>
            <p className="text-xs text-ink-muted">Pick one to start your streak.</p>
          </div>
        ) : (
          <>
            {/* floating avatar */}
            <div className="relative grid h-32 w-32 place-items-center">
              <motion.img
                src={getBuddyAvatar(buddy.buddy_type, buddy.mood_level)}
                alt={`${buddy.buddy_name}, feeling ${moodLabel(buddy.mood_level).toLowerCase()}`}
                className="relative h-32 w-32 select-none object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
                draggable={false}
                animate={reduce ? undefined : { y: [0, -8, 0] }}
                transition={
                  reduce
                    ? undefined
                    : { duration: 6, ease: "easeInOut", repeat: Infinity }
                }
              />
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
          </>
        )}
      </Link>
    </div>
  );
}
