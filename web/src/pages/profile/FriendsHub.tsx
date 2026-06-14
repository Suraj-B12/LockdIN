/* =====================================================================
   FriendsHub — the tabbed friends area: Friends | Requests | Sent.
   The active tab is a shared-layout pill that springs between tabs
   (framer-motion layoutId), reusing the leaderboard PeriodTabs pattern.
   The Requests tab carries a live count badge so incoming requests get
   noticed. Each panel is self-contained (its own loading / empty / error):
     • Friends   accepted list (FriendsList) — invite-code nudge when empty
     • Requests  incoming (RequestsCard) — Accept / Decline
     • Sent      outgoing pending (SentCard) — Pending badge + Cancel
   Crisp and de-glowed; honors reduced motion at the call site.
   ===================================================================== */
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PaperPlaneTilt, UserPlus, UsersThree, type Icon } from "@phosphor-icons/react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { SPRING_SNAPPY, EASE_OUT } from "@/lib/motion";
import { usePendingFriends, useSentRequests } from "@/lib/queries";
import { FriendsList } from "./FriendsList";
import { RequestsCard } from "./RequestsCard";
import { SentCard } from "./SentCard";

type TabKey = "friends" | "requests" | "sent";

const TABS: { key: TabKey; label: string; icon: Icon }[] = [
  { key: "friends", label: "Friends", icon: UsersThree },
  { key: "requests", label: "Requests", icon: UserPlus },
  { key: "sent", label: "Sent", icon: PaperPlaneTilt },
];

interface FriendsHubProps {
  /** Current user's profile id — resolves the friend side for nudges. */
  selfId: string;
  /** Invite code surfaced in the Friends empty state. */
  inviteCode: string | undefined;
}

export function FriendsHub({ selfId, inviteCode }: FriendsHubProps) {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<TabKey>("friends");

  // Drives the count badge on the Requests tab (and a subtle one on Sent).
  const { data: pending } = usePendingFriends();
  const { data: sent } = useSentRequests();
  const incomingCount = pending?.length ?? 0;
  const sentCount = sent?.length ?? 0;

  return (
    <Card bodyClassName="p-6 sm:p-7">
      {/* Tab bar — animated active pill shared across tabs. */}
      <div
        role="tablist"
        aria-label="Friends and requests"
        className="inline-flex items-center gap-1 rounded-full border border-hairline/[0.08] bg-surface/60 p-1 shadow-inset-top"
      >
        {TABS.map((t) => {
          const active = t.key === tab;
          const Ico = t.icon;
          const count = t.key === "requests" ? incomingCount : t.key === "sent" ? sentCount : 0;
          const showCount = count > 0;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors duration-200 sm:px-4",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-bright/70",
                active ? "text-canvas" : "text-ink-muted hover:text-ink"
              )}
            >
              {active && (
                <motion.span
                  layoutId="friends-hub-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-teal shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset]"
                  transition={reduce ? { duration: 0 } : SPRING_SNAPPY}
                />
              )}
              <Ico weight={active ? "fill" : "regular"} className="h-4 w-4 shrink-0" aria-hidden />
              <span className="whitespace-nowrap">{t.label}</span>
              {showCount && (
                <span
                  className={cn(
                    "ml-0.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full px-1 text-[11px] font-semibold leading-none tabular",
                    active
                      ? "bg-canvas/20 text-canvas"
                      : t.key === "requests"
                        ? "bg-teal/15 text-teal-bright ring-1 ring-inset ring-teal/25"
                        : "bg-surface-2 text-ink-soft ring-1 ring-inset ring-hairline/10"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active panel — crossfades on switch. */}
      <div className="mt-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
          >
            {tab === "friends" && <FriendsList selfId={selfId} inviteCode={inviteCode} />}
            {tab === "requests" && <RequestsCard />}
            {tab === "sent" && <SentCard />}
          </motion.div>
        </AnimatePresence>
      </div>
    </Card>
  );
}
