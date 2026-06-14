/* =====================================================================
   NotificationCard — the six notification booleans as premium switches,
   grouped sensibly:
     Channels         push_enabled, email_enabled
     Staying on track  friend_session_alerts, inactivity_reminders,
                       buddy_mood_alerts, nudge_enabled
   Each toggle writes optimistically to the query cache for an instant feel,
   fires useUpdateNotificationPrefs, and rolls back + toasts on error.
   ===================================================================== */
import { useQueryClient } from "@tanstack/react-query";
import {
  BellRinging,
  EnvelopeSimple,
  UsersThree,
  MoonStars,
  SmileyWink,
  HandWaving,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Card } from "@/components/ui";
import { useNotificationPrefs, useUpdateNotificationPrefs, qk } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { NotificationPreferences } from "@/lib/types";
import { Toggle } from "./Toggle";
import { NotificationCardSkeleton } from "./skeletons";

type PrefKey =
  | "push_enabled"
  | "email_enabled"
  | "friend_session_alerts"
  | "inactivity_reminders"
  | "buddy_mood_alerts"
  | "nudge_enabled";

interface ToggleDef {
  key: PrefKey;
  label: string;
  helper: string;
  icon: React.ReactNode;
}

const CHANNELS: ToggleDef[] = [
  {
    key: "push_enabled",
    label: "Push notifications",
    helper: "Real-time alerts on this device once push is enabled below.",
    icon: <BellRinging weight="fill" className="h-[18px] w-[18px]" />,
  },
  {
    key: "email_enabled",
    label: "Email",
    helper: "Occasional summaries and important updates by email.",
    icon: <EnvelopeSimple weight="fill" className="h-[18px] w-[18px]" />,
  },
];

const ACTIVITY: ToggleDef[] = [
  {
    key: "friend_session_alerts",
    label: "Friend session alerts",
    helper: "Know when a friend starts locking in, so you can join them.",
    icon: <UsersThree weight="fill" className="h-[18px] w-[18px]" />,
  },
  {
    key: "inactivity_reminders",
    label: "Gentle reminders",
    helper: "A soft nudge from us if a few quiet days slip by. No guilt-trips.",
    icon: <MoonStars weight="fill" className="h-[18px] w-[18px]" />,
  },
  {
    key: "buddy_mood_alerts",
    label: "Buddy mood changes",
    helper: "Hear it from your buddy when its mood shifts with your streak.",
    icon: <SmileyWink weight="fill" className="h-[18px] w-[18px]" />,
  },
  {
    key: "nudge_enabled",
    label: "Nudges from friends",
    helper: "Let friends send you a little encouragement to get started.",
    icon: <HandWaving weight="fill" className="h-[18px] w-[18px]" />,
  },
];

export function NotificationCard() {
  const qc = useQueryClient();
  const { data: prefs, isLoading, isError, refetch, isFetching } = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();

  function toggle(key: PrefKey, next: boolean) {
    const previous = qc.getQueryData<NotificationPreferences>(qk.notificationPrefs);
    // Optimistic: reflect the new value immediately.
    if (previous) {
      qc.setQueryData<NotificationPreferences>(qk.notificationPrefs, {
        ...previous,
        [key]: next,
      });
    }

    update.mutate(
      { [key]: next },
      {
        onError: (err) => {
          // Roll back to the pre-toggle snapshot.
          if (previous) qc.setQueryData(qk.notificationPrefs, previous);
          const detail =
            err instanceof ApiError ? err.detail : "Couldn't save that change.";
          toast.error("Change not saved", { description: detail });
        },
      }
    );
  }

  if (isLoading) return <NotificationCardSkeleton />;

  if (isError || !prefs) {
    return (
      <Card bodyClassName="p-6 sm:p-7">
        <SettingsHeading
          title="Notifications"
          subtitle="Choose what reaches you, and how."
        />
        <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl bg-surface-2/40 px-4 py-8 text-center ring-1 ring-inset ring-hairline/[0.07]">
          <p className="text-sm text-ink-soft">We couldn't load your preferences.</p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-full bg-surface-3 px-4 py-2 text-sm text-ink ring-1 ring-inset ring-hairline/10 transition-colors hover:bg-surface-3/70 disabled:opacity-50"
          >
            {isFetching ? "Retrying…" : "Try again"}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card bodyClassName="p-6 sm:p-7">
      <SettingsHeading title="Notifications" subtitle="Choose what reaches you, and how." />

      {/* Channels */}
      <GroupLabel>Channels</GroupLabel>
      <div className="flex flex-col">
        {CHANNELS.map((t) => (
          <Toggle
            key={t.key}
            icon={t.icon}
            label={t.label}
            helper={t.helper}
            checked={prefs[t.key]}
            onChange={(next) => toggle(t.key, next)}
          />
        ))}
      </div>

      <div className="my-2 h-px bg-hairline/[0.07]" />

      {/* Staying on track */}
      <GroupLabel>Staying on track</GroupLabel>
      <div className="flex flex-col">
        {ACTIVITY.map((t) => (
          <Toggle
            key={t.key}
            icon={t.icon}
            label={t.label}
            helper={t.helper}
            checked={prefs[t.key]}
            onChange={(next) => toggle(t.key, next)}
          />
        ))}
      </div>
    </Card>
  );
}

/* ---- small local presentational helpers ---- */

export function SettingsHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="font-display text-xl tracking-tight text-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 mt-5 px-3 text-[11px] uppercase tracking-eyebrow text-ink-faint">
      {children}
    </p>
  );
}
