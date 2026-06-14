/* =====================================================================
   Onboarding — three delightful full-screen steps after sign-in.
     1. Welcome + terms
     2. Choose your buddy (15 characters)
     3. Name your buddy → PUT /buddy/ then → /dashboard

   Public route reached right after the OAuth redirect. Renders inside
   PublicLayout (which supplies the canvas + ambient orbs + grain).

   Guard: on mount, if the user already has a CUSTOMIZED buddy (server defaults
   are buddy_type 'cat' / buddy_name 'Buddy'), skip straight to /dashboard —
   mirrors the old frontend/js/onboarding.js check.
   ===================================================================== */
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Logo } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useBuddy, useUpdateBuddy } from "@/lib/queries";
import { buddyTypeFor } from "@/lib/buddy";
import { EASE_SMOOTH } from "@/lib/motion";
import { StepProgress } from "./onboarding/StepProgress";
import { WelcomeStep } from "./onboarding/WelcomeStep";
import { ChooseBuddyStep } from "./onboarding/ChooseBuddyStep";
import { NameBuddyStep } from "./onboarding/NameBuddyStep";

/** Server-side defaults for a brand-new, un-customized buddy. */
const DEFAULT_BUDDY_TYPE = "cat";
const DEFAULT_BUDDY_NAME = "Buddy";

const STEP_LABELS = ["Welcome", "Buddy", "Name"];

/** A buddy is "customized" once it's been moved off both server defaults. */
function isCustomized(
  buddyType: string | undefined,
  buddyName: string | undefined
): boolean {
  if (!buddyType || !buddyName) return false;
  return buddyType !== DEFAULT_BUDDY_TYPE || buddyName !== DEFAULT_BUDDY_NAME;
}

export function Onboarding() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { session, loading: authLoading } = useAuth();

  const [step, setStep] = useState(0); // 0..2
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [selected, setSelected] = useState<number | null>(null);

  const updateBuddy = useUpdateBuddy();

  // Only query the buddy once we have a session (the request needs the JWT).
  const buddyQuery = useBuddy({ enabled: !!session });

  useEffect(() => {
    document.title = "Welcome · LockdIN";
  }, []);

  const alreadyOnboarded = useMemo(() => {
    const b = buddyQuery.data;
    return !!b && isCustomized(b.buddy_type, b.buddy_name);
  }, [buddyQuery.data]);

  // No session at all → back to login (e.g. direct navigation).
  if (!authLoading && !session) {
    return <Navigate to="/login" replace />;
  }

  // Resolving the session or the buddy guard → minimal centered loader.
  const guardResolving = authLoading || (!!session && buddyQuery.isLoading);
  if (guardResolving) {
    return (
      <div className="grid min-h-[100dvh] place-items-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-hairline/10 border-t-teal"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  // Returning user with a customized buddy → straight to the dashboard.
  if (alreadyOnboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const handleSelect = (index: number) => setSelected(index);

  const handleConfirm = (buddyName: string) => {
    if (selected === null) return;
    updateBuddy.mutate(
      { buddy_type: buddyTypeFor(selected), buddy_name: buddyName },
      {
        onSuccess: () => navigate("/dashboard", { replace: true }),
        onError: () => {
          toast.error("Could not save your buddy. Please try again.");
        },
      }
    );
  };

  // Slide-with-fade between steps, honoring direction + reduced motion.
  const variants = {
    enter: (dir: number) =>
      reduce ? { opacity: 0 } : { opacity: 0, x: dir * 48, filter: "blur(8px)" },
    center: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: (dir: number) =>
      reduce ? { opacity: 0 } : { opacity: 0, x: dir * -48, filter: "blur(8px)" },
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col px-5 pb-16 pt-8 sm:px-6">
      {/* Top bar: wordmark + progress */}
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6">
        <Logo withMark size="md" />
        <StepProgress steps={STEP_LABELS} current={step} />
      </div>

      {/* Step stage */}
      <div className="relative mx-auto flex w-full max-w-2xl flex-1 items-center justify-center py-10">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: EASE_SMOOTH }}
            className="w-full"
          >
            {step === 0 && <WelcomeStep onContinue={() => go(1)} />}
            {step === 1 && (
              <ChooseBuddyStep
                selected={selected}
                onSelect={handleSelect}
                onContinue={() => go(2)}
              />
            )}
            {step === 2 && selected !== null && (
              <NameBuddyStep
                buddyIndex={selected}
                saving={updateBuddy.isPending}
                onConfirm={handleConfirm}
                onBack={() => go(1)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
