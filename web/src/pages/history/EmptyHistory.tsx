/* =====================================================================
   EmptyHistory — shown when no sessions exist yet. Not a blank panel: a
   composed, inviting card that frames the first session as the start of the
   streak and routes to the dashboard to begin one.
   ===================================================================== */
import { useNavigate } from "react-router-dom";
import { ClockCounterClockwise, Play } from "@phosphor-icons/react";
import { Card, Button, EyebrowTag } from "@/components/ui";

export function EmptyHistory() {
  const navigate = useNavigate();
  return (
    <Card tone="teal" className="mx-auto max-w-xl text-center">
      <div className="flex flex-col items-center gap-5 px-2 py-10 sm:px-8">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal/12 text-teal-bright ring-1 ring-inset ring-teal/20">
          <ClockCounterClockwise weight="duotone" className="h-7 w-7" />
        </span>
        <EyebrowTag>Nothing logged yet</EyebrowTag>
        <h2 className="font-display text-2xl tracking-tightest text-ink sm:text-3xl">
          Your history starts with one session.
        </h2>
        <p className="max-w-sm text-pretty text-sm leading-relaxed text-ink-muted">
          Run the timer, log what you got done, and it lands here with its focus
          time and AI score. The heatmap fills in from there.
        </p>
        <Button
          variant="primary"
          size="lg"
          trailingIcon={Play}
          className="mt-1"
          onClick={() => navigate("/dashboard")}
        >
          Start your first session
        </Button>
      </div>
    </Card>
  );
}
