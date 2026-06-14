/* =====================================================================
   BuddyCard — the current companion (avatar + name + mood label + streaks)
   alongside a gallery of all ten mood frames, with the current mood lifted
   and ringed. Privacy-framed: the buddy mirrors YOUR consistency, never
   compares you to anyone.
   ===================================================================== */
import { motion, useReducedMotion } from "framer-motion";
import { Flame } from "@phosphor-icons/react";
import { Card } from "@/components/ui";
import { getBuddyAvatar, moodLabel, moodEmoji, MOOD_MIN, MOOD_MAX } from "@/lib/buddy";
import type { BuddyResponse } from "@/lib/types";
import { EASE_SMOOTH } from "@/lib/motion";

interface BuddyCardProps {
  buddy: BuddyResponse;
}

const ALL_MOODS = Array.from({ length: MOOD_MAX - MOOD_MIN + 1 }, (_, i) => i + MOOD_MIN);

export function BuddyCard({ buddy }: BuddyCardProps) {
  const reduce = useReducedMotion();
  const mood = buddy.mood_level;

  return (
    <Card tone="teal" bodyClassName="p-6 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-eyebrow text-ink-faint">Your buddy</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2/70 px-2.5 py-1 text-xs font-medium text-ink-soft ring-1 ring-inset ring-hairline/10 tabular">
          <Flame weight="fill" className="h-3.5 w-3.5 text-teal-bright" />
          {buddy.current_streak}-day streak
        </span>
      </div>

      {/* Current buddy */}
      <div className="mt-5 flex items-center gap-5">
        <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full bg-surface-2/50 ring-1 ring-inset ring-hairline/10">
          <motion.img
            key={`${buddy.buddy_type}-${mood}`}
            src={getBuddyAvatar(buddy.buddy_type, mood)}
            alt={`${buddy.buddy_name} feeling ${moodLabel(mood).toLowerCase()}`}
            className="relative h-24 w-24 select-none object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: EASE_SMOOTH }}
            draggable={false}
          />
        </div>

        <div className="min-w-0">
          <h3 className="truncate font-display text-2xl tracking-tightest text-ink">
            {buddy.buddy_name || "Buddy"}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <span aria-hidden className="text-base leading-none">
              {moodEmoji(mood)}
            </span>
            <span>
              Feeling {moodLabel(mood).toLowerCase()}
            </span>
          </p>
          {/* Mood meter */}
          <div className="mt-3 h-2 w-full max-w-[220px] overflow-hidden rounded-full bg-surface-3/70">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-teal-deep via-teal to-teal-bright"
              initial={false}
              animate={{ width: `${mood * 10}%` }}
              transition={{ duration: 0.6, ease: EASE_SMOOTH }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            Longest run: <span className="tabular text-ink-muted">{buddy.longest_streak} days</span>
          </p>
        </div>
      </div>

      {/* Mood gallery — all ten frames, current highlighted */}
      <div className="mt-7">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink-faint">
          Mood at every streak
        </p>
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {ALL_MOODS.map((m) => {
            const active = m === mood;
            return (
              <div
                key={m}
                title={`${m}. ${moodLabel(m)}`}
                aria-label={`Mood ${m}: ${moodLabel(m)}${active ? " (current)" : ""}`}
                className={[
                  "group relative grid aspect-square place-items-center rounded-xl border transition-all duration-300 ease-smooth",
                  active
                    ? "border-teal/45 bg-teal/10 ring-1 ring-inset ring-teal/20"
                    : "border-hairline/[0.07] bg-surface-2/40 opacity-55 hover:opacity-90",
                ].join(" ")}
              >
                <img
                  src={getBuddyAvatar(buddy.buddy_type, m)}
                  alt=""
                  loading="lazy"
                  className="h-10 w-10 object-contain sm:h-9 sm:w-9"
                  draggable={false}
                />
                {active && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-teal px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-canvas">
                    Now
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
