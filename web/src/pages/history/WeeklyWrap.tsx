/* =====================================================================
   WeeklyWrap — a Spotify-Wrapped-style recap of the last 7 days, computed
   entirely from session history (no backend, no LLM cost). Focus time, sessions,
   active days, best score, a week-over-week trend, and a short line "spoken" by
   the buddy. Lives at the top of History.
   ===================================================================== */
import { useMemo } from "react";
import { Sparkle, Clock, Lightning, CalendarCheck, Trophy } from "@phosphor-icons/react";
import { getBuddyAvatar } from "@/lib/buddy";
import { localKey } from "./dates";
import type { BuddyResponse, SessionResponse } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

function fmtDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

// Local-day key (matches the heatmap's day attribution, not UTC).
function dayKey(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : localKey(d);
}

interface WeekAgg {
  seconds: number;
  count: number;
  days: Set<string>;
  bestScore: number | null;
}

function aggregate(sessions: SessionResponse[], from: number, to: number): WeekAgg {
  const agg: WeekAgg = { seconds: 0, count: 0, days: new Set(), bestScore: null };
  for (const s of sessions) {
    const t = new Date(s.finished_at || s.started_at).getTime();
    if (Number.isNaN(t) || t < from || t >= to) continue;
    agg.seconds += s.total_seconds || 0;
    agg.count += 1;
    const k = dayKey(s.finished_at || s.started_at);
    if (k) agg.days.add(k);
    if (s.ai_score != null) agg.bestScore = Math.max(agg.bestScore ?? 0, s.ai_score);
  }
  return agg;
}

export interface WeeklyWrapProps {
  sessions: SessionResponse[];
  buddy?: BuddyResponse;
}

export function WeeklyWrap({ sessions, buddy }: WeeklyWrapProps) {
  const { week, deltaPct } = useMemo(() => {
    const now = Date.now();
    // Symmetric 7-day rolling windows; `now` is the exclusive upper bound so the
    // current week can't be 8 days wide (which caused "8/7" + a biased trend).
    const w = aggregate(sessions, now - 7 * DAY, now);
    const prev = aggregate(sessions, now - 14 * DAY, now - 7 * DAY);
    const delta =
      prev.seconds > 0 ? Math.round(((w.seconds - prev.seconds) / prev.seconds) * 100) : null;
    return { week: w, deltaPct: delta };
  }, [sessions]);

  const buddyName = buddy?.buddy_name || "Your buddy";
  const hours = fmtDuration(week.seconds);

  const headline =
    week.count === 0
      ? "A quiet week — I've been waiting. One session restarts us."
      : (() => {
          const base = `${hours} of focus across ${week.count} ${week.count === 1 ? "session" : "sessions"}.`;
          const trend =
            deltaPct != null && deltaPct >= 15
              ? " Up from last week — keep climbing!"
              : deltaPct != null && deltaPct <= -15
                ? " A lighter week — let's bounce back."
                : " Right on track.";
          return base + trend;
        })();

  return (
    <div className="rounded-squircle bg-teal/[0.05] p-1.5 ring-1 ring-inset ring-teal/[0.16] shadow-card">
      <div className="rounded-[calc(2rem-0.375rem)] bg-surface-2/85 p-6 shadow-inset-top sm:p-7">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal/10 text-teal-bright ring-1 ring-inset ring-teal/15">
            <Sparkle weight="duotone" className="h-[18px] w-[18px]" />
          </span>
          <span className="text-[11px] font-medium uppercase tracking-eyebrow text-ink-muted">
            This week's wrap
          </span>
          {deltaPct != null && week.count > 0 && (
            <span
              className={
                "ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold tabular " +
                (deltaPct >= 0 ? "bg-teal/15 text-teal-bright" : "bg-surface-3/70 text-ink-muted")
              }
            >
              {deltaPct >= 0 ? "+" : ""}
              {deltaPct}% vs last week
            </span>
          )}
        </div>

        {/* Buddy-voiced headline */}
        <div className="mt-5 flex items-center gap-4">
          {buddy && (
            <img
              src={getBuddyAvatar(buddy.buddy_type, buddy.mood_level)}
              alt={buddyName}
              className="h-14 w-14 shrink-0 select-none object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.4)]"
              draggable={false}
            />
          )}
          <p className="text-pretty text-[15px] leading-relaxed text-ink">
            <span className="font-medium text-teal-bright">{buddyName}:</span> {headline}
          </p>
        </div>

        {/* Stat tiles */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <WrapStat icon={Clock} label="Focus time" value={hours} />
          <WrapStat icon={Lightning} label="Sessions" value={String(week.count)} />
          <WrapStat icon={CalendarCheck} label="Active days" value={`${Math.min(7, week.days.size)}/7`} />
          <WrapStat
            icon={Trophy}
            label="Best score"
            value={week.bestScore != null ? String(week.bestScore) : "—"}
          />
        </div>
      </div>
    </div>
  );
}

function WrapStat({
  icon: IconCmp,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-surface-3/30 px-4 py-3.5 ring-1 ring-inset ring-hairline/[0.07]">
      <IconCmp weight="duotone" className="h-4 w-4 text-teal-bright" />
      <p className="mt-2 font-mono text-2xl font-semibold tabular leading-none text-ink">{value}</p>
      <p className="mt-1.5 text-[11px] text-ink-faint">{label}</p>
    </div>
  );
}
