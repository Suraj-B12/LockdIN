/* =====================================================================
   ActivityHeatmap — GitHub-style contribution grid for the last 12 weeks.
   7 rows (Mon→Sun) × 12 columns (weeks). Each cell is colored in one of five
   teal intensity levels by that day's total focus seconds.

   Month labels live OUTSIDE the scroll container in a mirrored overlay — this
   prevents them (and the tooltip) from being clipped by overflow-y:auto, which
   overflow-x:auto forces on its element. The label row mirrors the grid's
   scrollLeft via translateX. Tooltip coordinates are relative to the outer
   wrapper, not the scroll content, so they can extend in any direction.
   ===================================================================== */
import { useState, useRef, type RefObject } from "react";
import { cn } from "@/lib/cn";
import {
  fullDate,
  formatDuration,
  type HeatDay,
  type HeatmapModel,
} from "./dates";

/** Cell fills per intensity level (0 = empty, 4 = peak). Hairline → bright teal. */
const LEVEL_FILL: Record<HeatDay["level"], string> = {
  0: "bg-hairline/[0.05] ring-hairline/[0.04]",
  1: "bg-teal/20 ring-teal/20",
  2: "bg-teal/40 ring-teal/25",
  3: "bg-teal/65 ring-teal/30",
  4: "bg-teal ring-teal/40",
};

const WEEKDAY_ROWS = ["Mon", "", "Wed", "", "Fri", "", ""] as const;

// Layout constants — must match the grid's pixel sizing exactly so the month
// label overlay stays in sync with the columns it labels.
// Weekday column: 28px width + 4px mr-1 + 6px parent gap = 38px total offset.
const WEEKDAY_COL_W = 38;
const CELL_W = 15;
const CELL_GAP = 6;

interface TooltipState {
  day: HeatDay;
  /** Pixel offset relative to the outer wrapper div (not the scroll content). */
  x: number;
  y: number;
}

export function ActivityHeatmap({ model }: { model: HeatmapModel }) {
  const [tip, setTip] = useState<TooltipState | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scrollX, setScrollX] = useState(0);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-display text-lg tracking-tight text-ink">
          Activity
        </h2>
        <span className="text-xs text-ink-faint">Last 12 weeks</span>
      </div>

      {/* Month label row — sits ABOVE the scroll container, never clipped.
          overflow-hidden clips labels that slide off the left (behind the
          weekday column). translateX mirrors the grid's scrollLeft so labels
          stay aligned with their columns as the user scrolls. */}
      <div className="overflow-hidden pb-1" style={{ paddingLeft: WEEKDAY_COL_W }}>
        <div
          className="flex"
          style={{ transform: `translateX(-${scrollX}px)`, willChange: "transform" }}
        >
          {model.weeks.map((week, w) => (
            <div
              key={w}
              className="shrink-0 font-mono text-[10px] leading-none text-ink-muted tabular"
              style={{
                width: CELL_W,
                marginRight: w < model.weeks.length - 1 ? CELL_GAP : 0,
              }}
            >
              {week.monthLabel ?? ""}
            </div>
          ))}
        </div>
      </div>

      {/* Grid — no month labels inside, so overflow-y clipping is a non-issue. */}
      <div
        className="scrollbar-teal overflow-x-auto pb-1"
        onScroll={(e) => setScrollX(e.currentTarget.scrollLeft)}
      >
        <div className="inline-flex gap-[6px]">
          {/* Weekday labels column. */}
          <div className="mr-1 flex shrink-0 flex-col gap-[6px]">
            {WEEKDAY_ROWS.map((label, r) => (
              <div
                key={r}
                className="flex h-[15px] items-center justify-end pr-1 font-mono text-[10px] leading-none text-ink-faint tabular"
                style={{ width: 28 }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Week columns — cells only, no month labels. */}
          {model.weeks.map((week, w) => (
            <div key={w} className="flex shrink-0 flex-col gap-[6px]">
              {week.days.map((day) => (
                <Cell
                  key={day.key}
                  day={day}
                  active={tip?.day.key === day.key}
                  wrapperRef={wrapperRef}
                  onEnter={(x, y) => setTip({ day, x, y })}
                  onLeave={() => setTip((t) => (t?.day.key === day.key ? null : t))}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip — anchored to the wrapper, not the scroll content, so it can
          extend upward past the grid's top edge without being clipped. */}
      {tip && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full pb-2"
          style={{ left: tip.x, top: tip.y }}
        >
          <div className="whitespace-nowrap rounded-xl border border-hairline/10 bg-surface-2/95 px-3 py-2 text-center shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_16px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            <div className="font-mono text-[13px] font-semibold text-ink tabular">
              {tip.day.seconds > 0
                ? formatDuration(tip.day.seconds)
                : "No focus"}
            </div>
            <div className="mt-0.5 text-[11px] text-ink-muted">
              {fullDate(tip.day.date)}
            </div>
            {tip.day.sessions > 0 && (
              <div className="mt-0.5 font-mono text-[10px] text-ink-faint tabular">
                {tip.day.sessions}{" "}
                {tip.day.sessions === 1 ? "session" : "sessions"}
              </div>
            )}
          </div>
          {/* little stem */}
          <div className="mx-auto h-2 w-2 -translate-y-1 rotate-45 border-b border-r border-hairline/10 bg-surface-2/95" />
        </div>
      )}

      {/* Legend. */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <span className="text-[11px] text-ink-faint">Less</span>
        {([0, 1, 2, 3, 4] as const).map((lvl) => (
          <span
            key={lvl}
            className={cn("h-[13px] w-[13px] rounded-[4px] ring-1 ring-inset", LEVEL_FILL[lvl])}
          />
        ))}
        <span className="text-[11px] text-ink-faint">More</span>
      </div>
    </div>
  );
}

interface CellProps {
  day: HeatDay;
  active: boolean;
  /** Ref to the outer wrapper — tooltip coords are relative to this element. */
  wrapperRef: RefObject<HTMLDivElement>;
  onEnter: (x: number, y: number) => void;
  onLeave: () => void;
}

function Cell({ day, active, wrapperRef, onEnter, onLeave }: CellProps) {
  const raise = (el: HTMLButtonElement) => {
    const cellRect = el.getBoundingClientRect();
    const wrapRect = wrapperRef.current?.getBoundingClientRect();
    if (!wrapRect) return;
    // Convert from viewport coords to wrapper-relative coords.
    const x = cellRect.left + cellRect.width / 2 - wrapRect.left;
    const y = cellRect.top - wrapRect.top;
    onEnter(x, y);
  };

  if (day.inFuture) {
    return (
      <span
        className="h-[15px] w-[15px] rounded-[4px] border border-dashed border-hairline/[0.06]"
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      onMouseEnter={(e) => raise(e.currentTarget)}
      onMouseLeave={onLeave}
      onFocus={(e) => raise(e.currentTarget)}
      onBlur={onLeave}
      aria-label={`${fullDate(day.date)}: ${
        day.seconds > 0 ? formatDuration(day.seconds) : "no focus"
      }`}
      className={cn(
        "h-[15px] w-[15px] rounded-[4px] ring-1 ring-inset transition-[transform,box-shadow] duration-150 ease-out-strong",
        "hover:scale-[1.18] focus-visible:scale-[1.18] focus-visible:outline-none",
        LEVEL_FILL[day.level],
        day.isToday && "ring-2 ring-teal-bright/80",
        active && "scale-[1.18]"
      )}
    />
  );
}
