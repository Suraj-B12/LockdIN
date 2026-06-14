/* =====================================================================
   YourRankCard — a teal-toned highlight that pins where the viewer stands in
   the current period, even if they're below the fold of the top-20 list.
   ===================================================================== */
import { Trophy } from "@phosphor-icons/react";
import { Card } from "@/components/ui";
import type { LeaderboardEntry, LeaderboardPeriod } from "@/lib/types";
import { formatFocus, formatScore, PERIOD_PHRASE } from "./format";

interface YourRankCardProps {
  rank: number;
  period: LeaderboardPeriod;
  /** The viewer's own entry, if it appears in the returned top 20. */
  entry?: LeaderboardEntry;
  /** Total entries in the board (for the "of N" denominator). */
  total: number;
}

export function YourRankCard({ rank, period, entry, total }: YourRankCardProps) {
  return (
    <Card tone="teal" interactive bodyClassName="p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal/12 text-teal-bright ring-1 ring-inset ring-teal/20">
          <Trophy weight="duotone" className="h-6 w-6" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-eyebrow text-teal-bright">
            Your rank · {PERIOD_PHRASE[period]}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight text-ink tabular">
              #{rank}
            </span>
            {total > 0 && (
              <span className="font-mono text-xs text-ink-faint tabular">
                of {total}
              </span>
            )}
          </div>
        </div>

        {entry && (
          <div className="shrink-0 text-right">
            <div className="font-mono text-xl font-semibold text-ink tabular">
              {formatScore(entry.total_score)}
              <span className="ml-1 text-xs font-normal text-ink-muted">pts</span>
            </div>
            <div className="font-mono text-[11px] text-ink-faint tabular">
              {formatFocus(entry.total_seconds)} focused
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
