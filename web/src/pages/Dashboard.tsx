/* =====================================================================
   Dashboard — the core screen. A bento of: the focus TIMER (hero), your BUDDY,
   your STREAK, today's SCORE, RECENT sessions, and a friend LEADERBOARD preview.
   Renders inside AppLayout (nav + top padding provided). History is fetched once
   here (limit 20) and shared into the streak / score / recent cards so the
   weekly bars and lifetime totals are accurate without refetching.
   ===================================================================== */
import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui";
import { useProfile, useHistory, useBuddy } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { revealStagger, revealItem } from "@/lib/motion";
// NOTE: import the subcomponents by their explicit file paths. The folder
// `pages/dashboard/` and this file `pages/Dashboard.tsx` differ only in case,
// so a bare `./dashboard` specifier is ambiguous on case-insensitive systems.
import { TimerCard } from "./dashboard/TimerCard";
import { BuddyCard } from "./dashboard/BuddyCard";
import { StreakCard } from "./dashboard/StreakCard";
import { ScoreCard } from "./dashboard/ScoreCard";
import { RecentSessions } from "./dashboard/RecentSessions";
import { LeaderboardCard } from "./dashboard/LeaderboardCard";
import { firstNameOf, subgreeting } from "./dashboard/utils";

export function Dashboard() {
  const reduce = useReducedMotion();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  // Shared data: history (powers streak bars, totals, today's score, recents)
  // and buddy (powers the buddy card + streak numbers). Fetched once.
  const { data: history, isLoading: historyLoading } = useHistory(20);
  const { data: buddy, isLoading: buddyLoading } = useBuddy();

  const sessions = useMemo(() => history ?? [], [history]);

  // First name: profile.display_name → auth metadata → email local-part.
  const firstName = useMemo(() => {
    const metaName =
      (user?.user_metadata?.full_name as string | undefined) ??
      (user?.user_metadata?.name as string | undefined);
    const emailLocal = (profile?.email ?? user?.email)?.split("@")[0];
    return firstNameOf(profile?.display_name ?? metaName ?? emailLocal, "there");
  }, [profile?.display_name, profile?.email, user]);

  const sub = useMemo(() => subgreeting(), []);

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      {/* Greeting */}
      <motion.header
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="mb-8"
      >
        <h1 className="font-display text-3xl tracking-tightest text-ink sm:text-4xl">
          Hello, <span className="text-teal-bright">{firstName}</span>
        </h1>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">{sub}</p>
      </motion.header>

      {/* Bento grid */}
      <motion.div
        variants={reduce ? undefined : revealStagger}
        initial={reduce ? false : "hidden"}
        animate={reduce ? undefined : "show"}
        className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12"
      >
        {/* Row 1 — Timer hero (wide) + Buddy (tall) */}
        <Cell className="lg:col-span-8">
          <Card tone="teal" className="h-full" bodyClassName="p-6 sm:p-7">
            <TimerCard />
          </Card>
        </Cell>

        <Cell className="lg:col-span-4">
          <Card interactive className="h-full">
            <BuddyCard />
          </Card>
        </Cell>

        {/* Row 2 — Streak (wide) + Score */}
        <Cell className="lg:col-span-7">
          <Card className="h-full">
            <StreakCard
              buddy={buddy}
              buddyLoading={buddyLoading}
              sessions={sessions}
              sessionsLoading={historyLoading}
            />
          </Card>
        </Cell>

        <Cell className="lg:col-span-5">
          <Card className="h-full">
            <ScoreCard sessions={sessions} loading={historyLoading} />
          </Card>
        </Cell>

        {/* Row 3 — Recent sessions (wide) + Leaderboard preview */}
        <Cell className="lg:col-span-7">
          <Card className="h-full">
            <RecentSessions sessions={sessions} loading={historyLoading} />
          </Card>
        </Cell>

        <Cell className="lg:col-span-5">
          <Card interactive className="h-full">
            <LeaderboardCard />
          </Card>
        </Cell>
      </motion.div>
    </div>
  );
}

/** A reveal-staggered grid cell wrapper (collapses to a plain div w/ reduced motion). */
function Cell({ className, children }: { className?: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div variants={revealItem} className={className}>
      {children}
    </motion.div>
  );
}
