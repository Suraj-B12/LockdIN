/* =====================================================================
   ScopeTabs — switch the board between your Friends and the Global ranking.
   Same spring-pill segmented control as PeriodTabs, with small icons.
   ===================================================================== */
import { motion, useReducedMotion } from "framer-motion";
import { UsersThree, GlobeHemisphereWest } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { SPRING_SNAPPY } from "@/lib/motion";

export type LeaderboardScope = "friends" | "global";

const SCOPES: { key: LeaderboardScope; label: string; icon: typeof UsersThree }[] = [
  { key: "friends", label: "Friends", icon: UsersThree },
  { key: "global", label: "Global", icon: GlobeHemisphereWest },
];

interface ScopeTabsProps {
  value: LeaderboardScope;
  onChange: (next: LeaderboardScope) => void;
}

export function ScopeTabs({ value, onChange }: ScopeTabsProps) {
  const reduce = useReducedMotion();
  return (
    <div
      role="tablist"
      aria-label="Leaderboard scope"
      className="inline-flex items-center gap-1 rounded-full border border-hairline/[0.08] bg-surface/60 p-1 shadow-inset-top backdrop-blur-sm"
    >
      {SCOPES.map((s) => {
        const active = s.key === value;
        const Icon = s.icon;
        return (
          <button
            key={s.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s.key)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-bright/70",
              active ? "text-canvas" : "text-ink-muted hover:text-ink"
            )}
          >
            {active && (
              <motion.span
                layoutId="lb-scope-pill"
                className="absolute inset-0 -z-10 rounded-full bg-teal shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset]"
                transition={reduce ? { duration: 0 } : SPRING_SNAPPY}
              />
            )}
            <Icon weight={active ? "fill" : "regular"} className="h-4 w-4" />
            <span className="whitespace-nowrap">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
