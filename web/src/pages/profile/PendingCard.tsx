/* =====================================================================
   PendingCard — incoming friend requests waiting on you. Accept / Decline
   each via useRespondToFriend (action: accept | reject). The card hides itself
   entirely when there's nothing pending, so it never adds empty noise.
   ===================================================================== */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, X, UserPlus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Card, Avatar } from "@/components/ui";
import { usePendingFriends, useRespondToFriend } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { FriendResponse, FriendAction } from "@/lib/types";
import { EASE_OUT } from "@/lib/motion";

export function PendingCard() {
  const { data: pending, isLoading } = usePendingFriends();

  // Quietly absent while loading or when empty — pending is an exception state.
  if (isLoading || !pending || pending.length === 0) return null;

  return (
    <Card tone="elevated" bodyClassName="p-6 sm:p-7">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-teal/12 text-teal-bright ring-1 ring-inset ring-teal/25">
          <UserPlus weight="fill" className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-display text-lg tracking-tight text-ink">Friend requests</h3>
          <p className="text-xs text-ink-muted">
            {pending.length} {pending.length === 1 ? "person wants" : "people want"} to lock in with
            you.
          </p>
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {pending.map((req) => (
            <PendingRow key={req.id} req={req} />
          ))}
        </AnimatePresence>
      </ul>
    </Card>
  );
}

function PendingRow({ req }: { req: FriendResponse }) {
  const reduce = useReducedMotion();
  const respond = useRespondToFriend();
  const name = req.friend_name || "Someone";
  const initials = name.slice(0, 2).toUpperCase();

  function act(action: FriendAction) {
    respond.mutate(
      { id: req.id, body: { action } },
      {
        onSuccess: () =>
          action === "accept"
            ? toast.success(`You and ${name} are now friends`)
            : toast.success("Request declined"),
        onError: (err) => {
          const detail =
            err instanceof ApiError ? err.detail : "Couldn't update this request.";
          toast.error("Something went wrong", { description: detail });
        },
      }
    );
  }

  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -12, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className="flex items-center gap-3 rounded-2xl bg-surface-2/50 px-3 py-2.5 ring-1 ring-inset ring-hairline/[0.07] sm:px-4"
    >
      <Avatar src={req.friend_avatar} alt={name} size="md" fallback={initials} />
      <p className="min-w-0 flex-1 truncate text-sm text-ink">
        <span className="font-medium">{name}</span>
        <span className="text-ink-muted"> wants to be your friend</span>
      </p>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => act("accept")}
          disabled={respond.isPending}
          className="inline-flex items-center gap-1.5 rounded-full bg-teal px-3.5 py-1.5 text-xs font-semibold text-canvas transition-[background-color,transform] duration-200 hover:bg-teal-bright active:scale-[0.97] disabled:opacity-50"
        >
          <Check weight="bold" className="h-3.5 w-3.5" />
          Accept
        </button>
        <button
          type="button"
          onClick={() => act("reject")}
          disabled={respond.isPending}
          aria-label={`Decline ${name}`}
          className="grid h-8 w-8 place-items-center rounded-full text-ink-faint ring-1 ring-inset ring-hairline/10 transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-50"
        >
          <X weight="bold" className="h-4 w-4" />
        </button>
      </div>
    </motion.li>
  );
}
