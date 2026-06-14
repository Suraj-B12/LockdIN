/* =====================================================================
   ScoreCard — today's AI score. Pulls the most recent finished session dated
   today out of history, shows the score big, the one-line ai_summary, and a
   legible factor breakdown (duration / work-log / specificity) so the number is
   explainable. Empty state nudges the user to start a session.
   ===================================================================== */
import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkle, Quotes } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui";
import type { SessionResponse } from "@/lib/types";
import { EASE_SMOOTH } from "@/lib/motion";
import { CardHead } from "./parts";
import { isToday, scoreBreakdown, scoreToneClass } from "./utils";

/** Most recent finished session from today that carries a score. */
function todaysScored(sessions: SessionResponse[]): SessionResponse | undefined {
  return sessions.find(
    (s) => typeof s.ai_score === "number" && isToday(s.finished_at)
  );
}

const FACTORS: { key: keyof ReturnType<typeof scoreBreakdown>; label: string; max: number }[] = [
  { key: "duration_points", label: "Duration", max: 40 },
  { key: "worklog_points", label: "Detail", max: 40 },
  { key: "specificity_points", label: "Specificity", max: 20 },
];

export interface ScoreCardProps {
  sessions: SessionResponse[];
  loading: boolean;
}

export function ScoreCard({ sessions, loading }: ScoreCardProps) {
  const reduce = useReducedMotion();
  const session = useMemo(() => todaysScored(sessions), [sessions]);
  const score = session?.ai_score ?? null;
  const breakdown = session ? scoreBreakdown(session) : null;

  return (
    <div className="flex h-full flex-col">
      <CardHead icon={Sparkle} label="Today's score" />

      {loading ? (
        <div className="mt-5 flex-1">
          <Skeleton className="h-14 w-28" />
          <Skeleton className="mt-4 h-4 w-full" />
          <div className="mt-6 space-y-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ) : session && typeof score === "number" && breakdown ? (
        <>
          {/* Big score */}
          <div className="mt-4 flex items-end gap-2">
            <motion.span
              key={score}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE_SMOOTH }}
              className={`font-mono text-6xl font-semibold tabular leading-none ${scoreToneClass(score)}`}
            >
              {score}
            </motion.span>
            <span className="mb-1.5 font-mono text-sm tabular text-ink-faint">/100</span>
          </div>

          {/* Summary */}
          {session.ai_summary && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-surface-3/40 p-3">
              <Quotes weight="fill" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal/60" />
              <p className="text-[13px] leading-relaxed text-ink-soft">{session.ai_summary}</p>
            </div>
          )}

          {/* Breakdown */}
          <div className="mt-5 space-y-3 border-t border-hairline/[0.07] pt-5">
            <p className="text-[11px] font-medium uppercase tracking-eyebrow text-ink-faint">
              How it adds up
            </p>
            {FACTORS.map((f, i) => {
              const pts = breakdown[f.key];
              return (
                <div key={f.key} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs text-ink-muted">{f.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3/70">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-teal-deep to-teal"
                      initial={reduce ? false : { width: 0 }}
                      animate={{ width: `${(pts / f.max) * 100}%` }}
                      transition={{ duration: 0.55, ease: EASE_SMOOTH, delay: reduce ? 0 : 0.1 + i * 0.07 }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right font-mono text-xs tabular text-ink-soft">
                    {pts}/{f.max}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        // Empty — no scored session today.
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal/8 text-teal-bright/70 ring-1 ring-inset ring-teal/12">
            <Sparkle weight="duotone" className="h-6 w-6" />
          </span>
          <p className="mt-2 text-sm font-medium text-ink">No score yet today</p>
          <p className="max-w-[15rem] text-xs leading-relaxed text-ink-muted">
            Start a session and log it — your AI score lands here.
          </p>
        </div>
      )}
    </div>
  );
}
