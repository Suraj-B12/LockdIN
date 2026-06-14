/* =====================================================================
   CTA — the closing call. One clean, confident panel, a headline, and a
   single primary action. No second button competing for attention.
   ===================================================================== */
import { useNavigate } from "react-router-dom";
import { Section, Button, ButtonArrow, Reveal } from "@/components/ui";

export function CTA() {
  const navigate = useNavigate();
  return (
    <Section spacing="lg">
      <Reveal>
        <div className="relative overflow-hidden rounded-squircle-xl border border-hairline/[0.08] bg-surface/60 px-6 py-16 text-center shadow-inset-top sm:px-12 sm:py-20">
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-balance font-display text-4xl tracking-tightest text-ink sm:text-5xl">
              Stop grinding alone. Lock in together.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-pretty leading-relaxed text-ink-muted">
              Start a session, bring a friend, and watch the streaks build. It takes about thirty
              seconds to set up.
            </p>
            <div className="mt-9 flex justify-center">
              <Button size="xl" trailingIcon={ButtonArrow} onClick={() => navigate("/login")}>
                Get started, it's free
              </Button>
            </div>
            <p className="mt-4 text-xs text-ink-faint">Forever free. No card, no catch.</p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
