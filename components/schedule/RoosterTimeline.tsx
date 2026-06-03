"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { DienstItem } from "./DienstItem";
import { PersonalEventItem } from "./PersonalEventItem";
import type { PersonalEvent } from "@/hooks/usePersonalEvents";
import type { UnifiedWeek } from "@/lib/unified";
import { cn } from "@/lib/utils";
import { formatHours, pluralize } from "./RoosterUtils";

function formatWeekNumber(weeknr: string) {
  const [, week] = weeknr.split("-");
  return week ? String(Number(week)) : weeknr;
}

function formatDateRange(items: UnifiedWeek["items"]) {
  if (items.length === 0) return "";
  const dates = items.map((item) => item.date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  const format = (iso: string, withMonth = true) => {
    const date = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString("nl-NL", withMonth ? { day: "numeric", month: "short" } : { day: "numeric" });
  };

  if (!first || !last || first === last) return first ? format(first) : "";
  const sameMonth = first.slice(0, 7) === last.slice(0, 7);
  return sameMonth ? `${format(first, false)}-${format(last)}` : `${format(first)}-${format(last)}`;
}

export function WeekBlock({
  week,
  index,
  open,
  onToggle,
  todayIso,
  eventsByDate,
  conflictMap,
  onEditEvent,
}: {
  week: UnifiedWeek;
  index: number;
  open: boolean;
  onToggle: () => void;
  todayIso: string | null;
  eventsByDate: Record<string, PersonalEvent[]>;
  conflictMap: Map<string, unknown>;
  onEditEvent: (event: PersonalEvent) => void;
}) {
  const appointmentCount = week.items.filter((item) => item.type === "afspraak").length;
  const weekNumber = formatWeekNumber(week.weeknr);
  const weekRange = formatDateRange(week.items);

  return (
    <div className="glass min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-3 px-3 py-3 text-left transition-colors hover:bg-[var(--color-surface-hover)] sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-4"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] sm:flex">
            <span className="text-xs font-bold text-slate-300">{index + 1}</span>
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-sm font-bold text-white">Week {weekNumber}</p>
              {weekRange && <span className="text-xs font-medium text-slate-500">{weekRange}</span>}
            </div>
            <p className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-semibold text-slate-500 sm:text-xs">
              <span>{pluralize(week.dienstenAantal, "dienst", "diensten")}</span>
              <span className="text-slate-700">/</span>
              <span>{formatHours(week.werkUren)}</span>
              <span className="text-slate-700">/</span>
              <span>{pluralize(appointmentCount, "afspraak", "afspraken")}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-200 sm:inline-flex">
            {pluralize(week.items.length, "item")}
          </span>
          <ChevronDown
            size={16}
            className={cn("text-slate-500 transition-transform", open && "rotate-180")}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--color-border)] p-2 sm:p-3">
              <div className="space-y-2 md:hidden">
                {week.items.map((item) => (
                  item.type === "dienst" ? (
                    <DienstItem
                      key={`mobile-dienst-${item.data.eventId}`}
                      dienst={item.data}
                      isToday={todayIso ? item.date === todayIso : false}
                      afspraken={eventsByDate[item.date]}
                      compact
                    />
                  ) : (
                    <PersonalEventItem
                      key={`mobile-event-${item.data.eventId}`}
                      event={item.data}
                      isToday={todayIso ? item.date === todayIso : false}
                      onEdit={onEditEvent}
                      conflictInfo={conflictMap.get(item.data.eventId) as never}
                      compact
                    />
                  )
                ))}
              </div>

              <div className="hidden space-y-2 md:block">
                {week.items.map((item) => (
                  item.type === "dienst" ? (
                    <DienstItem
                      key={`dienst-${item.data.eventId}`}
                      dienst={item.data}
                      isToday={todayIso ? item.date === todayIso : false}
                      afspraken={eventsByDate[item.date]}
                    />
                  ) : (
                    <PersonalEventItem
                      key={`event-${item.data.eventId}`}
                      event={item.data}
                      isToday={todayIso ? item.date === todayIso : false}
                      onEdit={onEditEvent}
                      conflictInfo={conflictMap.get(item.data.eventId) as never}
                    />
                  )
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
