/* =====================================================================
   DailyRing — a single closable daily focus goal. A more FREQUENT win than the
   streak (Gestalt closure: an open ring pulls you to close it), with three
   reachable tiers so casual and heavy users both get a target. Closing it fires
   the existing celebrate() once per day. Pure client-side: today's focus is
   summed from history already in memory; the goal lives in localStorage.
   ===================================================================== */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Target, CheckCircle } from "@phosphor-icons/react";
import type { SessionResponse } from "@/lib/types";
import { celebrate, buzz } from "@/lib/celebrate";
import { EASE_SMOOTH } from "@/lib/motion";

const GOAL_KEY = "lockdin:dailyGoalMin";
const TIERS = [30, 60, 90];
const DEFAULT_GOAL = 60;

function todayKey(): string {
  return new Date().toDateString();
}
function getGoal(): number {
  try {
    const v = parseInt(localStorage.getItem(GOAL_KEY) || "", 10);
    return TIERS.includes(v) ? v : DEFAULT_GOAL;
  } catch {
    return DEFAULT_GOAL;
  }
}

export function DailyRing({ sessions }: { sessions: SessionResponse[] }) {
  const reduce = useReducedMotion();
  const [goalMin, setGoalMin] = useState<number>(() => getGoal());

  const focusedMin = useMemo(() => {
    const today = todayKey();
    let secs = 0;
    for (const s of sessions) {
      const when = s.finished_at || s.started_at;
      if (!when) continue;
      const d = new Date(when);
      if (!Number.isNaN(d.getTime()) && d.toDateString() === today) secs += s.total_seconds || 0;
    }
    return Math.round(secs / 60);
  }, [sessions]);

  const pct = Math.min(1, goalMin > 0 ? focusedMin / goalMin : 0);
  const done = focusedMin >= goalMin && focusedMin > 0;

  // Celebrate crossing the goal once per day.
  const celebratedRef = useRef(false);
  useEffect(() => {
    if (!done) return;
    // Day-scoped (not goal-scoped) so lowering the tier after finishing doesn't
    // re-fire the celebration — the day's first completion is the one win.
    const key = `lockdin:dailyDone:${todayKey()}`;
    let already = false;
    try {
      already = localStorage.getItem(key) === "1";
    } catch {
      /* ignore */
    }
    if (!already && !celebratedRef.current) {
      celebratedRef.current = true;
      try {
        localStorage.setItem(key, "1");
      } catch {
        /* ignore */
      }
      celebrate();
    }
  }, [done, goalMin]);

  const setGoal = (m: number) => {
    setGoalMin(m);
    try {
      localStorage.setItem(GOAL_KEY, String(m));
    } catch {
      /* ignore */
    }
    buzz(10);
  };

  // Ring geometry.
  const size = 64;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div className="rounded-squircle bg-hairline/[0.03] p-1.5 ring-1 ring-inset ring-hairline/[0.07] shadow-card">
      <div className="flex flex-wrap items-center gap-4 rounded-[calc(2rem-0.375rem)] bg-surface/80 px-5 py-4 shadow-inset-top sm:gap-5">
        {/* Ring */}
        <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--surface-3))" strokeWidth={stroke} />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={done ? "rgb(var(--teal-bright))" : "rgb(var(--teal))"}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              initial={reduce ? false : { strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ - circ * pct }}
              transition={{ duration: 0.7, ease: EASE_SMOOTH }}
            />
          </svg>
          <span className="absolute grid place-items-center text-teal-bright">
            {done ? (
              <CheckCircle weight="fill" className="h-6 w-6" />
            ) : (
              <Target weight="duotone" className="h-5 w-5" />
            )}
          </span>
        </div>

        {/* Copy */}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-eyebrow text-teal-bright">
            Today's lock-in goal
          </p>
          <p className="mt-0.5 text-sm text-ink">
            {done ? (
              <span className="font-medium">Goal complete — {focusedMin} min focused. 🎉</span>
            ) : (
              <>
                <span className="font-mono font-semibold tabular text-ink">{focusedMin}</span>
                <span className="text-ink-muted"> / {goalMin} min focused</span>
              </>
            )}
          </p>
        </div>

        {/* Tier picker */}
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-surface-2/60 p-1 ring-1 ring-inset ring-hairline/10">
          {TIERS.map((m) => {
            const active = m === goalMin;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setGoal(m)}
                aria-pressed={active}
                className={
                  "rounded-full px-2.5 py-1 text-xs font-medium tabular transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55 " +
                  (active ? "bg-teal text-canvas" : "text-ink-muted hover:text-ink")
                }
              >
                {m}m
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
