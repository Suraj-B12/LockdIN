/* =====================================================================
   Profile skeletons — shape-matched to the real cards so the loading state
   reads as the page assembling, never a generic spinner.
   ===================================================================== */
import { WarningCircle } from "@phosphor-icons/react";
import { Card, Skeleton } from "@/components/ui";

/** A short stack of friend-row placeholders. */
export function FriendRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-2xl bg-surface-2/40 px-3 py-2.5 ring-1 ring-inset ring-hairline/[0.07] sm:px-4"
        >
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="flex-1">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

/** Full-screen profile placeholder while the core profile query resolves. */
export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <Skeleton className="h-6 w-40 rounded-full" />
        <Skeleton className="mt-3 h-10 w-56" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User card */}
        <Card tone="elevated" bodyClassName="p-6 sm:p-7">
          <div className="flex items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-[1.6rem]" />
            <div className="flex-1">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-2 h-4 w-52" />
            </div>
          </div>
          <Skeleton className="mt-6 h-[50px] w-full rounded-xl" />
          <Skeleton className="mt-6 h-36 w-full rounded-2xl" />
        </Card>

        {/* Buddy card */}
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
      </div>

      {/* Friends card */}
      <Card bodyClassName="p-6 sm:p-7">
        <Skeleton className="h-5 w-28" />
        <div className="mt-5">
          <FriendRowsSkeleton />
        </div>
      </Card>
    </div>
  );
}

/** Compact inline error block with a retry affordance. */
export function ProfileLoadError({
  onRetry,
  retrying,
}: {
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <Card tone="elevated" className="mx-auto max-w-md text-center">
      <div className="flex flex-col items-center gap-4 px-2 py-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-warning/12 text-warning ring-1 ring-inset ring-warning/20">
          <WarningCircle weight="duotone" className="h-6 w-6" />
        </span>
        <h2 className="font-display text-2xl tracking-tightest text-ink">
          We couldn't load your profile
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-ink-muted">
          This is usually a brief hiccup. Give it another try in a moment.
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="rounded-full bg-teal px-5 py-2.5 text-sm font-medium text-canvas transition-colors hover:bg-teal-bright disabled:opacity-50"
        >
          {retrying ? "Retrying…" : "Try again"}
        </button>
      </div>
    </Card>
  );
}
