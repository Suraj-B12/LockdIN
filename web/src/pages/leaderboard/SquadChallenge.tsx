/* =====================================================================
   SquadChallenge — a friends-only cooperative weekly goal. Everyone's focus
   time this week adds to ONE shared bar (co-op, not competition). Derived from
   the weekly leaderboard — no new tables. The shared goal scales with the squad
   so it stays motivating, and crossing it triggers a celebratory state.
   ===================================================================== */
import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Target, Confetti } from "@phosphor-icons/react";
import { Avatar, Card } from "@/components/ui";
import { useLeaderboard } from "@/lib/queries";
import { EASE_SMOOTH } from "@/lib/motion";

const HOUR = 3600;

function fmtH(seconds: number): string {
  const h = seconds / HOUR;
  if (h >= 10) return `${Math.round(h)}h`;
  if (h >= 1) return `${h.toFixed(1).replace(/\.0$/, "")}h`;
  return `${Math.round(seconds / 60)}m`;
}

export function SquadChallenge() {
  const reduce = useReducedMotion();
  const { data, isLoading } = useLeaderboard("weekly");

  const model = useMemo(() => {
    const entries = data?.entries ?? [];
    const members = entries.length;
    const combined = entries.reduce((acc, e) => acc + (e.total_seconds || 0), 0);
    // Each member pulling ~5h/week reaches the goal; min one member's worth.
    const goal = Math.max(1, members) * 5 * HOUR;
    const pct = goal > 0 ? Math.min(1, combined / goal) : 0;
    const reached = combined >= goal && combined > 0;
    const top = [...entries]
      .sort((a, b) => (b.total_seconds || 0) - (a.total_seconds || 0))
      .slice(0, 3);
    return { members, combined, goal, pct, reached, top, solo: members <= 1 };
  }, [data]);

  // Nothing to rally around yet (no weekly activity) — stay out of the way.
  if (isLoading || model.members === 0 || model.combined === 0) return null;

  return (
    <Card tone="teal" bodyClassName="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal/12 text-teal-bright ring-1 ring-inset ring-teal/20">
            {model.reached ? (
              <Confetti weight="fill" className="h-[18px] w-[18px]" />
            ) : (
              <Target weight="duotone" className="h-[18px] w-[18px]" />
            )}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-eyebrow text-teal-bright">
            {model.solo ? "Your weekly goal" : "Squad goal · this week"}
          </span>
        </div>
        <span className="font-mono text-xs text-ink-faint tabular">
          {fmtH(model.combined)} / {fmtH(model.goal)}
        </span>
      </div>

      <p className="mt-3 text-pretty text-sm leading-relaxed text-ink-soft">
        {model.reached
          ? model.solo
            ? "Goal smashed — you outdid your week. Keep the fire going."
            : "Goal smashed! Your squad crushed it together this week. 🎉"
          : model.solo
            ? "Stack focus hours toward your weekly goal."
            : "Every session your friends log fills the same bar. Pull together."}
      </p>

      {/* Shared progress bar */}
      <div className="mt-4">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-3/70">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-teal-deep via-teal to-teal-bright"
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${Math.round(model.pct * 100)}%` }}
            transition={{ duration: 0.7, ease: EASE_SMOOTH }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] tabular text-ink-faint">
          <span>{Math.round(model.pct * 100)}%</span>
          {!model.solo && (
            <span>
              {model.members} {model.members === 1 ? "member" : "members"}
            </span>
          )}
        </div>
      </div>

      {/* Top contributors */}
      {!model.solo && model.top.length > 0 && (
        <div className="mt-4 flex items-center gap-3 border-t border-hairline/[0.07] pt-4">
          <span className="text-[11px] uppercase tracking-eyebrow text-ink-faint">Leading</span>
          <div className="flex items-center gap-2">
            {model.top.map((e) => (
              <div key={e.user_id} className="flex items-center gap-1.5">
                <Avatar src={e.avatar_url} alt={e.display_name} fallback={e.display_name} size="xs" />
                <span className="font-mono text-[11px] text-ink-muted tabular">
                  {fmtH(e.total_seconds)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
