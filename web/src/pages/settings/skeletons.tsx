/* =====================================================================
   Settings skeletons — matched to the notification card so loading reads as
   the controls arriving, not a spinner.
   ===================================================================== */
import { Card, Skeleton } from "@/components/ui";

function ToggleRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-3 py-3.5">
      <Skeleton className="h-9 w-9 rounded-xl" />
      <div className="flex-1">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="mt-2 h-3 w-56" />
      </div>
      <Skeleton className="h-6 w-11 rounded-full" />
    </div>
  );
}

export function NotificationCardSkeleton() {
  return (
    <Card bodyClassName="p-6 sm:p-7">
      <Skeleton className="h-6 w-36" />
      <Skeleton className="mt-2 h-4 w-52" />

      <Skeleton className="mb-1 mt-5 ml-3 h-3 w-20" />
      <div className="flex flex-col">
        <ToggleRowSkeleton />
        <ToggleRowSkeleton />
      </div>

      <div className="my-2 h-px bg-hairline/[0.07]" />

      <Skeleton className="mb-1 mt-5 ml-3 h-3 w-28" />
      <div className="flex flex-col">
        <ToggleRowSkeleton />
        <ToggleRowSkeleton />
        <ToggleRowSkeleton />
        <ToggleRowSkeleton />
      </div>
    </Card>
  );
}
