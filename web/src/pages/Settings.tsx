/* =====================================================================
   Settings — make LockdIN yours.
   Composition (renders inside AppLayout):
     • NotificationCard  the six preference toggles, grouped + optimistic
     • PushCard          enable web push on this device (stub — see PushCard)
     • AccountCard       signed-in identity + sign out
   Hooks: useNotificationPrefs, useUpdateNotificationPrefs, useAuth (sign out),
   useProfile (identity).
   ===================================================================== */
import { EyebrowTag, Reveal, RevealChild } from "@/components/ui";
import { NotificationCard } from "./settings/NotificationCard";
import { PushCard } from "./settings/PushCard";
import { AccountCard } from "./settings/AccountCard";

export function Settings() {
  return (
    <div className="mx-auto w-full max-w-[1180px]">
      {/* Header */}
      <Reveal className="mb-7" blur={false}>
        <EyebrowTag>Make it yours</EyebrowTag>
        <h1 className="mt-4 font-display text-4xl tracking-tightest text-ink sm:text-5xl">
          Settings
        </h1>
        <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed text-ink-muted">
          Decide how LockdIN keeps you on track — and stay in control of your account.
        </p>
      </Reveal>

      <Reveal stagger className="mx-auto flex max-w-2xl flex-col gap-6">
        <RevealChild>
          <NotificationCard />
        </RevealChild>
        <RevealChild>
          <PushCard />
        </RevealChild>
        <RevealChild>
          <AccountCard />
        </RevealChild>
      </Reveal>
    </div>
  );
}
