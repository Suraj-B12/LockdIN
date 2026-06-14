/* =====================================================================
   Section — vertical rhythm + the canonical max-width container.
   Sections breathe heavily (py-24+). Use <Section> for marketing blocks and
   <Container> alone inside app screens that manage their own padding.
   ===================================================================== */
import type { HTMLAttributes, ReactNode, ElementType } from "react";
import { cn } from "@/lib/cn";

export const CONTAINER = "mx-auto w-full max-w-[1180px] px-5 sm:px-6 lg:px-8";

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Narrower reading measure for prose-heavy blocks. */
  narrow?: boolean;
}

export function Container({ children, narrow, className, ...props }: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full px-5 sm:px-6 lg:px-8", narrow ? "max-w-3xl" : "max-w-[1180px]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: ElementType;
  /** Vertical padding scale. */
  spacing?: "sm" | "md" | "lg";
  containerClassName?: string;
  bare?: boolean; // skip the inner container
}

const spacings = {
  sm: "py-16 sm:py-20",
  md: "py-24 sm:py-28",
  lg: "py-28 sm:py-36",
};

export function Section({
  children,
  as: Tag = "section",
  spacing = "md",
  className,
  containerClassName,
  bare,
  ...props
}: SectionProps) {
  return (
    <Tag className={cn("relative", spacings[spacing], className)} {...props}>
      {bare ? children : <Container className={containerClassName}>{children}</Container>}
    </Tag>
  );
}
