/* =====================================================================
   SentCard — outgoing friend requests you've sent that are still pending.
   Each row shows the TARGET's avatar + name, a "Pending" badge, and a Cancel
   button (inline confirm) that deletes the friendship via useRemoveFriend.
   Loading shows shape-matched skeletons; empty state explains where sent
   invites surface; error offers a retry. Crisp, de-glowed, never shaming.
   ===================================================================== */
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PaperPlaneTilt, WarningCircle, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Avatar, Badge, Button } from "@/components/ui";
import { useSentRequests, useRemoveFriend } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { FriendResponse } from "@/lib/types";
import { EASE_OUT } from "@/lib/motion";
import { FriendRowsSkeleton } from "./skeletons";

export function SentCard() {
  const { data: sent, isLoading, isError, refetch, isFetching } = useSentRequests();

  if (isLoading) return <FriendRowsSkeleton rows={2} />;

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-2/40 px-4 py-8 text-center ring-1 ring-inset ring-hairline/[0.07]">
        <WarningCircle weight="duotone" className="h-7 w-7 text-warning" />
        <p className="text-sm text-ink-soft">We couldn't load your sent requests.</p>
        <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Retrying…" : "Try again"}
        </Button>
      </div>
    );
  }

  if (!sent || sent.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface-2/40 px-5 py-9 text-center ring-1 ring-inset ring-hairline/[0.07]">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-3 text-ink-soft ring-1 ring-inset ring-hairline/10">
          <PaperPlaneTilt weight="duotone" className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">No pending requests</p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-ink-muted">
            Invites you send show here until they're accepted. Share your invite code to get
            started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {sent.map((req) => (
          <SentRow key={req.id} req={req} />
        ))}
      </AnimatePresence>
    </ul>
  );
}

function SentRow({ req }: { req: FriendResponse }) {
  const reduce = useReducedMotion();
  const [confirming, setConfirming] = useState(false);
  const remove = useRemoveFriend();
  const name = req.friend_name || "Someone";
  const initials = name.slice(0, 2).toUpperCase();

  function handleCancel() {
    remove.mutate(req.id, {
      onSuccess: () => toast.success(`Request to ${name} canceled`),
      onError: (err) => {
        const detail =
          err instanceof ApiError ? err.detail : "Couldn't cancel this request.";
        toast.error("Couldn't cancel", { description: detail });
        setConfirming(false);
      },
    });
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
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{name}</p>
        <p className="truncate text-xs text-ink-faint">Waiting on their reply</p>
      </div>

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
            <span className="hidden text-xs text-ink-muted sm:inline">Cancel?</span>
            <button
              type="button"
              onClick={handleCancel}
              disabled={remove.isPending}
              className="rounded-full bg-danger/15 px-3 py-1.5 text-xs font-medium text-danger ring-1 ring-inset ring-danger/25 transition-colors hover:bg-danger/25 disabled:opacity-50"
            >
              {remove.isPending ? "Canceling…" : "Yes"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              aria-label="Keep request"
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
            className="flex shrink-0 items-center gap-2"
          >
            <Badge tone="neutral">Pending</Badge>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-faint ring-1 ring-inset ring-hairline/10 transition-colors hover:bg-danger/10 hover:text-danger hover:ring-danger/25"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
