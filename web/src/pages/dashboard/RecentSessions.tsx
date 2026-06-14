/* =====================================================================
   RecentSessions — the latest finished sessions as compact rows: relative day,
   duration, a truncated work-log, and the score pip. "View all" jumps to the
   full history. Empty state invites the first session.
   ===================================================================== */
import { ClockCounterClockwise } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui";
import type { SessionResponse } from "@/lib/types";
import { CardHead } from "./parts";
import { relativeDay, formatDuration, scoreToneClass } from "./utils";

export interface RecentSessionsProps {
  sessions: SessionResponse[];
  loading: boolean;
}

export function RecentSessions({ sessions, loading }: RecentSessionsProps) {
  const rows = sessions.slice(0, 5);

  return (
    <div className="flex h-full flex-col">
      <CardHead
        icon={ClockCounterClockwise}
        label="Recent sessions"
        actionTo="/history"
        actionLabel="View all"
      />

      <div className="mt-4 flex-1">
        {loading ? (
          <ul className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl bg-surface-3/30 px-3 py-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton circle className="h-7 w-7" />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <div className="flex h-full min-h-[8rem] flex-col items-center justify-center gap-2 py-6 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-3/60 text-ink-muted">
              <ClockCounterClockwise weight="duotone" className="h-6 w-6" />
            </span>
            <p className="mt-1 text-sm font-medium text-ink">Your first session starts the story.</p>
            <p className="max-w-[18rem] text-xs leading-relaxed text-ink-muted">
              Hit start above, focus, and your finished sessions will show up right here.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {rows.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-3/40"
              >
                <span className="w-16 shrink-0 font-mono text-[12px] tabular text-ink-muted">
                  {relativeDay(s.finished_at || s.started_at)}
                </span>
                <span className="w-14 shrink-0 font-mono text-[12px] tabular text-ink-soft">
                  {formatDuration(s.total_seconds)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink-muted">
                  {s.work_log?.trim() || "No log added"}
                </span>
                {typeof s.ai_score === "number" ? (
                  <span
                    className={
                      "grid h-7 min-w-[1.75rem] shrink-0 place-items-center rounded-lg bg-surface-3/70 px-1.5 font-mono text-[12px] font-semibold tabular ring-1 ring-inset ring-hairline/10 " +
                      scoreToneClass(s.ai_score)
                    }
                  >
                    {s.ai_score}
                  </span>
                ) : (
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-3/40 font-mono text-[12px] text-ink-faint">
                    –
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
