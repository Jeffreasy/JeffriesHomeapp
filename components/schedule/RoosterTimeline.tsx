"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { uiMotion } from "@/lib/ui/motion";
import { DienstItem } from "./DienstItem";
import { PersonalEventItem } from "./PersonalEventItem";
import type { PersonalEvent } from "@/hooks/usePersonalEvents";
import type { UnifiedWeek } from "@/lib/unified";
import { cn } from "@/lib/utils";
import { surfaceVariants } from "@/components/ui/Surface";
import { formatHours, pluralize } from "./RoosterUtils";
// Gedeelde week-formatter (audit L8) — één bron voor "W27"/"Week 27".
import { formatWeekNumber } from "./scheduleUtils";

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
  return sameMonth ? `${format(first, false)}–${format(last)}` : `${format(first)}–${format(last)}`;
}

export function WeekBlock({
  week,
  open,
  onToggle,
  todayIso,
  eventsByDate,
  conflictMap,
  onEditEvent,
}: {
  week: UnifiedWeek;
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
  const hasToday = todayIso ? week.items.some((item) => item.date === todayIso) : false;

  return (
    <div
      className={cn(
        surfaceVariants({ padding: "none", radius: "md" }),
        "overflow-hidden sm:rounded-2xl",
        hasToday && "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)]"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`Week ${weekNumber} ${open ? "inklappen" : "uitklappen"}`}
        className="grid min-h-[var(--touch-target)] w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] sm:px-4 sm:py-4"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]",
              hasToday && "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)]"
            )}
          >
            <span className={cn("text-xs font-bold text-[var(--color-text)]", hasToday && "text-[var(--color-primary-hover)]")}>
              W{weekNumber}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-sm font-bold text-[var(--color-text)]">Week {weekNumber}</p>
              {weekRange && <span className="text-xs font-medium text-[var(--color-text-muted)]">{weekRange}</span>}
              {hasToday && (
                <span className="rounded-md border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] px-1.5 py-0.5 text-micro font-bold uppercase tracking-wider text-[var(--color-primary-hover)]">
                  Vandaag
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-micro font-semibold text-[var(--color-text-muted)] sm:text-xs">
              <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-1">{pluralize(week.dienstenAantal, "dienst", "diensten")}</span>
              <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-1">{formatHours(week.werkUren)}</span>
              <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-1">{pluralize(appointmentCount, "afspraak", "afspraken")}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-0.5">
          <span className="rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] px-2 py-1 text-micro font-semibold text-[var(--color-primary-hover)] sm:text-xs">
            {pluralize(week.items.length, "item")}
          </span>
          <ChevronDown
            size={16}
            className={cn("text-[var(--color-text-muted)] transition-transform", open && "rotate-180")}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: uiMotion.durationSeconds.standard }}
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
