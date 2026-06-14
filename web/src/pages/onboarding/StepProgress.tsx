/* =====================================================================
   StepProgress — the onboarding progress indicator.
   A row of labeled segments that fill teal as the user advances. The active
   segment's track animates its width with the signature curve; completed
   segments stay lit. Sentence-case labels, wide tracking.
   ===================================================================== */
import { motion } from "framer-motion";
import { EASE_SMOOTH } from "@/lib/motion";
import { cn } from "@/lib/cn";

export interface StepProgressProps {
  /** Labels, one per step (index 0-based). */
  steps: string[];
  /** Current step index (0-based). */
  current: number;
  className?: string;
}

export function StepProgress({ steps, current, className }: StepProgressProps) {
  return (
    <div className={cn("flex w-full max-w-xs items-center gap-2.5", className)}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex flex-1 flex-col items-center gap-2">
            <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3/70">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal to-teal-bright"
                initial={false}
                animate={{ width: done ? "100%" : active ? "100%" : "0%" }}
                transition={{ duration: 0.55, ease: EASE_SMOOTH }}
              />
            </div>
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-eyebrow transition-colors duration-300",
                active || done ? "text-teal-bright" : "text-ink-faint"
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
