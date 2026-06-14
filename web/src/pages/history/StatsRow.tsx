/* =====================================================================
   StatsRow — four headline numbers over the fetched history window:
   total sessions, total focus hours, active days, best day. Mono tabular
   numerals; a hairline divider between cells on wide screens.
   ===================================================================== */
import { ListChecks, Clock, CalendarCheck, TrendUp, type Icon } from "@phosphor-icons/react";
import { RevealChild } from "@/components/ui";
import { hoursDecimal, type HistoryStats } from "./dates";

interface StatCell {
  icon: Icon;
  value: string;
  unit?: string;
  label: string;
}

export function StatsRow({ stats }: { stats: HistoryStats }) {
  const cells: StatCell[] = [
    { icon: ListChecks, value: String(stats.totalSessions), label: "sessions" },
    { icon: Clock, value: hoursDecimal(stats.totalSeconds), unit: "h", label: "total focus" },
    { icon: CalendarCheck, value: String(stats.activeDays), label: "active days" },
    { icon: TrendUp, value: stats.bestDayLabel, label: "best day" },
  ];

  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-hairline/[0.06] sm:grid-cols-4 sm:divide-y-0">
      {cells.map((c) => (
        <RevealChild
          key={c.label}
          className="flex flex-col gap-2 px-5 py-6 first:pl-1 sm:px-6"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal/10 text-teal-bright ring-1 ring-inset ring-teal/15">
            <c.icon weight="duotone" className="h-[18px] w-[18px]" />
          </span>
          <span className="mt-1 font-mono text-2xl font-semibold tracking-tight text-ink tabular sm:text-[28px]">
            {c.value}
            {c.unit && <span className="ml-0.5 text-base text-ink-muted">{c.unit}</span>}
          </span>
          <span className="text-xs text-ink-muted">{c.label}</span>
        </RevealChild>
      ))}
    </div>
  );
}
