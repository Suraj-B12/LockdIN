/* =====================================================================
   ReactionBar — give-only positive reactions on a friend's session. Six fixed
   emoji; tap to toggle yours (teal when active), counts shown when > 0. No
   downvotes, no "seen" state — recognition of effort, never judgment.
   ===================================================================== */
import { motion, useReducedMotion } from "framer-motion";
import type { ReactionEmoji, ReactionState } from "@/lib/types";
import { REACTIONS } from "@/lib/reactions";
import { cn } from "@/lib/cn";

const EMOJI = REACTIONS;

export interface ReactionBarProps {
  state?: ReactionState;
  onToggle: (emoji: ReactionEmoji) => void;
  disabled?: boolean;
}

export function ReactionBar({ state, onToggle, disabled }: ReactionBarProps) {
  const reduce = useReducedMotion();
  const counts = state?.counts ?? {};
  // Single-select: at most one of your reactions is active at a time.
  const mine = state?.mine?.[0];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {EMOJI.map((e) => {
        const count = counts[e.key] ?? 0;
        const active = mine === e.key;
        return (
          <motion.button
            key={e.key}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(e.key)}
            aria-label={e.label}
            aria-pressed={active}
            title={e.label}
            whileTap={reduce ? undefined : { scale: 0.86 }}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs leading-none ring-1 ring-inset transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55 disabled:opacity-50",
              active
                ? "bg-teal/15 text-teal-bright ring-teal/30"
                : "bg-surface-2/60 text-ink-muted ring-hairline/10 hover:text-ink hover:ring-hairline/20"
            )}
          >
            <span aria-hidden className="text-sm leading-none">
              {e.glyph}
            </span>
            {count > 0 && <span className="font-mono tabular">{count}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}
