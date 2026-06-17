/* =====================================================================
   CountUp — animates a number from `from` to `value` on an S-curve
   (easeInOutCubic: slow start, fast middle, slow settle). requestAnimationFrame
   driven; honors Reduce Motion by snapping straight to the final value. Renders a
   single <span> so it can host any tabular/mono styling the caller passes.
   ===================================================================== */
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/** S-curve: ease-in-out cubic — slow at both ends, quick through the middle. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface CountUpProps {
  value: number;
  from?: number;
  durationMs?: number;
  className?: string;
  /** Fires once when the count settles on `value`. */
  onDone?: () => void;
}

export function CountUp({ value, from = 0, durationMs = 1100, className, onDone }: CountUpProps) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : from);
  const rafRef = useRef<number | null>(null);
  // Keep onDone in a ref so the animation effect doesn't re-run when the parent
  // re-renders with a new callback identity.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      doneRef.current?.();
      return;
    }

    const delta = value - from;
    let startTs: number | null = null;

    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const t = Math.min(1, (ts - startTs) / Math.max(1, durationMs));
      setDisplay(Math.round(from + delta * easeInOutCubic(t)));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
        doneRef.current?.();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, from, durationMs, reduce]);

  return <span className={className}>{display}</span>;
}
