/* =====================================================================
   Spinner — the one circle spinner used everywhere (buttons, inline, loaders).
   FullPageLoader — a branded full-viewport loader for route/auth transitions.
   Consistent so loading never looks ad-hoc.
   ===================================================================== */
import { cn } from "@/lib/cn";

const sizes = {
  xs: "h-3.5 w-3.5 border-2",
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
  xl: "h-11 w-11 border-[3px]",
} as const;

export interface SpinnerProps {
  size?: keyof typeof sizes;
  className?: string;
  /** Override the spinning track/head colors (defaults to hairline + teal). */
  tone?: "teal" | "ink" | "canvas";
}

const tones = {
  teal: "border-hairline/15 border-t-teal-bright",
  ink: "border-ink/15 border-t-ink",
  canvas: "border-canvas/25 border-t-canvas",
} as const;

export function Spinner({ size = "md", tone = "teal", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-block shrink-0 animate-spin rounded-full", sizes[size], tones[tone], className)}
    />
  );
}

/** Full-viewport branded loader. Used for lazy-route + auth-resolving gaps. */
export function FullPageLoader({ label }: { label?: string }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-canvas px-6">
      <div className="flex flex-col items-center gap-5">
        <span className="font-display text-2xl font-semibold tracking-tightest text-ink">
          Lockd<span className="text-teal">IN</span>
        </span>
        <Spinner size="lg" />
        {label && <p className="text-sm text-ink-muted">{label}</p>}
      </div>
    </div>
  );
}
