/* =====================================================================
   BuddyCard — the current companion (avatar + name + mood label + streaks)
   alongside a gallery of all ten mood frames, with the current mood lifted
   and ringed. Privacy-framed: the buddy mirrors YOUR consistency, never
   compares you to anyone.
   ===================================================================== */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Flame, PencilSimple, Check, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Card } from "@/components/ui";
import { BuddySpeechBubble } from "@/components/BuddySpeechBubble";
import { BuddyVoiceSettings } from "@/components/BuddyVoiceSettings";
import { useUpdateBuddy } from "@/lib/queries";
import { getBuddyAvatar, moodLabel, moodEmoji, MOOD_MIN, MOOD_MAX } from "@/lib/buddy";
import {
  pickBuddyLine,
  playBuddyLine,
  useBuddyMuted,
  setBuddyMuted,
  canHoverPointer,
  type BuddyState,
  type BuddyLine,
} from "@/lib/buddySpeech";
import type { BuddyResponse } from "@/lib/types";
import { EASE_SMOOTH } from "@/lib/motion";

/** Matches the backend cap (BuddyUpdate.buddy_name max_length=30). */
const MAX_NAME = 30;

interface BuddyCardProps {
  buddy: BuddyResponse;
}

const ALL_MOODS = Array.from({ length: MOOD_MAX - MOOD_MIN + 1 }, (_, i) => i + MOOD_MIN);

export function BuddyCard({ buddy }: BuddyCardProps) {
  const reduce = useReducedMotion();
  const mood = buddy.mood_level;

  // ---- Talking buddy: tap (or hover) the avatar for a motivational line ----
  const [line, setLine] = useState<BuddyLine | null>(null);
  const [nonce, setNonce] = useState(0);
  const muted = useBuddyMuted();

  const buddyState: BuddyState = {
    buddyName: buddy.buddy_name,
    moodLevel: buddy.mood_level,
    currentStreak: buddy.current_streak,
    longestStreak: buddy.longest_streak,
  };

  const say = (speak: boolean) => {
    const next = pickBuddyLine(buddyState);
    setLine(next);
    setNonce((n) => n + 1);
    if (speak) playBuddyLine(next);
  };
  const talk = () => say(true); // click → spoken
  const peek = () => {
    // Hover-preview is desktop-only: on touch the tap already fires talk(), and
    // a synthesized mouseenter would double-pick a line and flicker the bubble.
    if (canHoverPointer() && !line) say(false);
  };
  const replay = () => {
    if (line) playBuddyLine(line);
  };
  const toggleMute = () => setBuddyMuted(!muted);

  return (
    <Card tone="teal" bodyClassName="p-6 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-eyebrow text-ink-faint">Your buddy</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2/70 px-2.5 py-1 text-xs font-medium text-ink-soft ring-1 ring-inset ring-hairline/10 tabular">
          <Flame
            weight={buddy.current_streak > 0 ? "fill" : "regular"}
            className={buddy.current_streak > 0 ? "h-3.5 w-3.5 text-teal-bright" : "h-3.5 w-3.5 text-ink-faint"}
          />
          {buddy.current_streak > 0
            ? `${buddy.current_streak}-day streak`
            : "Start a new streak"}
        </span>
      </div>

      {/* Current buddy */}
      <div className="mt-5 flex items-center gap-5">
        <div className="relative shrink-0">
          {/* Speech bubble floats above the avatar (direct AnimatePresence child
              so its exit animation plays). */}
          <AnimatePresence>
            {line && (
              <BuddySpeechBubble
                key="buddy-bubble"
                className="absolute bottom-full left-0 z-30 mb-3"
                text={line.text}
                nonce={nonce}
                muted={muted}
                onReplay={replay}
                onToggleMute={toggleMute}
                onDismiss={() => setLine(null)}
              />
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={talk}
            onMouseEnter={peek}
            aria-label={`Talk to ${buddy.buddy_name || "your buddy"}`}
            className="group/buddy relative grid h-28 w-28 place-items-center rounded-full bg-surface-2/50 ring-1 ring-inset ring-hairline/10 transition-transform duration-300 ease-out-strong hover:scale-[1.04] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55"
          >
            <motion.img
              key={`${buddy.buddy_type}-${mood}`}
              src={getBuddyAvatar(buddy.buddy_type, mood)}
              alt={`${buddy.buddy_name} feeling ${moodLabel(mood).toLowerCase()}`}
              className="relative h-24 w-24 select-none object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
              initial={reduce ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: EASE_SMOOTH }}
              draggable={false}
            />
            <span className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-surface-3/85 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-ink-faint opacity-0 ring-1 ring-inset ring-hairline/10 transition-opacity duration-300 group-hover/buddy:opacity-100">
              Tap to talk
            </span>
          </button>
        </div>

        <div className="min-w-0">
          <BuddyNameEditor buddy={buddy} />
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <span aria-hidden className="text-base leading-none">
              {moodEmoji(mood)}
            </span>
            <span>
              Feeling {moodLabel(mood).toLowerCase()}
            </span>
          </p>
          {/* Mood meter */}
          <div className="mt-3 h-2 w-full max-w-[220px] overflow-hidden rounded-full bg-surface-3/70">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-teal-deep via-teal to-teal-bright"
              initial={false}
              animate={{ width: `${mood * 10}%` }}
              transition={{ duration: 0.6, ease: EASE_SMOOTH }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            Longest run: <span className="tabular text-ink-muted">{buddy.longest_streak} days</span>
          </p>
        </div>
      </div>

      {/* Mood gallery — all ten frames, current highlighted */}
      <div className="mt-7">
        <p className="text-[11px] uppercase tracking-eyebrow text-ink-faint">
          Mood at every streak
        </p>
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {ALL_MOODS.map((m) => {
            const active = m === mood;
            return (
              <div
                key={m}
                title={`${m}. ${moodLabel(m)}`}
                aria-label={`Mood ${m}: ${moodLabel(m)}${active ? " (current)" : ""}`}
                className={[
                  "group relative grid aspect-square place-items-center rounded-xl border transition-all duration-300 ease-smooth",
                  active
                    ? "border-teal/45 bg-teal/10 ring-1 ring-inset ring-teal/20"
                    : "border-hairline/[0.07] bg-surface-2/40 opacity-55 hover:opacity-90",
                ].join(" ")}
              >
                <img
                  src={getBuddyAvatar(buddy.buddy_type, m)}
                  alt=""
                  loading="lazy"
                  className="h-10 w-10 object-contain sm:h-9 sm:w-9"
                  draggable={false}
                />
                {active && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-teal px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-canvas">
                    Now
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Voice & style — pick how your buddy sounds. */}
      <BuddyVoiceSettings />
    </Card>
  );
}

/* ---------------------------------------------------------------------------
   Inline buddy-name editor — the buddy's name is theirs to change. Tap the
   pencil to swap the heading for a field; Enter / ✓ saves (PUT /buddy/), Esc /
   ✕ cancels. The mutation updates the buddy query so the new name propagates
   everywhere the user's OWN buddy is shown (dashboard + profile cards) without a
   refetch.
   ------------------------------------------------------------------------- */
function BuddyNameEditor({ buddy }: { buddy: BuddyResponse }) {
  const updateBuddy = useUpdateBuddy();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(buddy.buddy_name || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const saving = updateBuddy.isPending;

  // If the name changes elsewhere while we're not editing, stay in sync.
  useEffect(() => {
    if (!editing) setName(buddy.buddy_name || "");
  }, [buddy.buddy_name, editing]);

  // Focus + select the field when the editor opens.
  useEffect(() => {
    if (!editing) return;
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 30);
    return () => window.clearTimeout(t);
  }, [editing]);

  const trimmed = name.trim();
  const valid = trimmed.length > 0 && trimmed.length <= MAX_NAME;
  const changed = trimmed !== (buddy.buddy_name || "");

  const cancel = () => {
    // Always reachable, even mid-save: drop any in-flight mutation state so the
    // user is never trapped waiting on a slow free-tier request.
    updateBuddy.reset();
    setName(buddy.buddy_name || "");
    setEditing(false);
  };

  const save = () => {
    if (!valid) return;
    if (!changed) {
      setEditing(false);
      return;
    }
    updateBuddy.mutate(
      { buddy_name: trimmed },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success("Buddy renamed.");
        },
        onError: () => toast.error("Couldn't rename your buddy. Please try again."),
      }
    );
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        <h3 className="truncate font-display text-2xl tracking-tightest text-ink">
          {buddy.buddy_name || "Buddy"}
        </h3>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Rename your buddy"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors duration-200 hover:bg-surface-2/70 hover:text-teal-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55"
        >
          <PencilSimple weight="bold" className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        maxLength={MAX_NAME}
        disabled={saving}
        aria-label="Buddy name"
        autoComplete="off"
        spellCheck={false}
        className="h-10 min-w-0 flex-1 rounded-xl bg-surface-2/80 px-3 font-display text-xl text-ink ring-1 ring-inset ring-hairline/10 transition-[box-shadow,background-color] duration-200 placeholder:text-ink-faint focus:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-teal/55 disabled:opacity-60"
        placeholder="Name your buddy…"
      />
      <button
        type="button"
        onClick={save}
        disabled={!valid || saving}
        aria-label="Save name"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal text-canvas transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-canvas/30 border-t-canvas" />
        ) : (
          <Check weight="bold" className="h-4 w-4" />
        )}
      </button>
      <button
        type="button"
        onClick={cancel}
        aria-label="Cancel rename"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-muted ring-1 ring-inset ring-hairline/10 transition-colors duration-200 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55"
      >
        <X weight="bold" className="h-4 w-4" />
      </button>
    </div>
  );
}
