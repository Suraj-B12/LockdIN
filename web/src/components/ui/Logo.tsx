/* =====================================================================
   Logo — the LockdIN wordmark. "Lockd" in ink, "IN" in teal.
   Optional lock mark prefix. Display font, tight tracking.
   ===================================================================== */
import { cn } from "@/lib/cn";

export interface LogoProps {
  className?: string;
  /** Show the squircle lock mark before the wordmark. */
  withMark?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

const markSizes = {
  sm: "h-6 w-6",
  md: "h-7 w-7",
  lg: "h-9 w-9",
};

export function Logo({ className, withMark, size = "md" }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-display font-semibold tracking-tightest", className)}>
      {withMark && (
        <span
          className={cn(
            "grid place-items-center rounded-[0.6rem] bg-teal text-canvas",
            markSizes[size]
          )}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-[58%] w-[58%]">
            <path
              d="M8 10V8a4 4 0 0 1 8 0v2"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <rect x="6" y="9.5" width="12" height="9.5" rx="2.6" fill="currentColor" />
            <circle cx="12" cy="13.5" r="1.3" fill="#0a0a0f" />
          </svg>
        </span>
      )}
      <span className={cn("leading-none", sizes[size])}>
        <span className="text-ink">Lockd</span>
        <span className="text-teal">IN</span>
      </span>
    </span>
  );
}
