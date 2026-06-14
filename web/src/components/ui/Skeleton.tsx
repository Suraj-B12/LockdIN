/* =====================================================================
   Skeleton — shape-matched loading placeholder with a shimmer sweep.
   Compose multiple to mirror the final layout (never a generic spinner).
   ===================================================================== */
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

export interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
  /** Render as a circle (avatars). */
  circle?: boolean;
}

export function Skeleton({ className, style, circle }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface-2/80",
        circle ? "rounded-full" : "rounded-xl",
        className
      )}
      style={style}
      aria-hidden
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-hairline/[0.06] to-transparent" />
    </div>
  );
}

/** Convenience: a stack of text lines. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3.5"
          style={{ width: i === lines - 1 ? "70%" : "100%" }}
        />
      ))}
    </div>
  );
}
