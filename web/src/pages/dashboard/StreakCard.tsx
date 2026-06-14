/* =====================================================================
   StreakCard — current + longest streak (from the buddy), a 7-day mini bar
   visual built from real session history (minutes focused per weekday, this
   week, Mon→Sun), and lifetime totals (sessions + hours) derived from history.
   ===================================================================== */
import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flame } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui";
import type { BuddyResponse, SessionResponse } from "@/lib/types";
import { EASE_SMOOTH } from "@/lib/motion";
import { CardHead, Stat } from "./parts";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/** Minutes focused per weekday (Mon=0..Sun=6) for the current week. */
function weeklyMinutes(sessions: SessionResponse[]): number[] {
  const mins = [0, 0, 0, 0, 0, 0, 0];
  const today = new Date();
  const todayIdx = (today.getDay() + 6) % 7; // Mon=0
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - todayIdx);
  weekStart.setHours(0, 0, 0, 0);

  for (const s of sessions) {
    const d = new Date(s.finished_at || s.started_at);
    if (Number.isNaN(d.getTime()) || d < weekStart) continue;
    const idx = (d.getDay() + 6) % 7;
    mins[idx] += Math.round((s.total_seconds || 0) / 60);
  }
  return mins;
}

export interface StreakCardProps {
  buddy?: BuddyResponse;
  buddyLoading: boolean;
  sessions: SessionResponse[];
  sessionsLoading: boolean;
}

export function StreakCard({ buddy, buddyLoading, sessions, sessionsLoading }: StreakCardProps) {
  const reduce = useReducedMotion();

  const minutes = useMemo(() => weeklyMinutes(sessions), [sessions]);
  const maxMin = Math.max(...minutes, 1);
  const todayIdx = (new Date().getDay() + 6) % 7;

  const totalSessions = sessions.length;
  const totalHours = useMemo(
    () => Math.round(sessions.reduce((acc, s) => acc + (s.total_seconds || 0), 0) / 3600),
    [sessions]
  );

  const current = buddy?.current_streak ?? 0;
  const longest = buddy?.longest_streak ?? 0;

  const subtitle =
    current === 0
      ? "Finish a session to start your streak."
      : current === 1
        ? "Day one — keep it going."
        : `${current} days strong.`;

  return (
    <div className="flex h-full flex-col">
      <CardHead icon={Flame} label="Streak" />

      {/* Big number */}
      <div className="mt-4 flex items-end gap-2.5">
        {buddyLoading ? (
          <Skeleton className="h-12 w-24" />
        ) : (
          <>
            <Flame weight="fill" className="mb-1 h-7 w-7 text-warning" />
            <span className="font-mono text-5xl font-semibold tabular leading-none text-ink">
              {current}
            </span>
            <span className="mb-1 text-sm text-ink-muted">
              {current === 1 ? "day" : "days"}
            </span>
          </>
        )}
      </div>
      <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>

      {/* 7-day mini bars */}
      <div className="mt-6">
        <div className="flex items-end gap-2">
          {minutes.map((m, i) => {
            const filled = m > 0;
            const heightPct = filled ? Math.max(12, (m / maxMin) * 100) : 6;
            const isToday = i === todayIdx;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-20 w-full items-end overflow-hidden rounded-md bg-surface-3/50">
                  {sessionsLoading ? (
                    <div className="w-full animate-pulse rounded-md bg-surface-2" style={{ height: "40%" }} />
                  ) : (
                    <motion.div
                      className={
                        "w-full rounded-md " +
                        (filled
                          ? "bg-gradient-to-t from-teal-deep to-teal"
                          : "bg-hairline/[0.1]") +
                        (isToday && filled ? " ring-1 ring-inset ring-teal-bright/40" : "")
                      }
                      initial={reduce ? false : { height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.6, ease: EASE_SMOOTH, delay: reduce ? 0 : i * 0.04 }}
                      title={filled ? `${m} min` : "No focus"}
                    />
                  )}
                </div>
                <span
                  className={
                    "font-mono text-[10px] tabular " +
                    (isToday ? "text-teal-bright" : "text-ink-faint")
                  }
                >
                  {DAY_LABELS[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Totals */}
      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-hairline/[0.07] pt-5">
        <Stat
          value={buddyLoading ? "—" : longest}
          label="Longest"
          valueClassName="text-xl"
        />
        <Stat
          value={sessionsLoading ? "—" : totalSessions}
          label="Sessions"
          valueClassName="text-xl"
        />
        <Stat
          value={sessionsLoading ? "—" : `${totalHours}h`}
          label="Focused"
          valueClassName="text-xl"
        />
      </div>
    </div>
  );
}
