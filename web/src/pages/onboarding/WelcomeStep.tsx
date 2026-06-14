/* =====================================================================
   Onboarding · Step 1 — Welcome + terms.
   Short, warm copy. A compact "what you're agreeing to" card with three
   plain-language points, then the "I agree — let's go" CTA. Staggered reveals.
   ===================================================================== */
import { motion } from "framer-motion";
import { ShieldCheck, Lock, HeartStraight, ArrowRight } from "@phosphor-icons/react";
import { Button, EyebrowTag } from "@/components/ui";
import { revealStagger, revealItem } from "@/lib/motion";

const POINTS = [
  {
    icon: Lock,
    title: "Your data stays yours",
    desc: "We track how long and how focused you are — never what you work on.",
  },
  {
    icon: HeartStraight,
    title: "Your buddy is yours",
    desc: "A companion that mirrors your consistency, not arbitrary metrics.",
  },
  {
    icon: ShieldCheck,
    title: "Accountability, not surveillance",
    desc: "Positive reinforcement and friendly competition — nothing creepy.",
  },
];

export function WelcomeStep({ onContinue }: { onContinue: () => void }) {
  return (
    <motion.div
      className="flex w-full flex-col items-center text-center"
      variants={revealStagger}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={revealItem}>
        <EyebrowTag>Welcome to LockdIN</EyebrowTag>
      </motion.div>

      <motion.h1
        variants={revealItem}
        className="mt-6 text-balance font-display text-4xl tracking-tightest text-ink sm:text-5xl"
      >
        Let&rsquo;s set you up.
      </motion.h1>

      <motion.p
        variants={revealItem}
        className="mt-4 max-w-md text-pretty leading-relaxed text-ink-muted"
      >
        Three quick steps and you&rsquo;re in. First, a short agreement so we&rsquo;re on the same
        page &mdash; then the real journey starts.
      </motion.p>

      <motion.ul
        variants={revealItem}
        className="mt-9 flex w-full max-w-md flex-col gap-3"
      >
        {POINTS.map((p) => (
          <li
            key={p.title}
            className="flex items-start gap-3.5 rounded-2xl bg-surface-2/50 p-4 text-left ring-1 ring-inset ring-hairline/[0.07] shadow-inset-top"
          >
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal/12 text-teal-bright ring-1 ring-inset ring-teal/20">
              <p.icon weight="bold" className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">{p.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{p.desc}</p>
            </div>
          </li>
        ))}
      </motion.ul>

      <motion.div variants={revealItem} className="mt-9">
        <Button size="lg" trailingIcon={ArrowRight} onClick={onContinue}>
          I agree &mdash; let&rsquo;s go
        </Button>
      </motion.div>

      <motion.p variants={revealItem} className="mt-5 max-w-xs text-xs leading-relaxed text-ink-faint">
        You can review the full terms anytime from your profile settings.
      </motion.p>
    </motion.div>
  );
}
