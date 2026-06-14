/* =====================================================================
   Profile — you, your buddy, and your people.
   Composition (renders inside AppLayout):
     • UserCard      identity + invite code + the headline ADD FRIEND action
     • BuddyCard     current mood + the full ten-frame mood gallery
     • PendingCard   incoming requests (self-hides when none)
     • FriendsCard   accepted friends with Nudge / Remove
   The whole screen is privacy-framed: encouragement, never comparison.
   Hooks: useProfile, useBuddy, useSendFriendRequest, useFriends, useNudgeFriend,
   useRemoveFriend, usePendingFriends, useRespondToFriend.
   ===================================================================== */
import { Card, EyebrowTag, Reveal, RevealChild, Skeleton } from "@/components/ui";
import { useProfile, useBuddy, usePendingFriends } from "@/lib/queries";
import { UserCard } from "./profile/UserCard";
import { BuddyCard } from "./profile/BuddyCard";
import { FriendsCard } from "./profile/FriendsCard";
import { PendingCard } from "./profile/PendingCard";
import { ProfileSkeleton, ProfileLoadError } from "./profile/skeletons";

export function Profile() {
  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
    isFetching: profileFetching,
  } = useProfile();

  const { data: buddy, isLoading: buddyLoading, isError: buddyError } = useBuddy();

  // Read pending here too (shared cache key — free) so we can omit the slot
  // entirely when there's nothing pending, avoiding an empty gap in the stack.
  const { data: pending } = usePendingFriends();
  const hasPending = !!pending && pending.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      {/* Header */}
      <Reveal className="mb-7" blur={false}>
        <EyebrowTag>You and your buddy</EyebrowTag>
        <h1 className="mt-4 font-display text-4xl tracking-tightest text-ink sm:text-5xl">
          Profile
        </h1>
        <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed text-ink-muted">
          Your buddy, your invite code, and the friends keeping you accountable. Share your code to
          bring more people in — it's better together.
        </p>
      </Reveal>

      {profileLoading ? (
        <ProfileSkeleton />
      ) : profileError || !profile ? (
        <ProfileLoadError onRetry={() => refetchProfile()} retrying={profileFetching} />
      ) : (
        <Reveal stagger className="flex flex-col gap-6">
          {/* Top row: identity + buddy side by side on wide screens. */}
          <RevealChild>
            <div className="grid gap-6 lg:grid-cols-2">
              <UserCard profile={profile} />

              {buddyLoading ? (
                <BuddyCardSkeleton />
              ) : buddyError || !buddy ? (
                <BuddyUnavailable />
              ) : (
                <BuddyCard buddy={buddy} />
              )}
            </div>
          </RevealChild>

          {/* Pending requests — only occupy a slot when there's something to show. */}
          {hasPending && (
            <RevealChild>
              <PendingCard />
            </RevealChild>
          )}

          {/* Friends list. */}
          <RevealChild>
            <FriendsCard selfId={profile.id} inviteCode={profile.invite_code} />
          </RevealChild>
        </Reveal>
      )}
    </div>
  );
}

/* ---- Buddy column fallbacks (the buddy query is independent of profile) ---- */

function BuddyCardSkeleton() {
  return (
    <Card tone="teal" bodyClassName="p-6 sm:p-7">
      <Skeleton className="h-4 w-24 rounded-full" />
      <div className="mt-5 flex items-center gap-5">
        <Skeleton className="h-28 w-28 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-2 h-4 w-40" />
          <Skeleton className="mt-3 h-2 w-48 rounded-full" />
        </div>
      </div>
      <div className="mt-7 grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    </Card>
  );
}

function BuddyUnavailable() {
  return (
    <Card tone="teal" bodyClassName="p-6 sm:p-7">
      <p className="text-xs uppercase tracking-eyebrow text-ink-faint">Your buddy</p>
      <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-sm font-medium text-ink">Your buddy is resting</p>
        <p className="max-w-xs text-xs leading-relaxed text-ink-muted">
          We couldn't reach your buddy just now. Finish a focus session and they'll be right here,
          cheering you on.
        </p>
      </div>
    </Card>
  );
}
