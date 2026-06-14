/* =====================================================================
   Avatar — squircle (not a plain circle) image with a hairline ring.
   Used for buddy frames and user/profile pictures. Optional teal glow ring
   for "active / on-fire" states. Falls back gracefully on image error.
   ===================================================================== */
import { useState } from "react";
import { cn } from "@/lib/cn";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: Size;
  /** Adds a soft teal glow ring (for streak / active states). */
  glow?: boolean;
  /** Fallback initials shown if no src or the image fails. */
  fallback?: string;
  className?: string;
}

const sizes: Record<Size, string> = {
  xs: "h-7 w-7 rounded-lg",
  sm: "h-9 w-9 rounded-xl",
  md: "h-12 w-12 rounded-2xl",
  lg: "h-16 w-16 rounded-[1.25rem]",
  xl: "h-24 w-24 rounded-[1.6rem]",
  "2xl": "h-32 w-32 rounded-[2rem]",
};

export function Avatar({ src, alt, size = "md", glow, fallback, className }: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;

  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden bg-surface-3 ring-1 ring-inset ring-hairline/10",
        sizes[size],
        glow && "ring-2 ring-teal/55",
        className
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setErrored(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-sm font-semibold uppercase text-ink-muted">
          {fallback?.slice(0, 2) ?? alt.slice(0, 2)}
        </span>
      )}
    </div>
  );
}
