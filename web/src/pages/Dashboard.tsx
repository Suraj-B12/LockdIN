/* =====================================================================
   Dashboard — the core screen. A bento of: the focus TIMER (hero), your BUDDY,
   your STREAK, today's SCORE, RECENT sessions, and a friend LEADERBOARD preview.
   Renders inside AppLayout (nav + top padding provided). History is fetched once
   here (limit 20) and shared into the streak / score / recent cards so the
   weekly bars and lifetime totals are accurate without refetching.
   ===================================================================== */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui";
import { RecapInbox } from "@/components/RecapInbox";
import { MilestoneModal } from "@/components/MilestoneModal";
import {
  useProfile,
  useHistory,
  useBuddy,
  useFriendsActivity,
  useMyReactions,
  useActiveSession,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import {
  getRecapLastSeen,
  setRecapLastSeen,
  recapShownThisSession,
  markRecapShownThisSession,
  defaultSince,
  awayLongEnough,
  getReactionCelebrated,
  setReactionCelebrated,
} from "@/lib/recap";
import { REACTION_GLYPH } from "@/lib/reactions";
import { milestoneReached, getLastCelebrated, setLastCelebrated } from "@/lib/milestones";
import { celebrate, celebrateReactions } from "@/lib/celebrate";
import { revealStagger, revealItem } from "@/lib/motion";
// NOTE: import the subcomponents by their explicit file paths. The folder
// `pages/dashboard/` and this file `pages/Dashboard.tsx` differ only in case,
// so a bare `./dashboard` specifier is ambiguous on case-insensitive systems.
import { TimerCard } from "./dashboard/TimerCard";
import { DailyRing } from "./dashboard/DailyRing";
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

  // ---- "While you were gone" recap (friends' activity + reactions on you) ----
  const userId = user?.id;
  // Capture the look-back window ONCE (last catch-up, or 7d for a first visit)
  // so it stays stable across re-renders and the query key doesn't churn.
  const [recapSince] = useState(
    () => (userId ? getRecapLastSeen(userId) : null) ?? defaultSince()
  );
  const { data: recap } = useFriendsActivity(recapSince, { enabled: !!userId });
  const { data: received } = useMyReactions(recapSince, { enabled: !!userId });
  const [recapOpen, setRecapOpen] = useState(false);

  // Never interrupt a focus session with the recap.
  const { data: activeSession } = useActiveSession();
  const sessionActive =
    activeSession?.status === "active" || activeSession?.status === "paused";

  // Re-evaluate the away-gate when the user returns to an already-open tab.
  const [visTick, setVisTick] = useState(0);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") setVisTick((n) => n + 1);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // ---- Streak milestone celebration (takes precedence over the recap) ----
  const [milestone, setMilestone] = useState<number | null>(null);
  const currentStreak = buddy?.current_streak ?? 0;

  useEffect(() => {
    if (!userId || !buddy) return;
    // The stored "last celebrated" is scoped to the CURRENT run: if the streak
    // reset (now below the stored floor), drop the floor so milestones can be
    // celebrated again on the next run — otherwise long-time users would stop
    // seeing celebrations entirely after one broken streak.
    if (currentStreak < getLastCelebrated(userId)) setLastCelebrated(userId, 0);
    const reached = milestoneReached(currentStreak);
    if (reached && reached > getLastCelebrated(userId)) {
      setMilestone(reached);
      setLastCelebrated(userId, reached);
      // A milestone owns the spotlight: suppress the recap this session.
      markRecapShownThisSession();
      setRecapOpen(false);
      celebrate();
    }
  }, [userId, buddy, currentStreak]);

  useEffect(() => {
    if (!userId) return;
    // First visit: establish the away-baseline so the 12h clock can start, and
    // don't pop the recap immediately for a brand-new user.
    if (!getRecapLastSeen(userId)) {
      setRecapLastSeen(userId, new Date().toISOString());
      return;
    }
    // Wait for the active-session state to actually resolve. `undefined` means the
    // /sessions/active request is still in flight — treating that as "no session"
    // would let the recap pop OVER a paused/active session if it resolves last.
    if (activeSession === undefined) return;
    // We can only open the modal once `recap` has loaded (the render + RecapInbox
    // require it). Gating here also prevents firing the celebration / advancing the
    // dedupe watermark before the inbox can actually show.
    if (!recap) return;
    // Gates: once per browser session, never over a milestone, never during a
    // focus session, and only after a long-enough absence (12h).
    if (recapShownThisSession() || milestone != null || sessionActive) return;
    if (!awayLongEnough(userId)) return;

    const hasReactions = !!received && received.length > 0;
    const friendsWorth =
      !!recap && recap.items.length > 0 && (recap.active_count > 0 || recap.idle_count > 0);
    if (!hasReactions && !friendsWorth) return;

    setRecapOpen(true);
    markRecapShownThisSession();
    // Mark this as the catch-up point even if they navigate away without closing.
    setRecapLastSeen(userId, new Date().toISOString());

    // Celebrate NEW reactions full-screen (emoji rain + distinct bell), deduped
    // by the newest reaction we've already celebrated.
    if (hasReactions && received) {
      const lastCel = getReactionCelebrated(userId);
      const fresh = received.filter((r) => !lastCel || r.created_at > lastCel);
      if (fresh.length > 0) {
        celebrateReactions(fresh.map((r) => REACTION_GLYPH[r.emoji]));
        setReactionCelebrated(userId, received[0].created_at); // server orders desc
      }
    }
  }, [userId, recap, received, milestone, activeSession, sessionActive, visTick]);

  // Defense-in-depth: if a focus session is (or becomes) active while the recap
  // is open, close it — the recap must never sit over a live session.
  useEffect(() => {
    if (sessionActive && recapOpen) setRecapOpen(false);
  }, [sessionActive, recapOpen]);

  const closeRecap = () => {
    setRecapOpen(false);
    if (userId) setRecapLastSeen(userId, new Date().toISOString());
  };

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

      {/* Today's closable focus goal — a frequent, reachable win. */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1], delay: reduce ? 0 : 0.06 }}
        className="mb-6"
      >
        <DailyRing sessions={sessions} />
      </motion.div>

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

      {/* Streak milestone celebration (takes precedence over the recap) */}
      <AnimatePresence>
        {milestone != null && buddy && (
          <MilestoneModal milestone={milestone} buddy={buddy} onClose={() => setMilestone(null)} />
        )}
      </AnimatePresence>

      {/* "While you were gone" recap — friends' activity + reactions on you */}
      <AnimatePresence>
        {recapOpen && recap && (
          <RecapInbox data={recap} reactions={received ?? []} onClose={closeRecap} />
        )}
      </AnimatePresence>
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
