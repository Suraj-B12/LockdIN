/* =====================================================================
   EmptyBoard — the cold-start state, and the most important screen on the
   page: a fresh account has no friends, so instead of a blank board we lead
   with a confident "invite your friends to compete" pitch and an inline add
   field so the very first action is one tap away. A faint mock podium hints
   at what the board becomes.
   ===================================================================== */
import { Card, EyebrowTag } from "@/components/ui";
import { AddFriend } from "./AddFriend";

export function EmptyBoard() {
  return (
    <Card tone="teal">
      <div className="flex flex-col items-center gap-6 px-2 py-8 text-center sm:px-8 sm:py-10">
        <GhostPodium />

        <div className="flex flex-col items-center gap-4">
          <EyebrowTag>Better with friends</EyebrowTag>
          <h2 className="font-display text-2xl tracking-tightest text-ink sm:text-3xl">
            Invite your friends to compete.
          </h2>
          <p className="max-w-md text-pretty text-sm leading-relaxed text-ink-muted">
            The leaderboard comes alive the moment someone else is on it. Add a
            friend by invite code or email and start racing on daily, weekly, and
            all-time focus.
          </p>
        </div>

        {/* Inline add field — the whole point of this state is to act now. */}
        <div className="w-full max-w-md rounded-squircle border border-hairline/[0.07] bg-surface/50 p-4 text-left shadow-inset-top sm:p-5">
          <AddFriend compact />
        </div>
      </div>
    </Card>
  );
}

/** A faint three-column podium silhouette — a preview of the real board. */
function GhostPodium() {
  const bars = [
    { h: 56, label: "2" },
    { h: 80, label: "1" },
    { h: 40, label: "3" },
  ];
  return (
    <div className="flex items-end justify-center gap-3" aria-hidden>
      {bars.map((b) => (
        <div key={b.label} className="flex flex-col items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2/80 font-mono text-xs font-semibold text-ink-faint tabular ring-1 ring-inset ring-hairline/10">
            {b.label}
          </span>
          <div
            className="w-12 rounded-t-xl bg-gradient-to-t from-teal-deep/30 to-teal/20 ring-1 ring-inset ring-teal/15"
            style={{ height: b.h }}
          />
        </div>
      ))}
    </div>
  );
}
