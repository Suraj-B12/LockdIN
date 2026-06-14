/* =====================================================================
   BuddySection — the emotional centerpiece. A real buddy avatar cycles
   through its moods (devastated → ecstatic) with a crossfade, a live mood
   meter, and a filmstrip of the progression. Left column carries the copy
   + perks. The buddy is the product's heart, so this gets real care.
   ===================================================================== */
import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check } from "@phosphor-icons/react";
import { Section, EyebrowTag, Reveal } from "@/components/ui";
import { getBuddyAvatar, moodLabel } from "@/lib/buddy";
import { EASE_SMOOTH } from "@/lib/motion";

const BUDDY = 7; // a characterful one
const SEQUENCE = [1, 4, 6, 8, 10]; // devastated → ecstatic

const PERKS = [
  { title: "Ten moods, one companion", desc: "From devastated to ecstatic — it mirrors how consistent you've been." },
  { title: "Pick from fifteen characters", desc: "Choose the one that feels like yours during onboarding." },
  { title: "Name it, keep it", desc: "Give your buddy a name. It sticks with you for every streak." },
  { title: "It feels your friends, too", desc: "When the group slacks off, everyone's buddy notices." },
];

export function BuddySection() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(SEQUENCE.length - 1); // start happy

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((v) => (v + 1) % SEQUENCE.length), 2200);
    return () => clearInterval(t);
  }, [reduce]);

  const mood = SEQUENCE[i];

  return (
    <Section id="your-buddy" spacing="lg" className="scroll-mt-24">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Copy */}
        <Reveal className="flex flex-col items-start">
          <EyebrowTag>Your accountability buddy</EyebrowTag>
          <h2 className="mt-6 text-balance font-display text-4xl tracking-tightest text-ink sm:text-5xl">
            A companion that feels every streak.
          </h2>
          <p className="mt-5 max-w-md text-pretty leading-relaxed text-ink-muted">
            Your buddy isn't a mascot — it's a mirror. Show up and it lights up. Disappear for a few
            days and it slumps. It's a small thing that makes skipping a session feel like letting
            someone down.
          </p>

          <ul className="mt-8 flex w-full flex-col gap-4">
            {PERKS.map((p) => (
              <li key={p.title} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal/12 text-teal-bright ring-1 ring-inset ring-teal/20">
                  <Check weight="bold" className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{p.title}</p>
                  <p className="text-sm leading-relaxed text-ink-muted">{p.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Buddy showcase */}
        <Reveal delay={0.1} className="relative">
          <div className="relative mx-auto max-w-sm rounded-squircle-lg border border-hairline/[0.08] bg-surface/50 p-1.5 shadow-card">
            <div className="relative overflow-hidden rounded-[calc(2rem-0.375rem)] bg-gradient-to-b from-surface-2/80 to-canvas-2/80 px-6 pb-6 pt-10 shadow-inset-top">
              {/* avatar crossfade */}
              <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
                <AnimatePresence mode="popLayout">
                  <motion.img
                    key={mood}
                    src={getBuddyAvatar(BUDDY, mood)}
                    alt={`Buddy feeling ${moodLabel(mood).toLowerCase()}`}
                    className="h-44 w-44 select-none object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
                    initial={reduce ? false : { opacity: 0, scale: 0.88, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: -8 }}
                    transition={{ duration: 0.5, ease: EASE_SMOOTH }}
                    draggable={false}
                  />
                </AnimatePresence>
              </div>

              {/* mood label + meter */}
              <div className="relative mt-6 text-center">
                <p className="text-xs uppercase tracking-eyebrow text-ink-faint">Current mood</p>
                <p className="mt-1 font-display text-2xl text-ink">{moodLabel(mood)}</p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-3/70">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-teal-deep via-teal to-teal-bright"
                    animate={{ width: `${mood * 10}%` }}
                    transition={{ duration: 0.6, ease: EASE_SMOOTH }}
                  />
                </div>
              </div>

              {/* filmstrip */}
              <div className="relative mt-6 flex items-center justify-center gap-2">
                {SEQUENCE.map((m, idx) => (
                  <button
                    key={m}
                    onClick={() => setI(idx)}
                    aria-label={`Show ${moodLabel(m).toLowerCase()}`}
                    className={cnRing(idx === i)}
                  >
                    <img
                      src={getBuddyAvatar(BUDDY, m)}
                      alt=""
                      className="h-9 w-9 object-contain"
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function cnRing(active: boolean): string {
  return [
    "grid h-12 w-12 place-items-center rounded-xl border transition-all duration-300 ease-smooth",
    active
      ? "border-teal/40 bg-teal/10 opacity-100"
      : "border-hairline/[0.07] bg-surface-2/40 opacity-50 hover:opacity-80",
  ].join(" ");
}
