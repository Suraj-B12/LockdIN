/* =====================================================================
   Features — an asymmetric bento (5-col zig-zag of 3/2 spans), NOT three
   equal columns. The streaks cell is the largest and carries a live mini
   7-day visual. Each cell lifts on hover and lights its hairline teal.
   ===================================================================== */
import {
  Flame,
  Trophy,
  Sparkle,
  Timer,
  UsersThree,
  ShareNetwork,
  type Icon,
} from "@phosphor-icons/react";
import { Section, SectionHeading, Reveal, RevealChild } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface CellProps {
  icon: Icon;
  title: string;
  desc: string;
  className?: string;
  children?: ReactNode;
}

function Cell({ icon: IconCmp, title, desc, className, children }: CellProps) {
  return (
    <RevealChild
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-squircle border border-hairline/[0.07] bg-surface/60 p-6 shadow-inset-top",
        "transition-[transform,border-color] duration-500 ease-smooth hover:-translate-y-1 hover:border-teal/25",
        className
      )}
    >
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal/10 text-teal-bright ring-1 ring-inset ring-teal/15 transition-colors duration-500 group-hover:bg-teal/[0.16]">
        <IconCmp weight="duotone" className="h-[22px] w-[22px]" />
      </span>
      <h3 className="mt-5 font-display text-xl tracking-tight text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{desc}</p>
      {children}
    </RevealChild>
  );
}

/** Mini 7-day streak visual for the large cell. */
function StreakBars() {
  const days = [40, 62, 30, 78, 95, 70, 100];
  return (
    <div className="mt-auto pt-8">
      <div className="flex items-end gap-2">
        {days.map((h, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-24 w-full items-end overflow-hidden rounded-md bg-surface-3/50">
              <div
                className={cn(
                  "w-full rounded-md",
                  i >= 4 ? "bg-gradient-to-t from-teal-deep to-teal" : "bg-hairline/[0.12]"
                )}
                style={{ height: `${h}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-ink-faint tabular">
              {["M", "T", "W", "T", "F", "S", "S"][i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Features() {
  return (
    <Section id="features" spacing="lg" className="scroll-mt-24">
      <SectionHeading
        title="Built around one honest loop."
        subtitle="Focus, log it, get scored, climb the board. The rest just makes showing up feel good."
      />

      <Reveal stagger className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Cell
          icon={Flame}
          title="Streaks that actually mean something"
          desc="Every focused day extends your streak and lifts your buddy's mood. Miss a day and you feel it. That's the point."
          className="sm:col-span-2 lg:col-span-3"
        >
          <StreakBars />
        </Cell>

        <Cell
          icon={Trophy}
          title="Friend leaderboards"
          desc="Daily, weekly, and all-time rankings among the people you actually know. Bragging rights included."
          className="lg:col-span-2"
        />

        <Cell
          icon={Sparkle}
          title="Honest AI summaries"
          desc="An AI reads your log and scores the session out of 100, with a one-line summary of what you got done."
          className="lg:col-span-2"
        />

        <Cell
          icon={UsersThree}
          title="See everyone's progress"
          desc="Open a friend's profile to watch their streak, their score, and the mood of their buddy in real time."
          className="lg:col-span-3"
        />

        <Cell
          icon={Timer}
          title="A timer, not a chore"
          desc="One tap to start, pause when life happens, finish when you're done. No setup, no categories."
          className="lg:col-span-3"
        />

        <Cell
          icon={ShareNetwork}
          title="Invite in one tap"
          desc="Share a code or email and your friend is on the board. Accountability works better with a crowd."
          className="lg:col-span-2"
        />
      </Reveal>
    </Section>
  );
}
