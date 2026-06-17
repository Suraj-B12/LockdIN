/* =====================================================================
   BuddySpeechBubble — the buddy's dialogue box. A spring-in card with a tail
   pointing at the avatar, a typewriter reveal, and small replay / mute controls.

   Controlled + presentational: the parent owns the current `text` and bumps
   `nonce` to (re)trigger — even when the same line is repeated. Auto-dismisses
   after a readable beat.

   NOT motion-gated: the user's test device runs OS "Reduce Motion", which would
   silently hide gated effects. Entrance + typewriter therefore always run (the
   typewriter is a JS interval, so it degrades to nothing worse than instant text).
   ===================================================================== */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { SpeakerHigh, SpeakerSlash, ArrowClockwise } from "@phosphor-icons/react";
import { speechSupported } from "@/lib/buddySpeech";
import { cn } from "@/lib/cn";

export interface BuddySpeechBubbleProps {
  text: string;
  /** Bump to re-run the typewriter/auto-dismiss even for an identical line. */
  nonce: number;
  muted: boolean;
  onToggleMute: () => void;
  onReplay: () => void;
  onDismiss: () => void;
  /** Where the tail points: "left" (bubble anchored left of avatar) or "center". */
  tailAlign?: "left" | "center";
  className?: string;
}

export function BuddySpeechBubble({
  text,
  nonce,
  muted,
  onToggleMute,
  onReplay,
  onDismiss,
  tailAlign = "left",
  className,
}: BuddySpeechBubbleProps) {
  const [shown, setShown] = useState("");
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  // Typewriter reveal — restarts whenever the line (or nonce) changes.
  useEffect(() => {
    setShown("");
    if (!text) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 22);
    return () => window.clearInterval(id);
  }, [text, nonce]);

  // Auto-dismiss after a readable beat (scales with length).
  useEffect(() => {
    if (!text) return;
    const ms = Math.min(11000, Math.max(4200, text.length * 55 + 2400));
    const id = window.setTimeout(() => dismissRef.current(), ms);
    return () => window.clearTimeout(id);
  }, [text, nonce]);

  const typing = shown.length < text.length;
  const canSpeak = speechSupported();

  // When centered (dashboard), do the horizontal -50% INSIDE framer-motion's
  // transform. A Tailwind `-translate-x-1/2` class would be overridden by the
  // inline transform framer writes for the y/scale spring, so the bubble would
  // spill off to the right. Keeping x here makes centering robust.
  const x = tailAlign === "center" ? "-50%" : 0;

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 8, scale: 0.94, x }}
      animate={{ opacity: 1, y: 0, scale: 1, x }}
      exit={{ opacity: 0, y: 6, scale: 0.96, x }}
      transition={{ type: "spring", stiffness: 460, damping: 30 }}
      className={cn(
        // Explicit width (not max-w) — an absolutely-positioned bubble would
        // otherwise shrink to its tiny avatar-sized containing block and wrap to
        // ~2 words a line. A fixed, mobile-safe width keeps it horizontal + readable.
        // No `position` here — the caller positions it (absolute) so it can be the
        // DIRECT AnimatePresence child and its exit animation actually plays.
        "w-[min(21rem,calc(100vw-2.5rem))] rounded-2xl bg-surface-2/95 px-4 py-3 text-left shadow-card-hover ring-1 ring-inset ring-hairline/12 backdrop-blur-sm",
        className
      )}
    >
      {/* Tail pointing down toward the avatar */}
      <span
        aria-hidden
        className={cn(
          "absolute -bottom-1.5 h-3 w-3 rotate-45 rounded-[3px] bg-surface-2/95 ring-1 ring-inset ring-hairline/12",
          tailAlign === "center" ? "left-1/2 -translate-x-1/2" : "left-7"
        )}
      />

      {/* Body font (Geist) for comfortable multi-line readability. */}
      <p className="text-[15px] leading-relaxed text-pretty text-ink">
        {shown}
        {typing && (
          <span
            className="ml-0.5 inline-block w-[2px] animate-pulse bg-teal-bright align-middle"
            style={{ height: "1em" }}
          />
        )}
      </p>

      {/* Controls — only meaningful when the device can speak. */}
      {canSpeak && (
        <div className="mt-2 flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onReplay}
            disabled={muted}
            aria-label="Say it again"
            className="grid h-7 w-7 place-items-center rounded-lg text-ink-faint transition-colors duration-200 hover:bg-surface-3/60 hover:text-teal-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-faint"
          >
            <ArrowClockwise weight="bold" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? "Unmute buddy" : "Mute buddy"}
            aria-pressed={muted}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-lg transition-colors duration-200 hover:bg-surface-3/60 hover:text-teal-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55",
              muted ? "text-teal-bright" : "text-ink-faint"
            )}
          >
            {muted ? (
              <SpeakerSlash weight="bold" className="h-3.5 w-3.5" />
            ) : (
              <SpeakerHigh weight="bold" className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
}
