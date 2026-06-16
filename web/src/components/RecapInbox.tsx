/* =====================================================================
   RecapInbox — the "while you were gone" inbox. A styled modal that greets you
   on open with what your friends did since your last visit: who locked in (and
   how much), and who's gone quiet — with a one-tap nudge to pull them back in.

   Privacy-framed and encouraging: celebrate friends' wins, gently rally the
   quiet ones. Driven by GET /friends/activity. NOT motion-gated (the test
   device runs Reduce Motion), so it always animates in.
   ===================================================================== */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Sparkle,
  Flame,
  Trophy,
  HandWaving,
  CheckCircle,
  X,
  MoonStars,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui";
import { useNudgeFriend } from "@/lib/queries";
import { moodEmoji } from "@/lib/buddy";
import type { FriendActivityItem, FriendActivityResponse } from "@/lib/types";

function fmtDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 1) return "0m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

function fmtAgo(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export interface RecapInboxProps {
  data: FriendActivityResponse;
  onClose: () => void;
}

export function RecapInbox({ data, onClose }: RecapInboxProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Move focus into the dialog and trap Tab within it (a11y for an auto-opening modal).
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, a[href], select, input, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", onKey);
    return () => panel.removeEventListener("keydown", onKey);
  }, []);

  const active = data.items.filter((i) => i.active);
  const idle = data.items.filter((i) => !i.active);
  const totalSeconds = active.reduce((acc, i) => acc + (i.total_seconds || 0), 0);

  const headline =
    data.active_count > 0
      ? `${data.active_count} ${data.active_count === 1 ? "friend" : "friends"} locked in while you were away`
      : "Your circle's been quiet";

  return (
    <motion.div
      className="fixed inset-0 z-overlay grid place-items-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-modal="true"
      aria-label="While you were gone"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close recap"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 360, damping: 30 }}
        className="relative flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-squircle bg-surface-2 shadow-card-hover ring-1 ring-inset ring-hairline/12"
      >
        {/* Header */}
        <div className="relative shrink-0 border-b border-hairline/[0.07] px-6 pb-5 pt-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-surface-3/60 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55"
          >
            <X weight="bold" className="h-4 w-4" />
          </button>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-eyebrow text-teal-bright ring-1 ring-inset ring-teal/15">
            <Sparkle weight="fill" className="h-3.5 w-3.5" />
            While you were gone
          </span>

          <h2 className="mt-3 text-balance font-display text-2xl tracking-tightest text-ink">
            {headline}
          </h2>
          {data.active_count > 0 && (
            <p className="mt-1.5 text-sm text-ink-muted">
              Your circle logged{" "}
              <span className="font-semibold text-ink">{fmtDuration(totalSeconds)}</span> of focus
              together.
            </p>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {active.length > 0 && (
            <ul className="flex flex-col gap-2">
              {active.map((f) => (
                <ActiveRow key={f.friend_id} item={f} />
              ))}
            </ul>
          )}

          {idle.length > 0 && (
            <>
              <p className="px-3 pb-2 pt-4 text-[11px] font-medium uppercase tracking-eyebrow text-ink-faint">
                Quiet since you left
              </p>
              <ul className="flex flex-col gap-2">
                {idle.map((f) => (
                  <IdleRow key={f.friend_id} item={f} />
                ))}
              </ul>
            </>
          )}

          {data.items.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-3/70 text-ink-muted">
                <MoonStars weight="duotone" className="h-6 w-6" />
              </span>
              <p className="text-sm font-medium text-ink">No friends yet</p>
              <p className="max-w-xs text-xs leading-relaxed text-ink-muted">
                Add friends to see what they're working on — and to keep each other accountable.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-hairline/[0.07] p-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-teal py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55"
          >
            All caught up
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---- Rows ---- */

function NameLink({ item }: { item: FriendActivityItem }) {
  return (
    <Link
      to={`/u/${item.friend_id}`}
      className="truncate font-medium text-ink transition-colors hover:text-teal-bright"
    >
      {item.friend_name || "A friend"}
    </Link>
  );
}

function ActiveRow({ item }: { item: FriendActivityItem }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-teal/[0.06] px-3 py-2.5 ring-1 ring-inset ring-teal/12">
      <Avatar
        src={item.friend_avatar}
        alt={item.friend_name || "Friend"}
        fallback={item.friend_name ?? "?"}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <NameLink item={item} />
          {item.mood_level != null && (
            <span aria-hidden className="text-sm leading-none">
              {moodEmoji(item.mood_level)}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Flame weight="fill" className="h-3.5 w-3.5 text-warning" />
            {item.sessions_count} {item.sessions_count === 1 ? "session" : "sessions"}
          </span>
          <span className="tabular">{fmtDuration(item.total_seconds)}</span>
          {item.best_score != null && (
            <span className="inline-flex items-center gap-1">
              <Trophy weight="fill" className="h-3.5 w-3.5 text-teal-bright" />
              {item.best_score} best
            </span>
          )}
        </div>
      </div>
      <span className="shrink-0 self-start font-mono text-[10px] tabular text-ink-faint">
        {fmtAgo(item.last_finished_at)}
      </span>
    </li>
  );
}

function IdleRow({ item }: { item: FriendActivityItem }) {
  const nudge = useNudgeFriend();
  const [nudged, setNudged] = useState(false);

  const onNudge = () => {
    nudge.mutate(item.friend_id, {
      onSuccess: () => {
        setNudged(true);
        toast.success(`Nudged ${item.friend_name || "your friend"} 👋`);
      },
      onError: (err) => {
        const msg =
          (err as { message?: string })?.message ||
          "Couldn't send that nudge. Try again later.";
        toast.error(msg);
      },
    });
  };

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-surface-3/30 px-3 py-2.5 ring-1 ring-inset ring-hairline/[0.07]">
      <Avatar
        src={item.friend_avatar}
        alt={item.friend_name || "Friend"}
        fallback={item.friend_name ?? "?"}
        size="md"
        className="opacity-80"
      />
      <div className="min-w-0 flex-1">
        <NameLink item={item} />
        <p className="mt-0.5 text-xs text-ink-muted">Hasn't locked in — send some love.</p>
      </div>
      {nudged ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-teal-bright">
          <CheckCircle weight="fill" className="h-4 w-4" />
          Nudged
        </span>
      ) : (
        <button
          type="button"
          onClick={onNudge}
          disabled={nudge.isPending}
          aria-label={`Nudge ${item.friend_name || "friend"}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-ink-soft ring-1 ring-inset ring-hairline/12 transition-colors hover:text-teal-bright hover:ring-teal/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/55 disabled:opacity-50"
        >
          <HandWaving weight="fill" className="h-3.5 w-3.5" />
          Nudge
        </button>
      )}
    </li>
  );
}
