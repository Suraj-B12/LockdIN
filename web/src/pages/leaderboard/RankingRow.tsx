/* =====================================================================
   RankingRow — one entry on the board. Rank badge, avatar, name, total focus
   time, and the score (mono). The top three are styled, not just resized:
   gold/silver/bronze rank coins with a tinted hairline and a faint top sheen.
   The viewer's own row is highlighted teal regardless of position.
   ===================================================================== */
import { Crown, type Icon } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { LeaderboardEntry } from "@/lib/types";
import { formatFocus, formatScore } from "./format";

/** Per-podium-place visual treatment (rank 1–3). */
interface Podium {
  coin: string; // rank coin bg + ring + text
  row: string; // row tint + ring
  icon?: Icon; // crown for #1
}

const PODIUM: Record<1 | 2 | 3, Podium> = {
  1: {
    coin: "bg-gradient-to-b from-[#ffe08a] to-[#e0a93a] text-[#3a2a00] ring-[#ffd970]/50 shadow-[0_0_18px_-4px_rgba(255,200,90,0.6)]",
    row: "bg-[#e0a93a]/[0.06] ring-[#e0a93a]/25",
    icon: Crown,
  },
  2: {
    coin: "bg-gradient-to-b from-[#e6e9ef] to-[#a9b0bd] text-[#2a2d33] ring-[#d6dae2]/45",
    row: "bg-hairline/[0.04] ring-hairline/[0.12]",
  },
  3: {
    coin: "bg-gradient-to-b from-[#e6b07a] to-[#b9783f] text-[#33200d] ring-[#e0a06a]/45",
    row: "bg-[#b9783f]/[0.05] ring-[#b9783f]/20",
  },
};

interface RankingRowProps {
  entry: LeaderboardEntry;
  isYou: boolean;
}

export function RankingRow({ entry, isYou }: RankingRowProps) {
  const rank = entry.rank;
  const podium = rank === 1 || rank === 2 || rank === 3 ? PODIUM[rank] : null;
  const CoinIcon = podium?.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 ring-1 ring-inset transition-colors duration-200 sm:gap-4 sm:px-4",
        // Your row wins over podium tint so you can always find yourself.
        isYou
          ? "bg-teal/[0.09] ring-teal/30"
          : podium
            ? podium.row
            : "bg-transparent ring-transparent hover:bg-hairline/[0.03]"
      )}
    >
      {/* Rank coin. */}
      <div className="shrink-0">
        <span
          className={cn(
            "grid h-8 w-8 place-items-center rounded-full text-[13px] font-semibold tabular ring-1 ring-inset sm:h-9 sm:w-9",
            podium
              ? podium.coin
              : "bg-surface-2 text-ink-soft ring-hairline/10"
          )}
        >
          {CoinIcon ? <CoinIcon weight="fill" className="h-4 w-4" /> : rank}
        </span>
      </div>

      {/* Avatar. */}
      <Avatar
        src={entry.avatar_url}
        alt={entry.display_name}
        fallback={entry.display_name}
        size="sm"
        glow={rank === 1}
      />

      {/* Name + focus time. */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">
            {entry.display_name}
          </span>
          {isYou && (
            <span className="shrink-0 rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-medium text-teal-bright ring-1 ring-inset ring-teal/25">
              You
            </span>
          )}
        </div>
        <div className="font-mono text-[11px] text-ink-faint tabular">
          {formatFocus(entry.total_seconds)} focused
        </div>
      </div>

      {/* Score (mono, tabular). */}
      <div className="shrink-0 text-right">
        <div
          className={cn(
            "font-mono text-base font-semibold tabular sm:text-lg",
            rank === 1 ? "text-teal-bright" : "text-ink"
          )}
        >
          {formatScore(entry.total_score)}
        </div>
        <div className="text-[10px] uppercase tracking-eyebrow text-ink-faint">
          pts
        </div>
      </div>
    </div>
  );
}
