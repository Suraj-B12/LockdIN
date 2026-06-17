/* =====================================================================
   Leaderboard — daily / weekly / all-time focus rankings, scoped to your
   FRIENDS or GLOBAL (all users). Friends view pins your standing + an invite
   rail; Global view lists the top focusers everywhere with one-tap "Add friend".
   ===================================================================== */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GlobeHemisphereWest } from "@phosphor-icons/react";
import { useAuthMe, useLeaderboard, useGlobalLeaderboard } from "@/lib/queries";
import { Card, EyebrowTag, Reveal, Skeleton } from "@/components/ui";
import type { LeaderboardPeriod, LeaderboardEntry, GlobalLeaderboardEntry } from "@/lib/types";
import { PeriodTabs } from "./leaderboard/PeriodTabs";
import { ScopeTabs, type LeaderboardScope } from "./leaderboard/ScopeTabs";
import { YourRankCard } from "./leaderboard/YourRankCard";
import { RankingRow } from "./leaderboard/RankingRow";
import { GlobalRankingRow } from "./leaderboard/GlobalRankingRow";
import { AddFriend } from "./leaderboard/AddFriend";
import { EmptyBoard } from "./leaderboard/EmptyBoard";
import { PERIOD_PHRASE } from "./leaderboard/format";

export function Leaderboard() {
  const [scope, setScope] = useState<LeaderboardScope>("friends");
  const [period, setPeriod] = useState<LeaderboardPeriod>("daily");
  const { data: me } = useAuthMe();

  const friends = useLeaderboard(period);
  const global = useGlobalLeaderboard(period, scope === "global");
  const active = scope === "global" ? global : friends;

  useEffect(() => {
    if (active.isError) {
      toast.error("Couldn't load the leaderboard", {
        description: active.error instanceof Error ? active.error.message : "Please try again.",
      });
    }
  }, [active.isError, active.error]);

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      {/* Header + controls. */}
      <Reveal className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <EyebrowTag>Where you stand</EyebrowTag>
          <h1 className="font-display text-3xl tracking-tightest text-ink sm:text-4xl">Leaderboard</h1>
          <p className="max-w-xl text-pretty text-sm leading-relaxed text-ink-muted">
            {scope === "global"
              ? `The top focusers everywhere, ${PERIOD_PHRASE[period]}. Find your people and add them.`
              : `How you rank against your friends on focus ${PERIOD_PHRASE[period]}. Real work, friendly competition.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ScopeTabs value={scope} onChange={setScope} />
          <PeriodTabs value={period} onChange={setPeriod} />
        </div>
      </Reveal>

      <div className="mt-8">
        {scope === "friends" ? (
          <FriendsBoard
            period={period}
            isLoading={friends.isLoading}
            entries={friends.data?.entries ?? []}
            yourRank={friends.data?.your_rank ?? null}
            meId={me?.id}
          />
        ) : (
          <GlobalBoard
            isLoading={global.isLoading}
            entries={global.data?.entries ?? []}
            yourRank={global.data?.your_rank ?? null}
            period={period}
            meId={me?.id}
          />
        )}
      </div>
    </div>
  );
}

/* ---- Friends board (your standing + rankings + invite rail) ---- */
function FriendsBoard({
  period,
  isLoading,
  entries,
  yourRank,
  meId,
}: {
  period: LeaderboardPeriod;
  isLoading: boolean;
  entries: LeaderboardEntry[];
  yourRank: number | null;
  meId?: string;
}) {
  if (isLoading) return <LoadingState withRail />;
  if (entries.length === 0)
    return (
      <Reveal>
        <EmptyBoard />
      </Reveal>
    );

  const yourEntry = meId ? entries.find((e) => e.user_id === meId) : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,380px)] lg:items-start">
      <div className="flex flex-col gap-5">
        {yourRank != null && (
          <Reveal>
            <YourRankCard rank={yourRank} period={period} entry={yourEntry} total={entries.length} />
          </Reveal>
        )}
        <Reveal>
          <Card bodyClassName="p-3 sm:p-4">
            <RankingsHeader count={entries.length} />
            <ul className="flex flex-col gap-1">
              {entries.map((entry) => (
                <li key={entry.user_id}>
                  <RankingRow entry={entry} isYou={!!meId && entry.user_id === meId} />
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>
      </div>
      <Reveal className="lg:sticky lg:top-28">
        <AddFriend />
      </Reveal>
    </div>
  );
}

/* ---- Global board (everyone, with add-friend per row) ---- */
function GlobalBoard({
  isLoading,
  entries,
  yourRank,
  period,
  meId,
}: {
  isLoading: boolean;
  entries: GlobalLeaderboardEntry[];
  yourRank: number | null;
  period: LeaderboardPeriod;
  meId?: string;
}) {
  if (isLoading) return <LoadingState />;
  if (entries.length === 0)
    return (
      <Reveal>
        <Card bodyClassName="p-10">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-3/60 text-ink-muted">
              <GlobeHemisphereWest weight="duotone" className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-ink">No one's on the board yet</p>
            <p className="text-xs leading-relaxed text-ink-muted">
              Be the first — finish a focus session and you'll appear here for {PERIOD_PHRASE[period]}.
            </p>
          </div>
        </Card>
      </Reveal>
    );

  const yourEntry = meId ? entries.find((e) => e.user_id === meId) : undefined;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      {yourRank != null && (
        <Reveal>
          <YourRankCard rank={yourRank} period={period} entry={yourEntry} total={entries.length} />
        </Reveal>
      )}
      <Reveal>
        <Card bodyClassName="p-3 sm:p-4">
          <RankingsHeader count={entries.length} />
          <ul className="flex flex-col gap-1">
            {entries.map((entry) => (
              <li key={entry.user_id}>
                <GlobalRankingRow entry={entry} isYou={!!meId && entry.user_id === meId} />
              </li>
            ))}
          </ul>
        </Card>
      </Reveal>
    </div>
  );
}

function RankingsHeader({ count }: { count: number }) {
  return (
    <div className="mb-2 flex items-center justify-between px-2 pt-1">
      <h2 className="font-display text-lg tracking-tight text-ink">Rankings</h2>
      <span className="font-mono text-xs text-ink-faint tabular">top {count}</span>
    </div>
  );
}

/** Shape-matched skeletons. `withRail` adds the friends-board invite rail column. */
function LoadingState({ withRail }: { withRail?: boolean }) {
  const list = (
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
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </Card>
  );

  if (!withRail) return <div className="mx-auto max-w-2xl">{list}</div>;

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
        {list}
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
