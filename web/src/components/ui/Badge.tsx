/* =====================================================================
   Badge — compact status / count chip. Not an eyebrow (no tracking caps).
   Tones map to semantic colors; kept desaturated and ring-based, not glowy.
   ===================================================================== */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "teal" | "success" | "warning" | "danger";

export interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-soft ring-hairline/10",
  teal: "bg-teal/12 text-teal-bright ring-teal/25",
  success: "bg-success/12 text-success ring-success/25",
  warning: "bg-warning/12 text-warning ring-warning/25",
  danger: "bg-danger/12 text-danger ring-danger/25",
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset tabular",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
