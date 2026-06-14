/* =====================================================================
   Card — the "double-bezel" surface.
   Outer shell: hairline ring + faint bg + padding + large squircle radius.
   Inner core: own bg + inset top highlight + concentric (smaller) radius.
   This reads like a glass plate seated in a machined tray, per the design law.

   Usage:
     <Card>...</Card>                      // default shell + core
     <Card tone="teal" interactive>...     // teal-tinted, hover lift
     <Card.Bare>...</Card.Bare>            // single surface, no nested core
   ===================================================================== */
import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "teal" | "elevated";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  /** Adds hover lift + ring brighten + shadow growth. */
  interactive?: boolean;
  /** Inner core padding. Defaults to comfortable. */
  bodyClassName?: string;
  children?: ReactNode;
}

const shellTone: Record<Tone, string> = {
  default: "bg-hairline/[0.03] ring-hairline/[0.07]",
  teal: "bg-teal/[0.05] ring-teal/[0.16]",
  elevated: "bg-hairline/[0.05] ring-hairline/[0.1]",
};

const coreTone: Record<Tone, string> = {
  default: "bg-surface/80",
  teal: "bg-surface-2/85",
  elevated: "bg-surface-2/90",
};

const CardRoot = forwardRef<HTMLDivElement, CardProps>(function Card(
  { tone = "default", interactive, className, bodyClassName, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        // Outer shell
        "rounded-squircle-lg p-1.5 ring-1 ring-inset shadow-card",
        shellTone[tone],
        interactive &&
          "group/card transition-[transform,box-shadow] duration-500 ease-smooth hover:-translate-y-0.5 hover:shadow-card-hover",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          // Inner core — concentric radius = shell radius minus shell padding.
          "h-full rounded-[calc(2rem-0.375rem)] shadow-inset-top",
          coreTone[tone],
          interactive && "transition-colors duration-500 ease-smooth",
          bodyClassName ?? "p-6"
        )}
      >
        {children}
      </div>
    </div>
  );
});

/** A single-surface card (no nested core) for tighter contexts. */
const Bare = forwardRef<HTMLDivElement, CardProps>(function CardBare(
  { tone = "default", interactive, className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-squircle ring-1 ring-inset shadow-inset-top",
        coreTone[tone],
        tone === "teal" ? "ring-teal/16" : "ring-hairline/[0.08]",
        interactive &&
          "transition-[transform,box-shadow] duration-300 ease-out-strong hover:-translate-y-0.5 hover:ring-hairline/[0.14] hover:shadow-card",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export const Card = Object.assign(CardRoot, { Bare });
