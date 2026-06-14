/* =====================================================================
   Landing — the marketing page. Composes its own nav (for full hero
   control) + the section flow. Ambient orbs + grain come from the layout.
   ===================================================================== */
import { LandingNav } from "./landing/LandingNav";
import { Hero } from "./landing/Hero";
import { StatStrip } from "./landing/StatStrip";
import { HowItWorks } from "./landing/HowItWorks";
import { Features } from "./landing/Features";
import { BuddySection } from "./landing/BuddySection";
import { Science } from "./landing/Science";
import { CTA } from "./landing/CTA";
import { Footer } from "./landing/Footer";

export function Landing() {
  return (
    <>
      <LandingNav />
      <Hero />
      <StatStrip />
      <HowItWorks />
      <Features />
      <BuddySection />
      <Science />
      <CTA />
      <Footer />
    </>
  );
}
