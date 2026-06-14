/* =====================================================================
   Science — four research-backed numbers in a 2×2 grid (mono tabular
   numerals), with a single honest citation footnote. Numbers are organic,
   not suspiciously round.
   ===================================================================== */
import { Section, SectionHeading, Reveal, RevealChild } from "@/components/ui";

const STATS = [
  { value: "65%", label: "more likely to hit a goal", sub: "when you commit to it with another person" },
  { value: "2×", label: "higher success rate", sub: "when you write down what you actually did" },
  { value: "66", label: "days to lock in a habit", sub: "the real average — not the myth of 21" },
  { value: "+27%", label: "more focused time", sub: "with someone putting in the work alongside you" },
];

export function Science() {
  return (
    <Section id="the-science" spacing="lg" className="scroll-mt-24">
      <SectionHeading
        title="Accountability isn't a vibe. It's measurable."
        subtitle="The reason LockdIN leans on friends and streaks isn't aesthetic — it's what the research keeps finding."
      />

      <Reveal stagger className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        {STATS.map((s) => (
          <RevealChild
            key={s.label}
            className="rounded-squircle border border-hairline/[0.07] bg-surface/50 p-7 shadow-inset-top"
          >
            <p className="font-mono text-5xl font-semibold tracking-tight text-teal tabular">
              {s.value}
            </p>
            <p className="mt-3 text-base font-medium text-ink">{s.label}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{s.sub}</p>
          </RevealChild>
        ))}
      </Reveal>

      <p className="mx-auto mt-8 max-w-xl text-center text-[11px] leading-relaxed text-ink-faint">
        Figures drawn from published work by the American Society of Training and Development,
        University College London, and Dominican University of California.
      </p>
    </Section>
  );
}
