/* =====================================================================
   FriendProfile — a friend's public profile at /u/:userId. An identity header
   (avatar, name, member-since, streak chips, their buddy + mood) over the same
   12-week activity heatmap, headline stats, and session feed used on History,
   fed by the friend's own finished sessions. One round-trip via
   GET /users/{id}/overview (friendship-gated — 404 if you aren't friends).
   ===================================================================== */
import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  WarningCircle,
  Fire,
  Trophy,
  Handshake,
  ClockCounterClockwise,
  type Icon,
} from "@phosphor-icons/react";
import { Avatar, Button, Card, Reveal, RevealChild, Skeleton } from "@/components/ui";
import { useUserOverview, useSessionReactions, useToggleReaction } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { getBuddyAvatar, moodLabel } from "@/lib/buddy";
import type { BuddyResponse } from "@/lib/types";
import { ActivityHeatmap } from "./history/ActivityHeatmap";
import { StatsRow } from "./history/StatsRow";
import { SessionFeed } from "./history/SessionFeed";
import { aggregateByDay, buildHeatmap, computeStats } from "./history/dates";

/** "Member since March 2026" from an ISO timestamp. */
function memberSince(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function FriendProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { data, isLoading, isError, error, refetch, isFetching } = useUserOverview(userId);

  // Derive heatmap + stats from the friend's sessions (same logic as History).
  const { heatmap, stats, sessions } = useMemo(() => {
    const s = data?.sessions ?? [];
    const byDay = aggregateByDay(s);
    return { heatmap: buildHeatmap(byDay), stats: computeStats(s, byDay), sessions: s };
  }, [data]);

  // Reactions: load state for the shown sessions; tapping toggles (give-only).
  const sessionIds = useMemo(() => sessions.map((s) => s.id), [sessions]);
  const { data: reactions } = useSessionReactions(sessionIds);
  const toggleReaction = useToggleReaction();

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <Link
        to="/profile"
        className="mb-6 inline-flex items-center gap-1.5 rounded-full text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft weight="bold" className="h-4 w-4" />
        Back to friends
      </Link>

      {isLoading ? (
        <FriendProfileSkeleton />
      ) : isError || !data ? (
        <FriendProfileError
          notFound={error instanceof ApiError && error.status === 404}
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : (
        <Reveal stagger className="flex flex-col gap-6">
          {/* Identity header */}
          <RevealChild>
            <Card bodyClassName="p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-5">
                  <Avatar
                    src={data.avatar_url}
                    alt={data.display_name}
                    size="xl"
                    fallback={data.display_name.slice(0, 2)}
                    glow={!!data.buddy && data.buddy.current_streak > 0}
                  />
                  <div className="min-w-0">
                    <h1 className="truncate font-display text-3xl tracking-tightest text-ink sm:text-4xl">
                      {data.display_name}
                    </h1>
                    <p className="mt-1.5 text-sm text-ink-muted">
                      Member since {memberSince(data.created_at)}
                    </p>
                    {(data.buddy || (data.shared_streak ?? 0) > 0) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {data.buddy && (
                          <Chip icon={Fire} label={`${data.buddy.current_streak}-day streak`} />
                        )}
                        {data.buddy && (
                          <Chip icon={Trophy} label={`Best ${data.buddy.longest_streak}`} />
                        )}
                        {data.shared_streak != null && data.shared_streak > 0 && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal px-3 py-1 text-xs font-semibold text-canvas">
                            <Handshake weight="fill" className="h-3.5 w-3.5" />
                            {data.shared_streak}-day streak with you
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {data.buddy && <BuddyBadge buddy={data.buddy} />}
              </div>
            </Card>
          </RevealChild>

          {/* Activity + sessions, or an empty state */}
          {sessions.length === 0 ? (
            <RevealChild>
              <Card bodyClassName="p-10">
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-3/60 text-ink-muted">
                    <ClockCounterClockwise weight="duotone" className="h-6 w-6" />
                  </span>
                  <p className="mt-1 text-sm font-medium text-ink">No sessions yet</p>
                  <p className="max-w-xs text-xs leading-relaxed text-ink-muted">
                    {data.display_name.split(/\s+/)[0]} hasn't finished a focus session yet. When they
                    do, their activity will show up right here.
                  </p>
                </div>
              </Card>
            </RevealChild>
          ) : (
            <>
              <RevealChild>
                <Card>
                  <ActivityHeatmap model={heatmap} />
                  <div className="mt-7 border-t border-hairline/[0.06] pt-2">
                    <Reveal stagger>
                      <StatsRow stats={stats} />
                    </Reveal>
                  </div>
                </Card>
              </RevealChild>

              <RevealChild>
                <Card>
                  <SessionFeed
                    sessions={sessions}
                    reactions={reactions}
                    onReact={(sessionId, emoji) => toggleReaction.mutate({ sessionId, emoji })}
                  />
                </Card>
              </RevealChild>
            </>
          )}
        </Reveal>
      )}
    </div>
  );
}

/* ---- bits ---- */

function Chip({ icon: IconCmp, label }: { icon: Icon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-3 py-1 text-xs font-medium text-teal-bright ring-1 ring-inset ring-teal/20">
      <IconCmp weight="fill" className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function BuddyBadge({ buddy }: { buddy: BuddyResponse }) {
  return (
    <div className="flex shrink-0 items-center gap-3 self-start rounded-2xl bg-surface-2/50 px-4 py-3 ring-1 ring-inset ring-hairline/[0.07]">
      <img
        src={getBuddyAvatar(buddy.buddy_type, buddy.mood_level)}
        alt={buddy.buddy_name}
        className="h-14 w-14 shrink-0 select-none object-contain"
        draggable={false}
      />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink-faint">Buddy</p>
        <p className="truncate text-sm font-medium text-ink">{buddy.buddy_name}</p>
        <p className="text-xs text-ink-muted">{moodLabel(buddy.mood_level)}</p>
      </div>
    </div>
  );
}

function FriendProfileError({
  notFound,
  onRetry,
  retrying,
}: {
  notFound: boolean;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <Card bodyClassName="p-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <WarningCircle weight="duotone" className="h-8 w-8 text-warning" />
        <p className="text-sm font-medium text-ink">
          {notFound ? "This profile isn't available" : "We couldn't load this profile"}
        </p>
        <p className="max-w-sm text-xs leading-relaxed text-ink-muted">
          {notFound
            ? "You can only view the profiles of friends you've added. Send a friend request to see their activity."
            : "Something went wrong fetching their activity. Give it another try in a moment."}
        </p>
        {!notFound && (
          <Button variant="secondary" size="sm" onClick={onRetry} disabled={retrying}>
            {retrying ? "Retrying…" : "Try again"}
          </Button>
        )}
        <Link to="/profile" className="mt-1 text-xs text-teal-bright hover:underline">
          Back to friends
        </Link>
      </div>
    </Card>
  );
}

function FriendProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card bodyClassName="p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <Skeleton className="h-24 w-24 rounded-[1.6rem]" />
          <div className="flex-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-36" />
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </Card>
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
    </div>
  );
}
