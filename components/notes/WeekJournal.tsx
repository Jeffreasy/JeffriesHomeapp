"use client";

import { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ListChecks } from "lucide-react";
import { DayColumn } from "./DayColumn";
import type { NoteRecord, NoteCreateData } from "@/hooks/useNotes";
import { getDisplayEndDate, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { type DienstRow } from "@/lib/schedule";
import { getChecklistInfo } from "./NotesUtils";

interface WeekJournalProps {
  notes: NoteRecord[];
  diensten?: DienstRow[];
  weekStart: Date;
  onWeekChange: (newMonday: Date) => void;
  onEdit: (note: NoteRecord) => void;
  onCreate: (data: NoteCreateData) => Promise<void>;
  onToggleComplete: (id: string) => void | Promise<void>;
  agendaEvents?: PersonalEvent[];
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isoDate(d: Date): string {
  return d.toLocaleDateString("sv-SE"); // YYYY-MM-DD
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function WeekJournal({ notes, diensten = [], agendaEvents = [], weekStart, onWeekChange, onEdit, onCreate, onToggleComplete }: WeekJournalProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayMonday = useMemo(() => getMonday(today), [today]);
  const isCurrentWeek = isoDate(weekStart) === isoDate(todayMonday);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const sunday = days[6];
  const weekNr = getWeekNumber(weekStart);

  // Group notes by date
  const notesByDate = useMemo(() => {
    const map = new Map<string, NoteRecord[]>();
    for (const day of days) {
      map.set(isoDate(day), []);
    }
    for (const note of notes) {
      const noteDate = new Date(note.deadline || note.aangemaakt);
      const key = isoDate(noteDate);
      if (map.has(key)) {
        map.get(key)!.push(note);
      }
    }
    // Sort each day's notes by time
    for (const [, dayNotes] of map) {
      dayNotes.sort((a, b) => new Date(a.deadline || a.aangemaakt).getTime() - new Date(b.deadline || b.aangemaakt).getTime());
    }
    return map;
  }, [notes, days]);

  const weekStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let checklistDone = 0;
    let checklistTotal = 0;
    for (const [, dayNotes] of notesByDate) {
      total += dayNotes.length;
      for (const note of dayNotes) {
        if (note.isCompleted || note.is_completed) completed += 1;
        const checklist = getChecklistInfo(note.inhoud);
        checklistDone += checklist.done;
        checklistTotal += checklist.total;
      }
    }
    return {
      total,
      completed,
      open: total - completed,
      checklistDone,
      checklistTotal,
    };
  }, [notesByDate]);

  const goToPrev = useCallback(() => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    onWeekChange(prev);
  }, [weekStart, onWeekChange]);

  const goToNext = useCallback(() => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    onWeekChange(next);
  }, [weekStart, onWeekChange]);

  const goToToday = useCallback(() => {
    onWeekChange(todayMonday);
  }, [onWeekChange, todayMonday]);

  const formatShortDate = (d: Date) =>
    `${d.getDate()} ${d.toLocaleDateString("nl-NL", { month: "short" })}`;

  return (
    <div className="space-y-4">
      {/* Week navigatie header */}
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrev}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold text-[var(--color-text)]">
              Week {weekNr}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {formatShortDate(weekStart)} – {formatShortDate(sunday)}
            </p>
          </div>

          <button
            onClick={goToNext}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isCurrentWeek && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={goToToday}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors cursor-pointer"
            >
              <CalendarDays size={13} />
              Vandaag
            </motion.button>
          )}
          <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-1 text-xs text-[var(--color-text-subtle)]">
            <CalendarDays size={12} />
            {weekStats.open} open
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
            <CheckCircle2 size={12} />
            {weekStats.completed} afgerond
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-sky-500/10 px-2 py-1 text-xs text-sky-300">
            <ListChecks size={12} />
            {weekStats.checklistDone}/{weekStats.checklistTotal}
          </span>
        </div>
      </div>

      {/* Dag-kolommen grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
        {days.map((day) => {
          const key = isoDate(day);
          const dayNotes = notesByDate.get(key) ?? [];
          const dayIsToday = isoDate(day) === isoDate(today);
          const dayDiensten = diensten.filter((d) => d.startDatum === key);
          const dayAgendaEvents = agendaEvents.filter(
            (event) => event.kalender !== "Rooster" && event.startDatum <= key && getDisplayEndDate(event) >= key
          );

          return (
            <DayColumn
              key={key}
              date={day}
              isToday={dayIsToday}
              notes={dayNotes}
              diensten={dayDiensten}
              agendaEvents={dayAgendaEvents}
              onEdit={onEdit}
              onCreate={onCreate}
              onToggleComplete={onToggleComplete}
            />
          );
        })}
      </div>
    </div>
  );
}

export { getMonday };
