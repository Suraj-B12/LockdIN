/* =====================================================================
   MilestoneModal — a one-time celebration when a streak hits a milestone
   (7/30/100/365…). Shows the buddy, the streak number, and a one-tap Share that
   renders a branded PNG client-side. Confetti is fired by the caller. NOT
   motion-gated (Reduce-Motion devices still see it).
   ===================================================================== */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShareNetwork, X, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { getBuddyAvatar, MOOD_MAX } from "@/lib/buddy";
import { milestoneLabel } from "@/lib/milestones";
import { shareMilestone } from "@/lib/shareCard";
import type { BuddyResponse } from "@/lib/types";

export interface MilestoneModalProps {
  milestone: number;
  buddy: BuddyResponse;
  onClose: () => void;
}

export function MilestoneModal({ milestone, buddy, onClose }: MilestoneModalProps) {
  const [sharing, setSharing] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const streak = Math.max(buddy.current_streak, milestone);
  const label = milestoneLabel(milestone);
  // Celebrate with the happiest buddy frame regardless of stored mood.
  const avatarSrc = getBuddyAvatar(buddy.buddy_type, MOOD_MAX);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onShare = async () => {
    setSharing(true);
    try {
      const result = await shareMilestone({ streak, label, avatarSrc, buddyName: buddy.buddy_name });
      if (result === "downloaded") toast.success("Streak card saved — share it anywhere!");
      else if (result === "failed") toast.error("Couldn't create the share card. Try again.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-overlay grid place-items-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Streak milestone: ${label}`}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 340, damping: 26 }}
        className="relative w-full max-w-sm overflow-hidden rounded-squircle bg-surface-2 p-7 text-center shadow-card-hover ring-1 ring-inset ring-teal/20"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-surface-3/60 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55"
        >
          <X weight="bold" className="h-4 w-4" />
        </button>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-eyebrow text-teal-bright ring-1 ring-inset ring-teal/15">
          <Sparkle weight="fill" className="h-3.5 w-3.5" />
          Milestone unlocked
        </span>

        <div className="mx-auto mt-5 grid h-28 w-28 place-items-center rounded-full bg-surface-3/40 ring-1 ring-inset ring-teal/15">
          <img
            src={avatarSrc}
            alt={buddy.buddy_name}
            className="h-24 w-24 select-none object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
            draggable={false}
          />
        </div>

        <div className="mt-5 flex items-baseline justify-center gap-2">
          <span className="font-mono text-6xl font-bold tabular leading-none text-ink">{streak}</span>
          <span className="text-sm font-medium uppercase tracking-eyebrow text-teal-bright">days</span>
        </div>
        <h2 className="mt-3 text-balance font-display text-2xl tracking-tightest text-ink">{label}</h2>
        <p className="mt-2 text-sm text-ink-muted">
          {buddy.buddy_name} is so proud of you. Keep the flame alive.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onShare}
            disabled={sharing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55 disabled:opacity-60"
          >
            {sharing ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-canvas/30 border-t-canvas" />
            ) : (
              <ShareNetwork weight="fill" className="h-4 w-4" />
            )}
            Share my streak
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55"
          >
            Keep going
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
