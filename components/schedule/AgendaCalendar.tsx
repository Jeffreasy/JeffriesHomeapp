"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  List,
  MapPin,
  Plus,
  StickyNote,
} from "lucide-react";
import {
  formatDateRange,
  getDisplayEndDate,
  getTimeLabel,
  isMultiDay,
  type PersonalEvent,
} from "@/hooks/usePersonalEvents";
import type { NoteRecord } from "@/hooks/useNotes";
import type { ConflictInfo } from "@/lib/conflictDetection";
import { cn } from "@/lib/utils";
import { AppIcon } from "@/components/ui/AppIcon";
import { resolveAppIconName } from "@/lib/symbols";
import { getDisplayTitle } from "@/components/notes/NotesUtils";
import { getLinkedEventId } from "@/components/notes/NoteAgendaUtils";
import { compareAllDayFirst } from "@/components/schedule/scheduleUtils";

type CalendarMode = "month" | "week";

type AgendaCalendarProps = {
  events: PersonalEvent[];
  /** Cold-load flag — shows placeholders instead of "geen items" (audit K3). */
  isLoading?: boolean;
  notesByDate: Map<string, NoteRecord[]>;
  notesByEventId: Map<string, NoteRecord[]>;
  conflictMap: Map<string, ConflictInfo>;
  todayIso: string;
  selectedDate: string;
  cursorDate: string;
  mode: CalendarMode;
  onSelectedDateChange: (date: string) => void;
  onCursorDateChange: (date: string) => void;
  onModeChange: (mode: CalendarMode) => void;
  onCreateEvent: (date?: string, time?: string) => void;
  onCreateNoteForDate: (date: string) => void;
  onCreateNoteForEvent: (event: PersonalEvent) => void;
  onEditEvent: (event: PersonalEvent) => void;
  onEditNote: (note: NoteRecord) => void;
};

type CalendarDay = {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: PersonalEvent[];
  notes: NoteRecord[];
};

const WEEKDAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const CALENDAR_LEGEND = [
  { label: "Dienst", dot: "bg-indigo-300" },
  { label: "Afspraak", dot: "bg-emerald-300" },
  { label: "Wachtrij", dot: "bg-sky-300" },
  { label: "Conflict", dot: "bg-rose-300" },
  { label: "Notitie", dot: "bg-amber-300" },
];

export function AgendaCalendar({
  events,
  isLoading = false,
  notesByDate,
  notesByEventId,
  conflictMap,
  todayIso,
  selectedDate,
  cursorDate,
  mode,
  onSelectedDateChange,
  onCursorDateChange,
  onModeChange,
  onCreateEvent,
  onCreateNoteForDate,
  onCreateNoteForEvent,
  onEditEvent,
  onEditNote,
}: AgendaCalendarProps) {
  const router = useRouter();
  const days = useMemo(
    () => buildCalendarDays(cursorDate, selectedDate, todayIso, mode, events, notesByDate),
    [cursorDate, events, mode, notesByDate, selectedDate, todayIso],
  );
  const selectedDay = days.find((day) => day.date === selectedDate) ?? buildSingleDay(selectedDate, selectedDate, todayIso, events, notesByDate);
  const title = mode === "month" ? formatMonthTitle(cursorDate) : formatWeekTitle(days);
  // Unieke items tellen (audit L14): een meerdaagse afspraak staat in elke
  // dagcel, maar is voor de gebruiker één "zichtbaar item".
  const activeEventCount = useMemo(() => {
    const ids = new Set<string>();
    for (const day of days) {
      for (const event of day.events) ids.add(`${event.kalender}:${event.eventId}`);
    }
    return ids.size;
  }, [days]);
  const activeNoteCount = days.reduce((sum, day) => sum + day.notes.length, 0);
  const selectedLinkedNotes = new Set<string>();
  for (const event of selectedDay.events) {
    for (const note of notesByEventId.get(event.eventId) ?? []) {
      selectedLinkedNotes.add(note.id);
    }
  }
  const dayNotes = selectedDay.notes.filter((note) => !getLinkedEventId(note) && !selectedLinkedNotes.has(note.id));

  // Phones (< sm) get an agenda list instead of the cramped month grid.
  const [mobileView, setMobileView] = useState<"agenda" | "maand">("agenda");
  // F7 (herzien): de telefoon-agenda opende op dag 1 van de maand en moest naar
  // vandaag scrollen — een effect dat met de async data-load racete, waardoor je
  // alsnog bovenaan de maand belandde. Nu bouwen we de hele maand, maar tonen we
  // standaard alleen vandaag→einde maand: vandaag is simpelweg de eerste sectie,
  // geen scroll-hack meer nodig. Voorbije dagen mét items blijven bereikbaar via
  // een "Toon eerder deze maand"-knop, zodat er niets stilletjes verdwijnt.
  const cursorMonth = cursorDate.slice(0, 7);
  const isCurrentMonth = cursorMonth === todayIso.slice(0, 7);
  const [showPastDays, setShowPastDays] = useState(false);
  // Reset de "toon eerder"-onthulling naar de vandaag-first-default zodra de
  // zichtbare maand wijzigt. State bijstellen tijdens render (met een prev-value
  // tracker) i.p.v. in een effect — geen extra commit, geen cascading-render.
  const [prevCursorMonth, setPrevCursorMonth] = useState(cursorMonth);
  if (prevCursorMonth !== cursorMonth) {
    setPrevCursorMonth(cursorMonth);
    setShowPastDays(false);
  }
  const listFrom =
    showPastDays || !isCurrentMonth
      ? `${cursorMonth}-01`
      : // Een bewust getapte voorbije dag in deze maand ankert de lijst dáár;
        // anders begint hij op vandaag.
        selectedDate.slice(0, 7) === cursorMonth && selectedDate < todayIso
        ? selectedDate
        : todayIso;
  const fullMonthSections = useMemo(
    () => buildAgendaList(cursorDate, selectedDate, todayIso, events, notesByDate),
    [cursorDate, selectedDate, todayIso, events, notesByDate],
  );
  const agendaSections = useMemo(
    () => fullMonthSections.filter((section) => section.date >= listFrom),
    [fullMonthSections, listFrom],
  );
  const hiddenPastCount = fullMonthSections.length - agendaSections.length;

  // Maand→Agenda-tap: na het wisselen van weergave naar de getapte dag scrollen
  // zodat de tap zichtbaar landt (audit M17). Ref i.p.v. state zodat het effect
  // geen cascade-render veroorzaakt; het draait na elke commit. De agenda opent
  // nu standaard óp vandaag (eerste sectie), dus er is geen initiële auto-scroll
  // meer nodig — alleen expliciete taps zetten een doel.
  const pendingScrollDateRef = useRef<string | null>(null);
  useEffect(() => {
    const target = pendingScrollDateRef.current;
    if (mobileView !== "agenda" || !target) return;
    document.getElementById(`day-${target}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    pendingScrollDateRef.current = null;
  });

  // Roving tabindex voor het desktop-grid (audit K4): één cel is tabbable,
  // pijltjestoetsen verplaatsen de focus per dag/week.
  const [focusedDate, setFocusedDate] = useState<string | null>(null);
  const gridDates = useMemo(() => days.map((day) => day.date), [days]);
  const rovingDate = focusedDate && gridDates.includes(focusedDate)
    ? focusedDate
    : gridDates.includes(selectedDate)
      ? selectedDate
      : gridDates[0];
  const gridWeeks = useMemo(() => {
    const weeks: CalendarDay[][] = [];
    for (let index = 0; index < days.length; index += 7) {
      weeks.push(days.slice(index, index + 7));
    }
    return weeks;
  }, [days]);

  const goPrevious = () => {
    onCursorDateChange(mode === "month" ? addMonthsIso(cursorDate, -1) : addDaysIso(cursorDate, -7));
  };

  const goNext = () => {
    onCursorDateChange(mode === "month" ? addMonthsIso(cursorDate, 1) : addDaysIso(cursorDate, 7));
  };

  const goToday = () => {
    onCursorDateChange(todayIso);
    onSelectedDateChange(todayIso);
  };

  const selectDate = (date: string) => {
    onSelectedDateChange(date);
    if (mode === "week" || date.slice(0, 7) !== cursorDate.slice(0, 7)) {
      onCursorDateChange(date);
    }
  };

  const setMode = (nextMode: CalendarMode) => {
    onModeChange(nextMode);
    onCursorDateChange(selectedDate);
  };

  const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, date: string) => {
    // Alleen toetsen afhandelen die op de gridcel zélf landen (audit R9):
    // Enter/Space op een binnenliggende knop moet die knop activeren, niet de
    // dagselectie kapen.
    if (event.target !== event.currentTarget) return;
    let target: string | null = null;
    if (event.key === "ArrowRight") target = addDaysIso(date, 1);
    else if (event.key === "ArrowLeft") target = addDaysIso(date, -1);
    else if (event.key === "ArrowDown") target = addDaysIso(date, 7);
    else if (event.key === "ArrowUp") target = addDaysIso(date, -7);
    else if (event.key === "Home") target = gridDates[0];
    else if (event.key === "End") target = gridDates[gridDates.length - 1];
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectDate(date);
      return;
    }
    if (!target) return;
    event.preventDefault();
    // Pijltoetsen over de maand-/weekgrens laten de kalender mee-navigeren i.p.v.
    // dood te lopen op de rand (audit L a11y): valt het doel buiten het huidige
    // grid, verschuif dan de cursor zodat de doeldatum in beeld komt.
    if (!gridDates.includes(target)) {
      onCursorDateChange(target);
    }
    setFocusedDate(target);
    // Na een cursorwissel bestaat de cel pas na de volgende render — focus in een
    // microtask zodat de nieuwe grid-cel er is.
    requestAnimationFrame(() => {
      document.getElementById(`agenda-cal-cell-${target}`)?.focus();
    });
  };

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-white/[0.025] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <div className="border-b border-[var(--color-border)] px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-200">
                <CalendarRange size={17} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-white">Kalender</h2>
                {/* Hidden on phone — the count duplicates the page summary chips. */}
                <p className="mt-0.5 hidden truncate text-xs text-slate-500 sm:block">
                  {isLoading ? `${title} · laden…` : `${title} · ${activeEventCount} zichtbare items · ${activeNoteCount} notities`}
                </p>
              </div>
            </div>
            <div className="mt-2 hidden flex-wrap gap-x-3 gap-y-1 sm:flex">
              {CALENDAR_LEGEND.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                  <span className={cn("h-1.5 w-1.5 rounded-full", item.dot)} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mobile: Agenda (list) vs Maand (dots overview) */}
            <div
              role="group"
              aria-label="Weergave"
              className="flex h-9 rounded-lg border border-[var(--color-border)] bg-black/15 p-0.5 sm:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileView("agenda")}
                aria-pressed={mobileView === "agenda"}
                className={cn(
                  "inline-flex min-w-[4rem] items-center justify-center rounded-md px-2 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-400/60",
                  mobileView === "agenda" ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-slate-300",
                )}
              >
                Agenda
              </button>
              <button
                type="button"
                onClick={() => setMobileView("maand")}
                aria-pressed={mobileView === "maand"}
                className={cn(
                  "inline-flex min-w-[4rem] items-center justify-center rounded-md px-2 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-400/60",
                  mobileView === "maand" ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-slate-300",
                )}
              >
                Maand
              </button>
            </div>
            {/* Desktop: Maand vs Week */}
            <div
              role="group"
              aria-label="Weergave"
              className="hidden h-9 rounded-lg border border-[var(--color-border)] bg-black/15 p-0.5 sm:flex"
            >
              <button
                type="button"
                onClick={() => setMode("month")}
                aria-pressed={mode === "month"}
                className={cn(
                  "inline-flex min-w-[4.5rem] items-center justify-center rounded-md px-2 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-400/60",
                  mode === "month" ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-slate-300",
                )}
              >
                Maand
              </button>
              <button
                type="button"
                onClick={() => setMode("week")}
                aria-pressed={mode === "week"}
                className={cn(
                  "inline-flex min-w-[4.5rem] items-center justify-center rounded-md px-2 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-400/60",
                  mode === "week" ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-slate-300",
                )}
              >
                Week
              </button>
            </div>

            <div className="flex h-9 items-center rounded-lg border border-[var(--color-border)] bg-black/15">
              <button
                type="button"
                onClick={goPrevious}
                className="flex h-9 w-9 items-center justify-center text-slate-500 transition-colors hover:text-slate-200"
                aria-label={mode === "month" ? "Vorige maand" : "Vorige week"}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="h-9 border-x border-[var(--color-border)] px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.04]"
              >
                Vandaag
              </button>
              <button
                type="button"
                onClick={goNext}
                className="flex h-9 w-9 items-center justify-center text-slate-500 transition-colors hover:text-slate-200"
                aria-label={mode === "month" ? "Volgende maand" : "Volgende week"}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Maand-/weekwissel hoorbaar aankondigen voor screenreaders — de
                zichtbare titel is puur visueel (audit L a11y). */}
            <span className="sr-only" role="status" aria-live="polite">
              {title}
            </span>

            <button
              type="button"
              onClick={() => onCreateEvent(selectedDate)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/12 px-3 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/18"
              aria-label={`Afspraak maken op ${formatCompactDate(selectedDate)}`}
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Afspraak</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile (< sm): agenda list or month-dots overview ─────────────── */}
      <div className="sm:hidden">
        {mobileView === "agenda" ? (
          <>
            {!showPastDays && hiddenPastCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowPastDays(true);
                  pendingScrollDateRef.current = fullMonthSections[0]?.date ?? null;
                }}
                className="flex w-full items-center justify-center gap-1.5 border-b border-[var(--color-border)] bg-white/[0.02] px-3 py-2 text-[11px] font-semibold text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-slate-200"
              >
                <ChevronUp size={13} />
                Toon eerder deze maand ({hiddenPastCount})
              </button>
            )}
            {agendaSections.length > 0 ? (
            <div className="divide-y divide-[var(--color-border)]">
              {agendaSections.map((section) => {
                const standaloneNotes = section.notes.filter((note) => !getLinkedEventId(note));
                // Stabiel anker per dag (id) zodat een Maand→Agenda-tap hierheen kan scrollen (audit M17).
                return (
                  <div key={section.date} id={`day-${section.date}`}>
                    <div
                      className={cn(
                        "flex items-center justify-between px-3 py-2",
                        section.isToday
                          ? "border-l-2 border-emerald-400/50 bg-emerald-500/[0.04]"
                          : section.isSelected
                            ? "border-l-2 border-sky-400/50 bg-sky-500/[0.05]"
                            : "bg-white/[0.015]",
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          section.isToday ? "text-emerald-200" : section.isSelected ? "text-sky-200" : "text-white",
                        )}
                      >
                        {formatListHeader(section.date)}{section.isToday ? " · vandaag" : ""}
                      </span>
                      <span className="text-[11px] text-slate-500">{formatDaySummary(section)}</span>
                    </div>
                    <div className="flex flex-col gap-2 px-3 pb-3 pt-2">
                      {section.events.map((event) => (
                        <AgendaListRow
                          key={`${event.kalender}:${event.eventId}:${section.date}`}
                          event={event}
                          conflict={conflictMap.get(event.eventId)}
                          noteCount={notesByEventId.get(event.eventId)?.length ?? 0}
                          onClick={() => {
                            // Diensten worden via het rooster beheerd — een tap
                            // navigeert daarheen (audit N3); afspraken openen de modal.
                            if (event.kalender === "Rooster") router.push("/rooster");
                            else onEditEvent(event);
                          }}
                        />
                      ))}
                      {standaloneNotes.map((note) => (
                        <button
                          key={note.id}
                          type="button"
                          onClick={() => onEditNote(note)}
                          className="flex items-center gap-2 rounded-lg border border-amber-500/15 bg-amber-500/[0.05] px-3 py-2 text-left text-xs text-amber-100/90 transition-colors hover:bg-amber-500/10"
                        >
                          <StickyNote size={13} className="shrink-0 text-amber-300" />
                          <span className="min-w-0 flex-1 truncate">{getDisplayTitle(note)}</span>
                        </button>
                      ))}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onCreateEvent(section.date)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] py-1.5 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-white/[0.03] hover:text-slate-300"
                        >
                          <Plus size={12} /> Afspraak
                        </button>
                        <button
                          type="button"
                          onClick={() => onCreateNoteForDate(section.date)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-dashed border-amber-500/20 py-1.5 text-[11px] font-semibold text-amber-300/80 transition-colors hover:bg-amber-500/[0.06]"
                        >
                          <StickyNote size={12} /> Notitie
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : isLoading ? (
            <div className="space-y-2 px-3 py-4" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-white/[0.03]" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <CalendarRange size={26} className="text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Geen items deze maand</p>
              <button
                type="button"
                onClick={() => onCreateEvent(selectedDate)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/12 px-3 py-1.5 text-xs font-semibold text-emerald-300"
              >
                <Plus size={14} /> Afspraak maken
              </button>
            </div>
            )}
          </>
        ) : (
          <div>
            <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-black/10">
              {WEEKDAYS.map((day) => (
                <div key={day} className="px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => (
                <MobileMonthDotsCell
                  key={day.date}
                  day={day}
                  conflictMap={conflictMap}
                  onSelect={() => {
                    selectDate(day.date);
                    setMobileView("agenda");
                    // Na de weergavewissel naar deze dag scrollen (audit M17).
                    pendingScrollDateRef.current = day.date;
                  }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-[var(--color-border)] px-3 py-2">
              {CALENDAR_LEGEND.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                  <span className={cn("h-1.5 w-1.5 rounded-full", item.dot)} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop (sm+): month grid + selected-day panel ───────────────── */}
      <div className="hidden grid-cols-1 sm:grid xl:grid-cols-[minmax(0,1fr)_300px]">
        <div
          role="grid"
          aria-label={`Kalender, ${title}`}
          className="min-w-0 border-b border-[var(--color-border)] xl:border-b-0 xl:border-r"
        >
          <div role="row" className="grid grid-cols-7 border-b border-[var(--color-border)] bg-black/10">
            {WEEKDAYS.map((day) => (
              <div key={day} role="columnheader" className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                {day}
              </div>
            ))}
          </div>

          {gridWeeks.map((week) => (
            <div
              key={week[0]?.date}
              role="row"
              className={cn("grid grid-cols-7", mode === "month" ? "auto-rows-[minmax(96px,1fr)] lg:auto-rows-[minmax(108px,1fr)]" : "auto-rows-[minmax(130px,1fr)]")}
            >
              {week.map((day) => (
                <CalendarDayCell
                  key={day.date}
                  day={day}
                  mode={mode}
                  conflictMap={conflictMap}
                  notesByEventId={notesByEventId}
                  isFocusTarget={day.date === rovingDate}
                  onFocusCell={() => setFocusedDate(day.date)}
                  onKeyDownCell={(event) => handleGridKeyDown(event, day.date)}
                  onSelect={() => selectDate(day.date)}
                  onEditEvent={onEditEvent}
                />
              ))}
            </div>
          ))}
        </div>

        <SelectedDayPanel
          day={selectedDay}
          isLoading={isLoading}
          notes={dayNotes}
          notesByEventId={notesByEventId}
          conflictMap={conflictMap}
          onCreateEvent={onCreateEvent}
          onCreateNoteForDate={() => onCreateNoteForDate(selectedDay.date)}
          onCreateNoteForEvent={onCreateNoteForEvent}
          onEditEvent={onEditEvent}
          onEditNote={onEditNote}
        />
      </div>
    </section>
  );
}

function CalendarDayCell({
  day,
  mode,
  conflictMap,
  notesByEventId,
  isFocusTarget,
  onFocusCell,
  onKeyDownCell,
  onSelect,
  onEditEvent,
}: {
  day: CalendarDay;
  mode: CalendarMode;
  conflictMap: Map<string, ConflictInfo>;
  notesByEventId: Map<string, NoteRecord[]>;
  isFocusTarget: boolean;
  onFocusCell: () => void;
  onKeyDownCell: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onSelect: () => void;
  onEditEvent: (event: PersonalEvent) => void;
}) {
  const maxVisible = mode === "month" ? 3 : 5;
  const hiddenCount = Math.max(0, day.events.length - maxVisible);

  return (
    // De hele cel is klikbaar om de dag te selecteren (audit K16); event-balkjes
    // stoppen propagatie. Gridcell + roving tabindex voor toetsenbord (audit K4).
    <div
      role="gridcell"
      id={`agenda-cal-cell-${day.date}`}
      aria-selected={day.isSelected}
      aria-label={`${formatCompactDate(day.date)} — ${day.events.length} items`}
      tabIndex={isFocusTarget ? 0 : -1}
      onFocus={onFocusCell}
      onKeyDown={onKeyDownCell}
      onClick={onSelect}
      className={cn(
        "group/day min-w-0 cursor-pointer touch-manipulation border-b border-r border-[var(--color-border)] p-1 transition-colors last:border-r-0 sm:p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/50",
        day.isSelected ? "bg-sky-500/[0.055]" : "bg-white/[0.012] hover:bg-white/[0.025]",
        !day.inMonth && mode === "month" && "bg-black/10 opacity-55",
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <button
          type="button"
          tabIndex={-1}
          onClick={(event) => { event.stopPropagation(); onSelect(); }}
          className={cn(
            "flex h-7 min-w-7 touch-manipulation items-center justify-center rounded-lg px-1 text-xs font-semibold tabular-nums transition-colors sm:h-8 sm:min-w-8",
            day.isToday
              ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/20"
              : day.isSelected
                ? "bg-sky-500/15 text-sky-100 ring-1 ring-sky-500/20"
                : day.inMonth
                  ? "text-slate-300 hover:bg-white/[0.06]"
                  : "text-slate-600 hover:bg-white/[0.04]",
          )}
          aria-label={`${formatCompactDate(day.date)} selecteren`}
          aria-current={day.isToday ? "date" : undefined}
          aria-pressed={day.isSelected}
        >
          {Number(day.date.slice(8, 10))}
        </button>
        {(day.notes.length > 0 || day.events.some((event) => conflictMap.has(event.eventId))) && (
          <div className="flex items-center gap-1">
            {day.notes.length > 0 && (
              <span
                role="img"
                aria-label={`${day.notes.length} ${day.notes.length === 1 ? "notitie" : "notities"}`}
                className="h-1.5 w-1.5 rounded-full bg-amber-300/70"
                title={`${day.notes.length} notities`}
              />
            )}
            {day.events.some((event) => conflictMap.has(event.eventId)) && (
              <span
                role="img"
                aria-label="Conflict op deze dag"
                className="h-1.5 w-1.5 rounded-full bg-rose-400/80"
                title="Conflict"
              />
            )}
          </div>
        )}
      </div>

      <div className="space-y-1">
        {day.events.slice(0, maxVisible).map((event) => (
          <CalendarEventBar
            key={`${event.kalender}:${event.eventId}:${day.date}`}
            event={event}
            mode={mode}
            hasConflict={conflictMap.has(event.eventId)}
            noteCount={notesByEventId.get(event.eventId)?.length ?? 0}
            onClick={() => onEditEvent(event)}
          />
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            tabIndex={-1}
            onClick={(event) => { event.stopPropagation(); onSelect(); }}
            className="w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] font-semibold text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-slate-300"
          >
            +{hiddenCount} meer
          </button>
        )}
      </div>
    </div>
  );
}

function CalendarEventBar({
  event,
  mode,
  compact = false,
  hasConflict,
  noteCount,
  onClick,
}: {
  event: PersonalEvent;
  mode: CalendarMode;
  compact?: boolean;
  hasConflict: boolean;
  noteCount: number;
  onClick: () => void;
}) {
  const tone = getEventTone(event, hasConflict);
  const isRoster = event.kalender === "Rooster";
  const label = `${isRoster ? "Dienst" : "Afspraak"}: ${event.titel}, ${getTimeLabel(event)}, ${formatCompactDate(event.startDatum)}`;
  // Klik-affordance in de tooltip (audit L5) — een balkje oogt als passieve tekst.
  const titleHint = `${label} · klik om te bewerken`;
  const displayTitle = isRoster && event.shiftType ? event.shiftType : event.titel;
  const isCompactMonth = compact && mode === "month";

  if (isCompactMonth) {
    return (
      <button
        type="button"
        // Niet in de tab-volgorde (audit R9): de roving gridcel is de tab-stop;
        // events zijn per toetsenbord bereikbaar via het geselecteerde-dag-paneel.
        tabIndex={-1}
        onClick={(event) => { event.stopPropagation(); onClick(); }}
        aria-label={label}
        className={cn(
          "relative flex min-h-9 w-full min-w-0 touch-manipulation flex-col items-start justify-center rounded-md border px-1 py-1 text-left transition-colors",
          tone.cell,
        )}
        title={titleHint}
      >
        {!event.heledag && event.startTijd && (
          <span className="w-full truncate text-[9px] font-bold leading-none tabular-nums">
            {event.startTijd}
          </span>
        )}
        <span className="w-full truncate text-[9px] font-semibold leading-tight">
          {displayTitle}
        </span>
        {noteCount > 0 && <StickyNote size={8} className="absolute right-0.5 top-0.5 opacity-70" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      // Zie hierboven (audit R9): roving cel is de tab-stop in het grid.
      tabIndex={-1}
      onClick={(event) => { event.stopPropagation(); onClick(); }}
      aria-label={label}
      className={cn(
        "flex w-full min-w-0 touch-manipulation items-center rounded-md border text-left text-[11px] font-semibold transition-colors",
        compact ? "min-h-7 gap-1 px-1" : "min-h-[26px] gap-1.5 px-1.5",
        tone.cell,
      )}
      title={titleHint}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", tone.dot)} />
      <span className="min-w-0 flex-1 truncate">
        {!event.heledag && event.startTijd ? `${event.startTijd} ` : ""}
        {displayTitle}
      </span>
      {noteCount > 0 && <StickyNote size={9} className="shrink-0 opacity-70" />}
    </button>
  );
}

function SelectedDayPanel({
  day,
  isLoading = false,
  notes,
  notesByEventId,
  conflictMap,
  onCreateEvent,
  onCreateNoteForDate,
  onCreateNoteForEvent,
  onEditEvent,
  onEditNote,
}: {
  day: CalendarDay;
  isLoading?: boolean;
  notes: NoteRecord[];
  notesByEventId: Map<string, NoteRecord[]>;
  conflictMap: Map<string, ConflictInfo>;
  onCreateEvent: (date?: string, time?: string) => void;
  onCreateNoteForDate: () => void;
  onCreateNoteForEvent: (event: PersonalEvent) => void;
  onEditEvent: (event: PersonalEvent) => void;
  onEditNote: (note: NoteRecord) => void;
}) {
  return (
    <aside className="min-w-0 p-3 sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Geselecteerde dag</p>
          <h3 className="mt-1 truncate text-sm font-bold text-white">{formatFullDate(day.date)}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {day.events.length} items · {notes.length + linkedNoteCount(day.events, notesByEventId)} notities
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onCreateNoteForDate}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-200 transition-colors hover:bg-amber-500/15"
            aria-label="Dagnotitie maken"
          >
            <StickyNote size={14} />
          </button>
          <button
            type="button"
            onClick={() => onCreateEvent(day.date)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-200 transition-colors hover:bg-emerald-500/15"
            aria-label="Afspraak maken"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {isLoading && day.events.length === 0 ? (
        <div className="space-y-2" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-white/[0.03]" />
          ))}
        </div>
      ) : day.events.length > 0 ? (
        <div className="space-y-2">
          {day.events.map((event) => (
            <SelectedDayEvent
              key={`${event.kalender}:${event.eventId}`}
              event={event}
              notes={notesByEventId.get(event.eventId) ?? []}
              conflict={conflictMap.get(event.eventId)}
              onEditEvent={onEditEvent}
              onCreateNoteForEvent={onCreateNoteForEvent}
              onEditNote={onEditNote}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-6 text-center">
          <List size={18} className="mx-auto text-slate-700" />
          <p className="mt-2 text-xs font-semibold text-slate-400">Geen afspraken of diensten</p>
          <p className="mt-1 text-[11px] text-slate-600">Maak een afspraak of leg alvast een dagnotitie vast.</p>
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {[
          { label: "Ochtend", time: "09:00" },
          { label: "Middag", time: "13:00" },
          { label: "Avond", time: "19:00" },
        ].map((slot) => (
          <button
            key={slot.time}
            type="button"
            onClick={() => onCreateEvent(day.date, slot.time)}
            aria-label={`Afspraak maken op ${formatCompactDate(day.date)} om ${slot.time}`}
            className="min-h-9 rounded-lg border border-[var(--color-border)] bg-white/[0.025] px-2 text-xs font-semibold text-slate-400 transition-colors hover:border-emerald-500/20 hover:bg-emerald-500/[0.06] hover:text-emerald-200"
          >
            {slot.label}
          </button>
        ))}
      </div>

      {notes.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-500/12 bg-amber-500/[0.035] px-3 py-2">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300/70">
            <StickyNote size={11} />
            Dagnotities
          </p>
          <div className="space-y-1">
            {notes.slice(0, 5).map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => onEditNote(note)}
                className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-amber-100 transition-colors hover:bg-amber-500/10"
              >
                <AppIcon name={resolveAppIconName(note.symbol, "note")} tone="amber" size="xs" />
                <span className="truncate">{getDisplayTitle(note)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function SelectedDayEvent({
  event,
  notes,
  conflict,
  onEditEvent,
  onCreateNoteForEvent,
  onEditNote,
}: {
  event: PersonalEvent;
  notes: NoteRecord[];
  conflict?: ConflictInfo;
  onEditEvent: (event: PersonalEvent) => void;
  onCreateNoteForEvent: (event: PersonalEvent) => void;
  onEditNote: (note: NoteRecord) => void;
}) {
  const tone = getEventTone(event, Boolean(conflict));
  const isRoster = event.kalender === "Rooster";

  return (
    <div className={cn("rounded-lg border px-3 py-2", tone.panel)}>
      <button
        type="button"
        onClick={() => onEditEvent(event)}
        className="flex w-full min-w-0 items-start gap-2 text-left"
      >
        <AppIcon
          name={resolveAppIconName(event.symbol, isRoster ? "roster" : "agenda")}
          tone={isRoster ? "indigo" : "green"}
          size="sm"
          framed
          className="h-8 w-8 rounded-lg"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white">{event.titel}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={10} />
              {getTimeLabel(event)}
            </span>
            {event.locatie && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin size={10} />
                <span className="truncate">{event.locatie}</span>
              </span>
            )}
          </span>
          {event.startDatum !== getDisplayEndDate(event) && (
            <span className="mt-1 block text-[10px] text-slate-600">{formatDateRange(event)}</span>
          )}
          {conflict && (
            <span className="mt-1 block text-[10px] font-medium text-amber-300">{conflict.message}</span>
          )}
        </span>
      </button>

      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/5 pt-2">
        {notes.slice(0, 3).map((note) => (
          <button
            key={note.id}
            type="button"
            onClick={() => onEditNote(note)}
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-cyan-500/10 px-1.5 py-1 text-[10px] font-medium text-cyan-200 transition-colors hover:bg-cyan-500/15"
          >
            <StickyNote size={10} />
            <span className="max-w-[10rem] truncate">{getDisplayTitle(note)}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => onCreateNoteForEvent(event)}
          className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-1.5 py-1 text-[10px] font-semibold text-slate-400 transition-colors hover:bg-white/[0.07] hover:text-slate-200"
        >
          <Plus size={10} />
          Notitie
        </button>
      </div>
    </div>
  );
}

// ─── Mobile agenda list (phones) ─────────────────────────────────────────────

function AgendaListRow({
  event,
  conflict,
  noteCount,
  onClick,
}: {
  event: PersonalEvent;
  conflict?: ConflictInfo;
  noteCount: number;
  onClick: () => void;
}) {
  const tone = getEventTone(event, Boolean(conflict));
  const isRoster = event.kalender === "Rooster";
  const typeLabel = isRoster ? event.shiftType || "Dienst" : "Afspraak";
  const accent = conflict
    ? "border-l-rose-400"
    : isRoster
      ? "border-l-indigo-400"
      : event.status?.startsWith("Pending")
        ? "border-l-sky-400"
        : "border-l-emerald-400";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full touch-manipulation items-stretch gap-3 rounded-lg border border-l-[3px] px-3 py-2.5 text-left transition-colors",
        tone.panel,
        accent,
      )}
    >
      <span className="w-12 shrink-0 text-right tabular-nums">
        {event.heledag ? (
          <span className="inline-block rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-slate-300">
            Hele dag
          </span>
        ) : (
          <>
            <span className="block text-sm font-semibold text-white">{event.startTijd ?? "--:--"}</span>
            {event.eindTijd && (
              <span className="block text-[11px] text-[color:var(--color-text-muted)]">{event.eindTijd}</span>
            )}
          </>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-sm font-semibold leading-snug text-white">{event.titel}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-[color:var(--color-text-muted)]">
          <span>{typeLabel}</span>
          {event.locatie && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{event.locatie}</span>
            </span>
          )}
          {/* Alleen de einddatum — "t/m 2 jul – 5 jul" dupliceerde de range (audit L7). */}
          {isMultiDay(event) && <span>· t/m {formatEndDateShort(event)}</span>}
        </span>
        {conflict && (
          <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-300">
            <AlertTriangle size={12} className="shrink-0" />
            {conflict.message}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 self-center">
        {noteCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-300">
            <StickyNote size={12} />
            {noteCount}
          </span>
        )}
        {/* Afspraken openen de editor; diensten navigeren naar /rooster (audit N3). */}
        <ChevronRight size={15} className="text-slate-600" />
      </span>
    </button>
  );
}

function MobileMonthDotsCell({
  day,
  conflictMap,
  onSelect,
}: {
  day: CalendarDay;
  conflictMap: Map<string, ConflictInfo>;
  onSelect: () => void;
}) {
  const tones = new Set<string>();
  for (const event of day.events) {
    tones.add(getEventTone(event, conflictMap.has(event.eventId)).dot);
  }
  const dots = Array.from(tones).slice(0, 3);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${formatCompactDate(day.date)} — ${day.events.length} items`}
      aria-current={day.isToday ? "date" : undefined}
      className={cn(
        "flex min-h-12 touch-manipulation flex-col items-center gap-1 border-b border-r border-[var(--color-border)] py-1.5 transition-colors last:border-r-0",
        day.isSelected ? "bg-sky-500/[0.06]" : "hover:bg-white/[0.03]",
        !day.inMonth && "opacity-40",
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
          day.isToday
            ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/20"
            : day.isSelected
              ? "text-sky-200"
              : "text-slate-300",
        )}
      >
        {Number(day.date.slice(8, 10))}
      </span>
      <span className="flex h-3 items-center gap-0.5">
        {dots.map((dot) => (
          <span key={dot} className={cn("h-1.5 w-1.5 rounded-full", dot)} />
        ))}
        {day.notes.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-300/70" />}
        {day.events.length > 3 && (
          <span className="ml-0.5 text-[9px] font-semibold tabular-nums text-slate-500">{day.events.length}</span>
        )}
      </span>
    </button>
  );
}

function buildAgendaList(
  cursorDate: string,
  selectedDate: string,
  todayIso: string,
  events: PersonalEvent[],
  notesByDate: Map<string, NoteRecord[]>,
): CalendarDay[] {
  const monthStart = `${cursorDate.slice(0, 7)}-01`;
  const monthEnd = getMonthEndIso(monthStart);
  const dayCount = diffDays(monthStart, monthEnd) + 1;
  const sections: CalendarDay[] = [];
  for (let index = 0; index < dayCount; index++) {
    const date = addDaysIso(monthStart, index);
    const day = buildSingleDay(date, selectedDate, todayIso, events, notesByDate, true);
    // De geselecteerde dag krijgt óók een (lege) sectie met "+ Afspraak"-CTA,
    // zodat een Maand→Agenda-tap op een lege dag zichtbaar landt (audit M17).
    if (day.events.length > 0 || day.notes.length > 0 || day.isSelected) sections.push(day);
  }
  return sections;
}

function formatListHeader(dateIso: string) {
  return new Date(`${dateIso}T12:00:00`).toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function buildCalendarDays(
  cursorDate: string,
  selectedDate: string,
  todayIso: string,
  mode: CalendarMode,
  events: PersonalEvent[],
  notesByDate: Map<string, NoteRecord[]>,
): CalendarDay[] {
  if (mode === "week") {
    const start = startOfWeekIso(cursorDate);
    return Array.from({ length: 7 }, (_, index) => buildSingleDay(addDaysIso(start, index), selectedDate, todayIso, events, notesByDate, true));
  }

  const monthStart = `${cursorDate.slice(0, 7)}-01`;
  const monthEnd = getMonthEndIso(monthStart);
  const gridStart = startOfWeekIso(monthStart);
  const gridEnd = endOfWeekIso(monthEnd);
  const dayCount = diffDays(gridStart, gridEnd) + 1;
  return Array.from({ length: dayCount }, (_, index) => {
    const date = addDaysIso(gridStart, index);
    return buildSingleDay(date, selectedDate, todayIso, events, notesByDate, date.slice(0, 7) === cursorDate.slice(0, 7));
  });
}

function buildSingleDay(
  date: string,
  selectedDate: string,
  todayIso: string,
  events: PersonalEvent[],
  notesByDate: Map<string, NoteRecord[]>,
  inMonth = true,
): CalendarDay {
  return {
    date,
    inMonth,
    isToday: date === todayIso,
    isSelected: date === selectedDate,
    // Gedeelde comparator met de tijdlijn (audit L6): hele-dag eerst, dan tijd.
    events: events.filter((event) => eventCoversDate(event, date)).sort(compareAllDayFirst),
    notes: notesByDate.get(date) ?? [],
  };
}

function linkedNoteCount(events: PersonalEvent[], notesByEventId: Map<string, NoteRecord[]>) {
  const ids = new Set<string>();
  for (const event of events) {
    for (const note of notesByEventId.get(event.eventId) ?? []) {
      ids.add(note.id);
    }
  }
  return ids.size;
}

function formatDaySummary(day: CalendarDay) {
  const shifts = day.events.filter((event) => event.kalender === "Rooster").length;
  const appointments = day.events.length - shifts;
  const parts = [];
  if (appointments > 0) parts.push(`${appointments} ${appointments === 1 ? "afspraak" : "afspraken"}`);
  if (shifts > 0) parts.push(`${shifts} ${shifts === 1 ? "dienst" : "diensten"}`);
  if (day.notes.length > 0) parts.push(`${day.notes.length} ${day.notes.length === 1 ? "notitie" : "notities"}`);
  return parts.length > 0 ? parts.join(" · ") : "Geen items gepland";
}

function getEventTone(event: PersonalEvent, hasConflict: boolean) {
  if (hasConflict) {
    return {
      dot: "bg-rose-300",
      cell: "border-rose-500/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15",
      panel: "border-rose-500/18 bg-rose-500/[0.055]",
    };
  }
  if (event.kalender === "Rooster") {
    return {
      dot: "bg-indigo-300",
      cell: "border-indigo-500/18 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/15",
      panel: "border-indigo-500/16 bg-indigo-500/[0.045]",
    };
  }
  if (event.status?.startsWith("Pending")) {
    return {
      dot: "bg-sky-300",
      cell: "border-sky-500/18 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15",
      panel: "border-sky-500/16 bg-sky-500/[0.045]",
    };
  }
  return {
    dot: "bg-emerald-300",
    cell: "border-emerald-500/16 bg-emerald-500/[0.08] text-emerald-100 hover:bg-emerald-500/12",
    panel: "border-emerald-500/14 bg-emerald-500/[0.04]",
  };
}

function eventCoversDate(event: PersonalEvent, date: string) {
  return event.startDatum <= date && getDisplayEndDate(event) >= date;
}

function startOfWeekIso(dateIso: string) {
  const date = new Date(`${dateIso}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function endOfWeekIso(dateIso: string) {
  const date = new Date(`${dateIso}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function getMonthEndIso(monthStartIso: string) {
  const date = new Date(`${monthStartIso}T12:00:00`);
  date.setMonth(date.getMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
}

function diffDays(startIso: string, endIso: string) {
  const start = new Date(`${startIso}T12:00:00`).getTime();
  const end = new Date(`${endIso}T12:00:00`).getTime();
  return Math.round((end - start) / 86400000);
}

function addDaysIso(baseIso: string, days: number) {
  const date = new Date(`${baseIso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonthsIso(baseIso: string, months: number) {
  const date = new Date(`${baseIso.slice(0, 7)}-01T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function formatMonthTitle(dateIso: string) {
  return new Date(`${dateIso.slice(0, 7)}-01T12:00:00`).toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
  });
}

function formatWeekTitle(days: CalendarDay[]) {
  const first = days[0]?.date;
  const last = days[days.length - 1]?.date;
  if (!first || !last) return "Week";
  const start = new Date(`${first}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  const end = new Date(`${last}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  return `${start} – ${end}`;
}

/** "5 jul" — alleen de einddatum van een meerdaags event (audit L7). */
function formatEndDateShort(event: PersonalEvent) {
  const iso = getDisplayEndDate(event);
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

function formatCompactDate(dateIso: string) {
  return new Date(`${dateIso}T12:00:00`).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatFullDate(dateIso: string) {
  return new Date(`${dateIso}T12:00:00`).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
