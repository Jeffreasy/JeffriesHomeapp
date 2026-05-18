"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { DienstItem } from "./DienstItem";
import { PersonalEventItem } from "./PersonalEventItem";
import type { PersonalEvent } from "@/hooks/usePersonalEvents";
import type { UnifiedWeek } from "@/lib/unified";
import { cn } from "@/lib/utils";
import { formatHours, pluralize } from "./RoosterUtils";

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

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.035] sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white/[0.04]">
            <span className="text-xs font-bold text-slate-300">{index + 1}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Week {week.weeknr}</p>
            <p className="mt-1 text-xs text-slate-500">
              {pluralize(week.dienstenAantal, "dienst", "diensten")} - {formatHours(week.werkUren)} - {pluralize(appointmentCount, "afspraak", "afspraken")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-200">
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
            <div className="space-y-2 border-t border-white/6 p-3">
              {week.items.map((item) => (
                item.type === "dienst" ? (
                  <DienstItem
                    key={`dienst-${item.data.eventId}`}
                    dienst={item.data as any}
                    isToday={todayIso ? item.date === todayIso : false}
                    afspraken={eventsByDate[item.date]}
                  />
                ) : (
                  <PersonalEventItem
                    key={`event-${item.data.eventId}`}
                    event={item.data as any}
                    isToday={todayIso ? item.date === todayIso : false}
                    onEdit={onEditEvent}
                    conflictInfo={conflictMap.get(item.data.eventId) as never}
                  />
                )
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
