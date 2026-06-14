/* =====================================================================
   RequestsCard — incoming friend requests waiting on you, rendered as a bare
   list for use inside the FriendsHub tabs (no Card chrome of its own).
   Accept / Decline via useRespondToFriend. Loading shows shape-matched
   skeletons; empty state is a calm "nothing waiting"; error offers a retry.
   ===================================================================== */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, UserPlus, WarningCircle, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Avatar, Button } from "@/components/ui";
import { usePendingFriends, useRespondToFriend } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { FriendResponse, FriendAction } from "@/lib/types";
import { EASE_OUT } from "@/lib/motion";
import { FriendRowsSkeleton } from "./skeletons";

export function RequestsCard() {
  const { data: pending, isLoading, isError, refetch, isFetching } = usePendingFriends();

  if (isLoading) return <FriendRowsSkeleton rows={2} />;

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-2/40 px-4 py-8 text-center ring-1 ring-inset ring-hairline/[0.07]">
        <WarningCircle weight="duotone" className="h-7 w-7 text-warning" />
        <p className="text-sm text-ink-soft">We couldn't load your requests.</p>
        <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Retrying…" : "Try again"}
        </Button>
      </div>
    );
  }

  if (!pending || pending.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface-2/40 px-5 py-9 text-center ring-1 ring-inset ring-hairline/[0.07]">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-3 text-ink-soft ring-1 ring-inset ring-hairline/10">
          <UserPlus weight="duotone" className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">No incoming requests</p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-ink-muted">
            When someone asks to lock in with you, their request lands here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {pending.map((req) => (
          <RequestRow key={req.id} req={req} />
        ))}
      </AnimatePresence>
    </ul>
  );
}

function RequestRow({ req }: { req: FriendResponse }) {
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
