/* =====================================================================
   Toggle — a premium switch row. Label + helper on the left, an animated
   track/knob on the right. Spring physics on the knob; teal fill when on.
   Fully keyboard-accessible (role=switch, Space/Enter, focus ring). The row
   itself is clickable for a generous hit target.
   ===================================================================== */
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { SPRING_SNAPPY } from "@/lib/motion";
import { cn } from "@/lib/cn";

interface ToggleProps {
  label: ReactNode;
  helper?: ReactNode;
  icon?: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Visually + functionally disabled (e.g. while a related parent is off). */
  disabled?: boolean;
}

export function Toggle({ label, helper, icon, checked, onChange, disabled }: ToggleProps) {
  const reduce = useReducedMotion();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "group flex w-full items-center gap-4 rounded-2xl px-3 py-3.5 text-left transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-bright/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        disabled ? "cursor-not-allowed opacity-45" : "hover:bg-surface-2/50"
      )}
    >
      {icon && (
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset transition-colors duration-200",
            checked
              ? "bg-teal/12 text-teal-bright ring-teal/25"
              : "bg-surface-2 text-ink-muted ring-hairline/10"
          )}
        >
          {icon}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {helper && (
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{helper}</span>
        )}
      </span>

      {/* Track */}
      <span
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 ring-1 ring-inset transition-colors duration-300 ease-out-strong",
          checked
            ? "bg-teal ring-1 ring-inset ring-teal/30"
            : "bg-surface-3 ring-hairline/10"
        )}
      >
        <motion.span
          className={cn(
            "h-5 w-5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.4)]",
            checked ? "bg-canvas" : "bg-ink-muted"
          )}
          animate={{ x: checked ? 20 : 0 }}
          transition={reduce ? { duration: 0 } : SPRING_SNAPPY}
        />
      </span>
    </button>
  );
}
