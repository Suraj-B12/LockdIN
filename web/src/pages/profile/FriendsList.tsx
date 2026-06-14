/* =====================================================================
   FriendsList — the accepted-friends list body for use inside the FriendsHub
   tabs (no Card chrome of its own). Each row carries Nudge + Remove via
   FriendRow. Loading shows shape-matched skeletons; the empty state is warm
   and actionable — it re-surfaces the invite code with a copy button so adding
   someone is one tap away; error offers a retry. Never shaming.
   ===================================================================== */
import { useState } from "react";
import { Check, Copy, UsersThree, WarningCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { useFriends } from "@/lib/queries";
import { FriendRow } from "./FriendRow";
import { FriendRowsSkeleton } from "./skeletons";

interface FriendsListProps {
  /** Current user's profile id (resolves the friend side for nudges). */
  selfId: string;
  /** Invite code shown in the empty state. */
  inviteCode: string | undefined;
}

export function FriendsList({ selfId, inviteCode }: FriendsListProps) {
  const { data: friends, isLoading, isError, refetch, isFetching } = useFriends();
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success("Invite code copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy", { description: "Copy the code manually instead." });
    }
  }

  if (isLoading) return <FriendRowsSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-2/40 px-4 py-8 text-center ring-1 ring-inset ring-hairline/[0.07]">
        <WarningCircle weight="duotone" className="h-7 w-7 text-warning" />
        <p className="text-sm text-ink-soft">We couldn't load your friends.</p>
        <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Retrying…" : "Try again"}
        </Button>
      </div>
    );
  }

  if (!friends || friends.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-teal/[0.05] px-5 py-9 text-center ring-1 ring-inset ring-teal/15">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal/12 text-teal-bright ring-1 ring-inset ring-teal/20">
          <UsersThree weight="duotone" className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-medium text-ink">No friends yet — that's the fun part</p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-ink-muted">
            Share your invite code and lock in together. You'll keep each other showing up.
          </p>
        </div>
        {inviteCode && (
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-2 rounded-full bg-surface-2/80 px-4 py-2 ring-1 ring-inset ring-hairline/10 transition-colors hover:ring-teal/40"
          >
            <code className="font-mono text-sm font-semibold tracking-wider text-teal-bright tabular">
              {inviteCode}
            </code>
            {copied ? (
              <Check weight="bold" className="h-4 w-4 text-success" />
            ) : (
              <Copy weight="bold" className="h-4 w-4 text-ink-muted" />
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {friends.map((f) => (
        <FriendRow key={f.id} friend={f} selfId={selfId} />
      ))}
    </ul>
  );
}
