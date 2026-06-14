/* =====================================================================
   WorkLogSheet — the polished "what did you work on?" modal shown on Finish.
   Centered glass sheet with a scrim, spring entrance, char-counted textarea
   (1–2000), inline validation, and Esc / backdrop / button dismissal. Focus
   moves to the textarea on open; body scroll is locked while open.
   ===================================================================== */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, Sparkle, PaperPlaneTilt } from "@phosphor-icons/react";
import { Button } from "@/components/ui";
import { Textarea } from "@/components/ui";
import { SPRING } from "@/lib/motion";
import { formatDuration } from "./utils";

const MAX = 2000;
const MIN = 1;

export interface WorkLogSheetProps {
  open: boolean;
  /** Elapsed seconds for the session being logged (shown for context). */
  elapsedSeconds: number;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (workLog: string) => void;
}

export function WorkLogSheet({
  open,
  elapsedSeconds,
  submitting,
  onCancel,
  onSubmit,
}: WorkLogSheetProps) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmedLen = value.trim().length;
  const tooShort = trimmedLen < MIN;
  const tooLong = value.length > MAX;
  const invalid = tooShort || tooLong;
  const error = touched && tooShort ? "Add a sentence or two about what you did." : undefined;

  // Reset the field each time the sheet opens; focus the textarea.
  useEffect(() => {
    if (open) {
      setValue("");
      setTouched(false);
      const t = setTimeout(() => textareaRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Lock body scroll + wire Esc while open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onCancel();
      // Cmd/Ctrl+Enter submits.
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") attemptSubmit();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, submitting, value]);

  function attemptSubmit() {
    if (submitting) return;
    setTouched(true);
    if (invalid) {
      textareaRef.current?.focus();
      return;
    }
    onSubmit(value.trim());
  }

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
          {/* Scrim */}
          <button
            type="button"
            aria-label="Close"
            disabled={submitting}
            onClick={onCancel}
            className="absolute inset-0 bg-canvas/80 backdrop-blur-sm"
          />

          {/* Sheet — double-bezel, matching the Card system */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="worklog-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            transition={SPRING}
            className="relative z-10 w-full max-w-lg rounded-t-squircle-lg sm:rounded-squircle-lg p-1.5 ring-1 ring-inset ring-teal/16 bg-teal/[0.05] shadow-card"
          >
            <div className="rounded-t-[calc(2rem-0.375rem)] sm:rounded-[calc(2rem-0.375rem)] bg-surface-2/95 shadow-inset-top backdrop-blur-xl">
              <div className="relative p-6 sm:p-7">
                {/* Close */}
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={submitting}
                  aria-label="Close"
                  className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-ink-muted ring-1 ring-inset ring-hairline/10 transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-50"
                >
                  <X weight="bold" className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-2 text-teal-bright">
                  <Sparkle weight="fill" className="h-4 w-4" />
                  <span className="text-[11px] font-medium uppercase tracking-eyebrow">
                    Log this session
                  </span>
                </div>

                <h2
                  id="worklog-title"
                  className="mt-3 font-display text-2xl tracking-tightest text-ink sm:text-[26px]"
                >
                  What did you work on?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  You focused for{" "}
                  <span className="font-mono tabular text-ink-soft">
                    {formatDuration(elapsedSeconds)}
                  </span>
                  . Describe what you got done — the more specific, the better your AI score.
                </p>

                <div className="mt-5">
                  <Textarea
                    ref={textareaRef}
                    rows={5}
                    value={value}
                    maxLength={MAX}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={() => setTouched(true)}
                    error={error}
                    placeholder="e.g. Studied data structures — trees, heaps, priority queues. Solved 3 problems and wrote notes on Big-O."
                    aria-label="Work log"
                  />
                  {!error && (
                    <div className="mt-1.5 flex justify-end">
                      <span
                        className={
                          "font-mono text-[11px] tabular " +
                          (tooLong ? "text-danger" : "text-ink-faint")
                        }
                      >
                        {value.length}/{MAX}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button variant="ghost" onClick={onCancel} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    trailingIcon={PaperPlaneTilt}
                    onClick={attemptSubmit}
                    disabled={submitting || invalid}
                    aria-disabled={submitting || invalid}
                  >
                    {submitting ? "Scoring…" : "Finish & score"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
