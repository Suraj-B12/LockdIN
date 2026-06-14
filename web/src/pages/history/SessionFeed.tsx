/* =====================================================================
   SessionFeed — the reverse-chronological list of finished sessions.
   Each row: date + time, duration, a truncated work log, and a score badge
   toned by the AI score. We page client-side over the already-fetched batch
   (history is fetched 200 at a time) — "Load more" reveals the next slice.
   ===================================================================== */
import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { SessionResponse } from "@/lib/types";
import { relativeDay, clockTime, formatDuration } from "./dates";

const PAGE = 8;

/** Score → badge tone + glyph. Null score reads as "pending". */
function scoreTone(score: number | null): {
  tone: "success" | "teal" | "warning" | "neutral";
  label: string;
} {
  if (score == null) return { tone: "neutral", label: "—" };
  if (score >= 80) return { tone: "success", label: `${score}` };
  if (score >= 60) return { tone: "teal", label: `${score}` };
  if (score >= 40) return { tone: "warning", label: `${score}` };
  return { tone: "neutral", label: `${score}` };
}

export function SessionFeed({ sessions }: { sessions: SessionResponse[] }) {
  const [visible, setVisible] = useState(PAGE);
  const shown = sessions.slice(0, visible);
  const hasMore = visible < sessions.length;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-display text-lg tracking-tight text-ink">Sessions</h2>
        <span className="font-mono text-xs text-ink-faint tabular">
          {sessions.length} total
        </span>
      </div>

      <ul className="flex flex-col">
        {shown.map((s, i) => (
          <SessionRow key={s.id} session={s} isLast={i === shown.length - 1 && !hasMore} />
        ))}
      </ul>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            trailingIcon={CaretDown}
            onClick={() => setVisible((v) => v + PAGE)}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

function SessionRow({ session, isLast }: { session: SessionResponse; isLast: boolean }) {
  const stamp = session.finished_at ?? session.started_at;
  const { tone, label } = scoreTone(session.ai_score);
  const log = session.work_log?.trim();

  return (
    <li
      className={cn(
        "group flex items-start gap-4 py-4 transition-colors duration-200",
        !isLast && "border-b border-hairline/[0.06]"
      )}
    >
      {/* Date / time stack. */}
      <div className="w-[88px] shrink-0 pt-0.5">
        <div className="text-sm font-medium text-ink">{relativeDay(stamp)}</div>
        <div className="font-mono text-[11px] text-ink-faint tabular">
          {clockTime(stamp)}
        </div>
      </div>

      {/* Body: duration + work log. */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-teal-bright tabular">
            {formatDuration(session.total_seconds || 0)}
          </span>
          {session.pause_count > 0 && (
            <span className="font-mono text-[11px] text-ink-faint tabular">
              · {session.pause_count} {session.pause_count === 1 ? "pause" : "pauses"}
            </span>
          )}
        </div>
        <p
          className="mt-1 truncate text-sm text-ink-soft"
          title={log || undefined}
        >
          {log || <span className="text-ink-faint">No log for this session.</span>}
        </p>
        {session.ai_summary && (
          <p className="mt-1 truncate text-xs text-ink-faint">{session.ai_summary}</p>
        )}
      </div>

      {/* Score badge. */}
      <div className="shrink-0 pt-0.5">
        <Badge tone={tone} className="font-mono">
          {label}
          <span className="text-[10px] opacity-70">/100</span>
        </Badge>
      </div>
    </li>
  );
}
