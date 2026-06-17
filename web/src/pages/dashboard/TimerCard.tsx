/* =====================================================================
   TimerCard — the hero of the dashboard. Idle / active / paused states with a
   large tabular HH:MM:SS that ticks once a second, a teal progress sweep ring,
   and the start / pause / resume / finish controls. Opens the work-log sheet on
   Finish. Made to feel instant: optimistic state transitions, RAF-driven tick
   derived from wall-clock so it stays accurate across tab throttling.
   ===================================================================== */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Play, Pause, Flag, ArrowClockwise, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  useActiveSession,
  useStartSession,
  usePauseSession,
  useResumeSession,
  useFinishSession,
  useCancelSession,
  useBuddy,
} from "@/lib/queries";
import type { SessionResponse } from "@/lib/types";
import { EASE_SMOOTH } from "@/lib/motion";
import { formatClock, formatDuration } from "./utils";
import { WorkLogSheet } from "./WorkLogSheet";
import { CancelSessionDialog } from "./CancelSessionDialog";
import { SessionFinale } from "./SessionFinale";
import { playStartCue } from "@/lib/celebrate";
import { pickBuddyLine, playBuddyLine, type BuddyState } from "@/lib/buddySpeech";

/** Seconds the ring loops over — a visual "sweep", not a hard goal (60 min). */
const RING_PERIOD = 3600;

/** Live elapsed seconds for an active session, from wall-clock + banked time. */
function liveElapsed(session: SessionResponse): number {
  const started = new Date(session.started_at).getTime();
  const segment = Number.isNaN(started) ? 0 : Math.max(0, (Date.now() - started) / 1000);
  return session.total_seconds + segment;
}

export function TimerCard() {
  const reduce = useReducedMotion();
  const { data: session, isLoading } = useActiveSession();

  const start = useStartSession();
  const pause = usePauseSession();
  const resume = useResumeSession();
  const finish = useFinishSession();
  const cancel = useCancelSession();
  const { data: buddy } = useBuddy();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  // The choreographed end-of-session overlay (score count-up → streak → buddy → confetti).
  const [finale, setFinale] = useState<{
    score: number | null;
    streak: number;
    durationLabel: string;
  } | null>(null);
  // Stable identity so the finale's auto-dismiss/escape timers don't reset when
  // an unrelated re-render (e.g. the buddy refetch) gives onClose a new closure.
  const closeFinale = useCallback(() => setFinale(null), []);

  // The buddy reacts at the two emotional peaks — starting (anticipation) and
  // finishing (peak-end). Honors mute inside playBuddyLine.
  function buddySpeak() {
    if (!buddy) return;
    const state: BuddyState = {
      buddyName: buddy.buddy_name,
      moodLevel: buddy.mood_level,
      currentStreak: buddy.current_streak,
      longestStreak: buddy.longest_streak,
    };
    playBuddyLine(pickBuddyLine(state));
  }
  // Elapsed time FROZEN at the instant Finish is clicked — the log sheet shows
  // this, not the still-running live timer, so the duration stops climbing.
  const [frozenSeconds, setFrozenSeconds] = useState(0);
  // Whole-second display value. Derived from wall-clock each frame while active.
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const rafRef = useRef<number | null>(null);

  const status = session?.status; // "active" | "paused" | undefined (idle)
  const isActive = status === "active";
  const isPaused = status === "paused";

  // ---- The tick. One RAF loop; we only setState when the integer second
  //      changes, so renders stay ~1Hz while the value tracks the real clock.
  useEffect(() => {
    // Cancel any prior loop.
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    if (!session) {
      setDisplaySeconds(0);
      return;
    }

    if (isPaused) {
      // Banked time only — no ticking.
      setDisplaySeconds(Math.floor(session.total_seconds));
      return;
    }

    if (isActive) {
      // Seed immediately so there's no 1-frame flash of 0.
      setDisplaySeconds(Math.floor(liveElapsed(session)));

      if (reduce) {
        // Reduced motion: still keep it correct with a 1s interval (no RAF).
        const id = setInterval(() => {
          setDisplaySeconds(Math.floor(liveElapsed(session)));
        }, 1000);
        return () => clearInterval(id);
      }

      const tick = () => {
        const next = Math.floor(liveElapsed(session));
        setDisplaySeconds((prev) => (prev === next ? prev : next));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, status, reduce]);

  // Ring progress 0..1 over RING_PERIOD (loops). Idle = 0.
  const ringProgress = useMemo(() => {
    if (!session) return 0;
    return (displaySeconds % RING_PERIOD) / RING_PERIOD;
  }, [displaySeconds, session]);

  const busy =
    start.isPending || pause.isPending || resume.isPending || finish.isPending || cancel.isPending;

  // ---- Actions -----------------------------------------------------------
  function handleStart() {
    // Ignition ritual — a tiny anticipation cue fired on the hardest moment
    // (beginning), identical every time so it becomes a conditioned "go" signal.
    // Skip it if a session somehow already exists (the start would 409/resync).
    if (!session) {
      playStartCue();
      buddySpeak();
    }
    start.mutate(undefined, {
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          // Someone else / another tab already started one — just resync.
          toast.message("You already have a session running", {
            description: "We picked it back up for you.",
          });
        } else {
          toast.error(err instanceof Error ? err.message : "Couldn't start the session.");
        }
      },
    });
  }

  function handlePause() {
    if (!session) return;
    pause.mutate(session.id, {
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Couldn't pause the session."),
    });
  }

  function handleResume() {
    if (!session) return;
    resume.mutate(session.id, {
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Couldn't resume the session."),
    });
  }

  function handleCancelConfirm() {
    if (!session) return;
    cancel.mutate(session.id, {
      onSuccess: () => {
        setCancelOpen(false);
        toast.message("Session discarded", { description: "No time was saved." });
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          setCancelOpen(false);
          toast.message("Nothing to discard", { description: "That session was already gone." });
        } else {
          toast.error(err instanceof Error ? err.message : "Couldn't discard the session.");
        }
      },
    });
  }

  // Snapshot elapsed time when Finish is pressed, then open the log sheet. The
  // session stays active until submit, but the shown duration freezes here.
  function openFinish() {
    if (!session) return;
    setFrozenSeconds(isActive ? Math.floor(liveElapsed(session)) : Math.floor(session.total_seconds));
    setSheetOpen(true);
  }

  function handleFinishSubmit(workLog: string) {
    if (!session) return;
    const loggedSeconds = frozenSeconds;
    finish.mutate(
      { id: session.id, body: { work_log: workLog } },
      {
        onSuccess: (finished) => {
          setSheetOpen(false);
          // Hand the moment to the choreographed finale: it counts the score up
          // on an S-curve, ticks in the streak, lets the buddy react (peak-end),
          // then fires confetti + haptic. Replaces the old flat celebrate+toast.
          setFinale({
            score: typeof finished.ai_score === "number" ? finished.ai_score : null,
            streak: buddy?.current_streak ?? 0,
            durationLabel: formatDuration(loggedSeconds),
          });
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            toast.message("That session was already wrapped up", {
              description: "Nothing more to finish here.",
            });
            setSheetOpen(false);
          } else {
            toast.error(err instanceof Error ? err.message : "Couldn't finish the session.");
          }
        },
      }
    );
  }

  // ---- Render ------------------------------------------------------------
  const stateLabel = isActive ? "Locked in" : isPaused ? "Paused" : "Ready";

  return (
    <>
      <div className="relative flex h-full flex-col">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <StatusDot state={status} />
            <span className="text-[11px] font-medium uppercase tracking-eyebrow text-teal-bright">
              {isActive ? "Currently locked in" : isPaused ? "Session paused" : "Focus session"}
            </span>
          </div>
          {(isActive || isPaused) && (
            <span className="rounded-full bg-surface-3/70 px-2.5 py-1 font-mono text-[11px] tabular text-ink-muted ring-1 ring-inset ring-hairline/10">
              {(session?.pause_count ?? 0) > 0
                ? `${session?.pause_count} ${session?.pause_count === 1 ? "pause" : "pauses"}`
                : stateLabel}
            </span>
          )}
        </div>

        {/* Timer body: ring + digits */}
        <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-7 py-6 sm:flex-row sm:gap-10 sm:py-8">
          <ProgressRing
            progress={ringProgress}
            active={isActive}
            paused={isPaused}
            reduce={!!reduce}
          />

          <div className="flex flex-col items-center sm:items-start">
            {isLoading ? (
              <div className="h-12 w-56 animate-pulse rounded-xl bg-surface-2/80" />
            ) : (
              <motion.div
                key={status ?? "idle"}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE_SMOOTH }}
                className="font-mono text-5xl font-semibold tabular leading-none tracking-tight text-ink sm:text-6xl"
                aria-live="off"
              >
                {formatClock(displaySeconds)}
              </motion.div>
            )}
            <p className="mt-3 max-w-[16rem] text-center text-sm leading-relaxed text-ink-muted sm:text-left">
              {isActive
                ? "Deep work in progress. Pause if life happens, finish when you're done."
                : isPaused
                  ? "Banked and waiting. Pick up right where you left off."
                  : "Ready to lock in. One tap starts the clock — no setup, no categories."}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          {!session && (
            <Button
              size="lg"
              variant="primary"
              leadingIcon={Play}
              onClick={handleStart}
              disabled={busy || isLoading}
            >
              {start.isPending ? "Starting…" : "Start focus"}
            </Button>
          )}

          {isActive && (
            <>
              <Button
                size="lg"
                variant="secondary"
                leadingIcon={Pause}
                onClick={handlePause}
                disabled={busy}
              >
                {pause.isPending ? "Pausing…" : "Pause"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                leadingIcon={Flag}
                onClick={openFinish}
                disabled={busy}
              >
                Finish
              </Button>
            </>
          )}

          {isPaused && (
            <>
              <Button
                size="lg"
                variant="primary"
                leadingIcon={ArrowClockwise}
                onClick={handleResume}
                disabled={busy}
              >
                {resume.isPending ? "Resuming…" : "Resume"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                leadingIcon={Flag}
                onClick={openFinish}
                disabled={busy}
              >
                Finish
              </Button>
            </>
          )}
        </div>

        {/* Discard — de-emphasised escape hatch for an accidental start. */}
        {(isActive || isPaused) && (
          <div className="mt-4 flex justify-center sm:justify-start">
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-ink-faint transition-colors duration-200 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 disabled:opacity-50"
            >
              <Trash weight="bold" className="h-3.5 w-3.5" />
              Discard session
            </button>
          </div>
        )}
      </div>

      <WorkLogSheet
        open={sheetOpen}
        elapsedSeconds={frozenSeconds}
        submitting={finish.isPending}
        onCancel={() => {
          if (!finish.isPending) setSheetOpen(false);
        }}
        onSubmit={handleFinishSubmit}
      />

      <CancelSessionDialog
        open={cancelOpen}
        elapsedSeconds={displaySeconds}
        discarding={cancel.isPending}
        onClose={() => {
          if (!cancel.isPending) setCancelOpen(false);
        }}
        onConfirm={handleCancelConfirm}
      />

      <AnimatePresence>
        {finale && (
          <SessionFinale
            score={finale.score}
            streak={finale.streak}
            durationLabel={finale.durationLabel}
            onSpeak={buddySpeak}
            onClose={closeFinale}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ---- Status dot ---------------------------------------------------------- */
function StatusDot({ state }: { state?: string }) {
  if (state === "active") {
    return (
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-pulse-soft rounded-full bg-teal-bright" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-bright" />
      </span>
    );
  }
  return (
    <span
      className={
        "h-2 w-2 rounded-full " + (state === "paused" ? "bg-warning/80" : "bg-ink-faint/60")
      }
    />
  );
}

/* ---- Progress ring ------------------------------------------------------- */
function ProgressRing({
  progress,
  active,
  paused,
  reduce,
}: {
  progress: number;
  active: boolean;
  paused: boolean;
  reduce: boolean;
}) {
  const size = 168;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * progress;

  const ring = active ? "rgb(var(--teal-bright))" : paused ? "rgb(var(--warning))" : "rgb(var(--teal-deep))";

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative -rotate-90"
        aria-hidden
      >
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--surface-3))"
          strokeWidth={stroke}
        />
        {/* progress sweep */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          animate={{ strokeDashoffset: circ - dash }}
          transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE_SMOOTH }}
        />
      </svg>
      {/* center icon */}
      <div className="absolute grid place-items-center">
        <span
          className={
            "grid h-14 w-14 place-items-center rounded-full ring-1 ring-inset " +
            (active
              ? "bg-teal/12 text-teal-bright ring-teal/25"
              : paused
                ? "bg-warning/10 text-warning ring-warning/20"
                : "bg-surface-3/70 text-ink-muted ring-hairline/10")
          }
        >
          {paused ? (
            <Pause weight="fill" className="h-6 w-6" />
          ) : (
            <Play weight="fill" className="h-6 w-6 translate-x-0.5" />
          )}
        </span>
      </div>
    </div>
  );
}
