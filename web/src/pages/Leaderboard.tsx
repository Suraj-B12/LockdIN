/* =====================================================================
   Leaderboard — daily / weekly / all-time focus rankings among friends.
   Period tabs drive a useLeaderboard fetch; the viewer's standing is pinned
   in a highlight card, the top 20 render below with podium styling for the
   top three. With no friends on the board we show a prominent invite CTA
   (the cold-start state) rather than an empty panel.
   ===================================================================== */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthMe, useLeaderboard } from "@/lib/queries";
import { Card, EyebrowTag, Reveal, Skeleton } from "@/components/ui";
import type { LeaderboardPeriod } from "@/lib/types";
import { PeriodTabs } from "./leaderboard/PeriodTabs";
import { YourRankCard } from "./leaderboard/YourRankCard";
import { RankingRow } from "./leaderboard/RankingRow";
import { AddFriend } from "./leaderboard/AddFriend";
import { EmptyBoard } from "./leaderboard/EmptyBoard";
import { PERIOD_PHRASE } from "./leaderboard/format";

export function Leaderboard() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("daily");
  const { data, isLoading, isError, error } = useLeaderboard(period);
  const { data: me } = useAuthMe();

  // Errors → toast (keep the board visible underneath).
  useEffect(() => {
    if (isError) {
      toast.error("Couldn't load the leaderboard", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }, [isError, error]);

  const entries = data?.entries ?? [];
  const yourRank = data?.your_rank ?? null;
  const yourEntry = me ? entries.find((e) => e.user_id === me.id) : undefined;
  const isEmpty = !isLoading && entries.length === 0;

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      {/* Header + tabs. */}
      <Reveal className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <EyebrowTag>Where you stand</EyebrowTag>
          <h1 className="font-display text-3xl tracking-tightest text-ink sm:text-4xl">
            Leaderboard
          </h1>
          <p className="max-w-xl text-pretty text-sm leading-relaxed text-ink-muted">
            How you rank against your friends on focus {PERIOD_PHRASE[period]}.
            Real work, friendly competition.
          </p>
        </div>
        <PeriodTabs value={period} onChange={setPeriod} />
      </Reveal>

      <div className="mt-8">
        {isLoading ? (
          <LoadingState />
        ) : isEmpty ? (
          <Reveal>
            <EmptyBoard />
          </Reveal>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,380px)] lg:items-start">
            {/* Left: your rank + rankings list. */}
            <div className="flex flex-col gap-5">
              {yourRank != null && (
                <Reveal>
                  <YourRankCard
                    rank={yourRank}
                    period={period}
                    entry={yourEntry}
                    total={entries.length}
                  />
                </Reveal>
              )}

              <Reveal>
                <Card bodyClassName="p-3 sm:p-4">
                  <div className="mb-2 flex items-center justify-between px-2 pt-1">
                    <h2 className="font-display text-lg tracking-tight text-ink">
                      Rankings
                    </h2>
                    <span className="font-mono text-xs text-ink-faint tabular">
                      top {entries.length}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {entries.map((entry) => (
                      <li key={entry.user_id}>
                        <RankingRow
                          entry={entry}
                          isYou={!!me && entry.user_id === me.id}
                        />
                      </li>
                    ))}
                  </ul>
                </Card>
              </Reveal>
            </div>

            {/* Right: add-friend rail (sticky on desktop). */}
            <Reveal className="lg:sticky lg:top-28">
              <AddFriend />
            </Reveal>
          </div>
        )}
      </div>
    </div>
  );
}

/** Shape-matched skeletons: your-rank card, rankings list, add-friend rail. */
function LoadingState() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,380px)] lg:items-start">
      <div className="flex flex-col gap-5">
        <Card bodyClassName="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="flex-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-2 h-8 w-20" />
            </div>
            <div className="text-right">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="mt-1.5 h-3 w-14" />
            </div>
          </div>
        </Card>

        <Card bodyClassName="p-3 sm:p-4">
          <Skeleton className="mx-2 mb-3 mt-1 h-5 w-24" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-1.5 h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card bodyClassName="p-6">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <div className="flex-1">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-2 h-3 w-full" />
          </div>
        </div>
        <Skeleton className="mt-5 h-11 w-full" />
      </Card>
    </div>
  );
}
