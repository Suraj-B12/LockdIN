/* =====================================================================
   LeaderboardCard — today's friend leaderboard preview (top 5), with your row
   highlighted and your rank surfaced. When you have no friends yet, this turns
   into a composed invite state — friend acquisition is the #1 priority, so the
   empty state is the CTA, not a dead end.
   ===================================================================== */
import { Link } from "react-router-dom";
import { Trophy, UserPlus, ArrowUpRight } from "@phosphor-icons/react";
import { Avatar, Button, Skeleton } from "@/components/ui";
import { useLeaderboard } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { CardHead } from "./parts";

const RANK_TINT = [
  "bg-warning/20 text-warning ring-warning/30", // 1 gold
  "bg-ink-soft/15 text-ink-soft ring-hairline/20", // 2 silver
  "bg-[#b08d57]/20 text-[#cda06a] ring-[#b08d57]/30", // 3 bronze
];

export function LeaderboardCard() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useLeaderboard("daily");

  const entries = data?.entries ?? [];
  const top = entries.slice(0, 5);
  const yourRank = data?.your_rank ?? null;
  // Is "you" already visible in the top rows?
  const youInTop = top.some((e) => e.user_id === user?.id);

  return (
    <div className="flex h-full flex-col">
      <CardHead
        icon={Trophy}
        label="Friend leaderboard"
        actionTo="/leaderboard"
        actionLabel="Full board"
      />

      <div className="mt-4 flex-1">
        {isLoading ? (
          <ul className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl bg-surface-3/30 px-3 py-2.5">
                <Skeleton className="h-7 w-7" />
                <Skeleton circle className="h-8 w-8" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-8" />
              </li>
            ))}
          </ul>
        ) : isError || top.length === 0 ? (
          <InviteState />
        ) : (
          <>
            <ul className="flex flex-col gap-1.5">
              {top.map((e) => {
                const you = e.user_id === user?.id;
                return (
                  <li
                    key={e.user_id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2",
                      you
                        ? "bg-teal/10 ring-1 ring-inset ring-teal/20"
                        : "transition-colors hover:bg-surface-3/40"
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-[12px] font-semibold tabular ring-1 ring-inset",
                        e.rank <= 3
                          ? RANK_TINT[e.rank - 1]
                          : "bg-surface-3 text-ink-muted ring-hairline/10"
                      )}
                    >
                      {e.rank}
                    </span>
                    <Avatar
                      src={e.avatar_url}
                      alt={e.display_name}
                      size="sm"
                      fallback={e.display_name}
                      glow={you}
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm font-medium",
                        you ? "text-ink" : "text-ink-soft"
                      )}
                    >
                      {you ? "You" : e.display_name}
                    </span>
                    <span className="shrink-0 font-mono text-sm font-semibold tabular text-ink">
                      {e.total_score}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Your position, when you're outside the visible top rows */}
            {!youInTop && yourRank && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-teal/20 bg-teal/[0.04] px-3 py-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-teal/15 font-mono text-[12px] font-semibold tabular text-teal-bright ring-1 ring-inset ring-teal/25">
                  {yourRank}
                </span>
                <span className="flex-1 text-sm font-medium text-ink-soft">Your position</span>
                <ArrowUpRight weight="bold" className="h-4 w-4 text-ink-faint" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Composed empty state — the invite CTA, not a blank "no friends". */
function InviteState() {
  return (
    <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-3 py-6 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal/12 text-teal-bright ring-1 ring-inset ring-teal/20">
        <UserPlus weight="duotone" className="h-7 w-7" />
      </span>
      <div>
        <p className="text-sm font-semibold text-ink">Accountability is better together</p>
        <p className="mx-auto mt-1 max-w-[18rem] text-xs leading-relaxed text-ink-muted">
          Add a friend or two and you'll see who's putting in the work each day. A little
          competition goes a long way.
        </p>
      </div>
      <Link to="/profile" className="mt-1">
        <Button size="md" variant="primary" trailingIcon={ArrowUpRight}>
          Invite friends
        </Button>
      </Link>
    </div>
  );
}
