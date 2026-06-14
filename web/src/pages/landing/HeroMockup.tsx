/* =====================================================================
   HeroMockup — a REAL component preview of the LockdIN dashboard (not a fake
   foreign screenshot). Built from the actual design system: double-bezel shell,
   live-style timer, score + streak tiles, a mini friend leaderboard, and a real
   buddy avatar frame. The timer counts up so the hero actually breathes.
   ===================================================================== */
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flame, Fire } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui";
import { getBuddyAvatar, moodLabel } from "@/lib/buddy";
import { cn } from "@/lib/cn";

function fmt(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Realistic, non-round friend names + scores (avoids "John Doe" / round numbers).
const FRIENDS = [
  { rank: 1, name: "You", score: 87, you: true },
  { rank: 2, name: "Arjun", score: 82, you: false },
  { rank: 3, name: "Priya", score: 76, you: false },
];

export function HeroMockup() {
  const reduce = useReducedMotion();
  const [seconds, setSeconds] = useState(9257); // 02:34:17
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (reduce) return;
    let last = performance.now();
    const tick = (now: number) => {
      if (now - last >= 1000) {
        setSeconds((s) => s + 1);
        last = now;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [reduce]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 28, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1], delay: 0.15 }}
      className="relative w-full"
    >
      {/* Outer shell (double-bezel) */}
      <div className="rounded-squircle-xl border border-hairline/10 bg-hairline/[0.04] p-2 shadow-card backdrop-blur-sm">
        {/* Inner core */}
        <div className="overflow-hidden rounded-[calc(2.5rem-0.5rem)] bg-canvas-2/90 shadow-inset-top">
          {/* Window chrome */}
          <div className="flex items-center gap-2 border-b border-hairline/[0.06] px-5 py-3.5">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-ink-faint/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink-faint/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink-faint/40" />
            </span>
            <span className="ml-2 text-xs font-medium text-ink-faint">LockdIN dashboard</span>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-5">
            {/* Timer panel */}
            <div className="sm:col-span-3">
              <div className="flex h-full flex-col justify-between rounded-2xl bg-surface/70 p-5 ring-1 ring-inset ring-hairline/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-pulse-soft rounded-full bg-teal-bright" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-bright" />
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-eyebrow text-teal-bright">
                    Currently locked in
                  </span>
                </div>
                <div className="py-4">
                  <div className="font-mono text-4xl font-semibold tracking-tight text-ink tabular sm:text-5xl">
                    {fmt(seconds)}
                  </div>
                  <p className="mt-1.5 text-sm text-ink-muted">Deep work, data structures</p>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-teal to-teal-bright" />
                </div>
              </div>
            </div>

            {/* Score + streak + buddy column */}
            <div className="flex flex-col gap-4 sm:col-span-2">
              <div className="grid grid-cols-2 gap-4">
                <Tile>
                  <p className="text-[11px] text-ink-faint">Today's score</p>
                  <p className="mt-1 font-mono text-3xl font-semibold text-teal tabular">87</p>
                  <p className="text-[11px] text-ink-faint">out of 100</p>
                </Tile>
                <Tile>
                  <p className="text-[11px] text-ink-faint">Streak</p>
                  <p className="mt-1 flex items-center gap-1.5 font-mono text-3xl font-semibold text-ink tabular">
                    <Flame weight="fill" className="h-5 w-5 text-warning" />
                    14
                  </p>
                  <p className="text-[11px] text-ink-faint">days</p>
                </Tile>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-surface/70 p-3 ring-1 ring-inset ring-hairline/[0.06]">
                <Avatar
                  src={getBuddyAvatar(7, 8)}
                  alt="Your buddy, feeling excited"
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">Pixel</p>
                  <p className="truncate text-xs text-teal-bright">{moodLabel(8)}</p>
                </div>
              </div>
            </div>

            {/* Mini leaderboard */}
            <div className="sm:col-span-5">
              <div className="rounded-2xl bg-surface/70 p-4 ring-1 ring-inset ring-hairline/[0.06]">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-eyebrow text-ink-muted">
                    Friend leaderboard
                  </p>
                  <Fire weight="fill" className="h-4 w-4 text-teal/60" />
                </div>
                <div className="flex flex-col gap-1.5">
                  {FRIENDS.map((f) => (
                    <div
                      key={f.name}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2",
                        f.you ? "bg-teal/10 ring-1 ring-inset ring-teal/20" : "bg-transparent"
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-6 w-6 place-items-center rounded-lg font-mono text-xs font-semibold tabular",
                          f.you ? "bg-teal text-canvas" : "bg-surface-3 text-ink-muted"
                        )}
                      >
                        {f.rank}
                      </span>
                      <span
                        className={cn(
                          "flex-1 text-sm font-medium",
                          f.you ? "text-ink" : "text-ink-soft"
                        )}
                      >
                        {f.name}
                      </span>
                      <span className="font-mono text-sm font-semibold text-ink tabular">
                        {f.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Tile({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface/70 p-4 ring-1 ring-inset ring-hairline/[0.06]">
      {children}
    </div>
  );
}
