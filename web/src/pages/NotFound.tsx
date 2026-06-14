/* NotFound — branded 404 with a way back (never a dead end). */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, House } from "@phosphor-icons/react";
import { BackgroundOrbs, Button, Logo, Reveal } from "@/components/ui";

export function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Not found · LockdIN";
  }, []);

  return (
    <div className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-canvas px-5">
      <BackgroundOrbs subtle />
      <Reveal className="relative z-10 flex flex-col items-center gap-7 text-center">
        <Logo withMark size="lg" />
        <div className="space-y-3">
          <p className="font-mono text-6xl font-semibold tracking-tightest text-teal sm:text-7xl">
            404
          </p>
          <h1 className="font-display text-2xl tracking-tightest text-ink sm:text-3xl">
            This page slipped the lock
          </h1>
          <p className="mx-auto max-w-sm text-pretty text-sm text-ink-muted">
            The page you are looking for does not exist or has moved. Let's get you back on track.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button leadingIcon={House} trailingIcon={false} onClick={() => navigate("/dashboard")}>
            Go to dashboard
          </Button>
          <Button variant="ghost" leadingIcon={ArrowLeft} onClick={() => navigate("/")}>
            Back to home
          </Button>
        </div>
      </Reveal>
    </div>
  );
}
