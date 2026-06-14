/* =====================================================================
   Login — Google OAuth via Supabase. A focused, centered glass card on the
   ambient teal backdrop. Standalone full-screen route (NOT inside AppLayout),
   so it paints its own canvas + orbs.

   Auth routing mirrors the old frontend/js/login.js:
     • already signed in  → /dashboard
     • on SIGNED_IN, NEW users (created < 60s ago) → /onboarding,
       returning users → /dashboard.
   The card shows a real spinner whenever auth is in flight — clicking through
   to Google, returning from the redirect, or the provider resolving the
   session — so the sign-in button never flashes mid-auth.
   ===================================================================== */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Check, WarningCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { BackgroundOrbs, Card, Logo, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { signInWithGoogle, onAuthStateChange } from "@/lib/supabase";
import { EASE_SMOOTH, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/cn";

/** Heuristic for "this account was just created" — mirrors the old flow. */
function isFreshSignup(createdAt: string | undefined): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created < 60_000; // within the last 60s
}

/** Google's colored "G" mark (official 4-color path). */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

type Phase = "idle" | "redirecting" | "success";

export function Login() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef(false); // guard against double-routing

  // We've landed back from Google's redirect (tokens/code in the URL) → a
  // session is about to resolve, so show "signing in" immediately rather than
  // flashing the button. False if the redirect carried an error.
  const isOAuthReturn = useMemo(() => {
    if (typeof window === "undefined") return false;
    const hash = window.location.hash || "";
    if (hash.includes("error")) return false;
    return hash.includes("access_token") || new URLSearchParams(window.location.search).has("code");
  }, []);

  useEffect(() => {
    document.title = "Sign in · LockdIN";
  }, []);

  // Surface an OAuth error handed back in the URL hash (e.g. user cancelled),
  // then strip it so a refresh doesn't replay it.
  useEffect(() => {
    const hash = window.location.hash || "";
    if (!hash.includes("error")) return;
    const p = new URLSearchParams(hash.replace(/^#/, ""));
    const desc = p.get("error_description");
    setError(
      desc ? decodeURIComponent(desc.replace(/\+/g, " ")) : "Sign-in didn't complete. Please try again."
    );
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  /** Route a resolved session to onboarding (new) or dashboard (returning). */
  const routeForSession = (createdAt: string | undefined) => {
    if (handledRef.current) return;
    handledRef.current = true;
    setPhase("success");
    const destination = isFreshSignup(createdAt) ? "/onboarding" : "/dashboard";
    // Brief beat on the success state, then route (replace so Back skips login).
    window.setTimeout(() => navigate(destination, { replace: true }), reduce ? 0 : 900);
  };

  // Already signed in when the page loads → bounce straight through.
  useEffect(() => {
    if (loading || !session) return;
    routeForSession(session.user?.created_at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session]);

  // Detect the OAuth return (SIGNED_IN fires after Supabase parses the URL hash).
  useEffect(() => {
    const unsubscribe = onAuthStateChange((s) => {
      if (s) routeForSession(s.user?.created_at);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogle = async () => {
    setError(null);
    setPhase("redirecting");
    try {
      await signInWithGoogle();
      // Full-page redirect to Google's consent screen follows; nothing else to do.
    } catch {
      setPhase("idle");
      const msg = "Could not start Google sign-in. Please try again.";
      setError(msg);
      toast.error(msg);
    }
  };

  // Auth in flight → show the loading state instead of the button. Suppressed
  // when there's an error so the user can read it and retry.
  const signingIn = !error && (phase !== "idle" || isOAuthReturn || loading);
  const signingLabel = phase === "redirecting" ? "Connecting to Google…" : "Signing you in…";

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-canvas">
      <BackgroundOrbs />

      <div className="relative z-10 grid min-h-[100dvh] place-items-center px-5 py-16">
        <motion.div
          className="w-full max-w-md"
          initial={reduce ? false : { opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: EASE_SMOOTH }}
        >
          {/* Wordmark + tagline */}
          <div className="mb-8 flex flex-col items-center gap-6 text-center">
            <Link to="/" className="rounded-2xl" aria-label="LockdIN home">
              <Logo withMark size="lg" />
            </Link>
            <div className="space-y-2.5">
              <h1 className="font-display text-[2rem] leading-tight tracking-tightest text-ink">
                Lock in your focus
              </h1>
              <p className="mx-auto max-w-xs text-pretty text-sm leading-relaxed text-ink-muted">
                Track your deep-work hours, keep your streak alive, and compete with friends.
              </p>
            </div>
          </div>

          {/* Auth card */}
          <Card tone="teal">
            <div className="flex min-h-[148px] flex-col justify-center gap-5 px-1 py-3 sm:px-3">
              <AnimatePresence mode="wait" initial={false}>
                {signingIn ? (
                  <motion.div
                    key="signingin"
                    className="flex flex-col items-center gap-4 py-2 text-center"
                    initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35, ease: EASE_OUT }}
                  >
                    {phase === "success" ? (
                      <motion.span
                        className="grid h-12 w-12 place-items-center rounded-full bg-teal/15 text-teal-bright ring-1 ring-inset ring-teal/30"
                        initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 320, damping: 18 }}
                      >
                        <Check weight="bold" className="h-6 w-6" />
                      </motion.span>
                    ) : (
                      <Spinner size="xl" />
                    )}
                    <p className="text-sm font-medium text-ink">{signingLabel}</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    className="flex flex-col gap-5"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: EASE_OUT }}
                  >
                    <button
                      type="button"
                      onClick={handleGoogle}
                      className={cn(
                        "group flex h-12 w-full items-center justify-center gap-3 rounded-full",
                        "bg-ink text-canvas text-[15px] font-medium shadow-pill",
                        "transition-[transform,opacity,box-shadow] duration-200 ease-out-strong",
                        "hover:opacity-95 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset,0_12px_30px_-10px_rgba(0,0,0,0.7)]",
                        "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2",
                        "focus-visible:ring-teal-bright/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2"
                      )}
                    >
                      <span className="grid h-6 w-6 place-items-center">
                        <GoogleMark className="h-5 w-5" />
                      </span>
                      Continue with Google
                    </button>

                    {error ? (
                      <motion.p
                        className="flex items-center justify-center gap-2 text-center text-xs text-danger"
                        role="alert"
                        initial={reduce ? false : { opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <WarningCircle weight="fill" className="h-4 w-4 shrink-0" />
                        {error}
                      </motion.p>
                    ) : (
                      <div className="flex items-center justify-center gap-2 px-2 text-center text-xs text-ink-faint">
                        <ShieldCheck weight="fill" className="h-4 w-4 shrink-0 text-teal/70" />
                        We only use Google to verify it is you. No posting, ever.
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          {/* Footer */}
          <div className="mt-8 flex flex-col items-center gap-4">
            <p className="text-center text-xs leading-relaxed text-ink-faint">
              By continuing you agree to our{" "}
              <Link to="/terms" className="text-ink-muted underline-offset-2 transition-colors hover:text-ink hover:underline">
                terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-ink-muted underline-offset-2 transition-colors hover:text-ink hover:underline">
                privacy policy
              </Link>
              .
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full text-sm text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft weight="bold" className="h-4 w-4" />
              Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
