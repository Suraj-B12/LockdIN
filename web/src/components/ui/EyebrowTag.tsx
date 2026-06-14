/* =====================================================================
   EyebrowTag — the small pill that precedes a section heading.
   Sentence-case label, wide tracking, teal text, hairline ring.
   Optional pulse dot for "live" eyebrows. Use SPARINGLY (max 1 per 3 sections).
   ===================================================================== */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface EyebrowTagProps {
  children: ReactNode;
  /** Shows a soft pulsing teal dot before the label. */
  pulse?: boolean;
  className?: string;
}

export function EyebrowTag({ children, pulse, className }: EyebrowTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-hairline/[0.08] bg-surface/60",
        "px-3 py-1 text-[10px] font-medium uppercase tracking-eyebrow text-teal-bright backdrop-blur-sm",
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-pulse-soft rounded-full bg-teal-bright" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-bright" />
        </span>
      )}
      {children}
    </span>
  );
}
