/* =====================================================================
   Onboarding · Step 2 — Choose your buddy.
   A responsive grid of the 15 characters (happiest frame via getBuddyHeadshot).
   Selecting one lights a teal ring + check badge and reveals the CTA. Tiles
   reveal in a stagger; selection has spring physics on the badge.
   ===================================================================== */
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight } from "@phosphor-icons/react";
import { Button, EyebrowTag } from "@/components/ui";
import { ALL_BUDDIES, getBuddyHeadshot } from "@/lib/buddy";
import { EASE_OUT, EASE_SMOOTH } from "@/lib/motion";
import { cn } from "@/lib/cn";

export interface ChooseBuddyStepProps {
  /** 1-based selected buddy index, or null. */
  selected: number | null;
  onSelect: (index: number) => void;
  onContinue: () => void;
}

const gridStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.08 } },
};

const tileVariant = {
  hidden: { opacity: 0, y: 16, scale: 0.94 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: EASE_SMOOTH },
  },
};

export function ChooseBuddyStep({ selected, onSelect, onContinue }: ChooseBuddyStepProps) {
  return (
    <div className="flex w-full flex-col items-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_SMOOTH }}
        className="flex flex-col items-center"
      >
        <EyebrowTag>Choose your partner</EyebrowTag>
        <h1 className="mt-6 text-balance font-display text-4xl tracking-tightest text-ink sm:text-5xl">
          Pick the one that&rsquo;s yours.
        </h1>
        <p className="mt-4 max-w-md text-pretty leading-relaxed text-ink-muted">
          This is who holds you accountable. They&rsquo;ll mirror every streak &mdash; choose the
          one that speaks to you.
        </p>
      </motion.div>

      <motion.div
        className="mt-10 grid w-full grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5"
        variants={gridStagger}
        initial="hidden"
        animate="show"
      >
        {ALL_BUDDIES.map((index) => {
          const isSelected = selected === index;
          return (
            <motion.button
              key={index}
              type="button"
              variants={tileVariant}
              onClick={() => onSelect(index)}
              aria-pressed={isSelected}
              aria-label={`Buddy ${index}`}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-2xl p-2",
                "ring-1 ring-inset transition-[background-color,box-shadow,transform] duration-300 ease-out-strong",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-bright/70",
                isSelected
                  ? "bg-teal/[0.08] ring-2 ring-teal/55"
                  : "bg-surface-2/50 ring-hairline/[0.08] hover:-translate-y-0.5 hover:bg-surface-2/80 hover:ring-hairline/[0.16]"
              )}
            >
              <img
                src={getBuddyHeadshot(index)}
                alt=""
                loading="lazy"
                draggable={false}
                className={cn(
                  "relative h-full w-full select-none object-contain transition-transform duration-300 ease-out-strong",
                  isSelected ? "scale-[1.04]" : "group-hover:scale-[1.03]"
                )}
              />

              {/* check badge on selection */}
              <AnimatePresence>
                {isSelected && (
                  <motion.span
                    className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-teal text-canvas ring-2 ring-canvas"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 460, damping: 22 }}
                  >
                    <Check weight="bold" className="h-3.5 w-3.5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </motion.div>

      {/* CTA reveals once a buddy is chosen; reserve space to avoid layout jump. */}
      <div className="mt-10 flex min-h-[52px] items-center justify-center">
        <AnimatePresence mode="wait">
          {selected !== null ? (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              <Button size="lg" trailingIcon={ArrowRight} onClick={onContinue}>
                This is the one
              </Button>
            </motion.div>
          ) : (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-ink-faint"
            >
              Tap a buddy to choose them.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
