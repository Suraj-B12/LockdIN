/* =====================================================================
   Small shared dashboard bits — a consistent card header (icon chip + label +
   optional trailing action) and a thin "stat" cell. Kept tiny + local so the
   bento cards read uniformly without touching the frozen shared UI layer.
   ===================================================================== */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export interface CardHeadProps {
  icon: Icon;
  label: string;
  /** Optional right-aligned action — a link with a chevron. */
  actionTo?: string;
  actionLabel?: string;
  children?: ReactNode; // optional custom right slot (overrides action link)
  className?: string;
}

/** The eyebrow-style header used at the top of every bento card. */
export function CardHead({
  icon: IconCmp,
  label,
  actionTo,
  actionLabel,
  children,
  className,
}: CardHeadProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal/10 text-teal-bright ring-1 ring-inset ring-teal/15">
          <IconCmp weight="duotone" className="h-[18px] w-[18px]" />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-eyebrow text-ink-muted">
          {label}
        </span>
      </div>
      {children
        ? children
        : actionTo && (
            <Link
              to={actionTo}
              className="group inline-flex items-center gap-1 text-[12px] font-medium text-ink-muted transition-colors hover:text-teal-bright"
            >
              {actionLabel ?? "View all"}
              <ArrowRight
                weight="bold"
                className="h-3.5 w-3.5 transition-transform duration-300 ease-out-strong group-hover:translate-x-0.5"
              />
            </Link>
          )}
    </div>
  );
}

/** A compact labelled metric (value on top, caption under). */
export function Stat({
  value,
  label,
  className,
  valueClassName,
}: {
  value: ReactNode;
  label: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span
        className={cn(
          "font-mono text-2xl font-semibold tabular text-ink leading-none",
          valueClassName
        )}
      >
        {value}
      </span>
      <span className="mt-1.5 text-[11px] text-ink-faint">{label}</span>
    </div>
  );
}
