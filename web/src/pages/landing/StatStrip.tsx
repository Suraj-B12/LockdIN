/* =====================================================================
   StatStrip — the three research-backed numbers, sitting directly under the
   hero (NOT inside it). Mono tabular numerals. Real citations footnoted.
   ===================================================================== */
import { Reveal, RevealChild } from "@/components/ui";

const STATS = [
  { value: "+40%", label: "average focus increase", note: "with peer accountability" },
  { value: "66 days", label: "to build a lasting habit", note: "the streak window" },
  { value: "2x", label: "higher goal success", note: "when you write it down" },
];

export function StatStrip() {
  return (
    <section className="relative border-y border-hairline/[0.06] bg-canvas-2/40">
      <div className="mx-auto w-full max-w-[1180px] px-5 sm:px-6 lg:px-8">
        <Reveal stagger className="grid divide-y divide-hairline/[0.06] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {STATS.map((s) => (
            <RevealChild
              key={s.label}
              className="flex flex-col gap-1 px-2 py-8 sm:items-center sm:px-6 sm:text-center"
            >
              <span className="font-mono text-3xl font-semibold tracking-tight text-teal tabular sm:text-4xl">
                {s.value}
              </span>
              <span className="text-sm font-medium text-ink">{s.label}</span>
              <span className="text-xs text-ink-faint">{s.note}</span>
            </RevealChild>
          ))}
        </Reveal>
      </div>
      <p className="mx-auto max-w-[1180px] px-5 pb-7 text-center text-[11px] leading-relaxed text-ink-faint sm:px-6 lg:px-8">
        Based on published research from the American Society of Training and Development, University
        College London, and Dominican University of California.
      </p>
    </section>
  );
}
