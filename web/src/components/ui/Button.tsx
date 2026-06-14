/* =====================================================================
   Button — pill, press physics, and the "button-in-button" trailing icon.
   Variants: primary | secondary | ghost | outline. Sizes: sm | md | lg | xl.
   The trailing icon (when `trailingIcon` is set) nests inside its own circle
   and gains magnetic kinetic tension on hover (translate + scale), per the
   high-end design law. Press feedback is a subtle scale-down.
   ===================================================================== */
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowUpRight, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** When set, renders a nested circular trailing icon with hover physics. */
  trailingIcon?: Icon | false;
  /** Leading icon, inline (no circle). */
  leadingIcon?: Icon;
  fullWidth?: boolean;
  children?: ReactNode;
}

const base =
  "group relative inline-flex select-none items-center justify-center gap-2 rounded-full font-medium " +
  "transition-[transform,background-color,box-shadow,color] duration-200 ease-out-strong " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-bright/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

const variants: Record<Variant, string> = {
  // Teal fill with a faint inset top highlight — no glow. Dark ink for AA contrast.
  primary:
    "bg-teal text-canvas shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset] " +
    "hover:bg-teal-bright",
  // Elevated surface with hairline ring.
  secondary:
    "bg-surface-2 text-ink ring-1 ring-inset ring-hairline/10 shadow-pill " +
    "hover:bg-surface-3 hover:ring-hairline/[0.18]",
  // Transparent, gains a faint surface on hover.
  ghost: "bg-transparent text-ink-soft hover:bg-surface-2 hover:text-ink",
  // Hairline outline that lights up teal on hover.
  outline:
    "bg-transparent text-ink ring-1 ring-inset ring-hairline/[0.14] hover:ring-teal/40 hover:text-teal-bright",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-[52px] pl-7 pr-2.5 text-[15px]",
  xl: "h-[60px] pl-8 pr-3 text-base",
};

// Trailing-icon circle sizing per button size.
const iconCircle: Record<Size, string> = {
  sm: "h-6 w-6",
  md: "h-7 w-7",
  lg: "h-9 w-9",
  xl: "h-11 w-11",
};

// When there's no trailing icon, restore symmetric horizontal padding.
const symmetricPad: Record<Size, string> = {
  sm: "px-4",
  md: "px-5",
  lg: "px-7",
  xl: "px-8",
};

const circleTint: Record<Variant, string> = {
  primary: "bg-canvas/15 text-canvas",
  secondary: "bg-teal/15 text-teal-bright",
  ghost: "bg-teal/15 text-teal-bright",
  outline: "bg-teal/15 text-teal-bright",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    trailingIcon,
    leadingIcon: LeadingIcon,
    fullWidth,
    className,
    children,
    type = "button",
    ...props
  },
  ref
) {
  const TrailingIcon = trailingIcon === false ? undefined : trailingIcon ?? undefined;
  const hasTrailing = !!TrailingIcon;
  // Default the iconic CTA arrow only when explicitly requested via `trailingIcon`.

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        !hasTrailing && symmetricPad[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {LeadingIcon && (
        <LeadingIcon
          weight="bold"
          className="-ml-0.5 h-[1.05em] w-[1.05em] shrink-0"
          aria-hidden
        />
      )}
      <span className="whitespace-nowrap">{children}</span>
      {hasTrailing && (
        <span
          className={cn(
            "ml-1 grid shrink-0 place-items-center rounded-full transition-transform duration-300 ease-out-strong",
            "group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105",
            iconCircle[size],
            circleTint[variant]
          )}
          aria-hidden
        >
          <TrailingIcon weight="bold" className="h-[55%] w-[55%]" />
        </span>
      )}
    </button>
  );
});

/** Re-export the canonical CTA arrow so callers can pass it without importing. */
export { ArrowUpRight as ButtonArrow };
