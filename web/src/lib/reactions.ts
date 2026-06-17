/* =====================================================================
   Reactions — the fixed give-only positive set, shared by the ReactionBar (give),
   the recap (received), and the full-screen emoji celebration. Single source of
   truth for each emoji's key → glyph → label.
   ===================================================================== */
import type { ReactionEmoji } from "./types";

export const REACTIONS: { key: ReactionEmoji; glyph: string; label: string }[] = [
  { key: "fire", glyph: "🔥", label: "Fire" },
  { key: "clap", glyph: "👏", label: "Respect" },
  { key: "muscle", glyph: "💪", label: "Strong" },
  { key: "brain", glyph: "🧠", label: "Big brain" },
  { key: "eyes", glyph: "👀", label: "Watching" },
  { key: "hundred", glyph: "💯", label: "100" },
];

/** key → glyph, for rendering received reactions and the emoji confetti. */
export const REACTION_GLYPH: Record<ReactionEmoji, string> = Object.fromEntries(
  REACTIONS.map((r) => [r.key, r.glyph])
) as Record<ReactionEmoji, string>;
