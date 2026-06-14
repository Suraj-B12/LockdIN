/* =====================================================================
   Motion primitives — shared spring/curve/duration tokens + reveal variants.
   Import these so every screen animates with the same physics. GPU-only
   (transform + opacity). Honor reduced motion at the call site with
   `useReducedMotion()` from framer-motion.
   ===================================================================== */
import type { Variants, Transition } from "framer-motion";

/** The signature LockdIN easing curve (iOS drawer feel). */
export const EASE_SMOOTH = [0.32, 0.72, 0, 1] as const;
/** Strong ease-out for entering elements (responsive feel). */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Apple-style spring — easy to reason about, subtle bounce. */
export const SPRING: Transition = { type: "spring", duration: 0.5, bounce: 0.18 };
/** Snappier spring for press / hover physics. */
export const SPRING_SNAPPY: Transition = { type: "spring", stiffness: 320, damping: 26 };

export const DURATION = {
  press: 0.14,
  fast: 0.2,
  base: 0.45,
  reveal: 0.7,
} as const;

/**
 * Staggered scroll-reveal: items fade up with a slight blur as they enter view.
 * Use as a child variant with a parent that sets `variants={revealStagger}`.
 */
export const revealItem: Variants = {
  hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: DURATION.reveal, ease: EASE_SMOOTH },
  },
};

/** Parent container that staggers its children's reveals. */
export const revealStagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

/** Simple fade-up for single elements (no blur, lighter). */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_SMOOTH } },
};

/** Standard whileInView viewport config — reveal once, 25% in view. */
export const VIEWPORT_ONCE = { once: true, amount: 0.25 } as const;
