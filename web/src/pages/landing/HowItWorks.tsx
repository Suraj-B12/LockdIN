/* =====================================================================
   HowItWorks — four steps. A connected vertical flow on mobile, a 4-up row with
   a hairline rail on desktop. Each step has its own icon and verb-noun title
   (no "Step 1 / Stage 1" labels — the content IS the label). Numerals are mono.
   ===================================================================== */
import { Play, NotePencil, ChartLineUp, UsersThree, type Icon } from "@phosphor-icons/react";
import { Section, SectionHeading, Reveal, RevealChild } from "@/components/ui";

interface Step {
  n: string;
  title: string;
  desc: string;
  icon: Icon;
}

const STEPS: Step[] = [
  {
    n: "01",
    title: "Hit start",
    desc: "One tap begins your focus session. The timer runs while you work. No categories, no setup friction.",
    icon: Play,
  },
  {
    n: "02",
    title: "Log what you did",
    desc: "When you stop, a quick box appears. Type what you worked on, like solved 3 LeetCode problems. Be honest.",
    icon: NotePencil,
  },
  {
    n: "03",
    title: "Get your score",
    desc: "An AI agent reads your log, factors in session length, and scores it out of 100 with a clean summary.",
    icon: ChartLineUp,
  },
  {
    n: "04",
    title: "Compete and grow",
    desc: "See where you stand on friend leaderboards, check each other's progress, and build streaks together.",
    icon: UsersThree,
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works" spacing="lg">
      <SectionHeading
        title="Four steps. Zero friction."
        subtitle="No complicated setup, no learning curve. Just open, lock in, and go."
      />

      <Reveal
        stagger
        className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4"
      >
        {STEPS.map((step) => (
          <RevealChild key={step.n}>
            <div className="group relative flex h-full flex-col rounded-squircle border border-hairline/[0.07] bg-surface/60 p-6 shadow-inset-top transition-[transform,border-color] duration-500 ease-smooth hover:-translate-y-1 hover:border-teal/25">
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal/10 text-teal-bright ring-1 ring-inset ring-teal/15 transition-colors duration-500 group-hover:bg-teal/15">
                  <step.icon weight="duotone" className="h-6 w-6" />
                </span>
                <span className="font-mono text-sm font-semibold text-ink-faint tabular">
                  {step.n}
                </span>
              </div>
              <h3 className="mt-5 font-display text-xl tracking-tight text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.desc}</p>
            </div>
          </RevealChild>
        ))}
      </Reveal>
    </Section>
  );
}
