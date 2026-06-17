/* =====================================================================
   CancelSessionDialog — discard an accidentally-started session. Two-step
   confirmation (couple of confirmations before it actually terminates): a first
   "are you sure" then a final destructive confirm. Matches the WorkLogSheet
   aesthetic (double-bezel glass sheet, scrim, spring), Esc / backdrop dismiss.
   ===================================================================== */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Trash, Warning, ArrowLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui";
import { SPRING } from "@/lib/motion";
import { formatDuration } from "./utils";

export interface CancelSessionDialogProps {
  open: boolean;
  elapsedSeconds: number;
  discarding: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelSessionDialog({
  open,
  elapsedSeconds,
  discarding,
  onClose,
  onConfirm,
}: CancelSessionDialogProps) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState<1 | 2>(1);

  // Reset to the first step each time it opens; lock scroll + wire Esc.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !discarding) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, discarding, onClose]);

  const first = step === 1;
  const title = first ? "Discard this session?" : "Are you sure?";
  const body = first
    ? `You've focused for ${formatDuration(elapsedSeconds)}. Discarding won't save the time or affect your streak — use this only if you started it by accident.`
    : "This can't be undone. The session will be removed completely.";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-overlay grid place-items-end sm:place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Close"
            disabled={discarding}
            onClick={onClose}
            className="absolute inset-0 bg-canvas/80 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            transition={SPRING}
            className="relative z-10 w-full max-w-md rounded-t-squircle-lg p-1.5 ring-1 ring-inset ring-danger/20 bg-danger/[0.05] shadow-card sm:rounded-squircle-lg"
          >
            <div className="rounded-t-[calc(2rem-0.375rem)] bg-surface-2/95 p-6 shadow-inset-top backdrop-blur-xl sm:rounded-[calc(2rem-0.375rem)] sm:p-7">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-danger/10 text-danger ring-1 ring-inset ring-danger/20">
                <Warning weight="duotone" className="h-6 w-6" />
              </span>

              <h2 id="cancel-title" className="mt-4 font-display text-2xl tracking-tightest text-ink">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>

              <div className="mt-6 flex items-center justify-end gap-3">
                {first ? (
                  <>
                    <Button variant="ghost" onClick={onClose} disabled={discarding}>
                      Keep going
                    </Button>
                    <DangerButton onClick={() => setStep(2)} disabled={discarding}>
                      <Trash weight="bold" className="h-4 w-4" />
                      Discard…
                    </DangerButton>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      leadingIcon={ArrowLeft}
                      onClick={() => setStep(1)}
                      disabled={discarding}
                    >
                      Back
                    </Button>
                    <DangerButton onClick={onConfirm} disabled={discarding} busy={discarding}>
                      {discarding ? "Discarding…" : "Yes, discard it"}
                    </DangerButton>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** A small destructive button (the design system has no danger variant). */
function DangerButton({
  children,
  onClick,
  disabled,
  busy,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full bg-danger px-4 py-2.5 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/55 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      )}
      {children}
    </button>
  );
}
