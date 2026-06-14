/* =====================================================================
   FriendsCard — the accepted-friends list. Each row carries a Nudge + a
   Remove (inline confirm). Empty state is warm and actionable: it re-surfaces
   the invite code with a copy button so adding someone is one tap away.
   Error state offers a retry. Never shaming — pure encouragement.
   ===================================================================== */
import { useState } from "react";
import { Copy, Check, UsersThree, WarningCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Card, Button } from "@/components/ui";
import { useFriends } from "@/lib/queries";
import { FriendRow } from "./FriendRow";
import { FriendRowsSkeleton } from "./skeletons";

interface FriendsCardProps {
  /** Current user's profile id (resolves the friend side for nudges). */
  selfId: string;
  /** Invite code shown in the empty state. */
  inviteCode: string | undefined;
}

export function FriendsCard({ selfId, inviteCode }: FriendsCardProps) {
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

  const count = friends?.length ?? 0;

  return (
    <Card bodyClassName="p-6 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-3 text-ink-soft ring-1 ring-inset ring-hairline/10">
            <UsersThree weight="fill" className="h-4 w-4" />
          </span>
          <h3 className="font-display text-lg tracking-tight text-ink">Friends</h3>
        </div>
        {!isLoading && !isError && count > 0 && (
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-soft ring-1 ring-inset ring-hairline/10 tabular">
            {count}
          </span>
        )}
      </div>

      <div className="mt-5">
        {isLoading ? (
          <FriendRowsSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-2/40 px-4 py-8 text-center ring-1 ring-inset ring-hairline/[0.07]">
            <WarningCircle weight="duotone" className="h-7 w-7 text-warning" />
            <p className="text-sm text-ink-soft">We couldn't load your friends.</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Retrying…" : "Try again"}
            </Button>
          </div>
        ) : count === 0 ? (
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
        ) : (
          <ul className="flex flex-col gap-2">
            {friends!.map((f) => (
              <FriendRow key={f.id} friend={f} selfId={selfId} />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
