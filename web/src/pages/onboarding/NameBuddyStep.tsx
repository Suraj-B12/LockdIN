/* =====================================================================
   Onboarding · Step 3 — Name your buddy.
   A large preview of the chosen buddy (ambient teal glow, matching the
   BuddySection bar), an Input capped at 30 chars with a live counter, and a
   confirm CTA with a saving state. Enter confirms when valid.
   ===================================================================== */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "@phosphor-icons/react";
import { Button, Input, EyebrowTag } from "@/components/ui";
import { getBuddyHeadshot } from "@/lib/buddy";
import { EASE_SMOOTH } from "@/lib/motion";
import { cn } from "@/lib/cn";

const MAX = 30;

export interface NameBuddyStepProps {
  /** 1-based chosen buddy index. */
  buddyIndex: number;
  /** Saving in flight — disables input + shows spinner in the button. */
  saving: boolean;
  onConfirm: (name: string) => void;
  /** Go back to re-pick a buddy. */
  onBack: () => void;
}

export function NameBuddyStep({ buddyIndex, saving, onConfirm, onBack }: NameBuddyStepProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the field as the step settles in.
  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 450);
    return () => window.clearTimeout(t);
  }, []);

  const trimmed = name.trim();
  const valid = trimmed.length > 0 && !saving;
  const count = name.length;
  const counterTone =
    count >= MAX ? "text-teal-bright" : count >= 25 ? "text-warning" : "text-ink-faint";

  const submit = () => {
    if (!valid) return;
    onConfirm(trimmed);
  };

  return (
    <motion.div
      className="flex w-full flex-col items-center text-center"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_SMOOTH }}
    >
      <EyebrowTag>Name your buddy</EyebrowTag>

      {/* Large preview */}
      <div className="relative mx-auto mt-8 flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48">
        <motion.img
          src={getBuddyHeadshot(buddyIndex)}
          alt="Your chosen buddy"
          draggable={false}
          className="relative h-full w-full select-none object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
          initial={{ scale: 0.82, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 20, delay: 0.1 }}
        />
      </div>

      <h1 className="mt-7 text-balance font-display text-4xl tracking-tightest text-ink sm:text-5xl">
        What will you call them?
      </h1>
      <p className="mt-4 max-w-md text-pretty leading-relaxed text-ink-muted">
        Give them a name that means something. This is between you two &mdash; you can always change
        it later.
      </p>

      {/* Naming field */}
      <div className="mt-8 w-full max-w-sm">
        <div className="relative">
          <Input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, MAX))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            maxLength={MAX}
            disabled={saving}
            placeholder="Enter a name…"
            aria-label="Buddy name"
            autoComplete="off"
            spellCheck={false}
            className="h-12 pr-16 text-center text-base"
          />
          <span
            className={cn(
              "pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs tabular-nums transition-colors duration-200",
              counterTone
            )}
          >
            {count}/{MAX}
          </span>
        </div>
      </div>

      {/* Confirm */}
      <div className="mt-9 flex flex-col items-center gap-4">
        <Button
          size="lg"
          trailingIcon={valid ? Check : false}
          onClick={submit}
          disabled={!valid}
          aria-busy={saving}
          className="min-w-[200px]"
        >
          {saving ? (
            <span className="inline-flex items-center gap-2.5">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-canvas/30 border-t-canvas" />
              Locking it in…
            </span>
          ) : (
            "Lock it in"
          )}
        </Button>

        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="rounded-full text-sm text-ink-muted transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-50"
        >
          Pick a different buddy
        </button>
      </div>
    </motion.div>
  );
}
