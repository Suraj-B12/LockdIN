/* =====================================================================
   Reveal — scroll-into-view fade-up (+ optional blur) wrapper.
   The default reveal for marketing + screen content. Honors reduced motion.
   For lists, set `stagger` on a parent <Reveal> and wrap children in
   <RevealChild> to cascade.
   ===================================================================== */
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE_SMOOTH, VIEWPORT_ONCE } from "@/lib/motion";

export interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Delay in seconds before the reveal starts. */
  delay?: number;
  /** Travel distance in px (default 22). */
  y?: number;
  /** Add a subtle blur-in. */
  blur?: boolean;
  /** Turn this into a staggering parent for <RevealChild> items. */
  stagger?: boolean;
  as?: "div" | "section" | "ul" | "li" | "span";
}

export function Reveal({
  children,
  className,
  delay = 0,
  y = 22,
  blur = true,
  stagger,
  as = "div",
}: RevealProps) {
  const reduce = useReducedMotion();
  const M = motion[as] as typeof motion.div;

  if (stagger) {
    return (
      <M
        className={className}
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT_ONCE}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.07, delayChildren: delay } },
        }}
      >
        {children}
      </M>
    );
  }

  return (
    <M
      className={className}
      initial={reduce ? false : { opacity: 0, y, filter: blur ? "blur(6px)" : "blur(0px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: 0.7, ease: EASE_SMOOTH, delay }}
    >
      {children}
    </M>
  );
}

/** Child item inside a `stagger` Reveal parent. */
export function RevealChild({
  children,
  className,
  y = 22,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  as?: "div" | "li" | "span";
}) {
  const reduce = useReducedMotion();
  const M = motion[as] as typeof motion.div;
  return (
    <M
      className={className}
      variants={{
        hidden: reduce ? {} : { opacity: 0, y, filter: "blur(6px)" },
        show: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.65, ease: EASE_SMOOTH },
        },
      }}
    >
      {children}
    </M>
  );
}
