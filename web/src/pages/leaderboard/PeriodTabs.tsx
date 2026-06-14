/* =====================================================================
   PeriodTabs — segmented control for Today / This week / All time.
   The active pill is a shared-layout element that springs between tabs
   (framer-motion layoutId), so switching periods feels physical.
   ===================================================================== */
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { SPRING_SNAPPY } from "@/lib/motion";
import type { LeaderboardPeriod } from "@/lib/types";
import { PERIODS } from "./format";

interface PeriodTabsProps {
  value: LeaderboardPeriod;
  onChange: (next: LeaderboardPeriod) => void;
}

export function PeriodTabs({ value, onChange }: PeriodTabsProps) {
  const reduce = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label="Leaderboard period"
      className="inline-flex items-center gap-1 rounded-full border border-hairline/[0.08] bg-surface/60 p-1 shadow-inset-top backdrop-blur-sm"
    >
      {PERIODS.map((p) => {
        const active = p.key === value;
        return (
          <button
            key={p.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(p.key)}
            className={cn(
              "relative rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-bright/70",
              active ? "text-canvas" : "text-ink-muted hover:text-ink"
            )}
          >
            {active && (
              <motion.span
                layoutId="lb-period-pill"
                className="absolute inset-0 -z-10 rounded-full bg-teal shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset]"
                transition={reduce ? { duration: 0 } : SPRING_SNAPPY}
              />
            )}
            <span className="whitespace-nowrap">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
