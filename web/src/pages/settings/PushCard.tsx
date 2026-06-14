/* =====================================================================
   PushCard — "Enable push notifications" on this device.

   Real OneSignal Web Push UI: reflects the browser's current permission, and
   lets the user opt in. On enable we call promptPush() (OneSignal requests
   permission + opts the device in); the user is already associated with their
   Supabase id via auth.tsx → identify(), so backend external_id-targeted pushes
   reach this browser once permission is granted.

   Design: de-glowed — hairline rings + neutral shadows via the shared Card and
   Button primitives. No glow.
   ===================================================================== */
import { useEffect, useState } from "react";
import { BellRinging, CheckCircle, BellSlash, Info } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Card, Badge, Button } from "@/components/ui";
import { promptPush, pushPermission, type PushPermission } from "@/lib/onesignal";

export function PushCard() {
  const [permission, setPermission] = useState<PushPermission>("default");
  const [busy, setBusy] = useState(false);

  // Read the current permission once the SDK has had a tick to come up. We poll
  // briefly because OneSignal.init resolves asynchronously after mount.
  useEffect(() => {
    let active = true;
    setPermission(pushPermission());
    const t = setTimeout(() => {
      if (active) setPermission(pushPermission());
    }, 1200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, []);

  async function handleEnable() {
    setBusy(true);
    try {
      const result = await promptPush();
      setPermission(result);
      if (result === "granted") {
        toast.success("Push enabled on this device", {
          description: "You'll get alerts here when friends lock in.",
        });
      } else if (result === "denied") {
        toast.error("Notifications blocked", {
          description: "Allow notifications for this site in your browser settings.",
        });
      } else if (result === "unsupported") {
        toast.error("Push isn't available here", {
          description: "Your browser can't receive web push, or it isn't configured yet.",
        });
      }
      // "default" → the user dismissed the prompt; stay quiet.
    } finally {
      setBusy(false);
    }
  }

  const granted = permission === "granted";
  const denied = permission === "denied";
  const unsupported = permission === "unsupported";

  return (
    <Card tone="teal" bodyClassName="p-6 sm:p-7">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal/12 text-teal-bright ring-1 ring-inset ring-teal/25">
          <BellRinging weight="fill" className="h-[22px] w-[22px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl tracking-tight text-ink">
              Enable push notifications
            </h2>
            {granted && (
              <Badge tone="success">
                <CheckCircle weight="fill" className="h-3.5 w-3.5" />
                On this device
              </Badge>
            )}
            {denied && (
              <Badge tone="warning">
                <BellSlash weight="fill" className="h-3.5 w-3.5" />
                Blocked
              </Badge>
            )}
            {unsupported && <Badge tone="neutral">Unavailable</Badge>}
          </div>

          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-muted">
            Get instant alerts on this device when a friend locks in or your buddy's mood
            shifts. We'll ask your browser for permission.
          </p>

          {/* Action / state-specific guidance */}
          {granted ? (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-success">
              <CheckCircle weight="fill" className="h-[18px] w-[18px]" />
              You're all set to receive notifications here.
            </p>
          ) : denied ? (
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
              Notifications are blocked for this site. Re-enable them in your browser's site
              settings (the lock icon in the address bar), then reload.
            </p>
          ) : unsupported ? (
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-soft">
              This browser can't receive web push, or push isn't configured for this
              environment yet.
            </p>
          ) : (
            <Button
              variant="secondary"
              size="md"
              leadingIcon={BellRinging}
              onClick={handleEnable}
              disabled={busy}
              className="mt-4"
            >
              {busy ? "Requesting…" : "Enable on this device"}
            </Button>
          )}

          {/* iOS install hint — shown unless already granted. */}
          {!granted && (
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-faint">
              <Info weight="bold" className="mt-px h-4 w-4 shrink-0" />
              <span>
                On iPhone or iPad, add LockdIN to your Home Screen first (Share → Add to Home
                Screen) — iOS only allows web push from an installed app, on iOS 16.4+.
              </span>
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
