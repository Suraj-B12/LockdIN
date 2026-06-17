/* =====================================================================
   PatternInsights — your buddy's read on how you focus. A clean grid of
   deterministic, encouraging insights derived from session history (no LLM).
   Hidden until there's enough data to be meaningful (a teaser shows progress).
   ===================================================================== */
import { useMemo } from "react";
import {
  Sparkle,
  Sun,
  CalendarCheck,
  Timer,
  Gauge,
  Brain,
  type Icon,
} from "@phosphor-icons/react";
import { Card } from "@/components/ui";
import type { SessionResponse } from "@/lib/types";
import { computeInsights, INSIGHTS_MIN, type InsightKind } from "./insights";

const ICONS: Record<InsightKind, Icon> = {
  "peak-time": Sun,
  "best-day": CalendarCheck,
  "sweet-length": Timer,
  "avg-score": Gauge,
  "deep-total": Brain,
};

export function PatternInsights({ sessions }: { sessions: SessionResponse[] }) {
  const { ready, count, insights } = useMemo(() => computeInsights(sessions), [sessions]);

  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal/10 text-teal-bright ring-1 ring-inset ring-teal/15">
          <Sparkle weight="duotone" className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h2 className="font-display text-lg tracking-tight text-ink">Your patterns</h2>
          <p className="text-xs text-ink-muted">What the data says about your best work.</p>
        </div>
      </div>

      {!ready ? (
        <div className="mt-5 rounded-2xl bg-surface-3/30 px-4 py-6 text-center ring-1 ring-inset ring-hairline/[0.07]">
          <p className="text-sm font-medium text-ink">A few more sessions unlocks your patterns</p>
          <p className="mt-1 text-xs text-ink-muted">
            {count}/{INSIGHTS_MIN} logged — keep going and your coach will spot your rhythm.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {insights.map((ins) => {
            const IconCmp = ICONS[ins.kind];
            return (
              <div
                key={ins.kind}
                className="flex items-start gap-3 rounded-2xl bg-surface-3/30 px-4 py-3.5 ring-1 ring-inset ring-hairline/[0.07]"
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal/[0.08] text-teal-bright">
                  <IconCmp weight="duotone" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] leading-snug text-ink-muted">{ins.headline}</p>
                  <p className="mt-0.5 font-display text-lg tracking-tight text-ink">{ins.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
