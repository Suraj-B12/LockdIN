/* =====================================================================
   SectionHeading — eyebrow (optional) + display title + subtitle.
   Sentence case. Title uses the display font with tight tracking. Subtitle is
   constrained to a readable measure. Centered by default; pass align="left".
   Reveals on scroll.
   ===================================================================== */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { EyebrowTag } from "./EyebrowTag";
import { Reveal } from "./Reveal";

export interface SectionHeadingProps {
  eyebrow?: ReactNode;
  eyebrowPulse?: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  eyebrowPulse,
  title,
  subtitle,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <Reveal
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "mx-auto max-w-2xl items-center text-center" : "items-start text-left",
        className
      )}
    >
      {eyebrow && <EyebrowTag pulse={eyebrowPulse}>{eyebrow}</EyebrowTag>}
      <h2 className="text-balance font-display text-4xl tracking-tightest text-ink sm:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="max-w-xl text-pretty text-base leading-relaxed text-ink-muted">{subtitle}</p>
      )}
    </Reveal>
  );
}
