"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Calendar, CalendarClock, CalendarDays, CheckCircle2, ChevronDown, Clock3, FileSpreadsheet, History, List, Zap } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import type { DienstRow } from "@/lib/schedule";
import type { UnifiedWeek } from "@/lib/unified";
import type { PersonalEvent } from "@/hooks/usePersonalEvents";

import { EmptyInline, MiniBreakdown, Panel, SectionTitle, StatusMetric, StatusRow } from "./RoosterCards";
import { WeekBlock } from "./RoosterTimeline";
import { formatHours, formatMetaDate, pluralize } from "./RoosterUtils";
import { DienstItem } from "./DienstItem";
import { PersonalEventItem } from "./PersonalEventItem";
import { cn } from "@/lib/utils";

export function OverviewPanel({
  upcomingHours,
  upcomingCount,
  eventCount,
  todayEventCount,
  hardConflicts,
  conflicts,
  nextDienst,
  shifts,
  teams,
}: {
  upcomingHours: number;
  upcomingCount: number;
  eventCount: number;
  todayEventCount: number;
  hardConflicts: number;
  conflicts: number;
  nextDienst: DienstRow | null;
  shifts: Record<string, number>;
  teams: Record<string, number>;
}) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="border-b border-white/6 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Control center
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">Werk, agenda en signalen</h2>
          </div>
          <Link
            href="/finance"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.06]"
          >
            Finance openen
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 xl:grid-cols-4">
        <StatusMetric
          icon={Clock3}
          label="Komende uren"
          value={formatHours(upcomingHours)}
          sub={pluralize(upcomingCount, "dienst", "diensten")}
          tone="amber"
        />
        <StatusMetric
          icon={Calendar}
          label="Volgende dienst"
          value={nextDienst ? `${nextDienst.startTijd} - ${nextDienst.eindTijd}` : "Geen dienst"}
          sub={nextDienst ? `${nextDienst.dag}, ${new Date(`${nextDienst.startDatum}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}` : "Rooster rustig"}
          tone={nextDienst ? "indigo" : "slate"}
        />
        <StatusMetric
          icon={CalendarDays}
          label="Agenda"
          value={todayEventCount > 0 ? `${todayEventCount} vandaag` : `${eventCount} aankomend`}
          sub="persoonlijke afspraken"
          tone={todayEventCount > 0 ? "green" : "blue"}
        />
        <StatusMetric
          icon={AlertTriangle}
          label="Conflicten"
          value={hardConflicts > 0 ? `${hardConflicts} hard` : String(conflicts)}
          sub={hardConflicts > 0 ? "direct nalopen" : "aandachtspunten"}
          tone={hardConflicts > 0 ? "rose" : conflicts > 0 ? "amber" : "green"}
        />
      </div>

      <div className="grid gap-3 px-5 py-4 sm:grid-cols-3 sm:px-6">
        <MiniBreakdown label="Shifts" value={`V ${shifts["Vroeg"] ?? 0} / L ${shifts["Laat"] ?? 0}`} sub={`${shifts["Dienst"] ?? 0} dagdienst`} />
        <MiniBreakdown label="Team R." value={String(teams["R."] ?? 0)} sub="komende diensten" />
        <MiniBreakdown label="Team A." value={String(teams["A."] ?? 0)} sub="komende diensten" />
      </div>
    </Panel>
  );
}

export function OverviewTab({
  unifiedWeeks,
  isWeekOpen,
  toggleWeek,
  setAllWeeks,
  todayIso,
  eventsByDate,
  conflictMap,
  onEditEvent,
  upcomingEvents,
  withConflicts,
  pendingEvents,
  history,
  showHistory,
  setShowHistory,
  metaRows,
  metaSyncedAt,
  thisMonthEvents,
}: {
  unifiedWeeks: UnifiedWeek[];
  isWeekOpen: (weeknr: string, index: number) => boolean;
  toggleWeek: (weeknr: string, index: number) => void;
  setAllWeeks: (open: boolean) => void;
  todayIso: string | null;
  eventsByDate: Record<string, PersonalEvent[]>;
  conflictMap: Map<string, unknown>;
  onEditEvent: (event: PersonalEvent) => void;
  upcomingEvents: PersonalEvent[];
  withConflicts: PersonalEvent[];
  pendingEvents: PersonalEvent[];
  history: DienstRow[];
  showHistory: boolean;
  setShowHistory: (show: boolean | ((current: boolean) => boolean)) => void;
  metaRows: number;
  metaSyncedAt?: string;
  thisMonthEvents: number;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle
              icon={List}
              label="Tijdlijn"
              title="Diensten en afspraken"
              sub={`${unifiedWeeks.length} weken`}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAllWeeks(true)}
                className="h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
              >
                Alles open
              </button>
              <button
                type="button"
                onClick={() => setAllWeeks(false)}
                className="h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
              >
                Compact
              </button>
            </div>
          </div>
        </Panel>

        {unifiedWeeks.length > 0 ? (
          <div className="space-y-3">
            {unifiedWeeks.map((week, index) => (
              <WeekBlock
                key={week.weeknr}
                week={week}
                index={index}
                open={isWeekOpen(week.weeknr, index)}
                onToggle={() => toggleWeek(week.weeknr, index)}
                todayIso={todayIso}
                eventsByDate={eventsByDate}
                conflictMap={conflictMap}
                onEditEvent={onEditEvent}
              />
            ))}
          </div>
        ) : (
          <Panel>
            <EmptyInline
              icon={Calendar}
              title="Geen komende items"
              text="Sync je rooster of maak een afspraak om je tijdlijn te vullen."
            />
          </Panel>
        )}
      </div>

      <aside className="space-y-5 xl:sticky xl:top-32 xl:self-start">
        <Panel>
          <SectionTitle
            icon={CalendarDays}
            label="Agenda"
            title="Aankomende afspraken"
            sub={pluralize(upcomingEvents.length, "afspraak", "afspraken")}
          />
          <div className="mt-4 space-y-2">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.slice(0, 5).map((event) => (
                <PersonalEventItem
                  key={event.eventId}
                  event={event as never}
                  isToday={todayIso ? event.startDatum === todayIso : false}
                  onEdit={onEditEvent}
                  conflictInfo={conflictMap.get(event.eventId) as never}
                />
              ))
            ) : (
              <EmptyInline
                icon={CalendarDays}
                title="Geen afspraken"
                text="Je persoonlijke agenda heeft geen komende items."
              />
            )}
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            icon={CheckCircle2}
            label="Status"
            title="Datakwaliteit"
            sub={formatMetaDate(metaSyncedAt)}
          />
          <div className="mt-4 space-y-3">
            <StatusRow icon={FileSpreadsheet} label="Roosterregels" value={pluralize(metaRows, "dienst", "diensten")} tone="blue" />
            <StatusRow
              icon={AlertTriangle}
              label="Conflicten"
              value={withConflicts.length > 0 ? `${withConflicts.length} aandachtspunt(en)` : "Geen conflicten"}
              tone={withConflicts.length > 0 ? "amber" : "green"}
            />
            <StatusRow
              icon={Zap}
              label="Wachtrij"
              value={pendingEvents.length > 0 ? `${pendingEvents.length} pending` : "Geen pending acties"}
              tone={pendingEvents.length > 0 ? "indigo" : "green"}
            />
            <StatusRow icon={CalendarClock} label="Deze maand" value={pluralize(thisMonthEvents, "afspraak", "afspraken")} tone="slate" />
          </div>
        </Panel>

        {history.length > 0 && (
          <Panel>
            <button
              type="button"
              onClick={() => setShowHistory((current) => !current)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <SectionTitle
                icon={History}
                label="Historie"
                title="Gedraaide diensten"
                sub={pluralize(history.length, "item")}
              />
              <ChevronDown
                size={16}
                className={cn("shrink-0 text-slate-500 transition-transform", showHistory && "rotate-180")}
              />
            </button>
            <AnimatePresence initial={false}>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-2 opacity-70">
                    {history.slice(0, 8).map((dienst) => (
                      <DienstItem key={dienst.eventId} dienst={dienst as never} afspraken={eventsByDate[dienst.startDatum]} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>
        )}
      </aside>
    </section>
  );
}
