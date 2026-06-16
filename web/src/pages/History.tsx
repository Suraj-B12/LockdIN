/* =====================================================================
   History — the focus archive. A GitHub-style activity heatmap (last 12
   weeks) over a headline stats row, with the full session feed below.
   Fetches one generous batch (useHistory(200, 0)) and derives the heatmap,
   stats, and feed from it. All date math is hand-rolled in ./history/dates.
   ===================================================================== */
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useHistory, useBuddy } from "@/lib/queries";
import { Card, EyebrowTag, Reveal, Skeleton, SkeletonText } from "@/components/ui";
import { ActivityHeatmap } from "./history/ActivityHeatmap";
import { StatsRow } from "./history/StatsRow";
import { SessionFeed } from "./history/SessionFeed";
import { EmptyHistory } from "./history/EmptyHistory";
import { WeeklyWrap } from "./history/WeeklyWrap";
import { aggregateByDay, buildHeatmap, computeStats } from "./history/dates";

const FETCH_LIMIT = 200;

export function History() {
  const { data, isLoading, isError, error } = useHistory(FETCH_LIMIT, 0);
  const { data: buddy } = useBuddy();

  // Surface fetch failures as a toast (errors → sonner, per the brief).
  useEffect(() => {
    if (isError) {
      toast.error("Couldn't load your history", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }, [isError, error]);

  const sessions = data ?? [];

  const { heatmap, stats } = useMemo(() => {
    const byDay = aggregateByDay(sessions);
    return {
      heatmap: buildHeatmap(byDay),
      stats: computeStats(sessions, byDay),
    };
  }, [sessions]);

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      {/* Header */}
      <Reveal className="flex flex-col gap-3">
        <EyebrowTag>Everything you've logged</EyebrowTag>
        <h1 className="font-display text-3xl tracking-tightest text-ink sm:text-4xl">
          Your focus history
        </h1>
        <p className="max-w-xl text-pretty text-sm leading-relaxed text-ink-muted">
          Every session you've finished, with its focused time and AI score —
          and a heatmap of the last twelve weeks so streaks are easy to see.
        </p>
      </Reveal>

      <div className="mt-10">
        {isLoading ? (
          <LoadingState />
        ) : sessions.length === 0 ? (
          <EmptyHistory />
        ) : (
          <div className="flex flex-col gap-6">
            {/* Spotify-Wrapped-style recap of the last 7 days. */}
            <Reveal>
              <WeeklyWrap sessions={sessions} buddy={buddy} />
            </Reveal>

            {/* Heatmap + stats live in one tall card. */}
            <Reveal>
              <Card>
                <ActivityHeatmap model={heatmap} />
                <div className="mt-7 border-t border-hairline/[0.06] pt-2">
                  <Reveal stagger>
                    <StatsRow stats={stats} />
                  </Reveal>
                </div>
              </Card>
            </Reveal>

            {/* Session feed. */}
            <Reveal>
              <Card>
                <SessionFeed sessions={sessions} />
              </Card>
            </Reveal>
          </div>
        )}
      </div>
    </div>
  );
}

/** Shape-matched skeletons — heatmap block, stats row, then feed rows. */
function LoadingState() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-5 flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-[148px] w-full" />
        <div className="mt-7 grid grid-cols-2 gap-4 border-t border-hairline/[0.06] pt-6 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Skeleton className="mb-5 h-5 w-24" />
        <div className="flex flex-col gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-[88px] shrink-0">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="mt-1.5 h-3 w-12" />
              </div>
              <div className="flex-1">
                <Skeleton className="h-4 w-24" />
                <SkeletonText lines={1} className="mt-2" />
              </div>
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
