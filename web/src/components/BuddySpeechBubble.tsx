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

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 8, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 460, damping: 30 }}
      className={cn(
        "relative max-w-xs rounded-2xl bg-surface-2/95 px-4 py-3 text-left shadow-card-hover ring-1 ring-inset ring-hairline/12 backdrop-blur-sm",
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

      <p className="font-display text-[15px] leading-snug tracking-tight text-ink">
        {shown}
        {typing && (
          <span className="ml-0.5 inline-block w-[2px] animate-pulse bg-teal-bright align-middle" style={{ height: "1em" }} />
        )}
      </p>

      <div className="mt-2 flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={onReplay}
          aria-label="Say it again"
          className="grid h-7 w-7 place-items-center rounded-lg text-ink-faint transition-colors duration-200 hover:bg-surface-3/60 hover:text-teal-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55"
        >
          <ArrowClockwise weight="bold" className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? "Unmute buddy" : "Mute buddy"}
          aria-pressed={muted}
          className="grid h-7 w-7 place-items-center rounded-lg text-ink-faint transition-colors duration-200 hover:bg-surface-3/60 hover:text-teal-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55"
        >
          {muted ? (
            <SpeakerSlash weight="bold" className="h-3.5 w-3.5" />
          ) : (
            <SpeakerHigh weight="bold" className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </motion.div>
  );
}
