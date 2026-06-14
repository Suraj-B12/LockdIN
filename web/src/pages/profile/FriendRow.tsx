/* =====================================================================
   FriendRow — one accepted friend: avatar, name, optional streak/score, and
   two actions — Nudge (a gentle "thinking of you" ping) and Remove (with an
   inline confirm step; we never use window.confirm/alert).

   Two distinct ids matter here:
     • friendship row id  → used to REMOVE the friendship.
     • the friend's USER id → used to NUDGE. A friendship row stores both
       sides, so the friend's user id is whichever of user_id / friend_id
       is not the current user's.
   ===================================================================== */
import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Hand, Trash, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui";
import { useNudgeFriend, useRemoveFriend } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { FriendResponse } from "@/lib/types";
import { EASE_OUT } from "@/lib/motion";

interface FriendRowProps {
  friend: FriendResponse;
  /** Current user's profile id — to resolve which side is the friend. */
  selfId: string;
}

/** Optional progress fields the API may attach to a friend row. */
type FriendExtras = {
  current_streak?: number;
  friend_streak?: number;
  total_score?: number;
  friend_score?: number;
};

export function FriendRow({ friend, selfId }: FriendRowProps) {
  const reduce = useReducedMotion();
  const [confirming, setConfirming] = useState(false);
  const nudge = useNudgeFriend();
  const remove = useRemoveFriend();

  const name = friend.friend_name || "Friend";
  const initials = name.slice(0, 2).toUpperCase();
  // The friend's USER id: the side of the row that isn't me.
  const friendUserId = friend.user_id === selfId ? friend.friend_id : friend.user_id;

  const extras = friend as FriendResponse & FriendExtras;
  const streak = extras.friend_streak ?? extras.current_streak;
  const score = extras.friend_score ?? extras.total_score;

  function handleNudge() {
    nudge.mutate(friendUserId, {
      onSuccess: () =>
        toast.success(`Nudged ${name}`, {
          description: "A little encouragement is on its way.",
        }),
      onError: (err) => {
        const detail =
          err instanceof ApiError ? err.detail : "Couldn't send a nudge right now.";
        toast.error("Nudge failed", { description: detail });
      },
    });
  }

  function handleRemove() {
    remove.mutate(friend.id, {
      onSuccess: () => toast.success(`Removed ${name}`),
      onError: (err) => {
        const detail =
          err instanceof ApiError ? err.detail : "Couldn't remove this friend.";
        toast.error("Remove failed", { description: detail });
        setConfirming(false);
      },
    });
  }

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-surface-2/50 px-3 py-2.5 ring-1 ring-inset ring-hairline/[0.07] transition-colors duration-200 hover:bg-surface-2/80 sm:px-4">
      <Link
        to={`/u/${friendUserId}`}
        aria-label={`View ${name}'s profile`}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-bright/60"
      >
        <Avatar src={friend.friend_avatar} alt={name} size="md" fallback={initials} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink transition-colors group-hover:text-teal-bright">
            {name}
          </p>
          <p className="truncate text-xs text-ink-faint">
            {streak != null || score != null ? (
              <span className="inline-flex items-center gap-2 tabular">
                {streak != null && <span>{streak}-day streak</span>}
                {streak != null && score != null && (
                  <span className="text-ink-faint/60">·</span>
                )}
                {score != null && <span>{score} pts</span>}
              </span>
            ) : (
              "Locked in with you"
            )}
          </p>
        </div>
      </Link>

      <AnimatePresence mode="wait" initial={false}>
        {confirming ? (
          <motion.div
            key="confirm"
            initial={reduce ? false : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: 8 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            className="flex shrink-0 items-center gap-1.5"
          >
            <span className="hidden text-xs text-ink-muted sm:inline">Remove?</span>
            <button
              type="button"
              onClick={handleRemove}
              disabled={remove.isPending}
              className="rounded-full bg-danger/15 px-3 py-1.5 text-xs font-medium text-danger ring-1 ring-inset ring-danger/25 transition-colors hover:bg-danger/25 disabled:opacity-50"
            >
              {remove.isPending ? "Removing…" : "Yes"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              aria-label="Cancel"
              className="grid h-7 w-7 place-items-center rounded-full bg-surface-3 text-ink-muted ring-1 ring-inset ring-hairline/10 transition-colors hover:text-ink"
            >
              <X weight="bold" className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="actions"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            className="flex shrink-0 items-center gap-1.5"
          >
            <button
              type="button"
              onClick={handleNudge}
              disabled={nudge.isPending}
              className="inline-flex items-center gap-1.5 rounded-full bg-teal/12 px-3 py-1.5 text-xs font-medium text-teal-bright ring-1 ring-inset ring-teal/25 transition-[background-color,transform] duration-200 hover:bg-teal/20 active:scale-[0.97] disabled:opacity-50"
            >
              <Hand weight="fill" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nudge</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Remove ${name}`}
              className="grid h-8 w-8 place-items-center rounded-full text-ink-faint ring-1 ring-inset ring-hairline/10 transition-colors hover:bg-danger/10 hover:text-danger hover:ring-danger/25"
            >
              <Trash weight="regular" className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
