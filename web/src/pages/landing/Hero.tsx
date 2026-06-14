/* =====================================================================
   Hero — asymmetric split. Left: eyebrow + display headline + subtext + CTAs.
   Right: the real product mockup (HeroMockup). Stat strip lives in its own
   section directly below (kept OUT of the hero per the layout law).
   Headline keeps the real product line: "Lock in. Level up."
   ===================================================================== */
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Button, ButtonArrow, EyebrowTag } from "@/components/ui";
import { HeroMockup } from "./HeroMockup";
import { EASE_SMOOTH } from "@/lib/motion";

export function Hero() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const stagger = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 20, filter: "blur(6px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { duration: 0.7, ease: EASE_SMOOTH, delay: i * 0.09 },
        };

  return (
    <section className="relative overflow-hidden pb-12 pt-28 sm:pt-32 lg:pb-20 lg:pt-36">
      <div className="mx-auto grid w-full max-w-[1180px] items-center gap-12 px-5 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-8">
        {/* Left column */}
        <div className="flex flex-col items-start">
          <motion.div {...stagger(0)}>
            <EyebrowTag pulse>Built for students who refuse to waste time</EyebrowTag>
          </motion.div>

          <motion.h1
            {...stagger(1)}
            className="mt-6 text-balance font-display text-5xl leading-[0.98] tracking-tightest text-ink sm:text-6xl lg:text-7xl"
          >
            Lock in.
            <br />
            <span className="text-teal">Level up.</span>
          </motion.h1>

          <motion.p
            {...stagger(2)}
            className="mt-6 max-w-md text-pretty text-base leading-relaxed text-ink-muted sm:text-lg"
          >
            Track your focused hours, log what you did, get an honest score, and compete with
            friends who show up too.
          </motion.p>

          <motion.div {...stagger(3)} className="mt-9 flex flex-wrap items-center gap-3">
            <Button size="lg" trailingIcon={ButtonArrow} onClick={() => navigate("/login")}>
              Get started, it's free
            </Button>
            <Button
              size="lg"
              variant="outline"
              trailingIcon={false}
              onClick={() => {
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              See how it works
            </Button>
          </motion.div>
        </div>

        {/* Right column — product mockup */}
        <div className="relative lg:pl-4">
          <HeroMockup />
        </div>
      </div>
    </section>
  );
}
