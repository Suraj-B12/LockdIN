/* =====================================================================
   GlobalRankingRow — one entry on the GLOBAL board. Same identity treatment as
   the friends board (rank coin, avatar, name, score) plus a trailing action
   reflecting your relationship: Add · Requested · Respond · Friends · You.
   Adding sends a friend request by user_id (idempotent server-side).
   ===================================================================== */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Crown, UserPlus, Check, Clock, type Icon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useSendFriendRequest } from "@/lib/queries";
import type { GlobalLeaderboardEntry, FriendStatusTag } from "@/lib/types";
import { formatFocus, formatScore } from "./format";

const PODIUM: Record<1 | 2 | 3, { coin: string; icon?: Icon }> = {
  1: { coin: "bg-gradient-to-b from-[#ffe08a] to-[#e0a93a] text-[#3a2a00] ring-[#ffd970]/50", icon: Crown },
  2: { coin: "bg-gradient-to-b from-[#e6e9ef] to-[#a9b0bd] text-[#2a2d33] ring-[#d6dae2]/45" },
  3: { coin: "bg-gradient-to-b from-[#e6b07a] to-[#b9783f] text-[#33200d] ring-[#e0a06a]/45" },
};

export function GlobalRankingRow({ entry, isYou }: { entry: GlobalLeaderboardEntry; isYou: boolean }) {
  const rank = entry.rank;
  const podium = rank === 1 || rank === 2 || rank === 3 ? PODIUM[rank] : null;
  const CoinIcon = podium?.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 ring-1 ring-inset transition-colors duration-200 sm:px-4",
        isYou ? "bg-teal/[0.09] ring-teal/30" : "bg-transparent ring-transparent hover:bg-hairline/[0.03]"
      )}
    >
      {/* Rank coin */}
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold tabular ring-1 ring-inset sm:h-9 sm:w-9",
          podium ? podium.coin : "bg-surface-2 text-ink-soft ring-hairline/10"
        )}
      >
        {CoinIcon ? <CoinIcon weight="fill" className="h-4 w-4" /> : rank}
      </span>

      {/* Identity → profile (friend-gated; non-friends 404 gracefully) */}
      <Link
        to={`/u/${entry.user_id}`}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-bright/60"
      >
        <Avatar src={entry.avatar_url} alt={entry.display_name} fallback={entry.display_name} size="sm" glow={rank === 1} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-ink transition-colors group-hover:text-teal-bright">
              {entry.display_name}
            </span>
            {isYou && (
              <span className="shrink-0 rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-medium text-teal-bright ring-1 ring-inset ring-teal/25">
                You
              </span>
            )}
          </div>
          <div className="font-mono text-[11px] text-ink-faint tabular">
            {formatScore(entry.total_score)} pts · {formatFocus(entry.total_seconds)}
          </div>
        </div>
      </Link>

      {/* Relationship action */}
      {!isYou && <ActionSlot userId={entry.user_id} name={entry.display_name} status={entry.friend_status} />}
    </div>
  );
}

function ActionSlot({
  userId,
  name,
  status,
}: {
  userId: string;
  name: string;
  status: FriendStatusTag;
}) {
  const send = useSendFriendRequest();
  const [requested, setRequested] = useState(false);

  if (status === "friends") return <Pill tone="teal" icon={Check} label="Friends" />;
  if (status === "blocked") return null;
  if (status === "pending_out" || requested) return <Pill tone="muted" icon={Clock} label="Requested" />;
  if (status === "pending_in")
    return (
      <Link
        to="/profile"
        className="shrink-0 rounded-full bg-teal/15 px-3 py-1.5 text-xs font-medium text-teal-bright ring-1 ring-inset ring-teal/25 transition-colors hover:bg-teal/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55"
      >
        Respond
      </Link>
    );

  // status === "none"
  const add = () => {
    send.mutate(
      { user_id: userId },
      {
        onSuccess: () => {
          setRequested(true);
          toast.success("Request sent", { description: `${name} will appear once they accept.` });
        },
        onError: (err) =>
          toast.error("Couldn't send that request", {
            description: err instanceof Error ? err.message : "Please try again.",
          }),
      }
    );
  };

  return (
    <button
      type="button"
      onClick={add}
      disabled={send.isPending}
      aria-label={`Add ${name} as a friend`}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-teal px-3 py-1.5 text-xs font-semibold text-canvas transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55 disabled:opacity-50"
    >
      <UserPlus weight="bold" className="h-3.5 w-3.5" />
      Add
    </button>
  );
}

function Pill({ tone, icon: Icon, label }: { tone: "teal" | "muted"; icon: Icon; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset",
        tone === "teal"
          ? "bg-teal/10 text-teal-bright ring-teal/20"
          : "bg-surface-2/70 text-ink-faint ring-hairline/10"
      )}
    >
      <Icon weight="fill" className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
