/* =====================================================================
   StreakCard — current + best (longest) streak shown side by side at the top
   (from the buddy, recomputed live server-side so a missed day resets it), a
   7-day mini bar visual built from real session history (minutes focused per
   weekday, this week, Mon→Sun), and lifetime totals derived from history.
   ===================================================================== */
import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flame, Trophy, Snowflake, type Icon } from "@phosphor-icons/react";
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
  const freezes = buddy?.streak_freezes ?? null;
  // Best is at least the current run (a live streak is, by definition, a record
  // in progress) — guards against any momentary lag in the stored longest.
  const best = Math.max(longest, current);
  const weekMinutes = useMemo(() => minutes.reduce((a, m) => a + m, 0), [minutes]);

  const atRecord = current > 0 && current === best;
  const toBeat = best - current + 1; // days needed to set a new record
  const subtitle =
    current === 0
      ? "Finish a session to start your streak."
      : current === 1
        ? "Day one — keep it going."
        : atRecord
          ? "On your best run yet."
          : `${toBeat} ${toBeat === 1 ? "day" : "days"} to a new record.`;

  return (
    <div className="flex h-full flex-col">
      <CardHead icon={Flame} label="Streak" />

      {/* Current + Best, side by side — the two numbers that matter most. */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StreakStat
          icon={Flame}
          iconClassName="text-warning"
          label="Current"
          value={current}
          loading={buddyLoading}
          highlight
        />
        <StreakStat
          icon={Trophy}
          iconClassName="text-teal-bright"
          label="Best"
          value={best}
          loading={buddyLoading}
          tag={atRecord ? "Record" : undefined}
        />
      </div>
      <p className="mt-3 text-sm text-ink-muted">{subtitle}</p>

      {/* Streak freezes — a missed day won't break the run while you have these. */}
      {!buddyLoading && freezes != null && freezes > 0 && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-faint">
          <Snowflake weight="fill" className="h-3.5 w-3.5 text-teal-bright" />
          {freezes} streak {freezes === 1 ? "freeze" : "freezes"} — a missed day won't break your
          streak.
        </p>
      )}

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
          value={sessionsLoading ? "—" : totalSessions}
          label="Sessions"
          valueClassName="text-xl"
        />
        <Stat
          value={sessionsLoading ? "—" : `${totalHours}h`}
          label="Focused"
          valueClassName="text-xl"
        />
        <Stat
          value={sessionsLoading ? "—" : `${weekMinutes}m`}
          label="This week"
          valueClassName="text-xl"
        />
      </div>
    </div>
  );
}

/** One half of the current/best streak pair — icon + big number + "days". */
function StreakStat({
  icon: IconCmp,
  iconClassName,
  label,
  value,
  loading,
  highlight = false,
  tag,
}: {
  icon: Icon;
  iconClassName: string;
  label: string;
  value: number;
  loading: boolean;
  highlight?: boolean;
  /** Optional pill after the label (e.g. "Record" when current === best). */
  tag?: string;
}) {
  return (
    <div
      className={
        "rounded-2xl px-4 py-3.5 ring-1 ring-inset " +
        (highlight
          ? "bg-teal/[0.06] ring-teal/15"
          : "bg-surface-3/30 ring-hairline/[0.07]")
      }
    >
      <div className="flex items-center gap-1.5">
        <IconCmp weight="fill" className={"h-4 w-4 " + iconClassName} />
        <span className="text-[11px] font-medium uppercase tracking-eyebrow text-ink-faint">
          {label}
        </span>
        {tag && !loading && (
          <span className="ml-auto rounded-full bg-teal/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-teal-bright">
            {tag}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end gap-1.5">
        {loading ? (
          <Skeleton className="h-9 w-14" />
        ) : (
          <>
            <span className="font-mono text-4xl font-semibold tabular leading-none text-ink">
              {value}
            </span>
            <span className="mb-0.5 text-xs text-ink-muted">{value === 1 ? "day" : "days"}</span>
          </>
        )}
      </div>
    </div>
  );
}
